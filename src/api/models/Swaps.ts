export type ActiveSwap = {
  swapId: string;
  status: string;
  userAddress: string | null;
  minerHotkey: string | null;
  taoAmount: string | null;
  sourceChain: string | null;
  destChain: string | null;
  initiatedAt: string | null;
  fulfilledAt: string | null;
  resolvedAt: string | null;
};
