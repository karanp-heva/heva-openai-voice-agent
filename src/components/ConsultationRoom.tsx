import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranscription, type TranscriptTurn, type SessionStatus } from '../hooks/useTranscription';
import type { SOAPNote } from '../services/transcription';
import config from '../config';

// ─── Orb Visualizer ───────────────────────────────────────────────────────────

const AudioOrb: React.FC<{ level: number; status: SessionStatus }> = ({ level, status }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    timeRef.current += 0.018;
    const t = timeRef.current;

    ctx.clearRect(0, 0, W, H);

    const active = status === 'active';
    const ending = status === 'ending';
    const baseR = 72;
    const breathe = Math.sin(t * 1.4) * 6;
    const pulse = active ? level * 38 : 0;
    const r = baseR + breathe + pulse;

    // outer glow rings
    const glowAlpha = active ? 0.08 + level * 0.18 : 0.04;
    for (let ring = 3; ring >= 1; ring--) {
      const g = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * (1 + ring * 0.45));
      g.addColorStop(0, `rgba(0,219,167,${glowAlpha / ring})`);
      g.addColorStop(1, 'rgba(0,219,167,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, r * (1 + ring * 0.45), 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    }

    // ripple ring when active
    if (active && level > 0.08) {
      const rippleR = r + 18 + level * 22;
      ctx.beginPath();
      ctx.arc(cx, cy, rippleR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0,219,167,${0.25 * level})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // core gradient sphere
    const core = ctx.createRadialGradient(cx - r * 0.28, cy - r * 0.32, r * 0.05, cx, cy, r);
    if (active) {
      core.addColorStop(0, '#afffeb');
      core.addColorStop(0.38, '#00dba7');
      core.addColorStop(0.75, '#00a87e');
      core.addColorStop(1, '#004d3a');
    } else if (ending) {
      core.addColorStop(0, '#ffe0a0');
      core.addColorStop(0.4, '#ffb849');
      core.addColorStop(1, '#7a4a00');
    } else {
      core.addColorStop(0, '#c0d4f0');
      core.addColorStop(0.4, '#4d8cf5');
      core.addColorStop(1, '#0a1e50');
    }
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = core;
    ctx.fill();

    // specular highlight
    const spec = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, 0, cx - r * 0.3, cy - r * 0.35, r * 0.55);
    spec.addColorStop(0, 'rgba(255,255,255,0.35)');
    spec.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = spec;
    ctx.fill();

    // waveform ring overlay when active
    if (active && level > 0.03) {
      ctx.save();
      ctx.translate(cx, cy);
      const pts = 64;
      ctx.beginPath();
      for (let i = 0; i <= pts; i++) {
        const angle = (i / pts) * Math.PI * 2;
        const noise =
          Math.sin(angle * 5 + t * 3.2) * level * 14 +
          Math.sin(angle * 3 - t * 2.1) * level * 8;
        const rr = r + 4 + noise;
        const x = Math.cos(angle) * rr;
        const y = Math.sin(angle) * rr;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(0,255,190,0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    animRef.current = requestAnimationFrame(draw);
  }, [level, status]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={240}
      height={240}
      className="orb-canvas"
      style={{ width: 200, height: 200 }}
    />
  );
};

// ─── Timer ────────────────────────────────────────────────────────────────────

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

// ─── Transcript Turn ──────────────────────────────────────────────────────────

const TurnBubble: React.FC<{ turn: TranscriptTurn; index: number }> = ({ turn, index }) => {
  const isProvider = turn.speaker === 'provider';
  return (
    <div
      className="turn-bubble"
      style={{
        animationDelay: `${Math.min(index * 0.04, 0.3)}s`,
        alignSelf: isProvider ? 'flex-start' : 'flex-end',
      }}
    >
      <div className={`turn-tag ${isProvider ? 'tag-provider' : 'tag-patient'}`}>
        {isProvider ? 'PROVIDER' : 'PATIENT'}
      </div>
      <div className={`turn-text ${isProvider ? 'bubble-provider' : 'bubble-patient'}`}>
        {turn.text}
      </div>
      <div className="turn-time">
        {turn.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
    </div>
  );
};

// ─── SOAP Note ────────────────────────────────────────────────────────────────

const SOAP_ICONS: Record<keyof SOAPNote, string> = {
  subjective: 'S',
  objective: 'O',
  assessment: 'A',
  plan: 'P',
};

const SOAP_LABELS: Record<keyof SOAPNote, string> = {
  subjective: 'Subjective',
  objective: 'Objective',
  assessment: 'Assessment',
  plan: 'Plan',
};

const SOAPSection: React.FC<{ section: keyof SOAPNote; value: string; delay: number }> = ({
  section,
  value,
  delay,
}) => (
  <div className="soap-section" style={{ animationDelay: `${delay}s` }}>
    <div className="soap-section-header">
      <span className="soap-letter">{SOAP_ICONS[section]}</span>
      <span className="soap-label">{SOAP_LABELS[section]}</span>
    </div>
    <p className="soap-content">{value}</p>
  </div>
);

const SOAPPanel: React.FC<{ note: SOAPNote; onCopy: () => void }> = ({ note, onCopy }) => (
  <div className="soap-panel">
    <div className="soap-panel-header">
      <div className="soap-panel-title">
        <span className="soap-icon">✦</span>
        Clinical Note
      </div>
      <button className="btn-ghost" onClick={onCopy} title="Copy to clipboard">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
        Copy
      </button>
    </div>
    <div className="soap-sections">
      {(Object.keys(SOAP_LABELS) as (keyof SOAPNote)[]).map((k, i) => (
        <SOAPSection key={k} section={k} value={note[k]} delay={i * 0.12} />
      ))}
    </div>
  </div>
);

// ─── Auth Form ────────────────────────────────────────────────────────────────

const AuthForm: React.FC<{
  onStart: (practiceId: number, token: string) => void;
  disabled: boolean;
}> = ({ onStart, disabled }) => {
  const [practiceId, setPracticeId] = useState<string>(
    config.session.defaultPracticeId ? String(config.session.defaultPracticeId) : ''
  );
  const [token, setToken] = useState<string>(config.api.authToken || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pid = parseInt(practiceId, 10);
    if (!isNaN(pid) && token.trim()) onStart(pid, token.trim());
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-field">
        <label className="auth-label">Practice ID</label>
        <input
          className="auth-input"
          type="number"
          placeholder="e.g. 1"
          value={practiceId}
          onChange={(e) => setPracticeId(e.target.value)}
          required
        />
      </div>
      <div className="auth-field">
        <label className="auth-label">Auth Token</label>
        <input
          className="auth-input"
          type="password"
          placeholder="Bearer token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
        />
      </div>
      <button className="btn-start" type="submit" disabled={disabled}>
        Begin Consultation
      </button>
    </form>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const ConsultationRoom: React.FC = () => {
  const { status, turns, partialText, soapNote, audioLevel, elapsed, error, startSession, endSession, reset } =
    useTranscription();

  const transcriptRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Auto-scroll transcript
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, partialText]);

  const copySOAP = useCallback(() => {
    if (!soapNote) return;
    const text = `SUBJECTIVE:\n${soapNote.subjective}\n\nOBJECTIVE:\n${soapNote.objective}\n\nASSESSMENT:\n${soapNote.assessment}\n\nPLAN:\n${soapNote.plan}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [soapNote]);

  const isIdle = status === 'idle' || status === 'error';
  const isActive = status === 'active';
  const isConnecting = status === 'connecting';
  const isEnding = status === 'ending';
  const isDone = status === 'completed';

  return (
    <div className="consultation-room">
      {/* ── Header ── */}
      <header className="cr-header">
        <div className="cr-brand">
          <svg className="cr-brand-icon" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 16h4l2-6 3 12 2-6h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Clinical Transcription</span>
        </div>

        <div className="cr-header-center">
          {(isActive || isEnding || isDone) && (
            <div className={`session-badge ${isDone ? 'badge-done' : isEnding ? 'badge-ending' : 'badge-live'}`}>
              {!isDone && <span className="badge-dot" />}
              {isDone ? 'SESSION COMPLETE' : isEnding ? 'ENDING…' : 'LIVE'}
            </div>
          )}
        </div>

        <div className="cr-header-right">
          {(isActive || isEnding || isDone) && (
            <div className="session-timer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              {formatTime(elapsed)}
            </div>
          )}
          {isDone && (
            <button className="btn-ghost" onClick={reset}>
              New Session
            </button>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="cr-body">
        {/* ── Left Column ── */}
        <aside className="cr-sidebar">
          <div className="orb-container">
            <AudioOrb level={audioLevel} status={status} />
            <div className={`orb-label ${isActive ? 'orb-label-active' : ''}`}>
              {isConnecting && 'Connecting…'}
              {isIdle && 'Ready'}
              {isActive && 'Listening'}
              {isEnding && 'Processing…'}
              {isDone && 'Complete'}
            </div>
          </div>

          {isIdle && (
            <div className="sidebar-auth">
              <p className="sidebar-subtitle">Start a new clinical consultation session with live transcription and AI-generated SOAP notes.</p>
              <AuthForm onStart={startSession} disabled={isConnecting} />
            </div>
          )}

          {isConnecting && (
            <div className="connecting-state">
              <div className="spinner" />
              <p>Connecting to AssemblyAI…</p>
            </div>
          )}

          {isActive && (
            <>
              <div className="speaker-legend">
                <div className="legend-item">
                  <span className="legend-dot dot-provider" />
                  <span>Provider</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot dot-patient" />
                  <span>Patient</span>
                </div>
              </div>
              <div className="level-meter">
                <div className="level-label">
                  <span>Mic Level</span>
                  <span className="level-value">{Math.round(audioLevel * 100)}%</span>
                </div>
                <div className="level-track">
                  <div
                    className="level-fill"
                    style={{ width: `${audioLevel * 100}%`, opacity: 0.7 + audioLevel * 0.3 }}
                  />
                </div>
              </div>
              <button className="btn-end" onClick={endSession}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
                End Session
              </button>
            </>
          )}

          {isDone && (
            <div className="done-state">
              <div className="done-checkmark">✓</div>
              <p className="done-label">Session complete</p>
              <p className="done-sub">{turns.length} turns · {formatTime(elapsed)}</p>
            </div>
          )}

          {status === 'error' && (
            <div className="error-card">
              <div className="error-icon">!</div>
              <p className="error-text">{error}</p>
              <button className="btn-ghost" onClick={reset}>Try Again</button>
            </div>
          )}
        </aside>

        {/* ── Center: Transcript ── */}
        <main className="cr-transcript">
          <div className="transcript-header">
            <span className="transcript-title">Live Transcript</span>
            {turns.length > 0 && (
              <span className="transcript-count">{turns.length} turn{turns.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          <div className="transcript-feed" ref={transcriptRef}>
            {turns.length === 0 && !partialText && (
              <div className="transcript-empty">
                {isActive
                  ? 'Waiting for speech…'
                  : isIdle
                  ? 'Transcript will appear here once a session begins.'
                  : ''}
              </div>
            )}

            {turns.map((turn, i) => (
              <TurnBubble key={turn.id} turn={turn} index={i} />
            ))}

            {partialText && (
              <div className="partial-bubble">
                <div className="turn-tag tag-partial">PARTIAL</div>
                <div className="partial-text">{partialText}</div>
                <div className="partial-cursor" />
              </div>
            )}
          </div>
        </main>

        {/* ── Right: SOAP Note ── */}
        <aside className={`cr-soap ${soapNote ? 'soap-visible' : ''}`}>
          {soapNote ? (
            <SOAPPanel note={soapNote} onCopy={copySOAP} />
          ) : (
            <div className="soap-placeholder">
              <div className="soap-placeholder-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <p className="soap-placeholder-title">SOAP Note</p>
              <p className="soap-placeholder-sub">Generated automatically when the session ends.</p>
            </div>
          )}
          {copied && (
            <div className="copy-toast">Copied to clipboard ✓</div>
          )}
        </aside>
      </div>
    </div>
  );
};
