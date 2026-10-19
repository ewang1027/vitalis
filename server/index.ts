import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Store connected WebSocket clients
const clients = new Set<WebSocket>();

// ESP32 Hardware Data Interface
interface ESP32HardwareData {
  deviceId?: string;
  roomId: string;
  timestamp: number;
  temperature?: number;
  humidity?: number;
  pressure?: number;
  light?: number;
  motion?: boolean;
  batteryLevel?: number;
  customSensors?: Record<string, unknown>;
}

// Readings without a roomId (older firmware) are filed under this room.
const DEFAULT_ROOM_ID = 'default';

// Latest reading per room, sent to each dashboard when it connects.
const latestByRoom = new Map<string, ESP32HardwareData>();

function roomIdFrom(value: unknown): string {
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string' && value.trim()) return value.trim();
  return DEFAULT_ROOM_ID;
}

// HTTP endpoint for ESP32 to send hardware data
app.post('/api/hardware', (req, res) => {
  try {
    const hardwareData: ESP32HardwareData = {
      ...req.body,
      roomId: roomIdFrom(req.body?.roomId),
      timestamp: Date.now(),
    };
    latestByRoom.set(hardwareData.roomId, hardwareData);

    console.log('Received hardware data:', hardwareData);

    // Broadcast to all connected WebSocket clients
    const message = JSON.stringify({
      type: 'hardware_update',
      data: hardwareData,
    });

    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });

    res.status(200).json({
      success: true,
      message: 'Hardware data received and broadcasted',
      roomId: hardwareData.roomId,
      timestamp: hardwareData.timestamp,
    });
  } catch (error) {
    console.error('Error processing hardware data:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing hardware data',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Latest reading for every room that has reported since the server started
app.get('/api/hardware', (req, res) => {
  res.json({ timestamp: Date.now(), rooms: Object.fromEntries(latestByRoom) });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    connectedClients: clients.size,
  });
});

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket) => {
  console.log('New WebSocket client connected');
  clients.add(ws);

  // Send initial connection message with the latest reading per room
  ws.send(
    JSON.stringify({
      type: 'connection',
      message: 'Connected to ESP32 hardware data stream',
      timestamp: Date.now(),
      rooms: Object.fromEntries(latestByRoom),
    })
  );

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`HTTP API: http://localhost:${PORT}/api/hardware`);
  console.log(`WebSocket: ws://localhost:${PORT}`);
});
