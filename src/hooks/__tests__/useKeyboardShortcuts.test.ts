import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  const mockHandlers = {
    onClearConsole: vi.fn(),
    onReconnect: vi.fn(),
    onSendTestMessage: vi.fn(),
    onExportHistory: vi.fn(),
    onCancelResponse: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any remaining event listeners
    vi.restoreAllMocks();
  });

  describe('Keyboard Shortcut Registration', () => {
    it('should return shortcuts array with all shortcuts', () => {
      const { result } = renderHook(() => useKeyboardShortcuts(mockHandlers));

      expect(result.current.shortcuts).toHaveLength(5);
      expect(result.current.shortcuts[0].key).toBe('k');
      expect(result.current.shortcuts[0].ctrlOrCmd).toBe(true);
      expect(result.current.shortcuts[0].description).toBe('Clear console');
    });
  });

  describe('Ctrl/Cmd+K - Clear Console', () => {
    it('should call onClearConsole when Ctrl+K is pressed on Windows', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      });

      window.dispatchEvent(event);

      expect(mockHandlers.onClearConsole).toHaveBeenCalledTimes(1);
    });

    it('should call onClearConsole when Cmd+K is pressed on Mac', () => {
      // Mock Mac platform
      Object.defineProperty(navigator, 'platform', {
        value: 'MacIntel',
        writable: true,
        configurable: true,
      });

      renderHook(() => useKeyboardShortcuts(mockHandlers));

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      });

      window.dispatchEvent(event);

      expect(mockHandlers.onClearConsole).toHaveBeenCalledTimes(1);
    });

    it('should not call onClearConsole when only K is pressed', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        bubbles: true,
      });

      window.dispatchEvent(event);

      expect(mockHandlers.onClearConsole).not.toHaveBeenCalled();
    });
  });

  describe('Ctrl/Cmd+R - Reconnect', () => {
    it('should call onReconnect when Ctrl+R is pressed', () => {
      const { unmount } = renderHook(() => useKeyboardShortcuts(mockHandlers));

      const event = new KeyboardEvent('keydown', {
        key: 'r',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });

      window.dispatchEvent(event);

      expect(mockHandlers.onReconnect).toHaveBeenCalledTimes(1);
      unmount();
    });
  });

  describe('Ctrl/Cmd+S - Send Test Message', () => {
    it('should call onSendTestMessage when Ctrl+S is pressed', () => {
      const { unmount } = renderHook(() => useKeyboardShortcuts(mockHandlers));

      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });

      window.dispatchEvent(event);

      expect(mockHandlers.onSendTestMessage).toHaveBeenCalledTimes(1);
      unmount();
    });
  });

  describe('Ctrl/Cmd+E - Export History', () => {
    it('should call onExportHistory when Ctrl+E is pressed', () => {
      const { unmount } = renderHook(() => useKeyboardShortcuts(mockHandlers));

      const event = new KeyboardEvent('keydown', {
        key: 'e',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });

      window.dispatchEvent(event);

      expect(mockHandlers.onExportHistory).toHaveBeenCalledTimes(1);
      unmount();
    });
  });

  describe('Escape - Cancel Response', () => {
    it('should call onCancelResponse when Escape is pressed', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      });

      window.dispatchEvent(event);

      expect(mockHandlers.onCancelResponse).toHaveBeenCalledTimes(1);
    });
  });

  describe('Hook Enabled/Disabled', () => {
    it('should not trigger shortcuts when enabled is false', () => {
      const { unmount } = renderHook(() =>
        useKeyboardShortcuts({
          ...mockHandlers,
          enabled: false,
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      });

      window.dispatchEvent(event);

      expect(mockHandlers.onClearConsole).not.toHaveBeenCalled();
      unmount();
    });

    it('should trigger shortcuts when enabled is true', () => {
      const { unmount } = renderHook(() =>
        useKeyboardShortcuts({
          ...mockHandlers,
          enabled: true,
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      });

      window.dispatchEvent(event);

      expect(mockHandlers.onClearConsole).toHaveBeenCalledTimes(1);
      unmount();
    });
  });

  describe('Event Cleanup', () => {
    it('should remove event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useKeyboardShortcuts(mockHandlers));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
  });

  describe('Case Insensitivity', () => {
    it('should handle uppercase K with Ctrl', () => {
      const { unmount } = renderHook(() => useKeyboardShortcuts(mockHandlers));

      const event = new KeyboardEvent('keydown', {
        key: 'K',
        ctrlKey: true,
        bubbles: true,
      });

      window.dispatchEvent(event);

      expect(mockHandlers.onClearConsole).toHaveBeenCalledTimes(1);
      unmount();
    });
  });

  describe('Multiple Shortcuts', () => {
    it('should not trigger other shortcuts when one is pressed', () => {
      const { unmount } = renderHook(() => useKeyboardShortcuts(mockHandlers));

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      });

      window.dispatchEvent(event);

      expect(mockHandlers.onClearConsole).toHaveBeenCalledTimes(1);
      expect(mockHandlers.onReconnect).not.toHaveBeenCalled();
      expect(mockHandlers.onSendTestMessage).not.toHaveBeenCalled();
      expect(mockHandlers.onExportHistory).not.toHaveBeenCalled();
      expect(mockHandlers.onCancelResponse).not.toHaveBeenCalled();
      unmount();
    });
  });
});
