import type { TransportAdapter } from './TransportAdapter';
import type { Message } from '../types/messages';
import type { SessionConfig, ConnectionStatus, TransportType } from '../types/session';
import config from '../config';

/**
 * PollingTransport implements the TransportAdapter interface using HTTP polling
 */
export class PollingTransport implements TransportAdapter {
  private sessionId: string | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private messageCallback: ((message: Message) => void) | null = null;
  private statusCallback: ((status: ConnectionStatus) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;
  private connected = false;
  // @ts-ignore - messageQueue is reserved for future batching implementation
  private messageQueue: any[] = [];
  private readonly POLLING_INTERVAL_MS = 1000;
  private readonly LONG_POLLING_TIMEOUT_MS = 30000;
  private abortController: AbortController | null = null;

  /**
   * Connect to the polling endpoint with session configuration
   */
  async connect(sessionConfig: SessionConfig): Promise<void> {
    if (this.connected) {
      throw new Error('PollingTransport is already connected');
    }

    try {
      this.notifyStatusChange('connecting');

      // Initialize session with the backend
      const sessionData = await this.initializeSession(sessionConfig);
      this.sessionId = sessionData.session_id;
      
      this.connected = true;
      this.notifyStatusChange('open');

      // Start polling loop
      this.startPolling();
    } catch (error) {
      this.connected = false;
      this.notifyStatusChange('error');
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Disconnect from the polling endpoint
   */
  async disconnect(): Promise<void> {
    this.connected = false;
    
    // Stop polling
    this.stopPolling();

    // Abort any ongoing requests
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // Close session on backend if needed
    if (this.sessionId) {
      try {
        await this.closeSession();
      } catch (error) {
        console.error('Failed to close session:', error);
      }
    }

    this.sessionId = null;
    this.messageQueue = [];
    this.notifyStatusChange('closed');
  }

  /**
   * Send a message (adds to queue for batching)
   */
  async send(message: any): Promise<void> {
    if (!this.connected || !this.sessionId) {
      throw new Error('PollingTransport is not connected');
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
    return 'polling';
  }

  /**
   * Check if polling transport is connected
   */
  isConnected(): boolean {
    return this.connected && this.sessionId !== null;
  }

  /**
   * Initialize session with the backend
   */
  private async initializeSession(sessionConfig: SessionConfig): Promise<any> {
    const baseUrl = config.api.baseUrl;
    const initUrl = `${baseUrl}${config.api.realtimePath}/init`;

    const response = await fetch(initUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sessionConfig.authToken && { 'Authorization': `Bearer ${sessionConfig.authToken}` }),
      },
      body: JSON.stringify({
        practice_id: sessionConfig.practiceId,
        conversation_id: sessionConfig.conversationId,
        patient_id: sessionConfig.patientId,
        timezone: sessionConfig.timezone,
        metadata: sessionConfig.metadata,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to initialize session: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Close session on the backend
   */
  private async closeSession(): Promise<void> {
    if (!this.sessionId) return;

    const baseUrl = config.api.baseUrl;
    const closeUrl = `${baseUrl}${config.api.realtimePath}/close`;

    await fetch(closeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: this.sessionId,
      }),
    });
  }

  /**
   * Start the polling loop
   */
  private startPolling(): void {
    if (this.pollingInterval) {
      return;
    }

    // Start polling immediately
    this.poll();

    // Set up interval for subsequent polls
    this.pollingInterval = setInterval(() => {
      this.poll();
    }, this.POLLING_INTERVAL_MS);
  }

  /**
   * Stop the polling loop
   */
  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Poll for new messages
   */
  private async poll(): Promise<void> {
    if (!this.connected || !this.sessionId) {
      return;
    }

    try {
      // Create abort controller for this request
      this.abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        this.abortController?.abort();
      }, this.LONG_POLLING_TIMEOUT_MS);

      const baseUrl = config.api.baseUrl;
      const pollUrl = `${baseUrl}${config.api.realtimePath}/poll?session_id=${this.sessionId}`;

      const response = await fetch(pollUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: this.abortController.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          // Session not found, disconnect
          throw new Error('Session not found on server');
        }
        throw new Error(`Polling failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Process received messages
      if (data.messages && Array.isArray(data.messages)) {
        for (const message of data.messages) {
          this.handleMessage(message);
        }
      }
    } catch (error) {
      // Ignore abort errors (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      // Handle other errors
      if (this.connected) {
        this.handleError(error instanceof Error ? error : new Error(String(error)));
      }
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(messageData: any): void {
    try {
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
      // If processing fails, create an error message
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type: 'error',
        error_code: 'PROCESS_ERROR',
        message: 'Failed to process polled message',
        details: { raw: messageData, error: error instanceof Error ? error.message : String(error) },
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
