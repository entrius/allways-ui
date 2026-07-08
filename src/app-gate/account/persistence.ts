import type { AccountData } from './types';
import type { WalletAccount } from '../wallet/useWallet';

// Persist the demo so a reload keeps the connected wallet + membership state.
// Bumping the version key is the safe way to invalidate an old mock shape.

const STORAGE_KEY = 'allways-gate-state-v1';

export interface PersistedState {
  connected: WalletAccount | null;
  accounts: Record<string, AccountData>;
}

const EMPTY: PersistedState = { connected: null, accounts: {} };

export const loadState = (): PersistedState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as PersistedState;
    return {
      connected: parsed.connected ?? null,
      accounts: parsed.accounts ?? {},
    };
  } catch {
    return EMPTY;
  }
};

export const saveState = (state: PersistedState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be unavailable (private mode) — non-fatal for a mock.
  }
};
