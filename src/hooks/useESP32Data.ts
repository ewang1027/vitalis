import { useEffect, useState } from 'react';
import {
  esp32WebSocket,
  RoomReading,
  WebSocketMessage,
} from '@/services/esp32WebSocket';

function findReading(roomIds: string[]): RoomReading | null {
  for (const id of roomIds) {
    const reading = esp32WebSocket.getReading(id);
    if (reading) return reading;
  }
  return null;
}

/**
 * Latest sensor node reading for one room. A node reports under its ROOM_ID,
 * so pass every id that room can go by (rooms.id, rooms.room_number).
 * Returns null when no node has reported for this room.
 */
export function useESP32Data(
  roomIds: Array<string | null | undefined>
): RoomReading | null {
  const key = roomIds.filter((id): id is string => !!id).join('\n');
  const [reading, setReading] = useState<RoomReading | null>(() =>
    findReading(key ? key.split('\n') : [])
  );

  useEffect(() => {
    const ids = key ? key.split('\n') : [];
    setReading(findReading(ids));

    esp32WebSocket.connect();
    const unsubscribe = esp32WebSocket.subscribe(
      (message: WebSocketMessage) => {
        if (
          message.type === 'connection' ||
          (message.type === 'hardware_update' &&
            message.data?.roomId &&
            ids.includes(message.data.roomId))
        ) {
          setReading(findReading(ids));
        }
      }
    );

    return () => {
      unsubscribe();
      esp32WebSocket.disconnect();
    };
  }, [key]);

  return reading;
}
