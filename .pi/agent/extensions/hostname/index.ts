/**
 * Shows the machine's hostname in the footer status line.
 */

import { hostname } from "node:os";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

// "0-" prefix sorts first in the status line, so truncation never hides it.
const STATUS_KEY = "0-hostname";

export default function (pi: ExtensionAPI) {
	const apply = (ctx: ExtensionContext) => {
		const host = hostname().replace(/\.local$/, "").split(".")[0];
		ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("accent", `@${host}`));
	};

	pi.on("session_start", async (_event, ctx) => apply(ctx));
	// Re-apply after each run in case another extension cleared or overwrote it.
	pi.on("agent_end", async (_event, ctx) => apply(ctx));
}
