export type ActiveSwap = {
  swapId: string;
  status: string;
  userAddress: string | null;
  minerHotkey: string | null;
  taoAmount: string | null;
  sourceChain: string | null;
  destChain: string | null;
  sourceAmount: string | null;
  destAmount: string | null;
  rate: string | null;
  userSourceAddress: string | null;
  userDestAddress: string | null;
  minerSourceAddress: string | null;
  sourceTxHash: string | null;
  destTxHash: string | null;
  timeoutBlock: string | null;
  initiatedBlock: string | null;
  fulfilledBlock: string | null;
  completedBlock: string | null;
  initiatedAt: string | null;
  fulfilledAt: string | null;
  resolvedAt: string | null;
  timeoutExtensionsUsed: number;
  pendingTimeoutExtensionTarget: string | null;
  pendingTimeoutExtensionProposedBlock: string | null;
  pendingTimeoutExtensionProposedBy: string | null;
};

export type SwapDetail = {
  swap: ActiveSwap | null;
  events: import('./Events').ContractEvent[];
};
