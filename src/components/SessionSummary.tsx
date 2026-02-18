import React from 'react';
import { useSession } from '../context/SessionContext';

export const SessionSummary: React.FC = () => {
    const { sessionSummary, clearSessionSummary } = useSession();

    if (!sessionSummary) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shrink-0">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold">Session Summary</h2>
                        <button
                            onClick={clearSessionSummary}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <p className="opacity-90 mt-1">Consultation analysis and next steps</p>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-8">

                    {/* Executive Summary */}
                    <section>
                        <div className="flex items-center gap-2 mb-3 text-blue-800">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h3 className="font-semibold uppercase tracking-wide text-sm">Executive Summary</h3>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-slate-700 leading-relaxed">
                            {sessionSummary.summary}
                        </div>
                    </section>

                    {/* Clinical Observations */}
                    <section>
                        <div className="flex items-center gap-2 mb-3 text-indigo-800">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                            <h3 className="font-semibold uppercase tracking-wide text-sm">Clinical Observations</h3>
                        </div>
                        <ul className="space-y-2">
                            {sessionSummary.observations.map((obs, index) => (
                                <li key={index} className="flex gap-3 text-slate-700">
                                    <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2.5"></span>
                                    <span>{obs}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* Provider Next Steps */}
                    <section>
                        <div className="flex items-center gap-2 mb-3 text-emerald-800">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <h3 className="font-semibold uppercase tracking-wide text-sm">Recommended Next Steps</h3>
                        </div>
                        <div className="border rounded-xl overflow-hidden border-slate-200">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-medium">
                                    <tr>
                                        <th className="px-4 py-3">Action Item</th>
                                        <th className="px-4 py-3 w-24">Priority</th>
                                        <th className="px-4 py-3">Reasoning</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {sessionSummary.next_steps.map((step, index) => (
                                        <tr key={index} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 font-medium text-slate-800">{step.task}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border
                          ${step.priority === 'high' ? 'bg-red-50 text-red-700 border-red-200' :
                                                        step.priority === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                            'bg-green-50 text-green-700 border-green-200'}`}>
                                                    {step.priority}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">{step.reason}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 border-t shrink-0 flex justify-end">
                    <button
                        onClick={clearSessionSummary}
                        className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
                    >
                        Close Summary
                    </button>
                </div>

            </div>
        </div>
    );
};
