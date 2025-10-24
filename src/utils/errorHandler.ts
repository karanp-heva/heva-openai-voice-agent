/**
 * Centralized error handling utilities
 */

import { isAuthenticationError, isNetworkError, getUserFriendlyErrorMessage } from './security';

export interface ErrorContext {
  component?: string;
  action?: string;
  details?: any;
}

export interface HandledError {
  message: string;
  userMessage: string;
  isAuthError: boolean;
  isNetworkError: boolean;
  shouldRetry: boolean;
  shouldPreventReconnection: boolean;
  context?: ErrorContext;
}

/**
 * Handle and categorize errors
 */
export function handleError(error: Error | string, context?: ErrorContext): HandledError {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const isAuth = isAuthenticationError(error);
  const isNetwork = isNetworkError(error);

  return {
    message: errorMessage,
    userMessage: getUserFriendlyErrorMessage(error),
    isAuthError: isAuth,
    isNetworkError: isNetwork,
    shouldRetry: isNetwork && !isAuth, // Retry network errors but not auth errors
    shouldPreventReconnection: isAuth, // Prevent reconnection on auth errors
    context,
  };
}

/**
 * Handle malformed JSON errors
 */
export function handleMalformedJson(
  rawData: string,
  parseError: Error
): { raw: string; error: string; formatted: string } {
  return {
    raw: rawData,
    error: parseError.message || 'Invalid JSON format',
    formatted: rawData, // Display raw data as-is
  };
}

/**
 * Create error message object
 */
export function createErrorMessage(
  errorCode: string,
  message: string,
  details?: any
): {
  id: string;
  timestamp: string;
  type: 'error';
  error_code: string;
  message: string;
  details?: any;
} {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    type: 'error',
    error_code: errorCode,
    message,
    details,
  };
}

/**
 * Log error to console (development only)
 */
export function logError(error: Error | string, context?: ErrorContext): void {
  if (import.meta.env.DEV) {
    console.error('[Error]', {
      error: typeof error === 'string' ? error : error.message,
      context,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Handle network errors with retry logic
 */
export function shouldRetryOnError(error: Error | string, attemptCount: number): boolean {
  // Don't retry auth errors
  if (isAuthenticationError(error)) {
    return false;
  }

  // Retry network errors up to a limit
  if (isNetworkError(error)) {
    return attemptCount < 3;
  }

  // Don't retry other errors
  return false;
}
