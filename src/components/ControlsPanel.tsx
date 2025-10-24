import React, { useState } from 'react';
import { useSession } from '../context/SessionContext';
import { sanitizeJsonInput } from '../utils/security';
import { handleError, logError } from '../utils/errorHandler';

/**
 * ControlsPanel component provides interactive testing controls
 * Allows sending custom messages, reconnecting, and clearing console
 */
export const ControlsPanel: React.FC = () => {
  const { isConnected, sendMessage, reconnect, clearMessages } = useSession();
  
  // Custom message state
  const [customMessage, setCustomMessage] = useState<string>('');
  const [messageError, setMessageError] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  
  // Client metadata state
  const [metadata, setMetadata] = useState<string>('{}');
  const [metadataError, setMetadataError] = useState<string>('');
  
  /**
   * Handle sending custom JSON message with sanitization
   */
  const handleSendMessage = async () => {
    // Validate JSON
    if (!customMessage.trim()) {
      setMessageError('Message cannot be empty');
      return;
    }
    
    try {
      // Sanitize and validate JSON input
      const sanitizedJson = sanitizeJsonInput(customMessage);
      const parsedMessage = JSON.parse(sanitizedJson);
      
      setMessageError('');
      setIsSending(true);
      
      await sendMessage(parsedMessage);
      
      // Clear message after successful send
      setCustomMessage('');
    } catch (error) {
      // Handle error with error handler
      const handledError = handleError(
        error instanceof Error ? error : new Error('Failed to send message'),
        { component: 'ControlsPanel', action: 'sendMessage' }
      );
      
      logError(error instanceof Error ? error : new Error('Failed to send message'), {
        component: 'ControlsPanel',
        action: 'sendMessage',
      });
      
      if (error instanceof SyntaxError) {
        setMessageError('Invalid JSON format');
      } else {
        setMessageError(handledError.userMessage);
      }
    } finally {
      setIsSending(false);
    }
  };
  
  /**
   * Handle force reconnection
   */
  const handleReconnect = () => {
    try {
      reconnect();
    } catch (error) {
      // Error will be handled by the session context
      console.error('Reconnection failed:', error);
    }
  };
  
  /**
   * Handle clear console
   */
  const handleClearConsole = () => {
    clearMessages();
  };
  
  /**
   * Handle metadata modification with sanitization
   */
  const handleUpdateMetadata = async () => {
    // Validate and sanitize JSON
    try {
      const sanitizedJson = sanitizeJsonInput(metadata);
      const parsedMetadata = JSON.parse(sanitizedJson);
      setMetadataError('');
      
      // Send metadata update message
      await sendMessage({
        type: 'client_metadata_update',
        metadata: parsedMetadata,
      });
    } catch (error) {
      // Handle error with error handler
      const handledError = handleError(
        error instanceof Error ? error : new Error('Failed to update metadata'),
        { component: 'ControlsPanel', action: 'updateMetadata' }
      );
      
      logError(error instanceof Error ? error : new Error('Failed to update metadata'), {
        component: 'ControlsPanel',
        action: 'updateMetadata',
      });
      
      if (error instanceof SyntaxError) {
        setMetadataError('Invalid JSON format');
      } else {
        setMetadataError(handledError.userMessage);
      }
    }
  };
  
  /**
   * Handle cancel response
   */
  const handleCancelResponse = async () => {
    try {
      await sendMessage({
        type: 'response.cancel',
      });
    } catch (error) {
      console.error('Failed to cancel response:', error);
    }
  };
  
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-slate-200">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Controls Panel</h2>
      </div>
      
      <div className="space-y-6">
        {/* Custom Message Section */}
        <div>
          <label htmlFor="customMessage" className="block text-sm font-medium text-gray-700 mb-2">
            Send Custom JSON Message
          </label>
          <textarea
            id="customMessage"
            value={customMessage}
            onChange={(e) => {
              setCustomMessage(e.target.value);
              if (messageError) setMessageError('');
            }}
            disabled={!isConnected}
            className={`w-full px-3 py-2 border rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              !isConnected ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
            } ${messageError ? 'border-red-500' : 'border-gray-300'}`}
            placeholder='{"type": "test", "data": "example"}'
            rows={4}
          />
          {messageError && (
            <p className="mt-1 text-sm text-red-600">{messageError}</p>
          )}
          <button
            onClick={handleSendMessage}
            disabled={!isConnected || isSending}
            className={`mt-3 px-5 py-2.5 rounded-xl font-semibold transition-all shadow-md ${
              !isConnected || isSending
                ? 'bg-slate-400 cursor-not-allowed text-white'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white hover:shadow-lg hover:scale-[1.02]'
            }`}
          >
            {isSending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send Message
              </span>
            )}
          </button>
        </div>
        
        {/* Client Metadata Section */}
        <div>
          <label htmlFor="metadata" className="block text-sm font-medium text-gray-700 mb-2">
            Client Metadata
          </label>
          <textarea
            id="metadata"
            value={metadata}
            onChange={(e) => {
              setMetadata(e.target.value);
              if (metadataError) setMetadataError('');
            }}
            disabled={!isConnected}
            className={`w-full px-3 py-2 border rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              !isConnected ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
            } ${metadataError ? 'border-red-500' : 'border-gray-300'}`}
            placeholder='{"key": "value"}'
            rows={3}
          />
          {metadataError && (
            <p className="mt-1 text-sm text-red-600">{metadataError}</p>
          )}
          <button
            onClick={handleUpdateMetadata}
            disabled={!isConnected}
            className={`mt-3 px-5 py-2.5 rounded-xl font-semibold transition-all shadow-md ${
              !isConnected
                ? 'bg-slate-400 cursor-not-allowed text-white'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white hover:shadow-lg hover:scale-[1.02]'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Update Metadata
            </span>
          </button>
        </div>
        
        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <button
            onClick={handleReconnect}
            disabled={!isConnected}
            className={`px-5 py-3 rounded-xl font-semibold transition-all shadow-md ${
              !isConnected
                ? 'bg-slate-400 cursor-not-allowed text-white'
                : 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white hover:shadow-lg hover:scale-[1.02]'
            }`}
            title="Force reconnection (Ctrl/Cmd+R)"
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reconnect
            </span>
          </button>
          
          <button
            onClick={handleCancelResponse}
            disabled={!isConnected}
            className={`px-5 py-3 rounded-xl font-semibold transition-all shadow-md ${
              !isConnected
                ? 'bg-slate-400 cursor-not-allowed text-white'
                : 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white hover:shadow-lg hover:scale-[1.02]'
            }`}
            title="Cancel ongoing response (Escape)"
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </span>
          </button>
          
          <button
            onClick={handleClearConsole}
            disabled={false}
            className="px-5 py-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg hover:scale-[1.02]"
            title="Clear console (Ctrl/Cmd+K)"
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
