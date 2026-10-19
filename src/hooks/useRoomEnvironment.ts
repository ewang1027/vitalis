import { useState, useEffect } from 'react';
import { useESP32Data } from './useESP32Data';
import { simulateEnvironment, clearEnvironmentHistory } from '@/utils/simulateEnvironment';

// A node that hasn't reported for this long is shown as offline.
const STALE_MS = 10000;

export interface RoomEnvironmentData {
  temperature: number;
  humidity: number;
  motion: boolean;
  distance: number;
  inBed: boolean;
  light: number;
  // esp32: this room's node, fresh. esp32-offline: this room's node, stale.
  // simulated: no node has reported for this room.
  dataSource: 'esp32' | 'esp32-offline' | 'simulated';
  deviceId?: string;
  simulatedNode?: boolean; // the node runs the esp32dev-sim firmware
  receivedAt?: number;
}

interface UseRoomEnvironmentOptions {
  roomId: string | null;
  roomNumber?: string | null;
  enableSimulation?: boolean;
  updateInterval?: number;
}

/**
 * Room environment from this room's own sensor node. Rooms with no node fall
 * back to simulated values, marked dataSource 'simulated'.
 */
export function useRoomEnvironment({
  roomId,
  roomNumber,
  enableSimulation = true,
  updateInterval = 2000,
}: UseRoomEnvironmentOptions): RoomEnvironmentData | null {
  const reading = useESP32Data([roomId, roomNumber]);
  const [simulated, setSimulated] = useState<RoomEnvironmentData | null>(null);
  const [, setTick] = useState(0);
  const hasNode = reading !== null;
  const simKey = roomId || roomNumber || 'unknown-room';

  useEffect(() => {
    if (hasNode) {
      // Re-render so a node that goes quiet flips to offline.
      const timer = setInterval(() => setTick((n) => n + 1), updateInterval);
      return () => clearInterval(timer);
    }
    if (!enableSimulation) {
      setSimulated(null);
      return;
    }
    const update = () => {
      setSimulated({ ...simulateEnvironment(simKey), dataSource: 'simulated' });
    };
    update();
    const timer = setInterval(update, updateInterval);
    return () => clearInterval(timer);
  }, [hasNode, enableSimulation, updateInterval, simKey]);

  useEffect(() => {
    return () => {
      clearEnvironmentHistory(simKey);
    };
  }, [simKey]);

  if (!reading) return simulated;

  const data = reading.data;
  const custom = data.customSensors ?? {};
  return {
    temperature: data.temperature ?? 22,
    humidity: data.humidity ?? 50,
    motion: data.motion ?? false,
    distance: typeof custom.distance === 'number' ? custom.distance : 150,
    inBed: typeof custom.inBed === 'boolean' ? custom.inBed : false,
    light: data.light ?? 400,
    dataSource: Date.now() - reading.receivedAt > STALE_MS ? 'esp32-offline' : 'esp32',
    deviceId: data.deviceId,
    simulatedNode: custom.simulated === true,
    receivedAt: reading.receivedAt,
  };
}
