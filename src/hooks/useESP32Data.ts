import { useEffect, useState } from 'react';
import {
  esp32WebSocket,
  ESP32HardwareData,
  WebSocketMessage,
} from '@/services/esp32WebSocket';

interface UseESP32DataReturn {
  data: ESP32HardwareData | null;
  isConnected: boolean;
  history: ESP32HardwareData[];
  error: string | null;
}

export function useESP32Data(
  maxHistorySize: number = 50
): UseESP32DataReturn {
  const [data, setData] = useState<ESP32HardwareData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [history, setHistory] = useState<ESP32HardwareData[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Connect to WebSocket
    esp32WebSocket.connect();

    // Subscribe to messages
    const unsubscribe = esp32WebSocket.subscribe(
      (message: WebSocketMessage) => {
        if (message.type === 'connection') {
          setIsConnected(true);
          setError(null);
        } else if (message.type === 'hardware_update' && message.data) {
          setData(message.data);
          setHistory((prev) => {
            const newHistory = [message.data!, ...prev].slice(
              0,
              maxHistorySize
            );
            return newHistory;
          });
          setError(null);
        } else if (message.type === 'error') {
          setError(message.message || 'Unknown error occurred');
        }

        // Update connection status
        setIsConnected(esp32WebSocket.isConnected());
      }
    );

    // Cleanup on unmount
    return () => {
      unsubscribe();
      esp32WebSocket.disconnect();
    };
  }, [maxHistorySize]);

  return { data, isConnected, history, error };
}
