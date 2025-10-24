import React, { useEffect, useRef, useMemo } from 'react';
import type { Message } from '../types/messages';
import { formatJSON, formatMessageContent, highlightJSON } from '../utils/messageFormatter';
import { escapeHtml } from '../utils/security';

export interface RealtimeConsoleProps {
  messages: Message[];
  maxMessages?: number;
}

export const RealtimeConsole: React.FC<RealtimeConsoleProps> = ({ 
  messages, 
  maxMessages = 1000 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  // Limit messages to maxMessages
  const limitedMessages = useMemo(() => {
    if (messages.length > maxMessages) {
      return messages.slice(messages.length - maxMessages);
    }
    return messages;
  }, [messages, maxMessages]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (shouldAutoScroll.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [limitedMessages]);

  // Track if user has scrolled up
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = Math.abs(
      target.scrollHeight - target.scrollTop - target.clientHeight
    ) < 10;
    shouldAutoScroll.current = isAtBottom;
  };

  const renderMessage = (message: Message, style?: React.CSSProperties) => {
    // Escape HTML in message content to prevent XSS
    const content = escapeHtml(formatMessageContent(message));
    const jsonResult = formatJSON(message);

    return (
      <div
        key={message.id}
        style={style}
        className="border-b border-gray-200 p-3 hover:bg-gray-50"
        data-testid={`message-${message.id}`}
      >
        <div className="flex items-start gap-2">
          <span className="text-xs text-gray-500 font-mono whitespace-nowrap">
            {escapeHtml(message.timestamp)}
          </span>
          <div className="flex-1 min-w-0">
            <div 
              className="font-mono text-sm break-words"
              dangerouslySetInnerHTML={{ __html: content }}
            />
            {message.type !== 'audio' && (
              <details className="mt-2">
                <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                  View JSON
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono overflow-x-auto">
                  {jsonResult.isValid ? (
                    <code>
                      {highlightJSON(jsonResult.formatted).map((token) => (
                        token.className ? (
                          <span key={token.key} className={token.className}>
                            {escapeHtml(token.text)}
                          </span>
                        ) : (
                          <span key={token.key}>{escapeHtml(token.text)}</span>
                        )
                      ))}
                    </code>
                  ) : (
                    <div>
                      <div className="text-red-600 mb-2">
                        ⚠ Malformed JSON: {escapeHtml(jsonResult.error || 'Unknown error')}
                      </div>
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <div className="text-xs text-yellow-800 font-semibold mb-1">Raw Message:</div>
                        <code className="text-gray-700 text-xs break-all">
                          {escapeHtml(jsonResult.formatted)}
                        </code>
                      </div>
                    </div>
                  )}
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (limitedMessages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg mb-2">No messages yet</p>
          <p className="text-sm">Messages will appear here when the session is active</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto"
      onScroll={handleScroll}
      data-testid="realtime-console"
    >
      {limitedMessages.map((message) => renderMessage(message))}
    </div>
  );
};
