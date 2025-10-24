import React, { useState, useEffect } from 'react';
import { useSession } from '../context/SessionContext';
import type { SessionConfig } from '../types/session';
import config from '../config';
import { validateSessionConfig, sanitizeInput } from '../utils/security';
import { handleError, logError } from '../utils/errorHandler';

/**
 * SessionController component manages session lifecycle
 * Provides form inputs for session configuration and start/stop controls
 */
export const SessionController: React.FC = () => {
  const { isConnected, connect, disconnect } = useSession();
  
  // Form state
  const [practiceId, setPracticeId] = useState<string>(
    config.session.defaultPracticeId?.toString() || ''
  );
  const [conversationId, setConversationId] = useState<string>('');
  const [patientId, setPatientId] = useState<string>('');
  const [timezone, setTimezone] = useState<string>(config.session.defaultTimezone);
  const [authToken, setAuthToken] = useState<string>(config.api.authToken || '');
  
  // Validation and error state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isStarting, setIsStarting] = useState<boolean>(false);
  
  // Session info
  const [sessionId, setSessionId] = useState<string>('');
  const [sessionCreatedAt, setSessionCreatedAt] = useState<string>('');
  
  /**
   * Validate form inputs using security utilities
   */
  const validateForm = (): boolean => {
    const validation = validateSessionConfig({
      practiceId,
      conversationId,
      patientId,
      timezone,
      authToken,
    });
    
    setErrors(validation.errors);
    return validation.isValid;
  };
  
  /**
   * Handle start session
   */
  const handleStart = async () => {
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setIsStarting(true);
    setErrors({});
    
    try {
      // Sanitize all inputs
      const sanitizedPracticeId = sanitizeInput(practiceId);
      const sanitizedConversationId = sanitizeInput(conversationId);
      const sanitizedPatientId = patientId ? sanitizeInput(patientId) : undefined;
      const sanitizedTimezone = sanitizeInput(timezone);
      const sanitizedAuthToken = authToken ? sanitizeInput(authToken) : undefined;
      
      // Build session config with sanitized inputs
      const sessionConfig: SessionConfig = {
        practiceId: parseInt(sanitizedPracticeId, 10),
        conversationId: sanitizedConversationId,
        patientId: sanitizedPatientId,
        timezone: sanitizedTimezone,
        authToken: sanitizedAuthToken,
      };
      
      // Generate session ID and timestamp
      const newSessionId = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      
      setSessionId(newSessionId);
      setSessionCreatedAt(createdAt);
      
      // Connect to session
      await connect(sessionConfig);
    } catch (error) {
      // Handle error with error handler
      const handledError = handleError(
        error instanceof Error ? error : new Error('Failed to start session'),
        { component: 'SessionController', action: 'start' }
      );
      
      // Log error for debugging
      logError(error instanceof Error ? error : new Error('Failed to start session'), {
        component: 'SessionController',
        action: 'start',
      });
      
      // Display user-friendly error message
      setErrors({ general: handledError.userMessage });
    } finally {
      setIsStarting(false);
    }
  };
  
  /**
   * Handle stop session
   */
  const handleStop = () => {
    disconnect();
    setSessionId('');
    setSessionCreatedAt('');
    setErrors({});
  };
  
  /**
   * Clear errors when inputs change
   */
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      setErrors({});
    }
  }, [practiceId, conversationId, patientId, timezone, authToken]);
  
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-slate-200">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Session Controller</h2>
      </div>
      
      {/* Session Info Display */}
      {isConnected && sessionId && (
        <div className="mb-6 p-5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-sm flex-1">
              <div className="font-bold text-green-900 mb-2">Active Session</div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-green-700 font-medium min-w-[80px]">Session ID:</span>
                  <span className="font-mono text-xs bg-white/60 px-2 py-1 rounded border border-green-200">{sessionId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-700 font-medium min-w-[80px]">Created:</span>
                  <span className="font-mono text-xs bg-white/60 px-2 py-1 rounded border border-green-200">{sessionCreatedAt}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* General Error Display */}
      {errors.general && (
        <div className="mb-6 p-5 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-sm text-red-800 flex-1">{errors.general}</div>
          </div>
        </div>
      )}
      
      {/* Form */}
      <div className="space-y-5">
        {/* Practice ID */}
        <div>
          <label htmlFor="practiceId" className="block text-sm font-semibold text-slate-700 mb-2">
            Practice ID <span className="text-red-500">*</span>
          </label>
          <input
            id="practiceId"
            type="text"
            value={practiceId}
            onChange={(e) => setPracticeId(e.target.value)}
            disabled={isConnected}
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
              isConnected ? 'bg-slate-100 cursor-not-allowed' : 'bg-white hover:border-blue-300'
            } ${errors.practiceId ? 'border-red-400 focus:ring-red-500' : 'border-slate-300'}`}
            placeholder="Enter practice ID"
          />
          {errors.practiceId && (
            <p className="mt-1 text-sm text-red-600">{errors.practiceId}</p>
          )}
        </div>
        
        {/* Conversation ID */}
        <div>
          <label htmlFor="conversationId" className="block text-sm font-semibold text-slate-700 mb-2">
            Conversation ID <span className="text-red-500">*</span>
          </label>
          <input
            id="conversationId"
            type="text"
            value={conversationId}
            onChange={(e) => setConversationId(e.target.value)}
            disabled={isConnected}
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
              isConnected ? 'bg-slate-100 cursor-not-allowed' : 'bg-white hover:border-blue-300'
            } ${errors.conversationId ? 'border-red-400 focus:ring-red-500' : 'border-slate-300'}`}
            placeholder="Enter conversation ID"
          />
          {errors.conversationId && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.conversationId}
            </p>
          )}
        </div>
        
        {/* Patient ID (Optional) */}
        <div>
          <label htmlFor="patientId" className="block text-sm font-semibold text-slate-700 mb-2">
            Patient ID <span className="text-slate-400 text-xs font-normal">(optional)</span>
          </label>
          <input
            id="patientId"
            type="text"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            disabled={isConnected}
            className={`w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
              isConnected ? 'bg-slate-100 cursor-not-allowed' : 'bg-white hover:border-blue-300'
            }`}
            placeholder="Enter patient ID"
          />
        </div>
        
        {/* Timezone */}
        <div>
          <label htmlFor="timezone" className="block text-sm font-semibold text-slate-700 mb-2">
            Timezone <span className="text-red-500">*</span>
          </label>
          <input
            id="timezone"
            type="text"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            disabled={isConnected}
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
              isConnected ? 'bg-slate-100 cursor-not-allowed' : 'bg-white hover:border-blue-300'
            } ${errors.timezone ? 'border-red-400 focus:ring-red-500' : 'border-slate-300'}`}
            placeholder="e.g., America/New_York, UTC"
          />
          {errors.timezone && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.timezone}
            </p>
          )}
        </div>
        
        {/* Authentication Token */}
        <div>
          <label htmlFor="authToken" className="block text-sm font-semibold text-slate-700 mb-2">
            Authentication Token <span className="text-slate-400 text-xs font-normal">(optional)</span>
          </label>
          <input
            id="authToken"
            type="password"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            disabled={isConnected}
            className={`w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
              isConnected ? 'bg-slate-100 cursor-not-allowed' : 'bg-white hover:border-blue-300'
            }`}
            placeholder="Enter authentication token"
          />
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          {!isConnected ? (
            <button
              onClick={handleStart}
              disabled={isStarting}
              className={`flex-1 px-6 py-3.5 rounded-xl font-semibold transition-all shadow-lg ${
                isStarting
                  ? 'bg-slate-400 cursor-not-allowed text-white'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white hover:shadow-xl hover:scale-[1.02]'
              }`}
            >
              {isStarting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Starting...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Start Session
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="flex-1 px-6 py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                Stop Session
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
