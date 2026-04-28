export interface NavItem {
  label: string;
  to?: string;
  href?: string;
  external?: boolean;
}

// TODO: confirm X handle and Discord invite with team before public launch.
export const LINKS = {
  github: 'https://github.com/entrius/allways',
  twitter: 'https://x.com/all_ways_io',
  discord: 'https://discord.gg/REPLACE_ME',
  status: 'https://status.all-ways.io',
} as const;

export const docsUrl = (): string =>
  typeof window !== 'undefined' && window.location.hostname === 'all-ways.io'
    ? 'https://docs.all-ways.io/'
    : 'https://test-docs.all-ways.io/';

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Swap', to: '/swap' },
  { label: 'Agents', to: '/agents' },
];
