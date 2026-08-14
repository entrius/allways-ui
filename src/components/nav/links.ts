export interface NavItem {
  label: string;
  to?: string;
  href?: string;
  external?: boolean;
}

export const LINKS = {
  github: 'https://github.com/entrius/allways',
  twitter: 'https://x.com/allways_io',
  discord: 'https://discord.gg/Q99Z2UQt9J',
  // Canonical legal pages live on the prod docs site regardless of env —
  // one copy of the terms, no test-docs drift.
  terms: 'https://docs.all-ways.io/terms',
  privacy: 'https://docs.all-ways.io/privacy',
} as const;

export const docsUrl = (): string =>
  typeof window !== 'undefined' && window.location.hostname === 'all-ways.io'
    ? 'https://docs.all-ways.io/'
    : 'https://test-docs.all-ways.io/';

export const NAV_ITEMS: NavItem[] = [
  { label: 'Markets', to: '/market' },
  { label: 'Transactions', to: '/transactions' },
  { label: 'Miners', to: '/miners' },
  { label: 'Network Stats', to: '/network-stats' },
  { label: 'Agents', to: '/agents' },
];
