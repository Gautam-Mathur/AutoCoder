import { useState, useEffect, useCallback, useRef } from "react";
import { Play, Square, RefreshCw, AlertCircle, Loader2, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProjectFile {
  path: string;
  content: string;
  language?: string;
}

interface VitePreviewProps {
  conversationId: number;
  projectName?: string;
  height?: string;
  autoStart?: boolean;
  files?: ProjectFile[];
}

type PreviewStatus = 'idle' | 'preparing' | 'starting' | 'running' | 'error' | 'stopped';

export function VitePreview({
  conversationId,
  projectName = "Generated Project",
  height = "500px",
  autoStart = false,
  files = []
}: VitePreviewProps) {
  const [status, setStatus] = useState<PreviewStatus>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const hasAutoStarted = useRef(false);
  const lastConversationId = useRef<number | null>(null);

  const prepareAndStart = useCallback(async () => {
    setStatus('preparing');
    setError(null);

    try {
      const prepareResponse = await fetch(`/api/preview/prepare/${conversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const prepareResult = await prepareResponse.json();

      if (!prepareResult.success) {
        setError(prepareResult.error || 'Failed to prepare project');
        setStatus('error');
        return;
      }

      setStatus('starting');

      const startResponse = await fetch(`/api/preview/start/${conversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const startResult = await startResponse.json();

      if (startResult.success) {
        setPreviewUrl(startResult.url);
        setStatus('running');
      } else {
        setError(startResult.error || 'Failed to start Vite server');
        setStatus('error');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to preview server');
      setStatus('error');
    }
  }, [conversationId]);

  const stopPreview = useCallback(async () => {
    try {
      await fetch('/api/preview/stop', { method: 'POST' });
      setStatus('stopped');
      setPreviewUrl(null);
    } catch (err) {
      console.error('Failed to stop preview:', err);
    }
  }, []);

  const refreshPreview = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  useEffect(() => {
    if (lastConversationId.current !== conversationId) {
      lastConversationId.current = conversationId;
      hasAutoStarted.current = false;
      setStatus('idle');
      setPreviewUrl(null);
      setError(null);
    }
  }, [conversationId]);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/preview/status');
        const statusData = await response.json();

        if (statusData.running && statusData.conversationId === conversationId) {
          setPreviewUrl(`http://localhost:${statusData.port}`);
          setStatus('running');
          hasAutoStarted.current = true;
        } else if (autoStart && files.length > 0 && !hasAutoStarted.current && status === 'idle') {
          hasAutoStarted.current = true;
          prepareAndStart();
        }
      } catch (err) {
        console.error('Failed to check preview status:', err);
        if (autoStart && files.length > 0 && !hasAutoStarted.current && status === 'idle') {
          hasAutoStarted.current = true;
          prepareAndStart();
        }
      }
    };

    checkStatus();
  }, [conversationId, autoStart, files.length, prepareAndStart, status]);

  useEffect(() => {
    if (status === 'running' && files.length > 0) {
      const updateProject = async () => {
        try {
          await fetch(`/api/preview/prepare/${conversationId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          setRefreshKey(k => k + 1);
        } catch (err) {
          console.error('Failed to update project files:', err);
        }
      };

      const debounceTimer = setTimeout(updateProject, 500);
      return () => clearTimeout(debounceTimer);
    }
  }, [files, conversationId, status]);

  if (status === 'idle' || status === 'stopped') {
    return (
      <div
        className="flex-1 overflow-hidden border-0 bg-slate-900 flex flex-col items-center justify-center p-8"
        style={{ height }}
        data-testid="vite-preview"
      >
        <Server className="w-12 h-12 text-slate-500 mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">Live Preview</h3>
        <p className="text-slate-400 text-sm text-center mb-6 max-w-md">
          Start the Vite dev server to preview your project with full bundling, module resolution, and hot reload.
        </p>
        <Button
          onClick={prepareAndStart}
          className="bg-emerald-600 hover:bg-emerald-700"
          data-testid="button-start-vite-preview"
        >
          <Play className="w-4 h-4 mr-2" />
          Start Preview
        </Button>
      </div>
    );
  }

  if (status === 'preparing' || status === 'starting') {
    return (
      <div
        className="flex-1 overflow-hidden border-0 bg-slate-900 flex flex-col items-center justify-center p-8"
        style={{ height }}
        data-testid="vite-preview"
      >
        <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">
          {status === 'preparing' ? 'Preparing Project...' : 'Starting Server...'}
        </h3>
        <p className="text-slate-400 text-sm text-center max-w-md">
          {status === 'preparing'
            ? 'Writing files and configuring Vite...'
            : 'Starting the development server...'}
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div
        className="flex-1 overflow-hidden border-0 bg-slate-900 flex flex-col items-center justify-center p-8"
        style={{ height }}
        data-testid="vite-preview"
      >
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">Preview Error</h3>
        <p className="text-red-400 text-sm text-center mb-4 max-w-md">{error}</p>
        <Button
          onClick={prepareAndStart}
          variant="outline"
          data-testid="button-retry-vite-preview"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ height }} data-testid="vite-preview">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-white">{projectName}</span>
          <span className="text-xs text-slate-400">localhost:5200</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-slate-400 hover:text-white"
            onClick={refreshPreview}
            data-testid="button-refresh-vite-preview"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-slate-400 hover:text-red-400"
            onClick={stopPreview}
            data-testid="button-stop-vite-preview"
          >
            <Square className="w-3.5 h-3.5" />
          </Button>
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
            Running
          </Badge>
        </div>
      </div>

      {previewUrl && (
        <iframe
          key={refreshKey}
          src={previewUrl}
          className="flex-1 w-full bg-white border-0"
          title="Live Preview"
          data-testid="vite-preview-iframe"
        />
      )}
    </div>
  );
}