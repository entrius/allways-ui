# Proposal: miner emission coverage in Allways Access admin

Status: proposal for Landyn and Ander, requested by Grant on 2026-10-03.
Scope: reporting first. No automatic burn, weight changes, treasury movement, or production deployment.

## Product outcome

DAU is Allways’ number-one priority. Add an admin statistic answering:
“What percentage of miner emissions is our transaction fee revenue covering?”
This connects daily transacting users, completed volume, and fees to the subsidy supporting the marketplace. It is not a claim of company profitability or proof that fees have been recycled.

## Proposed admin card

- Headline: **Miner emission coverage · 7 days**, displayed as a percentage.
- Supporting values: eligible fees, miner emissions paid (USD), and uncovered emissions (USD), all over the identical window.
- Detail: completed volume, average fees/day, average miner emissions/day, and estimated daily volume needed for 100% coverage at the effective fee rate.
- Show the exact window, last complete data timestamp, chain checkpoint, price method, and data-quality status.
- Show actual fee recycling separately if verifiable. Do not label collected fees as burned or recycled.
- Link to a daily fees-versus-miner-emissions trend and definitions.
- Show DAU and daily transacting users separately when available; wallet counts are a proxy, not verified unique people. Keep known testing/self-generated activity separate from organic usage.

Example display fixture only: $700 eligible fees / $2,800 miner payouts over seven days = 25.0% coverage; uncovered emissions = $2,100. This is not live data.

## Metric contract

Default to the last seven complete UTC days, with a separate latest-24h view if useful. Never compare seven days of fees with one day of emissions or silently include a partial day.

For the same window W:

```
F = sum(eligible realized protocol fees in USD over W)
M = sum(actual alpha emitted to miners, valued in USD at payout time, over W)
coverage_pct = 100 * F / M
uncovered_usd = max(M - F, 0)
fee_surplus_usd = max(F - M, 0)
effective_fee_rate = F / completed_fee_bearing_volume_usd
required_daily_volume_usd = (M / number_of_days) / effective_fee_rate
```

Eligible fees are earned on completed, settled transactions, net of fee refunds and rebates. Reconcile recorded fees with actual collection; if only accrued fees can be established, label the measure accrued and do not call it collected. Count each protocol fee once. Keep fee timestamps and USD valuation consistent with their earning/settlement time. A quote, failed transaction, reservation, or gross two-leg transfer total is not fee revenue.

Miner payouts exclude owner and validator rewards and exclude alpha withheld for burn/recycle before payment. Use indexed, finalized payout evidence with version-aware interpretation; do not assume every emission event includes only paid amounts. Account for deferred epochs and verify that payout totals reconcile to chain. Value each payout using the contemporaneous SN7 alpha/TAO price and TAO/USD price, with documented sampling granularity. Do not revalue the entire historical week at today's spot price.

Keep a separately labeled current run-rate estimate if useful. A 7,200-block/day spot estimate is not measured historical coverage. Likewise, the burn-weight allocation is distinct from the realized fraction withheld across validators.

If M is zero, display N/A with “No miner payouts in this window”, never infinity. If M > 0 and verified F is zero, display 0%. Missing prices, missing days, stale indexers, or incomplete payout coverage must show unavailable/incomplete, never fabricated zeros. Coverage can exceed 100%; do not cap it. If effective fee rate is zero or unavailable, the volume target is unavailable.

## Data and implementation boundaries

Allways' current public API exposes `/history?range=7d&interval=day`, including volumeUsd, feesUsd, and unpricedSwaps. It is a starting point for fee history, not proof of net collected fees. Verify range boundaries and exclude partial buckets. `/protocol/constants` currently returns feeDivisor=100, but use realized fees and the effective rate for historical coverage rather than hardcoding 1%.

The API needs a matching historical miner-payout series and historical valuation. Prefer a backend aggregation endpoint carrying the window, totals, daily buckets, checkpoint, pricing provenance, completeness, and fee basis. The browser should not query Finney directly or hold indexer credentials. Preserve existing admin authorization.

No established admin route was found in the inspected `entrius/allways-ui` test branch. Landyn should confirm the production Allways Access admin repository and route before implementation. This proposal lives with the UI work so it is reviewable now; it does not invent or expose a public admin page.

## Why dynamic burn remains a separate decision

A possible future policy is:

```
allowed_daily_miner_rewards = average_net_fees_per_day_7d + explicit_growth_subsidy
suggested_total_burn = clamp(1 - allowed_daily_miner_rewards / full_daily_miner_allocation_value, 0, 1)
```

This is a scenario model, not a recommended live controller. A zero growth subsidy targets fee/emission parity, not operating profitability. A minimum liquidity budget can exceed the fee budget and must visibly show the remaining subsidy.

Increasing miner burn also reduces the subnet's TAO emission weighting: the current runtime scales price-based shares by (1 - MinerBurned), then renormalizes and applies its emission gate. Prices, inflows, liquidity and miner participation may respond. The proposed controller therefore needs simulation and verification against the deployed runtime before adoption. Reducing every miner score equally does not create a burn because weights normalize; any implementation requires explicit protocol-level review.

Potential safeguards to review: a minimum reward budget for reliable liquidity, a bounded rate of change (initial discussion point: five percentage points/week), stale-data freeze, and reward attribution that makes self-generated transactions unprofitable after all fees, spreads, rewards and related-party benefits. Seven-day smoothing alone does not prevent gaming or a volume/liquidity feedback loop.

Grant's current request is to preserve this idea and surface fee coverage in admin. It does not authorize enabling this controller.

## Historical planning context, not acceptance thresholds

The 2026-10-03 discussion used an approximate full miner allocation value of $2,148/day and paid emissions of $1,982/day after a 7.7% withheld fraction. Seven complete UTC days of reported volume averaged approximately $9,588/day ($96/day in recorded fees). October 2 UTC reported $49,303 volume ($493 fees).

Comparing those fees to the current payout run rate gives approximately 4.8% and 24.9% coverage, respectively. These are mixed-period planning estimates, NOT historical measured coverage. Under fixed-price assumptions, strict parity implied total burns of approximately 95.5% or 77.0% of the full miner allocation. Those figures must not be shipped as recommendations or hardcoded live values.

Sources: [Allways fee setting](https://api.all-ways.io/protocol/constants), [Allways history](https://api.all-ways.io/history?range=7d&interval=day), [subnet emission weighting](https://github.com/RaoFoundation/subtensor/blob/main/pallets/subtensor/src/coinbase/subnet_emissions.rs), [payout and withholding mechanics](https://github.com/RaoFoundation/subtensor/blob/main/pallets/subtensor/src/coinbase/run_coinbase.rs). Runtime links track main; pin the deployed runtime revision during implementation.

## Acceptance criteria for implementation

1. Landyn confirms the admin destination, backend ownership, collection evidence, historical indexing availability, and access controls; Ander reviews payout/burn interpretation and valuation.
2. Card and trend use the same complete seven-day window for numerator and denominator, with documented UTC boundaries.
3. A fixture with $700 eligible fees and $2,800 payouts renders 25.0% coverage and $2,100 uncovered; $3,500/$2,800 renders 125.0% with a $700 surplus.
4. Zero payouts, zero fees, partial indexing, stale sources, refunds, duplicate fee events, and missing prices behave as specified. Reconcile one sampled complete day end to end.
5. No hardcoded prices/emissions, no public exposure of admin data, and no burn/weight/treasury mutations.
6. UI follows the repository design system and passes applicable lint, formatting, build, and visual checks when implemented.
