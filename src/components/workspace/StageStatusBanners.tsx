'use client';

import React from 'react';
import { CoderFileProgress, STAGE_OUTPUT_FILES } from './workspace-helpers';

interface StageStatusBannersProps {
  pipelineStatus: string;
  agentActivityState: 'idle' | 'reading_inflow' | 'synthesizing_outflow';
  currentStage: string;
  coderFileProgress: CoderFileProgress;
  activeStreamingFile: string | null;
  inflowDetail: string;
  streamingFileContent: string;
  streamProgress: any;
}

export function StageStatusBanners({
  pipelineStatus,
  agentActivityState,
  currentStage,
  coderFileProgress,
  activeStreamingFile,
  inflowDetail,
  streamingFileContent,
  streamProgress,
}: StageStatusBannersProps) {
  return (
    <>
      {pipelineStatus === 'Active' && agentActivityState === 'reading_inflow' && (
        <div className="bg-sky-950/70 border-b border-sky-800/80 px-3 py-2 flex flex-col gap-1 text-[10px] font-mono select-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sky-300">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              <span className="font-bold">
                📥 {currentStage} Reading Inflow
                {currentStage === 'Coder' && (coderFileProgress.currentFile || activeStreamingFile)
                  ? ` for "${coderFileProgress.currentFile || activeStreamingFile}"${coderFileProgress.fileIndex && coderFileProgress.totalFiles ? ` (${coderFileProgress.fileIndex} of ${coderFileProgress.totalFiles})` : ''}:`
                  : ':'}
              </span>
            </div>
            <span className="text-[9px] bg-sky-900/60 border border-sky-700/50 text-sky-200 px-1.5 py-0.5 rounded font-mono">
              {currentStage === 'Coder' && (coderFileProgress.currentFile || activeStreamingFile)
                ? `File: ${coderFileProgress.currentFile || activeStreamingFile}`
                : 'Context Ingestion'}
            </span>
          </div>
          <div className="text-slate-300 bg-slate-900/80 border border-sky-900/50 rounded p-1.5 text-[9.5px] leading-relaxed break-words font-mono">
            {inflowDetail || 'Ingesting upstream stage specification artifacts and user constraints'}
          </div>
        </div>
      )}

      {pipelineStatus === 'Active' && agentActivityState === 'synthesizing_outflow' && (
        <div className="bg-amber-950/70 border-b border-amber-800/80 px-3 py-2 flex flex-col gap-1 text-[10px] font-mono select-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="font-bold">📤 {currentStage} Synthesizing Outflow:</span>
            </div>
            <span className="text-[9px] bg-amber-900/60 border border-amber-700/50 text-amber-200 px-1.5 py-0.5 rounded font-mono">
              {currentStage === 'Coder' && (coderFileProgress.currentFile || activeStreamingFile)
                ? `File ${coderFileProgress.fileIndex || 1} of ${coderFileProgress.totalFiles || 1}: ${coderFileProgress.currentFile || activeStreamingFile}`
                : `Target: ${activeStreamingFile || (currentStage && STAGE_OUTPUT_FILES[currentStage]) || 'Outflow Artifact'}`}
            </span>
          </div>
          <div className="text-amber-200/90 bg-slate-900/80 border border-amber-900/50 rounded p-1.5 text-[9.5px] leading-relaxed break-words font-mono flex items-center justify-between">
            <span>
              {currentStage === 'Coder' ? '💻 Coder Building: ' : 'Streaming live tokens into '}
              <strong className="text-amber-400 font-bold">
                {activeStreamingFile || coderFileProgress.currentFile || (currentStage && STAGE_OUTPUT_FILES[currentStage])}
              </strong>
              {currentStage === 'Coder' && coderFileProgress.fileIndex && coderFileProgress.totalFiles && (
                <span className="text-amber-300 font-semibold ml-1.5">
                  ({coderFileProgress.fileIndex} of {coderFileProgress.totalFiles})
                </span>
              )}
            </span>
            {streamingFileContent && <span className="text-[9px] text-slate-400 font-normal">{streamingFileContent.length.toLocaleString()} bytes</span>}
          </div>
        </div>
      )}

      {streamProgress && (
        <div className="bg-slate-950 border-b border-slate-800 px-3 py-2 flex flex-col gap-1.5 select-none transition-all">
          <div className="flex justify-between items-center text-[9px] font-mono text-slate-400">
            <span className="text-electric-indigo font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-electric-indigo animate-ping" />
              🧠 {currentStage} Agent Thinking &amp; Generating...
            </span>
            <span className="bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-slate-300 font-mono font-bold">
              {streamProgress.tokenCount} / {streamProgress.maxTokens} tkn
            </span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-electric-indigo via-purple-500 to-emerald-400 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, (streamProgress.tokenCount / (streamProgress.maxTokens || 1)) * 100)}%` }}
            />
          </div>
          {streamProgress.latestText && (
            <div className="mt-1 bg-slate-900/90 border border-indigo-500/30 rounded p-2.5 text-[10px] font-mono text-slate-300 max-h-36 overflow-y-auto whitespace-pre-wrap scrollbar-thin shadow-inner">
              <div className="flex justify-between items-center text-[8px] uppercase tracking-wider mb-1.5 text-indigo-400 font-bold border-b border-slate-800 pb-1">
                <span>⚡ LIVE REASONING &amp; TOKEN FEED {streamProgress.targetFile ? `(Target: ${streamProgress.targetFile})` : `(${currentStage})`}</span>
                <span className="text-slate-500 font-normal">{(streamProgress.latestText || '').length} bytes</span>
              </div>
              <div className="text-slate-200 leading-relaxed font-mono">
                {streamProgress.latestText.slice(-800)}
                <span className="inline-block w-1.5 h-3 bg-electric-indigo ml-0.5 animate-pulse" />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
