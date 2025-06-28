import { useCallback, useEffect, useRef, useState } from 'react';

export interface ProgressUpdate {
  type: 'progress';
  conversionId: string;
  progress: {
    status: 'processing' | 'completed' | 'error';
    percent?: number;
    timemark?: string;
    error?: string;
    downloadUrl?: string;
  };
}

export interface WebSocketState {
  connected: boolean;
  error: string | null;
}

export interface UseWebSocketReturn extends WebSocketState {
  reconnect: () => void;
  subscribe: (conversionId: string) => void;
  unsubscribe: (conversionId: string) => void;
}

export const useWebSocket = (onProgress: (update: ProgressUpdate) => void): UseWebSocketReturn => {
  const ws = useRef<WebSocket | null>(null);
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    error: null,
  });
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<number>();

  const connect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
    }

    // Use the environment variable for the WebSocket URL
    const wsUrl = import.meta.env.VITE_WS_URL || `ws://${window.location.host}/ws`;

    try {
      ws.current = new WebSocket(wsUrl);
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setState({ connected: false, error: 'Failed to create WebSocket' });
      return;
    }

    ws.current.onopen = () => {
      setState({ connected: true, error: null });
      reconnectAttempts.current = 0;
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.type === 'progress' && data.conversionId) {
          onProgress(data);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    ws.current.onclose = () => {
      setState({ connected: false, error: 'WebSocket disconnected' });
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      reconnectAttempts.current++;
      reconnectTimeout.current = window.setTimeout(connect, delay);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setState({ connected: false, error: 'WebSocket error' });
    };

  }, [onProgress]);

  useEffect(() => {
    connect();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
      clearTimeout(reconnectTimeout.current);
    };
  }, [connect]);

  const subscribe = useCallback((conversionId: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'subscribe', conversionId }));
    }
  }, []);

  const unsubscribe = useCallback((conversionId: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'unsubscribe', conversionId }));
    }
  }, []);

  return { ...state, reconnect: connect, subscribe, unsubscribe };
};
