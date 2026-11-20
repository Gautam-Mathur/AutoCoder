import { describe, it } from 'node:test';
import assert from 'node:assert';
import { analyzeSourceExports, extractDependencyInterfaceAST } from '../source-analysis';
import { validateImportExportIntegrity } from '../import-export-validator';
import { validateStageCandidate } from '../stage-acceptance';

describe('AutoCoder Scope & Import/Export Implementation Suite', () => {
  describe('Workstream A: Queen Operational-Scope & Validation', () => {
    it('accepts Queen output with full operational scope and FR IDs', async () => {
      const validQueenOperational = `### Project Name
Task Workflow Engine

### Project Goal
A workflow engine allowing operators to run deterministic automated tasks.

### Product Overview
Provides task scheduling, monitoring, and state inspection for operators.

### Actors and Roles
- Operator: creates and views tasks
- System: executes tasks and updates state

### Operational Scope
- Task creation with execution metadata
- State inspection across lifecycle (Pending, Running, Succeeded, Failed)
- Log streaming for active executions

### Core Workflows
1. Trigger: Operator submits task payload
2. Steps: System validates input, assigns Task ID, marks status Pending
3. Outcome: Execution begins, logs emitted
4. Failure Path: Invalid payload returns structured 400 error

### Data and State Requirements
Task state machine: Pending -> Running -> Succeeded / Failed. Retain logs for completed executions.

### Business Rules
- Tasks must have a valid payload.
- State transitions must be monotonic.

### Functional Requirements
- FR-001: System must allow operators to create tasks with JSON payloads.
- FR-002: System must record state transitions with timestamps.

### Non-Functional Requirements
- Response latency under 200ms for state queries.

### Technical Constraints
Must use TypeScript and Node.js.

### Assumptions and Open Decisions
- Assumption: Tasks are executed asynchronously.

### Out of Scope
- Multi-region replication and distributed clustering.

### Risks
- High concurrency lock contention.`;

      const res = await validateStageCandidate({
        candidate: {
          stage: 'Queen',
          content: validQueenOperational,
          outputFormat: 'markdown',
        },
      } as any);

      assert.strictEqual(res.accepted, true, `Validation failed: ${res.errors.join('; ')}`);
    });

    it('rejects Queen output when scope is completely missing', async () => {
      const invalidQueen = `### Project Name
No Scope App

### Project Goal
Missing scope.

### Technical Constraints
None.

### Risks
None.`;

      const res = await validateStageCandidate({
        candidate: {
          stage: 'Queen',
          content: invalidQueen,
          outputFormat: 'markdown',
        },
      } as any);

      assert.strictEqual(res.accepted, false);
      assert.ok(res.errors.some((e) => e.includes('Missing required scope section')));
    });

    it('warns when Functional Requirements are missing stable IDs', async () => {
      const queenNoFrIds = `### Project Name
App Without FR IDs

### Project Goal
Tests warning.

### Operational Scope
- Core features

### Functional Requirements
- System allows users to login and logout without ID.

### Technical Constraints
None.

### Risks
None.`;

      const res = await validateStageCandidate({
        candidate: {
          stage: 'Queen',
          content: queenNoFrIds,
          outputFormat: 'markdown',
        },
      } as any);

      assert.strictEqual(res.accepted, true);
      assert.ok(res.warnings.some((w) => w.includes('FR-001')));
    });
  });

  describe('Workstream C: AST Export Extraction Coverage', () => {
    it('accurately parses async default functions, named exports, classes, interfaces, and re-exports', () => {
      const source = `
export default async function fetchData(url: string, options?: RequestInit): Promise<any> {
  return {};
}

export function computeSum<T extends number>(a: T, b: T): T {
  return (a + b) as T;
}

export const API_URL = "https://api.example.com", MAX_RETRIES: number = 3;

export class DataService<T> {
  constructor(public endpoint: string) {}
}

export interface UserProfile {
  id: string;
  name?: string;
}

export type StringOrNumber = string | number;

export enum Status {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

const internalHelper = 123;
export { internalHelper as publicHelper };

export { thirdParty } from './thirdParty';
export * from './barrel';
export type { SecretConfig } from './secret';
`;

      const analysis = analyzeSourceExports('src/services/api.ts', source);
      assert.strictEqual(analysis.analysisStatus, 'ok');

      const exportNames = analysis.exports.map((e) => e.exportedName);
      assert.ok(exportNames.includes('default'));
      assert.ok(exportNames.includes('computeSum'));
      assert.ok(exportNames.includes('API_URL'));
      assert.ok(exportNames.includes('MAX_RETRIES'));
      assert.ok(exportNames.includes('DataService'));
      assert.ok(exportNames.includes('UserProfile'));
      assert.ok(exportNames.includes('StringOrNumber'));
      assert.ok(exportNames.includes('Status'));
      assert.ok(exportNames.includes('publicHelper'));
      assert.ok(exportNames.includes('thirdParty'));
      assert.ok(exportNames.includes('*'));
      assert.ok(exportNames.includes('SecretConfig'));

      // Verify default async function signature extraction
      const defaultExport = analysis.exports.find((e) => e.exportedName === 'default');
      assert.ok(defaultExport?.signature?.includes('async function fetchData'));

      // Verify interface is flagged as isTypeOnly
      const interfaceExport = analysis.exports.find((e) => e.exportedName === 'UserProfile');
      assert.strictEqual(interfaceExport?.isTypeOnly, true);
      assert.strictEqual(interfaceExport?.kind, 'interface');

      // Verify extractDependencyInterfaceAST formatting
      const summary = extractDependencyInterfaceAST('src/services/api.ts', source);
      assert.ok(summary.includes('[JS/TS AST] Exports:'));
      assert.ok(summary.includes('async function fetchData'));
      assert.ok(summary.includes('computeSum'));
    });
  });

  describe('Workstream E: Deterministic Import/Export Validator', () => {
    it('detects missing local files, missing named exports, and missing default exports', () => {
      const fileMap = new Map<string, string>([
        [
          'src/utils/math.ts',
          `export function add(a: number, b: number): number { return a + b; }`,
        ],
        [
          'src/services/calc.ts',
          `
import MathModule from '../utils/math'; // Error: math has no default export
import { add, subtract } from '../utils/math'; // Error: subtract does not exist
import { missing } from '../utils/nonexistent'; // Error: nonexistent file
export function calculate() { return add(1, 2); }
`,
        ],
      ]);

      const result = validateImportExportIntegrity(fileMap);
      assert.strictEqual(result.valid, false);

      const codes = result.errors.map((e) => e.code);
      assert.ok(codes.includes('DEFAULT_EXPORT_NOT_FOUND'));
      assert.ok(codes.includes('EXPORT_NOT_FOUND'));
      assert.ok(codes.includes('MODULE_NOT_FOUND'));

      const missingNamed = result.errors.find((e) => e.code === 'EXPORT_NOT_FOUND');
      assert.strictEqual(missingNamed?.importedName, 'subtract');
    });

    it('passes cleanly when relative imports and named/default exports match exactly', () => {
      const fileMap = new Map<string, string>([
        [
          'src/lib/auth.ts',
          `
export default class AuthService {
  login() { return true; }
}
export const AUTH_VERSION = '1.0.0';
`,
        ],
        [
          'src/app/page.tsx',
          `
import AuthService, { AUTH_VERSION } from '../lib/auth';
export default function Page() {
  const auth = new AuthService();
  return auth.login();
}
`,
        ],
      ]);

      const result = validateImportExportIntegrity(fileMap);
      assert.strictEqual(result.valid, true, `Expected valid imports, got errors: ${result.errors.map(e => e.message).join('; ')}`);
    });

    it('warns on undeclared blueprint dependencies when declared graph is supplied', () => {
      const fileMap = new Map<string, string>([
        ['src/app.ts', `export const app = true;`],
      ]);

      const declaredDependencies = new Map<string, string[]>([
        ['src/app.ts', ['src/missing-dep.ts']],
      ]);

      const result = validateImportExportIntegrity(fileMap, { declaredDependencies });
      assert.strictEqual(result.warnings.length, 1);
      assert.strictEqual(result.warnings[0].code, 'UNDECLARED_BLUEPRINT_DEPENDENCY');
    });
  });
});
