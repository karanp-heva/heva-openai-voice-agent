import React, { useCallback, useState } from 'react';
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
import { ConsultationRoom } from './components/ConsultationRoom';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

type AppTab = 'console' | 'consultation';

const ConsoleIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

const MicIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
    <path d="M8 12h.01M12 8h.01M16 12h.01" />
  </svg>
);

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

  const [activeTab, setActiveTab] = useState<AppTab>('console');

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

  const handleSendTestMessage = useCallback(async () => {
    if (!isConnected) return;

    try {
      await sendMessage({ type: 'test', timestamp: new Date().toISOString(), data: 'Test message from keyboard shortcut' });
    } catch (error) {
      console.error('Failed to send test message:', error);
    }
  }, [isConnected, sendMessage]);

  const handleCancelResponse = useCallback(async () => {
    if (!isConnected) return;

    try {
      await sendMessage({ type: 'response.cancel' });
    } catch (error) {
      console.error('Failed to cancel response:', error);
    }
  }, [isConnected, sendMessage]);

  const handleReconnect = useCallback(() => {
    if (!isConnected) return;

    try {
      reconnect();
    } catch (error) {
      console.error('Failed to reconnect:', error);
    }
  }, [isConnected, reconnect]);

  useKeyboardShortcuts({
    onClearConsole: clearMessages,
    onReconnect: handleReconnect,
    onSendTestMessage: handleSendTestMessage,
    onExportHistory: handleExportHistory,
    onCancelResponse: handleCancelResponse,
    enabled: activeTab === 'console',
  });

  return (
    <div className="app-root">
      {/* ── Navigation ── */}
      <nav className="app-nav">
        <span className="app-nav-logo">HEVA</span>

        <button
          className={`nav-tab ${activeTab === 'console' ? 'active' : ''}`}
          onClick={() => setActiveTab('console')}
        >
          <ConsoleIcon />
          Voice Console
        </button>

        <button
          className={`nav-tab ${activeTab === 'consultation' ? 'active' : ''}`}
          onClick={() => setActiveTab('consultation')}
        >
          <MicIcon />
          Clinical Transcription
          <span
            className="nav-tab-dot"
            style={{ background: '#00dba7', boxShadow: '0 0 6px rgba(0,219,167,0.6)' }}
          />
        </button>
      </nav>

      {/* ── Views ── */}
      <div className="app-view">
        {activeTab === 'consultation' ? (
          <ConsultationRoom />
        ) : (
          <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <div className="container mx-auto px-4 py-8 max-w-[1920px]">
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

              <div className="space-y-6">
                <div className="transition-all duration-300 hover:scale-[1.01]">
                  <SessionController />
                </div>
                <div className="transition-all duration-300">
                  <StatusIndicator
                    status={connectionState.status}
                    latency={connectionState.latency}
                    error={connectionState.error}
                    reconnectionCountdown={reconnectionCountdown}
                    isReconnecting={isReconnecting}
                  />
                </div>
                <div className="transition-all duration-300 hover:scale-[1.01]">
                  <VoiceControls />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl border border-slate-200">
                    <div className="bg-gradient-to-r from-indigo-800 to-indigo-700 text-white px-6 py-4 flex items-center gap-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-semibold">Message History</span>
                    </div>
                    <div className="h-[600px] overflow-hidden">
                      <HistoryViewer messages={messages} onReplay={replayMessage} onExport={handleExportHistory} />
                    </div>
                  </div>
                  <div className="transition-all duration-300 hover:scale-[1.01]">
                    <ReasoningPanel
                      conversationId={config?.conversationId || ''}
                      practiceId={config?.practiceId || 0}
                      isConnected={isConnected}
                    />
                  </div>
                </div>
                <div className="transition-all duration-300 hover:scale-[1.01]">
                  <ControlsPanel />
                </div>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    <h3 className="text-sm font-bold text-blue-900">Keyboard Shortcuts</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-blue-800">
                    {[
                      ['Ctrl/Cmd+K', 'Clear console'],
                      ['Ctrl/Cmd+R', 'Reconnect'],
                      ['Ctrl/Cmd+S', 'Send test'],
                      ['Ctrl/Cmd+E', 'Export history'],
                      ['Escape',     'Cancel response'],
                    ].map(([key, label]) => (
                      <div key={key} className="flex items-center gap-2">
                        <kbd className="px-3 py-1.5 bg-white/80 border border-blue-300 rounded-lg font-mono text-xs shadow-sm">{key}</kbd>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <footer className="mt-10 text-center text-sm text-slate-500">
                <div className="flex items-center justify-center gap-2">
                  <span>Built with</span>
                  <span className="text-blue-600 font-semibold">React + TypeScript + Vite</span>
                  <span>•</span>
                  <span>OpenAI Realtime API</span>
                </div>
              </footer>
            </div>

            <AudioPlayer />
            {speakProposals.map((proposal) => (
              <SpeakProposal
                key={proposal.proposalId}
                proposalId={proposal.proposalId}
                summary={proposal.summary}
                onApprove={approveSpeakProposal}
                onDeny={denySpeakProposal}
              />
            ))}
          </div>
        )}
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

const App: React.FC = () => (
  <SessionProvider>
    <AppContent />
  </SessionProvider>
);

export default App;
