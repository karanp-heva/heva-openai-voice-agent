// Session configuration
export interface SessionConfig {
  practiceId: number;
  conversationId: string;
  patientId?: string;
  timezone: string;
  authToken?: string;
  metadata?: Record<string, any>;
}

// Connection status types
export type ConnectionStatus = 'connecting' | 'open' | 'closed' | 'error';

// Transport types
export type TransportType = 'websocket' | 'sse' | 'polling';

// Connection state
export interface ConnectionState {
  status: ConnectionStatus;
  transport: TransportType;
  latency?: number;
  error?: string;
  reconnectAttempts: number;
  reconnectDelay: number;
}
