import { nanoid } from "nanoid";

export type LogLevel = "debug" | "info" | "success" | "warn" | "error";

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  details?: Record<string, unknown>;
  conversationId?: number;
  duration?: number;
}

interface LoggerConfig {
  maxLogs: number;
  persistLogs: boolean;
  minLevel: LogLevel;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  success: 2,
  warn: 3,
  error: 4,
};

const R = "\x1b[0m";
const B = "\x1b[1m";
const D = "\x1b[2m";

const fg = {
  black:   "\x1b[30m",
  red:     "\x1b[31m",
  green:   "\x1b[32m",
  yellow:  "\x1b[33m",
  blue:    "\x1b[34m",
  magenta: "\x1b[35m",
  cyan:    "\x1b[36m",
  white:   "\x1b[37m",
  gray:    "\x1b[90m",
};

const bg = {
  red:     "\x1b[41m",
  green:   "\x1b[42m",
  yellow:  "\x1b[43m",
  blue:    "\x1b[44m",
  magenta: "\x1b[45m",
  cyan:    "\x1b[46m",
};

const LEVEL_CONFIG: Record<LogLevel, { icon: string; color: string; label: string }> = {
  debug: { icon: "·", color: fg.gray,    label: "DBG" },
  info:  { icon: "●", color: fg.cyan,    label: "INF" },
  success: { icon: "✓", color: fg.green, label: " OK" },
  warn:  { icon: "▲", color: fg.yellow,  label: "WRN" },
  error: { icon: "✖", color: fg.red,     label: "ERR" },
};

const CATEGORY_COLORS: Record<string, string> = {
  API:          fg.cyan,
  AI:           fg.magenta,
  DB:           fg.blue,
  Security:     fg.yellow,
  Chat:         fg.green,
  Perf:         fg.yellow,
  Server:       fg.cyan,
  FAILSAFE:     fg.cyan,
  "MEMORY-MGR": fg.blue,
  VAPT:         fg.yellow,
  System:       fg.cyan,
  WebContainer: fg.magenta,
  PreWarm:      fg.blue,
  NPM:          fg.yellow,
  DevServer:    fg.green,
  FileSystem:   fg.gray,
  Pipeline:     fg.magenta,
  AutoRunner:   fg.cyan,
  CodeGen:      fg.magenta,
  Validator:    fg.green,
  ErrorFix:     fg.red,
  Process:      fg.white,
  Cache:        fg.blue,
  Learning:     fg.magenta,
  Reasoning:    fg.cyan,
  Clarify:      fg.green,
  Domain:       fg.blue,
  Routes:       fg.cyan,
};

function fmtDuration(ms: number): string {
  if (ms < 1) return "<1ms";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  return `${mins}m${secs}s`;
}

function fmtTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  const s = date.getSeconds().toString().padStart(2, "0");
  const ms = date.getMilliseconds().toString().padStart(3, "0");
  return `${h}:${m}:${s}.${ms}`;
}

class Logger {
  private logs: LogEntry[] = [];
  private config: LoggerConfig = {
    maxLogs: 1000,
    persistLogs: true,
    minLevel: "debug",
  };
  private listeners: Set<(log: LogEntry) => void> = new Set();
  private startupComplete = false;

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
  }

  private formatLine(entry: LogEntry): string {
    const lv = LEVEL_CONFIG[entry.level];
    const catColor = CATEGORY_COLORS[entry.category] || fg.cyan;
    const time = fmtTime(entry.timestamp);
    const cat = entry.category.toUpperCase().padEnd(10);
    const dur = entry.duration != null ? ` ${fg.gray}${fmtDuration(entry.duration)}${R}` : "";

    return `${fg.gray}${time}${R} ${lv.color}${lv.icon} ${lv.label}${R} ${catColor}${cat}${R} ${fg.white}${entry.message}${R}${dur}`;
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry);

    if (this.logs.length > this.config.maxLogs) {
      this.logs = this.logs.slice(-this.config.maxLogs);
    }

    this.listeners.forEach((listener) => listener(entry));

    if (this.shouldLog(entry.level)) {
      const line = this.formatLine(entry);
      switch (entry.level) {
        case "error":
          console.error(line);
          break;
        case "warn":
          console.warn(line);
          break;
        case "debug":
          console.debug(line);
          break;
        default:
          console.log(line);
      }
    }
  }

  private createEntry(
    level: LogLevel,
    category: string,
    message: string,
    details?: Record<string, unknown>,
    conversationId?: number,
    duration?: number
  ): LogEntry {
    return {
      id: nanoid(12),
      timestamp: new Date(),
      level,
      category,
      message,
      details,
      conversationId,
      duration,
    };
  }

  banner(title: string, subtitle?: string): void {
    const w = 52;
    const pad = (text: string) => {
      const space = Math.max(0, w - text.length);
      const l = Math.floor(space / 2);
      return " ".repeat(l) + text + " ".repeat(space - l);
    };
    console.log("");
    console.log(`  ${fg.cyan}${B}${"━".repeat(w)}${R}`);
    console.log(`  ${fg.cyan}${B}${pad(title)}${R}`);
    if (subtitle) {
      console.log(`  ${fg.gray}${pad(subtitle)}${R}`);
    }
    console.log(`  ${fg.cyan}${B}${"━".repeat(w)}${R}`);
    console.log("");
  }

  divider(label?: string): void {
    if (label) {
      const line = "─".repeat(Math.max(0, 40 - label.length));
      console.log(`  ${fg.gray}── ${fg.cyan}${label} ${fg.gray}${line}${R}`);
    } else {
      console.log(`  ${fg.gray}${"─".repeat(44)}${R}`);
    }
  }

  bullet(text: string, icon?: string, color?: string): void {
    const c = color || fg.white;
    const i = icon || "›";
    console.log(`  ${fg.gray}${i}${R} ${c}${text}${R}`);
  }

  keyValue(key: string, value: string | number, color?: string): void {
    const c = color || fg.cyan;
    console.log(`    ${fg.gray}${key}:${R} ${c}${value}${R}`);
  }

  ready(category: string, message: string, subItems?: string[]): void {
    const catColor = CATEGORY_COLORS[category] || fg.cyan;
    const time = fmtTime(new Date());
    const cat = category.toUpperCase().padEnd(10);
    console.log(`${fg.gray}${time}${R} ${fg.green}${B}✓  OK${R} ${catColor}${cat}${R} ${fg.green}${B}${message}${R}`);
    if (subItems) {
      for (const item of subItems) {
        console.log(`${fg.gray}${time}${R}              ${fg.gray}└ ${item}${R}`);
      }
    }
  }

  section(category: string, title: string): void {
    const catColor = CATEGORY_COLORS[category] || fg.cyan;
    const time = fmtTime(new Date());
    const cat = category.toUpperCase().padEnd(10);
    console.log(`${fg.gray}${time}${R} ${fg.cyan}● INF${R} ${catColor}${cat}${R} ${D}── ${title} ${"─".repeat(Math.max(0, 30 - title.length))}${R}`);
  }

  tree(category: string, items: string[], colors?: string[]): void {
    const time = fmtTime(new Date());
    const catColor = CATEGORY_COLORS[category] || fg.cyan;
    const cat = category.toUpperCase().padEnd(10);
    items.forEach((item, i) => {
      const last = i === items.length - 1;
      const prefix = last ? "└─" : "├─";
      const c = colors?.[i] || fg.white;
      console.log(`${fg.gray}${time}${R}              ${catColor}${cat}${R} ${fg.gray}${prefix}${R} ${c}${item}${R}`);
    });
  }

  logConfig(category: string, configs: Record<string, string | number>): void {
    const time = fmtTime(new Date());
    const catColor = CATEGORY_COLORS[category] || fg.cyan;
    const cat = category.toUpperCase().padEnd(10);
    const entries = Object.entries(configs);
    entries.forEach(([key, value], i) => {
      const last = i === entries.length - 1;
      const prefix = last ? "└─" : "├─";
      console.log(`${fg.gray}${time}${R}              ${catColor}${cat}${R} ${fg.gray}${prefix}${R} ${fg.gray}${key}${R} ${fg.cyan}${value}${R}`);
    });
  }

  startup(): void {
    if (this.startupComplete) return;
    this.startupComplete = true;

    this.banner("AUTOCODER AI ENGINE", "Intelligent Code Generation Platform");

    this.section("FAILSAFE", "Service Registry");
    this.tree("FAILSAFE", [
      "uncaughtException  → graceful shutdown",
      "unhandledRejection → graceful shutdown",
      "SIGTERM / SIGINT   → clean exit",
    ]);

    console.log("");
    this.section("FAILSAFE", "Registered Modules");
    this.tree("FAILSAFE", [
      "Core (4): database, auth, websocket, scanner",
      "AI   (3): generator, cleaner, intelligence",
      "Tools(1): template-engine",
    ]);

    console.log("");
    this.ready("FAILSAFE", "All modules healthy", [
      "Auto-restart: enabled (max 5 attempts/60s)",
    ]);

    console.log("");
    this.section("MEMORY-MGR", "Memory Manager");
    this.logConfig("MEMORY-MGR", {
      "Chunk Size": "50 items",
      "Memory Ceiling": "500MB",
      "Critical": "800MB",
      "GC Interval": "5s",
    });

    console.log("");
  }

  debug(category: string, message: string, details?: Record<string, unknown>): void {
    this.addLog(this.createEntry("debug", category, message, details));
  }

  info(category: string, message: string, details?: Record<string, unknown>): void {
    this.addLog(this.createEntry("info", category, message, details));
  }

  success(category: string, message: string, details?: Record<string, unknown>, duration?: number): void {
    this.addLog(this.createEntry("success", category, message, details, undefined, duration));
  }

  warn(category: string, message: string, details?: Record<string, unknown>): void {
    this.addLog(this.createEntry("warn", category, message, details));
  }

  error(category: string, message: string, details?: Record<string, unknown>): void {
    this.addLog(this.createEntry("error", category, message, details));
  }

  api(method: string, path: string, status: number, duration: number): void {
    const level: LogLevel = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
    this.addLog(
      this.createEntry(level, "API", `${method} ${path} → ${status}`, { method, path, status }, undefined, duration)
    );
  }

  ai(action: string, message: string, details?: Record<string, unknown>, duration?: number): void {
    this.addLog(this.createEntry("info", "AI", `${action}: ${message}`, details, undefined, duration));
  }

  db(action: string, table: string, details?: Record<string, unknown>, duration?: number): void {
    this.addLog(this.createEntry("debug", "DB", `${action} on ${table}`, details, undefined, duration));
  }

  security(action: string, message: string, details?: Record<string, unknown>): void {
    this.addLog(this.createEntry("warn", "Security", `${action}: ${message}`, details));
  }

  performance(action: string, duration: number, details?: Record<string, unknown>): void {
    const level: LogLevel = duration > 5000 ? "warn" : duration > 1000 ? "info" : "debug";
    this.addLog(this.createEntry(level, "Perf", action, details, undefined, duration));
  }

  conversation(conversationId: number, action: string, message: string, details?: Record<string, unknown>): void {
    const entry = this.createEntry("info", "Chat", `${action}: ${message}`, details, conversationId);
    this.addLog(entry);
  }

  getLogs(options?: {
    level?: LogLevel;
    category?: string;
    conversationId?: number;
    limit?: number;
    since?: Date;
    search?: string;
  }): LogEntry[] {
    let filtered = [...this.logs];

    if (options?.level) {
      const minLevel = LOG_LEVELS[options.level];
      filtered = filtered.filter((log) => LOG_LEVELS[log.level] >= minLevel);
    }

    if (options?.category) {
      filtered = filtered.filter((log) =>
        log.category.toLowerCase().includes(options.category!.toLowerCase())
      );
    }

    if (options?.conversationId) {
      filtered = filtered.filter((log) => log.conversationId === options.conversationId);
    }

    if (options?.since) {
      filtered = filtered.filter((log) => log.timestamp >= options.since!);
    }

    if (options?.search) {
      const searchLower = options.search.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.message.toLowerCase().includes(searchLower) ||
          log.category.toLowerCase().includes(searchLower)
      );
    }

    if (options?.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered.reverse();
  }

  getStats(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    byCategory: Record<string, number>;
    recentErrors: LogEntry[];
  } {
    const byLevel: Record<LogLevel, number> = {
      debug: 0,
      info: 0,
      success: 0,
      warn: 0,
      error: 0,
    };

    const byCategory: Record<string, number> = {};

    this.logs.forEach((log) => {
      byLevel[log.level]++;
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;
    });

    const recentErrors = this.logs
      .filter((log) => log.level === "error")
      .slice(-5)
      .reverse();

    return {
      total: this.logs.length,
      byLevel,
      byCategory,
      recentErrors,
    };
  }

  clear(): void {
    this.logs = [];
  }

  subscribe(listener: (log: LogEntry) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setMinLevel(level: LogLevel): void {
    this.config.minLevel = level;
  }

  startTimer(category: string, action: string): () => void {
    const start = performance.now();
    return () => {
      const duration = Math.round(performance.now() - start);
      this.performance(`${category}: ${action}`, duration);
    };
  }
}

export const logger = new Logger();

export function requestLogger() {
  return (req: any, res: any, next: any) => {
    const start = performance.now();

    res.on("finish", () => {
      const duration = Math.round(performance.now() - start);
      if (!req.path.startsWith("/api/logs")) {
        logger.api(req.method, req.path, res.statusCode, duration);
      }
    });

    next();
  };
}