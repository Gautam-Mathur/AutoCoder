# Executive Memory Reform — Schema Upgrade + Three Function Rewrites

## What This Does

The `ExecutiveMemory` table currently holds one opaque JSON blob per conversation that is never read or written properly. We upgrade it in-place to a **per-agent, per-write ledger** — giving every agent output its own row with a deterministic globally unique `inferenceId`, human-readable provenance chain, content hash, status, file path, and sequence tracking. Then we rewire the three broken functions (`loadExecutiveMemory`, `saveExecutiveMemory`, `buildStageContext`) and synchronize in-flight memory in `orchestrator.ts`.

Zero new tables. Zero dropped tables. Zero consumer routes or UI code broken.

---

## Inference ID Design

Every agent call gets a **globally unique, human-readable inference ID** in the format `{AgentName}-{sequence}-{shortHash}`:

```
Conversation ID : conv_abc123
  inferenceId   : Queen-1-a3f8c2       (first Queen call)
  inferenceId   : Planner-1-9d4e71     (first Planner call)
  inferenceId   : Architect-1-1bc8a3   (first Architect call)
  inferenceId   : Blueprinter-1-e4f91a (first Blueprinter call)
  inferenceId   : Coder-1-f70d9e       (Coder writing routes.ts)
  inferenceId   : Coder-2-88b3fa       (Coder writing models.ts)
  inferenceId   : Tester-1-55c3a1      (Tester running diagnostics)
  inferenceId   : Debugger-1-44c120    (Debugger repair attempt)
  inferenceId   : Coder-3-99d21c       (Coder re-synthesizing routes.ts after debug)

Conversation ID : conv_xyz789
  inferenceId   : Queen-1-4af712       (same readable prefix, DIFFERENT hash — globally unique)
  inferenceId   : Planner-1-2c9be3
  ...
```

### Three-Part Structure

| Part | Example | Purpose |
|---|---|---|
| `AgentName` | `Architect` | Human readable — identifies the agent at a glance |
| `sequence` | `2` | Execution order & retry/attempt counter for this agent |
| `shortHash` | `1bc8a3` | 6-char hex suffix derived from `SHA-256(conversationId + agentName + sequence)` |

### Uniqueness Guarantees
- The hash encodes the full `conversationId`, guaranteeing global uniqueness even across multiple conversations.
- Within a single conversation, uniqueness is enforced by `@@unique([conversationId, inferenceId])`.
- **Deterministic**: Given `(conversationId, agentName, sequence)`, the `inferenceId` can be reproduced without querying the database.

### Transparent Provenance Chain
Each row's `consumedIds` field stores a JSON array of the upstream `inferenceId` strings it actually read:
```json
"consumedIds": ["Queen-1-a3f8c2", "Planner-1-9d4e71", "Architect-1-1bc8a3"]
```

---

## User Review Required

> [!IMPORTANT]
> The schema change upgrades `ExecutiveMemory` from a single JSON blob into a per-write multi-row ledger. Running `prisma migrate dev` will replace the unused `state` column with the new structured columns. Since the previous `saveExecutiveMemory` was a no-op, no live operational data is lost.

> [!WARNING]
> The `Conversation` model relation updates from `executiveMemory ExecutiveMemory?` (one-to-one) to `executiveMemory ExecutiveMemory[]` (one-to-many). Prisma Migrate handles the DDL migration automatically.

---

## Schema Change

### [MODIFY] [schema.prisma](file:///c:/Users/Lenovo/Desktop/AutoCoder/prisma/schema.prisma)

**`Conversation` model** — update relation from optional-one to one-to-many:

```diff
- executiveMemory     ExecutiveMemory?
+ executiveMemory     ExecutiveMemory[]
```

**`ExecutiveMemory` model** — replace single-blob model with the per-agent ledger:

```diff
 model ExecutiveMemory {
-  id             String       @id @default(uuid())
-  conversationId String       @unique
-  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
-  state          String       // Stringified JSON state containing taskSpec, planner, etc.
-  createdAt      DateTime     @default(now())
-  updatedAt      DateTime     @updatedAt
+  id             String       @id @default(cuid())
+  conversationId String
+  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
+
+  // Readable unique inference identity per agent call
+  inferenceId    String       // e.g. "Queen-1-a3f8c2", "Coder-3-f70d9e"
+
+  // Per-agent write identity
+  agentName      String       // "Queen" | "Planner" | "Architect" | "System" | "Designer"
+                              // "Blueprinter" | "Coder" | "Debugger" | "Security" | "Reviewer" | "Tester"
+  sequence       Int          @default(1) // monotonically increasing per (conversation, agentName)
+
+  // Content & Provenance
+  contentMd      String       // raw sanitized markdown output
+  consumedIds    String       @default("[]") // JSON array of upstream inferenceId strings consumed
+
+  // File-level tracking (Coder & Debugger file writes)
+  filePath       String?      // e.g. "src/index.ts" (null for spec agents)
+
+  // Telemetry
+  tokenCount     Int          @default(0)
+  durationMs     Int          @default(0)
+
+  // Lifecycle & Oscillation Detection
+  status         String       @default("ACTIVE")  // "ACTIVE" | "SUPERSEDED" | "INVALIDATED"
+  contentHash    String?      // MD5 of contentMd — used for oscillation detection across runs
+
+  createdAt      DateTime     @default(now())
+  updatedAt      DateTime     @updatedAt
+
+  @@unique([conversationId, inferenceId])
+  @@unique([conversationId, agentName, sequence])
+  @@index([conversationId, agentName, status])
+  @@index([conversationId, filePath])
+  @@index([conversationId, status])
 }
```

Migration command:
```bash
npx prisma migrate dev --name upgrade_executive_memory_schema
```

---

## Component 1 — Reform `loadExecutiveMemory` in `memory.ts`

### [MODIFY] [memory.ts](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/memory.ts)

```typescript
export async function loadExecutiveMemory(conversationId: string): Promise<MemoryState> {
  // Fetch all rows for this conversation ordered by sequence
  const rows = await prisma.executiveMemory.findMany({
    where: { conversationId },
    orderBy: { sequence: 'asc' },
  });

  // Helper: get the latest ACTIVE contentMd for a given agentName
  const latestActive = (agentName: string): string | null => {
    const matches = rows.filter(r => r.agentName === agentName && r.status === 'ACTIVE');
    if (!matches.length) return null;
    return matches[matches.length - 1].contentMd;
  };

  // Reconstruct Coder map: filePath -> { content: string } (latest ACTIVE row per filePath)
  const coderMap: Record<string, any> = {};
  const coderRows = rows.filter(r => r.agentName === 'Coder' && r.status === 'ACTIVE' && r.filePath);
  for (const row of coderRows) {
    coderMap[row.filePath!] = { content: row.contentMd };
  }

  // Reconstruct oscillation data & file history
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

  // Reconstruct invalidated list: agents with any INVALIDATED rows
  const invalidatedSet = new Set(
    rows.filter(r => r.status === 'INVALIDATED').map(r => r.agentName)
  );

  // Wrap content string in { content } to match StageLedger accessor conventions
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
```

---

## Component 2 — Reform `saveExecutiveMemory` & Write Operations in `memory.ts`

### [MODIFY] [memory.ts](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/memory.ts)

```typescript
export async function saveExecutiveMemory(conversationId: string, state: MemoryState): Promise<void> {
  // Legacy compatibility no-op. Actual writes are managed by writeExecutiveMemoryRecord().
}

// Core write function called by runAgent() and StageLedger.write()
export async function writeExecutiveMemoryRecord(params: {
  conversationId: string;
  agentName: string;
  contentMd: string;
  filePath?: string;
  tokenCount?: number;
  durationMs?: number;
  consumedInferenceIds?: string[];
}): Promise<string> {
  // 1. MD5 hash of content for oscillation detection
  const contentHash = crypto.createHash('md5').update(params.contentMd).digest('hex');

  // 2. Safe Supersede Guard:
  // For Coder, supersede only records for the SAME file.
  // For non-Coder agents, supersede all prior ACTIVE records for that agent.
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

  // 3. Monotonic sequence per (conversationId, agentName)
  const lastRow = await prisma.executiveMemory.findFirst({
    where: { conversationId: params.conversationId, agentName: params.agentName },
    orderBy: { sequence: 'desc' },
    select: { sequence: true },
  });
  const nextSeq = (lastRow?.sequence ?? 0) + 1;

  // 4. Deterministic Globally Unique inferenceId: {AgentName}-{seq}-{shortHash}
  const raw = `${params.conversationId}:${params.agentName}:${nextSeq}`;
  const shortHash = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 6);
  const inferenceId = `${params.agentName}-${nextSeq}-${shortHash}`;

  // 5. Create immutable ledger record
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

// Status updater for invalidation flows
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
```

---

## Component 3 — Update `StageLedger` in `memory.ts`

### [MODIFY] [memory.ts](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/memory.ts)

```diff
  async write(agentName: string, field: string, value: any): Promise<void> {
    // 1. Verify Strict Ownership (unchanged)
    const allowed = (OWNERSHIP as any)[agentName];
    if (!allowed || !allowed.includes(field)) {
      throw new Error(`DriftEvent: Agent "${agentName}" cannot mutate field "${field}"`);
    }

    // 2. Perform in-memory modification (unchanged)
    (this.state as any)[field] = value;

    // 3. Oscillation check (unchanged)
    if (field === 'coder' && value && typeof value === 'object') {
      // ... existing oscillation detection logic ...
    }

-   // 4. Persist
-   await saveExecutiveMemory(this.conversationId, this.state);
+   // 4. Persist agent output to ExecutiveMemory ledger
+   const contentMd = typeof value === 'string'
+     ? value
+     : (value?.content ?? JSON.stringify(value));
+   await writeExecutiveMemoryRecord({
+     conversationId: this.conversationId,
+     agentName,
+     contentMd,
+   });
  }
```

```diff
  async invalidate(agentNames: string[]): Promise<void> {
    this.state.invalidated = Array.from(new Set([...this.state.invalidated, ...agentNames]));
-   await saveExecutiveMemory(this.conversationId, this.state);
+   for (const name of agentNames) {
+     await updateExecutiveMemoryStatus(this.conversationId, name, 'INVALIDATED');
+   }
  }

  async clearInvalidation(agentName: string): Promise<void> {
    this.state.invalidated = this.state.invalidated.filter((name) => name !== agentName);
-   await saveExecutiveMemory(this.conversationId, this.state);
+   await updateExecutiveMemoryStatus(this.conversationId, agentName, 'ACTIVE');
  }

  async logDecision(decision: any): Promise<void> {
-   this.state.decisions.push({ ...decision, timestamp: new Date().toISOString() });
-   await saveExecutiveMemory(this.conversationId, this.state);
+   console.log('[EM:Decision]', JSON.stringify({ ...decision, conversationId: this.conversationId }));
  }
```

---

## Component 4 — Reform `buildStageContext()` in `orchestrator.ts`

### [MODIFY] [orchestrator.ts](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts)

Replace `CONTEXT_MAP` with `UPSTREAM_AGENT_MAP`:

```typescript
const UPSTREAM_AGENT_MAP: Record<string, string[]> = {
  'Queen':       [],
  'Planner':     ['Queen'],
  'Architect':   ['Queen', 'Planner'],
  'System':      ['Queen', 'Planner', 'Architect'],
  'Designer':    ['Queen', 'Planner', 'Architect'],
  'Blueprinter': ['Queen', 'Planner', 'Architect', 'System', 'Designer'],
  'Security':    ['Queen'],
  'Reviewer':    ['Queen', 'Planner', 'Architect'],
};
```

Rewrite `buildStageContext()` to query `ExecutiveMemory` directly and track consumed `inferenceId`s:

```typescript
export async function buildStageContext(
  conversationId: string,
  stage: string
): Promise<{ context: string; consumedInferenceIds: string[] }> {
  const upstreamAgents = UPSTREAM_AGENT_MAP[stage] ?? [];
  if (upstreamAgents.length === 0) return { context: '', consumedInferenceIds: [] };

  // Fetch all ACTIVE rows for the upstream agents in a single query
  const rows = await prisma.executiveMemory.findMany({
    where: {
      conversationId,
      agentName: { in: upstreamAgents },
      status: 'ACTIVE',
    },
    orderBy: { sequence: 'desc' },
    select: { agentName: true, contentMd: true, inferenceId: true },
  });

  // Deduplicate: keep latest row per agentName
  const seen = new Set<string>();
  const latestPerAgent: { agentName: string; contentMd: string; inferenceId: string }[] = [];
  for (const row of rows) {
    if (!seen.has(row.agentName)) {
      seen.add(row.agentName);
      latestPerAgent.push(row);
    }
  }

  let context = '';
  const consumedInferenceIds: string[] = [];

  // Build context in ordered upstream sequence
  for (const agentName of upstreamAgents) {
    const row = latestPerAgent.find(r => r.agentName === agentName);
    if (!row) continue;
    const snapshot = extractSnapshotFromContent(row.contentMd);
    if (!snapshot) continue;
    const label = agentName === 'Queen'
      ? '=== ORIGINAL USER INTENT (DO NOT OVERRIDE) ==='
      : `--- [FROM ${agentName} / ${row.inferenceId}] ---`;
    context += `${label}\n${snapshot}\n\n`;
    consumedInferenceIds.push(row.inferenceId);
  }

  return { context: context.trim(), consumedInferenceIds };
}

function extractSnapshotFromContent(content: string): string {
  if (!content) return '';
  const exact = content.match(/### Context Snapshot[\s\S]*?(?=\n###[^#]|$)/i);
  if (exact) {
    const t = exact[0].trim();
    return t.length > MAX_SNAPSHOT_CHARS
      ? t.substring(0, MAX_SNAPSHOT_CHARS) + '\n...[SNAPSHOT TRUNCATED]'
      : t;
  }
  const fuzzy = content.match(/(#+)?\s*(context|snapshot|summary|overview)[\s\S]*?(?=\n###[^#]|$)/i);
  if (fuzzy) {
    const t = fuzzy[0].trim();
    return t.length > MAX_SNAPSHOT_CHARS
      ? t.substring(0, MAX_SNAPSHOT_CHARS) + '\n...[SNAPSHOT TRUNCATED]'
      : t;
  }
  return content.substring(0, 800) + (content.length > 800 ? '\n...[TRUNCATED]' : '');
}
```

---

## Component 5 — Wire `runAgent()` & Pipeline Provenance in `orchestrator.ts`

### [MODIFY] [orchestrator.ts](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts)

1. **Update `runAgent()` call to `buildStageContext` and add dual write + in-flight ledger update**:

```diff
- const upstreamContext = await buildStageContext(conversationId, agentName);
+ const { context: upstreamContext, consumedInferenceIds } = await buildStageContext(conversationId, agentName);
```

```typescript
  // In runAgent() after writing to AgentOutput (line ~644):
  await writeAgentOutput({
    conversationId,
    agentName,
    stage: agentName,
    schemaVersion: '2.0.0',
    model: config.ollamaModel,
    validatedJson: { content: sanitized },
    executionTime: durationMs,
    tokenUsage: estimatedTokens,
    attempt,
  });

  // 1. Write to ExecutiveMemory ledger
  const inferenceId = await writeExecutiveMemoryRecord({
    conversationId,
    agentName,
    contentMd: sanitized,
    filePath: targetFile,
    tokenCount: estimatedTokens,
    durationMs,
    consumedInferenceIds,
  });

  // 2. Synchronize in-flight ledger so subsequent stages in this run see fresh data
  const fieldName = (OWNERSHIP as any)[agentName]?.[0];
  if (fieldName && ledger) {
    if (agentName === 'Coder' && targetFile) {
      const currentCoder = ledger.read('coder') || {};
      currentCoder[targetFile] = sanitized;
      (ledger.getState() as any).coder = currentCoder;
    } else {
      (ledger.getState() as any)[fieldName] = { content: sanitized };
    }
  }
```

2. **Coder & Debugger Stage Provenance Wiring in `runOrchestrator()`**:
   - In `Coder` stage: pass latest active `Blueprinter` inference ID as `consumedInferenceIds`.
   - In `Debugger` stage: pass latest active `Tester` and failing `Coder` file inference IDs.

---

## Component 6 — Token Budgeter Resilience

### [MODIFY] [token-budgeter.ts](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/token-budgeter.ts)

Add markdown bullet counters so `calculateTokenBudget` scales dynamic tokens properly when given Markdown `{ content }` blobs:

```typescript
function countMarkdownItems(state: any, sectionHeader?: string): number {
  if (!state) return 0;
  const content = typeof state === 'string' ? state : state.content || '';
  if (!content) return 0;
  const lines = content.split('\n');
  const bulletLines = lines.filter((l: string) => /^\s*[-*]\s+/.test(l));
  return bulletLines.length || 3; // fallback to 3 if structured bullets not detected
}
```

Update calculations in `calculateTokenBudget`:
```typescript
if (agentName === 'Planner') {
  const taskSpec = ledger.read('taskSpec');
  const featuresCount = taskSpec?.mvpScope?.included?.length || countMarkdownItems(taskSpec);
  budget = 16384 + (featuresCount * 1024);
} else if (agentName === 'Architect') {
  const planner = ledger.read('planner');
  const featuresCount = planner?.features?.length || countMarkdownItems(planner);
  budget = 16384 + (featuresCount * 1024);
}
```

---

## What Does NOT Change

| File / Table | Status | Reason |
|---|---|---|
| `AgentOutput` table + all data | ✅ Untouched | Actively consumed by Workspace UI (`loadSMLData`), Health, Telemetry |
| `AgentIndex` table | ✅ Untouched | Maintained for SML queries |
| `sml.ts` | ✅ Untouched | `writeAgentOutput` and query helpers remain working |
| `WorkspaceContent.tsx` | ✅ Untouched | Renders UI from `AgentOutput` |
| `/api/conversations/[id]/route.ts` | ✅ Untouched | Delivers `outputs: true` to frontend |
| `/api/health/route.ts` | ✅ Untouched | Calculates model latency stats from `AgentOutput` |
| `/api/conversations/[id]/telemetry/route.ts` | ✅ Untouched | Reads execution history logs |
| `GraphNode / GraphEdge` tables | ✅ Untouched | Preserved for Phase 5 ReAct Loop |
| 11 `*StageOutput` tables | ✅ Untouched | Preserved to avoid migration ripples |

---

## Verification Plan

### Automated
```bash
npx prisma migrate dev --name upgrade_executive_memory_schema
npx tsc --noEmit
```

### Manual Inspection & Verification
1. **Pipeline Execution**: Run a full pipeline generation in the UI.
2. **Ledger Integrity Check**: Query `ExecutiveMemory`:
   ```sql
   SELECT inferenceId, agentName, filePath, sequence, status, LENGTH(contentMd), consumedIds
   FROM ExecutiveMemory
   WHERE conversationId = '<id>'
   ORDER BY createdAt ASC;
   ```
   - Expect distinct inference IDs: `Queen-1-XXXXXX`, `Planner-1-XXXXXX`, ..., `Coder-1-XXXXXX`, `Coder-2-XXXXXX`.
   - Verify every Coder file row is `status = 'ACTIVE'` with its `filePath` recorded.
   - Verify `consumedIds` links back to upstream `inferenceId`s.
3. **Retry / Supersession Check**: Trigger a second run or repair loop on the same conversation:
   - Old records transition to `SUPERSEDED`.
   - New active records created with sequence `2` or higher.
4. **UI Verification**:
   - Code Explorer, File Tree, and Entities panels render properly.
   - Telemetry and Health pages load with full statistics.
