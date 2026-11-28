'use client';

import React from 'react';
import Editor from '@monaco-editor/react';
import { ChevronDown, ChevronRight, Database, Download, FileCode, Folder, FolderOpen, Settings } from 'lucide-react';
import {
  buildFileTree,
  CoderFileProgress,
  FileNode,
  getEditorLanguage,
  normalizeFilePath,
  STAGE_INFLOW_FILES,
} from './workspace-helpers';

interface CodeExplorerTabProps {
  conversationId: string | null;
  activeTitle: string;
  files: string[];
  selectedFile: string | null;
  fileContent: string;
  expandedDirs: Record<string, boolean>;
  toggleDir: (dirPath: string) => void;
  onSelectFile: (filepath: any) => void;
  activeStreamingFile: string | null;
  agentActivityState: 'idle' | 'reading_inflow' | 'synthesizing_outflow';
  pipelineStatus: string;
  currentStage: string;
  coderFileProgress: CoderFileProgress;
  inflowDetail: string;
}

function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return <FileCode className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />;
    case 'js':
    case 'jsx':
      return <FileCode className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />;
    case 'json':
      return <Settings className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />;
    case 'html':
      return <FileCode className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />;
    case 'css':
      return <FileCode className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />;
    default:
      return <FileCode className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />;
  }
}

export function CodeExplorerTab({
  conversationId,
  activeTitle,
  files,
  selectedFile,
  fileContent,
  expandedDirs,
  toggleDir,
  onSelectFile,
  activeStreamingFile,
  agentActivityState,
  pipelineStatus,
  currentStage,
  coderFileProgress,
  inflowDetail,
}: CodeExplorerTabProps) {
  const renderFileNode = (node: FileNode, depth = 0): React.ReactNode => {
    if (node.isDirectory) {
      const isExpanded = !!expandedDirs[node.path];
      return (
        <div key={node.path} className="flex flex-col">
          <button
            onClick={() => toggleDir(node.path)}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            className="w-full py-1 pr-3 flex items-center gap-1.5 text-[11px] font-mono text-slate-350 hover:bg-slate-800/60 transition-colors text-left group select-none cursor-pointer"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-slate-500 group-hover:text-slate-300 transition-colors" />
            ) : (
              <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-slate-300 transition-colors" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-3.5 h-3.5 text-blue-400/80 flex-shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-blue-400/80 flex-shrink-0" />
            )}
            <span className="truncate group-hover:text-white transition-colors">{node.name}</span>
          </button>
          {isExpanded && node.children && (
            <div className="flex flex-col">{node.children.map((child) => renderFileNode(child, depth + 1))}</div>
          )}
        </div>
      );
    }

    const isSelected = selectedFile === node.path;
    const isOutflow = activeStreamingFile === node.path && agentActivityState === 'synthesizing_outflow';
    const isInflow =
      pipelineStatus === 'Active' &&
      agentActivityState === 'reading_inflow' &&
      (STAGE_INFLOW_FILES[currentStage] || []).includes(node.path);
    const isTargetPreparing = activeStreamingFile === node.path && agentActivityState === 'reading_inflow';
    const isCoderDone = (coderFileProgress.completedFiles || []).some(
      (cf) => cf === node.path || normalizeFilePath(cf) === node.path
    );

    return (
      <button
        key={node.path}
        onClick={() => onSelectFile(node.path)}
        style={{ paddingLeft: `${depth * 12 + 20}px` }}
        className={`w-full py-1 pr-3 flex items-center justify-between text-[11px] font-mono hover:bg-slate-800/60 transition-colors text-left group cursor-pointer ${
          isSelected ? 'bg-slate-800 text-electric-indigo font-semibold border-r-2 border-electric-indigo' : 'text-slate-400'
        }`}
      >
        <div className="flex items-center gap-1.5 truncate">
          {getFileIcon(node.name)}
          <span className={`truncate group-hover:text-slate-200 transition-colors ${isSelected ? 'text-electric-indigo' : ''}`}>
            {node.name}
          </span>
        </div>
        {isOutflow && (
          <span className="flex items-center gap-1 text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1 py-0.2 rounded animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
            {currentStage === 'Coder' && coderFileProgress.fileIndex && coderFileProgress.totalFiles
              ? `CODING (${coderFileProgress.fileIndex}/${coderFileProgress.totalFiles})`
              : 'OUTFLOW'}
          </span>
        )}
        {!isOutflow && isTargetPreparing && (
          <span className="flex items-center gap-1 text-[9px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-1 py-0.2 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
            {currentStage === 'Coder' && coderFileProgress.fileIndex && coderFileProgress.totalFiles
              ? `TARGET (${coderFileProgress.fileIndex}/${coderFileProgress.totalFiles})`
              : 'TARGET'}
          </span>
        )}
        {!isOutflow && !isTargetPreparing && isCoderDone && (
          <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1 py-0.2 rounded">
            <span>✓</span>
            DONE
          </span>
        )}
        {isInflow && (
          <span className="flex items-center gap-1 text-[9px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/30 px-1 py-0.2 rounded animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping"></span>
            INFLOW
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="w-48 bg-slate-900 border-r border-slate-700 flex flex-col overflow-y-auto flex-shrink-0">
        <div className="p-2 border-b border-slate-805 text-[10px] font-mono font-bold text-slate-400 flex justify-between items-center select-none">
          <span>FILE EXPLORER</span>
          {files.length > 0 && conversationId && (
            <a
              href={`/api/conversations/${conversationId}/download`}
              download
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
              title="Download Project ZIP"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
        {files.length === 0 ? (
          <div className="p-4 text-[10px] text-slate-500">No files generated yet.</div>
        ) : (
          <div className="py-2 flex flex-col gap-0.5">
            <div className="px-3 py-1.5 text-[10px] font-mono font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wide border-b border-slate-800 mb-1 select-none">
              <Database className="w-3 h-3 text-electric-indigo" />
              <span className="truncate">{activeTitle || 'project-root'}</span>
            </div>
            {buildFileTree(files).children?.map((child) => renderFileNode(child, 0))}
          </div>
        )}
      </div>

      <div className="flex-1 h-full overflow-hidden flex flex-col bg-slate-950">
        {selectedFile && (
          <div className="p-2 border-b border-slate-800 text-[11px] font-mono text-slate-400 bg-slate-950 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Active:</span>
              <span className="text-slate-200 font-semibold">{selectedFile}</span>
              {currentStage === 'Coder' && (selectedFile === coderFileProgress.currentFile || selectedFile === activeStreamingFile) && (
                <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-[9.5px] text-emerald-400 font-bold flex items-center gap-1">
                  💻 Current Coder Target
                  {coderFileProgress.fileIndex && coderFileProgress.totalFiles && (
                    <span className="text-emerald-300">
                      ({coderFileProgress.fileIndex} of {coderFileProgress.totalFiles})
                    </span>
                  )}
                </span>
              )}
            </div>
            {activeStreamingFile === selectedFile && agentActivityState === 'synthesizing_outflow' ? (
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                {currentStage === 'Coder' ? '💻 CODER LIVE STREAMING...' : 'LIVE OUTFLOW GENERATING...'}
              </div>
            ) : activeStreamingFile && activeStreamingFile !== selectedFile && agentActivityState === 'synthesizing_outflow' ? (
              <button
                onClick={() => onSelectFile(activeStreamingFile)}
                className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 px-2 py-0.5 rounded cursor-pointer animate-pulse transition-colors"
                title="Click to view live generated file"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                <span>⚡ View Live Outflow ({activeStreamingFile})</span>
              </button>
            ) : (
              pipelineStatus === 'Active' &&
              agentActivityState === 'reading_inflow' && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-sky-400 bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
                  <span className="font-bold">{currentStage} READING INFLOW:</span>
                  <span className="text-slate-300 font-normal truncate max-w-[300px]">{inflowDetail}</span>
                </div>
              )
            )}
          </div>
        )}
        <div className="flex-1 w-full h-full overflow-hidden">
          <Editor
            height="100%"
            theme="vs-dark"
            language={selectedFile ? getEditorLanguage(selectedFile) : 'typescript'}
            value={fileContent}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 12,
              fontFamily: 'JetBrains Mono',
              domReadOnly: true,
              wordWrap: 'on',
              scrollBeyondLastLine: false,
            }}
          />
        </div>
      </div>
    </div>
  );
}
