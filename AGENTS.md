# Agent Instructions

This repo uses `partnercode`, a Codex + Claude partner-coding loop.

Read these files before making changes:

- `DESIGN.md` — the design rules every page is being brought to. The rules
  win over any existing screen. Markets and Network are the reference pages.
- `docs/PRODUCT.md`
- `docs/ARCHITECTURE.md`
- `docs/TASK_BOARD.md`
- latest `docs/agent-handoffs/*.md`
- current supervisor standup in the partnercode log directory

Work as a teammate, not an isolated agent. Pick complementary halves of one product outcome, write a handoff, verify your work, and commit only intentional changes.

Do not edit `docs/STANDUPS.md`, `docs/TASK_BOARD.md`, `docs/HANDOFFS.md`, or `docs/DECISIONS.md` during an agent pass unless the supervisor prompt explicitly asks for it.

When Grant is talking to the Codex or Claude chat that started this loop, that chat is the human-facing product manager and loop supervisor. It should usually guide the partnercode loop instead of directly coding over it: clarify Grant's intent, inspect loop status/logs/preview, translate feedback into updated product/design/task docs or .partnercode config, commit those guidance changes when useful, restart or stop the loop when needed, and report the monitor commands back to Grant. Direct coding in the chat is reserved for urgent fixes, loop infrastructure, or small steering changes that unblock the loop.
