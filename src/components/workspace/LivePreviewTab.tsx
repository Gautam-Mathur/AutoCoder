'use client';

import React from 'react';
import { Eye, RefreshCw } from 'lucide-react';

interface LivePreviewTabProps {
  previewDoc: string;
  previewLoading: boolean;
  pipelineStatus: string;
  activeTitle?: string;
  onReload: () => void;
}

export function LivePreviewTab({
  previewDoc,
  previewLoading,
  pipelineStatus,
  activeTitle,
  onReload,
}: LivePreviewTabProps) {
  return (
    <div className="w-full h-full flex flex-col p-4">
      <div className="w-full h-full bg-slate-900 border border-slate-700 rounded-lg flex flex-col overflow-hidden shadow-2xl">
        <div className="bg-slate-950 border-b border-slate-800 p-2.5 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/80"></span>
            <span className="text-[10px] font-mono text-slate-400 ml-2">Live DOM Preview</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded px-4 py-0.5 text-[10px] w-72 truncate text-center font-mono text-slate-300 flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{(activeTitle || 'preview').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.local/index.html</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onReload}
              disabled={previewLoading}
              className="px-2.5 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-[10px] font-mono text-slate-200 transition-colors cursor-pointer flex items-center gap-1"
              title="Reload DOM Preview"
            >
              <RefreshCw className={`w-3 h-3 ${previewLoading ? 'animate-spin' : ''}`} />
              <span>Reload</span>
            </button>
            {pipelineStatus === 'Active' && (
              <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[9.5px] font-mono font-bold rounded flex items-center gap-1 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                LIVE COMPILING
              </span>
            )}
          </div>
        </div>
        {previewDoc ? (
          <div className="flex-1 bg-white flex flex-col relative overflow-hidden">
            <iframe
              srcDoc={previewDoc}
              className="w-full h-full border-0 bg-white"
              title="Live DOM Preview"
              sandbox="allow-scripts allow-modals allow-forms"
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-950">
            <Eye className="w-10 h-10 text-slate-700 animate-pulse mb-3" />
            <span className="text-xs font-mono text-slate-300 font-bold mb-1">Awaiting index.html generation</span>
            <span className="text-[11px] font-mono text-slate-500 max-w-sm">
              Coder is currently constructing project assets. The DOM preview will render immediately once index.html is available.
            </span>
            <button
              onClick={onReload}
              className="mt-4 px-3 py-1 bg-electric-indigo/20 border border-electric-indigo/50 hover:bg-electric-indigo/30 text-electric-indigo rounded text-[11px] font-mono cursor-pointer transition-colors"
            >
              Check for Generated Files
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
