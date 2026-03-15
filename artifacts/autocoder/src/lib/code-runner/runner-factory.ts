import { isElectronEnvironment } from './electron-runner';

export type RunnerType = 'electron' | 'webcontainer' | 'none';

export function detectRunnerType(): RunnerType {
  if (isElectronEnvironment()) {
    return 'electron';
  }

  if (typeof window !== 'undefined') {
    return 'webcontainer';
  }

  return 'none';
}

export function getRunnerCapabilities(runnerType: RunnerType) {
  switch (runnerType) {
    case 'electron':
      return {
        hasFileSystem: true,
        hasNpm: true,
        hasDevServer: true,
        hasFileSizeLimit: false,
        maxFileSize: Infinity,
        description: 'Native file system with full npm support',
      };
    case 'webcontainer':
      return {
        hasFileSystem: true,
        hasNpm: true,
        hasDevServer: true,
        hasFileSizeLimit: true,
        maxFileSize: 16384, // 16KB limit
        description: 'Browser-based virtual file system (16KB file limit)',
      };
    case 'none':
      return {
        hasFileSystem: false,
        hasNpm: false,
        hasDevServer: false,
        hasFileSizeLimit: false,
        maxFileSize: 0,
        description: 'No code execution available',
      };
  }
}

export interface UnifiedRunner {
  type: RunnerType;
  writeFiles: (projectName: string, files: Array<{ path: string; content: string }>, onLog?: (log: string) => void) => Promise<{ success: boolean; error?: string }>;
  installDependencies: (projectName: string, onLog?: (log: string) => void) => Promise<{ success: boolean; error?: string }>;
  startDevServer: (projectName: string, onLog?: (log: string) => void) => Promise<{ success: boolean; url?: string; error?: string }>;
  stopDevServer: () => Promise<{ success: boolean; error?: string }>;
  getServerStatus: () => Promise<{ isRunning: boolean; url: string | null }>;
}

let cachedRunner: UnifiedRunner | null = null;

export async function getRunner(): Promise<UnifiedRunner> {
  if (cachedRunner) {
    return cachedRunner;
  }

  const runnerType = detectRunnerType();

  if (runnerType === 'electron') {
    const electronRunner = await import('./electron-runner');
    cachedRunner = {
      type: 'electron',
      writeFiles: electronRunner.writeFiles,
      installDependencies: electronRunner.installDependencies,
      startDevServer: electronRunner.startDevServer,
      stopDevServer: electronRunner.stopDevServer,
      getServerStatus: electronRunner.getServerStatus,
    };
  } else if (runnerType === 'webcontainer') {
    const webcontainerModule = await import('./webcontainer');
    cachedRunner = {
      type: 'webcontainer',
      writeFiles: async (_projectName, files, onLog) => {
        try {
          const fileTree: Record<string, { file: { contents: string } }> = {};
          for (const file of files) {
            fileTree[file.path] = { file: { contents: file.content } };
          }
          await webcontainerModule.mountFiles(fileTree as any);
          onLog?.(`[WebContainer] Mounted ${files.length} files`);
          return { success: true };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      installDependencies: async (_projectName, onLog) => {
        try {
          const result = await webcontainerModule.installDependencies((log: string) => onLog?.(log));
          return result;
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      startDevServer: async (_projectName, onLog) => {
        try {
          const result = await webcontainerModule.startDevServer((log: string) => onLog?.(log));
          return { success: true, url: result.url };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      stopDevServer: async () => {
        return { success: true };
      },
      getServerStatus: async () => {
        return { isRunning: false, url: null };
      },
    };
  } else {
    cachedRunner = {
      type: 'none',
      writeFiles: async () => ({ success: false, error: 'No runner available' }),
      installDependencies: async () => ({ success: false, error: 'No runner available' }),
      startDevServer: async () => ({ success: false, error: 'No runner available' }),
      stopDevServer: async () => ({ success: false, error: 'No runner available' }),
      getServerStatus: async () => ({ isRunning: false, url: null }),
    };
  }

  return cachedRunner;
}

export function clearRunnerCache(): void {
  cachedRunner = null;
}