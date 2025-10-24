# Quick Start Guide - Voice Features

## Prerequisites

- Node.js 18+ installed
- Modern browser (Chrome, Firefox, or Safari)
- Microphone connected
- HTTPS enabled (required for microphone access)

## Setup

1. **Install dependencies:**
   ```bash
   cd realtime-frontend
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   ```
   https://localhost:5173
   ```
   (Note: HTTPS is required for microphone access)

## Testing Voice Features

### Test 1: Push-to-Talk

1. Fill in session details:
   - Practice ID: `1`
   - Conversation ID: `test-conversation-1`
   - Patient ID: `patient-123` (optional)
   - Timezone: `America/New_York`

2. Click "Start Session"

3. Wait for "Connected" status

4. **Test push-to-talk:**
   - Hold spacebar or click "Hold to Talk" button
   - Speak: "Hello, can you hear me?"
   - Release spacebar/button
   - Watch for audio level indicator
   - Check console for audio messages

5. **Verify:**
   - ✅ Audio level indicator shows activity while speaking
   - ✅ Console shows audio messages being sent
   - ✅ Transcript appears in console
   - ✅ Agent response plays automatically

### Test 2: Listening Mode

1. With session connected, click "Start Listening Mode"

2. **Simulate doctor-patient conversation:**
   - Speak continuously: "The patient is experiencing chest pain and shortness of breath"
   - Keep speaking for 10-15 seconds

3. **Watch for speak proposal:**
   - A notification should appear in bottom-right corner
   - Shows summary of what agent wants to say
   - Two buttons: "Approve" and "Deny"

4. **Test approval:**
   - Click "Approve"
   - Agent should speak
   - Audio plays automatically

5. **Test denial:**
   - Wait for another proposal
   - Click "Deny"
   - Agent stays silent
   - Continues listening

6. **Stop listening:**
   - Click "Stop Listening Mode"
   - Audio streaming stops

### Test 3: Audio Playback

1. Send a message using push-to-talk

2. **Verify audio playback:**
   - ✅ "Agent Speaking" indicator appears in top-right
   - ✅ Audio plays through speakers/headphones
   - ✅ Indicator disappears when audio finishes
   - ✅ Multiple responses queue properly

### Test 4: Error Handling

1. **Test microphone denial:**
   - Deny microphone permission
   - Verify error message appears
   - Message should be clear and helpful

2. **Test disconnection:**
   - Disconnect session
   - Try to use voice features
   - Verify buttons are disabled

3. **Test reconnection:**
   - Reconnect session
   - Voice features should work again

## Keyboard Shortcuts

- **Spacebar**: Push-to-talk (hold to record, release to send)
- **Ctrl/Cmd+K**: Clear console
- **Ctrl/Cmd+R**: Reconnect
- **Escape**: Cancel response

## Troubleshooting

### Microphone not working

**Problem:** "Failed to access microphone" error

**Solutions:**
1. Check browser permissions (click lock icon in address bar)
2. Ensure HTTPS is enabled
3. Try different browser
4. Check system microphone settings
5. Restart browser

### No audio playback

**Problem:** Agent responses not playing

**Solutions:**
1. Check browser audio settings
2. Verify speakers/headphones connected
3. Check volume levels
4. Look for errors in console
5. Try refreshing page

### Speak proposals not appearing

**Problem:** No notifications during listening mode

**Solutions:**
1. Verify backend is running
2. Check RabbitMQ is running (Layer 2)
3. Look for errors in console
4. Verify WebSocket connection is active
5. Check backend logs

### High latency

**Problem:** Delay between speaking and response

**Solutions:**
1. Check network connection speed
2. Close other bandwidth-intensive apps
3. Try wired connection instead of WiFi
4. Check backend server location
5. Verify WebSocket is using WSS (secure)

## Console Messages

### Expected Messages

**When recording:**
```
Audio sent: 4096 bytes, latency: 15.23ms
Audio sent: 4096 bytes, latency: 12.45ms
```

**When receiving:**
```
Audio received: 8192 bytes
Transcript: user - "Hello, can you hear me?"
Transcript: assistant - "Yes, I can hear you clearly."
```

**Speak proposals:**
```
Speak proposal received: abc-123
Summary: "Patient mentioned chest pain"
```

### Error Messages

**Microphone access denied:**
```
Error: Failed to access microphone. Please check permissions.
```

**WebSocket disconnected:**
```
Error: WebSocket connection closed
Status: Reconnecting...
```

## Performance Metrics

Monitor these in browser console:

- **Audio Latency**: Should be < 50ms per chunk
- **WebSocket Latency**: Should be < 100ms
- **Memory Usage**: Should stay < 100MB
- **Audio Queue**: Should not exceed 5 items

## Browser Console Commands

Open browser console (F12) and try:

```javascript
// Enable debug logging
localStorage.setItem('debug', 'voice:*');

// Check audio context state
console.log(audioContext.state);

// Check WebSocket connection
console.log(transport.isConnected());

// View pending speak proposals
console.log(speakProposals);
```

## Testing Checklist

- [ ] Microphone permission granted
- [ ] Session connects successfully
- [ ] Push-to-talk records audio
- [ ] Audio level indicator works
- [ ] Audio messages sent to server
- [ ] Transcripts appear in console
- [ ] Agent responses play automatically
- [ ] Listening mode starts/stops
- [ ] Speak proposals appear
- [ ] Approve/deny buttons work
- [ ] Audio playback indicator shows
- [ ] Multiple responses queue properly
- [ ] Error messages are clear
- [ ] Keyboard shortcuts work
- [ ] Reconnection works

## Next Steps

After testing:

1. **Review logs** in browser console and backend
2. **Check network tab** for WebSocket messages
3. **Verify audio quality** and latency
4. **Test edge cases** (poor network, multiple users, etc.)
5. **Provide feedback** to development team

## Support

If you encounter issues:

1. Check browser console for errors
2. Review network tab for WebSocket messages
3. Check backend logs
4. Verify all dependencies installed
5. Try different browser
6. Contact development team with:
   - Browser version
   - Error messages
   - Steps to reproduce
   - Screenshots/recordings

## Demo Script

For demonstrations:

1. **Introduction** (30 seconds)
   - "This is the Realtime Voice Console with AI agent"
   - "It supports two modes: direct conversation and listening mode"

2. **Push-to-Talk Demo** (1 minute)
   - Start session
   - Hold spacebar
   - Ask: "What medications is the patient taking?"
   - Show audio level indicator
   - Show transcript in console
   - Play agent response

3. **Listening Mode Demo** (2 minutes)
   - Enable listening mode
   - Simulate doctor-patient conversation
   - Show speak proposal notification
   - Approve proposal
   - Agent speaks relevant information
   - Deny next proposal
   - Agent stays silent

4. **Features Highlight** (1 minute)
   - Show audio playback indicator
   - Demonstrate keyboard shortcuts
   - Show error handling
   - Highlight security features

5. **Q&A** (remaining time)

## Resources

- **User Documentation**: `VOICE_FEATURES.md`
- **Integration Guide**: `../VOICE_INTEGRATION_GUIDE.md`
- **Summary**: `../VOICE_FEATURES_SUMMARY.md`
- **Backend Code**: `../agent/heva_voice/`
- **Frontend Code**: `src/components/Voice*.tsx`

## Feedback

Please provide feedback on:
- Audio quality
- Latency/responsiveness
- User interface
- Error messages
- Documentation clarity
- Feature requests
- Bug reports

Submit feedback to: [development team contact]
