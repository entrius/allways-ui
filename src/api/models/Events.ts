export type ContractEvent = {
  id: string;
  eventType: string;
  blockNumber: string;
  swapId: string | null;
  minerHotkey: string | null;
  userAddress: string | null;
  taoAmount: string | null;
  sourceChain: string | null;
  destChain: string | null;
  amountRaw: string | null;
  secondaryAmount: string | null;
  txHash: string | null;
  address: string | null;
  voteType: string | null;
  voteCount: number | null;
  configKey: string | null;
  reservedUntil: string | null;
  isActive: boolean | null;
  extrinsicIndex: number | null;
  createdAt: string;
};

export const displayEventType = (
  e: Pick<ContractEvent, 'eventType' | 'isActive'>,
): string =>
  e.eventType === 'MinerActivated' && e.isActive === false
    ? 'MinerDeactivated'
    : e.eventType;
