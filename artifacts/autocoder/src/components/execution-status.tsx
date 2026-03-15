// Execution Status Component
// Shows current execution tier, status, and failsafe chain state

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Play,
  Square,
  RefreshCw,
  Terminal,
  Cloud,
  Globe,
  Code,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  getExecutionManager,
  type ExecutionState,
  type ExecutionTier,
  type ProjectFile
} from '@/lib/code-runner/execution-manager';

interface ExecutionStatusProps {
  files: ProjectFile[];
  onUrlChange?: (url: string | undefined) => void;
  compact?: boolean;
}

const TIER_INFO: Record<ExecutionTier, {
  icon: typeof Terminal;
  label: string;
  description: string;
  color: string;
}> = {
  'webcontainer': {
    icon: Terminal,
    label: 'WebContainer',
    description: 'Full Node.js execution in browser',
    color: 'bg-green-500',
  },
  'cloud-sandbox': {
    icon: Cloud,
    label: 'Cloud Sandbox',
    description: 'Server-side container execution',
    color: 'bg-blue-500',
  },
  'static-preview': {
    icon: Globe,
    label: 'Static Preview',
    description: 'Browser-based HTML/React rendering',
    color: 'bg-yellow-500',
  },
  'code-only': {
    icon: Code,
    label: 'Code View',
    description: 'Source code display only',
    color: 'bg-gray-500',
  },
};

const STATUS_ICONS: Record<string, typeof CheckCircle> = {
  'idle': Code,
  'initializing': Loader2,
  'mounting-files': Loader2,
  'installing-dependencies': Loader2,
  'starting-server': Loader2,
  'running': CheckCircle,
  'error': XCircle,
  'fallback': AlertTriangle,
  'degraded': AlertTriangle,
};

export function ExecutionStatus({ files, onUrlChange, compact = false }: ExecutionStatusProps) {
  const [state, setState] = useState<ExecutionState | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    const manager = getExecutionManager();
    return manager.subscribe((newState) => {
      setState(newState);
      onUrlChange?.(newState.url);
    });
  }, [onUrlChange]);

  const handleStart = async () => {
    if (isExecuting) return;
    setIsExecuting(true);

    try {
      const manager = getExecutionManager();
      await manager.execute(files);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleStop = async () => {
    const manager = getExecutionManager();
    await manager.stop();
  };

  const handleRestart = async () => {
    if (isExecuting) return;
    setIsExecuting(true);

    try {
      const manager = getExecutionManager();
      await manager.restart(files);
    } finally {
      setIsExecuting(false);
    }
  };

  if (!state) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Initializing execution manager...
      </div>
    );
  }

  const tierInfo = TIER_INFO[state.tier];
  const TierIcon = tierInfo.icon;
  const StatusIcon = STATUS_ICONS[state.status] || Code;
  const isLoading = ['initializing', 'mounting-files', 'installing-dependencies', 'starting-server'].includes(state.status);
  const isRunning = state.status === 'running';
  const hasError = state.status === 'error' || state.errors.length > 0;

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
        <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500' : isLoading ? 'bg-yellow-500 animate-pulse' : hasError ? 'bg-red-500' : 'bg-gray-400'}`} />
        <TierIcon className="w-4 h-4" />
        <span className="text-sm font-medium">{tierInfo.label}</span>
        <Badge variant={isRunning ? 'default' : hasError ? 'destructive' : 'secondary'} className="text-xs">
          {state.status}
        </Badge>
        {!isRunning && !isLoading && (
          <Button size="sm" variant="ghost" onClick={handleStart} disabled={isExecuting} data-testid="button-start-execution">
            <Play className="w-3 h-3" />
          </Button>
        )}
        {(isRunning || isLoading) && (
          <Button size="sm" variant="ghost" onClick={handleStop} data-testid="button-stop-execution">
            <Square className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="w-full" data-testid="card-execution-status">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TierIcon className="w-4 h-4" />
            Execution Status
          </CardTitle>
          <div className="flex items-center gap-1">
            {!isRunning && !isLoading && (
              <Button size="sm" variant="outline" onClick={handleStart} disabled={isExecuting} data-testid="button-run-project">
                <Play className="w-3 h-3 mr-1" />
                Run
              </Button>
            )}
            {(isRunning || isLoading) && (
              <>
                <Button size="sm" variant="outline" onClick={handleRestart} disabled={isExecuting} data-testid="button-restart-project">
                  <RefreshCw className={`w-3 h-3 mr-1 ${isExecuting ? 'animate-spin' : ''}`} />
                  Restart
                </Button>
                <Button size="sm" variant="outline" onClick={handleStop} data-testid="button-stop-project">
                  <Square className="w-3 h-3 mr-1" />
                  Stop
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${tierInfo.color} ${isLoading ? 'animate-pulse' : ''}`} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{tierInfo.label}</span>
              <Badge
                variant={isRunning ? 'default' : hasError ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                <StatusIcon className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                {state.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{state.message}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">Failsafe chain:</span>
          {(['webcontainer', 'cloud-sandbox', 'static-preview', 'code-only'] as ExecutionTier[]).map((tier, i) => {
            const info = TIER_INFO[tier];
            const Icon = info.icon;
            const isActive = tier === state.tier;
            const isPassed = ['webcontainer', 'cloud-sandbox', 'static-preview', 'code-only'].indexOf(tier) <
                            ['webcontainer', 'cloud-sandbox', 'static-preview', 'code-only'].indexOf(state.tier);

            return (
              <div key={tier} className="flex items-center">
                {i > 0 && <span className="text-muted-foreground mx-1">→</span>}
                <div
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
                    isActive ? 'bg-primary/20 text-primary' :
                    isPassed ? 'text-muted-foreground line-through' :
                    'text-muted-foreground/50'
                  }`}
                  title={info.description}
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{info.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {state.url && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded text-xs">
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span className="text-muted-foreground" data-testid="link-preview-url">
              Preview is running — view it in the "See It Live" tab above
            </span>
          </div>
        )}

        {state.errors.length > 0 && (
          <div className="p-2 bg-destructive/10 rounded text-xs space-y-1">
            <div className="flex items-center gap-1 text-destructive font-medium">
              <XCircle className="w-3 h-3" />
              Errors ({state.errors.length})
            </div>
            {state.errors.slice(-3).map((error, i) => (
              <div key={i} className="text-destructive/80 pl-4">{error}</div>
            ))}
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => setShowLogs(!showLogs)}
          data-testid="button-toggle-logs"
        >
          <Terminal className="w-3 h-3 mr-1" />
          Logs ({state.logs.length})
          {showLogs ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
        </Button>

        {showLogs && (
          <div className="max-h-40 overflow-y-auto bg-black/90 text-green-400 p-2 rounded text-xs font-mono">
            {state.logs.length === 0 ? (
              <div className="text-muted-foreground">No logs yet</div>
            ) : (
              state.logs.map((log, i) => (
                <div key={i} className="whitespace-pre-wrap">{log}</div>
              ))
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Attempts: {state.attempts} |
          {state.startTime && ` Runtime: ${Math.round((Date.now() - state.startTime) / 1000)}s`}
        </div>
      </CardContent>
    </Card>
  );
}

export function ExecutionStatusBadge({ files }: { files: ProjectFile[] }) {
  const [state, setState] = useState<ExecutionState | null>(null);

  useEffect(() => {
    const manager = getExecutionManager();
    return manager.subscribe(setState);
  }, []);

  if (!state) return null;

  const tierInfo = TIER_INFO[state.tier];
  const isRunning = state.status === 'running';
  const isLoading = ['initializing', 'mounting-files', 'installing-dependencies', 'starting-server'].includes(state.status);

  return (
    <Badge
      variant={isRunning ? 'default' : 'secondary'}
      className="text-xs"
      data-testid="badge-execution-status"
    >
      <div className={`w-2 h-2 rounded-full mr-1 ${tierInfo.color} ${isLoading ? 'animate-pulse' : ''}`} />
      {tierInfo.label}
    </Badge>
  );
}