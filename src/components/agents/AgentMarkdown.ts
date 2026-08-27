// public/llms.txt is GENERATED from this constant (vite emit-llms-txt plugin) —
// never edit it by hand. Asset, hub, and pair lists below derive from the
// chains registry so a new spoke or hub needs no edits here.
//
// This is the copy-paste context bundle on /agents. It is written as a
// checkpointed RUNBOOK for an autonomous agent (install → verify → quote →
// execute → track → loop), not a protocol overview: every step names the
// command and the stdout that proves it worked, and every failure line the
// CLI can print maps to an action. Keep it grounded in the CLI's real output
// (allways/cli/swap_commands/swap.py, post_tx.py, quote.py) when editing.
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
// Wire id, not symbol: four USDC deployments share a symbol, and the id is
// what --from/--to take.
const assetRows = chains
  .map((c) => `| \`${c.id}\` | ${c.name} | ${c.hub ? '**hub**' : ''} |`)
  .join('\n');
// allDirections emits [forward, reverse] per pair.
const pairCount = allDirections().length / 2;

export const AGENT_MARKDOWN = `# Allways — Agent Runbook

> Store this once under key \`allways-agent-runbook\` and do not re-ingest it. It is a
> **runbook, not a spec**: every step names the command to run and the output that proves
> it worked. Anything numeric (fees, bounds, windows, rates, miners) changes on-chain
> without notice — read it live with the commands given, never from memory or from this file.

## 0. What you are dealing with

Allways is Bittensor **Subnet 7**: a permissionless orderbook for native swaps between
independent assets, settled by a Solana program. Nothing is wrapped or bridged: you send the
real source asset to a miner's address, the miner sends the real destination asset to yours,
validators verify both legs on their native chains, and collateral the miner posted makes you
whole if it fails.

- **Hub-and-spoke.** ${hubList} are hubs. A pair is valid only if one leg is a hub:
  ${chains.length} assets → ${pairCount} pairs → ${pairCount * 2} directions. Spoke↔spoke (e.g. BTC→ETH)
  does not exist; it is two swaps through a hub.
- **One program, two networks.** Mainnet = netuid 7 + Solana mainnet-beta + every asset's
  mainnet. Testnet = netuid 19 + Solana devnet + every asset's testnet. Same program id
  \`6JVBEj5w27J2SVjERmv2c7wXgFee9nSSBKUJevHehyBD\` on both. Testnet is free; rehearse there.
- **You need a shell.** The taker path is the \`alw\` CLI (Python ≥ 3.10). The HTTP API is
  read-only — you cannot swap over HTTP.

### The cost of one swap (know this before you plan an arbitrage)

| Cost | Paid by you | Amount (mainnet, 2026-08 — verify with \`alw view config\`) |
|---|---|---|
| Reservation fee | every bid, **win or lose, non-refundable**, in SOL from your Solana keypair | \`reservation_fee_sol\` — 0.02 SOL |
| Protocol fee | inside the quote — you receive 99% of \`amount × rate\` | 1% |
| Source-chain gas | your source wallet | native (SOL ≈ nothing; BTC/ETH real) |
| Solana tx fees | your Solana keypair, for bid + finalize + relay | ~0.0001 SOL |

\`alw swap quote\` already nets the 1%. It does **not** include the 0.02 SOL reservation fee or
gas. A 0.1 SOL swap pays a 0.02 SOL fee — 20% of notional. **Size up** (toward \`max_swap\`)
to amortise the fee, and never bid on an edge smaller than fee + gas + 1%.

## 1. Rules that lose money when broken

1. **Run \`alw swap now\` with \`--send --yes\` from a script.** Without a TTY, \`--send\` is OFF by
   default: the CLI reserves, prints "send X to Y", and exits — the reservation then burns
   its TTL while nothing happens. \`--send\` keeps reserve → send → relay → watch in one process.
2. **Never send funds to a miner outside a live reservation.** Direct transfers match nothing
   and are not refundable. Only \`alw swap now\` (or \`alw swap post-tx\` after it) ties a deposit
   to a swap.
3. **Send from the pinned address, the exact pinned amount.** Validators reject any deposit
   whose sender ≠ the address pinned at reservation. Never an exchange withdrawal.
4. **Relay immediately; never sleep for confirmations.** After broadcasting, \`alw swap post-tx
   <hash>\` at once. Validators accept an unconfirmed deposit and wait server-side.
5. **A lost draw is not an error** — it costs the reservation fee and nothing else. Re-run.
   Do NOT send funds after "You lost the draw".
6. **\`alw view rates\` lists offline miners too** (\`status: "offline"\`). Only \`alw swap quote\`
   returns offers you can actually fill. Quote from \`swap quote\`, not \`view rates\`.
7. **Rates are hub-numeraire, not reciprocal.** In \`GET /miners\`, \`rate\` and \`counterRate\`
   are BOTH "spoke per 1 hub". Round-tripping the same miner is a guaranteed loss (§4).
8. **One live reservation per (miner, source chain, source address).** Back-to-back swaps
   through the same miner from the same address are rejected until the previous
   reservation's window (plus any extension) runs out. Rotate miners or wait.
9. **\`Cancelled\` refunds nothing.** It means *your* receive address could not accept the
   asset (frozen/blacklisted/paused token, reverting contract, reserved Solana account).
   Validate the receive address before you bid.
10. **Fund the Solana keypair the CLI actually signs with.** If none exists the CLI generates
    an empty \`~/.solana/id.json\` and every bid fails with \`Attempt to debit an account but
    found no record of a prior credit\`. \`alw status\` prints the signer (\`caller\`) — fund that.

## 2. Install → configure → verify (checkpointed)

Every step has a check. Do not proceed past a failed check.

### 2.1 Install

\`\`\`bash
git clone https://github.com/entrius/allways.git && cd allways
python3 -m venv .venv && . .venv/bin/activate
pip install -e .
alw --help                     # CHECK: prints command groups (config, status, view, swap, …)
\`\`\`

\`bittensor\` is hard-pinned, so install into a fresh venv — never system Python. \`btcli\` and
the Solana Python deps come with it. Every later command assumes the venv is active
(\`. /path/to/allways/.venv/bin/activate\`) — a \`No module named 'bittensor'\` means it is not.

### 2.2 Solana keypair (always required, even for TAO→BTC)

Every bid, finalize and relay is a Solana transaction signed by this key. It also receives
SOL you buy and is the pinned sender for SOL you sell.

\`\`\`bash
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"     # solana-keygen + solana
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
solana-keygen new -o ~/.solana/id.json --no-bip39-passphrase       # SAVE the seed phrase
solana-keygen pubkey ~/.solana/id.json                             # CHECK: prints the address to fund
\`\`\`

Fund it: mainnet — real SOL (≥ 0.05 SOL for fees, plus the swap amount if SOL is your
source). Testnet — \`solana airdrop 2 <pubkey> --url https://api.devnet.solana.com\`.

### 2.3 Bittensor wallet (required by the CLI; used for TAO legs)

\`\`\`bash
btcli wallet new-coldkey --wallet.name agent --n-words 12      # add --no-use-password for a scripted, unencrypted coldkey
btcli wallet new-hotkey  --wallet.name agent --wallet.hotkey default
btcli wallet list                       # CHECK: shows wallet "agent" with coldkey ss58 + hotkey
\`\`\`

The **coldkey** signs TAO you send and receives TAO you buy. Non-interactive TAO sends need
its password in \`MINER_BITTENSOR_COLDKEY_PASSWORD\` (that env name is correct for takers too),
or a coldkey created with \`--no-use-password\`.

### 2.4 Configure

\`\`\`bash
alw config set env mainnet             # or: testnet   (sets netuid, Solana cluster, EVERY chain's network, router)
alw config set wallet agent
alw config set hotkey default
alw config set solana-keypair ~/.solana/id.json     # CHECK: echoes "→ signs as <pubkey>"
alw config                             # CHECK: env-derived keys show source "config", netuid 7 (or 19)
\`\`\`

Optional but recommended on mainnet: a keyed Solana RPC — \`alw config set solana-rpc <url>\` or
\`SOLANA_RPC_URL=<url>\`. Public RPC rate-limits under a polling bot.

\`env mainnet\` sets \`router\` to empty: mainnet bids are **self-represented** (you bid, crank
the draw and finalize yourself). \`env testnet\` sets the Ventura Labs router, so testnet bids
are **routed** (a validator enters the pool with its stake weight and finalizes for you).
Behaviour of \`alw swap now\` is identical from your side either way.

### 2.5 Source-asset credentials (only for the asset you SELL, only for \`--send\`)

| Source | What \`--send\` needs | Notes |
|---|---|---|
| SOL / any Solana-hosted token | the keypair from 2.2 | the pinned sender IS this keypair; \`--from-address\` is ignored |
| TAO | coldkey from 2.3 + \`MINER_BITTENSOR_COLDKEY_PASSWORD\` | \`--from-address\` must equal the coldkey ss58 |
| BTC | \`BTC_PRIVATE_KEY\` (WIF) | over public Esplora, no node; \`--from-address\` = the WIF's address |
| any EVM asset | \`{NETWORK}_PRIVATE_KEY\` keyed by network, not asset | \`ETH_PRIVATE_KEY\` covers \`eth\`, \`ethusdc\`, \`uni\`, \`qnt\`, \`paxg\`; \`alw config set --help\` lists networks |

Read from the shell env, a \`.env\` walked up from CWD, or \`~/.allways/.env\`. Without them
\`--send\` prints "Auto-send unavailable … use the manual flow" and falls back to printing the
address + amount — the reservation is live and its TTL is burning, so have them set **before**
the first bid.

### 2.6 Verify (read-only; spends nothing)

\`\`\`bash
alw status --json          # CHECK: program_initialized true, halted false, balance_sol > 0.05
alw view config --json     # CHECK: read min/max swap, reservation_fee_sol, reservation_ttl_secs, pool_window_secs
alw view validators --json # CHECK: ≥ 1 validator
alw swap quote --from sol --to tao --amount 0.5 --json   # CHECK: exit 0 and offers[] non-empty
\`\`\`

\`alw status --json\` echoes your \`solana_rpc\` URL including any API key — don't log it.
\`alw view config\` today (mainnet): SOL-backed swaps 0.1–5 SOL on the hub leg, TAO-backed
0.1–2 τ, reservation TTL 600 s, pool window 10 s, fulfillment timeout 600 s. **Re-read it
each session.**

## 3. Reading the market

### 3.1 Rate semantics

- The pair's **hub is its numeraire**. A quote is always "spoke per 1 hub", posted per
  direction. The forward leg (hub→spoke) multiplies; the reverse leg (spoke→hub) **divides**.
- \`alw swap quote --from A --to B --amount N --json\` does that math for you and returns
  \`offers[].receive\` = what lands in your wallet after the 1% fee, per viable, **active**
  miner, best first. Exit 1 with \`offers: []\` means no miner can fill that size right now.
- Bounds are per **backing** and measured on the **hub leg**, not on your source amount: a
  SOL-backed offer must have 0.1 ≤ hub-leg ≤ 5 SOL; a TAO-backed offer 0.1 ≤ hub-leg ≤ 2 τ.
  Collateral caps a single fill at \`collateral / 1.1\` (hub-leg value).
- \`GET /miners\` (HTTP) gives every quote as \`{sourceChain, destChain, rate, counterRate,
  backing, isActive, collateral, …}\`. \`rate\` = the sourceChain→destChain quote (spoke per hub);
  \`counterRate\` = the **reverse** direction's quote, *also* spoke per hub. Your receive rate
  on the reverse leg is \`1 / counterRate\` hub per spoke. Filter \`isActive == true\`.

### 3.2 Market comparison (the only arbitrage that exists)

\`GET https://api.all-ways.io/prices\` → \`{"prices": {"sol": 104.1, "tao": 253.0, …}}\` (USD,
CoinGecko-derived, \`null\` where no venue; fine for screening, use your own feed to execute).

For a direction \`from → to\`, amount \`a\`, best offer receive \`r\`:

\`\`\`
value_in   = a × usd[from]
value_out  = r × usd[to]                     # r already nets the 1% protocol fee
fee_usd    = reservation_fee_sol × usd["sol"] + source_gas_usd
edge_usd   = value_out − value_in − fee_usd
edge_pct   = value_out / value_in − 1        # vs market, before the fixed fee
\`\`\`

Bid only when \`edge_usd > 0\` by your margin **and** you can sell the received asset at
\`usd[to]\` somewhere else (CEX/DEX). The edge comes from a miner quoting better than market on
one leg. Two more truths:

- **Round-tripping a single miner always loses.** With \`rate\` and \`counterRate\` in the same
  unit, sol→spoke→sol through one miner returns \`0.99² × rate / counterRate\`, and a miner's
  \`counterRate\` sits above its \`rate\` — that gap is its spread. Observed on mainnet: −4% per round trip.
- **A cross-miner loop** only pays if \`0.99² × rate_A / counterRate_B > 1\` **plus** two
  reservation fees and two gas legs — check all four numbers before bidding twice.

A quote far from market (|edge_pct| > 35%) is a stale or defensive miner, not free money:
it will still fill, but re-check with \`alw swap quote\` right before the bid because the
first bid into a pool pins the rate for that round.

## 4. Executing one swap

### 4.1 The command (agents use exactly this shape)

\`\`\`bash
alw swap now --from sol --to tao --amount 0.5 \\
  --receive-address <your-TAO-ss58> \\
  --send --yes
\`\`\`

For a non-SOL source add \`--from-address <the address --send will sign from>\`:

\`\`\`bash
MINER_BITTENSOR_COLDKEY_PASSWORD=… alw swap now --from tao --to sol --amount 0.5 \\
  --from-address <your-coldkey-ss58> --receive-address <your-solana-pubkey> --send --yes
\`\`\`

| Flag | Meaning |
|---|---|
| \`--from\` / \`--to\` | wire ids from the Assets table; one must be a hub |
| \`--amount\` | **source**-asset units (whole units, not lamports/rao) |
| \`--receive-address\` | your address on the \`--to\` chain |
| \`--from-address\` | your address on the \`--from\` chain; required for a non-Solana source; becomes the pinned sender |
| \`--send\` | broadcast the source funds from the configured wallet, relay, and watch to a terminal state |
| \`--yes\` | no prompts (mandatory without a TTY — a missing flag exits non-zero) |
| \`--miner <pubkey>\` | pin a miner from \`swap quote\` instead of best-offer auto-select |
| \`--router <hotkey>\` / \`--no-router\` | override the configured router for this swap |
| \`--btc-fee-rate <sat/vB>\` | BTC source only; default auto-estimates |
| \`--from-tx-hash <hash>\` | you already broadcast; skip the send and relay this hash |

### 4.2 What stdout looks like, phase by phase

\`\`\`
Swap 0.5 SOL -> ~0.19531 TAO  (miner GHhbaeHp…, rate 0.39454 TAO/SOL)
SOL-backed — if the miner fails to deliver, instant SOL refund …
  Bid placed (tx 3kq…). Cranking the draw…            ← 0.02 SOL spent; pool window (10 s mainnet) + crank
  Seat filled — receiving ~0.19531 TAO, SOL-backed.    ← reservation is LIVE; TTL (600 s) starts
  Source: your configured Solana keypair  <pubkey>
  Sent 0.5 SOL — <source-tx-hash>                       ← funds are out
  Relaying deposit to N validator(s)...  V1: ok         ← a validator verified the deposit
  Watching your swap — Ctrl-C is safe to walk away.
  Resume anytime with \`alw view swap <64-hex-swap-key> --watch\`.
    PendingAttestation   validators verifying your deposit
    Active               deposit confirmed — miner is sending your funds
    Fulfilled            miner delivered — validators confirming both legs
  ✓ COMPLETED — settled on-chain, your TAO was delivered.
\`\`\`

Capture the 64-hex **swap key** from the \`Resume anytime\` line (it is
\`keccak256(source-tx-hash)\`); it is the handle for everything after. Mainnet sol↔tao runs
~2–3 min bid→COMPLETED; BTC legs add ~20 min, ETH legs ~7 min (confirmation waits).

Lines that end the run — and what to do:

| Line | Meaning | Action |
|---|---|---|
| \`No miners quoting X->Y right now.\` / \`No miner can take this swap: …\` | nothing fillable at this size | re-quote; change size or direction |
| \`Reservation rejected: … No funds moved; re-run shortly.\` | contract refused the bid (miner busy / already reserved) | wait ~15 s, re-run; or \`--miner\` another |
| \`You lost the draw — the seat went to …\` | fee spent, no seat | **do not send**; re-run (or pick a less contested miner) |
| \`The draw did not resolve in the bid window\` | crank timing | **do not send**; re-run — it resumes your seat if you actually won |
| \`Reservation has only Ns left — too short …\` | TTL almost gone | **do not send**; re-run for a fresh reservation |
| \`Auto-send unavailable for X (…); use the manual flow.\` | missing credential | reservation is live: send manually from the pinned address, then \`alw swap post-tx <hash>\` before the printed \`Deadline:\` |
| \`Your configured X wallet does not control the pinned source address\` | \`--from-address\` ≠ the key you hold | same manual fallback; fix the flag next time |
| \`Source send failed: …\` | broadcast failed, reservation still live | retry \`alw swap now\` (resumes) or send manually |
| \`Deposit sent (<hash>) but the confirm relay errored\` / \`no validator accepted the relay yet\` | money moved, relay didn't land | **immediately** \`alw swap post-tx <hash>\`; repeat every ~30 s until accepted or the reservation expires |
| \`✗ MINER FAILED — … reimbursed … from its bond\` | \`TimedOut\`: miner never delivered | you were paid 1.1× the hub-leg value in the backing asset; nothing to do |

Re-running \`alw swap now\` with the same direction is **idempotent for your keypair**: it
resumes a drawn seat or live reservation on that miner instead of paying a second fee.

### 4.3 Manual path (no \`--send\`)

Only if you must sign elsewhere. Reserve with \`--no-send --yes\`; the CLI prints the miner
address, the exact amount, and a \`Deadline: post-tx must complete by HH:MM:SS UTC
(reserved_until=<unix>)\`. Confirm the pinned numbers with \`alw view reservation --json\`
(\`from_amount\` is in smallest units), send the **exact** amount from the pinned address, then
\`alw swap post-tx <hash>\` immediately. Miss the deadline and the deposit is gone — it is the
miner's, with no swap to credit. \`--send\` exists so you never do this.

## 4.4 Coming: routed reservations through the Ventura Labs validator (Allways Access)

Today a mainnet bid is **self-represented**: your keypair bids, cranks the draw, finalizes,
and pays the full reservation fee — and it carries zero draw weight, so any validator in the
same pool beats it. The fix is **routing**: a validator enters the pool for you with its
stake weight, fronts the entry fee (stake-discounted, up to 95% off), and finalizes the seat
with you pinned. That is the reservation path the protocol is built around, and it is being
shipped as a product:

- **Allways Access** — the Ventura Labs validator's front door. Sign in, fund a **credit
  balance** with SN7 alpha, link your payout wallets, and reserve through the validator; a
  swap "uses a credit" instead of you paying the on-chain fee. Lost draws refund the credit.
- **API keys** (planned) — \`alw_sk_…\` keys that spend an account's credits, so a bot can
  quote (\`GET /rates\`), reserve (\`POST /swaps\`, idempotent), report its deposit
  (\`POST /swaps/:id/sent\`), and track (\`GET /swaps/:id\`) with no human in the loop — the
  first way to run the full taker flow over HTTP.

**Status: not yet public.** Until it is, everything in this runbook stands as written, and
the CLI still does routing on its own once a validator serves it:
\`alw config set router <validator-hotkey>\` (testnet already ships one via \`env testnet\`).
Check https://all-ways.io/agents for the launch; this file will be updated in place.

## 5. Tracking and verifying

\`\`\`bash
alw view swap <swap-key> --json      # {"swap_key","status","from_tx_hash","to_tx_hash","timeout_at",…}
alw view swap <swap-key> --watch     # live until terminal
alw view reservation --json          # your reservation on the last miner (before/while sending)
alw view active-swaps --json         # every in-flight swap on the program
\`\`\`

Statuses: \`PendingAttestation → Active → Fulfilled → Completed\` (happy path), or \`TimedOut\`
(miner failed → you are paid 1.1× from its collateral/bond, automatically) or \`Cancelled\`
(your destination could not receive → no refund).

**Swaps close on-chain when they finish.** \`alw view swap\` returning \`{"found": false}\`
after you saw it live means *finished*, not lost. Confirm the outcome on the native chain
(your destination balance / \`to_tx_hash\` on its explorer) or via
\`GET https://api.all-ways.io/swaps?search=<source-tx-hash>\`, which keeps the full history.

## 6. A bot loop that actually works

Sequential, one swap at a time, one miner at a time. Polling every ~30 s is plenty; the
orderbook changes when miners repost, not per block.

\`\`\`python
import json, re, subprocess, time, urllib.request

API = "https://api.all-ways.io"            # test-api.all-ways.io on testnet
DIRS = [("sol", "tao"), ("tao", "sol")]    # directions you can fund AND unload elsewhere
RECV = {"sol": "<your-solana-pubkey>", "tao": "<your-coldkey-ss58>"}
SRC  = {"sol": None, "tao": "<your-coldkey-ss58>"}   # None = the CLI keypair is the sender
SIZE = {"sol": 1.0, "tao": 0.5}            # in source units; keep hub leg inside min/max_swap
MIN_EDGE_USD = 1.0                         # after the reservation fee + gas

def alw(*args):
    p = subprocess.run(["alw", *args], capture_output=True, text=True)
    return p.returncode, p.stdout, p.stderr

def get(path):
    return json.load(urllib.request.urlopen(API + path, timeout=20))

cfg = json.loads(alw("view", "config", "--json")[1])
FEE_SOL = cfg["reservation_fee_sol"]

while True:
    usd = get("/prices")["prices"]
    for frm, to in DIRS:
        a = SIZE[frm]
        rc, out, _ = alw("swap", "quote", "--from", frm, "--to", to, "--amount", str(a), "--json")
        if rc != 0: continue
        q = json.loads(out)
        best = q["offers"][0]
        edge = best["receive"] * usd[to] - a * usd[frm] - FEE_SOL * usd["sol"]
        if edge < MIN_EDGE_USD: continue
        args = ["swap", "now", "--from", frm, "--to", to, "--amount", str(a),
                "--receive-address", RECV[to], "--miner", best["miner"], "--send", "--yes"]
        if SRC[frm]: args += ["--from-address", SRC[frm]]
        rc, out, err = alw(*args)                 # blocks until COMPLETED / failed / lost draw
        print(rc, out[-2000:], err[-500:])
        m = re.search(r"Deposit sent.*?post-tx (\\S+?)\`", out)   # money out, relay didn't land
        if m:                                                   # (everything prints to stdout)
            for _ in range(10):
                if alw("swap", "post-tx", m.group(1))[0] == 0: break
                time.sleep(30)
        # then: unload the received asset on your external venue, and refund the source side
    time.sleep(30)
\`\`\`

What the loop relies on: \`swap quote --json\` exit code (1 = nothing fillable), \`--send --yes\`
(no prompts, blocks to a terminal state), \`--miner\` (fill the offer you priced, not whatever
is best 20 s later), and the \`Deposit sent\` retry (the only state where money is out and the
CLI could not finish). Keep the Solana keypair topped up: each attempt burns 0.02 SOL.

## 7. Assets (wire ids for \`--from\` / \`--to\`)

Live set with decimals, explorers and confirmation depth: \`GET /chains\`.

| id | Asset | |
|---|---|---|
${assetRows}

## 8. HTTP API (read-only)

Base \`https://api.all-ways.io\` (testnet \`https://test-api.all-ways.io\`). OpenAPI at \`/swagger\`
is authoritative. Amounts are decimal strings in smallest units (lamports, satoshi, rao,
wei) — parse with arbitrary precision. Cache; prefer \`/sse\` over polling.

| Path | Use |
|---|---|
| \`GET /chains\` | assets, hub flags, decimals, explorer templates, confirmations |
| \`GET /prices\` | USD per asset id (\`null\` = no venue) |
| \`GET /miners\` | one row per (miner, pair, backing): \`rate\`, \`counterRate\`, \`isActive\`, \`collateral\`, addresses |
| \`GET /miners/{hotkey}\` · \`/miners/{hotkey}/rate-history\` | one miner; its quote history |
| \`GET /swaps?search=<tx-hash>&limit=&offset=\` | full swap history incl. finished ones (\`search\` matches tx hashes, addresses, swap ids) |
| \`GET /swaps/{swapId}\` · \`GET /swaps/active\` | one swap + timeline; in-flight swaps |
| \`GET /reservations/by-source/{address}\` | reservations pinned to a source address |
| \`GET /protocol/constants\` | immutable constants (fee divisor). Live bounds: \`alw view config\` |
| \`GET /stats\` · \`GET /health\` | counters; liveness |
| \`GET /sse\` | events \`swap\`, \`miner\`, \`reservation\`, \`head\` |

## 9. Errors → causes → fixes

| Symptom | Cause | Fix |
|---|---|---|
| \`No module named 'bittensor'\` / \`alw: command not found\` | venv not active | \`. .venv/bin/activate\` |
| pip resolver conflicts | old env | fresh venv, never system Python |
| \`Attempt to debit an account but found no record of a prior credit\` | signing key unfunded / wrong key | \`alw status --json\` → fund \`caller\` |
| \`alw swap quote\` empty while the dashboard shows miners | wrong network | \`alw config\` — env must match the dashboard you're looking at |
| \`--from/--to must each be one of: …\` | not a wire id (e.g. \`usdc\`) | use the Assets table (\`arbusdc\`, \`solusdc\`, …) |
| \`A swap must have a hub leg\` | spoke↔spoke | two swaps through a hub |
| \`Miner already has an active reservation\` / \`Reservation rejected\` | miner busy or your previous reservation not yet cleared | wait ~15–60 s or \`--miner\` another |
| \`BTC signing requires the BTC_PRIVATE_KEY env var\` | no WIF | set it, or manual path |
| \`KeyFileError\` traceback on a TAO source | wallet name wrong / coldkey file missing — after reservation | \`btcli wallet list\`; then manual path before the deadline |
| \`No live, unclaimed reservation found for your address\` on \`post-tx\` | it expired, or \`post-tx\` runs under a different Solana key than \`swap now\` did | same \`solana-keypair\` for both; if expired, funds already sent are lost — don't send until reserved |
| Swap "vanished" | closed on-chain = finished | \`GET /swaps?search=<tx>\` or your destination balance |
| \`Cancelled\` | your receive address can't accept the asset | fix the address; no refund |
| BTC source stuck unconfirmed near the deadline | fee too low | RBF up now; only recoverable while in mempool |

## 10. Testnet

\`\`\`bash
alw config set env testnet          # netuid 19, Solana devnet, every asset's testnet, Ventura Labs router
\`\`\`

Faucets: SOL \`solana airdrop 2 <pubkey> --url https://api.devnet.solana.com\` · TAO
https://taoswap.org/testnet-faucet · BTC testnet4 https://mempool.space/testnet4/faucet
(testnet3 faucets won't fund testnet4) · others: their own network faucet (Sepolia, Fuji,
Amoy, …). Dashboard https://test.all-ways.io, API https://test-api.all-ways.io.
Testnet parameters drift; \`alw view config\` before assuming anything.

## 11. Links

Dashboard https://all-ways.io · API https://api.all-ways.io/swagger · Docs
https://docs.all-ways.io (getting-started, swap-guide, cli, how-it-works) · Source
https://github.com/entrius/allways · This file raw: https://all-ways.io/llms.txt

**Code is law.** The on-chain program (\`smart-contracts/solana/programs/allways_swap_manager\`)
is the only authority; this runbook is convenience and may lag it.

## Disclaimer

Allways is permissionless, open-source, beta software. Swaps settle directly between
counterparty wallets; the protocol never takes custody of user funds, and the protocol fee is
charged against miner collateral rather than any user transfer. Validator operators,
including those run by the project, verify swap outcomes but cannot redirect or receive any
transferred amount. Use at your own risk. No warranty. Not financial advice.
`;
