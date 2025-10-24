import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { Message } from '../types/messages';
import type { SessionConfig, ConnectionState, ConnectionStatus, TransportType } from '../types/session';
import type { TransportAdapter } from '../adapters/TransportAdapter';
import { WebSocketTransport } from '../adapters/WebSocketTransport';
import { EventSourceTransport } from '../adapters/EventSourceTransport';
import { PollingTransport } from '../adapters/PollingTransport';
import { useReconnect } from '../hooks/useReconnect';
import config from '../config';
import { handleError, createErrorMessage, logError } from '../utils/errorHandler';
import { sanitizeJsonInput } from '../utils/security';

/**
 * Speak proposal from agent
 */
export interface SpeakProposal {
  proposalId: string;
  summary: string;
  timestamp: string;
}

/**
 * SessionContextValue defines the shape of the session context
 */
export interface SessionContextValue {
  // Session state
  config: SessionConfig | null;
  isConnected: boolean;

  // Messages
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;

  // Connection
  connectionState: ConnectionState;
  connect: (config: SessionConfig) => Promise<void>;
  disconnect: () => void;
  reconnect: () => void;

  // Reconnection
  reconnectionCountdown: number;
  isReconnecting: boolean;
  maxAttemptsReached: boolean;

  // Transport
  transport: TransportAdapter | null;
  switchTransport: (type: TransportType) => void;

  // Actions
  sendMessage: (message: any) => Promise<void>;
  replayMessage: (message: Message) => Promise<void>;

  // Voice features
  speakProposals: SpeakProposal[];
  approveSpeakProposal: (proposalId: string) => Promise<void>;
  denySpeakProposal: (proposalId: string) => Promise<void>;
}

/**
 * Create the SessionContext
 */
const SessionContext = createContext<SessionContextValue | undefined>(undefined);

/**
 * SessionProvider props
 */
export interface SessionProviderProps {
  children: React.ReactNode;
}

/**
 * SessionProvider component manages the session state and provides it to children
 */
export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  // Session configuration
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);

  // Messages state with max limit
  const [messages, setMessages] = useState<Message[]>([]);

  // Speak proposals state
  const [speakProposals, setSpeakProposals] = useState<SpeakProposal[]>([]);

  // Connection state
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'closed',
    transport: config.transport.preferred,
    latency: undefined,
    error: undefined,
    reconnectAttempts: 0,
    reconnectDelay: config.performance.reconnectInitialDelay,
  });

  // Transport adapter reference
  const transportRef = useRef<TransportAdapter | null>(null);

  // Callback refs to avoid circular dependencies
  const addMessageRef = useRef<(message: Message) => void>(() => { });
  const handleStatusChangeRef = useRef<(status: ConnectionStatus) => void>(() => { });
  const handleErrorRef = useRef<(error: Error) => void>(() => { });

  // Track manual disconnect to prevent unwanted reconnection
  const isManualDisconnectRef = useRef<boolean>(false);

  // Track last connection attempt to prevent rapid reconnection loops
  const lastConnectionAttemptRef = useRef<number>(0);
  const MIN_CONNECTION_INTERVAL_MS = 2000; // Minimum 2 seconds between connection attempts

  // Track previous status to avoid infinite loops
  const previousStatusRef = useRef<ConnectionStatus>('closed');

  /**
   * Create a transport adapter based on type
   */
  const createTransport = useCallback((type: TransportType): TransportAdapter => {
    switch (type) {
      case 'websocket':
        return new WebSocketTransport();
      case 'sse':
        return new EventSourceTransport();
      case 'polling':
        return new PollingTransport();
      default:
        throw new Error(`Unknown transport type: ${type}`);
    }
  }, []);

  /**
   * Handle reconnection with transport fallback
   */
  const handleReconnection = useCallback(async (transport: TransportType) => {
    if (!sessionConfig) {
      throw new Error('Cannot reconnect without session config');
    }

    // Don't reconnect if manually disconnected
    if (isManualDisconnectRef.current) {
      return;
    }

    try {
      // Disconnect current transport
      if (transportRef.current) {
        await transportRef.current.disconnect();
      }

      // Update connection state with new transport
      setConnectionState((prev) => ({
        ...prev,
        transport,
        status: 'connecting',
      }));

      // Create new transport
      const newTransport = createTransport(transport);
      transportRef.current = newTransport;

      // Set up callbacks using refs
      newTransport.onMessage((msg) => addMessageRef.current(msg));
      newTransport.onStatusChange((status) => handleStatusChangeRef.current(status));
      newTransport.onError((err) => handleErrorRef.current(err));

      // Attempt connection
      await newTransport.connect(sessionConfig);
    } catch (error) {
      // Error will be handled by handleError callback
      throw error;
    }
  }, [sessionConfig, createTransport]);

  // Initialize reconnection hook
  const reconnectHook = useReconnect(
    handleReconnection,
    connectionState.transport,
    connectionState.status === 'open'
  );

  /**
   * Add a message to the message list with max limit enforcement
   */
  const addMessage = useCallback((message: Message) => {
    setMessages((prevMessages) => {
      const newMessages = [...prevMessages, message];

      // Enforce max message limit (1000 messages)
      if (newMessages.length > config.performance.maxMessages) {
        // Remove oldest messages to maintain limit
        return newMessages.slice(newMessages.length - config.performance.maxMessages);
      }

      return newMessages;
    });

    // Handle speak proposals from agent
    if (message.type === 'speak_proposal' && 'proposalId' in message && 'summary' in message) {
      const proposal: SpeakProposal = {
        proposalId: (message as any).proposalId,
        summary: (message as any).summary,
        timestamp: message.timestamp,
      };

      setSpeakProposals((prev) => [...prev, proposal]);
    }
  }, []);

  // Update ref when callback changes
  useEffect(() => {
    addMessageRef.current = addMessage;
  }, [addMessage]);

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  /**
   * Handle status changes from transport
   */
  const handleStatusChange = useCallback((status: ConnectionStatus) => {
    // Get previous status from ref to avoid dependency on state
    const previousStatus = previousStatusRef.current;

    // Update status ref
    previousStatusRef.current = status;

    // Update state
    setConnectionState((prev) => ({
      ...prev,
      status,
      error: status === 'error' ? prev.error : undefined,
    }));

    // Only trigger reconnection if:
    // 1. Connection is lost (closed or error)
    // 2. We have a session config
    // 3. Fallback is enabled
    // 4. It's not a manual disconnect
    // 5. Previous status was 'open' (only reconnect if we had a successful connection before)
    // 6. Enough time has passed since last connection attempt (prevent rapid loops)
    const now = Date.now();
    const timeSinceLastAttempt = now - lastConnectionAttemptRef.current;

    if (
      (status === 'closed' || status === 'error') &&
      sessionConfig &&
      config.transport.enableFallback &&
      !isManualDisconnectRef.current &&
      previousStatus === 'open' &&  // Only reconnect if we were previously connected
      timeSinceLastAttempt >= MIN_CONNECTION_INTERVAL_MS
    ) {
      lastConnectionAttemptRef.current = now;
      reconnectHook.startReconnection();
    }
  }, [sessionConfig]);

  // Update ref when callback changes
  useEffect(() => {
    handleStatusChangeRef.current = handleStatusChange;
  }, [handleStatusChange]);

  /**
   * Handle errors from transport
   */
  const handleTransportError = useCallback((error: Error) => {
    // Process error with error handler
    const handledError = handleError(error, { component: 'SessionContext', action: 'transport' });

    // Log error for debugging
    logError(error, { component: 'SessionContext', action: 'transport' });

    setConnectionState((prev) => ({
      ...prev,
      status: 'error',
      error: handledError.userMessage,
    }));

    // Add error message to console
    const errorMessage = createErrorMessage(
      handledError.isAuthError ? 'AUTH_ERROR' : 'TRANSPORT_ERROR',
      handledError.userMessage,
      { originalMessage: error.message }
    );
    addMessage(errorMessage);

    // If it's an auth error, prevent reconnection
    if (handledError.shouldPreventReconnection) {
      reconnectHook.stopReconnection();
      setConnectionState((prev) => ({
        ...prev,
        error: 'Authentication failed. Please update your credentials and try again.',
      }));
    }
  }, [addMessage]);

  // Update ref when callback changes
  useEffect(() => {
    handleErrorRef.current = handleTransportError;
  }, [handleTransportError]);

  /**
   * Connect to the session
   */
  const connect = useCallback(async (sessionConfig: SessionConfig) => {
    try {
      // Clear manual disconnect flag
      isManualDisconnectRef.current = false;

      // Update last connection attempt timestamp
      lastConnectionAttemptRef.current = Date.now();

      // Store session config
      setSessionConfig(sessionConfig);

      // Stop any ongoing reconnection
      reconnectHook.stopReconnection();

      // Disconnect existing transport if any
      if (transportRef.current) {
        await transportRef.current.disconnect();
      }

      // Create new transport
      const transport = createTransport(connectionState.transport);
      transportRef.current = transport;

      // Set up callbacks using refs to avoid circular dependencies
      transport.onMessage((msg) => addMessageRef.current(msg));
      transport.onStatusChange((status) => handleStatusChangeRef.current(status));
      transport.onError((err) => handleErrorRef.current(err));

      // Update status to connecting
      setConnectionState((prev) => ({
        ...prev,
        status: 'connecting',
        error: undefined,
        reconnectAttempts: 0,
        reconnectDelay: config.performance.reconnectInitialDelay,
      }));

      // Attempt connection
      await transport.connect(sessionConfig);
    } catch (error) {
      handleTransportError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }, [connectionState.transport, createTransport, handleTransportError, reconnectHook]);

  /**
   * Disconnect from the session
   */
  const disconnect = useCallback(() => {
    // Set manual disconnect flag to prevent reconnection
    isManualDisconnectRef.current = true;

    // Stop any ongoing reconnection
    reconnectHook.stopReconnection();

    // Disconnect transport
    if (transportRef.current) {
      transportRef.current.disconnect();
      transportRef.current = null;
    }

    // Reset session config
    setSessionConfig(null);

    // Update connection state
    setConnectionState((prev) => ({
      ...prev,
      status: 'closed',
      error: undefined,
      reconnectAttempts: 0,
      reconnectDelay: config.performance.reconnectInitialDelay,
    }));
  }, []);

  /**
   * Manually trigger reconnection
   */
  const reconnect = useCallback(() => {
    if (!sessionConfig) {
      throw new Error('Cannot reconnect without session config');
    }

    // Use force reconnect from hook (resets attempts and reconnects immediately)
    reconnectHook.forceReconnect();
  }, [sessionConfig]);

  /**
   * Switch to a different transport
   */
  const switchTransport = useCallback((type: TransportType) => {
    setConnectionState((prev) => ({
      ...prev,
      transport: type,
    }));

    // If connected, reconnect with new transport
    if (sessionConfig && transportRef.current?.isConnected()) {
      disconnect();
      setTimeout(() => {
        connect(sessionConfig);
      }, 100);
    }
  }, [sessionConfig, connect, disconnect]);

  /**
   * Send a message through the transport
   */
  const sendMessage = useCallback(async (message: any) => {
    if (!transportRef.current || !transportRef.current.isConnected()) {
      throw new Error('Not connected to session');
    }

    try {
      // Sanitize message if it's a string (JSON)
      let sanitizedMessage = message;
      if (typeof message === 'string') {
        sanitizedMessage = sanitizeJsonInput(message);
      } else if (typeof message === 'object') {
        // Convert to JSON and sanitize
        const jsonStr = JSON.stringify(message);
        sanitizedMessage = sanitizeJsonInput(jsonStr);
      }

      await transportRef.current.send(sanitizedMessage);
    } catch (error) {
      const handledError = handleError(
        error instanceof Error ? error : new Error(String(error)),
        { component: 'SessionContext', action: 'sendMessage' }
      );

      logError(error instanceof Error ? error : new Error(String(error)), {
        component: 'SessionContext',
        action: 'sendMessage',
      });

      throw new Error(handledError.userMessage);
    }
  }, []);

  /**
   * Replay a message (send it again)
   */
  const replayMessage = useCallback(async (message: Message) => {
    await sendMessage(message);
  }, [sendMessage]);

  /**
   * Approve a speak proposal from the agent
   */
  const approveSpeakProposal = useCallback(async (proposalId: string) => {
    try {
      await sendMessage({
        type: 'proposal_response',
        proposalId,
        approved: true,
      });

      // Remove proposal from list
      setSpeakProposals((prev) => prev.filter((p) => p.proposalId !== proposalId));
    } catch (error) {
      console.error('Failed to approve speak proposal:', error);
    }
  }, [sendMessage]);

  /**
   * Deny a speak proposal from the agent
   */
  const denySpeakProposal = useCallback(async (proposalId: string) => {
    try {
      await sendMessage({
        type: 'proposal_response',
        proposalId,
        approved: false,
      });

      // Remove proposal from list
      setSpeakProposals((prev) => prev.filter((p) => p.proposalId !== proposalId));
    } catch (error) {
      console.error('Failed to deny speak proposal:', error);
    }
  }, [sendMessage]);

  // Sync reconnection state with connection state
  useEffect(() => {
    setConnectionState((prev) => ({
      ...prev,
      reconnectAttempts: reconnectHook.state.attempts,
      reconnectDelay: reconnectHook.state.nextDelay,
      transport: reconnectHook.state.currentTransport,
    }));
  }, [reconnectHook.state.attempts, reconnectHook.state.nextDelay, reconnectHook.state.currentTransport]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      reconnectHook.stopReconnection();
      if (transportRef.current) {
        transportRef.current.disconnect();
      }
    };
  }, []);

  // Context value
  const value: SessionContextValue = {
    config: sessionConfig,
    isConnected: connectionState.status === 'open',
    messages,
    addMessage,
    clearMessages,
    connectionState,
    connect,
    disconnect,
    reconnect,
    reconnectionCountdown: reconnectHook.state.countdown,
    isReconnecting: reconnectHook.state.isReconnecting,
    maxAttemptsReached: reconnectHook.state.maxAttemptsReached,
    transport: transportRef.current,
    switchTransport,
    sendMessage,
    replayMessage,
    speakProposals,
    approveSpeakProposal,
    denySpeakProposal,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

/**
 * Custom hook to use the SessionContext
 */
export const useSession = (): SessionContextValue => {
  const context = useContext(SessionContext);

  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }

  return context;
};
