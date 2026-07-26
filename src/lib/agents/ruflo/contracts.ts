export interface CapabilityDefinition {
  id: string;
  name: string;
  category: 'frontend' | 'backend' | 'database' | 'integration';
  description: string;
  allowedConstructs: string[];
  forbiddenConstructs: string[];
}

export interface ProjectContract {
  mvpId: string;
  projectName: string;
  goal: string;
  scope: {
    included: string[];
    excluded: string[];
  };
  constraints: string[];
  capabilities: CapabilityDefinition[];
}

export interface VersionRecord {
  timestamp: string;
  hash: string;
  diff: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  stage: string;
  durationMs: number;
  tokensConsumed: number;
  status: 'Success' | 'Failed' | 'Triage';
  errorDetails?: string;
}

export interface ProjectKnowledgeIndex {
  entities: string[];
  apis: string[];
  components: string[];
  symbolTable: Record<string, string>;
}
