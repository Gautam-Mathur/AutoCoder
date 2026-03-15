import { runnerLog } from './logger';

export interface ProjectFile {
  path: string;
  content: string;
}

interface ElectronAPI {
  writeFiles: (projectName: string, files: Array<{ path: string; content: string }>) => Promise<{ success: boolean; projectPath?: string; error?: string }>;
  npmInstall: (projectName: string) => Promise<{ success: boolean; error?: string }>;
  startServer: (projectName: string) => Promise<{ success: boolean; url?: string; error?: string }>;
  stopServer: () => Promise<{ success: boolean; error?: string }>;
  getStatus: () => Promise<{ isRunning: boolean; url: string | null }>;
  listProjects: () => Promise<string[]>;
  deleteProject: (projectName: string) => Promise<{ success: boolean; error?: string }>;
  openProject: (projectName: string) => Promise<{ success: boolean; error?: string }>;
  isElectron: () => Promise<boolean>;
  onLog: (callback: (log: string) => void) => () => void;
  onServerReady: (callback: (url: string) => void) => () => void;
  getMainNodeModulesInfo: () => Promise<{ path: string; exists: boolean; packageCount: number }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export type LogCallback = (log: string) => void;

export interface RunResult {
  success: boolean;
  error?: string;
}

export interface ServerResult {
  success: boolean;
  url?: string;
  error?: string;
}

let currentProjectName: string | null = null;
let logUnsubscribe: (() => void) | null = null;
let serverUnsubscribe: (() => void) | null = null;

export function isElectronEnvironment(): boolean {
  return typeof window !== 'undefined' && 'electronAPI' in window && window.electronAPI !== undefined;
}

function getElectronAPI(): ElectronAPI {
  if (!window.electronAPI) {
    throw new Error('Electron API not available');
  }
  return window.electronAPI;
}

export async function writeFiles(projectName: string, files: ProjectFile[], onLog?: LogCallback): Promise<RunResult> {
  if (!isElectronEnvironment()) {
    runnerLog.warn('AutoRunner', 'writeFiles called outside Electron environment');
    return { success: false, error: 'Not running in Electron' };
  }

  const api = getElectronAPI();
  currentProjectName = projectName;

  runnerLog.startTimer('electron-write-files');
  runnerLog.info('FileSystem', `Writing ${files.length} files to project "${projectName}"`, {
    fileCount: files.length,
    projectName,
  });
  onLog?.(`[AutoCoder] Writing ${files.length} files to ${projectName}...`);

  const result = await api.writeFiles(projectName, files);
  const elapsed = runnerLog.endTimer('electron-write-files');

  if (result.success) {
    runnerLog.success('FileSystem', `Files written to ${result.projectPath}`, {
      projectPath: result.projectPath,
    }, elapsed);
    onLog?.(`[AutoCoder] Files written to ${result.projectPath}`);
  } else {
    runnerLog.error('FileSystem', `Failed to write files: ${result.error}`, {
      error: result.error,
    });
    onLog?.(`[AutoCoder] Error: ${result.error}`);
  }

  return result;
}

export async function installDependencies(projectName: string, onLog?: LogCallback): Promise<RunResult> {
  if (!isElectronEnvironment()) {
    runnerLog.warn('AutoRunner', 'installDependencies called outside Electron environment');
    return { success: false, error: 'Not running in Electron' };
  }

  const api = getElectronAPI();

  if (logUnsubscribe) {
    logUnsubscribe();
  }
  logUnsubscribe = api.onLog((log) => {
    onLog?.(log);
    if (log.includes('added') && log.includes('package')) {
      runnerLog.success('NPM', log.replace('[npm] ', '').trim());
    } else if (log.includes('ERR') || log.includes('error')) {
      runnerLog.error('NPM', log.replace('[npm] ', '').trim());
    } else if (log.includes('WARN') || log.includes('warn')) {
      runnerLog.warn('NPM', log.replace('[npm] ', '').trim());
    }
  });

  runnerLog.separator('ELECTRON NPM INSTALL');
  runnerLog.startTimer('electron-npm-install');
  runnerLog.info('NPM', `Starting npm install for "${projectName}"`, { projectName });

  const result = await api.npmInstall(projectName);
  const elapsed = runnerLog.endTimer('electron-npm-install');

  if (result.success) {
    runnerLog.success('NPM', `npm install completed for "${projectName}"`, undefined, elapsed);
  } else {
    runnerLog.error('NPM', `npm install failed for "${projectName}": ${result.error}`, {
      error: result.error,
    }, elapsed);
  }

  return result;
}

export async function startDevServer(projectName: string, onLog?: LogCallback): Promise<ServerResult> {
  if (!isElectronEnvironment()) {
    runnerLog.warn('AutoRunner', 'startDevServer called outside Electron environment');
    return { success: false, error: 'Not running in Electron' };
  }

  const api = getElectronAPI();
  if (serverUnsubscribe) {
    serverUnsubscribe();
  }
  serverUnsubscribe = api.onServerReady((url) => {
    runnerLog.success('DevServer', `Server ready at ${url}`, { url });
    onLog?.(`[AutoCoder] Server ready at ${url}`);
  });

  if (logUnsubscribe) {
    logUnsubscribe();
  }
  logUnsubscribe = api.onLog((log) => {
    onLog?.(log);
    if (log.includes('error') || log.includes('Error')) {
      runnerLog.error('DevServer', log.replace('[dev] ', '').trim());
    }
  });

  runnerLog.separator('ELECTRON DEV SERVER');
  runnerLog.startTimer('electron-dev-server');
  runnerLog.info('DevServer', `Starting dev server for "${projectName}"`, { projectName });

  const result = await api.startServer(projectName);
  const elapsed = runnerLog.endTimer('electron-dev-server');

  if (result.success) {
    runnerLog.success('DevServer', `Dev server started at ${result.url}`, {
      url: result.url,
    }, elapsed);
  } else {
    runnerLog.error('DevServer', `Failed to start dev server: ${result.error}`, {
      error: result.error,
    }, elapsed);
  }

  return result;
}

export async function stopDevServer(): Promise<RunResult> {
  if (!isElectronEnvironment()) {
    return { success: false, error: 'Not running in Electron' };
  }

  runnerLog.info('DevServer', 'Stopping Electron dev server');
  const api = getElectronAPI();
  const result = await api.stopServer();

  if (result.success) {
    runnerLog.success('DevServer', 'Dev server stopped');
  } else {
    runnerLog.error('DevServer', `Failed to stop dev server: ${result.error}`);
  }

  if (logUnsubscribe) {
    logUnsubscribe();
    logUnsubscribe = null;
  }
  if (serverUnsubscribe) {
    serverUnsubscribe();
    serverUnsubscribe = null;
  }

  return result;
}

export async function getServerStatus(): Promise<{ isRunning: boolean; url: string | null }> {
  if (!isElectronEnvironment()) {
    return { isRunning: false, url: null };
  }

  return getElectronAPI().getStatus();
}

export async function listProjects(): Promise<string[]> {
  if (!isElectronEnvironment()) {
    return [];
  }

  runnerLog.debug('Pipeline', 'Listing Electron projects');
  const projects = await getElectronAPI().listProjects();
  runnerLog.debug('Pipeline', `Found ${projects.length} projects`, { projects });
  return projects;
}

export async function deleteProject(projectName: string): Promise<RunResult> {
  if (!isElectronEnvironment()) {
    return { success: false, error: 'Not running in Electron' };
  }

  runnerLog.info('Pipeline', `Deleting project "${projectName}"`);
  const result = await getElectronAPI().deleteProject(projectName);
  if (result.success) {
    runnerLog.success('Pipeline', `Project "${projectName}" deleted`);
  } else {
    runnerLog.error('Pipeline', `Failed to delete project "${projectName}": ${result.error}`);
  }
  return result;
}

export async function openProjectFolder(projectName: string): Promise<RunResult> {
  if (!isElectronEnvironment()) {
    return { success: false, error: 'Not running in Electron' };
  }

  runnerLog.info('Pipeline', `Opening project folder: "${projectName}"`);
  return getElectronAPI().openProject(projectName);
}

export function getCurrentProjectName(): string | null {
  return currentProjectName;
}

export function cleanup(): void {
  runnerLog.info('AutoRunner', 'Cleaning up Electron runner resources');
  if (logUnsubscribe) {
    logUnsubscribe();
    logUnsubscribe = null;
  }
  if (serverUnsubscribe) {
    serverUnsubscribe();
    serverUnsubscribe = null;
  }
}