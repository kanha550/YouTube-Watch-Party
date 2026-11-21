type MessageHandler = (payload: any) => void;

class WebSocketClient {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<MessageHandler>> = new Map();
  private reconnectTimeout: any = null;
  private isIntentionalClose = false;
  private url = '';

  public isConnected = false;

  private resolveUrl(): string {
    const envWsUrl = (import.meta as any).env?.VITE_WS_URL;
    if (envWsUrl) return envWsUrl;

    // In dev mode (vite on 5173), default backend is on port 3001
    const isLocalVite = window.location.port === '5173';
    const wsHost = isLocalVite ? `${window.location.hostname}:3001` : window.location.host;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${wsHost}`;
  }

  connect(customUrl?: string): Promise<void> {
    this.isIntentionalClose = false;
    const targetUrl = customUrl || this.resolveUrl();

    // If socket is already OPEN or CONNECTING to this URL, reuse it (prevents React StrictMode reconnect churn)
    if (this.socket && this.url === targetUrl) {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.isConnected = true;
        return Promise.resolve();
      }
      if (this.socket.readyState === WebSocket.CONNECTING) {
        return Promise.resolve();
      }
    }

    this.url = targetUrl;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Cleanly close existing socket without triggering false reconnect loops
    if (this.socket) {
      const old = this.socket;
      old.onopen = null;
      old.onmessage = null;
      old.onerror = null;
      old.onclose = null;
      try {
        old.close();
      } catch (_) {}
      this.socket = null;
    }

    return new Promise((resolve) => {
      try {
        const socket = new WebSocket(this.url);
        this.socket = socket;

        socket.onopen = () => {
          if (this.socket !== socket) return;
          this.isConnected = true;
          this.emit('connection_change', { connected: true });
          resolve();
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type) {
              this.emit(data.type, data);
            }
            this.emit('*', data);
          } catch (e) {
            console.error('Failed to parse WebSocket message:', e);
          }
        };

        socket.onerror = (err) => {
          console.warn('WebSocket connection issue:', err);
          this.emit('error', { message: 'WebSocket connection error' });
        };

        socket.onclose = () => {
          if (this.socket === socket) {
            this.isConnected = false;
            this.emit('connection_change', { connected: false });
            if (!this.isIntentionalClose) {
              this.scheduleReconnect();
            }
          }
        };
      } catch (err) {
        console.error('Failed to initialize WebSocket:', err);
        this.scheduleReconnect();
        resolve();
      }
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, 2500);
  }

  send(type: string, payload: Record<string, any> = {}) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, ...payload }));
    } else {
      console.warn('Socket not connected, cannot send:', type);
    }
  }

  on(event: string, handler: MessageHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: MessageHandler) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private emit(event: string, payload: any) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((h) => {
        try {
          h(payload);
        } catch (err) {
          console.error(`Error in handler for event "${event}":`, err);
        }
      });
    }
  }

  disconnect() {
    this.isIntentionalClose = true;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.socket) {
      const old = this.socket;
      old.onopen = null;
      old.onmessage = null;
      old.onerror = null;
      old.onclose = null;
      try {
        old.close();
      } catch (_) {}
      this.socket = null;
    }
    this.isConnected = false;
  }
}

export const wsClient = new WebSocketClient();
