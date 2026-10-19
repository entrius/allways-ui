# Daily fee / emission chart handoff

Repository/worktree: `/Users/grant/Documents/Allways/allways-ui-daily-economics`
Branch: `feat/daily-fees-emissions`, starting at latest fetched `origin/test`
`d10630d` (2026-10-14). Other worktrees were preserved.

Grant requested opening latest test UI locally and adding a daily fee-versus-miner
emission graph. Implemented in Network > Network Stats, above the existing charts.
Uses existing chart/Panel/StatCell components and site typography. Fee bars,
estimated miner-emission dashed line, summary coverage and difference. 7D/30D
controls follow the existing stats range; ALL caps this panel to available 30-day
emission history. Today is shown as partial fees versus a full-day estimate and
excluded from complete-day summary totals.

Local preview: `http://localhost:9080/network?open=stats&statsRange=7d#stats`.
Command: `./node_modules/.bin/vite --config vite.config.local.ts`.
Local `.env.local` selects `/api` (production Allways via Vite proxy) and generated
`/local-data/miner-emissions.json`. These settings are ignored. Dependencies are
symlinked from the main allways-ui checkout.

Data: read-only Finney historical sampling (four samples/day) and contemporaneous
CoinGecko TAO/USD. Collector run through the configured Bittensor SDK on
windesk-agent's Ubuntu WSL. Local data is a timestamped snapshot, not a scheduled
production service. UI refreshes fees and rereads the snapshot every five minutes.
See docs/daily-economics.md for the API contract and estimation assumptions.

Verification: four calculation tests, lint, format check, production build.
Visual checks against Landing, Markets, and Network; empty-emission state confirmed
before the collector completed. No push, merge, deployment, or financial action.

Remaining for production: implement/refresh the emission endpoint on das or an
indexing service, ideally replacing rate estimates with actual epoch payout sums.
This does not block the requested local preview.

Final evidence: 31 dated rows (30 complete days plus today), 124 historical chain
samples, all priced. 7-day complete totals: $386.33192 fees / $13,272.50437 estimated
miner rewards = 2.91077% coverage. Today so far: $2,562.90 fees versus $1,705.99
full-day estimated emissions, about 150.2% coverage. Today's calendar-day estimate
uses four historical samples, so differs from the earlier report's single current
rate and rolling 24-hour window. 30-day range populated successfully (3.2% coverage).

## Follow-up: include today in KPIs

Grant requested that completed swaps count before the UTC day ends. All four
KPIs now include today alongside the selected complete-day window. Today's
estimated emissions are prorated by elapsed UTC time and refreshed each minute;
the chart uses the same values. Missing values still remain unavailable.
Verified five unit tests, lint, formatting, production build, and localhost UI.
The 7d preview showed $2,949.65 in fees including today's $2,563.32.
Screenshot: `/Users/grant/Documents/Allways/output/daily-economics-including-today.png`.
Same branch/worktree and local port 9080. No push or deployment.
