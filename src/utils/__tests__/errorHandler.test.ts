import { describe, it, expect } from 'vitest';
import {
  handleError,
  handleMalformedJson,
  createErrorMessage,
  shouldRetryOnError,
} from '../errorHandler';

describe('errorHandler utilities', () => {
  describe('handleError', () => {
    it('should handle authentication errors', () => {
      const error = new Error('401 Unauthorized');
      const result = handleError(error, { component: 'Test' });
      
      expect(result.isAuthError).toBe(true);
      expect(result.shouldPreventReconnection).toBe(true);
      expect(result.shouldRetry).toBe(false);
    });

    it('should handle network errors', () => {
      const error = new Error('Network connection failed');
      const result = handleError(error);
      
      expect(result.isNetworkError).toBe(true);
      expect(result.shouldRetry).toBe(true);
      expect(result.shouldPreventReconnection).toBe(false);
    });

    it('should include context', () => {
      const error = new Error('Test error');
      const context = { component: 'TestComponent', action: 'testAction' };
      const result = handleError(error, context);
      
      expect(result.context).toEqual(context);
    });

    it('should handle string errors', () => {
      const result = handleError('String error message');
      
      expect(result.message).toBe('String error message');
      expect(result.userMessage).toBeDefined();
    });
  });

  describe('handleMalformedJson', () => {
    it('should return raw data and error', () => {
      const rawData = '{invalid json}';
      const parseError = new Error('Unexpected token i in JSON');
      const result = handleMalformedJson(rawData, parseError);
      
      expect(result.raw).toBe(rawData);
      expect(result.formatted).toBe(rawData);
      expect(result.error).toContain('Unexpected token');
    });
  });

  describe('createErrorMessage', () => {
    it('should create error message with required fields', () => {
      const message = createErrorMessage('TEST_ERROR', 'Test error message');
      
      expect(message.type).toBe('error');
      expect(message.error_code).toBe('TEST_ERROR');
      expect(message.message).toBe('Test error message');
      expect(message.id).toBeDefined();
      expect(message.timestamp).toBeDefined();
    });

    it('should include details when provided', () => {
      const details = { extra: 'info' };
      const message = createErrorMessage('TEST_ERROR', 'Test error', details);
      
      expect(message.details).toEqual(details);
    });
  });

  describe('shouldRetryOnError', () => {
    it('should not retry auth errors', () => {
      const error = new Error('401 Unauthorized');
      expect(shouldRetryOnError(error, 1)).toBe(false);
    });

    it('should retry network errors up to limit', () => {
      const error = new Error('Network connection failed');
      expect(shouldRetryOnError(error, 1)).toBe(true);
      expect(shouldRetryOnError(error, 2)).toBe(true);
      expect(shouldRetryOnError(error, 3)).toBe(false);
    });

    it('should not retry other errors', () => {
      const error = new Error('Some other error');
      expect(shouldRetryOnError(error, 1)).toBe(false);
    });
  });
});
