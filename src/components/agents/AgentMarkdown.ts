// IMPORTANT: when this constant changes, update public/llms.txt to match.
// They are intentionally hand-mirrored so /llms.txt is statically servable.

export const AGENT_MARKDOWN = `# Allways — Agent Quickstart

> Read this once, store under key \`allways-agent-quickstart\`. Don't
> re-ingest. Query live state via the CLI or HTTP API for everything
> dynamic — rates, miners, swap status — since they change every block.

## TL;DR

Allways is Bittensor Subnet 7 — a permissionless on-chain orderbook for
trustless native swaps between independent assets (currently BTC ↔ TAO).
Miners post collateral and exchange rates. Validators verify both legs
of each swap. The smart contract slashes collateral on failure and
refunds the user. No custodian, no wrapped asset, no bridge token.

## Why agents use it

- **Trustless.** Collateral guarantees delivery; the contract slashes on failure.
- **Best rate.** Dynamic pricing — quotes update every block.
- **Subnet-native.** Settles in real BTC and real TAO. No IOUs.
- **Open + agentic.** Public API, SSE feeds, open-source CLI.

## Concepts you actually need

- **Actors.** User picks a miner. Miner posts collateral + rate, fulfills. Validators verify both legs and vote. Contract enforces slash / timeout / payout.
- **Statuses.** \`ACTIVE → FULFILLED → COMPLETED\` (happy) or \`ACTIVE → TIMED_OUT\` (slash to user).
- **Fee.** 1% of the TAO leg, deducted from miner collateral. Hardcoded.
- **Block time.** ~12s on Bittensor; 30 blocks ≈ 6 min.
- **Slash payouts are always TAO.** Even on BTC-side swaps you need a Bittensor wallet — that's where any refund lands.
- **Sender verification.** Validators reject any source tx whose on-chain sender does not match the address you proved at reserve time. Don't try to send from a different wallet than the one you registered.

> **Bittensor primer.** Allways runs on Bittensor (an L1 subnet network). You don't need to learn it — the CLI handles chain interaction. Background reading only: https://docs.bittensor.com.

## Setup (shell-first)

> A pure-HTTP flow (run swaps via API only, no local CLI) is on the roadmap. For now, agents need shell access and a Python ≥ 3.10 environment.

### 1. Install

Recommended — \`pipx\` keeps \`alw\` in its own isolated venv on PATH and avoids resolver conflicts with whatever else is installed:

    pipx install git+https://github.com/entrius/allways.git

Alternative (cloning the repo, e.g. for development):

    git clone https://github.com/entrius/allways.git
    cd allways && python -m venv .venv && source .venv/bin/activate
    pip install -e .

Verify:

    alw --help

### 2. Bittensor wallet

Standard Bittensor wallet conventions. Create one if you don't have one:

    btcli wallet new_coldkey --wallet.name <coldkey-name>
    btcli wallet new_hotkey  --wallet.name <coldkey-name> --wallet.hotkey <hotkey-name>

Wallets land in \`~/.bittensor/wallets/\`. **Fund the hotkey with TAO** — it signs swap and collateral calls and pays extrinsic fees. Keep at least ~0.25 TAO above your intended swap amount as a fee buffer.

### 3. Configure the CLI

    alw config set wallet  <coldkey-name>
    alw config set hotkey  <hotkey-name>
    alw config set network finney
    alw config set netuid  7

The mainnet contract address is bundled — you do **not** need to set \`contract-address\` for production. Override only for testnet or local dev:

    alw config set contract-address 5FTkUEhRmLPsALn4b7bJpVFhDQqohGbc6khnmA2aiYFLMZYP

Config persists at \`~/.allways/config.json\`.

### 4. (BTC-side only) BTC sending

For BTC→TAO swaps, the CLI can broadcast BTC for you if you put a WIF private key in a \`.env\` next to where you invoke \`alw\`:

    BTC_MODE=lightweight
    BTC_NETWORK=mainnet
    BTC_PRIVATE_KEY=<your_WIF_key>

\`lightweight\` mode talks to the Blockstream API — no Bitcoin node required. If \`BTC_PRIVATE_KEY\` is unset, BTC→TAO falls back to a manual flow: the CLI prints the miner's address + exact amount, you broadcast from your own wallet, then run \`alw swap post-tx <tx-hash>\`. TAO→BTC swaps need no \`.env\` — TAO is signed by your hotkey.

## Verify the install (read-only, no funds spent)

Run in order. Each step confirms the previous one.

    alw --help                                            # 1. Binary works; disclaimer prints.
    alw config                                            # 2. Saved config is correct.
    alw status                                            # 3. Connects to chain; balances appear.
    alw view miners                                       # 4. Rows of miner UIDs + rates.
    alw view rates --pair btc-tao                         # 5. Live orderbook for BTC↔TAO.
    alw swap quote --from btc --to tao --amount 0.001     # 6. Preview a quote (no commitment).

If any step fails, jump to **Known issues** below.

## Run a swap

Interactive (recommended):

    alw swap now

The CLI walks through direction, miner pick, amount, address, reserve, send, watch. TAO is sent automatically; BTC is sent automatically when \`BTC_PRIVATE_KEY\` is set, otherwise manual + \`alw swap post-tx\`.

After it returns a swap ID:

    alw view swap <id> --watch    # live timeline until COMPLETED or TIMED_OUT
    alw claim <id>                # if TIMED_OUT, claim the slashed collateral (paid in TAO)

If something interrupts the flow before swap initiation:

    alw view reservation          # check on-chain reservation state
    alw swap resume-reservation   # resume pre-initiate

## CLI cheat sheet (real commands only)

| Command | Purpose |
|---|---|
| \`alw config [set <key> <value>]\` | View / set \`wallet\`, \`hotkey\`, \`network\`, \`netuid\`, \`contract-address\` |
| \`alw status\` | Quick dashboard: network, wallet, active swaps |
| \`alw view miners\` | Operator view — every miner on-subnet (incl. offline / cooldown) |
| \`alw view rates [--pair btc-tao]\` | User-shopping view — only swappable miners |
| \`alw view active-swaps\` | All in-flight swaps on the contract |
| \`alw view swap <id> [--watch]\` | Single swap + timeline; \`--watch\` polls to terminal |
| \`alw view reservation\` | Your active pre-initiate reservation, if any |
| \`alw view contract\` | Contract parameters (fee, timeouts, bounds) |
| \`alw view validators\` | Whitelisted validator allowlist |
| \`alw swap now\` | Guided interactive swap |
| \`alw swap quote --from <c> --to <c> --amount <n>\` | Preview rate + receive amount |
| \`alw swap post-tx <tx-hash>\` | Submit your source tx hash for a pending reservation |
| \`alw swap resume-reservation\` | Resume an interrupted pre-initiate flow |
| \`alw claim <swap-id>\` | Claim slash payout (TAO) from a TIMED_OUT swap |

Miner-only commands (\`alw miner post|status|activate|deactivate|mark-fulfilled\`, \`alw collateral deposit|withdraw|view\`) are documented at https://docs.all-ways.io/cli.

## Public API

Base URL: \`https://api.all-ways.io\`. Live OpenAPI / Swagger:
\`https://api.all-ways.io/swagger\`. Currently un-rate-limited — be a good citizen.

| Method | Path | Purpose |
|---|---|---|
| GET | \`/health\` | Liveness probe |
| GET | \`/stats\` | Aggregated dashboard counters: \`totalSwaps\`, \`totalVolumeTao\`, \`activeMiners\`, \`activeSwaps\` |
| GET | \`/miners\` | All current miners with rates + runtime status |
| GET | \`/miners/{hotkey}\` | Single miner |
| GET | \`/swaps?search=&limit=&offset=\` | All swaps (search by id / user address / miner hotkey) |
| GET | \`/swaps/active?userAddress=&minerHotkey=\` | In-progress swaps |
| GET | \`/swaps/{swapId}\` | Single swap + event timeline |
| GET | \`/events?eventType=&swapId=&minerHotkey=&userAddress=&blockFrom=&blockTo=&limit=&offset=\` | Filtered contract events |
| GET | \`/events/latest?limit=&eventType=&minerHotkey=&userAddress=\` | Most recent events |
| GET | \`/events/swap/{swapId}\` | Event timeline for a swap |
| GET | \`/events/miner/{hotkey}\` | Event history for a miner |
| GET | \`/reservations/by-source/{address}\` | Reservations from a source address (newest first) |
| GET | \`/reservations/{requestHash}\` | Reservation by request hash |
| GET | \`/protocol/constants\` | Immutable contract constants (extension caps, challenge window) |
| GET | \`/sse\` | Server-Sent Events. Channels: \`connected\`, \`event\`, \`miner\`, \`swap\` |
| GET | \`/llms.txt\` | This document, statically served |

### Watch a swap via SSE

    const es = new EventSource('https://api.all-ways.io/sse');
    es.addEventListener('swap', (e) => {
      const swap = JSON.parse(e.data);
      if (swap.swap_id === MY_SWAP_ID) updateState(swap);
    });

### Selected response shapes

    type Miner = {
      uid: number; hotkey: string;
      sourceChain: string | null; destChain: string | null;
      rate: string | null; counterRate: string | null;
      collateralRao: string;
      isActive: boolean; isReserved: boolean; hasActiveSwap: boolean;
      updatedAt: string;
    };

    type ActiveSwap = {
      swapId: string;
      status: 'ACTIVE' | 'FULFILLED' | 'COMPLETED' | 'TIMED_OUT';
      userAddress: string; minerHotkey: string;
      sourceChain: string; destChain: string;
      sourceAmount: string; destAmount: string; taoAmount: string;
      rate: string;
    };

> All amounts are decimal strings (rao for TAO, satoshi-style smallest units for BTC). Parse with arbitrary-precision libraries — never floats.

## Known issues & how to handle them

- **Dependency resolver conflicts** — \`bittensor==10.3.0\` is hard-pinned. Always install into a fresh environment. \`pipx install git+…\` is safest. \`python -m venv .venv && pip install …\` also works. Don't install into a system Python.
- **\`No module named 'bittensor'\`** — you're outside the venv \`pip\`/\`pipx\` installed into. With \`pipx\`, just call \`alw\` directly. With \`pip install -e .\`, run \`source .venv/bin/activate\` first.
- **Empty \`SWAP_ID\` from \`alw swap now\`** — almost always a missing \`BTC_PRIVATE_KEY\` or unreachable BTC RPC. Check \`~/.allways/logs/\`; re-run with \`--verbose\` for full output.
- **\`Wallet not found\`** — \`wallet\` / \`hotkey\` in \`alw config\` don't match anything in \`~/.bittensor/wallets/\`. Verify with \`btcli wallet list\`.
- **\`InsufficientBalance\` on a swap** — your hotkey needs ≥ 0.25 TAO for extrinsic fees on top of the swap amount. Top up the hotkey, not the coldkey.
- **Reservation expired before send** — miner is auto-unlocked. Start a new swap; nothing is lost. Reservation TTL is ~5 min.
- **Miner timed out — where's my refund?** — slashed collateral is paid in TAO to your hotkey automatically. If that fails, run \`alw claim <swap-id>\`.

## Testnet & local dev (optional)

For exercising the full swap flow without spending real funds, stand up the local stack at https://github.com/entrius/alw-utils — full subtensor + BTC regtest + contract + neurons + API. Public testnet is \`network=test\`; parameters drift, so the local dev environment is the recommended path.

## Disclaimer

Allways is permissionless, open-source, beta software. The protocol
facilitates trustless peer-to-peer transactions — the creators and
contributors do not custody, control, or intermediate any funds. Use at
your own risk. No warranty. Not financial advice.

## Sources of truth

- Repo: https://github.com/entrius/allways
- Docs: https://docs.all-ways.io
- API + Swagger: https://api.all-ways.io/swagger
- UI: https://all-ways.io
- Status: https://status.all-ways.io
`;
