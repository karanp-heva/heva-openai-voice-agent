import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusIndicator } from '../StatusIndicator';
import type { ConnectionStatus } from '../../types/session';

describe('StatusIndicator', () => {
  describe('Status Display', () => {
    it('should display connecting status', () => {
      render(<StatusIndicator status="connecting" />);

      expect(screen.getByTestId('status-text')).toHaveTextContent('Connecting');
      expect(screen.getByTestId('status-indicator')).toBeInTheDocument();
    });

    it('should display open status as Connected', () => {
      render(<StatusIndicator status="open" />);

      expect(screen.getByTestId('status-text')).toHaveTextContent('Connected');
    });

    it('should display closed status as Disconnected', () => {
      render(<StatusIndicator status="closed" />);

      expect(screen.getByTestId('status-text')).toHaveTextContent('Disconnected');
    });

    it('should display error status', () => {
      render(<StatusIndicator status="error" />);

      expect(screen.getByTestId('status-text')).toHaveTextContent('Error');
    });

    it('should display reconnecting status when isReconnecting is true', () => {
      render(<StatusIndicator status="connecting" isReconnecting={true} />);

      expect(screen.getByTestId('status-text')).toHaveTextContent('Reconnecting');
    });
  });

  describe('Color Coding', () => {
    it('should apply yellow color for connecting status', () => {
      render(<StatusIndicator status="connecting" />);

      const statusDot = screen.getByTestId('status-dot');
      expect(statusDot).toHaveClass('bg-yellow-500');
    });

    it('should apply green color for open status', () => {
      render(<StatusIndicator status="open" />);

      const statusDot = screen.getByTestId('status-dot');
      expect(statusDot).toHaveClass('bg-green-500');
    });

    it('should apply gray color for closed status', () => {
      render(<StatusIndicator status="closed" />);

      const statusDot = screen.getByTestId('status-dot');
      expect(statusDot).toHaveClass('bg-gray-500');
    });

    it('should apply red color for error status', () => {
      render(<StatusIndicator status="error" />);

      const statusDot = screen.getByTestId('status-dot');
      expect(statusDot).toHaveClass('bg-red-500');
    });

    it('should apply yellow background for connecting status', () => {
      render(<StatusIndicator status="connecting" />);

      const container = screen.getByTestId('status-indicator');
      expect(container).toHaveClass('bg-yellow-50', 'border-yellow-200');
    });

    it('should apply green background for open status', () => {
      render(<StatusIndicator status="open" />);

      const container = screen.getByTestId('status-indicator');
      expect(container).toHaveClass('bg-green-50', 'border-green-200');
    });

    it('should apply gray background for closed status', () => {
      render(<StatusIndicator status="closed" />);

      const container = screen.getByTestId('status-indicator');
      expect(container).toHaveClass('bg-gray-50', 'border-gray-200');
    });

    it('should apply red background for error status', () => {
      render(<StatusIndicator status="error" />);

      const container = screen.getByTestId('status-indicator');
      expect(container).toHaveClass('bg-red-50', 'border-red-200');
    });
  });

  describe('Latency Display', () => {
    it('should display latency when connected and latency is provided', () => {
      render(<StatusIndicator status="open" latency={45} />);

      const latencyDisplay = screen.getByTestId('latency-display');
      expect(latencyDisplay).toBeInTheDocument();
      expect(latencyDisplay).toHaveTextContent('Latency: 45ms');
    });

    it('should format latency with monospace font', () => {
      render(<StatusIndicator status="open" latency={123} />);

      const latencyDisplay = screen.getByTestId('latency-display');
      const monospaceElement = latencyDisplay.querySelector('.font-mono');
      expect(monospaceElement).toBeInTheDocument();
      expect(monospaceElement).toHaveTextContent('123ms');
    });

    it('should not display latency when not connected', () => {
      render(<StatusIndicator status="connecting" latency={45} />);

      expect(screen.queryByTestId('latency-display')).not.toBeInTheDocument();
    });

    it('should not display latency when status is closed', () => {
      render(<StatusIndicator status="closed" latency={45} />);

      expect(screen.queryByTestId('latency-display')).not.toBeInTheDocument();
    });

    it('should not display latency when status is error', () => {
      render(<StatusIndicator status="error" latency={45} />);

      expect(screen.queryByTestId('latency-display')).not.toBeInTheDocument();
    });

    it('should not display latency when latency is undefined', () => {
      render(<StatusIndicator status="open" />);

      expect(screen.queryByTestId('latency-display')).not.toBeInTheDocument();
    });

    it('should display latency of 0ms', () => {
      render(<StatusIndicator status="open" latency={0} />);

      const latencyDisplay = screen.getByTestId('latency-display');
      expect(latencyDisplay).toHaveTextContent('Latency: 0ms');
    });
  });

  describe('Error Message Display', () => {
    it('should display error message when provided', () => {
      render(<StatusIndicator status="error" error="Connection timeout" />);

      const errorMessage = screen.getByTestId('error-message');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent('Error: Connection timeout');
    });

    it('should display error message with any status', () => {
      render(<StatusIndicator status="connecting" error="Network error" />);

      const errorMessage = screen.getByTestId('error-message');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent('Error: Network error');
    });

    it('should not display error message when error is undefined', () => {
      render(<StatusIndicator status="error" />);

      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });

    it('should not display error message when error is empty string', () => {
      render(<StatusIndicator status="error" error="" />);

      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });

    it('should display long error messages', () => {
      const longError = 'This is a very long error message that describes in detail what went wrong with the connection and provides helpful information for debugging';
      render(<StatusIndicator status="error" error={longError} />);

      const errorMessage = screen.getByTestId('error-message');
      expect(errorMessage).toHaveTextContent(longError);
    });
  });

  describe('Reconnection Countdown', () => {
    it('should display reconnection countdown when reconnecting', () => {
      render(<StatusIndicator status="connecting" isReconnecting={true} reconnectionCountdown={5} />);

      const countdown = screen.getByTestId('reconnection-countdown');
      expect(countdown).toBeInTheDocument();
      expect(countdown).toHaveTextContent('Reconnecting in 5s');
    });

    it('should format countdown with monospace font', () => {
      render(<StatusIndicator status="connecting" isReconnecting={true} reconnectionCountdown={10} />);

      const countdown = screen.getByTestId('reconnection-countdown');
      const monospaceElement = countdown.querySelector('.font-mono');
      expect(monospaceElement).toBeInTheDocument();
      expect(monospaceElement).toHaveTextContent('10s');
    });

    it('should not display countdown when not reconnecting', () => {
      render(<StatusIndicator status="connecting" reconnectionCountdown={5} />);

      expect(screen.queryByTestId('reconnection-countdown')).not.toBeInTheDocument();
    });

    it('should not display countdown when countdown is 0', () => {
      render(<StatusIndicator status="connecting" isReconnecting={true} reconnectionCountdown={0} />);

      expect(screen.queryByTestId('reconnection-countdown')).not.toBeInTheDocument();
    });

    it('should display countdown of 1 second', () => {
      render(<StatusIndicator status="connecting" isReconnecting={true} reconnectionCountdown={1} />);

      const countdown = screen.getByTestId('reconnection-countdown');
      expect(countdown).toHaveTextContent('Reconnecting in 1s');
    });

    it('should display countdown with large numbers', () => {
      render(<StatusIndicator status="connecting" isReconnecting={true} reconnectionCountdown={30} />);

      const countdown = screen.getByTestId('reconnection-countdown');
      expect(countdown).toHaveTextContent('Reconnecting in 30s');
    });
  });

  describe('Combined States', () => {
    it('should display status, latency, and no error when connected', () => {
      render(<StatusIndicator status="open" latency={25} />);

      expect(screen.getByTestId('status-text')).toHaveTextContent('Connected');
      expect(screen.getByTestId('latency-display')).toHaveTextContent('Latency: 25ms');
      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });

    it('should display status, error, and no latency when error occurs', () => {
      render(<StatusIndicator status="error" error="Authentication failed" />);

      expect(screen.getByTestId('status-text')).toHaveTextContent('Error');
      expect(screen.getByTestId('error-message')).toHaveTextContent('Error: Authentication failed');
      expect(screen.queryByTestId('latency-display')).not.toBeInTheDocument();
    });

    it('should display reconnecting status with countdown', () => {
      render(<StatusIndicator status="connecting" isReconnecting={true} reconnectionCountdown={3} />);

      expect(screen.getByTestId('status-text')).toHaveTextContent('Reconnecting');
      expect(screen.getByTestId('reconnection-countdown')).toHaveTextContent('Reconnecting in 3s');
      expect(screen.queryByTestId('latency-display')).not.toBeInTheDocument();
    });

    it('should display all relevant information for each status', () => {
      const statuses: ConnectionStatus[] = ['connecting', 'open', 'closed', 'error'];

      statuses.forEach((status) => {
        const { unmount } = render(<StatusIndicator status={status} />);
        expect(screen.getByTestId('status-indicator')).toBeInTheDocument();
        expect(screen.getByTestId('status-text')).toBeInTheDocument();
        expect(screen.getByTestId('status-dot')).toBeInTheDocument();
        unmount();
      });
    });
  });
});
