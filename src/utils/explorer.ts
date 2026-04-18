export type ExplorerChain = 'btc' | 'tao';
export type ExplorerType = 'address' | 'tx' | 'block';

const builders: Record<
  ExplorerChain,
  Partial<Record<ExplorerType, (v: string) => string>>
> = {
  btc: {
    address: (v) => `https://www.blockchain.com/btc/address/${v}`,
    tx: (v) => `https://www.blockchain.com/btc/tx/${v}`,
  },
  tao: {
    address: (v) => `https://taostats.io/account/${v}`,
    block: (v) => `https://taostats.io/block/${v}`,
  },
};

export const getExplorerUrl = (
  chain: string | undefined | null,
  type: ExplorerType,
  value: string | undefined | null,
): string | null => {
  if (!chain || !value) return null;
  const key = chain.toLowerCase() as ExplorerChain;
  return builders[key]?.[type]?.(value) ?? null;
};
