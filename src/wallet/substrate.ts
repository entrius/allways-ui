/**
 * Substrate wallet adapter — wraps @polkadot/extension-dapp.
 *
 * Lazy-loaded: extension-dapp probes `window.injectedWeb3` and must NOT be
 * imported at app bootstrap. Always call through `loadSubstrate*` helpers.
 */

const DAPP_NAME = 'Allways';

export type SubstrateSource =
  | 'polkadot-js'
  | 'talisman'
  | 'subwallet-js'
  | string;

export interface SubstrateAccount {
  address: string;
  name?: string;
  source: SubstrateSource;
}

export interface SubstrateConnection {
  address: string;
  source: SubstrateSource;
  /** Sign an arbitrary UTF-8 message — returns hex signature. */
  signRaw: (message: string) => Promise<string>;
}

/**
 * Detect Substrate extensions injected into `window.injectedWeb3`.
 * Returns the source names without prompting the user.
 */
export const detectSubstrateExtensions = (): SubstrateSource[] => {
  if (typeof window === 'undefined') return [];
  const injected = (
    window as unknown as { injectedWeb3?: Record<string, unknown> }
  ).injectedWeb3;
  if (!injected) return [];
  return Object.keys(injected);
};

/**
 * Enable extensions and read accounts. Returns the first account, since the
 * v1 UX picks one wallet automatically. Caller can extend to a picker later.
 */
export const connectSubstrate = async (): Promise<SubstrateConnection> => {
  const dapp = await import('@polkadot/extension-dapp');
  const extensions = await dapp.web3Enable(DAPP_NAME);
  if (extensions.length === 0) {
    throw new Error(
      'No Substrate extension found. Install Polkadot.js, Talisman, or SubWallet to continue.',
    );
  }

  const accounts = await dapp.web3Accounts();
  if (accounts.length === 0) {
    throw new Error(
      'No accounts available. Create an account in your Substrate extension and grant access to Allways.',
    );
  }

  const acct = accounts[0];
  const source = acct.meta.source;

  return {
    address: acct.address,
    source,
    signRaw: async (message: string): Promise<string> => {
      const injector = await dapp.web3FromSource(source);
      if (!injector.signer?.signRaw) {
        throw new Error(`${source} does not support raw signing`);
      }
      const { signature } = await injector.signer.signRaw({
        address: acct.address,
        data: message,
        type: 'bytes',
      });
      return signature;
    },
  };
};

/**
 * Build a connected @polkadot/api ApiPromise pointed at the configured WS
 * endpoint. Used by the claim-slash flow for direct extrinsic signing.
 */
export const getSubstrateApi = async () => {
  const ws =
    (import.meta.env.VITE_SUBTENSOR_WS_URL as string | undefined) ??
    'ws://localhost:9944';
  const { ApiPromise, WsProvider } = await import('@polkadot/api');
  const provider = new WsProvider(ws);
  return ApiPromise.create({ provider });
};

/**
 * Submit a `claim_slash` extrinsic for the given swap.
 *
 * NOTE: The pallet path / method name may vary by chain spec — the call below
 * targets `allways.claim_slash(swap_id)`. If your spec exposes the method
 * under a different name, adjust here.
 */
export const claimSlash = async (
  conn: SubstrateConnection,
  swapId: string,
): Promise<string> => {
  const dapp = await import('@polkadot/extension-dapp');
  const api = await getSubstrateApi();
  try {
    const injector = await dapp.web3FromSource(conn.source);
    const allwaysPallet = (
      api.tx as unknown as Record<string, Record<string, unknown>>
    ).allways;
    if (!allwaysPallet || !('claimSlash' in allwaysPallet)) {
      throw new Error('claim_slash extrinsic not available on this chain');
    }
    const tx = (
      allwaysPallet as unknown as {
        claimSlash: (id: string) => {
          signAndSend: (...args: unknown[]) => Promise<unknown>;
        };
      }
    ).claimSlash(swapId);

    return await new Promise<string>((resolve, reject) => {
      tx.signAndSend(
        conn.address,
        { signer: injector.signer },
        (result: {
          status: {
            isInBlock: boolean;
            isFinalized: boolean;
            asInBlock?: { toString: () => string };
          };
        }) => {
          if (result.status.isInBlock) {
            resolve(result.status.asInBlock?.toString() ?? 'in-block');
          } else if (result.status.isFinalized) {
            resolve('finalized');
          }
        },
      ).catch(reject);
    });
  } finally {
    await api.disconnect();
  }
};
