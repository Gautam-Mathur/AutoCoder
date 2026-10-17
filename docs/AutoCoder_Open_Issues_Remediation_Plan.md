# AutoCoder Remediation Plan: Open Findings and Partial Fixes

**Repository:** `Gautam-Mathur/AutoCoder`  
**Reviewed commit:** [`5ce489e78312e32e4c7413ac874bbc5c79e19227`](https://github.com/Gautam-Mathur/AutoCoder/commit/5ce489e78312e32e4c7413ac874bbc5c79e19227)  
**Baseline:** `243f57c1659a6e7566dd1819edf4970a5df1350a`  
**Scope:** Source-grounded remediation plan. The snippets are proposed changes, not claims that changes or tests have already been applied.

> Paths and current behaviors below are grounded in the reviewed repository snapshot. Where the exact session helper, Prisma field, or function signature must be checked in the repo before patching, that is stated rather than inventing a project API.

## 0. Implementation order

- [ ] **P0 Security/release boundary:** F-03, F-04, F-05, F-06, F-08, F-14.
- [ ] **P1 Retry and repair:** F-01, F-09/F-10.
- [ ] **P1 Evidence/state:** F-02, F-07, F-12.
- [ ] **P2 Contract convergence:** C-10 through C-22 and runtime contract tests.
- [ ] **P3 Repository hygiene and remaining inventory review.**

Do not mark an item complete until its acceptance criteria and regression tests pass on the same commit.

---

# Part A — Black-box findings

## F-01 — Executor and verification-loop result contract

**Files:** `src/lib/agents/ruflo/contract-executor.ts`, `src/lib/agents/ruflo/verification-loop.ts`, `src/lib/agents/ruflo/orchestrator.ts`

**Observed:** The executor now has a three-attempt generation/validation loop, but breaks early for Coder and Tester. The Coder branch passes `customUserContent` rather than retry-updated `effectiveCustomUserContent`. The verification loop has a Tester rejection path that throws before a repair cycle can complete.

### Changes

- [ ] Define one shared typed execution result containing stage status, persisted execution state, accepted artifact/content, validation errors, and workspace hash.
- [ ] Return the updated persisted state, not a stale in-memory state.
- [ ] Pass corrective retry feedback to Coder.
- [ ] Treat malformed Tester output as a contract error; treat a valid `Result: FAIL` report as a repair request.
- [ ] Route valid Tester failures to Debugger, apply only authorized patches, then rerun Tester.
- [ ] Add tests for pass, validation rejection, repair, no-op repair, stale hash, and retry exhaustion.

### Exact Coder argument correction

In the Coder `runAgent(...)` call inside `contract-executor.ts`, replace the current user-content argument:

```ts
// Before:
customUserContent,

// After:
customUserContent: effectiveCustomUserContent,
```

Keep other arguments unchanged. Confirm the actual call-site parameter shape before applying.

### Correct the misleading retry behavior

The current loop contains:

```ts
if (stageName === 'Coder' || stageName === 'Tester') {
  break;
}
```

Do **not** simply remove Tester from this guard and regenerate the same deterministic report. Use separate semantics:

```ts
if (stageName === 'Tester') {
  // Tester is deterministic. A malformed report is a contract failure.
  // A valid Result: FAIL must be routed to Debugger by orchestration.
  break;
}

if (stageName === 'Coder') {
  // Retry only when the next Coder call consumes effectiveCustomUserContent.
  // Otherwise return a clear validation failure.
}
```

In `verification-loop.ts`, change the valid Tester `FAIL` path to invoke the existing repair workflow rather than throwing immediately. Use the existing repair APIs/types; do not create a parallel repair API.

**Done when:** Coder receives corrective feedback; Tester failure enters Debugger and reruns Tester; malformed output is distinct from test failure; retry exhaustion is explicit.

---

## F-02 — Reviewer/Security need source evidence, not only hashes

**Files:** `src/lib/agents/ruflo/registry/Reviewer.ts`, `src/lib/agents/ruflo/registry/Security.ts`, `src/lib/agents/ruflo/vfs.ts`, `src/lib/agents/ruflo/contracts/schemas/coder.ts`, `src/lib/agents/ruflo/final-gate.ts`

- [ ] Build a read-only evidence bundle from the authorized workspace file set.
- [ ] Include path, content hash, evidence ID, line range/excerpt, and omitted/truncated status.
- [ ] Include accepted requirements artifacts for Reviewer coverage checks.
- [ ] Require findings to cite evidence IDs; represent unseen/truncated files as `INCOMPLETE`.
- [ ] Bind evidence to the exact workspace hash and invalidate after source changes.
- [ ] Make final gate reject stale or incomplete required evidence.

Suggested type, in an existing shared contract-types module or a new `src/lib/agents/ruflo/contracts/evidence.ts` if no suitable module exists:

```ts
export type SourceEvidenceItem = {
  id: string;
  path: string;
  contentHash: string;
  startLine: number;
  endLine: number;
  excerpt: string;
};

export type SourceEvidenceBundle = {
  workspaceHash: string;
  items: SourceEvidenceItem[];
  omittedPaths: string[];
  truncated: boolean;
};
```

Add a required `Evidence References` section only after updating prompt, parser/schema, and acceptance validator together. Do not grant unrestricted filesystem tools to Reviewer/Security as a shortcut.

**Done when:** reports cannot claim coverage of files they did not receive; missing evidence is incomplete, not clean; edits invalidate old evidence.

---

## F-03 — API authentication and owner-scoped access

**Files to audit:** `src/app/api/conversations/route.ts`, `src/app/api/conversations/**`, `src/app/api/pipeline/**`, file and telemetry handlers under `src/app/api/**`.

**Observed:** `conversations/route.ts` contains a `prisma.conversation.findMany()` query without a visible owner filter, and its creation path does not visibly associate a conversation with an authenticated user.

- [ ] Find and reuse the repository's real session/auth helper.
- [ ] Scope reads, writes, deletes, streaming endpoints, and referenced IDs to authenticated owner/tenant.
- [ ] Derive owner ID from session, never from client-supplied owner fields.
- [ ] Add negative tests for unauthenticated and cross-owner requests.

Suggested route pattern only; replace helper and field names with the actual repository schema:

```ts
export async function GET() {
  const session = await getExistingAuthenticatedSession();

  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const conversations = await prisma.conversation.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
  });

  return Response.json(conversations);
}
```

`getExistingAuthenticatedSession()` and `userId` are placeholders, not claimed repository exports. Confirm the actual helper and Prisma ownership field first. If Conversation has no owner field, design and migrate ownership explicitly.

**Done when:** possession of a resource ID is never sufficient authorization; cross-owner requests return a non-disclosing `403`/`404`.

---

## F-04 — Stop returning raw provider keys

**File:** `src/app/api/settings/route.ts`

**Observed:** GET returns `getLLMConfig()` directly. POST returns a settings object that includes `openaiApiKey` and `anthropicApiKey`.

- [ ] Return only safe metadata from GET/POST.
- [ ] Authorize reads and writes with the repo's real auth helper.
- [ ] Redact keys from logs, exceptions, telemetry, and events.
- [ ] Inspect tracked config and Git history; rotate any real credential found.
- [ ] Add tests asserting submitted secrets never appear in responses.

Suggested response projection:

```ts
function toPublicLLMSettings(config: {
  provider?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
}) {
  return {
    provider: config.provider ?? null,
    openaiApiKeyConfigured: Boolean(config.openaiApiKey),
    anthropicApiKeyConfigured: Boolean(config.anthropicApiKey),
  };
}
```

Change GET to return the projection, not the raw object:

```ts
return Response.json(toPublicLLMSettings(await getLLMConfig()));
```

For POST, persist submitted values through the existing settings mechanism but return only the projection. Confirm the actual config type before applying.

**Done when:** no route response contains raw key values; unauthenticated callers cannot read or change settings.

---

## F-05 — Remove implicit override from ordinary resume

**Files:** `src/app/api/pipeline/resume/route.ts`, `src/lib/agents/ruflo/orchestrator.ts`

**Observed:** ordinary resume sets `qualityGateOverride: true`.

- [ ] Remove the unconditional override from ordinary resume.
- [ ] Keep resume/retry separate from explicit human approval.
- [ ] If override is required, expose a distinct authorized action with actor, reason, timestamp, and audit record.
- [ ] Prevent clients from enabling override via arbitrary request-body fields.

Remove this property from the generic resume options:

```ts
// Remove from ordinary resume options:
qualityGateOverride: true,
```

If the orchestrator requires a boolean, pass `false` on ordinary resume and reserve `true` for a separate approved path. Check actual type/default semantics before changing it.

**Done when:** resuming a failed run does not itself bypass the failed gate.

---

## F-06 — Invoke deterministic security and quality gates on the active path

**Files:** `src/lib/agents/ruflo/orchestrator.ts`, `src/lib/agents/ruflo/security-gate.ts`, `src/lib/agents/ruflo/quality-gate.ts`, `src/lib/agents/ruflo/final-gate.ts`

**Observed:** the orchestrator imports `validateSecurityGate` and `evaluateQualityGate`, but the inspected file contains no invocations of either. Presence of `evaluateFinalPipelineGate()` does not prove those deterministic checks ran.

- [ ] Call deterministic quality and security gates on the materialized workspace before preview or completion.
- [ ] Persist results, run IDs, and workspace hash.
- [ ] Pass actual gate results to final-gate evaluation.
- [ ] Treat missing, `NOT_RUN`, errored, or incomplete required checks as non-passing.
- [ ] Ensure Reviewer score cannot override deterministic hard failures.

Target control-flow shape; wire the actual existing function signatures and final-gate input type:

```ts
const qualityResult = await evaluateQualityGate(/* actual workspace input */);
const securityResult = await validateSecurityGate(/* actual workspace input */);

// Persist both results with the same workspace hash.
// Pass those actual results into evaluateFinalPipelineGate(...).
// Missing, errored, or incomplete required checks must fail closed.
```

Do not create placeholder results that always return PASS.

**Done when:** integration tests prove both gates run in the production path and their failures block completion.

---

## F-07 — Make artifact DB state and VFS projection recoverable

**Files:** `src/lib/agents/ruflo/artifact-store.ts`, `src/lib/agents/ruflo/vfs.ts`, `src/lib/agents/ruflo/contract-executor.ts`

**Observed:** DB artifact writes use a transaction, but VFS/disk projection occurs after that transaction. A crash can leave accepted artifact state and materialized files out of sync.

- [ ] Make DB artifact record the canonical accepted record.
- [ ] Track projection status and content hash in the DB transaction.
- [ ] Mark projection `SYNCED` only after materialization and hash verification.
- [ ] Reconcile pending/failed projections on restart or retry.
- [ ] Block downstream consumption when required projection is not synchronized.
- [ ] Add fault-injection tests for DB failure, disk failure, and interruption.

Suggested pattern; adapt names and add schema migration if needed:

```ts
// In the same DB transaction as accepting the artifact:
await tx.artifact.update({
  where: { id: artifactId },
  data: { contentHash, projectionStatus: 'PENDING' },
});

// After commit:
await materializeAcceptedArtifact(artifactId);

await prisma.artifact.update({
  where: { id: artifactId },
  data: { projectionStatus: 'SYNCED' },
});
```

`artifactId`, `contentHash`, `projectionStatus`, and `materializeAcceptedArtifact` are illustrative names, not assertions that these exact members currently exist. If projection fails, keep a retryable failure state; do not claim synchronization.

**Done when:** crash recovery works and DB/VFS/disk hashes reconcile.

---

## F-08 — Do not execute generated code before gates pass

**File:** `src/lib/agents/ruflo/orchestrator.ts`

**Observed:** the flow calls `launchVSCodePreview()` before final-gate evaluation. The preview helper can run generated code using `exec('node ...')` or launch `npx serve`.

- [ ] Move preview after successful deterministic and final gates.
- [ ] Prefer an isolated disposable sandbox, not a host process.
- [ ] Limit CPU, memory, processes, time, filesystem, network, and output.
- [ ] Do not inherit host secrets/environment wholesale.
- [ ] Test that a failed/missing gate makes preview unreachable.

Required ordering:

```ts
// 1. Materialize accepted workspace.
// 2. Run deterministic quality and security checks.
// 3. Persist results and hashes.
// 4. Evaluate final gate using those results.
if (!finalResult.passed) {
  // Persist failure and return. Do not execute generated code.
  return finalResult;
}

// Only after all required gates pass:
await launchVSCodePreview();
```

This is a control-flow sketch. Use the actual result type and function signatures in `orchestrator.ts` and `final-gate.ts`.

**Done when:** preview is never invoked on rejected projects and generated code is sandboxed.

---

## F-09/F-10 — Wire tools and Debugger repair into the active path

**Files:** `src/lib/agents/ruflo/toolbox.ts`, `src/lib/agents/ruflo/registry/Coder.ts`, `src/lib/agents/ruflo/registry/Debugger.ts`, `src/lib/agents/ruflo/orchestrator.ts`, `src/lib/agents/ruflo/verification-loop.ts`, `src/lib/agents/sml.ts`

- [ ] Trace active runtime calls from orchestrator to tool registry/executor.
- [ ] Ensure prompt-declared tools match tools actually supplied.
- [ ] Route Tester failures to Debugger; validate patches against workspace policy before writing.
- [ ] Reject unauthorized paths before mutation.
- [ ] Avoid shell commands built by interpolating untrusted package names; use argument arrays and strict allowlists.
- [ ] Test success, tool failure, unauthorized patch, no-op repair, and successful repair.

Target flow, using existing project APIs/types rather than introducing parallel ones:

```ts
for (let attempt = 0; attempt < maxRepairAttempts; attempt++) {
  const testResult = await runDeterministicTester();

  if (testResult.status === 'PASS') return testResult;

  const repair = await runDebugger({
    failures: testResult.failures,
    workspaceHash: testResult.workspaceHash,
  });

  const validatedPatch = await validateRepairAgainstWorkspacePolicy(repair);
  await applyValidatedRepair(validatedPatch);
}

return { status: 'FAIL', reason: 'Repair attempts exhausted' };
```

The function names above describe responsibilities; reuse the actual existing functions and types.

**Done when:** a test-fail → Debugger → authorized patch → test-pass integration test succeeds.

---

## F-12 — Separate content hashes from contract fingerprints

**Files:** `src/lib/agents/ruflo/contracts/fingerprints.ts`, `src/lib/agents/ruflo/contract-executor.ts`, `src/lib/agents/ruflo/contracts/__tests__/fingerprint.test.ts`

**Observed:** executor passes output `contentHash` as `contractHash`. These values have different meanings.

- [ ] Keep `contentHash` as identity of generated output.
- [ ] Compute contract fingerprint from stage/version, prompt, schema, validator version, and relevant policy.
- [ ] Use the correct hash in cache/reuse/invalidation logic.
- [ ] Invalidate Tester/Security/Reviewer results after relevant workspace changes.
- [ ] Test prompt-only, schema-only, validator-only, and output-only changes.

Suggested shape, adapted to the existing helpers in `fingerprints.ts`:

```ts
type ContractFingerprintInput = {
  stageName: string;
  contractVersion: string;
  promptHash: string;
  schemaHash: string;
  validatorVersion: string;
};

function buildContractFingerprint(input: ContractFingerprintInput): string {
  return stableHash(canonicalSerialize(input));
}
```

Do not create a second hashing system if the repository already has stable hashing/canonical serialization helpers. Replace the executor's use of output content hash in the `contractHash` field with the actual contract fingerprint.

**Done when:** prompt/schema/validator changes alter contract hash; output-only changes alter content hash.

---

## F-13 — Test actual runtime prompt-to-parser synchronization

**Files:** `src/lib/agents/ruflo/contracts/__tests__/prompt-contract-sync.test.ts`, `contract-sync.test.ts`, `debugger-contract-remediation.test.ts`, stage registries, parsers, `stage-acceptance.ts`, active orchestrator path.

- [ ] Test runtime registry/prompt values rather than copied prompt strings.
- [ ] For every active stage, assert format, version, parser, required headings, and artifact type agree.
- [ ] Add negative tests for missing/duplicate headings, stale versions, malformed reports, and fingerprint changes.
- [ ] Verify helpers run in the actual pipeline.
- [ ] Include retry, repair, and final-gate integration tests.

Table-driven target shape:

```ts
for (const stage of activeStageContracts) {
  it(`${stage.name} prompt/parser/acceptance metadata stays aligned`, () => {
    expect(runtimePromptFor(stage.name)).toBeDefined();
    expect(stage.outputArtifact).toBeDefined();
    expect(parserFor(stage.name).version).toBe(stage.version);
    expect(acceptanceFor(stage.name).requiredHeadings)
      .toEqual(stage.requiredHeadings);
  });
}
```

These names are illustrative. Use actual exports from the repository; export existing canonical metadata rather than adding another duplicated test-only list.

**Done when:** changing a prompt/schema/heading causes a test failure if the other contract authorities are not updated.

---

## F-14 — Fix security scanner regex state and coverage

**File:** `src/lib/agents/ruflo/security-gate.ts`

**Observed:** scanner uses global regex patterns and restricts scanned files to JS/TS extensions. Global regex `lastIndex` can affect repeated checks, and extension filtering can skip security-relevant configuration/markup files.

- [ ] Remove `g` from regexes used only for boolean detection.
- [ ] Reset `lastIndex` for regexes used with repeated match collection.
- [ ] Scan the authorized workspace file set with explicit supported-extension policy.
- [ ] Report scanned/skipped/failed files.
- [ ] Treat scanner errors or missing required coverage as incomplete/error, not clean.
- [ ] Add positive/negative fixtures and repeated-file scan tests.

For boolean checks, change global regexes such as:

```ts
// Use non-stateful matching for boolean detection:
const suspiciousPattern = /pattern-to-detect/i;
```

If global matching is required to collect all matches:

```ts
pattern.lastIndex = 0;
const matches = [...source.matchAll(pattern)];
pattern.lastIndex = 0;
```

`pattern-to-detect` is a placeholder. Preserve the real security patterns already in `security-gate.ts`.

**Done when:** repeated scans are deterministic, every required file is scanned or marked incomplete, and the active orchestrator invokes the scanner.

---

# Part B — Contract/schema issues

## C-10/C-11/C-12/C-13 — Align Queen, Planner, Architect schema versions and fields

**Files:** `src/lib/agents/ruflo/contracts/versions.ts`, `contracts/schemas/queen.ts`, `planner.ts`, `architect.ts`.

**Observed:** canonical stage contracts in `versions.ts` are `1.2.0`, while these schema files remain `1.0.0` with legacy required fields.

- [ ] Queen schema/validator matches headings: Project Name, Project Goal, MVP Scope, Technical Constraints, Risks.
- [ ] Planner matches: Features, Functional Requirements, Acceptance Criteria.
- [ ] Architect matches: Tech Stack, Project Folder Structure, Project Files, Modules, Conventions.
- [ ] Make schema version derive from canonical `CONTRACT_VERSIONS`.
- [ ] Avoid circular imports; move version constants to a dependency-free module if necessary.
- [ ] Add one test asserting every schema version equals the canonical stage version.

Suggested version binding, if it does not create an import cycle:

```ts
import { CONTRACT_VERSIONS } from '../versions';

export const QUEEN_SCHEMA = {
  contractName: 'QueenOutput',
  version: CONTRACT_VERSIONS.Queen,
  // Required sections/invariants must match the actual Markdown parser.
} as const;
```

Repeat for Planner and Architect. Do not translate Markdown headings into JSON fields unless that schema actually describes JSON output.

**Done when:** prompt, parser, acceptance validator, and schema metadata agree.

## C-14 — Clarify `minVersion` semantics

**File:** `src/lib/agents/ruflo/contracts/registry.ts`

The registry contains `minVersion: '1.0.0'` entries while current contracts use `1.2.0`.

- [ ] Define whether `minVersion` means backward-compatible minimum or exact/current version.
- [ ] Keep older values only where compatibility is intentional and tested.
- [ ] Use canonical version where the current contract is required; do not mechanically replace every value.

Example for a dependency that truly requires the current Queen contract:

```ts
minVersion: CONTRACT_VERSIONS.Queen,
```

**Done when:** each minimum version has documented semantics and compatibility tests.

## C-15/C-16/C-19 — Centralize stage metadata

**Files:** `src/lib/agents/ruflo/contracts/registry.ts`, `contracts/versions.ts`, parsers, `stage-acceptance.ts`.

Current `StageContract` contains `name`, `version`, `inputArtifacts`, and `outputArtifact`; format, parser association, and headings are still distributed.

- [ ] Add output format and required headings to canonical metadata.
- [ ] Add a parser/validator ID; keep executable parser functions in a separate map if necessary to avoid import cycles.
- [ ] Generate sync tests and acceptance heading checks from canonical metadata.
- [ ] Remove duplicated lists only after all consumers use the canonical authority.
- [ ] Keep Coder's raw-source response and executor-generated manifest as separate explicit boundaries.

Suggested type:

```ts
export type StageOutputFormat = 'markdown' | 'json' | 'source';

export type StageContract = {
  name: StageName;
  version: string;
  inputArtifacts: StageInputArtifact[];
  outputArtifact: StageOutputArtifact;
  outputFormat: StageOutputFormat;
  requiredHeadings?: readonly string[];
  parserId: string;
};
```

**Done when:** every active stage has one authoritative format/version/parser association.

## C-17 — Resolve Coder manifest hash mismatch

**Files:** `src/lib/agents/ruflo/contracts/schemas/coder.ts`, `contract-executor.ts`, `vfs.ts`.

The TypeScript `WorkspaceManifest` declares four hashes optional, but `CODER_SCHEMA.requiredFields` requires them: `architectureFileSetHash`, `blueprintFileSetHash`, `workspaceFileSetHash`, `authorizedFileSetHash`.

Choose one policy:

- [ ] If all hashes exist before validation, make the TypeScript fields required and guarantee every constructor fills them.
- [ ] If hashes are not available yet, remove them from the required list and model the lifecycle explicitly.
- [ ] Test the actual executor-produced manifest.

Required-hash type shape, only if lifecycle supports it:

```ts
export type WorkspaceManifest = {
  // Existing fields...
  architectureFileSetHash: string;
  blueprintFileSetHash: string;
  workspaceFileSetHash: string;
  authorizedFileSetHash: string;
};
```

**Done when:** type and runtime schema agree, and no hash required by the final gate can be absent.

## C-18 — Document the Coder/executor boundary

**Files:** `src/lib/agents/ruflo/registry/Coder.ts`, `contract-executor.ts`, `contracts/schemas/coder.ts`.

Coder asks for source content one file at a time; executor writes files and creates `workspace.manifest.json`. This appears to be an intentional boundary, not necessarily a defect.

- [ ] Document that model output is source content, not the trusted manifest.
- [ ] Keep file authorization, manifest construction, and hashes executor-owned.
- [ ] Ensure schema metadata describes the accepted artifact at each boundary.

Add a comment near manifest construction:

```ts
// Coder returns source content for the requested file.
// The executor owns authorization, writes, manifest construction,
// hash calculation, and manifest validation. The model does not author
// the trusted workspace manifest.
```

**Done when:** tests show manifest fields are executor-derived and the boundary is documented consistently.

## C-21/C-22 — Remove Tester dual-output authority and stale version

**Files:** `src/lib/agents/ruflo/registry/Tester.ts`, `contracts/schemas/tester.ts`, `contracts/versions.ts`, `stage-acceptance.ts`.

Tester is deterministic Markdown, but the registry retains legacy JSON `{ passed, failed, total }`, while `TESTER_SCHEMA.version` is `1.0.0` and canonical Tester version is `1.2.0`.

- [ ] Search all references to the legacy JSON schema before deleting or relabeling it.
- [ ] Keep one authoritative public Tester output contract: Result, Summary, Tests, Failures, Workspace Hash.
- [ ] Bind Tester schema version to canonical `CONTRACT_VERSIONS.Tester`.
- [ ] Distinguish malformed report, valid test failure, skipped tests, and incomplete execution.

Suggested version binding:

```ts
import { CONTRACT_VERSIONS } from '../versions';

export const TESTER_SCHEMA = {
  contractName: 'TesterOutput',
  version: CONTRACT_VERSIONS.Tester,
  // Existing required fields/invariants must match the active parser.
} as const;
```

Use the actual relative path and avoid a circular import.

**Done when:** one public output contract remains, version matches canonical metadata, and `Result: FAIL` triggers repair rather than being confused with malformed Markdown.

---

# Part C — Additional checks

## Workspace authorization
**Files:** `architecture-file-policy.ts`, `workspace-policy.ts`, `vfs.ts`.

- [ ] Reconcile static/config/schema classification with write authorization.
- [ ] Apply one fail-closed policy to model writes, Debugger patches, toolbox writes, and VFS materialization.
- [ ] Test path traversal, normalization, duplicate paths, malformed inventories, and static-asset exceptions.
- [ ] Ensure “does not require module ownership” does not mean “any write is authorized.”

## Persistence/repository hygiene
- [ ] Inspect tracked `dev.db`, logs, telemetry, and transcripts for sensitive or machine-specific data.
- [ ] Keep `.env` secrets out of Git; use placeholders in `.env.example`.
- [ ] Add CI checks for accidental secrets and generated state.
- [ ] Test restart/concurrency, leases, cancellation, event ordering, and recovery.
- [ ] Deep-review black-box report entries labelled `INVENTORY` before treating them as confirmed defects.

---

# Part D — Required verification matrix

- [ ] Coder validation failure → corrective retry.
- [ ] Tester `FAIL` → Debugger → authorized patch → Tester `PASS`.
- [ ] Quality/security failure, gate not run, gate error, or stale hash blocks completion.
- [ ] Preview is never launched before all required gates pass.
- [ ] Unauthenticated/cross-owner API requests are rejected.
- [ ] Settings GET/POST never return raw secrets.
- [ ] Reviewer/Security evidence references actual files and current workspace hash.
- [ ] DB commit/VFS projection interruption is recoverable.
- [ ] Contract hash changes on prompt/schema/validator change; content hash changes on output change.
- [ ] Scanner results are deterministic and report incomplete file coverage.
- [ ] All stage versions, formats, headings, parsers, and validators agree.
- [ ] Run repository-defined lint, typecheck, tests, and production build; record commands and results.

## Completion standard

A finding is not fixed merely because a helper exists, an import is present, a prompt mentions a capability, or a unit test passes in isolation. Require proof that:

1. The active production path invokes the behavior.
2. Failure states fail closed.
3. A regression test reproduces the original failure and passes with the fix.
4. The tested commit SHA and exact commands/results are recorded.

**Status:** Plan only. No repository files were modified by this document, and no test run is claimed.
