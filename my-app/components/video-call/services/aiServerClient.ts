export interface AIServerLandmark {
  x: number;
  y: number;
}

export interface AIServerResult {
  found: boolean;
  pitch: number;
  yaw: number;
  roll: number;
  landmarks: AIServerLandmark[]; // 98 landmarks
}

export class AIServerClient {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private onResultCallback: ((result: AIServerResult) => void) | null = null;

  constructor(
    private serverUrl: string = 'ws://localhost:8000/ws/face-tracking',
    private onConnect?: () => void,
    private onDisconnect?: () => void,
    private onError?: (error: Event) => void
  ) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Already connecting'));
        return;
      }

      this.isConnecting = true;

      try {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          console.log(' Connected to AI Server');
          this.isConnecting = false;
          this.onConnect?.();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const result: AIServerResult = JSON.parse(event.data);
            this.onResultCallback?.(result);
          } catch (error) {
            console.error('Error parsing AI Server response:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error(' AI Server WebSocket error:', error);
          this.isConnecting = false;
          this.onError?.(error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('🔌 Disconnected from AI Server');
          this.isConnecting = false;
          this.onDisconnect?.();
          this.attemptReconnect();
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private attemptReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      console.log(' Attempting to reconnect to AI Server...');
      this.connect().catch(console.error);
    }, 3000);
  }

  sendFrame(base64Image: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(base64Image);
    } else {
      console.warn(' WebSocket not connected, cannot send frame');
    }
  }

  onResult(callback: (result: AIServerResult) => void) {
    this.onResultCallback = callback;
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.onResultCallback = null;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}