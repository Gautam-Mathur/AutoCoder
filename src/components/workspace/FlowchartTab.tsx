'use client';

import React from 'react';
import { Compass, Cpu, Database, FileCode, Terminal as TerminalIcon } from 'lucide-react';
import type { LogMessage } from '@/context/AppContext';
import { extractStageMetrics, getFileBasename } from './workspace-helpers';

interface FlowchartTabProps {
  agentOutputs: Record<string, any>;
  logs: LogMessage[];
  currentStage: string;
  pipelineStatus: string;
  promptText: string;
  files: string[];
  modules: any[];
  entities: any[];
  streamProgress: any;
}

const STAGE_ORDER = ['Queen', 'Planner', 'Architect', 'System', 'Designer', 'Blueprinter', 'Coder', 'Tester', 'Debugger', 'Security', 'Reviewer'];
const DYNAMIC_STAGES = new Set(['Coder', 'Tester', 'Debugger']);
const STAGE_ICONS: Record<string, string> = {
  Queen: '👑',
  Planner: '📋',
  Architect: '📐',
  System: '⚙️',
  Designer: '🎨',
  Blueprinter: '🗺️',
  Coder: '💻',
  Tester: '🧪',
  Debugger: '🛠️',
  Security: '🛡️',
  Reviewer: '🔍',
};

export function FlowchartTab({
  agentOutputs,
  logs,
  currentStage,
  pipelineStatus,
  promptText,
  files,
  modules,
  entities,
  streamProgress,
}: FlowchartTabProps) {
  const specStagesOnly = STAGE_ORDER.filter((s) => !DYNAMIC_STAGES.has(s));
  const highestCompletedSpecIndex = Math.max(
    -1,
    ...specStagesOnly.map((s) =>
      agentOutputs[s] || logs.some((l) => l.agent === s && l.type === 'AGENT_COMPLETE') ? STAGE_ORDER.indexOf(s) : -1
    )
  );

  const renderLiveHudOrEmpty = () => {
    const speculativeApis =
      streamProgress?.apis && streamProgress.apis.length > 0
        ? streamProgress.apis
        : Array.from((streamProgress?.latestText || '').matchAll(/(GET|POST|PUT|DELETE|PATCH)\s+(\/[a-zA-Z0-9_\-\/]+)/gi)).map(
            (m: any) => ({ method: (m[1] as string).toUpperCase(), route: m[2] as string })
          );

    const speculativeEntities =
      streamProgress?.entities && streamProgress.entities.length > 0
        ? streamProgress.entities
        : Array.from(
            new Set(
              Array.from((streamProgress?.latestText || '').matchAll(/(?:model|entity|table|struct)\s+([A-Z][a-zA-Z0-9]+)/gi)).map(
                (m: any) => m[1] as string
              )
            )
          );

    const speculativeFiles =
      streamProgress?.files && streamProgress.files.length > 0
        ? streamProgress.files
        : Array.from(
            new Set(
              Array.from(
                (streamProgress?.latestText || '').matchAll(/(?:File:|Path:|`)([a-zA-Z0-9_\-\/]+\.(?:html|css|js|ts|jsx|tsx|json|md))/gi)
              ).map((m: any) => m[1] as string)
            )
          );

    if (streamProgress) {
      return (
        <div className="w-full max-w-4xl bg-slate-900/60 border border-slate-700/80 rounded-xl p-6 flex flex-col gap-6 shadow-[0_4px_30px_rgba(0,0,0,0.3)] backdrop-blur-md relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-electric-indigo/5 to-purple-500/5 pointer-events-none" />

          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-electric-indigo animate-ping" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Live Spec Compiler HUD ({currentStage})</span>
            </div>
            <div className="text-[10px] text-indigo-400 font-mono">
              {streamProgress.tokenCount} / {streamProgress.maxTokens} tokens
            </div>
          </div>

          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-electric-indigo to-purple-500 h-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, (streamProgress.tokenCount / streamProgress.maxTokens) * 100)}%` }}
            />
          </div>

          <div className="flex flex-col gap-4">
            {speculativeApis.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <TerminalIcon className="w-3.5 h-3.5 text-electric-indigo" /> Speculatively Mapped API Routes
                </div>
                <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                  {speculativeApis.map((api: any, idx: number) => (
                    <div key={idx} className="flex gap-2 items-center bg-slate-950/80 border border-slate-850 p-2 rounded-lg font-mono text-[10px] animate-pulse">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                          api.method === 'GET' ? 'bg-blue-955 text-blue-300 border border-blue-800' : 'bg-green-955 text-green-300 border border-green-800'
                        }`}
                      >
                        {api.method}
                      </span>
                      <span className="text-slate-300">{api.route}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {speculativeEntities.length > 0 && (
              <div className="flex flex-col gap-2 mt-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-cyan-400" /> Speculatively Designed DB Entities
                </div>
                <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                  {speculativeEntities.map((name: string, idx: number) => (
                    <div key={idx} className="bg-slate-950 border border-slate-850 p-2 rounded-lg text-[10px] text-center font-bold text-cyan-300 animate-pulse">
                      {name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {speculativeFiles.length > 0 && (
              <div className="flex flex-col gap-2 mt-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-emerald-400" /> Speculatively Planned Files
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {speculativeFiles.map((file: string, idx: number) => (
                    <code key={idx} className="px-1.5 py-0.5 bg-slate-950 border border-slate-855 rounded text-[9px] text-emerald-300 font-mono animate-pulse">
                      {getFileBasename(file)}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </div>

          {streamProgress.latestText && (
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <FileCode className="w-3.5 h-3.5 text-electric-indigo" />
                  Compiling Live Code {streamProgress.targetFile ? `➔ ${streamProgress.targetFile}` : `(${currentStage})`}
                </span>
                <span className="text-[9px] text-indigo-400 font-mono font-bold">
                  {(streamProgress.latestText || '').length} bytes compiled live
                </span>
              </div>

              <div className="bg-slate-955 border border-slate-800 rounded-lg p-3.5 font-mono text-[11px] text-slate-200 overflow-y-auto max-h-80 select-text relative shadow-inner leading-relaxed">
                <div className="whitespace-pre-wrap">
                  {streamProgress.latestText}
                  <span className="inline-block w-2 h-3.5 bg-electric-indigo animate-pulse ml-0.5 align-middle" />
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (pipelineStatus === 'Active') {
      return (
        <div className="w-full max-w-4xl bg-slate-900/60 border border-slate-700/80 rounded-xl p-6 flex flex-col gap-4 shadow-[0_4px_30px_rgba(0,0,0,0.3)] backdrop-blur-md relative overflow-hidden text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-electric-indigo animate-ping" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Live Spec Compiler Active</span>
          </div>
          <div className="text-sm font-semibold text-indigo-300">
            Executing Stage: <span className="font-mono text-purple-400">{currentStage || 'Initializing...'}</span>
          </div>
          <div className="text-xs text-slate-400">Synthesizing application specifications and mapping system flowchart...</div>
        </div>
      );
    }

    if (modules.length === 0 && files.length === 0) {
      return (
        <div className="text-xs text-slate-500 py-12 flex flex-col items-center gap-2 justify-center h-full">
          <Database className="w-12 h-12 text-slate-800" />
          <span>Architecture flowchart will load here after the Architect stage compiles.</span>
        </div>
      );
    }

    return null;
  };

  const liveOrEmpty = renderLiveHudOrEmpty();

  return (
    <div className="w-full h-full overflow-y-auto p-6 flex flex-col gap-6 items-center justify-start">
      <div className="w-full max-w-4xl bg-slate-900/80 border border-electric-indigo/40 rounded-xl p-5 shadow-[0_0_30px_rgba(99,102,241,0.15)] flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-electric-indigo" />
            <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">RuFlo Multi-Agent Live Data Flow (Inflow ➔ Outflow Map)</h4>
          </div>
          <span className="bg-electric-indigo/10 border border-electric-indigo/30 text-electric-indigo text-[10px] px-2.5 py-0.5 rounded font-mono font-bold">
            11-Stage Pipeline
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Live data flow tracking showing what context enters each agent (<strong>Inflow</strong>) and what structured specification or code output is synthesized (<strong>Outflow</strong>).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {STAGE_ORDER.map((stage, stageIdx) => {
            const outputData = agentOutputs[stage];
            const isDynamic = DYNAMIC_STAGES.has(stage);
            const isCompleted =
              !!outputData ||
              logs.some((l) => l.agent === stage && l.type === 'AGENT_COMPLETE') ||
              (!isDynamic && highestCompletedSpecIndex >= stageIdx && highestCompletedSpecIndex !== -1);
            const isActive = currentStage === stage && pipelineStatus === 'Active' && (!isCompleted || isDynamic);
            const icon = STAGE_ICONS[stage] || '🤖';
            const metrics = extractStageMetrics(stage, outputData, promptText, files);

            return (
              <div
                key={stage}
                className={`p-3 rounded-lg border flex flex-col gap-2 transition-all ${
                  isActive
                    ? 'bg-indigo-950/40 border-electric-indigo shadow-[0_0_20px_rgba(99,102,241,0.25)] animate-pulse'
                    : isCompleted
                    ? 'bg-slate-950/80 border-slate-800'
                    : 'bg-slate-950/40 border-slate-900 opacity-60'
                }`}
              >
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="flex items-center gap-1.5">
                    <span>{icon}</span>
                    <span className="text-slate-200">{stage}</span>
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                      isActive
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                        : isCompleted
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-900 text-slate-500'
                    }`}
                  >
                    {isActive ? 'COMPILING...' : isCompleted ? 'DONE' : 'WAITING'}
                  </span>
                </div>

                <div className="text-[10px] bg-slate-900/60 p-2 rounded border border-slate-850 flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                    <span>📥 Inflow</span> <span className="text-slate-500 font-normal">(Upstream Context)</span>
                  </span>
                  <span className="text-slate-400 truncate">
                    {metrics
                      ? metrics.inflow
                      : stage === 'Queen'
                      ? promptText
                        ? `Prompt (${promptText.length} chars)`
                        : 'Natural User Prompt'
                      : 'Upstream Context'}
                  </span>
                </div>

                <div className="text-[10px] bg-slate-900/60 p-2 rounded border border-slate-850 flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    <span>📤 Outflow</span> <span className="text-slate-500 font-normal">(Synthesized Output)</span>
                  </span>
                  <span className="text-slate-300 truncate">
                    {!outputData && streamProgress && streamProgress.agent === stage
                      ? `Streaming tokens (${streamProgress.tokenCount || 0})...`
                      : !outputData
                      ? 'Pending execution...'
                      : metrics
                      ? metrics.outflow
                      : 'Output synthesized successfully'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {liveOrEmpty || (
        <div className="w-full max-w-3xl flex flex-col gap-6 pb-12">
          <div className="bg-slate-900/80 border border-electric-indigo/40 rounded-xl p-5 shadow-[0_0_30px_rgba(99,102,241,0.15)] flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-electric-indigo" />
                <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">System Architecture &amp; File Flowchart</h4>
              </div>
              <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] px-2.5 py-0.5 rounded font-mono font-bold">
                {files.length > 0 ? `${files.length} Files Mapped` : `${modules.length} Modules`}
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Below is the plain-English flowchart of your application showing <strong>what files exist and why</strong>, how they interact, and their responsibilities.
            </p>

            <div className="grid grid-cols-4 gap-2 pt-2 text-[10px] font-mono font-bold text-center">
              <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 p-2.5 rounded-lg flex flex-col items-center gap-1">
                <span>🌐 1. Browser Entry</span>
                <span className="text-[9px] font-normal text-slate-400">index.html</span>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/30 text-purple-400 p-2.5 rounded-lg flex flex-col items-center gap-1">
                <span>🎨 2. Visual Design</span>
                <span className="text-[9px] font-normal text-slate-400">style.css</span>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-2.5 rounded-lg flex flex-col items-center gap-1">
                <span>⚡ 3. Application Logic</span>
                <span className="text-[9px] font-normal text-slate-400">JS / TS Logic</span>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-2.5 rounded-lg flex flex-col items-center gap-1">
                <span>🗄️ 4. Data &amp; State</span>
                <span className="text-[9px] font-normal text-slate-400">API &amp; Store</span>
              </div>
            </div>
          </div>

          {entities.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
              <h5 className="text-xs font-bold text-slate-300 border-b border-slate-800 pb-2 flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" /> Database Entities Schema
              </h5>
              <div className="grid grid-cols-3 gap-2">
                {entities.map((entity) => (
                  <div key={entity.name} className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-[10px]">
                    <div className="font-bold text-cyan-300 mb-1">{entity.name}</div>
                    <div className="flex flex-col text-slate-400 gap-0.5 font-mono">
                      {entity.fields?.map((f: any) => (
                        <div key={f.name}>{f.name}: {f.type}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
