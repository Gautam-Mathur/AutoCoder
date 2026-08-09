'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Activity,
  Bell,
  User,
  Power,
  Play,
  CheckCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TopAppBar() {
  const router = useRouter();
  const { activeId, ollamaConnected, ollamaModels, activeModel, setActiveModel, addLog, currentStage, pipelineStatus } = useApp();
  const [resuming, setResuming] = useState(false);

  const handleApprove = async () => {
    if (!activeId) return;
    setResuming(true);
    addLog({
      type: 'GATE_CLICK',
      message: 'User approved architecture. Resuming pipeline...',
    });

    try {
      const res = await fetch('/api/pipeline/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: activeId }),
      });

      if (res.ok) {
        addLog({
          type: 'GATE_RESUME',
          message: 'Pipeline resumed successfully! Transitioning to System stage.',
        });
        window.dispatchEvent(new CustomEvent('pipeline-resumed', { detail: { id: activeId } }));
      } else {
        const data = await res.json();
        addLog({
          type: 'GATE_ERROR',
          message: `Failed to resume pipeline: ${data.error}`,
        });
      }
    } catch (e: any) {
      addLog({
        type: 'GATE_ERROR',
        message: `Failed to resume pipeline: ${e.message}`,
      });
    } finally {
      setResuming(false);
    }
  };

  return (
    <header className="bg-slate-950 border-b border-slate-700 flex justify-between items-center w-full px-6 h-14 z-50 flex-shrink-0">
      <div className="flex items-center gap-6">
        <span
          onClick={() => router.push('/')}
          className="text-lg font-bold text-on-surface cursor-pointer tracking-wider flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <Activity className="w-5 h-5 text-electric-indigo" />
          Autocoder AI
        </span>
        <nav className="hidden md:flex items-center gap-4 text-xs font-semibold text-slate-400">
          <span className="hover:text-electric-indigo hover:bg-slate-900 transition-colors px-2 py-1 rounded cursor-pointer">
            RuFlo Pipeline
          </span>
          <span>/</span>
          <span className="text-electric-indigo border-b border-electric-indigo pb-0.5">
            v2.0-stable
          </span>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {/* Scanned Ollama model selector */}
        {ollamaConnected && ollamaModels.length > 0 && (
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-750 px-2.5 py-1 rounded text-xs font-mono text-slate-300">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Model:</span>
            <select
              value={activeModel}
              onChange={(e) => setActiveModel(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-on-surface focus:outline-none cursor-pointer"
            >
              {ollamaModels.map((m) => (
                <option key={m} value={m} className="bg-slate-900 text-slate-300">
                  {m}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Connection indicators */}
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/health')}
            className="text-slate-400 hover:text-electric-indigo hover:bg-slate-900 p-2 rounded-full transition-colors relative"
            title="System Health"
          >
            <Activity className="w-4 h-4" />
            <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${ollamaConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
          </button>
          <button className="text-slate-400 hover:text-electric-indigo hover:bg-slate-900 p-2 rounded-full transition-colors relative" title="Notifications">
            <Bell className="w-4 h-4" />
          </button>
          <button className="text-slate-400 hover:text-electric-indigo hover:bg-slate-900 p-2 rounded-full transition-colors" title="User Account">
            <User className="w-4 h-4" />
          </button>
        </div>

        {/* Global actions */}
        {activeId && pipelineStatus === 'Paused' && currentStage === 'Architect' && (
          <div className="flex gap-2 border-l border-slate-700 pl-4">
            <button className="border border-slate-700 text-on-surface px-4 py-1.5 rounded text-xs font-bold hover:bg-slate-900 transition-colors flex items-center gap-1">
              <Power className="w-3.5 h-3.5 text-red-500" /> Halt Pipeline
            </button>
            <button
              onClick={handleApprove}
              disabled={resuming}
              className="bg-emerald-ship text-white px-4 py-1.5 rounded text-xs font-bold shadow-[0_0_8px_rgba(16,185,129,0.3)] hover:bg-emerald-500/90 transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              {resuming ? (
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-white" />
              )}
              Approve &amp; Generate
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
