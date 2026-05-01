import { useApiQuery } from './ApiUtils';
import { SSE_FALLBACK_INTERVAL } from './constants';
import { type Reservation } from './models';

export const useReservation = (requestHash: string) =>
  useApiQuery<Reservation>(
    'reservation',
    `/reservations/${requestHash}`,
    10_000,
    undefined,
    !!requestHash,
  );

export const useReservationsBySource = (sourceAddress: string) =>
  useApiQuery<Reservation[]>(
    'reservationsBySource',
    `/reservations/by-source/${sourceAddress}`,
    SSE_FALLBACK_INTERVAL,
    undefined,
    !!sourceAddress,
  );

export const useReservations = (params?: { limit?: number; offset?: number }) =>
  useApiQuery<Reservation[]>(
    'reservations',
    '/reservations',
    SSE_FALLBACK_INTERVAL,
    params,
  );
