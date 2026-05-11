/**
 * Bitcoin wallet adapters — Unisat (full), Xverse / Leather (detection only).
 *
 * Lazy: all `window.*` reads happen inside the connect helpers. Adapters are
 * factored so a v2 PR can fill in Xverse / Leather signing without changing
 * the WalletProvider contract.
 */

export type BitcoinSource = 'unisat' | 'xverse' | 'leather';

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

const getXverseProviders = () => {
  if (typeof window === 'undefined') return null;
  return (
    (window as unknown as { XverseProviders?: unknown }).XverseProviders ?? null
  );
};

const getLeather = () => {
  if (typeof window === 'undefined') return null;
  return (
    (window as unknown as { LeatherProvider?: unknown }).LeatherProvider ?? null
  );
};

export const detectBitcoinExtensions = (): BitcoinSource[] => {
  const found: BitcoinSource[] = [];
  if (getUnisat()) found.push('unisat');
  if (getXverseProviders()) found.push('xverse');
  if (getLeather()) found.push('leather');
  return found;
};

const connectUnisat = async (): Promise<BitcoinConnection> => {
  const u = getUnisat();
  if (!u) throw new Error('Unisat extension not detected');
  // `requestAccounts()` triggers the unlock popup; `getAccounts()` returns []
  // until the user approves the dapp the first time.
  const accounts = await u.requestAccounts();
  if (accounts.length === 0) throw new Error('Unisat returned no accounts');
  const address = accounts[0];
  return {
    address,
    source: 'unisat',
    signMessage: (msg) => u.signMessage(msg),
    sendBitcoin: (to, sats) => u.sendBitcoin(to, sats),
  };
};

const stubAdapter = (source: BitcoinSource): BitcoinConnection => {
  const reject = (op: string) => () =>
    Promise.reject(
      new Error(
        `${source} support is stubbed in v1 — use Unisat for now (or finish the adapter to unblock ${op}).`,
      ),
    );
  return {
    address: '',
    source,
    signMessage: reject('signMessage'),
    sendBitcoin: reject('sendBitcoin'),
  };
};

export const connectBitcoin = async (
  source: BitcoinSource,
): Promise<BitcoinConnection> => {
  if (source === 'unisat') return connectUnisat();
  // v1 ships detection-only for Xverse / Leather; the wallet still appears in
  // the connect modal so users see it, but signing/sending is deferred.
  return stubAdapter(source);
};
