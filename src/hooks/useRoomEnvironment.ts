import { useState, useEffect, useRef } from 'react';
import { useESP32Data } from './useESP32Data';
import { simulateEnvironment, clearEnvironmentHistory, type EnvironmentData } from '@/utils/simulateEnvironment';

interface RoomEnvironmentData {
  temperature: number;
  humidity: number;
  motion: boolean;
  distance: number;
  inBed: boolean;
  light: number;
  dataSource: 'esp32' | 'simulated';
}

interface UseRoomEnvironmentOptions {
  roomId: string;
  enableSimulation?: boolean;
  updateInterval?: number;
}

/**
 * Hook that provides room environment data with fallback to realistic simulation
 */
export function useRoomEnvironment({
  roomId,
  enableSimulation = true,
  updateInterval = 2000,
}: UseRoomEnvironmentOptions): RoomEnvironmentData | null {
  const { data: esp32Data, isConnected } = useESP32Data();
  const [envData, setEnvData] = useState<RoomEnvironmentData | null>(null);
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastESP32Update = useRef<number>(0);

  // Update with real ESP32 data when available
  useEffect(() => {
    if (esp32Data && isConnected) {
      lastESP32Update.current = Date.now();
      
      setEnvData({
        temperature: esp32Data.temperature ?? 22,
        humidity: esp32Data.humidity ?? 50,
        motion: esp32Data.motion ?? false,
        distance: esp32Data.customSensors?.distance ?? 150,
        inBed: esp32Data.customSensors?.inBed ?? false,
        light: esp32Data.light ?? 400,
        dataSource: 'esp32',
      });
    }
  }, [esp32Data, isConnected]);

  // Simulate environment when ESP32 data is stale or unavailable
  useEffect(() => {
    if (!enableSimulation) return;

    simulationIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const staleThreshold = 10000; // Consider data stale after 10 seconds
      const timeSinceESP32 = now - lastESP32Update.current;
      
      // Only simulate if no ESP32 data or data is stale
      if (!esp32Data || !isConnected || timeSinceESP32 > staleThreshold) {
        const simulated = simulateEnvironment(roomId);
        
        setEnvData({
          temperature: simulated.temperature,
          humidity: simulated.humidity,
          motion: simulated.motion,
          distance: simulated.distance,
          inBed: simulated.inBed,
          light: simulated.light,
          dataSource: 'simulated',
        });
      }
    }, updateInterval);

    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, [roomId, enableSimulation, updateInterval, esp32Data, isConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearEnvironmentHistory(roomId);
    };
  }, [roomId]);

  return envData;
}

