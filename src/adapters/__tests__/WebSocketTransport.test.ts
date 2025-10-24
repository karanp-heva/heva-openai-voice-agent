import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WebSocketTransport } from '../WebSocketTransport';
import type { SessionConfig } from '../../types/session';

describe('WebSocketTransport', () => {
  let transport: WebSocketTransport;
  let mockWebSocket: any;
  let sessionConfig: SessionConfig;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create mock WebSocket
    mockWebSocket = {
      readyState: WebSocket.CONNECTING,
      send: vi.fn(),
      close: vi.fn(),
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null,
    };

    // Mock WebSocket constructor
    global.WebSocket = vi.fn(() => mockWebSocket) as any;
    (global.WebSocket as any).CONNECTING = 0;
    (global.WebSocket as any).OPEN = 1;
    (global.WebSocket as any).CLOSING = 2;
    (global.WebSocket as any).CLOSED = 3;

    transport = new WebSocketTransport();
    
    sessionConfig = {
      practiceId: 1,
      conversationId: 'test-conv-123',
      patientId: 'patient-456',
      timezone: 'America/New_York',
      authToken: 'test-token',
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('connect', () => {
    it('should create WebSocket connection with correct URL', async () => {
      const connectPromise = transport.connect(sessionConfig);
      
      // Simulate connection open
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.();

      await connectPromise;

      expect(global.WebSocket).toHaveBeenCalledWith(
        expect.stringContaining('practice_id=1')
      );
      expect(global.WebSocket).toHaveBeenCalledWith(
        expect.stringContaining('conversation_id=test-conv-123')
      );
      expect(global.WebSocket).toHaveBeenCalledWith(
        expect.stringContaining('patient_id=patient-456')
      );
      expect(global.WebSocket).toHaveBeenCalledWith(
        expect.stringContaining('timezone=America%2FNew_York')
      );
    });

    it('should notify status change to connecting then open', async () => {
      const statusCallback = vi.fn();
      transport.onStatusChange(statusCallback);

      const connectPromise = transport.connect(sessionConfig);
      
      expect(statusCallback).toHaveBeenCalledWith('connecting');

      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.();

      await connectPromise;

      expect(statusCallback).toHaveBeenCalledWith('open');
    });

    it('should reject on connection error', async () => {
      const connectPromise = transport.connect(sessionConfig);
      
      mockWebSocket.onerror?.();

      await expect(connectPromise).rejects.toThrow('WebSocket connection error');
    });

    it('should reject on connection timeout', async () => {
      vi.useFakeTimers();
      
      const connectPromise = transport.connect(sessionConfig);
      
      // Fast-forward time by 10 seconds (timeout)
      vi.advanceTimersByTime(10000);

      await expect(connectPromise).rejects.toThrow('WebSocket connection timeout');
      
      vi.useRealTimers();
    });

    it('should throw error if already connected', async () => {
      mockWebSocket.readyState = WebSocket.OPEN;
      
      const connectPromise = transport.connect(sessionConfig);
      mockWebSocket.onopen?.();
      await connectPromise;

      await expect(transport.connect(sessionConfig)).rejects.toThrow('WebSocket is already connected');
    });
  });

  describe('disconnect', () => {
    it('should close WebSocket connection', async () => {
      const connectPromise = transport.connect(sessionConfig);
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.();
      await connectPromise;

      await transport.disconnect();

      expect(mockWebSocket.close).toHaveBeenCalledWith(1000, 'Client disconnect');
    });

    it('should notify status change to closed', async () => {
      const statusCallback = vi.fn();
      transport.onStatusChange(statusCallback);

      const connectPromise = transport.connect(sessionConfig);
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.();
      await connectPromise;

      statusCallback.mockClear();
      await transport.disconnect();

      expect(statusCallback).toHaveBeenCalledWith('closed');
    });
  });

  describe('send', () => {
    it('should send JSON message through WebSocket', async () => {
      const connectPromise = transport.connect(sessionConfig);
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.();
      await connectPromise;

      const message = { type: 'test', data: 'hello' };
      await transport.send(message);

      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(message));
    });

    it('should send string message through WebSocket', async () => {
      const connectPromise = transport.connect(sessionConfig);
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.();
      await connectPromise;

      const message = 'test message';
      await transport.send(message);

      expect(mockWebSocket.send).toHaveBeenCalledWith(message);
    });

    it('should throw error if not connected', async () => {
      await expect(transport.send({ test: 'data' })).rejects.toThrow('WebSocket is not connected');
    });
  });

  describe('message handling', () => {
    it('should parse and notify JSON messages', async () => {
      const messageCallback = vi.fn();
      transport.onMessage(messageCallback);

      const connectPromise = transport.connect(sessionConfig);
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.();
      await connectPromise;

      const testMessage = {
        id: 'msg-123',
        timestamp: '2025-10-21T14:30:45.123Z',
        type: 'transcript',
        role: 'user',
        text: 'Hello',
      };

      mockWebSocket.onmessage?.({ data: JSON.stringify(testMessage) });

      expect(messageCallback).toHaveBeenCalledWith(testMessage);
    });

    it('should handle malformed JSON gracefully', async () => {
      const messageCallback = vi.fn();
      transport.onMessage(messageCallback);

      const connectPromise = transport.connect(sessionConfig);
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.();
      await connectPromise;

      mockWebSocket.onmessage?.({ data: 'invalid json {' });

      expect(messageCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          error_code: 'PARSE_ERROR',
          message: 'Failed to parse incoming message',
        })
      );
    });

    it('should add id and timestamp if missing', async () => {
      const messageCallback = vi.fn();
      transport.onMessage(messageCallback);

      const connectPromise = transport.connect(sessionConfig);
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.();
      await connectPromise;

      const testMessage = {
        type: 'status',
        status: 'connected',
      };

      mockWebSocket.onmessage?.({ data: JSON.stringify(testMessage) });

      expect(messageCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          timestamp: expect.any(String),
          type: 'status',
          status: 'connected',
        })
      );
    });
  });

  describe('error handling', () => {
    it('should notify error callback on connection error', async () => {
      const errorCallback = vi.fn();
      transport.onError(errorCallback);

      const connectPromise = transport.connect(sessionConfig);
      mockWebSocket.onerror?.();

      await expect(connectPromise).rejects.toThrow();
      expect(errorCallback).toHaveBeenCalled();
    });

    it('should handle abnormal close', async () => {
      const statusCallback = vi.fn();
      const errorCallback = vi.fn();
      transport.onStatusChange(statusCallback);
      transport.onError(errorCallback);

      const connectPromise = transport.connect(sessionConfig);
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.();
      await connectPromise;

      statusCallback.mockClear();
      mockWebSocket.onclose?.({ code: 1006, reason: 'Abnormal closure' });

      expect(statusCallback).toHaveBeenCalledWith('error');
      expect(errorCallback).toHaveBeenCalled();
    });
  });

  describe('metadata', () => {
    it('should return correct transport type', () => {
      expect(transport.getTransportType()).toBe('websocket');
    });

    it('should return connection status', async () => {
      expect(transport.isConnected()).toBe(false);

      const connectPromise = transport.connect(sessionConfig);
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.();
      await connectPromise;

      expect(transport.isConnected()).toBe(true);

      await transport.disconnect();
      expect(transport.isConnected()).toBe(false);
    });
  });
});
