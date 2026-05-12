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
 * Selector for the ink! contract's `claim_slash(swap_id: u64)` message.
 * Keep in sync with `allways/contract_client.py::CONTRACT_SELECTORS`.
 */
const CLAIM_SLASH_SELECTOR = 'cf3c3dd9';

/** Default gas weight for a single contracts.call — generous, refunded if unused. */
const DEFAULT_GAS = {
  refTime: 5_000_000_000n,
  proofSize: 800_000n,
};

const encodeClaimSlashInput = (swapId: bigint): `0x${string}` => {
  const buf = new Uint8Array(8);
  new DataView(buf.buffer).setBigUint64(0, swapId, /* littleEndian */ true);
  const hex = Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
  return `0x${CLAIM_SLASH_SELECTOR}${hex}`;
};

/**
 * Submit a `claim_slash` call to the Allways ink! contract.
 *
 * Goes through `pallet_contracts::call(dest, value=0, gas, storage=None, data)`
 * — same path the validator's `contract_client.exec_contract_raw` uses
 * server-side. The selector + u64-LE encoding matches `claim_slash` in
 * `contract_client.py`; both must stay in sync.
 */
export const claimSlash = async (
  conn: SubstrateConnection,
  swapId: string | number | bigint,
): Promise<string> => {
  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS as
    | string
    | undefined;
  if (!contractAddress) {
    throw new Error(
      'VITE_CONTRACT_ADDRESS is not set — the browser claim flow needs the ink! contract address.',
    );
  }
  const dapp = await import('@polkadot/extension-dapp');
  const api = await getSubstrateApi();
  try {
    const injector = await dapp.web3FromSource(conn.source);
    const contractsPallet = (
      api.tx as unknown as Record<string, Record<string, unknown> | undefined>
    ).contracts;
    if (!contractsPallet || !('call' in contractsPallet)) {
      throw new Error(
        'pallet_contracts is not available on this chain — claim flow needs a runtime with contracts support.',
      );
    }

    const data = encodeClaimSlashInput(BigInt(swapId));
    const tx = (
      contractsPallet as unknown as {
        call: (
          dest: string,
          value: number,
          gasLimit: { refTime: bigint; proofSize: bigint },
          storageDepositLimit: null,
          data: string,
        ) => {
          signAndSend: (...args: unknown[]) => Promise<unknown>;
        };
      }
    ).call(contractAddress, 0, DEFAULT_GAS, null, data);

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
          dispatchError?: {
            toString: () => string;
          };
        }) => {
          if (result.dispatchError) {
            reject(new Error(result.dispatchError.toString()));
            return;
          }
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
