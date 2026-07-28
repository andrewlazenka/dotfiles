import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type, type Static } from "typebox";
import { chromium, type Browser, type Page } from "playwright";
import { mkdir, stat } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";

const screenshotUrlSchema = Type.Object({
  url: Type.String({
    description: "The http(s) URL to capture.",
  }),
  outputPath: Type.Optional(
    Type.String({
      description:
        "Optional output path for the PNG screenshot. Relative paths are resolved from the current working directory. Defaults to screenshots/<host>-<timestamp>.png.",
    }),
  ),
  viewportWidth: Type.Optional(
    Type.Number({
      description: "Viewport width in pixels. Defaults to 1440.",
      minimum: 320,
      maximum: 7680,
    }),
  ),
  viewportHeight: Type.Optional(
    Type.Number({
      description: "Viewport height in pixels. Defaults to 900.",
      minimum: 320,
      maximum: 7680,
    }),
  ),
  fullPage: Type.Optional(
    Type.Boolean({
      description: "Capture the full scrollable page. Defaults to true.",
    }),
  ),
  scrollBeforeScreenshot: Type.Optional(
    Type.Boolean({
      description:
        "Scroll through the page before capturing so lazy-loaded content and scroll-triggered animations are visible. Defaults to true for full-page screenshots.",
    }),
  ),
  scrollDelayMs: Type.Optional(
    Type.Number({
      description: "Delay between scroll steps when scrollBeforeScreenshot is enabled. Defaults to 150ms.",
      minimum: 0,
      maximum: 5000,
    }),
  ),
  settleDelayMs: Type.Optional(
    Type.Number({
      description: "Delay after the final scroll before capturing. Defaults to 500ms.",
      minimum: 0,
      maximum: 10000,
    }),
  ),
  waitUntil: Type.Optional(
    Type.Unsafe<"load" | "domcontentloaded" | "networkidle">({
      type: "string",
      enum: ["load", "domcontentloaded", "networkidle"],
      description: "Page load state to wait for before capturing. Defaults to networkidle.",
    }),
  ),
  timeoutMs: Type.Optional(
    Type.Number({
      description: "Navigation/screenshot timeout in milliseconds. Defaults to 30000.",
      minimum: 1000,
      maximum: 120000,
    }),
  ),
});

type ScreenshotUrlInput = Static<typeof screenshotUrlSchema>;

function normalizeUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Only http(s) URLs can be screenshotted. Received: ${parsed.protocol}`);
  }
  return parsed.toString();
}

function defaultOutputPath(cwd: string, url: string): string {
  const parsed = new URL(url);
  const safeHost = parsed.hostname.replace(/[^a-zA-Z0-9.-]+/g, "-") || "page";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return resolve(cwd, "screenshots", `${safeHost}-${timestamp}.png`);
}

function resolveOutputPath(cwd: string, path: string | undefined, url: string): string {
  if (!path?.trim()) return defaultOutputPath(cwd, url);
  const normalized = path.startsWith("@") ? path.slice(1) : path;
  return isAbsolute(normalized) ? normalized : resolve(cwd, normalized);
}

async function scrollPageBeforeScreenshot(
  page: Page,
  viewportHeight: number,
  delayMs: number,
  settleDelayMs: number,
  signal?: AbortSignal,
) {
  const step = Math.max(100, Math.floor(viewportHeight * 0.8));
  let previousScrollHeight = 0;

  while (!signal?.aborted) {
    const { scrollY, scrollHeight, innerHeight } = await page.evaluate(() => ({
      scrollY: window.scrollY,
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
    }));

    const maxScrollY = Math.max(0, scrollHeight - innerHeight);
    if (scrollY >= maxScrollY && scrollHeight === previousScrollHeight) break;

    previousScrollHeight = scrollHeight;
    await page.evaluate((nextY) => window.scrollTo(0, nextY), Math.min(scrollY + step, maxScrollY));
    if (delayMs > 0) await page.waitForTimeout(delayMs);
  }

  // Return to the top for a deterministic full-page capture after animations/lazy-loaders fired.
  await page.evaluate(() => window.scrollTo(0, 0));
  if (settleDelayMs > 0) await page.waitForTimeout(settleDelayMs);
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "screenshot_url",
    label: "Screenshot URL",
    description:
      "Use Playwright Chromium to take a PNG screenshot of a provided http(s) URL. Captures full page by default and writes the image to disk.",
    promptSnippet: "Take a full-page Playwright screenshot of a provided URL and save it as a PNG.",
    promptGuidelines: [
      "Use screenshot_url when the user asks to capture, screenshot, or visually inspect a web page URL.",
      "Always provide screenshot_url with an http(s) URL; pass outputPath when the user requested a specific file location.",
    ],
    parameters: screenshotUrlSchema,

    async execute(_toolCallId, params: ScreenshotUrlInput, signal, onUpdate, ctx) {
      const url = normalizeUrl(params.url);
      const outputPath = resolveOutputPath(ctx.cwd, params.outputPath, url);
      const viewportWidth = Math.round(params.viewportWidth ?? 1440);
      const viewportHeight = Math.round(params.viewportHeight ?? 900);
      const fullPage = params.fullPage ?? true;
      const scrollBeforeScreenshot = params.scrollBeforeScreenshot ?? fullPage;
      const scrollDelayMs = Math.round(params.scrollDelayMs ?? 150);
      const settleDelayMs = Math.round(params.settleDelayMs ?? 500);
      const waitUntil = params.waitUntil ?? "networkidle";
      const timeoutMs = params.timeoutMs ?? 30_000;

      await mkdir(dirname(outputPath), { recursive: true });

      let browser: Browser | undefined;
      const closeBrowser = async () => {
        if (browser) await browser.close().catch(() => undefined);
      };

      const abortHandler = () => {
        void closeBrowser();
      };
      signal?.addEventListener("abort", abortHandler, { once: true });

      try {
        onUpdate?.({
          content: [{ type: "text", text: `Launching Chromium and opening ${url}...` }],
          details: { url, outputPath },
        });

        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage({
          viewport: { width: viewportWidth, height: viewportHeight },
        });
        page.setDefaultTimeout(timeoutMs);
        page.setDefaultNavigationTimeout(timeoutMs);

        await page.goto(url, { waitUntil, timeout: timeoutMs });

        if (scrollBeforeScreenshot) {
          onUpdate?.({
            content: [{ type: "text", text: "Scrolling page to trigger lazy-loaded content and animations..." }],
            details: { url, outputPath, viewportWidth, viewportHeight, fullPage, waitUntil, scrollDelayMs, settleDelayMs },
          });
          await scrollPageBeforeScreenshot(page, viewportHeight, scrollDelayMs, settleDelayMs, signal);
        }

        onUpdate?.({
          content: [{ type: "text", text: `Capturing ${fullPage ? "full-page" : "viewport"} screenshot...` }],
          details: { url, outputPath, viewportWidth, viewportHeight, fullPage, waitUntil, scrollBeforeScreenshot },
        });

        await page.screenshot({ path: outputPath, fullPage, type: "png", timeout: timeoutMs });
        const file = await stat(outputPath);

        return {
          content: [
            {
              type: "text",
              text: `Saved ${fullPage ? "full-page" : "viewport"} screenshot of ${url} to ${outputPath} (${file.size.toLocaleString()} bytes).`,
            },
          ],
          details: {
            url,
            outputPath,
            sizeBytes: file.size,
            viewportWidth,
            viewportHeight,
            fullPage,
            scrollBeforeScreenshot,
            scrollDelayMs,
            settleDelayMs,
            waitUntil,
          },
        };
      } finally {
        signal?.removeEventListener("abort", abortHandler);
        await closeBrowser();
      }
    },
  });
}
