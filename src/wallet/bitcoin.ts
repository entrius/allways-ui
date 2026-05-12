/**
 * Bitcoin wallet adapter — Unisat only in v1.
 *
 * Lazy: all `window.*` reads happen inside the connect helper. The adapter
 * factory exists so a future PR can add Xverse / Leather without touching
 * the WalletProvider contract.
 */

export type BitcoinSource = 'unisat';

export interface BitcoinConnection {
  address: string;
  source: BitcoinSource;
  /** Returns the wallet's signature for the canonical proof message. */
  signMessage: (message: string) => Promise<string>;
  /** Broadcasts a transfer; returns the tx hash. `sats` is the satoshi amount. */
  sendBitcoin: (to: string, sats: number) => Promise<string>;
}

interface UnisatProvider {
  requestAccounts: () => Promise<string[]>;
  getAccounts: () => Promise<string[]>;
  signMessage: (
    msg: string,
    type?: 'ecdsa' | 'bip322-simple',
  ) => Promise<string>;
  sendBitcoin: (to: string, sats: number) => Promise<string>;
  getNetwork: () => Promise<string>;
}

const getUnisat = (): UnisatProvider | null => {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { unisat?: UnisatProvider }).unisat ?? null;
};

export const detectBitcoinExtensions = (): BitcoinSource[] => {
  return getUnisat() ? ['unisat'] : [];
};

export const connectBitcoin = async (): Promise<BitcoinConnection> => {
  const u = getUnisat();
  if (!u) {
    throw new Error(
      'Unisat extension not detected. Install Unisat to send BTC from your browser.',
    );
  }
  // `requestAccounts()` triggers the unlock popup; `getAccounts()` returns []
  // until the user approves the dapp the first time.
  const accounts = await u.requestAccounts();
  if (accounts.length === 0) throw new Error('Unisat returned no accounts');
  return {
    address: accounts[0],
    source: 'unisat',
    signMessage: (msg) => u.signMessage(msg),
    sendBitcoin: (to, sats) => u.sendBitcoin(to, sats),
  };
};
