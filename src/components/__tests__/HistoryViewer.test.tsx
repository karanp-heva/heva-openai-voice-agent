import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HistoryViewer } from '../HistoryViewer';
import type { Message, AudioMessage, TranscriptMessage, StatusMessage, ErrorMessage } from '../../types/messages';

describe('HistoryViewer', () => {
  const mockOnReplay = vi.fn();
  const mockOnExport = vi.fn();

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

  beforeEach(() => {
    mockOnReplay.mockClear();
    mockOnExport.mockClear();
  });

  describe('Message List Rendering', () => {
    it('should render empty state when no messages', () => {
      render(
        <HistoryViewer
          messages={[]}
          onReplay={mockOnReplay}
          onExport={mockOnExport}
        />
      );

      expect(screen.getByText(/no messages in history/i)).toBeInTheDocument();
      expect(screen.getByText(/messages will appear here as they are received/i)).toBeInTheDocument();
    });

    it('should render message list with timestamps', () => {
      const messages: Message[] = [
        createTranscriptMessage('1', '2025-10-21T14:30:45.123Z', 'Hello'),
        createTranscriptMessage('2', '2025-10-21T14:30:46.456Z', 'World'),
      ];

      render(
        <HistoryViewer
          messages={messages}
          onReplay={mockOnReplay}
          onExport={mockOnExport}
        />
      );

      expect(screen.getByText('2025-10-21T14:30:45.123Z')).toBeInTheDocument();
      expect(screen.getByText('2025-10-21T14:30:46.456Z')).toBeInTheDocument();
    });

    it('should render all message types', () => {
      const messages: Message[] = [
        createAudioMessage('1', '2025-10-21T14:30:45.123Z'),
        createTranscriptMessage('2', '2025-10-21T14:30:46.456Z', 'Hello'),
        createStatusMessage('3', '2025-10-21T14:30:47.789Z'),
        createErrorMessage('4', '2025-10-21T14:30:48.000Z'),
      ];

      render(
        <HistoryViewer
          messages={messages}
          onReplay={mockOnReplay}
          onExport={mockOnExport}
        />
      );

      expect(screen.getByTestId('history-message-1')).toBeInTheDocument();
      expect(screen.getByTestId('history-message-2')).toBeInTheDocument();
      expect(screen.getByTestId('history-message-3')).toBeInTheDocument();
      expect(screen.getByTestId('history-message-4')).toBeInTheDocument();
    });

    it('should display message count', () => {
      const messages: Message[] = [
        createTranscriptMessage('1', '2025-10-21T14:30:45.123Z', 'Hello'),
        createTranscriptMessage('2', '2025-10-21T14:30:46.456Z', 'World'),
        createTranscriptMessage('3', '2025-10-21T14:30:47.789Z', 'Test'),
      ];

      render(
        <HistoryViewer
          messages={messages}
          onReplay={mockOnReplay}
          onExport={mockOnExport}
        />
      );

      expect(screen.getByText('3 of 3 messages')).toBeInTheDocument();
    });
  });

  describe('Message Selection and Detail View', () => {
    it('should show message detail when message is clicked', () => {
      const messages: Message[] = [
        createTranscriptMessage('1', '2025-10-21T14:30:45.123Z', 'Hello'),
      ];

      render(
        <HistoryViewer
          messages={messages}
          onReplay={mockOnReplay}
          onExport={mockOnExport}
        />
      );

      const messageElement = screen.getByTestId('history-message-1');
      fireEvent.click(messageElement);

      expect(screen.getByText('Message Details')).toBeInTheDocument();
    });

    it('should hide message detail when clicked again', () => {
      const messages: Message[] = [
        createTranscriptMessage('1', '2025-10-21T14:30:45.123Z', 'Hello'),
      ];

      render(
        <HistoryViewer
          messages={messages}
          onReplay={mockOnReplay}
          onExport={mockOnExport}
        />
      );

      const messageElement = screen.getByTestId('history-message-1');
      
      // Click to show
      fireEvent.click(messageElement);
      expect(screen.getByText('Message Details')).toBeInTheDocument();

      // Click to hide
      fireEvent.click(messageElement);
      expect(screen.queryByText('Message Details')).not.toBeInTheDocument();
    });

    it('should show only one message detail at a time', () => {
      const messages: Message[] = [
        createTranscriptMessage('1', '2025-10-21T14:30:45.123Z', 'Hello'),
        createTranscriptMessage('2', '2025-10-21T14:30:46.456Z', 'World'),
      ];

      render(
        <HistoryViewer
          messages={messages}
          onReplay={mockOnReplay}
          onExport={mockOnExport}
        />
      );

      // Click first message
      fireEvent.click(screen.getByTestId('history-message-1'));
      expect(screen.getByText('Message Details')).toBeInTheDocument();

      // Click second message
      fireEvent.click(screen.getByTestId('history-message-2'));
      
      // Should still have only one "Message Details" heading
      const detailsHeadings = screen.getAllByText('Message Details');
      expect(detailsHeadings).toHaveLength(1);
    });

    it('should display JSON in detail view', () => {
      const messages: Message[] = [
        createTranscriptMessage('1', '2025-10-21T14:30:45.123Z', 'Hello'),
      ];

      const { container } = render(
        <HistoryViewer
          messages={messages}
          onReplay={mockOnReplay}
          onExport={mockOnExport}
        />
      );

      fireEvent.click(screen.getByTestId('history-message-1'));

      const pre = container.querySelector('pre');
      expect(pre).toBeInTheDocument();
    });
  });

  describe('Replay Functionality', () => {
    it('should call onReplay when replay button is clicked', () => {
      const messages: Message[] = [
        createTranscriptMessage('1', '2025-10-21T14:30:45.123Z', 'Hello'),
      ];

      render(
        <HistoryViewer
          messages={messages}
          onReplay={mockOnReplay}
          onExport={mockOnExport}
        />
      );

      const replayButton = screen.getByTestId('quick-replay-1');
      fireEvent.click(replayButton);

      expect(mockOnReplay).toHaveBeenCalledTimes(1);
      expect(mockOnReplay).toHaveBeenCalledWith(messages[0]);
    });

    it('should call onReplay from detail view', () => {
      const messages: Message[] = [
        createTranscriptMessage('1', '2025-10-21T14:30:45.123Z', 'Hello'),
      ];

      render(
        <HistoryViewer
          messages={messages}
          onReplay={mockOnReplay}
          onExport={mockOnExport}
        />
      );

      // Open detail view
      fireEvent.click(screen.getByTestId('history-message-1'));

      // Click replay button in detail view
      const detailReplayButton = screen.getByTestId('replay-button-1');
      fireEvent.click(detailReplayButton);

      expect(mockOnReplay).toHaveBeenCalledTimes(1);
      expect(mockOnReplay).toHaveBeenCalledWith(messages[0]);
    });

    it('should not open detail view when quick replay button is clicked', () => {
      const messages: Message[] = [
        createTranscriptMessage('1', '2025-10-21T14:30:45.123Z', 'Hello'),
      ];

      render(
        <HistoryViewer
          messages={messages}
          onReplay={mockOnReplay}
          onExport={mockOnExport}
        />
      );

      const replayButton = screen.getByTestId('quick-replay-1');
      fireEvent.click(replayButton);

      // Detail view should not be shown
      expect(screen.queryByText('Message Details')).not.toBeInTheDocument();
    });

    it('should have replay button for each message', () => {
      const messages: Message[] = [
        createTranscriptMessage('1', '2025-10-21T14:30:45.123Z', 'Hello'),
        createTranscriptMessage('2', '2025-10-21T14:30:46.456Z', 'World'),
        createTranscriptMessage('3', '2025-10-21T14:30:47.789Z', 'Test'),
      ];

      render(
        <HistoryViewer
          messages={messages}
          onReplay={mockOnReplay}
          onExport={mockOnExport}
        />
      );

      expect(screen.getByTestId('quick-replay-1')).toBeInTheDocument();
      expect(screen.getByTestId('quick-replay-2')).toBeInTheDocument();
      expect(screen.getByTestId('quick-replay-3')).toBeInTheDocument();
    });
  });

  describe('Search and Filter', () => {
    it('should filter messages by search query', () => {
      const messages: Message[] = [
        createTranscriptMessage('1', '2025-10-21T14:30:45.123Z', 'Hello world'),
        createTranscriptMessage('2', '2025-10-21T14:30:46.456Z', 'Goodbye world'),
        createTranscriptMessage('3', '2025-10-21T14:30:47.789Z', 'Test message'),
      ];

      render(
        <HistoryViewer
          messages={messages}
          onReplay={mockOnReplay}
          onExport={mockOnExport}
        />
      );

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'world' } });

      // Should show 2 messages with "world"
      expect(screen.getByTestId('history-message-1')).toBeInTheDocument();
      expect(screen.getByTestId('history-message-2')).toBeInTheDocument();
      expect(screen.queryByTestId('history-message-3')).not.toBeInTheDocument();

      expect(screen.getByText('2 of 3 messages')).toBeInTheDocument();
    });

    it('should be case-insensitive', () => {
      const messages: Message[] = [
        createTranscriptMessage('1', '2025-10-21T14:30:45.123Z', 'Hello World'),
      ];

      render(
        <HistoryViewer
          messages={messages}
          onReplay={mockOnReplay}
          onExport={mockOnExport}
        />
      );

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'WORLD' } });

      expect(screen.getByTestId('history-message-1')).toBeInTheDocument();
    });

    it('should show empty state when no matches', () => {
      const messages: Message[] = [
        createTranscriptMessage('1', '2025-10-21T14:30:45.123Z', 'Hello'),
      ];

      render(
        <HistoryViewer
          messages={messages}
          onReplay={mockOnReplay}
          onExport={mockOnExport}
        />
      );

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText(/no matching messages/i)).toBeInTheDocument();
      expect(screen.getByText(/try a different search query/i)).toBeInTheDocument();
    });

    it('should show all messages when search is cleared', () => {
      const messages: Message[] = [
        createTranscriptMessage('1', '2025-10-21T14:30:45.123Z', 'Hello'),
        createTranscriptMessage('2', '2025-10-21T14:30:46.456Z', 'World'),
      ];

      render(
        <HistoryViewer
          messages={messages}
          onReplay={mockOnReplay}
          onExport={mockOnExport}
        />
      );

      const searchInput = screen.getByTestId('search-input');
      
      // Filter
      fireEvent.change(searchInput, { target: { value: 'Hello' } });
      expect(screen.getByText('1 of 2 messages')).toBeInTheDocument();

      // Clear
      fireEvent.change(searchInput, { target: { value: '' } });
      expect(screen.getByText('2 of 2 messages')).toBeInTheDocument();
    });

    it('should search in message content', () => {
      const messages: Message[] = [
        createTranscriptMessage('1', '2025-10-21T14:30:45.123Z', 'I need an appointment'),
        createStatusMessage('2', '2025-10-21T14:30:46.456Z'),
      ];

      render(
        <HistoryViewer
          messages={messages}
          onReplay={mockOnReplay}
          onExport={mockOnExport}
        />
      );

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'appointment' } });

      expect(screen.getByTestId('history-message-1')).toBeInTheDocument();
      expect(screen.queryByTestId('history-message-2')).not.toBeInTheDocument();
    });
  });

  describe('Export to JSON', () => {
    it('should call onExport when export button is clicked', () => {
      const messages: Message[] = [
        createTranscriptMessage('1', '2025-10-21T14:30:45.123Z', 'Hello'),
      ];

      render(
        <HistoryViewer
          messages={messages}
          onReplay={mockOnReplay}
          onExport={mockOnExport}
        />
      );

      const exportButton = screen.getByTestId('export-button');
      fireEvent.click(exportButton);

      expect(mockOnExport).toHaveBeenCalledTimes(1);
    });

    it('should have export button visible', () => {
      render(
        <HistoryViewer
          messages={[]}
          onReplay={mockOnReplay}
          onExport={mockOnExport}
        />
      );

      expect(screen.getByTestId('export-button')).toBeInTheDocument();
      expect(screen.getByText('Export JSON')).toBeInTheDocument();
    });
  });

  describe('UI Styling', () => {
    it('should highlight selected message', () => {
      const messages: Message[] = [
        createTranscriptMessage('1', '2025-10-21T14:30:45.123Z', 'Hello'),
      ];

      const { container } = render(
        <HistoryViewer
          messages={messages}
          onReplay={mockOnReplay}
          onExport={mockOnExport}
        />
      );

      const messageElement = screen.getByTestId('history-message-1');
      fireEvent.click(messageElement);

      // Check for selected styling
      const selectedDiv = container.querySelector('.bg-blue-50');
      expect(selectedDiv).toBeInTheDocument();
    });

    it('should use monospace font for timestamps', () => {
      const messages: Message[] = [
        createTranscriptMessage('1', '2025-10-21T14:30:45.123Z', 'Hello'),
      ];

      render(
        <HistoryViewer
          messages={messages}
          onReplay={mockOnReplay}
          onExport={mockOnExport}
        />
      );

      const timestamp = screen.getByText('2025-10-21T14:30:45.123Z');
      expect(timestamp).toHaveClass('font-mono');
    });

    it('should use monospace font for message content', () => {
      const messages: Message[] = [
        createTranscriptMessage('1', '2025-10-21T14:30:45.123Z', 'Hello'),
      ];

      const { container } = render(
        <HistoryViewer
          messages={messages}
          onReplay={mockOnReplay}
          onExport={mockOnExport}
        />
      );

      const messageContent = container.querySelector('.font-mono.text-sm');
      expect(messageContent).toBeInTheDocument();
    });
  });
});
