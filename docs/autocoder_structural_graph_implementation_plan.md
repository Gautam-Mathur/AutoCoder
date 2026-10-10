# AutoCoder Structural Graph Integration Plan

## Objective

Integrate a deterministic structural graph into AutoCoder to validate the `Blueprinter → Coder` contract and detect architectural drift after code generation.

The graph is **derived state**, not a new source of truth.

### Core rule

> Markdown/VFS tells AutoCoder what it intended to build.  
> VFS contains what it actually built.  
> The structural graph tells AutoCoder how that implementation is connected.

The first implementation should use AutoCoder's existing TypeScript/Node stack and its existing `GraphNode` / `GraphEdge` models. Do **not** introduce Graphify or a Python runtime in the first pass.

Graphify can remain a future enhancement. Its current public repository documents local AST-based extraction, persistent graph output, and query/path/explain capabilities. citeturn0search1

---

# 1. Target Architecture

```text
MARKDOWN SPECIFICATION
        │
        ▼
   BLUEPRINTER
        │
        ▼
   blueprint.md
        │
        ▼
 STRUCTURAL GRAPH GATE
        │
        ├── invalid dependency
        ├── missing file
        ├── dependency cycle
        └── invalid ordering
        │
        ▼
      CODER
        │
        ▼
       VFS
        │
        ├── LINTER
        │
        └── STRUCTURAL GRAPH
                  │
                  ▼
          ARCHITECTURE DRIFT
                  │
                  ▼
              REVIEWER
```

The graph must not replace:

- `plan.md`
- `requirements.md`
- `architecture.md`
- `backend_spec.md`
- `ui_spec.md`
- `blueprint.md`
- generated source files

Those remain the canonical artifacts.

---

# 2. Files to Create

Create:

```text
src/lib/agents/ruflo/structural-graph.ts
```

Tests:

```text
src/lib/agents/ruflo/__tests__/structural-graph.test.ts
src/lib/agents/ruflo/__tests__/blueprint-graph.test.ts
```

Optionally, if the comparison logic becomes large:

```text
src/lib/agents/ruflo/architecture-drift.ts
```

---

# 3. Files to Modify

Modify:

```text
src/lib/agents/ruflo/orchestrator.ts
src/lib/agents/ruflo/ledgerTypes.ts
```

Potentially modify:

```text
src/lib/agents/ruflo/linter.ts
```

Only if the existing cross-file validation needs to share graph resolution logic.

Do **not** initially modify:

```text
src/lib/agents/ruflo/memory.ts
prisma/schema.prisma
src/lib/agents/ruflo/vfs.ts
package.json
```

Keep graph integration independent from the larger memory/state migration.

---

# 4. Reuse the Existing VFS

AutoCoder already has:

```ts
export async function readVirtualFile(
  conversationId: string,
  filePath: string
): Promise<string | null> {
  const safePath = sanitizePath(filePath);
  const record = await prisma.virtualFile.findUnique({
    where: {
      conversationId_filePath: {
        conversationId,
        filePath: safePath,
      },
    },
  });
  return record ? record.content : null;
}
```

And:

```ts
export async function listVirtualFiles(
  conversationId: string
): Promise<string[]> {
  const records = await prisma.virtualFile.findMany({
    where: { conversationId },
    select: { filePath: true },
    orderBy: { filePath: 'asc' },
  });
  return records.map((r) => r.filePath);
}
```

Use these functions.

Do **not** create another source-code storage layer.

The graph builder should:

1. call `listVirtualFiles()`
2. filter source files
3. call `readVirtualFile()` for each relevant file
4. parse the source
5. generate graph nodes and edges

---

# 5. Reuse Existing Graph Persistence

AutoCoder already contains `GraphNode` and `GraphEdge`.

Current `GraphNode` structure:

```prisma
model GraphNode {
  id             String       @id
  conversationId String
  type           String
  title          String
  summary        String?
  payload        String
  version        Int          @default(1)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  outgoingEdges  GraphEdge[] @relation("SourceEdges")
  incomingEdges  GraphEdge[] @relation("TargetEdges")

  @@index([conversationId, type])
}
```

Current `GraphEdge` represents relationships such as:

```text
IMPLEMENTS
DEPENDS_ON
EXPOSES
CALLS
TESTS
BELONGS_TO
```

Do not introduce:

- Neo4j
- another graph database
- Graphify storage
- another persistence layer

Reuse AutoCoder's existing graph tables.

---

# 6. Expand `ledgerTypes.ts`

Current types include:

```ts
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
```

Add only the structural types initially:

```ts
export type NodeType =
  | 'TASK_SPEC'
  | 'FEATURE'
  | 'MODULE'
  | 'API_ENDPOINT'
  | 'UI_COMPONENT'
  | 'TEST_SPEC'
  | 'UNSTRUCTURED_BLOB'
  | 'FILE'
  | 'SYMBOL';

export type EdgeType =
  | 'IMPLEMENTS'
  | 'DEPENDS_ON'
  | 'EXPOSES'
  | 'CALLS'
  | 'TESTS'
  | 'BELONGS_TO'
  | 'IMPORTS'
  | 'CONTAINS'
  | 'EXPORTS';
```

Do not add dozens of node types yet.

The first useful graph is:

```text
FILE
 ├── CONTAINS → SYMBOL
 ├── EXPORTS → SYMBOL
 └── IMPORTS → FILE
```

`CALLS` can be added after import/export resolution is stable.

---

# 7. Create `structural-graph.ts`

Expose a small API:

```ts
export interface StructuralGraphResult {
  nodes: GraphNodeInput[];
  edges: GraphEdgeInput[];
  warnings: string[];
  errors: string[];
}

export async function buildStructuralGraph(
  conversationId: string
): Promise<StructuralGraphResult>;

export async function persistStructuralGraph(
  conversationId: string,
  graph: StructuralGraphResult
): Promise<void>;

export async function buildAndPersistStructuralGraph(
  conversationId: string
): Promise<StructuralGraphResult>;
```

Keep the public surface small.

---

# 8. Deterministic Node IDs

Do not use random IDs for structural nodes.

Use stable IDs derived from:

```text
conversationId + node type + canonical path/symbol
```

Example:

```ts
function fileNodeId(
  conversationId: string,
  filePath: string
): string {
  return `file:${conversationId}:${filePath}`;
}

function symbolNodeId(
  conversationId: string,
  filePath: string,
  symbolName: string
): string {
  return `symbol:${conversationId}:${filePath}:${symbolName}`;
}
```

Rebuilding a graph should update the same logical nodes instead of creating duplicates.

---

# 9. Source File Detection

Start with the languages AutoCoder already generates most often:

```ts
const SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
]);
```

Later:

```text
.py
.go
.rs
.java
.css
```

Do not implement every language in the first pass.

---

# 10. TypeScript AST Extraction

AutoCoder already has:

```json
"typescript": "^5"
```

in `package.json`.

Use the TypeScript compiler API instead of adding another parser dependency.

Basic approach:

```ts
import ts from 'typescript';

const sourceFile = ts.createSourceFile(
  filePath,
  content,
  ts.ScriptTarget.Latest,
  true
);
```

Traverse with:

```ts
function visit(node: ts.Node) {
  // detect declarations/imports/exports
  ts.forEachChild(node, visit);
}
```

Extract at minimum:

- functions
- classes
- interfaces
- type aliases
- variables
- imports
- exports

---

# 11. FILE Nodes

For:

```text
src/app/page.tsx
```

create a `FILE` node.

Payload should contain compact metadata:

```json
{
  "path": "src/app/page.tsx",
  "language": "typescript",
  "extension": ".tsx"
}
```

Do not store full source code in `GraphNode.payload`.

VFS already owns source content.

---

# 12. SYMBOL Nodes

For:

```ts
export function createOrder() {}
```

create:

```text
FILE: src/lib/order.ts
        │
        └── CONTAINS → SYMBOL: createOrder
```

For:

```ts
export class PaymentService {}
```

create:

```text
SYMBOL: PaymentService
```

Store compact metadata:

```json
{
  "name": "PaymentService",
  "kind": "class",
  "file": "src/lib/payment.ts"
}
```

---

# 13. Import Extraction

For:

```ts
import { PaymentService } from "../services/payment";
```

create:

```text
src/lib/order.ts
        │
        └── IMPORTS → src/services/payment.ts
```

Initially resolve:

```text
./foo
../foo
/foo
```

against VFS files.

Try:

```text
foo.ts
foo.tsx
foo.js
foo.jsx
foo/index.ts
foo/index.tsx
foo/index.js
foo/index.jsx
```

Do not attempt npm package resolution initially.

External modules such as:

```text
react
next/server
stripe
@prisma/client
```

are not project FILE nodes.

---

# 14. Export Extraction

For:

```ts
export function createOrder() {}
```

create:

```text
FILE
  │
  └── EXPORTS → createOrder
```

For:

```ts
export { PaymentService };
```

resolve the local symbol when possible.

If resolution fails:

```text
warning: unresolved export
```

Do not fabricate an edge.

---

# 15. Blueprint Parser

AutoCoder already has:

```ts
export function parseBlueprintFiles(
  blueprintText: string
): BlueprintFileSection[] {
  const sections: BlueprintFileSection[] = [];
  const fileBlocks = blueprintText
    .split(/###\s*File:\s*/i)
    .slice(1);

  ...
}
```

Reuse this parser.

Do not create another Markdown blueprint parser.

---

# 16. Replace Weak Blueprint Validation

Current validation:

```ts
export function validateBlueprintImports(
  sections: BlueprintFileSection[]
): string[] {
  const allFiles = new Set(sections.map(s => s.file));
  const warnings: string[] = [];

  for (const section of sections) {
    for (const dep of section.dependencies) {
      const normalizedDep = dep
        .replace(/^\.\.\//, '')
        .replace(/^\.\//, '')
        .replace(/^\//, '');

      if (!allFiles.has(normalizedDep) && !allFiles.has(dep)) {
        warnings.push(
          `Blueprint Warning: "${section.file}" lists dependency "${dep}" which is not defined as a ### File: section.`
        );
      }
    }
  }

  return warnings;
}
```

This only checks whether a dependency exists somewhere.

It does not check:

- dependency ordering
- dependency cycles
- duplicate files
- transitive consistency
- implementation alignment

Replace it with a graph-aware validator.

---

# 17. Add `validateBlueprintGraph()`

Recommended API:

```ts
export interface BlueprintGraphValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  order: string[];
}

export function validateBlueprintGraph(
  sections: BlueprintFileSection[]
): BlueprintGraphValidation;
```

Validate:

### Duplicate files

Reject duplicate `### File:` sections.

### Missing dependencies

Reject dependencies not defined in the blueprint.

### Dependency cycles

Reject:

```text
A → B
B → C
C → A
```

### Dependency ordering

If:

```text
A depends on B
```

then:

```text
B
A
```

must be the blueprint order.

---

# 18. Replace the Existing Blueprinter Sort

Current code:

```ts
parsedSections.sort((a, b) => {
  if (a.file === 'index.html' || a.file === 'public/index.html') return -1;
  if (b.file === 'index.html' || b.file === 'public/index.html') return 1;
  if (a.dependencies.length === 0 && b.dependencies.length > 0) return -1;
  if (b.dependencies.length === 0 && a.dependencies.length > 0) return 1;
  return 0;
});
```

Remove it.

It is not a dependency ordering algorithm.

The current Blueprinter prompt also contains contradictory entry-point ordering instructions. Replace those rules with the actual dependency graph and topological ordering.

---

# 19. Topological Sort

Implement:

```ts
function topologicalSort(
  sections: BlueprintFileSection[]
): string[] {
  // Kahn's algorithm or DFS-based topological sort
}
```

Expected:

```text
database.ts
config.ts
services/payment.ts
api/checkout.ts
components/Checkout.tsx
app/page.tsx
```

If a cycle exists, fail the blueprint gate.

---

# 20. Make Blueprint Validation a Hard Gate

Current Coder behavior:

```ts
const bpWarnings = validateBlueprintImports(fileSections);

for (const bpw of bpWarnings) {
  emit({
    type: 'AGENT_LOG',
    agent: 'Coder',
    message: `⚠️ ${bpw}`,
  });
}
```

Replace with:

```ts
const blueprintValidation =
  validateBlueprintGraph(fileSections);

for (const warning of blueprintValidation.warnings) {
  emit({
    type: 'AGENT_LOG',
    agent: 'Coder',
    message: `⚠️ ${warning}`,
  });
}

if (!blueprintValidation.valid) {
  for (const error of blueprintValidation.errors) {
    emit({
      type: 'AGENT_LOG',
      agent: 'Coder',
      message: `❌ Blueprint Graph Error: ${error}`,
    });
  }

  throw new Error(
    'Blueprint graph validation failed. Coder execution aborted.'
  );
}
```

Behavior becomes:

```text
BAD BLUEPRINT
    ↓
STOP
```

instead of:

```text
BAD BLUEPRINT
    ↓
WARNING
    ↓
CODER
```

---

# 21. Build the Structural Graph After Coder

Do not rebuild the graph after every generated file.

After the complete Coder stage:

```ts
const graphResult =
  await buildAndPersistStructuralGraph(conversationId);
```

One graph build per completed code-generation pass.

---

# 22. Keep Existing Cross-File Import Checking

AutoCoder already has:

```ts
export function runCrossFileImportCheck(
  fileMap: Map<string, string>
): LintResult {
  ...
}
```

Keep it initially.

Current behavior:

```ts
const importCheck =
  runCrossFileImportCheck(crossFileMap);

if (!importCheck.success) {
  for (const err of importCheck.errors) {
    emit({
      type: 'AGENT_LOG',
      agent: 'Coder',
      message: `⚠️ Import Error: ${err.message}`,
    });
  }
}
```

During migration:

```text
Structural Graph
      +
Cross-file import checker
      ↓
Compare results
```

Only remove the old checker after the graph resolver is proven stable.

---

# 23. Architecture Drift

After Coder:

```text
blueprint.md
      +
actual VFS
      ↓
structural graph
      ↓
comparison
      ↓
architecture_drift_report.md
```

Detect:

### Missing implementation

Blueprint contains a file absent from VFS.

### Unplanned file

VFS contains a file absent from the blueprint.

### Dependency drift

Blueprint dependency differs from actual import relationship.

### Broken import

Implementation imports a missing project file.

### Dependency cycle

Actual implementation contains a cycle.

### Missing declared dependency

Blueprint says A depends on B, but the implementation relationship is absent.

### Undeclared dependency

Implementation imports B but blueprint does not declare it.

---

# 24. Drift Report

Create:

```text
architecture_drift_report.md
```

Example:

```md
# Architecture Drift Report

## Overall Status

DRIFT_DETECTED

## Missing Implementations

- `src/lib/payment.ts`

## Unplanned Files

- `src/lib/debug.ts`

## Dependency Drift

- `src/app/checkout/page.tsx`
  - Blueprint: `services/checkout.ts`
  - Actual: `services/payment.ts`

## Broken Imports

- `src/pages/api/checkout.ts`
  - imports `../lib/stripe`
  - target not found

## Dependency Cycles

- `A → B → C → A`

## Summary

- Missing implementations: 1
- Unplanned files: 1
- Dependency mismatches: 1
- Broken imports: 1
- Cycles: 1
```

Keep the report compact.

Do not dump the full graph into Markdown.

---

# 25. Reviewer Integration

Current Reviewer/Security context construction includes:

```ts
const fullCtx =
  specContext +
  (
    codeContext
      ? `\n=== GENERATED SOURCE CODE ===\n${codeContext}`
      : '\n=== NOTE: No source code files found ==='
  );
```

Add:

```ts
const driftReport =
  await readVirtualFile(
    conversationId,
    'architecture_drift_report.md'
  );
```

Then:

```ts
const fullCtx =
  specContext +
  (
    codeContext
      ? `\n=== GENERATED SOURCE CODE ===\n${codeContext}`
      : '\n=== NOTE: No source code files found ==='
  ) +
  (
    driftReport
      ? `\n=== ARCHITECTURE DRIFT ===\n${driftReport}`
      : ''
  );
```

The Reviewer receives the compact report, not the raw graph.

---

# 26. Do Not Give Ollama the Entire Graph

Bad:

```text
graph.json
 ↓
Ollama
```

Instead expose targeted queries:

```text
getFileDependencies(file)
getFileDependents(file)
getExportedSymbols(file)
getImporters(file)
findCycles()
getSubgraph(file, depth)
```

Example context:

```text
TARGET FILE:
src/app/checkout/page.tsx

DEPENDS ON:
- src/components/CheckoutForm.tsx
- src/lib/payment.ts
- src/lib/api.ts

IMPORTED SYMBOLS:
- CheckoutForm
- createPayment
- apiClient

DEPENDENTS:
- src/app/page.tsx
```

This is useful model context.

A giant `graph.json` blob is not.

---

# 27. Graph Query API

Expose:

```ts
export async function getFileDependencies(
  conversationId: string,
  filePath: string
): Promise<string[]>;

export async function getFileDependents(
  conversationId: string,
  filePath: string
): Promise<string[]>;

export async function getFileSymbols(
  conversationId: string,
  filePath: string
): Promise<string[]>;

export async function findDependencyCycles(
  conversationId: string
): Promise<string[][]>;

export async function getSubgraph(
  conversationId: string,
  nodeId: string,
  depth?: number
): Promise<StructuralGraphResult>;
```

These become the foundation for future graph-aware agent retrieval.

---

# 28. Graph Is Infrastructure, Not an Agent

Do not create:

```text
Queen
Planner
Architect
System
Designer
Blueprinter
Graphify Agent
Coder
```

Instead:

```text
Agents
  ↓
Artifacts

Structural Graph
  ↓
Deterministic infrastructure
```

Graph extraction should not make strategic decisions.

---

# 29. Do Not Replace Blueprinter

Responsibilities remain separate.

### Blueprinter

> What files should exist and how should they be implemented?

### Structural graph

> What files and symbols actually exist, and how are they connected?

Therefore:

```text
Specifications
      ↓
Blueprinter
      ↓
blueprint.md
      ↓
Graph validation
      ↓
Coder
      ↓
actual source
      ↓
Graph extraction
```

Blueprinter remains the implementation contract.

---

# 30. Graph Is Derived State

The graph must always be rebuildable from VFS.

If:

```text
graph data disappears
```

AutoCoder should regenerate it from:

```text
VFS
```

If:

```text
blueprint.md disappears
```

that is more serious because the blueprint is semantic project state.

---

# 31. Keep ExecutiveMemory Work Separate

Do not combine:

```text
Graph integration
+
ExecutiveMemory removal
```

into one migration.

AutoCoder currently contains multiple state representations:

- dedicated stage tables
- ExecutiveMemory
- VirtualFile
- StageLedger
- AgentOutput
- GraphNode
- GraphEdge
- Correlation

The larger simplification toward Markdown/VFS as canonical semantic state should happen separately.

For this change:

```text
Graph integration
```

must remain isolated.

---

# 32. Do Not Add Graphify Yet

Graphify is attractive because it already provides:

- deterministic AST extraction
- cross-file relationships
- graph queries
- path tracing
- confidence tags
- incremental updates
- visualization
- GraphRAG-style output

Its public repository documents local tree-sitter extraction for code and distinguishes extracted relationships from inferred ones. citeturn0search1

However, the first AutoCoder implementation does not need all of that.

Adding Graphify immediately would introduce:

```text
Node
 +
Python
 +
Python environment
 +
subprocess/service boundary
 +
Graphify output format
 +
Graphify lifecycle
 +
cross-language dependency
```

First prove that the graph concept improves AutoCoder.

Then consider replacing the internal extractor with Graphify.

---

# 33. Future Graphify Integration

Potential future architecture:

```text
AutoCoder VFS
      │
      ▼
Graphify
      │
      ▼
graph.json
      │
      ├── query
      ├── path
      ├── explain
      └── structural validation
```

Graphify supports persistent graph output, incremental updates, and query/path/explain operations. citeturn0search1turn0search2

At that point AutoCoder could use Graphify as its structural engine.

That is Phase 2, not the first implementation.

---

# 34. Tests

## Test 1: File graph

Input:

```text
src/a.ts
src/b.ts
```

Where:

```ts
// a.ts
import { foo } from './b';
```

Expected:

```text
a.ts --IMPORTS--> b.ts
```

## Test 2: Missing import

```ts
import { foo } from './missing';
```

Expected:

```text
BROKEN_IMPORT
```

## Test 3: Symbol extraction

```ts
export function createOrder() {}
```

Expected:

```text
order.ts
   │
   ├── CONTAINS → createOrder
   └── EXPORTS → createOrder
```

## Test 4: Blueprint dependency

```text
A depends on B
```

Expected:

```text
B
A
```

## Test 5: Blueprint cycle

```text
A → B
B → C
C → A
```

Expected:

```text
valid = false
```

## Test 6: Duplicate blueprint file

```text
### File: src/a.ts
### File: src/a.ts
```

Expected hard failure.

## Test 7: Blueprint/VFS drift

Blueprint:

```text
src/a.ts
src/b.ts
```

VFS:

```text
src/a.ts
src/c.ts
```

Expected:

```text
MISSING_IMPLEMENTATION:
src/b.ts

UNPLANNED_FILE:
src/c.ts
```

---

# 35. Performance Constraints

Initial target:

```text
1 graph build
per completed Coder stage
```

Not:

```text
1 graph build
per generated file
```

Not:

```text
1 graph build
per agent
```

Not:

```text
1 graph build
per Ollama request
```

Use the graph as a checkpoint.

---

# 36. Incremental Graph Updates

Do not implement incremental graph updates in the first version unless profiling shows full rebuilds are expensive.

First establish:

```text
correctness
>
performance optimization
```

Later, file-hash based incremental extraction can be introduced.

Potential state:

```ts
{
  filePath: "src/lib/payment.ts",
  contentHash: "...",
  graphVersion: 4
}
```

Then only changed files are reparsed.

---

# 37. Failure Policy

Distinguish infrastructure failures from architectural violations.

Recommended categories:

```text
GRAPH_BUILD_ERROR
GRAPH_VALIDATION_ERROR
BLUEPRINT_VALIDATION_ERROR
ARCHITECTURE_DRIFT
```

Do not silently treat graph extraction failure as a clean graph.

---

# 38. Exact Implementation Order

## Phase 1: Graph Types

Modify:

```text
ledgerTypes.ts
```

Add:

```text
FILE
SYMBOL
IMPORTS
CONTAINS
EXPORTS
```

## Phase 2: Structural Extractor

Create:

```text
structural-graph.ts
```

Implement:

1. VFS file discovery
2. source filtering
3. TypeScript AST parsing
4. FILE nodes
5. SYMBOL nodes
6. CONTAINS edges
7. EXPORTS edges
8. IMPORTS edges
9. deterministic import resolution

## Phase 3: Persistence

Reuse:

```text
GraphNode
GraphEdge
```

No Prisma migration initially.

## Phase 4: Blueprint Validation

Modify:

```text
orchestrator.ts
```

Add:

```ts
validateBlueprintGraph()
```

Implement:

1. duplicate detection
2. dependency resolution
3. cycle detection
4. topological ordering

## Phase 5: Blueprinter Ordering

Delete:

```ts
parsedSections.sort(...)
```

Replace with topological ordering.

## Phase 6: Coder Gate

Replace:

```ts
validateBlueprintImports()
```

with:

```ts
validateBlueprintGraph()
```

Make errors blocking.

Keep warnings non-blocking.

## Phase 7: Post-Coder Graph

After the complete Coder loop:

```ts
await buildAndPersistStructuralGraph(
  conversationId
);
```

## Phase 8: Drift Detection

Compare:

```text
blueprint.md
```

against:

```text
VFS graph
```

Generate:

```text
architecture_drift_report.md
```

## Phase 9: Reviewer Context

Add:

```text
architecture_drift_report.md
```

to Reviewer/Security context.

Do not inject the entire graph.

## Phase 10: Tests

Add:

```text
structural-graph.test.ts
blueprint-graph.test.ts
```

Test:

```text
clean blueprint
bad blueprint
cycle
missing dependency
broken import
drift
```

---

# 39. Explicitly Do Not Do These

Do **not**:

- remove ExecutiveMemory in this PR
- add `contentJson` to ExecutiveMemory
- add Graphify as a dependency
- add Python
- add Neo4j
- add another database
- feed the entire graph to Ollama
- rebuild the graph after every file
- make graph extraction an LLM agent
- replace Blueprinter
- replace Markdown/VFS
- delete `runCrossFileImportCheck()` immediately
- make inferred graph relationships authoritative
- make community detection part of the generation gate
- store entire source files in graph node payloads

---

# 40. Final Architecture

```text
                   ┌───────────────────────┐
                   │   Markdown Specs      │
                   │                       │
                   │ plan.md               │
                   │ requirements.md       │
                   │ architecture.md       │
                   │ backend_spec.md       │
                   │ ui_spec.md             │
                   └───────────┬───────────┘
                               │
                               ▼
                      ┌────────────────┐
                      │   Blueprinter  │
                      └───────┬────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │ blueprint.md │
                       └──────┬───────┘
                              │
                              ▼
                 ┌─────────────────────────┐
                 │ Blueprint Graph Gate    │
                 │                         │
                 │ dependencies            │
                 │ cycles                  │
                 │ duplicates              │
                 │ ordering                │
                 └────────────┬────────────┘
                              │
                         VALID ONLY
                              │
                              ▼
                       ┌────────────┐
                       │   Coder    │
                       └─────┬──────┘
                             │
                             ▼
                           VFS
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
           Linter                    Structural Graph
                                            │
                                            ▼
                                   Architecture Drift
                                            │
                                            ▼
                                         Reviewer
```

---

# 41. Architectural Principle

Maintain three clearly separated layers:

### 1. Specification

```text
Markdown
```

What AutoCoder intends to build.

### 2. Implementation

```text
VFS
```

What AutoCoder actually built.

### 3. Structural Index

```text
Graph
```

How the implementation is connected.

Never reverse those responsibilities.

The graph is not memory.

The graph is not the specification.

The graph is not the implementation.

It is an index and validator over the implementation.

---

# 42. Success Criteria

The implementation is complete when AutoCoder can reliably:

```text
1. Generate blueprint
2. Parse blueprint dependencies
3. Reject invalid dependency graphs
4. Order blueprint files topologically
5. Generate source files
6. Build one structural graph from VFS
7. Resolve imports and symbols
8. Detect broken relationships
9. Compare planned vs actual architecture
10. Produce architecture_drift_report.md
11. Give the Reviewer the drift report
```

The important outcome is not:

> “AutoCoder has a graph.”

The important outcome is:

> **AutoCoder can detect when what it planned to build and what it actually built have diverged.**
