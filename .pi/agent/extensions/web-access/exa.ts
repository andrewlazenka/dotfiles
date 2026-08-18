import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_PATH = join(homedir(), ".pi", "web-search.json");
const EXA_MCP_URL = "https://mcp.exa.ai/mcp";

interface Config {
  exaApiKey?: unknown;
}

interface McpRpcResponse {
  result?: {
    content?: Array<{ type?: string; text?: string }>;
    isError?: boolean;
  };
  error?: {
    code?: number;
    message?: string;
  };
}

export interface ParsedSearchResult {
  title: string;
  url: string;
  text: string;
}

function loadConfig(): Config {
  if (!existsSync(CONFIG_PATH)) return {};
  return JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as Config;
}

function normalizeApiKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getExaApiKey() {
  return normalizeApiKey(process.env.EXA_API_KEY) ?? normalizeApiKey(loadConfig().exaApiKey);
}

function requestSignal(signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(45000);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

function getHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  const apiKey = getExaApiKey();
  if (apiKey) headers["x-api-key"] = apiKey;
  return headers;
}

function extractText(payload: McpRpcResponse) {
  if (payload.error) {
    throw new Error(payload.error.message || `Exa MCP error ${payload.error.code ?? "unknown"}`);
  }
  if (payload.result?.isError) {
    const msg = payload.result.content?.find((item) => item.type === "text" && item.text)?.text;
    throw new Error(msg || "Exa MCP returned an error");
  }
  const parts = payload.result?.content
    ?.filter((item) => item.type === "text" && typeof item.text === "string")
    .map((item) => item.text!.trim())
    .filter(Boolean);
  return parts?.join("\n\n").trim() || "";
}

export async function callExaMcp(toolName: string, args: Record<string, unknown>, signal?: AbortSignal) {
  const endpoint = `${EXA_MCP_URL}?tools=${encodeURIComponent(toolName)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args,
      },
    }),
    signal: requestSignal(signal),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Exa MCP error ${response.status}: ${errorText.slice(0, 300)}`);
  }

  const body = await response.text();
  const dataLines = body.split("\n").filter((line) => line.startsWith("data:"));

  let parsed: McpRpcResponse | null = null;
  for (const line of dataLines) {
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const candidate = JSON.parse(payload) as McpRpcResponse;
      if (candidate.result || candidate.error) {
        parsed = candidate;
        break;
      }
    } catch {}
  }

  if (!parsed) {
    try {
      parsed = JSON.parse(body) as McpRpcResponse;
    } catch {
      parsed = null;
    }
  }

  if (!parsed) throw new Error("Exa MCP returned an empty response");
  const text = extractText(parsed);
  if (!text) throw new Error("Exa MCP returned empty content");
  return text;
}

export function recencyToStartPublishedDate(recency: "day" | "week" | "month" | "year") {
  const now = Date.now();
  const days = { day: 1, week: 7, month: 30, year: 365 }[recency];
  return new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
}

export function parseSearchResults(text: string): ParsedSearchResult[] {
  const blocks = text.split(/(?=^Title: )/m).filter((block) => block.trim().length > 0);
  return blocks
    .map((block) => {
      const title = block.match(/^Title: (.+)$/m)?.[1]?.trim() ?? "";
      const url = block.match(/^URL: (.+)$/m)?.[1]?.trim() ?? "";
      let content = "";
      const textStart = block.indexOf("\nText: ");
      if (textStart >= 0) content = block.slice(textStart + 7).trim();
      if (!content) {
        const highlightsStart = block.indexOf("\nHighlights:");
        if (highlightsStart >= 0) content = block.slice(highlightsStart + 12).trim();
      }
      return { title, url, text: content.replace(/\n---\s*$/, "").trim() };
    })
    .filter((result) => result.url);
}
