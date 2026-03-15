type LogLevel = 'debug' | 'info' | 'success' | 'warn' | 'error';

interface RunnerLogEntry {
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  details?: Record<string, unknown>;
  duration?: number;
}

type LogListener = (entry: RunnerLogEntry) => void;

const LEVEL_STYLES: Record<LogLevel, { badge: string; text: string; icon: string }> = {
  debug: {
    badge: 'background:#1e293b;color:#64748b;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px',
    text: 'color:#94a3b8',
    icon: '·'
  },
  info: {
    badge: 'background:#0c4a6e;color:#38bdf8;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px',
    text: 'color:#7dd3fc',
    icon: '●'
  },
  success: {
    badge: 'background:#14532d;color:#4ade80;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px',
    text: 'color:#86efac',
    icon: '✓'
  },
  warn: {
    badge: 'background:#78350f;color:#fbbf24;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px',
    text: 'color:#fcd34d',
    icon: '▲'
  },
  error: {
    badge: 'background:#7f1d1d;color:#f87171;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px',
    text: 'color:#fca5a5',
    icon: '✖'
  },
};

const CATEGORY_STYLES: Record<string, string> = {
  'WebContainer': 'background:#1e1b4b;color:#a78bfa;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px',
  'PreWarm':      'background:#172554;color:#38bdf8;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px',
  'NPM':          'background:#431407;color:#fb923c;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px',
  'DevServer':    'background:#052e16;color:#34d399;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px',
  'FileSystem':   'background:#1c1917;color:#a8a29e;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px',
  'Pipeline':     'background:#312e81;color:#818cf8;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px',
  'AutoRunner':   'background:#0c4a6e;color:#38bdf8;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px',
  'CodeGen':      'background:#4a044e;color:#e879f9;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px',
  'Validator':    'background:#365314;color:#a3e635;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px',
  'ErrorFix':     'background:#450a0a;color:#fb7185;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px',
  'Process':      'background:#292524;color:#d6d3d1;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px',
  'Cache':        'background:#1e3a5f;color:#7dd3fc;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px',
};

const DEFAULT_CATEGORY_STYLE = 'background:#1e293b;color:#cbd5e1;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px';

function fmtDuration(ms: number): string {
  if (ms < 1) return '<1ms';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  return `${mins}m${secs}s`;
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;
}

class RunnerLogger {
  private logs: RunnerLogEntry[] = [];
  private listeners: Set<LogListener> = new Set();
  private maxLogs = 500;
  private timers: Map<string, number> = new Map();

  private emit(level: LogLevel, category: string, message: string, details?: Record<string, unknown>, duration?: number): void {
    const entry: RunnerLogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      details,
      duration,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    this.listeners.forEach(fn => fn(entry));

    const lvl = LEVEL_STYLES[level];
    const catStyle = CATEGORY_STYLES[category] || DEFAULT_CATEGORY_STYLE;
    const timeStr = fmtTime(entry.timestamp);
    const durStr = duration != null ? ` ${fmtDuration(duration)}` : '';

    const fmt = `%c${timeStr}%c %c${lvl.icon} ${level.toUpperCase().padEnd(5)}%c %c${category}%c ${message}${durStr}`;
    const args = [
      fmt,
      'color:#475569;font-size:11px;font-family:monospace',
      '',
      lvl.badge,
      '',
      catStyle,
      lvl.text,
    ];

    switch (level) {
      case 'error': console.error(...args); break;
      case 'warn': console.warn(...args); break;
      default: console.log(...args);
    }

    if (details && Object.keys(details).length > 0) {
      const pairs = Object.entries(details)
        .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join('  ·  ');
      console.log(`%c  └─ ${pairs}`, 'color:#475569;font-size:11px;font-style:italic;padding-left:8px');
    }
  }

  debug(category: string, message: string, details?: Record<string, unknown>): void {
    this.emit('debug', category, message, details);
  }

  info(category: string, message: string, details?: Record<string, unknown>): void {
    this.emit('info', category, message, details);
  }

  success(category: string, message: string, details?: Record<string, unknown>, duration?: number): void {
    this.emit('success', category, message, details, duration);
  }

  warn(category: string, message: string, details?: Record<string, unknown>, duration?: number): void {
    this.emit('warn', category, message, details, duration);
  }

  error(category: string, message: string, details?: Record<string, unknown>, duration?: number): void {
    this.emit('error', category, message, details, duration);
  }

  startTimer(label: string): void {
    this.timers.set(label, performance.now());
  }

  endTimer(label: string): number {
    const start = this.timers.get(label);
    if (start == null) return 0;
    this.timers.delete(label);
    return Math.round(performance.now() - start);
  }

  group(category: string, title: string): void {
    const catStyle = CATEGORY_STYLES[category] || DEFAULT_CATEGORY_STYLE;
    const timeStr = fmtTime(Date.now());
    console.groupCollapsed(
      `%c${timeStr}%c %c${category}%c ${title}`,
      'color:#475569;font-size:11px;font-family:monospace', '',
      catStyle, 'color:#cbd5e1'
    );
  }

  groupEnd(): void {
    console.groupEnd();
  }

  separator(label?: string): void {
    const line = label
      ? `── ${label} ${'─'.repeat(Math.max(0, 44 - label.length))}`
      : '─'.repeat(50);
    console.log(`%c${line}`, 'color:#334155;font-size:11px');
  }

  subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  getLogs(): RunnerLogEntry[] {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }
}

export const runnerLog = new RunnerLogger();
export type { RunnerLogEntry, LogLevel as RunnerLogLevel, LogListener };

const ANSI_RE = /\x1B(?:\[[0-9;]*[A-Za-z]|\(B)/g;
const SPINNER_RE = /^[|/\-\\⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]$/;

export type NpmLineCallback = (cleanLine: string, level: 'success' | 'warn' | 'error' | 'info' | 'debug') => void;

export interface NpmProgress {
  fetched: number;
  resolved: number;
  reified: number;
  phase: 'resolving' | 'fetching' | 'reifying' | 'auditing' | 'done' | 'idle';
  packages: string[];
}

export class NpmOutputParser {
  private buffer = '';
  private seen = new Set<string>();
  private fetchedPackages = new Set<string>();
  private onLine?: NpmLineCallback;
  private _progress: NpmProgress = {
    fetched: 0,
    resolved: 0,
    reified: 0,
    phase: 'idle',
    packages: [],
  };

  constructor(onLine?: NpmLineCallback) {
    this.onLine = onLine;
  }

  get progress(): NpmProgress {
    return { ...this._progress, packages: [...this._progress.packages] };
  }

  private clean(raw: string): string {
    return raw.replace(ANSI_RE, '').replace(/\r/g, '');
  }

  private isNoise(line: string): boolean {
    if (!line || SPINNER_RE.test(line)) return true;
    if (line.length <= 2 && !/\w{2}/.test(line)) return true;
    if (/^npm warn using --force/.test(line)) return true;
    return false;
  }

  private emitLine(line: string, level: 'success' | 'warn' | 'error' | 'info' | 'debug'): void {
    switch (level) {
      case 'success': runnerLog.success('NPM', line); break;
      case 'warn': runnerLog.warn('NPM', line); break;
      case 'error': runnerLog.error('NPM', line); break;
      case 'info': runnerLog.info('NPM', line); break;
      case 'debug': runnerLog.debug('NPM', line); break;
    }
    this.onLine?.(line, level);
  }

  private extractPackageName(url: string): string {
    let pkg = url.replace(/^https?:\/\/registry\.npmjs\.org\//, '');
    pkg = pkg.split('/-/')[0];
    pkg = decodeURIComponent(pkg);
    if (pkg.length > 60) pkg = pkg.slice(0, 57) + '...';
    return pkg;
  }

  feed(chunk: string): void {
    this.buffer += this.clean(chunk);
    const parts = this.buffer.split('\n');
    this.buffer = parts.pop() || '';

    for (const raw of parts) {
      const line = raw.trim();
      if (this.isNoise(line)) continue;
      if (this.seen.has(line)) continue;
      this.seen.add(line);

      if (/added \d+ package/i.test(line)) {
        this._progress.phase = 'done';
        this.emitLine(line, 'success');
      } else if (/npm warn/i.test(line) || /WARN/i.test(line)) {
        this.emitLine(line, 'warn');
      } else if (/npm error/i.test(line) || /ERR!/i.test(line) || /ERESOLVE|E404|ENOENT|ETARGET/i.test(line)) {
        this.emitLine(line, 'error');
      } else if (/http fetch (GET|POST)/i.test(line)) {
        this._progress.phase = 'fetching';
        const m = line.match(/http fetch (GET|POST)\s+(\d+)\s+(\S+)/i);
        if (m) {
          const statusCode = m[2];
          const pkg = this.extractPackageName(m[3]);
          if (!this.fetchedPackages.has(pkg)) {
            this.fetchedPackages.add(pkg);
            this._progress.fetched = this.fetchedPackages.size;
            this._progress.packages.push(pkg);
          }
          const statusOk = statusCode.startsWith('2') || statusCode === '304';
          if (!statusOk) {
            this.emitLine(`⚠ ${pkg} HTTP ${statusCode}`, 'warn');
          } else if (this._progress.fetched % 10 === 0 || this._progress.fetched <= 3) {
            this.emitLine(`📦 ${this._progress.fetched} packages downloaded...`, 'info');
          }
        }
      } else if (/^npm http/i.test(line)) {
        // silently track, don't emit noise
      } else if (/idealTree/i.test(line)) {
        if (this._progress.phase !== 'resolving') {
          this._progress.phase = 'resolving';
          this.emitLine('Resolving dependency tree...', 'info');
        }
        this._progress.resolved++;
      } else if (/reify/i.test(line)) {
        if (this._progress.phase !== 'reifying') {
          this._progress.phase = 'reifying';
          this.emitLine('Installing packages to node_modules...', 'info');
        }
        this._progress.reified++;
      } else if (/audit/i.test(line) && !/no-audit/.test(line)) {
        this._progress.phase = 'auditing';
        this.emitLine(line, 'info');
      } else if (line.length > 3) {
        this.emitLine(line, 'info');
      }
    }
  }

  flush(): void {
    if (this.buffer.trim()) {
      const line = this.buffer.trim();
      if (!this.isNoise(line) && !this.seen.has(line)) {
        this.seen.add(line);
        if (/added \d+ package/i.test(line)) {
          this.emitLine(line, 'success');
        } else if (/ERR|error/i.test(line)) {
          this.emitLine(line, 'error');
        } else if (line.length > 3) {
          this.emitLine(line, 'info');
        }
      }
    }
    this.buffer = '';
    this.seen.clear();
  }

  reset(): void {
    this.buffer = '';
    this.seen.clear();
    this.fetchedPackages.clear();
    this._progress = { fetched: 0, resolved: 0, reified: 0, phase: 'idle', packages: [] };
  }
}