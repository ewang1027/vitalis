export interface ESP32HardwareData {
  deviceId?: string;
  timestamp: number;
  temperature?: number;
  humidity?: number;
  pressure?: number;
  light?: number;
  motion?: boolean;
  batteryLevel?: number;
  customSensors?: Record<string, any>;
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
  private messageHandlers: Set<MessageHandler> = new Set();
  private url: string;

  constructor(url: string = 'ws://localhost:3001') {
    this.url = url;
  }

  connect(): void {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('Connected to ESP32 WebSocket server');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.notifyHandlers(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('Disconnected from ESP32 WebSocket server');
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
      );
      setTimeout(() => {
        this.connect();
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
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageHandlers.clear();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const esp32WebSocket = new ESP32WebSocketService();
