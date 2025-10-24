/**
 * Centralized configuration management for the Realtime App
 * Reads from environment variables with sensible defaults
 * 
 * SECURITY NOTE: Never hardcode authentication tokens or sensitive data in this file.
 * All sensitive configuration should come from environment variables.
 */

export type TransportType = 'websocket' | 'sse' | 'polling';

export interface AppConfig {
  api: {
    baseUrl: string;
    realtimePath: string;
    authToken?: string;
  };
  session: {
    defaultPracticeId?: number;
    defaultTimezone: string;
  };
  transport: {
    preferred: TransportType;
    enableFallback: boolean;
  };
  performance: {
    maxMessages: number;
    reconnectMaxAttempts: number;
    reconnectInitialDelay: number;
    reconnectMaxDelay: number;
  };
}

const config: AppConfig = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE || 'http://localhost:8000',
    realtimePath: import.meta.env.VITE_REALTIME_PATH || '/realtime-session',
    authToken: import.meta.env.VITE_AUTH_TOKEN,
  },
  session: {
    defaultPracticeId: import.meta.env.VITE_DEFAULT_PRACTICE_ID
      ? parseInt(import.meta.env.VITE_DEFAULT_PRACTICE_ID, 10)
      : undefined,
    defaultTimezone: import.meta.env.VITE_DEFAULT_TIMEZONE || 'UTC',
  },
  transport: {
    preferred: (import.meta.env.VITE_PREFERRED_TRANSPORT as TransportType) || 'websocket',
    // Disable fallback since only WebSocket is supported on the backend
    enableFallback: import.meta.env.VITE_ENABLE_TRANSPORT_FALLBACK === 'true',
  },
  performance: {
    maxMessages: import.meta.env.VITE_MAX_MESSAGES
      ? parseInt(import.meta.env.VITE_MAX_MESSAGES, 10)
      : 1000,
    reconnectMaxAttempts: import.meta.env.VITE_RECONNECT_MAX_ATTEMPTS
      ? parseInt(import.meta.env.VITE_RECONNECT_MAX_ATTEMPTS, 10)
      : 10,
    reconnectInitialDelay: import.meta.env.VITE_RECONNECT_INITIAL_DELAY
      ? parseInt(import.meta.env.VITE_RECONNECT_INITIAL_DELAY, 10)
      : 1000,
    reconnectMaxDelay: import.meta.env.VITE_RECONNECT_MAX_DELAY
      ? parseInt(import.meta.env.VITE_RECONNECT_MAX_DELAY, 10)
      : 30000,
  },
};

export default config;
