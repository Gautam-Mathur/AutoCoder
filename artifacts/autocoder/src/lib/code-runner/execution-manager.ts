// Unified Execution Manager with Multi-Tier Failsafe System
// Tier 1: WebContainer (browser-based Node.js)
// Tier 2: Cloud Sandbox (API-based container execution)
// Tier 3: Static Preview (iframe-based HTML/CSS/JS)
// Tier 4: Code-only View (fallback display)

import {
  getWebContainer,
  mountFiles,
  installDependencies,
  startDevServer,
  isWebContainerSupported,
  teardown,
  type FileSystemTree,
  type RunResult
} from './webcontainer';

export type ExecutionTier = 'webcontainer' | 'cloud-sandbox' | 'static-preview' | 'code-only';

export type ExecutionStatus =
  | 'idle'
  | 'initializing'
  | 'mounting-files'
  | 'installing-dependencies'
  | 'starting-server'
  | 'running'
  | 'error'
  | 'fallback'
  | 'degraded';

export interface ExecutionState {
  tier: ExecutionTier;
  status: ExecutionStatus;
  message: string;
  url?: string;
  errors: string[];
  logs: string[];
  startTime?: number;
  attempts: number;
  // For static preview tier - signals preview panel to render content
  previewMode?: 'iframe' | 'react-transpile' | 'javascript' | null;
  previewReady?: boolean;
}

export interface ProjectFile {
  path: string;
  content: string;
}

export interface ExecutionConfig {
  timeout: number;
  maxRetries: number;
  enableCloudFallback: boolean;
  enableStaticFallback: boolean;
  resourceLimits: {
    maxMemoryMB: number;
    maxCpuPercent: number;
    maxExecutionTimeMs: number;
  };
}

const DEFAULT_CONFIG: ExecutionConfig = {
  timeout: 60000,
  maxRetries: 3,
  enableCloudFallback: true,
  enableStaticFallback: true,
  resourceLimits: {
    maxMemoryMB: 512,
    maxCpuPercent: 80,
    maxExecutionTimeMs: 300000,
  },
};

type StateListener = (state: ExecutionState) => void;

class ExecutionManager {
  private state: ExecutionState;
  private config: ExecutionConfig;
  private listeners: Set<StateListener> = new Set();
  private abortController: AbortController | null = null;
  private serverProcess: any = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<ExecutionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = this.createInitialState();
  }

  private createInitialState(): ExecutionState {
    return {
      tier: 'code-only',
      status: 'idle',
      message: 'Ready to execute',
      errors: [],
      logs: [],
      attempts: 0,
      previewMode: null,
      previewReady: false,
    };
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private setState(updates: Partial<ExecutionState>) {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => listener(this.state));
  }

  private log(message: string) {
    this.setState({
      logs: [...this.state.logs, `[${new Date().toISOString()}] ${message}`],
    });
  }

  private addError(error: string) {
    this.setState({
      errors: [...this.state.errors, error],
    });
  }

  getState(): ExecutionState {
    return { ...this.state };
  }

  async execute(files: ProjectFile[]): Promise<ExecutionState> {
    this.abortController = new AbortController();
    this.setState({
      ...this.createInitialState(),
      status: 'initializing',
      message: 'Analyzing project...',
      startTime: Date.now(),
    });

    const projectType = this.analyzeProjectType(files);
    this.log(`Detected project type: ${projectType}`);

    try {
      // Tier 1: Try WebContainer
      if (this.shouldTryWebContainer(projectType)) {
        const result = await this.tryWebContainer(files);
        if (result.success) return this.state;
      }

      // Tier 2: Try Cloud Sandbox
      if (this.config.enableCloudFallback && this.shouldTryCloudSandbox(projectType)) {
        const result = await this.tryCloudSandbox(files);
        if (result.success) return this.state;
      }

      // Tier 3: Try Static Preview
      if (this.config.enableStaticFallback) {
        const result = await this.tryStaticPreview(files);
        if (result.success) return this.state;
      }

      // Tier 4: Code-only fallback
      return this.fallbackToCodeOnly(files);

    } catch (error) {
      this.addError(error instanceof Error ? error.message : 'Unknown error');
      return this.fallbackToCodeOnly(files);
    }
  }

  private analyzeProjectType(files: ProjectFile[]): string {
    const hasPackageJson = files.some(f => f.path === 'package.json' || f.path.endsWith('/package.json'));
    const hasViteConfig = files.some(f => f.path.includes('vite.config'));
    const hasReact = files.some(f => f.content.includes('react') || f.content.includes('React'));
    const hasHtml = files.some(f => f.path.endsWith('.html'));
    const hasTsx = files.some(f => f.path.endsWith('.tsx') || f.path.endsWith('.jsx'));
    const hasExpress = files.some(f => f.content.includes('express'));
    const hasFastify = files.some(f => f.content.includes('fastify'));

    if (hasPackageJson && (hasExpress || hasFastify)) return 'fullstack-node';
    if (hasPackageJson && hasViteConfig && hasReact) return 'vite-react';
    if (hasPackageJson && hasReact) return 'react';
    if (hasPackageJson && hasTsx) return 'typescript';
    if (hasPackageJson) return 'node';
    if (hasHtml) return 'static-html';
    return 'unknown';
  }

  private shouldTryWebContainer(projectType: string): boolean {
    if (!isWebContainerSupported()) {
      this.log('WebContainer not supported (SharedArrayBuffer unavailable)');
      return false;
    }
    return ['fullstack-node', 'vite-react', 'react', 'typescript', 'node'].includes(projectType);
  }

  private shouldTryCloudSandbox(projectType: string): boolean {
    return ['fullstack-node', 'vite-react', 'react', 'typescript', 'node'].includes(projectType);
  }

  private async tryWebContainer(files: ProjectFile[]): Promise<{ success: boolean }> {
    this.setState({
      tier: 'webcontainer',
      status: 'initializing',
      message: 'Starting WebContainer...',
      attempts: this.state.attempts + 1,
    });

    try {
      const fsTree = this.filesToFileSystemTree(files);

      // Boot and mount with timeout
      const bootTimeout = this.withTimeout(
        this.bootAndMount(fsTree),
        30000,
        'WebContainer boot timeout'
      );
      await bootTimeout;

      this.setState({
        status: 'installing-dependencies',
        message: 'Installing dependencies...',
      });

      // Install dependencies with retry
      const installResult = await this.withRetry(
        () => installDependencies((data) => this.log(data)),
        2,
        'npm install'
      );

      if (!installResult.success) {
        throw new Error('Failed to install dependencies');
      }

      this.setState({
        status: 'starting-server',
        message: 'Starting development server...',
      });

      // Start dev server
      const { url } = await this.withTimeout(
        startDevServer(
          (data) => this.log(data),
          (url) => this.log(`Server ready at ${url}`)
        ),
        60000,
        'Dev server start timeout'
      );

      this.setState({
        status: 'running',
        message: 'Application running',
        url,
      });

      this.startHealthCheck();
      this.log(`WebContainer running successfully at ${url}`);
      return { success: true };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'WebContainer failed';
      this.log(`WebContainer failed: ${errorMsg}`);
      this.addError(errorMsg);

      // Cleanup on failure
      try {
        await teardown();
      } catch {}

      return { success: false };
    }
  }

  private async bootAndMount(fsTree: FileSystemTree): Promise<void> {
    this.log('Booting WebContainer...');
    await getWebContainer();

    this.setState({
      status: 'mounting-files',
      message: 'Mounting project files...',
    });

    this.log('Mounting files...');
    await mountFiles(fsTree);
  }

  private async tryCloudSandbox(files: ProjectFile[]): Promise<{ success: boolean }> {
    this.setState({
      tier: 'cloud-sandbox',
      status: 'initializing',
      message: 'Checking cloud sandbox availability...',
      attempts: this.state.attempts + 1,
    });

    try {
      // Cloud sandbox API call
      const response = await fetch('/api/sandbox/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
        signal: this.abortController?.signal,
      });

      // Try to parse JSON, handle non-JSON responses gracefully
      let data: any = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch {
          this.log('Cloud sandbox returned invalid JSON');
          return { success: false };
        }
      } else {
        this.log('Cloud sandbox returned non-JSON response');
        return { success: false };
      }

      // Check if sandbox is explicitly unavailable (not an error, just not configured)
      if (data?.available === false) {
        this.log(`Cloud sandbox not available: ${data.message || 'Feature not configured'}`);
        // Don't add to errors - this is expected fallback behavior
        return { success: false };
      }

      if (!response.ok) {
        throw new Error(`Cloud sandbox error: ${response.status}`);
      }

      if (data?.url) {
        this.setState({
          status: 'running',
          message: 'Running in cloud sandbox',
          url: data.url,
        });
        this.log(`Cloud sandbox running at ${data.url}`);
        return { success: true };
      }

      this.log('Cloud sandbox did not return a URL');
      return { success: false };

    } catch (error) {
      // Only log actual errors, not expected "not available" responses
      const errorMsg = error instanceof Error ? error.message : 'Cloud sandbox connection failed';
      this.log(`Cloud sandbox error: ${errorMsg}`);
      this.addError(errorMsg);
      return { success: false };
    }
  }

  private async tryStaticPreview(files: ProjectFile[]): Promise<{ success: boolean }> {
    this.setState({
      tier: 'static-preview',
      status: 'initializing',
      message: 'Preparing static preview...',
      attempts: this.state.attempts + 1,
      previewMode: null,
      previewReady: false,
    });

    const htmlFile = files.find(f => f.path.endsWith('.html'));
    if (htmlFile) {
      this.log('Found HTML file - using iframe-based preview');
      this.setState({
        status: 'running',
        message: 'Static HTML preview active - view in Preview tab',
        previewMode: 'iframe',
        previewReady: true,
      });
      return { success: true };
    }

    const reactFiles = files.filter(f =>
      f.path.endsWith('.tsx') || f.path.endsWith('.jsx')
    );
    if (reactFiles.length > 0) {
      this.log('Found React/TSX files - using browser Babel transpilation');
      this.setState({
        status: 'running',
        message: 'React preview active - view in Preview tab',
        previewMode: 'react-transpile',
        previewReady: true,
      });
      return { success: true };
    }

    const jsFiles = files.filter(f => f.path.endsWith('.js'));
    if (jsFiles.length > 0) {
      this.log('Found JavaScript files - using inline execution');
      this.setState({
        status: 'running',
        message: 'JavaScript preview active - view in Preview tab',
        previewMode: 'javascript',
        previewReady: true,
      });
      return { success: true };
    }

    this.log('No previewable files found');
    return { success: false };
  }

  private fallbackToCodeOnly(files: ProjectFile[]): ExecutionState {
    this.setState({
      tier: 'code-only',
      status: 'fallback',
      message: 'Showing code view (execution unavailable)',
    });
    this.log('Fell back to code-only view');
    return this.state;
  }

  private filesToFileSystemTree(files: ProjectFile[]): FileSystemTree {
    const tree: FileSystemTree = {};

    for (const file of files) {
      const parts = file.path.split('/').filter(Boolean);
      let current: any = tree;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) {
          current[part] = { directory: {} };
        }
        current = current[part].directory;
      }

      const fileName = parts[parts.length - 1];
      current[fileName] = {
        file: { contents: file.content },
      };
    }

    return tree;
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    ms: number,
    message: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(message));
      }, ms);

      promise
        .then((result) => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  private async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.log(`${operationName}: attempt ${attempt}/${maxRetries}`);
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        this.log(`${operationName} failed (attempt ${attempt}): ${lastError.message}`);

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error(`${operationName} failed after ${maxRetries} attempts`);
  }

  private startHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      if (this.state.status !== 'running') {
        this.stopHealthCheck();
        return;
      }

      try {
        if (this.state.url) {
          const response = await fetch(this.state.url, {
            method: 'HEAD',
            mode: 'no-cors',
          });
        }
      } catch (error) {
        this.log('Health check failed, application may have stopped');
        this.setState({
          status: 'degraded',
          message: 'Application may be unresponsive',
        });
      }
    }, 10000);
  }

  private stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  async stop(): Promise<void> {
    this.log('Stopping execution...');
    this.stopHealthCheck();

    if (this.abortController) {
      this.abortController.abort();
    }

    if (this.state.tier === 'webcontainer') {
      try {
        await teardown();
      } catch (error) {
        this.log('Error during WebContainer teardown');
      }
    }

    if (this.state.tier === 'cloud-sandbox' && this.state.url) {
      try {
        await fetch('/api/sandbox/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: this.state.url }),
        });
      } catch (error) {
        this.log('Error stopping cloud sandbox');
      }
    }

    this.setState(this.createInitialState());
  }

  async restart(files: ProjectFile[]): Promise<ExecutionState> {
    await this.stop();
    return this.execute(files);
  }
}

let executionManagerInstance: ExecutionManager | null = null;

export function getExecutionManager(config?: Partial<ExecutionConfig>): ExecutionManager {
  if (!executionManagerInstance) {
    executionManagerInstance = new ExecutionManager(config);
  }
  return executionManagerInstance;
}

export function resetExecutionManager(): void {
  if (executionManagerInstance) {
    executionManagerInstance.stop();
    executionManagerInstance = null;
  }
}

export { ExecutionManager };