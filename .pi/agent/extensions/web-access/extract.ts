import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import TurndownService from "turndown";
import { basename } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { extractRSCContent } from "./rsc-extract.js";
import { sanitizeInlineDataUris } from "./data-uri-sanitize.js";
import { fetchRemoteUrl, loadFetchContentDomainPolicy, loadSsrfConfig, validateRemoteUrl } from "./ssrf-protection.js";
import { getWebSearchConfigPath } from "./utils.js";
import { extractPDFToMarkdown, isPDF } from "./pdf-extract.js";
import { extractGitHub } from "./github-extract.js";
import {
  extractYouTube,
  extractYouTubeFrame,
  extractYouTubeFrames,
  getYouTubeStreamInfo,
  isYouTubeEnabled,
  isYouTubeURL,
} from "./youtube-extract.js";
import { extractVideo, extractVideoFrame, getLocalVideoDuration, isVideoFile } from "./video-extract.js";
import { formatSeconds } from "./utils.js";

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const DEFAULT_MAX_PDF_BYTES = 20 * 1024 * 1024;
const CONCURRENT_FETCH_LIMIT = 4;
const JINA_READER_BASE = "https://r.jina.ai/";
const JINA_TIMEOUT_MS = 30000;
const MIN_USEFUL_CONTENT = 500;
const CONFIG_PATH = getWebSearchConfigPath();

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

export interface VideoFrame {
  data: string;
  mimeType: string;
  timestamp: string;
}

export type FrameData = { data: string; mimeType: string };
export type FrameResult = FrameData | { error: string };

export interface ExtractedContent {
  url: string;
  title: string;
  content: string;
  error: string | null;
  thumbnail?: { data: string; mimeType: string };
  frames?: VideoFrame[];
  duration?: number;
  mimeType?: string;
  status?: number;
}

export interface ExtractOptions {
  timeoutMs?: number;
  forceClone?: boolean;
  prompt?: string;
  timestamp?: string;
  frames?: number;
  model?: string;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function isAbortError(err: unknown): boolean {
  return errorMessage(err).toLowerCase().includes("abort");
}

function abortedResult(url: string): ExtractedContent {
  return { url, title: "", content: "", error: "Aborted" };
}

export function extractHeadingTitle(text: string): string | null {
  const match = text.match(/^#{1,2}\s+(.+)/m);
  if (!match) return null;
  const cleaned = match[1].replace(/\*+/g, "").trim();
  return cleaned || null;
}

function extractTextTitle(text: string, url: string): string {
  try {
    return extractHeadingTitle(text) ?? (new URL(url).pathname.split("/").pop() || url);
  } catch {
    return extractHeadingTitle(text) ?? basename(url);
  }
}

function allowRemoteHostedFetchers() {
  if (!existsSync(CONFIG_PATH)) return false;
  try {
    const config = JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as { fetchRouting?: { allowRemoteHostedProviders?: boolean } };
    return config.fetchRouting?.allowRemoteHostedProviders === true;
  } catch (err) {
    throw new Error(`Failed to parse ${CONFIG_PATH}: ${errorMessage(err)}`);
  }
}

function isLikelyJsRendered(html: string) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return false;
  const textContent = bodyMatch[1]
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const scriptCount = (html.match(/<script/gi) || []).length;
  return textContent.length < 500 && scriptCount > 3;
}

async function extractWithJinaReader(url: string, signal?: AbortSignal): Promise<ExtractedContent | null> {
  if (!allowRemoteHostedFetchers()) return null;
  try {
    const ssrf = loadSsrfConfig();
    await validateRemoteUrl(url, {
      allowRanges: ssrf.allowRanges,
      trustEnvProxy: ssrf.trustEnvProxy,
      domainPolicy: loadFetchContentDomainPolicy(),
    });
    const response = await fetch(JINA_READER_BASE + url, {
      headers: {
        Accept: "text/markdown",
        "X-No-Cache": "true",
      },
      signal: AbortSignal.any([AbortSignal.timeout(JINA_TIMEOUT_MS), ...(signal ? [signal] : [])]),
    });
    if (!response.ok) return null;
    const content = new TextDecoder("utf-8").decode(await readResponseWithLimit(response, DEFAULT_MAX_RESPONSE_BYTES));
    const contentStart = content.indexOf("Markdown Content:");
    if (contentStart < 0) return null;
    const markdown = content.slice(contentStart + 17).trim();
    if (markdown.length < 100 || markdown.startsWith("Loading...") || markdown.startsWith("Please enable JavaScript")) {
      return null;
    }
    const title = extractHeadingTitle(markdown) ?? extractTextTitle(markdown, url);
    return { url, title, content: markdown, error: null };
  } catch {
    return null;
  }
}

function parseTimestamp(ts: string): number | null {
  const num = Number(ts);
  if (!Number.isNaN(num) && num >= 0) return Math.floor(num);
  const parts = ts.split(":").map(Number);
  if (parts.some((p) => Number.isNaN(p) || p < 0)) return null;
  if (parts.length === 3) return Math.floor(parts[0] * 3600 + parts[1] * 60 + parts[2]);
  if (parts.length === 2) return Math.floor(parts[0] * 60 + parts[1]);
  return null;
}

type TimestampSpec = { type: "single"; seconds: number } | { type: "range"; start: number; end: number };

function parseTimestampSpec(ts: string): TimestampSpec | null {
  const dashIdx = ts.indexOf("-", 1);
  if (dashIdx > 0) {
    const start = parseTimestamp(ts.slice(0, dashIdx));
    const end = parseTimestamp(ts.slice(dashIdx + 1));
    if (start !== null && end !== null && end > start) return { type: "range", start, end };
  }
  const seconds = parseTimestamp(ts);
  return seconds !== null ? { type: "single", seconds } : null;
}

const DEFAULT_RANGE_FRAMES = 6;
const MIN_FRAME_INTERVAL = 5;

function computeRangeTimestamps(start: number, end: number, maxFrames = DEFAULT_RANGE_FRAMES) {
  if (maxFrames <= 1) return [start];
  const duration = end - start;
  const idealInterval = duration / (maxFrames - 1);
  if (idealInterval < MIN_FRAME_INTERVAL) {
    const timestamps: number[] = [];
    for (let t = start; t <= end && timestamps.length < maxFrames; t += MIN_FRAME_INTERVAL) timestamps.push(t);
    return timestamps;
  }
  return Array.from({ length: maxFrames }, (_, i) => Math.round(start + i * idealInterval));
}

function buildFrameResult(
  url: string,
  label: string,
  requestedCount: number,
  frames: VideoFrame[],
  error: string | null,
  duration?: number,
): ExtractedContent {
  if (frames.length === 0) {
    const message = error ?? "Frame extraction failed";
    return { url, title: `Frames ${label} (0/${requestedCount})`, content: message, error: message };
  }
  return {
    url,
    title: `Frames ${label} (${frames.length}/${requestedCount})`,
    content: `${frames.length} frames extracted from ${label}`,
    error: null,
    frames,
    duration,
  };
}

async function extractLocalFrames(filePath: string, timestamps: number[]) {
  const results = await Promise.all(
    timestamps.map(async (t) => {
      const frame = await extractVideoFrame(filePath, t);
      if ("error" in frame) return { error: frame.error };
      return { ...frame, timestamp: formatSeconds(t) };
    }),
  );
  const frames = results.filter((item): item is VideoFrame => "data" in item);
  const firstError = results.find((item): item is { error: string } => "error" in item);
  return { frames, error: frames.length === 0 && firstError ? firstError.error : null };
}

function safeVideoInfo(url: string): { info: ReturnType<typeof isVideoFile>; error?: string } {
  try {
    return { info: isVideoFile(url) };
  } catch (err) {
    return { info: null, error: errorMessage(err) };
  }
}

export async function extractContent(url: string, signal?: AbortSignal, options?: ExtractOptions): Promise<ExtractedContent> {
  if (signal?.aborted) return abortedResult(url);

  if (options?.frames && !options.timestamp) {
    const ytInfo = isYouTubeURL(url);
    if (ytInfo.isYouTube && ytInfo.videoId) {
      const streamInfo = await getYouTubeStreamInfo(ytInfo.videoId);
      if ("error" in streamInfo) return { url, title: "Frames", content: streamInfo.error, error: streamInfo.error };
      if (streamInfo.duration === null) {
        const error = "Cannot determine video duration. Use a timestamp range instead.";
        return { url, title: "Frames", content: error, error };
      }
      const timestamps = computeRangeTimestamps(0, Math.floor(streamInfo.duration), options.frames);
      const result = await extractYouTubeFrames(ytInfo.videoId, timestamps, streamInfo);
      return buildFrameResult(url, `${formatSeconds(0)}-${formatSeconds(Math.floor(streamInfo.duration))}`, timestamps.length, result.frames, result.error, streamInfo.duration);
    }

    const localVideo = safeVideoInfo(url);
    if (localVideo.error) return { url, title: "", content: "", error: localVideo.error };
    if (localVideo.info) {
      const durationResult = await getLocalVideoDuration(localVideo.info.absolutePath);
      if (typeof durationResult !== "number") return { url, title: "Frames", content: durationResult.error, error: durationResult.error };
      const timestamps = computeRangeTimestamps(0, Math.floor(durationResult), options.frames);
      const result = await extractLocalFrames(localVideo.info.absolutePath, timestamps);
      return buildFrameResult(url, `${formatSeconds(0)}-${formatSeconds(Math.floor(durationResult))}`, timestamps.length, result.frames, result.error, durationResult);
    }
  }

  if (options?.timestamp) {
    const spec = parseTimestampSpec(options.timestamp);
    if (!spec) {
      return {
        url,
        title: "",
        content: "",
        error: `Invalid timestamp format: \"${options.timestamp}\". Use H:MM:SS, MM:SS, seconds, or start-end.`,
      };
    }

    const ytInfo = isYouTubeURL(url);
    if (ytInfo.isYouTube && ytInfo.videoId) {
      const streamInfo = await getYouTubeStreamInfo(ytInfo.videoId);
      if ("error" in streamInfo) return { url, title: "Frames", content: streamInfo.error, error: streamInfo.error };
      if (spec.type === "range") {
        const timestamps = computeRangeTimestamps(spec.start, spec.end, options.frames);
        const result = await extractYouTubeFrames(ytInfo.videoId, timestamps, streamInfo);
        return buildFrameResult(url, `${formatSeconds(spec.start)}-${formatSeconds(spec.end)}`, timestamps.length, result.frames, result.error, result.duration ?? undefined);
      }
      if (options.frames) {
        const end = spec.seconds + (options.frames - 1) * MIN_FRAME_INTERVAL;
        const timestamps = computeRangeTimestamps(spec.seconds, end, options.frames);
        const result = await extractYouTubeFrames(ytInfo.videoId, timestamps, streamInfo);
        return buildFrameResult(url, `${formatSeconds(spec.seconds)}-${formatSeconds(end)}`, timestamps.length, result.frames, result.error, result.duration ?? undefined);
      }
      const frame = await extractYouTubeFrame(ytInfo.videoId, spec.seconds, streamInfo);
      if ("error" in frame) return { url, title: `Frame at ${options.timestamp}`, content: frame.error, error: frame.error };
      return { url, title: `Frame at ${options.timestamp}`, content: `Video frame at ${options.timestamp}`, error: null, thumbnail: frame };
    }

    const localVideo = safeVideoInfo(url);
    if (localVideo.error) return { url, title: "", content: "", error: localVideo.error };
    if (localVideo.info) {
      if (spec.type === "range") {
        const timestamps = computeRangeTimestamps(spec.start, spec.end, options.frames);
        const result = await extractLocalFrames(localVideo.info.absolutePath, timestamps);
        return buildFrameResult(url, `${formatSeconds(spec.start)}-${formatSeconds(spec.end)}`, timestamps.length, result.frames, result.error);
      }
      if (options.frames) {
        const end = spec.seconds + (options.frames - 1) * MIN_FRAME_INTERVAL;
        const timestamps = computeRangeTimestamps(spec.seconds, end, options.frames);
        const result = await extractLocalFrames(localVideo.info.absolutePath, timestamps);
        return buildFrameResult(url, `${formatSeconds(spec.seconds)}-${formatSeconds(end)}`, timestamps.length, result.frames, result.error);
      }
      const frame = await extractVideoFrame(localVideo.info.absolutePath, spec.seconds);
      if ("error" in frame) return { url, title: `Frame at ${options.timestamp}`, content: frame.error, error: frame.error };
      return { url, title: `Frame at ${options.timestamp}`, content: `Video frame at ${options.timestamp}`, error: null, thumbnail: frame };
    }
  }

  const localVideo = safeVideoInfo(url);
  if (localVideo.error) return { url, title: "", content: "", error: localVideo.error };
  if (localVideo.info) {
    try {
      const result = await extractVideo(localVideo.info, signal, options);
      return result ?? { url, title: "", content: "", error: "Video analysis requires Gemini access via Chrome login or GEMINI_API_KEY." };
    } catch (err) {
      if (isAbortError(err)) return abortedResult(url);
      return { url, title: "", content: "", error: errorMessage(err) };
    }
  }

  try {
    new URL(url);
  } catch {
    return { url, title: "", content: "", error: "Invalid URL" };
  }

  try {
    const ghResult = await extractGitHub(url, signal, options?.forceClone);
    if (ghResult) return ghResult;
  } catch (err) {
    if (isAbortError(err)) return abortedResult(url);
  }

  const ytInfo = isYouTubeURL(url);
  if (ytInfo.isYouTube && isYouTubeEnabled()) {
    try {
      const ytResult = await extractYouTube(url, signal, options?.prompt, options?.model);
      if (ytResult) return ytResult;
    } catch (err) {
      if (isAbortError(err)) return abortedResult(url);
      return { url, title: "", content: "", error: errorMessage(err) };
    }
    return { url, title: "", content: "", error: "Could not extract YouTube video content. Sign into Gemini in Chrome or set GEMINI_API_KEY." };
  }

  return extractViaHttp(url, signal, options);
}

function configuredPdfMaxBytes() {
  if (!existsSync(CONFIG_PATH)) return DEFAULT_MAX_PDF_BYTES;
  try {
    const config = JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as { pdf?: { maxSizeMB?: number } };
    const value = config.pdf?.maxSizeMB;
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return DEFAULT_MAX_PDF_BYTES;
    return Math.min(value, 50) * 1024 * 1024;
  } catch (err) {
    throw new Error(`Failed to parse ${CONFIG_PATH}: ${errorMessage(err)}`);
  }
}

async function readResponseWithLimit(response: Response, maxBytes: number) {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new Error(`Response too large (${Math.ceil(declared / 1024 / 1024)}MB)`);
  const reader = response.body?.getReader();
  if (!reader) {
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > maxBytes) throw new Error(`Response too large (${Math.ceil(maxBytes / 1024 / 1024)}MB limit)`);
    return buffer;
  }
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error(`Response too large (${Math.ceil(maxBytes / 1024 / 1024)}MB limit)`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const combined = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return combined.buffer;
}

async function extractViaHttp(url: string, signal?: AbortSignal, options?: ExtractOptions): Promise<ExtractedContent> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);

  try {
    const ssrf = loadSsrfConfig();
    const response = await fetchRemoteUrl(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "OpenAI File Downloader, XaiImageApiFetch/1.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    }, {
      allowRanges: ssrf.allowRanges,
      trustEnvProxy: ssrf.trustEnvProxy,
      domainPolicy: loadFetchContentDomainPolicy(),
    });

    const contentType = response.headers.get("content-type") || "";
    const mimeType = contentType.split(";", 1)[0]?.trim().toLowerCase() || undefined;
    if (!response.ok) return { url, title: "", content: "", error: `HTTP ${response.status}: ${response.statusText}`, mimeType, status: response.status };

    if (isPDF(url, contentType)) {
      try {
        const buffer = await readResponseWithLimit(response, configuredPdfMaxBytes());
        const result = await extractPDFToMarkdown(buffer, url);
        return {
          url,
          title: result.title,
          content: `PDF extracted and saved to: ${result.outputPath}\n\nPages: ${result.pages}\nCharacters: ${result.chars}`,
          error: null,
          mimeType: "application/pdf",
          status: response.status,
        };
      } catch (err) {
        return { url, title: "", content: "", error: `PDF extraction failed: ${errorMessage(err)}`, mimeType, status: response.status };
      }
    }

    if (
      contentType.includes("application/octet-stream") ||
      contentType.includes("image/") ||
      contentType.includes("audio/") ||
      contentType.includes("video/") ||
      contentType.includes("application/zip")
    ) {
      return { url, title: "", content: "", error: `Unsupported content type: ${contentType.split(";")[0]}`, mimeType, status: response.status };
    }

    const buffer = await readResponseWithLimit(response, DEFAULT_MAX_RESPONSE_BYTES);
    const charset = contentType.match(/charset\s*=\s*["']?([^;"'\s]+)/i)?.[1];
    let text: string;
    try { text = new TextDecoder(charset || "utf-8").decode(buffer); }
    catch { text = new TextDecoder("utf-8").decode(buffer); }
    const isHtml = contentType.includes("text/html") || contentType.includes("application/xhtml+xml") || /<!doctype html|<html/i.test(text);
    if (!isHtml) return { url, title: extractTextTitle(text, url), content: text, error: null, mimeType, status: response.status };

    const { document } = parseHTML(text);
    const reader = new Readability(document as unknown as Document);
    const article = reader.parse();

    if (!article) {
      const rscResult = extractRSCContent(text);
      if (rscResult) return { url, title: rscResult.title, content: rscResult.content, error: null, mimeType, status: response.status };
      const jinaResult = await extractWithJinaReader(url, signal);
      if (jinaResult) return jinaResult;
      return {
        url,
        title: document.title?.trim() || "",
        content: "",
        error: isLikelyJsRendered(text)
          ? `Page appears to be JavaScript-rendered${allowRemoteHostedFetchers() ? "" : "; opt into hosted fallback with fetchRouting.allowRemoteHostedProviders"}`
          : "Could not extract readable content",
        mimeType,
        status: response.status,
      };
    }

    const markdown = turndown.turndown(article.content);
    if (markdown.length < MIN_USEFUL_CONTENT) {
      const rscResult = extractRSCContent(text);
      if (rscResult && rscResult.content.length >= MIN_USEFUL_CONTENT) {
        return { url, title: rscResult.title, content: rscResult.content, error: null, mimeType, status: response.status };
      }
      const jinaResult = await extractWithJinaReader(url, signal);
      if (jinaResult) return jinaResult;
    }

    return { url, title: article.title || document.title?.trim() || "", content: markdown, error: null, mimeType, status: response.status };
  } catch (err) {
    return { url, title: "", content: "", error: errorMessage(err) };
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", onAbort);
  }
}

export async function fetchAllContent(urls: string[], signal?: AbortSignal, options?: ExtractOptions) {
  const results = new Array<ExtractedContent>(urls.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENT_FETCH_LIMIT, urls.length) }, async () => {
    while (next < urls.length) {
      const index = next++;
      results[index] = await extractContent(urls[index], signal, options);
    }
  }));
  return results.map((result, index) => {
    if (!result.content) return result;
    const sanitized = sanitizeInlineDataUris(result.content, `urls[${index}].content`);
    return sanitized.omissions.length ? { ...result, content: sanitized.text } : result;
  });
}
