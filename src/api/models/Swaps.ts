export type ActiveSwap = {
  // Internal int64 lookup key, ALWAYS a string on the wire — it exceeds JS
  // Number precision (2^53), so it must never pass through Number()/parseInt.
  swapId: string;
  // The user-facing transaction number (#1, #2, …), trigger-assigned in the
  // DB. Display identity; null only for unbackfilled legacy rows.
  seq: number | null;
  swapKey: string | null; // hex of the 32-byte on-chain swap_key
  // PENDING | ACTIVE | FULFILLED | COMPLETED | TIMED_OUT | CANCELLED |
  // EXPIRED. Terminal: COMPLETED (green) / TIMED_OUT (red, slashed) /
  // CANCELLED (amber — validator-voided, no fault, no slash).
  status: string;
  userAddress: string | null;
  minerHotkey: string | null;
  minerPubkey: string | null;
  // Backing-leg notional in the backing's smallest unit (lamports for 'sol',
  // rao for 'tao'); the field name predates the backing dimension.
  solAmount: string | null;
  // The swap's collateral chain ('sol' | 'tao'); null on pre-v3 rows.
  backing: string | null;
  // SwapTimedOut verdict (absolute, backing units): what moved locally, what
  // the backing chain owes, and to whom. For 'tao' this is the verdict, not
  // confirmed settlement — the vault applies it minutes later.
  slashAmount: string | null;
  penalty: string | null;
  reimbursement: string | null;
  payee: string | null;
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
