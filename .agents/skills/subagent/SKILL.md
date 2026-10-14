---
name: subagent
description: Spawn one or more Pi subagents in separate Herdr panes, coordinate their lifecycles, wait for completion, and collect their results. Use for parallel reviews or delegated repository work. Requires HERDR_ENV=1.
---

# Subagent

Run each subagent in a separate Herdr pane. Coordinate it through Herdr's agent lifecycle rather than scraping terminal text to guess whether it has finished.

## Preconditions

Verify that the caller is inside Herdr before doing anything else:

```sh
test "${HERDR_ENV:-}" = 1
```

If this fails, say that the task requires a Herdr-managed pane and stop. Do not control a focused Herdr session from outside Herdr.

The installed CLI is authoritative. At the start of the task, inspect the relevant command groups:

```sh
herdr --help
herdr pane
herdr agent
```

Do not run bare `herdr`; that launches or attaches the TUI. Parse pane IDs and state from command JSON rather than predicting them.

## Prepare

1. Choose a short, unique agent name matching `[a-z][a-z0-9_-]{0,31}`.
2. Create a temporary run directory with `mktemp -d`.
3. Write the complete task to `<run-dir>/prompt.md` with the `write` tool.
4. Create the Pi session path before launch:

```sh
touch <run-dir>/session.jsonl
```

Keep the run directory outside the repository unless the task specifically requires otherwise.

## Create the pane and start Pi

Default to a sibling pane in the current tab, preserve the target working directory, and keep the user's focus unchanged. Inspect the current layout first:

```sh
herdr pane layout --pane "$HERDR_PANE_ID"
```

Split a wide pane to the right and a narrow or tall pane down:

```sh
herdr pane split --current --direction right --cwd "$PWD" --no-focus
# or: --direction down
```

Read the new pane ID from `.result.pane.pane_id`. Do not create a workspace, tab, or worktree unless the user requests that topology.

For a faster split-and-start flow, parse the pane ID and immediately start the subagent in one shell chain:

```sh
pane_id=$(
  herdr pane split --current --direction right --cwd "$PWD" --no-focus |
    jq -r '.result.pane.pane_id'
) &&
herdr agent start <name> --kind pi --pane "$pane_id" -- \
  --session <run-dir>/session.jsonl \
  --provider "$PI_PROVIDER" \
  --model "$PI_MODEL" \
  --thinking "$PI_REASONING_LEVEL"
```

Use `--direction down` when the layout calls for it. This is the subagent equivalent of chaining `herdr pane split` to `herdr pane run`: use `agent start` here so Herdr assigns the agent name and tracks its lifecycle. If the split or pane-ID extraction fails, `&&` prevents startup in an unintended pane.

Alternatively, start Pi after parsing the pane ID separately. The current model settings are available as `PI_PROVIDER`, `PI_MODEL`, and `PI_REASONING_LEVEL`:

```sh
herdr agent start <name> --kind pi --pane <pane-id> -- \
  --session <run-dir>/session.jsonl \
  --provider "$PI_PROVIDER" \
  --model "$PI_MODEL" \
  --thinking "$PI_REASONING_LEVEL"
```

Arguments after `--` are native Pi arguments. Pass them as separate shell words. `agent start` waits until Herdr recognizes Pi and it is ready for input.

If this is a Pi source checkout whose working-tree launcher must be tested, do not silently substitute the installed `pi`. Inspect `herdr agent` for the installed Pi-kind launcher options. If the current Herdr version cannot select `./pi-test.sh`, explain the limitation instead of testing the wrong executable.

## Submit and wait

Read the prepared prompt and submit it through the agent surface:

```sh
herdr agent prompt <name> "$(cat <run-dir>/prompt.md)" --wait --timeout 1800000
```

`--wait` returns at the first settled `idle`, `done`, or `blocked` state. Do not infer completion from terminal output. If it returns `blocked`, inspect the agent before deciding whether user input is required:

```sh
herdr agent get <name>
herdr agent read <name> --source recent-unwrapped --lines 160
```

Do not approve requests or answer consequential questions on the user's behalf. Use `herdr agent wait` when continuing an already-running turn:

```sh
herdr agent wait <name> --timeout 1800000
```

## Run multiple subagents

Use multiple subagents when tasks are independent or benefit from separate perspectives. Give every subagent its own unique name, pane, run directory, prompt, and session file. Maintain a small coordinator record containing at least:

```text
name | role/task | pane_id | run_dir | state
```

Do not reuse a pane or session file between live agents.

### Fan out

Prepare and start every agent before waiting for any result. Create panes with deliberate geometry; do not repeatedly split the same narrow pane. Keep the caller focused and parse every new pane ID from its creation response.

Submit each prepared prompt without `--wait` so all agents can begin concurrently:

```sh
herdr agent prompt <name-a> "$(cat <run-dir-a>/prompt.md)"
herdr agent prompt <name-b> "$(cat <run-dir-b>/prompt.md)"
herdr agent prompt <name-c> "$(cat <run-dir-c>/prompt.md)"
```

A successful submission does not mean the work is complete. After all prompts have been submitted, wait for every agent. Sequential wait commands do not serialize the work because all agents are already running:

```sh
herdr agent wait <name-a> --timeout 1800000
herdr agent wait <name-b> --timeout 1800000
herdr agent wait <name-c> --timeout 1800000
```

When the harness supports parallel tool calls, the waits may also run in parallel. Track each result independently: one timeout, failure, or `blocked` state must not discard completed results from the other agents. Inspect blocked or failed agents with `agent get` and `agent read` before deciding how to proceed.

### Partition work safely

Prefer parallel read-only investigation, reviews, test analysis, or work on disjoint files. In every prompt, state the agent's scope and expected output clearly. Avoid having multiple agents edit the same files or depend on uncommitted changes produced concurrently. If edits must be combined, assign ownership of disjoint paths or use separate worktrees only when the user explicitly requests that topology.

Subagents should report to the calling coordinator rather than prompt one another. The coordinator collects all results, reconciles disagreements, verifies important claims, and performs any final integration. For cross-review, finish the first wave, then send its conclusions to a second-wave agent as a new explicit prompt.

### Fan in and cleanup

Collect every settled result before synthesizing the final answer. Preserve which agent produced each finding, deduplicate overlap, and call out unresolved disagreement. Close only panes created by this workflow, and only after that pane's result has been collected. Remove each run directory independently unless its transcript is needed for review.

## Collect the result

After a settled `idle` or `done` state, read the response through Herdr:

```sh
herdr agent get <name>
herdr agent read <name> --source recent-unwrapped --lines 240
```

Use the subagent's final answer as advisory evidence; verify important claims against the repository before acting on them.

If the complete response is no longer recoverable because the agent used the terminal's alternate screen, ask it to write its complete final response as Markdown under `<run-dir>` and reply only with that path. Wait again, then read the file directly. Use this only as a fallback, not in the initial prompt.

The Pi transcript remains available at `<run-dir>/session.jsonl` when a durable audit trail is needed.

## Cleanup

Close only the pane created for this subagent, using the pane-close syntax reported by the installed `herdr pane` command. Then remove the run directory:

```sh
herdr pane close <pane-id>
rm -rf <run-dir>
```

Keep the run directory when its prompt, result, or JSONL transcript is still needed for review. Never close panes, tabs, workspaces, or sessions that this workflow did not create.
