# fff

Local pi extension that uses `@ff-labs/fff-node` for:

- fuzzy `@...` file autocomplete in the editor
- fuzzy path resolution for `read`
- FFF-backed `grep` when compatible
- `find_files` tool for ranked file discovery

## Files

- `.pi/agent/extensions/fff/index.ts`
- `.pi/agent/extensions/fff/package.json`

## Commands

- `/fff-status`
- `/reindex-fff`

## Notes

- This is a local extension named `fff`.
- `@ff-labs/fff-node` is pinned to `0.10.5`; older native libraries caused reproducible macOS arm64 crashes in `fff-bg-*` threads.
- Reload pi with `/reload` after changing the extension.
