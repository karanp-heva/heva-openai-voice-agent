import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PollingTransport } from '../PollingTransport';
import type { SessionConfig } from '../../types/session';

describe('PollingTransport', () => {
  let transport: PollingTransport;
  let sessionConfig: SessionConfig;
  let fetchMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Mock fetch
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    transport = new PollingTransport();
    
    sessionConfig = {
      practiceId: 1,
      conversationId: 'test-conv-123',
      patientId: 'patient-456',
      timezone: 'America/New_York',
      authToken: 'test-token',
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('connect', () => {
    it('should initialize session and start polling', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ session_id: 'session-123' }),
      });

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ messages: [] }),
      });

      await transport.connect(sessionConfig);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/init'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('test-conv-123'),
        })
      );

      expect(transport.isConnected()).toBe(true);
    });

    it('should notify status changes', async () => {
      const statusCallback = vi.fn();
      transport.onStatusChange(statusCallback);

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ session_id: 'session-123' }),
      });

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ messages: [] }),
      });

      await transport.connect(sessionConfig);

      expect(statusCallback).toHaveBeenCalledWith('connecting');
      expect(statusCallback).toHaveBeenCalledWith('open');
    });

    it('should throw error if initialization fails', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
      });

      await expect(transport.connect(sessionConfig)).rejects.toThrow('Failed to initialize session');
    });

    it('should throw error if already connected', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ session_id: 'session-123', messages: [] }),
      });

      await transport.connect(sessionConfig);

      await expect(transport.connect(sessionConfig)).rejects.toThrow('PollingTransport is already connected');
    });
  });

  describe('disconnect', () => {
    beforeEach(async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ session_id: 'session-123', messages: [] }),
      });

      await transport.connect(sessionConfig);
    });

    it('should stop polling and close session', async () => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue({ ok: true });

      await transport.disconnect();

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/close'),
        expect.objectContaining({
          method: 'POST',
        })
      );

      expect(transport.isConnected()).toBe(false);
    });

    it('should notify status change to closed', async () => {
      const statusCallback = vi.fn();
      transport.onStatusChange(statusCallback);

      await transport.disconnect();

      expect(statusCallback).toHaveBeenCalledWith('closed');
    });
  });

  describe('send', () => {
    beforeEach(async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ session_id: 'session-123', messages: [] }),
      });

      await transport.connect(sessionConfig);
      fetchMock.mockClear();
    });

    it('should send message via HTTP POST', async () => {
      fetchMock.mockResolvedValue({ ok: true });

      const message = { type: 'test', data: 'hello' };
      await transport.send(message);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/send'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('session-123'),
        })
      );
    });

    it('should throw error if not connected', async () => {
      await transport.disconnect();

      await expect(transport.send({ test: 'data' })).rejects.toThrow('PollingTransport is not connected');
    });

    it('should throw error if send fails', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
      });

      await expect(transport.send({ test: 'data' })).rejects.toThrow('Failed to send message');
    });
  });

  describe('polling', () => {
    beforeEach(async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ session_id: 'session-123', messages: [] }),
      });

      await transport.connect(sessionConfig);
      fetchMock.mockClear();
    });

    it('should poll for messages at regular intervals', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ messages: [] }),
      });

      // Advance time to trigger polling
      await vi.advanceTimersByTimeAsync(1000);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/poll'),
        expect.any(Object)
      );

      // Advance again
      await vi.advanceTimersByTimeAsync(1000);

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should process received messages', async () => {
      const messageCallback = vi.fn();
      transport.onMessage(messageCallback);

      const testMessages = [
        {
          id: 'msg-1',
          timestamp: '2025-10-21T14:30:45.123Z',
          type: 'transcript',
          role: 'user',
          text: 'Hello',
        },
        {
          id: 'msg-2',
          timestamp: '2025-10-21T14:30:46.123Z',
          type: 'status',
          status: 'connected',
        },
      ];

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ messages: testMessages }),
      });

      await vi.advanceTimersByTimeAsync(1000);

      expect(messageCallback).toHaveBeenCalledTimes(2);
      expect(messageCallback).toHaveBeenCalledWith(testMessages[0]);
      expect(messageCallback).toHaveBeenCalledWith(testMessages[1]);
    });

    it('should add id and timestamp if missing', async () => {
      const messageCallback = vi.fn();
      transport.onMessage(messageCallback);

      const testMessages = [
        {
          type: 'status',
          status: 'connected',
        },
      ];

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ messages: testMessages }),
      });

      await vi.advanceTimersByTimeAsync(1000);

      expect(messageCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          timestamp: expect.any(String),
          type: 'status',
        })
      );
    });

    it('should handle polling errors gracefully', async () => {
      const errorCallback = vi.fn();
      transport.onError(errorCallback);

      fetchMock.mockRejectedValue(new Error('Network error'));

      await vi.advanceTimersByTimeAsync(1000);

      expect(errorCallback).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should disconnect if session not found', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const errorCallback = vi.fn();
      transport.onError(errorCallback);

      await vi.advanceTimersByTimeAsync(1000);

      expect(errorCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Session not found'),
        })
      );
    });
  });

  describe('metadata', () => {
    it('should return correct transport type', () => {
      expect(transport.getTransportType()).toBe('polling');
    });

    it('should return connection status', async () => {
      expect(transport.isConnected()).toBe(false);

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ session_id: 'session-123', messages: [] }),
      });

      await transport.connect(sessionConfig);

      expect(transport.isConnected()).toBe(true);

      await transport.disconnect();
      expect(transport.isConnected()).toBe(false);
    });
  });
});
