/**
 * Security utilities for input sanitization and XSS prevention
 */

/**
 * Sanitize user input to prevent injection attacks
 * Removes potentially dangerous characters and patterns
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Escape HTML special characters to prevent XSS
 * Converts <, >, &, ", ' to their HTML entity equivalents
 */
export function escapeHtml(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }

  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char] || char);
}

/**
 * Validate and sanitize JSON input
 * Returns sanitized JSON string or throws error
 */
export function sanitizeJsonInput(input: string): string {
  // Sanitize the input string
  const sanitized = sanitizeInput(input);

  // Validate it's valid JSON
  try {
    const parsed = JSON.parse(sanitized);
    // Re-stringify to ensure clean JSON
    return JSON.stringify(parsed);
  } catch (error) {
    throw new Error('Invalid JSON format');
  }
}

/**
 * Validate session configuration inputs
 */
export function validateSessionConfig(config: {
  practiceId: string;
  conversationId: string;
  patientId?: string;
  timezone: string;
  authToken?: string;
}): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  // Validate practice ID
  const practiceIdSanitized = sanitizeInput(config.practiceId);
  if (!practiceIdSanitized) {
    errors.practiceId = 'Practice ID is required';
  } else if (!/^-?\d+$/.test(practiceIdSanitized)) {
    errors.practiceId = 'Practice ID must be a number';
  } else if (parseInt(practiceIdSanitized, 10) <= 0) {
    errors.practiceId = 'Practice ID must be positive';
  }

  // Validate conversation ID
  const conversationIdSanitized = sanitizeInput(config.conversationId);
  if (!conversationIdSanitized) {
    errors.conversationId = 'Conversation ID is required';
  } else if (conversationIdSanitized.length > 255) {
    errors.conversationId = 'Conversation ID is too long (max 255 characters)';
  }

  // Validate patient ID (optional)
  if (config.patientId) {
    const patientIdSanitized = sanitizeInput(config.patientId);
    if (patientIdSanitized.length > 255) {
      errors.patientId = 'Patient ID is too long (max 255 characters)';
    }
  }

  // Validate timezone
  const timezoneSanitized = sanitizeInput(config.timezone);
  if (!timezoneSanitized) {
    errors.timezone = 'Timezone is required';
  } else if (timezoneSanitized.length > 100) {
    errors.timezone = 'Timezone is too long (max 100 characters)';
  }

  // Validate auth token (optional)
  if (config.authToken) {
    const authTokenSanitized = sanitizeInput(config.authToken);
    if (authTokenSanitized.length > 1000) {
      errors.authToken = 'Authentication token is too long';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Check if error is an authentication error
 */
export function isAuthenticationError(error: Error | string): boolean {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const authErrorPatterns = [
    /auth/i,
    /unauthorized/i,
    /forbidden/i,
    /401/,
    /403/,
    /invalid.*token/i,
    /expired.*token/i,
  ];

  return authErrorPatterns.some((pattern) => pattern.test(errorMessage));
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: Error | string): boolean {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const networkErrorPatterns = [
    /network/i,
    /connection/i,
    /timeout/i,
    /offline/i,
    /unreachable/i,
    /ECONNREFUSED/i,
    /ETIMEDOUT/i,
  ];

  return networkErrorPatterns.some((pattern) => pattern.test(errorMessage));
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: Error | string): string {
  const errorMessage = typeof error === 'string' ? error : error.message;

  // Authentication errors
  if (isAuthenticationError(error)) {
    return 'Authentication failed. Please check your credentials and try again.';
  }

  // Network errors
  if (isNetworkError(error)) {
    return 'Network connection failed. Please check your internet connection and try again.';
  }

  // Connection timeout
  if (/timeout/i.test(errorMessage)) {
    return 'Connection timed out. The server may be unavailable.';
  }

  // WebSocket specific errors
  if (/websocket/i.test(errorMessage)) {
    return 'WebSocket connection failed. Trying alternative connection method...';
  }

  // Generic error
  return errorMessage || 'An unexpected error occurred. Please try again.';
}

/**
 * Sanitize error for logging (remove sensitive data)
 */
export function sanitizeErrorForLogging(error: any): any {
  if (typeof error === 'string') {
    // Remove potential tokens or sensitive data patterns
    return error.replace(/token[=:]\s*[\w-]+/gi, 'token=***');
  }

  if (error instanceof Error) {
    return {
      message: error.message.replace(/token[=:]\s*[\w-]+/gi, 'token=***'),
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'), // Limit stack trace
    };
  }

  if (typeof error === 'object' && error !== null) {
    const sanitized: any = {};
    for (const key in error) {
      if (key.toLowerCase().includes('token') || key.toLowerCase().includes('password')) {
        sanitized[key] = '***';
      } else {
        sanitized[key] = error[key];
      }
    }
    return sanitized;
  }

  return error;
}
