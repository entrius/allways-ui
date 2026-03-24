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

const CHAIN_DECIMALS: Record<
  string,
  { exp: number; digits: number; symbol: string }
> = {
  btc: { exp: 1e8, digits: 8, symbol: 'BTC' },
  tao: { exp: 1e9, digits: 4, symbol: 'TAO' },
};

export const formatAmount = (raw: string | number, chain: string): string => {
  const config = CHAIN_DECIMALS[chain.toLowerCase()];
  if (!config) return String(raw);
  const val = typeof raw === 'string' ? parseInt(raw, 10) : raw;
  return `${(val / config.exp).toFixed(config.digits)} ${config.symbol}`;
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
