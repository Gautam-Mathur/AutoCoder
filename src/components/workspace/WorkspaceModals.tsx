'use client';

import React from 'react';
import { AlertTriangle, ArrowRight, Gavel, HelpCircle, Play } from 'lucide-react';

interface WorkspaceModalsProps {
  needsClarification: boolean;
  clarificationQuestions: string[];
  clarificationAnswers: string[];
  setClarificationAnswers: (answers: string[]) => void;
  onClarificationSubmit: () => void;
  needsConflictResolution: boolean;
  conflictData: any;
  selectedConflictOption: string;
  setSelectedConflictOption: (opt: string) => void;
  onConflictSubmit: () => void;
  pipelineStatus: string;
  currentStage: string;
  isRetrying: boolean;
  onApproveGate: () => void;
  onRetryFailedPipeline: () => void;
  onExitHome: () => void;
}

export function WorkspaceModals({
  needsClarification,
  clarificationQuestions,
  clarificationAnswers,
  setClarificationAnswers,
  onClarificationSubmit,
  needsConflictResolution,
  conflictData,
  selectedConflictOption,
  setSelectedConflictOption,
  onConflictSubmit,
  pipelineStatus,
  currentStage,
  isRetrying,
  onApproveGate,
  onRetryFailedPipeline,
  onExitHome,
}: WorkspaceModalsProps) {
  return (
    <>
      {needsClarification && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-warning/50 rounded-lg p-6 max-w-md w-full flex flex-col gap-4 shadow-[0_0_30px_rgba(245,158,11,0.2)] animate-slide-up">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <HelpCircle className="w-5 h-5 text-amber-500" />
              <h4 className="font-bold text-md text-on-surface">Queen Orchestrator Clarification</h4>
            </div>
            <p className="text-xs text-slate-300">
              To construct a stable implementation plan, please resolve the following architectural queries:
            </p>

            <div className="flex flex-col gap-3">
              {clarificationQuestions.map((q, idx) => (
                <div key={idx} className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-400">{q}</label>
                  <input
                    type="text"
                    value={clarificationAnswers[idx]}
                    onChange={(e) => {
                      const next = [...clarificationAnswers];
                      next[idx] = e.target.value;
                      setClarificationAnswers(next);
                    }}
                    className="bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-on-surface focus:border-amber-500 outline-none"
                    placeholder="Your response..."
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={onClarificationSubmit}
                className="bg-amber-warning text-slate-950 px-4 py-2 rounded text-xs font-bold hover:bg-amber-400 transition-colors flex items-center gap-1 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
              >
                Submit Answers <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {needsConflictResolution && conflictData && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/50 rounded-lg p-6 max-w-lg w-full flex flex-col gap-4 shadow-[0_0_30px_rgba(239,68,68,0.2)] animate-slide-up">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
              <h4 className="font-bold text-md text-on-surface text-red-400">Context Conflict Detected</h4>
            </div>
            <p className="text-xs text-slate-300">The context resolver identified a misalignment in requirements/architectures:</p>
            <div className="p-3 bg-red-950/20 border border-red-900/40 rounded text-xs text-red-300/90 leading-relaxed font-mono">
              {conflictData.description}
            </div>

            <div className="flex flex-col gap-2.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Select Alignment Strategy:</label>
              {conflictData.options.map((opt: string, idx: number) => {
                const isRecommended = opt === conflictData.recommendedOption;
                const isSelected = selectedConflictOption === opt;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedConflictOption(opt)}
                    className={`w-full p-3 rounded text-left text-xs transition-all border flex flex-col gap-1 ${
                      isSelected
                        ? 'bg-electric-indigo/20 border-electric-indigo text-on-surface shadow-[0_0_12px_rgba(99,102,241,0.2)]'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold">{opt}</span>
                      {isRecommended && (
                        <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[8px] font-bold uppercase tracking-wider">
                          Recommended
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={onConflictSubmit}
                disabled={!selectedConflictOption}
                className={`px-4 py-2 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedConflictOption
                    ? 'bg-red-500 text-slate-950 hover:bg-red-400 cursor-pointer shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                Resolve &amp; Resume <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {pipelineStatus === 'Paused' && currentStage === 'Architect' && (
        <div className="absolute inset-x-0 bottom-36 z-50 flex justify-center px-4 pointer-events-none">
          <div className="glass-panel w-full max-w-lg p-4 rounded-xl shadow-[0_0_30px_rgba(99,102,241,0.2)] flex flex-col gap-3 pointer-events-auto animate-slide-up">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Gavel className="w-5 h-5 text-electric-indigo animate-bounce" />
                <h4 className="font-bold text-on-surface text-sm">Architect Review Complete</h4>
              </div>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 rounded text-[9px] font-bold font-mono uppercase">Ready</span>
            </div>
            <p className="text-xs text-slate-300">
              The architecture plan has been compiled into the SML. Review the structural flowchart tab above. Do you approve proceeding to database design and source code generation?
            </p>
            <div className="flex justify-end gap-2 mt-1">
              <button
                onClick={onExitHome}
                className="px-3 py-1.5 border border-slate-600 rounded text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Reject &amp; Edit
              </button>
              <button
                onClick={onApproveGate}
                className="px-3 py-1.5 bg-electric-indigo text-white rounded text-xs font-bold shadow-[0_0_12px_rgba(99,102,241,0.4)] hover:bg-indigo-400 transition-colors flex items-center gap-1.5"
              >
                Approve &amp; Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {(pipelineStatus === 'Failed' || (pipelineStatus === 'Paused' && currentStage !== 'Architect')) && (
        <div className="absolute inset-x-0 bottom-36 z-50 flex justify-center px-4 pointer-events-none">
          <div className="glass-panel w-full max-w-lg p-5 rounded-xl border border-red-500/40 bg-slate-950/90 shadow-[0_0_30px_rgba(239,68,68,0.25)] flex flex-col gap-3 pointer-events-auto animate-slide-up">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <h4 className="font-bold text-on-surface text-sm">Pipeline Execution Interrupted</h4>
                  <p className="text-[11px] text-slate-400">
                    Current stage: <span className="font-mono text-electric-indigo font-bold">{currentStage}</span>
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[9px] font-bold font-mono uppercase">Interrupted</span>
            </div>
            <p className="text-xs text-slate-300">
              All previously verified stage specifications and workspace artifacts are safely preserved in the VFS. You can resume pipeline compilation directly from where it stopped.
            </p>
            <div className="flex justify-end gap-2 mt-1">
              <button
                onClick={onExitHome}
                className="px-3 py-1.5 border border-slate-700 rounded text-xs font-bold text-slate-400 hover:bg-slate-800 transition-colors"
              >
                Exit to Home
              </button>
              <button
                onClick={onRetryFailedPipeline}
                disabled={isRetrying}
                className="px-4 py-1.5 bg-electric-indigo text-white rounded text-xs font-bold shadow-[0_0_12px_rgba(99,102,241,0.4)] hover:bg-indigo-400 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isRetrying ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-white" />
                )}
                Resume Pipeline
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
