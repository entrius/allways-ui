// IMPORTANT: when this constant changes, update public/llms.txt to match.
// They are intentionally hand-mirrored so /llms.txt is statically servable.

export const AGENT_MARKDOWN = `# Allways — Agent Quickstart

> Read this once, store under key \`allways-agent-quickstart\`. Don't
> re-ingest. Query live state via the CLI or HTTP API for everything
> dynamic — rates, miners, swap status — since they change every block.

## TL;DR

Allways is Bittensor Subnet 7 — a permissionless on-chain orderbook for
trustless native swaps between independent assets. **BTC ↔ TAO is live
today; more pairs are coming online.** Miners post collateral and quote
exchange rates. Validators verify both legs of each swap. The smart
contract slashes collateral on failure and refunds the user. No custodian,
no wrapped asset, no bridge token.

## Resources (skim these first)

| What | Where |
|---|---|
| Live dashboard (mainnet) | https://all-ways.io |
| Live dashboard (testnet) | https://test.all-ways.io |
| Public API + Swagger | https://api.all-ways.io/swagger |
| Testnet API | https://test-api.all-ways.io |
| Docs site | https://docs.all-ways.io |
| Source repo | https://github.com/entrius/allways |
| This document, raw | https://all-ways.io/llms.txt |

## Why agents use it

- **Trustless.** Collateral guarantees delivery; the contract slashes on failure.
- **Best rate.** Dynamic pricing — quotes update every block.
- **Subnet-native.** Settles in real BTC and real TAO. No IOUs.
- **Open + agentic.** Public API, SSE feeds, open-source CLI, scriptable end-to-end.

> **Code is law.** This doc is a quickstart, not a spec. Before high-value swaps, fresh-clone https://github.com/entrius/allways at the version you installed and audit \`allways/constants.py\` (fee divisor, reservation TTL, swap bounds) and \`smart-contracts/ink/lib.rs\` (on-chain enforcement — slash, fee accrual, payouts). The contract is the only authority that matters; everything below is convenience.

## Concepts you actually need

- **Actors.** User picks a miner. Miner posts collateral + rate, fulfills. Validators verify both legs and vote. Contract enforces slash / timeout / payout.
- **Statuses.** \`ACTIVE → FULFILLED → COMPLETED\` (happy) or \`ACTIVE → TIMED_OUT\` (slash to user).
- **Fee — 1%, paid via the rate.** The fee is *implicit in the price you accept*. If a miner quotes \`1 BTC = 300 TAO\` and you send 1 BTC, you receive **297 TAO** — the 3-TAO fee is the protocol's cut. The fee never leaves your wallet as a separate charge; it's harvested from the miner's collateral on settlement. Always preview with \`alw swap quote\` (or the rate display in \`alw swap now\`) — the post-fee receive amount is shown.
- **Block time.** ~12s on Bittensor; 30 blocks ≈ 6 min.
- **Reservation TTL.** Once a miner is reserved, you have ~6 min (30 blocks, \`RESERVATION_TTL_BLOCKS\`) to broadcast your source tx. Miss the window and the reservation expires, the miner unlocks, and nothing is lost — just start over.
- **Slash payouts are always TAO.** Even on BTC-side swaps you need a Bittensor wallet — that's where any timeout refund lands.
- **Sender verification.** Validators reject any source tx whose on-chain sender does not match the address you proved at reserve time. Don't try to send from a different wallet than the one you registered.

> **Bittensor primer.** Allways runs on Bittensor (an L1 subnet network). You don't need to learn it — the CLI handles all chain interaction. Background reading only: https://docs.bittensor.com.

## End-to-end swap flow

This is what actually happens between "I want to swap" and "funds in my wallet":

1. **Quote.** You call \`alw swap quote\` (or read \`GET /miners\`). Miners advertise live rates on-chain via subnet commitments — no off-chain orderbook.
2. **Reserve.** You sign a proof of ownership of your source address and broadcast a \`SwapReserveSynapse\` to validators. Quorum of validators vote on-chain to lock the chosen miner to you for ~6 min. \`alw swap now\` does this for you.
3. **Send source funds.** You broadcast a tx on the source chain (TAO via your hotkey, BTC via WIF or your own wallet) sending the agreed amount **from the address you proved at reserve time** to the miner's address. Must happen inside the reservation window.
4. **Confirm.** You sign a proof binding your source tx to the reservation and broadcast a \`SwapConfirmSynapse\` to validators. They:
   - Verify the source tx exists on the source chain, has enough confirmations, came from your reserved address, and matches the agreed amount.
   - Vote on-chain to **initiate** the swap. The contract creates an \`ACTIVE\` swap and locks miner collateral. Status: \`ACTIVE\`.
5. **Miner detects + fulfills.** The miner watches the contract for new \`ACTIVE\` swaps targeted at them, sends the destination asset to your receive address, posts the destination tx hash, and marks itself \`FULFILLED\`. Status: \`ACTIVE → FULFILLED\`.
6. **Validators confirm fulfillment.** Validators verify the destination tx (on-chain, correct amount, correct recipient, enough confirmations) and vote to complete. Contract releases miner collateral, books the 1% fee. Status: \`FULFILLED → COMPLETED\`. Done.
7. **Timeout / refund.** If the miner doesn't fulfill within the swap timeout, validators vote \`TIMED_OUT\`. The contract slashes the miner's collateral and pays you out in TAO directly. If that on-chain transfer fails, the slash is held pending — \`alw claim <swap-id>\` claims it.

Throughout, you can poll \`GET /swaps/{id}\` or watch \`alw view swap <id> --watch\` for the live timeline.

## Setup (shell-first)

> A pure-HTTP flow (run swaps via API only, no local CLI) is on the roadmap. For now, agents need shell access and a Python ≥ 3.10 environment.

### 1. Install

The Allways package pins and pulls in \`bittensor\` (10.3.0) and \`bittensor-cli\` (9.21.0) automatically — you do **not** need to install them separately. \`btcli\` lands on PATH after this step.

Recommended — \`pipx\` keeps \`alw\` in its own isolated venv on PATH and avoids resolver conflicts with whatever else is installed:

    pipx install git+https://github.com/entrius/allways.git

Alternative (cloning the repo, e.g. for development):

    git clone https://github.com/entrius/allways.git
    cd allways && python -m venv .venv && source .venv/bin/activate
    pip install -e .

Verify:

    alw --help
    btcli --help

### 2. Bittensor wallet

Standard Bittensor wallet conventions. Create one if you don't have one:

    btcli wallet new_coldkey --wallet.name <coldkey-name>
    btcli wallet new_hotkey  --wallet.name <coldkey-name> --wallet.hotkey <hotkey-name>

Wallets land in \`~/.bittensor/wallets/\`. **Fund the hotkey with TAO** — it signs swap and collateral calls and pays extrinsic fees. Keep a small buffer (~0.02 TAO is enough — the in-code constant is \`MIN_BALANCE_FOR_TX_RAO = 20_000_000\`) above your intended swap amount.

### 2b. (BTC-side only) Bitcoin wallet via Electrum

If you don't already have a BTC wallet you can sign with, [Electrum](https://electrum.org) is the lightest CLI option. SegWit (\`bc1q…\`) addresses are supported end-to-end; Taproot (\`bc1p…\`) is **not** supported for the bring-your-own-signature flow.

Mainnet:

    electrum --offline create                # SegWit by default — SAVE the 12-word seed
    electrum daemon -d
    electrum load_wallet
    electrum getunusedaddress                # bc1q...   (use as --from-address)
    electrum getprivatekeys bc1q...          # strip the leading "p2wpkh:" — what's left is the WIF for BTC_PRIVATE_KEY

Testnet (only if you're dry-running — see Testnet section below):

    electrum --testnet --offline restore "<your 12 words>"
    electrum --testnet daemon -d
    electrum --testnet load_wallet
    electrum --testnet getunusedaddress      # tb1q...
    electrum --testnet getprivatekeys tb1q...  # strip "p2wpkh:"

The WIF (without \`p2wpkh:\`) is what you put in \`BTC_PRIVATE_KEY\`; the \`bc1q…\`/\`tb1q…\` address is what you pass to \`alw swap now --from-address\`.

### 3. Configure the CLI

    alw config set wallet  <coldkey-name>
    alw config set hotkey  <hotkey-name>
    alw config set network finney
    alw config set netuid  7

The mainnet contract address is **bundled in code** (\`5FTkUEhRmLPsALn4b7bJpVFhDQqohGbc6khnmA2aiYFLMZYP\`) — you do not need to set \`contract-address\` for production. Only override for testnet (see the Testnet section).

Config persists at \`~/.allways/config.json\`.

### 4. (BTC-side only) BTC sending

For BTC→TAO swaps, the CLI can broadcast BTC for you if you put a WIF private key in a \`.env\` next to where you invoke \`alw\`:

    BTC_MODE=lightweight
    BTC_NETWORK=mainnet
    BTC_PRIVATE_KEY=<your_WIF_key>

\`lightweight\` mode talks to the Blockstream API — no Bitcoin node required.

If \`BTC_PRIVATE_KEY\` is unset, BTC→TAO falls back to a manual flow: the CLI prints the miner's address + exact amount, you broadcast from your own wallet, **then run \`alw swap post-tx <tx-hash>\` *within the ~6 min reservation window***. Miss the window and the reservation expires before you can confirm.

TAO→BTC swaps need no \`.env\` — TAO is signed by your hotkey.

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

### Non-interactive (recommended for agents)

Drive the entire flow with flags — no prompts. \`--auto\` picks the best-rate eligible miner; \`--yes\` skips every confirmation.

    alw swap now \\
      --from btc --to tao \\
      --amount 0.001 \\
      --receive-address 5C...           \\  # your TAO (dest) address
      --from-address bc1q...            \\  # your BTC (source) address — must match the wallet that broadcasts
      --auto --yes

If you've already broadcast the source tx yourself (e.g. you skipped \`BTC_PRIVATE_KEY\`), pass \`--from-tx-hash\` so the CLI doesn't try to send for you:

    alw swap now --from btc --to tao --amount 0.001 \\
      --receive-address 5C... --from-address bc1q... \\
      --from-tx-hash <hash> --auto --yes

Available flags on \`alw swap now\`:

| Flag | Purpose |
|---|---|
| \`--from <chain>\` | Source chain (\`btc\`, \`tao\`) |
| \`--to <chain>\` | Destination chain |
| \`--amount <n>\` | Source amount in chain units (e.g. 0.001 BTC) |
| \`--receive-address <addr>\` | Destination address — where the miner sends to you |
| \`--from-address <addr>\` | Source address — where you send from (must match the wallet you'll broadcast with) |
| \`--from-tx-hash <hash>\` | Reuse an existing source tx (skip the send step) |
| \`--auto\` | Auto-pick the best-rate eligible miner — no menu |
| \`--yes\` | Skip every confirmation prompt |
| \`--btc-fee-rate <sat/vB>\` | Override BTC fee rate (default: auto-estimated) |

After it returns a swap ID:

    alw view swap <id> --watch    # live timeline until COMPLETED or TIMED_OUT
    alw claim <id>                # if TIMED_OUT, claim the slashed collateral (paid in TAO)

If something interrupts the flow before swap initiation:

    alw view reservation                                       # check on-chain reservation state
    alw swap resume-reservation                                # resume pre-initiate (interactive)
    alw swap resume-reservation --from-tx-hash <hash> --yes    # non-interactive resume

### Interactive

\`alw swap now\` with no flags walks through direction, miner pick, amount, address, reserve, send, watch.

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
| \`alw swap now [...flags]\` | Run a swap — interactive by default, fully scriptable with flags |
| \`alw swap quote --from <c> --to <c> --amount <n>\` | Preview rate + receive amount |
| \`alw swap post-tx <tx-hash>\` | Submit your source tx hash for a pending reservation |
| \`alw swap resume-reservation [--from-tx-hash <h>] [--yes]\` | Resume an interrupted pre-initiate flow |
| \`alw claim <swap-id> [-y]\` | Claim slash payout (TAO) from a TIMED_OUT swap |

Miner-only commands (\`alw miner post|status|activate|deactivate|mark-fulfilled\`, \`alw collateral deposit|withdraw|view\`) are documented at https://docs.all-ways.io/cli.

## Public API

Base URL: \`https://api.all-ways.io\`. Live OpenAPI / Swagger:
\`https://api.all-ways.io/swagger\`. **Be a good citizen** — the public API
serves the dashboard and other agents; cache aggressively, use SSE for
live state instead of polling, and don't hammer it.

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
- **\`BTC_MODE=lightweight requires BTC_PRIVATE_KEY\`** — you set lightweight mode but didn't set a WIF. Either add \`BTC_PRIVATE_KEY=<wif>\` to the \`.env\` for auto-send, or accept the manual-broadcast flow (CLI will prompt and you'll run \`alw swap post-tx <hash>\` after sending).
- **\`BTC_PRIVATE_KEY is not a valid WIF (prefix '...')\`** — your WIF doesn't start with \`5/K/L\` (mainnet) or \`9/c\` (test/regtest). You probably pasted an extended key (xprv…), a hex private key, or a public address by mistake. Re-export the WIF from your wallet (e.g. \`bitcoin-cli dumpprivkey <addr>\`).
- **\`Blockstream API unreachable\` / \`Blockstream API error\`** — outbound HTTPS to \`blockstream.info\` is broken from this host. Check egress, retry on transient errors, or switch to \`BTC_MODE=node\` + run a local Bitcoin Core node.
- **Empty \`SWAP_ID\` from \`alw swap now\`** — almost always a missing \`BTC_PRIVATE_KEY\` or unreachable BTC RPC. Check \`~/.allways/logs/\`; re-run with \`--verbose\` for full output.
- **\`Wallet not found\`** — \`wallet\` / \`hotkey\` in \`alw config\` don't match anything in \`~/.bittensor/wallets/\`. Verify with \`btcli wallet list\`.
- **\`InsufficientBalance\` on a swap** — whichever key signs the failing extrinsic needs ≥ 0.02 TAO of headroom (\`MIN_BALANCE_FOR_TX_RAO\`). For TAO→BTC, the **coldkey** signs the source TAO transfer — top up the coldkey above the swap amount. For \`alw claim\` and miner collateral ops, the **hotkey** signs — top up the hotkey.
- **Reservation expired before send** — miner is auto-unlocked. Start a new swap; nothing is lost. Reservation TTL is ~6 min (30 blocks).
- **Miner timed out — where's my refund?** — slashed collateral is paid in TAO to your hotkey automatically. If that fails, run \`alw claim <swap-id>\`.

## Testnet (dry-run only)

> **Default to mainnet.** Users who ask for "a swap" want a real one — testnet settles in fake assets and is for verifying setup, not delivering value. Only target testnet when the user has *explicitly* asked you to dry-run, smoke-test the system, or work without real funds at risk.

When you do need testnet, override config and point any BTC env vars at testnet too:

    alw config set network test
    alw config set netuid  19
    alw config set contract-address 5HTL2snUCca5tjhp6vxNHuo8FZyCSE3wnmyQTNFEKSo6h6kA

For BTC, set \`BTC_NETWORK=testnet\` (lightweight uses Blockstream's testnet endpoint automatically) and use a testnet WIF. Inspect state with the testnet API at \`https://test-api.all-ways.io\` and the dashboard at \`https://test.all-ways.io\`.

Faucets:

- Test-TAO: see https://docs.bittensor.com — request via the test subtensor; the path varies by \`btcli\` version, so prefer the docs over a hard-coded command.
- Test-BTC: any public testnet3 faucet works (e.g. \`https://coinfaucet.eu/en/btc-testnet/\`, \`https://bitcoinfaucet.uo1.net/\`). Send to the \`tb1q…\` address from your testnet Electrum wallet.

Testnet parameters drift — always check \`alw view contract\` for current bounds before assuming.

## Disclaimer

Allways is permissionless, open-source, beta software. The protocol
facilitates trustless peer-to-peer transactions — the creators and
contributors do not custody, control, or intermediate any funds. Use at
your own risk. No warranty. Not financial advice.

## Sources of truth

- Repo: https://github.com/entrius/allways
- Docs: https://docs.all-ways.io
- API + Swagger: https://api.all-ways.io/swagger
- Mainnet UI: https://all-ways.io
- Testnet UI: https://test.all-ways.io
`;
