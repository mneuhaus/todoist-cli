---
name: todoist
description: Manage Todoist tasks, projects, labels, and comments via the `todoist` CLI (REST v2). Use this when interacting with Todoist data from the command line with JSON/table output.
---

# Todoist CLI Skill (Reference)

This reference skill documents the local `todoist` CLI (v1.0.0) that wraps the Todoist REST API v2.

## Authenticate

```bash
todoist auth status
todoist auth login --token <API_TOKEN>
todoist auth logout   # clear token
```

Config lives at `~/.config/todoist-cli/config.json` (defaults to `https://api.todoist.com/rest/v2`, default format `table`).

## Output & Options

- `--format table|json|detail` (default is `table`)
- `--no-color` to disable colors
- `--with-lookups` on task list/detail to resolve project/label names

## Tasks

```bash
todoist tasks [--project <id> | --label <id> | --filter "<query>" | --ids <id1,id2>] [--with-lookups]
todoist task <task-id> [--with-lookups]
todoist task:add "<content>" [--project <id>] [--labels <ids>] [--priority 1-4] [--due-string "<text>"] [--due-date YYYY-MM-DD] [--description "<notes>"]
todoist task:update <task-id> [--content] [--project] [--labels] [--priority] [--due-string|--due-date|--due-datetime] [--description]
todoist tasks:update [ids...] [--filter "<query>"] [--priority ...] [...]
todoist tasks:close [ids...] [--filter "<query>"] | task:reopen <task-id> | task:delete <task-id>
```

## Projects

```bash
todoist projects
todoist project <project-id>
todoist project:add "<name>" [--color <name>] [--parent <id>] [--favorite]
todoist project:update <project-id> [--name] [--color] [--favorite|--unfavorite]
todoist project:delete <project-id>
```

## Labels

```bash
todoist labels
todoist label <label-id>
todoist label:add "<name>" [--color <name>] [--order <n>] [--favorite]
todoist label:update <label-id> [--name] [--color] [--order] [--favorite|--unfavorite]
todoist label:delete <label-id>
```

## Comments

```bash
todoist comments --task <id> | --project <id>
todoist comment <comment-id>
todoist comment:add --task <id> --content "<text>"
todoist comment:update <comment-id> --content "<text>"
todoist comment:delete <comment-id>

## Diffs

```bash
todoist tasks:diff --filter "today"
```
```

## Quick Examples

```bash
todoist tasks --filter "today & @work" --with-lookups
todoist task:add "Ship release notes" --project <id> --labels <ids> --priority 3 --due-string "friday 17:00"
todoist task:update <id> --priority 4 --due-date 2025-12-01
todoist tasks:update --filter "today" --priority 3
todoist tasks:close 123 456
todoist labels --format json
todoist tasks:diff --filter "today"
```
