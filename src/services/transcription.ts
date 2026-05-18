/**
 * AssemblyAI clinical transcription WebSocket service.
 *
 * Protocol:
 *   1. Connect to ws://<host>/v2/transcription/stream
 *   2. Send JSON auth: { practice_id, token, sample_rate }
 *   3. Stream binary PCM16 audio frames
 *   4. Send { type: "terminate" } to end
 *   5. Receive transcript / soap / session_end / error events
 */

export interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export type TranscriptEvent =
  | { type: 'transcript'; text: string; end_of_turn: boolean }
  | { type: 'soap'; soap: SOAPNote }
  | { type: 'session_end'; audio_duration: number }
  | { type: 'error'; message: string; transcript?: string }
  | { type: '_connected' }
  | { type: '_disconnected' };

export class TranscriptionService {
  private ws: WebSocket | null = null;
  private readonly onEvent: (event: TranscriptEvent) => void;
  private readonly sampleRate: number;

  constructor(onEvent: (event: TranscriptEvent) => void, sampleRate = 16000) {
    this.onEvent = onEvent;
    this.sampleRate = sampleRate;
  }

  connect(wsUrl: string, practiceId: number, token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl);
        this.ws.binaryType = 'arraybuffer';
      } catch (err) {
        reject(new Error(`WebSocket init failed: ${err}`));
        return;
      }

      const cleanup = () => {
        if (this.ws) {
          this.ws.onopen = null;
          this.ws.onerror = null;
        }
      };

      this.ws.onopen = () => {
        cleanup();
        this.ws!.send(
          JSON.stringify({ practice_id: practiceId, token, sample_rate: this.sampleRate })
        );
        this.onEvent({ type: '_connected' });
        resolve();
      };

      this.ws.onerror = (err) => {
        cleanup();
        reject(new Error(`WebSocket error: ${String(err)}`));
      };

      this.ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data as string);
          this.onEvent(data as TranscriptEvent);
        } catch {
          // ignore malformed frames
        }
      };

      this.ws.onclose = () => {
        this.onEvent({ type: '_disconnected' });
      };
    });
  }

  sendAudio(pcm16: ArrayBuffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(pcm16);
    }
  }

  terminate(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'terminate' }));
    }
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }
}
