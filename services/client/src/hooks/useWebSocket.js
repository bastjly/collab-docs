import { useEffect, useRef, useCallback } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3002';

export function useWebSocket(token, documentId = null) {
  const ws = useRef(null);
  const listeners = useRef(new Map());

  const send = useCallback((message) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  }, []);

  const on = useCallback((type, handler) => {
    if (!listeners.current.has(type)) listeners.current.set(type, new Set());
    listeners.current.get(type).add(handler);
    return () => listeners.current.get(type)?.delete(handler);
  }, []);

  useEffect(() => {
    if (!token) return;

    const socket = new WebSocket(`${WS_URL}?token=${token}`);
    ws.current = socket;

    socket.onopen = () => {
      if (documentId) send({ type: 'join', documentId });
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        listeners.current.get(msg.type)?.forEach(handler => handler(msg));
      } catch {}
    };

    return () => {
      socket.close();
      ws.current = null;
    };
  }, [token, documentId, send]);

  return { send, on };
}
