# taste-bank

> The front-end style library for coding agents — browse, fetch, and apply design styles from the terminal.

[![npm version](https://img.shields.io/npm/v/taste-bank)](https://www.npmjs.com/package/taste-bank)
[![Live](https://img.shields.io/badge/Live-tastebank.cloud-126984)](https://tastebank.cloud)
[![GitHub](https://img.shields.io/badge/GitHub-QuasarG%2Ftaste--bank-181717)](https://github.com/QuasarG/taste-bank)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

One command sets you up: installs the CLI globally and teaches your coding
agents (Claude Code, Codex, Cursor, ZCode, Kimi Code…) how to use it.

```bash
npx taste-bank setup
```

After that, ask your agent in plain language — *"build me a landing page with
one of the styles in taste-bank"* — or use the CLI directly.

## Commands

| Command | What it does |
|---|---|
| `taste-bank setup` | One-time: globally install CLI + inject skill into your agents |
| `taste-bank list [--q WORD] [--json]` | List published styles (slug, name, mood, summary) |
| `taste-bank show <slug> [--json]` | Full detail of one style (meta + design tokens) |
| `taste-bank skill <slug>` | Print the assembled SKILL.md (rules + tokens) to stdout |
| `taste-bank css <slug>` | Print the scoped CSS variable block |
| `taste-bank use <slug> [--as agents\|claude\|skill]` | Land a style into the current project |
| `taste-bank doctor` | Health check (CLI, network, identity, skill injection) |

### What `use` does

Writes a style into your project as a managed rules file, wrapped in a sentinel
block so re-running `use` updates the style without clobbering your own edits:

```
<!-- BEGIN taste-bank:<slug> (v1.2) — 勿手改，运行 taste-bank use <slug> 更新 -->
…SKILL.md content…
<!-- END taste-bank:<slug> -->
```

Targets:
- `--as agents` → appends a managed block to `./AGENTS.md` (Codex)
- `--as claude` → writes `./.claude/commands/<slug>.md`
- `--as skill` (default) → writes `./.agents/skills/<slug>/SKILL.md`

## Requirements

- Node.js **18+** (uses built-in `fetch`)
- The `skills` tool (used by `setup`) needs Node **22.20.0+**; `setup` detects
  this and skips skill injection gracefully on older Node.

## How it works

```
npx taste-bank setup
  ① npm install -g taste-bank              (install CLI globally)
  ② npx skills add …/taste-bank -g         (inject skill into your agents)
  ③ environment check                      (report state, read-only)
```

The CLI talks to `tastebank.cloud` by default. Browsing/reading needs network;
once a style is `use`d into a project, that file keeps working offline.

> **Note**: this is a thin client over the public HTTP API. The server must be
> reachable for `list` / `show` / `skill` / `css`. Self-host? set
> `TASTEBANK_API=https://your-host`.

## Browsing

The web gallery is the best way to discover styles visually:
**[tastebank.cloud](https://tastebank.cloud)**.

## Contributing a style

Submitting a new style still uses the invite-code + Ed25519-signed flow in v0.1
(run via MCP or the `scripts/sign.mjs` helper). CLI-side submit/update/delete
commands are planned for v0.2. See the [project README](https://github.com/QuasarG/taste-bank#readme).

## License

MIT © quasarg
