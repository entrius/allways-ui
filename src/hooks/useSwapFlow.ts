import { useCallback, useMemo, useState } from 'react';
import type { AxiosError } from 'axios';
import {
  fetchConfirmProof,
  fetchReserveProof,
  isRateChangedError,
  useConfirmMutation,
  useReserveMutation,
} from '../api/SwapApi';
import type {
  BestMinerResponse,
  RateChangedError,
  ReserveResponse,
} from '../api/SwapApiClient';
import type { BitcoinConnection } from '../wallet/bitcoin';
import type { SubstrateConnection } from '../wallet/substrate';
import { usePendingSwap, type PendingSwap } from './usePendingSwap';

/* ---------- State ---------- */

export type SwapPhase =
  | 'idle'
  | 'awaitingReserveSig'
  | 'reserving'
  | 'reserved'
  | 'awaitingSend'
  | 'sending'
  | 'awaitingConfirmSig'
  | 'confirming'
  | 'watching'
  | 'done'
  | 'error';

export interface SwapFlowState {
  phase: SwapPhase;
  reserve?: ReserveResponse;
  swapId?: number;
  sourceTxHash?: string;
  error?: string;
  rateChanged?: RateChangedError;
}

export interface SwapInputs {
  best: BestMinerResponse;
  fromChain: string;
  toChain: string;
  fromAmount: number;
  toAmount: number;
  taoAmount: number;
  fromAddress: string;
  /** Destination for the user's receive side. */
  toAddress: string;
  blockAnchor: number;
}

/* ---------- Internal signer abstraction ---------- */

interface SourceSigner {
  signMessage: (msg: string) => Promise<string>;
  sendFunds: (to: string, amount: number) => Promise<string>;
}

const wrapSigner = (
  chain: string,
  bitcoin: BitcoinConnection | null,
  substrate: SubstrateConnection | null,
): SourceSigner | null => {
  const c = chain.toLowerCase();
  if (c === 'btc' && bitcoin) {
    return {
      signMessage: (msg) => bitcoin.signMessage(msg),
      sendFunds: (to, sats) => bitcoin.sendBitcoin(to, sats),
    };
  }
  if (c === 'tao' && substrate) {
    return {
      signMessage: (msg) => substrate.signRaw(msg),
      sendFunds: () =>
        Promise.reject(
          new Error(
            'TAO-source send not implemented in v1 — use the CLI for now (`alw swap`).',
          ),
        ),
    };
  }
  return null;
};

/* ---------- Hook ---------- */

export const useSwapFlow = (params: {
  substrate: SubstrateConnection | null;
  bitcoin: BitcoinConnection | null;
}) => {
  const { substrate, bitcoin } = params;
  const [state, setState] = useState<SwapFlowState>({ phase: 'idle' });
  const reserveMut = useReserveMutation();
  const confirmMut = useConfirmMutation();
  const { pending, save, merge, clear } = usePendingSwap();

  const reset = useCallback(() => {
    setState({ phase: 'idle' });
    reserveMut.reset();
    confirmMut.reset();
  }, [reserveMut, confirmMut]);

  const begin = useCallback(
    async (inputs: SwapInputs) => {
      try {
        const signer = wrapSigner(inputs.fromChain, bitcoin, substrate);
        if (!signer) {
          throw new Error(
            `No connected wallet for ${inputs.fromChain.toUpperCase()} source chain`,
          );
        }

        // Persist intent FIRST — protects against a refresh between sign and
        // reserve broadcast. blockAnchor + miner + fromAddress is the resume key.
        save({
          minerHotkey: inputs.best.minerHotkey,
          fromAddress: inputs.fromAddress,
          toAddress: inputs.toAddress,
          fromChain: inputs.fromChain,
          toChain: inputs.toChain,
          fromAmount: inputs.fromAmount,
          toAmount: inputs.toAmount,
          taoAmount: inputs.taoAmount,
          expectedRate: inputs.best.rate,
          blockAnchor: inputs.blockAnchor,
        });

        setState({ phase: 'awaitingReserveSig' });
        const proof = await fetchReserveProof(
          inputs.fromAddress,
          inputs.blockAnchor,
        );
        const signature = await signer.signMessage(proof.message);
        merge({ reserveSignature: signature });

        setState({ phase: 'reserving' });
        const reserve = await reserveMut.mutateAsync({
          minerHotkey: inputs.best.minerHotkey,
          fromChain: inputs.fromChain,
          toChain: inputs.toChain,
          taoAmount: inputs.taoAmount,
          fromAmount: inputs.fromAmount,
          toAmount: inputs.toAmount,
          fromAddress: inputs.fromAddress,
          fromAddressProof: signature,
          blockAnchor: inputs.blockAnchor,
          expectedRate: inputs.best.rate,
        });
        merge({
          requestHash: reserve.requestHash,
          minerSourceAddress: reserve.minerSourceAddress,
          reservedUntilBlock: reserve.reservedUntilBlock,
        });
        setState({ phase: 'awaitingSend', reserve });
      } catch (err) {
        const axiosErr = err as AxiosError<
          RateChangedError | { detail: string }
        >;
        if (isRateChangedError(axiosErr) && axiosErr.response) {
          setState({
            phase: 'error',
            rateChanged: axiosErr.response.data as RateChangedError,
            error: 'Miner rate changed since quote',
          });
          return;
        }
        setState({
          phase: 'error',
          error: (err as Error).message ?? 'Reservation failed',
        });
      }
    },
    [bitcoin, merge, reserveMut, save, substrate],
  );

  const sendAndConfirm = useCallback(async () => {
    if (!pending || !state.reserve) {
      setState({ phase: 'error', error: 'No active reservation' });
      return;
    }
    try {
      const signer = wrapSigner(pending.fromChain, bitcoin, substrate);
      if (!signer) {
        throw new Error(
          `No connected wallet for ${pending.fromChain.toUpperCase()} source chain`,
        );
      }

      setState({ phase: 'sending', reserve: state.reserve });
      const txHash =
        pending.sourceTxHash ??
        (await signer.sendFunds(
          state.reserve.minerSourceAddress,
          pending.fromAmount,
        ));
      merge({ sourceTxHash: txHash });

      setState({
        phase: 'awaitingConfirmSig',
        reserve: state.reserve,
        sourceTxHash: txHash,
      });
      const proof = await fetchConfirmProof(txHash);
      const signature = await signer.signMessage(proof.message);

      setState({
        phase: 'confirming',
        reserve: state.reserve,
        sourceTxHash: txHash,
      });
      const confirm = await confirmMut.mutateAsync({
        requestHash: state.reserve.requestHash,
        minerHotkey: state.reserve.minerHotkey,
        fromTxHash: txHash,
        fromTxProof: signature,
        fromAddress: pending.fromAddress,
        toAddress: pending.toAddress,
        fromChain: pending.fromChain,
        toChain: pending.toChain,
        fromTxBlock: 0,
      });

      if (!confirm.accepted) {
        setState({
          phase: 'error',
          error: confirm.rejection ?? 'Validators rejected confirm',
        });
        return;
      }

      if (confirm.swapId !== undefined) {
        merge({ swapId: confirm.swapId });
      }
      setState({
        phase: 'watching',
        reserve: state.reserve,
        sourceTxHash: txHash,
        swapId: confirm.swapId,
      });
    } catch (err) {
      setState({
        phase: 'error',
        error: (err as Error).message ?? 'Confirm failed',
      });
    }
  }, [bitcoin, confirmMut, merge, pending, state.reserve, substrate]);

  const markDone = useCallback(() => {
    setState((s) => ({ ...s, phase: 'done' }));
  }, []);

  return useMemo(
    () => ({
      state,
      pending,
      begin,
      sendAndConfirm,
      reset,
      clear,
      markDone,
    }),
    [state, pending, begin, sendAndConfirm, reset, clear, markDone],
  );
};

export type { PendingSwap };
