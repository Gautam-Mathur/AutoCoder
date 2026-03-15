import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Eye, Code, Maximize2, Minimize2, ExternalLink, RefreshCw, Monitor, Smartphone, Tablet, ChevronRight, ChevronDown, Folder, FolderOpen, FileCode, Bug, AlertCircle, CheckCircle2, Lightbulb, BookOpen, Wrench, Zap, Sparkles, Brain, Rocket, TestTube, Play, Download, HelpCircle, Shield, XCircle, AlertTriangle, GitBranch, MonitorOff } from "lucide-react";
import { downloadProjectAsZip } from "@/lib/code-runner/zip-export";
import { getPreWarmStatus, subscribePreWarmStatus, PreWarmStatusValue } from "@/lib/code-runner/webcontainer.ts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { IntelligencePanel } from "@/components/IntelligencePanel";
import { DeploymentPanel } from "@/components/deployment-panel";
import { ErrorFixerPanel } from "@/components/error-fixer-panel";
import { FlowchartPanel } from "@/components/flowchart-panel";
import { AutoRunPreview } from "@/components/auto-run-preview";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SiHtml5, SiJavascript, SiTypescript, SiReact, SiPython } from "react-icons/si";
import type { ProjectFile } from "@shared/schema";
import { checkErrors, recordCodeChange, getDebugStats, CodeError, quickTestAndFix, tryFixRuntimeError } from "@/lib/code-generator/engine";
import { analyzeAndAutoFix } from "@/lib/code-runner/structural-fixer";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AutoFixLog {
  timestamp: number;
  fileName: string;
  fixes: string[];
}

interface PreviewPanelProps {
  conversationId: number | null;
  onRequestFix?: (error: string, code: string) => void;
  onRegenerateFile?: (filePath: string) => void;
}

interface RuntimeError {
  message: string;
  source?: string;
  line?: number;
  timestamp: number;
}

type DeviceMode = "desktop" | "tablet" | "mobile";

const deviceSizes: Record<DeviceMode, { width: string; height: string }> = {
  desktop: { width: "100%", height: "100%" },
  tablet: { width: "768px", height: "100%" },
  mobile: { width: "375px", height: "100%" },
};

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
  content?: string;
  language?: string;
}

function buildFileTree(files: ProjectFile[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split("/");
    let currentLevel = root;
    let currentPath = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLast = i === parts.length - 1;

      let existing = currentLevel.find((n) => n.name === part);

      if (!existing) {
        existing = {
          name: part,
          path: currentPath,
          isFolder: !isLast,
          children: [],
          ...(isLast ? { content: file.content, language: file.language } : {}),
        };
        currentLevel.push(existing);
      }

      if (!isLast) {
        currentLevel = existing.children;
      }
    }
  }

  const sortTree = (nodes: TreeNode[]): TreeNode[] => {
    return nodes
      .sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.name.localeCompare(b.name);
      })
      .map((node) => ({
        ...node,
        children: sortTree(node.children),
      }));
  };

  return sortTree(root);
}

function FileTreeNode({
  node,
  activeFile,
  onSelectFile,
  onRegenerateFile,
  depth = 0,
}: {
  node: TreeNode;
  activeFile: string;
  onSelectFile: (path: string) => void;
  onRegenerateFile?: (path: string) => void;
  depth?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);

  const getFileIcon = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext === "html") return <SiHtml5 className="w-3 h-3 text-orange-500" />;
    if (ext === "css") return <SiHtml5 className="w-3 h-3 text-blue-500" />;
    if (ext === "js") return <SiJavascript className="w-3 h-3 text-yellow-500" />;
    if (ext === "jsx") return <SiReact className="w-3 h-3 text-cyan-500" />;
    if (ext === "ts") return <SiTypescript className="w-3 h-3 text-blue-600" />;
    if (ext === "tsx") return <SiReact className="w-3 h-3 text-cyan-500" />;
    if (ext === "py") return <SiPython className="w-3 h-3 text-yellow-500" />;
    return <FileCode className="w-3 h-3 text-muted-foreground" />;
  };

  if (node.isFolder) {
    return (
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-left px-2 py-1 rounded text-xs flex items-center gap-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3 shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 shrink-0" />
          )}
          {isExpanded ? (
            <FolderOpen className="w-3.5 h-3.5 text-primary shrink-0" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-primary shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {isExpanded && (
          <div>
            {node.children.map((child) => (
              <FileTreeNode
                key={child.path}
                node={child}
                activeFile={activeFile}
                onSelectFile={onSelectFile}
                onRegenerateFile={onRegenerateFile}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="group/file flex items-center">
      <button
        onClick={() => onSelectFile(node.path)}
        className={`flex-1 text-left px-2 py-1 rounded text-xs flex items-center gap-1.5 transition-colors ${
          activeFile === node.path
            ? "bg-primary/20 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
        style={{ paddingLeft: `${depth * 12 + 20}px` }}
        data-testid={`filetree-${node.path.replace(/\//g, "-")}`}
      >
        {getFileIcon(node.name)}
        <span className="truncate">{node.name}</span>
      </button>
      {onRegenerateFile && (
        <button
          onClick={(e) => { e.stopPropagation(); onRegenerateFile(node.path); }}
          className="opacity-0 group-hover/file:opacity-100 transition-opacity p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground mr-1"
          title={`Regenerate ${node.name}`}
          data-testid={`button-regenerate-${node.path.replace(/\//g, "-")}`}
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// Auto-Test Section Component
function WebContainerFallbackPanel({ onDownload }: { onDownload: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center bg-background">
      <div className="rounded-full bg-muted p-6">
        <MonitorOff className="h-12 w-12 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">In-Browser Preview Unavailable</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Your browser environment doesn't support the high-performance runtime required for live previews (Cross-Origin Isolation is disabled).
        </p>
      </div>
      
      <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
        <Button
          onClick={() => window.open(window.location.href, '_blank')}
          className="w-full gap-2"
          size="lg"
          data-testid="button-open-new-tab"
        >
          <ExternalLink className="h-4 w-4" />
          Open in New Tab (Enable Preview)
        </Button>

        <Button onClick={onDownload} variant="outline" className="w-full gap-2" size="lg" data-testid="button-download-zip-fallback">
          <Download className="h-4 w-4" />
          Download Project (ZIP)
        </Button>
        
        <div className="text-left p-4 rounded-lg border bg-muted/50 text-xs space-y-2">
          <p className="font-medium text-muted-foreground">Opening in a new tab enables the live preview. Or run locally:</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Extract the downloaded ZIP</li>
            <li>Run <code className="bg-muted px-1 rounded">npm install</code></li>
            <li>Run <code className="bg-muted px-1 rounded">npm run dev</code></li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function AutoTestSection({
  code,
  onCodeFixed
}: {
  code: string;
  onCodeFixed: (fixedCode: string, fixes: string[]) => void;
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<{ fixes: string[]; report: string } | null>(null);

  const runAutoTest = useCallback(() => {
    if (!code) return;

    setIsRunning(true);

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      try {
        const result = quickTestAndFix(code);
        setLastResult(result);

        if (result.fixes.length > 0) {
          onCodeFixed(result.code, result.fixes);
        }
      } catch (e) {
        console.error('Auto-test error:', e);
      }
      setIsRunning(false);
    }, 100);
  }, [code, onCodeFixed]);

  if (!code) {
    return null;
  }

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Self-Test & Auto-Fix</span>
        </div>
        <Button
          size="sm"
          variant="default"
          className="h-7 text-xs gap-1"
          onClick={runAutoTest}
          disabled={isRunning}
          data-testid="button-auto-test"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Bug className="w-3 h-3" />
              Test & Fix Code
            </>
          )}
        </Button>
      </div>

      {lastResult && (
        <div className="text-xs space-y-1">
          {lastResult.fixes.length > 0 ? (
            <>
              <div className="text-green-600 dark:text-green-400 font-medium">
                ✓ Auto-fixed {lastResult.fixes.length} issue{lastResult.fixes.length > 1 ? 's' : ''}:
              </div>
              <ul className="list-disc list-inside text-muted-foreground pl-1">
                {lastResult.fixes.slice(0, 5).map((fix, i) => (
                  <li key={i}>{fix}</li>
                ))}
              </ul>
            </>
          ) : (
            <div className="text-muted-foreground">
              No auto-fixable issues found. Code looks good!
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-2">
        Automatically tests code and fixes common issues like missing doctype, viewport, accessibility, and security problems.
      </p>
    </div>
  );
}

export function PreviewPanel({ conversationId, onRequestFix, onRegenerateFile }: PreviewPanelProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "code" | "debug" | "intel" | "deploy" | "test" | "flow">("preview");
  const [activeFile, setActiveFile] = useState<string>("index.html");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [refreshKey, setRefreshKey] = useState(0);
  const [codeErrors, setCodeErrors] = useState<CodeError[]>([]);
  const [runtimeErrors, setRuntimeErrors] = useState<RuntimeError[]>([]);
  const [debugStats, setDebugStats] = useState({ errorsFound: 0, fixesLearned: 0, changesObserved: 0 });
  const [previousCode, setPreviousCode] = useState<Map<string, string>>(new Map());
  const [autoFixLogs, setAutoFixLogs] = useState<AutoFixLog[]>([]);
  const [fixedFileHashes, setFixedFileHashes] = useState<Set<string>>(new Set());
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [wcStatus, setWcStatus] = useState<PreWarmStatusValue>(getPreWarmStatus());
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [serverTestResults, setServerTestResults] = useState<any>(null);

  useEffect(() => {
    return subscribePreWarmStatus((status) => setWcStatus(status));
  }, []);

  const showFallback = wcStatus === 'unsupported' || (typeof window !== 'undefined' && !window.crossOriginIsolated);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { data: files = [] } = useQuery<ProjectFile[]>({
    queryKey: ["/api/conversations", conversationId, "files"],
    enabled: !!conversationId,
    refetchInterval: 2000,
  });

  const updateFileMutation = useMutation({
    mutationFn: async ({ fileId, content }: { fileId: number; content: string }) => {
      await apiRequest("PUT", `/api/files/${fileId}`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "files"] });
    }
  });

  const fileTree = useMemo(() => buildFileTree(files), [files]);

  useEffect(() => {
    if (files.length > 0 && !files.find((f) => f.path === activeFile)) {
      const htmlFile = files.find((f) => f.path.endsWith(".html"));
      if (htmlFile) {
        setActiveFile(htmlFile.path);
      } else {
        setActiveFile(files[0].path);
      }
    }
  }, [files, activeFile]);

  // Listen for runtime errors from iframe AND auto-fix them
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'PREVIEW_ERROR') {
        const error: RuntimeError = {
          message: event.data.message,
          source: event.data.source,
          line: event.data.line,
          timestamp: Date.now()
        };

        setRuntimeErrors(prev => {
          if (prev.some(e => e.message === error.message)) return prev;
          return [...prev.slice(-9), error];
        });

        // ========== AUTO-FIX RUNTIME ERRORS ==========
        // Try to fix the runtime error automatically
        const htmlFile = files.find(f => f.path.endsWith('.html'));
        if (htmlFile && !isAutoFixing) {
          const runtimeFix = tryFixRuntimeError(htmlFile.content, error.message);
          if (runtimeFix.fixed) {
            setIsAutoFixing(true);
            try {
              await updateFileMutation.mutateAsync({
                fileId: htmlFile.id,
                content: runtimeFix.code
              });
              setAutoFixLogs(prev => [...prev.slice(-9), {
                timestamp: Date.now(),
                fileName: htmlFile.path,
                fixes: [`Runtime fix: ${runtimeFix.fixDescription}`]
              }]);
              setRefreshKey(prev => prev + 1);
            } catch (e) {
              console.error('Runtime fix failed:', e);
            }
            setIsAutoFixing(false);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [files, isAutoFixing]);

  // Clear runtime errors on refresh
  useEffect(() => {
    setRuntimeErrors([]);
  }, [refreshKey]);

  // Live code observation - detect changes and errors
  useEffect(() => {
    if (files.length === 0) return;

    // Skip detailed error analysis for complex projects (TypeScript, many files)
    const hasTypeScript = files.some(f => f.path.endsWith('.ts') || f.path.endsWith('.tsx'));
    const hasPackageJson = files.some(f => f.path.endsWith('package.json'));
    const isComplexProject = hasPackageJson && (hasTypeScript || files.length > 10);

    if (isComplexProject) {
      setCodeErrors([]);
      setDebugStats(getDebugStats());
      return;
    }

    // Analyze simple files for errors (HTML, CSS, basic JS)
    const allErrors: CodeError[] = [];
    const simpleFiles = files.filter(f =>
      f.path.endsWith('.html') ||
      f.path.endsWith('.css') ||
      (f.path.endsWith('.js') && !f.path.includes('config'))
    );

    simpleFiles.forEach(file => {
      const errors = checkErrors(file.content);
      errors.slice(0, 5).forEach(e => {
        allErrors.push({ ...e, code: `${file.path}: ${e.code.substring(0, 50)}` });
      });

      // Check for code changes (learning)
      const prevContent = previousCode.get(file.path);
      if (prevContent && prevContent !== file.content) {
        const hadErrors = checkErrors(prevContent).length > 0;
        recordCodeChange(prevContent, file.content, hadErrors);
      }
    });

    setCodeErrors(allErrors.slice(0, 20));
    setDebugStats(getDebugStats());

    // Update previous code state
    const newPrevCode = new Map<string, string>();
    files.forEach(f => newPrevCode.set(f.path, f.content));
    setPreviousCode(newPrevCode);
  }, [files]);

  // AUTOMATIC CODE FIXING - runs when new code is detected
  useEffect(() => {
    if (files.length === 0 || isAutoFixing) return;

    const runAutoFix = async () => {
      const filesToFix: { file: ProjectFile; result: ReturnType<typeof quickTestAndFix> }[] = [];

      for (const file of files) {
        // Only fix HTML, JS, CSS files
        if (!file.path.match(/\.(html|js|jsx|ts|tsx|css)$/i)) continue;

        // Skip entry files - they are simple bootstrap files that don't need fixing
        const baseName = file.path.split('/').pop()?.toLowerCase() || '';
        if (baseName === 'main.jsx' || baseName === 'main.tsx' || baseName === 'index.jsx' || baseName === 'index.tsx') continue;

        // Skip config files
        if (baseName.includes('config')) continue;

        // Create a hash of the content to avoid re-fixing
        const contentHash = `${file.id}-${file.content.length}-${file.content.slice(0, 100)}`;
        if (fixedFileHashes.has(contentHash)) continue;

        // Run auto-fix
        const result = quickTestAndFix(file.content);

        if (result.fixes.length > 0) {
          filesToFix.push({ file, result });
        }

        // Mark as processed (even if no fixes)
        setFixedFileHashes(prev => new Set(Array.from(prev).concat(contentHash)));
      }

      // Apply fixes
      if (filesToFix.length > 0) {
        setIsAutoFixing(true);

        for (const { file, result } of filesToFix) {
          try {
            await updateFileMutation.mutateAsync({
              fileId: file.id,
              content: result.code
            });

            // Log the fix
            setAutoFixLogs(prev => [...prev.slice(-9), {
              timestamp: Date.now(),
              fileName: file.path,
              fixes: result.fixes
            }]);
          } catch (e) {
            console.error('Auto-fix failed for', file.path, e);
          }
        }

        setIsAutoFixing(false);
        setRefreshKey(prev => prev + 1); // Refresh preview
      }
    };

    // Small delay to batch rapid changes
    const timer = setTimeout(runAutoFix, 500);
    return () => clearTimeout(timer);
  }, [files, fixedFileHashes, isAutoFixing]);

  const [structuralFixStableHash, setStructuralFixStableHash] = useState<string | null>(null);
  const structuralFixAttemptsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (files.length === 0 || isAutoFixing || !conversationId) return;

    const filesHash = files.map(f => `${f.path}:${(f.content || '').length}`).sort().join("|");
    if (filesHash === structuralFixStableHash) return;

    const attempts = structuralFixAttemptsRef.current.get(filesHash) || 0;
    if (attempts >= 2) return;

    const runStructuralFix = async () => {
      const analysis = analyzeAndAutoFix(files as any);
      if (analysis.fixes.length === 0) {
        setStructuralFixStableHash(filesHash);
        return;
      }

      structuralFixAttemptsRef.current.set(filesHash, attempts + 1);
      setIsAutoFixing(true);
      try {
        for (const fix of analysis.fixes) {
          if (fix.fileId > 0) {
            await updateFileMutation.mutateAsync({ fileId: fix.fileId, content: fix.newContent });
          } else {
            const ext = fix.filePath.split(".").pop() || "text";
            const langMap: Record<string, string> = { ts: "typescript", tsx: "typescriptreact", js: "javascript", jsx: "javascriptreact", css: "css", json: "json" };
            await apiRequest("POST", `/api/conversations/${conversationId}/files`, {
              path: fix.filePath,
              content: fix.newContent,
              language: langMap[ext] || ext,
            });
          }
          setAutoFixLogs(prev => [...prev.slice(-9), {
            timestamp: Date.now(),
            fileName: fix.filePath,
            fixes: [fix.description],
          }]);
        }
        setRefreshKey(prev => prev + 1);
        queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "files"] });
      } catch (e) {
        console.error("Structural auto-fix failed:", e);
        setStructuralFixStableHash(filesHash);
      } finally {
        setIsAutoFixing(false);
      }
    };

    const timer = setTimeout(runStructuralFix, 800);
    return () => clearTimeout(timer);
  }, [files, isAutoFixing, conversationId, structuralFixStableHash]);

  // Get all code as string for fix requests
  const getAllCode = useCallback(() => {
    return files.map(f => `// ${f.path}\n${f.content}`).join('\n\n');
  }, [files]);

  // Handle fix request
  const handleFixRequest = useCallback((errorMessage: string) => {
    if (onRequestFix) {
      onRequestFix(errorMessage, getAllCode());
    }
  }, [onRequestFix, getAllCode]);

  // Transform ES6 module code to browser-compatible code
  const transformJsForBrowser = useCallback((code: string, allJsCode: string): string => {
    let transformed = code;

    // Remove all types of import statements (single-line and multiline)
    // Handle: import X from 'y', import { X } from 'y', import * as X from 'y', import 'y'
    transformed = transformed.replace(/^\s*import\s+type\s+.*?;?\s*$/gm, ''); // Remove type-only imports
    transformed = transformed.replace(/^\s*import\s*\{[\s\S]*?\}\s*from\s*['"][^'"]+['"];?\s*/gm, ''); // Named imports (multiline)
    transformed = transformed.replace(/^\s*import\s+\*\s+as\s+\w+\s+from\s+['"][^'"]+['"];?\s*$/gm, ''); // Namespace imports
    transformed = transformed.replace(/^\s*import\s+\w+\s*,?\s*\{[\s\S]*?\}\s*from\s+['"][^'"]+['"];?\s*/gm, ''); // Default + named
    transformed = transformed.replace(/^\s*import\s+\w+\s+from\s+['"][^'"]+['"];?\s*$/gm, ''); // Default import
    transformed = transformed.replace(/^\s*import\s+['"][^'"]+['"];?\s*$/gm, ''); // Side-effect import

    // Transform export default to window assignment for global access
    // Handle: export default function X, export default class X, export default X
    transformed = transformed.replace(/^\s*export\s+default\s+function\s+(\w+)/gm, 'function $1'); // Keep function, add to window later
    transformed = transformed.replace(/^\s*export\s+default\s+class\s+(\w+)/gm, 'class $1');
    transformed = transformed.replace(/^\s*export\s+default\s+(\w+)\s*;?\s*$/gm, 'window.$1 = $1;');
    transformed = transformed.replace(/^\s*export\s+default\s+/gm, 'window.__default = ');

    // Transform named exports to keep declarations
    transformed = transformed.replace(/^\s*export\s+(const|let|var|function|class)\s+/gm, '$1 ');
    transformed = transformed.replace(/^\s*export\s+\{[\s\S]*?\};?\s*$/gm, ''); // Remove export lists
    transformed = transformed.replace(/^\s*export\s+\*\s+from\s+['"][^'"]+['"];?\s*$/gm, ''); // Remove re-exports

    return transformed;
  }, []);

  // Detect if code is server-side only (can't run in browser)
  const isServerSideOnly = useMemo(() => {
    const allCode = files.map(f => f.content).join('\n');
    const serverPatterns = [
      'require("express")', "require('express')",
      'require("sqlite3")', "require('sqlite3')",
      'require("pg")', "require('pg')",
      'require("mongodb")', "require('mongodb')",
      'require("http")', "require('http')",
      'require("fs")', "require('fs')",
      'require("path")', "require('path')",
      'app.listen(',
      'createServer(',
      'process.env.',
      'from flask import',
      'import express',
      'import sqlite3',
    ];
    return serverPatterns.some(pattern => allCode.includes(pattern));
  }, [files]);

  // Detect if this is a complex React/TypeScript app that should use Sandpack
  const isComplexReactApp = useMemo(() => {
    if (isServerSideOnly) return false;

    // Check for TSX/JSX files
    const tsxFiles = files.filter((f) =>
      f.path.toLowerCase().endsWith(".tsx") ||
      f.path.toLowerCase().endsWith(".jsx") ||
      f.language === "tsx" ||
      f.language === "jsx"
    );

    if (tsxFiles.length === 0) return false;

    // Check if there's no HTML file (React projects don't need one)
    const hasHtmlFile = files.some((f) =>
      f.path.toLowerCase().endsWith(".html") || f.language === "html"
    );

    // Find entry point file - App, main, or index
    const entryFile = tsxFiles.find((f) =>
      f.path.toLowerCase().includes("app.tsx") ||
      f.path.toLowerCase().includes("app.jsx") ||
      f.path.toLowerCase().includes("main.tsx") ||
      f.path.toLowerCase().includes("main.jsx") ||
      f.path.toLowerCase().includes("index.tsx") ||
      f.path.toLowerCase().includes("index.jsx")
    );

    // If we have TSX files but no HTML, it's a React project that needs Sandpack
    if (tsxFiles.length > 0 && !hasHtmlFile) return true;

    // If we have an entry file, check complexity
    if (entryFile) {
      const componentRefs = entryFile.content.match(/<[A-Z][A-Za-z]+/g) || [];
      // Complex if: more than 5 component references OR more than 3 tsx files
      if (componentRefs.length > 5 || tsxFiles.length > 3) return true;
    }

    return false;
  }, [files, isServerSideOnly]);

  const combinedPreview = useMemo(() => {
    if (files.length === 0) return "";

    const htmlFile =
      files.find((f) => f.path.toLowerCase().endsWith("index.html")) ||
      files.find((f) => f.path.toLowerCase().endsWith(".html")) ||
      files.find((f) => f.language === "html");
    const cssFiles = files.filter((f) => f.path.toLowerCase().endsWith(".css") || f.language === "css");
    // Include .js, .jsx, .tsx files for JavaScript/React code
    const jsFiles = files.filter((f) =>
      f.path.toLowerCase().endsWith(".js") ||
      f.path.toLowerCase().endsWith(".jsx") ||
      f.path.toLowerCase().endsWith(".tsx") ||
      f.language === "javascript" ||
      f.language === "jsx" ||
      f.language === "tsx"
    );

    if (!htmlFile) {
      // Check for TSX/JSX React files
      const tsxFiles = files.filter((f) =>
        f.path.toLowerCase().endsWith(".tsx") ||
        f.path.toLowerCase().endsWith(".jsx") ||
        f.language === "tsx" ||
        f.language === "jsx"
      );

      // Find main App component
      const appFile = tsxFiles.find((f) =>
        f.path.toLowerCase().includes("app.tsx") ||
        f.path.toLowerCase().includes("app.jsx") ||
        f.path.toLowerCase().includes("main.tsx") ||
        f.path.toLowerCase().includes("index.tsx")
      ) || tsxFiles[0];

      if (appFile && !isServerSideOnly) {
        // Extract component code and create a React preview
        let componentCode = appFile.content;

        // Remove all import statements entirely
        componentCode = componentCode
          .replace(/^import\s+.*?['"][^'"]+['"];?\s*$/gm, '')
          .replace(/^import\s+\{[^}]*\}\s+from\s+['"][^'"]+['"];?\s*$/gm, '')
          .replace(/^import\s+type\s+.*?;?\s*$/gm, '')
          // Remove TypeScript types
          .replace(/:\s*React\.\w+(<[^>]+>)?/g, '')
          .replace(/:\s*(string|number|boolean|any|void|null|undefined|FC|FunctionComponent)(\[\])?/g, '')
          .replace(/:\s*\{[^}]+\}/g, '')
          .replace(/interface\s+\w+\s*\{[^}]*\}/g, '')
          .replace(/type\s+\w+\s*=\s*[^;]+;/g, '')
          .replace(/as\s+\w+(\[\])?/g, '')
          .replace(/<\w+>/g, '') // Remove generic type parameters
          // Handle exports
          .replace(/export\s+default\s+/g, 'const __App__ = ')
          .replace(/export\s+function\s+(\w+)/g, 'function $1')
          .replace(/export\s+const\s+/g, 'const ');

        // Find the main component name
        const componentMatch = componentCode.match(/(?:function|const)\s+(__App__|App|Main|Home|Page)\b/);
        const componentName = componentMatch ? componentMatch[1] : '__App__';

        // Get CSS files for styling
        const cssContent = cssFiles.map((f) => f.content).join("\n");

        // Check if code has too many undefined component references (complex app)
        const componentRefs = componentCode.match(/<[A-Z][A-Za-z]+/g) || [];
        const isComplexApp = componentRefs.length > 5;

        if (isComplexApp) {
          // Show info card for complex multi-file apps
          return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React Project</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #e0e0e0; padding: 40px; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .container { max-width: 600px; text-align: center; }
    h2 { color: #61dafb; margin-bottom: 16px; }
    p { line-height: 1.6; color: #94a3b8; margin-bottom: 12px; }
    .icon { font-size: 64px; margin-bottom: 24px; }
    .files { background: #0a0a1a; border: 1px solid #333; padding: 16px; border-radius: 8px; margin-top: 24px; text-align: left; }
    .files h4 { color: #61dafb; margin: 0 0 12px 0; font-size: 14px; }
    .file-list { font-family: monospace; font-size: 12px; color: #4ade80; }
    .file-list div { padding: 2px 0; }
    .count { color: #f59e0b; font-weight: bold; }
    .tip { background: #1e293b; border-left: 3px solid #61dafb; padding: 12px; margin-top: 16px; text-align: left; }
    .tip code { background: #334155; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">⚛️</div>
    <h2>React + TypeScript Project Generated!</h2>
    <p>Created <span class="count">${files.length} files</span> for a complete full-stack application.</p>
    <div class="files">
      <h4>Generated Components (${tsxFiles.length} files):</h4>
      <div class="file-list">
        ${tsxFiles.slice(0, 8).map(f => `<div>📄 ${f.path}</div>`).join('')}
        ${tsxFiles.length > 8 ? `<div style="color:#94a3b8">...and ${tsxFiles.length - 8} more components</div>` : ''}
      </div>
    </div>
    <div class="tip">
      <strong>To run this project:</strong><br/>
      1. Export/download the files<br/>
      2. Run <code>npm install</code><br/>
      3. Run <code>npm run dev</code>
    </div>
  </div>
</body>
</html>`;
        }

        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React Preview</title>
  <style>
    ${cssContent}
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
    #load-status { padding: 40px; text-align: center; color: #666; font-family: system-ui; }
    .btn { padding: 8px 16px; margin: 4px; border-radius: 6px; cursor: pointer; border: none; }
    .btn-primary { background: #3b82f6; color: white; }
    .btn-primary:hover { background: #2563eb; }
    .btn-secondary { background: #e5e7eb; color: #374151; }
    .btn-secondary:hover { background: #d1d5db; }
  </style>
</head>
<body>
  <div id="root"><div id="load-status">Loading preview...</div></div>
  <script>
    var loadStatus = document.getElementById('load-status');
    var scriptsLoaded = { react: false, 'react-dom': false, babel: false };
    var loadAttempts = { react: 0, 'react-dom': 0, babel: 0 };
    var SCRIPT_SOURCES = {
      react: ['/api/preview-scripts/react', 'https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js', 'https://unpkg.com/react@18/umd/react.production.min.js'],
      'react-dom': ['/api/preview-scripts/react-dom', 'https://cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.production.min.js', 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js'],
      babel: ['/api/preview-scripts/babel', 'https://cdn.jsdelivr.net/npm/@babel/standalone@7/babel.min.js', 'https://unpkg.com/@babel/standalone@7/babel.min.js']
    };
    function updateStatus(msg) { if (loadStatus) loadStatus.textContent = msg; }
    function showFallback(error) {
      document.getElementById('root').innerHTML = '<div style="padding:24px;font-family:system-ui;"><div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;"><strong style="color:#92400e;">Preview Fallback</strong><p style="color:#78350f;margin:8px 0 0 0;font-size:14px;">' + error + '</p></div></div>';
    }
    function loadScript(name, callback) {
      var sources = SCRIPT_SOURCES[name];
      var attempt = loadAttempts[name];
      if (attempt >= sources.length) { showFallback('Failed to load ' + name); return; }
      var src = sources[attempt];
      updateStatus('Loading ' + name + ' (' + (attempt + 1) + '/' + sources.length + ')...');
      var script = document.createElement('script');
      script.src = src;
      script.crossOrigin = 'anonymous';
      script.onload = function() { scriptsLoaded[name] = true; callback && callback(); };
      script.onerror = function() { loadAttempts[name]++; loadScript(name, callback); };
      document.head.appendChild(script);
    }
    updateStatus('Loading React...');
    loadScript('react', function() {
      updateStatus('Loading ReactDOM...');
      loadScript('react-dom', function() {
        updateStatus('Loading Babel...');
        loadScript('babel', function() {
          updateStatus('Transpiling...');
          setTimeout(function() {
            try { if (window.Babel && window.Babel.transformScriptTags) { window.Babel.transformScriptTags(); } }
            catch (e) { showFallback('Babel error: ' + e.message); }
          }, 50);
        });
      });
    });
  </script>
  <script type="text/babel" data-presets="react,typescript">
    const { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext } = React;

    // Mock common imports
    const Link = ({to, href, children, ...props}) => React.createElement('a', {href: to || href || '#', ...props}, children);
    const Route = ({path, component: C}) => React.createElement(C || 'div');
    const Switch = ({children}) => React.createElement('div', null, children);
    const useLocation = () => [window.location.pathname, (p) => {}];
    const useQuery = () => ({ data: [], isLoading: false, error: null });
    const useMutation = () => ({ mutate: () => {}, isPending: false });
    const QueryClient = function() { return {}; };
    const QueryClientProvider = ({children}) => children;
    const Button = ({children, variant, size, className, ...props}) => React.createElement('button', {className: \`px-4 py-2 rounded \${variant === 'outline' ? 'border border-gray-300' : 'bg-blue-500 text-white hover:bg-blue-600'} \${className || ''}\`, ...props}, children);
    const Card = ({children, className, ...props}) => React.createElement('div', {className: \`bg-white rounded-lg shadow p-4 \${className || ''}\`, ...props}, children);
    const Input = (props) => React.createElement('input', {className: 'border rounded px-3 py-2 w-full', ...props});
    const Badge = ({children, variant, className}) => React.createElement('span', {className: \`inline-block px-2 py-1 rounded text-sm bg-gray-100 \${className || ''}\`}, children);
    const Layout = ({children}) => React.createElement('div', {className: 'min-h-screen bg-gray-50'}, children);

    // Mock page components
    const HomePage = () => React.createElement('div', {className: 'p-8'}, React.createElement('h1', {className: 'text-2xl font-bold'}, 'Home Page'));
    const DashboardPage = () => React.createElement('div', {className: 'p-8'}, React.createElement('h1', {className: 'text-2xl font-bold'}, 'Dashboard'));
    const LoginPage = () => React.createElement('div', {className: 'p-8'}, React.createElement('h1', {className: 'text-2xl font-bold'}, 'Login'));
    const RegisterPage = () => React.createElement('div', {className: 'p-8'}, React.createElement('h1', {className: 'text-2xl font-bold'}, 'Register'));
    const SettingsPage = () => React.createElement('div', {className: 'p-8'}, React.createElement('h1', {className: 'text-2xl font-bold'}, 'Settings'));
    const NotFoundPage = () => React.createElement('div', {className: 'p-8'}, React.createElement('h1', {className: 'text-2xl font-bold'}, '404 Not Found'));

    // User component code
    ${componentCode}

    // Render
    try {
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(${componentName === '__App__' ? '__App__' : componentName}));
    } catch (e) {
      console.error(e);
      document.getElementById('root').innerHTML = '<div style="padding:20px;background:#fef2f2;color:#b91c1c;border-radius:8px;margin:20px;"><strong>Preview Error:</strong><br/>' + e.message + '<br/><br/><em>This is a complex app - use the Code tab to view files or export to run locally.</em></div>';
    }
  </script>
</body>
</html>`;
      }

      // No HTML file - might be backend-only code
      if (isServerSideOnly) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Server-Side Code</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #1a1a2e; color: #e0e0e0; padding: 40px; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .container { max-width: 500px; text-align: center; }
    h2 { color: #00ff88; margin-bottom: 16px; }
    p { line-height: 1.6; color: #94a3b8; margin-bottom: 12px; }
    .icon { font-size: 48px; margin-bottom: 24px; }
    .tip { background: #0a0a1a; border: 1px solid #333; padding: 16px; border-radius: 8px; margin-top: 24px; text-align: left; }
    .tip h4 { color: #00ff88; margin: 0 0 8px 0; font-size: 14px; }
    .tip code { background: #333; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🖥️</div>
    <h2>Server-Side Application</h2>
    <p>This code needs to run on a server (Node.js, Python, etc.) - it can't be previewed in the browser.</p>
    <div class="tip">
      <h4>To run this code:</h4>
      <p>1. Download the project files using Export</p>
      <p>2. Install dependencies: <code>npm install</code></p>
      <p>3. Start the server: <code>node server.js</code></p>
    </div>
  </div>
</body>
</html>`;
      }

      // Show info for React/TypeScript projects
      if (tsxFiles.length > 0) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React Project</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #e0e0e0; padding: 40px; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .container { max-width: 600px; text-align: center; }
    h2 { color: #61dafb; margin-bottom: 16px; }
    p { line-height: 1.6; color: #94a3b8; margin-bottom: 12px; }
    .icon { font-size: 64px; margin-bottom: 24px; }
    .files { background: #0a0a1a; border: 1px solid #333; padding: 16px; border-radius: 8px; margin-top: 24px; text-align: left; }
    .files h4 { color: #61dafb; margin: 0 0 12px 0; font-size: 14px; }
    .file-list { font-family: monospace; font-size: 12px; color: #4ade80; }
    .file-list div { padding: 2px 0; }
    .count { color: #f59e0b; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">⚛️</div>
    <h2>React + TypeScript Project</h2>
    <p>Generated <span class="count">${files.length} files</span> for a complete React application!</p>
    <p>This project uses React with TypeScript and needs to be built to run.</p>
    <div class="files">
      <h4>Project Files (${tsxFiles.length} components):</h4>
      <div class="file-list">
        ${tsxFiles.slice(0, 10).map(f => `<div>📄 ${f.path}</div>`).join('')}
        ${tsxFiles.length > 10 ? `<div style="color:#94a3b8">...and ${tsxFiles.length - 10} more</div>` : ''}
      </div>
    </div>
  </div>
</body>
</html>`;
      }

      return "";
    }

    let html = htmlFile.content;

    // Strip ALL external script and link references to prevent CORS errors
    // These cannot be loaded in sandboxed iframes with COEP restrictions
    html = html
      // Remove script tags with src attribute (external scripts) - handles any inner content
      .replace(/<script[^>]+src\s*=\s*["'][^"']*["'][^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<script[^>]+src\s*=\s*["'][^"']*["'][^>]*\/>/gi, '')
      // Remove script tags with type="module" (ES module imports fail in sandboxed iframes)
      .replace(/<script[^>]+type\s*=\s*["']module["'][^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<script[^>]+type\s*=\s*["']module["'][^>]*\/>/gi, '')
      // Remove link tags with href (external CSS)
      .replace(/<link[^>]+href\s*=\s*["'][^"']*["'][^>]*\/?>/gi, '');

    if (!html.includes("<!DOCTYPE") && !html.includes("<html")) {
      html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
</head>
<body>
${html}
</body>
</html>`;
    }

    if (cssFiles.length > 0) {
      const combinedCss = cssFiles.map((f) => f.content).join("\n\n");
      const styleTag = `<style>\n${combinedCss}\n</style>`;
      if (html.includes("</head>")) {
        html = html.replace("</head>", `${styleTag}\n</head>`);
      } else if (html.includes("<body")) {
        html = html.replace(/<body[^>]*>/i, (match) => `${styleTag}\n${match}`);
      }
    }

    // Filter out server-side JS files (they can't run in browser)
    const serverJsPatterns = [
      'require("express")', "require('express')",
      'require("sqlite3")', "require('sqlite3')",
      'require("pg")', "require('pg')",
      'require("mongodb")', "require('mongodb')",
      'require("http")', "require('http')",
      'require("fs")', "require('fs')",
      'require("path")', "require('path')",
      'app.listen(',
      'createServer(',
      'module.exports',
    ];
    const browserJsFiles = jsFiles.filter(f => {
      const content = f.content;
      const isServerFile = serverJsPatterns.some(pattern => content.includes(pattern));
      const isNamedServer = f.path.toLowerCase().includes('server') || f.path.toLowerCase() === 'app.js';
      return !isServerFile && !isNamedServer;
    });

    if (browserJsFiles.length > 0) {
      const allJsCode = browserJsFiles.map((f) => f.content).join("\n\n");
      const combinedJs = browserJsFiles.map((f) => transformJsForBrowser(f.content, allJsCode)).join("\n\n");

      // Check if this is React code that needs special handling
      const isReactCode = allJsCode.includes('import React') || allJsCode.includes('from "react"') || allJsCode.includes("from 'react'");

      if (isReactCode) {
        // For React code, add React and ReactDOM via proxy endpoints to avoid CORS/COEP issues
        // Use absolute URLs because srcDoc iframes have about:srcdoc origin
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const reactScript = `
<script src="${baseUrl}/api/preview-scripts/react"></script>
<script src="${baseUrl}/api/preview-scripts/react-dom"></script>
<script src="${baseUrl}/api/preview-scripts/babel"></script>
<script type="text/babel">
// React hooks available globally
const { useState, useEffect, useRef, useCallback, useMemo, useContext, useReducer } = React;

${combinedJs}

// Auto-render React app
(function() {
  try {
    // Ensure root element exists
    let rootEl = document.getElementById('root');
    if (!rootEl) {
      rootEl = document.createElement('div');
      rootEl.id = 'root';
      document.body.appendChild(rootEl);
    }

    // Find the App component (check window, global, or default export)
    const AppComponent = window.App || window.__default || (typeof App !== 'undefined' ? App : null);

    if (AppComponent) {
      ReactDOM.createRoot(rootEl).render(React.createElement(AppComponent));
    } else {
      console.log('No App component found to render');
    }
  } catch (e) {
    console.error('React render error:', e);
  }
})();
</script>`;
        if (html.includes("</body>")) {
          html = html.replace("</body>", `${reactScript}\n</body>`);
        }
      } else {
        const scriptTag = `<script>\n${combinedJs}\n</script>`;
        if (html.includes("</body>")) {
          html = html.replace("</body>", `${scriptTag}\n</body>`);
        }
      }
    }

    // Inject error capturing script
    const errorCaptureScript = `<script>
(function() {
  // Capture all errors and send to parent
  window.onerror = function(message, source, lineno, colno, error) {
    window.parent.postMessage({
      type: 'PREVIEW_ERROR',
      message: message,
      source: source,
      line: lineno,
      column: colno,
      stack: error ? error.stack : null
    }, '*');
    return false;
  };

  // Capture unhandled promise rejections
  window.onunhandledrejection = function(event) {
    window.parent.postMessage({
      type: 'PREVIEW_ERROR',
      message: 'Unhandled Promise Rejection: ' + (event.reason ? event.reason.message || event.reason : 'Unknown'),
      source: 'Promise',
      line: 0
    }, '*');
  };

  // Capture fetch errors
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    return originalFetch.apply(this, args).catch(function(err) {
      window.parent.postMessage({
        type: 'PREVIEW_ERROR',
        message: 'Fetch error: ' + err.message,
        source: args[0],
        line: 0
      }, '*');
      throw err;
    });
  };

  // Capture console errors
  const originalError = console.error;
  console.error = function(...args) {
    window.parent.postMessage({
      type: 'PREVIEW_ERROR',
      message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '),
      source: 'console.error',
      line: 0
    }, '*');
    originalError.apply(console, args);
  };
})();
</script>`;

    // Insert error capture script at the beginning of head
    if (html.includes("<head>")) {
      html = html.replace("<head>", `<head>\n${errorCaptureScript}`);
    } else if (html.includes("<html")) {
      html = html.replace(/<html[^>]*>/i, (match) => `${match}\n<head>${errorCaptureScript}</head>`);
    }

    return html;
  }, [files, refreshKey, transformJsForBrowser, isServerSideOnly]);

  const openInNewTab = () => {
    if (combinedPreview) {
      const blob = new Blob([combinedPreview], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  };

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  const activeFileContent = files.find((f) => f.path === activeFile);

  if (!conversationId) {
    return (
      <div className="flex flex-col h-full bg-muted/30">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-background shadow-sm">
              <Eye className="w-3 h-3" />
              Preview
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground">
              <Code className="w-3 h-3" />
              Code
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          <div className="text-center p-6">
            <Monitor className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium text-foreground mb-2">Your app will appear here!</p>
            <p className="max-w-xs mx-auto">Tell me what you want to build in the chat, and I'll create it for you. You'll see a live preview right here.</p>
          </div>
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col h-full bg-muted/30">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-background shadow-sm">
              <Eye className="w-3 h-3" />
              Preview
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground">
              <Code className="w-3 h-3" />
              Code
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          <div className="text-center p-6">
            <Code className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium text-foreground mb-2">Ready to create something amazing!</p>
            <p className="max-w-xs mx-auto">Just describe what you want in the chat box on the left. For example: "Build me a todo list app" or "Create a landing page for my business"</p>
          </div>
        </div>
      </div>
    );
  }

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
              <button
                onClick={() => setActiveTab("preview")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === "preview" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="tab-preview-fullscreen"
              >
                <Eye className="w-3 h-3" />
                Preview
              </button>
              <button
                onClick={() => setActiveTab("code")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === "code" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="tab-code-fullscreen"
              >
                <Code className="w-3 h-3" />
                Code
              </button>
              <button
                onClick={() => setActiveTab("intel")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === "intel" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="tab-intel-fullscreen"
              >
                <Brain className="w-3 h-3" />
                Intel
              </button>
              <button
                onClick={() => setActiveTab("flow")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === "flow" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="tab-flow-fullscreen"
              >
                <GitBranch className="w-3 h-3" />
                Flow
              </button>
            </div>
            <Badge variant="secondary" className="text-xs">
              {files.length} files
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {showFallback && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-2 mr-2"
                onClick={() => downloadProjectAsZip(files.map(f => ({ path: f.path, content: f.content, language: f.language })), "project")}
                data-testid="button-download-zip-toolbar-fullscreen"
              >
                <Download className="h-4 w-4" />
                Download ZIP
              </Button>
            )}
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDeviceMode("desktop")} data-testid="button-device-desktop">
              <Monitor className={`w-4 h-4 ${deviceMode === "desktop" ? "text-primary" : ""}`} />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDeviceMode("tablet")} data-testid="button-device-tablet">
              <Tablet className={`w-4 h-4 ${deviceMode === "tablet" ? "text-primary" : ""}`} />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDeviceMode("mobile")} data-testid="button-device-mobile">
              <Smartphone className={`w-4 h-4 ${deviceMode === "mobile" ? "text-primary" : ""}`} />
            </Button>
            <div className="w-px h-4 bg-border mx-1" />
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleRefresh} data-testid="button-refresh-fullscreen">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={openInNewTab} data-testid="button-newtab-fullscreen">
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsFullscreen(false)} data-testid="button-exit-fullscreen">
              <Minimize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 flex overflow-hidden">
          {activeTab === "preview" ? (
            <div className="flex-1 flex overflow-hidden">
              {showFallback ? (
                <WebContainerFallbackPanel onDownload={() => downloadProjectAsZip(files.map(f => ({ path: f.path, content: f.content, language: f.language })), "project")} />
              ) : files.length > 0 ? (
                <AutoRunPreview
                  files={files.map(f => ({ path: f.path, content: f.content, language: f.language }))}
                  projectName={files[0]?.path?.split('/')[0] || 'Generated Project'}
                  height="100%"
                  autoStart={true}
                  conversationId={conversationId}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  <p>No project to preview</p>
                </div>
              )}
            </div>
          ) : activeTab === "intel" ? (
            <div className="flex-1 p-4 overflow-auto">
              {conversationId && <IntelligencePanel conversationId={conversationId} />}
            </div>
          ) : activeTab === "flow" ? (
            <div className="flex-1 overflow-hidden">
              <FlowchartPanel files={files} codeErrors={codeErrors} runtimeErrors={runtimeErrors} isAutoFixing={isAutoFixing} autoFixLogs={autoFixLogs} />
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden">
              <div className="w-48 border-r border-border bg-muted/30 overflow-y-auto">
                <div className="p-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Files</div>
                <ScrollArea className="h-full">
                  {fileTree.map((node) => (
                    <FileTreeNode
                      key={node.path}
                      node={node}
                      activeFile={activeFile}
                      onSelectFile={setActiveFile}
                      onRegenerateFile={onRegenerateFile}
                    />
                  ))}
                </ScrollArea>
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-background">
                  <span className="text-xs font-mono text-muted-foreground">{activeFile}</span>
                  <Badge variant="outline" className="text-xs">{activeFileContent?.language}</Badge>
                </div>
                <ScrollArea className="h-[calc(100%-40px)]">
                  <pre className="p-4 text-xs font-mono leading-relaxed">
                    <code className="whitespace-pre">{activeFileContent?.content}</code>
                  </pre>
                </ScrollArea>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-muted/30">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 overflow-x-auto flex-1 min-w-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setActiveTab("preview")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === "preview" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="tab-preview"
              >
                <Eye className="w-3 h-3" />
                See It Live
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[200px]">
              <p className="text-xs">See what your app looks like in real time</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setActiveTab("code")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === "code" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="tab-code"
              >
                <Code className="w-3 h-3" />
                View Files
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[200px]">
              <p className="text-xs">Browse all the files that make up your app</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setActiveTab("debug")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === "debug" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="tab-debug"
              >
                <Bug className="w-3 h-3" />
                Fix Issues
                {codeErrors.length > 0 && (
                  <span className="ml-1 bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full">{codeErrors.length}</span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[200px]">
              <p className="text-xs">Find and fix any problems in your app</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setActiveTab("intel")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === "intel" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="tab-intel"
              >
                <Brain className="w-3 h-3" />
                Insights
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[200px]">
              <p className="text-xs">Get smart suggestions and security checks</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setActiveTab("test")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === "test" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="tab-test"
              >
                <TestTube className="w-3 h-3" />
                Test
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[200px]">
              <p className="text-xs">Run tests to make sure everything works</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setActiveTab("deploy")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === "deploy" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="tab-deploy"
              >
                <Rocket className="w-3 h-3" />
                Publish
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[200px]">
              <p className="text-xs">Put your app online so anyone can use it</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setActiveTab("flow")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === "flow" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="tab-flow"
              >
                <GitBranch className="w-3 h-3" />
                Flow
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[200px]">
              <p className="text-xs">See how your app files connect to each other</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-1">
          {showFallback && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2 mr-2"
              onClick={() => downloadProjectAsZip(files.map(f => ({ path: f.path, content: f.content, language: f.language })), "project")}
              data-testid="button-download-zip-toolbar"
            >
              <Download className="h-4 w-4" />
              Download ZIP
            </Button>
          )}
          {files.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 text-xs"
                  onClick={async () => {
                    try {
                      await downloadProjectAsZip(
                        files.map(f => ({ path: f.path, content: f.content, language: f.language })),
                        `project-${conversationId || 'export'}`
                      );
                    } catch (error) {
                      console.error('Download failed:', error);
                    }
                  }}
                  data-testid="button-download-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  Get My App ({files.length} files)
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[220px]">
                <p className="text-xs">Download all your app files as a ZIP to use anywhere</p>
              </TooltipContent>
            </Tooltip>
          )}
          {activeTab === "preview" && (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleRefresh} data-testid="button-refresh">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={openInNewTab} data-testid="button-newtab">
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsFullscreen(true)} data-testid="button-fullscreen">
            <Maximize2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {activeTab === "preview" ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {showFallback ? (
              <WebContainerFallbackPanel onDownload={() => downloadProjectAsZip(files.map(f => ({ path: f.path, content: f.content, language: f.language })), "project")} />
            ) : files.length > 0 ? (
              <AutoRunPreview
                files={files.map(f => ({ path: f.path, content: f.content, language: f.language }))}
                projectName={files[0]?.path?.split('/')[0] || 'Generated Project'}
                height="100%"
                autoStart={true}
                conversationId={conversationId}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                <p>No project to preview</p>
              </div>
            )}
          </div>
        ) : activeTab === "debug" ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {/* Automatic Fix Status */}
                {isAutoFixing && (
                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm font-medium">Auto-fixing code issues...</span>
                  </div>
                )}

                {autoFixLogs.length > 0 && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">
                        Auto-Fixed {autoFixLogs.reduce((acc, log) => acc + log.fixes.length, 0)} Issues
                      </span>
                      <Badge variant="secondary" className="ml-auto text-xs">Automatic</Badge>
                    </div>
                    <div className="space-y-2">
                      {autoFixLogs.slice(-3).map((log, i) => (
                        <div key={i} className="text-xs">
                          <div className="text-muted-foreground">{log.fileName}:</div>
                          <ul className="list-disc list-inside text-green-600 dark:text-green-400 pl-2">
                            {log.fixes.slice(0, 3).map((fix, j) => (
                              <li key={j}>{fix}</li>
                            ))}
                            {log.fixes.length > 3 && (
                              <li className="text-muted-foreground">+{log.fixes.length - 3} more</li>
                            )}
                          </ul>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Code is automatically tested and fixed as it's generated.
                    </p>
                  </div>
                )}

                {!isAutoFixing && autoFixLogs.length === 0 && (
                  <div className="bg-muted/50 border rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Auto-Fix Active</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Code is automatically scanned and fixed when issues are detected.
                    </p>
                  </div>
                )}

                {/* Debug Stats */}
                <div className="flex gap-3">
                  <div className="flex-1 bg-card border rounded-lg p-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <BookOpen className="w-3 h-3" />
                      Changes Observed
                    </div>
                    <div className="text-lg font-semibold">{debugStats.changesObserved}</div>
                  </div>
                  <div className="flex-1 bg-card border rounded-lg p-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <Lightbulb className="w-3 h-3" />
                      Fixes Learned
                    </div>
                    <div className="text-lg font-semibold">{debugStats.fixesLearned}</div>
                  </div>
                  <div className="flex-1 bg-card border rounded-lg p-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <AlertCircle className="w-3 h-3" />
                      Issues Found
                    </div>
                    <div className="text-lg font-semibold">{codeErrors.length + runtimeErrors.length}</div>
                  </div>
                </div>

                {/* Runtime Errors - Most Important */}
                {runtimeErrors.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2 text-red-500">
                      <Zap className="w-4 h-4" />
                      Runtime Errors ({runtimeErrors.length})
                    </h3>
                    <div className="space-y-2">
                      {runtimeErrors.map((error, i) => (
                        <div key={i} className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5 text-red-500">
                              <Zap className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="destructive" className="text-xs">RUNTIME</Badge>
                                {error.source && <span className="text-xs text-muted-foreground truncate">{error.source}</span>}
                              </div>
                              <p className="text-sm font-medium text-destructive">{error.message}</p>
                              {onRequestFix && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="mt-2 h-7 text-xs gap-1"
                                  onClick={() => handleFixRequest(error.message)}
                                  data-testid={`button-fix-runtime-${i}`}
                                >
                                  <Wrench className="w-3 h-3" />
                                  Fix This Error
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Static Code Analysis */}
                <div>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Bug className="w-4 h-4" />
                    Code Analysis
                  </h3>
                  {codeErrors.length === 0 && runtimeErrors.length === 0 ? (
                    <div className="bg-card border rounded-lg p-4 text-center">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      <p className="text-sm text-muted-foreground">No issues detected!</p>
                      <p className="text-xs text-muted-foreground mt-1">Your code looks good.</p>
                    </div>
                  ) : codeErrors.length === 0 ? (
                    <div className="bg-card border rounded-lg p-3 text-center text-muted-foreground text-sm">
                      No static code issues found.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {codeErrors.map((error, i) => (
                        <div key={i} className="bg-card border rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <div className={`mt-0.5 ${
                              error.type === 'syntax' ? 'text-red-500' :
                              error.type === 'runtime' ? 'text-orange-500' :
                              error.type === 'logic' ? 'text-yellow-500' : 'text-blue-500'
                            }`}>
                              <AlertCircle className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Badge variant="outline" className="text-xs uppercase">
                                  {error.type}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{error.language}</span>
                                {error.line && <span className="text-xs text-muted-foreground">Line {error.line}</span>}
                              </div>
                              <p className="text-sm">{error.message}</p>
                              <p className="text-xs text-muted-foreground font-mono truncate">{error.code}</p>
                              {error.suggestion && (
                                <div className="mt-2 flex items-start gap-1 text-xs text-primary">
                                  <Lightbulb className="w-3 h-3 mt-0.5 shrink-0" />
                                  <span>{error.suggestion}</span>
                                </div>
                              )}
                              {onRequestFix && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="mt-2 h-6 text-xs gap-1"
                                  onClick={() => handleFixRequest(`${error.type} error: ${error.message}`)}
                                  data-testid={`button-fix-code-${i}`}
                                >
                                  <Wrench className="w-3 h-3" />
                                  Fix This
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Enhanced AI Error Fixer */}
                {(runtimeErrors.length > 0 || codeErrors.length > 0) && files.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      AI-Powered Fix Suggestions
                    </h3>
                    <ErrorFixerPanel
                      errors={[
                        ...runtimeErrors.map(e => e.message),
                        ...codeErrors.map(e => `${e.type}: ${e.message}`)
                      ]}
                      code={files.find(f => f.path === activeFile)?.content || files.map(f => f.content).join("\n\n")}
                      conversationId={conversationId}
                      onApplyFix={(fixedCode) => {
                        const targetFile = files.find(f => f.path === activeFile) || files[0];
                        if (targetFile) {
                          updateFileMutation.mutate(
                            { fileId: targetFile.id, content: fixedCode },
                            {
                              onSuccess: () => {
                                setRuntimeErrors([]);
                                setCodeErrors([]);
                                setRefreshKey(k => k + 1);
                              }
                            }
                          );
                        }
                      }}
                      onAutoFixComplete={() => {
                        setRuntimeErrors([]);
                        setCodeErrors([]);
                        setRefreshKey(k => k + 1);
                      }}
                    />
                  </div>
                )}

                {/* Learning Status */}
                <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="w-4 h-4" />
                    <span className="font-medium">Live Learning Active</span>
                  </div>
                  <p>I'm watching your code changes and learning from how you fix errors. The more you code, the smarter I get!</p>
                </div>
              </div>
            </ScrollArea>
          </div>
        ) : activeTab === "intel" ? (
          <div className="flex-1 p-4 overflow-auto">
            {conversationId && <IntelligencePanel conversationId={conversationId} />}
          </div>
        ) : activeTab === "test" ? (
          <div className="flex-1 p-4 overflow-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium flex items-center gap-2">
                  <TestTube className="h-4 w-4" />
                  Automated Tests
                </h3>
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!conversationId) return;
                    setIsRunningTests(true);
                    try {
                      const res = await apiRequest("POST", `/api/conversations/${conversationId}/test`);
                      const data = await res.json();
                      setServerTestResults(data);
                    } catch (error) {
                      console.error('Test run failed:', error);
                    } finally {
                      setIsRunningTests(false);
                    }
                  }}
                  disabled={isRunningTests || !conversationId}
                  className="gap-1"
                  data-testid="button-run-tests"
                >
                  {isRunningTests ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      Run Tests
                    </>
                  )}
                </Button>
              </div>

              {serverTestResults && (() => {
                const allDetails: any[] = [];
                serverTestResults.fileResults?.forEach((r: any) => {
                  r.details?.forEach((d: any) => allDetails.push({ ...d, file: r.file }));
                });
                const secTests = allDetails.filter((d: any) => d.testName?.startsWith('[SEC]'));
                const funcTests = allDetails.filter((d: any) => !d.testName?.startsWith('[SEC]'));
                const secPassed = secTests.filter((d: any) => d.status === 'passed').length;
                const secFailed = secTests.filter((d: any) => d.status === 'failed').length;
                const funcPassed = funcTests.filter((d: any) => d.status === 'passed').length;
                const funcFailed = funcTests.filter((d: any) => d.status === 'failed').length;

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{serverTestResults.totalPassed}</div>
                        <div className="text-xs text-muted-foreground">Passed</div>
                      </div>
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{serverTestResults.totalFailed}</div>
                        <div className="text-xs text-muted-foreground">Failed</div>
                      </div>
                      <div className={`${serverTestResults.buildValid ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'} border rounded-lg p-3 text-center`}>
                        <div className="text-2xl font-bold">{serverTestResults.buildValid ? <CheckCircle2 className="w-6 h-6 mx-auto text-green-500" /> : <AlertCircle className="w-6 h-6 mx-auto text-red-500" />}</div>
                        <div className="text-xs text-muted-foreground">Build</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="border border-amber-500/30 bg-amber-500/5 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Shield className="h-4 w-4 text-amber-500" />
                          <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Security</span>
                        </div>
                        <div className="text-xl font-bold text-amber-700 dark:text-amber-300">{secPassed}/{secPassed + secFailed}</div>
                        <div className="text-xs text-muted-foreground">checks passed</div>
                      </div>
                      <div className="border border-blue-500/30 bg-blue-500/5 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <TestTube className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Functional</span>
                        </div>
                        <div className="text-xl font-bold text-blue-700 dark:text-blue-300">{funcPassed}/{funcPassed + funcFailed}</div>
                        <div className="text-xs text-muted-foreground">tests passed</div>
                      </div>
                    </div>

                    {secFailed > 0 && (
                      <div className="border border-red-500/30 bg-red-500/5 rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="text-sm font-bold text-red-600 dark:text-red-400">Security Vulnerabilities Found</span>
                        </div>
                        {secTests.filter((d: any) => d.status === 'failed').map((d: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <XCircle className="h-3 w-3 text-red-500 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-red-600 dark:text-red-400">{d.testName?.replace('[SEC] ', '')}</span>
                              <span className="text-muted-foreground ml-1">({d.file})</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {serverTestResults.buildErrors?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-red-600 dark:text-red-400">Build Errors</h4>
                        {serverTestResults.buildErrors.map((error: string, i: number) => (
                          <div key={i} className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-xs text-red-600 dark:text-red-400">
                            {error}
                          </div>
                        ))}
                      </div>
                    )}

                    {serverTestResults.fileResults?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Test Results by File</h4>
                        {serverTestResults.fileResults.map((result: any, i: number) => {
                          const fileSecTests = result.details?.filter((d: any) => d.testName?.startsWith('[SEC]')) || [];
                          const fileFuncTests = result.details?.filter((d: any) => !d.testName?.startsWith('[SEC]')) || [];
                          return (
                            <div key={i} className="bg-card border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-mono text-muted-foreground">{result.file}</span>
                                <div className="flex gap-2">
                                  <Badge variant="outline" className="text-xs text-green-600">{result.passed} passed</Badge>
                                  {result.failed > 0 && <Badge variant="destructive" className="text-xs">{result.failed} failed</Badge>}
                                </div>
                              </div>
                              {fileFuncTests.length > 0 && (
                                <div className="space-y-1 mb-2">
                                  <div className="flex items-center gap-1 mb-1">
                                    <TestTube className="h-3 w-3 text-blue-500" />
                                    <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
                                      Functional ({fileFuncTests.filter((d: any) => d.status === 'passed').length}/{fileFuncTests.length})
                                    </span>
                                  </div>
                                  {fileFuncTests.map((detail: any, j: number) => {
                                    const isPassed = detail.status === 'passed' || detail.passed === true;
                                    return (
                                      <div key={`func-${j}`} className="flex items-start gap-2 text-xs">
                                        {isPassed ? (
                                          <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0 mt-0.5" />
                                        ) : (
                                          <AlertCircle className="h-3 w-3 text-red-500 shrink-0 mt-0.5" />
                                        )}
                                        <div>
                                          <span className={isPassed ? "text-muted-foreground" : "text-red-600 dark:text-red-400"}>
                                            {detail.testName || detail.name || detail.description || `Test ${j + 1}`}
                                          </span>
                                          {!isPassed && detail.error && (
                                            <p className="text-muted-foreground mt-0.5">{detail.error}</p>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {fileSecTests.length > 0 && (
                                <div className="border-t border-border/50 pt-2 mt-1">
                                  <div className="flex items-center gap-1 mb-1">
                                    <Shield className="h-3 w-3 text-amber-500" />
                                    <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                      Security ({fileSecTests.filter((d: any) => d.status === 'passed').length}/{fileSecTests.length})
                                    </span>
                                  </div>
                                  {fileSecTests.filter((d: any) => d.status === 'failed').map((detail: any, j: number) => (
                                    <div key={`sec-${j}`} className="flex items-start gap-2 text-xs">
                                      <XCircle className="h-3 w-3 text-red-500 shrink-0 mt-0.5" />
                                      <span className="text-red-600 dark:text-red-400">
                                        {detail.testName?.replace('[SEC] ', '')}
                                      </span>
                                    </div>
                                  ))}
                                  {fileSecTests.every((d: any) => d.status === 'passed') && (
                                    <div className="flex items-center gap-1 py-0.5 text-xs">
                                      <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                                      <span className="text-muted-foreground">All checks passed</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {!serverTestResults && !isRunningTests && (
                <div className="text-center py-8 text-muted-foreground">
                  <TestTube className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Click "Run Tests" to analyze your code</p>
                  <p className="text-xs mt-1">Runs comprehensive tests including build validation, code quality checks, and security analysis</p>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === "deploy" ? (
          <div className="flex-1 overflow-auto">
            <DeploymentPanel
              files={files.map(f => ({ path: f.path, content: f.content }))}
              conversationId={conversationId}
            />
          </div>
        ) : activeTab === "flow" ? (
          <div className="flex-1 overflow-hidden">
            <FlowchartPanel files={files} codeErrors={codeErrors} runtimeErrors={runtimeErrors} isAutoFixing={isAutoFixing} autoFixLogs={autoFixLogs} />
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            <div className="w-40 border-r border-border bg-muted/30 overflow-y-auto">
              <div className="p-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Files</div>
              <ScrollArea className="h-full">
                {fileTree.map((node) => (
                  <FileTreeNode
                    key={node.path}
                    node={node}
                    activeFile={activeFile}
                    onSelectFile={setActiveFile}
                  />
                ))}
              </ScrollArea>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-background">
                <span className="text-xs font-mono text-muted-foreground truncate">{activeFile}</span>
                <Badge variant="outline" className="text-xs shrink-0">{activeFileContent?.language}</Badge>
              </div>
              <ScrollArea className="flex-1">
                <pre className="p-3 text-xs font-mono leading-relaxed">
                  <code className="whitespace-pre">{activeFileContent?.content}</code>
                </pre>
              </ScrollArea>
            </div>
          </div>
        )}

        <div className="w-40 border-l border-border bg-muted/30 overflow-hidden flex flex-col">
          <div className="p-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
            Architecture
          </div>
          <ScrollArea className="flex-1">
            <div className="p-1">
              {fileTree.map((node) => (
                <FileTreeNode
                  key={node.path}
                  node={node}
                  activeFile={activeFile}
                  onSelectFile={(path) => {
                    setActiveFile(path);
                    setActiveTab("code");
                  }}
                  onRegenerateFile={onRegenerateFile}
                />
              ))}
            </div>
          </ScrollArea>
          <div className="p-2 border-t border-border text-xs text-muted-foreground">
            {files.length} file{files.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>
    </div>
  );
}