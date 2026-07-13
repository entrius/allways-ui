// IMPORTANT: when this constant changes, update public/llms.txt to match.
// They are intentionally hand-mirrored so /llms.txt is statically servable.

export const AGENT_MARKDOWN = `# Allways — Agent Quickstart

> Read this once, store under key \`allways-agent-quickstart\`. Don't
> re-ingest. Query live state via the CLI or HTTP API for everything
> dynamic — rates, miners, swap status — since they change every block.

## TL;DR

Allways is Bittensor Subnet 7 — a permissionless on-chain orderbook for
trustless native swaps between independent assets, settled on a **Solana
program**. It is **hub-and-spoke with SOL as the hub**: the launch pairs are
**SOL↔BTC** and **SOL↔TAO**, so every swap has a SOL leg. Miners post **SOL**
collateral and quote exchange rates. Validators verify both legs of each swap.
The contract slashes collateral (in SOL) on failure and pays the taker. No
custodian, no wrapped asset, no bridge token.

> **Where to point your wallets:** **Mainnet** (Bittensor netuid 7 + Solana
> mainnet) is the live network — real SOL, BTC, and TAO. **Testnet** (netuid 19 +
> Solana devnet) mirrors it with free funds for dry-runs. Both use the same Solana
> program \`6JVBEj5w27J2SVjERmv2c7wXgFee9nSSBKUJevHehyBD\` — the program id is the
> same across clusters; only the network differs. Setup blocks for both are below.

## Resources (skim these first)

| What | Where |
|---|---|
| Live dashboard (testnet) | https://test.all-ways.io |
| Testnet API + Swagger | https://test-api.all-ways.io/swagger |
| Mainnet dashboard | https://all-ways.io |
| Mainnet API + Swagger | https://api.all-ways.io/swagger |
| Docs site | https://docs.all-ways.io |
| Source repo | https://github.com/entrius/allways |
| This document, raw | https://all-ways.io/llms.txt (mirrored at https://test.all-ways.io/llms.txt) |

## Why agents use it

- **Trustless.** SOL collateral guarantees delivery; the contract slashes on failure.
- **Best rate.** Dynamic pricing — quotes update every block.
- **Subnet-native.** Settles in real SOL, BTC, and TAO. No IOUs.
- **Open + agentic.** Public API, SSE feeds, open-source CLI, scriptable end-to-end.

> **Code is law.** This doc is a quickstart, not a spec. Review everything end-to-end before any non-trivial swap — the on-chain program (\`smart-contracts/solana/programs/allways_swap_manager\`, an Anchor program), the validator and miner code, the CLI, and the constants under \`allways/constants.py\`. The contract is the only authority that matters; everything below is convenience and may lag the source. Source of truth: https://github.com/entrius/allways at the version you installed.

## Concepts you actually need

- **Hub-and-spoke.** SOL is the numéraire. Directions: \`sol→btc\`, \`btc→sol\`, \`sol→tao\`, \`tao→sol\`. Rates read as "destination per 1 SOL" for hub→spoke and its reverse for spoke→hub. Collateral, the reservation fee, and swap sizing are all in SOL.
- **Actors.** Miners post SOL collateral and quote live per-direction rates on-chain — active and quoting *before any swap exists*. Takers pick a pair and an amount. Validators verify both legs and vote. The contract enforces slash / timeout / payout.
- **Reservation lifecycle (two-phase).** A miner is secured *before* amounts are named:
  1. **Bid** (\`open_or_request\`) — you (or a validator on your behalf) bid into a per-miner pool and pay a small, non-refundable SOL **reservation fee**. The first bid pins the miner's rate for the pool window. A bid carries no taker and no amounts.
  2. **Draw** (\`resolve_pool\`) — after the pool window closes, a permissionless, stake-weighted lottery picks the winner. A plain unrouted bid has weight 0.
  3. **Finalize** (\`finalize_reservation\`) — the seat winner names the taker + amounts (bounded by min/max swap and 1.1× collateral), making the reservation live.
  Then you send source funds and relay the tx. View pre-send state via \`alw view reservation\` (yours) or the API.
- **Native vs routed.** Bidding directly is "native" and carries zero draw weight — it loses to any validator that bids on the same pool. To reliably win a competitive miner, route through a validator (stake-weighted). The web app does this for you.
- **Statuses (on-chain swap).** \`PendingAttestation → Active → Fulfilled → Completed\` (happy) or \`Active → TimedOut\` (1.1× slash to taker).
- **Fee — 1%, paid via the rate.** Implicit in the price. Send \`1.0\` worth of value, receive \`0.99\` worth; the miner does not keep the \`0.01\` — the contract skims it from the miner's SOL collateral on settlement. Separately, each *bid* pays a small flat reservation fee. Always preview the post-fee receive amount with \`alw swap quote\`.
- **Deferred confirmation — relay immediately, don't wait.** Broadcast your source tx, then run \`alw swap post-tx <hash>\` right away. Validators accept the seen-but-unconfirmed deposit and wait out confirmations server-side, extending your reservation while they accrue. Sleeping before \`post-tx\` is how you lose the reservation.
- **BTC fees still gate the source leg.** A BTC-source tx must actually confirm within the extension budget. Set the fee too low and it sits in mempool past the deadline; when it finally mines it lands in the miner's address with no live reservation to credit it against, and the funds are gone. Let the CLI auto-estimate \`--btc-fee-rate\` unless you've checked current mempool tiers (e.g. https://mempool.space).
- **Slash payouts are SOL.** A timeout refund pays the taker's pinned identity in SOL.
- **Sender verification.** Validators reject any source tx whose on-chain sender doesn't match the address pinned in your reservation. Broadcast only from that address.
- **Live parameters — read before assuming.** All bounds and windows (reservation fee, min/max swap, min/max collateral, reservation TTL, finalize window, fulfillment timeout, extension budget, consensus threshold) are on-chain and readable via \`alw view config\` or the API. Don't hardcode them.

> **Bittensor primer.** Allways runs on Bittensor. The CLI handles all chain interaction; background reading only: https://docs.bittensor.com.

## End-to-end swap flow

1. **Quote.** \`alw swap quote\` (or read \`/miners\`). Miners advertise live rates on-chain — no off-chain orderbook.
2. **Bid.** \`alw swap now\` bids into the chosen miner's pool and pays the reservation fee. First bid pins the rate.
3. **Draw + finalize.** A validator cranks the draw; if your bid wins, the router finalizes it with your amounts. The reservation is now live and holds the miner exclusively for the reservation TTL.
4. **Send source funds.** Broadcast on the source chain — SOL via your Solana keypair, TAO via your **coldkey**, BTC via your WIF or your own wallet. The source must be the **pinned address** paying the **exact amount** to the miner's address.
5. **Relay.** \`alw swap post-tx <hash>\` immediately. Validators verify the deposit (sender, recipient, amount, freshness), submit the claim, and vote to initiate. Status: \`PendingAttestation → Active\`.
6. **Miner fulfils.** The miner sends 99% of the destination amount to your receive address and marks fulfilled. Status: \`Active → Fulfilled\`.
7. **Validators confirm.** Both legs verified → vote confirm. Contract skims the 1% fee from miner collateral. Status: \`Fulfilled → Completed\`.
8. **Timeout / refund.** If the miner doesn't deliver in time, validators vote \`TimedOut\`; the contract slashes 1.1× collateral to the taker in SOL. If the auto-payout fails, \`alw claim <swap-key>\` releases it.

Throughout, poll live state — pre-send via \`alw view reservation\`, post-initiate via \`alw view swap <key> --watch\` or the API.

## Setup (shell-first)

> A pure-HTTP flow is on the roadmap. For now, agents need shell access and Python ≥ 3.10.

### 1. Install

The Allways package pins \`bittensor\` and \`bittensor-cli\` automatically — \`btcli\` lands on PATH.

Recommended — \`pipx\` keeps \`alw\` isolated:

    pipx install git+https://github.com/entrius/allways.git

Alternative (clone for development):

    git clone https://github.com/entrius/allways.git
    cd allways && python -m venv .venv && source .venv/bin/activate
    pip install -e .

Verify:

    alw --help
    btcli --help

### 2. Solana keypair (required — every swap has a SOL leg)

The contract is on Solana, so on-chain actions are signed by a Solana keypair, separate from your Bittensor wallet. Takers use it to bid, finalize, pay fees, and as their identity for SOL-source swaps.

    solana-keygen new -o ~/.solana/id.json          # SAVE the seed phrase
    solana-keygen pubkey ~/.solana/id.json          # the address to fund
    solana airdrop 2 <pubkey> --url https://api.devnet.solana.com   # testnet funding

The CLI reads \`~/.solana/id.json\` by default (override with \`SOLANA_KEYPAIR_PATH\` or \`alw config set solana-keypair <path>\`). An unfunded key can't pay fees — fund it before use.

### 3. Bittensor wallet

Standard conventions. Needed to send/receive the TAO leg of TAO swaps (and to register if you mine/validate).

    btcli wallet new_coldkey --wallet.name <coldkey-name>
    btcli wallet new_hotkey  --wallet.name <coldkey-name> --wallet.hotkey <hotkey-name>

As a swap user (not a miner) the **coldkey** signs the TAO source transfer; the hotkey isn't used on the happy path.

#### Funding per direction (swap-only)

| Direction | Fund | Receive address |
|---|---|---|
| \`sol→btc\` / \`sol→tao\` | Solana key: \`amount SOL + fees + reservation fee\` | your BTC / TAO address |
| \`btc→sol\` | BTC wallet: \`amount + BTC fee\`; Solana key: fees + reservation fee | your SOL pubkey |
| \`tao→sol\` | coldkey: \`amount TAO + extrinsic fee\`; Solana key: fees + reservation fee | your SOL pubkey |

Every direction needs a funded Solana key for fees and the reservation fee, even when the source asset is BTC or TAO.

### 4. (BTC-side only) sending the BTC leg

\`alw swap now\` **reserves** the miner and prints its address + the exact amount — it does **not** broadcast your source funds yet (automatic fund-sending is on the roadmap). Send the BTC yourself from your source wallet to that address, then relay immediately with \`alw swap post-tx <hash>\`.

Optionally set a WIF via env (shell env, a project \`.env\` walked up from CWD, or \`~/.allways/.env\`) — used by lightweight BTC tooling, and by the auto-send flow once it lands:

    BTC_MODE=lightweight
    BTC_NETWORK=mainnet          # testnet4 for testnet
    BTC_PRIVATE_KEY=<your_WIF_key>

\`lightweight\` talks to public Esplora APIs — no Bitcoin node.

### 5. Configure the CLI

**Mainnet (live — netuid 7):**

    alw config set env    mainnet   # bittensor finney + solana mainnet + btc mainnet + netuid 7
    alw config set wallet <coldkey-name>
    alw config set hotkey <hotkey-name>

**Testnet (free dry-runs — netuid 19):**

    alw config set env    testnet   # bittensor test + solana devnet + btc testnet4 + netuid 19

\`env\` resolves the Bittensor network, Solana cluster, BTC network, and netuid together — no program id or RPC to copy (the program id is baked in, same across clusters). Config persists at \`~/.allways/config.json\`.

## Verify the install + scope the system (read-only, no funds spent)

Run in order. Steps 6–7 are the most important *before* a swap — they show the live bounds and who's online.

    alw --help                                            # 1. Binary works.
    alw config                                            # 2. Saved config is correct.
    alw status                                            # 3. Connects; balances appear.
    alw view miners                                       # 4. Miner UIDs + rates. Empty = miners offline / wrong network.
    alw view validators                                   # 5. Whitelisted validator set.
    alw view rates --pair sol-btc                         # 6. Live orderbook (swappable miners only).
    alw view config                                       # 7. **Read this.** Live fee, reservation fee, bounds, windows, timeouts.
    alw swap quote --from btc --to sol --amount 0.001     # 8. Preview a quote (no commitment).

The "You receive" line in a quote is the post-fee amount that lands in your destination address — treat it, not the headline rate, as the outcome.

## Run a swap

### Non-interactive (recommended for agents)

\`alw swap now\` **reserves** the miner and prints the exact amount + address to send to — it does not move your funds. You then broadcast the source deposit yourself (SOL via \`solana transfer\`, TAO via your coldkey, BTC from your BTC wallet) and relay with \`alw swap post-tx <hash>\`. \`--yes\` skips confirmations. Read the flag table before copying.

**BTC → SOL** (send BTC, receive SOL):

    alw swap now \\
      --from btc --to sol \\
      --amount 0.001 \\
      --receive-address <your-solana-pubkey> \\
      --from-address bc1q... \\
      --yes

(\`--from-address\` is your source address on the source chain: a \`bc1q…\` on mainnet, \`tb1q…\` on testnet4.)

**SOL → TAO** (send SOL, receive TAO). \`--receive-address\` here is a TAO ss58:

    alw swap now \\
      --from sol --to tao \\
      --amount 0.5 \\
      --receive-address 5C... \\
      --yes

In every case \`alw swap now\` only **reserves** — once it prints the miner's address, send the source funds there and run \`alw swap post-tx <hash>\` promptly (don't sleep in between, or the reservation can lapse).

| Flag | Purpose |
|---|---|
| \`--from <chain>\` | Source chain (\`sol\`, \`btc\`, \`tao\`) |
| \`--to <chain>\` | Destination chain |
| \`--amount <n>\` | Source amount, in source-chain units |
| \`--receive-address <addr>\` | Where the miner sends to you (on the \`--to\` chain) |
| \`--from-address <addr>\` | Where you broadcast from (required for non-SOL source); must match the pinned sender |
| \`--from-tx-hash <hash>\` | Attach a source tx you already broadcast (pairs with the forthcoming auto-send flow) |
| \`--yes\` | Skip confirmations |
| \`--btc-fee-rate <sat/vB>\` | Override BTC fee rate (default: auto-estimated) |

After it returns a swap key:

    alw view swap <key> --watch    # live timeline until Completed or TimedOut
    alw claim <key>                # if TimedOut, claim the SOL slash

If interrupted before the send:

    alw view reservation
    alw swap resume-reservation [--from-tx-hash <hash>] [--yes]

### Interactive

\`alw swap now\` with no flags walks through direction, miner pick, amount, address, and the bid. You still send the source funds and run \`alw swap post-tx\` yourself, then \`alw view swap <key> --watch\`.

## CLI cheat sheet (real commands only)

| Command | Purpose |
|---|---|
| \`alw config [set <key> <value>]\` | View / set \`env\`, \`wallet\`, \`hotkey\`, \`solana-network\`, \`solana-keypair\`, … |
| \`alw status\` | Quick dashboard |
| \`alw view miners\` | Every miner (incl. offline / cooldown) |
| \`alw view rates [--pair sol-btc]\` | Swappable miners only |
| \`alw view active-swaps\` | All in-flight swaps |
| \`alw view swap <key> [--watch]\` | Single swap + timeline |
| \`alw view reservation\` | Your active reservation |
| \`alw view config\` | Live contract parameters |
| \`alw view validators\` | Whitelisted validator set |
| \`alw swap now [...flags]\` | Run a swap |
| \`alw swap quote --from <c> --to <c> --amount <n>\` | Preview rate + receive amount |
| \`alw swap post-tx <tx-hash>\` | Relay your source tx to validators |
| \`alw swap resume-reservation [...]\` | Resume an interrupted flow |
| \`alw claim <swap-key> [-y]\` | Claim a SOL slash from a TimedOut swap |

Miner-only commands (\`alw miner …\`, \`alw collateral …\`) and admin commands are documented at https://docs.all-ways.io/cli.

## Public API

Base URL: \`https://api.all-ways.io\` (testnet: \`https://test-api.all-ways.io\`). Live OpenAPI/Swagger at \`/swagger\`. **Be a good citizen** — cache aggressively, use SSE for live state, don't hammer it. The exact response shapes are in Swagger; treat that as authoritative (this doc's field names may lag).

| Method | Path | Purpose |
|---|---|---|
| GET | \`/health\` | Liveness |
| GET | \`/stats\` | Dashboard counters |
| GET | \`/miners\` | All miners with rates + status |
| GET | \`/miners/{hotkey}\` | Single miner |
| GET | \`/swaps?search=&limit=&offset=\` | All swaps |
| GET | \`/swaps/active?userAddress=&minerHotkey=\` | In-progress swaps |
| GET | \`/swaps/{swapId}\` | Single swap + timeline |
| GET | \`/events?…\` | Filtered contract events |
| GET | \`/reservations/by-source/{address}\` | Reservations from a source address |
| GET | \`/reservations/{requestHash}\` | Reservation by hash |
| GET | \`/sse\` | Server-Sent Events (channels: \`connected\`, \`event\`, \`miner\`, \`swap\`) |
| GET | \`/llms.txt\` | This document |

> Amounts are decimal strings in smallest units (lamports for SOL, satoshi for BTC, rao for TAO). Parse with arbitrary-precision libraries — never floats. Rate semantics and exact field names: check Swagger.

## Known issues & how to handle them

- **Dependency resolver conflicts** — \`bittensor\` is hard-pinned. Install into a fresh env; \`pipx install git+…\` is safest. Never install into a system Python.
- **\`No module named 'bittensor'\`** — you're outside the venv. With \`pipx\`, call \`alw\` directly; with \`pip install -e .\`, \`source .venv/bin/activate\` first.
- **\`Attempt to debit an account but found no record of a prior credit\`** — your Solana key is unfunded (or you're pointed at the wrong key). Fund it, and confirm \`solana-keygen pubkey\` matches.
- **Empty \`alw view miners\`** while the dashboard shows miners — you're on the wrong network/cluster. Re-check \`alw config\` (\`env\`, \`solana-network\`, \`netuid\`).
- **\`BTC_MODE=lightweight requires BTC_PRIVATE_KEY\`** — set the WIF for auto-send, or accept the manual flow (\`alw swap post-tx <hash>\` after sending).
- **Reservation expired before send** — you only forfeit the small reservation fee. Start a new swap. Live TTL via \`alw view config\`.
- **BTC tx stuck unconfirmed → reservation timed out → BTC sent but no swap** — fee too low; the tx never confirmed inside the extension budget. Prevention: let the CLI auto-estimate \`--btc-fee-rate\`, or check next-block tiers. If stuck pre-confirmation, RBF up immediately — recovery is only possible while the tx is in mempool.
- **Miner timed out — where's my refund?** — slashed collateral pays your pinned identity in SOL automatically; if the transfer fails, \`alw claim <swap-key>\` releases it.

## Testnet

Testnet (Bittensor netuid 19 + Solana devnet) mirrors mainnet with free funds — rehearse a flow here before spending real assets. Configure:

    alw config set env testnet
    alw config set wallet <coldkey-name>
    alw config set hotkey <hotkey-name>

For BTC-side testnet swaps, use a testnet \`.env\` (\`BTC_NETWORK=testnet4\`). Source addresses are \`tb1q…\`. Inspect state via \`https://test-api.all-ways.io\` and \`https://test.all-ways.io\`.

Faucets: **SOL** — \`solana airdrop 2 <pubkey> --url https://api.devnet.solana.com\`. **TAO** — https://taoswap.org/testnet-faucet. **BTC (testnet4)** — https://mempool.space/testnet4/faucet or https://faucet.testnet4.dev. Testnet3 faucets won't fund testnet4 addresses. If a faucet won't cooperate, ask the operator to seed your wallets — normal on testnet.

Parameters drift — always check \`alw view config\`, and \`alw view miners\` / \`alw view validators\`, before assuming the system is live.

## Disclaimer

Allways is permissionless, open-source, beta software. The protocol facilitates trustless peer-to-peer transactions — the creators and contributors do not custody, control, or intermediate any funds. Use at your own risk. No warranty. Not financial advice.

## Sources of truth

- Repo: https://github.com/entrius/allways
- Docs: https://docs.all-ways.io
- Testnet UI + API: https://test.all-ways.io · https://test-api.all-ways.io/swagger
- Mainnet UI + API: https://all-ways.io · https://api.all-ways.io/swagger
`;
