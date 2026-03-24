export type Miner = {
  uid: number;
  hotkey: string;
  sourceChain: string | null;
  destChain: string | null;
  rate: string | null;
  collateralRao: string;
  isActive: boolean;
  isReserved: boolean;
  hasActiveSwap: boolean;
  updatedAt: string;
};
