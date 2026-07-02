import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { AccountData, ListedWallet, SwapRecord, Tier } from './types';
import { seedAccount } from './fixtures';
import { loadState, saveState, type PersistedState } from './persistence';
import type { WalletAccount } from '../wallet/useWallet';

const RENEWAL_DAYS = 30;

interface GateContextValue {
  connected: WalletAccount | null;
  account: AccountData | null;
  isConnected: boolean;
  isMember: boolean;
  connect: (acct: WalletAccount, signature: string) => void;
  disconnect: () => void;
  subscribe: (tier: Tier) => void; // creates a pending membership
  confirmPayment: () => void; // activates the pending membership
  activateMembership: (tier: Tier) => void; // atomic subscribe + activate (mock watcher)
  cancelMembership: () => void;
  addWallet: (wallet: ListedWallet) => void;
  removeWallet: (address: string) => void;
  recordSwap: (swap: SwapRecord) => void;
}

const GateAccountContext = createContext<GateContextValue | null>(null);

export const useGateAccount = (): GateContextValue => {
  const ctx = useContext(GateAccountContext);
  if (!ctx)
    throw new Error('useGateAccount must be used within GateAccountProvider');
  return ctx;
};

export const GateAccountProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<PersistedState>(() => loadState());

  const persist = useCallback((next: PersistedState) => {
    setState(next);
    saveState(next);
  }, []);

  const connectedAddress = state.connected?.address ?? null;
  const account = connectedAddress
    ? (state.accounts[connectedAddress] ?? null)
    : null;

  // Mutate the currently connected account and persist.
  const updateAccount = useCallback(
    (fn: (a: AccountData) => AccountData) => {
      if (!connectedAddress) return;
      persist({
        ...state,
        accounts: {
          ...state.accounts,
          [connectedAddress]: fn(
            state.accounts[connectedAddress] ?? seedAccount(connectedAddress),
          ),
        },
      });
    },
    [connectedAddress, persist, state],
  );

  const connect = useCallback(
    (acct: WalletAccount, _signature: string) => {
      const existing = state.accounts[acct.address];
      persist({
        connected: acct,
        accounts: {
          ...state.accounts,
          [acct.address]: existing ?? seedAccount(acct.address),
        },
      });
    },
    [persist, state.accounts],
  );

  const disconnect = useCallback(() => {
    persist({ ...state, connected: null });
  }, [persist, state]);

  const subscribe = useCallback(
    (tier: Tier) => {
      updateAccount((a) => ({
        ...a,
        membership: {
          tier,
          status: 'pending',
          startedAt: null,
          renewsAt: null,
        },
      }));
    },
    [updateAccount],
  );

  const confirmPayment = useCallback(() => {
    updateAccount((a) => {
      if (!a.membership) return a;
      const startedAt = Date.now();
      return {
        ...a,
        membership: {
          ...a.membership,
          status: 'active',
          startedAt,
          renewsAt: startedAt + RENEWAL_DAYS * 24 * 60 * 60 * 1000,
        },
      };
    });
  }, [updateAccount]);

  const activateMembership = useCallback(
    (tier: Tier) => {
      const startedAt = Date.now();
      updateAccount((a) => ({
        ...a,
        membership: {
          tier,
          status: 'active',
          startedAt,
          renewsAt: startedAt + RENEWAL_DAYS * 24 * 60 * 60 * 1000,
        },
      }));
    },
    [updateAccount],
  );

  const cancelMembership = useCallback(() => {
    updateAccount((a) => ({ ...a, membership: null }));
  }, [updateAccount]);

  const addWallet = useCallback(
    (wallet: ListedWallet) => {
      updateAccount((a) =>
        a.wallets.some((w) => w.address === wallet.address)
          ? a
          : { ...a, wallets: [...a.wallets, wallet] },
      );
    },
    [updateAccount],
  );

  const removeWallet = useCallback(
    (address: string) => {
      updateAccount((a) => ({
        ...a,
        wallets: a.wallets.filter((w) => w.address !== address || w.isPrimary),
      }));
    },
    [updateAccount],
  );

  const recordSwap = useCallback(
    (swap: SwapRecord) => {
      updateAccount((a) => ({ ...a, swaps: [swap, ...a.swaps] }));
    },
    [updateAccount],
  );

  const value = useMemo<GateContextValue>(
    () => ({
      connected: state.connected,
      account,
      isConnected: !!state.connected,
      isMember: account?.membership?.status === 'active',
      connect,
      disconnect,
      subscribe,
      confirmPayment,
      activateMembership,
      cancelMembership,
      addWallet,
      removeWallet,
      recordSwap,
    }),
    [
      state.connected,
      account,
      connect,
      disconnect,
      subscribe,
      confirmPayment,
      activateMembership,
      cancelMembership,
      addWallet,
      removeWallet,
      recordSwap,
    ],
  );

  return (
    <GateAccountContext.Provider value={value}>
      {children}
    </GateAccountContext.Provider>
  );
};
