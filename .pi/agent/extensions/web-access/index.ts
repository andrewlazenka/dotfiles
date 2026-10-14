import { existsSync, readFileSync } from "node:fs";
import { StringEnum } from "@earendil-works/pi-ai";
import { keyHint, type AgentToolResult, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type, type Static } from "typebox";
import { callExaMcp, searchWithExa, type ParsedSearchResult } from "./exa.js";
import { extractContent, fetchAllContent, type ExtractedContent } from "./extract.js";
import { clearCloneCache } from "./github-extract.js";
import { findContent, type FindMode } from "./content-find.js";
import { sanitizeInlineDataUris } from "./data-uri-sanitize.js";
import {
  generateId,
  getResult,
  restoreFromSession,
  storeFetchedContentResult,
  type StoredSearchData,
} from "./storage.js";
import { getWebSearchConfigPath } from "./utils.js";

const DEFAULT_MAX_INLINE_CONTENT_CHARS = 30_000;
const MAX_INLINE_CONTENT_CHARS = 200_000;

const searchParams = Type.Object({
  query: Type.Optional(Type.String({ description: "Single search query" })),
  queries: Type.Optional(Type.Array(Type.String(), { description: "Multiple search queries to run" })),
  numResults: Type.Optional(Type.Integer({ minimum: 1, maximum: 20, description: "Results per query (default: 8)" })),
  type: Type.Optional(StringEnum(["auto", "fast", "instant"] as const, { description: "Exa search type" })),
  recencyFilter: Type.Optional(StringEnum(["day", "week", "month", "year"] as const, { description: "Recency filter" })),
  domainFilter: Type.Optional(Type.Array(Type.String(), { description: "Include domains, or prefix with - to exclude" })),
  category: Type.Optional(
    StringEnum(["company", "research paper", "news", "pdf", "github", "tweet", "personal site", "linkedin profile", "financial report"] as const, {
      description: "Optional Exa category",
    }),
  ),
  includeContent: Type.Optional(Type.Boolean({ description: "Include page text in search results" })),
  textMaxCharacters: Type.Optional(Type.Integer({ minimum: 1, maximum: 100_000, description: "Max page text chars per result" })),
  contextMaxCharacters: Type.Optional(Type.Integer({ minimum: 1, maximum: 100_000, description: "Max LLM-ready context chars returned by Exa MCP" })),
  livecrawl: Type.Optional(StringEnum(["fallback", "preferred"] as const, { description: "Live crawl mode" })),
});

const codeSearchParams = Type.Object({
  query: Type.String({ description: "Programming question, API, library, or debugging topic" }),
  maxTokens: Type.Optional(Type.Integer({ minimum: 100, maximum: 50_000, description: "Maximum tokens of code context (default: 5000)" })),
});

const fetchParams = Type.Object({
  url: Type.Optional(Type.String({ description: "Single URL or local video path" })),
  urls: Type.Optional(Type.Array(Type.String(), { description: "Multiple URLs or local video paths" })),
  prompt: Type.Optional(Type.String({ description: "Question to ask about a YouTube or local video" })),
  timestamp: Type.Optional(Type.String({ description: "Extract a single frame or a range, e.g. 23:41 or 23:41-25:00" })),
  frames: Type.Optional(Type.Integer({ minimum: 1, maximum: 12, description: "Number of frames to extract" })),
  forceClone: Type.Optional(Type.Boolean({ description: "Force cloning large GitHub repos" })),
  timeout: Type.Optional(Type.Integer({ minimum: 1, maximum: 120, description: "Fetch timeout in seconds" })),
  model: Type.Optional(Type.String({ description: "Optional Gemini model override for video analysis" })),
  format: Type.Optional(StringEnum(["text", "markdown", "html"] as const, { description: "Compatibility field; ignored for special handlers" })),
  raw: Type.Optional(Type.Boolean({ description: "Compatibility field; ignored" })),
});

const getContentParams = Type.Object({
  responseId: Type.String({ description: "responseId returned by web_search, code_search, or web_fetch" }),
  url: Type.Optional(Type.String({ description: "Select stored content by URL" })),
  urlIndex: Type.Optional(Type.Integer({ minimum: 0, description: "Select stored content by zero-based URL index" })),
  offset: Type.Optional(Type.Integer({ minimum: 0, description: "Character offset; cannot be combined with findText" })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: MAX_INLINE_CONTENT_CHARS, description: "Maximum characters to return; cannot be combined with findText" })),
  findText: Type.Optional(Type.Union([
    Type.String({ minLength: 1, maxLength: 500 }),
    Type.Array(Type.String({ minLength: 1, maxLength: 500 }), { minItems: 1, maxItems: 10 }),
  ], { description: "Find bounded matching passages instead of paging" })),
  findMode: Type.Optional(StringEnum(["exact", "case-insensitive", "fuzzy"] as const, { description: "Matching mode; default case-insensitive" })),
});

type SearchInput = Static<typeof searchParams>;
type CodeSearchInput = Static<typeof codeSearchParams>;
type FetchInput = Static<typeof fetchParams>;
type GetContentInput = Static<typeof getContentParams>;

type ToolTextResult = {
  content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
  details?: Record<string, unknown>;
};

function loadMaxInlineContentChars() {
  const path = getWebSearchConfigPath();
  if (!existsSync(path)) return DEFAULT_MAX_INLINE_CONTENT_CHARS;
  try {
    const config = JSON.parse(readFileSync(path, "utf-8")) as { maxInlineContentChars?: number };
    const value = config.maxInlineContentChars;
    if (!Number.isInteger(value) || (value ?? 0) <= 0) return DEFAULT_MAX_INLINE_CONTENT_CHARS;
    return Math.min(value!, MAX_INLINE_CONTENT_CHARS);
  } catch (err) {
    throw new Error(`Failed to parse ${path}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function normalizeQueries(params: SearchInput) {
  const raw = Array.isArray(params.queries) && params.queries.length ? params.queries : params.query ? [params.query] : [];
  return [...new Set(raw.map((query) => query.trim()).filter(Boolean))];
}

function normalizeFetchTargets(params: FetchInput) {
  const raw = Array.isArray(params.urls) && params.urls.length ? params.urls : params.url ? [params.url] : [];
  return [...new Set(raw.map((target) => target.trim()).filter(Boolean))];
}

function initialSlice(content: string, maxChars: number) {
  let end = Math.min(content.length, maxChars);
  if (end < content.length) {
    const lineBreak = content.lastIndexOf("\n", end);
    if (lineBreak >= Math.floor(maxChars * 0.8)) end = lineBreak + 1;
  }
  return { text: content.slice(0, end), end, truncated: end < content.length };
}

function stripImages(items: ExtractedContent[]): ExtractedContent[] {
  return items.map(({ thumbnail: _thumbnail, frames: _frames, ...item }) => item);
}

function storeContent(pi: ExtensionAPI, items: ExtractedContent[]) {
  const responseId = generateId();
  const data = {
    id: responseId,
    type: "fetch",
    timestamp: Date.now(),
    urls: stripImages(items),
  } satisfies StoredSearchData & { type: "fetch"; urls: ExtractedContent[] };
  pi.appendEntry("web-search-results", storeFetchedContentResult(responseId, data));
  return responseId;
}

function formatSearchResult(result: ParsedSearchResult, index: number) {
  const metadata = [result.publishedDate, result.author].filter(Boolean).join(" · ");
  return [
    `## ${index + 1}. ${result.title}`,
    result.url,
    metadata,
    result.text,
  ].filter(Boolean).join("\n\n");
}

async function runWebSearch(pi: ExtensionAPI, params: SearchInput, signal?: AbortSignal): Promise<AgentToolResult<Record<string, unknown>>> {
  const queries = normalizeQueries(params);
  if (!queries.length) throw new Error("No query provided");
  const batches = await Promise.all(queries.map(async (query) => {
    const results = await searchWithExa(query, {
      numResults: params.numResults ?? 8,
      type: params.type ?? "auto",
      recencyFilter: params.recencyFilter,
      domainFilter: params.domainFilter,
      category: params.category,
      includeContent: params.includeContent,
      textMaxCharacters: params.textMaxCharacters,
      contextMaxCharacters: params.contextMaxCharacters,
      livecrawl: params.livecrawl,
      signal,
    });
    return {
      query,
      results: results.map((result, index) => ({
        ...result,
        text: sanitizeInlineDataUris(result.text, `search.${query}.${index}`).text,
      })),
    };
  }));

  const storedItems: ExtractedContent[] = [];
  const sections = batches.map(({ query, results }) => {
    for (const result of results) storedItems.push({ url: result.url, title: result.title, content: result.text, error: null });
    const body = results.length ? results.map(formatSearchResult).join("\n\n---\n\n") : "No results found.";
    return queries.length > 1 ? `# Query: ${query}\n\n${body}` : body;
  });
  const responseId = storeContent(pi, storedItems);
  const fullText = sections.join("\n\n---\n\n");
  const slice = initialSlice(fullText, loadMaxInlineContentChars());
  let text = slice.text;
  if (slice.truncated) text += `\n\n---\nSearch output truncated at ${slice.end} of ${fullText.length} characters. Use get_search_content({ responseId: "${responseId}", urlIndex: 0 }) to retrieve individual result content.`;
  return {
    content: [{ type: "text", text }],
    details: { queries, queryCount: queries.length, resultCount: storedItems.length, responseId, truncated: slice.truncated },
  };
}

async function runCodeSearch(pi: ExtensionAPI, params: CodeSearchInput, signal?: AbortSignal): Promise<AgentToolResult<Record<string, unknown>>> {
  const query = params.query.trim();
  if (!query) throw new Error("No query provided");
  const rawText = await callExaMcp("get_code_context_exa", { query, tokensNum: params.maxTokens ?? 5000 }, signal);
  const text = sanitizeInlineDataUris(rawText, "codeSearch.content").text;
  const responseId = storeContent(pi, [{ url: `exa-code:${encodeURIComponent(query)}`, title: `Code context: ${query}`, content: text, error: null }]);
  const slice = initialSlice(text, loadMaxInlineContentChars());
  return {
    content: [{ type: "text", text: slice.text + (slice.truncated ? `\n\n---\nUse get_search_content({ responseId: "${responseId}", urlIndex: 0, offset: ${slice.end} }) for the next slice.` : "") }],
    details: { query, maxTokens: params.maxTokens ?? 5000, responseId, truncated: slice.truncated },
  };
}

async function runFetchContent(pi: ExtensionAPI, params: FetchInput, signal?: AbortSignal): Promise<AgentToolResult<Record<string, unknown>>> {
  const targets = normalizeFetchTargets(params);
  if (!targets.length) throw new Error("No url or urls provided");
  const options = {
    prompt: params.prompt,
    timestamp: params.timestamp,
    frames: params.frames,
    forceClone: params.forceClone,
    timeoutMs: params.timeout ? params.timeout * 1000 : undefined,
    model: params.model,
  };
  const results = await fetchAllContent(targets, signal, options);
  const responseId = storeContent(pi, results);
  const successful = results.filter((result) => !result.error).length;
  const content: Array<
    | { type: "text"; text: string }
    | { type: "image"; data: string; mimeType: string }
  > = [];

  for (const result of results) {
    if (result.thumbnail) content.push({ type: "image", data: result.thumbnail.data, mimeType: result.thumbnail.mimeType });
    for (const frame of result.frames ?? []) content.push({ type: "image", data: frame.data, mimeType: frame.mimeType });
  }

  if (results.length === 1) {
    const result = results[0];
    if (result.error) {
      content.push({ type: "text", text: `Error: ${result.error}` });
    } else {
      const slice = initialSlice(result.content, loadMaxInlineContentChars());
      let text = `# ${result.title || result.url}\n\nSource: ${result.url}\n\n${slice.text}`;
      if (slice.truncated) text += `\n\n---\nShowing ${slice.end} of ${result.content.length} characters. Use get_search_content({ responseId: "${responseId}", urlIndex: 0, offset: ${slice.end} }) for the next slice.`;
      content.push({ type: "text", text });
    }
  } else {
    const summary = results.map((result, index) => result.error
      ? `${index}. ${result.url}: Error — ${result.error}`
      : `${index}. ${result.title || result.url} (${result.content.length} chars)`).join("\n");
    content.push({ type: "text", text: `# Fetched URLs\n\n${summary}\n\nUse get_search_content({ responseId: "${responseId}", urlIndex: 0 }) to retrieve content.` });
  }

  return {
    content,
    details: {
      urls: targets,
      count: targets.length,
      successful,
      errors: results.filter((result) => result.error).map((result) => ({ url: result.url, error: result.error })),
      responseId,
      truncated: results.length === 1 && results[0].content.length > loadMaxInlineContentChars(),
    },
  };
}

function selectStoredUrl(data: StoredSearchData, params: GetContentInput) {
  if (data.type !== "fetch" || !data.urls) return { error: "Stored result does not contain retrievable URL content" } as const;
  if (params.url !== undefined) {
    const index = data.urls.findIndex((item) => item.url === params.url);
    return index >= 0 ? { item: data.urls[index], index } as const : { error: "URL not found in stored result" } as const;
  }
  if (params.urlIndex !== undefined) {
    return data.urls[params.urlIndex]
      ? { item: data.urls[params.urlIndex], index: params.urlIndex } as const
      : { error: `URL index out of range; valid indexes are 0-${Math.max(0, data.urls.length - 1)}` } as const;
  }
  if (data.urls.length === 1) return { item: data.urls[0], index: 0 } as const;
  return { error: `Specify url or urlIndex. Available URLs:\n${data.urls.map((item, index) => `${index}: ${item.url}`).join("\n")}` } as const;
}

async function runGetContent(params: GetContentInput): Promise<AgentToolResult<Record<string, unknown>>> {
  if (params.findText !== undefined && (params.offset !== undefined || params.limit !== undefined)) throw new Error("findText cannot be combined with offset or limit");
  if (params.findMode !== undefined && params.findText === undefined) throw new Error("findMode requires findText");
  const data = getResult(params.responseId);
  if (!data) throw new Error(`No stored content for responseId ${params.responseId}; it may have expired`);
  const selected = selectStoredUrl(data, params);
  if ("error" in selected) throw new Error(selected.error);
  const { item, index } = selected;
  if (item.error) throw new Error(`Stored fetch failed: ${item.error}`);

  if (params.findText !== undefined) {
    const queries = (Array.isArray(params.findText) ? params.findText : [params.findText]).map((value) => value.trim()).filter(Boolean);
    const found = findContent(item.content, queries, (params.findMode ?? "case-insensitive") as FindMode);
    const { text, ...details } = found;
    return { content: [{ type: "text", text: `# ${item.title || item.url}\n\n${text}` }], details: { responseId: params.responseId, url: item.url, urlIndex: index, ...details } };
  }

  const max = loadMaxInlineContentChars();
  const offset = params.offset ?? 0;
  const limit = params.limit ?? max;
  if (limit > max) throw new Error(`limit must not exceed configured maxInlineContentChars (${max})`);
  if (offset > item.content.length) throw new Error(`offset ${offset} exceeds content length ${item.content.length}`);
  const end = Math.min(offset + limit, item.content.length);
  const slice = item.content.slice(offset, end);
  const hasMore = end < item.content.length;
  let text = `# ${item.title || item.url}\n\n${slice}`;
  if (offset > 0 || hasMore) {
    text += `\n\n---\nShowing chars ${offset}-${end} of ${item.content.length}.`;
    if (hasMore) text += ` Use get_search_content({ responseId: "${params.responseId}", urlIndex: ${index}, offset: ${end}, limit: ${limit} }) for the next slice.`;
  }
  return {
    content: [{ type: "text", text }],
    details: { responseId: params.responseId, url: item.url, urlIndex: index, contentLength: item.content.length, offset, limit, returnedChars: slice.length, nextOffset: hasMore ? end : null, truncated: hasMore },
  };
}

function renderCollapsedTextResult(result: ToolTextResult, options: { expanded: boolean; isPartial: boolean }, summary: string) {
  if (options.isPartial) return new Text(summary.replace(/^✓ /, "") + "...", 0, 0);
  const body = result.content.find((item) => item.type === "text" && typeof item.text === "string")?.text?.trim() ?? "";
  if (!options.expanded) return new Text(`${summary} ${keyHint("app.tools.expand", "to expand")}`, 0, 0);
  return new Text(body ? `${summary}\n${body}` : summary, 0, 0);
}

export default function webAccessExtension(pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => restoreFromSession(ctx));
  pi.on("session_shutdown", () => clearCloneCache());

  pi.registerTool({
    name: "web_search",
    label: "Web Search",
    description: "Search the live web with Exa. Supports direct API credentials or zero-config Exa MCP, filters, and optional page content.",
    promptSnippet: "Search the live web with Exa for broad research and current information.",
    promptGuidelines: ["Use web_search for broad web research and up-to-date information."],
    parameters: searchParams,
    async execute(_id, params, signal) { return runWebSearch(pi, params, signal); },
    renderResult(result, options) {
      const details = result.details as { resultCount?: number; queryCount?: number; truncated?: boolean } | undefined;
      return renderCollapsedTextResult(result as ToolTextResult, options, `✓ ${details?.resultCount ?? 0} results${(details?.queryCount ?? 1) > 1 ? ` across ${details?.queryCount} queries` : ""}${details?.truncated ? " (truncated)" : ""}`);
    },
  });

  pi.registerTool({
    name: "code_search",
    label: "Code Search",
    description: "Search GitHub, docs, and technical sources for code examples and API usage via Exa.",
    promptSnippet: "Search for code examples, library docs, and API usage with Exa.",
    promptGuidelines: ["Use code_search for code examples, API syntax, library docs, and debugging references."],
    parameters: codeSearchParams,
    async execute(_id, params, signal) { return runCodeSearch(pi, params, signal); },
    renderResult(result, options) { return renderCollapsedTextResult(result as ToolTextResult, options, "✓ code context loaded"); },
  });

  pi.registerTool({
    name: "web_fetch",
    label: "Web Fetch",
    description: "Safely fetch and extract content from public web pages, GitHub repos, PDFs, YouTube videos, and local videos. Remote hosted extraction fallbacks are opt-in.",
    promptSnippet: "Fetch readable content from URLs, GitHub repos, PDFs, YouTube videos, or local videos.",
    promptGuidelines: [
      "Use web_fetch for a known URL, GitHub repo, PDF, YouTube video, or local video path.",
      "Use get_search_content with the returned responseId to inspect long fetched content.",
    ],
    parameters: fetchParams,
    async execute(_id, params, signal) { return runFetchContent(pi, params, signal); },
    renderResult(result, options) {
      const details = result.details as { count?: number; successful?: number; errors?: unknown[]; truncated?: boolean } | undefined;
      const images = result.content.filter((item) => item.type === "image").length;
      let summary = `✓ fetched ${details?.successful ?? 0}/${details?.count ?? 0}`;
      if (images) summary += `, ${images} image${images === 1 ? "" : "s"}`;
      if (details?.errors?.length) summary += `, ${details.errors.length} errors`;
      if (details?.truncated) summary += " (truncated)";
      return renderCollapsedTextResult(result as ToolTextResult, options, summary);
    },
  });

  pi.registerTool({
    name: "get_search_content",
    label: "Get Search Content",
    description: "Retrieve bounded slices or matching passages from content stored by web_search, code_search, or web_fetch. Stored content expires after one hour.",
    promptSnippet: "Retrieve or search full content from earlier web tools using their responseId.",
    promptGuidelines: ["Use get_search_content to continue reading or find passages in truncated web tool results."],
    parameters: getContentParams,
    async execute(_id, params) { return runGetContent(params); },
    renderResult(result, options) { return renderCollapsedTextResult(result as ToolTextResult, options, "✓ stored content loaded"); },
  });
}
