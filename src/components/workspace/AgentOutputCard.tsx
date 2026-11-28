'use client';

import React from 'react';
import { getFileBasename, safeParseJson } from './workspace-helpers';

const STAGE_CONFIG: Record<string, { icon: string; title: string; color: string }> = {
  Queen: { icon: '👑', title: 'Project Plan', color: 'text-purple-400' },
  Planner: { icon: '📋', title: 'Requirements', color: 'text-indigo-400' },
  Architect: { icon: '🏗️', title: 'Architecture', color: 'text-violet-400' },
  System: { icon: '⚙️', title: 'Backend Spec', color: 'text-blue-400' },
  Designer: { icon: '🎨', title: 'UI/UX Spec', color: 'text-pink-400' },
  Blueprinter: { icon: '📐', title: 'Blueprint', color: 'text-cyan-400' },
  Coder: { icon: '💻', title: 'Generated Files', color: 'text-amber-400' },
  Tester: { icon: '🧪', title: 'Test Report', color: 'text-emerald-400' },
  Debugger: { icon: '🔧', title: 'Debug Report', color: 'text-orange-400' },
  Security: { icon: '🛡️', title: 'Security Audit', color: 'text-red-400' },
  Reviewer: { icon: '📝', title: 'Code Review', color: 'text-purple-400' },
};

export function AgentOutputCard({ agentName, rawData }: { agentName: string; rawData: any }) {
  if (!rawData) return null;
  let data = safeParseJson(rawData);
  if (!data) {
    if (typeof rawData === 'string' && rawData.trim().length > 0) {
      data = { content: rawData };
    } else {
      return null;
    }
  }

  if (typeof data.content === 'string' && !data.project && !data.architecture && !data.features) {
    const cfg = STAGE_CONFIG[agentName] || { icon: '📄', title: agentName, color: 'text-slate-300' };

    return (
      <div className="mt-3 p-3 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-300 space-y-2 select-text w-full max-w-md">
        <div className={`text-xs font-bold ${cfg.color}`}>{cfg.icon} {cfg.title}</div>
        <div className="text-[11px] text-slate-300 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto p-2 bg-slate-950/60 rounded border border-slate-800">
          {data.content}
        </div>
      </div>
    );
  }

  if (data.outflow && typeof data.outflow === 'object') {
    data = data.outflow;
  } else if (data.parsedJson && typeof data.parsedJson === 'object') {
    data = data.parsedJson;
  }

  switch (agentName) {
    case 'Queen': {
      if (data.contextType === 'validationError' || data.status === 'Rejected') {
        return (
          <div className="mt-3 p-3 bg-slate-900 border border-red-500/40 rounded-lg text-slate-300 space-y-2 w-full max-w-md select-text">
            <div className="text-xs font-bold text-red-400">👑 Queen Input Rejection</div>
            <div className="text-[11px] text-red-300 bg-red-950/25 border border-red-950 p-2.5 rounded">
              <strong>Reason:</strong> {data.reason || 'Invalid Prompt'}
              <p className="mt-1 text-slate-450 font-sans leading-relaxed">{data.message}</p>
            </div>
          </div>
        );
      }
      const name = data.project?.name || data.projectName || 'Project';
      const id = data.project?.id || data.mvpId || 'N/A';
      const problem = data.project?.problemStatement || data.problemStatement || '';
      const included = data.scope?.mvp?.included || data.mvpScope?.included || [];
      const excluded = data.scope?.mvp?.excluded || data.mvpScope?.excluded || [];

      return (
        <div className="mt-3 p-3 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-300 space-y-2 select-text w-full max-w-md">
          <div className="text-xs font-bold text-electric-indigo">👑 Queen Project Definition</div>
          <div className="text-[11px] grid grid-cols-2 gap-x-2 gap-y-1">
            <span className="text-slate-500">MVP ID:</span> <span>{id}</span>
            <span className="text-slate-500">Project Name:</span> <span>{name}</span>
          </div>
          {problem && (
            <div className="text-[11px] text-slate-400 mt-1 border-t border-slate-850 pt-1">
              <strong>Problem:</strong> {problem}
            </div>
          )}
          <div className="text-[10px] grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-850">
            <div>
              <span className="text-emerald-400 font-bold">✓ Included:</span>
              <ul className="list-disc pl-3 text-slate-400 space-y-0.5 mt-0.5">
                {Array.isArray(included) && included.slice(0, 3).map((item: any, i: number) => <li key={i}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>)}
              </ul>
            </div>
            <div>
              <span className="text-red-400 font-bold">✗ Excluded:</span>
              <ul className="list-disc pl-3 text-slate-400 space-y-0.5 mt-0.5">
                {Array.isArray(excluded) && excluded.slice(0, 3).map((item: any, i: number) => <li key={i}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>)}
              </ul>
            </div>
          </div>
        </div>
      );
    }

    case 'Planner': {
      const extractTech = (techVal: any) => {
        if (!techVal) return '';
        if (typeof techVal === 'string') return techVal;
        if (typeof techVal === 'object') {
          return techVal.framework || techVal.language || techVal.type || techVal.provider || Object.values(techVal)[0] || '';
        }
        return String(techVal);
      };

      const frontendTech = extractTech(data.recommendedTechStack?.frontend || data.technology?.frontend) || 'HTML/JS';
      const backendTech = extractTech(data.recommendedTechStack?.backend || data.technology?.backend) || 'Node.js';
      const dbTech = extractTech(data.recommendedTechStack?.database || data.technology?.database) || 'SQLite';
      const features = Array.isArray(data.features) ? data.features : [];

      return (
        <div className="mt-3 p-3 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-300 space-y-2 select-text w-full max-w-md">
          <div className="text-xs font-bold text-indigo-400">📋 Planner Implementation Plan</div>
          <div className="text-[11px] border-b border-slate-855 pb-2">
            <strong>Recommended Tech Stack:</strong> {frontendTech} / {backendTech} / {dbTech}
          </div>
          <div className="text-[11px] space-y-1">
            <strong>Planned Features list:</strong> ({features.length})
            <div className="space-y-1 mt-1 max-h-32 overflow-y-auto">
              {features.map((f: any, i: number) => {
                const featName = f.name || f.title || f.description || f.id || `Feature ${i + 1}`;
                const featPriority = f.priority || 'MEDIUM';
                return (
                  <div key={i} className="flex justify-between items-center text-[10px] bg-slate-955 p-1.5 rounded border border-slate-800">
                    <span className="truncate max-w-[260px]">{featName}</span>
                    <span className="px-1.5 py-0.2 bg-indigo-955 text-indigo-300 border border-indigo-800 rounded text-[8px] font-bold">{featPriority}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    case 'Architect': {
      const style = data.architecture?.style || data.architectureStyle || 'Layered Architecture';
      const conventions = data.projectConventions?.namingConvention || 'Standard';
      const modules = Array.isArray(data.modules) ? data.modules : [];

      return (
        <div className="mt-3 p-3 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-300 space-y-2 select-text w-full max-w-md">
          <div className="text-xs font-bold text-blue-400">🏗 Architect Blueprint</div>
          <div className="text-[11px] grid grid-cols-2 gap-1 border-b border-slate-855 pb-2">
            <div><strong>Style:</strong> {style}</div>
            <div><strong>Conventions:</strong> {conventions}</div>
          </div>
          <div className="text-[11px] space-y-1">
            <strong>Modules Map:</strong> ({modules.length})
            <div className="space-y-1 mt-1 max-h-32 overflow-y-auto">
              {modules.map((m: any, i: number) => {
                const modName = m.name || m.id || `Module ${i + 1}`;
                const modPurpose = m.description || m.purpose || '';
                const files = m.ownedFiles || m.files || [];
                return (
                  <div key={i} className="text-[10px] bg-slate-955 p-1.5 rounded border border-slate-800">
                    <div className="font-bold text-blue-300">{modName}</div>
                    {modPurpose && <div className="text-slate-500 mt-0.5 text-[9px]">{modPurpose}</div>}
                    {Array.isArray(files) && files.length > 0 && (
                      <div className="text-slate-400 mt-1 flex flex-wrap gap-1">
                        {files.map((f: any, j: number) => {
                          const pathStr = typeof f === 'string' ? f : f.path || f.name || '';
                          return <span key={j} className="px-1 bg-slate-900 border border-slate-850 rounded text-[8px] font-mono">{getFileBasename(pathStr)}</span>;
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    case 'System': {
      const dbType = data.database?.type || data.database?.provider || 'JSON / Memory';
      const apis = Array.isArray(data.apis) ? data.apis : [];

      return (
        <div className="mt-3 p-3 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-300 space-y-2 select-text w-full max-w-md">
          <div className="text-xs font-bold text-purple-400">⚙ System Backend Blueprint</div>
          <div className="text-[11px] border-b border-slate-855 pb-1.5">
            <strong>Database Type:</strong> {dbType}
          </div>
          <div className="text-[10px] space-y-1">
            <div className="text-slate-400 font-bold">API Routes Designed: ({apis.length})</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {apis.map((api: any, i: number) => {
                const method = api.method || 'GET';
                const route = api.route || api.path || api.name || '';
                return (
                  <div key={i} className="flex gap-2 items-center bg-slate-955 p-1.5 rounded border border-slate-800 font-mono">
                    <span className={`px-1 rounded text-[8px] font-bold ${
                      method === 'GET' ? 'bg-blue-955 text-blue-300 border border-blue-800' : 'bg-green-955 text-green-300 border border-green-800'
                    }`}>{method}</span>
                    <span className="text-slate-300">{route}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    case 'Designer': {
      const theme = data.designSystem?.theme || data.designSystem?.designStyle || data.designPhilosophy?.theme || 'Modern UI';
      const pages = Array.isArray(data.pages) ? data.pages : [];

      return (
        <div className="mt-3 p-3 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-300 space-y-2 select-text w-full max-w-md">
          <div className="text-xs font-bold text-pink-400">🎨 Designer UI/UX System</div>
          <div className="text-[11px] grid grid-cols-2 gap-1 border-b border-slate-855 pb-1.5">
            <div><strong>Theme:</strong> {theme}</div>
            <div><strong>Pages Designed:</strong> {pages.length}</div>
          </div>
          <div className="text-[10px] space-y-1">
            <div className="text-slate-400 font-bold">Pages & Reusable Components:</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {pages.map((p: any, i: number) => {
                const pageName = p.name || p.route || p.id || `Page ${i + 1}`;
                const pagePurpose = p.purpose || p.description || '';
                return (
                  <div key={i} className="bg-slate-955 p-1.5 rounded border border-slate-850">
                    <span className="text-pink-300 font-bold">{pageName}</span>
                    {pagePurpose && <span className="text-slate-500 text-[9px] ml-2">({pagePurpose})</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    case 'Coder': {
      const generatedFiles = Array.isArray(data.generatedFiles) ? data.generatedFiles : data.file ? [data.file] : [];
      const filesCount = data.generationSummary?.filesGenerated || generatedFiles.length;
      const status = data.generationSummary?.status || data.implementation?.status || 'SUCCESS';

      return (
        <div className="mt-3 p-3 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-300 space-y-2 select-text w-full max-w-md font-mono">
          <div className="text-xs font-bold text-amber-400 font-sans">💻 Coder Synthesized Files</div>
          <div className="text-[11px] grid grid-cols-2 gap-1 border-b border-slate-855 pb-1.5 font-sans">
            <div><strong>Files Generated:</strong> {filesCount}</div>
            <div><strong>Status:</strong> <span className="text-emerald-400 font-bold">{status}</span></div>
          </div>
          <div className="text-[10px] space-y-1">
            <div className="text-slate-400 font-bold font-sans">Compiled File Tree:</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {generatedFiles.map((f: any, i: number) => {
                const filePath = f.path || (typeof f === 'string' ? f : '');
                const fileLang = f.language || f.type || 'js';
                return (
                  <div key={i} className="flex justify-between items-center bg-slate-955 p-1.5 rounded border border-slate-850">
                    <span className="text-slate-300 text-[9px]">{filePath}</span>
                    <span className="px-1 bg-slate-900 border border-slate-800 rounded text-[8px] text-slate-550">{fileLang}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    case 'Tester': {
      const summary = data.summary || data.testReport?.summary || {};
      const passed = summary.passedTests ?? summary.passed ?? 0;
      const failed = summary.failedTests ?? summary.failed ?? 0;
      const total = summary.totalTests ?? passed + failed;
      const defects = Array.isArray(data.defects) ? data.defects : Array.isArray(data.testReport?.defects) ? data.testReport.defects : [];

      return (
        <div className="mt-3 p-3 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-300 space-y-2 select-text w-full max-w-md">
          <div className="text-xs font-bold text-emerald-400">🧪 Tester Quality Report</div>
          <div className="text-[11px] grid grid-cols-3 gap-1 border-b border-slate-850 pb-1.5">
            <div><strong>Passed:</strong> <span className="text-emerald-400 font-bold">{passed}</span></div>
            <div><strong>Failed:</strong> <span className="text-red-400 font-bold">{failed}</span></div>
            <div><strong>Total:</strong> <span className="text-blue-400 font-bold">{total}</span></div>
          </div>
          {defects.length > 0 ? (
            <div className="text-[10px] space-y-1 mt-1">
              <div className="text-red-400 font-bold">Defects Identified: ({defects.length})</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {defects.map((def: any, i: number) => (
                  <div key={i} className="bg-slate-955 p-1.5 rounded border border-red-950 text-red-300">
                    <strong>{def.id || `DEF-${i + 1}`}:</strong> {def.title || def.description}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
              ✓ All tests parsed and compiled cleanly with 0 defects.
            </div>
          )}
        </div>
      );
    }

    case 'Debugger': {
      const summary = data.summary || data.debugReport?.summary || {};
      const resolved = summary.resolvedDefects ?? summary.issuesResolved ?? 0;
      const remaining = summary.remainingDefects ?? summary.remainingIssues ?? 0;
      const fixes = Array.isArray(data.fixes) ? data.fixes : Array.isArray(data.debugReport?.issues) ? data.debugReport.issues : [];

      return (
        <div className="mt-3 p-3 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-300 space-y-2 select-text w-full max-w-md">
          <div className="text-xs font-bold text-rose-400">🔧 Debugger Repair Report</div>
          <div className="text-[11px] grid grid-cols-2 gap-1 border-b border-slate-855 pb-1.5 font-bold">
            <div>Resolved: <span className="text-emerald-400">{resolved}</span></div>
            <div>Remaining: <span className="text-rose-400">{remaining}</span></div>
          </div>
          {fixes.length > 0 && (
            <div className="text-[10px] space-y-1 max-h-32 overflow-y-auto mt-1">
              {fixes.map((fix: any, i: number) => (
                <div key={i} className="bg-slate-955 p-1.5 rounded border border-slate-800">
                  <div className="text-rose-300 font-bold">Fix for {fix.defectId || fix.testerDefectId || `Fix ${i + 1}`}:</div>
                  <div className="text-slate-400 mt-0.5">{fix.resolution || fix.rootCause || 'Applied code repair'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    case 'Security': {
      const summary = data.summary || data.securityReport?.summary || {};
      const overallStatus = summary.overallSecurityStatus || 'SECURE';
      const score = summary.securityScore ?? 100;
      const vulns = Array.isArray(data.vulnerabilities) ? data.vulnerabilities : Array.isArray(data.securityReport?.issues) ? data.securityReport.issues : [];

      return (
        <div className="mt-3 p-3 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-300 space-y-2 select-text w-full max-w-md">
          <div className="text-xs font-bold text-teal-400 flex justify-between items-center">
            <span>🛡 Security Audit Report</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-teal-955 border border-teal-800 rounded text-teal-300">{overallStatus} ({score}/100)</span>
          </div>
          {vulns.length > 0 ? (
            <div className="text-[10px] space-y-1 mt-1 max-h-32 overflow-y-auto">
              {vulns.map((v: any, i: number) => (
                <div key={i} className="bg-slate-955 p-1.5 rounded border border-slate-800">
                  <span className="text-teal-300 font-bold">{v.category || v.severity || 'Vulnerability'}</span> - <span className="text-slate-400">{v.title || v.description}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[10px] text-teal-400 font-bold">
              ✓ 0 vulnerabilities detected in security audit scan.
            </div>
          )}
        </div>
      );
    }

    case 'Reviewer': {
      const qualityScore = data.qualityScore ?? 100;
      const annotations = Array.isArray(data.annotations) ? data.annotations : Array.isArray(data.findings) ? data.findings : [];

      return (
        <div className="mt-3 p-3 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-300 space-y-2 select-text w-full max-w-md">
          <div className="text-xs font-bold text-emerald-400 flex justify-between items-center">
            <span>🔍 Code Quality Reviewer</span>
            <span className="px-2 py-0.5 bg-emerald-955 border border-emerald-800 rounded font-bold text-emerald-400 text-xs">{qualityScore} / 100</span>
          </div>
          {annotations.length > 0 && (
            <div className="text-[10px] space-y-1 mt-1 max-h-32 overflow-y-auto">
              {annotations.map((ann: any, i: number) => (
                <div key={i} className="bg-slate-955 p-1.5 rounded border border-slate-800">
                  <span className={`font-bold uppercase text-[7px] px-1 rounded mr-1 ${
                    ann.severity === 'error' || ann.severity === 'HIGH' ? 'bg-red-950 text-red-400 border border-red-900' :
                    ann.severity === 'warn' || ann.severity === 'MEDIUM' ? 'bg-yellow-950 text-yellow-400 border border-yellow-900' :
                    'bg-blue-950 text-blue-400 border border-blue-900'
                  }`}>{ann.severity || 'INFO'}</span>
                  <span className="text-slate-300">{ann.note || ann.description || ann.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    default:
      return null;
  }
}
