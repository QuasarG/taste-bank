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

### Browsing & applying (no auth)

| Command | What it does |
|---|---|
| `taste-bank setup` | One-time: globally install CLI + inject skill into your agents |
| `taste-bank list [--q WORD] [--json]` | List published styles (slug, name, mood, summary) |
| `taste-bank show <slug> [--json]` | Full detail of one style (meta + design tokens) |
| `taste-bank skill <slug> [--md]` | Print the **complete pack** as JSON: `{meta, tokens, skill, css, templates}`. `--md` for plain SKILL.md text |
| `taste-bank use <slug> [--as agents\|claude\|skill]` | Land a style into the current project |
| `taste-bank favorite <slug>` / `unfavorite <slug>` / `favorites` | Manage your favorites |
| `taste-bank doctor` | Health check (CLI, network, identity, skill, cache, favorites) |

### Contributing (invite + ed25519 identity)

| Command | What it does |
|---|---|
| `taste-bank keygen` | Generate an ed25519 keypair into `~/.style-lab/` (one-time) |
| `taste-bank whoami` | Look up your bound identity, owned styles, and pending submissions |
| `taste-bank validate <pack.json>` | Dry-run validate a style pack locally (no network) |
| `taste-bank submit <pack.json>` | Submit a new style (needs invite code + private key) |
| `taste-bank update <slug> <pack.json>` | Update an owned style (needs private key) |
| `taste-bank delete <slug>` | Delete an owned style (needs private key, asks to confirm) |

### What `skill <slug>` returns (the complete pack)

```
{ meta, tokens, skill, css, templates }
```

- `skill` — the assembled SKILL.md (Do/Don't rules + auto-generated token appendix)
- `tokens` — raw design tokens (color, font, size, space, radius, shadow, motion)
- `css` — scoped `[data-style="<slug>"]` variable block, ready to inject
- `templates` — `{ "page.html": "<full content>" }` HTML template snapshots

Packs are cached locally for 3 days (`~/.style-lab/cache/<slug>/`); if the server
is unreachable, the CLI falls back to the cache with a warning.

### What `use` does

Writes a style into your project as a managed rules file, wrapped in a sentinel
block so re-running `use` updates the style without clobbering your own edits.
Also records usage to `./.style-lab/used.json` (project-level).

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

Submitting a style uses an invite-code + ed25519-signed flow:

1. Get an invite code from the maintainer, set it in `~/.style-lab/config.json`:
   ```json
   { "inviteCode": "sl_xxx" }
   ```
2. `taste-bank keygen` — generate your identity keypair (one-time)
3. `taste-bank validate <pack.json>` — dry-run check your pack
4. `taste-bank submit <pack.json>` — sign and submit (enters review queue)

See the [project README](https://github.com/QuasarG/taste-bank#readme) for the
pack format (`meta` + `tokens` + `skill` + `templates`).

## License

MIT © quasarg
