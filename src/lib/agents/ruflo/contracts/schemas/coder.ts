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
}

export const CODER_SCHEMA = {
  contractName: 'CoderOutput',
  version: '1.0.0',
  requiredFields: ['schemaVersion', 'projectRoot', 'files', 'directories', 'entryPoints', 'generatedAt', 'sourceStageExecutionId'],
  mandatoryInvariants: [
    'Workspace manifest must accurately describe actual VFS files',
    'Manifest content hashes must match actual virtual file contents',
    'No placeholder comments or incomplete implementations allowed',
  ],
} as const;

