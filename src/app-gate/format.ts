// Small display helpers shared across the gate app.

export const shortAddress = (addr: string): string =>
  addr.length > 12 ? `${addr.slice(0, 5)}…${addr.slice(-5)}` : addr;

export const formatDate = (ms: number): string =>
  new Date(ms).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

export const formatDateTime = (ms: number): string =>
  new Date(ms).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const daysUntil = (ms: number): number =>
  Math.max(0, Math.ceil((ms - Date.now()) / (24 * 60 * 60 * 1000)));

export const directionLabel = (d: 'BTC_TO_TAO' | 'TAO_TO_BTC'): string =>
  d === 'BTC_TO_TAO' ? 'BTC → TAO' : 'TAO → BTC';
