// All gate-app domain types live here. The mock keeps every shape close to
// what a real Allways Access API would return so swapping `fixtures.ts` for a
// live service is the only change required later.

export type Tier = 'standard' | 'premium';

export interface TierConfig {
  id: Tier;
  name: string;
  priceTao: number;
  tagline: string;
  features: string[];
  // Higher wins when the validator picks among competing reservation requests.
  priority: number;
}

export const TIERS: TierConfig[] = [
  {
    id: 'standard',
    name: 'Standard',
    priceTao: 1,
    tagline: 'Gated access to the validator.',
    features: [
      'Whitelisted reservation requests',
      'Browser exchange access',
      'Swap history & receipts',
      'Up to 3 listed wallets',
    ],
    priority: 1,
  },
  {
    id: 'premium',
    name: 'Premium',
    priceTao: 3,
    tagline: 'Priority access when miners are scarce.',
    features: [
      'Everything in Standard',
      'Priority reservation ordering',
      'Unlimited listed wallets',
      'Early access to limit orders',
    ],
    priority: 2,
  },
];

export const tierConfig = (tier: Tier): TierConfig =>
  TIERS.find((t) => t.id === tier) ?? TIERS[0];

export type MembershipStatus = 'active' | 'pending' | 'expired';

export interface Membership {
  tier: Tier;
  status: MembershipStatus;
  startedAt: number | null; // epoch ms — null while payment is pending
  renewsAt: number | null;
}

export type WalletChain = 'TAO' | 'BTC';

export interface ListedWallet {
  label: string;
  chain: WalletChain;
  address: string;
  isPrimary?: boolean;
}

export type SwapDirection = 'BTC_TO_TAO' | 'TAO_TO_BTC';
export type SwapStatus = 'completed' | 'active' | 'fulfilled' | 'timed_out';

export interface SwapRecord {
  id: string;
  direction: SwapDirection;
  sourceAmount: string;
  destAmount: string;
  rate: string; // TAO per BTC
  status: SwapStatus;
  createdAt: number;
}

// Everything the gate knows about one connected coldkey.
export interface AccountData {
  coldkey: string;
  membership: Membership | null;
  wallets: ListedWallet[];
  swaps: SwapRecord[];
}
