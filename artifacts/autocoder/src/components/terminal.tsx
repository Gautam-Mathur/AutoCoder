import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Square, Trash2, Terminal as TerminalIcon, Loader2 } from "lucide-react";

interface TerminalLine {
  type: "input" | "output" | "error" | "system";
  content: string;
  timestamp: Date;
}

interface TerminalProps {
  lines: TerminalLine[];
  isRunning: boolean;
  onRun?: () => void;
  onStop?: () => void;
  onClear?: () => void;
  title?: string;
}

export function Terminal({
  lines,
  isRunning,
  onRun,
  onStop,
  onClear,
  title = "Terminal"
}: TerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const getLineColor = (type: TerminalLine["type"]) => {
    switch (type) {
      case "input":
        return "text-primary";
      case "output":
        return "text-foreground";
      case "error":
        return "text-destructive";
      case "system":
        return "text-muted-foreground font-medium";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Card className="flex flex-col h-full bg-background border-border">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{title}</span>
          {isRunning && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Running
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isRunning && onRun && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onRun}
              data-testid="button-terminal-run"
            >
              <Play className="h-3.5 w-3.5" />
            </Button>
          )}
          {isRunning && onStop && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onStop}
              data-testid="button-terminal-stop"
            >
              <Square className="h-3.5 w-3.5" />
            </Button>
          )}
          {onClear && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onClear}
              data-testid="button-terminal-clear"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="font-mono text-sm space-y-1">
          {lines.length === 0 && (
            <div className="text-muted-foreground text-xs">
              Terminal ready. Click Run to execute code.
            </div>
          )}
          {lines.map((line, i) => (
            <div key={i} className={`${getLineColor(line.type)} whitespace-pre-wrap break-all`}>
              {line.type === "input" && <span className="text-primary">$ </span>}
              {line.content}
            </div>
          ))}
          {isRunning && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Processing...</span>
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}

export type { TerminalLine };