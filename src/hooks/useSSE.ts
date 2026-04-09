import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const SSE_URL = `${import.meta.env.VITE_REACT_APP_BASE_URL}/sse`;
const MAX_RECONNECT_DELAY = 30000;

export function useSSE() {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    const es = new EventSource(SSE_URL);
    eventSourceRef.current = es;

    es.addEventListener('open', () => {
      reconnectAttempt.current = 0;
    });

    es.addEventListener('event', () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    });

    es.addEventListener('miner', () => {
      queryClient.invalidateQueries({ queryKey: ['miners'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    });

    es.addEventListener('swap', () => {
      queryClient.invalidateQueries({ queryKey: ['swaps'] });
      queryClient.invalidateQueries({ queryKey: ['swap'] });
      queryClient.invalidateQueries({ queryKey: ['allSwaps'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    });

    es.addEventListener('error', () => {
      es.close();
      eventSourceRef.current = null;
      const delay = Math.min(1000 * 2 ** reconnectAttempt.current, MAX_RECONNECT_DELAY);
      reconnectAttempt.current += 1;
      console.warn(`SSE connection lost. Reconnecting in ${delay}ms...`);
      reconnectTimer.current = setTimeout(connect, delay);
    });
  }, [queryClient]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [connect]);

  return eventSourceRef;
}
