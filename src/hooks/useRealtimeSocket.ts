import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL =
  import.meta.env.VITE_REACT_APP_BASE_URL || 'http://localhost:9081';

type MessageHandler = (type: string, data: any) => void;

export function useRealtimeSocket(onMessage?: MessageHandler) {
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();

  const handleMessage = useCallback(
    (type: string) => (data: any) => {
      // Invalidate relevant query caches
      switch (type) {
        case 'event':
          queryClient.invalidateQueries({ queryKey: ['events'] });
          queryClient.invalidateQueries({ queryKey: ['stats'] });
          break;
        case 'miner':
          queryClient.invalidateQueries({ queryKey: ['miners'] });
          queryClient.invalidateQueries({ queryKey: ['stats'] });
          break;
        case 'swap':
          queryClient.invalidateQueries({ queryKey: ['swaps'] });
          queryClient.invalidateQueries({ queryKey: ['stats'] });
          break;
      }
      onMessage?.(type, data);
    },
    [queryClient, onMessage],
  );

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socket.on('event', handleMessage('event'));
    socket.on('miner', handleMessage('miner'));
    socket.on('swap', handleMessage('swap'));

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [handleMessage]);

  return socketRef;
}
