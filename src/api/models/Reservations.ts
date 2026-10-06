export type Reservation = {
  id: string;
  requestHash: string;
  minerHotkey: string;
  // The miner's Bittensor uid (das miner_uids). Absent on an older das; null
  // when the hotkey is unregistered.
  minerUid?: number | null;
  minerPubkey: string | null;
  userFromAddress: string;
  fromChain: string | null;
  toChain: string | null;
  solAmount: string | null;
  fromAmount: string | null;
  toAmount: string | null;
  // Reservation window is unix seconds.
  reservedAt: string;
  reservedUntil: string;
  status: string;
  swapId: string | null;
  extensionsUsed: number;
  pendingExtensionFromTxHash: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};
