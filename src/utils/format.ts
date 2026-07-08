export const shortAddr = (addr: string) =>
  addr.length > 10 ? `${addr.slice(0, 4)}..${addr.slice(-4)}` : addr;

// SS58 hotkeys / Solana pubkeys are always > 40 chars; format as 4…4 with an
// ellipsis to match the leaderboard / detail-header convention.
export const shortHotkey = (h: string) => `${h.slice(0, 4)}…${h.slice(-4)}`;

// Tx signatures / swap keys: 6…6 keeps enough of a Solana signature to be
// recognizable (e.g. 54foaU…zBuwoj).
export const shortHash = (h: string) =>
  h.length > 13 ? `${h.slice(0, 6)}…${h.slice(-6)}` : h;

// The human-facing identity of a swap: the Solana tx signature when we have
// it, else the swap_key hex. The int64 swapId is an internal lookup key only —
// it's meaningless to users and unsafe to render as a number.
export const swapDisplayId = (swap: {
  sourceTxHash: string | null;
  swapKey?: string | null;
  swapId: string;
}): string =>
  swap.sourceTxHash
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

// SOL is the hub/numeraire; BTC and TAO are spoke chains whose amounts still
// render on the source/dest legs of a swap.
const CHAIN_DECIMALS: Record<
  string,
  { exp: number; digits: number; symbol: string }
> = {
  btc: { exp: 1e8, digits: 8, symbol: 'BTC' },
  tao: { exp: 1e9, digits: 4, symbol: 'TAO' },
  sol: { exp: 1e9, digits: 4, symbol: 'SOL' },
};

// The hub chain — the numeraire. Rates and cross-quotes pin this as the base.
export const HUB_CHAIN = 'sol';

// Min display precision so a clean "0.2 SOL" renders as "0.20 SOL" rather
// than dropping the trailing zero entirely.
const AMOUNT_MIN_DECIMALS = 2;

export const formatAmount = (raw: string | number, chain: string): string => {
  const config = CHAIN_DECIMALS[chain.toLowerCase()];
  if (!config) return String(raw);
  const val = typeof raw === 'string' ? parseInt(raw, 10) : raw;
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
  const val = typeof raw === 'string' ? parseInt(raw, 10) : raw;
  if (!Number.isFinite(val) || !feeDivisor || feeDivisor <= 0)
    return String(val);
  const net = Math.floor(val - val / feeDivisor);
  return String(net);
};

// Returns "1 BTC = N SOL" computed from on-chain amounts. Always quotes the
// non-hub leg in SOL terms so the unit is consistent regardless of direction.
export const formatRateLine = (
  fromAmount: string | null,
  fromChain: string | null,
  toAmount: string | null,
  toChain: string | null,
): string | null => {
  if (!fromAmount || !fromChain || !toAmount || !toChain) return null;
  const fromCfg = CHAIN_DECIMALS[fromChain.toLowerCase()];
  const toCfg = CHAIN_DECIMALS[toChain.toLowerCase()];
  if (!fromCfg || !toCfg) return null;
  const fromHuman = parseInt(fromAmount, 10) / fromCfg.exp;
  const toHuman = parseInt(toAmount, 10) / toCfg.exp;
  if (!Number.isFinite(fromHuman) || !Number.isFinite(toHuman) || toHuman === 0)
    return null;
  const fromIsHub = fromChain.toLowerCase() === HUB_CHAIN;
  const hubSide = fromIsHub ? fromHuman : toHuman;
  const otherSide = fromIsHub ? toHuman : fromHuman;
  const otherSym = (fromIsHub ? toChain : fromChain).toUpperCase();
  if (otherSide === 0) return null;
  const ratio = hubSide / otherSide;
  return `1 ${otherSym} = ${formatRate(ratio)} SOL`;
};

export const chainSymbol = (chain: string): string =>
  CHAIN_DECIMALS[chain.toLowerCase()]?.symbol ?? chain.toUpperCase();

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
  if (!Number.isFinite(ts)) return '—';
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
  if (!Number.isFinite(ts)) return '—';
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

// Solana explorer link for a transaction signature. VITE_EXPLORER_SOLANA_TX_URL
// can override with any template containing {sig}.
const SOLANA_TX_URL_TEMPLATE =
  (import.meta.env.VITE_EXPLORER_SOLANA_TX_URL as string | undefined) ??
  'https://explorer.solana.com/tx/{sig}';

export const explorerSignatureUrl = (signature: string): string =>
  SOLANA_TX_URL_TEMPLATE.replace('{sig}', signature);

// BTC tx hashes are bare hex; the reservation-extension event types its hash as
// a Hash, so it arrives 0x-prefixed and a mempool link built from it 404s.
// Normalize for display and linking. VITE_EXPLORER_BTC_TX_URL can override
// (e.g. a testnet4 explorer) with any template containing {hash}.
const BTC_TX_URL_TEMPLATE =
  (import.meta.env.VITE_EXPLORER_BTC_TX_URL as string | undefined) ??
  'https://mempool.space/tx/{hash}';

export const normalizeTxHash = (
  chain: string | null | undefined,
  hash: string,
): string =>
  (chain ?? '').toLowerCase() === 'btc' ? hash.replace(/^0x/i, '') : hash;

export const explorerTxUrl = (
  chain: string | null | undefined,
  hash: string,
): string | null =>
  hash && (chain ?? '').toLowerCase() === 'btc'
    ? BTC_TX_URL_TEMPLATE.replace('{hash}', hash.replace(/^0x/i, ''))
    : null;
