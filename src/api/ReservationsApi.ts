import { useApiQuery } from './ApiUtils';
import { SSE_FALLBACK_INTERVAL } from './constants';
import { type Reservation } from './models';

export const useReservation = (requestHash: string) =>
  useApiQuery<Reservation>(
    'reservation',
    `/reservations/${requestHash}`,
    SSE_FALLBACK_INTERVAL,
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
