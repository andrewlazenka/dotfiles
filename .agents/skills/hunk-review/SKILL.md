---
name: hunk-review
description: Opens the current changeset in a full-screen tmux Hunk popup, captures human inline review notes, and applies that feedback in the same agent session. Use when the user invokes /hunk-review or asks to review agent-authored changes interactively.
compatibility: Requires a Hunk build with the experimental extension API and tmux; must run inside a tmux session.
disable-model-invocation: true
---

# Hunk review handoff

Open Hunk, wait for the user to review the changes, then address every captured note.

## Run the review

Run the bundled helper as a foreground, blocking command. Resolve the path relative to this `SKILL.md`; do not copy the helper into the repository being reviewed.

```bash
<skill-directory>/scripts/review-in-popup [hunk-diff-arguments...]
```

Pass any user arguments through unchanged. With no arguments, the helper reviews the current working tree. Examples:

```bash
<skill-directory>/scripts/review-in-popup
<skill-directory>/scripts/review-in-popup main
<skill-directory>/scripts/review-in-popup --staged
```

Important:

- Do not background the helper and do not set a timeout. The tool call must remain blocked while the user reviews.
- Do not run interactive `hunk diff` directly. The helper opens it in a full-screen tmux popup with watch mode enabled.
- In Hunk, the user presses `c` on a selected hunk or clicks an add-note affordance, saves the note, and presses `q` when finished.
- The bundled Hunk extension writes each saved note to disk immediately, before Hunk destroys its session.

When the popup closes, the helper prints one JSON document between `HUNK_REVIEW_RESULT_BEGIN` and `HUNK_REVIEW_RESULT_END`. Its `notes` array contains `filePath`, zero-based `hunkIndex`, `side`, one-based `line`, and `body`.

## Apply the review

If `notes` is empty, tell the user the review completed with no comments and make no review-driven edits.

Otherwise:

1. Read every note and inspect its surrounding code. Treat line numbers as anchors to the reviewed diff, not as guaranteed current positions.
2. Resolve straightforward requests directly. If a note is ambiguous or conflicts with another note, ask the user instead of guessing.
3. Make the requested code changes.
4. Run the most relevant available formatting, type-checking, and tests.
5. Summarize how each note was addressed and report any note left unresolved.

Do not attempt `hunk session comment list` after the popup closes; Hunk notes are session-local and the extension output is the durable handoff.
