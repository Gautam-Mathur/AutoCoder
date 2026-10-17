import { CONTRACT_VERSIONS } from '../versions';

export interface WorkspaceFile {
  path: string;
  hash: string;
  language?: string;
  role?: string;
}

export interface WorkspaceManifest {
  schemaVersion: string;
  projectRoot: string;
  files: WorkspaceFile[];
  directories: string[];
  entryPoints: string[];
  generatedAt: string;
  sourceStageExecutionId: string;
  architectureFileSetHash: string;
  blueprintFileSetHash: string;
  workspaceFileSetHash: string;
  authorizedFileSetHash: string;
}

export const CODER_SCHEMA = {
  contractName: CONTRACT_VERSIONS.Coder.name,
  version: CONTRACT_VERSIONS.Coder.version,
  format: CONTRACT_VERSIONS.Coder.format,
  requiredFields: [
    'schemaVersion',
    'projectRoot',
    'files',
    'directories',
    'entryPoints',
    'generatedAt',
    'sourceStageExecutionId',
    'architectureFileSetHash',
    'blueprintFileSetHash',
    'workspaceFileSetHash',
    'authorizedFileSetHash',
  ],
  mandatoryInvariants: [
    'Workspace manifest must accurately describe actual VFS files',
    'Manifest content hashes must match actual virtual file contents',
    'No placeholder comments or incomplete implementations allowed',
  ],
} as const;


