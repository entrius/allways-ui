/**
 * React Query hooks over swap-api endpoints.
 *
 * Conventions:
 * - Reads use `useQuery` with stable keys so they de-dupe across components.
 * - Writes use `useMutation` so callers can drive the swap state machine.
 */

import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import {
  swapApiClient,
  type BestMinerResponse,
  type ChainsResponse,
  type ConfirmRequest,
  type ConfirmResponse,
  type HealthResponse,
  type MinerSummary,
  type ProofMessage,
  type RateChangedError,
  type ReserveRequest,
  type ReserveResponse,
} from './SwapApiClient';

export const useSwapApiHealth = (): UseQueryResult<HealthResponse> =>
  useQuery({
    queryKey: ['swapApi', 'health'],
    queryFn: async () =>
      (await swapApiClient.get<HealthResponse>('/healthz')).data,
    refetchInterval: 30000,
    retry: false,
  });

export const useChains = (): UseQueryResult<ChainsResponse> =>
  useQuery({
    queryKey: ['swapApi', 'chains'],
    queryFn: async () =>
      (await swapApiClient.get<ChainsResponse>('/chains')).data,
    staleTime: 60 * 60 * 1000,
  });

export const useMinersForPair = (
  from: string,
  to: string,
  enabled = true,
): UseQueryResult<MinerSummary[]> =>
  useQuery({
    queryKey: ['swapApi', 'miners', from, to],
    queryFn: async () =>
      (
        await swapApiClient.get<MinerSummary[]>('/miners', {
          params: { from, to },
        })
      ).data,
    enabled: enabled && !!from && !!to && from !== to,
    refetchInterval: 15000,
  });

export const useBestMiner = (
  from: string,
  to: string,
  amount: number,
  enabled = true,
): UseQueryResult<BestMinerResponse> =>
  useQuery({
    queryKey: ['swapApi', 'best', from, to, amount],
    queryFn: async () =>
      (
        await swapApiClient.get<BestMinerResponse>('/miners/best', {
          params: { from, to, amount },
        })
      ).data,
    enabled: enabled && !!from && !!to && from !== to && amount > 0,
    refetchInterval: 15000,
    retry: false,
  });

export const fetchReserveProof = async (
  address: string,
  block: number,
): Promise<ProofMessage> =>
  (
    await swapApiClient.get<ProofMessage>('/proofs/reserve', {
      params: { address, block },
    })
  ).data;

export const fetchConfirmProof = async (
  txHash: string,
): Promise<ProofMessage> =>
  (
    await swapApiClient.get<ProofMessage>('/proofs/confirm', {
      params: { txHash },
    })
  ).data;

export const useReserveMutation = (): UseMutationResult<
  ReserveResponse,
  AxiosError<RateChangedError | { detail: string }>,
  ReserveRequest
> =>
  useMutation({
    mutationFn: async (req: ReserveRequest) =>
      (await swapApiClient.post<ReserveResponse>('/reserve', req)).data,
  });

export const useConfirmMutation = (): UseMutationResult<
  ConfirmResponse,
  AxiosError<{ detail: string }>,
  ConfirmRequest
> =>
  useMutation({
    mutationFn: async (req: ConfirmRequest) =>
      (await swapApiClient.post<ConfirmResponse>('/confirm', req)).data,
  });

export const isRateChangedError = (
  err: AxiosError<RateChangedError | { detail: string }> | null | undefined,
): err is AxiosError<RateChangedError> => {
  if (!err || err.response?.status !== 409) return false;
  const data = err.response?.data as Partial<RateChangedError> | undefined;
  return data?.code === 'RateChanged';
};
