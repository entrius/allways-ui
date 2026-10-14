# Daily fees versus miner emissions

Local feature branch `feat/daily-fees-emissions`, based on `origin/test` at
`d10630d`. Network > Network Stats shows a shared-USD chart of daily fees and
estimated SN7 miner emissions, with totals, coverage and fees minus emissions.

Fees come from the existing live `/history` endpoint, valued at transaction time.
The new emission source contract is `GET /economics/emissions/history`:

```json
{
  "netuid": 7,
  "network": "finney",
  "asOf": "2026-10-14T23:00:00Z",
  "method": "Four historical rate samples per day...",
  "rows": [{ "t": "2026-10-13T00:00:00Z", "emissionsUsd": 1600.00 }]
}
```

The number above illustrates the schema, not a real observation. `null` means
missing. Missing fees, missing emissions, or unpriced completed swaps suppress
coverage rather than imply zero. Zero fees are valid; zero emissions produce
N/A coverage. Days are complete UTC days, never browser-local dates.

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
Today’s emission point is a full-day projection from available historical samples
(00/06/12/18 UTC). It is explicitly labeled full-day, not emissions paid so far.
Today is excluded from complete-day summary totals. This makes the recent fee
increase visible without presenting an incomplete day as a finished one.
The ALL selector caps this new panel at the latest 30 complete days plus today,
matching the collector’s available range; its subtitle states that window.
