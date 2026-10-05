export interface ESP32HardwareData {
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

export interface WebSocketMessage {
  type: 'connection' | 'hardware_update' | 'error';
  data?: ESP32HardwareData;
  message?: string;
  timestamp: number;
}

type MessageHandler = (message: WebSocketMessage) => void;

class ESP32WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: number = 3000;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private users: number = 0;
  private url: string;

  constructor(url: string = 'ws://localhost:3001') {
    this.url = url;
  }

  // Several hooks share this singleton (the room view mounts two), so count
  // users and keep one socket open until the last one disconnects.
  connect(): void {
    this.users++;
    this.open();
  }

  private open(): void {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    try {
      const ws = new WebSocket(this.url);
      this.ws = ws;

      ws.onopen = () => {
        console.log('Connected to ESP32 WebSocket server');
        this.reconnectAttempts = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.notifyHandlers(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('Disconnected from ESP32 WebSocket server');
        if (this.ws !== ws) return;
        this.ws = null;
        if (this.users > 0) this.attemptReconnect();
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectTimer) return;
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
      );
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        if (this.users > 0) this.open();
      }, this.reconnectTimeout);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  subscribe(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);

    // Return unsubscribe function
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  private notifyHandlers(message: WebSocketMessage): void {
    this.messageHandlers.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });
  }

  disconnect(): void {
    this.users = Math.max(0, this.users - 1);
    if (this.users > 0) return;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
    if (this.ws) {
      const ws = this.ws;
      this.ws = null;
      ws.close();
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const esp32WebSocket = new ESP32WebSocketService();
