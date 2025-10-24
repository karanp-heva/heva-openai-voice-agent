import type { Message } from '../types/messages';
import type { SessionConfig, ConnectionStatus, TransportType } from '../types/session';

/**
 * TransportAdapter interface defines the contract for all transport implementations
 * (WebSocket, Server-Sent Events, HTTP Polling)
 */
export interface TransportAdapter {
  // Connection management
  connect(config: SessionConfig): Promise<void>;
  disconnect(): Promise<void>;
  
  // Message handling
  send(message: any): Promise<void>;
  onMessage(callback: (message: Message) => void): void;
  
  // Status monitoring
  onStatusChange(callback: (status: ConnectionStatus) => void): void;
  onError(callback: (error: Error) => void): void;
  
  // Metadata
  getTransportType(): TransportType;
  isConnected(): boolean;
}
