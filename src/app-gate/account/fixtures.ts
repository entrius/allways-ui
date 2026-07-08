import type { AccountData, SwapRecord } from './types';

// The mock data seam. A real Allways Access backend would replace this module
// wholesale — nothing else in the gate app reads fixtures directly.

// Where the mocked subscription payment is "sent". Stand-in validator coldkey.
export const DEPOSIT_ADDRESS =
  '5GValidatorDepositAddrMockxxxxxxxxxxxxxxxxxxxxxxxxx';

const DAY = 24 * 60 * 60 * 1000;

const sampleSwaps = (now: number): SwapRecord[] => [
  {
    id: 'swap-1042',
    direction: 'BTC_TO_TAO',
    sourceAmount: '0.0100',
    destAmount: '274.10',
    rate: '27410',
    status: 'completed',
    createdAt: now - 2 * DAY,
  },
  {
    id: 'swap-1031',
    direction: 'TAO_TO_BTC',
    sourceAmount: '150.0',
    destAmount: '0.00547',
    rate: '27420',
    status: 'completed',
    createdAt: now - 5 * DAY,
  },
  {
    id: 'swap-1009',
    direction: 'BTC_TO_TAO',
    sourceAmount: '0.0250',
    destAmount: '681.50',
    rate: '27260',
    status: 'completed',
    createdAt: now - 11 * DAY,
  },
];

// A fresh account starts with no membership (so the signup flow is visible) but
// is seeded with a primary wallet and a little history to make the demo feel
// inhabited.
export const seedAccount = (coldkey: string): AccountData => {
  const now = Date.now();
  return {
    coldkey,
    membership: null,
    wallets: [
      {
        label: 'Primary coldkey',
        chain: 'TAO',
        address: coldkey,
        isPrimary: true,
      },
      {
        label: 'BTC payout',
        chain: 'BTC',
        address: 'bc1qmockpayoutaddr0allwaysaccountxxxxxxxxx',
      },
    ],
    swaps: sampleSwaps(now),
  };
};
