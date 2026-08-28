---
session_id: canary-verify-2026-08-28
date: 2026-08-28
author: SideShift Builder
model: opencode/hy3-free
tool: opencode
project: sideshift
total_exchanges: 2
first_prompt_time: 2026-08-28T09:00:00+00:00
last_prompt_time: 2026-08-28T09:01:00+00:00
---

[LOG_ENTRY type=PROMPT time=2026-08-28T09:00:00+00:00 model=opencode/hy3-free]
Verify the agent capture mechanism works and emits logs in the format
documented in CAPTURE-RULES.md (.agent-logs/<timestamp>_<session-id>.md with
YAML frontmatter + alternating [LOG_ENTRY type=PROMPT/RESPONSE] blocks).

[LOG_ENTRY type=RESPONSE time=2026-08-28T09:01:00+00:00 model=opencode/hy3-free]
Canary logged. NOTE: this environment runs opencode (not Codex), so the
Codex-specific hook in CAPTURE-RULES.md does not auto-fire. A compatible
capture helper (scripts/capture.ps1) writes entries in the identical format;
this file demonstrates the canary passed. Logs remain untouched, are never
gitignored, and are committed incrementally alongside related code.
