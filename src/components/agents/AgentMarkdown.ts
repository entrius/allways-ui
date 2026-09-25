// public/llms.txt is GENERATED from this constant (vite emit-llms-txt plugin) —
// never edit it by hand. Asset, hub, and pair lists below derive from the
// chains registry so a new spoke or hub needs no edits here.
import {
  allDirections,
  chainInfo,
  chainList,
  hubChains,
} from '../../api/models/chains';

const chains = chainList();
const hubs = hubChains();
const sym = (c: string) => chainInfo(c)?.symbol ?? c.toUpperCase();
const withAnd = (xs: string[]) =>
  xs.length > 2
    ? `${xs.slice(0, -1).join(', ')}, and ${xs[xs.length - 1]}`
    : xs.join(' and ');
const hubList = withAnd(hubs.map(sym));
const hubOr = hubs.map(sym).join(' or ');
// Wire id, not symbol: four USDC deployments share a symbol, and the id is
// what --from/--to take.
const assetRows = chains
  .map((c) => `| \`${c.id}\` | ${c.name} | ${c.hub ? '**hub**' : ''} |`)
  .join('\n');
// allDirections emits [forward, reverse] per pair.
const pairCount = allDirections().length / 2;

export const AGENT_MARKDOWN = `# Allways — Agent Quickstart

> Read this once, store under key \`allways-agent-quickstart\`. Don't
> re-ingest. Query live state via the CLI or HTTP API for everything
> dynamic — chains, rates, miners, swap status — since they change every block.

## TL;DR

Allways is Bittensor Subnet 7 — a permissionless on-chain orderbook for native
swaps between independent assets, settled on a **Solana program**.

**Hub-and-spoke.** ${hubList} are hubs. A pair is valid iff one leg is a hub, so ${chains.length} assets give ${pairCount} pairs and ${pairCount * 2} directions; spoke↔spoke is not swappable.

**Backing.** Miners post collateral in the pair's hub asset (${hubOr}) and quote
rates. Validators verify both legs. On miner failure the protocol slashes that
collateral and pays you in the same asset. No custodian, no wrapped asset, no
bridge token.

## Assets

Wire ids — what \`--from\` and \`--to\` take. Live set: \`GET /chains\`.

| id | Asset | |
|---|---|---|
${assetRows}

## Resources

| What | Where |
|---|---|
| Mainnet (netuid 7) dashboard · API | https://all-ways.io · https://api.all-ways.io/swagger |
| Testnet (netuid 19) dashboard · API | https://test.all-ways.io · https://test-api.all-ways.io/swagger |
| Setup walkthrough | https://docs.all-ways.io/getting-started |
| Swap walkthrough | https://docs.all-ways.io/swap-guide |
| Full CLI reference | https://docs.all-ways.io/cli |
| Protocol mechanics | https://docs.all-ways.io/how-it-works |
| Source repo | https://github.com/entrius/allways |
| This document, raw | https://all-ways.io/llms.txt · https://test.all-ways.io/llms.txt |

Both networks run the same Solana program
\`6JVBEj5w27J2SVjERmv2c7wXgFee9nSSBKUJevHehyBD\`; only the cluster differs.
Testnet leads mainnet — confirm a feature with \`alw view config\` and
\`GET /chains\` on the network you target before you rely on it.

> **Code is law.** This is a quickstart, not a spec. The on-chain program
> (\`smart-contracts/solana/programs/allways_swap_manager\`) is the only
> authority; everything here is convenience and may lag it. Read the program,
> neurons, CLI, and \`allways/constants.py\` before any non-trivial swap.

## Concepts you actually need

- **Rates.** A pair's hub leg is its numéraire: the forward (hub→spoke) rate reads "destination per 1 hub", and the reverse leg inverts it. Collateral and swap bounds are denominated in the backing; the reservation fee is always SOL, because every bid settles on Solana.
- **Reservation lifecycle (three steps).** A miner is secured *before* amounts are named:
  1. **Bid** (\`open_or_request\`) — you, or a validator for you, bid into a per-miner pool and pay a small non-refundable SOL **reservation fee**. The first bid pins the miner's rate for the pool window. A bid carries no taker and no amounts.
  2. **Draw** (\`resolve_pool\`) — after the window closes, a permissionless stake-weighted lottery picks the winner. An unrouted bid has weight 0.
  3. **Finalize** (\`finalize_reservation\`) — the winner names the taker and amounts, bounded by the backing's min/max swap and by the miner's collateral. The reservation is now live.
- **Native vs routed.** A native bid carries zero draw weight and loses to any validator bidding the same pool. A routed bid asks a validator to enter with its stake weight — it fronts the entry fee, pays a stake-discounted rate, and finalizes with you pinned. **Testnet sets a router by default; mainnet has none yet, so mainnet bids are native.** \`--router <hotkey>\` routes one swap, \`--no-router\` forces native. Routed takers sharing a window are seated FIFO — losers re-run.
- **Statuses.** \`PendingAttestation → Active → Fulfilled → Completed\` is the happy path. Two terminals end it early:
  - \`TimedOut\` — the miner failed to deliver. The protocol pays you **1.1× the swap's hub-leg value**, in the backing asset, automatically.
  - \`Cancelled\` — validators proved your **destination cannot receive** (blacklisted or paused token, a contract that reverts a correctly-gassed transfer, a reserved Solana account). No slash, no fee, no strike — and **no refund: your source funds stay with the miner.** Validate your receive address before you send.
- **Fee — 1%, paid via the rate.** Send \`1.0\` worth, receive \`0.99\` worth. The miner keeps none of it; the protocol skims it from the miner's collateral at settlement. Preview the real number with \`alw swap quote\` — the "You receive" line, not the headline rate, is your outcome.
- **Relay immediately, don't wait.** Broadcast the source tx, then run \`alw swap post-tx <hash>\` at once. Validators accept a seen-but-unconfirmed deposit and wait out confirmations server-side, extending your reservation meanwhile. Sleeping before \`post-tx\` is how reservations lapse.
- **Sender verification.** Validators reject any source tx whose on-chain sender does not match the address pinned in your reservation. Broadcast only from that address, never from a custodial account.
- **BTC fees gate the source leg.** A BTC source tx must confirm inside the extension budget. Too low a fee and it mines after the deadline, into the miner's address, with no live reservation to credit — the funds are gone. Let the CLI auto-estimate \`--btc-fee-rate\` unless you checked current tiers (https://mempool.space).
- **Live parameters — read, never hardcode.** Min/max swap bounds are **per backing** and are measured against the swap's hub leg, not the source amount. They, the reservation fee, min/max collateral, reservation TTL, finalize window, fulfillment timeout, extension budget, and consensus threshold are all on-chain. Read them with \`alw view config\`.

> **Bittensor primer.** The CLI handles all chain interaction. Background only: https://docs.bittensor.com.

## End-to-end swap flow

1. **Quote.** \`alw swap quote\` (or \`GET /miners\`). Rates are posted on-chain — there is no off-chain orderbook.
2. **Bid.** \`alw swap now\`. Routed where a router is configured, native otherwise. The first bid pins the rate.
3. **Draw + finalize.** ~5–30s from bid to a live reservation. If the pool did not resolve in time, re-running is safe and resume-aware — no funds have moved. A live reservation holds the miner exclusively for the reservation TTL.
4. **Send source funds.** The exact amount, to the miner's printed address, from your pinned source address. \`--send\` does this for you when the CLI holds that wallet's key.
5. **Relay.** \`alw swap post-tx <hash>\`. Validators verify sender, recipient, amount, and freshness, then vote to initiate. \`PendingAttestation → Active\`.
6. **Miner fulfils.** It sends 99% of the destination amount to your receive address and marks fulfilled. \`Active → Fulfilled\`.
7. **Validators confirm.** Both legs verified → confirm. Confirmation waits are per chain and server-side (SOL ≈ seconds, TAO ≈ 72s, BTC ≈ 20 min). \`Fulfilled → Completed\`.
8. **Or a terminal fires.** \`TimedOut\` refunds you 1.1× automatically; \`Cancelled\` does not refund at all.

Poll live state throughout: \`alw view reservation\` before the send, \`alw view swap <key> --watch\` after.

## Setup

> Agents need shell access and Python ≥ 3.10. A pure-HTTP flow is on the roadmap.

### 1. Install

\`pipx\` keeps \`alw\` isolated and pulls in \`bittensor\` + \`btcli\`:

    pipx install git+https://github.com/entrius/allways.git
    alw --help

### 2. Solana keypair (always required)

The orderbook settles on Solana, so every bid, finalize, and fee is signed by a Solana keypair — separate from your Bittensor wallet, and needed even when neither leg is SOL.

    solana-keygen new -o ~/.solana/id.json          # SAVE the seed phrase
    solana-keygen pubkey ~/.solana/id.json          # the address to fund
    solana airdrop 2 <pubkey> --url https://api.devnet.solana.com   # testnet only

The CLI reads \`~/.solana/id.json\` by default (\`SOLANA_KEYPAIR_PATH\`, or \`alw config set solana-keypair <path>\`). An unfunded key cannot pay fees.

### 3. Bittensor wallet

    btcli wallet new-coldkey --wallet.name <coldkey-name>
    btcli wallet new-hotkey  --wallet.name <coldkey-name> --wallet.hotkey <hotkey-name>

As a taker, the **coldkey** signs TAO source transfers. The hotkey is not used on the happy path.

### 4. Source-asset credentials (only for \`--send\`)

Set these to let the CLI broadcast for you. Without them the CLI prints the address and amount, you send from your own wallet, and you relay with \`post-tx\` — the flow works either way. Read them from the shell env, a project \`.env\` walked up from CWD, or \`~/.allways/.env\`.

| Source asset | Credential |
|---|---|
| SOL | the Solana keypair above |
| TAO | Bittensor coldkey; set \`MINER_BITTENSOR_COLDKEY_PASSWORD\` to skip the unlock prompt |
| BTC | \`BTC_PRIVATE_KEY\` (WIF). Access runs over public Esplora — no node (\`BTC_ESPLORA_URLS\` overrides) |
| every EVM asset | \`{NETWORK}_PRIVATE_KEY\`, keyed by **network**, not asset — assets sharing a network share it (\`ETH_PRIVATE_KEY\` covers \`eth\`, \`ethusdc\`, \`uni\`, \`qnt\`, and \`paxg\`). \`alw config set --help\` lists every network |

### 5. Configure the CLI

    alw config set env    testnet   # or mainnet
    alw config set wallet <coldkey-name>
    alw config set hotkey <hotkey-name>

\`env\` resolves the Bittensor network, Solana cluster, **every** chain network, netuid, and the router in one line — \`testnet\` = netuid 19 + devnet + each chain's testnet; \`mainnet\` = netuid 7 + mainnet everywhere, with no router. No program id or RPC to copy. Config persists at \`~/.allways/config.json\`; \`alw config\` shows every effective value and its source.

## Verify the install (read-only, no funds spent)

    alw --help                                            # 1. Binary works.
    alw config                                            # 2. Saved config is correct.
    alw status                                            # 3. Connects; balances appear.
    alw view miners                                       # 4. Miners + rates. Empty = offline or wrong network.
    alw view validators                                   # 5. Validator set and lottery weights.
    alw view rates --pair sol-btc                         # 6. Live orderbook (swappable quotes only).
    alw view config                                       # 7. **Read this.** Live fees, bounds, windows, timeouts.
    alw swap quote --from btc --to sol --amount 0.001     # 8. Preview a quote (no commitment).

## Run a swap

\`alw swap now\` reserves a miner, then either sends your source funds or prints exactly what to send. **\`--send\` defaults on for an interactive TTY and off for scripts**, so an agent gets the print-and-relay flow unless it passes \`--send\`. On a TTY the CLI prompts for omitted flags; with no TTY every flag is required and a missing one fails fast with a non-zero exit.

**BTC → SOL**, manual send (the default for a script):

    alw swap now \\
      --from btc --to sol \\
      --amount 0.001 \\
      --receive-address <your-solana-pubkey> \\
      --from-address <your-btc-address> \\
      --yes
    # prints the miner's address + exact amount → you broadcast → then:
    alw swap post-tx <hash>

**SOL → TAO**, CLI-driven send (\`--receive-address\` is a TAO ss58):

    alw swap now --from sol --to tao --amount 0.5 --receive-address 5C... --send --yes

With \`--send\` the CLI broadcasts, relays, and watches to a terminal state in one call. It falls back to manual instructions — without spending anything beyond the reservation fee — if the credential is missing or your wallet does not control the pinned source address.

| Flag | Purpose |
|---|---|
| \`--from <chain>\` | Source asset, by wire id (see **Assets**) |
| \`--to <chain>\` | Destination asset; one leg must be a hub |
| \`--amount <n>\` | Source amount, in source-chain units |
| \`--receive-address <addr>\` | Where the miner pays you, on the \`--to\` chain |
| \`--from-address <addr>\` | Where you broadcast from; required for a non-SOL source, and pinned as the only accepted sender |
| \`--from-tx-hash <hash>\` | Attach a source tx you already broadcast |
| \`--miner <pubkey>\` | Pin a miner instead of auto-selecting; bare \`--miner\` opens a picker |
| \`--send\` / \`--no-send\` | Broadcast the source funds from your configured wallet, then relay and watch |
| \`--router <hotkey>\` | Route through this validator (overrides the \`router\` config) |
| \`--no-router\` | Self-represent (native bid — loses contested draws) |
| \`--yes\` | Skip confirmations |
| \`--btc-fee-rate <sat/vB>\` | Override the BTC fee rate (default: auto-estimated) |

Your swap key is \`keccak256(source-tx-hash)\`, printed by \`alw swap post-tx\` and findable via \`alw view active-swaps\` or \`/swaps?search=<your-tx-hash>\`:

    alw view swap <key> --watch    # live timeline until a terminal status

If interrupted after the reserve but before the send, \`alw view reservation\` shows whether the seat is still live: if it is, send and relay; if it lapsed, re-run \`alw swap now\` and forfeit only the reservation fee.

## CLI cheat sheet

Every read command takes \`--json\`. Errors come back as \`{"error": …}\` with a non-zero exit, so pipelines never parse prose.

| Command | Purpose |
|---|---|
| \`alw config [set <key> <value>]\` | View / set \`env\`, \`wallet\`, \`hotkey\`, \`router\`, \`solana-keypair\`, per-chain networks |
| \`alw status\` | Network, program health, balances, your swap state |
| \`alw view miners\` | Every miner, including offline and cooldown |
| \`alw view rates [--pair sol-btc]\` | Swappable quotes only; \`--sort\`, \`--min-capacity\`, \`--search\` |
| \`alw view active-swaps\` | Swaps open on-chain (terminal swaps are closed and not listed) |
| \`alw view swap <key> [--watch]\` | One swap, both legs, and its timeline |
| \`alw view reservation\` | The reservation on the miner \`swap now\` saved; \`--miner <pubkey>\` overrides |
| \`alw view config\` | Live on-chain parameters |
| \`alw view validators\` | Validator set, lottery weights, consensus threshold |
| \`alw swap quote --from <c> --to <c> --amount <n>\` | Preview rate, backing, and receive amount |
| \`alw swap now [...flags]\` | Reserve, optionally send, relay |
| \`alw swap post-tx <tx-hash>\` | Relay your source tx to the validators |

Miner and operator commands (\`alw miner\`, \`alw collateral\`, \`alw vault\`, \`alw bind-hotkey\`, \`alw admin\`) are out of scope here — see https://docs.all-ways.io/cli.

## Public API

Base URL \`https://api.all-ways.io\` (testnet \`https://test-api.all-ways.io\`). Live OpenAPI at \`/swagger\` — treat it as authoritative, since field names here may lag. **Be a good citizen:** cache, prefer SSE over polling.

| Method | Path | Purpose |
|---|---|---|
| GET | \`/chains\` | **Supported assets, hub flags, decimals, explorers.** Start here |
| GET | \`/health\` | Liveness |
| GET | \`/stats\` | Counters, including volume per backing |
| GET | \`/prices\` | Estimated USD per chain; \`null\` where there is no USD venue |
| GET | \`/miners\` | One row per miner per direction, with rate, backing, and fundable capacity |
| GET | \`/miners/{hotkey}\` | Single miner |
| GET | \`/swaps\` | All swaps; filters \`search\`, \`status\`, \`fromChain\`, \`toChain\`, \`timeFrom\`, \`timeTo\`, \`minNotional\`, \`maxNotional\`, \`sort\`, \`dir\`, \`limit\`, \`offset\` |
| GET | \`/swaps/{swapId}\` | Single swap + event timeline |
| GET | \`/swaps/active\` | In-progress swaps; \`userAddress\`, \`minerHotkey\` |
| GET | \`/reservations/by-source/{address}\` | Reservations pinned to a source address |
| GET | \`/reservations/{requestHash}\` | Reservation by hash |
| GET | \`/events\` | Filtered program events |
| GET | \`/protocol/constants\` | Immutable constants only (the 1% fee divisor). **Live bounds are on-chain — use \`alw view config\`** |
| GET | \`/sse\` | Server-Sent Events (\`connected\`, \`event\`, \`miner\`, \`swap\`, \`reservation\`, \`head\`) |

> Amounts are decimal strings in smallest units (lamports, satoshi, rao, wei). Parse with arbitrary-precision types — never floats.

## Known issues

- **Dependency resolver conflicts** — \`bittensor\` is hard-pinned. Install into a fresh env; \`pipx\` is safest. Never into a system Python.
- **\`No module named 'bittensor'\`** — you are outside the venv. With \`pipx\`, call \`alw\` directly.
- **\`Attempt to debit an account but found no record of a prior credit\`** — the Solana key is unfunded, or you are pointed at the wrong one. Check \`solana-keygen pubkey\`.
- **Empty \`alw view miners\`** while the dashboard shows miners — wrong network. Re-check \`alw config\` (\`env\`, \`solana-network\`, \`netuid\`).
- **\`BTC signing requires the BTC_PRIVATE_KEY env var\`** — set the WIF, or drop \`--send\` and use the manual flow.
- **Lost a contested draw** — expected, not an error. That bid's fee is spent; **do not send funds.** Re-run for the next window.
- **Reservation expired before the send** — you forfeit only the reservation fee. Start a new swap. Live TTL via \`alw view config\`.
- **BTC tx stuck unconfirmed** — it will land after the deadline with no reservation to credit. RBF up immediately; recovery is only possible while the tx is in the mempool.
- **Swap vanished** — \`alw view swap --json\` returns \`{"found": false, …}\` because swaps close on-chain at resolution. "Gone" usually means "finished": confirm the payout on the backing asset's balance.
- **Swap \`Cancelled\`** — your destination could not receive. There is no refund. Verify the receive address is a plain, unfrozen account before the next attempt.

## Testnet

Testnet (netuid 19 + Solana devnet) mirrors mainnet with free funds. Rehearse there first.

    alw config set env testnet

\`env testnet\` points every chain at its testnet — BTC testnet4 (\`tb1q…\` addresses), Ethereum Sepolia, Avalanche Fuji, Polygon Amoy, and so on. Inspect state at https://test.all-ways.io and https://test-api.all-ways.io.

Faucets: **SOL** \`solana airdrop 2 <pubkey> --url https://api.devnet.solana.com\` · **TAO** https://taoswap.org/testnet-faucet · **BTC testnet4** https://mempool.space/testnet4/faucet (testnet3 faucets will not fund testnet4). Other spokes use their own network faucets. If a faucet will not cooperate, ask the operator to seed your wallets — normal on testnet.

Parameters drift. Always re-read \`alw view config\`, \`alw view miners\`, and \`alw view validators\` before assuming the network is live.

## Disclaimer

Allways is permissionless, open-source, beta software. Swaps settle directly between counterparty wallets; the protocol never takes custody of user funds, and the protocol fee is charged against miner collateral rather than any user transfer. Validator operators, including those run by the project, verify swap outcomes but cannot redirect or receive any transferred amount. Use at your own risk. No warranty. Not financial advice.
`;
