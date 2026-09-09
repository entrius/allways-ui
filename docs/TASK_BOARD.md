# Task Board

Update this file before starting and after finishing supervisor-level work.

## Active

| Task | Owner | Branch/Worktree | Status | Notes |
| --- | --- | --- | --- | --- |

## Backlog

| Task | Suggested Owner | Notes |
| --- | --- | --- |
| Miner detail on the rules: page frame, mono back link, identity row via SectionHeading + LabelValue, asset labels with network, dates via the shared helper, performance numbers on the scale, status via the shared chip | Codex | DESIGN.md step 1. Compare to Markets in a screenshot. |
| Shared primitives the pages need: one StatusChip component, formatUnixTime on the tape's wall-clock format, an assetLabel helper with network shared by matrix, book and detail pages | Claude | Do this first so step 1 and 3 can use them. No new colours. |
| Agents page on the rules: type on the scale, no blue eyebrows or filled buttons, copy buttons in the inverted chip style, flat panels except the copy panel | Claude | DESIGN.md step 2. |
| Swap and reservation detail pages on the rules | Codex | DESIGN.md step 3, after miner detail. |
| Tape statuses through StatusChip, dates through the helper | Claude | DESIGN.md step 4. |
| Sweep for banned patterns: toLocaleString(), borderRadius, primary.main as decoration, display and eyebrow variants, font sizes off the scale | either | DESIGN.md step 5. Fix or justify each in a comment. |

## Done

| Task | Owner | Branch/Worktree | Notes |
| --- | --- | --- | --- |
