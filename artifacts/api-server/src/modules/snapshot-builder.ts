import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { spawn } from 'child_process';
import { AVAILABLE_DEPS, DEV_DEPS } from './dependency-registry.js';

const CACHE_DIR = './cache';
const inProgressBuilds = new Set<string>();

const KEEP_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.json', '.css', '.ts', '.tsx', '.wasm']);
const SKIP_EXTENSIONS = new Set(['.map', '.md', '.txt', '.html', '.png', '.jpg', '.svg', '.gif', '.ico', '.d.ts']);
const SKIP_DIRS = new Set([
  'test', 'tests', '__tests__', '__mocks__', '__fixtures__', 'fixture', 'fixtures',
  '.cache', 'example', 'examples', 'benchmark', 'benchmarks', 'docs', 'doc',
  'coverage', '.nyc_output', 'browser', 'umd', 'esm5', 'cjs5',
]);

const KNOWN_BAD_PACKAGES = new Set([
  'auto-animate',
]);

const PACKAGE_RENAMES: Record<string, string> = {
  'auto-animate': '@formkit/auto-animate',
};

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
        }
      }
    }
  }

  walk(baseDir, tree);
  return tree;
}

export interface UpgradeResult {
  packageJson: any;
  removedPackages: string[];
  renamedPackages: Array<{ from: string; to: string }>;
  upgradedVersions: Array<{ pkg: string; from: string; to: string }>;
  warnings: string[];
}

export function upgradePackageJson(input: string | object): UpgradeResult {
  const pkgJson = typeof input === 'string' ? JSON.parse(input) : JSON.parse(JSON.stringify(input));
  const removedPackages: string[] = [];
  const renamedPackages: Array<{ from: string; to: string }> = [];
  const upgradedVersions: Array<{ pkg: string; from: string; to: string }> = [];
  const warnings: string[] = [];

  const registryLookup: Record<string, string> = { ...AVAILABLE_DEPS, ...DEV_DEPS };

  function processSection(section: Record<string, string> | undefined, sectionName: string): Record<string, string> | undefined {
    if (!section || typeof section !== 'object') return section;

    const cleaned: Record<string, string> = {};

    for (const [pkg, version] of Object.entries(section)) {
      if (KNOWN_BAD_PACKAGES.has(pkg)) {
        removedPackages.push(pkg);

        const renamed = PACKAGE_RENAMES[pkg];
        if (renamed && !section[renamed] && !cleaned[renamed]) {
          const canonicalVersion = registryLookup[renamed];
          if (canonicalVersion) {
            cleaned[renamed] = canonicalVersion;
            renamedPackages.push({ from: pkg, to: renamed });
          } else {
            warnings.push(`Rename target "${renamed}" not in registry — skipped rename from "${pkg}"`);
          }
        }
        continue;
      }

      const canonicalVersion = registryLookup[pkg];
      if (canonicalVersion && canonicalVersion !== version) {
        cleaned[pkg] = canonicalVersion;
        upgradedVersions.push({ pkg, from: version, to: canonicalVersion });
      } else {
        cleaned[pkg] = version;
        if (!canonicalVersion && !pkg.startsWith('@types/')) {
          warnings.push(`Package "${pkg}" not in registry — kept as-is with version "${version}"`);
        }
      }
    }

    return cleaned;
  }

  pkgJson.dependencies = processSection(pkgJson.dependencies, 'dependencies');
  pkgJson.devDependencies = processSection(pkgJson.devDependencies, 'devDependencies');

  if (removedPackages.length > 0) {
    console.log(`[UpgradePackageJson] Removed ${removedPackages.length} bad packages: ${removedPackages.join(', ')}`);
  }
  if (renamedPackages.length > 0) {
    console.log(`[UpgradePackageJson] Renamed ${renamedPackages.length} packages: ${renamedPackages.map(r => `${r.from} → ${r.to}`).join(', ')}`);
  }
  if (upgradedVersions.length > 0) {
    console.log(`[UpgradePackageJson] Upgraded ${upgradedVersions.length} package versions`);
  }

  return {
    packageJson: pkgJson,
    removedPackages,
    renamedPackages,
    upgradedVersions,
    warnings,
  };
}

function parseFailedPackagesFromStderr(stderr: string): string[] {
  const failed = new Set<string>();

  const notFoundPatterns = [
    /npm ERR! 404\s+'((?:@[^/]+\/)?[^'@]+)@[^']*' is not in (?:this|the npm) registry/g,
    /npm ERR! 404\s+Not Found[^:]*:\s*((?:@[^/\s]+\/)?[^\s@]+)@/g,
    /npm ERR! code E404[^]*?npm ERR! 404\s+'?((?:@[^/\s]+\/)?[^'\s@]+)@/g,
    /npm ERR! notarget No matching version found for ((?:@[^/\s]+\/)?[^\s@]+)@/g,
    /npm ERR! peer dep missing: ((?:@[^/\s,]+\/)?[^\s@,]+)@/g,
    /Could not resolve dependency:.*\n.*npm ERR!\s+peer\s+((?:@[^/\s]+\/)?[^\s@]+)@/g,
    /ERESOLVE[^]*?While resolving:\s*((?:@[^/\s]+\/)?[^\s@]+)@/g,
  ];

  for (const pattern of notFoundPatterns) {
    let match;
    while ((match = pattern.exec(stderr)) !== null) {
      const pkg = match[1].trim();
      if (pkg && !pkg.startsWith('npm') && pkg.length < 100) {
        failed.add(pkg);
      }
    }
  }

  return Array.from(failed);
}

async function runNpmInstall(tmpDir: string, label: string): Promise<{ success: boolean; stderr: string }> {
  return new Promise((resolve) => {
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
      resolve({ success: false, stderr: stderr + '\nnpm install timed out after 10 minutes' });
    }, 600000);

    proc.on('close', (code) => {
      clearTimeout(timeout);
      resolve({ success: code === 0, stderr });
    });
  });
}

async function runNpmInstallAndSnapshot(tmpDir: string, snapshotPath: string, packageJsonContent: string, label: string): Promise<void> {
  const startTime = Date.now();

  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.mkdirSync(tmpDir, { recursive: true });

    fs.writeFileSync(path.join(tmpDir, 'package.json'), packageJsonContent, 'utf-8');

    console.log(`[SnapshotBuilder] [${label}] Running npm install in ${tmpDir}...`);

    let result = await runNpmInstall(tmpDir, label);

    if (!result.success) {
      const failedPkgs = parseFailedPackagesFromStderr(result.stderr);

      if (failedPkgs.length > 0) {
        console.warn(`[SnapshotBuilder] [${label}] npm install failed. Retrying without ${failedPkgs.length} bad packages: ${failedPkgs.join(', ')}`);

        const pkgJson = JSON.parse(packageJsonContent);
        for (const pkg of failedPkgs) {
          if (pkgJson.dependencies) delete pkgJson.dependencies[pkg];
          if (pkgJson.devDependencies) delete pkgJson.devDependencies[pkg];
        }

        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
        fs.mkdirSync(tmpDir, { recursive: true });
        fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(pkgJson, null, 2), 'utf-8');

        console.log(`[SnapshotBuilder] [${label}] Retry npm install without bad packages...`);
        result = await runNpmInstall(tmpDir, label);

        if (!result.success) {
          throw new Error(`npm install retry failed: ${result.stderr.slice(-500)}`);
        }

        console.log(`[SnapshotBuilder] [${label}] Retry succeeded (dropped ${failedPkgs.length} packages)`);
      } else {
        throw new Error(`npm install failed with no parseable bad packages: ${result.stderr.slice(-500)}`);
      }
    }

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
    .catch((err) => {
      console.error(`[SnapshotBuilder] Snapshot build failed for hash ${hash}:`, err);
    })
    .finally(() => { inProgressBuilds.delete(hash); });
}

export function getSnapshotStatus(hash: string): 'ready' | 'building' | 'not-found' {
  const snapshotPath = path.join(CACHE_DIR, `snapshot-${hash}.json.gz`);
  if (fs.existsSync(snapshotPath)) return 'ready';
  if (inProgressBuilds.has(hash)) return 'building';
  return 'not-found';
}

export function buildPrewarmSnapshot(force = false): void {
  console.log('[SnapshotBuilder] Prewarm snapshot is disabled. Use per-project snapshots via /api/cache/build-snapshot.');
}

export function getPrewarmSnapshotStatus(): 'ready' | 'building' | 'not-found' {
  return 'not-found';
}
