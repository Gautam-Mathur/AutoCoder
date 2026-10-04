# AutoCoder Whole-Pipeline Remediation Plan
## Exact Code-Level Fix Specification, Recursive Verification, and Zero-Loophole Closure

**Repository:** `Gautam-Mathur/AutoCoder`  
**Base revision:** `3ff48895644dfafc4bcecb2c2af21116c0881097`  
**Purpose:** Convert the whole pipeline from "mostly validated" into a deterministic, transactional, resumable state machine.

---

# 0. Non-Negotiable Engineering Rule

The pipeline must treat every LLM result as an **untrusted candidate**.

The only valid lifecycle is:

```text
INPUT
  ↓
GENERATE CANDIDATE
  ↓
PARSE
  ↓
DETERMINISTIC VALIDATE
  ↓
ACCEPT / REJECT
  ↓
COMMIT ACCEPTED VERSION
  ↓
MARK STAGE COMPLETED
  ↓
ALLOW DOWNSTREAM CONSUMPTION
```

Never:

```text
GENERATE
  ↓
COMPLETED
  ↓
VALIDATE
```

Never:

```text
HISTORICAL COMPLETED ROW
  ↓
ASSUME CURRENT STATE
```

Never:

```text
IN-MEMORY LOCK
  ↓
ASSUME GLOBAL OWNERSHIP
```

Never:

```text
PARTIAL REPAIR
  ↓
ASSUME FULL PROJECT VERIFIED
```

---


# 0A. P0: Canonical Contract ↔ Prompt ↔ Validator ↔ Artifact Synchronization

This is a mandatory extension of Phase 0.

The pipeline must not merely validate individual stages. **Every contract, prompt assumption, parser, validator, accepted artifact, persisted output, and downstream consumer must describe the same versioned interface.**

A stage can be individually valid and still be globally wrong if, for example:

```text
Architect prompt expects ArchitectureOutput v3
        ↓
Architect validator implements v2 rules
        ↓
architecture.md is persisted without provenance
        ↓
Coder assumes v4 fields
```

That state is forbidden.

## 0A.1 Canonical contract registry

Create:

```text
src/lib/agents/ruflo/contracts/
├── registry.ts
├── versions.ts
├── fingerprints.ts
├── compatibility.ts
├── schemas/
│   ├── queen.ts
│   ├── planner.ts
│   ├── architect.ts
│   ├── blueprinter.ts
│   ├── coder.ts
│   ├── tester.ts
│   ├── debugger.ts
│   ├── security.ts
│   └── reviewer.ts
└── __tests__/
    ├── compatibility.test.ts
    ├── fingerprint.test.ts
    └── contract-sync.test.ts
```

Do not duplicate contract definitions independently in `orchestrator.ts`, `registry/*.ts`, `spec-contract.ts`, `api-contract-validator.ts`, prompt strings, artifact persistence, or resume logic. Those components consume the canonical registry.

Example:

```ts
export const ARCHITECT_CONTRACT = {
  name: 'Architect',
  version: '2.0.0',

  inputArtifacts: [
    {
      name: 'plan.md',
      contract: 'PlannerOutput',
      minVersion: '2.0.0',
    },
    {
      name: 'requirements.md',
      contract: 'Requirements',
      minVersion: '1.0.0',
    },
  ],

  outputArtifact: {
    name: 'architecture.md',
    contract: 'ArchitectureOutput',
    version: '3.0.0',
  },
} as const;
```

The versions above are example identifiers. During implementation, use the repository's actual contract versions and never invent compatibility.

## 0A.2 Contract compatibility is an executable gate

Every stage must verify its declared inputs before inference:

```ts
assertArtifactCompatibility({
  produced: inputArtifact,
  required: stageContract.inputArtifacts,
});
```

Failure must stop the stage:

```text
CONTRACT COMPATIBILITY ERROR

Artifact:
  architecture.md

Produced:
  ArchitectureOutput v3.0.0

Required:
  ArchitectureOutput >= v4.0.0

Stage:
  Coder

Execution blocked.
```

An artifact is consumable only when all of these are true:

```text
artifact.status == ACCEPTED
AND
contract compatibility == PASS
AND
dependency fingerprint == CURRENT
AND
content hash == persisted hash
AND
artifact version is the version referenced by PipelineRun
```

File existence alone is never evidence of validity.

## 0A.3 Synchronize prompts with canonical contracts

Stage prompts must consume the canonical contract definition rather than maintaining an unrelated copy of its interface.

For example:

```ts
const contract = getStageContract('Architect');

const prompt = buildArchitectPrompt({
  contract,
});
```

The resulting prompt must expose the actual contract identity and its mandatory invariants:

```text
INPUT CONTRACT
- plan.md: PlannerOutput >= <declared version>
- requirements.md: Requirements >= <declared version>

OUTPUT CONTRACT
- architecture.md
- contract: ArchitectureOutput
- version: <declared version>

MANDATORY INVARIANTS
- Every project-tree file must have exactly one owner.
- Every Owned Files entry must exist in the project tree.
- Every Depends On value must exactly match a declared architecture module.
- Invalid Next.js dynamic segment [...] is forbidden.
- Standard Next.js public assets belong in root-level public/.
```

Add synchronization tests:

```ts
it('Architect prompt exposes the canonical output contract', () => {
  const contract = getStageContract('Architect');
  const prompt = buildArchitectPrompt({ contract });

  expect(prompt).toContain(
    `ArchitectureOutput v${contract.outputArtifact.version}`
  );
});
```

Repeat this for every structured stage contract.

## 0A.4 Synchronize validators with canonical contracts

Validators must identify exactly which contract they validate.

Example:

```ts
const result = validateArchitecture(content, {
  contractVersion: ARCHITECT_CONTRACT.outputArtifact.version,
});
```

Return structured provenance:

```ts
{
  valid: true,
  contract: {
    name: 'ArchitectureOutput',
    version: '3.0.0',
  },
  validatorVersion: '7',
  errors: [],
  warnings: []
}
```

Acceptance must fail if the validator did not validate the exact contract version expected by the stage.

```ts
if (
  !result.valid ||
  result.contract.version !== expectedContract.version
) {
  rejectCandidate(...);
}
```

The validator is part of the contract implementation, not an independent authority.

## 0A.5 Version contracts, prompts, validators, and artifacts together

Every accepted artifact needs a complete synchronization fingerprint:

```ts
type ContractFingerprint = {
  contractName: string;
  contractVersion: string;
  schemaHash: string;
  promptHash: string;
  validatorHash: string;
};
```

Derive it deterministically:

```ts
const fingerprint = sha256(
  JSON.stringify({
    contractVersion,
    schemaHash,
    promptHash,
    validatorHash,
  })
);
```

Record the fingerprint on every accepted artifact.

A change to a contract, schema, prompt, or validator must therefore be observable and must be able to invalidate artifacts produced under incompatible semantics.

## 0A.6 Artifact provenance

Extend the ArtifactVersion model defined later in this plan so that it contains equivalent information:

```prisma
model ArtifactVersion {
  id                    String   @id @default(cuid())

  conversationId        String
  stage                 String

  artifactName          String
  contractName          String
  contractVersion       String

  contentHash           String
  contractHash          String
  validatorVersion      String
  promptVersion         String

  parentArtifactIds     Json
  dependencyFingerprint String

  status                ArtifactStatus

  createdAt              DateTime @default(now())

  @@index([conversationId, artifactName])
  @@index([conversationId, stage])
}
```

If the later ArtifactVersion design normalizes these fields differently, retain the same information and invariants. Do not remove the provenance.

## 0A.7 Dependency fingerprints and recursive invalidation

Artifacts must carry the identity of the exact accepted inputs from which they were produced.

For:

```text
requirements.md
      ↓
architecture.md
      ↓
blueprint.md
      ↓
code
      ↓
test report
```

a change to `requirements.md` must invalidate every dependent artifact whose dependency fingerprint references the old version.

Required behavior:

```text
INPUT CHANGE
     ↓
find dependent artifacts
     ↓
mark descendants STALE
     ↓
block downstream consumption
     ↓
re-run affected stages
     ↓
validate
     ↓
accept
     ↓
commit
     ↓
revalidate descendants
```

Do not simply overwrite an upstream artifact and leave downstream artifacts marked `Completed`.

## 0A.8 Canonical stage contract graph

Each stage must declare:

```ts
type StageContract = {
  name: string;
  version: string;

  inputArtifacts: Array<{
    name: string;
    contract: string;
    minVersion: string;
  }>;

  outputArtifact: {
    name: string;
    contract: string;
    version: string;
  };
};
```

The orchestrator must derive stage dependencies from this registry.

This prevents:

```text
Architect expects plan.md
Coder independently assumes architecture.md
Reviewer independently assumes test_report.md
```

from becoming incompatible hidden contracts.

## 0A.9 Canonical artifact identity

The authoritative identity of an output is:

```text
artifactName
+
artifactVersion
+
contractName
+
contractVersion
+
contentHash
+
dependencyFingerprint
```

A filename such as:

```text
architecture.md
```

is only a projection of that identity.

`VirtualFile`, `ExecutionHistory`, stage output tables, and in-memory stage state must reference the canonical artifact identity instead of independently declaring an artifact authoritative.

## 0A.10 Candidate, accepted, and committed outputs

Never allow a candidate to mutate authoritative contract/output state.

Required lifecycle:

```text
LLM candidate
    ↓
candidate artifact
    ↓
input compatibility check
    ↓
output contract validation
    ↓
semantic validation
    ↓
dependency validation
    ↓
ACCEPTED artifact version
    ↓
transactional commit
    ↓
authoritative artifact
```

Rejected candidates may be retained for diagnostics, but they must never:

```text
overwrite authoritative VFS output
advance PipelineRun
satisfy resume
satisfy downstream compatibility
count as completed execution
```

## 0A.11 Cross-layer synchronization tests

Add tests that deliberately create drift between layers:

```text
contract version mismatch
prompt/contract mismatch
validator/contract mismatch
artifact schema mismatch
stale dependency fingerprint
changed upstream artifact
changed contract
changed prompt
changed validator
corrupt persisted artifact
duplicate artifact version
resume with stale artifact
downstream consumer requiring newer contract
accepted artifact with wrong content hash
accepted artifact with wrong dependency fingerprint
candidate incorrectly marked authoritative
```

Every test must prove both sides:

```text
invalid state is rejected
AND
the invalid state cannot be consumed by the next stage
```

A validator unit test alone is insufficient.

## 0A.12 Non-negotiable synchronization invariants

Add these to the global rules:

```text
INVARIANT CONTRACT-001

No artifact may become authoritative unless:

1. Its input artifacts satisfy their declared contracts.
2. Its output satisfies the canonical output contract.
3. The validator version matches the execution contract.
4. The prompt contract matches the execution contract.
5. The artifact records its exact contract fingerprint.
6. All downstream consumers declare compatibility with that contract.
7. Its dependency fingerprint matches the accepted input artifacts.
8. Its content hash matches the persisted artifact.
9. Its artifact version is the one referenced by PipelineRun.
```

And:

```text
INVARIANT CONTRACT-002

No stage may consume an artifact merely because a file with the
expected filename exists.

Consumption requires:

artifact.status == ACCEPTED
AND
contract compatibility == PASS
AND
dependency fingerprint == CURRENT
AND
content hash == persisted hash
AND
artifact identity == the version referenced by PipelineRun
```

## 0A.13 Recursive contract verification

The verification chain is:

```text
Canonical Contract
        ↓
Prompt
        ↓
Parser / Schema
        ↓
Validator
        ↓
LLM Candidate
        ↓
Accepted Artifact
        ↓
Artifact Persistence
        ↓
Artifact Fingerprint
        ↓
PipelineRun Reference
        ↓
Downstream Compatibility Check
        ↓
Next Stage
```

Then recursively verify mutations:

```text
Contract change
  ↓
identify affected artifact contracts
  ↓
invalidate incompatible artifacts
  ↓
invalidate dependent stages
  ↓
rebuild
  ↓
validate
  ↓
commit
  ↓
verify downstream compatibility
```

The implementation is not complete until a contract change can be introduced and the system correctly identifies every artifact and stage that is no longer authoritative.

## 0A.14 Required source-level assertions

Before declaring the fix complete, perform repository scans proving:

```text
1. No stage has a private output-contract definition that conflicts with
   the canonical registry.

2. No prompt contains a contract version different from the registry
   without an explicit generated source.

3. No validator accepts an artifact under a contract version other than
   the one declared by the stage.

4. No downstream stage reads an artifact without compatibility validation.

5. No resume path treats a filename or historical Completed row as
   sufficient evidence of a current accepted artifact.

6. No authoritative artifact lacks contentHash, contractVersion,
   validatorVersion, promptVersion, and dependencyFingerprint.

7. No accepted artifact points at a superseded parent artifact.

8. No contract mutation can leave descendants silently marked current.
```


# 1. Fix Order

Implement in exactly this order.

```text
PHASE 0  Canonical contracts + contract/output synchronization
PHASE 1  Persistent pipeline ownership
PHASE 2  Transactional stage execution
PHASE 3  Artifact version/provenance
PHASE 4  Resume correctness
PHASE 5  Event sequencing
PHASE 6  Blueprinter transactional batching
PHASE 7  Coder acceptance
PHASE 8  Tester ↔ Debugger recursive verification
PHASE 9  Final completion gate
PHASE 10 Path/VFS correctness
PHASE 11 Timeout/token correctness
PHASE 12 Remove/neutralize duplicate state stores
PHASE 13 Adversarial integration harness
PHASE 14 Real-model/runtime verification
PHASE 15 Recursive mutation verification
PHASE 16 Final contract/artifact consistency verification
```

Do not implement later phases before the state model exists.

---

# 2. Canonical State Model

## New file

Create:

```text
src/lib/agents/ruflo/pipeline-state.ts
```

Use explicit typed states.

```ts
export const PIPELINE_STAGES = [
  'Queen',
  'Planner',
  'Architect',
  'System',
  'Designer',
  'Blueprinter',
  'Coder',
  'Tester',
  'Debugger',
  'Security',
  'Reviewer',
] as const;

export type PipelineStage = typeof PIPELINE_STAGES[number];

export const STAGE_STATES = [
  'QUEUED',
  'RUNNING',
  'CANDIDATE',
  'VALIDATING',
  'REJECTED',
  'RETRYING',
  'ACCEPTED',
  'COMMITTED',
  'COMPLETED',
  'FAILED',
  'PAUSED',
  'CANCELLED',
  'INVALIDATED',
] as const;

export type StageState = typeof STAGE_STATES[number];

export interface StageExecutionIdentity {
  runId: string;
  stage: PipelineStage;
  executionId: string;
  attempt: number;
  artifactVersion?: number;
  contentHash?: string;
}

export function canTransition(
  from: StageState,
  to: StageState,
): boolean {
  const transitions: Record<StageState, StageState[]> = {
    QUEUED: ['RUNNING', 'CANCELLED'],
    RUNNING: ['CANDIDATE', 'FAILED', 'PAUSED', 'CANCELLED'],
    CANDIDATE: ['VALIDATING', 'FAILED', 'CANCELLED'],
    VALIDATING: ['ACCEPTED', 'REJECTED', 'FAILED'],
    REJECTED: ['RETRYING', 'FAILED'],
    RETRYING: ['RUNNING', 'FAILED', 'CANCELLED'],
    ACCEPTED: ['COMMITTED', 'FAILED'],
    COMMITTED: ['COMPLETED', 'INVALIDATED'],
    COMPLETED: ['INVALIDATED'],
    FAILED: ['RETRYING', 'PAUSED'],
    PAUSED: ['RUNNING', 'CANCELLED'],
    CANCELLED: [],
    INVALIDATED: ['QUEUED'],
  };

  return transitions[from].includes(to);
}

export function assertTransition(
  from: StageState,
  to: StageState,
): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `Illegal stage transition: ${from} -> ${to}`
    );
  }
}
```

## Required invariant

Every stage mutation must pass through this transition function.

No direct:

```ts
status: 'Completed'
```

for stage lifecycle.

---

# 3. Phase 1: Persistent Pipeline Ownership

## Existing location

```text
prisma/schema.prisma
```

Existing model already contains:

```prisma
model PipelineRun {
  id             String       @id @default(uuid())
  conversationId String       @unique
  state          String
  currentStage   String?
  attempt        Int          @default(1)
  version        Int          @default(1)
  leaseOwner     String?
  leaseExpiresAt DateTime?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
}
```

Do NOT create another lock table.

Use this model as the authoritative execution owner.

---

# 4. Add Pipeline Lease Helper

## New file

```text
src/lib/agents/ruflo/pipeline-lease.ts
```

```ts
import { randomUUID } from 'crypto';
import { prisma } from '../../db';

const LEASE_MS = 60_000;

export interface PipelineLease {
  conversationId: string;
  ownerId: string;
  acquired: boolean;
}

export async function acquirePipelineLease(
  conversationId: string,
): Promise<PipelineLease> {
  const ownerId = randomUUID();
  const now = new Date();
  const expires = new Date(now.getTime() + LEASE_MS);

  const result = await prisma.$executeRaw`
    UPDATE "PipelineRun"
    SET
      "leaseOwner" = ${ownerId},
      "leaseExpiresAt" = ${expires},
      "state" = CASE
        WHEN "state" IN ('QUEUED', 'PAUSED')
          OR ("state" = 'RUNNING' AND "leaseExpiresAt" < ${now})
        THEN 'RUNNING'
        ELSE "state"
      END,
      "updatedAt" = ${now}
    WHERE "conversationId" = ${conversationId}
      AND (
        "leaseOwner" IS NULL
        OR "leaseExpiresAt" < ${now}
        OR "leaseOwner" = ${ownerId}
        OR "state" = 'QUEUED'
        OR "state" = 'PAUSED'
      )
  `;

  return {
    conversationId,
    ownerId,
    acquired: result === 1,
  };
}

export async function renewPipelineLease(
  conversationId: string,
  ownerId: string,
): Promise<boolean> {
  const expires = new Date(Date.now() + LEASE_MS);

  const result = await prisma.$executeRaw`
    UPDATE "PipelineRun"
    SET
      "leaseExpiresAt" = ${expires},
      "updatedAt" = NOW()
    WHERE "conversationId" = ${conversationId}
      AND "leaseOwner" = ${ownerId}
      AND "state" = 'RUNNING'
  `;

  return result === 1;
}

export async function releasePipelineLease(
  conversationId: string,
  ownerId: string,
  finalState?: string,
): Promise<void> {
  await prisma.pipelineRun.updateMany({
    where: {
      conversationId,
      leaseOwner: ownerId,
    },
    data: {
      leaseOwner: null,
      leaseExpiresAt: null,
      ...(finalState ? { state: finalState } : {}),
    },
  });
}
```

### Important

The exact SQL syntax must match the deployed Prisma database provider. AutoCoder currently uses SQLite in the documented environment, so if SQLite does not accept `NOW()` use:

```ts
const now = new Date();
```

and bind it.

Do not blindly paste PostgreSQL syntax into SQLite.

---

# 5. Correct SQLite Lease Acquisition

For SQLite, prefer a transaction over raw database-specific timestamp expressions.

```ts
export async function acquirePipelineLease(
  conversationId: string,
): Promise<PipelineLease> {
  const ownerId = randomUUID();
  const now = new Date();
  const expires = new Date(now.getTime() + LEASE_MS);

  const acquired = await prisma.$transaction(async (tx) => {
    const run = await tx.pipelineRun.findUnique({
      where: { conversationId },
    });

    if (!run) {
      await tx.pipelineRun.create({
        data: {
          conversationId,
          state: 'RUNNING',
          leaseOwner: ownerId,
          leaseExpiresAt: expires,
        },
      });

      return true;
    }

    const leaseExpired =
      !run.leaseExpiresAt ||
      run.leaseExpiresAt.getTime() <= now.getTime();

    const available =
      run.leaseOwner === null ||
      leaseExpired ||
      run.state === 'QUEUED' ||
      run.state === 'PAUSED';

    if (!available) return false;

    await tx.pipelineRun.update({
      where: { conversationId },
      data: {
        state: 'RUNNING',
        leaseOwner: ownerId,
        leaseExpiresAt: expires,
        attempt: { increment: 1 },
      },
    });

    return true;
  });

  return {
    conversationId,
    ownerId,
    acquired,
  };
}
```

If multiple application processes are expected, verify the DB transaction isolation behavior before calling this complete.

---

# 6. Replace `activePipelines` as Authority

## Existing

```text
src/lib/agents/ruflo/orchestrator.ts
```

Current:

```ts
export const activePipelines = new Set<string>();
```

Keep it only as a local optimization.

Add:

```ts
const localActivePipelines = new Map<string, string>();
```

At orchestrator entry:

```ts
const lease = await acquirePipelineLease(conversationId);

if (!lease.acquired) {
  onEvent({
    type: 'PIPELINE_ATTACH',
    message: 'Pipeline is already owned by another execution.',
    data: { conversationId },
  });

  return;
}

localActivePipelines.set(
  conversationId,
  lease.ownerId,
);
```

At finalization:

```ts
finally {
  localActivePipelines.delete(conversationId);

  await releasePipelineLease(
    conversationId,
    lease.ownerId,
    finalPipelineState,
  );
}
```

Never launch an orchestrator based only on:

```ts
activePipelines.has(conversationId)
```

---

# 7. Fix SSE Launch Race

## File

```text
src/app/api/pipeline/stream/route.ts
```

Delete the authority of:

```ts
if (!activePipelines.has(conversationId)) {
```

Replace with:

```ts
const conversation = await prisma.conversation.findUnique({
  where: { id: conversationId },
});

if (
  conversation &&
  conversation.status !== 'Completed' &&
  conversation.status !== 'Failed' &&
  conversation.status !== 'Cancelled'
) {
  const result = await startPipelineIfUnowned(
    conversationId,
    userPrompt || conversation.originalPrompt || conversation.title,
  );

  if (!result.started) {
    sendEvent({
      type: 'AGENT_LOG',
      message: 'Connected to active pipeline execution.',
    });
  }
}
```

The helper:

```ts
export async function startPipelineIfUnowned(
  conversationId: string,
  prompt: string,
): Promise<{ started: boolean }> {
  const lease = await acquirePipelineLease(conversationId);

  if (!lease.acquired) {
    return { started: false };
  }

  runOrchestratorWithLease(
    conversationId,
    prompt,
    lease.ownerId,
  ).catch(async (error) => {
    await markPipelineFailed(
      conversationId,
      lease.ownerId,
      error,
    );
  });

  return { started: true };
}
```

The important property is:

```text
check + ownership acquisition
```

must be one state transition.

---

# 8. Phase 2: Separate Candidate Generation From Stage Completion

## Existing location

```text
src/lib/agents/ruflo/orchestrator.ts
```

Current generic `runAgent()` performs too many semantic jobs.

Refactor it into:

```ts
export interface StageCandidate {
  stage: string;
  executionId: string;
  attempt: number;
  content: string;
  contentHash: string;
  generatedAt: Date;
}
```

Then:

```ts
export async function generateStageCandidate(
  params: RunAgentParams,
): Promise<StageCandidate> {
  // inference
  // sanitize
  // return candidate
}
```

No:

```text
Completed
```

No authoritative VFS persistence.

No accepted-stage history.

---

# 9. Candidate Generation Code

```ts
export async function generateStageCandidate(
  params: RunAgentParams,
): Promise<StageCandidate> {
  const {
    conversationId,
    agentName,
    userPromptText,
    attempt,
    customUserContent,
    validationError,
    executionSignal,
  } = params;

  const executionId = randomUUID();

  const userContent = composeAgentUserContent({
    upstreamContext: await buildArtifactContext(
      conversationId,
      agentName,
    ),
    customUserContent,
    userPromptText,
    attempt,
    validationError,
  });

  const response = await runInference(
    [
      {
        role: 'system',
        content: params.systemInstructions,
      },
      {
        role: 'user',
        content: userContent,
      },
    ],
    {
      ...params.inferenceOptions,
      signal: executionSignal,
    },
  );

  const content = sanitizeStageOutput(
    response,
    EXPECTED_FIRST_HEADERS[agentName],
  );

  if (!content.trim()) {
    throw new Error(
      `${agentName} produced an empty candidate`,
    );
  }

  return {
    stage: agentName,
    executionId,
    attempt,
    content,
    contentHash: createContentHash(content),
    generatedAt: new Date(),
  };
}
```

---

# 10. Add Candidate Acceptance Contract

## New file

```text
src/lib/agents/ruflo/stage-acceptance.ts
```

```ts
export interface AcceptanceResult<T = unknown> {
  accepted: boolean;
  artifact?: T;
  errors: string[];
  warnings: string[];
}

export interface StageAcceptanceContext {
  conversationId: string;
  runId: string;
  candidate: StageCandidate;
}

export async function validateStageCandidate(
  ctx: StageAcceptanceContext,
): Promise<AcceptanceResult> {
  switch (ctx.candidate.stage) {
    case 'Architect':
      return validateArchitectCandidate(ctx);

    case 'Blueprinter':
      return validateBlueprinterCandidate(ctx);

    case 'Coder':
      return validateCoderCandidate(ctx);

    case 'Tester':
      return validateTesterCandidate(ctx);

    case 'Security':
      return validateSecurityCandidate(ctx);

    case 'Reviewer':
      return validateReviewerCandidate(ctx);

    default:
      return {
        accepted: true,
        errors: [],
        warnings: [],
      };
  }
}
```

---

# 11. Architect Acceptance Transaction

Current flow must become:

```text
generate candidate
  ↓
record candidate
  ↓
validate
  ↓
if invalid:
    candidate = REJECTED
    retry
  ↓
if valid:
    commit artifact
    mark ACCEPTED
    mark COMMITTED
    mark COMPLETED
```

Pseudo-code:

```ts
for (let attempt = 1; attempt <= MAX_ARCHITECT_ATTEMPTS; attempt++) {
  const candidate = await generateStageCandidate({
    ...
    attempt,
    persistOutput: false,
  });

  await recordStageCandidate({
    conversationId,
    runId,
    candidate,
  });

  await transitionStage(
    candidate.executionId,
    'RUNNING',
    'CANDIDATE',
  );

  await transitionStage(
    candidate.executionId,
    'CANDIDATE',
    'VALIDATING',
  );

  const validation =
    await validateArchitectOutput(
      conversationId,
      candidate.content,
    );

  if (!validation.valid) {
    await rejectStageCandidate({
      candidate,
      errors: validation.errors,
    });

    validationErrorFeedback =
      validation.errors.join('\n');

    continue;
  }

  await commitAcceptedArtifact({
    conversationId,
    stage: 'Architect',
    executionId: candidate.executionId,
    content: candidate.content,
  });

  break;
}
```

The key rule:

```text
NO Completed history row before commit.
```

---

# 12. Database: Add StageExecution

## File

```text
prisma/schema.prisma
```

Add:

```prisma
model StageExecution {
  id             String   @id @default(uuid())
  conversationId String
  pipelineRunId  String
  stageName      String
  attempt        Int
  state          String

  candidateHash  String?
  artifactPath   String?
  artifactVersion Int?

  validationErrors   String?
  validationWarnings String?

  startedAt      DateTime @default(now())
  completedAt    DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  conversation Conversation @relation(
    fields: [conversationId],
    references: [id],
    onDelete: Cascade
  )

  pipelineRun PipelineRun @relation(
    fields: [pipelineRunId],
    references: [id],
    onDelete: Cascade
  )

  @@index([conversationId, stageName])
  @@index([pipelineRunId, stageName])
  @@unique([pipelineRunId, stageName, attempt])
}
```

Add reverse relations:

```prisma
model PipelineRun {
  ...
  stageExecutions StageExecution[]
}
```

```prisma
model Conversation {
  ...
  stageExecutions StageExecution[]
}
```

Run:

```bash
npx prisma migrate dev --name add_stage_execution_state
npx prisma generate
```

---

# 13. Artifact Versioning

## File

```text
prisma/schema.prisma
```

Add:

```prisma
model ArtifactVersion {
  id             String   @id @default(uuid())
  conversationId String
  pipelineRunId  String
  stageExecutionId String

  stageName      String
  filePath       String
  version        Int

  contentHash    String
  content        String

  state          String
  createdAt      DateTime @default(now())

  conversation Conversation @relation(
    fields: [conversationId],
    references: [id],
    onDelete: Cascade
  )

  pipelineRun PipelineRun @relation(
    fields: [pipelineRunId],
    references: [id],
    onDelete: Cascade
  )

  stageExecution StageExecution @relation(
    fields: [stageExecutionId],
    references: [id],
    onDelete: Cascade
  )

  @@unique([conversationId, filePath, version])
  @@index([conversationId, stageName, state])
}
```

States:

```text
CANDIDATE
ACCEPTED
SUPERSEDED
INVALIDATED
```

Only `ACCEPTED` may become current VFS authority.

---

# 14. Commit Accepted Artifact

Create:

```text
src/lib/agents/ruflo/artifact-store.ts
```

```ts
export async function commitAcceptedArtifact(params: {
  conversationId: string;
  pipelineRunId: string;
  stageExecutionId: string;
  stage: string;
  filePath: string;
  content: string;
}) {
  const contentHash = createContentHash(
    params.content,
  );

  return prisma.$transaction(async (tx) => {
    const latest = await tx.artifactVersion.findFirst({
      where: {
        conversationId: params.conversationId,
        filePath: params.filePath,
      },
      orderBy: {
        version: 'desc',
      },
    });

    const version =
      (latest?.version ?? 0) + 1;

    if (latest) {
      await tx.artifactVersion.update({
        where: { id: latest.id },
        data: { state: 'SUPERSEDED' },
      });
    }

    const artifact =
      await tx.artifactVersion.create({
        data: {
          conversationId: params.conversationId,
          pipelineRunId: params.pipelineRunId,
          stageExecutionId: params.stageExecutionId,
          stageName: params.stage,
          filePath: params.filePath,
          version,
          contentHash,
          content: params.content,
          state: 'ACCEPTED',
        },
      });

    return artifact;
  });
}
```

Then materialize to VFS:

```ts
await writeVirtualFile(
  conversationId,
  filePath,
  content,
);
```

VFS becomes a materialized workspace.

Database artifact version is authoritative.

---

# 15. VFS Must Never Become Authoritative by Accidental Write

Any generic:

```ts
writeVirtualFile(
  conversationId,
  outputFilename,
  finalContent,
);
```

must be audited.

Allowed:

```text
accepted artifact → VFS
```

Forbidden:

```text
candidate → VFS
rejected candidate → VFS
parallel candidate → VFS
partial candidate → VFS
```

---

# 16. Phase 3: Correct Resume Semantics

## Existing bad pattern

```ts
const isAlreadyCompleted =
  await prisma.executionHistory.findFirst({
    where: {
      conversationId,
      stage: stageName,
      status: 'Completed',
    },
  });
```

Delete this as the source of truth.

Replace with:

```ts
const execution =
  await prisma.stageExecution.findFirst({
    where: {
      pipelineRunId: runId,
      stageName,
      state: 'COMPLETED',
    },
    orderBy: {
      attempt: 'desc',
    },
  });
```

Then verify:

```ts
if (!execution) {
  return false;
}

const artifact =
  await prisma.artifactVersion.findFirst({
    where: {
      stageExecutionId: execution.id,
      state: 'ACCEPTED',
    },
  });

return !!artifact;
```

---

# 17. Resume Must Check Invalidation

Before skipping:

```ts
const invalidated =
  await prisma.stageExecution.findFirst({
    where: {
      pipelineRunId: runId,
      stageName,
      state: 'INVALIDATED',
    },
  });

if (invalidated) {
  return false;
}
```

Also verify downstream dependencies have not changed.

---

# 18. Artifact Dependency Fingerprint

Create:

```ts
function createDependencyFingerprint(
  artifacts: Array<{
    path: string;
    hash: string;
    version: number;
  }>,
): string {
  return createContentHash(
    JSON.stringify(
      artifacts
        .sort((a, b) =>
          a.path.localeCompare(b.path)
        ),
    ),
  );
}
```

Store on `StageExecution`:

```prisma
inputFingerprint String?
```

When resuming:

```text
current upstream fingerprint
        ===
accepted execution inputFingerprint
```

If not equal:

```text
INVALIDATED
```

and rerun.

---

# 19. Phase 4: Event Sequencing

## Problem

Current:

```prisma
sequence Int @default(1)
```

for `ExecutionHistory`.

Do not use this table as the SSE event stream.

Create:

```prisma
model PipelineEvent {
  id             String   @id @default(uuid())
  conversationId String
  pipelineRunId  String
  sequence       Int

  eventType      String
  stageName      String?
  payload        String

  createdAt      DateTime @default(now())

  conversation Conversation @relation(
    fields: [conversationId],
    references: [id],
    onDelete: Cascade
  )

  pipelineRun PipelineRun @relation(
    fields: [pipelineRunId],
    references: [id],
    onDelete: Cascade
  )

  @@unique([pipelineRunId, sequence])
  @@index([conversationId, sequence])
}
```

---

# 20. Atomic Event Sequence

Create:

```text
src/lib/agents/ruflo/pipeline-events.ts
```

```ts
export async function appendPipelineEvent(params: {
  conversationId: string;
  pipelineRunId: string;
  eventType: string;
  stageName?: string;
  payload: unknown;
}) {
  return prisma.$transaction(async (tx) => {
    const latest =
      await tx.pipelineEvent.findFirst({
        where: {
          pipelineRunId: params.pipelineRunId,
        },
        orderBy: {
          sequence: 'desc',
        },
        select: {
          sequence: true,
        },
      });

    const sequence =
      (latest?.sequence ?? 0) + 1;

    return tx.pipelineEvent.create({
      data: {
        conversationId:
          params.conversationId,
        pipelineRunId:
          params.pipelineRunId,
        sequence,
        eventType:
          params.eventType,
        stageName:
          params.stageName,
        payload:
          JSON.stringify(params.payload),
      },
    });
  });
}
```

If concurrency can produce transaction retries, add a retry around unique-constraint conflicts.

---

# 21. SSE Must Read PipelineEvent

## File

```text
src/app/api/pipeline/stream/route.ts
```

Replace:

```ts
prisma.executionHistory.findMany(...)
```

with:

```ts
const events =
  await prisma.pipelineEvent.findMany({
    where: {
      pipelineRunId,
      ...(lastSeq > 0
        ? { sequence: { gt: lastSeq } }
        : {}),
    },
    orderBy: {
      sequence: 'asc',
    },
    take: 500,
  });
```

Replay:

```ts
for (const event of events) {
  sendEvent(
    {
      type: event.eventType,
      agent: event.stageName ?? undefined,
      ...JSON.parse(event.payload),
    },
    event.sequence,
  );
}
```

Now:

```text
Last-Event-ID
```

has a real event-log meaning.

---

# 22. Keep ExecutionHistory as Audit Only

`ExecutionHistory` may remain.

But rename its conceptual purpose:

```text
human-readable lifecycle/audit projection
```

Never use:

```text
findFirst(status = Completed)
```

for control flow.

---

# 23. Phase 5: Blueprinter Transactional Batching

## Existing

```ts
const batchPromises = batches.map(async (batchFiles) => {
  const res = await runAgent(
    conversationId,
    'Blueprinter',
    ...
  );

  return res ? res.content : '';
});

const batchOutputs =
  await Promise.all(batchPromises);
```

Change to:

```ts
const batchPromises = batches.map(
  async (batchFiles, batchIndex) => {
    const candidate =
      await generateStageCandidate({
        conversationId,
        agentName: 'Blueprinter',
        ...
        persistOutput: false,
      });

    return {
      batchIndex,
      candidate,
      files: batchFiles,
    };
  },
);

const batchCandidates =
  await Promise.all(batchPromises);
```

No candidate writes:

```text
blueprint.md
ExecutionHistory Completed
ArtifactVersion ACCEPTED
```

---

# 24. Validate All Blueprinter Candidates

```ts
const invalidCandidates =
  batchCandidates.filter(
    ({ candidate }) =>
      !validateBlueprintCandidate(candidate),
  );

if (invalidCandidates.length > 0) {
  throw new Error(
    `Blueprinter produced ${invalidCandidates.length} invalid batch candidates`,
  );
}
```

Then merge:

```ts
const finalBlueprintText =
  mergeBlueprintCandidates(
    batchCandidates.map(
      x => x.candidate.content,
    ),
  );
```

Validate aggregate:

```ts
const aggregateValidation =
  validateBlueprint(
    finalBlueprintText,
  );

if (!aggregateValidation.valid) {
  throw new Error(
    aggregateValidation.errors.join('\n'),
  );
}
```

Only then:

```ts
await commitAcceptedArtifact({
  ...
  stage: 'Blueprinter',
  filePath: 'blueprint.md',
  content: finalBlueprintText,
});
```

---

# 25. Blueprinter Invariant

The following must be impossible:

```text
Batch A accepted
Batch B rejected
Batch C absent
blueprint.md still written
```

The correct result is:

```text
NO aggregate commit
```

unless every required batch and the aggregate validator succeed.

---

# 26. Phase 6: Coder Acceptance

## Existing

```ts
const importCheck =
  runCrossFileImportCheck(crossFileMap);

if (!importCheck.success) {
  for (const err of importCheck.errors) {
    emit(...)
  }
}
```

If cross-file imports are authoritative, replace with:

```ts
if (!importCheck.success) {
  const message =
    importCheck.errors.join('\n');

  await markStageExecutionFailed(
    coderExecutionId,
    message,
  );

  throw new Error(
    `Coder cross-file contract failed:\n${message}`,
  );
}
```

If advisory behavior is intentionally desired, rename the API:

```ts
runCrossFileImportAdvisoryCheck()
```

Do not silently mix warning and acceptance semantics.

---

# 27. Coder Acceptance Gate

After all files are generated:

```ts
const projectValidation =
  await validateGeneratedProject(
    conversationId,
  );

if (!projectValidation.valid) {
  throw new Error(
    `Coder acceptance failed:\n${
      projectValidation.errors.join('\n')
    }`,
  );
}
```

Then:

```text
Coder = COMPLETED
```

not before.

---

# 28. Coder File Repair Loop

Current structure:

```ts
for (const targetFile of failingFiles) {
  const attempts =
    (fileRepairAttemptsMap.get(targetFile) || 0) + 1;
}
```

Replace with:

```ts
const MAX_FILE_REPAIRS = 2;

for (const targetFile of failingFiles) {
  let attempt = 0;
  let repaired = false;

  while (attempt < MAX_FILE_REPAIRS) {
    attempt++;

    const result =
      await repairCoderFile({
        conversationId,
        targetFile,
        attempt,
      });

    await writeVirtualFile(
      conversationId,
      targetFile,
      result.content,
    );

    const lint =
      await runLinter(
        targetFile,
        result.content,
      );

    if (lint.success) {
      repaired = true;
      break;
    }
  }

  if (!repaired) {
    throw new Error(
      `Coder repair exhausted for ${targetFile}`,
    );
  }
}
```

The retry count now corresponds to actual repeated attempts.

---

# 29. Phase 7: Tester ↔ Debugger Recursive Loop

Create:

```text
src/lib/agents/ruflo/verification-loop.ts
```

```ts
const MAX_DEBUG_CYCLES = 3;

export async function verifyAndRepairWorkspace(
  conversationId: string,
): Promise<void> {
  for (
    let cycle = 1;
    cycle <= MAX_DEBUG_CYCLES;
    cycle++
  ) {
    const testResult =
      await runFullWorkspaceTester(
        conversationId,
      );

    await persistTestRun(
      conversationId,
      cycle,
      testResult,
    );

    if (testResult.success) {
      return;
    }

    if (cycle === MAX_DEBUG_CYCLES) {
      throw new Error(
        `Workspace verification failed after ${MAX_DEBUG_CYCLES} cycles`,
      );
    }

    await runDebuggerRepairCycle(
      conversationId,
      testResult,
      cycle,
    );
  }
}
```

---

# 30. Tester Must Generate Versioned Result

```ts
interface VerificationResult {
  runId: string;
  cycle: number;
  workspaceFingerprint: string;
  success: boolean;
  failures: Array<{
    file: string;
    message: string;
    code?: string;
  }>;
}
```

Calculate:

```ts
const workspaceFingerprint =
  await hashVirtualWorkspace(
    conversationId,
  );
```

The test result is now tied to the exact workspace state.

---

# 31. Debugger Must Consume Exact Test Version

Debugger input:

```ts
await runDebuggerRepairCycle({
  conversationId,
  testRunId: testResult.runId,
  workspaceFingerprint:
    testResult.workspaceFingerprint,
  failures:
    testResult.failures,
});
```

Before repair:

```ts
const currentFingerprint =
  await hashVirtualWorkspace(
    conversationId,
  );

if (
  currentFingerprint !==
  expectedWorkspaceFingerprint
) {
  throw new Error(
    'Tester result is stale; refusing repair against changed workspace',
  );
}
```

This prevents stale repair instructions from modifying a newer workspace.

---

# 32. Full Tester Must Run After Debugger

Never:

```text
Debugger post-lint PASS
→ Security
```

Use:

```text
Debugger
  ↓
full Tester
  ↓
PASS?
 ├─ NO → Debugger
 └─ YES → Security
```

---

# 33. Repair Oscillation Detection

Use content hashes.

```ts
const seenHashes =
  new Map<string, Set<string>>();

function recordRepairHash(
  filePath: string,
  contentHash: string,
): boolean {
  const hashes =
    seenHashes.get(filePath)
    ?? new Set<string>();

  if (hashes.has(contentHash)) {
    return false;
  }

  hashes.add(contentHash);
  seenHashes.set(filePath, hashes);

  return true;
}
```

If:

```text
A → B → A
```

then stop.

```ts
throw new Error(
  `Repair oscillation detected for ${filePath}`,
);
```

---

# 34. Phase 8: Final Completion Gate

Create:

```text
src/lib/agents/ruflo/final-gate.ts
```

```ts
export interface FinalGateResult {
  valid: boolean;
  errors: string[];
}

export async function evaluateFinalPipelineGate(
  conversationId: string,
  pipelineRunId: string,
): Promise<FinalGateResult> {
  const errors: string[] = [];

  await requireLatestAcceptedStage(
    pipelineRunId,
    'Architect',
    errors,
  );

  await requireLatestAcceptedStage(
    pipelineRunId,
    'System',
    errors,
  );

  await requireLatestAcceptedStage(
    pipelineRunId,
    'Designer',
    errors,
  );

  await requireLatestAcceptedStage(
    pipelineRunId,
    'Blueprinter',
    errors,
  );

  await requireCoderAcceptance(
    pipelineRunId,
    errors,
  );

  await requireLatestTesterPass(
    pipelineRunId,
    errors,
  );

  await requireNoUnresolvedDebuggerFailures(
    pipelineRunId,
    errors,
  );

  await requireSecurityPass(
    pipelineRunId,
    errors,
  );

  await requireReviewerPass(
    pipelineRunId,
    errors,
  );

  await requireVersionCoherence(
    pipelineRunId,
    errors,
  );

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

---

# 35. Final Completion Transaction

Do not simply:

```ts
conversation.status = 'Completed'
```

Use:

```ts
const gate =
  await evaluateFinalPipelineGate(
    conversationId,
    pipelineRunId,
  );

if (!gate.valid) {
  throw new Error(
    `Final pipeline gate failed:\n${
      gate.errors.join('\n')
    }`,
  );
}

await prisma.$transaction(async tx => {
  await tx.pipelineRun.update({
    where: { id: pipelineRunId },
    data: {
      state: 'COMPLETED',
      leaseOwner: null,
      leaseExpiresAt: null,
    },
  });

  await tx.conversation.update({
    where: { id: conversationId },
    data: {
      status: 'Completed',
      currentStage: 'Reviewer',
    },
  });
});
```

---

# 36. Final Completion Invariant

This must be tested:

```text
Conversation.status = Completed
```

must imply:

```text
PipelineRun.state = COMPLETED
```

and:

```text
latest accepted artifacts exist
```

and:

```text
latest Tester = PASS
latest Security = PASS
latest Reviewer = PASS
```

and:

```text
no active lease
```

and:

```text
no invalidated current stage
```

---

# 37. Phase 9: Replace `qualityGateOverride`

Current:

```prisma
qualityGateOverride Boolean @default(false)
```

Replace with explicit gate decision:

```prisma
model GateDecision {
  id             String   @id @default(uuid())
  conversationId String
  pipelineRunId  String
  stageName      String
  gateName       String
  decision       String
  actor          String
  artifactVersion Int?
  reason         String?
  createdAt      DateTime @default(now())

  conversation Conversation @relation(
    fields: [conversationId],
    references: [id],
    onDelete: Cascade
  )

  pipelineRun PipelineRun @relation(
    fields: [pipelineRunId],
    references: [id],
    onDelete: Cascade
  )

  @@index([conversationId, gateName])
}
```

Architecture approval:

```text
gateName = ARCHITECT_APPROVAL
decision = APPROVED
actor = USER
```

Final quality:

```text
gateName = FINAL_QUALITY
decision = PASS
actor = SYSTEM
```

Never reuse one boolean for unrelated semantics.

---

# 38. Resume Approval

Resume must verify:

```ts
const approval =
  await prisma.gateDecision.findFirst({
    where: {
      pipelineRunId,
      gateName: 'ARCHITECT_APPROVAL',
      stageName: 'Architect',
      decision: 'APPROVED',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

if (!approval) {
  throw new Error(
    'Architect approval is required before resuming.',
  );
}
```

---

# 39. Phase 10: Canonical VFS Path Resolution

## Files

```text
src/lib/agents/ruflo/linter.ts
src/lib/agents/ruflo/project-validator.ts
src/lib/agents/ruflo/vfs.ts
```

Remove authoritative suffix matching:

```ts
cleanName.endsWith('/' + key)
```

Replace with:

```ts
function normalizeWorkspacePath(
  filePath: string,
): string {
  return filePath
    .replaceAll('\\', '/')
    .replace(/^\.\/+/, '')
    .replace(/\/+/g, '/')
    .trim();
}
```

Then:

```ts
const normalized =
  normalizeWorkspacePath(filePath);

const content =
  fileMap.get(normalized);
```

No basename fallback for authoritative validation.

---

# 40. Reject Ambiguous Paths

Add:

```ts
function resolveUniqueWorkspacePath(
  fileMap: Map<string, string>,
  requested: string,
): string {
  const normalized =
    normalizeWorkspacePath(requested);

  if (fileMap.has(normalized)) {
    return normalized;
  }

  const matches =
    [...fileMap.keys()].filter(
      p => normalizeWorkspacePath(p) === normalized,
    );

  if (matches.length > 1) {
    throw new Error(
      `Ambiguous workspace path: ${requested}`,
    );
  }

  throw new Error(
    `Workspace file not found: ${requested}`,
  );
}
```

---

# 41. Phase 11: Token Budget Fix

## File

```text
src/lib/agents/ruflo/token-budgeter.ts
```

Replace generic bullet counting with section-aware extraction.

```ts
function countSectionItems(
  markdown: string,
  sectionName: string,
): number {
  const escaped =
    sectionName.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&',
    );

  const match =
    markdown.match(
      new RegExp(
        `^#{1,4}\\s*${escaped}\\s*$([\\s\\S]*?)(?=^#{1,4}\\s+|$)`,
        'im',
      ),
    );

  if (!match) return 0;

  return match[1]
    .split('\n')
    .filter(line =>
      /^\s*(?:[-*]|\d+\.)\s+/.test(line),
    )
    .length;
}
```

Use:

```ts
const featuresCount =
  countSectionItems(
    taskSpecContent,
    'Features',
  );

const fileCount =
  countSectionItems(
    architectureContent,
    'Project Folder Structure',
  );
```

Do not use arbitrary document bullet counts.

---

# 42. Remove 400-Hour Timeout

## File

```text
src/lib/agents/ruflo/token-budgeter.ts
src/lib/agents/inference.ts
```

Delete:

```ts
const timeoutMs = 1440000000;
```

Use stage-aware defaults:

```ts
export const DEFAULT_STAGE_TIMEOUT_MS = {
  Queen: 60_000,
  Planner: 90_000,
  Architect: 120_000,
  System: 120_000,
  Designer: 120_000,
  Blueprinter: 180_000,
  Coder: 180_000,
  Tester: 120_000,
  Debugger: 180_000,
  Security: 120_000,
  Reviewer: 120_000,
} as const;
```

For local models, allow configuration:

```ts
const timeoutMs =
  options.timeoutMs ??
  DEFAULT_STAGE_TIMEOUT_MS[agentName] ??
  120_000;
```

---

# 43. Timeout Classification

Add:

```ts
export type FailureKind =
  | 'MODEL_TIMEOUT'
  | 'MODEL_UNAVAILABLE'
  | 'MODEL_INVALID_OUTPUT'
  | 'VALIDATION_FAILURE'
  | 'PERSISTENCE_FAILURE'
  | 'CONCURRENCY_FAILURE'
  | 'CANCELLED';
```

Do not convert all failures into generic:

```text
Failed
```

The recovery strategy depends on failure kind.

---

# 44. Phase 12: Structured Artifact Provenance

`buildArtifactContext()` currently returns only a string.

Change it to:

```ts
export interface ArtifactContextEntry {
  path: string;
  version: number;
  contentHash: string;
  content: string;
}
```

Return:

```ts
export interface ArtifactContext {
  entries: ArtifactContextEntry[];
  missing: string[];
}
```

Then render:

```ts
function renderArtifactContext(
  context: ArtifactContext,
): string {
  return context.entries
    .map(entry =>
      [
        `=== ARTIFACT: ${entry.path} ===`,
        `VERSION: ${entry.version}`,
        `HASH: ${entry.contentHash}`,
        entry.content,
        `=== END ARTIFACT: ${entry.path} ===`,
      ].join('\n'),
    )
    .join('\n\n');
}
```

Telemetry now records actual entries rather than:

```ts
userContent.includes(marker)
```

---

# 45. Context Invariant

Replace:

```ts
userContent.includes(
  `=== ARTIFACT: ${artifact} ===`
)
```

with:

```ts
const requiredArtifacts =
  STAGE_ARTIFACT_DEPS[agentName] ?? [];

const missing =
  requiredArtifacts.filter(
    required =>
      !artifactContext.entries.some(
        entry =>
          entry.path === required,
      ),
  );

if (missing.length > 0) {
  throw new Error(
    `Missing required artifacts: ${missing.join(', ')}`,
  );
}
```

The context object becomes the authority.

---

# 46. Phase 13: Remove Duplicate Persistence

Audit:

```text
runAgent()
StageLedger.write()
writeExecutiveMemoryRecord()
writeAgentOutput()
writeVirtualFile()
Stage-specific output tables
```

For every stage decide:

```text
candidate store
accepted artifact store
materialized VFS
event store
audit projection
```

Recommended:

```text
StageExecution      = lifecycle
ArtifactVersion     = accepted/candidate artifact
VirtualFile         = workspace projection
PipelineEvent       = event stream
ExecutionHistory    = audit projection
ExecutiveMemory     = derived historical reasoning
```

No component should independently declare authority.

---

# 47. ExecutiveMemory Rule

`ExecutiveMemory` may store:

```text
reasoning
inference identity
consumed artifact IDs
historical outputs
repair history
```

It must not decide:

```text
whether a stage is complete
whether an artifact is current
whether a pipeline owns a conversation
```

Those belong elsewhere.

---

# 48. Phase 14: Tester Report Versioning

Add:

```prisma
model VerificationRun {
  id                String   @id @default(uuid())
  conversationId    String
  pipelineRunId     String
  stageExecutionId  String
  cycle             Int

  workspaceHash     String
  success           Boolean

  failuresJson      String
  warningsJson      String

  createdAt         DateTime @default(now())

  @@index([conversationId, cycle])
  @@index([pipelineRunId, cycle])
}
```

Every Tester result gets one row.

`test_report.md` becomes a rendered projection.

---

# 49. Tester Must Not Mutate Its Own Evidence

Tester should:

```text
read workspace
 ↓
compute result
 ↓
persist VerificationRun
 ↓
render test_report.md
```

Never:

```text
test report
 ↓
edit report
 ↓
call report itself authoritative
```

---

# 50. Debugger Must Reference VerificationRun

Debugger record:

```text
inputVerificationRunId
inputWorkspaceHash
repairCount
outputWorkspaceHash
```

If workspace hash changed before repair:

```text
abort stale repair
```

---

# 51. Phase 15: Final Recursive Test Harness

Create:

```text
scripts/pipeline_recursive_verification.ts
```

Structure:

```ts
interface TestCase {
  id: string;
  description: string;
  setup: (
    ctx: TestContext
  ) => Promise<void>;
  execute: (
    ctx: TestContext
  ) => Promise<void>;
  assert: (
    ctx: TestContext
  ) => Promise<void>;
}
```

---

# 52. Test Context

```ts
interface TestContext {
  conversationId: string;
  pipelineRunId: string;
  artifacts: Map<string, string>;
  events: any[];
  history: any[];
}
```

Helper:

```ts
async function assertNoFalseCompletion(
  conversationId: string,
) {
  const invalid =
    await prisma.stageExecution.findMany({
      where: {
        conversationId,
        state: 'COMPLETED',
        NOT: {
          artifactVersions: {
            some: {
              state: 'ACCEPTED',
            },
          },
        },
      },
    });

  if (invalid.length) {
    throw new Error(
      `False stage completion detected: ${
        invalid.map(x => x.id).join(', ')
      }`,
    );
  }
}
```

---

# 53. Recursive Test Level 0

Pure state transitions.

```ts
for (const from of STAGE_STATES) {
  for (const to of STAGE_STATES) {
    const allowed =
      canTransition(from, to);

    const expected =
      transitionOracle(from, to);

    assert.equal(
      allowed,
      expected,
      `${from} -> ${to}`,
    );
  }
}
```

Must include:

```text
REJECTED → COMPLETED = false
CANDIDATE → COMPLETED = false
INVALIDATED → COMPLETED = false
FAILED → COMPLETED = false
```

---

# 54. Recursive Test Level 1: Architect

Cases:

```text
empty
missing Tech Stack
missing Project Folder Structure
missing Modules
missing Conventions
invalid route [...]
valid route [...slug]
invalid src/public
orphan file
duplicate ownership
unknown dependency
self dependency
dependency cycle
technology-as-module
case mismatch
```

Every invalid case must:

```text
reject
NOT write architecture.md
NOT mark Completed
NOT advance stage
```

---

# 55. Recursive Test Level 2: Persistence

For every stage:

```text
candidate
 ↓
reject
```

Assert:

```text
no accepted artifact
no VFS authoritative mutation
no Completed stage
```

Then:

```text
candidate
 ↓
accept
```

Assert:

```text
one accepted artifact
one current VFS projection
one completed stage
```

---

# 56. Recursive Test Level 3: Resume

Create:

```text
accepted Stage A
rejected Stage B candidate
```

Restart process.

Resume.

Assert:

```text
Stage B runs again.
```

Never:

```text
Stage B skipped
```

because a rejected attempt generated historical `Completed`.

---

# 57. Recursive Test Level 4: Dependency Invalidation

Create:

```text
Architect V1
System V1
Designer V1
```

Modify:

```text
Architect → V2
```

Assert:

```text
System V1 = INVALIDATED
Designer V1 = INVALIDATED
Blueprinter V1 = INVALIDATED
Coder V1 = INVALIDATED
Tester V1 = INVALIDATED
```

Only dependent stages invalidate.

---

# 58. Recursive Test Level 5: Concurrency

Start:

```ts
await Promise.all([
  startPipelineIfUnowned(id, prompt),
  startPipelineIfUnowned(id, prompt),
]);
```

Assert:

```text
started === 1
attached === 1
```

Database:

```text
PipelineRun count = 1
active lease owners = 1
```

---

# 59. Recursive Test Level 6: SSE

Generate:

```text
100 events
```

Connect.

Disconnect at event:

```text
47
```

Reconnect:

```text
Last-Event-ID = 47
```

Assert:

```text
events 48..100 exactly once
```

No:

```text
duplicate
missing
reordered
```

---

# 60. Recursive Test Level 7: Blueprinter

Create 10 batches.

Inject:

```text
batch 6 invalid
```

Assert:

```text
blueprint.md unchanged
no accepted Blueprinter artifact
stage != COMPLETED
```

Then fix batch 6.

Assert:

```text
exactly one accepted aggregate artifact
```

---

# 61. Recursive Test Level 8: Debugger

Inject:

```text
file A syntax failure
```

Assert:

```text
Tester fail
Debugger repair
Tester rerun
Tester pass
```

Inject repair failure twice.

Assert:

```text
two repairs
third repair forbidden
pipeline fails/pauses
```

---

# 62. Recursive Test Level 9: Oscillation

Inject:

```text
A → B → A
```

Assert:

```text
repair loop stops
reason = oscillation detected
```

No infinite loop.

---

# 63. Recursive Test Level 10: Process Restart

During each stage:

```text
generate candidate
```

then terminate process.

Restart.

Assert:

```text
candidate state is recoverable
accepted state is recoverable
rejected state is retryable
lease is recoverable after expiry
```

---

# 64. Recursive Test Level 11: Full Pipeline

Run:

```text
Queen
Planner
Architect
System
Designer
Blueprinter
Coder
Tester
Debugger
Security
Reviewer
```

With:

```text
real VFS
real Prisma
mocked inference
```

Assert:

```text
all accepted artifacts version-consistent
all stage executions valid
no duplicate owner
no false Completed
no orphan current artifact
final gate PASS
```

---

# 65. Recursive Test Level 12: Real Model

Run the exact same test corpus with:

```text
MOCK_INFERENCE=false
```

and Ollama.

Capture:

```text
model
temperature
token budget
timeout
input fingerprint
output hash
validation
retry count
```

No test may depend on the model producing a particular stylistic response.

Only contracts matter.

---

# 66. Recursive Mutation Testing

After all tests pass, mutate the implementation intentionally.

Each mutation must cause the corresponding test to fail.

## Mutation M1

Remove Architect validation.

Expected:

```text
Architect adversarial tests fail.
```

## Mutation M2

Write rejected candidate to VFS.

Expected:

```text
transactional candidate tests fail.
```

## Mutation M3

Change lease acquisition to `activePipelines.has`.

Expected:

```text
concurrency test fails.
```

## Mutation M4

Return old history Completed.

Expected:

```text
resume test fails.
```

## Mutation M5

Disable full Tester rerun.

Expected:

```text
Debugger recursive test fails.
```

## Mutation M6

Allow Coder import errors.

Expected:

```text
Coder acceptance test fails.
```

## Mutation M7

Set event sequence to default 1.

Expected:

```text
SSE replay test fails.
```

## Mutation M8

Permit `REJECTED → COMPLETED`.

Expected:

```text
state-machine test fails.
```

---

# 67. Recursive Verification Rule

The implementation is not considered fixed because:

```text
tests pass
```

It is fixed when:

```text
tests pass
AND
adversarial tests pass
AND
mutation tests fail correctly
AND
process restart tests pass
AND
concurrency tests pass
AND
real-model tests pass
AND
generated-project build passes
AND
final artifact provenance is complete
```

---

# 68. Generated Project Final Gate

For every successful whole-pipeline run:

```bash
npm install
npm run build
npm test
```

if those scripts exist.

Otherwise detect package scripts:

```ts
const scripts =
  packageJson.scripts ?? {};

if (scripts.build) {
  await run('npm run build');
}

if (scripts.test) {
  await run('npm test');
}
```

Also run:

```text
TypeScript compiler
framework-specific validation
route validation
dependency validation
security validation
runtime smoke probe
```

---

# 69. Final Provenance Audit

At completion generate:

```json
{
  "pipelineRunId": "...",
  "conversationId": "...",
  "stages": [
    {
      "stage": "Architect",
      "executionId": "...",
      "attempt": 2,
      "inputFingerprint": "...",
      "artifactVersion": 4,
      "artifactHash": "...",
      "state": "COMPLETED"
    }
  ],
  "finalWorkspaceHash": "...",
  "testerRunId": "...",
  "securityRunId": "...",
  "reviewerRunId": "..."
}
```

This becomes the machine-readable proof of completion.

---

# 70. Completion Proof Function

Create:

```ts
export async function buildCompletionProof(
  pipelineRunId: string,
) {
  const run =
    await prisma.pipelineRun.findUnique({
      where: { id: pipelineRunId },
    });

  if (!run) {
    throw new Error(
      'Pipeline run not found',
    );
  }

  const executions =
    await prisma.stageExecution.findMany({
      where: {
        pipelineRunId,
      },
      orderBy: {
        stageName: 'asc',
      },
    });

  const artifacts =
    await prisma.artifactVersion.findMany({
      where: {
        pipelineRunId,
        state: 'ACCEPTED',
      },
    });

  const tests =
    await prisma.verificationRun.findMany({
      where: {
        pipelineRunId,
      },
      orderBy: {
        cycle: 'desc',
      },
    });

  return {
    pipelineRunId,
    state: run.state,
    executions,
    artifacts,
    latestVerification: tests[0] ?? null,
  };
}
```

---

# 71. Static Forbidden-Pattern Scan

Add:

```text
scripts/check_pipeline_invariants.ts
```

Scan source for dangerous patterns.

Examples:

```ts
const FORBIDDEN = [
  /status:\s*['"]Completed['"]/,
  /executionHistory\.findFirst/,
  /activePipelines\.has\(conversationId\).*runOrchestrator/,
  /sequence:\s*1/,
  /endsWith\(['"]\/['"]\s*\+/,
];
```

Do not blindly forbid every occurrence.

The scanner should report:

```text
file
line
pattern
allowed annotation
```

Then manually classify.

The goal is to prevent regressions.

---

# 72. Stage Contract Test Template

Every stage must have:

```ts
describe('Stage contract: X', () => {
  test('does not complete on empty candidate', ...);

  test('does not complete on invalid candidate', ...);

  test('does not mutate authoritative artifact on rejection', ...);

  test('commits exactly one accepted artifact', ...);

  test('resume skips only accepted current execution', ...);

  test('upstream invalidation invalidates X', ...);
});
```

This should exist for all 11 stages.

---

# 73. Exact Acceptance Rules by Stage

| Stage | Candidate | Acceptance |
|---|---|---|
| Queen | `plan.md` | schema + required sections |
| Planner | `requirements.md` | requirement contract |
| Architect | `architecture.md` | architecture contract |
| System | `backend_spec.md` | API/DB contract |
| Designer | `ui_spec.md` | design/component contract |
| Blueprinter | `blueprint.md` | aggregate file/dependency contract |
| Coder | workspace | compiler + import + structural contract |
| Tester | verification run | full workspace verification |
| Debugger | workspace mutation | fresh Tester pass |
| Security | security report | deterministic security gate |
| Reviewer | review report | final quality gate |

No stage gets:

```text
generic inference success = acceptance
```

---

# 74. Exact Stage Dependency Rule

Define:

```ts
const STAGE_DEPENDENCIES = {
  Queen: [],
  Planner: ['Queen'],
  Architect: ['Queen', 'Planner'],
  System: ['Architect'],
  Designer: ['Architect', 'System'],
  Blueprinter: ['Architect', 'System', 'Designer'],
  Coder: ['Blueprinter'],
  Tester: ['Coder'],
  Debugger: ['Tester'],
  Security: ['Coder', 'Tester'],
  Reviewer: [
    'Queen',
    'Planner',
    'Architect',
    'System',
    'Designer',
    'Blueprinter',
    'Coder',
    'Tester',
    'Debugger',
    'Security',
  ],
} as const;
```

Before a stage starts:

```ts
await assertStageDependenciesAccepted(
  pipelineRunId,
  stage,
);
```

This prevents accidental downstream execution against stale artifacts.

---

# 75. Dependency Assertion

```ts
async function assertStageDependenciesAccepted(
  pipelineRunId: string,
  stage: PipelineStage,
) {
  for (
    const dependency
    of STAGE_DEPENDENCIES[stage]
  ) {
    const accepted =
      await getLatestAcceptedExecution(
        pipelineRunId,
        dependency,
      );

    if (!accepted) {
      throw new Error(
        `${stage} cannot start: ${dependency} is not accepted`,
      );
    }
  }
}
```

---

# 76. No Implicit Stage Fast-Forward

Delete logic equivalent to:

```ts
if (
  history says Completed
) {
  skip();
}
```

Replace with:

```ts
if (
  await isCurrentAcceptedStage(
    pipelineRunId,
    stage,
  )
) {
  fastForward();
} else {
  execute();
}
```

---

# 77. Artifact Version Coherence

Before Coder:

```text
blueprint version N
architecture version M
system version P
designer version Q
```

Coder execution records those versions.

If Blueprint changes:

```text
Coder execution input fingerprint no longer matches.
```

Therefore Coder must rerun.

---

# 78. Final Reviewer Must Reference Workspace Hash

Reviewer acceptance should store:

```text
workspaceHash
```

Then final gate verifies:

```ts
review.workspaceHash ===
currentWorkspaceHash
```

If not:

```text
Reviewer invalidated.
```

This prevents:

```text
review old code
modify code
still call pipeline Completed
```

---

# 79. Security Must Reference Workspace Hash

Same rule:

```text
Security PASS
```

must correspond to:

```text
current workspace hash
```

Otherwise Security must rerun.

---

# 80. Tester Must Reference Workspace Hash

Same:

```text
Tester PASS
```

is valid only for:

```text
exact workspace hash
```

This is the simplest way to eliminate stale verification.

---

# 81. Final Gate Version Matrix

At finalization:

```ts
const currentHash =
  await hashVirtualWorkspace(
    conversationId,
  );

assertHash(
  tester.workspaceHash,
  currentHash,
);

assertHash(
  security.workspaceHash,
  currentHash,
);

assertHash(
  reviewer.workspaceHash,
  currentHash,
);
```

If any mismatch:

```text
FINAL GATE FAIL
```

---

# 82. Physical Disk Must Be a Projection

Current pipeline flushes:

```text
VFS → physical disk
```

Keep this.

But final proof must verify:

```text
VFS hash
===
physical disk hash
```

Create:

```ts
async function verifyDiskProjection(
  conversationId: string,
) {
  const vfs =
    await listVirtualFiles(
      conversationId,
    );

  for (const file of vfs) {
    const diskContent =
      await readProjectFile(
        conversationId,
        file.filePath,
      );

    if (
      createContentHash(file.content)
      !== createContentHash(diskContent)
    ) {
      throw new Error(
        `VFS/disk divergence: ${file.filePath}`,
      );
    }
  }
}
```

---

# 83. Physical Disk Must Never Be Read as Authority

Do not let downstream agents choose:

```text
VFS or disk
```

They should read:

```text
VFS
```

Disk exists for:

```text
IDE
build
preview
export
```

This closes another possible state fork.

---

# 84. Abort Semantics

`abortPipelineExecution()` must:

```text
cancel inference
invalidate active candidate
release lease
mark PipelineRun CANCELLED
mark Conversation Cancelled
```

Do not merely:

```ts
activePipelines.delete()
```

The persistent run must agree.

---

# 85. Lease Recovery

On startup:

```ts
const staleRuns =
  await prisma.pipelineRun.findMany({
    where: {
      state: 'RUNNING',
      leaseExpiresAt: {
        lt: new Date(),
      },
    },
  });
```

For each:

```ts
state = PAUSED
leaseOwner = null
leaseExpiresAt = null
```

Then emit:

```text
PIPELINE_RECOVERY_REQUIRED
```

Never silently rerun from scratch.

---

# 86. Process Restart Test

Test:

```text
RUNNING
lease owner A
process dies
lease expires
process B starts
```

Expected:

```text
B acquires lease
B reads accepted StageExecution
B resumes from first non-accepted stage
```

Not:

```text
B starts Queen again
```

and not:

```text
B sees old history Completed and skips invalid stage
```

---

# 87. Database Migration Sequence

Do migrations incrementally.

```bash
npx prisma migrate dev --name add_stage_execution
npx prisma migrate dev --name add_artifact_version
npx prisma migrate dev --name add_pipeline_events
npx prisma migrate dev --name add_gate_decisions
npx prisma migrate dev --name add_verification_runs
```

Then:

```bash
npx prisma generate
npx tsc --noEmit
```

Do not make one giant migration while simultaneously rewriting the orchestrator.

That is how archaeology becomes a production incident.

---

# 88. Implementation Commit Sequence

Use small commits.

```text
1. feat(state): add canonical stage lifecycle
2. feat(pipeline): activate persistent PipelineRun lease
3. fix(stream): remove duplicate launch race
4. feat(stage): separate candidate generation from acceptance
5. feat(artifact): add versioned artifact store
6. fix(resume): require accepted current stage execution
7. feat(events): add PipelineEvent sequence
8. fix(sse): replay canonical pipeline events
9. fix(blueprinter): transactional batch aggregation
10. fix(coder): enforce cross-file acceptance
11. fix(coder): implement real bounded repair loop
12. feat(tester): version verification runs
13. feat(debugger): full Tester-Debugger recursion
14. feat(gates): add explicit gate decisions
15. fix(vfs): canonical path resolution
16. fix(inference): bounded stage-aware timeouts
17. feat(gate): add final completion proof
18. test(pipeline): add adversarial state-machine suite
19. test(pipeline): add concurrency/restart suite
20. test(pipeline): add mutation suite
```

---

# 89. Per-Commit Verification

After every commit:

```bash
npx prisma generate
npx tsc --noEmit
npm test
```

Then targeted:

```bash
npx vitest run src/lib/agents/ruflo/__tests__
```

Do not wait until commit 20 to discover commit 3 broke the build.

---

# 90. Full Verification Command Set

Final:

```bash
npx prisma generate
npx prisma validate
npx tsc --noEmit
npm test
npm run build
npx tsx scripts/pipeline_recursive_verification.ts
npx tsx scripts/uat_verify.ts
```

Then real-model:

```bash
MOCK_INFERENCE=false npx tsx scripts/pipeline_recursive_verification.ts
```

Then mutation:

```bash
npx tsx scripts/pipeline_mutation_verification.ts
```

---

# 91. Required Test Output

Every run must print:

```text
PIPELINE RUN
============

runId:
conversationId:

[STATE]
lease:
currentStage:
pipelineState:

[STAGES]
Queen       PASS
Planner     PASS
Architect   PASS
System      PASS
Designer    PASS
Blueprinter PASS
Coder       PASS
Tester      PASS
Debugger    PASS
Security    PASS
Reviewer    PASS

[ARTIFACTS]
accepted:
rejected:
invalidated:

[EVENTS]
total:
duplicates:
missing:
out_of_order:

[CONCURRENCY]
owners:
duplicate_launches:

[RESUME]
false_skips:
stale_completions:

[FINAL]
workspaceHash:
testerHash:
securityHash:
reviewerHash:

FINAL GATE: PASS
```

---

# 92. Zero-Loophole Assertions

Add these as hard assertions.

```ts
assert(
  completedStageHasAcceptedArtifact,
);

assert(
  rejectedStageHasNoAcceptedArtifact,
);

assert(
  onlyOnePipelineOwner,
);

assert(
  currentStageDependenciesAccepted,
);

assert(
  finalVerificationHashesMatchWorkspace,
);

assert(
  noCurrentArtifactIsInvalidated,
);

assert(
  noCompletedStageHasStaleInputFingerprint,
);

assert(
  noPipelineEventSequenceDuplicates,
);

assert(
  noPipelineEventSequenceGaps,
);

assert(
  diskMatchesVfs,
);
```

---

# 93. Recursive Fuzzing

Generate mutations against:

```text
plan.md
requirements.md
architecture.md
backend_spec.md
ui_spec.md
blueprint.md
generated code
test reports
security report
review report
```

Mutation classes:

```text
delete section
duplicate section
rename section
delete file
duplicate file
change dependency
add unknown dependency
remove dependency
case variation
path traversal
invalid route
wrong framework
wrong database
wrong import
wrong export
stale artifact
empty artifact
truncated artifact
malformed Markdown
```

Each mutation gets:

```text
expected acceptance state
actual acceptance state
```

---

# 94. Recursive Fuzz Oracle

For each mutation:

```ts
const result =
  await runPipelineValidation(
    mutatedArtifact,
  );

assert.equal(
  result.valid,
  expected.valid,
  `Mutation ${mutation.id}`,
);
```

For lifecycle mutations:

```ts
assert.equal(
  pipelineState,
  expectedPipelineState,
);
```

---

# 95. "Flawless" Definition

The pipeline is considered hardened only when all of these are true:

```text
[ ] One persistent pipeline owner
[ ] No duplicate orchestrator launch
[ ] Candidate != accepted artifact
[ ] Rejected candidate cannot become current
[ ] Completed requires accepted artifact
[ ] Resume never trusts historical Completed alone
[ ] Stage dependencies are version checked
[ ] Artifact versions are explicit
[ ] Verification results are workspace-versioned
[ ] Tester reruns after Debugger
[ ] Debugger has real bounded retry
[ ] Repair oscillation is detected
[ ] Blueprinter batches are transactional
[ ] Coder cross-file failure blocks acceptance
[ ] SSE has canonical monotonic sequence
[ ] SSE reconnect has exact replay
[ ] Process restart is recoverable
[ ] Lease expiry is recoverable
[ ] VFS is canonical workspace projection
[ ] Disk cannot diverge silently
[ ] Security result matches current workspace
[ ] Reviewer result matches current workspace
[ ] Final gate checks all accepted versions
[ ] Final completion is transactional
[ ] Quality approval is explicit
[ ] Timeouts are bounded
[ ] Path identity is canonical
[ ] Mutation tests prove validators matter
[ ] Real-model UAT passes
[ ] Generated projects build
[ ] Generated projects runtime-probe
[ ] No forbidden state shortcuts remain
```

---

# 96. Recursive Closure Protocol

After implementation:

## Pass 1

Run:

```text
unit
typecheck
build
mock UAT
```

Fix every failure.

## Pass 2

Run:

```text
adversarial
concurrency
resume
restart
SSE
```

Fix every failure.

## Pass 3

Run:

```text
mutation tests
```

If a mutation survives:

```text
validator is insufficient
```

Fix it.

## Pass 4

Run:

```text
real Ollama
```

Fix every model-induced contract failure.

## Pass 5

Run:

```text
generated project
build
test
runtime
security
```

Fix every failure.

## Pass 6

Restart the process at every stage boundary.

Fix every recovery failure.

## Pass 7

Run all previous passes again from a clean database.

---

# 97. Clean-Room Verification

Final verification must begin from:

```bash
rm -rf projects/*
rm -rf test-results/*
```

and a fresh test database.

Then:

```bash
npx prisma migrate reset
npx prisma generate
npm ci
npm test
npm run build
```

Run the entire suite.

This prevents stale artifacts from producing fake passes.

---

# 98. Final Source Scan

After everything passes:

```bash
rg "status:\s*['\"]Completed['\"]" src/
rg "executionHistory\.findFirst" src/
rg "activePipelines\.has" src/
rg "sequence:\s*1" src/
rg "endsWith\(" src/lib/agents/ruflo/
rg "qualityGateOverride" src/
rg "writeVirtualFile" src/lib/agents/ruflo/
rg "runAgent\(" src/lib/agents/ruflo/
```

Every remaining match must be classified:

```text
SAFE
REQUIRED
LEGACY
BUG
```

No unexplained match survives.

---

# 99. Final Architecture

After remediation the architecture should be:

```text
                         ┌───────────────────┐
                         │      User         │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │ PipelineRun Lease │
                         └─────────┬─────────┘
                                   │
                                   ▼
                       ┌───────────────────────┐
                       │ Stage State Machine   │
                       └──────────┬────────────┘
                                  │
                     ┌────────────┴────────────┐
                     │                         │
                     ▼                         ▼
               Candidate                  Input Artifacts
                     │                         │
                     └────────────┬────────────┘
                                  ▼
                         Deterministic Validator
                                  │
                         ┌────────┴────────┐
                         │                 │
                      REJECT            ACCEPT
                         │                 │
                         ▼                 ▼
                       Retry         ArtifactVersion
                                           │
                                           ▼
                                      VFS Projection
                                           │
                                           ▼
                                      Next Stage
                                           │
                                           ▼
                                  Verification Run
                                           │
                                           ▼
                                    Security/Review
                                           │
                                           ▼
                                      Final Gate
                                           │
                                           ▼
                                   COMPLETED
```

And separately:

```text
PipelineEvent
    ↓
SSE
    ↓
Browser
```

No SSE state is authoritative.

---

# 100. Final Engineering Verdict

The previous Architect patch fixed the original failure mode.

This remediation plan addresses the next class of failures:

```text
control plane
state authority
transactionality
concurrency
versioning
resume
verification
repair recursion
event replay
final acceptance
```

The most important implementation sequence is:

```text
PipelineRun lease
        ↓
StageExecution
        ↓
ArtifactVersion
        ↓
candidate/accept/commit separation
        ↓
resume from accepted versions
        ↓
PipelineEvent
        ↓
transactional Blueprinter
        ↓
Coder acceptance
        ↓
Tester/Debugger recursion
        ↓
workspace-versioned Security/Reviewer
        ↓
final completion proof
```

Do not optimize prompts or model intelligence before these are closed.

The model can be wrong.

The pipeline cannot be allowed to be ambiguous about whether it is wrong.

---

# 101. Acceptance Standard

The remediation is complete only when the repository can demonstrate, with executable tests:

```text
1. Invalid candidates are rejected.
2. Rejected candidates never become authoritative.
3. Accepted candidates become exactly one current artifact version.
4. Completed stages correspond to accepted versions.
5. Resume uses current accepted versions.
6. Concurrent launches produce exactly one owner.
7. SSE replay is exact.
8. Blueprinter aggregation is atomic.
9. Coder failures block acceptance.
10. Debugger actually retries.
11. Tester reruns after repair.
12. Repair oscillation terminates.
13. Process restart resumes correctly.
14. Verification hashes match the final workspace.
15. Security and Reviewer results are current.
16. Final completion is transactional.
17. Mutation tests prove the guards are meaningful.
18. Real-model execution survives the same contracts.
19. Generated projects build and run.
20. A clean-room run reproduces the result.
```

Anything less is:

```text
IMPROVED
```

not:

```text
HARDENED
```



# 16. Final Contract/Artifact Consistency Verification

This phase is mandatory after every other implementation phase.

Do not stop after unit tests pass. Re-run the complete dependency chain:

```text
Contract Registry
      ↓
Stage Prompt
      ↓
Input Compatibility
      ↓
LLM Candidate
      ↓
Output Contract Validation
      ↓
Semantic Validation
      ↓
Artifact Commit
      ↓
Artifact Provenance
      ↓
PipelineRun
      ↓
Resume
      ↓
Downstream Compatibility
      ↓
Mutation / Invalidation
      ↓
Rebuild
      ↓
Final Verification
```

Execute this adversarial sequence:

```text
1. Generate a valid Planner artifact.
2. Generate a valid Architect artifact from that exact Planner version.
3. Persist both with contract and dependency fingerprints.
4. Resume and prove the exact accepted versions are consumed.
5. Change the Planner output.
6. Prove the old Architect artifact becomes STALE.
7. Prove Coder cannot consume the stale Architect artifact.
8. Re-run Architect.
9. Prove the new Architect artifact references the new Planner version.
10. Change the Architect contract version.
11. Prove incompatible existing Architect artifacts are no longer authoritative.
12. Change the Architect validator.
13. Prove artifacts validated under the incompatible validator version are
    invalidated or explicitly revalidated.
14. Change the Architect prompt contract.
15. Prove the generated contract fingerprint changes.
16. Restart the process.
17. Prove resume uses persisted artifact identity rather than filenames.
18. Replay SSE events and prove replay does not mutate artifact state.
19. Run the full Tester → Debugger → Tester loop.
20. Change a source file after the last verification.
21. Prove the final verification becomes stale.
22. Prove Conversation/Run cannot become Completed while current hashes do
    not match the verified hashes.
```

The final proof condition is:

```text
PipelineRun = COMPLETED
AND
all required stage executions = ACCEPTED
AND
all authoritative artifacts = CURRENT
AND
all artifact contract checks = PASS
AND
all dependency fingerprints = CURRENT
AND
all content hashes = CURRENT
AND
all final verification hashes = CURRENT
AND
no stale descendant exists
AND
no rejected candidate is authoritative
```

If any condition fails, the pipeline must not report `Completed`.
