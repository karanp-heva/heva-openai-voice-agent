import React, { useState, useEffect, useCallback } from 'react';
import type { ReasoningEntry, ReasoningType } from '../types/reasoning';
import config from '../config';

interface ReasoningPanelProps {
  conversationId: string;
  practiceId: number;
  isConnected: boolean;
}

type FilterType = 'all' | 'questions' | 'concerns' | 'observations';

/**
 * ReasoningPanel component displays AI's reasoning process
 * Shows observations, questions, concerns, and patterns
 */
export const ReasoningPanel: React.FC<ReasoningPanelProps> = ({
  conversationId,
  practiceId,
  isConnected,
}) => {
  const [entries, setEntries] = useState<ReasoningEntry[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch reasoning entries from API
   */
  const fetchEntries = useCallback(async () => {
    if (!isConnected || !conversationId || !practiceId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let url = `${config.api.baseUrl}/realtime/reasoning/${conversationId}`;
      
      // Adjust URL based on filter
      if (filter === 'questions') {
        url += '/questions';
      } else if (filter === 'concerns') {
        url += '/concerns';
      }
      
      url += `?practice_id=${practiceId}&limit=20`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch reasoning entries: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Handle different response formats
      const newEntries = data.entries || data.questions || data.concerns || [];
      setEntries(newEntries);
    } catch (err) {
      console.error('Error fetching reasoning entries:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch reasoning entries');
    } finally {
      setLoading(false);
    }
  }, [conversationId, practiceId, isConnected, filter]);

  /**
   * Poll for updates every 5 seconds
   */
  useEffect(() => {
    if (!isConnected) {
      return;
    }

    // Initial fetch
    fetchEntries();

    // Set up polling
    const interval = setInterval(fetchEntries, 5000);

    return () => clearInterval(interval);
  }, [isConnected, fetchEntries]);

  /**
   * Get icon for reasoning type
   */
  const getTypeIcon = (type: ReasoningType): string => {
    switch (type) {
      case 'question':
        return '❓';
      case 'observation':
        return '👁️';
      case 'concern':
        return '⚠️';
      case 'pattern':
        return '🔍';
      case 'context_update':
        return '🔄';
      case 'suggestion':
        return '💡';
      default:
        return '📝';
    }
  };

  /**
   * Get color class for reasoning type
   */
  const getTypeColor = (type: ReasoningType): string => {
    switch (type) {
      case 'question':
        return 'border-blue-400 bg-blue-50';
      case 'observation':
        return 'border-purple-400 bg-purple-50';
      case 'concern':
        return 'border-red-400 bg-red-50';
      case 'pattern':
        return 'border-green-400 bg-green-50';
      case 'context_update':
        return 'border-indigo-400 bg-indigo-50';
      case 'suggestion':
        return 'border-yellow-400 bg-yellow-50';
      default:
        return 'border-gray-400 bg-gray-50';
    }
  };

  /**
   * Get severity badge color
   */
  const getSeverityColor = (severity?: string): string => {
    switch (severity) {
      case 'high':
        return 'bg-red-500 text-white';
      case 'medium':
        return 'bg-orange-500 text-white';
      case 'low':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  /**
   * Format timestamp
   */
  const formatTime = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    } catch {
      return timestamp;
    }
  };

  /**
   * Filter entries by type
   */
  const filteredEntries = entries.filter((entry) => {
    if (filter === 'all') return true;
    if (filter === 'questions') return entry.type === 'question';
    if (filter === 'concerns') return entry.type === 'concern';
    if (filter === 'observations') return entry.type === 'observation';
    return true;
  });

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-800 to-purple-700 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className="font-semibold">AI Reasoning</span>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>Updating...</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'all'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('questions')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'questions'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            ❓ Questions
          </button>
          <button
            onClick={() => setFilter('concerns')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'concerns'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            ⚠️ Concerns
          </button>
          <button
            onClick={() => setFilter('observations')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'observations'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            👁️ Observations
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 h-[400px] overflow-y-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-red-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {!isConnected && (
          <div className="text-center py-12 text-slate-500">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
            </svg>
            <p className="font-medium">Not connected</p>
            <p className="text-sm mt-1">Connect to a session to see AI reasoning</p>
          </div>
        )}

        {isConnected && filteredEntries.length === 0 && !loading && (
          <div className="text-center py-12 text-slate-500">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="font-medium">No entries yet</p>
            <p className="text-sm mt-1">AI reasoning will appear here as the conversation progresses</p>
          </div>
        )}

        {isConnected && filteredEntries.length > 0 && (
          <div className="space-y-3">
            {filteredEntries.map((entry) => (
              <div
                key={entry.entry_id}
                className={`border-l-4 rounded-lg p-4 transition-all hover:shadow-md ${getTypeColor(entry.type)}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getTypeIcon(entry.type)}</span>
                    <div>
                      <span className="font-semibold text-slate-800 capitalize">{entry.type}</span>
                      <span className="mx-2 text-slate-400">•</span>
                      <span className="text-sm text-slate-600 capitalize">{entry.topic}</span>
                    </div>
                  </div>
                  {entry.type === 'concern' && entry.metadata.severity && (
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${getSeverityColor(entry.metadata.severity)}`}>
                      {entry.metadata.severity}
                    </span>
                  )}
                </div>

                {/* Content */}
                <p className="text-slate-700 mb-3">{entry.content}</p>

                {/* Metadata */}
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{(entry.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{formatTime(entry.timestamp)}</span>
                  </div>
                </div>

                {/* Additional metadata */}
                {entry.metadata.context && (
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <p className="text-sm text-slate-600 italic">{entry.metadata.context}</p>
                  </div>
                )}
                {entry.metadata.relevance && (
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <p className="text-sm text-slate-600 italic">{entry.metadata.relevance}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with count */}
      {isConnected && filteredEntries.length > 0 && (
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-sm text-slate-600">
          Showing {filteredEntries.length} {filter === 'all' ? 'entries' : filter}
        </div>
      )}
    </div>
  );
};
