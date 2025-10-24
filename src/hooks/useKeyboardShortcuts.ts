import { useEffect, useCallback } from 'react';

/**
 * Keyboard shortcut configuration
 */
export interface KeyboardShortcut {
  key: string;
  ctrlOrCmd?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  description: string;
}

/**
 * Props for useKeyboardShortcuts hook
 */
export interface UseKeyboardShortcutsProps {
  onClearConsole: () => void;
  onReconnect: () => void;
  onSendTestMessage: () => void;
  onExportHistory: () => void;
  onCancelResponse: () => void;
  enabled?: boolean;
}

/**
 * Custom hook to handle keyboard shortcuts
 * 
 * Implements the following shortcuts:
 * - Ctrl/Cmd+K: Clear console
 * - Ctrl/Cmd+R: Reconnect
 * - Ctrl/Cmd+S: Send test message
 * - Ctrl/Cmd+E: Export history
 * - Escape: Cancel response
 * 
 * @param props - Callback functions for each shortcut
 * @returns Object with shortcuts array for reference
 */
export const useKeyboardShortcuts = ({
  onClearConsole,
  onReconnect,
  onSendTestMessage,
  onExportHistory,
  onCancelResponse,
  enabled = true,
}: UseKeyboardShortcutsProps) => {
  /**
   * Check if the key combination matches the shortcut
   */
  const matchesShortcut = useCallback(
    (
      event: KeyboardEvent,
      key: string,
      ctrlOrCmd?: boolean,
      shift?: boolean,
      alt?: boolean
    ): boolean => {
      // Check key match (case-insensitive)
      if (event.key.toLowerCase() !== key.toLowerCase()) {
        return false;
      }

      // Check modifier keys
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmdPressed = isMac ? event.metaKey : event.ctrlKey;

      // If ctrlOrCmd is required, check if it's pressed
      if (ctrlOrCmd !== undefined) {
        if (ctrlOrCmd && !ctrlOrCmdPressed) return false;
        if (!ctrlOrCmd && ctrlOrCmdPressed) return false;
      }

      // If shift is specified, check if it matches
      if (shift !== undefined) {
        if (shift && !event.shiftKey) return false;
        if (!shift && event.shiftKey) return false;
      }

      // If alt is specified, check if it matches
      if (alt !== undefined) {
        if (alt && !event.altKey) return false;
        if (!alt && event.altKey) return false;
      }

      return true;
    },
    []
  );

  /**
   * Handle keyboard events
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ctrl/Cmd+K: Clear console
      if (matchesShortcut(event, 'k', true)) {
        event.preventDefault();
        onClearConsole();
        return;
      }

      // Ctrl/Cmd+R: Reconnect
      if (matchesShortcut(event, 'r', true)) {
        event.preventDefault();
        onReconnect();
        return;
      }

      // Ctrl/Cmd+S: Send test message
      if (matchesShortcut(event, 's', true)) {
        event.preventDefault();
        onSendTestMessage();
        return;
      }

      // Ctrl/Cmd+E: Export history
      if (matchesShortcut(event, 'e', true)) {
        event.preventDefault();
        onExportHistory();
        return;
      }

      // Escape: Cancel response (works even in input fields)
      if (matchesShortcut(event, 'Escape')) {
        event.preventDefault();
        onCancelResponse();
        return;
      }
    },
    [
      enabled,
      matchesShortcut,
      onClearConsole,
      onReconnect,
      onSendTestMessage,
      onExportHistory,
      onCancelResponse,
    ]
  );

  /**
   * Set up and clean up event listener
   */
  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  /**
   * Return shortcuts for reference/documentation
   */
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'k',
      ctrlOrCmd: true,
      handler: onClearConsole,
      description: 'Clear console',
    },
    {
      key: 'r',
      ctrlOrCmd: true,
      handler: onReconnect,
      description: 'Reconnect',
    },
    {
      key: 's',
      ctrlOrCmd: true,
      handler: onSendTestMessage,
      description: 'Send test message',
    },
    {
      key: 'e',
      ctrlOrCmd: true,
      handler: onExportHistory,
      description: 'Export history',
    },
    {
      key: 'Escape',
      handler: onCancelResponse,
      description: 'Cancel response',
    },
  ];

  return { shortcuts };
};
