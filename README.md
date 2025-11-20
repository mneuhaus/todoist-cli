# Todoist CLI

Focused command line access to the Todoist REST API (v2) with output that plays nicely with LLM agents and automation.

## Features

- Store/remove API token in `~/.config/todoist-cli`
- Task lifecycle: list, inspect, create, update, close/reopen, delete
- Projects and labels (list/show/create/update/delete)
- Comments on tasks or projects
- LLM-friendly `--format json` and readable tables/detail views
- Optional colors + `--with-lookups` to resolve project/label names

## Prerequisites

- Todoist REST API token (Settings → Integrations)
- Node.js >= 18

## Setup

```bash
cd todoist-cli
pnpm install       # or npm/yarn
chmod +x src/index.js
# Optional: make it globally available
npm link
```

## Authentication

```bash
todoist auth login --token <API_TOKEN>
todoist auth status
todoist auth logout
```

The token is stored at `~/.config/todoist-cli/config.json`.

## Quick Commands

```bash
# Tasks
todoist tasks --filter "today & @work" --with-lookups
todoist task 2995104338 --with-lookups
todoist task:add "Draft Todoist CLI" --project 123 --labels 456,789 --priority 3 --due-string "friday 17:00"
todoist task:update 2995104338 --priority 4 --due-date 2024-12-01
todoist task:close 2995104338
todoist tasks:close 9752418855 9752419011 --filter "today"
todoist tasks:update --filter "today & #Project" --priority 3

# Projects
todoist projects
todoist project:add "Internal Tools" --favorite
todoist project:update 123 --name "Internal Dev Tools"

# Labels
todoist labels
todoist label:add focus --color lime_green --favorite
todoist label:update 456 --name deep_work --unfavorite

# Comments
todoist comments --task 2995104338
todoist comment:add --task 2995104338 --content "Ship with README + auth"

# Diffs (snapshot comparison)
todoist tasks:diff --filter "today"
```

## Output Formats

- `--format table` (default) — compact CLI tables
- `--format json` — pretty-printed JSON for piping into tools or LLMs
- `--format detail` — multi-line detail view for single entities
- `--no-color` — disable colors
- `--with-lookups` — resolve project/label names in task lists/details

## Notes

- Uses the Todoist REST API v2 (`https://api.todoist.com/rest/v2` by default). Override via `api.base_url` in `~/.config/todoist-cli/config.json` if needed. Existing configs pointing to `rest/v1` auto-upgrade to v2.
- Commands purposefully avoid destructive defaults; updates require explicit flags.
- The CLI focuses on a clean mapping of API capabilities to make scripting and LLM prompting straightforward.
