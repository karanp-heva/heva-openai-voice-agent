# AI Reasoning Integration - Frontend

## Overview

The AI Reasoning feature has been integrated into the Realtime Frontend. It displays the AI's thought process in real-time, showing observations, questions, concerns, and patterns.

## What Was Added

### 1. New Types (`src/types/reasoning.ts`)

TypeScript types for reasoning entries:
- `ReasoningType` - Type of reasoning entry
- `ReasoningEntry` - Individual reasoning entry
- `ReasoningStatistics` - Statistics about reasoning
- `ReasoningResponse` - API response format

### 2. New Component (`src/components/ReasoningPanel.tsx`)

A new panel component that:
- Displays AI reasoning entries in real-time
- Filters by type (all, questions, concerns, observations)
- Polls the API every 5 seconds for updates
- Shows confidence levels and timestamps
- Highlights concerns by severity

### 3. Updated App Layout (`src/App.tsx`)

Changed from 2-column to 3-column layout:
- **Left**: Realtime Console (messages)
- **Center**: Message History
- **Right**: AI Reasoning Panel (NEW)

## Features

### Filtering

The panel has 4 filter buttons:
- **All** - Shows all reasoning entries
- **Questions** - Shows only questions from the AI
- **Concerns** - Shows only concerns (with severity badges)
- **Observations** - Shows only observations

### Visual Indicators

Each entry shows:
- **Icon** - Visual indicator of type (❓ question, 👁️ observation, ⚠️ concern, etc.)
- **Type & Topic** - What kind of entry and what it's about
- **Content** - The actual reasoning text
- **Confidence** - How confident the AI is (0-100%)
- **Timestamp** - When the entry was created
- **Severity Badge** - For concerns (high/medium/low)

### Color Coding

- **Questions**: Blue border
- **Observations**: Purple border
- **Concerns**: Red border
- **Patterns**: Green border
- **Context Updates**: Indigo border
- **Suggestions**: Yellow border

## Usage

### Starting a Session

1. Start the backend server
2. Start the frontend: `npm run dev`
3. Connect to a session using the SessionController
4. The Reasoning Panel will automatically start polling for entries

### Viewing Reasoning

As the conversation progresses, the AI will:
1. Analyze transcripts
2. Use reasoning tools to store thoughts
3. Entries appear in the Reasoning Panel within 5 seconds

### Example Flow

```
Doctor: "The patient mentioned headaches."

AI Reasoning Panel shows:
┌─────────────────────────────────────┐
│ 👁️ Observation • symptoms          │
│ Patient mentioned recurring         │
│ headaches - might be related to     │
│ medication                          │
│ ✓ 85% • 10:30:45 AM                │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ❓ Question • medication            │
│ What medication is the patient      │
│ currently taking?                   │
│ ✓ 90% • 10:30:46 AM                │
│ Context: Need to check for side     │
│ effects                             │
└─────────────────────────────────────┘
```

## API Integration

The component uses these endpoints:

```typescript
// Get all entries
GET /realtime/reasoning/{conversationId}?practice_id={practiceId}&limit=20

// Get questions only
GET /realtime/reasoning/{conversationId}/questions?practice_id={practiceId}&limit=20

// Get concerns only
GET /realtime/reasoning/{conversationId}/concerns?practice_id={practiceId}&limit=20
```

## Configuration

### Polling Interval

Default: 5 seconds

To change, edit `ReasoningPanel.tsx`:
```typescript
const interval = setInterval(fetchEntries, 5000); // Change 5000 to desired ms
```

### Entry Limit

Default: 20 entries

To change, edit the API call in `ReasoningPanel.tsx`:
```typescript
url += `?practice_id=${practiceId}&limit=20`; // Change 20 to desired limit
```

### Panel Height

Default: 400px

To change, edit `ReasoningPanel.tsx`:
```typescript
<div className="p-6 h-[400px] overflow-y-auto"> // Change 400px
```

## Responsive Design

The layout adapts to screen size:
- **Desktop (lg+)**: 3-column layout
- **Tablet/Mobile**: Stacked layout (Console → History → Reasoning)

## Styling

Uses Tailwind CSS with:
- Gradient backgrounds
- Backdrop blur effects
- Smooth transitions
- Hover effects
- Color-coded borders

## Future Enhancements

### WebSocket Streaming (Optional)

Instead of polling, stream entries via WebSocket:

1. Add new message type to `src/types/messages.ts`:
```typescript
export interface ReasoningEntryMessage extends BaseMessage {
  type: 'reasoning_entry';
  entry: ReasoningEntry;
}
```

2. Handle in SessionContext:
```typescript
// In handleMessage callback
if (message.type === 'reasoning_entry') {
  addReasoningEntry(message.entry);
}
```

3. Update ReasoningPanel to use context instead of polling

### Statistics Dashboard

Add a statistics view showing:
- Total entries by type
- Approval rates
- Filter effectiveness
- Topic distribution

### Export Functionality

Add button to export reasoning entries:
```typescript
const handleExport = () => {
  const dataStr = JSON.stringify(entries, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  // ... download logic
};
```

## Testing

### Manual Testing

1. Start backend: `python -m uvicorn main:app --reload`
2. Start frontend: `npm run dev`
3. Connect to a session
4. Speak or send messages
5. Watch the Reasoning Panel populate

### Expected Behavior

- Panel shows "Not connected" when disconnected
- Panel shows "No entries yet" when connected but no reasoning
- Entries appear within 5 seconds of being created
- Filters work correctly
- Confidence and timestamps display properly
- Concerns show severity badges

## Troubleshooting

### Panel shows "Not connected"

- Check if session is connected (Status Indicator should be green)
- Verify WebSocket connection is established

### No entries appearing

- Check browser console for API errors
- Verify backend is running and accessible
- Check that conversation_id and practice_id are correct
- Ensure backend reasoning feature is enabled

### API errors

- Check CORS settings on backend
- Verify API base URL in `src/config.ts`
- Check network tab in browser dev tools

### Styling issues

- Ensure Tailwind CSS is properly configured
- Check for conflicting CSS classes
- Verify all dependencies are installed

## Summary

The AI Reasoning Panel provides real-time visibility into the AI's thought process. It's fully integrated into the existing frontend with minimal changes to the core architecture. The component is self-contained and can be easily customized or extended.
