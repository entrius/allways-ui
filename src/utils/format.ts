export const shortAddr = (addr: string) =>
  addr.length > 10 ? `${addr.slice(0, 4)}..${addr.slice(-4)}` : addr;

export const formatTao = (rao: string | number) => {
  const val = typeof rao === 'string' ? parseInt(rao, 10) : rao;
  return (val / 1e9).toFixed(2);
};

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

const CHAIN_DECIMALS: Record<
  string,
  { exp: number; digits: number; symbol: string }
> = {
  btc: { exp: 1e8, digits: 8, symbol: 'BTC' },
  tao: { exp: 1e9, digits: 4, symbol: 'TAO' },
};

// Min display precision so a clean "0.2 TAO" renders as "0.20 TAO" rather
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

// Returns "1 BTC = N TAO" computed from on-chain amounts. Always quotes the
// non-TAO leg in TAO terms so the unit is consistent regardless of direction.
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
  const fromIsTao = fromChain.toLowerCase() === 'tao';
  const taoSide = fromIsTao ? fromHuman : toHuman;
  const otherSide = fromIsTao ? toHuman : fromHuman;
  const otherSym = (fromIsTao ? toChain : fromChain).toUpperCase();
  if (otherSide === 0) return null;
  const ratio = taoSide / otherSide;
  return `1 ${otherSym} = ${formatRate(ratio)} TAO`;
};

export const chainSymbol = (chain: string): string =>
  CHAIN_DECIMALS[chain.toLowerCase()]?.symbol ?? chain.toUpperCase();

const SECONDS_PER_BLOCK = 12;

export const formatBlockEstimate = (blocks: number): string => {
  const seconds = blocks * SECONDS_PER_BLOCK;
  if (seconds < 60) return `~${seconds}s`;
  if (seconds < 3600) return `~${Math.round(seconds / 60)}m`;
  return `~${(seconds / 3600).toFixed(1)}h`;
};

export const formatTimeUntilBlock = (
  targetBlock: number,
  currentBlock: number,
): string => {
  const remaining = targetBlock - currentBlock;
  if (remaining <= 0) return 'past';
  return formatBlockEstimate(remaining);
};

// Taostats extrinsic URL: /extrinsic/<block>-<idx>, idx zero-padded to 4
// digits (e.g. 8026775-0015). VITE_EXPLORER_EXTRINSIC_URL can override with
// any template containing {block} and {idx}.
const EXTRINSIC_URL_TEMPLATE =
  (import.meta.env.VITE_EXPLORER_EXTRINSIC_URL as string | undefined) ??
  'https://taostats.io/extrinsic/{block}-{idx}';

export const extrinsicRef = (
  blockNumber: string | number,
  extrinsicIndex: number,
): string => `${blockNumber}-${String(extrinsicIndex).padStart(4, '0')}`;

export const explorerExtrinsicUrl = (
  blockNumber: string | number,
  extrinsicIndex: number,
): string =>
  EXTRINSIC_URL_TEMPLATE.replace('{block}', String(blockNumber)).replace(
    '{idx}',
    String(extrinsicIndex).padStart(4, '0'),
  );
