import { existsSync, readFileSync } from "node:fs";
import { resolveCredential, redactCredential } from "./credential-source.js";
import { fetchWithCredentialRedirects, getWebSearchConfigPath, resolveApiBaseUrl } from "./utils.js";

const EXA_API_BASE_URL = "https://api.exa.ai";
const EXA_MCP_URL = "https://mcp.exa.ai/mcp";
const CONFIG_PATH = getWebSearchConfigPath();

type SearchType = "auto" | "fast" | "instant";
type Recency = "day" | "week" | "month" | "year";

interface Config {
  exaApiKey?: unknown;
  exaBaseUrl?: unknown;
}

interface McpRpcResponse {
  result?: { content?: Array<{ type?: string; text?: string }>; isError?: boolean };
  error?: { code?: number; message?: string };
}

interface ExaApiResult {
  title?: string;
  url?: string;
  publishedDate?: string;
  author?: string;
  text?: string;
  highlights?: unknown;
}

interface ExaApiResponse {
  results?: ExaApiResult[];
}

export interface ParsedSearchResult {
  title: string;
  url: string;
  text: string;
  publishedDate?: string;
  author?: string;
}

export interface ExaSearchOptions {
  numResults?: number;
  type?: SearchType;
  recencyFilter?: Recency;
  domainFilter?: string[];
  category?: string;
  textMaxCharacters?: number;
  contextMaxCharacters?: number;
  livecrawl?: "fallback" | "preferred";
  includeContent?: boolean;
  signal?: AbortSignal;
}

let cachedConfig: Config | null = null;

function loadConfig(): Config {
  if (cachedConfig) return cachedConfig;
  if (!existsSync(CONFIG_PATH)) return (cachedConfig = {});
  try {
    return (cachedConfig = JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as Config);
  } catch (err) {
    throw new Error(`Failed to parse ${CONFIG_PATH}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function getExaApiKey(signal?: AbortSignal) {
  return resolveCredential({
    provider: "Exa",
    configuredValue: loadConfig().exaApiKey,
    environmentValue: process.env.EXA_API_KEY,
    signal,
  });
}

function requestSignal(signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(60_000);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

export function recencyToStartPublishedDate(recency: Recency) {
  const days = { day: 1, week: 7, month: 30, year: 365 }[recency];
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function domainArgs(domainFilter?: string[]) {
  const includeDomains = domainFilter?.filter((domain) => !domain.startsWith("-")).map((domain) => domain.trim()).filter(Boolean) ?? [];
  const excludeDomains = domainFilter?.filter((domain) => domain.startsWith("-")).map((domain) => domain.slice(1).trim()).filter(Boolean) ?? [];
  return {
    ...(includeDomains.length ? { includeDomains } : {}),
    ...(excludeDomains.length ? { excludeDomains } : {}),
  };
}

function normalizeHighlights(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function mapApiResults(results: ExaApiResult[] | undefined): ParsedSearchResult[] {
  if (!Array.isArray(results)) return [];
  return results.flatMap((item) => {
    if (!item?.url) return [];
    const highlights = normalizeHighlights(item.highlights);
    const text = typeof item.text === "string" && item.text.trim() ? item.text.trim() : highlights.join("\n\n");
    return [{
      title: item.title?.trim() || item.url,
      url: item.url,
      text,
      ...(item.publishedDate ? { publishedDate: item.publishedDate } : {}),
      ...(item.author ? { author: item.author } : {}),
    }];
  });
}

function parseJsonResults(text: string): ParsedSearchResult[] | null {
  try {
    const parsed = JSON.parse(text) as ExaApiResponse;
    const results = mapApiResults(parsed.results);
    return results.length ? results : null;
  } catch {
    return null;
  }
}

export function parseSearchResults(text: string): ParsedSearchResult[] {
  const jsonResults = parseJsonResults(text);
  if (jsonResults) return jsonResults;
  const blocks = text.split(/(?=^Title: )/m).filter((block) => block.trim().length > 0);
  return blocks.flatMap((block) => {
    const title = block.match(/^Title: (.+)$/m)?.[1]?.trim() ?? "";
    const url = block.match(/^URL: (.+)$/m)?.[1]?.trim() ?? "";
    if (!url) return [];
    const publishedDate = block.match(/^Published Date: (.+)$/m)?.[1]?.trim();
    const author = block.match(/^Author: (.+)$/m)?.[1]?.trim();
    const textStart = block.indexOf("\nText: ");
    const highlightsStart = block.indexOf("\nHighlights:");
    let content = textStart >= 0
      ? block.slice(textStart + 7)
      : highlightsStart >= 0
        ? block.slice(highlightsStart + 12)
        : "";
    content = content.replace(/\n---\s*$/, "").trim();
    return [{ title: title || url, url, text: content, ...(publishedDate ? { publishedDate } : {}), ...(author ? { author } : {}) }];
  });
}

function extractMcpText(payload: McpRpcResponse) {
  if (payload.error) throw new Error(payload.error.message || `Exa MCP error ${payload.error.code ?? "unknown"}`);
  const message = payload.result?.content?.filter((item) => item.type === "text" && typeof item.text === "string").map((item) => item.text!.trim()).filter(Boolean).join("\n\n") ?? "";
  if (payload.result?.isError) throw new Error(message || "Exa MCP returned an error");
  if (!message) throw new Error("Exa MCP returned empty content");
  return message;
}

export async function callExaMcp(toolName: string, args: Record<string, unknown>, signal?: AbortSignal) {
  const response = await fetch(`${EXA_MCP_URL}?tools=${encodeURIComponent(toolName)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "x-exa-source": "pi-web-access-local",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: toolName, arguments: args } }),
    signal: requestSignal(signal),
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    if (response.status === 429) throw new Error(`Exa MCP rate limit reached. Set EXA_API_KEY or exaApiKey in ${CONFIG_PATH} to use the direct API.`);
    throw new Error(`Exa MCP error ${response.status}: ${errorText.slice(0, 300)}`);
  }
  const body = await response.text();
  let parsed: McpRpcResponse | null = null;
  for (const line of body.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const value = line.slice(5).trim();
    if (!value || value === "[DONE]") continue;
    try {
      const candidate = JSON.parse(value) as McpRpcResponse;
      if (candidate.result || candidate.error) { parsed = candidate; break; }
    } catch {}
  }
  if (!parsed) {
    try { parsed = JSON.parse(body) as McpRpcResponse; } catch {}
  }
  if (!parsed) throw new Error("Exa MCP returned an empty response");
  return extractMcpText(parsed);
}

function basicFallbackQuery(query: string, options: ExaSearchOptions) {
  const parts = [query];
  for (const domain of options.domainFilter ?? []) parts.push(domain.startsWith("-") ? `-site:${domain.slice(1)}` : `site:${domain}`);
  if (options.recencyFilter) parts.push(`published in the past ${options.recencyFilter}`);
  return parts.join(" ");
}

async function searchMcp(query: string, options: ExaSearchOptions) {
  const advanced = Boolean(options.category || options.recencyFilter || options.domainFilter?.length || options.textMaxCharacters || options.includeContent);
  const common: Record<string, unknown> = {
    query,
    type: options.type ?? "auto",
    numResults: options.numResults ?? 8,
    livecrawl: options.livecrawl ?? "fallback",
    ...(options.contextMaxCharacters ? { contextMaxCharacters: options.contextMaxCharacters } : {}),
  };
  if (advanced) {
    try {
      const text = await callExaMcp("web_search_advanced_exa", {
        ...common,
        ...domainArgs(options.domainFilter),
        ...(options.category ? { category: options.category } : {}),
        ...(options.recencyFilter ? { startPublishedDate: recencyToStartPublishedDate(options.recencyFilter) } : {}),
        textMaxCharacters: options.textMaxCharacters ?? (options.includeContent ? 50_000 : 3_000),
      }, options.signal);
      return parseSearchResults(text);
    } catch (err) {
      const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
      if (message.includes("abort") || message.includes("rate limit")) throw err;
    }
  }
  const text = await callExaMcp("web_search_exa", {
    query: advanced ? basicFallbackQuery(query, options) : query,
    type: options.type ?? "auto",
    numResults: options.numResults ?? 8,
    livecrawl: options.livecrawl ?? "fallback",
    ...(options.contextMaxCharacters ? { contextMaxCharacters: options.contextMaxCharacters } : {}),
  }, options.signal);
  return parseSearchResults(text);
}

async function searchDirect(query: string, apiKey: string, options: ExaSearchOptions) {
  const apiBase = resolveApiBaseUrl({
    configKey: "exaBaseUrl",
    configuredValue: loadConfig().exaBaseUrl,
    defaultValue: EXA_API_BASE_URL,
    environmentKey: "EXA_BASE_URL",
    environmentValue: process.env.EXA_BASE_URL,
  });
  const maxChars = options.textMaxCharacters ?? (options.includeContent ? 50_000 : 3_000);
  const response = await fetchWithCredentialRedirects(`${apiBase}/search`, {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json", "x-exa-integration": "pi-web-access-local" },
    body: JSON.stringify({
      query,
      type: options.type ?? "auto",
      numResults: options.numResults ?? 8,
      ...domainArgs(options.domainFilter),
      ...(options.category ? { category: options.category } : {}),
      ...(options.recencyFilter ? { startPublishedDate: recencyToStartPublishedDate(options.recencyFilter) } : {}),
      contents: options.includeContent
        ? { text: { maxCharacters: maxChars }, highlights: true, livecrawl: options.livecrawl ?? "fallback" }
        : { highlights: { maxCharacters: maxChars }, livecrawl: options.livecrawl ?? "fallback" },
    }),
    signal: requestSignal(options.signal),
  }, ["x-api-key"]);
  if (!response.ok) {
    const errorText = redactCredential(await response.text(), apiKey);
    throw new Error(`Exa API error ${response.status}: ${errorText.slice(0, 300)}`);
  }
  return mapApiResults((await response.json() as ExaApiResponse).results);
}

export async function searchWithExa(query: string, options: ExaSearchOptions = {}) {
  const apiKey = await getExaApiKey(options.signal);
  return apiKey ? searchDirect(query, apiKey, options) : searchMcp(query, options);
}
