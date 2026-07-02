export type ContractEvent = {
  id: string;
  eventType: string;
  signature: string | null;
  // Solana slot the event landed in, and its block time (unix seconds).
  slot: string;
  blockTime: string | null;
  logIndex: number | null;
  swapId: string | null;
  swapKey: string | null;
  minerHotkey: string | null;
  minerPubkey: string | null;
  userAddress: string | null;
  solAmount: string | null;
  sourceChain: string | null;
  destChain: string | null;
  amountRaw: string | null;
  secondaryAmount: string | null;
  txHash: string | null;
  actorPubkey: string | null;
  // Event-specific payload (halted flag, active flag, reserved-until, …) that
  // used to live in flat columns now rides along in this JSONB blob.
  eventData: Record<string, unknown> | null;
  createdAt: string;
};

// The Anchor event name is the display label directly — the contract emits
// distinct MinerActivated / MinerDeactivated names, so no derivation is needed.
export const displayEventType = (e: Pick<ContractEvent, 'eventType'>): string =>
  e.eventType;
