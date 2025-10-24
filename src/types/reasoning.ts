/**
 * Types for AI Reasoning feature
 */

export type ReasoningType = 'observation' | 'question' | 'pattern' | 'concern' | 'context_update' | 'suggestion';

export interface ReasoningEntry {
  entry_id: string;
  type: ReasoningType;
  content: string;
  topic: string;
  confidence: number;
  timestamp: string;
  metadata: Record<string, any>;
}

export interface ReasoningStatistics {
  total_entries: number;
  by_type: Record<ReasoningType, number>;
  by_topic: Record<string, number>;
  patterns_identified: number;
  context_updates: number;
}

export interface ReasoningResponse {
  conversation_id: string;
  practice_id: number;
  entries?: ReasoningEntry[];
  questions?: ReasoningEntry[];
  concerns?: ReasoningEntry[];
  patterns?: Array<{
    pattern: string;
    topic: string;
    confidence: number;
    timestamp: string;
    metadata: Record<string, any>;
  }>;
  total: number;
}

export interface ReasoningStatisticsResponse {
  conversation_id: string;
  practice_id: number;
  reasoning_store: ReasoningStatistics;
  reasoning_filter: {
    total_evaluated: number;
    total_sent: number;
    total_approved: number;
    total_denied: number;
    filter_rates: {
      confidence_pass_rate: number;
      debounce_pass_rate: number;
      deduplication_pass_rate: number;
      overall_pass_rate: number;
    };
    approval_rate: number;
  };
}
