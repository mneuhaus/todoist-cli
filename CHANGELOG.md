# Changelog

## 1.1.0 - 2025-11-20
- Added batch operations: `tasks:close` and `tasks:update` (IDs and/or filter; idempotent close).
- Added task diffs: `tasks:diff` compares against cached snapshot (`~/.config/todoist-cli/tasks_cache.json`).
- Kept human-readable table as default format; JSON still available via `--format json`.
- Added in-repo reference skill under `.claude/skills/todoist/`.

## 1.0.0 - 2025-11-20
- Initial release of Todoist CLI wrapping REST v2 with tasks/projects/labels/comments, auth, and formatting helpers.
