# Managing Project Styles in Agent Conversations

> Prerequisite: you've run `npx taste-bank setup` (CLI installed globally + skill injected into your agent).

This guide covers four things: **picking** a style for a project, **switching** styles, **submitting** the current project's style, and **team collaboration** with shared style bindings.

---

## Scenario 1: Pick a style for a new project

You just started a project and want the agent to write frontend in a certain style. Two approaches:

### Approach A: Just ask in the agent conversation (recommended)

```
You: I want a clean, modern style for this project. What do you recommend?
```

Your agent has the `taste-bank` skill installed. It will:

1. Run `taste-bank list` to browse styles, pick 2-3 matching your description
2. Once you choose, it runs `taste-bank skill <slug>` to fetch the **complete pack** (rules + tokens + CSS + template)
3. Read the pack into its context, then implement strictly within the design tokens

**You never touch the terminal** — the agent calls the CLI itself.

### Approach B: Pick in the terminal, then let the agent implement

```bash
taste-bank list --q dashboard      # browse
taste-bank show ai-slop-dashboard  # see detail (with real color swatches)
```

Once you've picked, tell the agent:

```
You: Use the ai-slop-dashboard style from taste-bank for this page
```

The agent runs `taste-bank skill ai-slop-dashboard` to get the full pack, then implements.

---

## Scenario 2: Pin a style to the project (persist)

The two approaches above share a problem: **switching agent sessions loses the style** — the pack only lives in temporary context. If you want a project to **long-term bind** to a style, use `use` to write it into a project file:

```bash
taste-bank use ai-slop-dashboard
```

This creates `.agents/skills/ai-slop-dashboard/SKILL.md` (default). After this, **every agent session start** auto-reads this file — the agent knows "this project uses ai-slop-dashboard."

### Three landing locations (pick based on your agent)

```bash
taste-bank use <slug>                  # default: ./.agents/skills/<slug>/SKILL.md (universal skill dir)
taste-bank use <slug> --as agents      # append to ./AGENTS.md (Codex reads this)
taste-bank use <slug> --as claude      # write ./.claude/commands/<slug>.md (Claude Code)
```

### Managed block mechanism (won't clobber your edits)

Content written by `use` is wrapped in sentinel markers:

```markdown
<!-- BEGIN taste-bank:ai-slop-dashboard (v1.3.0) — do not hand-edit; run taste-bank use ai-slop-dashboard to update -->
...style rules + tokens...
<!-- END taste-bank:ai-slop-dashboard -->
```

- **Re-run `use`**: only updates content inside the markers; your hand-written project rules outside the block stay untouched
- **Manually edited inside the block**: next `use` overwrites it back (so don't edit inside the block — switch styles instead)
- **Project-level record**: `use` also writes `.style-lab/used.json`, recording "which styles this project uses, at what version" — `taste-bank doctor` shows this

---

## Scenario 3: Switch styles

The project started with style A, now you want B. Two steps:

```bash
# 1. Land the new style (adds a new sentinel block/file to the project)
taste-bank use <new-slug>

# 2. (Optional) Clean up the old style's traces
# If old one was --as agents mode, manually delete the old BEGIN/END block in AGENTS.md
# If standalone file mode (skill/claude), just delete that file
```

**A project can bind multiple styles at once** — `used.json` is an array. But in practice, stick to one per project to avoid confusing the agent.

---

## Scenario 4: Submit the current project's style

You have a project with a great frontend style and want to distill it into a pack for taste-bank. **The easiest way** is to let the agent run the full SOP:

```
You: Submit this project's style to taste-bank
```

The agent has the `taste-bank-contribute` skill. It will:

1. **Sample** (read at most 2 files: 1 main stylesheet + 1 representative page)
2. **Extract real tokens** (colors/fonts/spacing — only values actually used in the project)
3. **Sanitize** (business terms, product names, domains all replaced with neutral words — "a bystander shouldn't be able to guess the original business")
4. **Pack** (meta + tokens + skill + templates, per zod schema)
5. **Validate** (`taste-bank validate`)
6. **Submit** (`taste-bank submit`, sign + send, enters review queue)

You only confirm a few things: author name, invite code (first time), whether the sanitized template looks good.

### Manual submission (if you want control over each step)

```bash
# 1. One-time identity setup
taste-bank keygen
echo '{ "inviteCode": "sl_xxx" }' > ~/.style-lab/config.json

# 2. Hand-write pack.json (format in docs/SPEC.md or the taste-bank-contribute skill)
# 3. Validate
taste-bank validate my-style.pack.json

# 4. Submit
taste-bank submit my-style.pack.json
```

> After submitting, it enters the review queue and goes live only after the maintainer approves. Check status with `taste-bank whoami`.

---

## Scenario 5: Team collaboration — shared style binding

If your team all uses taste-bank, the simplest workflow is to **commit the `use`-written files into git**:

```bash
taste-bank use ai-slop-dashboard --as agents   # writes into AGENTS.md
git add AGENTS.md .style-lab/used.json
git commit -m "chore: bind ai-slop-dashboard style"
```

Now when teammates clone the repo, their agents **automatically read** the style rules from AGENTS.md on startup — no one needs to manually `use`.

> `.style-lab/used.json` should also be committed — it records the project's bound style + version, and `taste-bank doctor` can detect "the live version has updated, time to re-`use`."

---

## FAQ

### Q: Does the agent call taste-bank on its own, or do I have to tell it?

**It calls it on its own** — provided you've run `setup` (skill is injected). When the agent detects design/style-related intent, it proactively runs `taste-bank list` / `skill`. But the first time, you can explicitly say "use the xxx style from taste-bank" to help it make the association.

### Q: The style updated online (version bumped) — is my project's copy stale?

Possibly. `taste-bank doctor` checks local cache freshness (3-day TTL). To update the version pinned in your project, re-run:

```bash
taste-bank use <slug>    # fetches latest, overwrites sentinel block content
```

### Q: Does it work offline?

- `taste-bank skill <slug>`: uses cache if fetched within 3 days; beyond 3 days or never fetched, needs network
- `taste-bank use`: needs network (fetches latest pack)
- Files already written into the project by `use`: **always work offline** (content is already in the file)

### Q: Can a project use multiple styles at once?

Technically yes (`used.json` supports multiple), but **not recommended** — the agent gets confused about which tokens to follow. One style per project; if you want to mix, submit a new blended style.

### Q: How do I verify the agent actually followed the style?

After implementation, have it check against `taste-bank show <slug>` — are the colors/fonts/spacing all from the pack's definitions? Or just ask in conversation: "Are all the color variables you used from this token set?"

---

## Cheat sheet: what to say in daily conversations

| What you want | What to say |
|---|---|
| Pick a style | "Find me some dashboard-friendly styles from taste-bank" |
| Use a specific one | "Use the ai-slop-dashboard style from taste-bank for this page" |
| Pin to project | (terminal) `taste-bank use <slug>` |
| Switch style | (terminal) `taste-bank use <new-slug>` + delete old block |
| Submit this project | "Submit this project's style to taste-bank" |
| Check what I've submitted | (terminal) `taste-bank whoami` |
| Health check | (terminal) `taste-bank doctor` |
