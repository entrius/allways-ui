import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  connectBitcoin,
  type BitcoinConnection,
  type BitcoinSource,
} from './bitcoin';
import { connectSubstrate, type SubstrateConnection } from './substrate';

interface WalletContextValue {
  substrate: SubstrateConnection | null;
  bitcoin: BitcoinConnection | null;
  /** True after the user has dismissed the "no Substrate wallet" banner. */
  acknowledgedSubstrateOptional: boolean;
  connectSubstrateWallet: () => Promise<SubstrateConnection>;
  connectBitcoinWallet: (source: BitcoinSource) => Promise<BitcoinConnection>;
  disconnect: () => void;
  acknowledgeSubstrateOptional: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [substrate, setSubstrate] = useState<SubstrateConnection | null>(null);
  const [bitcoin, setBitcoin] = useState<BitcoinConnection | null>(null);
  const [acknowledgedSubstrateOptional, setAcknowledged] = useState(false);

  const connectSubstrateWallet = useCallback(async () => {
    const conn = await connectSubstrate();
    setSubstrate(conn);
    return conn;
  }, []);

  const connectBitcoinWallet = useCallback(async (source: BitcoinSource) => {
    const conn = await connectBitcoin(source);
    setBitcoin(conn);
    return conn;
  }, []);

  const disconnect = useCallback(() => {
    setSubstrate(null);
    setBitcoin(null);
  }, []);

  const acknowledgeSubstrateOptional = useCallback(() => {
    setAcknowledged(true);
  }, []);

  const value = useMemo<WalletContextValue>(
    () => ({
      substrate,
      bitcoin,
      acknowledgedSubstrateOptional,
      connectSubstrateWallet,
      connectBitcoinWallet,
      disconnect,
      acknowledgeSubstrateOptional,
    }),
    [
      substrate,
      bitcoin,
      acknowledgedSubstrateOptional,
      connectSubstrateWallet,
      connectBitcoinWallet,
      disconnect,
      acknowledgeSubstrateOptional,
    ],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextValue => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside <WalletProvider>');
  return ctx;
};
