import {
  web3Accounts,
  web3Enable,
  web3FromAddress,
} from '@polkadot/extension-dapp';
import { stringToHex } from '@polkadot/util';

// Thin wrapper over the injected-wallet API. Real connect + signature; no
// backend verification (the signature is stored client-side as a stand-in for
// what a future Allways Access API would verify).

const APP_NAME = 'Allways Access';

export interface WalletAccount {
  address: string;
  name?: string;
  source: string; // injecting extension, e.g. 'polkadot-js' | 'talisman' | 'subwallet-js'
}

export class NoExtensionError extends Error {
  constructor() {
    super('NO_EXTENSION');
    this.name = 'NoExtensionError';
  }
}

// Discover every injected extension (Polkadot.js, Talisman, SubWallet, …) and
// return their accounts. Throws NoExtensionError if none are installed.
export const connectExtensions = async (): Promise<WalletAccount[]> => {
  const extensions = await web3Enable(APP_NAME);
  if (extensions.length === 0) throw new NoExtensionError();

  const accounts = await web3Accounts();
  return accounts.map((a) => ({
    address: a.address,
    name: a.meta.name,
    source: a.meta.source,
  }));
};

// Ask the extension to sign a human-readable challenge — proves control of the
// coldkey without sending a transaction.
export const signChallenge = async (address: string): Promise<string> => {
  const injector = await web3FromAddress(address);
  const signRaw = injector?.signer?.signRaw;
  if (!signRaw) throw new Error('NO_SIGNER');

  const challenge =
    'Allways Access — prove wallet ownership\n' +
    `Address: ${address}\n` +
    `Issued: ${new Date().toISOString()}`;

  const { signature } = await signRaw({
    address,
    data: stringToHex(challenge),
    type: 'bytes',
  });
  return signature;
};
