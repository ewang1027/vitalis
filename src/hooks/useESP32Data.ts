import { useEffect, useState } from 'react';
import {
  esp32WebSocket,
  ESP32HardwareData,
  WebSocketMessage,
} from '@/services/esp32WebSocket';

interface UseESP32DataReturn {
  data: ESP32HardwareData | null;
  isConnected: boolean;
}

export function useESP32Data(): UseESP32DataReturn {
  const [data, setData] = useState<ESP32HardwareData | null>(null);
  const [isConnected, setIsConnected] = useState(() =>
    esp32WebSocket.isConnected()
  );

  useEffect(() => {
    // Connect to WebSocket
    esp32WebSocket.connect();

    // Subscribe to messages
    const unsubscribe = esp32WebSocket.subscribe(
      (message: WebSocketMessage) => {
        if (message.type === 'connection') {
          setIsConnected(true);
        } else if (message.type === 'hardware_update' && message.data) {
          setData(message.data);
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
  }, []);

  return { data, isConnected };
}
