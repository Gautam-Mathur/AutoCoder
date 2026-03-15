// Auto-Runner Pipeline - Generate → Install → Run → Preview
// Seamlessly runs generated projects without manual intervention

import {
  getWebContainer,
  mountFiles,
  writeFile,
  readFile,
  installDependencies,
  runNpmInstall,
  startDevServer,
  isWebContainerSupported,
  hasNodeModules,
  setPackageJsonHash,
  getPreWarmStatus,
  getPreWarmedPackages,
  awaitPreWarm,
  fixBinPermissions,
  triggerSnapshotBuild,
  type FileSystemTree,
  type RunResult
} from './webcontainer';
import { runnerLog } from './logger';
import { autoFixEngine, type AutoFixContext } from './auto-fix-engine';

export type RunnerStatus =
  | 'idle'
  | 'generating'
  | 'mounting'
  | 'installing'
  | 'starting'
  | 'running'
  | 'error';

export interface RunnerState {
  status: RunnerStatus;
  progress: number; // 0-100
  message: string;
  logs: string[];
  previewUrl: string | null;
  error: string | null;
}

export interface AutoRunCallbacks {
  onStatusChange: (state: RunnerState) => void;
  onLog: (log: string) => void;
  onPreviewReady: (url: string) => void;
  onError: (error: string) => void;
}

async function applyUpgradedPackageJson(
  projectFiles: { path: string; content: string }[],
  upgradedContent: string,
  log: (msg: string) => void
): Promise<void> {
  try {
    const idx = projectFiles.findIndex(f => f.path === 'package.json');
    if (idx >= 0) {
      projectFiles[idx] = { ...projectFiles[idx], content: upgradedContent };
    }
    await writeFile('package.json', upgradedContent);
    runnerLog.info('Snapshot', 'Applied upgraded package.json to WebContainer');
    log('✅ Applied upgraded package.json');
  } catch (err) {
    runnerLog.debug('Snapshot', `Failed to apply upgraded package.json (non-fatal): ${err}`);
  }
}

// Convert file array to WebContainer FileSystemTree
export function filesToFileSystemTree(
  files: { path: string; content: string }[]
): FileSystemTree {
  const tree: FileSystemTree = {};

  for (const file of files) {
    const parts = file.path.split('/');
    let current: FileSystemTree = tree;

    for (let i = 0; i < parts.length - 1; i++) {
      const dir = parts[i];
      if (!current[dir]) {
        current[dir] = { directory: {} };
      }
      current = (current[dir] as { directory: FileSystemTree }).directory;
    }

    const fileName = parts[parts.length - 1];
    current[fileName] = { file: { contents: file.content } };
  }

  return tree;
}

// Detect project type from files
export function detectProjectType(files: { path: string; content: string }[]): {
  type: 'vite' | 'express' | 'next' | 'node' | 'static';
  devCommand: string;
  installCommand: string;
  useTypeScript: boolean;
  entryFile: string | null;
} {
  const hasPackageJson = files.some(f => f.path === 'package.json');
  const hasViteConfig = files.some(f => f.path.includes('vite.config'));
  const hasNextConfig = files.some(f => f.path.includes('next.config'));
  const hasServerTs = files.some(f => f.path === 'server.ts');
  const hasServerJs = files.some(f => f.path === 'server.js');
  const hasIndexTs = files.some(f => f.path === 'index.ts');
  const hasIndexJs = files.some(f => f.path === 'index.js');
  const hasAppTs = files.some(f => f.path === 'app.ts');
  const hasAppJs = files.some(f => f.path === 'app.js');

  // Check if project uses TypeScript
  const useTypeScript = files.some(f => f.path.endsWith('.ts') || f.path.endsWith('.tsx'));

  if (!hasPackageJson) {
    return { type: 'static', devCommand: '', installCommand: '', useTypeScript: false, entryFile: null };
  }

  if (hasNextConfig) {
    return { type: 'next', devCommand: 'npm run dev', installCommand: 'npm install', useTypeScript, entryFile: null };
  }

  if (hasViteConfig) {
    return { type: 'vite', devCommand: 'npm run dev', installCommand: 'npm install', useTypeScript, entryFile: null };
  }

  // Detect server entry file with TypeScript priority
  if (hasServerTs) {
    return { type: 'express', devCommand: 'npm run dev', installCommand: 'npm install', useTypeScript: true, entryFile: 'server.ts' };
  }
  if (hasServerJs) {
    return { type: 'express', devCommand: 'npm run dev', installCommand: 'npm install', useTypeScript: false, entryFile: 'server.js' };
  }
  if (hasIndexTs) {
    return { type: 'node', devCommand: 'npm run dev', installCommand: 'npm install', useTypeScript: true, entryFile: 'index.ts' };
  }
  if (hasIndexJs) {
    return { type: 'node', devCommand: 'npm start', installCommand: 'npm install', useTypeScript: false, entryFile: 'index.js' };
  }
  if (hasAppTs) {
    return { type: 'node', devCommand: 'npm run dev', installCommand: 'npm install', useTypeScript: true, entryFile: 'app.ts' };
  }
  if (hasAppJs) {
    return { type: 'node', devCommand: 'npm start', installCommand: 'npm install', useTypeScript: false, entryFile: 'app.js' };
  }

  return { type: 'node', devCommand: 'npm start', installCommand: 'npm install', useTypeScript, entryFile: null };
}

// Analyze code to detect required dependencies
export function detectDependencies(code: string, useTypeScript: boolean = false): { dependencies: Record<string, string>; devDependencies: Record<string, string> } {
  const deps: Record<string, string> = {};
  const devDeps: Record<string, string> = {};

  // TypeScript tooling
  if (useTypeScript) {
    devDeps['typescript'] = '^5.3.0';
    devDeps['tsx'] = '^4.7.0';
    devDeps['@types/node'] = '^20.10.0';
  }

  // React ecosystem
  if (code.includes('from "react"') || code.includes("from 'react'") || code.includes('useState') || code.includes('useEffect')) {
    deps['react'] = '^18.2.0';
    deps['react-dom'] = '^18.2.0';
  }

  // React Router
  if (code.includes('react-router') || code.includes('BrowserRouter') || code.includes('useNavigate')) {
    deps['react-router-dom'] = '^6.20.0';
  }

  // State management
  if (code.includes('zustand')) deps['zustand'] = '^4.4.0';
  if (code.includes('redux') || code.includes('@reduxjs/toolkit')) {
    deps['@reduxjs/toolkit'] = '^2.0.0';
    deps['react-redux'] = '^9.0.0';
  }
  if (code.includes('jotai')) deps['jotai'] = '^2.6.0';
  if (code.includes('recoil')) deps['recoil'] = '^0.7.7';

  // UI Libraries
  if (code.includes('framer-motion') || code.includes('motion.')) deps['framer-motion'] = '^10.16.0';
  if (code.includes('lucide-react') || code.includes('from "lucide-react"')) deps['lucide-react'] = '^0.294.0';
  if (code.includes('@radix-ui')) deps['@radix-ui/react-icons'] = '^1.3.0';
  if (code.includes('tailwind-merge') || code.includes('twMerge')) deps['tailwind-merge'] = '^2.1.0';
  if (code.includes('clsx')) deps['clsx'] = '^2.0.0';
  if (code.includes('class-variance-authority') || code.includes('cva(')) deps['class-variance-authority'] = '^0.7.0';

  // Forms
  if (code.includes('react-hook-form') || code.includes('useForm')) deps['react-hook-form'] = '^7.48.0';
  if (code.includes('@hookform/resolvers')) deps['@hookform/resolvers'] = '^3.3.0';
  if (code.includes('zod') || code.includes('z.object') || code.includes('z.string')) deps['zod'] = '^3.22.0';

  // Data fetching
  if (code.includes('@tanstack/react-query') || code.includes('useQuery')) deps['@tanstack/react-query'] = '^5.0.0';
  if (code.includes('axios')) deps['axios'] = '^1.6.0';
  if (code.includes('swr')) deps['swr'] = '^2.2.0';

  // Date handling
  if (code.includes('date-fns')) deps['date-fns'] = '^2.30.0';
  if (code.includes('dayjs')) deps['dayjs'] = '^1.11.0';
  if (code.includes('moment')) deps['moment'] = '^2.29.0';

  // Charts
  if (code.includes('recharts')) deps['recharts'] = '^2.10.0';
  if (code.includes('chart.js') || code.includes('react-chartjs')) {
    deps['chart.js'] = '^4.4.0';
    deps['react-chartjs-2'] = '^5.2.0';
  }

  // Backend
  if (code.includes('express')) deps['express'] = '^4.18.2';
  if (code.includes('cors')) deps['cors'] = '^2.8.5';
  if (code.includes('body-parser')) deps['body-parser'] = '^1.20.0';
  if (code.includes('multer')) deps['multer'] = '^1.4.5-lts.1';
  if (code.includes('jsonwebtoken') || code.includes('jwt.')) deps['jsonwebtoken'] = '^9.0.0';
  if (code.includes('bcrypt')) deps['bcryptjs'] = '^2.4.3';
  if (code.includes('uuid')) deps['uuid'] = '^9.0.0';
  if (code.includes('nanoid')) deps['nanoid'] = '^5.0.0';

  // Utilities
  if (code.includes('lodash') || code.includes('_.')) deps['lodash'] = '^4.17.21';

  return { dependencies: deps, devDependencies: devDeps };
}

// Merge all dependencies - no dropping, keep everything the project needs
// Returns deps with a warning if there are many packages (install may be slow)
function mergeDependencies(
  deps: Record<string, string>,
  devDeps: Record<string, string>
): { dependencies: Record<string, string>; devDependencies: Record<string, string>; warning: string | null } {
  const totalCount = Object.keys(deps).length + Object.keys(devDeps).length;

  // Warn if many dependencies (install might be slow), but don't drop any
  const warning = totalCount > 20
    ? `Installing ${totalCount} packages - this may take longer than usual`
    : null;

  return { dependencies: deps, devDependencies: devDeps, warning };
}

// Generate complete package.json from files
export function generatePackageJson(
  projectName: string,
  files: { path: string; content: string }[],
  projectType: 'vite' | 'express' | 'next' | 'node' | 'static',
  useTypeScript: boolean = false,
  entryFile: string | null = null
): string {
  // Combine all file contents to detect dependencies
  const allCode = files.map(f => f.content).join('\n');
  const { dependencies: detectedDeps, devDependencies: detectedDevDeps } = detectDependencies(allCode, useTypeScript);

  const basePackage: Record<string, any> = {
    name: projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    version: '1.0.0',
    type: 'module',
    scripts: {},
    dependencies: {},
    devDependencies: {}
  };

  // Determine the correct entry command for TypeScript
  const nodeCommand = useTypeScript ? 'tsx' : 'node';
  const defaultEntry = entryFile || (useTypeScript ? 'index.ts' : 'index.js');
  const serverEntry = entryFile || (useTypeScript ? 'server.ts' : 'server.js');

  switch (projectType) {
    case 'vite':
      basePackage.scripts = {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview'
      };
      basePackage.devDependencies = {
        'vite': '^5.0.0'
      };
      break;

    case 'express':
      basePackage.scripts = {
        dev: `${nodeCommand} ${serverEntry}`,
        start: `${nodeCommand} ${serverEntry}`
      };
      break;

    case 'next':
      basePackage.scripts = {
        dev: 'next dev',
        build: 'next build',
        start: 'next start'
      };
      basePackage.dependencies['next'] = '^14.0.0';
      break;

    case 'node':
      basePackage.scripts = {
        start: `${nodeCommand} ${defaultEntry}`,
        dev: `${nodeCommand} ${defaultEntry}`
      };
      break;
  }

  // Merge all detected dependencies (no dropping)
  const { dependencies: mergedDeps, devDependencies: mergedDevDeps } = mergeDependencies(
    { ...basePackage.dependencies, ...detectedDeps },
    { ...basePackage.devDependencies, ...detectedDevDeps }
  );

  basePackage.dependencies = mergedDeps;
  basePackage.devDependencies = mergedDevDeps;

  return JSON.stringify(basePackage, null, 2);
}

export interface AutoRunOptions {
  skipInstallOnFailure?: boolean; // If true, try to start server even if install fails
  forceInstall?: boolean;         // If true, always run npm install even if cached
}

let activeRunId: string | null = null;
let activeRunPromise: Promise<{ success: boolean; previewUrl: string | null; error: string | null }> | null = null;
let lastSuccessfulPreviewUrl: string | null = null;
let sessionProjectHash: string | null = null;

const CRITICAL_UI_FILES: Record<string, { exports: string[]; content: string }> = {
  'src/components/ui/toaster.tsx': {
    exports: ['Toaster'],
    content: `// @generated
import { useToast } from "@/hooks/use-toast";\n\nexport function Toaster() {\n  const { toasts, dismiss } = useToast();\n\n  if (toasts.length === 0) return null;\n\n  return (\n    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">\n      {toasts.map((toast) => (\n        <div\n          key={toast.id}\n          className={\n            "rounded-lg border p-4 shadow-lg transition-all " +\n            (toast.variant === "destructive"\n              ? "bg-red-600 text-white border-red-700"\n              : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700")\n          }\n          role="alert"\n        >\n          {toast.title && <div className="font-semibold text-sm">{toast.title}</div>}\n          {toast.description && <div className="text-sm mt-1 opacity-90">{toast.description}</div>}\n          <button\n            onClick={() => dismiss(toast.id)}\n            className="absolute top-2 right-2 text-xs opacity-50 hover:opacity-100"\n          >\n            x\n          </button>\n        </div>\n      ))}\n    </div>\n  );\n}\n`,
  },
  'src/hooks/use-toast.ts': {
    exports: ['useToast', 'toast'],
    content: `// @generated
import { useState, useCallback } from "react";\n\ninterface Toast {\n  id: string;\n  title?: string;\n  description?: string;\n  variant?: "default" | "destructive";\n}\n\nlet toastCount = 0;\nlet globalToasts: Toast[] = [];\nlet listeners: Array<() => void> = [];\n\nfunction notify() { listeners.forEach(l => l()); }\n\nexport function toast({ title, description, variant = "default" }: Omit<Toast, "id">) {\n  const id = String(++toastCount);\n  globalToasts = [...globalToasts, { id, title, description, variant }];\n  notify();\n  setTimeout(() => {\n    globalToasts = globalToasts.filter(t => t.id !== id);\n    notify();\n  }, 5000);\n  return { id, dismiss: () => { globalToasts = globalToasts.filter(t => t.id !== id); notify(); } };\n}\n\nexport function useToast() {\n  const [, setTick] = useState(0);\n  const rerender = useCallback(() => setTick(t => t + 1), []);\n\n  useState(() => { listeners.push(rerender); });\n\n  return {\n    toasts: globalToasts,\n    toast,\n    dismiss: (id: string) => { globalToasts = globalToasts.filter(t => t.id !== id); notify(); },\n  };\n}\n`,
  },
};

function hasExport(content: string, exportName: string): boolean {
  const patterns = [
    new RegExp(`export\\s+(?:function|const|class)\\s+${exportName}\\b`),
    new RegExp(`export\\s+default\\s+(?:function\\s+)?${exportName}\\b`),
    new RegExp(`export\\s*\\{[^}]*\\b${exportName}\\b[^}]*\\}`),
  ];
  return patterns.some(p => p.test(content));
}

const GENERATED_MARKERS = [
  '// @generated',
  '// auto-generated',
  '// generated by autocoder',
  '// This file was generated',
];
const USER_MARKERS = [
  '// custom',
  '// @user',
  '// @preserve',
  '// do not overwrite',
];

function hasUserMarkers(content: string): boolean {
  return USER_MARKERS.some(m => content.toLowerCase().includes(m.toLowerCase()));
}

function isOverwriteSafe(content: string): boolean {
  const trimmed = content.trim();
  if (hasUserMarkers(trimmed)) return false;
  if (trimmed.length < 500) return true;
  return GENERATED_MARKERS.some(m => trimmed.toLowerCase().includes(m.toLowerCase()));
}

async function preFlightVerifyCriticalFiles(
  projectFiles: { path: string; content: string }[],
  log: (msg: string) => void
): Promise<number> {
  let fixCount = 0;

  for (const [filePath, spec] of Object.entries(CRITICAL_UI_FILES)) {
    const projectFile = projectFiles.find(f => f.path === filePath);
    if (!projectFile) continue;

    const missingExports = spec.exports.filter(name => !hasExport(projectFile.content, name));
    if (missingExports.length === 0) {
      runnerLog.debug('PreFlight', `${filePath}: all exports present, OK`);
      continue;
    }

    if (hasUserMarkers(projectFile.content)) {
      runnerLog.warn('PreFlight', `${filePath}: missing export(s) "${missingExports.join(', ')}" but has user markers, skipping`);
      continue;
    }

    runnerLog.warn('PreFlight', `Missing export(s) "${missingExports.join(', ')}" in ${filePath}, fixing...`);
    try {
      await writeFile(filePath, spec.content);
      fixCount++;
      runnerLog.success('PreFlight', `Fixed ${filePath} with correct exports`);
      log(`🔧 Pre-flight: fixed ${filePath}`);
    } catch (err) {
      runnerLog.error('PreFlight', `Failed to fix ${filePath}: ${err}`);
    }
  }

  const filePathsInProject = projectFiles.map(f => f.path);
  for (const [filePath, spec] of Object.entries(CRITICAL_UI_FILES)) {
    if (filePathsInProject.includes(filePath)) continue;

    const isReferenced = projectFiles.some(f =>
      f.content.includes(filePath.replace(/^src\//, '@/').replace(/\.tsx?$/, ''))
    );
    if (!isReferenced) continue;

    try {
      await writeFile(filePath, spec.content);
      fixCount++;
      runnerLog.success('PreFlight', `Created missing referenced file ${filePath}`);
      log(`🔧 Pre-flight: created missing ${filePath}`);
    } catch (err) {
      runnerLog.error('PreFlight', `Failed to create ${filePath}: ${err}`);
    }
  }

  return fixCount;
}

// Main auto-run pipeline
export async function autoRunProject(
  files: { path: string; content: string }[],
  projectName: string,
  callbacks: Partial<AutoRunCallbacks> = {},
  options: AutoRunOptions = {}
): Promise<{ success: boolean; previewUrl: string | null; error: string | null }> {
  const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  if (activeRunId && activeRunPromise) {
    runnerLog.warn('AutoRunner', `Duplicate autoRunProject call blocked (active: ${activeRunId}, attempted: ${runId})`);
    runnerLog.info('AutoRunner', `Returning result of active run ${activeRunId}`);
    return activeRunPromise;
  }

  const projectHash = files.map(f => f.path + ':' + f.content.length).join('|');
  if (lastSuccessfulPreviewUrl && sessionProjectHash === projectHash) {
    runnerLog.info('AutoRunner', `Reusing existing preview for same project (hash match), url: ${lastSuccessfulPreviewUrl}`);
    const cachedResult = { success: true, previewUrl: lastSuccessfulPreviewUrl, error: null };
    callbacks.onStatusChange?.({
      status: 'running',
      progress: 100,
      message: 'Preview ready (reconnected)',
      logs: ['Reconnected to existing preview session'],
      previewUrl: lastSuccessfulPreviewUrl,
      error: null
    });
    callbacks.onPreviewReady?.(lastSuccessfulPreviewUrl);
    return cachedResult;
  }

  activeRunId = runId;
  activeRunPromise = null;

  const state: RunnerState = {
    status: 'idle',
    progress: 0,
    message: '',
    logs: [],
    previewUrl: null,
    error: null
  };

  const updateState = (updates: Partial<RunnerState>) => {
    Object.assign(state, updates);
    callbacks.onStatusChange?.(state);
  };

  const log = (message: string) => {
    state.logs.push(message);
    callbacks.onLog?.(message);
  };

  const runPipeline = async (): Promise<{ success: boolean; previewUrl: string | null; error: string | null }> => {
  try {
    runnerLog.separator(`AUTO-RUN: ${projectName} [${runId}]`);
    runnerLog.startTimer('auto-run-total');

    if (!isWebContainerSupported()) {
      runnerLog.error('AutoRunner', 'WebContainer not supported in this browser');
      throw new Error('WebContainer not supported in this browser. Please use Chrome or Edge.');
    }
    runnerLog.success('AutoRunner', 'WebContainer support confirmed');

    updateState({ status: 'generating', progress: 10, message: 'Analyzing project...' });
    log('🔍 Analyzing project structure...');

    const projectType = detectProjectType(files);
    runnerLog.info('Pipeline', `Project analysis complete`, {
      type: projectType.type,
      typescript: projectType.useTypeScript,
      entryFile: projectType.entryFile || 'default',
      devCommand: projectType.devCommand,
      totalFiles: files.length,
    });
    log(`📦 Detected project type: ${projectType.type}`);

    // Step 2: Ensure package.json exists with all dependencies
    let projectFiles = [...files];
    const hasPackageJson = files.some(f => f.path === 'package.json');

    if (!hasPackageJson && projectType.type !== 'static') {
      runnerLog.info('Pipeline', 'No package.json found, generating one');
      log('📝 Generating package.json with dependencies...');
      log(`   TypeScript: ${projectType.useTypeScript ? 'Yes' : 'No'}, Entry: ${projectType.entryFile || 'default'}`);
      const packageJson = generatePackageJson(projectName, files, projectType.type, projectType.useTypeScript, projectType.entryFile);
      projectFiles.push({ path: 'package.json', content: packageJson });
      try {
        const parsed = JSON.parse(packageJson);
        const depCount = Object.keys(parsed.dependencies || {}).length;
        const devDepCount = Object.keys(parsed.devDependencies || {}).length;
        runnerLog.success('Pipeline', `Generated package.json: ${depCount} deps, ${devDepCount} devDeps`, {
          dependencies: Object.keys(parsed.dependencies || {}).join(', '),
          devDependencies: Object.keys(parsed.devDependencies || {}).join(', '),
        });
      } catch {}
    } else if (hasPackageJson) {
      // Enhance existing package.json with missing dependencies (with optimization)
      const existingPkg = files.find(f => f.path === 'package.json');
      if (existingPkg) {
        try {
          const pkg = JSON.parse(existingPkg.content);
          const allCode = files.map(f => f.content).join('\n');
          const { dependencies: detectedDeps, devDependencies: detectedDevDeps } = detectDependencies(allCode, projectType.useTypeScript);

          // Merge all dependencies (no dropping)
          const allDeps = { ...pkg.dependencies, ...detectedDeps };
          const allDevDeps = { ...pkg.devDependencies, ...detectedDevDeps };
          const { dependencies: finalDeps, devDependencies: finalDevDeps, warning } = mergeDependencies(allDeps, allDevDeps);

          pkg.dependencies = finalDeps;
          pkg.devDependencies = finalDevDeps;

          // Update the file
          projectFiles = projectFiles.map(f =>
            f.path === 'package.json'
              ? { ...f, content: JSON.stringify(pkg, null, 2) }
              : f
          );
          const depCount = Object.keys(finalDeps).length;
          const devDepCount = Object.keys(finalDevDeps).length;
          runnerLog.success('Pipeline', `Enhanced package.json: ${depCount} deps, ${devDepCount} devDeps`);
          log('✅ Enhanced package.json with detected dependencies');
          if (warning) {
            runnerLog.warn('Pipeline', warning);
            log(`   ${warning}`);
          }
        } catch (e) {
          runnerLog.warn('Pipeline', `Could not parse existing package.json: ${e}`);
          log('⚠️ Could not parse existing package.json');
        }
      }
    }

    // Add Tailwind config if using Tailwind (check for @tailwind directives or tailwind imports)
    const usesTailwind = files.some(f =>
      f.content.includes('@tailwind') ||
      f.content.includes('tailwindcss') ||
      f.content.includes('from "tailwind') ||
      f.content.includes("from 'tailwind")
    );
    if (usesTailwind && projectType.type === 'vite') {
      runnerLog.info('Pipeline', 'Tailwind CSS detected, adding config files');
      log('🎨 Tailwind CSS detected, adding configs and dependencies...');
      if (!files.some(f => f.path === 'tailwind.config.js')) {
        projectFiles.push({
          path: 'tailwind.config.js',
          content: `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
};`
        });
      }
      if (!files.some(f => f.path === 'postcss.config.js')) {
        projectFiles.push({
          path: 'postcss.config.js',
          content: `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};`
        });
      }

      // Add Tailwind deps to package.json
      const pkgFile = projectFiles.find(f => f.path === 'package.json');
      if (pkgFile) {
        try {
          const pkg = JSON.parse(pkgFile.content);
          pkg.devDependencies = {
            ...pkg.devDependencies,
            'tailwindcss': '^3.3.6',
            'postcss': '^8.4.32',
            'autoprefixer': '^10.4.16'
          };
          projectFiles = projectFiles.map(f =>
            f.path === 'package.json'
              ? { ...f, content: JSON.stringify(pkg, null, 2) }
              : f
          );
        } catch (e) {
          // Ignore parse errors
        }
      }
    }

    updateState({ progress: 20, message: 'Project analyzed' });

    // Step 3: Mount files to WebContainer
    updateState({ status: 'mounting', progress: 30, message: 'Setting up project files...' });
    runnerLog.separator('MOUNTING FILES');
    runnerLog.info('Pipeline', `Mounting ${projectFiles.length} project files`);
    log('📁 Mounting project files...');

    // Separate package.json to write it directly (avoids mount truncation issues)
    const pkgIdx = projectFiles.findIndex(f => f.path === 'package.json');
    const pkgContent = pkgIdx >= 0 ? projectFiles[pkgIdx].content : null;
    const filesWithoutPkg = pkgIdx >= 0
      ? [...projectFiles.slice(0, pkgIdx), ...projectFiles.slice(pkgIdx + 1)]
      : projectFiles;

    // Mount all files except package.json
    const fileTree = filesToFileSystemTree(filesWithoutPkg);
    await mountFiles(fileTree);
    log(`✅ Mounted ${filesWithoutPkg.length} files`);

    // Handle package.json with special care for large files (WebContainer has ~16KB write limit)
    const MAX_SAFE_SIZE = 15000; // 15KB to leave buffer
    let pendingDeps: Record<string, string> = {};
    let pendingDevDeps: Record<string, string> = {};
    let useBatchedInstall = false;
    let originalPkgData: Record<string, unknown> | null = null;

    if (pkgContent) {
      log('📝 Writing package.json...');

      if (pkgContent.length > MAX_SAFE_SIZE) {
        // Large package.json - use batched install strategy
        log(`   Package.json is ${pkgContent.length} bytes (>${MAX_SAFE_SIZE}), using batched install...`);
        useBatchedInstall = true;

        try {
          const fullPkg = JSON.parse(pkgContent);
          originalPkgData = fullPkg; // Save for later restoration

          // Extract dependencies for batched install later
          pendingDeps = fullPkg.dependencies || {};
          pendingDevDeps = fullPkg.devDependencies || {};

          // Create minimal package.json preserving ALL fields except deps
          const minimalPkg = { ...fullPkg };
          minimalPkg.dependencies = {};
          minimalPkg.devDependencies = {};

          const minimalContent = JSON.stringify(minimalPkg, null, 2);
          await writeFile('package.json', minimalContent);
          log(`✅ Wrote minimal package.json (${minimalContent.length} bytes)`);
          log(`   Will install ${Object.keys(pendingDeps).length} deps + ${Object.keys(pendingDevDeps).length} devDeps in batches`);
        } catch (err) {
          log(`⚠️ Failed to parse package.json for batched install: ${err}`);
          useBatchedInstall = false;
        }
      }

      if (!useBatchedInstall) {
        // Standard write with retry for smaller files
        let writeSuccess = false;
        for (let attempt = 1; attempt <= 3 && !writeSuccess; attempt++) {
          try {
            await writeFile('package.json', pkgContent);
            const readBack = await readFile('package.json');

            if (readBack === pkgContent) {
              writeSuccess = true;
              log('✅ package.json verified');
            } else if (readBack.length < pkgContent.length * 0.9) {
              log(`⚠️ Possible truncation (attempt ${attempt}): wrote ${pkgContent.length}, read ${readBack.length}`);
              if (attempt < 3) {
                await new Promise(r => setTimeout(r, 100 * attempt));
              }
            } else {
              writeSuccess = true;
              log('✅ package.json written');
            }
          } catch (err) {
            log(`   Write attempt ${attempt} failed: ${err}`);
          }
        }

        // If all retries failed, fall back to batched install
        if (!writeSuccess) {
          log('⚠️ Standard write failed, switching to batched install...');
          try {
            const fullPkg = JSON.parse(pkgContent);
            originalPkgData = fullPkg;
            pendingDeps = fullPkg.dependencies || {};
            pendingDevDeps = fullPkg.devDependencies || {};
            useBatchedInstall = true;

            const minimalPkg = { ...fullPkg };
            minimalPkg.dependencies = {};
            minimalPkg.devDependencies = {};
            await writeFile('package.json', JSON.stringify(minimalPkg, null, 2));
          } catch {
            log('⚠️ Could not switch to batched install');
          }
        }
      }
    }

    updateState({ progress: 40, message: 'Files mounted' });

    // Step 4: Install dependencies (with caching or batched install)
    if (projectType.type !== 'static') {
      runnerLog.separator('DEPENDENCY INSTALL');
      const pkgFile = projectFiles.find(f => f.path === 'package.json');
      const pkgChanged = pkgFile ? setPackageJsonHash(pkgFile.content) : true;
      const hasExistingModules = await hasNodeModules();

      const shouldSkipInstall = hasExistingModules && !pkgChanged && !options.forceInstall && !useBatchedInstall;

      const preWarmReady = getPreWarmStatus() === 'ready';
      let isPreWarmed = preWarmReady && hasExistingModules;

      if (preWarmReady && !hasExistingModules) {
        runnerLog.warn('Pipeline', 'Pre-warm status is ready but hasNodeModules returned false — trusting pre-warm status');
        isPreWarmed = true;
      }

      if (!isPreWarmed && !shouldSkipInstall && !useBatchedInstall) {
        const pwStatus = getPreWarmStatus();
        if (pwStatus === 'booting' || pwStatus === 'installing') {
          updateState({ status: 'installing', progress: 45, message: 'Waiting for pre-installed packages...' });
          log('⏳ Pre-warm in progress, waiting for it to finish...');
          const preWarmSucceeded = await awaitPreWarm(120000);
          if (preWarmSucceeded) {
            const nowHasModules = await hasNodeModules();
            isPreWarmed = nowHasModules;
            if (isPreWarmed) {
              log('✅ Pre-warm finished, using pre-installed packages');
            }
          } else {
            log('⚠️ Pre-warm did not finish in time, running full install...');
          }
        }
      }

      runnerLog.info('Pipeline', 'Dependency install decision', {
        hasExistingModules,
        pkgChanged,
        forceInstall: options.forceInstall || false,
        useBatchedInstall,
        isPreWarmed,
        preWarmStatus: getPreWarmStatus(),
        decision: shouldSkipInstall ? 'SKIP (cached)' : isPreWarmed ? 'PRE-WARM (install extras only)' : useBatchedInstall ? 'BATCHED' : 'FULL INSTALL',
      });

      if (shouldSkipInstall) {
        runnerLog.success('Pipeline', 'Skipping npm install - dependencies cached and unchanged');
        log('⚡ Dependencies cached, skipping npm install');
        updateState({ progress: 70, message: 'Using cached dependencies' });
      } else if (isPreWarmed && !useBatchedInstall) {
        updateState({ status: 'installing', progress: 50, message: 'Using pre-installed packages...' });
        runnerLog.info('Pipeline', 'Using pre-warmed packages, checking for extras...');
        log('⚡ Core packages pre-installed, checking for extras...');

        const { deps: preWarmedDeps, devDeps: preWarmedDevDeps } = getPreWarmedPackages();
        const allPreWarmed = { ...preWarmedDeps, ...preWarmedDevDeps };

        try {
          const currentPkg = pkgContent ? JSON.parse(pkgContent || '{}') : {};
          const projectDeps = currentPkg.dependencies || {};
          const projectDevDeps = currentPkg.devDependencies || {};

          const extraDeps = Object.keys(projectDeps).filter(d => !allPreWarmed[d]);
          const extraDevDeps = Object.keys(projectDevDeps).filter(d => !allPreWarmed[d]);

          runnerLog.info('Pipeline', `Pre-warm diff: ${extraDeps.length} extra deps, ${extraDevDeps.length} extra devDeps`, {
            extraDeps: extraDeps.join(', ') || '(none)',
            extraDevDeps: extraDevDeps.join(', ') || '(none)',
            cachedDeps: Object.keys(preWarmedDeps).length,
            cachedDevDeps: Object.keys(preWarmedDevDeps).length,
          });

          if (extraDeps.length > 0 || extraDevDeps.length > 0) {
            log(`📦 Installing ${extraDeps.length + extraDevDeps.length} extra packages...`);
            updateState({ progress: 55, message: `Installing ${extraDeps.length + extraDevDeps.length} extra packages...` });

            if (extraDeps.length > 0) {
              const result = await runNpmInstall(extraDeps, false, (out) => log(out), 120000, true);
              if (!result.success) {
                runnerLog.warn('Pipeline', 'Some extra dependency packages failed');
                log('⚠️ Some extra packages failed, continuing...');
              }
            }
            if (extraDevDeps.length > 0) {
              const result = await runNpmInstall(extraDevDeps, true, (out) => log(out), 120000, true);
              if (!result.success) {
                runnerLog.warn('Pipeline', 'Some extra devDependency packages failed');
                log('⚠️ Some extra dev packages failed, continuing...');
              }
            }
            await fixBinPermissions();
            runnerLog.success('Pipeline', 'Extra packages installed');
            log('✅ Extra packages installed');
          } else {
            runnerLog.success('Pipeline', 'All packages already pre-installed, no extras needed');
            log('✅ All packages already pre-installed');
          }

          await fixBinPermissions();
          triggerSnapshotBuild(projectFiles).then(upgraded => {
            if (upgraded) applyUpgradedPackageJson(projectFiles, upgraded, log);
          }).catch(() => {});
        } catch (e) {
          runnerLog.warn('Pipeline', `Could not diff packages: ${e}, falling back to full install`);
          log('⚠️ Could not diff packages, running full install...');
          await installDependencies((output) => log(output));
          triggerSnapshotBuild(projectFiles).then(upgraded => {
            if (upgraded) applyUpgradedPackageJson(projectFiles, upgraded, log);
          }).catch(() => {});
        }

        updateState({ progress: 70, message: 'Dependencies ready' });
      } else if (useBatchedInstall) {
        updateState({ status: 'installing', progress: 50, message: 'Installing packages in batches...' });

        const allDeps = Object.entries(pendingDeps);
        const allDevDeps = Object.entries(pendingDevDeps);
        const BATCH_SIZE = 10;

        runnerLog.info('Pipeline', `Batched install: ${allDeps.length} deps + ${allDevDeps.length} devDeps in batches of ${BATCH_SIZE}`);
        log(`📦 Installing ${allDeps.length} dependencies in batches...`);

        // Install regular dependencies in batches
        for (let i = 0; i < allDeps.length; i += BATCH_SIZE) {
          const batch = allDeps.slice(i, i + BATCH_SIZE);
          const pkgSpecs = batch.map(([name, version]) => {
            const ver = String(version);
            return ver.startsWith('^') || ver.startsWith('~') || ver === '*' || ver === 'latest'
              ? name
              : `${name}@${ver}`;
          });

          const batchNum = Math.floor(i / BATCH_SIZE) + 1;
          const totalBatches = Math.ceil(allDeps.length / BATCH_SIZE);
          log(`   Batch ${batchNum}/${totalBatches}: ${pkgSpecs.join(' ')}`);

          const progress = 50 + Math.floor((i / allDeps.length) * 15);
          updateState({ progress, message: `Installing batch ${batchNum}/${totalBatches}...` });

          const result = await runNpmInstall(pkgSpecs, false, (out) => log(out));
          if (!result.success) {
            log(`   ⚠️ Some packages in batch ${batchNum} failed, continuing...`);
          }
        }

        // Install dev dependencies
        if (allDevDeps.length > 0) {
          log(`📦 Installing ${allDevDeps.length} dev dependencies...`);
          for (let i = 0; i < allDevDeps.length; i += BATCH_SIZE) {
            const batch = allDevDeps.slice(i, i + BATCH_SIZE);
            const pkgSpecs = batch.map(([name, version]) => {
              const ver = String(version);
              return ver.startsWith('^') || ver.startsWith('~') || ver === '*' || ver === 'latest'
                ? name
                : `${name}@${ver}`;
            });

            const batchNum = Math.floor(i / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(allDevDeps.length / BATCH_SIZE);
            log(`   DevDep batch ${batchNum}/${totalBatches}: ${pkgSpecs.join(' ')}`);

            const result = await runNpmInstall(pkgSpecs, true, (out) => log(out));
            if (!result.success) {
              log(`   ⚠️ Some dev packages in batch ${batchNum} failed, continuing...`);
            }
          }
        }

        // Restore full package.json with dependencies after install
        if (originalPkgData) {
          try {
            // Read current package.json (npm may have updated versions)
            const currentPkgContent = await readFile('package.json');
            const currentPkg = JSON.parse(currentPkgContent);

            // Merge: keep npm's installed versions, restore original metadata
            const restoredPkg = {
              ...originalPkgData,
              dependencies: currentPkg.dependencies || {},
              devDependencies: currentPkg.devDependencies || {}
            };

            // Write in chunks if still too large (unlikely after npm normalizes versions)
            const restoredContent = JSON.stringify(restoredPkg, null, 2);
            if (restoredContent.length <= MAX_SAFE_SIZE) {
              await writeFile('package.json', restoredContent);
              log('✅ Restored full package.json');
            } else {
              log('   Package.json still large, keeping minimal version');
            }
          } catch (err) {
            log(`⚠️ Could not restore package.json: ${err}`);
          }
        }

        log('✅ Batched install complete');
        await fixBinPermissions();
        triggerSnapshotBuild(projectFiles).then(upgraded => {
          if (upgraded) applyUpgradedPackageJson(projectFiles, upgraded, log);
        }).catch(() => {});
        updateState({ progress: 70, message: 'Dependencies installed' });
      } else {
        updateState({ status: 'installing', progress: 50, message: 'Installing npm packages...' });
        const reason = hasExistingModules ? 'Dependencies changed, reinstalling' : 'Fresh install';
        runnerLog.info('Pipeline', `Full npm install: ${reason}`);
        log(hasExistingModules ? '📦 Dependencies changed, reinstalling...' : '📦 Running npm install...');

        const installResult = await installDependencies((output) => {
          log(output);
        });

        if (!installResult.success) {
          runnerLog.warn('Pipeline', 'npm install had issues, attempting to proceed', {
            exitCode: installResult.exitCode,
            errorCount: installResult.errors.length,
          });
          log('⚠️ npm install had issues, attempting to proceed anyway...');
          updateState({ progress: 70, message: 'Install incomplete, trying to start...' });
        } else {
          runnerLog.success('Pipeline', 'Full npm install completed');
          log('✅ Dependencies installed');
          triggerSnapshotBuild(projectFiles).then(upgraded => {
            if (upgraded) applyUpgradedPackageJson(projectFiles, upgraded, log);
          }).catch(() => {});
          updateState({ progress: 70, message: 'Dependencies installed' });
        }
        await fixBinPermissions();
      }
    }

    // Step 4.5: Pre-flight verify critical UI files before dev server start
    runnerLog.separator('PRE-FLIGHT CHECK');
    updateState({ progress: 75, message: 'Verifying critical files...' });
    const preFlightFixes = await preFlightVerifyCriticalFiles(projectFiles, log);
    if (preFlightFixes > 0) {
      runnerLog.success('PreFlight', `Fixed ${preFlightFixes} critical file(s) before dev server start`);
    } else {
      runnerLog.success('PreFlight', 'All critical files verified OK');
    }

    // Step 4.6: Ensure vite.config.ts has ESM __dirname polyfill (prevents silent exit code 0)
    if (projectType.type === 'vite') {
      try {
        const viteConfigContent = await readFile('vite.config.ts');
        if (viteConfigContent && !viteConfigContent.includes('fileURLToPath')) {
          const fixedConfig = `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nimport path from 'path';\nimport { fileURLToPath } from 'url';\nconst __filename = fileURLToPath(import.meta.url);\nconst __dirname = path.dirname(__filename);\n` +
            viteConfigContent
              .replace(/import\s*\{?\s*defineConfig\s*\}?\s*from\s*['"]vite['"];?\n?/g, '')
              .replace(/import\s+react\s+from\s*['"]@vitejs\/plugin-react['"];?\n?/g, '')
              .replace(/import\s+path\s+from\s*['"]path['"];?\n?/g, '')
              .replace(/import\s*\*\s*as\s+path\s+from\s*['"]path['"];?\n?/g, '')
              .replace(/const\s+__dirname\s*=\s*[^;\n]+;?\n?/g, '')
              .replace(/const\s+__filename\s*=\s*[^;\n]+;?\n?/g, '');
          await writeFile('vite.config.ts', fixedConfig);
          runnerLog.info('PreFlight', 'Patched vite.config.ts with ESM __dirname polyfill');
        }
      } catch {
        const fallbackConfig = `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nimport path from 'path';\nimport { fileURLToPath } from 'url';\nconst __filename = fileURLToPath(import.meta.url);\nconst __dirname = path.dirname(__filename);\nexport default defineConfig({\n  plugins: [react()],\n  resolve: {\n    alias: {\n      '@': path.resolve(__dirname, './src'),\n    },\n  },\n});\n`;
        await writeFile('vite.config.ts', fallbackConfig);
        runnerLog.info('PreFlight', 'Wrote fallback vite.config.ts with ESM __dirname polyfill');
      }
    }

    // Step 5: Start dev server with error-fix retry loop
    runnerLog.separator('DEV SERVER');
    updateState({ status: 'starting', progress: 80, message: 'Starting development server...' });
    runnerLog.info('Pipeline', 'Starting dev server...');
    log('🚀 Starting development server...');

    const maxFixAttempts = 3;
    let fixAttempt = 0;
    let url: string = '';
    let devServerStarted = false;
    const errorLines: string[] = [];
    let needsReinstall = false;

    while (fixAttempt < maxFixAttempts && !devServerStarted) {
      try {
        const errorCollector = (output: string) => {
          log(output);
          if (output.includes('error') || output.includes('Error') || output.includes('ERROR') ||
              output.includes('Cannot find') || output.includes('Failed to resolve') ||
              output.includes('SyntaxError') || output.includes('Module not found')) {
            errorLines.push(output);
          }
        };
        const result = await startDevServer(
          errorCollector,
          (serverUrl) => {
            log(`✅ Server ready at ${serverUrl}`);
            callbacks.onPreviewReady?.(serverUrl);
          }
        );
        url = result.url;
        devServerStarted = true;
      } catch (devErr) {
        const devErrorMsg = devErr instanceof Error ? devErr.message : String(devErr);
        errorLines.push(devErrorMsg);

        fixAttempt++;
        if (fixAttempt >= maxFixAttempts) {
          throw devErr;
        }
        runnerLog.warn('Pipeline', `Dev server failed (attempt ${fixAttempt}/${maxFixAttempts}), attempting auto-fix...`);
        log(`⚠️ Dev server error, attempting auto-fix (${fixAttempt}/${maxFixAttempts})...`);

        const fixContext: AutoFixContext = {
          files: projectFiles,
          updateFile: async (path: string, content: string) => {
            await writeFile(path, content);
            const idx = projectFiles.findIndex(f => f.path === path);
            if (idx >= 0) {
              projectFiles[idx] = { ...projectFiles[idx], content };
            }
          },
          addTerminalLine: (_type: string, message: string) => log(message),
          retryCount: fixAttempt,
        };

        let fixApplied = false;
        for (const errorLine of errorLines) {
          const fixResult = autoFixEngine.processError(errorLine, fixContext);
          if (fixResult?.fixed && fixResult.codeChanges) {
            for (const change of fixResult.codeChanges) {
              await writeFile(change.file, change.fixed);
              const idx = projectFiles.findIndex(f => f.path === change.file);
              if (idx >= 0) {
                projectFiles[idx] = { ...projectFiles[idx], content: change.fixed };
              }
              if (change.file === 'package.json' || change.file.endsWith('/package.json')) {
                needsReinstall = true;
              }
            }
            fixApplied = true;
            runnerLog.info('AutoFix', `Applied fix: ${fixResult.action}`);
            log(`🔧 Auto-fix: ${fixResult.action}`);
          }
        }

        if (!fixApplied) {
          try {
            const resp = await fetch('/api/auto-fix', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                errors: errorLines,
                files: projectFiles.map(f => ({ path: f.path, content: f.content, language: f.path.split('.').pop() || '' })),
              }),
            });
            const serverFixes = await resp.json();
            if (serverFixes?.fixes?.length > 0) {
              for (const fix of serverFixes.fixes) {
                if (fix.type === 'patch_file' && fix.filePath && fix.newContent) {
                  const existing = projectFiles.find(f => f.path === fix.filePath);
                  if (existing && fix.oldContent) {
                    const patched = existing.content.replace(fix.oldContent, fix.newContent);
                    await writeFile(fix.filePath, patched);
                    existing.content = patched;
                    fixApplied = true;
                    if (fix.filePath === 'package.json') needsReinstall = true;
                    log(`🔧 Server fix (patch): ${fix.description || fix.filePath}`);
                  }
                } else if (fix.type === 'create_file' && fix.filePath && fix.newContent) {
                  await writeFile(fix.filePath, fix.newContent);
                  projectFiles.push({ path: fix.filePath, content: fix.newContent });
                  fixApplied = true;
                  log(`🔧 Server fix (create): ${fix.description || fix.filePath}`);
                }
              }
            }
          } catch (fetchErr) {
            runnerLog.debug('AutoFix', `Server auto-fix request failed: ${fetchErr}`);
          }
        }

        if (needsReinstall) {
          log('📦 Re-installing dependencies after package.json fix...');
          await runNpmInstall((output) => log(output));
          needsReinstall = false;
        }

        if (!fixApplied) {
          runnerLog.warn('AutoFix', 'No fixes could be applied, retrying as-is...');
        }

        errorLines.length = 0;
        updateState({ progress: 80 + fixAttempt * 3, message: `Retrying after fix (${fixAttempt}/${maxFixAttempts})...` });
      }
    }

    const totalMs = runnerLog.endTimer('auto-run-total');

    updateState({
      status: 'running',
      progress: 100,
      message: 'Application running!',
      previewUrl: url
    });

    runnerLog.success('AutoRunner', `Project "${projectName}" running at ${url}`, {
      totalTime: `${totalMs}ms`,
      totalFiles: files.length,
      projectType: projectType.type,
      url,
    }, totalMs);
    runnerLog.separator('AUTO-RUN COMPLETE');
    log(`🎉 Application running at ${url}`);

    lastSuccessfulPreviewUrl = url;
    sessionProjectHash = projectHash;
    return { success: true, previewUrl: url, error: null };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const totalMs = runnerLog.endTimer('auto-run-total');
    runnerLog.error('AutoRunner', `Pipeline failed for "${projectName}": ${errorMessage}`, {
      totalTime: `${totalMs}ms`,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3).join(' | ') : undefined,
    });
    runnerLog.separator('AUTO-RUN FAILED');
    updateState({ status: 'error', error: errorMessage, message: 'Error occurred' });
    callbacks.onError?.(errorMessage);
    log(`❌ Error: ${errorMessage}`);

    return { success: false, previewUrl: null, error: errorMessage };
  }
  };

  activeRunPromise = runPipeline().finally(() => {
    activeRunId = null;
    activeRunPromise = null;
  });

  return activeRunPromise;
}

export function resetAutoRunGuard() {
  activeRunId = null;
  activeRunPromise = null;
  lastSuccessfulPreviewUrl = null;
  sessionProjectHash = null;
}

export async function quickRun(
  files: { path: string; content: string }[],
  onProgress?: (message: string, progress: number) => void
): Promise<string | null> {
  runnerLog.info('AutoRunner', `Quick run: ${files.length} files`);
  const result = await autoRunProject(files, 'quick-project', {
    onStatusChange: (state) => onProgress?.(state.message, state.progress),
    onLog: () => {}
  });

  return result.previewUrl;
}

// Check if files represent a runnable project
export function isRunnableProject(files: { path: string; content: string }[]): boolean {
  // Must have at least an entry point (supports both JS and TS)
  const hasEntryPoint = files.some(f =>
    f.path === 'index.html' ||
    f.path === 'src/main.jsx' ||
    f.path === 'src/main.tsx' ||
    f.path === 'src/index.jsx' ||
    f.path === 'src/index.tsx' ||
    f.path === 'server.js' ||
    f.path === 'server.ts' ||
    f.path === 'index.js' ||
    f.path === 'index.ts' ||
    f.path === 'app.js' ||
    f.path === 'app.ts'
  );

  return hasEntryPoint;
}

// Estimate install time based on dependencies
export function estimateInstallTime(files: { path: string; content: string }[]): number {
  const allCode = files.map(f => f.content).join('\n');
  const useTypeScript = files.some(f => f.path.endsWith('.ts') || f.path.endsWith('.tsx'));
  const { dependencies, devDependencies } = detectDependencies(allCode, useTypeScript);
  const depCount = Object.keys(dependencies).length + Object.keys(devDependencies).length;

  if (getPreWarmStatus() === 'ready') {
    const { deps: preWarmed, devDeps: preWarmedDev } = getPreWarmedPackages();
    const extraCount = Object.keys(dependencies).filter(d => !preWarmed[d]).length
      + Object.keys(devDependencies).filter(d => !preWarmedDev[d]).length;
    return 3 + (extraCount * 3);
  }

  return 5 + (depCount * 3);
}