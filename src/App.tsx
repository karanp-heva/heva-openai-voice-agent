import React, { useCallback } from 'react';
import { SessionProvider, useSession } from './context/SessionContext';
import { SessionController } from './components/SessionController';
import { StatusIndicator } from './components/StatusIndicator';
import { RealtimeConsole } from './components/RealtimeConsole';
import { ControlsPanel } from './components/ControlsPanel';
import { HistoryViewer } from './components/HistoryViewer';
import { VoiceControls } from './components/VoiceControls';
import { SpeakProposal } from './components/SpeakProposal';
import { AudioPlayer } from './components/AudioPlayer';
import { ReasoningPanel } from './components/ReasoningPanel';
import { SessionSummary } from './components/SessionSummary';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

/**
 * AppContent component - Main application layout
 * Wrapped by SessionProvider to access session context
 */
const AppContent: React.FC = () => {
  const {
    config,
    messages,
    connectionState,
    isConnected,
    reconnect,
    clearMessages,
    sendMessage,
    replayMessage,
    reconnectionCountdown,
    isReconnecting,
    speakProposals,
    approveSpeakProposal,
    denySpeakProposal,
  } = useSession();

  /**
   * Handle export history to JSON
   */
  const handleExportHistory = useCallback(() => {
    const dataStr = JSON.stringify(messages, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `realtime-session-history-${new Date().toISOString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [messages]);

  /**
   * Handle send test message
   */
  const handleSendTestMessage = useCallback(async () => {
    if (!isConnected) return;

    try {
      await sendMessage({
        type: 'test',
        timestamp: new Date().toISOString(),
        data: 'Test message from keyboard shortcut',
      });
    } catch (error) {
      console.error('Failed to send test message:', error);
    }
  }, [isConnected, sendMessage]);

  /**
   * Handle cancel response
   */
  const handleCancelResponse = useCallback(async () => {
    if (!isConnected) return;

    try {
      await sendMessage({
        type: 'response.cancel',
      });
    } catch (error) {
      console.error('Failed to cancel response:', error);
    }
  }, [isConnected, sendMessage]);

  /**
   * Handle reconnect with error handling
   */
  const handleReconnect = useCallback(() => {
    if (!isConnected) return;

    try {
      reconnect();
    } catch (error) {
      console.error('Failed to reconnect:', error);
    }
  }, [isConnected, reconnect]);

  /**
   * Set up keyboard shortcuts
   */
  useKeyboardShortcuts({
    onClearConsole: clearMessages,
    onReconnect: handleReconnect,
    onSendTestMessage: handleSendTestMessage,
    onExportHistory: handleExportHistory,
    onCancelResponse: handleCancelResponse,
    enabled: true,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Main Container */}
      <div className="container mx-auto px-4 py-8 max-w-[1920px]">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Realtime Voice Console
              </h1>
              <p className="text-slate-600 mt-1">
                Test and monitor real-time voice sessions with OpenAI Realtime API
              </p>
            </div>
          </div>
        </header>

        {/* Layout Grid */}
        <div className="space-y-6">
          {/* Session Controller - Top */}
          <div className="transition-all duration-300 hover:scale-[1.01]">
            <SessionController />
          </div>

          {/* Status Indicator - Below Controller */}
          <div className="transition-all duration-300">
            <StatusIndicator
              status={connectionState.status}
              latency={connectionState.latency}
              error={connectionState.error}
              reconnectionCountdown={reconnectionCountdown}
              isReconnecting={isReconnecting}
            />
          </div>

          {/* Voice Controls - New Section */}
          <div className="transition-all duration-300 hover:scale-[1.01]">
            <VoiceControls />
          </div>

          {/* Main Content Area - Console, History, and Reasoning */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Realtime Console - Left */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl border border-slate-200">
              <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-6 py-4 flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-semibold">Realtime Console</span>
              </div>
              <div className="h-[600px] overflow-hidden">
                <RealtimeConsole messages={messages} maxMessages={1000} />
              </div>
            </div>

            {/* History Viewer - Center */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl border border-slate-200">
              <div className="bg-gradient-to-r from-indigo-800 to-indigo-700 text-white px-6 py-4 flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold">Message History</span>
              </div>
              <div className="h-[600px] overflow-hidden">
                <HistoryViewer
                  messages={messages}
                  onReplay={replayMessage}
                  onExport={handleExportHistory}
                />
              </div>
            </div>

            {/* AI Reasoning - Right */}
            <div className="transition-all duration-300 hover:scale-[1.01]">
              <ReasoningPanel
                conversationId={config?.conversationId || ''}
                practiceId={config?.practiceId || 0}
                isConnected={isConnected}
              />
            </div>
          </div>

          {/* Controls Panel - Bottom */}
          <div className="transition-all duration-300 hover:scale-[1.01]">
            <ControlsPanel />
          </div>

          {/* Keyboard Shortcuts Help */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <h3 className="text-sm font-bold text-blue-900">
                Keyboard Shortcuts
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-blue-800">
              <div className="flex items-center gap-2">
                <kbd className="px-3 py-1.5 bg-white/80 border border-blue-300 rounded-lg font-mono text-xs shadow-sm">
                  Ctrl/Cmd+K
                </kbd>
                <span>Clear console</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-3 py-1.5 bg-white/80 border border-blue-300 rounded-lg font-mono text-xs shadow-sm">
                  Ctrl/Cmd+R
                </kbd>
                <span>Reconnect</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-3 py-1.5 bg-white/80 border border-blue-300 rounded-lg font-mono text-xs shadow-sm">
                  Ctrl/Cmd+S
                </kbd>
                <span>Send test</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-3 py-1.5 bg-white/80 border border-blue-300 rounded-lg font-mono text-xs shadow-sm">
                  Ctrl/Cmd+E
                </kbd>
                <span>Export history</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-3 py-1.5 bg-white/80 border border-blue-300 rounded-lg font-mono text-xs shadow-sm">
                  Escape
                </kbd>
                <span>Cancel response</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-10 text-center text-sm text-slate-500">
          <div className="flex items-center justify-center gap-2">
            <span>Built with</span>
            <span className="text-blue-600 font-semibold">React + TypeScript + Vite</span>
            <span>•</span>
            <span>OpenAI Realtime API</span>
          </div>
        </footer>
      </div>

      {/* Audio Player - Plays incoming audio from agent */}
      <AudioPlayer />

      {/* Speak Proposals - Floating notifications */}
      {speakProposals.map((proposal) => (
        <SpeakProposal
          key={proposal.proposalId}
          proposalId={proposal.proposalId}
          summary={proposal.summary}
          onApprove={approveSpeakProposal}
          onDeny={denySpeakProposal}
        />
      ))}

      {/* Session Summary Modal */}
      <SessionSummary />
    </div>
  );
};

/**
 * App component - Root component with SessionProvider
 */
const App: React.FC = () => {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
};

export default App;
