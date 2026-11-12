import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import { ApiEndpointContract, ProjectContract } from './contracts';

const execFileAsync = promisify(execFile);

export interface DependencyInstallResult {
  executed: boolean;
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  command: string;
  error?: string;
}

export interface BuildExecutionResult {
  executed: boolean;
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  command: string;
  error?: string;
}

export interface RuntimeExecutionResult {
  executed: boolean;
  success: boolean;
  probedRoutes: Array<{ route: string; status: number; ok: boolean; responseTimeMs?: number }>;
  logs: string;
  error?: string;
}

export interface RuntimeTestResult {
  success: boolean;
  structuralChecksPassed: boolean;
  executionVerified: boolean;
  probedRoutes: Array<{ route: string; status: number; ok: boolean }>;
  errors: string[];
}

/**
 * Detects the project package manager with support for all lockfile variants and Windows .cmd execution.
 */
export function detectPackageManager(projectDir: string): { bin: string; runArgs: string[] } {
  const isWin = process.platform === 'win32';
  if (fs.existsSync(path.join(projectDir, 'pnpm-lock.yaml'))) {
    return { bin: isWin ? 'pnpm.cmd' : 'pnpm', runArgs: ['run'] };
  }
  if (fs.existsSync(path.join(projectDir, 'yarn.lock'))) {
    return { bin: isWin ? 'yarn.cmd' : 'yarn', runArgs: ['run'] };
  }
  if (fs.existsSync(path.join(projectDir, 'bun.lockb')) || fs.existsSync(path.join(projectDir, 'bun.lock'))) {
    return { bin: isWin ? 'bun.cmd' : 'bun', runArgs: ['run'] };
  }
  return { bin: isWin ? 'npm.cmd' : 'npm', runArgs: ['run'] };
}

/**
 * Allocates a deterministic, collision-free port per conversation in the private range 31000..39999.
 */
export function allocateIsolatedPort(conversationId: string): number {
  let hash = 0;
  for (let i = 0; i < conversationId.length; i++) {
    hash = (hash << 5) - hash + conversationId.charCodeAt(i);
    hash |= 0;
  }
  return 31000 + Math.abs(hash % 8000);
}

/**
 * Verifies that all dependencies declared in package.json are actually installed in node_modules.
 */
export function areDependenciesInstalled(projectDir: string, pkg: any): boolean {
  const nodeModulesPath = path.join(projectDir, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) return false;

  const required = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];

  for (const dep of required) {
    const depPath = path.join(nodeModulesPath, dep);
    if (!fs.existsSync(depPath)) {
      return false;
    }
  }
  return required.length > 0;
}

/**
 * Installs project dependencies safely with --ignore-scripts to prevent execution of untrusted lifecycle hooks.
 */
export async function installProjectDependencies(
  conversationId: string,
  timeoutMs: number = 180000
): Promise<DependencyInstallResult> {
  const projectDir = path.join(process.cwd(), 'projects', conversationId);
  if (!fs.existsSync(projectDir)) {
    return {
      executed: false,
      success: false,
      exitCode: 1,
      stdout: '',
      stderr: `Project directory does not exist for conversation ${conversationId}.`,
      command: 'install',
      error: 'Project directory not found on disk',
    };
  }

  const pkgJsonPath = path.join(projectDir, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) {
    return {
      executed: false,
      success: true,
      exitCode: 0,
      stdout: '',
      stderr: 'No package.json found; skipping dependency installation.',
      command: 'install',
    };
  }

  let pkg: any = {};
  try {
    pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  } catch (e: any) {
    return {
      executed: false,
      success: false,
      exitCode: 1,
      stdout: '',
      stderr: `Failed to parse package.json: ${e?.message || e}`,
      command: 'install',
      error: 'Malformed package.json',
    };
  }

  // Strong Cache Check: Verify every declared dependency exists on disk
  if (areDependenciesInstalled(projectDir, pkg)) {
    return {
      executed: true,
      success: true,
      exitCode: 0,
      stdout: 'All declared dependencies verified in node_modules.',
      stderr: '',
      command: 'install (verified cache)',
    };
  }

  const { bin } = detectPackageManager(projectDir);
  const isNpm = bin.includes('npm');
  // Sandboxed installation: --ignore-scripts prevents untrusted pre/postinstall hooks
  const installArgs = isNpm
    ? ['install', '--ignore-scripts', '--prefer-offline', '--no-audit', '--no-fund']
    : ['install', '--ignore-scripts'];
  const commandStr = `${bin} ${installArgs.join(' ')}`;

  const sanitizedEnv: NodeJS.ProcessEnv = {
    NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    HOME: process.env.HOME || process.env.USERPROFILE,
    USERPROFILE: process.env.USERPROFILE,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
  };

  try {
    const { stdout, stderr } = await execFileAsync(bin, installArgs, {
      cwd: projectDir,
      timeout: timeoutMs,
      env: sanitizedEnv,
      windowsHide: true,
      maxBuffer: 4 * 1024 * 1024,
    });
    return {
      executed: true,
      success: true,
      exitCode: 0,
      stdout: String(stdout || ''),
      stderr: String(stderr || ''),
      command: commandStr,
    };
  } catch (err: any) {
    return {
      executed: true,
      success: false,
      exitCode: typeof err.code === 'number' ? err.code : 1,
      stdout: String(err.stdout || ''),
      stderr: String(err.stderr || err.message || ''),
      command: commandStr,
      error: err.message,
    };
  }
}

/**
 * Executes the project production build command in projects/<conversationId>/ with timeouts and captured logs.
 */
export async function executeProjectBuild(
  conversationId: string,
  timeoutMs: number = 120000
): Promise<BuildExecutionResult> {
  const projectDir = path.join(process.cwd(), 'projects', conversationId);
  if (!fs.existsSync(projectDir)) {
    return {
      executed: false,
      success: false,
      exitCode: 1,
      stdout: '',
      stderr: `Project directory does not exist for conversation ${conversationId}.`,
      command: 'build',
      error: 'Project directory not found on disk',
    };
  }

  const pkgJsonPath = path.join(projectDir, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) {
    return {
      executed: false,
      success: true,
      exitCode: 0,
      stdout: '',
      stderr: 'No package.json found; skipping build.',
      command: 'build',
    };
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    if (!pkg.scripts?.build) {
      return {
        executed: false,
        success: true,
        exitCode: 0,
        stdout: '',
        stderr: 'No "build" script defined in package.json; skipping build.',
        command: 'build',
      };
    }
  } catch (e: any) {
    return {
      executed: false,
      success: false,
      exitCode: 1,
      stdout: '',
      stderr: `Failed to parse package.json: ${e?.message || e}`,
      command: 'build',
      error: 'Malformed package.json',
    };
  }

  // Ensure dependencies are installed first
  const installRes = await installProjectDependencies(conversationId);
  if (!installRes.success) {
    return {
      executed: true,
      success: false,
      exitCode: installRes.exitCode,
      stdout: installRes.stdout,
      stderr: `Build aborted: Dependency installation failed.\n${installRes.stderr}`,
      command: installRes.command,
      error: 'Dependency installation failed prior to build',
    };
  }

  const { bin, runArgs } = detectPackageManager(projectDir);
  const commandStr = `${bin} ${runArgs.join(' ')} build`;

  const sanitizedEnv: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    HOME: process.env.HOME || process.env.USERPROFILE,
    USERPROFILE: process.env.USERPROFILE,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
    NODE_ENV: 'production',
  };

  try {
    const { stdout, stderr } = await execFileAsync(bin, [...runArgs, 'build'], {
      cwd: projectDir,
      timeout: timeoutMs,
      env: sanitizedEnv,
      windowsHide: true,
      maxBuffer: 4 * 1024 * 1024,
    });
    return {
      executed: true,
      success: true,
      exitCode: 0,
      stdout: String(stdout || ''),
      stderr: String(stderr || ''),
      command: commandStr,
    };
  } catch (err: any) {
    return {
      executed: true,
      success: false,
      exitCode: typeof err.code === 'number' ? err.code : 1,
      stdout: String(err.stdout || ''),
      stderr: String(err.stderr || err.message || ''),
      command: commandStr,
      error: err.message,
    };
  }
}

/**
 * Launches the project application process on an isolated port, probes endpoints over HTTP,
 * records response codes, and reliably terminates the process via exit-event tracking.
 */
export async function executeProjectRuntimeSmokeTest(
  conversationId: string,
  routesToProbe: string[] = ['/'],
  preferredPort?: number,
  readinessTimeoutMs: number = 20000
): Promise<RuntimeExecutionResult> {
  const projectDir = path.join(process.cwd(), 'projects', conversationId);
  if (!fs.existsSync(projectDir)) {
    return {
      executed: false,
      success: false,
      probedRoutes: [],
      logs: '',
      error: `Project directory not found for conversation ${conversationId}.`,
    };
  }

  let startCmd = '';
  let startArgs: string[] = [];

  const pkgJsonPath = path.join(projectDir, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      const { bin, runArgs } = detectPackageManager(projectDir);
      if (pkg.scripts?.start) {
        startCmd = bin;
        startArgs = [...runArgs, 'start'];
      } else if (pkg.scripts?.dev) {
        startCmd = bin;
        startArgs = [...runArgs, 'dev'];
      } else if (pkg.scripts?.serve) {
        startCmd = bin;
        startArgs = [...runArgs, 'serve'];
      } else if (pkg.scripts?.preview) {
        startCmd = bin;
        startArgs = [...runArgs, 'preview'];
      }
    } catch {}
  }

  if (!startCmd) {
    const potentialEntries = [
      'server.js', 'app.js', 'main.js', 'index.js',
      'src/server.ts', 'src/server.js', 'src/index.js', 'src/index.ts',
      'bin/www'
    ];
    for (const entry of potentialEntries) {
      if (fs.existsSync(path.join(projectDir, entry))) {
        startCmd = process.execPath;
        startArgs = [entry];
        break;
      }
    }
  }

  if (!startCmd) {
    return {
      executed: false,
      success: false,
      probedRoutes: [],
      logs: '',
      error: 'No runnable start script or Node.js server entry found.',
    };
  }

  const port = preferredPort || allocateIsolatedPort(conversationId);
  const logs: string[] = [];

  const sanitizedEnv: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    HOME: process.env.HOME || process.env.USERPROFILE,
    USERPROFILE: process.env.USERPROFILE,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
    NODE_ENV: 'test',
    PORT: String(port),
    HOST: '127.0.0.1',
  };

  const child = spawn(startCmd, startArgs, {
    cwd: projectDir,
    env: sanitizedEnv,
    windowsHide: true,
    detached: false,
  });

  // Accurate exit event tracking (fixes child.killed bug)
  let hasExited = false;
  let exitCode: number | null = null;
  child.once('exit', (code) => {
    hasExited = true;
    exitCode = code;
  });

  child.stdout?.on('data', (d) => logs.push(d.toString()));
  child.stderr?.on('data', (d) => logs.push(d.toString()));

  const cleanupProcess = async () => {
    if (hasExited) return;
    try {
      child.kill('SIGTERM');
    } catch {}
    const t0 = Date.now();
    while (!hasExited && Date.now() - t0 < 1500) {
      await new Promise((r) => setTimeout(r, 100));
    }
    if (!hasExited) {
      try {
        child.kill('SIGKILL');
      } catch {}
    }
  };

  const startTime = Date.now();
  let isReady = false;

  // Poll for HTTP readiness
  while (Date.now() - startTime < readinessTimeoutMs) {
    if (hasExited) {
      await cleanupProcess();
      return {
        executed: true,
        success: false,
        probedRoutes: [],
        logs: logs.join('\n'),
        error: `Server process exited prematurely with code ${exitCode}.`,
      };
    }

    try {
      const res = await fetch(`http://127.0.0.1:${port}/`, { method: 'GET', signal: AbortSignal.timeout(1000) });
      if (res.status > 0) {
        isReady = true;
        break;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  if (!isReady) {
    await cleanupProcess();
    return {
      executed: true,
      success: false,
      probedRoutes: [],
      logs: logs.join('\n'),
      error: `Server failed to respond within ${readinessTimeoutMs}ms readiness window on port ${port}.`,
    };
  }

  // Probe all requested routes
  const probedRoutes: Array<{ route: string; status: number; ok: boolean; responseTimeMs: number }> = [];

  for (const route of routesToProbe) {
    const normRoute = route.startsWith('/') ? route : `/${route}`;
    const t0 = Date.now();
    try {
      const res = await fetch(`http://127.0.0.1:${port}${normRoute}`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      const duration = Date.now() - t0;
      const ok = res.status >= 200 && res.status < 400;
      probedRoutes.push({ route: normRoute, status: res.status, ok, responseTimeMs: duration });
    } catch (probeErr: any) {
      probedRoutes.push({ route: normRoute, status: 0, ok: false, responseTimeMs: Date.now() - t0 });
    }
  }

  await cleanupProcess();

  const success = probedRoutes.length > 0 && probedRoutes.every((r) => r.ok);
  return {
    executed: true,
    success,
    probedRoutes,
    logs: logs.join('\n'),
    error: success ? undefined : 'One or more probed routes failed or timed out.',
  };
}

/**
 * Structural fallback route prober for offline or non-server contracts.
 */
export async function probeGeneratedProjectRoutes(
  target: ProjectContract | ApiEndpointContract[],
  vfsFiles: Record<string, string>
): Promise<RuntimeTestResult> {
  const probedRoutes: Array<{ route: string; status: number; ok: boolean }> = [];
  const errors: string[] = [];

  const filePaths = Object.keys(vfsFiles).map((f) => f.replace(/\\/g, '/').replace(/^\.\//, ''));

  let declaredEndpoints: ApiEndpointContract[] = [];
  let entryPoints: string[] = [];
  let framework: string | undefined;

  if (Array.isArray(target)) {
    declaredEndpoints = target;
  } else {
    declaredEndpoints = target.apiEndpoints || [];
    entryPoints = target.entryPoints || [];
    framework = target.framework;
  }

  if (entryPoints.length > 0) {
    const hasDeclaredEntryPoint = entryPoints.some((entry) =>
      filePaths.includes(entry) || filePaths.some((f) => f.endsWith(entry))
    );
    if (!hasDeclaredEntryPoint) {
      errors.push(`Declared entry point(s) not found: ${entryPoints.join(', ')}`);
    } else {
      probedRoutes.push({ route: '/', status: 200, ok: true });
    }
  } else {
    const hasPage = filePaths.some(
      (f) =>
        f === 'app/page.tsx' ||
        f === 'src/app/page.tsx' ||
        f === 'pages/index.tsx' ||
        f === 'src/pages/index.tsx' ||
        f === 'index.html'
    );
    if (!hasPage) {
      errors.push('Project runtime error: No main entry page (app/page.tsx or index.html) found in VFS.');
    } else {
      probedRoutes.push({ route: '/', status: 200, ok: true });
    }
  }

  if (framework === 'REACT_WEBPACK_SPA') {
    const hasWebpackConfig = filePaths.some((f) => /(^|\/)webpack\.config\.(js|cjs|mjs|ts)$/i.test(f));
    if (!hasWebpackConfig) {
      errors.push('React/Webpack project is missing webpack.config.js.');
    }
  }

  for (const ep of declaredEndpoints) {
    const cleanPath = ep.path.replace(/^\/+/, '').replace(/\/+$/, '');
    const hasRouteHandler = filePaths.some((f) => f.includes(cleanPath));
    if (hasRouteHandler) {
      probedRoutes.push({ route: ep.path, status: 200, ok: true });
    } else {
      probedRoutes.push({ route: ep.path, status: 404, ok: false });
      errors.push(`Runtime Probe Error: Route ${ep.method} ${ep.path} missing handler file.`);
    }
  }

  return {
    success: errors.length === 0,
    structuralChecksPassed: errors.length === 0,
    executionVerified: false,
    probedRoutes,
    errors,
  };
}

export interface StaticSmokeTestOptions {
  conversationId: string;
  projectDir: string;
  observationWindowMs?: number; // Default 2500ms
  entryFile?: string;          // Default 'index.html'
}

/**
 * Sandboxed headless Chrome CDP smoke test with bulletproof Fetch-origin allowlisting
 * and observed HTTP response status capture.
 */
export async function executeStaticFrontendSmokeTest(
  options: StaticSmokeTestOptions
): Promise<RuntimeExecutionResult> {
  const {
    projectDir,
    observationWindowMs = 2500,
    entryFile = 'index.html',
  } = options;

  const safeBaseDir = path.resolve(projectDir);
  const realBase = fs.existsSync(safeBaseDir) ? fs.realpathSync(safeBaseDir) : safeBaseDir;
  const targetHtmlPath = path.resolve(realBase, entryFile);

  if (!targetHtmlPath.startsWith(realBase + path.sep) && targetHtmlPath !== realBase) {
    return {
      executed: false,
      success: false,
      probedRoutes: [],
      logs: '',
      error: `Forbidden: Entry file ${entryFile} escapes project boundary.`,
    };
  }

  if (!fs.existsSync(targetHtmlPath)) {
    return {
      executed: false,
      success: false,
      probedRoutes: [],
      logs: '',
      error: `Entry file ${entryFile} not found in project directory.`,
    };
  }

  // 1. Confined Ephemeral HTTP Server
  const staticServer = http.createServer((req, res) => {
    let reqPath = req.url?.split('?')[0] || '/';
    if (reqPath === '/' || reqPath === '') reqPath = `/${entryFile}`;

    const cleanRel = reqPath.replace(/^\/+/, '');

    // Automatically serve 204 No Content for browser-initiated favicon requests
    if (cleanRel === 'favicon.ico') {
      res.writeHead(204, { 'Content-Type': 'image/x-icon' });
      res.end();
      return;
    }

    const candidatePath = path.resolve(realBase, cleanRel);

    if (!candidatePath.startsWith(realBase + path.sep) && candidatePath !== realBase) {
      res.writeHead(403);
      res.end('Forbidden: Traversal detected');
      return;
    }

    try {
      if (!fs.existsSync(candidatePath)) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      const realTarget = fs.realpathSync(candidatePath);
      if (!realTarget.startsWith(realBase + path.sep) && realTarget !== realBase) {
        res.writeHead(403);
        res.end('Forbidden: Symlink escape detected');
        return;
      }

      if (fs.statSync(realTarget).isDirectory()) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      const ext = path.extname(realTarget);
      const mimeTypes: Record<string, string> = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
      };

      res.writeHead(200, {
        'Content-Type': mimeTypes[ext] || 'text/plain',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
      });
      fs.createReadStream(realTarget).pipe(res);
    } catch {
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  });

  await new Promise<void>((resolve) => staticServer.listen(0, '127.0.0.1', () => resolve()));
  const staticPort = (staticServer.address() as { port: number }).port;
  const allowedOrigin = `http://127.0.0.1:${staticPort}`;

  // 2. Ephemeral User Profile & Chrome Process Spawn
  const tmpUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'autocoder-chrome-'));
  const chromeProcess = spawn('google-chrome', [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${tmpUserDataDir}`,
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-sync',
    '--disable-default-apps',
    '--mute-audio',
  ], {
    detached: true,
  });

  let cdpWsUrl = '';
  const uncaughtExceptions: Array<{ text: string; url?: string; line?: number }> = [];
  const consoleErrors: string[] = [];
  let observedHttpStatus: number | null = null;

  let isProcessExited = false;
  let processExitCode: number | null = null;
  chromeProcess.on('exit', (code) => {
    isProcessExited = true;
    processExitCode = code;
  });

  try {
    cdpWsUrl = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Headless Chrome startup timed out after 5000ms.')), 5000);
      let stderrBuffer = '';
      chromeProcess.stderr?.on('data', (chunk) => {
        stderrBuffer += chunk.toString();
        const match = stderrBuffer.match(/DevTools listening on (ws:\/\/127\.0\.0\.1:\d+\/devtools\/browser\/[a-f0-9-]+)/);
        if (match) {
          clearTimeout(timeout);
          resolve(match[1]);
        }
      });
      chromeProcess.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    const cdpHttpPort = cdpWsUrl.match(/127\.0\.0\.1:(\d+)/)?.[1];
    const newTabRes = await fetch(`http://127.0.0.1:${cdpHttpPort}/json/new`, { method: 'PUT' });
    const tabData = await newTabRes.json();
    const tabWsUrl = tabData.webSocketDebuggerUrl;

    // 3. Deterministic Lifecycle State Machine via WebSocket
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(tabWsUrl);
      let msgId = 1;
      let loadEventFired = false;
      let observationTimer: NodeJS.Timeout | null = null;

      const send = (method: string, params = {}) => {
        const id = msgId++;
        ws.send(JSON.stringify({ id, method, params }));
        return id;
      };

      const failTimeout = setTimeout(() => {
        ws.close();
        if (!loadEventFired) {
          reject(new Error('Page.loadEventFired timed out after 6000ms. Navigation failed or hung.'));
        } else {
          resolve();
        }
      }, 10000);

      ws.onopen = async () => {
        send('Runtime.enable');
        send('Page.enable');
        send('Log.enable');
        send('Network.enable');

        // NETWORK ISOLATION: Intercept ALL requests and enforce strict origin allowlisting
        send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });

        // Explicit Page Navigation
        const targetUrl = `${allowedOrigin}/${entryFile}`;
        send('Page.navigate', { url: targetUrl });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);

          // Handle Fetch request pause for origin allowlisting
          if (data.method === 'Fetch.requestPaused') {
            const { requestId, request } = data.params;
            try {
              const reqUrl = new URL(request.url);
              // Allow requests ONLY matching the ephemeral local static server origin
              if (reqUrl.origin === allowedOrigin) {
                send('Fetch.continueRequest', { requestId });
              } else {
                if (!request.url?.endsWith('favicon.ico')) {
                  const blockedMsg = `Blocked external resource request (AccessDenied): ${request.url}`;
                  if (!consoleErrors.includes(blockedMsg)) {
                    consoleErrors.push(blockedMsg);
                  }
                }
                send('Fetch.failRequest', { requestId, errorReason: 'AccessDenied' });
              }
            } catch {
              if (!request.url?.endsWith('favicon.ico')) {
                const blockedMsg = `Blocked external resource request (AccessDenied): ${request.url}`;
                if (!consoleErrors.includes(blockedMsg)) {
                  consoleErrors.push(blockedMsg);
                }
              }
              send('Fetch.failRequest', { requestId, errorReason: 'AccessDenied' });
            }
          }

          // Record real observed HTTP status for the main document and report real resource failures with exact URL
          if (data.method === 'Network.responseReceived') {
            const { response, type } = data.params;
            if (type === 'Document') {
              observedHttpStatus = response.status;
            } else if (response.status >= 400 && !response.url?.endsWith('favicon.ico')) {
              consoleErrors.push(
                `Failed to load resource: ${response.url} responded with HTTP ${response.status} (${response.statusText || 'Not Found'})`
              );
            }
          }

          if (data.method === 'Page.loadEventFired') {
            loadEventFired = true;
            // ONLY start observation window after page has completely loaded
            observationTimer = setTimeout(() => {
              clearTimeout(failTimeout);
              ws.close();
              resolve();
            }, observationWindowMs);
          }

          if (data.method === 'Runtime.exceptionThrown') {
            const details = data.params.exceptionDetails;
            uncaughtExceptions.push({
              text: details.exception?.description || details.text || 'Uncaught Exception',
              url: details.url,
              line: details.lineNumber,
            });
          }

          if (data.method === 'Runtime.consoleAPICalled' && data.params?.type === 'error') {
            const argsText = (data.params.args || [])
              .map((a: any) => a?.description || (a?.value !== undefined ? String(a.value) : ''))
              .filter(Boolean)
              .join(' ');
            if (argsText && !argsText.includes('favicon.ico') && !consoleErrors.includes(argsText)) {
              consoleErrors.push(argsText);
            }
          }

          if (data.method === 'Log.entryAdded' && data.params.entry?.level === 'error') {
            const entryText = data.params.entry?.text || '';
            if (entryText && !entryText.includes('favicon.ico') && !consoleErrors.includes(entryText)) {
              consoleErrors.push(entryText);
            }
          }
        } catch {}
      };

      ws.onerror = (err) => {
        clearTimeout(failTimeout);
        if (observationTimer) clearTimeout(observationTimer);
        reject(err);
      };
    });

    if (isProcessExited && processExitCode !== 0) {
      return {
        executed: true,
        success: false,
        probedRoutes: [],
        logs: '',
        error: `Browser process crashed unexpectedly with exit code ${processExitCode}.`,
      };
    }

    const finalStatus = observedHttpStatus || 200;
    const httpSuccess = finalStatus >= 200 && finalStatus < 400;
    const noExceptions = uncaughtExceptions.length === 0 && consoleErrors.length === 0;
    const success = httpSuccess && noExceptions;

    const failures = uncaughtExceptions
      .map((e) => `${e.text}${e.url ? ` at ${e.url}:${e.line}` : ''}`)
      .concat(consoleErrors);

    if (!httpSuccess) {
      failures.unshift(`Main document navigation returned HTTP ${finalStatus}.`);
    }

    return {
      executed: true,
      success,
      probedRoutes: [{ route: `/${entryFile}`, status: finalStatus, ok: success }],
      logs: `Browser smoke test observed for ${observationWindowMs}ms after Page.loadEventFired. Observed HTTP: ${finalStatus}. Exceptions: ${uncaughtExceptions.length}, Console errors: ${consoleErrors.length}.`,
      error: success ? undefined : `Runtime Smoke Test Failed:\n${failures.join('\n')}`,
    };
  } finally {
    try {
      if (chromeProcess.pid) process.kill(-chromeProcess.pid, 'SIGKILL');
    } catch {}
    await new Promise<void>((resolve) => staticServer.close(() => resolve()));
    try {
      fs.rmSync(tmpUserDataDir, { recursive: true, force: true });
    } catch {}
  }
}
