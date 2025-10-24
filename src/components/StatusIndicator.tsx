import React from 'react';
import type { ConnectionStatus } from '../types/session';

export interface StatusIndicatorProps {
  status: ConnectionStatus;
  latency?: number;
  error?: string;
  reconnectionCountdown?: number;
  isReconnecting?: boolean;
}

/**
 * StatusIndicator component displays connection status with visual feedback
 * Shows status, latency, errors, and reconnection countdown
 */
export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  latency,
  error,
  reconnectionCountdown = 0,
  isReconnecting = false,
}) => {
  /**
   * Get status color based on connection state
   */
  const getStatusColor = (): string => {
    switch (status) {
      case 'connecting':
        return 'bg-yellow-500';
      case 'open':
        return 'bg-green-500';
      case 'closed':
        return 'bg-gray-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  /**
   * Get status text color
   */
  const getStatusTextColor = (): string => {
    switch (status) {
      case 'connecting':
        return 'text-yellow-700';
      case 'open':
        return 'text-green-700';
      case 'closed':
        return 'text-gray-700';
      case 'error':
        return 'text-red-700';
      default:
        return 'text-gray-700';
    }
  };

  /**
   * Get status background color
   */
  const getStatusBgColor = (): string => {
    switch (status) {
      case 'connecting':
        return 'bg-yellow-50 border-yellow-200';
      case 'open':
        return 'bg-green-50 border-green-200';
      case 'closed':
        return 'bg-gray-50 border-gray-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  /**
   * Get status display text
   */
  const getStatusText = (): string => {
    if (isReconnecting) {
      return 'Reconnecting';
    }
    
    switch (status) {
      case 'connecting':
        return 'Connecting';
      case 'open':
        return 'Connected';
      case 'closed':
        return 'Disconnected';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className={`rounded-2xl border p-6 shadow-lg backdrop-blur-sm ${getStatusBgColor()}`} data-testid="status-indicator">
      <div className="flex flex-wrap items-center gap-4">
        {/* Status Indicator Dot */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className={`w-4 h-4 rounded-full ${getStatusColor()}`}
              data-testid="status-dot"
            />
            <div
              className={`absolute inset-0 w-4 h-4 rounded-full ${getStatusColor()} animate-ping opacity-75`}
            />
          </div>
          <span className={`font-bold text-lg ${getStatusTextColor()}`} data-testid="status-text">
            {getStatusText()}
          </span>
        </div>

        {/* Latency Display */}
        {status === 'open' && latency !== undefined && (
          <div className="flex items-center gap-2 px-4 py-2 bg-white/60 rounded-xl border border-green-200">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-sm font-medium text-green-700" data-testid="latency-display">
              <span className="font-mono font-bold">{latency}ms</span>
            </span>
          </div>
        )}

        {/* Reconnection Countdown */}
        {isReconnecting && reconnectionCountdown > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-white/60 rounded-xl border border-yellow-200">
            <svg className="w-4 h-4 text-yellow-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-sm font-medium text-yellow-700" data-testid="reconnection-countdown">
              Reconnecting in <span className="font-mono font-bold">{reconnectionCountdown}s</span>
            </span>
          </div>
        )}
      </div>

      {/* Error Message Display */}
      {error && (
        <div className="mt-4 p-4 bg-white/60 rounded-xl border border-red-300" data-testid="error-message">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-sm text-red-800 flex-1">
              <span className="font-bold">Error:</span> {error}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
