import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  Search,
  Trash2,
  Download,
  Filter,
  Play,
  Pause,
} from "lucide-react";

type LogLevel = "debug" | "info" | "success" | "warn" | "error";

interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  details?: Record<string, unknown>;
  conversationId?: number;
  duration?: number;
}

interface LogStats {
  total: number;
  byLevel: Record<LogLevel, number>;
  byCategory: Record<string, number>;
  recentErrors: LogEntry[];
}

const levelLabels: Record<LogLevel, string> = {
  debug: "[...]",
  info: "[INF]",
  success: "[OK!]",
  warn: "[WRN]",
  error: "[ERR]",
};

const levelColors: Record<LogLevel, string> = {
  debug: "text-slate-500",
  info: "text-cyan-400",
  success: "text-green-400",
  warn: "text-yellow-400",
  error: "text-red-400",
};

const categoryColors: Record<string, string> = {
  API: "text-cyan-300",
  AI: "text-purple-400",
  DB: "text-blue-400",
  Security: "text-yellow-300",
  Chat: "text-green-300",
  Perf: "text-orange-400",
  Server: "text-cyan-400",
  FAILSAFE: "text-cyan-300",
  "MEMORY-MGR": "text-cyan-300",
  VAPT: "text-yellow-300",
  WebContainer: "text-violet-400",
  PreWarm: "text-sky-400",
  NPM: "text-orange-400",
  DevServer: "text-emerald-400",
  FileSystem: "text-stone-400",
  Pipeline: "text-violet-400",
  AutoRunner: "text-sky-300",
  CodeGen: "text-fuchsia-400",
  Validator: "text-lime-400",
  ErrorFix: "text-rose-400",
  Process: "text-stone-300",
  Cache: "text-sky-400",
};

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  const ms = date.getMilliseconds().toString().padStart(3, "0");
  return `${hours}:${minutes}:${seconds}.${ms}`;
}

function TerminalLogEntry({ log, isExpanded, onToggle }: {
  log: LogEntry;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const levelLabel = levelLabels[log.level];
  const levelColor = levelColors[log.level];
  const categoryColor = categoryColors[log.category] || "text-cyan-400";
  const hasDetails = log.details && Object.keys(log.details).length > 0;

  const isGoodStatus = log.level === "success";
  const goodLabel = isGoodStatus ? "GOOD" : levelLabel.replace("[", "").replace("]", "");

  return (
    <div
      className="font-mono text-sm hover:bg-white/5 cursor-pointer group"
      onClick={hasDetails ? onToggle : undefined}
      data-testid={`log-entry-${log.id}`}
    >
      <div className="flex items-start py-0.5 px-2">
        <span className="text-slate-500 shrink-0 w-28">
          {formatTimestamp(log.timestamp)}
        </span>

        <span className={`shrink-0 w-12 ${levelColor}`}>
          {levelLabel}
        </span>

        {isGoodStatus && (
          <span className="text-green-400 shrink-0 w-12">GOOD</span>
        )}

        <span className={`shrink-0 ${categoryColor}`}>
          [{log.category.toUpperCase().padEnd(12)}]
        </span>

        <span className="text-slate-300 ml-1 flex-1">
          {log.message}
        </span>

        {log.duration && (
          <span className="text-slate-500 shrink-0 ml-2">
            ({log.duration}ms)
          </span>
        )}

        {hasDetails && (
          <span className="text-slate-600 shrink-0 ml-2 opacity-0 group-hover:opacity-100">
            {isExpanded ? "▼" : "▶"}
          </span>
        )}
      </div>

      {isExpanded && hasDetails && (
        <div className="pl-28 pb-2 text-slate-400">
          {Object.entries(log.details!).map(([key, value]) => (
            <div key={key} className="flex">
              <span className="text-cyan-600 mr-2">├──</span>
              <span className="text-slate-500">{key}:</span>
              <span className="text-slate-300 ml-2">
                {typeof value === "object" ? JSON.stringify(value) : String(value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TerminalHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const width = 60;
  const topBorder = "+" + "=".repeat(width - 2) + "+";
  const bottomBorder = topBorder;

  const padLine = (text: string) => {
    const padding = Math.max(0, width - 4 - text.length);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return "|" + " ".repeat(leftPad + 1) + text + " ".repeat(rightPad + 1) + "|";
  };

  return (
    <div className="font-mono text-cyan-400 text-sm py-2">
      <div>{topBorder}</div>
      <div>{padLine(title)}</div>
      {subtitle && <div className="text-slate-400">{padLine(subtitle)}</div>}
      <div>{bottomBorder}</div>
    </div>
  );
}

function TerminalSection({ title, children }: { title: string; children: React.ReactNode }) {
  const line = "-".repeat(50) + "+";

  return (
    <div className="font-mono text-sm">
      <div className="flex items-center text-cyan-400 py-1">
        <span className="text-slate-500 w-28">{formatTimestamp(new Date().toISOString())}</span>
        <span className="text-cyan-400">[INF] INFO</span>
        <span className="text-cyan-300 ml-2">[{title.padEnd(12)}]</span>
        <span className="text-slate-600 ml-1">{line}</span>
      </div>
      {children}
    </div>
  );
}

function TerminalTreeItem({ text, isLast = false, color = "text-slate-300" }: {
  text: string;
  isLast?: boolean;
  color?: string;
}) {
  return (
    <div className="font-mono text-sm flex items-center py-0.5 pl-44">
      <span className="text-slate-600 mr-2">{isLast ? "└──" : "├──"}</span>
      <span className={color}>{text}</span>
    </div>
  );
}

export function LogViewer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<LogLevel | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: logs = [], refetch, isLoading } = useQuery<LogEntry[]>({
    queryKey: ["/api/logs", levelFilter, categoryFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (levelFilter !== "all") params.set("level", levelFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (searchQuery) params.set("search", searchQuery);
      params.set("limit", "200");
      const res = await fetch(`/api/logs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch logs");
      return res.json();
    },
    refetchInterval: autoRefresh ? 2000 : false,
  });

  const { data: stats, refetch: refetchStats } = useQuery<LogStats>({
    queryKey: ["/api/logs/stats"],
    refetchInterval: autoRefresh ? 5000 : false,
  });

  const categories = useMemo(() => {
    if (!stats?.byCategory) return [];
    return Object.keys(stats.byCategory);
  }, [stats]);

  const filteredLogs = useMemo(() => {
    let result = logs;

    if (levelFilter !== "all") {
      result = result.filter((log) => log.level === levelFilter);
    }

    if (categoryFilter !== "all") {
      result = result.filter((log) => log.category === categoryFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (log) =>
          log.message.toLowerCase().includes(query) ||
          log.category.toLowerCase().includes(query)
      );
    }

    return result;
  }, [logs, levelFilter, categoryFilter, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleClearLogs = async () => {
    try {
      const res = await fetch("/api/logs", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear logs");
      refetch();
      refetchStats();
    } catch (error) {
      console.error("Failed to clear logs:", error);
    }
  };

  const handleExportLogs = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] text-slate-300">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 bg-[#0d0d14]">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 bg-[#12121a] border-slate-700 text-slate-300 font-mono text-sm placeholder:text-slate-600"
            data-testid="input-search-logs"
          />
        </div>

        <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as LogLevel | "all")}>
          <SelectTrigger className="w-28 h-8 bg-[#12121a] border-slate-700 text-slate-300 font-mono text-sm" data-testid="select-level-filter">
            <Filter className="w-3 h-3 mr-1 text-slate-500" />
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent className="bg-[#12121a] border-slate-700">
            <SelectItem value="all" className="font-mono">All Levels</SelectItem>
            <SelectItem value="debug" className="font-mono text-slate-500">[...] Debug</SelectItem>
            <SelectItem value="info" className="font-mono text-cyan-400">[INF] Info</SelectItem>
            <SelectItem value="success" className="font-mono text-green-400">[OK!] Success</SelectItem>
            <SelectItem value="warn" className="font-mono text-yellow-400">[WRN] Warning</SelectItem>
            <SelectItem value="error" className="font-mono text-red-400">[ERR] Error</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-32 h-8 bg-[#12121a] border-slate-700 text-slate-300 font-mono text-sm" data-testid="select-category-filter">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent className="bg-[#12121a] border-slate-700">
            <SelectItem value="all" className="font-mono">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat} className="font-mono text-cyan-400">
                [{cat}]
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button
          size="sm"
          variant={autoRefresh ? "default" : "outline"}
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`h-8 font-mono text-xs ${autoRefresh ? "bg-green-600 hover:bg-green-700" : "bg-slate-800 border-slate-700"}`}
          data-testid="button-auto-refresh"
        >
          {autoRefresh ? (
            <>
              <Play className="w-3 h-3 mr-1" />
              LIVE
            </>
          ) : (
            <>
              <Pause className="w-3 h-3 mr-1" />
              PAUSED
            </>
          )}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={handleExportLogs}
          className="h-8 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          data-testid="button-export-logs"
        >
          <Download className="w-3 h-3 mr-1" />
          Export
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={handleClearLogs}
          className="h-8 text-slate-400 hover:text-red-400 hover:bg-slate-800"
          data-testid="button-clear-logs"
        >
          <Trash2 className="w-3 h-3 mr-1" />
          Clear
        </Button>
      </div>

      <ScrollArea className="flex-1 bg-[#0a0a0f]">
        <div className="p-2">
          <TerminalHeader
            title="AUTOCODER SYSTEM LOGS"
            subtitle="Real-time Application Monitoring"
          />

          {stats && (
            <div className="font-mono text-sm mb-4">
              <TerminalSection title="STATS">
                <TerminalTreeItem
                  text={`Total Logs: ${stats.total}`}
                  color="text-slate-300"
                />
                <TerminalTreeItem
                  text={`Errors: ${stats.byLevel.error || 0}`}
                  color={stats.byLevel.error ? "text-red-400" : "text-slate-500"}
                />
                <TerminalTreeItem
                  text={`Warnings: ${stats.byLevel.warn || 0}`}
                  color={stats.byLevel.warn ? "text-yellow-400" : "text-slate-500"}
                />
                <TerminalTreeItem
                  text={`Success: ${stats.byLevel.success || 0}`}
                  color="text-green-400"
                  isLast
                />
              </TerminalSection>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-slate-500 font-mono">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              Loading logs...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-500 font-mono">
              <div className="text-cyan-600 mb-2">{">"} No logs found</div>
              <div className="text-sm">Logs will appear here as the application runs</div>
            </div>
          ) : (
            <div>
              {filteredLogs.map((log) => (
                <TerminalLogEntry
                  key={log.id}
                  log={log}
                  isExpanded={expandedLogs.has(log.id)}
                  onToggle={() => toggleExpand(log.id)}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="px-3 py-2 border-t border-slate-800 bg-[#0d0d14] font-mono text-xs text-slate-500 flex items-center justify-between">
        <span>
          Showing {filteredLogs.length} of {logs.length} entries
        </span>
        <div className="flex items-center gap-4">
          {stats?.byLevel.error ? (
            <span className="text-red-400">
              {stats.byLevel.error} errors
            </span>
          ) : null}
          {stats?.byLevel.warn ? (
            <span className="text-yellow-400">
              {stats.byLevel.warn} warnings
            </span>
          ) : null}
          <span className={autoRefresh ? "text-green-400" : "text-slate-600"}>
            {autoRefresh ? "● LIVE" : "○ PAUSED"}
          </span>
        </div>
      </div>
    </div>
  );
}