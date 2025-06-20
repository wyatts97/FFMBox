
import { useEffect, useRef, useState } from 'react';

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

export const useWebSocket = (onProgress: (update: ProgressUpdate) => void) => {
  const ws = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setConnected(true);
      console.log('WebSocket connected');
    };

    ws.current.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data) as ProgressUpdate;
        onProgress(update);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.current.onclose = () => {
      setConnected(false);
      console.log('WebSocket disconnected');
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [onProgress]);

  return { connected };
};
