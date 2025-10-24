# Voice Features Documentation

This document describes the voice conversation features implemented in the Realtime Voice Console.

## Overview

The frontend now supports two modes of voice interaction with the AI agent:

1. **Push-to-Talk Mode**: Direct voice conversations with the agent
2. **Listening Mode**: Agent listens to doctor-patient conversations and can request to speak when needed

## Features

### 1. Push-to-Talk Mode

Allows users to have direct voice conversations with the agent.

**How to use:**
- Click and hold the "Hold to Talk" button
- Or press and hold the **Spacebar** key
- Speak your message
- Release the button/key to send the audio

**Technical details:**
- Audio is captured at 24kHz sample rate
- Uses WebM/Opus encoding for efficient transmission
- Audio chunks are sent every 100ms for low latency
- Visual audio level indicator shows recording activity

### 2. Listening Mode

Agent listens to the conversation between doctor and patient and can request permission to speak when it has relevant information.

**How to use:**
- Click "Start Listening Mode" button
- Agent will continuously listen to the conversation
- When agent wants to speak, a notification appears with a summary
- Doctor can approve or deny the request

**Technical details:**
- Continuous audio streaming to the backend
- Agent uses `request_to_speak` tool to propose speaking
- Speak proposals are displayed as floating notifications
- Doctor maintains full control over when agent speaks

### 3. Audio Playback

Automatically plays audio responses from the agent.

**Features:**
- Automatic playback of agent responses
- Audio queue management for multiple responses
- Visual indicator when agent is speaking
- Smooth audio transitions

## Components

### VoiceControls

Main component for voice interaction controls.

**Location:** `src/components/VoiceControls.tsx`

**Features:**
- Microphone access management
- Audio recording and streaming
- Push-to-talk functionality
- Listening mode toggle
- Audio level visualization
- Keyboard shortcuts (Spacebar for push-to-talk)

### SpeakProposal

Displays agent's request to speak during listening mode.

**Location:** `src/components/SpeakProposal.tsx`

**Features:**
- Floating notification design
- Shows summary of what agent wants to say
- Approve/Deny buttons
- Smooth animations

### AudioPlayer

Handles playback of audio responses from the agent.

**Location:** `src/components/AudioPlayer.tsx`

**Features:**
- Automatic audio playback
- Audio queue management
- Visual playback indicator
- Error handling for audio decoding

## Session Context Updates

The `SessionContext` has been extended to support voice features:

**New state:**
- `speakProposals`: Array of pending speak proposals from agent
- `approveSpeakProposal(proposalId)`: Approve agent's request to speak
- `denySpeakProposal(proposalId)`: Deny agent's request to speak

**New message types:**
- `audio`: Audio data chunks (sent/received)
- `audio_commit`: Signal end of audio input
- `listening_mode`: Enable/disable listening mode
- `speak_proposal`: Agent's request to speak
- `proposal_response`: Doctor's approval/denial

## Backend Integration

### WebSocket Messages

**Client → Server:**

```typescript
// Send audio chunk
{
  type: 'audio',
  data: '<base64-encoded-audio>'
}

// Commit audio buffer (end of speech)
{
  type: 'audio_commit'
}

// Enable/disable listening mode
{
  type: 'listening_mode',
  enabled: true | false
}

// Respond to speak proposal
{
  type: 'proposal_response',
  proposalId: '<proposal-id>',
  approved: true | false
}
```

**Server → Client:**

```typescript
// Audio response from agent
{
  type: 'audio',
  data: '<base64-encoded-audio>',
  direction: 'received'
}

// Transcript of conversation
{
  type: 'transcript',
  role: 'user' | 'assistant',
  text: '<transcript-text>'
}

// Speak proposal from agent
{
  type: 'speak_proposal',
  proposalId: '<unique-id>',
  summary: '<brief-summary-of-what-agent-wants-to-say>'
}
```

## Audio Format

**Recording:**
- Format: WebM with Opus codec
- Sample Rate: 24kHz
- Channels: Mono (1 channel)
- Bit Rate: 128kbps
- Chunk Size: 100ms

**Playback:**
- Format: PCM audio (decoded from server response)
- Sample Rate: 24kHz
- Channels: Mono

## Browser Compatibility

**Required APIs:**
- MediaDevices API (for microphone access)
- MediaRecorder API (for audio recording)
- Web Audio API (for audio playback and visualization)
- WebSocket API (for real-time communication)

**Supported Browsers:**
- Chrome/Edge 88+
- Firefox 94+
- Safari 14.1+

## Security Considerations

1. **Microphone Permissions**: User must grant microphone access
2. **HTTPS Required**: WebRTC/MediaDevices require secure context
3. **Audio Data**: All audio is transmitted over secure WebSocket (WSS)
4. **Privacy**: Audio is not stored on client side

## Error Handling

The voice features include comprehensive error handling:

1. **Microphone Access Denied**: Clear error message with instructions
2. **Audio Encoding Errors**: Graceful fallback and retry
3. **Network Errors**: Automatic reconnection with exponential backoff
4. **Audio Playback Errors**: Skip failed audio and continue with queue

## Performance Optimizations

1. **Low Latency**: 100ms audio chunks for near real-time communication
2. **Audio Queue**: Prevents audio overlap and ensures smooth playback
3. **Efficient Encoding**: WebM/Opus provides good quality at low bitrate
4. **Visual Feedback**: Audio level visualization without impacting performance

## Future Enhancements

Potential improvements for future versions:

1. **Voice Activity Detection (VAD)**: Automatic speech detection
2. **Noise Cancellation**: Enhanced audio quality in noisy environments
3. **Multi-language Support**: Real-time language detection and translation
4. **Audio Recording**: Save conversation audio for later review
5. **Custom Voice Settings**: Adjustable audio quality and latency settings

## Troubleshooting

### Microphone not working
- Check browser permissions
- Ensure HTTPS is enabled
- Try different browser
- Check system microphone settings

### Audio playback issues
- Check browser audio settings
- Ensure speakers/headphones are connected
- Try refreshing the page
- Check network connection

### High latency
- Check network connection speed
- Reduce audio quality settings (if available)
- Close other bandwidth-intensive applications

## Testing

To test the voice features:

1. Start a session with valid credentials
2. Click "Start Listening Mode" or use "Hold to Talk"
3. Speak into microphone
4. Verify audio level indicator shows activity
5. Check console for audio messages
6. Verify agent responses are played automatically

## Support

For issues or questions about voice features:
- Check browser console for error messages
- Review network tab for WebSocket communication
- Verify microphone permissions in browser settings
- Contact development team with detailed error logs
