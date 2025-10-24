import React, { useState, useRef, useEffect } from 'react';
import { useSession } from '../context/SessionContext';

/**
 * VoiceControls component provides audio recording and playback controls
 * for real-time voice conversations with the agent
 */
export const VoiceControls: React.FC = () => {
  const { isConnected, sendMessage } = useSession();
  
  // Recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [error, setError] = useState<string>('');
  
  // Audio context and stream refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  
  /**
   * Convert Float32Array PCM samples to Int16Array (PCM16)
   */
  const convertFloat32ToInt16 = (float32Array: Float32Array): Int16Array => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      // Clamp values to [-1, 1] and convert to 16-bit integer
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array;
  };

  /**
   * Start recording audio from microphone
   */
  const startRecording = async () => {
    try {
      setError('');
      
      // Request microphone access with 24kHz sample rate (required by OpenAI Realtime API)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 24000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      
      streamRef.current = stream;
      
      // Create AudioContext with 24kHz sample rate
      const audioContext = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      
      // Create analyzer for visualization
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      // Start visualizing audio levels
      const updateAudioLevel = () => {
        if (!analyserRef.current) return;
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average audio level
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        setAudioLevel(average / 255); // Normalize to 0-1
        
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      
      updateAudioLevel();
      
      // Use ScriptProcessorNode to capture raw PCM samples
      // Note: ScriptProcessorNode is deprecated but AudioWorklet requires a separate file
      // For production, consider implementing AudioWorklet
      const bufferSize = 4096; // Process in chunks
      const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
      
      processor.onaudioprocess = async (e) => {
        if (!isConnected) return;
        
        // Get raw PCM samples (Float32Array)
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert to PCM16 (Int16Array)
        const pcm16Data = convertFloat32ToInt16(inputData);
        
        // Convert to base64
        const base64Audio = btoa(
          String.fromCharCode(...new Uint8Array(pcm16Data.buffer))
        );
        
        // Send audio chunk to server
        await sendMessage({
          type: 'audio',
          data: base64Audio,
        });
      };
      
      // Connect the processor
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      processorNodeRef.current = processor;
      setIsRecording(true);
      
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Failed to access microphone. Please check permissions.');
    }
  };
  
  /**
   * Stop recording audio
   */
  const stopRecording = () => {
    // Disconnect and clean up audio processor
    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect();
      processorNodeRef.current = null;
    }
    
    if (audioWorkletNodeRef.current) {
      audioWorkletNodeRef.current.disconnect();
      audioWorkletNodeRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    setIsRecording(false);
    setAudioLevel(0);
  };
  
  /**
   * Toggle listening mode (agent listens to doctor-patient conversation)
   */
  const toggleListening = async () => {
    if (isListening) {
      // Stop listening mode
      stopRecording();
      setIsListening(false);
      
      await sendMessage({
        type: 'listening_mode',
        enabled: false,
      });
    } else {
      // Start listening mode
      await startRecording();
      setIsListening(true);
      
      await sendMessage({
        type: 'listening_mode',
        enabled: true,
      });
    }
  };
  
  /**
   * Handle push-to-talk
   */
  const handlePushToTalk = async (pressed: boolean) => {
    if (pressed && !isRecording && !isListening) {
      await startRecording();
    } else if (!pressed && isRecording && !isListening) {
      stopRecording();
      
      // Commit audio buffer
      await sendMessage({
        type: 'audio_commit',
      });
    }
  };
  
  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);
  
  /**
   * Handle spacebar for push-to-talk
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && isConnected && !isListening) {
        e.preventDefault();
        handlePushToTalk(true);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isConnected && !isListening) {
        e.preventDefault();
        handlePushToTalk(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isConnected, isListening, isRecording]);
  
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-slate-200">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
          Voice Controls
        </h2>
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-2 text-red-800">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}
      
      {/* Audio Level Visualizer */}
      {(isRecording || isListening) && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-medium text-slate-700">
              {isListening ? 'Listening to conversation...' : 'Recording...'}
            </span>
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-100"
                style={{ width: `${audioLevel * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Control Buttons */}
      <div className="space-y-4">
        {/* Push to Talk Button */}
        <button
          onMouseDown={() => handlePushToTalk(true)}
          onMouseUp={() => handlePushToTalk(false)}
          onMouseLeave={() => isRecording && !isListening && handlePushToTalk(false)}
          disabled={!isConnected || isListening}
          className={`w-full px-6 py-4 rounded-xl font-semibold transition-all shadow-lg ${
            !isConnected || isListening
              ? 'bg-slate-400 cursor-not-allowed text-white'
              : isRecording
              ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-xl scale-105'
              : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white hover:shadow-xl hover:scale-[1.02]'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            {isRecording && !isListening ? 'Release to Send' : 'Hold to Talk (or press Space)'}
          </span>
        </button>
        
        {/* Listening Mode Toggle */}
        <button
          onClick={toggleListening}
          disabled={!isConnected}
          className={`w-full px-6 py-4 rounded-xl font-semibold transition-all shadow-lg ${
            !isConnected
              ? 'bg-slate-400 cursor-not-allowed text-white'
              : isListening
              ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-xl'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white hover:shadow-xl hover:scale-[1.02]'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isListening ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              )}
            </svg>
            {isListening ? 'Stop Listening Mode' : 'Start Listening Mode'}
          </span>
        </button>
        
        {/* Info Text */}
        <div className="text-sm text-slate-600 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="font-semibold text-blue-900 mb-2">How it works:</div>
          <ul className="space-y-1 list-disc list-inside">
            <li><strong>Push to Talk:</strong> Hold the button or press Space to speak directly to the agent</li>
            <li><strong>Listening Mode:</strong> Agent listens to doctor-patient conversation and can request to speak when needed</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
