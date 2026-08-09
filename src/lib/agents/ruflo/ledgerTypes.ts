export type NodeType =
  | 'TASK_SPEC'
  | 'FEATURE'
  | 'MODULE'
  | 'API_ENDPOINT'
  | 'UI_COMPONENT'
  | 'TEST_SPEC'
  | 'UNSTRUCTURED_BLOB';

export type EdgeType =
  | 'IMPLEMENTS'
  | 'DEPENDS_ON'
  | 'EXPOSES'
  | 'CALLS'
  | 'TESTS'
  | 'BELONGS_TO';

export interface ActiveIds {
  TASK_SPEC: string[];
  FEATURE: string[];
  MODULE: string[];
  API_ENDPOINT: string[];
  UI_COMPONENT: string[];
}

export interface IngestionResult {
  status: 'SUCCESS' | 'FUZZY_REPAIRED' | 'FAILED';
  rawOutput: string;
  errorMessage?: string;
  repairedPayload?: any;
  createdNodesCount: number;
  createdEdgesCount: number;
  correlationCode?: string;
}

export function safeParseArray<T>(val: string | null | undefined): T[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function safeParseJson<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

export function sanitizePath(filepath: string): string {
  return filepath.replace(/\\/g, '/').replace(/^[/\\]+/, '').toLowerCase();
}
