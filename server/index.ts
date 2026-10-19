import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

// Pick up OPENROUTER_API_KEY (and PORT) from .env. Vite only hands VITE_
// variables to the browser, so the key stays on this server.
try {
  process.loadEnvFile();
} catch {
  // no .env file, use the real environment
}

const app = express();
const PORT = Number(process.env.PORT) || 3001;
// Loopback only by default. Set SERVER_HOST=0.0.0.0 so an ESP32 on the LAN, or
// a hosting proxy, can reach the server.
const HOST = process.env.SERVER_HOST || '127.0.0.1';

// Browser origins allowed to use the server, comma-separated.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:8080')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

// Middleware
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json({ limit: '1mb' })); // agent requests carry the chat history

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

// OpenRouter proxy. The frontend sends the same body it used to send to
// OpenRouter directly, and this adds the API key.
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Only the models the app uses, so the key can't be spent on anything else.
const LLM_MODELS = new Set([
  'anthropic/claude-3-haiku',
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3-sonnet',
  'meta-llama/llama-3.1-8b-instruct:free',
]);
const LLM_MAX_TOKENS = 2000;

// Per-IP token bucket: a burst of LLM_BURST requests, refilled at
// LLM_PER_MINUTE a minute. One chat message can take several requests
// (tool calls, retries, model fallback), so the burst is generous.
const LLM_BURST = 30;
const LLM_PER_MINUTE = 30;
const llmBuckets = new Map<string, { tokens: number; updated: number }>();

function takeLlmToken(ip: string): number {
  const now = Date.now();
  const bucket = llmBuckets.get(ip) ?? { tokens: LLM_BURST, updated: now };
  bucket.tokens = Math.min(LLM_BURST, bucket.tokens + ((now - bucket.updated) / 60000) * LLM_PER_MINUTE);
  bucket.updated = now;
  llmBuckets.set(ip, bucket);
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return 0;
  }
  return Math.ceil(((1 - bucket.tokens) / LLM_PER_MINUTE) * 60); // seconds until the next token
}

// Forget buckets that have refilled, so the map doesn't grow forever.
setInterval(() => {
  const cutoff = Date.now() - (LLM_BURST / LLM_PER_MINUTE) * 60000;
  for (const [ip, bucket] of llmBuckets) {
    if (bucket.updated < cutoff) llmBuckets.delete(ip);
  }
}, 10 * 60000).unref();

app.post('/api/llm', async (req, res) => {
  // Only the dashboard's own origin. Browsers always send Origin on this
  // cross-origin POST, so a missing one means a script, not the app.
  const origin = req.get('origin');
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    res.status(403).json({ error: { message: `Origin not allowed: ${origin ?? 'none'}` } });
    return;
  }

  const retryAfter = takeLlmToken(req.ip ?? 'unknown');
  if (retryAfter > 0) {
    res.set('Retry-After', String(retryAfter));
    res.status(429).json({ error: { message: `Too many LLM requests, try again in ${retryAfter} s` } });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(503).json({
      error: {
        code: 'llm_not_configured',
        message: 'OPENROUTER_API_KEY is not set on the server (add it to .env and restart the server)',
      },
    });
    return;
  }

  const { model, messages, tools, tool_choice, temperature, max_tokens } = req.body ?? {};
  if (typeof model !== 'string' || !LLM_MODELS.has(model)) {
    res.status(400).json({ error: { message: `Model not allowed: ${String(model)}` } });
    return;
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: { message: 'messages must be a non-empty array' } });
    return;
  }

  try {
    const upstream = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': origin,
        'X-Title': 'Vitalis',
      },
      body: JSON.stringify({
        model,
        messages,
        tools,
        tool_choice,
        temperature,
        max_tokens: Math.min(Number(max_tokens) || LLM_MAX_TOKENS, LLM_MAX_TOKENS),
      }),
    });
    // Pass OpenRouter's status and body through so the frontend's retry and
    // model fallback logic sees the same responses as before.
    const body = await upstream.text();
    res
      .status(upstream.status)
      .type(upstream.headers.get('content-type') || 'application/json')
      .send(body);
  } catch (error) {
    console.error('OpenRouter request failed:', error);
    res.status(502).json({
      error: {
        message: `Could not reach OpenRouter: ${error instanceof Error ? error.message : 'unknown error'}`,
      },
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    connectedClients: clients.size,
    llmConfigured: Boolean(process.env.OPENROUTER_API_KEY),
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
server.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}, allowing origins ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`HTTP API: http://localhost:${PORT}/api/hardware`);
  console.log(`WebSocket: ws://localhost:${PORT}`);
  console.log(`LLM proxy: http://localhost:${PORT}/api/llm${process.env.OPENROUTER_API_KEY ? '' : ' (OPENROUTER_API_KEY not set)'}`);
});
