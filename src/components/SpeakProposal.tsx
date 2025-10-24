import React from 'react';

/**
 * SpeakProposal component displays agent's request to speak
 * during listening mode and allows doctor to approve/deny
 */
export interface SpeakProposalProps {
  proposalId: string;
  summary: string;
  onApprove: (proposalId: string) => void;
  onDeny: (proposalId: string) => void;
}

export const SpeakProposal: React.FC<SpeakProposalProps> = ({
  proposalId,
  summary,
  onApprove,
  onDeny,
}) => {
  return (
    <div className="fixed bottom-8 right-8 max-w-md bg-white rounded-2xl shadow-2xl border-2 border-blue-500 p-6 animate-slide-up z-50">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        
        {/* Content */}
        <div className="flex-1">
          <div className="font-bold text-slate-900 mb-2">Agent wants to speak</div>
          <p className="text-sm text-slate-700 mb-4">{summary}</p>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => onApprove(proposalId)}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Approve
              </span>
            </button>
            
            <button
              onClick={() => onDeny(proposalId)}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Deny
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
