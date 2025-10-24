import { useEffect, useRef, useState, useCallback } from 'react';
import type { TransportType } from '../types/session';
import config from '../config';

/**
 * Reconnection configuration
 */
export interface ReconnectConfig {
  initialDelay: number;      // Initial delay in ms (default: 1000ms)
  maxDelay: number;          // Maximum delay in ms (default: 30000ms)
  multiplier: number;        // Backoff multiplier (default: 2)
  maxAttempts: number;       // Maximum reconnection attempts (default: 10)
  jitter: boolean;           // Add random jitter to delays (default: true)
  jitterPercent: number;     // Jitter percentage (default: 0.2 = ±20%)
}

/**
 * Reconnection state
 */
export interface ReconnectState {
  isReconnecting: boolean;
  attempts: number;
  nextDelay: number;
  countdown: number;
  currentTransport: TransportType;
  maxAttemptsReached: boolean;
}

/**
 * Transport fallback order
 */
const TRANSPORT_FALLBACK_ORDER: TransportType[] = ['websocket', 'sse', 'polling'];

/**
 * Default reconnection configuration
 */
const DEFAULT_CONFIG: ReconnectConfig = {
  initialDelay: config.performance.reconnectInitialDelay,
  maxDelay: config.performance.reconnectMaxDelay,
  multiplier: 2,
  maxAttempts: config.performance.reconnectMaxAttempts,
  jitter: true,
  jitterPercent: 0.2,
};

/**
 * useReconnect hook manages automatic reconnection with exponential backoff
 * and transport fallback
 * 
 * @param onReconnect - Callback to execute when reconnection should be attempted
 * @param currentTransport - Current transport type
 * @param isConnected - Whether currently connected
 * @param reconnectConfig - Optional reconnection configuration
 * @returns Reconnection state and control functions
 */
export const useReconnect = (
  onReconnect: (transport: TransportType) => Promise<void>,
  currentTransport: TransportType,
  isConnected: boolean,
  reconnectConfig: Partial<ReconnectConfig> = {}
) => {
  // Merge config with defaults
  const config = { ...DEFAULT_CONFIG, ...reconnectConfig };
  
  // Reconnection state
  const [state, setState] = useState<ReconnectState>({
    isReconnecting: false,
    attempts: 0,
    nextDelay: config.initialDelay,
    countdown: 0,
    currentTransport,
    maxAttemptsReached: false,
  });
  
  // Timer references
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  /**
   * Calculate next delay with exponential backoff and optional jitter
   */
  const calculateNextDelay = useCallback((currentDelay: number): number => {
    // Calculate base delay with exponential backoff
    const baseDelay = Math.min(
      currentDelay * config.multiplier,
      config.maxDelay
    );
    
    // Add jitter if enabled
    if (config.jitter) {
      const jitterAmount = baseDelay * config.jitterPercent;
      const jitter = jitterAmount * (Math.random() * 2 - 1); // Random value between -jitterAmount and +jitterAmount
      return Math.floor(baseDelay + jitter);
    }
    
    return baseDelay;
  }, [config]);
  
  /**
   * Get next transport in fallback order
   */
  const getNextTransport = useCallback((current: TransportType): TransportType => {
    // Get current index in fallback order
    const currentIndex = TRANSPORT_FALLBACK_ORDER.indexOf(current);
    
    // Calculate next index
    const nextIndex = (currentIndex + 1) % TRANSPORT_FALLBACK_ORDER.length;
    
    // Return next transport
    return TRANSPORT_FALLBACK_ORDER[nextIndex];
  }, []);
  
  /**
   * Clear all timers (not a useCallback to avoid dependency issues)
   */
  const clearTimers = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  };
  
  /**
   * Start countdown timer
   */
  const startCountdown = useCallback((delayMs: number) => {
    // Clear existing countdown
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    
    // Set initial countdown
    setState(prev => ({ ...prev, countdown: Math.ceil(delayMs / 1000) }));
    
    // Start countdown interval (update every second)
    const startTime = Date.now();
    countdownTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, Math.ceil((delayMs - elapsed) / 1000));
      
      setState(prev => ({ ...prev, countdown: remaining }));
      
      // Clear interval when countdown reaches 0
      if (remaining === 0 && countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    }, 1000);
  }, []);
  
  /**
   * Schedule reconnection attempt
   */
  const scheduleReconnection = useCallback(() => {
    clearTimers();
    
    setState(prev => {
      // Check if max attempts reached
      if (prev.attempts >= config.maxAttempts) {
        return {
          ...prev,
          isReconnecting: false,
          maxAttemptsReached: true,
        };
      }
      
      // Calculate next delay
      const nextDelay = prev.attempts === 0 
        ? config.initialDelay 
        : calculateNextDelay(prev.nextDelay);
      
      // Get next transport
      const nextTransport = getNextTransport(prev.currentTransport);
      
      // Start countdown
      startCountdown(nextDelay);
      
      // Schedule reconnection
      reconnectTimerRef.current = setTimeout(async () => {
        try {
          await onReconnect(nextTransport);
        } catch (error) {
          // If reconnection fails, schedule another attempt
          scheduleReconnection();
        }
      }, nextDelay);
      
      return {
        ...prev,
        isReconnecting: true,
        attempts: prev.attempts + 1,
        nextDelay,
        currentTransport: nextTransport,
      };
    });
  }, [config, calculateNextDelay, getNextTransport, onReconnect, startCountdown, clearTimers]);
  
  /**
   * Start reconnection process
   */
  const startReconnection = useCallback(() => {
    // Reset state and start reconnection
    setState(prev => ({
      ...prev,
      attempts: 0,
      nextDelay: config.initialDelay,
      maxAttemptsReached: false,
    }));
    
    scheduleReconnection();
  }, [config.initialDelay, scheduleReconnection]);
  
  /**
   * Stop reconnection process
   */
  const stopReconnection = useCallback(() => {
    clearTimers();
    setState(prev => ({
      ...prev,
      isReconnecting: false,
      countdown: 0,
    }));
  }, []);
  
  /**
   * Reset reconnection state (called on successful connection)
   */
  const resetReconnection = useCallback(() => {
    clearTimers();
    setState(prev => ({
      ...prev,
      isReconnecting: false,
      attempts: 0,
      nextDelay: config.initialDelay,
      countdown: 0,
      maxAttemptsReached: false,
    }));
  }, [config.initialDelay]);
  
  /**
   * Manually trigger immediate reconnection (resets attempts)
   */
  const forceReconnect = useCallback(async () => {
    clearTimers();
    
    // Reset state
    setState(prev => ({
      ...prev,
      isReconnecting: false,
      attempts: 0,
      nextDelay: config.initialDelay,
      countdown: 0,
      maxAttemptsReached: false,
    }));
    
    // Attempt immediate reconnection
    try {
      await onReconnect(currentTransport);
    } catch (error) {
      // If immediate reconnection fails, start normal reconnection process
      startReconnection();
    }
  }, [config.initialDelay, currentTransport, onReconnect, startReconnection]);
  
  /**
   * Update current transport
   */
  useEffect(() => {
    setState(prev => ({
      ...prev,
      currentTransport,
    }));
  }, [currentTransport]);
  
  /**
   * Handle connection state changes
   */
  const isConnectedRef = useRef(isConnected);
  
  useEffect(() => {
    const wasConnected = isConnectedRef.current;
    isConnectedRef.current = isConnected;
    
    // Only reset if we just became connected (transition from false to true)
    if (isConnected && !wasConnected) {
      // Connection successful - reset reconnection state
      clearTimers();
      setState(prev => ({
        ...prev,
        isReconnecting: false,
        attempts: 0,
        nextDelay: config.initialDelay,
        countdown: 0,
        maxAttemptsReached: false,
      }));
    }
  }, [isConnected, config.initialDelay]);
  
  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  return {
    state,
    startReconnection,
    stopReconnection,
    resetReconnection,
    forceReconnect,
  };
};
