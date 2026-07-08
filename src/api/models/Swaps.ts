export type ActiveSwap = {
  // Internal int64 lookup key, ALWAYS a string on the wire — it exceeds JS
  // Number precision (2^53), so it must never pass through Number()/parseInt.
  swapId: string;
  // The user-facing transaction number (#1, #2, …), trigger-assigned in the
  // DB. Display identity; null only for unbackfilled legacy rows.
  seq: number | null;
  swapKey: string | null; // hex of the 32-byte on-chain swap_key
  status: string;
  userAddress: string | null;
  minerHotkey: string | null;
  minerPubkey: string | null;
  solAmount: string | null;
  sourceChain: string | null;
  destChain: string | null;
  sourceAmount: string | null;
  destAmount: string | null;
  deliveredAmount: string | null;
  rate: string | null;
  userSourceAddress: string | null;
  userDestAddress: string | null;
  minerSourceAddress: string | null;
  minerDestAddress: string | null;
  sourceTxHash: string | null;
  destTxHash: string | null;
  // All lifecycle timestamps are unix seconds.
  timeoutAt: string | null;
  initiatedAt: string | null;
  fulfilledAt: string | null;
  completedAt: string | null;
  resolvedAt: string | null;
  timeoutExtensionsUsed: number;
  reservationRequestHash: string | null;
};

export type SwapDetail = {
  swap: ActiveSwap | null;
  events: import('./Events').ContractEvent[];
};
