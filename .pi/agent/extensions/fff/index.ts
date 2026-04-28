import { FileFinder, type FileItem, type GrepMatch, type Location, type Score } from "@ff-labs/fff-node";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createGrepTool, createReadTool, getAgentDir } from "@mariozechner/pi-coding-agent";
import { Text, type AutocompleteItem, type AutocompleteProvider, type AutocompleteSuggestions } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { homedir } from "node:os";

type RuntimeState = {
  finder: FileFinder;
  cwd: string;
  dbDir: string;
};

type ResolvedPath = {
  absolutePath: string;
  relativePath: string;
  location?: Location;
};

const MAX_AUTOCOMPLETE = 20;
const MAX_FIND_FILES = 30;
const PATH_DELIMITERS = new Set([" ", "\t", '"', "'", "="]);

function hashPath(value: string) {
  return createHash("sha1").update(value).digest("hex").slice(0, 12);
}

function ensureDir(path: string) {
  mkdirSync(path, { recursive: true });
}

function getDbDir(cwd: string) {
  return join(homedir(), ".pi", "agent", "state", "fff", hashPath(cwd));
}

function normalizeAtPath(value: string) {
  let normalized = value.trim();
  if (normalized.startsWith("@")) normalized = normalized.slice(1);
  if (normalized.startsWith('"') && normalized.endsWith('"') && normalized.length >= 2) {
    normalized = normalized.slice(1, -1);
  }
  return normalized;
}

function tryExactPath(cwd: string, rawPath: string) {
  const normalized = normalizeAtPath(rawPath);
  if (!normalized) return null;
  const absolutePath = resolve(cwd, normalized);
  if (!existsSync(absolutePath)) return null;
  const stats = statSync(absolutePath);
  if (!stats.isFile()) return null;
  return {
    absolutePath,
    relativePath: relative(cwd, absolutePath) || normalized,
  } satisfies ResolvedPath;
}

function locationToReadParams(location: Location | undefined, offset: number | undefined, limit: number | undefined) {
  if (offset !== undefined || !location) return { offset, limit };
  if (location.type === "line") return { offset: location.line, limit: limit ?? 80 };
  if (location.type === "position") return { offset: location.line, limit: limit ?? 80 };
  const rangeSize = Math.max(1, location.end.line - location.start.line + 1);
  return { offset: location.start.line, limit: limit ?? Math.max(rangeSize, 20) };
}

function formatFileLine(item: FileItem, score?: Score, index?: number) {
  const prefix = index === undefined ? "-" : `${index + 1}.`;
  const matchType = score?.matchType ? ` [${score.matchType}]` : "";
  return `${prefix} ${item.relativePath}${matchType}`;
}

function formatFindFiles(items: FileItem[], scores: Score[], query: string) {
  if (items.length === 0) return `No files matched "${query}".`;
  return items.map((item, index) => formatFileLine(item, scores[index], index)).join("\n");
}

function formatContextLines(path: string, startLine: number, lines: string[] | undefined, marker: string) {
  if (!lines || lines.length === 0) return [];
  return lines.map((line, index) => `${path}-${startLine + index}-${marker} ${line}`);
}

function formatGrepMatch(match: GrepMatch) {
  const path = match.relativePath;
  const beforeStart = Math.max(1, match.lineNumber - (match.contextBefore?.length ?? 0));
  const afterStart = match.lineNumber + 1;
  return [
    ...formatContextLines(path, beforeStart, match.contextBefore, "-"),
    `${path}:${match.lineNumber}: ${match.lineContent}`,
    ...formatContextLines(path, afterStart, match.contextAfter, "-"),
  ];
}

function formatGrep(matches: GrepMatch[], nextCursor: unknown) {
  const lines = matches.flatMap((match) => formatGrepMatch(match));
  if (nextCursor) lines.push("", "[FFF grep has more results; narrow the pattern or scope and search again.]");
  return lines.join("\n");
}

function parseAtPrefix(text: string): string | null {
  const quoteMatch = text.match(/(?:^|[ \t])@"([^"]*)$/);
  if (quoteMatch) return `@"${quoteMatch[1] ?? ""}`;
  const plainMatch = text.match(/(?:^|[ \t])@([^\s@"]*)$/);
  if (plainMatch) return `@${plainMatch[1] ?? ""}`;
  return null;
}

function parseAutocompleteQuery(prefix: string) {
  if (prefix.startsWith('@"')) {
    return { query: prefix.slice(2), quoted: true };
  }
  return { query: prefix.slice(1), quoted: false };
}

function completionValue(relativePath: string, quoted: boolean) {
  const normalized = relativePath.replace(/\\/g, "/");
  return quoted || normalized.includes(" ") ? `@"${normalized}"` : `@${normalized}`;
}

function buildAutocompleteProvider(getRuntime: () => RuntimeState | null): (current: AutocompleteProvider) => AutocompleteProvider {
  return (current) => ({
    async getSuggestions(lines, cursorLine, cursorCol, options): Promise<AutocompleteSuggestions | null> {
      const runtime = getRuntime();
      if (!runtime) return current.getSuggestions(lines, cursorLine, cursorCol, options);

      const line = lines[cursorLine] ?? "";
      const beforeCursor = line.slice(0, cursorCol);
      const prefix = parseAtPrefix(beforeCursor);
      if (!prefix) return current.getSuggestions(lines, cursorLine, cursorCol, options);

      const { query, quoted } = parseAutocompleteQuery(prefix);
      const result = runtime.finder.fileSearch(query, { pageSize: MAX_AUTOCOMPLETE });
      if (!result.ok || result.value.items.length === 0 || options.signal.aborted) {
        return current.getSuggestions(lines, cursorLine, cursorCol, options);
      }

      const items: AutocompleteItem[] = result.value.items.map((item, index) => ({
        value: completionValue(item.relativePath, quoted),
        label: item.fileName || item.relativePath,
        description: `${item.relativePath}${result.value.scores[index]?.matchType ? ` · ${result.value.scores[index]?.matchType}` : ""}`,
      }));

      return { prefix, items };
    },

    applyCompletion(lines, cursorLine, cursorCol, item, prefix) {
      const runtime = getRuntime();
      if (runtime) {
        const trackedPath = normalizeAtPath(item.value);
        runtime.finder.trackQuery(prefix, trackedPath);
      }
      return current.applyCompletion(lines, cursorLine, cursorCol, item, prefix);
    },

    shouldTriggerFileCompletion(lines, cursorLine, cursorCol) {
      return current.shouldTriggerFileCompletion?.(lines, cursorLine, cursorCol) ?? true;
    },
  });
}

function createRuntime(cwd: string): { runtime: RuntimeState | null; error?: string } {
  try {
    ensureDir(getDbDir(cwd));
    const dbDir = getDbDir(cwd);
    const created = FileFinder.create({
      basePath: cwd,
      frecencyDbPath: join(dbDir, "frecency.mdb"),
      historyDbPath: join(dbDir, "history.mdb"),
      aiMode: true,
    });
    if (!created.ok) return { runtime: null, error: created.error };
    return { runtime: { finder: created.value, cwd, dbDir } };
  } catch (error) {
    return { runtime: null, error: error instanceof Error ? error.message : String(error) };
  }
}

function resolveSearchPath(runtime: RuntimeState | null, cwd: string, rawPath: string): ResolvedPath | null {
  const exact = tryExactPath(cwd, rawPath);
  if (exact) return exact;
  if (!runtime) return null;

  const query = normalizeAtPath(rawPath);
  if (!query) return null;
  const result = runtime.finder.fileSearch(query, { pageSize: 5 });
  if (!result.ok || result.value.items.length === 0) return null;

  const item = result.value.items[0];
  runtime.finder.trackQuery(query, item.relativePath);
  return {
    absolutePath: join(runtime.cwd, item.relativePath),
    relativePath: item.relativePath,
    location: result.value.location,
  };
}

function resolveScope(runtime: RuntimeState | null, cwd: string, rawScope: string) {
  const exactAbsolute = resolve(cwd, normalizeAtPath(rawScope));
  if (existsSync(exactAbsolute)) {
    const stats = statSync(exactAbsolute);
    const relativePath = relative(cwd, exactAbsolute).replace(/\\/g, "/");
    if (stats.isDirectory()) return { type: "directory" as const, relativePath: relativePath.replace(/\/?$/, "/") };
    if (stats.isFile()) return { type: "file" as const, relativePath };
  }
  if (!runtime) return null;

  const query = normalizeAtPath(rawScope);
  if (!query) return null;
  const dirResult = runtime.finder.directorySearch(query, { pageSize: 1 });
  if (dirResult.ok && dirResult.value.items.length > 0) {
    return { type: "directory" as const, relativePath: dirResult.value.items[0].relativePath };
  }
  const fileResult = runtime.finder.fileSearch(query, { pageSize: 1 });
  if (fileResult.ok && fileResult.value.items.length > 0) {
    return { type: "file" as const, relativePath: fileResult.value.items[0].relativePath };
  }
  return null;
}

function findFilesDetails(ready: boolean, error: string | null, totalMatched: number | null, totalFiles: number | null) {
  return { ready, error, totalMatched, totalFiles };
}

function getTextContent(result: { content?: Array<{ type: string; text?: string }> }) {
  const entry = result.content?.find((item) => item.type === "text");
  return entry?.type === "text" ? (entry.text ?? "") : "";
}

function countNonEmptyLines(text: string) {
  return text.split("\n").filter((line) => line.trim().length > 0).length;
}

function renderCollapsibleSummary(
  title: string,
  summary: string,
  expanded: boolean,
  theme: any,
  text: string,
) {
  if (!expanded) {
    return new Text(`${theme.fg("success", summary)} ${theme.fg("muted", `(ctrl+o to expand ${title})`)}`, 0, 0);
  }

  const output = text.trim();
  if (!output) {
    return new Text(theme.fg("muted", summary), 0, 0);
  }

  return new Text(`${theme.fg("success", summary)}\n${output.split("\n").map((line) => theme.fg("toolOutput", line)).join("\n")}`, 0, 0);
}

export default function fffExtension(pi: ExtensionAPI) {
  let runtime: RuntimeState | null = null;
  let startupError: string | undefined;

  pi.on("session_start", async (_event, ctx) => {
    runtime?.finder.destroy();
    const created = createRuntime(ctx.cwd);
    runtime = created.runtime;
    startupError = created.error;

    ctx.ui.addAutocompleteProvider(buildAutocompleteProvider(() => runtime));

    if (!runtime) {
      ctx.ui.notify(`fff unavailable: ${startupError ?? "unknown error"}`, "warning");
      return;
    }

    void (async () => {
      const warmed = await runtime?.finder.waitForScan(1500);
      if (!runtime || !warmed?.ok) return;
      const progress = runtime.finder.getScanProgress();
      const count = progress.ok ? progress.value.scannedFilesCount : "unknown";
      ctx.ui.notify(`fff ready (${count} files indexed)`, "info");
    })();
  });

  pi.on("session_shutdown", async () => {
    runtime?.finder.destroy();
    runtime = null;
  });

  pi.registerTool({
    name: "read",
    label: "read",
    description: "Read file contents. Also accepts fuzzy paths and @path references resolved with fff.",
    parameters: Type.Object({
      path: Type.String({ description: "Path to the file to read (relative, absolute, fuzzy, or @path)" }),
      offset: Type.Optional(Type.Number({ description: "Line number to start reading from (1-indexed)" })),
      limit: Type.Optional(Type.Number({ description: "Maximum number of lines to read" })),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const original = createReadTool(ctx.cwd);
      const resolved = resolveSearchPath(runtime, ctx.cwd, params.path);
      if (!resolved) {
        return {
          content: [{ type: "text", text: `fff could not resolve \"${params.path}\" to a file.` }],
          details: { path: params.path, resolved: false },
        };
      }
      const adjusted = locationToReadParams(resolved.location, params.offset, params.limit);
      return original.execute(
        toolCallId,
        { path: resolved.absolutePath, offset: adjusted.offset, limit: adjusted.limit },
        signal,
        onUpdate,
      );
    },
  });

  pi.registerTool({
    name: "grep",
    label: "grep",
    description: "Search file contents with fff when possible; falls back to pi's built-in grep for unsupported cases.",
    promptSnippet: "Search file contents with FFF-backed grep.",
    promptGuidelines: ["Use grep for content search; prefer read after finding the right file."],
    parameters: Type.Object({
      pattern: Type.String({ description: "Search pattern" }),
      path: Type.Optional(Type.String({ description: "Optional exact or fuzzy file/folder scope" })),
      glob: Type.Optional(Type.String({ description: "Optional glob filter" })),
      ignoreCase: Type.Optional(Type.Boolean({ description: "Case-insensitive search" })),
      literal: Type.Optional(Type.Boolean({ description: "Treat pattern as literal text instead of regex" })),
      context: Type.Optional(Type.Number({ description: "Context lines before and after each match" })),
      limit: Type.Optional(Type.Number({ description: "Maximum number of matches to return" })),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const original = createGrepTool(ctx.cwd);
      if (!runtime || params.glob || params.ignoreCase === true) {
        return original.execute(toolCallId, params, signal, onUpdate);
      }

      const mode = params.literal === false ? "regex" : "plain";
      const result = runtime.finder.grep(params.pattern, {
        mode,
        beforeContext: params.context ?? 0,
        afterContext: params.context ?? 0,
        smartCase: params.ignoreCase === undefined ? true : !params.ignoreCase,
        maxMatchesPerFile: params.limit ?? 100,
      });

      if (!result.ok) {
        return original.execute(toolCallId, params, signal, onUpdate);
      }

      let matches = result.value.items;
      let scope: string | null = null;
      if (params.path) {
        const resolvedScope = resolveScope(runtime, ctx.cwd, params.path);
        if (!resolvedScope) {
          return {
            content: [{ type: "text", text: `fff could not resolve grep scope \"${params.path}\".` }],
            details: { scope: params.path, resolved: false },
          };
        }
        scope = resolvedScope.relativePath;
        matches = matches.filter((match) =>
          resolvedScope.type === "file"
            ? match.relativePath === resolvedScope.relativePath
            : match.relativePath === resolvedScope.relativePath || match.relativePath.startsWith(resolvedScope.relativePath),
        );
      }

      const limited = matches.slice(0, params.limit ?? 100);
      return {
        content: [{ type: "text", text: formatGrep(limited, result.value.nextCursor) }],
        details: {
          backend: "fff",
          totalMatched: matches.length,
          limited: limited.length,
          scope,
          nextCursor: result.value.nextCursor,
        },
      };
    },
    renderResult(result, { expanded }, theme) {
      const text = getTextContent(result as { content?: Array<{ type: string; text?: string }> });
      const details = (result.details ?? {}) as { totalMatched?: number; limited?: number; scope?: string | null; resolved?: boolean };

      if (details.resolved === false) {
        return new Text(theme.fg("error", text), 0, 0);
      }

      const count = details.totalMatched ?? countNonEmptyLines(text);
      const shown = details.limited ?? count;
      const scopeSuffix = details.scope ? ` in ${details.scope}` : "";
      const summary = shown === count
        ? `${count} match${count === 1 ? "" : "es"}${scopeSuffix}`
        : `${shown}/${count} matches${scopeSuffix}`;

      return renderCollapsibleSummary("grep results", summary, expanded, theme, text);
    },
  });

  pi.registerTool({
    name: "find_files",
    label: "Find Files",
    description: "Find files with fuzzy search using fff.",
    promptSnippet: "Find likely files for a topic before reading one.",
    promptGuidelines: ["Use find_files when you know the topic but not the exact path."],
    parameters: Type.Object({
      query: Type.String({ description: "Fuzzy file query" }),
      limit: Type.Optional(Type.Number({ description: "Maximum number of results to return" })),
    }),
    async execute(_toolCallId, params) {
      if (!runtime) {
        return {
          content: [{ type: "text", text: `fff is not ready${startupError ? `: ${startupError}` : "."}` }],
          details: findFilesDetails(false, startupError ?? null, null, null),
        };
      }
      const result = runtime.finder.fileSearch(params.query, { pageSize: Math.min(params.limit ?? MAX_FIND_FILES, MAX_FIND_FILES) });
      if (!result.ok) {
        return {
          content: [{ type: "text", text: result.error }],
          details: findFilesDetails(true, result.error, null, null),
        };
      }
      return {
        content: [{ type: "text", text: formatFindFiles(result.value.items, result.value.scores, params.query) }],
        details: findFilesDetails(true, null, result.value.totalMatched, result.value.totalFiles),
      };
    },
    renderResult(result, { expanded }, theme) {
      const text = getTextContent(result as { content?: Array<{ type: string; text?: string }> });
      const details = (result.details ?? {}) as { ready?: boolean; error?: string | null; totalMatched?: number | null };

      if (details.ready === false || details.error) {
        return new Text(theme.fg(details.ready === false ? "warning" : "error", text), 0, 0);
      }

      const count = details.totalMatched ?? countNonEmptyLines(text);
      const summary = `${count} file${count === 1 ? "" : "s"}`;
      return renderCollapsibleSummary("file results", summary, expanded, theme, text);
    },
  });

  pi.registerCommand("fff-status", {
    description: "Show fff runtime status",
    handler: async (_args, ctx) => {
      if (!runtime) {
        ctx.ui.notify(`fff unavailable: ${startupError ?? "not initialized"}`, "warning");
        return;
      }
      const progress = runtime.finder.getScanProgress();
      const health = runtime.finder.healthCheck();
      const lines = [
        `cwd: ${runtime.cwd}`,
        `db: ${runtime.dbDir}`,
        `scan: ${progress.ok ? (progress.value.isScanning ? "in progress" : "idle") : "unknown"}`,
        `scanned files: ${progress.ok ? progress.value.scannedFilesCount : "unknown"}`,
        `native binary: ${FileFinder.isAvailable() ? "available" : "missing"}`,
      ];
      if (health.ok) {
        lines.push(`git repo: ${health.value.git.repositoryFound ? "yes" : "no"}`);
        lines.push(`indexed files: ${health.value.filePicker.indexedFiles ?? "unknown"}`);
      } else {
        lines.push(`health: ${health.error}`);
      }
      ctx.ui.notify(lines.join("\n"), "info");
    },
  });

  pi.registerCommand("reindex-fff", {
    description: "Force an fff rescan of the current project",
    handler: async (_args, ctx) => {
      if (!runtime) {
        ctx.ui.notify(`fff unavailable: ${startupError ?? "not initialized"}`, "warning");
        return;
      }
      const result = runtime.finder.scanFiles();
      if (!result.ok) {
        ctx.ui.notify(`fff reindex failed: ${result.error}`, "error");
        return;
      }
      ctx.ui.notify("fff reindex started", "info");
    },
  });
}
