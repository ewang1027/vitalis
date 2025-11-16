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
  timestamp: number;
  temperature?: number;
  humidity?: number;
  pressure?: number;
  light?: number;
  motion?: boolean;
  batteryLevel?: number;
  customSensors?: Record<string, unknown>;
}

// HTTP endpoint for ESP32 to send hardware data
app.post('/api/hardware', (req, res) => {
  try {
    const hardwareData: ESP32HardwareData = {
      ...req.body,
      timestamp: Date.now(),
    };

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

  // Send initial connection message
  ws.send(
    JSON.stringify({
      type: 'connection',
      message: 'Connected to ESP32 hardware data stream',
      timestamp: Date.now(),
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
