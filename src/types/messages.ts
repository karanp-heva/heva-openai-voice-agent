// Base message interface
export interface BaseMessage {
  id: string;
  timestamp: string; // ISO 8601
  type: string;
}

// Audio message
export interface AudioMessage extends BaseMessage {
  type: 'audio';
  data: string; // base64-encoded audio
  direction: 'sent' | 'received';
  bytesCount: number;
}

// Transcript message
export interface TranscriptMessage extends BaseMessage {
  type: 'transcript';
  role: 'user' | 'assistant';
  text: string;
}

// Status message
export interface StatusMessage extends BaseMessage {
  type: 'status';
  status: string;
  message: string;
}

// Error message
export interface ErrorMessage extends BaseMessage {
  type: 'error';
  error_code: string;
  message: string;
  details?: any;
}

// Speak proposal message (agent requests to speak)
export interface SpeakProposalMessage extends BaseMessage {
  type: 'speak_proposal';
  proposalId: string;
  summary: string;
}

// Union type for all messages
export type Message = AudioMessage | TranscriptMessage | StatusMessage | ErrorMessage | SpeakProposalMessage;
