import type { Message } from '../types/messages';

/**
 * Attempts to parse and format JSON with syntax highlighting
 * Handles malformed JSON gracefully by displaying raw content and error
 */
export function formatJSON(value: any): { formatted: string; isValid: boolean; error?: string } {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    const formatted = JSON.stringify(parsed, null, 2);
    return { formatted, isValid: true };
  } catch (error) {
    // Return raw data and error message for malformed JSON
    const rawData = typeof value === 'string' ? value : String(value);
    return {
      formatted: rawData,
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid JSON format'
    };
  }
}

/**
 * Formats a message for display in the console
 */
export function formatMessageContent(message: Message): string {
  switch (message.type) {
    case 'audio':
      return `audio: ${message.direction === 'sent' ? 'Sent' : 'Received'} ${message.bytesCount} bytes`;
    case 'transcript':
      return `transcript (${message.role}): "${message.text}"`;
    case 'status':
      return `status: ${message.status} - ${message.message}`;
    case 'error':
      return `error [${message.error_code}]: ${message.message}`;
    default:
      return JSON.stringify(message, null, 2);
  }
}

/**
 * Syntax highlighting for JSON strings
 * Returns an array of objects that can be rendered by React
 */
export function highlightJSON(json: string): Array<{ text: string; className?: string; key: number }> {
  const tokens: Array<{ text: string; className?: string; key: number }> = [];
  let currentIndex = 0;
  let keyCounter = 0;
  
  // Simple regex-based tokenization
  const patterns = [
    { regex: /"([^"\\]|\\.)*"/g, className: 'text-green-600' }, // strings
    { regex: /\b(true|false|null)\b/g, className: 'text-blue-600' }, // keywords
    { regex: /\b-?\d+\.?\d*\b/g, className: 'text-purple-600' }, // numbers
    { regex: /[{}[\]:,]/g, className: 'text-gray-600' }, // punctuation
  ];

  const matches: Array<{ index: number; length: number; className: string; text: string }> = [];

  patterns.forEach(({ regex, className }) => {
    let match;
    while ((match = regex.exec(json)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        className,
        text: match[0]
      });
    }
  });

  // Sort matches by index
  matches.sort((a, b) => a.index - b.index);

  // Build tokens
  matches.forEach((match) => {
    // Add text before this match
    if (match.index > currentIndex) {
      tokens.push({
        text: json.substring(currentIndex, match.index),
        key: keyCounter++
      });
    }
    
    // Add the highlighted match
    tokens.push({
      text: match.text,
      className: match.className,
      key: keyCounter++
    });
    
    currentIndex = match.index + match.length;
  });

  // Add remaining text
  if (currentIndex < json.length) {
    tokens.push({
      text: json.substring(currentIndex),
      key: keyCounter++
    });
  }

  return tokens;
}
