import { createHash } from 'crypto';
import {
  CanonicalArchitecture,
  parseCanonicalArchitecture,
} from './architecture-parser';
import { requiresModuleOwnership } from './architecture-file-policy';
import { WorkspaceManifest } from './contracts/schemas/coder';

export type WorkspaceFileClass = 'project' | 'pipeline-artifact';

export const CONTROL_PLANE_ARTIFACTS = [
  'plan.md',
  'requirements.md',
  'architecture.md',
  'backend_spec.md',
  'ui_spec.md',
  'blueprint.md',
  'test_report.md',
  'debug_report.md',
  'security_report.md',
  'review_report.md',
  'workspace.manifest.json',
  'architecture_drift_report.md',
] as const;

const CONTROL_PLANE_SET = new Set<string>(
  CONTROL_PLANE_ARTIFACTS.map((f) => f.toLowerCase())
);

export function normalizeProjectPath(filePath: string): string {
  return filePath
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/')
    .trim();
}

export function isControlPlaneArtifact(filePath: string): boolean {
  const norm = normalizeProjectPath(filePath).toLowerCase();
  return CONTROL_PLANE_SET.has(norm) || CONTROL_PLANE_SET.has(norm.split('/').pop() || '');
}

export function classifyWorkspaceFile(filePath: string): WorkspaceFileClass {
  return isControlPlaneArtifact(filePath) ? 'pipeline-artifact' : 'project';
}

export function computeFileSetHash(files: string[] | Iterable<string>): string {
  const sorted = Array.from(files)
    .map(normalizeProjectPath)
    .filter(Boolean)
    .sort();
  const unique = Array.from(new Set(sorted));
  return createHash('sha256').update(JSON.stringify(unique)).digest('hex');
}

export interface ParsedBlueprintFile {
  path: string;
  ownerModule: string;
  dependencies: string[];
}

export interface ParsedBlueprint {
  files: ParsedBlueprintFile[];
  rawSections: Map<string, string>;
  parserErrors: string[];
}

export function parseBlueprintContract(blueprintContent: string): ParsedBlueprint {
  const parserErrors: string[] = [];
  const files: ParsedBlueprintFile[] = [];
  const rawSections = new Map<string, string>();

  if (!blueprintContent || !blueprintContent.trim()) {
    parserErrors.push('Blueprint Contract Error: blueprint.md is empty.');
    return { files, rawSections, parserErrors };
  }

  const lines = blueprintContent.replace(/\r\n/g, '\n').split('\n');
  const fileSectionIndices: { path: string; lineIndex: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('### File:')) {
      const pathPart = line.substring('### File:'.length).trim().replace(/[*`'"]/g, '');
      const normPath = normalizeProjectPath(pathPart);
      if (!normPath) {
        parserErrors.push(`Blueprint Parser Error: Invalid empty file path heading at line ${i + 1}.`);
      } else {
        fileSectionIndices.push({ path: normPath, lineIndex: i });
      }
    }
  }

  if (fileSectionIndices.length === 0) {
    parserErrors.push('Blueprint Contract Error: No "### File: <path>" sections found in blueprint.md.');
    return { files, rawSections, parserErrors };
  }

  for (let idx = 0; idx < fileSectionIndices.length; idx++) {
    const sec = fileSectionIndices[idx];
    const startLine = sec.lineIndex + 1;
    const nextSec = fileSectionIndices[idx + 1];
    const endLine = nextSec ? nextSec.lineIndex : lines.length;
    const secLines = lines.slice(startLine, endLine);

    let ownerModule = '';
    const dependencies: string[] = [];

    for (const rawLine of secLines) {
      const line = rawLine.trim();
      const ownerMatch = line.match(/^-\s*(?:\*\*)?Owner Module(?:\*\*)?:\s*(.*)$/i);
      if (ownerMatch) {
        ownerModule = ownerMatch[1].trim().replace(/[*`'"]/g, '');
      }

      const depMatch = line.match(/^-\s*(?:\*\*)?Dependencies(?:\*\*)?:\s*(.*)$/i);
      if (depMatch) {
        const rawDeps = depMatch[1].trim();
        if (rawDeps && rawDeps.toLowerCase() !== 'none') {
          const parts = rawDeps.split(/[,;]/).map((d) => d.trim().replace(/[*`'"]/g, '')).filter(Boolean);
          dependencies.push(...parts);
        }
      }
    }

    if (!ownerModule) {
      parserErrors.push(`Blueprint Parser Error: File "${sec.path}" missing "- Owner Module:" metadata.`);
    }

    rawSections.set(sec.path, secLines.join('\n'));
    files.push({
      path: sec.path,
      ownerModule,
      dependencies,
    });
  }

  return { files, rawSections, parserErrors };
}

export function validateBlueprintAgainstArchitecture(
  architecture: CanonicalArchitecture,
  blueprint: ParsedBlueprint
): { valid: boolean; errors: string[] } {
  const errors: string[] = [...blueprint.parserErrors];

  const archFileMap = new Map<string, string | null>();
  const archFilesSet = new Set<string>();
  for (const f of architecture.files) {
    const norm = normalizeProjectPath(f.path);
    archFileMap.set(norm.toLowerCase(), f.ownerModule);
    archFilesSet.add(norm.toLowerCase());
  }

  const blueprintFileMap = new Map<string, ParsedBlueprintFile>();
  const seenBlueprint = new Set<string>();

  for (const bf of blueprint.files) {
    const lowerPath = bf.path.toLowerCase();
    if (seenBlueprint.has(lowerPath)) {
      errors.push(`Blueprint Contract Error: DUPLICATE_BLUEPRINT_FILE "${bf.path}".`);
    }
    seenBlueprint.add(lowerPath);
    blueprintFileMap.set(lowerPath, bf);

    if (!archFilesSet.has(lowerPath)) {
      errors.push(`Blueprint Contract Error: UNAUTHORIZED_BLUEPRINT_FILE "${bf.path}" is absent from architecture project files.`);
    } else {
      const expectedOwner = archFileMap.get(lowerPath);
      if (requiresModuleOwnership(bf.path)) {
        if (!bf.ownerModule) {
          errors.push(`Blueprint Contract Error: Missing owner module for implementation file "${bf.path}".`);
        } else if (expectedOwner && bf.ownerModule.toLowerCase() !== expectedOwner.toLowerCase()) {
          errors.push(
            `Blueprint Contract Error: Owner module mismatch for file "${bf.path}". Expected "${expectedOwner}", got "${bf.ownerModule}".`
          );
        }
      }
    }

    // Validate dependencies
    for (const dep of bf.dependencies) {
      const normDep = normalizeProjectPath(dep).toLowerCase();
      if ((dep.includes('/') || /\.[a-z0-9]+$/i.test(dep)) && !archFilesSet.has(normDep)) {
        errors.push(`Blueprint Contract Error: File "${bf.path}" references unknown file dependency "${dep}".`);
      }
    }
  }

  // Check that all required architecture files (where requiresModuleOwnership is true) are in blueprint
  for (const f of architecture.files) {
    const norm = normalizeProjectPath(f.path);
    if (requiresModuleOwnership(norm) && !seenBlueprint.has(norm.toLowerCase())) {
      errors.push(`Blueprint Contract Error: MISSING_FROM_BLUEPRINT mandatory file "${norm}".`);
    }
  }

  // Check entry points
  if (architecture.entryPoints.frontend) {
    const normFE = normalizeProjectPath(architecture.entryPoints.frontend).toLowerCase();
    if (!seenBlueprint.has(normFE)) {
      errors.push(`Blueprint Contract Error: Frontend entry point "${architecture.entryPoints.frontend}" is missing from blueprint.`);
    }
  }
  if (architecture.entryPoints.backend) {
    const normBE = normalizeProjectPath(architecture.entryPoints.backend).toLowerCase();
    if (!seenBlueprint.has(normBE)) {
      errors.push(`Blueprint Contract Error: Backend entry point "${architecture.entryPoints.backend}" is missing from blueprint.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export interface AuthorizedFileSet {
  architectureImplementationFiles: string[];
  architectureAllFiles: string[];
  blueprintFiles: string[];
  authorizedFiles: string[];
  ownerByFile: Record<string, string>;
  entryPoints: { frontend: string | null; backend: string | null };
  architectureFileSetHash: string;
  blueprintFileSetHash: string;
  authorizedFileSetHash: string;
}

export function computeAuthorizedFileSet(
  architectureContent: string,
  blueprintContent: string
): { authorizedFileSet: AuthorizedFileSet | null; errors: string[] } {
  const { architecture, errors: archErrors } = parseCanonicalArchitecture(architectureContent);
  if (!architecture || archErrors.length > 0) {
    return { authorizedFileSet: null, errors: archErrors };
  }

  const blueprint = parseBlueprintContract(blueprintContent);
  const validation = validateBlueprintAgainstArchitecture(architecture, blueprint);
  if (!validation.valid) {
    return { authorizedFileSet: null, errors: validation.errors };
  }

  const architectureAllFiles = architecture.files.map((f) => normalizeProjectPath(f.path));
  const architectureImplementationFiles = architecture.files
    .filter((f) => requiresModuleOwnership(f.path))
    .map((f) => normalizeProjectPath(f.path));
  const blueprintFiles = blueprint.files.map((f) => normalizeProjectPath(f.path));
  const authorizedFiles = [...blueprintFiles].sort();

  const ownerByFile: Record<string, string> = {};
  for (const bf of blueprint.files) {
    const norm = normalizeProjectPath(bf.path);
    ownerByFile[norm] = bf.ownerModule;
  }

  const architectureFileSetHash = computeFileSetHash(architectureAllFiles);
  const blueprintFileSetHash = computeFileSetHash(blueprintFiles);
  const authorizedFileSetHash = computeFileSetHash(authorizedFiles);

  return {
    authorizedFileSet: {
      architectureImplementationFiles,
      architectureAllFiles,
      blueprintFiles,
      authorizedFiles,
      ownerByFile,
      entryPoints: architecture.entryPoints,
      architectureFileSetHash,
      blueprintFileSetHash,
      authorizedFileSetHash,
    },
    errors: [],
  };
}

export function validateWorkspaceManifest(params: {
  manifest: WorkspaceManifest;
  workspaceFiles: Map<string, string> | Record<string, string>;
  authorized: AuthorizedFileSet;
  expectedStageExecutionId?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const { manifest, workspaceFiles, authorized, expectedStageExecutionId } = params;

  if (!manifest) {
    return { valid: false, errors: ['Manifest validation failed: Manifest object is missing.'] };
  }

  const getFileContent = (p: string): string | undefined => {
    if (workspaceFiles instanceof Map) {
      return workspaceFiles.get(p);
    }
    return workspaceFiles[p];
  };

  // 1. Control plane check
  for (const mf of manifest.files || []) {
    const norm = normalizeProjectPath(mf.path);
    if (isControlPlaneArtifact(norm)) {
      errors.push(`Workspace Manifest Error: Control plane artifact "${norm}" found in workspace manifest files.`);
    }
  }

  // 2. Set equality with authorized files
  const manifestFilePaths = (manifest.files || []).map((f) => normalizeProjectPath(f.path)).sort();
  const authorizedSorted = [...authorized.authorizedFiles].sort();

  const manifestSet = new Set(manifestFilePaths);
  const authorizedSet = new Set(authorizedSorted);

  for (const f of authorizedSorted) {
    if (!manifestSet.has(f)) {
      errors.push(`Workspace Manifest Error: Authorized project file "${f}" is missing from workspace manifest.`);
    }
  }
  for (const f of manifestFilePaths) {
    if (!authorizedSet.has(f)) {
      errors.push(`Workspace Manifest Error: Manifest contains unauthorized file "${f}".`);
    }
  }

  // 3. Content hash matching
  for (const mf of manifest.files || []) {
    const norm = normalizeProjectPath(mf.path);
    const content = getFileContent(norm) ?? getFileContent(mf.path);
    if (content === undefined) {
      errors.push(`Workspace Manifest Error: Manifest lists file "${norm}" which is missing from virtual workspace.`);
    } else {
      const computedHash = createHash('sha256').update(content).digest('hex');
      if (mf.hash !== computedHash) {
        errors.push(`Workspace Manifest Error: Content hash mismatch for file "${norm}". Expected "${computedHash}", got "${mf.hash}".`);
      }
    }
  }

  // 4. Directory list check
  const expectedDirs = new Set<string>();
  for (const f of manifestFilePaths) {
    const parts = f.split('/');
    if (parts.length > 1) {
      parts.pop();
      let currentDir = '';
      for (const p of parts) {
        currentDir = currentDir ? `${currentDir}/${p}` : p;
        expectedDirs.add(currentDir);
      }
    }
  }
  const manifestDirs = new Set((manifest.directories || []).map(normalizeProjectPath));
  for (const d of expectedDirs) {
    if (!manifestDirs.has(d)) {
      errors.push(`Workspace Manifest Error: Missing expected directory "${d}" in manifest directories.`);
    }
  }

  // 5. Entry points check
  const manifestEntryPoints = (manifest.entryPoints || []).map(normalizeProjectPath);
  if (authorized.entryPoints.frontend) {
    const normFE = normalizeProjectPath(authorized.entryPoints.frontend);
    if (!manifestEntryPoints.includes(normFE)) {
      errors.push(`Workspace Manifest Error: Frontend entry point "${normFE}" missing from manifest entryPoints.`);
    }
  }
  if (authorized.entryPoints.backend) {
    const normBE = normalizeProjectPath(authorized.entryPoints.backend);
    if (!manifestEntryPoints.includes(normBE)) {
      errors.push(`Workspace Manifest Error: Backend entry point "${normBE}" missing from manifest entryPoints.`);
    }
  }

  // 6. Source stage execution ID check
  if (expectedStageExecutionId && manifest.sourceStageExecutionId !== expectedStageExecutionId) {
    errors.push(
      `Workspace Manifest Error: Stale sourceStageExecutionId "${manifest.sourceStageExecutionId}". Expected "${expectedStageExecutionId}".`
    );
  }

  // 7. Fileset hashes matching
  const computedArchitectureHash = computeFileSetHash(authorized.architectureAllFiles);
  const computedBlueprintHash = computeFileSetHash(authorized.blueprintFiles);
  const computedAuthorizedHash = computeFileSetHash(authorized.authorizedFiles);
  const computedWorkspaceHash = computeFileSetHash(manifestFilePaths);

  if (manifest.architectureFileSetHash && manifest.architectureFileSetHash !== computedArchitectureHash) {
    errors.push(`Workspace Manifest Error: architectureFileSetHash mismatch.`);
  }
  if (manifest.blueprintFileSetHash && manifest.blueprintFileSetHash !== computedBlueprintHash) {
    errors.push(`Workspace Manifest Error: blueprintFileSetHash mismatch.`);
  }
  if (manifest.authorizedFileSetHash && manifest.authorizedFileSetHash !== computedAuthorizedHash) {
    errors.push(`Workspace Manifest Error: authorizedFileSetHash mismatch.`);
  }
  if (manifest.workspaceFileSetHash && manifest.workspaceFileSetHash !== computedWorkspaceHash) {
    errors.push(`Workspace Manifest Error: workspaceFileSetHash mismatch.`);
  }

  return { valid: errors.length === 0, errors };
}

export function extractEmbeddedWorkspaceHash(stageName: string, content: string): string | null {
  if (!content) return null;

  if (stageName === 'Reviewer') {
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed.workspaceHash === 'string') {
        return parsed.workspaceHash;
      }
    } catch {
      const jsonMatch = content.match(/"workspaceHash"\s*:\s*"([a-f0-9]{64})"/i);
      if (jsonMatch) return jsonMatch[1];
    }
  }

  const match = content.match(/###\s*Workspace Hash\s*[:\n]\s*([a-f0-9]{64})/i);
  if (match) return match[1];

  return null;
}
