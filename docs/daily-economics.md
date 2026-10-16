# Daily fees versus miner emissions

Local feature branch `feat/daily-fees-emissions`, based on `origin/test` at
`d10630d`. Network > Network Stats shows a shared-USD chart of daily fees and
estimated SN7 miner emissions, with totals, coverage and fees minus emissions.

Fees are stacked bars of three treasury income sources:

- Transaction fees (the 1% swap fee): the live `/history` endpoint, valued at
  transaction time.
- Reservation and quote-churn fees: `GET /treasury?timeFrom&timeTo`, called once
  per UTC day (completed days load once; today refreshes every five minutes).
  These are lamports, valued at that day's mean CoinGecko SOL/USD (the day's
  open and close samples; open and latest for today). das derives reservation
  fees as reservation events x the current reservation fee.

A day missing any source, or its SOL price, is a gap for the total. A second KPI
row totals each source over the window, plus the non-transaction share of protocol fees.
The new emission source contract is `GET /economics/emissions/history`:

```json
{
  "netuid": 7,
  "network": "finney",
  "asOf": "2026-10-14T23:00:00Z",
  "method": "Four historical rate samples per day...",
  "rows": [{ "t": "2026-10-13T00:00:00Z", "emissionsUsd": 1600.00,
              "burnedUsd": 90.00, "validatorUsd": 1690.00, "ownerUsd": 742.00,
              "totalUsd": 4122.00 }]
}
```

The numbers above illustrate the schema, not real observations. `burnedUsd` is
the miner emission MinerBurned withheld that day (optional; the UI derives it
from each sample's `burnFraction` when absent). `null` means
missing. Missing fees, missing emissions, or unpriced completed swaps suppress
coverage rather than imply zero. Zero fees are valid; zero emissions produce
N/A coverage. Buckets use UTC dates, never browser-local dates. Totals include today so far.

## Local preview

`vite.config.local.ts` proxies the production Allways API to port 9080, allowing
test-branch UI against mainnet data. `.env.local` selects the local emission file.
Run `./node_modules/.bin/vite --config vite.config.local.ts`.

`VITE_MINER_EMISSIONS_URL` optionally overrides the emission history URL. For local
preview it is `/local-data/miner-emissions.json`, generated from real historical
Finney state. Both the local override and generated file are ignored by Git.

The collector requires the current Bittensor Python SDK with `bt.Client` and its
generated runtime APIs. Run `python scripts/collect-miner-emissions.py` and save
stdout to a temporary JSON file, validate it, then atomically replace the local
JSON. Diagnostics go to stderr. It performs read-only chain/API calls.

## Estimation method and limits

Four six-hourly historical chain samples per complete UTC day. At each sample:
alpha out per block x 7,200 blocks/day x enabled owner-cut adjustment x 50% miner
allocation x (1 - MinerBurned). Convert using the historical pool TAO/alpha ratio
and a CoinGecko TAO/USD observation within two hours. Average the four daily rates.
This assumes 12-second blocks. Historical block lookup corrects for timestamp
drift. The estimate excludes owner/validator rewards and withheld burn/recycle.
It is not a sum of actual epoch payout events. Missing samples leave a gap.

For a deployed feature the API must serve this contract and refresh the historical
collector, or replace it with a version-aware payout indexer. A current daily
run rate must never be backfilled across historical days. No backend deployment,
financial actions, buyback execution or weights/burn changes are part of this work.

## Checks

- `node --test tests/daily-economics.test.mjs`
- `npm run lint`
- `npm run format:check`
- `npm run build`

## Today in progress

The chart appends today’s live fee bar, visibly faded by the shared chart.
Today’s completed swap fees count immediately in all four summary KPIs.
Today’s emission estimate uses the available sampled daily rate multiplied by
elapsed UTC-day time, refreshed each minute. The chart and KPIs use the same
prorated value. This is an estimate, not measured payouts or a full-day forecast.
The ALL selector caps this new panel at the latest 30 complete days plus today,
matching the collector’s available range; its subtitle states that window.

## Network Stats tiles and panels

Network Stats is grouped: Volume, Fees, Reliability, Users and nodes. Each
group shows its all-time figures, then its charts over the selected range; the
range control sits at the top. The Fees group leads with the fees vs emissions
panel (the one stacked chart of all three sources), then per-day Transaction
fees, Reservation fees and Quote churn fees, three across on wide screens. They follow the 7D / 30D / ALL range and share the per-day
`/treasury` cache with the economics panel (`useDailyTreasury`), valued at each
day's SOL price. The all-time tiles use today's SOL price, so they read higher
than the ALL range readouts when SOL was cheaper earlier.

"Protocol fees" means all three sources combined; "Transaction fees" is the 1%
swap fee alone. The all-time tiles show Protocol fees, Transaction fees,
Reservation fees and Quote churn fees. Reservation and churn come from all-time `GET /treasury`, valued at
today's SOL price. das holds 299 corrupt `QuoteSet.update_fee` values between
block times 1787173319 and 1787199604 (Aug 19-20 2026, about 9.1e18 lamports;
the real maximum is 0.01 SOL per update). The UI subtracts that window's churn
(`CORRUPT_CHURN_WINDOW` in `src/api/TreasuryApi.ts`), for the tiles and for any
daily bucket overlapping it, until das filters them.

## Miner burn and coverage

MinerBurned changes over time, so the panel shows it beside emissions: a faint
dashed line for emissions before burn, KPIs for burn in USD, burn rate (burn as
a share of pre-burn emissions) and pre-burn emissions, and how many days fees
matched or beat emissions. A compact chart below shows fees as % of that day's
emissions against a 100% break-even line. Today's burn is prorated like today's
emissions.

Until the collector has sampled today, today's emissions and burn carry the
latest sampled day's rate forward, prorated by elapsed time, so the window
totals never blank just because today's row is not in yet.

The 7D / 30D / ALL bar is sticky at the top of the page's scroll area while
Network Stats is on screen.

## Everything follows the range

Every figure in Network Stats covers the selected 7D / 30D / ALL range, like
the charts beneath it. Only "In flight now" and "Active miners" are live counts.
ALL runs the fees vs emissions panel from the first history day (launch was
2026-07-11), so the emission history must reach that far: run the collector
with a day count, e.g. `python scripts/collect-miner-emissions.py 100 previous.json`
(the optional previous file's complete days are reused, which keeps the run under
the public archive's historical-lookup rate limit; it also backs off and retries).
Days before SN7 emitted record a real 0. It
fetches TAO/USD from CoinGecko in <=85-day slices so samples keep hourly prices.
The page fetches the emission file with `cache: 'no-cache'` so a regenerated
file is picked up without a hard reload.

## Total emissions by recipient

Per block, the subnet owner's cut (SubnetOwnerCut, when OwnerCutEnabled) comes
off the alpha emission first; validators and miners split the rest evenly, and
MinerBurned withholds part of the miner half. The collector records each
sample's `ownerFraction` and emits `ownerUsd`, `validatorUsd` and `totalUsd`
per day (reused days get the cut read once at their first sample block).  The pool-side alpha injection
(`alpha_in`) is liquidity, not a payout, and is not counted.

## Panel layout (simplified)

Four figures: Protocol fees, Miner emissions (burn in its tooltip), Fees cover
(fees as % of miner emissions; % of total emissions in its tooltip) and Total
emissions (owner / validators / miners / burned in its tooltip). One chart: what SN7
emits each day as stacked bars (miners at the base, then validators, owner and
the burned miner share) with protocol fees as a line over it. Where the line
clears the miners segment, fees covered miner emissions; the full stack is total
emissions. Fees by source have their own per-day charts below the panel. One status line underneath.
Earlier extras (per-source KPIs, the pre-burn line, the per-day % chart, days
fees beat emissions) were cut for clarity; the summary helpers still compute
them.
