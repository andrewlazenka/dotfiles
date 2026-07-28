import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { type ExtractedContent, type FrameResult } from "./extract.js";
import { mapFfmpegError, readExecError, trimErrorText } from "./utils.js";

const CONFIG_PATH = join(homedir(), ".pi", "web-search.json");

const VIDEO_EXTENSIONS: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".avi": "video/x-msvideo",
  ".mpeg": "video/mpeg",
  ".mpg": "video/mpeg",
  ".wmv": "video/x-ms-wmv",
  ".flv": "video/x-flv",
  ".3gp": "video/3gpp",
  ".3gpp": "video/3gpp",
};

interface VideoFileInfo {
  absolutePath: string;
  mimeType: string;
  sizeBytes: number;
}

interface VideoConfig {
  enabled: boolean;
  maxSizeMB: number;
}

const DEFAULTS: VideoConfig = { enabled: true, maxSizeMB: 50 };
let cachedConfig: VideoConfig | null = null;

function loadVideoConfig(): VideoConfig {
  if (cachedConfig) return cachedConfig;
  if (!existsSync(CONFIG_PATH)) return (cachedConfig = { ...DEFAULTS });
  try {
    const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as { video?: { enabled?: boolean; maxSizeMB?: number } };
    cachedConfig = {
      enabled: typeof raw.video?.enabled === "boolean" ? raw.video.enabled : DEFAULTS.enabled,
      maxSizeMB:
        typeof raw.video?.maxSizeMB === "number" && Number.isFinite(raw.video.maxSizeMB) && raw.video.maxSizeMB > 0
          ? raw.video.maxSizeMB
          : DEFAULTS.maxSizeMB,
    };
    return cachedConfig;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse ${CONFIG_PATH}: ${message}`);
  }
}

function normalizeSpaces(value: string) {
  return value.replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, " ");
}

function resolveFilePath(filePath: string): string | null {
  const absolutePath = resolve(filePath);
  if (existsSync(absolutePath)) return absolutePath;
  const dir = dirname(absolutePath);
  const base = basename(absolutePath);
  if (!existsSync(dir)) return null;
  try {
    const normalizedBase = normalizeSpaces(base);
    const match = readdirSync(dir).find((file) => normalizeSpaces(file) === normalizedBase);
    return match ? join(dir, match) : null;
  } catch {
    return null;
  }
}

export function isVideoFile(input: string): VideoFileInfo | null {
  const config = loadVideoConfig();
  if (!config.enabled) return null;
  const isPath = input.startsWith("/") || input.startsWith("./") || input.startsWith("../") || input.startsWith("file://");
  if (!isPath) return null;

  let filePath = input;
  if (input.startsWith("file://")) {
    try {
      filePath = decodeURIComponent(new URL(input).pathname);
    } catch {
      return null;
    }
  }

  const ext = extname(filePath).toLowerCase();
  const mimeType = VIDEO_EXTENSIONS[ext];
  if (!mimeType) return null;

  const absolutePath = resolveFilePath(filePath);
  if (!absolutePath) return null;
  let stat;
  try {
    stat = statSync(absolutePath);
  } catch {
    return null;
  }
  if (!stat.isFile()) return null;
  if (stat.size > config.maxSizeMB * 1024 * 1024) return null;
  return { absolutePath, mimeType, sizeBytes: stat.size };
}

export async function extractVideo(info: VideoFileInfo): Promise<ExtractedContent | null> {
  return {
    url: info.absolutePath,
    title: basename(info.absolutePath),
    content: "Full local video analysis was removed with Gemini support. Use timestamp/frames with fetch_content to extract still frames.",
    error: "Local video analysis is not available in this Exa-only setup.",
  };
}

export async function extractVideoFrame(filePath: string, seconds = 1): Promise<FrameResult> {
  try {
    const buffer = execFileSync(
      "ffmpeg",
      ["-ss", String(seconds), "-i", filePath, "-frames:v", "1", "-f", "image2pipe", "-vcodec", "mjpeg", "pipe:1"],
      { maxBuffer: 5 * 1024 * 1024, timeout: 10000, stdio: ["pipe", "pipe", "pipe"] },
    );
    if (buffer.length === 0) return { error: "ffmpeg failed: empty output" };
    return { data: buffer.toString("base64"), mimeType: "image/jpeg" };
  } catch (err) {
    return { error: mapFfmpegError(err) };
  }
}

function mapFfprobeError(err: unknown): string {
  const { code, stderr, message } = readExecError(err);
  if (code === "ENOENT") return "ffprobe is not installed. Install ffmpeg which includes ffprobe";
  const snippet = trimErrorText(stderr || message);
  return snippet ? `ffprobe failed: ${snippet}` : "ffprobe failed";
}

export async function getLocalVideoDuration(filePath: string): Promise<number | { error: string }> {
  try {
    const output = execFileSync(
      "ffprobe",
      ["-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", filePath],
      { timeout: 10000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
    ).trim();
    const duration = Number.parseFloat(output);
    if (!Number.isFinite(duration)) return { error: "ffprobe failed: invalid duration output" };
    return duration;
  } catch (err) {
    return { error: mapFfprobeError(err) };
  }
}
