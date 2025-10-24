import React, { useState, useMemo } from 'react';
import type { Message } from '../types/messages';
import { formatJSON, formatMessageContent, highlightJSON } from '../utils/messageFormatter';

export interface HistoryViewerProps {
  messages: Message[];
  onReplay: (message: Message) => void;
  onExport: () => void;
}

export const HistoryViewer: React.FC<HistoryViewerProps> = ({
  messages,
  onReplay,
  onExport,
}) => {
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter messages based on search query
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) {
      return messages;
    }

    const query = searchQuery.toLowerCase();
    return messages.filter((message) => {
      // Search in message content
      const content = formatMessageContent(message).toLowerCase();
      if (content.includes(query)) return true;

      // Search in JSON representation
      const jsonResult = formatJSON(message);
      if (jsonResult.formatted.toLowerCase().includes(query)) return true;

      return false;
    });
  }, [messages, searchQuery]);

  const handleReplay = (message: Message) => {
    onReplay(message);
  };

  const handleExport = () => {
    onExport();
  };

  const handleMessageClick = (message: Message) => {
    setSelectedMessage(message.id === selectedMessage?.id ? null : message);
  };

  const renderMessageDetail = (message: Message) => {
    const jsonResult = formatJSON(message);

    return (
      <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-700">Message Details</span>
          <button
            onClick={() => handleReplay(message)}
            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            data-testid={`replay-button-${message.id}`}
          >
            Replay
          </button>
        </div>
        <pre className="p-2 bg-white rounded text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto">
          {jsonResult.isValid ? (
            <code>
              {highlightJSON(jsonResult.formatted).map((token) => (
                token.className ? (
                  <span key={token.key} className={token.className}>
                    {token.text}
                  </span>
                ) : (
                  <span key={token.key}>{token.text}</span>
                )
              ))}
            </code>
          ) : (
            <div>
              <div className="text-red-600 mb-2">
                ⚠ Malformed JSON: {jsonResult.error}
              </div>
              <code className="text-gray-700">{jsonResult.formatted}</code>
            </div>
          )}
        </pre>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col" data-testid="history-viewer">
      {/* Header with search and export */}
      <div className="p-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2 mb-2">
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            data-testid="search-input"
          />
          <button
            onClick={handleExport}
            className="px-3 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors whitespace-nowrap"
            data-testid="export-button"
          >
            Export JSON
          </button>
        </div>
        <div className="text-xs text-gray-600">
          {filteredMessages.length} of {messages.length} messages
        </div>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto">
        {filteredMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p className="text-lg mb-2">
                {messages.length === 0 ? 'No messages in history' : 'No matching messages'}
              </p>
              <p className="text-sm">
                {messages.length === 0
                  ? 'Messages will appear here as they are received'
                  : 'Try a different search query'}
              </p>
            </div>
          </div>
        ) : (
          <div>
            {filteredMessages.map((message) => {
              const content = formatMessageContent(message);
              const isSelected = selectedMessage?.id === message.id;

              return (
                <div
                  key={message.id}
                  className="border-b border-gray-200"
                >
                  <div
                    onClick={() => handleMessageClick(message)}
                    className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                    data-testid={`history-message-${message.id}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-gray-500 font-mono whitespace-nowrap">
                        {message.timestamp}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm break-words">
                          {content}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReplay(message);
                        }}
                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        data-testid={`quick-replay-${message.id}`}
                      >
                        Replay
                      </button>
                    </div>
                  </div>
                  {isSelected && renderMessageDetail(message)}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
