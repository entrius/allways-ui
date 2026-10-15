# Daily fees versus miner emissions

Local feature branch `feat/daily-fees-emissions`, based on `origin/test` at
`d10630d`. Network > Network Stats shows a shared-USD chart of daily fees and
estimated SN7 miner emissions, with totals, coverage and fees minus emissions.

Fees are stacked bars of three treasury income sources:

- Swap fees: the live `/history` endpoint, valued at transaction time.
- Reservation and quote-churn fees: `GET /treasury?timeFrom&timeTo`, called once
  per UTC day (completed days load once; today refreshes every five minutes).
  These are lamports, valued at that day's mean CoinGecko SOL/USD (the day's
  open and close samples; open and latest for today). das derives reservation
  fees as reservation events x the current reservation fee.

A day missing any source, or its SOL price, is a gap for the total.
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

## Network Stats tiles

The all-time tiles split fees into Swap fees, Reservation fees, Quote churn fees
and All fees. Reservation and churn come from all-time `GET /treasury`, valued at
today's SOL price. das holds 299 corrupt `QuoteSet.update_fee` values between
block times 1787173319 and 1787199604 (Aug 19-20 2026, about 9.1e18 lamports;
the real maximum is 0.01 SOL per update). The UI subtracts that window's churn
(`CORRUPT_CHURN_WINDOW` in `src/api/TreasuryApi.ts`) until das filters them.
