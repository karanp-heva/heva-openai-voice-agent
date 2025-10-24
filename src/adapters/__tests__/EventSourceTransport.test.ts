import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EventSourceTransport } from '../EventSourceTransport';
import type { SessionConfig } from '../../types/session';

describe('EventSourceTransport', () => {
  let transport: EventSourceTransport;
  let mockEventSource: any;
  let sessionConfig: SessionConfig;
  let fetchMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock EventSource
    mockEventSource = {
      readyState: 0, // CONNECTING
      close: vi.fn(),
      onopen: null,
      onmessage: null,
      onerror: null,
      addEventListener: vi.fn(),
    };

    // Mock EventSource constructor
    global.EventSource = vi.fn(() => mockEventSource) as any;
    (global.EventSource as any).CONNECTING = 0;
    (global.EventSource as any).OPEN = 1;
    (global.EventSource as any).CLOSED = 2;

    // Mock fetch for sending messages
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    transport = new EventSourceTransport();
    
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
    it('should create EventSource connection with correct URL', async () => {
      const connectPromise = transport.connect(sessionConfig);
      
      mockEventSource.readyState = 1; // OPEN
      mockEventSource.onopen?.();

      await connectPromise;

      expect(global.EventSource).toHaveBeenCalledWith(
        expect.stringContaining('/sse')
      );
      expect(global.EventSource).toHaveBeenCalledWith(
        expect.stringContaining('practice_id=1')
      );
    });

    it('should notify status change to connecting then open', async () => {
      const statusCallback = vi.fn();
      transport.onStatusChange(statusCallback);

      const connectPromise = transport.connect(sessionConfig);
      
      expect(statusCallback).toHaveBeenCalledWith('connecting');

      mockEventSource.readyState = 1;
      mockEventSource.onopen?.();

      await connectPromise;

      expect(statusCallback).toHaveBeenCalledWith('open');
    });

    it('should set up custom event listeners', async () => {
      const connectPromise = transport.connect(sessionConfig);
      
      mockEventSource.readyState = 1;
      mockEventSource.onopen?.();

      await connectPromise;

      expect(mockEventSource.addEventListener).toHaveBeenCalledWith('session', expect.any(Function));
      expect(mockEventSource.addEventListener).toHaveBeenCalledWith('audio', expect.any(Function));
      expect(mockEventSource.addEventListener).toHaveBeenCalledWith('transcript', expect.any(Function));
      expect(mockEventSource.addEventListener).toHaveBeenCalledWith('status', expect.any(Function));
    });

    it('should throw error if already connected', async () => {
      mockEventSource.readyState = 1; // OPEN
      
      const connectPromise = transport.connect(sessionConfig);
      mockEventSource.onopen?.();
      await connectPromise;

      await expect(transport.connect(sessionConfig)).rejects.toThrow('EventSource is already connected');
    });
  });

  describe('disconnect', () => {
    it('should close EventSource connection', async () => {
      const connectPromise = transport.connect(sessionConfig);
      mockEventSource.readyState = 1;
      mockEventSource.onopen?.();
      await connectPromise;

      await transport.disconnect();

      expect(mockEventSource.close).toHaveBeenCalled();
    });

    it('should notify status change to closed', async () => {
      const statusCallback = vi.fn();
      transport.onStatusChange(statusCallback);

      const connectPromise = transport.connect(sessionConfig);
      mockEventSource.readyState = 1;
      mockEventSource.onopen?.();
      await connectPromise;

      statusCallback.mockClear();
      await transport.disconnect();

      expect(statusCallback).toHaveBeenCalledWith('closed');
    });
  });

  describe('send', () => {
    it('should send message via HTTP POST', async () => {
      const connectPromise = transport.connect(sessionConfig);
      mockEventSource.readyState = 1;
      mockEventSource.onopen?.();
      
      // Simulate session event with session_id
      const sessionEventHandler = mockEventSource.addEventListener.mock.calls.find(
        (call: any) => call[0] === 'session'
      )?.[1];
      sessionEventHandler?.({ data: JSON.stringify({ session_id: 'session-123' }) });

      await connectPromise;

      fetchMock.mockResolvedValue({ ok: true });

      const message = { type: 'test', data: 'hello' };
      await transport.send(message);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/send'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('session-123'),
        })
      );
    });

    it('should throw error if no session', async () => {
      await expect(transport.send({ test: 'data' })).rejects.toThrow('No active session');
    });

    it('should throw error if fetch fails', async () => {
      const connectPromise = transport.connect(sessionConfig);
      mockEventSource.readyState = 1;
      mockEventSource.onopen?.();
      
      const sessionEventHandler = mockEventSource.addEventListener.mock.calls.find(
        (call: any) => call[0] === 'session'
      )?.[1];
      sessionEventHandler?.({ data: JSON.stringify({ session_id: 'session-123' }) });

      await connectPromise;

      fetchMock.mockResolvedValue({ ok: false, status: 500, statusText: 'Server Error' });

      await expect(transport.send({ test: 'data' })).rejects.toThrow('Failed to send message');
    });
  });

  describe('message handling', () => {
    it('should parse and notify messages', async () => {
      const messageCallback = vi.fn();
      transport.onMessage(messageCallback);

      const connectPromise = transport.connect(sessionConfig);
      mockEventSource.readyState = 1;
      mockEventSource.onopen?.();
      await connectPromise;

      const testMessage = {
        id: 'msg-123',
        timestamp: '2025-10-21T14:30:45.123Z',
        type: 'transcript',
        role: 'user',
        text: 'Hello',
      };

      mockEventSource.onmessage?.({ data: JSON.stringify(testMessage) });

      expect(messageCallback).toHaveBeenCalledWith(testMessage);
    });

    it('should handle custom event types', async () => {
      const messageCallback = vi.fn();
      transport.onMessage(messageCallback);

      const connectPromise = transport.connect(sessionConfig);
      mockEventSource.readyState = 1;
      mockEventSource.onopen?.();
      await connectPromise;

      // Get the audio event handler
      const audioEventHandler = mockEventSource.addEventListener.mock.calls.find(
        (call: any) => call[0] === 'audio'
      )?.[1];

      const audioMessage = {
        data: 'base64data',
        bytesCount: 1024,
      };

      audioEventHandler?.({ data: JSON.stringify(audioMessage) });

      expect(messageCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'audio',
          data: 'base64data',
        })
      );
    });

    it('should handle malformed JSON gracefully', async () => {
      const messageCallback = vi.fn();
      transport.onMessage(messageCallback);

      const connectPromise = transport.connect(sessionConfig);
      mockEventSource.readyState = 1;
      mockEventSource.onopen?.();
      await connectPromise;

      mockEventSource.onmessage?.({ data: 'invalid json {' });

      expect(messageCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          error_code: 'PARSE_ERROR',
          message: 'Failed to parse incoming SSE message',
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle connection errors', async () => {
      const errorCallback = vi.fn();
      transport.onError(errorCallback);

      const connectPromise = transport.connect(sessionConfig);
      
      mockEventSource.readyState = 2; // CLOSED
      mockEventSource.onerror?.({});

      await expect(connectPromise).rejects.toThrow('EventSource connection closed unexpectedly');
      expect(errorCallback).toHaveBeenCalled();
    });

    it('should handle reconnection attempts', async () => {
      const statusCallback = vi.fn();
      transport.onStatusChange(statusCallback);

      const connectPromise = transport.connect(sessionConfig);
      mockEventSource.readyState = 1;
      mockEventSource.onopen?.();
      await connectPromise;

      statusCallback.mockClear();
      
      // Simulate reconnection
      mockEventSource.readyState = 0; // CONNECTING
      mockEventSource.onerror?.({});

      expect(statusCallback).toHaveBeenCalledWith('connecting');
    });
  });

  describe('metadata', () => {
    it('should return correct transport type', () => {
      expect(transport.getTransportType()).toBe('sse');
    });

    it('should return connection status', async () => {
      expect(transport.isConnected()).toBe(false);

      const connectPromise = transport.connect(sessionConfig);
      mockEventSource.readyState = 1;
      mockEventSource.onopen?.();
      await connectPromise;

      expect(transport.isConnected()).toBe(true);

      await transport.disconnect();
      expect(transport.isConnected()).toBe(false);
    });
  });
});
