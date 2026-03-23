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
