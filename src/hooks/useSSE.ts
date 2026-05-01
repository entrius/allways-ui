import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const SSE_URL = `${import.meta.env.VITE_REACT_APP_BASE_URL}/sse`;

export function useSSE() {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(SSE_URL);
    eventSourceRef.current = es;

    es.addEventListener('event', () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['chainState'] });
    });

    es.addEventListener('miner', () => {
      queryClient.invalidateQueries({ queryKey: ['miners'] });
      queryClient.invalidateQueries({ queryKey: ['miner'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    });

    es.addEventListener('swap', () => {
      queryClient.invalidateQueries({ queryKey: ['swaps'] });
      queryClient.invalidateQueries({ queryKey: ['swap'] });
      queryClient.invalidateQueries({ queryKey: ['allSwaps'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      // SwapInitiated/Completed/TimedOut also transition the originating
      // reservation row, so refresh those views too.
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['reservation'] });
      queryClient.invalidateQueries({ queryKey: ['reservationsBySource'] });
    });

    es.addEventListener('reservation', () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['reservation'] });
      queryClient.invalidateQueries({ queryKey: ['reservationsBySource'] });
    });

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [queryClient]);

  return eventSourceRef;
}
