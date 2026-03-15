import { useState, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Terminal, TerminalLine } from "./terminal";
import {
  Play,
  Package,
  Server,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Download,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import {
  getWebContainer,
  mountFiles,
  runCommand,
  installDependencies,
  startDevServer,
  isWebContainerSupported,
  teardown,
  FileSystemTree
} from "@/lib/code-runner/webcontainer";

interface CodeRunnerProps {
  files: { path: string; content: string }[];
  onServerReady?: (url: string) => void;
  onError?: (error: string) => void;
  onDownloadZip?: () => void;
}

type RunnerStatus = "idle" | "booting" | "installing" | "running" | "error" | "ready";

export function CodeRunner({ files, onServerReady, onError, onDownloadZip }: CodeRunnerProps) {
  const [status, setStatus] = useState<RunnerStatus>("idle");
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [activeTab, setActiveTab] = useState("terminal");

  useEffect(() => {
    setIsSupported(isWebContainerSupported());
  }, []);

  // Inside the component, before any boot logic or state setup:
  if (typeof window !== 'undefined' && !window.crossOriginIsolated) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <div className="rounded-full bg-yellow-500/10 p-4">
          <AlertTriangle className="h-8 w-8 text-yellow-500" />
        </div>
        <h3 className="text-lg font-semibold">Live Preview Unavailable</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          The in-browser runtime requires Cross-Origin Isolation, which is not
          currently active. Download your project as a ZIP to run it locally.
        </p>
        {onDownloadZip && (
          <Button onClick={onDownloadZip} variant="outline" data-testid="button-download-zip-fallback">
            Download ZIP Instead
          </Button>
        )}
      </div>
    );
  }

  const addLine = useCallback((type: TerminalLine["type"], content: string) => {
    setTerminalLines(prev => [...prev, { type, content, timestamp: new Date() }]);
  }, []);

  const convertFilesToTree = useCallback((fileList: { path: string; content: string }[]): FileSystemTree => {
    const tree: FileSystemTree = {};

    for (const file of fileList) {
      const parts = file.path.split("/").filter(Boolean);
      let current: any = tree;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          current[part] = { file: { contents: file.content } };
        } else {
          if (!current[part]) {
            current[part] = { directory: {} };
          }
          current = current[part].directory;
        }
      }
    }

    return tree;
  }, []);

  const runProject = useCallback(async () => {
    if (!isSupported) {
      onError?.("WebContainers require SharedArrayBuffer. Enable cross-origin isolation headers.");
      return;
    }

    try {
      setStatus("booting");
      addLine("system", "Booting WebContainer...");

      await getWebContainer();
      addLine("system", "WebContainer ready!");

      addLine("system", "Mounting project files...");
      const fileTree = convertFilesToTree(files);
      await mountFiles(fileTree);
      addLine("system", `Mounted ${files.length} files`);

      const hasPackageJson = files.some(f => f.path === "package.json" || f.path === "/package.json");

      if (hasPackageJson) {
        setStatus("installing");
        addLine("system", "Installing dependencies...");

        const installResult = await installDependencies((data) => {
          addLine("output", data);
        });

        if (!installResult.success) {
          setStatus("error");
          addLine("error", "Failed to install dependencies");
          return;
        }

        addLine("system", "Dependencies installed!");

        setStatus("running");
        addLine("system", "Starting development server...");

        const { url } = await startDevServer(
          (data) => addLine("output", data),
          (serverUrl) => {
            setServerUrl(serverUrl);
            onServerReady?.(serverUrl);
            addLine("system", `Server ready at ${serverUrl}`);
          }
        );

        setStatus("ready");
      } else {
        const jsFile = files.find(f => f.path.endsWith(".js") || f.path.endsWith(".mjs"));
        if (jsFile) {
          setStatus("running");
          addLine("input", `node ${jsFile.path}`);

          const result = await runCommand("node", [jsFile.path], (data) => {
            addLine("output", data);
          });

          if (result.success) {
            setStatus("ready");
            addLine("system", `Process exited with code ${result.exitCode}`);
          } else {
            setStatus("error");
            addLine("error", `Process failed with code ${result.exitCode}`);
          }
        } else {
          addLine("system", "No runnable files found (add package.json or .js file)");
          setStatus("idle");
        }
      }
    } catch (error) {
      setStatus("error");
      const message = error instanceof Error ? error.message : "Unknown error";
      addLine("error", `Error: ${message}`);
      onError?.(message);
    }
  }, [files, isSupported, addLine, convertFilesToTree, onServerReady, onError]);

  const stopProject = useCallback(async () => {
    await teardown();
    setStatus("idle");
    setServerUrl(null);
    addLine("system", "Server stopped");
  }, [addLine]);

  const clearTerminal = useCallback(() => {
    setTerminalLines([]);
  }, []);

  const getStatusBadge = () => {
    switch (status) {
      case "booting":
        return <Badge variant="outline" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />Booting</Badge>;
      case "installing":
        return <Badge variant="outline" className="gap-1"><Package className="h-3 w-3" />Installing</Badge>;
      case "running":
        return <Badge variant="outline" className="gap-1"><Server className="h-3 w-3 animate-pulse" />Running</Badge>;
      case "ready":
        return <Badge className="gap-1 bg-green-600"><CheckCircle2 className="h-3 w-3" />Ready</Badge>;
      case "error":
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Error</Badge>;
      default:
        return <Badge variant="secondary">Idle</Badge>;
    }
  };

  if (!isSupported) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-amber-500 mb-2">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">WebContainers Not Available</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Your browser doesn't support WebContainers. This feature requires:
        </p>
        <ul className="text-sm text-muted-foreground list-disc ml-5 mt-2">
          <li>A modern browser (Chrome, Edge, or Firefox)</li>
          <li>Cross-origin isolation headers enabled</li>
        </ul>
        <p className="text-sm text-muted-foreground mt-2">
          You can still use the preview panel for HTML/CSS/JS code.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">Code Runner</span>
          {getStatusBadge()}
        </div>
        <div className="flex items-center gap-1">
          {status === "idle" || status === "error" ? (
            <Button
              size="sm"
              onClick={runProject}
              disabled={files.length === 0}
              className="gap-1"
              data-testid="button-run-project"
            >
              <Play className="h-3.5 w-3.5" />
              Run
            </Button>
          ) : status === "ready" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={stopProject}
              className="gap-1"
              data-testid="button-stop-project"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Restart
            </Button>
          ) : null}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-2 mt-2">
          <TabsTrigger value="terminal" data-testid="tab-terminal">Terminal</TabsTrigger>
          <TabsTrigger value="preview" data-testid="tab-preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="terminal" className="flex-1 m-0 p-2">
          <Terminal
            lines={terminalLines}
            isRunning={status === "booting" || status === "installing" || status === "running"}
            onRun={runProject}
            onStop={stopProject}
            onClear={clearTerminal}
          />
        </TabsContent>

        <TabsContent value="preview" className="flex-1 m-0 p-2">
          {serverUrl ? (
            <iframe
              src={serverUrl}
              className="w-full h-full border rounded-md bg-white"
              title="Preview"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          ) : (
            <Card className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <Server className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No server running</p>
                <p className="text-xs">Run your project to see the preview</p>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}