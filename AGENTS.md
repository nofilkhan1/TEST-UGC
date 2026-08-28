<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Agent Capture Rules (8x Assignment)

Automatic prompt/response capture is required for this repo. The original
setup referenced a Codex hook (`.codex/hooks/hooks.json` +
`capture-agent-turn.ps1`) that writes to `.agent-logs/<timestamp>_<session-id>.md`.

This environment runs **opencode**, not Codex, so that hook does NOT auto-fire.
A compatible helper is provided at `scripts/capture.ps1` — it writes entries in
the exact format documented in `CAPTURE-RULES.md` (YAML frontmatter +
alternating `[LOG_ENTRY type=PROMPT ...]` / `[LOG_ENTRY type=RESPONSE ...]`
blocks). The canary lives at `.agent-logs/2026-08-28_canary-verify.md`.

**Standing rules (from `CAPTURE-RULES.md`, always obeyed):**
- Never edit, tidy, summarize, or delete entries in `.agent-logs/`.
- Never add `.agent-logs/` to `.gitignore`.
- Commit `.agent-logs/` entries incrementally, alongside the code changes they
  correspond to — not in one batch at the end.
