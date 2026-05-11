/**
 * Axios client + types for the swap-api FastAPI service (spec §6).
 *
 * Distinct from the das-allways read API (`ApiUtils.ts`) — swap-api is the
 * stateless mutating surface that wraps the CLI flow.
 */

import axios, { type AxiosInstance } from 'axios';

export const SWAP_API_BASE_URL =
  (import.meta.env.VITE_SWAP_API_URL as string | undefined) ??
  'http://localhost:8000';

export const swapApiClient: AxiosInstance = axios.create({
  baseURL: SWAP_API_BASE_URL,
  timeout: 30000,
});

/* ---------- Types — mirror Pydantic shapes in allways/swap_api/models.py ---------- */

export interface HealthResponse {
  ok: boolean;
  chainBlock: number | null;
  contractAddress: string;
}

export interface ChainInfo {
  id: string;
  name: string;
  decimals: number;
  native_unit: string;
}

export interface ChainsResponse {
  chains: ChainInfo[];
  pairs: Array<[string, string]>;
}

export interface MinerSummary {
  hotkey: string;
  rate: string;
  collateralRao: number;
  isActive: boolean;
  hasActiveSwap: boolean;
}

export interface BestMinerResponse {
  minerHotkey: string;
  rate: string;
  expectedOut: number;
  reservationCapacity: number;
  sourceAddress: string;
  freshAsOf: number;
}

export interface ProofMessage {
  message: string;
}

export interface ReserveRequest {
  minerHotkey: string;
  fromChain: string;
  toChain: string;
  taoAmount: number;
  fromAmount: number;
  toAmount: number;
  fromAddress: string;
  fromAddressProof: string;
  blockAnchor: number;
  expectedRate: string;
}

export interface ReserveResponse {
  requestHash: string;
  reservedUntilBlock: number;
  minerSourceAddress: string;
  minerHotkey: string;
}

export interface ConfirmRequest {
  requestHash: string;
  /**
   * PR #1 spec deviation: confirm body MUST include minerHotkey.
   * The browser already receives it in the ReserveResponse, so just thread it
   * through.
   */
  minerHotkey: string;
  fromTxHash: string;
  fromTxProof: string;
  fromAddress: string;
  toAddress: string;
  fromChain: string;
  toChain: string;
  fromTxBlock: number;
}

export interface ConfirmResponse {
  accepted: boolean;
  swapId?: number;
  rejection?: string;
}

export interface RateChangedError {
  code: 'RateChanged';
  expected: string;
  actual: string;
}
