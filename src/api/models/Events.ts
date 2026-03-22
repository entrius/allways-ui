export type ContractEvent = {
  id: string;
  eventType: string;
  blockNumber: string;
  swapId: string | null;
  minerHotkey: string | null;
  userAddress: string | null;
  taoAmount: string | null;
  createdAt: string;
};
