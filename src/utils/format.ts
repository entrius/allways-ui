import { chainInfo, hubChain } from '../api/models/chains';

export const shortAddr = (addr: string) =>
  addr.length > 10 ? `${addr.slice(0, 4)}..${addr.slice(-4)}` : addr;

// SS58 hotkeys / Solana pubkeys are always > 40 chars; format as 4…4 with an
// ellipsis to match the leaderboard / detail-header convention.
export const shortHotkey = (h: string) => `${h.slice(0, 4)}…${h.slice(-4)}`;

// Tx signatures / swap keys: 6…6 keeps enough of a Solana signature to be
// recognizable (e.g. 54foaU…zBuwoj).
export const shortHash = (h: string) =>
  h.length > 13 ? `${h.slice(0, 6)}…${h.slice(-6)}` : h;

// The human-facing identity of a swap: its transaction number ("#12"),
// falling back to the truncated tx signature / swap_key for unbackfilled
// rows. The int64 swapId is an internal lookup key only — meaningless to
// users and unsafe to render as a number.
export const swapDisplayId = (swap: {
  seq?: number | null;
  sourceTxHash: string | null;
  swapKey?: string | null;
  swapId: string;
}): string =>
  swap.seq != null
    ? `#${swap.seq}`
    : swap.sourceTxHash
      ? shortHash(swap.sourceTxHash)
      : swap.swapKey
        ? shortHash(swap.swapKey)
        : `#${swap.swapId}`;

// Numeraire is SOL: lamports (1e9) → SOL. Kept parallel to the old rao→TAO
// helper it replaced — collateral, volume, and swap-size caps are all SOL now.
export const formatSol = (lamports: string | number) => {
  const val = typeof lamports === 'string' ? parseInt(lamports, 10) : lamports;
  return (val / 1e9).toFixed(2);
};

// Numeric lamports→SOL, for chart math / aggregation where a Number (not a
// formatted string) is needed. Display-side callers should prefer formatSol.
export const lamportsToSol = (lamports: string | number) =>
  (typeof lamports === 'string' ? parseFloat(lamports) : lamports) / 1e9;

export const formatNumber = (n: number, decimals = 2) =>
  n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

// Mirror of allways.constants.RATE_SIG_FIGS — keep in lockstep.
export const RATE_SIG_FIGS = 5;

// JS equivalent of Python's `:.{RATE_SIG_FIGS}g`: strips trailing zeros,
// drops to scientific for sub-1e-4 values, matches the validator-normalized form.
export const formatRate = (rate: string | number): string => {
  const n = typeof rate === 'string' ? parseFloat(rate) : rate;
  if (!Number.isFinite(n)) return '—';
  return parseFloat(n.toPrecision(RATE_SIG_FIGS)).toString();
};

export const trimTrailingZeros = (value: string): string => {
  if (!value || !value.includes('.')) return value;
  return value.replace(/0+$/, '').replace(/\.$/, '');
};

// Trims trailing fractional zeros while guaranteeing at least `minDecimals`
// digits past the point — so "0.20000" → "0.20" but "0.001" stays "0.001".
const trimToMinDecimals = (value: string, minDecimals: number): string => {
  if (!value.includes('.')) return `${value}.${'0'.repeat(minDecimals)}`;
  const [intPart, fracPart] = value.split('.');
  const stripped = fracPart.replace(/0+$/, '');
  const padded =
    stripped.length >= minDecimals
      ? stripped
      : stripped.padEnd(minDecimals, '0');
  return padded ? `${intPart}.${padded}` : intPart;
};

// Per-chain render config from the das-served chain registry (seeded, then
// refreshed live) — the UI has no chain table of its own.
const chainCfg = (chain: string | null | undefined) => {
  const c = chainInfo(chain);
  return c
    ? { exp: 10 ** c.decimals, digits: c.displayDigits, symbol: c.symbol }
    : undefined;
};

// Min display precision so a clean "0.2 SOL" renders as "0.20 SOL" rather
// than dropping the trailing zero entirely.
const AMOUNT_MIN_DECIMALS = 2;

export const formatAmount = (raw: string | number, chain: string): string => {
  const config = chainCfg(chain);
  if (!config) return String(raw);
  // Number, not parseInt: wei-scale strings can arrive in scientific notation,
  // which parseInt reads as its mantissa ("1e+21" -> 1).
  const val = typeof raw === 'string' ? Number(raw) : raw;
  const fixed = (val / config.exp).toFixed(config.digits);
  return `${trimToMinDecimals(fixed, AMOUNT_MIN_DECIMALS)} ${config.symbol}`;
};

// Contract stores gross to_amount; the user actually receives gross * (1 - 1/feeDivisor)
// after the protocol fee is taken on completion. Apply on the destination side
// when rendering net-receive totals.
export const applyFee = (
  raw: string | number | null | undefined,
  feeDivisor: number | undefined,
): string | null => {
  if (raw === null || raw === undefined) return null;
  if (!feeDivisor || feeDivisor <= 0) return String(raw);
  try {
    // BigInt end-to-end: doubles overflow at wei scale and String(1e21) turns
    // scientific, which downstream parseInt would read as "1".
    const gross = BigInt(raw);
    return String(gross - gross / BigInt(feeDivisor));
  } catch {
    return String(raw);
  }
};

// Returns "1 BTC = N SOL" computed from on-chain amounts. Always quotes the
// non-hub leg in hub terms so the unit is consistent regardless of direction.
export const formatRateLine = (
  fromAmount: string | null,
  fromChain: string | null,
  toAmount: string | null,
  toChain: string | null,
): string | null => {
  if (!fromAmount || !fromChain || !toAmount || !toChain) return null;
  const fromCfg = chainCfg(fromChain);
  const toCfg = chainCfg(toChain);
  if (!fromCfg || !toCfg) return null;
  const fromHuman = parseInt(fromAmount, 10) / fromCfg.exp;
  const toHuman = parseInt(toAmount, 10) / toCfg.exp;
  if (!Number.isFinite(fromHuman) || !Number.isFinite(toHuman) || toHuman === 0)
    return null;
  const fromIsHub = fromChain.toLowerCase() === hubChain();
  const hubSide = fromIsHub ? fromHuman : toHuman;
  const otherSide = fromIsHub ? toHuman : fromHuman;
  const otherSym = (fromIsHub ? toChain : fromChain).toUpperCase();
  if (otherSide === 0) return null;
  const ratio = hubSide / otherSide;
  return `1 ${otherSym} = ${formatRate(ratio)} ${chainSymbol(hubChain())}`;
};

export const chainSymbol = (chain: string): string =>
  chainCfg(chain)?.symbol ?? chain.toUpperCase();

// ── Directional rate display ──
// Machines store ONE canonical denomination per pair: "dest per 1 canonical
// source" with the hub pinned as source — the same unit in BOTH direction
// quotes (see api/models/Miners.ts). Humans always read "what you receive
// per 1 you send", so a reverse leg inverts at presentation.
// Mirror of allways.utils.rate.directional_rate / chains.canonical_pair —
// keep in lockstep.

// canonical_pair ordering: hub is always source; non-hub pairs (none exist —
// every pair is hub↔spoke) order alphabetically.
const canonicalSource = (a: string, b: string): string => {
  const hub = hubChain();
  if (a === hub || b === hub) return hub;
  return a < b ? a : b;
};

export const isReverseLeg = (fromChain: string, toChain: string): boolean => {
  const from = fromChain.toLowerCase();
  return from !== canonicalSource(from, toChain.toLowerCase());
};

// Canonical stored rate → directional number for the (from → to) leg.
// null when the input is missing/unparseable; 0 passes through (not offered).
export const directionalRate = (
  fromChain: string,
  toChain: string,
  canonicalRate: string | number | null | undefined,
): number | null => {
  const n =
    typeof canonicalRate === 'string'
      ? parseFloat(canonicalRate)
      : (canonicalRate ?? NaN);
  if (!Number.isFinite(n)) return null;
  return n > 0 && isReverseLeg(fromChain, toChain) ? 1 / n : n;
};

// "BTC/SOL" — the compact unit label matching directionalRate's output
// ("to per 1 from"). The one source for every rate suffix in the app.
export const rateUnit = (fromChain: string, toChain: string): string =>
  `${chainSymbol(toChain)}/${chainSymbol(fromChain)}`;

// ── Time formatting (unix seconds) ──
// The chain is time-native now: all lifecycle timestamps and windows are unix
// seconds. These replace the old block-count estimators.

export const formatDurationSecs = (secs: number): string => {
  if (!Number.isFinite(secs) || secs < 0) return '—';
  if (secs < 60) return `~${Math.round(secs)}s`;
  if (secs < 3600) return `~${Math.round(secs / 60)}m`;
  return `~${(secs / 3600).toFixed(1)}h`;
};

// "Xs/m/h/d ago" from a unix-seconds timestamp.
export const formatTimeAgo = (
  unixSecs: number | string | null | undefined,
  nowMs = Date.now(),
): string => {
  if (unixSecs == null || unixSecs === '') return '—';
  const ts = typeof unixSecs === 'string' ? parseInt(unixSecs, 10) : unixSecs;
  // 0 is the "not set yet" sentinel (e.g. a swap's initiated_at before quorum), not the
  // epoch. Rendering it relative gives an absurd "20643d ago". Producers should send NULL;
  // guard anyway so one stale row can't make the whole column look broken.
  if (!Number.isFinite(ts) || ts <= 0) return '—';
  const secs = Math.max(0, Math.floor(nowMs / 1000 - ts));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// Countdown to a unix-seconds target: "~Xs/m/h" while in the future, else "past".
export const formatCountdown = (
  targetUnixSecs: number | string | null | undefined,
  nowMs = Date.now(),
): string => {
  if (targetUnixSecs == null || targetUnixSecs === '') return '—';
  const ts =
    typeof targetUnixSecs === 'string'
      ? parseInt(targetUnixSecs, 10)
      : targetUnixSecs;
  // 0 = unset, not the epoch; it must read "—", never "past".
  if (!Number.isFinite(ts) || ts <= 0) return '—';
  const remaining = Math.floor(ts - nowMs / 1000);
  if (remaining <= 0) return 'past';
  return formatDurationSecs(remaining);
};

// A unix-seconds timestamp as a wall-clock string for detail rows.
export const formatUnixTime = (
  unixSecs: number | string | null | undefined,
): string => {
  if (unixSecs == null || unixSecs === '') return '—';
  const ts = typeof unixSecs === 'string' ? parseInt(unixSecs, 10) : unixSecs;
  if (!Number.isFinite(ts)) return '—';
  return new Date(ts * 1000).toLocaleString();
};

// Hash spelling is a family trait, not a chain trait: UTXO explorers want bare
// hex (a 0x-prefixed Hash-typed event value 404s), EVM hashes are canonically
// 0x-prefixed. Normalize for display and linking.
export const normalizeTxHash = (
  chain: string | null | undefined,
  hash: string,
): string => {
  switch (chainInfo(chain)?.family) {
    case 'utxo':
      return hash.replace(/^0x/i, '');
    case 'evm':
      return /^0x/i.test(hash) ? hash : `0x${hash}`;
    default:
      return hash;
  }
};

// Explorer link from the das-served {hash} template — network-aware on the
// server side, so the UI never knows networks exist. Null when the chain has
// no explorer (or isn't known).
export const explorerTxUrl = (
  chain: string | null | undefined,
  hash: string,
): string | null => {
  if (!hash) return null;
  const template = chainInfo(chain)?.explorerTx;
  return template
    ? template.replace('{hash}', normalizeTxHash(chain, hash))
    : null;
};

// Hub explorer link for a transaction signature (Solana program txs).
export const explorerSignatureUrl = (signature: string): string =>
  explorerTxUrl(hubChain(), signature) ?? '';
