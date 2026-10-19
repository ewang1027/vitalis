// Base URL of the Express server in server/index.ts. Local dev uses the server
// on port 3001; a hosted build sets VITE_SERVER_URL at build time.
const raw = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export const SERVER_URL = raw.replace(/\/+$/, '');

// Same host for the sensor WebSocket: http -> ws, https -> wss.
export const SERVER_WS_URL = SERVER_URL.replace(/^http/i, 'ws');
