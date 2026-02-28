export interface ReconnectingWsOptions {
  url: string;
  sessionId: string;
  onOpen: () => void;
  onMessage: (msg: { type: string; [key: string]: unknown }) => void;
  onReconnected: () => void;
  onGaveUp: () => void;
  onSessionLost: () => void;
}

const PING_INTERVAL_MS = 25_000;
const PONG_TIMEOUT_MS = 10_000;
const HEARTBEAT_BACKOFF_BASE_MS = 1_000;
const HEARTBEAT_BACKOFF_CAP_MS = 30_000;
const GAVE_UP_THRESHOLD_MS = 30_000;

export class ReconnectingWs {
  #options: ReconnectingWsOptions;
  #ws: WebSocket | null = null;
  #disposed = false;
  #sessionExited = false;
  #isFirstConnect = true;
  #reconnectAttempt = 0;
  #reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  #pingInterval: ReturnType<typeof setInterval> | null = null;
  #pongTimer: ReturnType<typeof setTimeout> | null = null;
  #gaveUpTimer: ReturnType<typeof setTimeout> | null = null;
  #gaveUpNotified = false;
  #connecting = false;

  constructor(options: ReconnectingWsOptions) {
    this.#options = options;
    this.#connect();
  }

  send(data: string): void {
    if (this.#ws?.readyState === WebSocket.OPEN) {
      this.#ws.send(data);
    }
  }

  checkAndReconnect(): void {
    if (this.#disposed || this.#sessionExited) return;
    if (this.#ws?.readyState === WebSocket.OPEN) return;
    if (this.#connecting) return;

    // Immediate reconnect attempt on visibility restore
    this.#clearReconnectTimer();
    this.#reconnectAttempt = 0;
    this.#connect();
  }

  dispose(): void {
    this.#disposed = true;
    this.#stopPing();
    this.#clearReconnectTimer();
    this.#clearGaveUpTimer();
    if (this.#ws) {
      this.#ws.onopen = null;
      this.#ws.onmessage = null;
      this.#ws.onclose = null;
      this.#ws.onerror = null;
      this.#ws.close();
      this.#ws = null;
    }
  }

  #connect(): void {
    if (this.#disposed || this.#sessionExited) return;

    this.#connecting = true;

    // Close previous WebSocket if still lingering
    if (this.#ws) {
      this.#ws.onopen = null;
      this.#ws.onmessage = null;
      this.#ws.onclose = null;
      this.#ws.onerror = null;
      this.#ws.close();
    }

    const ws = new WebSocket(this.#options.url);
    this.#ws = ws;

    ws.onopen = () => {
      this.#connecting = false;
      this.#reconnectAttempt = 0;
      this.#clearGaveUpTimer();
      this.#gaveUpNotified = false;
      this.#startPing();

      if (!this.#isFirstConnect) {
        this.#options.onReconnected();
      }
      this.#isFirstConnect = false;

      this.#options.onOpen();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);

        if (msg.type === "pong") {
          this.#clearPongTimer();
          return;
        }

        if (msg.type === "exit") {
          this.#sessionExited = true;
          this.#options.onMessage(msg);
          this.#options.onSessionLost();
          return;
        }

        if (msg.type === "error" && msg.message === "Session not found") {
          this.#sessionExited = true;
          this.#options.onMessage(msg);
          this.#options.onSessionLost();
          return;
        }

        this.#options.onMessage(msg);
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      this.#connecting = false;
      this.#stopPing();

      if (this.#disposed || this.#sessionExited) return;

      // Start the "gave up" timer on first disconnect in this cycle
      if (!this.#gaveUpTimer && !this.#gaveUpNotified) {
        this.#gaveUpTimer = setTimeout(() => {
          this.#gaveUpTimer = null;
          if (!this.#disposed && !this.#sessionExited) {
            this.#gaveUpNotified = true;
            this.#options.onGaveUp();
          }
        }, GAVE_UP_THRESHOLD_MS);
      }

      this.#scheduleReconnect();
    };

    ws.onerror = () => {
      // The close event will fire after this, which handles reconnection
    };
  }

  #scheduleReconnect(): void {
    if (this.#disposed || this.#sessionExited) return;

    const delay = Math.min(
      HEARTBEAT_BACKOFF_BASE_MS * Math.pow(2, this.#reconnectAttempt),
      HEARTBEAT_BACKOFF_CAP_MS,
    );
    this.#reconnectAttempt++;

    this.#reconnectTimer = setTimeout(() => {
      this.#reconnectTimer = null;
      this.#connect();
    }, delay);
  }

  #startPing(): void {
    this.#stopPing();
    this.#pingInterval = setInterval(() => {
      if (this.#ws?.readyState === WebSocket.OPEN) {
        this.#ws.send(JSON.stringify({ type: "ping" }));
        this.#pongTimer = setTimeout(() => {
          // Server did not respond in time — force close to trigger reconnect
          this.#pongTimer = null;
          this.#ws?.close();
        }, PONG_TIMEOUT_MS);
      }
    }, PING_INTERVAL_MS);
  }

  #stopPing(): void {
    if (this.#pingInterval !== null) {
      clearInterval(this.#pingInterval);
      this.#pingInterval = null;
    }
    this.#clearPongTimer();
  }

  #clearPongTimer(): void {
    if (this.#pongTimer !== null) {
      clearTimeout(this.#pongTimer);
      this.#pongTimer = null;
    }
  }

  #clearReconnectTimer(): void {
    if (this.#reconnectTimer !== null) {
      clearTimeout(this.#reconnectTimer);
      this.#reconnectTimer = null;
    }
  }

  #clearGaveUpTimer(): void {
    if (this.#gaveUpTimer !== null) {
      clearTimeout(this.#gaveUpTimer);
      this.#gaveUpTimer = null;
    }
  }
}
