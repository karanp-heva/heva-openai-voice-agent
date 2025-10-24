import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ControlsPanel } from '../ControlsPanel';

// Mock the useSession hook
const mockSendMessage = vi.fn();
const mockReconnect = vi.fn();
const mockClearMessages = vi.fn();
let mockIsConnected = false;

vi.mock('../../context/SessionContext', async () => {
  const actual = await vi.importActual('../../context/SessionContext');
  return {
    ...actual,
    useSession: () => ({
      config: null,
      isConnected: mockIsConnected,
      connect: vi.fn(),
      disconnect: vi.fn(),
      messages: [],
      addMessage: vi.fn(),
      clearMessages: mockClearMessages,
      connectionState: {
        status: mockIsConnected ? 'open' : 'closed',
        transport: 'websocket',
        reconnectAttempts: 0,
        reconnectDelay: 1000,
      },
      reconnect: mockReconnect,
      reconnectionCountdown: 0,
      isReconnecting: false,
      maxAttemptsReached: false,
      transport: null,
      switchTransport: vi.fn(),
      sendMessage: mockSendMessage,
      replayMessage: vi.fn(),
    }),
  };
});

describe('ControlsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsConnected = false;
  });

  describe('Component Rendering', () => {
    it('should render all control elements', () => {
      render(<ControlsPanel />);

      expect(screen.getByLabelText(/send custom json message/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/client metadata/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /force reconnect/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel response/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear console/i })).toBeInTheDocument();
    });

    it('should render textarea for custom message', () => {
      render(<ControlsPanel />);

      const textarea = screen.getByLabelText(/send custom json message/i);
      expect(textarea).toBeInTheDocument();
      expect(textarea.tagName).toBe('TEXTAREA');
    });

    it('should render textarea for metadata', () => {
      render(<ControlsPanel />);

      const textarea = screen.getByLabelText(/client metadata/i);
      expect(textarea).toBeInTheDocument();
      expect(textarea.tagName).toBe('TEXTAREA');
    });
  });

  describe('Button State - Not Connected', () => {
    it('should disable send message button when not connected', () => {
      mockIsConnected = false;
      render(<ControlsPanel />);

      const sendButton = screen.getByRole('button', { name: /send message/i });
      expect(sendButton).toBeDisabled();
    });

    it('should disable force reconnect button when not connected', () => {
      mockIsConnected = false;
      render(<ControlsPanel />);

      const reconnectButton = screen.getByRole('button', { name: /force reconnect/i });
      expect(reconnectButton).toBeDisabled();
    });

    it('should disable cancel response button when not connected', () => {
      mockIsConnected = false;
      render(<ControlsPanel />);

      const cancelButton = screen.getByRole('button', { name: /cancel response/i });
      expect(cancelButton).toBeDisabled();
    });

    it('should disable update metadata button when not connected', () => {
      mockIsConnected = false;
      render(<ControlsPanel />);

      const updateButton = screen.getByRole('button', { name: /update metadata/i });
      expect(updateButton).toBeDisabled();
    });

    it('should always enable clear console button', () => {
      mockIsConnected = false;
      render(<ControlsPanel />);

      const clearButton = screen.getByRole('button', { name: /clear console/i });
      expect(clearButton).not.toBeDisabled();
    });

    it('should disable message textarea when not connected', () => {
      mockIsConnected = false;
      render(<ControlsPanel />);

      const textarea = screen.getByLabelText(/send custom json message/i);
      expect(textarea).toBeDisabled();
    });

    it('should disable metadata textarea when not connected', () => {
      mockIsConnected = false;
      render(<ControlsPanel />);

      const textarea = screen.getByLabelText(/client metadata/i);
      expect(textarea).toBeDisabled();
    });
  });

  describe('Button State - Connected', () => {
    beforeEach(() => {
      mockIsConnected = true;
    });

    it('should enable send message button when connected', () => {
      render(<ControlsPanel />);

      const sendButton = screen.getByRole('button', { name: /send message/i });
      expect(sendButton).not.toBeDisabled();
    });

    it('should enable force reconnect button when connected', () => {
      render(<ControlsPanel />);

      const reconnectButton = screen.getByRole('button', { name: /force reconnect/i });
      expect(reconnectButton).not.toBeDisabled();
    });

    it('should enable cancel response button when connected', () => {
      render(<ControlsPanel />);

      const cancelButton = screen.getByRole('button', { name: /cancel response/i });
      expect(cancelButton).not.toBeDisabled();
    });

    it('should enable update metadata button when connected', () => {
      render(<ControlsPanel />);

      const updateButton = screen.getByRole('button', { name: /update metadata/i });
      expect(updateButton).not.toBeDisabled();
    });

    it('should enable message textarea when connected', () => {
      render(<ControlsPanel />);

      const textarea = screen.getByLabelText(/send custom json message/i);
      expect(textarea).not.toBeDisabled();
    });

    it('should enable metadata textarea when connected', () => {
      render(<ControlsPanel />);

      const textarea = screen.getByLabelText(/client metadata/i);
      expect(textarea).not.toBeDisabled();
    });
  });

  describe('Send Custom Message', () => {
    beforeEach(() => {
      mockIsConnected = true;
    });

    it('should send valid JSON message', async () => {
      mockSendMessage.mockResolvedValue(undefined);
      render(<ControlsPanel />);

      const textarea = screen.getByLabelText(/send custom json message/i);
      const sendButton = screen.getByRole('button', { name: /send message/i });

      const testMessage = { type: 'test', data: 'example' };
      fireEvent.change(textarea, { target: { value: JSON.stringify(testMessage) } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith(testMessage);
      });
    });

    it('should show error for empty message', async () => {
      render(<ControlsPanel />);

      const sendButton = screen.getByRole('button', { name: /send message/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/message cannot be empty/i)).toBeInTheDocument();
      });

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('should show error for invalid JSON', async () => {
      render(<ControlsPanel />);

      const textarea = screen.getByLabelText(/send custom json message/i);
      const sendButton = screen.getByRole('button', { name: /send message/i });

      fireEvent.change(textarea, { target: { value: '{invalid json}' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid json format/i)).toBeInTheDocument();
      });

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('should clear message after successful send', async () => {
      mockSendMessage.mockResolvedValue(undefined);
      render(<ControlsPanel />);

      const textarea = screen.getByLabelText(/send custom json message/i) as HTMLTextAreaElement;
      const sendButton = screen.getByRole('button', { name: /send message/i });

      fireEvent.change(textarea, { target: { value: '{"type": "test"}' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(textarea.value).toBe('');
      });
    });

    it('should clear error when textarea changes', async () => {
      render(<ControlsPanel />);

      const textarea = screen.getByLabelText(/send custom json message/i);
      const sendButton = screen.getByRole('button', { name: /send message/i });

      // Trigger error
      fireEvent.click(sendButton);
      await waitFor(() => {
        expect(screen.getByText(/message cannot be empty/i)).toBeInTheDocument();
      });

      // Change textarea
      fireEvent.change(textarea, { target: { value: '{"test": true}' } });

      await waitFor(() => {
        expect(screen.queryByText(/message cannot be empty/i)).not.toBeInTheDocument();
      });
    });

    it('should show sending state while message is being sent', async () => {
      mockSendMessage.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
      render(<ControlsPanel />);

      const textarea = screen.getByLabelText(/send custom json message/i);
      const sendButton = screen.getByRole('button', { name: /send message/i });

      fireEvent.change(textarea, { target: { value: '{"type": "test"}' } });
      fireEvent.click(sendButton);

      expect(screen.getByRole('button', { name: /sending/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled();
    });

    it('should handle send message error', async () => {
      mockSendMessage.mockRejectedValue(new Error('Network error'));
      render(<ControlsPanel />);

      const textarea = screen.getByLabelText(/send custom json message/i);
      const sendButton = screen.getByRole('button', { name: /send message/i });

      fireEvent.change(textarea, { target: { value: '{"type": "test"}' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        // Updated to match user-friendly error message from error handler
        expect(screen.getByText(/network connection failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Update Metadata', () => {
    beforeEach(() => {
      mockIsConnected = true;
    });

    it('should send metadata update with valid JSON', async () => {
      mockSendMessage.mockResolvedValue(undefined);
      render(<ControlsPanel />);

      const textarea = screen.getByLabelText(/client metadata/i);
      const updateButton = screen.getByRole('button', { name: /update metadata/i });

      const testMetadata = { key: 'value', number: 123 };
      fireEvent.change(textarea, { target: { value: JSON.stringify(testMetadata) } });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith({
          type: 'client_metadata_update',
          metadata: testMetadata,
        });
      });
    });

    it('should show error for invalid metadata JSON', async () => {
      render(<ControlsPanel />);

      const textarea = screen.getByLabelText(/client metadata/i);
      const updateButton = screen.getByRole('button', { name: /update metadata/i });

      fireEvent.change(textarea, { target: { value: 'not valid json' } });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid json format/i)).toBeInTheDocument();
      });

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('should clear metadata error when textarea changes', async () => {
      render(<ControlsPanel />);

      const textarea = screen.getByLabelText(/client metadata/i);
      const updateButton = screen.getByRole('button', { name: /update metadata/i });

      // Trigger error
      fireEvent.change(textarea, { target: { value: 'invalid' } });
      fireEvent.click(updateButton);
      await waitFor(() => {
        expect(screen.getByText(/invalid json format/i)).toBeInTheDocument();
      });

      // Change textarea
      fireEvent.change(textarea, { target: { value: '{"valid": true}' } });

      await waitFor(() => {
        expect(screen.queryByText(/invalid json format/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Button Actions', () => {
    beforeEach(() => {
      mockIsConnected = true;
    });

    it('should call reconnect when force reconnect button is clicked', () => {
      render(<ControlsPanel />);

      const reconnectButton = screen.getByRole('button', { name: /force reconnect/i });
      fireEvent.click(reconnectButton);

      expect(mockReconnect).toHaveBeenCalled();
    });

    it('should call clearMessages when clear console button is clicked', () => {
      render(<ControlsPanel />);

      const clearButton = screen.getByRole('button', { name: /clear console/i });
      fireEvent.click(clearButton);

      expect(mockClearMessages).toHaveBeenCalled();
    });

    it('should send cancel response message when cancel button is clicked', async () => {
      mockSendMessage.mockResolvedValue(undefined);
      render(<ControlsPanel />);

      const cancelButton = screen.getByRole('button', { name: /cancel response/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith({
          type: 'response.cancel',
        });
      });
    });

    it('should clear console even when not connected', () => {
      mockIsConnected = false;
      render(<ControlsPanel />);

      const clearButton = screen.getByRole('button', { name: /clear console/i });
      fireEvent.click(clearButton);

      expect(mockClearMessages).toHaveBeenCalled();
    });
  });
});
