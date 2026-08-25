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
  System:            ['system'],
  Designer:          ['designer'],
  Blueprinter:       ['blueprinter'],
  Coder:             ['coder'],
  Debugger:          ['debugger'],
  Security:          ['security'],
  Reviewer:          ['reviewer'],
  Tester:            ['tester'],
});

export async function loadExecutiveMemory(conversationId: string): Promise<MemoryState> {
  const rows = await prisma.executiveMemory.findMany({
    where: { conversationId },
    orderBy: { sequence: 'asc' },
  });

  const latestActive = (agentName: string): string | null => {
    const matches = rows.filter(r => r.agentName === agentName && r.status === 'ACTIVE');
    if (!matches.length) return null;
    return matches[matches.length - 1].contentMd;
  };

  const coderMap: Record<string, any> = {};
  const coderRows = rows.filter(r => r.agentName === 'Coder' && r.status === 'ACTIVE' && r.filePath);
  for (const row of coderRows) {
    coderMap[row.filePath!] = { content: row.contentMd };
  }

  const hashes: Record<string, string> = {};
  const fileStateHistory: Record<string, string[]> = {};
  const allCoderRows = rows.filter(r => r.agentName === 'Coder' && r.filePath && r.contentHash);
  for (const row of allCoderRows) {
    const fp = row.filePath!;
    if (!fileStateHistory[fp]) fileStateHistory[fp] = [];
    fileStateHistory[fp].push(row.contentHash!);
    if (row.status === 'ACTIVE') {
      hashes[fp] = row.contentHash!;
    }
  }

  const invalidatedSet = new Set(
    rows.filter(r => r.status === 'INVALIDATED').map(r => r.agentName)
  );

  const wrap = (md: string | null): any | null =>
    md ? { content: md } : null;

  return {
    originalPrompt: '',
    taskSpec:    wrap(latestActive('Queen')),
    planner:     wrap(latestActive('Planner')),
    architect:   wrap(latestActive('Architect')),
    system:      wrap(latestActive('System')),
    designer:    wrap(latestActive('Designer')),
    blueprinter: wrap(latestActive('Blueprinter')),
    coder:       coderMap,
    debugger:    wrap(latestActive('Debugger')),
    security:    wrap(latestActive('Security')),
    reviewer:    wrap(latestActive('Reviewer')),
    tester:      wrap(latestActive('Tester')),
    invalidated: Array.from(invalidatedSet),
    hashes,
    fileStateHistory,
    decisions:   [],
  };
}

export async function saveExecutiveMemory(conversationId: string, state: MemoryState): Promise<void> {
  // Legacy compatibility no-op. Actual writes are managed by writeExecutiveMemoryRecord().
}

export async function writeExecutiveMemoryRecord(params: {
  conversationId: string;
  agentName: string;
  contentMd: string;
  filePath?: string;
  tokenCount?: number;
  durationMs?: number;
  consumedInferenceIds?: string[];
}): Promise<string> {
  const contentHash = crypto.createHash('md5').update(params.contentMd).digest('hex');

  if (params.agentName === 'Coder' && params.filePath) {
    await prisma.executiveMemory.updateMany({
      where: {
        conversationId: params.conversationId,
        agentName: 'Coder',
        filePath: params.filePath,
        status: 'ACTIVE',
      },
      data: { status: 'SUPERSEDED' },
    });
  } else {
    await prisma.executiveMemory.updateMany({
      where: {
        conversationId: params.conversationId,
        agentName: params.agentName,
        status: 'ACTIVE',
      },
      data: { status: 'SUPERSEDED' },
    });
  }

  const lastRow = await prisma.executiveMemory.findFirst({
    where: { conversationId: params.conversationId, agentName: params.agentName },
    orderBy: { sequence: 'desc' },
    select: { sequence: true },
  });
  const nextSeq = (lastRow?.sequence ?? 0) + 1;

  const raw = `${params.conversationId}:${params.agentName}:${nextSeq}`;
  const shortHash = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 6);
  const inferenceId = `${params.agentName}-${nextSeq}-${shortHash}`;

  await prisma.executiveMemory.create({
    data: {
      conversationId: params.conversationId,
      agentName:      params.agentName,
      inferenceId,
      sequence:       nextSeq,
      contentMd:      params.contentMd,
      filePath:       params.filePath ?? null,
      tokenCount:     params.tokenCount ?? 0,
      durationMs:     params.durationMs ?? 0,
      consumedIds:    JSON.stringify(params.consumedInferenceIds ?? []),
      status:         'ACTIVE',
      contentHash,
    },
  });

  return inferenceId;
}

export async function updateExecutiveMemoryStatus(
  conversationId: string,
  agentName: string,
  status: 'INVALIDATED' | 'ACTIVE'
): Promise<void> {
  await prisma.executiveMemory.updateMany({
    where: { conversationId, agentName, status: 'ACTIVE' },
    data: { status },
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

// In-memory node cache for active conversation runs (Flaw 9 & 23)
const conversationNodeCache = new Map<string, Map<string, any>>();

export class ExecutiveMemoryGateway {
  static peekProjectInfo(conversationId: string, memoryState: MemoryState) {
    const safeParse = (val: any, fallback: any) => {
      if (!val) return fallback;
      if (typeof val === 'object') return val;
      try {
        return JSON.parse(val);
      } catch {
        return fallback;
      }
    };

    const taskSpec = memoryState.taskSpec || {};
    const planner = memoryState.planner || {};
    const architect = memoryState.architect || {};
    const system = memoryState.system || {};
    const designer = memoryState.designer || {};
    const tester = memoryState.tester || {};

    return {
      projectName: taskSpec.projectName || taskSpec.project?.name || 'Project',
      problemStatement: taskSpec.problemStatement || '',
      techStack: {
        frontend: planner.recommendedTechStack?.frontend || planner.frontendFramework || 'HTML5/JS',
        backend: planner.recommendedTechStack?.backend || planner.backendFramework || 'Node.js',
        database: planner.recommendedTechStack?.database || planner.databaseType || 'SQLite',
      },
      featuresCount: Array.isArray(planner.features) ? planner.features.length : 0,
      modulesCount: Array.isArray(architect.modules) ? architect.modules.length : 0,
      apisCount: Array.isArray(system.apis) ? system.apis.length : 0,
      componentsCount: Array.isArray(designer.components) ? designer.components.length : 0,
      testerStatus: tester.overallStatus || 'PENDING',
    };
  }

  static async getSubgraph(conversationId: string, rootNodeId: string) {
    const compositeRootId = `${conversationId}:${rootNodeId}`;

    // Cycle-safe SQLite CTE query (Flaw 4 & 22)
    const rawNodes: any[] = await prisma.$queryRaw`
      WITH RECURSIVE graph_cte(id, conversationId, type, title, summary, payload, path) AS (
        SELECT id, conversationId, type, title, summary, payload, id AS path
        FROM GraphNode
        WHERE id = ${compositeRootId} AND conversationId = ${conversationId}
        
        UNION ALL
        
        SELECT n.id, n.conversationId, n.type, n.title, n.summary, n.payload, c.path || '->' || n.id
        FROM GraphNode n
        JOIN GraphEdge e ON e.targetNodeId = n.id AND e.conversationId = n.conversationId
        JOIN graph_cte c ON c.id = e.sourceNodeId
        WHERE instr(c.path, n.id) = 0
      )
      SELECT DISTINCT id, conversationId, type, title, summary, payload FROM graph_cte;
    `;

    return rawNodes.map((n) => ({
      ...n,
      payload: safeParseJson(n.payload, {}),
    }));
  }

  static async handleUpstreamModification(conversationId: string, modifiedStage: string) {
    const normalized = modifiedStage.toLowerCase();
    const downstreamStages: string[] = [];

    if (normalized === 'queen') {
      downstreamStages.push('planner', 'architect', 'system', 'designer', 'tester');
    } else if (normalized === 'planner') {
      downstreamStages.push('architect', 'system', 'designer', 'tester');
    } else if (normalized === 'architect') {
      downstreamStages.push('system', 'designer', 'tester');
    } else if (normalized === 'system') {
      downstreamStages.push('designer', 'tester');
    } else if (normalized === 'designer') {
      downstreamStages.push('tester');
    }

    // Flush in-memory node cache
    conversationNodeCache.delete(conversationId);
  }
}

function safeParseJson<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
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
        const rawVal = value[filepath];
        const contentStr = typeof rawVal === 'string' ? rawVal : (rawVal?.content ?? '');
        const hash = crypto.createHash('md5').update(contentStr).digest('hex');

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

    // 4. Persist agent output to ExecutiveMemory ledger
    const contentMd = typeof value === 'string'
      ? value
      : (value?.content ?? JSON.stringify(value));
    await writeExecutiveMemoryRecord({
      conversationId: this.conversationId,
      agentName,
      contentMd,
    });
  }

  async invalidate(agentNames: string[]): Promise<void> {
    this.state.invalidated = Array.from(new Set([...this.state.invalidated, ...agentNames]));
    for (const name of agentNames) {
      await updateExecutiveMemoryStatus(this.conversationId, name, 'INVALIDATED');
    }
  }

  async clearInvalidation(agentName: string): Promise<void> {
    this.state.invalidated = this.state.invalidated.filter((name) => name !== agentName);
    await updateExecutiveMemoryStatus(this.conversationId, agentName, 'ACTIVE');
  }

  async logDecision(decision: any): Promise<void> {
    console.log('[EM:Decision]', JSON.stringify({ ...decision, conversationId: this.conversationId }));
  }
}
