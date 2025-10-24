import { describe, it, expect } from 'vitest';
import {
  sanitizeInput,
  escapeHtml,
  sanitizeJsonInput,
  validateSessionConfig,
  isAuthenticationError,
  isNetworkError,
  getUserFriendlyErrorMessage,
} from '../security';

describe('security utilities', () => {
  describe('sanitizeInput', () => {
    it('should remove null bytes', () => {
      const input = 'test\0data';
      expect(sanitizeInput(input)).toBe('testdata');
    });

    it('should trim whitespace', () => {
      const input = '  test data  ';
      expect(sanitizeInput(input)).toBe('test data');
    });

    it('should handle non-string input', () => {
      expect(sanitizeInput(123 as any)).toBe('');
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>alert("XSS")</script>';
      const expected = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;';
      expect(escapeHtml(input)).toBe(expected);
    });

    it('should escape ampersands', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should handle non-string input', () => {
      expect(escapeHtml(123 as any)).toBe('');
    });
  });

  describe('sanitizeJsonInput', () => {
    it('should accept valid JSON', () => {
      const input = '{"key": "value"}';
      const result = sanitizeJsonInput(input);
      expect(JSON.parse(result)).toEqual({ key: 'value' });
    });

    it('should throw error for invalid JSON', () => {
      const input = '{invalid json}';
      expect(() => sanitizeJsonInput(input)).toThrow('Invalid JSON format');
    });

    it('should sanitize and re-stringify JSON', () => {
      const input = '  {"key": "value"}  ';
      const result = sanitizeJsonInput(input);
      expect(result).toBe('{"key":"value"}');
    });
  });

  describe('validateSessionConfig', () => {
    it('should validate correct config', () => {
      const config = {
        practiceId: '123',
        conversationId: 'conv-123',
        timezone: 'UTC',
      };
      const result = validateSessionConfig(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should reject missing practice ID', () => {
      const config = {
        practiceId: '',
        conversationId: 'conv-123',
        timezone: 'UTC',
      };
      const result = validateSessionConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors.practiceId).toBeDefined();
    });

    it('should reject non-numeric practice ID', () => {
      const config = {
        practiceId: 'abc',
        conversationId: 'conv-123',
        timezone: 'UTC',
      };
      const result = validateSessionConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors.practiceId).toContain('number');
    });

    it('should reject negative practice ID', () => {
      const config = {
        practiceId: '-5',
        conversationId: 'conv-123',
        timezone: 'UTC',
      };
      const result = validateSessionConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors.practiceId).toContain('positive');
    });

    it('should reject missing conversation ID', () => {
      const config = {
        practiceId: '123',
        conversationId: '',
        timezone: 'UTC',
      };
      const result = validateSessionConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors.conversationId).toBeDefined();
    });
  });

  describe('isAuthenticationError', () => {
    it('should detect auth errors from message', () => {
      expect(isAuthenticationError('Authentication failed')).toBe(true);
      expect(isAuthenticationError('Unauthorized access')).toBe(true);
      expect(isAuthenticationError('403 Forbidden')).toBe(true);
      expect(isAuthenticationError('Invalid token')).toBe(true);
    });

    it('should detect auth errors from Error object', () => {
      const error = new Error('401 Unauthorized');
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('should not detect non-auth errors', () => {
      expect(isAuthenticationError('Network error')).toBe(false);
      expect(isAuthenticationError('Connection timeout')).toBe(false);
    });
  });

  describe('isNetworkError', () => {
    it('should detect network errors from message', () => {
      expect(isNetworkError('Network connection failed')).toBe(true);
      expect(isNetworkError('Connection timeout')).toBe(true);
      expect(isNetworkError('ECONNREFUSED')).toBe(true);
    });

    it('should detect network errors from Error object', () => {
      const error = new Error('Network unreachable');
      expect(isNetworkError(error)).toBe(true);
    });

    it('should not detect non-network errors', () => {
      expect(isNetworkError('Invalid JSON')).toBe(false);
      expect(isNetworkError('Authentication failed')).toBe(false);
    });
  });

  describe('getUserFriendlyErrorMessage', () => {
    it('should return friendly message for auth errors', () => {
      const message = getUserFriendlyErrorMessage('401 Unauthorized');
      expect(message).toContain('Authentication failed');
    });

    it('should return friendly message for network errors', () => {
      const message = getUserFriendlyErrorMessage('Network connection failed');
      expect(message).toContain('Network connection failed');
    });

    it('should return original message for unknown errors', () => {
      const message = getUserFriendlyErrorMessage('Some random error');
      expect(message).toBe('Some random error');
    });
  });
});
