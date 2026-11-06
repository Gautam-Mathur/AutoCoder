# AutoCoder Run 3 Remediation Plan

**Repository:** `Gautam-Mathur/AutoCoder`  
**Base commit:** `9d60c6709fc17aae586d4f7e282e771902b7f37f`  
**Base commit date:** 2026-10-26  
**Scope:** Run 3 repair oscillation, JavaScript/TypeScript syntax mismatch, repair-target extraction, convergence, lifecycle telemetry, and audit/release separation.

> This is a proposed patch plan based on source fetched at the base SHA. It has not been applied and no tests have been run. Apply on a branch/worktree based on this exact commit. If the active branch has moved, rebase and re-check every hunk. Do not modify engine code underneath a live pipeline run: that would make the run non-reproducible.

## 1. Base findings and constraints

The latest commit already contains useful infrastructure in `repair-coordinator.ts`: normalized failures, `validateRepairPlan()`, durable-attempt types, commit receipts, crash reconciliation, and repair budgets. Extend these mechanisms; do not create a parallel repair subsystem.

Confirmed in the base source:

- `linter.ts` uses `allowJs: true` and `checkJs: true`. Keep both enabled.
- `orchestrator.ts` fabricates a generic blueprint section when a Coder target has no matching blueprint section.
- Coder retries receive the current validation error, but no bounded record of previous repair strategies.
- `extractRepairPlanFromDebuggerOutput()` only performs general path scanning if no explicit targets were found.
- Its authorization filter keeps the original candidate list if the filtered list is empty. Authorization is subsequently checked by `validateRepairPlan()`, but extraction should not silently discard or retain targets.
- `validateReviewer()` rejects a structurally valid audit report for a score below 80 or failed conformance/coverage. Those are release-policy outcomes and should be enforced by the final release gate, not by rejecting the report.
- The latest audit notes additional generated-code risks: framework route mismatches, manifest/dependency inconsistencies, missing Prisma schema/migrations, mock data, and missing Stripe implementation. Those require runtime/integration verification, not merely a more permissive static linter.

### State semantics to preserve

`STAGE_ACCEPTED` means the agent output passed its contract. It does **not** mean code was repaired.

Use distinct lifecycle states:
1. `STAGE_ACCEPTED`
2. `REPAIR_PLAN_VALIDATED`
3. `REPAIR_COMMITTED`
4. `REPAIR_VERIFIED`
5. `PIPELINE_ACCEPTED`

Never infer a later state from an earlier one.

---

# 2. Patch F1: Merge repair targets and fail closed

**File:** `src/lib/agents/ruflo/repair-coordinator.ts`

**Problem:** explicit target headings and general path mentions are not merged. If a report names one target explicitly and mentions another in prose, the second is lost. Authorization filtering in extraction can also hide mixed authorized/unauthorized candidates before the canonical validator sees them.

**Why:** extraction should collect evidence; `validateRepairPlan()` should make the authorization decision. Silent filtering makes the repair plan less auditable.

**Target outcome:** all candidate paths are normalized and deduplicated, then the entire plan is validated. One unauthorized/protected target rejects the plan. No partial dispatch and no fallback.

### Proposed diff

```diff
diff --git a/src/lib/agents/ruflo/repair-coordinator.ts b/src/lib/agents/ruflo/repair-coordinator.ts
--- a/src/lib/agents/ruflo/repair-coordinator.ts
+++ b/src/lib/agents/ruflo/repair-coordinator.ts
@@
-  // Also match general project paths within the issues and patches sections only if no explicit matches found
-  if (affectedFilesSet.size === 0) {
-    const pathTokens = textToScan.match(
-      /\b(?:src|app|pages|server|components|lib|utils|public|config|styles)[\/\w\-\[\].]+\.(?:tsx|ts|jsx|js|html|css|json|prisma|sql|md)\b/gi
-    ) || [];
-    for (const token of pathTokens) {
-      const norm = normalizeProjectPath(token);
-      if (!norm.includes('node_modules') && !norm.endsWith('.d.ts')) {
-        affectedFilesSet.add(norm);
-      }
-    }
-  }
-
-  // If authorized set is provided, filter affectedFiles to ensure only authorized files are targeted
-  let affectedFiles = Array.from(affectedFilesSet);
-  if (authorized) {
-    const validAuth = new Set(
-      (authorized.coderAuthorizedFiles && authorized.coderAuthorizedFiles.length > 0
-        ? authorized.coderAuthorizedFiles
-        : authorized.authorizedFiles || []
-      ).map((f) => f.toLowerCase())
-    );
-    const filtered = affectedFiles.filter((f) => validAuth.has(f.toLowerCase()));
-    if (filtered.length > 0) {
-      affectedFiles = filtered;
-    }
-  }
+  // Always merge general path mentions with explicit targets. A report can
+  // contain both labelled targets and additional paths in diagnostic prose.
+  const pathTokens = textToScan.match(
+    /\b(?:src|app|pages|server|components|lib|utils|public|config|styles)[\/\w\-\[\].]+\.(?:tsx|ts|jsx|js|html|css|json|prisma|sql|md)\b/gi
+  ) || [];
+  for (const token of pathTokens) {
+    const norm = normalizeProjectPath(token);
+    if (!norm.includes('node_modules') && !norm.endsWith('.d.ts')) {
+      affectedFilesSet.add(norm);
+    }
+  }
+
+  // Extraction is not an authorization boundary. Preserve all candidates so
+  // validateRepairPlan() can reject the complete plan if any target is invalid.
+  const affectedFiles = Array.from(affectedFilesSet);
```

**Follow-up:** the `authorized` parameter becomes unused. Check all callers and remove it in a separate cleanup if TypeScript/lint configuration rejects unused parameters.

**Tests:**
- explicit + unlabelled paths in one report both extracted;
- root paths such as `package.json`, `tsconfig.json`, `vite.config.ts` extracted when mentioned;
- duplicate normalized paths collapse;
- mixed authorized/unauthorized targets reject the whole plan;
- all-unauthorized targets produce no dispatch;
- `node_modules` and `.d.ts` remain excluded;
- stale workspace version remains rejected.

**If this breaks:** inspect `normalizeProjectPath()`, the active `AuthorizedFileSet`, and blueprint contents. Fix missing blueprint authorization; do not restore silent filtering or bypass authorization.

---

# 3. Patch F2: Make Coder language-aware and remove fabricated blueprint context

**File:** `src/lib/agents/ruflo/orchestrator.ts`

**Problem A:** if the target has no matching blueprint section, Coder receives fabricated `Dependencies: None` and `Exports: None`.

**Problem B:** Coder is not given explicit syntax rules based on the target extension. Run 3 demonstrates `.js` files being repaired with TypeScript-only assertions and parameter annotations.

**Why:** file extension and compiler settings are deterministic. Missing blueprint context is an upstream contract failure, not permission to invent dependencies or exports.

**Target outcome:** Coder only runs with a real blueprint section. `.js/.jsx` prompts prohibit TypeScript syntax and recommend runtime DOM narrowing/JSDoc. `.ts/.tsx` may use TypeScript syntax.

### Proposed diff A: deterministic language policy

```diff
diff --git a/src/lib/agents/ruflo/orchestrator.ts b/src/lib/agents/ruflo/orchestrator.ts
--- a/src/lib/agents/ruflo/orchestrator.ts
+++ b/src/lib/agents/ruflo/orchestrator.ts
@@
 export function shouldPersistAgentOutput(
   agentName: string,
   persistOutput: boolean
 ): boolean {
   return Boolean(VFS_OUTPUT_MAP[agentName]) && persistOutput;
 }
+
+type TargetLanguagePolicy = {
+  language: 'javascript' | 'typescript' | 'html' | 'css' | 'json' | 'markdown' | 'unknown';
+  rules: string[];
+};
+
+export function getTargetLanguagePolicy(targetFile: string): TargetLanguagePolicy {
+  const ext = path.extname(targetFile).toLowerCase();
+  if (ext === '.js' || ext === '.jsx') {
+    return {
+      language: 'javascript',
+      rules: [
+        'JavaScript only. Do not emit TypeScript syntax.',
+        'Do not use `as SomeType`, interfaces, type aliases, enums, `satisfies`, or typed parameters/returns.',
+        'For DOM properties, narrow runtime types with `instanceof HTMLInputElement`, `HTMLFormElement`, etc.',
+        'JSDoc comments are allowed when they are valid JavaScript.',
+      ],
+    };
+  }
+  if (ext === '.ts' || ext === '.tsx') {
+    return {
+      language: 'typescript',
+      rules: ['TypeScript syntax is allowed; follow project tsconfig and existing type contracts.'],
+    };
+  }
+  if (ext === '.html') {
+    return { language: 'html', rules: ['Emit HTML only; keep behavior and styling in their designated files.'] };
+  }
+  if (ext === '.css') {
+    return { language: 'css', rules: ['Emit CSS only.'] };
+  }
+  if (ext === '.json') {
+    return { language: 'json', rules: ['Emit strict JSON only; no comments or trailing commas.'] };
+  }
+  if (ext === '.md') {
+    return { language: 'markdown', rules: ['Emit Markdown only.'] };
+  }
+  return { language: 'unknown', rules: ['Follow the exact file format and project conventions.'] };
+}
```

### Proposed diff B: fail on missing blueprint section and inject language policy

```diff
@@
-    if (!targetSection) {
-      targetSection = `### File: ${targetFile}\n- **Purpose**: Implementation of ${targetFile}\n- **Dependencies**: None\n- **Exports**: None`;
-    }
+    if (!targetSection) {
+      throw new Error(
+        `CODER_CONTEXT_INCOMPLETE: No blueprint section exists for target "${targetFile}". ` +
+        `Repair Blueprint coverage before invoking Coder.`
+      );
+    }

     const coderContext = await buildCoderContext(conversationId, targetSection, dependencyInterfaces);
+    const languagePolicy = getTargetLanguagePolicy(targetFile);
+    const languageBlock = [
+      '### Target Language Policy',
+      `Language: ${languagePolicy.language}`,
+      ...languagePolicy.rules.map((rule) => `- ${rule}`),
+    ].join('\n');
@@
-    userContent = `${retryPrefix}TARGET FILE TO IMPLEMENT: ${targetFile}\nOutput ONLY the complete raw source code for "${targetFile}". Do NOT output markdown code fences or headers.\n\n${coderContext}${
+    userContent = `${retryPrefix}TARGET FILE TO IMPLEMENT: ${targetFile}\nOutput ONLY the complete raw source code for "${targetFile}". Do NOT output markdown code fences or headers.\n\n${languageBlock}\n\n${coderContext}${
       customUserContent ? `\n\n${customUserContent}` : ''
     }`;
```

**Impact:** some runs that previously proceeded with incomplete blueprints will now fail earlier. This is correct behavior. Repair Blueprint coverage and resume from the appropriate stage.

**Tests:**
- `.js` policy forbids TS assertions, annotations, interfaces and type aliases;
- `.tsx` policy permits TS syntax;
- missing blueprint section throws `CODER_CONTEXT_INCOMPLETE`;
- valid section still reaches Coder;
- root config repair only proceeds if that file is in the authorized set.

**If TS syntax still appears in `.js`:** inspect the final assembled `userContent`, target path normalization, model response, and linter diagnostics. Add a deterministic syntax regression check. Do not disable `checkJs`.

---

# 4. Patch F3: Bounded repair journal and oscillation detection

**Files:** `repair-coordinator.ts` and `orchestrator.ts`

**Problem:** repair cycles do not carry a sufficiently structured record of failed strategies. Run 3 oscillated between adding TypeScript assertions and removing them, returning to the original diagnostic.

**Why:** the orchestration layer must preserve evidence of what was tried, on which revision, against which diagnostic set, and with what outcome. Do not dump entire transcripts into prompts.

**Target outcome:**
- retain the newest five attempts;
- record revision, failure IDs, targets, strategy label, outcome and unresolved failures;
- detect the same failed strategy on the same workspace revision and same diagnostic set;
- stop with `REPAIR_STAGNATION`;
- allow a new attempt when revision or diagnostics materially change.

### Proposed diff A: journal type and stable signature

```diff
diff --git a/src/lib/agents/ruflo/repair-coordinator.ts b/src/lib/agents/ruflo/repair-coordinator.ts
--- a/src/lib/agents/ruflo/repair-coordinator.ts
+++ b/src/lib/agents/ruflo/repair-coordinator.ts
@@
 export interface RepairAttemptResult {
@@
   reason?: string;
 }
+
+export interface RepairJournalEntry {
+  cycle: number;
+  beforeVersion: WorkspaceVersion;
+  afterVersion?: WorkspaceVersion;
+  failureIds: string[];
+  targets: string[];
+  strategy: string;
+  signature: string;
+  outcome: 'committed' | 'no_change' | 'partial' | 'failed';
+  unresolvedFailureIds: string[];
+}
+
+export function createRepairStrategySignature(input: {
+  failureIds: string[];
+  targets: string[];
+  strategy: string;
+}): string {
+  const canonical = [
+    [...input.failureIds].sort().join(','),
+    [...input.targets].map(normalizeProjectPath).sort().join(','),
+    input.strategy.trim().toLowerCase().replace(/\s+/g, ' '),
+  ].join('|');
+  return createContentHash(canonical);
+}
+
+export function findRepeatedRepairStrategy(
+  journal: RepairJournalEntry[],
+  candidate: RepairJournalEntry
+): RepairJournalEntry | undefined {
+  return [...journal].reverse().find((entry) =>
+    entry.signature === candidate.signature &&
+    entry.beforeVersion === candidate.beforeVersion &&
+    entry.outcome !== 'committed'
+  );
+}
```

### Proposed diff B: pass bounded history into Debugger

```diff
@@
 export async function coordinateRepair(params: CoordinateRepairParams): Promise<void> {
   const { conversationId, pipelineRunId, executeStageFn, emit, maxCycles = 10 } = params;
+  const repairJournal: RepairJournalEntry[] = [];
+  let pendingJournalEntry: RepairJournalEntry | undefined;

   for (let cycle = 1; cycle <= maxCycles; cycle++) {
@@
     const normalizedFailures = normalizeFailures(testerResult.content || '');
     const beforeVersion = await computeWorkspaceFingerprint(conversationId);
+
+    // Complete the previous attempt only after the fresh Tester result exists.
+    if (pendingJournalEntry) {
+      const unresolved = normalizedFailures.map((failure) => failure.id);
+      pendingJournalEntry.afterVersion = beforeVersion;
+      pendingJournalEntry.unresolvedFailureIds = unresolved;
+      pendingJournalEntry.outcome =
+        pendingJournalEntry.beforeVersion === beforeVersion ? 'no_change' :
+        unresolved.length === 0 ? 'committed' : 'partial';
+      repairJournal.push(pendingJournalEntry);
+      if (repairJournal.length > 5) repairJournal.shift();
+      pendingJournalEntry = undefined;
+    }
@@
       `### Normalized Failures`,
       ...normalizedFailures.map((f) => `- [${f.id}] (${f.affectedFiles.join(', ') || 'workspace'}): ${f.message}`),
+      `### Previous Repair Attempts (newest first, max 5)`,
+      ...(repairJournal.length
+        ? repairJournal.slice().reverse().map((entry) =>
+            `- cycle=${entry.cycle}; strategy=${entry.strategy}; targets=${entry.targets.join(', ')}; ` +
+            `before=${entry.beforeVersion}; after=${entry.afterVersion}; outcome=${entry.outcome}; ` +
+            `unresolved=${entry.unresolvedFailureIds.join(', ') || 'none'}`
+          )
+        : ['- None']),
+      `Do not repeat a failed strategy on an unchanged workspace revision and unchanged diagnostic set. ` +
+      `If you believe a prior strategy is now valid, identify the new evidence that changes the diagnosis.`,
       `### Original Tester Output`,
```

### Proposed diff C: create pending entry before Coder dispatch

Insert after `planValidation.valid` and non-empty `authorizedTargets` have been established, before Coder is called:

```diff
@@
     const authorizedTargets = planValidation.authorizedTargets;
@@
     if (!authorizedTargets || authorizedTargets.length === 0) {
       throw new Error(`Repair plan validation failed on cycle ${cycle}: no authorized targets.`);
     }
+
+    const strategy = (plan.instructions || []).join('\n')
+      .trim()
+      .toLowerCase()
+      .replace(/\s+/g, ' ')
+      .slice(0, 500);
+    const candidate: RepairJournalEntry = {
+      cycle,
+      beforeVersion,
+      failureIds: normalizedFailures.map((failure) => failure.id).sort(),
+      targets: [...authorizedTargets].sort(),
+      strategy,
+      signature: createRepairStrategySignature({
+        failureIds: normalizedFailures.map((failure) => failure.id),
+        targets: authorizedTargets,
+        strategy,
+      }),
+      outcome: 'failed',
+      unresolvedFailureIds: normalizedFailures.map((failure) => failure.id),
+    };
+    const repeated = findRepeatedRepairStrategy(repairJournal, candidate);
+    if (repeated) {
+      throw new Error(
+        `REPAIR_STAGNATION: repeated strategy on unchanged revision ${beforeVersion}; ` +
+        `previous cycle ${repeated.cycle}.`
+      );
+    }
+    pendingJournalEntry = candidate;
```

**Integration caveat:** the actual coordinator must be inspected around the Coder dispatch and loop exit before applying this hunk. If the Tester PASS path returns before completing `pendingJournalEntry`, finalize that entry immediately before the PASS return as `outcome: 'committed'`, with no unresolved failures and the matching current revision. If the loop exits on max cycles, persist it as unresolved/failed. Do not label it verified merely because Coder returned `ACCEPTED`.

**Important:** current `normalizeFailures()` assigns IDs by list position. For robust cross-cycle comparison, add a stable diagnostic fingerprint from source/code/message/file rather than relying only on positional IDs. The proposed signature is a first guard, not a substitute for stable diagnostic identity.

**Tests:**
- same failure set + same revision + same strategy triggers stagnation;
- changed revision permits a new attempt;
- changed diagnostic set permits a new attempt;
- partial resolution records unresolved IDs;
- no workspace change is `no_change`, not committed;
- Coder acceptance alone never means verified.

**If false positives occur:** compare revision, normalized diagnostic fingerprints, and target set. Do not remove stagnation detection wholesale.

---

# 5. Patch F4: Add language-aware repair rules to Debugger

**File:** `src/lib/agents/ruflo/registry/Debugger.ts`

**Problem:** generic repair instructions allow the Debugger to recommend TypeScript-only syntax for JavaScript files.

**Target outcome:** Debugger must inspect target extension and diagnostic code, then recommend a language-valid fix.

Add this block to the existing Debugger system prompt builder. Preserve the existing prompt, report headings, and tool configuration.

```diff
diff --git a/src/lib/agents/ruflo/registry/Debugger.ts b/src/lib/agents/ruflo/registry/Debugger.ts
--- a/src/lib/agents/ruflo/registry/Debugger.ts
+++ b/src/lib/agents/ruflo/registry/Debugger.ts
@@
+TARGET-LANGUAGE REPAIR RULES (MANDATORY):
+- Determine the language from the target file extension and active project configuration.
+- For .js/.jsx, never recommend TypeScript-only syntax: no `as Type`, interfaces, type aliases,
+  enums, `satisfies`, or typed parameter/return annotations.
+- For DOM access in JavaScript, use runtime narrowing, for example:
+  `const field = document.getElementById('field');`
+  `if (!(field instanceof HTMLInputElement)) throw new Error('Expected input element');`
+  `const value = field.value;`
+- JSDoc annotations are allowed when valid JavaScript.
+- For .ts/.tsx, TypeScript syntax is allowed when compatible with tsconfig.
+- Inspect the diagnostic code and exact target extension before proposing a fix.
+- Do not repeat a failed strategy from Previous Repair Attempts unless new revision or diagnostic evidence
+  justifies it, and state that evidence.
+- Each repair instruction must name the file, diagnostic(s), language-safe strategy, and expected verification.
```

The prompt declaration/assembly point must be confirmed in the checked-out base source before applying. Do not replace the entire Debugger prompt with this fragment.

---

# 6. Patch F5: Separate Reviewer report acceptance from release eligibility

**File:** `src/lib/agents/ruflo/stage-acceptance.ts`

**Problem:** `validateReviewer()` rejects a valid report if the score is below 80 or conformance/coverage is false. The Reviewer is an auditor. A negative report is still valid evidence.

**Target outcome:** accept a structurally valid, non-stale report regardless of findings. The final release gate must still block release for score < 80, failed conformance, or failed requirement coverage.

### Proposed diff

```diff
diff --git a/src/lib/agents/ruflo/stage-acceptance.ts b/src/lib/agents/ruflo/stage-acceptance.ts
--- a/src/lib/agents/ruflo/stage-acceptance.ts
+++ b/src/lib/agents/ruflo/stage-acceptance.ts
@@
-  if (output.qualityScore < 80) {
-    extraErrors.push(`Reviewer Contract Error: Quality score (${output.qualityScore}) is below required minimum of 80.`);
-  }
-  if (!output.architecturalConformance) {
-    extraErrors.push('Reviewer Contract Error: Architectural conformance is false.');
-  }
-  if (!output.requirementCoverage) {
-    extraErrors.push('Reviewer Contract Error: Requirement coverage is false.');
-  }
+  // Reviewer is an auditor. A valid negative assessment is still valid
+  // evidence and must be persisted. Release eligibility belongs to final-gate.
```

**Precondition:** before applying, verify `final-gate.ts` independently enforces all three release conditions. The base source contains the final gate and its reviewer parsing; inspect the full remainder of `evaluateFinalPipelineGate()` and add missing policy checks there first if needed.

**Tests:**
- valid score 65 report is accepted as an artifact;
- final gate blocks score 65;
- final gate blocks false architectural conformance;
- final gate blocks false requirement coverage;
- malformed report and stale workspace hash remain rejected.

**Impact:** a pipeline can finish auditing and produce a clear `BLOCKED` decision instead of retrying the Reviewer against unchanged code. This does not make bad code releasable.

---

# 7. Patch F6: Preserve JavaScript checking; do not patch the wrong layer

**File:** `src/lib/agents/ruflo/linter.ts`

Run 3's TS2339/TS8010 oscillation does **not** justify disabling `checkJs`. Keep:

```ts
allowJs: true,
checkJs: true,
```

A valid JavaScript DOM repair for an input is:

```js
const element = document.getElementById('quantity');
if (!(element instanceof HTMLInputElement)) {
  throw new Error('Expected #quantity to be an input element');
}
const quantity = element.value;
```

For a form:

```js
const form = document.getElementById('checkout-form');
if (!(form instanceof HTMLFormElement)) {
  throw new Error('Expected #checkout-form to be a form element');
}
form.reset();
```

The exact failure behavior must match the application. Do not mechanically insert `throw` into every event handler.

**Tests required:**
- direct `HTMLElement.value` access in `.js` fails;
- runtime narrowing to `HTMLInputElement` passes;
- runtime narrowing to `HTMLFormElement` passes;
- `as HTMLInputElement` in `.js` fails with TS8010;
- `(event: Event)` in `.js` fails with TS8011;
- valid TypeScript assertion in `.tsx` passes.

No compiler-option diff is proposed.

---

# 8. Patch F7: Make repair lifecycle telemetry truthful

**File:** `repair-coordinator.ts` plus the existing pipeline event persistence path.

**Problem:** stage acceptance can be misread as repair success. A Debugger report accepted by contract and a Coder response accepted by contract do not prove the workspace changed or passed verification.

**Target outcome:**
- `REPAIR_PLAN_VALIDATED`: only after `validateRepairPlan()` succeeds;
- `REPAIR_COMMITTED`: only after authoritative commit receipt and revision are available;
- `REPAIR_VERIFIED`: only after fresh Tester PASS on that exact committed revision;
- `REPAIR_PARTIAL` / `REPAIR_FAILED`: retain unresolved failure IDs;
- after worker crash, reconcile by idempotency key and resume verification if a commit receipt exists. Never blindly reapply.

Use this event shape with the existing event journal if supported:

```ts
type RepairLifecycleEvent = {
  type:
    | 'REPAIR_PLAN_VALIDATED'
    | 'REPAIR_COMMITTED'
    | 'REPAIR_VERIFIED'
    | 'REPAIR_PARTIAL'
    | 'REPAIR_FAILED'
    | 'REPAIR_STAGNATION';
  pipelineRunId: string;
  attemptId: string;
  beforeRevision: string;
  afterRevision?: string;
  failureIds: string[];
  targets: string[];
  unresolvedFailureIds?: string[];
  reason?: string;
};
```

**Persistence warning:** `reconcileRepairAttemptCrash()` is a pure reconciliation function. An in-memory `Map` supplied to it is not proof of durable storage. Confirm that attempt state and commit receipts are persisted in the database. If not, add a migration and persistence path before claiming crash recovery is durable.

---

# 9. Patch F8: Distinguish static, build, and runtime verification

**Files:** `verification-loop.ts`, `orchestrator.ts`, existing validators.

The latest `orchestrator.ts` imports validators for package dependencies, API contracts, framework boundaries, and generated routes. Before adding new checks, trace whether these validators are actually called on the active pipeline path. Do not duplicate existing checks.

**Problems recorded in the latest audit:**
- Next.js route files do not match frontend API calls;
- package manifest does not match actual framework imports;
- Prisma is used without a schema/migrations;
- mock data and missing Stripe integration survive static compilation;
- static `PASS` was mistaken for application correctness.

**Target outcome:** static checks, build checks, and runtime checks are separately reported. A skipped runtime check is never called a pass.

If the Tester schema does not already express check-level evidence, add:

```ts
type VerificationMode = 'static' | 'build' | 'runtime';

type VerificationCheck = {
  name: string;
  mode: VerificationMode;
  status: 'passed' | 'failed' | 'skipped';
  evidence: string[];
  reason?: string;
};
```

Examples:
- `src/app/api/route.ts` maps to `/api`, not `/api/cart`;
- Next.js nested route `src/app/api/cart/route.ts` maps to `/api/cart`;
- frontend `fetch('/api/cart')` with no matching route fails;
- imports from `next`, `react`, `@prisma/client` must be declared in package dependencies;
- Prisma usage requires `prisma/schema.prisma`;
- runtime unavailable due environment must be `skipped`, with reason, not `passed`.

**Risk:** runtime validation can be expensive and environment-dependent. Separate environment/setup failures from application failures. Use an isolated workspace and controlled dependency install; never execute untrusted generated code on the host without isolation.

---

# 10. Execution order

Do not change the engine code while a pipeline is actively running. Freeze the engine SHA per run or use a separate worktree.

| Order | Patch | Risk | Expected behavior change |
|---|---|---|---|
| 1 | F1 target extraction + fail-closed validation | Medium | Mixed/unauthorized plans fail before Coder instead of silently dropping targets |
| 2 | F2 language policy + missing-blueprint failure | Medium | Coder refuses incomplete context and gets extension-specific syntax rules |
| 3 | F4 Debugger language rules | Low/Medium | Debugger stops recommending TS-only syntax for JS |
| 4 | F3 bounded journal + stagnation detection | Medium/High | Repeated ineffective strategy stops early with evidence |
| 5 | F7 lifecycle telemetry/persistence | Medium | Attempt, commit, and verification become distinct |
| 6 | F5 Reviewer/final-gate separation | Medium | Negative audit is persisted; release remains blocked |
| 7 | F8 runtime verification | High | More generated apps may fail honestly or be marked runtime-unverified |

Recommended PR split:
1. F1 + tests.
2. F2 + tests.
3. F4 + tests.
4. F3 + coordinator integration tests.
5. F7 + persistence/migration if required.
6. F5 + final-gate tests.
7. F8 + runtime/integration tests.

---

# 11. Failure handling matrix

| What goes wrong | Inspect | Code impact | Safe response |
|---|---|---|---|
| F1 extracts irrelevant paths | path regex, normalized paths, Debugger sections | false-positive targets; whole plan may reject | tighten parser or move to structured fields; do not weaken auth |
| F1 rejects valid path | blueprint and active authorized set | repair halts before Coder | fix upstream blueprint/authorization |
| F2 blocks Coder unexpectedly | blueprint parser, path case, target authorization | earlier stage failure | repair Blueprint coverage and resume from Blueprint/Coder |
| TS syntax still appears in `.js` | assembled Coder prompt, target extension, model output, linter | original oscillation persists | add deterministic syntax test; keep `checkJs` |
| F3 false-positive stagnation | revision, diagnostic fingerprint, strategy label | valid retry blocked | require same revision and same diagnostics; permit new evidence |
| F3 misses oscillation | journal contents and strategy taxonomy | wasted cycles/inference | use controlled strategy labels and stable diagnostic fingerprints |
| partial repair misreported as success | before/after revision and unresolved IDs | false success telemetry | report partial; require fresh Tester |
| crash after commit | idempotency key and durable receipt | duplicate mutation risk | reconcile receipt and resume verification |
| F5 accepts low score but release gate allows it | final-gate policy tests | unsafe release | add final-gate checks before deploying F5 |
| runtime check fails due environment | install logs, sandbox, runtime prerequisites | false app failure or false pass | mark environment-blocked/skipped distinctly |
| engine changes during active run | run ID and engine SHA | non-reproducible mixed-version execution | isolate/stop run and record exact SHA |

---

# 12. Required regression suite

## Target extraction and authorization
- explicit + general path merge;
- root-level config path extraction;
- duplicate normalization;
- mixed authorized/unauthorized plan rejected;
- empty authorized target set rejected;
- stale base revision rejected;
- protected control-plane target rejected.

## Language-aware repair
- `.js` direct DOM access fails;
- `.js` runtime narrowing passes;
- `.js` JSDoc works where correctly typed;
- `.js` TS assertion fails;
- `.js` TS parameter annotation fails;
- `.tsx` TS assertion passes;
- Coder prompt receives correct policy;
- Debugger prompt receives correct policy.

## Convergence
- same diagnostics + same revision + same strategy stops;
- changed revision permits retry;
- changed diagnostic fingerprint permits retry;
- partial resolution is retained;
- no-change patch is not committed;
- Coder `ACCEPTED` alone is not verified.

## Lifecycle and recovery
- receipt after crash resumes verification without reapplying;
- pre-commit crash is safe to retry;
- ambiguous commit becomes `RECOVERY_REQUIRED`;
- `REPAIR_VERIFIED` requires Tester PASS on matching revision;
- final gate rejects stale verification.

## Reviewer and release
- score 65 report accepted as audit evidence;
- final gate blocks score 65;
- final gate blocks failed conformance and coverage;
- malformed report rejected;
- stale hash rejected.

## Runtime verification
- framework route mapping;
- frontend API call with no route fails;
- undeclared package import fails;
- Prisma usage without schema fails;
- skipped runtime check is not represented as pass.

---

# 13. Run 3 acceptance protocol

After F1–F4 and F7 are implemented, reproduce the exact Run 3 prompt with the same model/configuration if possible. Capture:

- engine commit SHA and pipeline run ID;
- prompt and generated target paths;
- first Tester diagnostics;
- every Debugger strategy label;
- every Coder diff and committed workspace revision;
- post-repair Tester result;
- model calls, repair cycles, and wall-clock duration.

**Patch F is verified only if:**
1. original DOM typing errors are diagnosed;
2. Debugger recommends JavaScript-valid runtime narrowing or valid JSDoc;
3. Coder emits valid `.js` syntax;
4. `checkJs` remains enabled;
5. fresh Tester resolves the original diagnostics;
6. journal records before/after revisions and verification outcome;
7. no same-strategy retry occurs on unchanged revision/diagnostics;
8. no unauthorized target is dispatched;
9. static/build/runtime verification states are distinct;
10. failure is recorded honestly if any required check fails.

Prompt inspection, unit tests alone, or a different project run do not verify Patch F.

## Final decision

The Run 3 blocker is not insufficient repair cycles. It is the absence of language-aware repair constraints and repair-history-driven convergence. Implement F1–F4 first, then F7. Keep `checkJs` and VFS authorization enabled. Do not allow fabricated blueprint context. Accept truthful Reviewer findings as audit artifacts and let the final gate decide release eligibility.

The latest base commit already contains repair-budget and crash-reconciliation primitives. Extend those instead of introducing a second repair engine.
