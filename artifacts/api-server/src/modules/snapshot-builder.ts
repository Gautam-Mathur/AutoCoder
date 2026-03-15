import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { spawn } from 'child_process';
import { AVAILABLE_DEPS, DEV_DEPS } from './dependency-registry.js';

const CACHE_DIR = './cache';
const PREWARM_SNAPSHOT_FILE = 'prewarm-snapshot.json.gz';
const inProgressBuilds = new Set<string>();

const KEEP_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.json', '.css', '.ts', '.tsx', '.wasm']);
const SKIP_EXTENSIONS = new Set(['.map', '.md', '.txt', '.html', '.png', '.jpg', '.svg', '.gif', '.ico', '.d.ts']);
const SKIP_DIRS = new Set([
  'test', 'tests', '__tests__', '__mocks__', '__fixtures__', 'fixture', 'fixtures',
  '.cache', 'example', 'examples', 'benchmark', 'benchmarks', 'docs', 'doc',
  'coverage', '.nyc_output', 'browser', 'umd', 'esm5', 'cjs5',
]);

function shouldSkipPath(relPath: string): boolean {
  const parts = relPath.split(path.sep);
  for (const part of parts) {
    if (SKIP_DIRS.has(part.toLowerCase())) return true;
  }
  const ext = path.extname(relPath).toLowerCase();
  if (relPath.endsWith('.d.ts')) return true;
  if (SKIP_EXTENSIONS.has(ext)) return true;
  if (!KEEP_EXTENSIONS.has(ext) && ext !== '') return true;
  return false;
}

interface FileSystemTree {
  [key: string]: FileNode | DirectoryNode;
}
interface FileNode {
  file: { contents: string | Uint8Array };
}
interface DirectoryNode {
  directory: FileSystemTree;
}

function buildTree(baseDir: string): FileSystemTree {
  const tree: FileSystemTree = {};

  function walk(dir: string, node: FileSystemTree) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relFromBase = path.relative(baseDir, fullPath);

      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name.toLowerCase())) continue;
        const child: FileSystemTree = {};
        node[entry.name] = { directory: child };
        walk(fullPath, child);
      } else if (entry.isFile()) {
        if (shouldSkipPath(relFromBase)) continue;
        try {
          const contents = fs.readFileSync(fullPath, 'utf-8');
          node[entry.name] = { file: { contents } };
        } catch {
          // skip unreadable files
        }
      }
    }
  }

  walk(baseDir, tree);
  return tree;
}

async function runNpmInstallAndSnapshot(tmpDir: string, snapshotPath: string, packageJsonContent: string, label: string): Promise<void> {
  const startTime = Date.now();

  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.mkdirSync(tmpDir, { recursive: true });

    fs.writeFileSync(path.join(tmpDir, 'package.json'), packageJsonContent, 'utf-8');

    console.log(`[SnapshotBuilder] [${label}] Running npm install in ${tmpDir}...`);

    await new Promise<void>((resolve, reject) => {
      const proc = spawn('npm', [
        'install',
        '--no-audit',
        '--no-fund',
        '--omit=optional',
        '--legacy-peer-deps',
        '--prefer-offline',
        '--loglevel=error',
      ], {
        cwd: tmpDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'production' },
      });

      let stderr = '';
      proc.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

      const timeout = setTimeout(() => {
        proc.kill('SIGKILL');
        reject(new Error('npm install timed out after 10 minutes'));
      }, 600000);

      proc.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`npm install failed with exit code ${code}: ${stderr.slice(-500)}`));
        }
      });
    });

    console.log(`[SnapshotBuilder] [${label}] npm install done in ${Date.now() - startTime}ms, building FileSystemTree...`);

    const nodeModulesDir = path.join(tmpDir, 'node_modules');
    if (!fs.existsSync(nodeModulesDir)) {
      throw new Error('node_modules not found after npm install');
    }

    const tree = buildTree(nodeModulesDir);
    const fullTree: FileSystemTree = { node_modules: { directory: tree } };

    const jsonStr = JSON.stringify(fullTree);
    console.log(`[SnapshotBuilder] [${label}] Tree built: ${(jsonStr.length / 1024 / 1024).toFixed(1)} MB uncompressed`);

    const compressed = await new Promise<Buffer>((resolve, reject) => {
      zlib.gzip(Buffer.from(jsonStr, 'utf-8'), { level: 6 }, (err, result) => {
        if (err) reject(err); else resolve(result);
      });
    });

    const tmpSnapshot = snapshotPath + '.tmp';
    fs.writeFileSync(tmpSnapshot, compressed);
    fs.renameSync(tmpSnapshot, snapshotPath);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[SnapshotBuilder] [${label}] Snapshot saved: ${snapshotPath} (${(compressed.length / 1024 / 1024).toFixed(1)} MB compressed) in ${elapsed}s`);

    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`[SnapshotBuilder] [${label}] Build failed after ${elapsed}s:`, err);
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    throw err;
  }
}

export function buildSnapshotAsync(hash: string, packageJsonContent: string): void {
  const snapshotPath = path.join(CACHE_DIR, `snapshot-${hash}.json.gz`);

  if (fs.existsSync(snapshotPath)) {
    console.log(`[SnapshotBuilder] Snapshot already exists for hash ${hash}, skipping`);
    return;
  }

  if (inProgressBuilds.has(hash)) {
    console.log(`[SnapshotBuilder] Already building snapshot for hash ${hash}, skipping`);
    return;
  }

  inProgressBuilds.add(hash);

  const tmpDir = path.join('/tmp', `snapshot-${hash}`);
  runNpmInstallAndSnapshot(tmpDir, snapshotPath, packageJsonContent, `project:${hash}`)
    .catch(() => {})
    .finally(() => { inProgressBuilds.delete(hash); });
}

export function getSnapshotStatus(hash: string): 'ready' | 'building' | 'not-found' {
  const snapshotPath = path.join(CACHE_DIR, `snapshot-${hash}.json.gz`);
  if (fs.existsSync(snapshotPath)) return 'ready';
  if (inProgressBuilds.has(hash)) return 'building';
  return 'not-found';
}

export function buildPrewarmSnapshot(force = false): void {
  const snapshotPath = path.join(CACHE_DIR, PREWARM_SNAPSHOT_FILE);

  if (!force && fs.existsSync(snapshotPath)) {
    const stat = fs.statSync(snapshotPath);
    console.log(`[SnapshotBuilder] Prewarm snapshot already exists (${(stat.size / 1024 / 1024).toFixed(1)} MB), skipping. Use force=true to rebuild.`);
    return;
  }

  if (inProgressBuilds.has('prewarm')) {
    console.log(`[SnapshotBuilder] Prewarm snapshot build already in progress, skipping`);
    return;
  }

  inProgressBuilds.add('prewarm');

  if (force && fs.existsSync(snapshotPath)) {
    try { fs.unlinkSync(snapshotPath); } catch {}
    console.log(`[SnapshotBuilder] Deleted existing prewarm snapshot for rebuild`);
  }

  const depCount = Object.keys(AVAILABLE_DEPS).length;
  const devDepCount = Object.keys(DEV_DEPS).length;
  console.log(`[SnapshotBuilder] Building prewarm snapshot with ${depCount} deps + ${devDepCount} devDeps (${depCount + devDepCount} total)...`);

  const packageJson = JSON.stringify({
    name: 'autocoder-prewarm',
    private: true,
    version: '1.0.0',
    type: 'module',
    dependencies: { ...AVAILABLE_DEPS },
    devDependencies: { ...DEV_DEPS },
  }, null, 2);

  const tmpDir = path.join('/tmp', 'snapshot-prewarm');
  runNpmInstallAndSnapshot(tmpDir, snapshotPath, packageJson, 'prewarm')
    .then(() => {
      console.log(`[SnapshotBuilder] Prewarm snapshot ready at ${snapshotPath}`);
    })
    .catch((err) => {
      console.error(`[SnapshotBuilder] Prewarm snapshot build failed:`, err);
    })
    .finally(() => { inProgressBuilds.delete('prewarm'); });
}

export function getPrewarmSnapshotStatus(): 'ready' | 'building' | 'not-found' {
  const snapshotPath = path.join(CACHE_DIR, PREWARM_SNAPSHOT_FILE);
  if (fs.existsSync(snapshotPath)) return 'ready';
  if (inProgressBuilds.has('prewarm')) return 'building';
  return 'not-found';
}
