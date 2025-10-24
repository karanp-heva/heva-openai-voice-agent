# Security and Error Handling Implementation

This document describes the security measures and error handling implemented in the Realtime Frontend application.

## Security Features

### 1. Input Sanitization

All user inputs are sanitized before being sent to the backend:

- **Null byte removal**: Prevents null byte injection attacks
- **Whitespace trimming**: Removes leading/trailing whitespace
- **JSON validation**: Ensures only valid JSON is sent to the server
- **Length validation**: Enforces maximum lengths for input fields

**Implementation**: `src/utils/security.ts` - `sanitizeInput()`, `sanitizeJsonInput()`

**Usage**:
- SessionController: All form inputs are sanitized before creating session config
- ControlsPanel: Custom messages and metadata are sanitized before sending
- SessionContext: Messages are sanitized in the `sendMessage()` function

### 2. XSS Prevention

HTML special characters are escaped to prevent Cross-Site Scripting (XSS) attacks:

- Escapes: `<`, `>`, `&`, `"`, `'`, `/`
- Applied to all message content displayed in the console
- Applied to JSON syntax highlighting tokens

**Implementation**: `src/utils/security.ts` - `escapeHtml()`

**Usage**:
- RealtimeConsole: All message content and timestamps are escaped before display
- Prevents malicious scripts from being executed in the browser

### 3. Authentication Error Handling

Authentication errors are detected and handled specially:

- Prevents automatic reconnection on auth failures
- Displays user-friendly error messages
- Stops reconnection attempts until credentials are updated

**Implementation**: `src/utils/security.ts` - `isAuthenticationError()`

**Detection patterns**:
- `/auth/i`, `/unauthorized/i`, `/forbidden/i`
- HTTP status codes: 401, 403
- Token-related errors: "invalid token", "expired token"

### 4. No Hardcoded Secrets

- All sensitive configuration comes from environment variables
- `.env.example` has empty values for tokens
- `config.ts` includes security warning comment
- No authentication tokens or API keys in source code

## Error Handling Features

### 1. Centralized Error Handling

All errors are processed through a centralized error handler:

**Implementation**: `src/utils/errorHandler.ts` - `handleError()`

**Features**:
- Categorizes errors (auth, network, generic)
- Provides user-friendly error messages
- Determines retry behavior
- Logs errors in development mode only

### 2. Malformed JSON Handling

Gracefully handles malformed JSON messages:

- Displays raw message content
- Shows parse error message
- Highlights malformed JSON with warning indicator
- Does not crash the application

**Implementation**: 
- `src/utils/errorHandler.ts` - `handleMalformedJson()`
- `src/utils/messageFormatter.ts` - `formatJSON()`
- `src/components/RealtimeConsole.tsx` - Malformed JSON display

### 3. Network Error Handling

Network errors are detected and handled with user-friendly messages:

**Detection patterns**:
- `/network/i`, `/connection/i`, `/timeout/i`
- `/offline/i`, `/unreachable/i`
- Error codes: ECONNREFUSED, ETIMEDOUT

**Behavior**:
- Displays user-friendly message: "Network connection failed. Please check your internet connection and try again."
- Allows automatic reconnection
- Implements exponential backoff

### 4. Transport Error Handling

WebSocket and transport errors are handled gracefully:

- Connection timeout detection (10 seconds)
- Abnormal closure detection
- Authentication failure detection (close codes 1008, 4001, 4003)
- Automatic transport fallback (WebSocket → SSE → Polling)

**Implementation**: 
- `src/adapters/WebSocketTransport.ts` - Enhanced error handling
- `src/context/SessionContext.tsx` - Error processing and reconnection logic

### 5. Error Logging

Errors are logged for debugging purposes:

- Only logs in development mode (`import.meta.env.DEV`)
- Sanitizes sensitive data (tokens, passwords) before logging
- Includes context information (component, action)
- Limits stack trace depth

**Implementation**: `src/utils/errorHandler.ts` - `logError()`

## User-Friendly Error Messages

The application provides clear, actionable error messages to users:

| Error Type | User Message |
|------------|--------------|
| Authentication | "Authentication failed. Please check your credentials and try again." |
| Network | "Network connection failed. Please check your internet connection and try again." |
| Timeout | "Connection timed out. The server may be unavailable." |
| WebSocket | "WebSocket connection failed. Trying alternative connection method..." |
| Generic | Original error message or "An unexpected error occurred. Please try again." |

## Validation

### Session Configuration Validation

All session configuration inputs are validated:

- **Practice ID**: Required, must be a positive integer, max length check
- **Conversation ID**: Required, max 255 characters
- **Patient ID**: Optional, max 255 characters
- **Timezone**: Required, max 100 characters
- **Auth Token**: Optional, max 1000 characters

**Implementation**: `src/utils/security.ts` - `validateSessionConfig()`

## Testing

Comprehensive tests ensure security and error handling work correctly:

- **Security utilities**: 23 tests covering sanitization, escaping, validation
- **Error handler**: 10 tests covering error categorization and handling
- **Component integration**: Tests verify error messages are displayed correctly

**Test files**:
- `src/utils/__tests__/security.test.ts`
- `src/utils/__tests__/errorHandler.test.ts`

## Best Practices

1. **Always sanitize user input** before sending to backend
2. **Always escape HTML** before displaying user-generated content
3. **Never hardcode secrets** - use environment variables
4. **Provide user-friendly error messages** - don't expose technical details
5. **Log errors in development only** - avoid exposing sensitive data in production
6. **Validate all inputs** - check types, lengths, and formats
7. **Handle authentication errors specially** - prevent reconnection loops
8. **Implement graceful degradation** - fallback to alternative transports

## Security Checklist

- [x] Input sanitization for all user inputs
- [x] XSS prevention in message display
- [x] Malformed JSON handling
- [x] Network error handling with user-friendly messages
- [x] Authentication error handling (prevent reconnection)
- [x] No hardcoded tokens or sensitive data
- [x] Comprehensive validation
- [x] Error logging (development only)
- [x] Secure configuration management
- [x] Transport error handling

## Future Enhancements

Consider implementing these additional security measures:

1. **Content Security Policy (CSP)**: Add CSP headers to prevent XSS
2. **Rate Limiting**: Implement client-side rate limiting for API calls
3. **Input Length Limits**: Enforce stricter limits on input field lengths
4. **HTTPS Enforcement**: Ensure all connections use HTTPS in production
5. **Token Refresh**: Implement automatic token refresh mechanism
6. **Audit Logging**: Log security-relevant events for audit purposes
