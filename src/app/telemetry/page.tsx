'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  BarChart2,
  TrendingUp,
  PieChart,
  ListFilter,
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock,
  Search,
  Activity,
  Download,
} from 'lucide-react';

interface LogRecord {
  id: string;
  conversationId: string;
  stage: string;
  status: string;
  logs: string;
  createdAt: string;
}

interface TelemetryData {
  totalTokens: number;
  avgLatency: number;
  tokenUsage: Array<{ name: string; tokens: number; percentage: number }>;
  latencyHistory: Array<{ stage: string; timeMs: number }>;
  toolFrequency: Array<{ tool: string; count: number }>;
}

export default function TelemetryDashboard() {
  const { activeId, setActiveId, setActiveTitle } = useApp();
  const [logsList, setLogsList] = useState<LogRecord[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [conversationsList, setConversationsList] = useState<any[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'SUCCESS' | 'FAILED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'TIME_DESC' | 'TIME_ASC' | 'DURATION_DESC' | 'DURATION_ASC'>('TIME_DESC');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [pipelineStatus, setPipelineStatus] = useState<string>('Idle');
  const [currentStage, setCurrentStage] = useState<string>('Queen');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [telemetrySubTab, setTelemetrySubTab] = useState<'inflow' | 'thought' | 'outflow' | 'orchestration' | 'schema' | 'ledger' | 'memory'>('inflow');

  const categorizeLog = (log: LogRecord): string => {
    const stage = (log.stage || '').toLowerCase();
    const text = (log.logs || '').toLowerCase();

    if (stage === 'specialistrecovery' || text.includes('specialist recovery') || text.includes('triage') || text.includes('debugger')) {
      return 'Event-Triggered Recovery';
    }
    if (stage === 'blueprinter' || text.includes('blueprint engine') || text.includes('context resolver')) {
      return 'Deterministic Engine';
    }
    if (stage === 'security' || text.includes('static regex security scan') || text.includes('owasp')) {
      return 'Security Scans';
    }
    if (text.includes('context optimized') || text.includes('minimal context')) {
      return 'Context Optimization';
    }
    if (text.includes('approval gate') || text.includes('quality gate') || text.includes('pause')) {
      return 'Quality & Gates';
    }
    return 'LLM Specialist Inference';
  };

  const getLogDuration = (log: LogRecord): number => {
    if (log.logs.trim().startsWith('{') && log.logs.includes('"telemetryType":"rich_step_log"')) {
      try {
        const parsed = JSON.parse(log.logs);
        return parsed.orchestration?.durationMs || 0;
      } catch (e) {}
    }
    const match = log.logs.match(/in (\d+)ms/);
    return match ? parseInt(match[1], 10) : 0;
  };

  // Fetch list of conversations to support switching projects in telemetry
  useEffect(() => {
    fetch('/api/conversations')
      .then((res) => {
        if (res.ok) return res.json();
      })
      .then((data) => {
        if (data) setConversationsList(data);
      })
      .catch(() => {});
  }, []);

  const fetchTelemetryAndLogs = async () => {
    if (!activeId) {
      setLoading(false);
      setLogsList([]);
      setTelemetry(null);
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch Logs
      const logsRes = await fetch(`/api/conversations/${activeId}`);
      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogsList(data.history || []);
        setPipelineStatus(data.status);
        setCurrentStage(data.currentStage);
      }

      // 2. Fetch Telemetry
      const telRes = await fetch(`/api/conversations/${activeId}/telemetry`);
      if (telRes.ok) {
        const telData = await telRes.json();
        setTelemetry(telData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const downloadLogs = () => {
    if (!logsList || logsList.length === 0) return;
    const formattedData = logsList.map((log) => {
      let payload = log.logs;
      if (log.logs.trim().startsWith('{') && log.logs.includes('"telemetryType":"rich_step_log"')) {
        try {
          payload = JSON.parse(log.logs);
        } catch (e) {}
      }
      return {
        id: log.id,
        stage: log.stage,
        status: log.status,
        timestamp: log.createdAt,
        content: payload
      };
    });

    const blob = new Blob([JSON.stringify(formattedData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `telemetry_logs_${activeId}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchTelemetryAndLogs();

    let isFinished = false;
    let timeoutId: NodeJS.Timeout | null = null;

    const runPoll = async () => {
      if (!activeId || isFinished) return;

      let nextDelay = 5000; // default 5s delay when idle
      try {
        const res = await fetch(`/api/conversations/${activeId}`);
        if (res.ok) {
          const data = await res.json();
          setLogsList(data.history || []);
          setPipelineStatus(data.status);
          setCurrentStage(data.currentStage);

          if (data.status === 'Active') {
            nextDelay = 1500; // fast 1.5s delay if compiling
          }
        }

        const telRes = await fetch(`/api/conversations/${activeId}/telemetry`);
        if (telRes.ok) {
          const telData = await telRes.json();
          setTelemetry(telData);
        }
      } catch (e) {
        console.error('Telemetry polling error:', e);
      }

      if (!isFinished) {
        timeoutId = setTimeout(runPoll, nextDelay);
      }
    };

    if (activeId) {
      timeoutId = setTimeout(runPoll, 1500);
    }

    return () => {
      isFinished = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [activeId]);

  const filteredLogs = logsList
    .filter((log) => {
      if (filter === 'SUCCESS' && log.status !== 'Success') return false;
      if (filter === 'FAILED' && log.status !== 'Failed' && log.status !== 'Retrying') return false;
      if (categoryFilter !== 'ALL' && categorizeLog(log) !== categoryFilter) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          log.stage.toLowerCase().includes(term) ||
          log.logs.toLowerCase().includes(term) ||
          log.status.toLowerCase().includes(term)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'TIME_DESC') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'TIME_ASC') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'DURATION_DESC') {
        return getLogDuration(b) - getLogDuration(a);
      }
      if (sortBy === 'DURATION_ASC') {
        return getLogDuration(a) - getLogDuration(b);
      }
      return 0;
    });

  const getTokenPieGradient = () => {
    if (!telemetry || telemetry.tokenUsage.length === 0) {
      return 'conic-gradient(#475569 0% 100%)';
    }
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'];
    let accumulated = 0;
    const points = telemetry.tokenUsage.map((u, i) => {
      const start = accumulated;
      accumulated += u.percentage;
      const color = colors[i % colors.length];
      return `${color} ${start}% ${accumulated}%`;
    });
    return `conic-gradient(${points.join(', ')})`;
  };

  return (
    <main className="flex-1 overflow-y-auto bg-slate-950 p-6 flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex justify-between items-end border-b border-slate-700 pb-4">
        <div>
          <h2 className="text-xl font-bold text-on-surface">Telemetry Dashboard</h2>
          <p className="text-xs text-slate-400 mt-1">Audit log of backend command execution and tool calls.</p>
        </div>
        <div className="flex items-center gap-3">
          {conversationsList.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded text-xs font-mono text-slate-300">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Project:</span>
              <select
                value={activeId || ''}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  if (selectedId) {
                    const c = conversationsList.find((x) => x.id === selectedId);
                    setActiveId(selectedId);
                    if (c && c.title) setActiveTitle(c.title);
                  } else {
                    setActiveId(null);
                  }
                }}
                className="bg-transparent border-none text-xs font-bold text-on-surface focus:outline-none cursor-pointer max-w-[150px] truncate"
              >
                <option value="" className="bg-slate-900 text-slate-500">Select Project...</option>
                {conversationsList.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-slate-350">
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          {activeId && logsList.length > 0 && (
            <button
              onClick={downloadLogs}
              className="p-2 border border-slate-700 rounded text-slate-400 hover:text-on-surface hover:bg-slate-900 transition-colors flex items-center gap-1.5 text-xs font-mono"
              title="Download Logs"
            >
              <Download className="w-4 h-4" /> Download Logs
            </button>
          )}
          <button
            onClick={fetchTelemetryAndLogs}
            className="p-2 border border-slate-700 rounded text-slate-400 hover:text-on-surface hover:bg-slate-900 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live Status Monitor Card */}
      {activeId && (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              pipelineStatus === 'Active' ? 'bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.5)]' :
              pipelineStatus === 'Paused' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]' :
              pipelineStatus === 'Completed' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-slate-600'
            }`} />
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pipeline Status</div>
              <div className="text-sm font-bold text-on-surface flex items-center gap-1.5 mt-0.5">
                <span>{pipelineStatus === 'Active' ? 'Executing Stages...' : pipelineStatus}</span>
                {pipelineStatus === 'Active' && (
                  <span className="text-xs text-slate-400 font-normal">({currentStage} stage active)</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 md:border-l border-slate-800 md:pl-4 max-w-xl">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active Operation</div>
            <div className="text-xs text-slate-350 font-mono truncate mt-1">
              {logsList.length > 0 ? logsList[0].logs : 'No operations recorded.'}
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded px-3 py-1.5 text-right flex flex-col gap-0.5">
            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Last Sync</div>
            <div className="text-[10px] text-slate-400 font-mono">
              {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}

      {/* Bento Grid: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Chart 1: Tool Execution Frequency */}
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 flex flex-col gap-3">
          <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-electric-indigo" /> Tool Execution Frequency
          </h3>
          <div className="flex-1 min-h-[120px] bg-slate-950 rounded border border-slate-700 p-2 flex items-end gap-1.5 justify-around relative">
            {!telemetry || telemetry.toolFrequency.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-500 font-mono">
                No tool data compiled yet
              </div>
            ) : (
              (() => {
                const maxCount = Math.max(...telemetry.toolFrequency.map((tf) => tf.count), 1);
                return telemetry.toolFrequency.map((tf, i) => {
                  const heightPercent = Math.round((tf.count / maxCount) * 80) + 10;
                  return (
                    <div
                      key={tf.tool}
                      className="flex-1 bg-electric-indigo/25 border border-electric-indigo/50 rounded-t hover:bg-electric-indigo/50 transition-all relative group"
                      style={{ height: `${heightPercent}%` }}
                    >
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-[9px] font-mono text-on-surface px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 border border-slate-600 z-20 whitespace-nowrap">
                        {tf.tool}: {tf.count}
                      </div>
                    </div>
                  );
                });
              })()
            )}
          </div>
        </div>

        {/* Chart 2: System Latency */}
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 flex flex-col gap-3">
          <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-electric-indigo" /> System Latency (ms)
          </h3>
          <div className="flex-1 min-h-[120px] bg-slate-950 rounded border border-slate-700 p-2 relative overflow-hidden flex items-center justify-center">
            {!telemetry || telemetry.latencyHistory.length === 0 ? (
              <span className="text-[10px] text-slate-500 font-mono">No compiler latency stats logged</span>
            ) : (
              <>
                <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                  {(() => {
                    const maxTime = Math.max(...telemetry.latencyHistory.map((l) => l.timeMs), 1);
                    const points = telemetry.latencyHistory
                      .map((l, idx) => {
                        const x = Math.round((idx / (telemetry.latencyHistory.length - 1 || 1)) * 100);
                        const y = Math.round(40 - (l.timeMs / maxTime) * 30 - 5);
                        return { x, y, stage: l.stage, ms: l.timeMs };
                      });
                    const pathString = `M0,40 ` + points.map((p) => `L${p.x},${p.y}`).join(' ') + ` L100,40 Z`;
                    const polylineString = points.map((p) => `${p.x},${p.y}`).join(' ');

                    return (
                      <>
                        <path d={pathString} fill="rgba(99, 102, 241, 0.1)" />
                        <polyline fill="none" stroke="#6366f1" strokeWidth="1.5" points={polylineString} />
                      </>
                    );
                  })()}
                </svg>
                <div className="absolute bottom-2 right-2 text-[9px] font-mono text-slate-500">
                  Avg: {telemetry.avgLatency}ms
                </div>
              </>
            )}
          </div>
        </div>

        {/* Chart 3: Agent Token Usage */}
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 flex flex-col gap-3">
          <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
            <PieChart className="w-4 h-4 text-electric-indigo" /> Agent Token Usage
          </h3>
          <div className="flex-1 min-h-[120px] bg-slate-950 rounded border border-slate-700 p-2 flex items-center justify-between relative">
            {!telemetry || telemetry.tokenUsage.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-500 font-mono">
                No token usage logged
              </div>
            ) : (
              <>
                <div
                  className="relative w-16 h-16 rounded-full flex items-center justify-center mx-4 flex-shrink-0"
                  style={{ background: getTokenPieGradient() }}
                >
                  <div className="w-12 h-12 bg-slate-950 rounded-full flex items-center justify-center shadow-inner">
                    <span className="font-mono text-[9px] text-on-surface">
                      {telemetry.totalTokens > 1000 
                        ? `${(telemetry.totalTokens / 1000).toFixed(1)}k` 
                        : telemetry.totalTokens}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 flex-1 pr-2 max-h-[100px] overflow-y-auto">
                  {telemetry.tokenUsage.slice(0, 4).map((u, i) => {
                    const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-blue-500', 'bg-pink-500'];
                    const color = colors[i % colors.length];
                    return (
                      <div key={u.name} className="flex justify-between items-center font-mono text-[9px]">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className={`w-1.5 h-1.5 rounded-sm ${color} flex-shrink-0`}></span>
                          <span className="truncate">{u.name}</span>
                        </div>
                        <span className="text-slate-400">{u.percentage}%</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Live Communication & Thought Processes */}
      {activeId && (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-electric-indigo" /> Live Agent Communication
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">Stream: Active</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Inflow | Outflow */}
            <div className="flex flex-col gap-3">
              <div className="bg-slate-950 p-4 rounded border border-slate-800 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Inflow (Context Feed)</span>
                  <span className="text-[10px] text-slate-500 font-mono">Input Payload</span>
                </div>
                <div className="flex justify-between items-end">
                  <div className="text-lg font-bold font-mono text-on-surface">
                    {telemetry ? `${Math.round(telemetry.totalTokens * 0.7)} tokens` : '0 tokens'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    SML Specifications, Prompt Rules, Schema Constraints
                  </div>
                </div>
                <div className="w-full bg-slate-850 h-1 rounded overflow-hidden">
                  <div className="bg-indigo-500 h-full w-[70%]" />
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded border border-slate-800 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Outflow (Model Synthesis)</span>
                  <span className="text-[10px] text-slate-500 font-mono">Parsed Response</span>
                </div>
                <div className="flex justify-between items-end">
                  <div className="text-lg font-bold font-mono text-on-surface">
                    {telemetry ? `${Math.round(telemetry.totalTokens * 0.3)} tokens` : '0 tokens'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Structured JSON files, Compiled Source modules
                  </div>
                </div>
                <div className="w-full bg-slate-850 h-1 rounded overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[30%]" />
                </div>
              </div>
            </div>

            {/* Right: Thought Processes */}
            <div className="bg-slate-950 rounded border border-slate-800 p-4 flex flex-col gap-3 h-[180px]">
              <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Thought Processes Log</span>
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              </div>
              <div className="flex-1 overflow-y-auto font-mono text-[10px] text-slate-400 flex flex-col gap-1.5 pr-2">
                {(() => {
                  const list: Array<{ stage: string; message: string }> = [];
                  for (const log of logsList) {
                    const logMsg = log.logs || '';
                    if (logMsg.trim().startsWith('{') && logMsg.includes('"telemetryType":"rich_step_log"')) {
                      try {
                        const parsed = JSON.parse(logMsg);
                        const stage = parsed.executionMemory?.stage || log.stage;
                        const attempt = parsed.orchestration?.attempt || 1;
                        const duration = parsed.orchestration?.durationMs || 0;
                        
                        list.push({
                          stage,
                          message: `Started execution attempt ${attempt}/3...`
                        });
                        if (parsed.orchestration?.errorMessage) {
                          list.push({
                            stage,
                            message: `Failed: ${parsed.orchestration.errorMessage}`
                          });
                        } else {
                          list.push({
                            stage,
                            message: `Completed successfully in ${duration}ms`
                          });
                        }
                        continue;
                      } catch (e) {}
                    }
                    
                    if (
                      logMsg.includes('started') ||
                      logMsg.includes('inference') ||
                      logMsg.includes('parse') ||
                      logMsg.includes('validation') ||
                      logMsg.includes('compilation') ||
                      logMsg.includes('reproduction')
                    ) {
                      list.push({
                        stage: log.stage,
                        message: logMsg
                      });
                    }
                  }

                  const sliced = list.slice(0, 10);
                  if (sliced.length === 0) {
                    return <div className="text-slate-650 text-center mt-8">No reasoning cycles recorded yet.</div>;
                  }
                  return sliced.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-start border-l border-slate-800 pl-2 py-0.5">
                      <span className="text-indigo-400 flex-shrink-0">[{item.stage}]</span>
                      <span className="text-slate-350">{item.message}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Execution Log Table Panel */}
      <div className="flex-1 bg-slate-900 border border-slate-700 rounded-lg flex overflow-hidden min-h-[400px]">
        {/* Left: Logs List / Table */}
        <div className="flex-1 flex flex-col overflow-hidden h-full">
          {/* Table Toolbar */}
          {/* Table Toolbar */}
          <div className="p-3 border-b border-slate-700 flex flex-col gap-3 bg-slate-900/50">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <div className="flex items-center gap-3">
                <ListFilter className="w-4 h-4 text-slate-400" />
                <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">Execution Telemetry Logger</h3>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {/* Search */}
                <div className="relative w-full md:w-48">
                  <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-xs rounded pl-8 pr-3 py-1 outline-none focus:border-electric-indigo"
                    placeholder="Search logs..."
                  />
                </div>

                {/* Status Filter buttons */}
                <div className="flex bg-slate-950 rounded border border-slate-700 p-0.5">
                  <button
                    onClick={() => setFilter('ALL')}
                    className={`px-2 py-1 text-[10px] font-bold rounded ${filter === 'ALL' ? 'bg-slate-800 text-on-surface' : 'text-slate-400'}`}
                  >
                    All Status
                  </button>
                  <button
                    onClick={() => setFilter('SUCCESS')}
                    className={`px-2 py-1 text-[10px] font-bold rounded ${filter === 'SUCCESS' ? 'bg-slate-800 text-on-surface' : 'text-slate-400'}`}
                  >
                    Success
                  </button>
                  <button
                    onClick={() => setFilter('FAILED')}
                    className={`px-2 py-1 text-[10px] font-bold rounded ${filter === 'FAILED' ? 'bg-slate-800 text-on-surface' : 'text-slate-400'}`}
                  >
                    Failed
                  </button>
                </div>

                {/* Sort By Select */}
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-[10px] text-slate-300 font-mono rounded px-2 py-1 outline-none focus:border-electric-indigo"
                >
                  <option value="TIME_DESC">Sort: Newest First</option>
                  <option value="TIME_ASC">Sort: Oldest First</option>
                  <option value="DURATION_DESC">Sort: Slowest First</option>
                  <option value="DURATION_ASC">Sort: Fastest First</option>
                </select>
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 border-t border-slate-800/80 pt-2 font-mono text-[10px]">
              {[
                { id: 'ALL', label: 'All Categories' },
                { id: 'LLM Specialist Inference', label: 'LLM Inference' },
                { id: 'Deterministic Engine', label: 'Deterministic Engine' },
                { id: 'Event-Triggered Recovery', label: 'Event Recovery' },
                { id: 'Security Scans', label: 'Security Scans' },
                { id: 'Context Optimization', label: 'Context Optimization' },
                { id: 'Quality & Gates', label: 'Gates & Approval' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCategoryFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-colors border ${
                    categoryFilter === tab.id
                      ? 'bg-electric-indigo/20 border-electric-indigo text-on-surface font-bold'
                      : 'border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table Content */}
          <div className="flex-1 overflow-auto bg-slate-950/70">
            {!activeId ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No active project selected. Choose a project from the switcher at the top to load its audit telemetry logs.
              </div>
            ) : loading ? (
              <div className="p-12 text-center text-xs text-slate-500 animate-pulse">
                Fetching pipeline execution log...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No log entries match the active category, search, or status filters.
              </div>
            ) : (
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead className="sticky top-0 bg-slate-950 z-10 text-[10px] text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="p-3 font-medium tracking-wider w-32">Time</th>
                    <th className="p-3 font-medium tracking-wider w-40">Category</th>
                    <th className="p-3 font-medium tracking-wider w-36">Stage / Agent</th>
                    <th className="p-3 font-medium tracking-wider">Telemetry Action Log</th>
                    <th className="p-3 font-medium tracking-wider w-24">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredLogs.map((log) => {
                    const isSuccess = log.status === 'Success';
                    const category = categorizeLog(log);
                    const isSelected = selectedLog && (selectedLog.executionMemory?.stage === log.stage || (selectedLog.thought === log.logs));
                    return (
                      <tr 
                        key={log.id} 
                        onClick={() => {
                          if (log.logs.trim().startsWith('{') && log.logs.includes('"telemetryType":"rich_step_log"')) {
                            try {
                              const parsed = JSON.parse(log.logs);
                              setSelectedLog(parsed);
                            } catch (e) {
                              setSelectedLog(null);
                            }
                          } else {
                            setSelectedLog({
                              telemetryType: 'rich_step_log',
                              executionMemory: { stage: log.stage, status: log.status },
                              thought: log.logs,
                              orchestration: { attempt: 1, durationMs: 0, model: 'System Event' }
                            });
                          }
                        }}
                        className={`hover:bg-slate-900/30 transition-colors cursor-pointer ${isSelected ? 'bg-indigo-950/20 border-l-2 border-l-indigo-500' : ''} ${!isSuccess && 'bg-red-500/5'}`}
                      >
                        <td className="p-3 text-slate-500 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                            category === 'Deterministic Engine'
                              ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                              : category === 'Event-Triggered Recovery'
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                              : category === 'Security Scans'
                              ? 'bg-teal-500/10 border-teal-500/20 text-teal-400'
                              : category === 'Context Optimization'
                              ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                              : category === 'Quality & Gates'
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                              : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                          }`}>
                            {category}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${isSuccess ? 'bg-electric-indigo' : 'bg-red-500'}`} />
                            <span className="text-on-surface font-semibold">{log.stage}</span>
                          </div>
                        </td>
                        <td className="p-3 max-w-md truncate">
                          <code className="text-slate-350 font-mono text-[10px]">
                            {(() => {
                              if (log.logs.trim().startsWith('{') && log.logs.includes('"telemetryType":"rich_step_log"')) {
                                try {
                                  const parsed = JSON.parse(log.logs);
                                  const attempt = parsed.orchestration?.attempt || 1;
                                  const duration = parsed.orchestration?.durationMs || 0;
                                  return `[Rich Telemetry Log] Attempt ${attempt}/3 completed in ${duration}ms. Click to inspect.`;
                                } catch (e) {}
                              }
                              return log.logs;
                            })()}
                          </code>
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                            isSuccess
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                              : 'bg-red-500/10 border-red-500/20 text-red-500'
                          }`}>
                            {isSuccess ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {isSuccess ? 'Success' : 'Error'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: Detailed Telemetry Inspector */}
        {selectedLog && (
          <div className="w-1/2 flex flex-col bg-slate-950 border-l border-slate-800 overflow-hidden h-full text-xs">
            {/* Inspector Header */}
            <div className="p-4 border-b border-slate-850 bg-slate-900/20 flex flex-col gap-1.5">
              <div className="flex justify-between items-center w-full">
                <h4 className="font-bold text-slate-100 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${selectedLog.executionMemory?.status === 'Success' ? 'bg-emerald-400' : 'bg-red-500'}`} />
                  Stage: {selectedLog.executionMemory?.stage || 'Unknown'}
                </h4>
                <button 
                  onClick={() => setSelectedLog(null)}
                  className="text-[10px] text-slate-500 hover:text-slate-350 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded"
                >
                  Close
                </button>
              </div>
              <div className="text-[10px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1 font-mono">
                <div><strong>Model:</strong> {selectedLog.orchestration?.model || 'ollama/default'}</div>
                <div><strong>Duration:</strong> {selectedLog.orchestration?.durationMs || 0}ms</div>
                <div><strong>Attempt:</strong> {selectedLog.orchestration?.attempt || 1}/3</div>
              </div>
            </div>

            {/* Sub-tabs Navigation */}
            <div className="flex border-b border-slate-850 bg-slate-900/10 overflow-x-auto no-scrollbar">
              {([
                { id: 'inflow', label: 'Inflow' },
                { id: 'thought', label: 'Thought' },
                { id: 'outflow', label: 'Outflow' },
                { id: 'orchestration', label: 'Stats' },
                { id: 'schema', label: 'Schema' },
                { id: 'ledger', label: 'Ledger' },
                { id: 'memory', label: 'Memory' }
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setTelemetrySubTab(tab.id)}
                  className={`px-3 py-2 text-[10px] font-bold font-mono tracking-wider transition-all border-b-2 ${
                    telemetrySubTab === tab.id
                      ? 'text-indigo-400 border-indigo-400 bg-slate-900/30'
                      : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-900/10'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Sub-tab Content */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-950/40 font-mono text-[10px] text-slate-350">
              {telemetrySubTab === 'inflow' && (
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="text-slate-400 font-bold mb-1.5 uppercase text-[9px] tracking-wider">System Instructions</div>
                    <pre className="p-3 bg-slate-900 border border-slate-800 rounded overflow-x-auto max-h-60 whitespace-pre-wrap select-text">
                      {selectedLog.inflow?.systemInstructions || 'N/A'}
                    </pre>
                  </div>
                  <div>
                    <div className="text-slate-400 font-bold mb-1.5 uppercase text-[9px] tracking-wider">User Content Context</div>
                    <pre className="p-3 bg-slate-900 border border-slate-800 rounded overflow-x-auto max-h-60 whitespace-pre-wrap select-text">
                      {selectedLog.inflow?.userContent || 'N/A'}
                    </pre>
                  </div>
                </div>
              )}

              {telemetrySubTab === 'thought' && (
                <div>
                  <div className="text-slate-400 font-bold mb-1.5 uppercase text-[9px] tracking-wider">Raw Model Output</div>
                  <pre className="p-3 bg-slate-900 border border-slate-800 rounded overflow-x-auto whitespace-pre-wrap select-text leading-relaxed text-slate-300">
                    {selectedLog.thought || 'N/A'}
                  </pre>
                </div>
              )}

              {telemetrySubTab === 'outflow' && (
                <div>
                  <div className="text-slate-400 font-bold mb-1.5 uppercase text-[9px] tracking-wider">Parsed JSON Output</div>
                  <pre className="p-3 bg-slate-900 border border-slate-800 rounded overflow-x-auto text-emerald-400 select-text">
                    {selectedLog.outflow ? JSON.stringify(selectedLog.outflow, null, 2) : 'N/A'}
                  </pre>
                </div>
              )}

              {telemetrySubTab === 'orchestration' && (
                <div>
                  <div className="text-slate-400 font-bold mb-1.5 uppercase text-[9px] tracking-wider">Orchestration Stats</div>
                  <pre className="p-3 bg-slate-900 border border-slate-800 rounded overflow-x-auto select-text">
                    {JSON.stringify(selectedLog.orchestration, null, 2)}
                  </pre>
                </div>
              )}

              {telemetrySubTab === 'schema' && (
                <div>
                  <div className="text-slate-400 font-bold mb-1.5 uppercase text-[9px] tracking-wider">JSON Validation Schema</div>
                  <pre className="p-3 bg-slate-900 border border-slate-800 rounded overflow-x-auto select-text">
                    {selectedLog.validationSchema ? JSON.stringify(selectedLog.validationSchema, null, 2) : 'N/A'}
                  </pre>
                </div>
              )}

              {telemetrySubTab === 'ledger' && (
                <div>
                  <div className="text-slate-400 font-bold mb-1.5 uppercase text-[9px] tracking-wider">StageLedger Snapshot</div>
                  <pre className="p-3 bg-slate-900 border border-slate-800 rounded overflow-x-auto select-text">
                    {selectedLog.ledgerState ? JSON.stringify(selectedLog.ledgerState, null, 2) : 'N/A'}
                  </pre>
                </div>
              )}

              {telemetrySubTab === 'memory' && (
                <div>
                  <div className="text-slate-400 font-bold mb-1.5 uppercase text-[9px] tracking-wider">Execution Context</div>
                  <pre className="p-3 bg-slate-900 border border-slate-800 rounded overflow-x-auto select-text">
                    {JSON.stringify(selectedLog.executionMemory, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
