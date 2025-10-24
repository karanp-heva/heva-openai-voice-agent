import type { TransportAdapter } from './TransportAdapter';
import type { Message } from '../types/messages';
import type { SessionConfig, ConnectionStatus, TransportType } from '../types/session';
import config from '../config';

/**
 * EventSourceTransport implements the TransportAdapter interface using Server-Sent Events (SSE)
 * Note: SSE is unidirectional (server -> client), so client -> server messages use HTTP POST
 */
export class EventSourceTransport implements TransportAdapter {
  private eventSource: EventSource | null = null;
  private sessionId: string | null = null;
  private messageCallback: ((message: Message) => void) | null = null;
  private statusCallback: ((status: ConnectionStatus) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;
  private isManualClose = false;

  /**
   * Connect to the SSE endpoint with session configuration
   */
  async connect(sessionConfig: SessionConfig): Promise<void> {
    if (this.eventSource && this.eventSource.readyState === EventSource.OPEN) {
      throw new Error('EventSource is already connected');
    }

    return new Promise((resolve, reject) => {
      try {
        // Build SSE URL with query parameters
        const url = this.buildEventSourceUrl(sessionConfig);
        
        // Create EventSource connection
        this.eventSource = new EventSource(url);
        this.isManualClose = false;

        // Handle connection open
        this.eventSource.onopen = () => {
          this.notifyStatusChange('open');
          resolve();
        };

        // Handle incoming messages (default 'message' event)
        this.eventSource.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        // Handle errors
        this.eventSource.onerror = (_event) => {
          // EventSource automatically reconnects, but we need to handle errors
          if (this.eventSource?.readyState === EventSource.CLOSED) {
            if (!this.isManualClose) {
              this.notifyStatusChange('error');
              const error = new Error('EventSource connection closed unexpectedly');
              this.handleError(error);
              reject(error);
            }
          } else if (this.eventSource?.readyState === EventSource.CONNECTING) {
            // EventSource is attempting to reconnect
            this.notifyStatusChange('connecting');
          }
        };

        // Listen for custom event types if needed
        this.setupCustomEventListeners();

        // Notify connecting status
        this.notifyStatusChange('connecting');
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /**
   * Disconnect from the EventSource
   */
  async disconnect(): Promise<void> {
    this.isManualClose = true;
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.sessionId = null;
    this.notifyStatusChange('closed');
  }

  /**
   * Send a message using HTTP POST (since SSE is unidirectional)
   */
  async send(message: any): Promise<void> {
    if (!this.sessionId) {
      throw new Error('No active session for sending messages');
    }

    try {
      const baseUrl = config.api.baseUrl;
      const sendUrl = `${baseUrl}${config.api.realtimePath}/send`;

      const response = await fetch(sendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: this.sessionId,
          message: message,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
      }
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
    return 'sse';
  }

  /**
   * Check if EventSource is connected
   */
  isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
  }

  /**
   * Build EventSource URL with query parameters
   */
  private buildEventSourceUrl(sessionConfig: SessionConfig): string {
    const baseUrl = config.api.baseUrl;
    const path = `${config.api.realtimePath}/sse`;
    
    // Build query parameters
    const params = new URLSearchParams({
      practice_id: sessionConfig.practiceId.toString(),
      conversation_id: sessionConfig.conversationId,
      timezone: sessionConfig.timezone,
    });

    if (sessionConfig.patientId) {
      params.append('patient_id', sessionConfig.patientId);
    }

    if (sessionConfig.authToken) {
      params.append('auth_token', sessionConfig.authToken);
    }

    return `${baseUrl}${path}?${params.toString()}`;
  }

  /**
   * Set up listeners for custom event types
   */
  private setupCustomEventListeners(): void {
    if (!this.eventSource) return;

    // Listen for session initialization event
    this.eventSource.addEventListener('session', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.session_id) {
          this.sessionId = data.session_id;
        }
      } catch (error) {
        console.error('Failed to parse session event:', error);
      }
    });

    // Listen for audio events
    this.eventSource.addEventListener('audio', (event: MessageEvent) => {
      this.handleMessage(event.data, 'audio');
    });

    // Listen for transcript events
    this.eventSource.addEventListener('transcript', (event: MessageEvent) => {
      this.handleMessage(event.data, 'transcript');
    });

    // Listen for status events
    this.eventSource.addEventListener('status', (event: MessageEvent) => {
      this.handleMessage(event.data, 'status');
    });

    // Listen for error events
    this.eventSource.addEventListener('error_message', (event: MessageEvent) => {
      this.handleMessage(event.data, 'error');
    });
  }

  /**
   * Handle incoming message data
   */
  private handleMessage(data: string, eventType?: string): void {
    try {
      let messageData: any;

      // Parse JSON data
      messageData = JSON.parse(data);
      
      // If event type is provided and message doesn't have a type, use event type
      if (eventType && !messageData.type) {
        messageData.type = eventType;
      }

      // Ensure message has required fields
      if (!messageData.id) {
        messageData.id = crypto.randomUUID();
      }
      if (!messageData.timestamp) {
        messageData.timestamp = new Date().toISOString();
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
        message: 'Failed to parse incoming SSE message',
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
