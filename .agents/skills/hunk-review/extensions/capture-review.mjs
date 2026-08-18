import { writeFileSync } from "node:fs";

const outputPath = process.env.HUNK_REVIEW_OUTPUT;

/**
 * Persist user-authored notes before Hunk tears down its session. Hunk review
 * notes otherwise disappear as soon as the TUI exits.
 */
export default function captureReview(hunk) {
  if (!outputPath) {
    throw new Error("HUNK_REVIEW_OUTPUT is required");
  }

  const notes = [];

  const flush = () => {
    writeFileSync(
      outputPath,
      `${JSON.stringify({ version: 1, notes }, null, 2)}\n`,
      { encoding: "utf8", mode: 0o600 },
    );
  };

  // Create a valid empty result even when the reviewer leaves no comments.
  flush();

  hunk.on("note_created", ({ note }) => {
    notes.push({
      id: note.id,
      filePath: note.filePath,
      hunkIndex: note.hunkIndex,
      side: note.side,
      line: note.line,
      body: note.body,
    });
    flush();
  });
}
