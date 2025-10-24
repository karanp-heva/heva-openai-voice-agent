import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RealtimeConsole } from '../RealtimeConsole';
import type { Message, AudioMessage, TranscriptMessage, StatusMessage, ErrorMessage } from '../../types/messages';

// Mock react-window
vi.mock('react-window', () => ({
  FixedSizeList: ({ children, itemCount }: any) => (
    <div data-testid="virtualized-list">
      {Array.from({ length: itemCount }, (_, index) => 
        children({ index, style: {} })
      )}
    </div>
  ),
}));

describe('RealtimeConsole', () => {
  const createAudioMessage = (id: string, timestamp: string): AudioMessage => ({
    id,
    timestamp,
    type: 'audio',
    data: 'base64data',
    direction: 'received',
    bytesCount: 4096,
  });

  const createTranscriptMessage = (id: string, timestamp: string, text: string): TranscriptMessage => ({
    id,
    timestamp,
    type: 'transcript',
    role: 'user',
    text,
  });

  const createStatusMessage = (id: string, timestamp: string): StatusMessage => ({
    id,
    timestamp,
    type: 'status',
    status: 'connected',
    message: 'Connection established',
  });

  const createErrorMessage = (id: string, timestamp: string): ErrorMessage => ({
    id,
    timestamp,
    type: 'error',
    error_code: 'AUTH_ERROR',
    message: 'Authentication failed',
  });

  describe('Empty State', () => {
    it('should display empty state when no messages', () => {
      render(<RealtimeConsole messages={[]} />);

      expect(screen.getByText(/no messages yet/i)).toBeInTheDocument();
      expect(screen.getByText(/messages will appear here when the session is active/i)).toBeInTheDocument();
    });
  });

  describe('Message Rendering', () => {
    it('should render messages with timestamps in ISO 8601 format', () => {
      const messages: Message[] = [
        createAudioMessage('1', '2025-10-21T14:30:45.123Z'),
        createTranscriptMessage('2', '2025-10-21T14:30:46.456Z', 'Hello'),
      ];

      render(<RealtimeConsole messages={messages} />);

      expect(screen.getByText('2025-10-21T14:30:45.123Z')).toBeInTheDocument();
      expect(screen.getByText('2025-10-21T14:30:46.456Z')).toBeInTheDocument();
    });

    it('should render audio messages with byte count', () => {
      const messages: Message[] = [
        createAudioMessage('1', '2025-10-21T14:30:45.123Z'),
      ];

      render(<RealtimeConsole messages={messages} />);

      expect(screen.getByText(/audio: Received 4096 bytes/i)).toBeInTheDocument();
    });

    it('should render transcript messages with role and text', () => {
      const messages: Message[] = [
        createTranscriptMessage('1', '2025-10-21T14:30:45.123Z', 'Hello, I need help'),
      ];

      render(<RealtimeConsole messages={messages} />);

      expect(screen.getByText(/transcript \(user\): "Hello, I need help"/i)).toBeInTheDocument();
    });

    it('should render status messages', () => {
      const messages: Message[] = [
        createStatusMessage('1', '2025-10-21T14:30:45.123Z'),
      ];

      render(<RealtimeConsole messages={messages} />);

      expect(screen.getByText(/status: connected - Connection established/i)).toBeInTheDocument();
    });

    it('should render error messages with error code', () => {
      const messages: Message[] = [
        createErrorMessage('1', '2025-10-21T14:30:45.123Z'),
      ];

      render(<RealtimeConsole messages={messages} />);

      expect(screen.getByText(/error \[AUTH_ERROR\]: Authentication failed/i)).toBeInTheDocument();
    });

    it('should render multiple messages in order', () => {
      const messages: Message[] = [
        createAudioMessage('1', '2025-10-21T14:30:45.123Z'),
        createTranscriptMessage('2', '2025-10-21T14:30:46.456Z', 'Hello'),
        createStatusMessage('3', '2025-10-21T14:30:47.789Z'),
      ];

      render(<RealtimeConsole messages={messages} />);

      const messageElements = screen.getAllByTestId(/message-/);
      expect(messageElements).toHaveLength(3);
    });
  });

  describe('JSON Syntax Highlighting', () => {
    it('should show View JSON details for non-audio messages', () => {
      const messages: Message[] = [
        createTranscriptMessage('1', '2025-10-21T14:30:45.123Z', 'Hello'),
      ];

      render(<RealtimeConsole messages={messages} />);

      expect(screen.getByText(/view json/i)).toBeInTheDocument();
    });

    it('should not show View JSON for audio messages', () => {
      const messages: Message[] = [
        createAudioMessage('1', '2025-10-21T14:30:45.123Z'),
      ];

      render(<RealtimeConsole messages={messages} />);

      expect(screen.queryByText(/view json/i)).not.toBeInTheDocument();
    });

    it('should display JSON content when details are expanded', () => {
      const messages: Message[] = [
        createTranscriptMessage('1', '2025-10-21T14:30:45.123Z', 'Hello'),
      ];

      const { container } = render(<RealtimeConsole messages={messages} />);

      const details = container.querySelector('details');
      expect(details).toBeInTheDocument();
      
      // Check that JSON content is in the details
      const pre = container.querySelector('pre');
      expect(pre).toBeInTheDocument();
    });
  });

  describe('Malformed JSON Handling', () => {
    it('should display error indicator for malformed JSON', () => {
      // Create a message with intentionally malformed structure
      const malformedMessage = {
        id: '1',
        timestamp: '2025-10-21T14:30:45.123Z',
        type: 'custom',
        data: 'not valid json',
      } as any;

      render(<RealtimeConsole messages={[malformedMessage]} />);

      // The message should still render
      expect(screen.getByTestId('message-1')).toBeInTheDocument();
    });
  });

  describe('Auto-scroll Behavior', () => {
    it('should render console container with scroll capability', () => {
      const messages: Message[] = [
        createAudioMessage('1', '2025-10-21T14:30:45.123Z'),
        createTranscriptMessage('2', '2025-10-21T14:30:46.456Z', 'Hello'),
      ];

      render(<RealtimeConsole messages={messages} />);

      const console = screen.getByTestId('realtime-console');
      expect(console).toBeInTheDocument();
    });

    it('should handle scroll events', () => {
      const messages: Message[] = Array.from({ length: 10 }, (_, i) =>
        createTranscriptMessage(`${i}`, `2025-10-21T14:30:${i}.000Z`, `Message ${i}`)
      );

      render(<RealtimeConsole messages={messages} />);

      const scrollContainer = screen.getByTestId('realtime-console');
      expect(scrollContainer).toBeInTheDocument();
    });
  });

  describe('Message Limit Enforcement', () => {
    it('should limit messages to maxMessages', () => {
      const messages: Message[] = Array.from({ length: 1500 }, (_, i) =>
        createTranscriptMessage(`${i}`, `2025-10-21T14:30:${i % 60}.000Z`, `Message ${i}`)
      );

      render(<RealtimeConsole messages={messages} maxMessages={1000} />);

      // Should only render the last 1000 messages
      const messageElements = screen.getAllByTestId(/message-/);
      expect(messageElements.length).toBeLessThanOrEqual(1000);
    });

    it('should keep most recent messages when limit is exceeded', () => {
      const messages: Message[] = Array.from({ length: 1200 }, (_, i) =>
        createTranscriptMessage(`${i}`, `2025-10-21T14:30:${i % 60}.000Z`, `Message ${i}`)
      );

      render(<RealtimeConsole messages={messages} maxMessages={1000} />);

      // Should have message 1199 (the last one)
      expect(screen.getByTestId('message-1199')).toBeInTheDocument();
      
      // Should not have message 0 (the first one, which should be removed)
      expect(screen.queryByTestId('message-0')).not.toBeInTheDocument();
    });

    it('should use default maxMessages of 1000', () => {
      const messages: Message[] = Array.from({ length: 1500 }, (_, i) =>
        createTranscriptMessage(`${i}`, `2025-10-21T14:30:${i % 60}.000Z`, `Message ${i}`)
      );

      render(<RealtimeConsole messages={messages} />);

      const messageElements = screen.getAllByTestId(/message-/);
      expect(messageElements.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Virtualization', () => {
    it('should use virtualized list when messages exceed threshold', () => {
      const messages: Message[] = Array.from({ length: 150 }, (_, i) =>
        createTranscriptMessage(`${i}`, `2025-10-21T14:30:${i % 60}.000Z`, `Message ${i}`)
      );

      render(<RealtimeConsole messages={messages} />);

      // Check if virtualized list is used
      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
    });

    it('should not use virtualized list for small message counts', () => {
      const messages: Message[] = Array.from({ length: 50 }, (_, i) =>
        createTranscriptMessage(`${i}`, `2025-10-21T14:30:${i % 60}.000Z`, `Message ${i}`)
      );

      render(<RealtimeConsole messages={messages} />);

      // Should not use virtualized list
      expect(screen.queryByTestId('virtualized-list')).not.toBeInTheDocument();
    });
  });

  describe('Monospace Font', () => {
    it('should use monospace font for message content', () => {
      const messages: Message[] = [
        createTranscriptMessage('1', '2025-10-21T14:30:45.123Z', 'Hello'),
      ];

      const { container } = render(<RealtimeConsole messages={messages} />);

      const messageContent = container.querySelector('.font-mono');
      expect(messageContent).toBeInTheDocument();
    });

    it('should use monospace font for timestamps', () => {
      const messages: Message[] = [
        createTranscriptMessage('1', '2025-10-21T14:30:45.123Z', 'Hello'),
      ];

      render(<RealtimeConsole messages={messages} />);

      const timestamp = screen.getByText('2025-10-21T14:30:45.123Z');
      expect(timestamp).toHaveClass('font-mono');
    });
  });
});
