import { useState, useRef, useCallback } from 'react';
import { TranscriptionService, type SOAPNote, type TranscriptEvent } from '../services/transcription';
import config from '../config';

export type Speaker = 'provider' | 'patient';

export interface TranscriptTurn {
  id: string;
  text: string;
  speaker: Speaker;
  timestamp: Date;
}

export type SessionStatus = 'idle' | 'connecting' | 'active' | 'ending' | 'completed' | 'error';

export interface UseTranscriptionReturn {
  status: SessionStatus;
  turns: TranscriptTurn[];
  partialText: string;
  soapNote: SOAPNote | null;
  audioLevel: number;
  elapsed: number;
  error: string;
  startSession: (practiceId: number, token: string) => Promise<void>;
  endSession: () => void;
  reset: () => void;
}

function float32ToPcm16(float32: Float32Array): ArrayBuffer {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16.buffer;
}

function httpToWs(url: string): string {
  return url.replace(/^http/, 'ws');
}

export function useTranscription(): UseTranscriptionReturn {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const [partialText, setPartialText] = useState('');
  const [soapNote, setSoapNote] = useState<SOAPNote | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');

  const serviceRef = useRef<TranscriptionService | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const turnIndexRef = useRef(0);

  const stopAudio = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;

    analyserRef.current = null;

    cancelAnimationFrame(animFrameRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    setAudioLevel(0);
  }, []);

  const handleEvent = useCallback(
    (event: TranscriptEvent) => {
      switch (event.type) {
        case 'transcript': {
          if (event.end_of_turn && event.text.trim()) {
            const speaker: Speaker = turnIndexRef.current % 2 === 0 ? 'provider' : 'patient';
            turnIndexRef.current++;
            setTurns((prev) => [
              ...prev,
              { id: `t-${Date.now()}-${Math.random()}`, text: event.text, speaker, timestamp: new Date() },
            ]);
            setPartialText('');
          } else {
            setPartialText(event.text);
          }
          break;
        }
        case 'soap':
          setSoapNote(event.soap);
          break;
        case 'session_end':
          stopAudio();
          setStatus('completed');
          break;
        case 'error':
          setError(event.message);
          setStatus('error');
          stopAudio();
          break;
        default:
          break;
      }
    },
    [stopAudio]
  );

  const startSession = useCallback(
    async (practiceId: number, token: string) => {
      setStatus('connecting');
      setError('');
      setTurns([]);
      setPartialText('');
      setSoapNote(null);
      setElapsed(0);
      turnIndexRef.current = 0;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true },
        });
        streamRef.current = stream;

        const ctx = new AudioContext({ sampleRate: 16000 });
        audioCtxRef.current = ctx;

        const source = ctx.createMediaStreamSource(stream);

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;

        const track = () => {
          if (!analyserRef.current) return;
          const buf = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(buf);
          setAudioLevel(buf.reduce((s, v) => s + v, 0) / buf.length / 255);
          animFrameRef.current = requestAnimationFrame(track);
        };
        track();

        timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);

        const wsBase = httpToWs(config.api.baseUrl);
        const service = new TranscriptionService(handleEvent, 16000);
        serviceRef.current = service;
        await service.connect(`${wsBase}/v2/transcription/stream`, practiceId, token);

        const processor = ctx.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = (e) => {
          const pcm16 = float32ToPcm16(e.inputBuffer.getChannelData(0));
          service.sendAudio(pcm16);
        };
        source.connect(processor);
        processor.connect(ctx.destination);
        processorRef.current = processor;

        setStatus('active');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Microphone access denied');
        setStatus('error');
        stopAudio();
      }
    },
    [handleEvent, stopAudio]
  );

  const endSession = useCallback(() => {
    setStatus('ending');
    serviceRef.current?.terminate();
    stopAudio();
  }, [stopAudio]);

  const reset = useCallback(() => {
    serviceRef.current?.disconnect();
    stopAudio();
    setStatus('idle');
    setTurns([]);
    setPartialText('');
    setSoapNote(null);
    setElapsed(0);
    setError('');
    turnIndexRef.current = 0;
  }, [stopAudio]);

  return { status, turns, partialText, soapNote, audioLevel, elapsed, error, startSession, endSession, reset };
}
