import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { StringEnum } from "@mariozechner/pi-ai";
import {
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
  formatSize,
  keyHint,
  truncateHead,
  type ExtensionAPI,
} from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { Type, type Static } from "typebox";
import { callExaMcp, parseSearchResults, recencyToStartPublishedDate } from "./exa.js";
import { extractContent, fetchAllContent, type ExtractedContent } from "./extract.js";
import { clearCloneCache } from "./github-extract.js";

const searchParams = Type.Object({
  query: Type.Optional(Type.String({ description: "Single search query" })),
  queries: Type.Optional(Type.Array(Type.String(), { description: "Multiple search queries to run" })),
  numResults: Type.Optional(Type.Number({ description: "Results per query (default: 8)" })),
  type: Type.Optional(StringEnum(["auto", "fast", "deep"] as const, { description: "Search type" })),
  recencyFilter: Type.Optional(StringEnum(["day", "week", "month", "year"] as const, { description: "Recency filter" })),
  domainFilter: Type.Optional(Type.Array(Type.String(), { description: "Include domains, or prefix with - to exclude" })),
  category: Type.Optional(
    StringEnum(["company", "research paper", "news", "pdf", "github", "tweet", "personal site", "linkedin profile", "financial report"] as const, {
      description: "Optional Exa category",
    }),
  ),
  textMaxCharacters: Type.Optional(Type.Number({ description: "Max raw text chars per result for advanced search" })),
  contextMaxCharacters: Type.Optional(Type.Number({ description: "Max LLM-ready context chars returned by Exa" })),
  livecrawl: Type.Optional(StringEnum(["fallback", "preferred"] as const, { description: "Live crawl mode" })),
});

const codeSearchParams = Type.Object({
  query: Type.String({ description: "Programming question, API, library, or debugging topic" }),
  maxTokens: Type.Optional(Type.Number({ description: "Maximum tokens of code context to return (default: 5000)" })),
});

const fetchParams = Type.Object({
  url: Type.Optional(Type.String({ description: "Single URL or local video path" })),
  urls: Type.Optional(Type.Array(Type.String(), { description: "Multiple URLs or local video paths" })),
  prompt: Type.Optional(Type.String({ description: "Question to ask about a YouTube or local video" })),
  timestamp: Type.Optional(Type.String({ description: "Extract a single frame or a range, e.g. 23:41 or 23:41-25:00" })),
  frames: Type.Optional(Type.Number({ description: "Number of frames to extract (max 12)" })),
  forceClone: Type.Optional(Type.Boolean({ description: "Force cloning large GitHub repos" })),
  timeout: Type.Optional(Type.Number({ description: "Fetch timeout in seconds for normal pages (max 120)" })),
  model: Type.Optional(Type.String({ description: "Optional Gemini model override for video analysis" })),
  format: Type.Optional(StringEnum(["text", "markdown", "html"] as const, { description: "Compatibility field; ignored for special handlers" })),
  raw: Type.Optional(Type.Boolean({ description: "Compatibility field; ignored for special handlers" })),
});

type SearchInput = Static<typeof searchParams>;
type CodeSearchInput = Static<typeof codeSearchParams>;
type FetchInput = Static<typeof fetchParams>;

type ToolTextResult = {
  content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
  details?: Record<string, unknown>;
};

function normalizeQueries(params: SearchInput) {
  const raw = Array.isArray(params.queries) ? params.queries : params.query ? [params.query] : [];
  return raw.map((q) => q.trim()).filter(Boolean);
}

function truncateWithFallback(text: string) {
  const t = truncateHead(text, { maxLines: DEFAULT_MAX_LINES, maxBytes: DEFAULT_MAX_BYTES });
  if (!t.truncated) return { text: t.content, truncated: false, tempFile: undefined as string | undefined };
  const tempFile = join(tmpdir(), `pi-web-access-${Date.now()}.txt`);
  void writeFile(tempFile, text, "utf8");
  const notice =
    `\n\n[Output truncated: ${t.outputLines} of ${t.totalLines} lines (${formatSize(t.outputBytes)} of ${formatSize(t.totalBytes)}). Full output saved to: ${tempFile}]`;
  return { text: t.content + notice, truncated: true, tempFile };
}

function normalizeFetchTargets(params: FetchInput) {
  const targets = Array.isArray(params.urls) ? params.urls : params.url ? [params.url] : [];
  return targets.map((target) => target.trim()).filter(Boolean);
}

function renderFetchedContent(item: ExtractedContent) {
  if (item.error) return `# ${item.title || item.url}\n\nError: ${item.error}`;
  return `# ${item.title || item.url}\n\nSource: ${item.url}\n\n${item.content}`.trim();
}

function renderCollapsedTextResult(result: ToolTextResult, options: { expanded: boolean; isPartial: boolean }, summary: string) {
  if (options.isPartial) {
    return new Text(summary.replace(/^✓ /, "") + "...", 0, 0);
  }

  const textBlock = result.content.find((item) => item.type === "text" && typeof item.text === "string");
  const body = textBlock?.text?.trim() ?? "";
  if (!options.expanded) {
    return new Text(`${summary} ${keyHint("app.tools.expand", "to expand")}`, 0, 0);
  }

  const parts = [summary];
  if (body) parts.push(body);
  return new Text(parts.join("\n"), 0, 0);
}

async function runWebSearch(params: SearchInput, signal?: AbortSignal) {
  const queries = normalizeQueries(params);
  if (queries.length === 0) throw new Error("No query provided");

  const outputs: string[] = [];
  const allResults: Array<{ query: string; results: ReturnType<typeof parseSearchResults> }> = [];

  for (const query of queries) {
    const includeDomains = params.domainFilter?.filter((domain) => !domain.startsWith("-")).map((domain) => domain.trim()).filter(Boolean);
    const excludeDomains = params.domainFilter?.filter((domain) => domain.startsWith("-")).map((domain) => domain.slice(1).trim()).filter(Boolean);
    const useAdvanced = Boolean(params.category || params.recencyFilter || includeDomains?.length || excludeDomains?.length || params.textMaxCharacters);
    const toolName = useAdvanced ? "web_search_advanced_exa" : "web_search_exa";
    const args: Record<string, unknown> = {
      query,
      type: params.type ?? "auto",
      numResults: params.numResults ?? 8,
      livecrawl: params.livecrawl ?? "fallback",
      contextMaxCharacters: params.contextMaxCharacters,
    };
    if (useAdvanced) {
      if (params.category) args.category = params.category;
      if (includeDomains?.length) args.includeDomains = includeDomains;
      if (excludeDomains?.length) args.excludeDomains = excludeDomains;
      if (params.recencyFilter) args.startPublishedDate = recencyToStartPublishedDate(params.recencyFilter);
      if (params.textMaxCharacters) args.textMaxCharacters = params.textMaxCharacters;
    }

    const text = await callExaMcp(toolName, args, signal);
    const parsed = parseSearchResults(text);
    allResults.push({ query, results: parsed });
    outputs.push(queries.length > 1 ? `## Query: ${query}\n\n${text}` : text);
  }

  const combined = outputs.join("\n\n---\n\n");
  const truncated = truncateWithFallback(combined);
  return {
    content: [{ type: "text", text: truncated.text }],
    details: {
      queries,
      queryCount: queries.length,
      resultCount: allResults.reduce((sum, entry) => sum + entry.results.length, 0),
      truncated: truncated.truncated,
      tempFile: truncated.tempFile,
    },
  };
}

async function runCodeSearch(params: CodeSearchInput, signal?: AbortSignal) {
  const query = params.query.trim();
  if (!query) throw new Error("No query provided");
  const text = await callExaMcp("get_code_context_exa", { query, tokensNum: params.maxTokens ?? 5000 }, signal);
  const truncated = truncateWithFallback(text);
  return {
    content: [{ type: "text", text: truncated.text }],
    details: {
      query,
      maxTokens: params.maxTokens ?? 5000,
      truncated: truncated.truncated,
      tempFile: truncated.tempFile,
    },
  };
}

async function runFetchContent(params: FetchInput, signal?: AbortSignal) {
  const targets = normalizeFetchTargets(params);
  if (targets.length === 0) throw new Error("No url or urls provided");
  const frames = params.frames ? Math.max(1, Math.min(12, Math.floor(params.frames))) : undefined;
  const timeoutMs = params.timeout ? Math.max(1, Math.min(120, Math.floor(params.timeout))) * 1000 : undefined;
  const options = {
    prompt: params.prompt,
    timestamp: params.timestamp,
    frames,
    forceClone: params.forceClone,
    timeoutMs,
    model: params.model,
  };

  const results = targets.length === 1
    ? [await extractContent(targets[0], signal, options)]
    : await fetchAllContent(targets, signal, options);

  const content: Array<{ type: string; text?: string; data?: string; mimeType?: string }> = [];
  const text = results.map(renderFetchedContent).join("\n\n---\n\n");
  const truncated = truncateWithFallback(text);
  content.push({ type: "text", text: truncated.text });

  for (const result of results) {
    if (result.thumbnail) {
      content.push({ type: "image", data: result.thumbnail.data, mimeType: result.thumbnail.mimeType });
    }
    for (const frame of result.frames ?? []) {
      content.push({ type: "image", data: frame.data, mimeType: frame.mimeType });
    }
  }

  return {
    content,
    details: {
      urls: targets,
      count: targets.length,
      errors: results.filter((result) => result.error).map((result) => ({ url: result.url, error: result.error })),
      truncated: truncated.truncated,
      tempFile: truncated.tempFile,
      usedPrompt: params.prompt ?? null,
      timestamp: params.timestamp ?? null,
      frames: frames ?? null,
    },
  };
}

export default function webAccessExtension(pi: ExtensionAPI) {
  pi.on("session_shutdown", () => {
    clearCloneCache();
  });

  pi.registerTool({
    name: "web_search",
    label: "Web Search",
    description: "Broad Exa-based web search for current research, including optional domain/date/category filtering.",
    promptSnippet: "Search the live web with Exa for broad research and current information.",
    promptGuidelines: [
      "Use web_search for broad web research and up-to-date information.",
      "Prefer web_search before fetching individual pages when you need discovery across the web.",
    ],
    parameters: searchParams,
    async execute(_toolCallId, params, signal) {
      return runWebSearch(params, signal);
    },
    renderResult(result, options) {
      const details = result.details as { queryCount?: number; resultCount?: number; truncated?: boolean } | undefined;
      let summary = `✓ ${details?.resultCount ?? 0} results`;
      if ((details?.queryCount ?? 1) > 1) summary += ` across ${details?.queryCount} queries`;
      if (details?.truncated) summary += " (truncated)";
      return renderCollapsedTextResult(result as ToolTextResult, options, summary);
    },
  });

  pi.registerTool({
    name: "code_search",
    label: "Code Search",
    description: "Search GitHub, docs, and technical sources for code examples and API usage via Exa.",
    promptSnippet: "Search for code examples, library docs, and API usage with Exa.",
    promptGuidelines: [
      "Use code_search for code examples, API syntax, library docs, and debugging references.",
    ],
    parameters: codeSearchParams,
    async execute(_toolCallId, params, signal) {
      return runCodeSearch(params, signal);
    },
    renderResult(result, options) {
      const details = result.details as { maxTokens?: number; truncated?: boolean } | undefined;
      let summary = `✓ code context loaded`;
      if (details?.maxTokens) summary += ` (${details.maxTokens} tokens max)`;
      if (details?.truncated) summary += " (truncated)";
      return renderCollapsedTextResult(result as ToolTextResult, options, summary);
    },
  });

  pi.registerTool({
    name: "web_fetch",
    label: "Web Fetch",
    description: "Fetch and extract content from web pages, GitHub repos, PDFs, YouTube videos, and local video files. In this Exa-only setup, video support is limited to frame extraction rather than full AI analysis.",
    promptSnippet: "Fetch readable content from URLs, GitHub repos, PDFs, YouTube videos, or local videos.",
    promptGuidelines: [
      "Use web_fetch for a known URL, GitHub repo, PDF, YouTube video, or local video path.",
      "For YouTube or local videos in this setup, prefer timestamp and frames for still-frame extraction.",
    ],
    parameters: fetchParams,
    async execute(_toolCallId: string, params: FetchInput, signal?: AbortSignal) {
      return runFetchContent(params, signal);
    },
    renderResult(result, options) {
      const details = result.details as { count?: number; errors?: Array<unknown>; truncated?: boolean; frames?: number | null } | undefined;
      const imageCount = result.content.filter((item) => item.type === "image").length;
      const successCount = Math.max(0, (details?.count ?? 0) - (details?.errors?.length ?? 0));
      let summary = `✓ fetched ${successCount}`;
      if ((details?.count ?? 0) > 1) summary += `/${details?.count} targets`;
      else summary += " target";
      if (imageCount > 0) summary += `, ${imageCount} image${imageCount === 1 ? "" : "s"}`;
      if ((details?.errors?.length ?? 0) > 0) summary += `, ${details?.errors?.length} error${details?.errors?.length === 1 ? "" : "s"}`;
      if (details?.truncated) summary += " (truncated)";
      return renderCollapsedTextResult(result as ToolTextResult, options, summary);
    },
  });
}
