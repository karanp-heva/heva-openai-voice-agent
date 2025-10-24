import type { TransportAdapter } from './TransportAdapter';
import type { Message } from '../types/messages';
import type { SessionConfig, ConnectionStatus, TransportType } from '../types/session';
import config from '../config';

/**
 * WebSocketTransport implements the TransportAdapter interface using WebSocket protocol
 */
export class WebSocketTransport implements TransportAdapter {
  private ws: WebSocket | null = null;
  private messageCallback: ((message: Message) => void) | null = null;
  private statusCallback: ((status: ConnectionStatus) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private readonly CONNECTION_TIMEOUT_MS = 10000;

  /**
   * Connect to the WebSocket endpoint with session configuration
   */
  async connect(sessionConfig: SessionConfig): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      throw new Error('WebSocket is already connected');
    }

    return new Promise((resolve, reject) => {
      try {
        // Build WebSocket URL with query parameters
        const url = this.buildWebSocketUrl(sessionConfig);
        
        // Create WebSocket connection
        this.ws = new WebSocket(url);

        // Set up connection timeout
        this.connectionTimeout = setTimeout(() => {
          if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
            this.ws.close();
            const error = new Error('WebSocket connection timeout');
            this.handleError(error);
            reject(error);
          }
        }, this.CONNECTION_TIMEOUT_MS);

        // Handle connection open
        this.ws.onopen = () => {
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
          this.notifyStatusChange('open');
          resolve();
        };

        // Handle incoming messages
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        // Handle connection close
        this.ws.onclose = (event) => {
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
          
          // Check if close was abnormal
          if (event.code !== 1000 && event.code !== 1001) {
            this.notifyStatusChange('error');
            
            // Check for authentication errors (code 1008 = policy violation, often used for auth)
            if (event.code === 1008 || event.code === 4001 || event.code === 4003) {
              this.handleError(new Error(`Authentication failed: ${event.reason || 'Unauthorized'}`));
            } else {
              this.handleError(new Error(`WebSocket closed abnormally: ${event.code} - ${event.reason}`));
            }
          } else {
            this.notifyStatusChange('closed');
          }
        };

        // Handle errors
        this.ws.onerror = () => {
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
          const error = new Error(`WebSocket connection failed. Please ensure the backend server is running at ${config.api.baseUrl}`);
          this.handleError(error);
          reject(error);
        };

        // Notify connecting status
        this.notifyStatusChange('connecting');
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /**
   * Disconnect from the WebSocket
   */
  async disconnect(): Promise<void> {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    if (this.ws) {
      // Close with normal closure code
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.notifyStatusChange('closed');
  }

  /**
   * Send a message through the WebSocket
   */
  async send(message: any): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    try {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      this.ws.send(messageStr);
    } catch (error) {
      throw new Error(`Failed to send message: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Register callback for incoming messages
   */
  onMessage(callback: (message: Message) => void): void {
    this.messageCallback = callback;
  }

  /**
   * Register callback for status changes
   */
  onStatusChange(callback: (status: ConnectionStatus) => void): void {
    this.statusCallback = callback;
  }

  /**
   * Register callback for errors
   */
  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  /**
   * Get the transport type
   */
  getTransportType(): TransportType {
    return 'websocket';
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Build WebSocket URL with query parameters
   */
  private buildWebSocketUrl(sessionConfig: SessionConfig): string {
    const baseUrl = config.api.baseUrl;
    const path = config.api.realtimePath;
    
    // Convert http/https to ws/wss
    const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
    const urlWithoutProtocol = baseUrl.replace(/^https?:\/\//, '');
    
    // Build query parameters
    const params = new URLSearchParams({
      practice_id: sessionConfig.practiceId.toString(),
      conversation_id: sessionConfig.conversationId,
      timezone: sessionConfig.timezone,
    });

    if (sessionConfig.patientId) {
      params.append('patient_id', sessionConfig.patientId);
    }

    // Note: WebSocket doesn't support custom headers in browser
    // Auth token would need to be passed via query param or handled differently
    if (sessionConfig.authToken) {
      params.append('auth_token', sessionConfig.authToken);
    }

    return `${wsProtocol}://${urlWithoutProtocol}${path}?${params.toString()}`;
  }

  /**
   * Handle incoming message data
   */
  private handleMessage(data: string | ArrayBuffer): void {
    try {
      let messageData: any;

      // Handle binary data (ArrayBuffer)
      if (data instanceof ArrayBuffer) {
        // For binary audio data, we might need special handling
        // For now, convert to base64
        const bytes = new Uint8Array(data);
        const base64 = btoa(String.fromCharCode(...bytes));
        
        messageData = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          type: 'audio',
          data: base64,
          direction: 'received',
          bytesCount: bytes.length,
        };
      } else {
        // Handle text data (JSON)
        messageData = JSON.parse(data);
        
        // Ensure message has required fields
        if (!messageData.id) {
          messageData.id = crypto.randomUUID();
        }
        if (!messageData.timestamp) {
          messageData.timestamp = new Date().toISOString();
        }
      }

      // Notify message callback
      if (this.messageCallback) {
        this.messageCallback(messageData as Message);
      }
    } catch (error) {
      // If JSON parsing fails, create an error message
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type: 'error',
        error_code: 'PARSE_ERROR',
        message: 'Failed to parse incoming message',
        details: { raw: data, error: error instanceof Error ? error.message : String(error) },
      };

      if (this.messageCallback) {
        this.messageCallback(errorMessage);
      }
    }
  }

  /**
   * Notify status change
   */
  private notifyStatusChange(status: ConnectionStatus): void {
    if (this.statusCallback) {
      this.statusCallback(status);
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    if (this.errorCallback) {
      this.errorCallback(error);
    }
  }
}
