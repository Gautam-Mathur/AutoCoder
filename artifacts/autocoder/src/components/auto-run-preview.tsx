import { useState, useCallback, useEffect, useRef } from "react";
import { Play, Square, RefreshCw, Loader2, CheckCircle2, AlertCircle, Package, Server, Folder, Wrench, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  autoRunProject,
  isRunnableProject,
  estimateInstallTime,
  resetAutoRunGuard,
  type RunnerState,
  type RunnerStatus,
  type AutoRunOptions
} from "@/lib/code-runner/auto-runner";
import { teardown, isWebContainerSupported, writeFile as wcWriteFile } from "@/lib/code-runner/webcontainer";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ProjectFile {
  path: string;
  content: string;
  language?: string;
}

interface AutoFixState {
  active: boolean;
  attempt: number;
  maxAttempts: number;
  status: 'idle' | 'detecting' | 'fixing' | 'retrying' | 'success' | 'failed';
  fixesApplied: number;
  errorsDetected: string[];
}

interface AutoRunPreviewProps {
  files: ProjectFile[];
  projectName?: string;
  height?: string;
  autoStart?: boolean;
  conversationId?: number | null;
}

const VITE_ERROR_PATTERNS = [
  /Failed to resolve import "([^"]+)" from "([^"]+)"/,
  /Module not found: (?:Error: )?Can't resolve '([^']+)'/,
  /Cannot find module '([^']+)'/,
  /Error: No matching export in "([^"]+)" for import "([^"]+)"/,
  /SyntaxError:.*?\((\d+):(\d+)\)/,
  /\[vite\] Internal server error:/,
  /Pre-transform error:/,
  /Error when evaluating SSR module/,
  /TypeError:.*is not a function/,
  /ReferenceError:.*is not defined/,
  /Uncaught.*Error/,
];

function extractErrorsFromLogs(logs: string[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const log of logs) {
    for (const pattern of VITE_ERROR_PATTERNS) {
      if (pattern.test(log)) {
        const key = log.slice(0, 200);
        if (!seen.has(key)) {
          seen.add(key);
          errors.push(log);
        }
        break;
      }
    }
  }
  return errors;
}

const statusConfig: Record<RunnerStatus, {
  label: string;
  icon: typeof Loader2;
  color: string;
  description: string;
}> = {
  idle: {
    label: 'Ready',
    icon: Play,
    color: 'bg-muted text-muted-foreground',
    description: 'Click Run to start the project'
  },
  generating: {
    label: 'Analyzing',
    icon: Loader2,
    color: 'bg-blue-500/20 text-blue-400',
    description: 'Analyzing project structure...'
  },
  mounting: {
    label: 'Setting Up',
    icon: Folder,
    color: 'bg-blue-500/20 text-blue-400',
    description: 'Mounting project files...'
  },
  installing: {
    label: 'Installing',
    icon: Package,
    color: 'bg-amber-500/20 text-amber-400',
    description: 'Running npm install...'
  },
  starting: {
    label: 'Starting',
    icon: Server,
    color: 'bg-purple-500/20 text-purple-400',
    description: 'Starting dev server...'
  },
  running: {
    label: 'Running',
    icon: CheckCircle2,
    color: 'bg-green-500/20 text-green-400',
    description: 'Application is live!'
  },
  error: {
    label: 'Error',
    icon: AlertCircle,
    color: 'bg-red-500/20 text-red-400',
    description: 'An error occurred'
  }
};

const MAX_AUTO_FIX_ATTEMPTS = 3;

export function AutoRunPreview({
  files,
  projectName = "Generated Project",
  height = "500px",
  autoStart = false,
  conversationId
}: AutoRunPreviewProps) {
  const [state, setState] = useState<RunnerState>({
    status: 'idle',
    progress: 0,
    message: '',
    logs: [],
    previewUrl: null,
    error: null
  });
  const [showLogs, setShowLogs] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const hasAutoStarted = useRef(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [autoFix, setAutoFix] = useState<AutoFixState>({
    active: false,
    attempt: 0,
    maxAttempts: MAX_AUTO_FIX_ATTEMPTS,
    status: 'idle',
    fixesApplied: 0,
    errorsDetected: [],
  });
  const autoFixInProgress = useRef(false);
  const autoFixCompleted = useRef(false);
  const logsRef = useRef<string[]>([]);
  const errorCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isRunnable = isRunnableProject(files);
  const isSupported = isWebContainerSupported();
  const estimatedTime = estimateInstallTime(files);

  const addLog = useCallback((log: string) => {
    setState(s => {
      const newLogs = [...s.logs, log];
      logsRef.current = newLogs;
      return { ...s, logs: newLogs };
    });
  }, []);

  const callAutoFix = useCallback(async (errorMessages: string[], attempt: number): Promise<{ fixed: boolean; fixCount: number }> => {
    if (!conversationId || errorMessages.length === 0) {
      return { fixed: false, fixCount: 0 };
    }

    try {
      const response = await apiRequest(
        "POST",
        `/api/conversations/${conversationId}/auto-fix`,
        { errors: errorMessages, attempt }
      );
      const result = await response.json();

      const fixCount = result.totalFixed || result.fixes?.length || 0;

      if (fixCount > 0) {
        queryClient.invalidateQueries({
          queryKey: ["/api/conversations", conversationId, "files"],
        });

        const updatedFiles = await fetch(`/api/conversations/${conversationId}/files`);
        const newFiles: { path: string; content: string }[] = await updatedFiles.json();

        for (const file of newFiles) {
          try {
            await wcWriteFile(file.path, file.content);
          } catch {
          }
        }
      }

      return { fixed: fixCount > 0, fixCount };
    } catch (err) {
      addLog(`Auto-fix API error: ${err}`);
      return { fixed: false, fixCount: 0 };
    }
  }, [conversationId, addLog]);

  const runAutoFixLoop = useCallback(async (detectedErrors: string[]) => {
    if (autoFixInProgress.current || autoFixCompleted.current || !conversationId || detectedErrors.length === 0) return;
    autoFixInProgress.current = true;

    let totalFixed = 0;
    let currentErrors = [...detectedErrors];

    setAutoFix(s => ({ ...s, active: true, status: 'detecting', errorsDetected: currentErrors, attempt: 0, fixesApplied: 0 }));
    addLog(`[Auto-Fix] Detected ${currentErrors.length} error(s). Starting auto-fix...`);

    for (let attempt = 1; attempt <= MAX_AUTO_FIX_ATTEMPTS; attempt++) {
      if (currentErrors.length === 0) break;

      setAutoFix(s => ({ ...s, status: 'fixing', attempt }));
      addLog(`[Auto-Fix] Attempt ${attempt}/${MAX_AUTO_FIX_ATTEMPTS}...`);

      const { fixed, fixCount } = await callAutoFix(currentErrors, attempt);
      totalFixed += fixCount;

      if (!fixed) {
        addLog(`[Auto-Fix] No fixes found on attempt ${attempt}. Stopping.`);
        break;
      }

      addLog(`[Auto-Fix] Applied ${fixCount} fix(es). Refreshing preview...`);
      setAutoFix(s => ({ ...s, fixesApplied: totalFixed }));

      setRefreshKey(k => k + 1);

      await new Promise(r => setTimeout(r, 3000));

      const newErrors = extractErrorsFromLogs(logsRef.current.slice(-30));
      if (newErrors.length === 0) {
        addLog(`[Auto-Fix] All errors resolved after ${attempt} attempt(s)!`);
        setAutoFix(s => ({ ...s, active: false, status: 'success', errorsDetected: [] }));
        autoFixInProgress.current = false;
        autoFixCompleted.current = true;
        return;
      }

      currentErrors = newErrors;
      setAutoFix(s => ({ ...s, status: 'retrying', errorsDetected: currentErrors }));
    }

    if (totalFixed > 0) {
      addLog(`[Auto-Fix] Fixed ${totalFixed} issue(s). Some errors may remain.`);
      setAutoFix(s => ({ ...s, active: false, status: 'success', fixesApplied: totalFixed }));
    } else {
      addLog(`[Auto-Fix] Could not automatically fix errors. Manual review needed.`);
      setAutoFix(s => ({ ...s, active: false, status: 'failed' }));
    }

    autoFixInProgress.current = false;
    autoFixCompleted.current = true;
  }, [conversationId, callAutoFix, addLog]);

  useEffect(() => {
    if (state.status !== 'error' && state.status !== 'running') return;
    if (autoFixInProgress.current || autoFixCompleted.current || !conversationId) return;

    if (errorCheckTimer.current) clearTimeout(errorCheckTimer.current);

    errorCheckTimer.current = setTimeout(() => {
      const errors = state.status === 'error' && state.error
        ? [state.error]
        : extractErrorsFromLogs(state.logs.slice(-50));

      if (errors.length > 0 && !autoFixInProgress.current) {
        runAutoFixLoop(errors);
      }
    }, 2000);

    return () => {
      if (errorCheckTimer.current) clearTimeout(errorCheckTimer.current);
    };
  }, [state.status, state.error, state.logs.length, conversationId, runAutoFixLoop]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PREVIEW_ERROR' && conversationId && !autoFixInProgress.current && !autoFixCompleted.current) {
        const errorMsg = event.data.message || String(event.data);
        addLog(`[Runtime Error] ${errorMsg}`);
        runAutoFixLoop([errorMsg]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [conversationId, addLog, runAutoFixLoop]);

  const runProject = useCallback(async (options: AutoRunOptions = {}) => {
    if (!isSupported) {
      setState(s => ({
        ...s,
        status: 'error',
        error: 'WebContainer not supported. Use Chrome or Edge.'
      }));
      return;
    }

    setAutoFix({ active: false, attempt: 0, maxAttempts: MAX_AUTO_FIX_ATTEMPTS, status: 'idle', fixesApplied: 0, errorsDetected: [] });
    autoFixInProgress.current = false;
    autoFixCompleted.current = false;

    setState({
      status: 'generating',
      progress: 0,
      message: 'Starting...',
      logs: options.skipInstallOnFailure ? ['Attempting to run with incomplete dependencies...'] : [],
      previewUrl: null,
      error: null
    });
    setShowLogs(true);

    await autoRunProject(files, projectName, {
      onStatusChange: (newState) => setState(newState),
      onLog: (log) => setState(s => ({ ...s, logs: [...s.logs, log] })),
      onPreviewReady: (url) => setState(s => ({ ...s, previewUrl: url })),
      onError: (error) => setState(s => ({ ...s, error }))
    }, options);
  }, [files, projectName, isSupported]);

  const runAnyway = useCallback(() => {
    runProject({ skipInstallOnFailure: true });
  }, [runProject]);

  const stopProject = useCallback(async () => {
    resetAutoRunGuard();
    await teardown();
    setAutoFix({ active: false, attempt: 0, maxAttempts: MAX_AUTO_FIX_ATTEMPTS, status: 'idle', fixesApplied: 0, errorsDetected: [] });
    autoFixInProgress.current = false;
    autoFixCompleted.current = false;
    setState({
      status: 'idle',
      progress: 0,
      message: '',
      logs: [],
      previewUrl: null,
      error: null
    });
  }, []);

  const refreshPreview = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.logs]);

  useEffect(() => {
    if (autoStart && isRunnable && isSupported && !hasAutoStarted.current && state.status === 'idle') {
      hasAutoStarted.current = true;
      runProject();
    }
  }, [autoStart, isRunnable, isSupported, state.status, runProject]);



  const config = statusConfig[state.status];
  const StatusIcon = config.icon;
  const isLoading = ['generating', 'mounting', 'installing', 'starting'].includes(state.status);

  if (!isRunnable) {
    return (
      <div
        className="flex-1 overflow-hidden bg-slate-900 flex flex-col items-center justify-center p-8"
        style={{ height }}
        data-testid="auto-run-preview"
      >
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Not a Runnable Project</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          This project doesn't have an entry point (index.html, main.jsx, server.js, etc.)
        </p>
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div
        className="flex-1 overflow-hidden bg-slate-900 flex flex-col items-center justify-center p-8"
        style={{ height }}
        data-testid="auto-run-preview"
      >
        <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Browser Not Supported</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          WebContainer requires SharedArrayBuffer. Please use Chrome or Edge with proper headers.
        </p>
      </div>
    );
  }

  const autoFixBadge = () => {
    if (!autoFix.active && autoFix.status === 'idle') return null;

    const configs: Record<AutoFixState['status'], { label: string; color: string; icon: typeof Wrench }> = {
      idle: { label: '', color: '', icon: Wrench },
      detecting: { label: 'Detecting errors...', color: 'bg-amber-500/20 text-amber-400', icon: AlertCircle },
      fixing: { label: `Fixing (${autoFix.attempt}/${autoFix.maxAttempts})...`, color: 'bg-blue-500/20 text-blue-400', icon: Wrench },
      retrying: { label: `Retrying (${autoFix.attempt}/${autoFix.maxAttempts})...`, color: 'bg-purple-500/20 text-purple-400', icon: RefreshCw },
      success: { label: `Fixed ${autoFix.fixesApplied} issue(s)`, color: 'bg-green-500/20 text-green-400', icon: CheckCircle2 },
      failed: { label: 'Manual review needed', color: 'bg-red-500/20 text-red-400', icon: AlertCircle },
    };

    const c = configs[autoFix.status];
    if (!c.label) return null;
    const Icon = c.icon;
    const isSpinning = ['detecting', 'fixing', 'retrying'].includes(autoFix.status);

    return (
      <Badge className={`${c.color} gap-1`} data-testid="badge-autofix-status">
        <Icon className={`w-3 h-3 ${isSpinning ? 'animate-spin' : ''}`} />
        {c.label}
      </Badge>
    );
  };

  return (
    <div
      className="flex-1 overflow-hidden bg-slate-900 flex flex-col"
      style={{ height }}
      data-testid="auto-run-preview"
    >
      <div className="flex items-center justify-between p-2 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`${config.color} gap-1`}>
            <StatusIcon className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            {config.label}
          </Badge>
          {autoFixBadge()}
          {state.status === 'running' && !autoFix.active && (
            <span className="text-xs text-muted-foreground">{state.previewUrl}</span>
          )}
          {isLoading && (
            <span className="text-xs text-muted-foreground">{state.message}</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {state.status === 'idle' && (
            <Button
              size="sm"
              onClick={() => runProject()}
              className="gap-1"
              data-testid="button-run-project"
            >
              <Play className="w-3 h-3" />
              Run (~{estimatedTime}s)
            </Button>
          )}

          {state.status === 'running' && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={refreshPreview}
                data-testid="button-refresh-preview"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={stopProject}
                data-testid="button-stop-project"
              >
                <Square className="w-3 h-3" />
              </Button>
            </>
          )}

          {isLoading && (
            <Button
              size="sm"
              variant="ghost"
              onClick={stopProject}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowLogs(!showLogs)}
            className={showLogs ? 'bg-slate-700' : ''}
            data-testid="button-toggle-logs"
          >
            Logs
          </Button>
        </div>
      </div>

      {state.progress > 0 && state.progress < 100 && (
        <div className="h-1 bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
            style={{ width: `${state.progress}%` }}
          />
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {state.status === 'running' && state.previewUrl ? (
          <iframe
            ref={iframeRef}
            key={refreshKey}
            src={state.previewUrl}
            className={`bg-white ${showLogs ? 'w-2/3' : 'w-full'}`}
            style={{ border: 'none', height: '100%' }}
            title="Live Preview"
            data-testid="preview-iframe"
          />
        ) : state.status === 'error' ? (
          <div className={`flex flex-col items-center justify-center p-8 ${showLogs ? 'w-2/3' : 'w-full'}`}>
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error</h3>
            <p className="text-sm text-red-400 text-center max-w-md">{state.error}</p>
            {autoFix.status === 'fixing' || autoFix.status === 'retrying' ? (
              <div className="flex items-center gap-2 mt-4 text-blue-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Auto-fixing... Attempt {autoFix.attempt}/{autoFix.maxAttempts}</span>
              </div>
            ) : autoFix.status === 'failed' ? (
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runProject()}
                  className="gap-1"
                  data-testid="button-retry"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={runAnyway}
                  className="gap-1"
                  data-testid="button-run-anyway"
                >
                  <Play className="w-3 h-3" />
                  Run Anyway
                </Button>
              </div>
            ) : (
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runProject()}
                  className="gap-1"
                  data-testid="button-retry"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={runAnyway}
                  className="gap-1"
                  data-testid="button-run-anyway"
                >
                  <Play className="w-3 h-3" />
                  Run Anyway
                </Button>
              </div>
            )}
          </div>
        ) : state.status === 'idle' ? (
          <div className={`flex flex-col items-center justify-center p-8 ${showLogs ? 'w-2/3' : 'w-full'}`}>
            <Play className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ready to Run</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
              This project has {files.length} files and is ready to run.
              <br />
              Estimated time: ~{estimatedTime} seconds
            </p>
            <Button
              onClick={() => runProject()}
              className="gap-2"
              data-testid="button-start-project"
            >
              <Play className="w-4 h-4" />
              npm install && npm run dev
            </Button>
          </div>
        ) : (
          <div className={`flex flex-col items-center justify-center p-8 ${showLogs ? 'w-2/3' : 'w-full'}`}>
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <h3 className="text-lg font-semibold mb-2">{config.description}</h3>
            <p className="text-sm text-muted-foreground text-center">
              {state.message}
            </p>
          </div>
        )}

        {showLogs && (
          <ScrollArea className="w-1/3 border-l border-slate-700 bg-black/50">
            <div className="p-2 font-mono text-xs">
              {state.logs.length === 0 ? (
                <div className="text-muted-foreground">No logs yet...</div>
              ) : (
                state.logs.map((log, i) => (
                  <div
                    key={i}
                    className={`whitespace-pre-wrap ${
                      log.startsWith('[Auto-Fix]') ? 'text-cyan-400' :
                      log.startsWith('[Runtime Error]') ? 'text-red-400' :
                      log.includes('✓') || log.includes('✅') ? 'text-green-400' :
                      log.includes('❌') || log.includes('Error') ? 'text-red-400' :
                      log.includes('⚠️') ? 'text-amber-400' :
                      log.includes('🚀') || log.includes('🎉') ? 'text-purple-400' :
                      'text-slate-400'
                    }`}
                  >
                    {log}
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}