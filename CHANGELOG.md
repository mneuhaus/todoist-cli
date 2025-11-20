# Changelog

## 1.2.0 - 2025-11-20
- Added batch close/update commands (`tasks:close`, `tasks:update`) supporting IDs and/or filters, idempotent close.
- Added diff snapshots (`tasks:diff`) with optional watch mode and SQL-like queries translated to Todoist filters.
- Added upsert (`task:upsert`) to update existing matching task (content + project) or create if missing.
- Structured errors with codes and exit codes (e.g., TASK_NOT_FOUND -> exit 4); JSON error envelope when `--format json` is used.

## 1.1.0 - 2025-11-20
- Added batch operations: `tasks:close` and `tasks:update` (IDs and/or filter; idempotent close).
- Added task diffs: `tasks:diff` compares against cached snapshot (`~/.config/todoist-cli/tasks_cache.json`).
- Kept human-readable table as default format; JSON still available via `--format json`.
- Added in-repo reference skill under `.claude/skills/todoist/`.

## 1.0.0 - 2025-11-20
- Initial release of Todoist CLI wrapping REST v2 with tasks/projects/labels/comments, auth, and formatting helpers.
