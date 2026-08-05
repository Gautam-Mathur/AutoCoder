import { prisma } from '../../db';
import crypto from 'crypto';

export interface MemoryState {
  originalPrompt?: string;
  // Specification Phase
  taskSpec: any | null;       // Queen
  planner: any | null;        // Planner
  architect: any | null;      // Architect

  // Implementation Phase
  system: any | null;         // System
  designer: any | null;       // Designer
  blueprinter: any | null;    // Blueprinter
  coder: Record<string, any>; // Coder: filepath -> code content

  // Verification Phase
  debugger: any | null;       // Debugger
  security: any | null;       // Security
  reviewer: any | null;       // Reviewer
  tester: any | null;         // Tester

  // Metadata / State Tracking
  invalidated: string[];      // Invalidated agent stages needing re-run
  hashes: Record<string, string>; // Filepath -> MD5 hash mapping
  fileStateHistory: Record<string, string[]>; // Filepath -> MD5 hashes history list
  decisions: any[];           // Historical LLM decisions log
  qualityGateOverride?: boolean; // Override flag for quality gate
}

export const OWNERSHIP = Object.freeze({
  Queen:             ['taskSpec'],
  Planner:           ['planner'],
  Architect:         ['architect'],
  SystemsArchitect:  ['architect'],
  System:            ['system'],
  BackendArchitect:  ['system'],
  Designer:          ['designer'],
  UIUXArchitect:     ['designer'],
  Blueprinter:       ['blueprinter'],
  Coder:             ['coder'],
  Debugger:          ['debugger'],
  Security:          ['security'],
  SecurityAuditor:   ['security'],
  Reviewer:          ['reviewer'],
  VerificationAgent: ['reviewer'],
  Tester:            ['tester'],
});

export async function loadExecutiveMemory(conversationId: string): Promise<MemoryState> {
  const record = await prisma.executiveMemory.findUnique({
    where: { conversationId },
  });

  if (record) {
    const parsed = JSON.parse(record.state);
    return {
      ...parsed,
      fileStateHistory: parsed.fileStateHistory || {},
    };
  }

  // Initial skeleton
  return {
    originalPrompt: '',
    taskSpec: null,
    planner: null,
    architect: null,
    system: null,
    designer: null,
    blueprinter: null,
    coder: {},
    debugger: null,
    security: null,
    reviewer: null,
    tester: null,
    invalidated: [],
    hashes: {},
    fileStateHistory: {},
    decisions: [],
  };
}

export async function saveExecutiveMemory(conversationId: string, state: MemoryState) {
  await prisma.executiveMemory.upsert({
    where: { conversationId },
    update: { state: JSON.stringify(state) },
    create: { conversationId, state: JSON.stringify(state) },
  });
}

function getNestedValue(obj: any, path: string): any {
  if (!obj || typeof obj !== 'object') return undefined;
  const parts = path.split('.');
  let curr = obj;
  for (const part of parts) {
    if (curr && typeof curr === 'object' && part in curr) {
      curr = curr[part];
    } else {
      return undefined;
    }
  }
  return curr;
}

function setNestedValue(obj: any, path: string, value: any): void {
  const parts = path.split('.');
  let curr = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!curr[part] || typeof curr[part] !== 'object') {
      curr[part] = {};
    }
    curr = curr[part];
  }
  curr[parts[parts.length - 1]] = value;
}

export class StageLedger {
  private conversationId: string;
  private state: MemoryState;

  constructor(conversationId: string, initialState: MemoryState) {
    this.conversationId = conversationId;
    this.state = initialState;
    if (!this.state.fileStateHistory) {
      this.state.fileStateHistory = {};
    }
  }

  getState(): MemoryState {
    return this.state;
  }

  read(field: keyof MemoryState): any {
    return this.state[field];
  }

  query(agentName: string, queryParams: { fromAgent: string; select: string[] }): any {
    const { fromAgent, select } = queryParams;

    // Find the field owned by fromAgent in the OWNERSHIP mapping
    const ownedField = (OWNERSHIP as any)[fromAgent]?.[0];
    if (!ownedField) {
      return null;
    }

    const data = (this.state as any)[ownedField];
    if (!data) return null;

    // Isolate context to only selected keys
    const result: Record<string, any> = {};
    for (const key of select) {
      if (key in data) {
        result[key] = data[key];
      } else if (key.includes('.')) {
        const val = getNestedValue(data, key);
        if (val !== undefined) {
          setNestedValue(result, key, val);
        }
      }
    }
    return result;
  }

  async write(agentName: string, field: string, value: any): Promise<void> {
    // 1. Verify Strict Ownership
    const allowed = (OWNERSHIP as any)[agentName];
    if (!allowed || !allowed.includes(field)) {
      throw new Error(
        `DriftEvent: Agent "${agentName}" is not allowed to directly mutate field "${field}". Allowed: ${JSON.stringify(allowed)}`
      );
    }

    // 2. Perform modification
    (this.state as any)[field] = value;

    // 3. Oscillation check (prevent loops on coder / debugger file outputs)
    if (field === 'coder' && value && typeof value === 'object') {
      if (!this.state.fileStateHistory) {
        this.state.fileStateHistory = {};
      }
      for (const filepath of Object.keys(value)) {
        const content = value[filepath];
        const hash = crypto.createHash('md5').update(content).digest('hex');

        // If the file content is exactly the same as the last written state, skip history check
        if (this.state.hashes[filepath] === hash) {
          continue;
        }

        if (!this.state.fileStateHistory[filepath]) {
          this.state.fileStateHistory[filepath] = [];
        }

        const history = this.state.fileStateHistory[filepath];
        if (history.includes(hash)) {
          throw new Error(
            `Oscillation detected: File "${filepath}" has returned to an identical state. Aborting compilation to prevent infinite loops.`
          );
        }

        history.push(hash);
        this.state.hashes[filepath] = hash;
      }
    }

    // 4. Persist
    await saveExecutiveMemory(this.conversationId, this.state);
  }

  async invalidate(agentNames: string[]): Promise<void> {
    this.state.invalidated = Array.from(new Set([...this.state.invalidated, ...agentNames]));
    await saveExecutiveMemory(this.conversationId, this.state);
  }

  async clearInvalidation(agentName: string): Promise<void> {
    this.state.invalidated = this.state.invalidated.filter((name) => name !== agentName);
    await saveExecutiveMemory(this.conversationId, this.state);
  }

  async logDecision(decision: any): Promise<void> {
    this.state.decisions.push({
      ...decision,
      timestamp: new Date().toISOString(),
    });
    await saveExecutiveMemory(this.conversationId, this.state);
  }
}
