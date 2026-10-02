export interface CapabilityDefinition {
  id: string;
  name: string;
  category: 'frontend' | 'backend' | 'database' | 'integration';
  description: string;
  allowedConstructs: string[];
  forbiddenConstructs: string[];
}

export interface ContractEvidence {
  source: string;
  field: string;
  value: string;
  excerpt?: string;
}

export interface ImplementationBoundary {
  id: string;
  kind: 'frontend' | 'backend' | 'database' | 'shared' | 'config';
  ownedFiles: string[];
  entryPoint?: string;
  runtime?: string;
}

export interface ApiEndpointContract {
  method: string;
  path: string;
  authRequired: boolean;
  requestBody?: string;
  response?: string;
  source?: string;
}

export interface ModelContract {
  name: string;
  fields: Record<string, string>;
}

export interface ProjectContract {
  contractHash?: string;
  mvpId?: string;
  projectName?: string;
  goal?: string;
  scope?: {
    included: string[];
    excluded: string[];
  };
  constraints?: string[];
  capabilities?: CapabilityDefinition[];
  framework: 'NEXT_APP_ROUTER' | 'NEXT_PAGES_ROUTER' | 'VITE_SPA' | 'REACT_WEBPACK_SPA' | 'STATIC_HTML';
  language: 'typescript' | 'javascript';
  orm: 'prisma' | 'none';
  database: 'sqlite' | 'postgresql' | 'none';
  authentication: {
    required: boolean;
    mechanism?: string;
    evidence?: ContractEvidence[];
  };
  routing: {
    style: 'app' | 'pages' | 'static';
  };
  entryPoints: string[];
  apiEndpoints: ApiEndpointContract[];
  models: ModelContract[];
  dependencies: string[];
  implementationBoundaries?: ImplementationBoundary[];
}

export interface ContractValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface VerificationError {
  code: string;
  source:
    | 'SPEC'
    | 'BLUEPRINT'
    | 'PROJECT'
    | 'PACKAGE'
    | 'PRISMA'
    | 'API'
    | 'FRAMEWORK'
    | 'RUNTIME'
    | 'SECURITY';
  severity: 'ERROR' | 'WARNING';
  message: string;
  file?: string;
  line?: number;
  dependency?: string;
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
