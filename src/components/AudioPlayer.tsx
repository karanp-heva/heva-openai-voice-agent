import React, { useEffect, useRef, useState } from 'react';
import { useSession } from '../context/SessionContext';

/**
 * AudioPlayer component handles playback of audio responses from the agent
 * Automatically plays audio messages received from the server
 */
export const AudioPlayer: React.FC = () => {
  const { messages } = useSession();
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  /**
   * Initialize audio context
   */
  useEffect(() => {
    audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);
  
  /**
   * Play audio from queue
   */
  const playNextAudio = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) {
      return;
    }
    
    isPlayingRef.current = true;
    setIsPlaying(true);
    
    const audioData = audioQueueRef.current.shift();
    
    if (!audioData || !audioContextRef.current) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      return;
    }
    
    try {
      // Decode audio data
      const audioBuffer = await audioContextRef.current.decodeAudioData(audioData);
      
      // Create source and play
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      // Handle playback end
      source.onended = () => {
        isPlayingRef.current = false;
        setIsPlaying(false);
        
        // Play next audio in queue
        if (audioQueueRef.current.length > 0) {
          playNextAudio();
        }
      };
      
      source.start(0);
    } catch (error) {
      console.error('Failed to play audio:', error);
      isPlayingRef.current = false;
      setIsPlaying(false);
      
      // Try next audio in queue
      if (audioQueueRef.current.length > 0) {
        playNextAudio();
      }
    }
  };
  
  /**
   * Handle incoming audio messages
   */
  useEffect(() => {
    // Find latest audio message
    const audioMessages = messages.filter(
      (msg) => msg.type === 'audio' && 'direction' in msg && (msg as any).direction === 'received'
    );
    
    if (audioMessages.length === 0) {
      return;
    }
    
    const latestAudio = audioMessages[audioMessages.length - 1];
    
    // Check if we've already processed this message
    if ('data' in latestAudio) {
      const audioData = (latestAudio as any).data;
      
      // Convert base64 to ArrayBuffer
      try {
        const binaryString = atob(audioData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Add to queue
        audioQueueRef.current.push(bytes.buffer);
        
        // Start playing if not already playing
        if (!isPlayingRef.current) {
          playNextAudio();
        }
      } catch (error) {
        console.error('Failed to decode audio data:', error);
      }
    }
  }, [messages]);
  
  // Visual indicator when playing
  if (!isPlaying) {
    return null;
  }
  
  return (
    <div className="fixed top-8 right-8 bg-white rounded-xl shadow-lg border border-blue-200 p-4 z-40 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        </div>
        <div>
          <div className="font-semibold text-slate-900">Agent Speaking</div>
          <div className="text-sm text-slate-600">Playing audio response...</div>
        </div>
      </div>
    </div>
  );
};
