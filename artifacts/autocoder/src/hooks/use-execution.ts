// React hook for using the execution manager
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getExecutionManager,
  resetExecutionManager,
  type ExecutionState,
  type ProjectFile,
  type ExecutionConfig
} from '@/lib/code-runner/execution-manager';

export interface UseExecutionOptions {
  autoStart?: boolean;
  config?: Partial<ExecutionConfig>;
}

export interface UseExecutionResult {
  state: ExecutionState | null;
  isRunning: boolean;
  isLoading: boolean;
  hasError: boolean;
  url: string | undefined;
  logs: string[];
  errors: string[];
  tier: string | null;
  previewMode: 'iframe' | 'react-transpile' | 'javascript' | null;
  previewReady: boolean;
  execute: (files: ProjectFile[]) => Promise<void>;
  stop: () => Promise<void>;
  restart: (files: ProjectFile[]) => Promise<void>;
  reset: () => void;
}

export function useExecution(
  files: ProjectFile[] = [],
  options: UseExecutionOptions = {}
): UseExecutionResult {
  const { autoStart = false, config } = options;
  const [state, setState] = useState<ExecutionState | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const managerRef = useRef(getExecutionManager(config));
  const hasAutoStarted = useRef(false);

  useEffect(() => {
    const unsubscribe = managerRef.current.subscribe(setState);
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (autoStart && files.length > 0 && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      execute(files);
    }
  }, [autoStart, files]);

  const execute = useCallback(async (projectFiles: ProjectFile[]) => {
    if (isExecuting) return;
    setIsExecuting(true);
    try {
      await managerRef.current.execute(projectFiles);
    } finally {
      setIsExecuting(false);
    }
  }, [isExecuting]);

  const stop = useCallback(async () => {
    await managerRef.current.stop();
  }, []);

  const restart = useCallback(async (projectFiles: ProjectFile[]) => {
    if (isExecuting) return;
    setIsExecuting(true);
    try {
      await managerRef.current.restart(projectFiles);
    } finally {
      setIsExecuting(false);
    }
  }, [isExecuting]);

  const reset = useCallback(() => {
    resetExecutionManager();
    managerRef.current = getExecutionManager(config);
    managerRef.current.subscribe(setState);
  }, [config]);

  const isLoading = state ? [
    'initializing',
    'mounting-files',
    'installing-dependencies',
    'starting-server'
  ].includes(state.status) : false;

  const isRunning = state?.status === 'running';
  const hasError = state?.status === 'error' || (state?.errors.length ?? 0) > 0;

  return {
    state,
    isRunning,
    isLoading,
    hasError,
    url: state?.url,
    logs: state?.logs ?? [],
    errors: state?.errors ?? [],
    tier: state?.tier ?? null,
    previewMode: state?.previewMode ?? null,
    previewReady: state?.previewReady ?? false,
    execute,
    stop,
    restart,
    reset,
  };
}

export function useExecutionStatus() {
  const [state, setState] = useState<ExecutionState | null>(null);

  useEffect(() => {
    const manager = getExecutionManager();
    return manager.subscribe(setState);
  }, []);

  return state;
}