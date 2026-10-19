# AutoCoder Comprehensive Remediation Plan

**Repository:** `Gautam-Mathur/AutoCoder`  
**Reviewed baseline:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17` (`99cfddd`, October 17, 2026)  
**Reference report:** `somanycpds.pdf`  
**Purpose:** Turn the reviewed findings and the clarified Debugger-to-Coder failure into a staged implementation plan with code areas, tests, and measurable acceptance criteria.

> **Baseline caveat:** This plan reflects the supplied review of commit `99cfddd` and the findings reported from `somanycpds.pdf`. It is a plan, not evidence that fixes have been applied or tests have passed. Fetch the current repository state and confirm the baseline before starting. The prior review found no associated GitHub workflow runs or status checks, so do not assume CI is green.

## 1. Goals

1. Enforce the complete **Tester → Debugger → Coder → Tester** repair cycle.
2. Fix final-gate collection handling and scope authorization/artifact reads to the active pipeline run.
3. Establish one canonical file classification and ownership policy.
4. Make Security/Reviewer reports deterministic and bind them to trusted workspace-version metadata.
5. Reduce security-scanner false positives without dropping true positives.
6. Validate specification consistency before stage acceptance/commit and feed errors into bounded retries.
7. Make Coder retries evidence-driven and targeted rather than regenerating unrelated files.
8. Align prompts, schemas, parsers, validators, and runtime behavior.
9. Test all 42 reported contract-prompt disparities and supplement static checks with generated-project integration tests.
10. Exercise artifact persistence/recovery under stale, partial, and corrupted states.

## 2. Scope and source files

Confirm each file exists and inspect its current contents on the remediation branch before editing.

| Work area | Source files to inspect | Main concern |
|---|---|---|
| Repair orchestration | `src/lib/agents/ruflo/registry/Debugger.ts`, `src/lib/agents/ruflo/verification-loop.ts`, `src/lib/agents/ruflo/contract-executor.ts` | Diagnosis must result in Coder implementation and a real retest |
| Tool execution and workspace writes | `src/lib/agents/ruflo/toolbox.ts` and the actual runner/dispatcher | File tools must mutate the same workspace that Tester reads |
| Final gate and authorization | `src/lib/agents/ruflo/final-gate.ts`, `src/lib/agents/ruflo/workspace-policy.ts` | Correct collection checks and run-specific authorization |
| File policy and architecture | `src/lib/agents/ruflo/registry/Architect.ts`, `src/lib/agents/ruflo/registry/Blueprinter.ts`, `src/lib/agents/ruflo/architecture-file-policy.ts`, `src/lib/agents/ruflo/workspace-policy.ts` | Resolve ownership, ordering, and write-permission contradictions |
| Security and reports | `src/lib/agents/ruflo/security-gate.ts`, `src/lib/agents/ruflo/contracts/schemas/security.ts`, `src/lib/agents/ruflo/contracts/schemas/reviewer.ts`, `src/lib/agents/ruflo/contracts/fingerprints.ts` | Scanner precision, parsing, provenance |
| Stage lifecycle | `src/lib/agents/ruflo/orchestrator.ts`, `src/lib/agents/ruflo/stage-acceptance.ts` | Validate before acceptance/commit |
| Blueprint/architecture contracts | `src/lib/agents/ruflo/contracts/schemas/blueprinter.ts`, `src/lib/agents/ruflo/contracts/schemas/architect.ts` | Keep structured contracts consistent with prompts |
| Existing regression tests | `src/lib/agents/ruflo/contracts/__tests__/open-issues-remediation.test.ts` and adjacent tests | Extend current coverage and add integration evidence |
| Persistence/recovery | `src/lib/agents/ruflo/artifact-store.ts` and associated tests | Projection states, crash recovery, stale/corrupt artifacts |

Before changing code, record the exact starting SHA, branch, working-tree status, package manager, available test commands, and CI workflows. Run the existing baseline tests and save their results. Do not invent function signatures or APIs; verify them in the checkout.

## 3. Priority overview

| Priority | Workstream | Completion evidence |
|---|---|---|
| P0 | A. Debugger → Coder handoff | Integration test proves authorized file write and passing retest |
| P0 | B. Final gate and run scoping | Multi-run authorization tests pass |
| P0 | C. Canonical file policy | Required-file, ownership, and write-permission tests pass independently |
| P0 | D. Report parsing/provenance | Stale or mismatched reports are rejected |
| P1 | E. Scanner precision | Positive and negative fixtures pass |
| P1 | F. Pre-acceptance specification checks | Invalid candidate is rejected before commit and receives retry feedback |
| P1 | G. Targeted Coder retries | Unrelated files remain untouched |
| P2 | H. Prompt/schema/parser/validator parity | All 42 findings have a documented disposition and regression coverage where applicable |
| P2 | I. Generated-app verification | Build/typecheck/test/route fixtures run and report results accurately |
| P2 | J. Artifact recovery fault tests | Crash, stale projection, and corruption outcomes are covered |

---

# 4. Workstream A: Make Debugger repairs reach Coder

**Priority:** P0  
**Files:** `registry/Debugger.ts`, `verification-loop.ts`, `contract-executor.ts`, `toolbox.ts`, actual agent runner/dispatcher, relevant schemas/tests.

### Problem

The intended behavior is: Tester identifies failures; Debugger diagnoses root causes and specifies fixes; Coder edits the project; Tester reruns against the modified workspace. The failure described is that the pipeline returns a list of errors while leaving code broken.

The earlier review observed that `verifyAndRepairWorkspace()` invokes Debugger and then reruns Tester without visibly applying a patch in that function. That observation alone does **not** prove the complete tool path is broken: the runner may execute tool calls. Trace the real runner and write path before deciding where the missing handoff occurs.

### Implementation tasks

**A1. Trace the execution path**

- Follow a failed Tester result into `verifyAndRepairWorkspace()`.
- Determine whether Debugger tool calls execute in the real runner and whether Debugger currently writes files or only diagnoses.
- Trace Debugger output parsing, Coder invocation (if any), tool dispatch, VFS mutation, and the workspace read by the next Tester.
- Confirm `write_file`, `apply_diff`, or current equivalents modify the same workspace instance/snapshot used by Tester.
- Record repair attempt ID, input workspace version, authorized targets, changed paths, and retest result. Do not log secrets.

**A2. Define a structured repair-plan contract**

Have Debugger return validated, machine-readable data rather than diagnostic prose alone. Include, using the repository’s existing schema conventions:

- failure IDs and relevant Tester evidence;
- root cause for each failure;
- normalized repository-relative affected paths;
- concrete repair instructions for Coder;
- verification targets/tests;
- dependencies or ordering constraints;
- a finite status such as `repairable`, `needs_information`, or `not_repairable`.

Validate the plan before Coder runs. Reject malformed plans, unknown failure IDs, unauthorized or out-of-workspace paths, and plans without actionable instructions.

**A3. Explicitly invoke Coder**

- Add or repair an explicit Debugger → Coder handoff in the orchestration layer.
- Pass the validated repair plan and relevant Tester evidence to Coder.
- Restrict edits to the intersection of the repair plan and canonical write policy, allowing supporting files only when justified and authorized.
- Await tool execution and propagate actual tool results/errors. Do not treat the model’s narrative as execution evidence.
- Preserve failure IDs so retest outcomes can be mapped to the original defects.

**A4. Prove a workspace mutation and retest**

1. Capture the stable workspace version/hash before Coder.
2. Execute Coder through the authorized tool path.
3. Capture the resulting version/hash and changed paths.
4. Verify every changed path is authorized.
5. If no files changed, do not mark the repair successful; classify the no-op explicitly.
6. Run Tester against the updated workspace and confirm it observed the post-Coder version.
7. Record which original failures passed or remain.

A hash change proves that contents changed, not that the fix is correct. The retest supplies correctness evidence.

**A5. Bound the repair loop**

- Use a configured maximum repair-attempt count consistent with existing conventions.
- Prevent infinite Tester–Debugger–Coder cycles.
- Surface Coder failures, unauthorized writes, no-op repairs, stale workspace reads, and remaining test failures.
- On exhaustion, return an explicit failed verification result with unresolved errors and attempted changes.
- Never label a Markdown diagnosis report as a completed repair.

### Required tests

- Failing test → Debugger plan → Coder invocation → authorized VFS write → Tester observes edited code.
- Prose-only or invalid Debugger output does not invoke Coder and fails clearly.
- Tool failure propagates and cannot produce a false success.
- No-op repair is not marked complete unless an explicit, validated no-op outcome is appropriate.
- Unauthorized file writes are blocked/rejected.
- Changed workspace with remaining failure triggers another bounded attempt with unresolved failures.
- Successful repair passes the original failing fixture on retest.
- Retry exhaustion terminates and reports unresolved failures.
- Tester reads the fresh workspace, not a stale snapshot.

**Acceptance gate:** At least one integration test must prove a real workspace mutation and a subsequent passing retest. A mocked Debugger → Tester sequence is insufficient.

---

# 5. Workstream B: Fix final-gate correctness and run scoping

**Priority:** P0  
**Files:** `final-gate.ts`, `workspace-policy.ts`, artifact-store/final-gate tests.

### Findings from the reviewed source

- `final-gate.ts` checks `authorizedFileSet.blueprintFiles.size > 0`, but `blueprintFiles` is declared as an array in `workspace-policy.ts`. Use a type-correct check such as `.length` or a helper.
- The reviewed `loadAuthorizedFileSet` call omits `pipelineRunId`, potentially allowing artifacts from another run to influence authorization.

### Implementation tasks

1. Correct the collection check.
2. Pass the active `pipelineRunId` through authorization and artifact lookups in the final-gate path.
3. Audit nearby call sites for conversation-scoped reads that should be run-scoped.
4. Fail closed on missing, stale, or mismatched authorization data.
5. Verify failed gates block preview/release.
6. Use clear errors without leaking secrets.
7. Add types/helpers that reduce future `.size`/`.length` mistakes.

### Required tests

- Empty and non-empty `blueprintFiles` arrays.
- Multiple runs for the same conversation with different authorized files.
- An older run’s artifact cannot satisfy the current run’s gate.
- Missing run ID/authorization data is handled safely.
- Failed gate blocks preview/release; valid current-run artifacts pass.

**Acceptance gate:** Final-gate decisions cannot silently consume authorization artifacts from a different pipeline run.

---

# 6. Workstream C: Establish one canonical file-ownership and generation policy

**Priority:** P0  
**Files:** `registry/Architect.ts`, `registry/Blueprinter.ts`, `architecture-file-policy.ts`, `workspace-policy.ts`, relevant schemas/tests.

### Findings from the review

- Architect instructions say public static assets must belong to modules, while `architecture-file-policy.ts` classifies static assets as not requiring module ownership.
- Blueprinter says entry points must come first but also describes `index.html` as the final file.
- `computeAuthorizedFileSet()` combines blueprint files with architecture files that do not require module ownership. This can include config, schemas, docs, static assets, and other special files in the Coder target set.
- `isCoderGeneratedFile()` returns true for several of these classes, so using that helper alone does not resolve the policy ambiguity.

### Implementation tasks

**C1. Separate three concepts**

Represent independently:

1. **Required project files:** must exist in the final workspace.
2. **Coder-authorized files:** Coder may create/edit during a specific stage or repair.
3. **Setup-/asset-/configuration-managed files:** created or maintained by a dedicated process and not automatically assigned to Coder.

“Must exist” must not imply “Coder can write it.”

**C2. Create a canonical classification matrix**

For each file class, define existence requirements, module-ownership requirements, creating stage/agent, initial-generation permission, repair permission, text/binary/generated/tool-managed status, and the validator enforcing the rule. Cover application source, entry points/routes, `index.html`, static/binary assets, configs/manifests, lockfiles, schemas/contracts, docs, build output, and environment/example files. Derive exact behavior from current requirements; do not assume every class should be writable.

**C3. Align policy consumers**

- Align Architect prompt examples with the canonical policy.
- Make Blueprinter ordering rules unambiguous and consistent with its schema.
- Have `architecture-file-policy.ts` and `workspace-policy.ts` consume one canonical classifier where feasible.
- Return separately typed required-file and writable-file sets from authorization computation.
- Intersect repair targets with canonical policy and per-attempt authorization.
- Preserve legitimate unowned assets/configuration without authorizing all of them for arbitrary Coder edits.

**C4. Normalize paths**

- Normalize repository-relative paths before comparisons.
- Reject traversal paths, absolute paths, and paths escaping the workspace.
- Define separator, duplicate, case-sensitivity, and generated-directory behavior.
- Add framework-specific route/entry-point fixtures rather than broad filename assumptions.

### Required tests

- Policy matrix across each file class and operation.
- Public assets can be required without incorrect module ownership.
- Binary/setup-managed files are not sent to Coder unless supported explicitly.
- `index.html` ordering agrees across prompt/schema/parser/validator.
- Config and lockfile creation/edit permissions are explicit.
- Traversal/out-of-workspace paths are rejected.
- Prompt examples pass real validators.
- Required files are accounted for without automatically becoming writable.

**Acceptance gate:** File existence, module ownership, and write authorization are independent, explicit decisions.

---

# 7. Workstream D: Make Security/Reviewer parsing and workspace provenance deterministic

**Priority:** P0  
**Files:** `security-gate.ts`, Security/Reviewer schemas, `contracts/fingerprints.ts`, executor/artifact metadata, tests.

### Problem and design adjustment

Relying on a model to reproduce a 64-character workspace hash is fragile. However, blindly appending a hash to report text after validation can break content hashes and provenance. Do not mutate report content to force a hash match.

### Implementation tasks

1. Capture the trusted workspace version/hash when each Security/Reviewer stage starts.
2. Bind that value to stage execution context.
3. Store trusted workspace identity in structured artifact metadata, not only free-form model text.
4. Validate that the report applies to the workspace version reviewed.
5. Reject missing, stale, or mismatched provenance.
6. Keep content hashes separate from contract fingerprints.
7. Parse reports deterministically: validate required fields/schema, malformed output, enum values, extra prose/fenced JSON behavior, and duplicate/ambiguous fields according to project conventions.
8. Ensure persistence is atomic or recoverable so partial artifacts cannot appear complete.
9. Feed parse/provenance failures into the appropriate retry path.

### Required tests

- Current-workspace report is accepted.
- Older workspace report is rejected.
- Missing/malformed provenance is rejected.
- Contract fingerprint mismatch is independent of content-hash validation.
- Parsing failure cannot become an empty or passing report.
- No post-validation text mutation is used to inject provenance.
- Interrupted artifact writes cannot appear valid and complete.

**Acceptance gate:** Provenance is checked against trusted execution metadata; generated report content is not rewritten after validation to force a match.

---

# 8. Workstream E: Reduce Security scanner false positives without weakening detection

**Priority:** P1  
**Files:** `security-gate.ts` and scanner tests/fixtures.

### Findings from the review

- The unsafe-evaluation rule can match `eval(` inside comments because it scans line text.
- The SQL rule can match ordinary source text rather than unsafe query construction.
- Regex-only scanning cannot reliably interpret every JavaScript/SQL context.

### Implementation tasks

1. Document each rule’s intended detection and limitations.
2. Use a lexer/parser or bounded lexical pass to distinguish executable code from comments and unrelated strings where needed.
3. Prefer AST-based checks or established analysis tools for syntax/context-sensitive rules.
4. Keep regexes only for patterns where they are appropriate.
5. Separate detection, severity, evidence location, and report serialization.
6. Make scanner/parser failures explicit and never silently treat them as a clean scan.
7. Add positive and negative fixtures for each rule, including comments, strings, escaped text, multiline cases, safe parameterized SQL, and actual unsafe patterns.

### Required tests

- `eval(` in a comment does not trigger an executable-code finding.
- `eval(` in an ordinary string is handled according to the rule’s documented intent.
- Actual unsafe dynamic evaluation is detected.
- Safe parameterized SQL does not trigger an unsafe-query finding.
- Actual unsafe query construction is detected.
- Scanner/parser failure yields an explicit failure/inconclusive result, not a pass.
- Existing true-positive detections remain covered.

**Acceptance gate:** False-positive fixtures are corrected without silently dropping true-positive detection.

---

# 9. Workstream F: Move specification checks into stage validation/retry

**Priority:** P1  
**Files:** `orchestrator.ts`, `stage-acceptance.ts`, System-stage validators/schemas/tests.

### Finding

The reviewed `orchestrator.ts` runs the specification contradiction check after the System-stage artifact has been accepted and committed. Invalid output can fail outside the normal candidate-validation retry mechanism.

### Implementation tasks

1. Locate candidate creation, validation, acceptance, and commit boundaries.
2. Run specification consistency checks before candidate acceptance/commit.
3. Return concrete contradictions and locations as feedback to the stage that can fix them.
4. Use the existing bounded retry mechanism.
5. Ensure each retry validates the new candidate, not a stale artifact.
6. Preserve diagnostics when retries are exhausted.
7. Retain post-acceptance assertions only as defense in depth, not as the primary correction mechanism.

### Required tests

- Valid specification passes.
- Invalid specification is rejected before acceptance/commit.
- Retry receives actionable contradiction details.
- Corrected candidate is accepted.
- Invalid candidate remains rejected after retry exhaustion.
- Validation runs against the exact candidate/version being committed.

**Acceptance gate:** An invalid System-stage candidate cannot be committed before its specification check succeeds.

---

# 10. Workstream G: Make Coder retries targeted and safe

**Priority:** P1  
**Files:** Coder prompt/registry/execution, `verification-loop.ts`, workspace authorization, relevant schemas/tests.

### Implementation tasks

1. Normalize Tester/validator failures into records with IDs, paths, test names, and diagnostics.
2. Derive repair targets from failure evidence and the Debugger plan.
3. Intersect target paths with canonical Coder write permissions.
4. Permit supporting-file edits only when justified by the repair plan and authorized.
5. Pass exact scope and unresolved failures to Coder.
6. Avoid broad regeneration unless evidence shows it is necessary.
7. Detect edits outside the approved target set.
8. Run targeted tests and required broader verification after changes.
9. Record changed files and resolved/remaining failures per attempt.

### Required tests

- Localized defect edits only intended targets.
- Authorized supporting-file edit is allowed when justified.
- Unrelated file edit is rejected.
- Multi-file failures produce a complete bounded target set.
- Next attempt receives unresolved failures, not stale resolved ones.
- Full regeneration is not an accidental fallback.

**Acceptance gate:** Retry scope is evidence-driven, authorized, and allows necessary supporting changes.

---

# 11. Workstream H: Synchronize prompts, schemas, parsers, and validators

**Priority:** P2  
**Files:** Agent prompts, schemas, parsers, validators, fingerprints, contract tests.

### Implementation tasks

1. Inventory all 42 disparities from `somanycpds.pdf`.
2. Give each a stable ID, exact affected components, severity, reproduction evidence, fix, and regression test.
3. Classify each as confirmed/reproducible, confirmed but requiring design adjustment, not reproduced on current baseline, duplicate/overlapping, or awaiting runtime evidence.
4. Do not claim all 42 are independently confirmed until inventory is complete.
5. Align prompt output requirements with schema/parser behavior and align validator semantics with prompts.
6. Add table-driven tests for required fields, enums, ordering, path policy, optional fields, and malformed output.
7. Ensure contract fingerprints change deterministically when relevant contracts change and are checked at the correct boundary.
8. Add prompt/schema compatibility tests to CI.
9. Prefer shared constants or generated contract documentation where feasible, while keeping runtime contracts explicit.

### Required tests

- Every confirmed disparity has a regression test or reviewed exception.
- Prompt-required fields are accepted by schema/parser.
- Schema-required fields are requested by prompt or supplied by trusted runtime metadata.
- Invalid enums, missing fields, malformed paths, and inconsistent ordering are rejected.
- Fingerprint changes are deterministic.
- Test output reports coverage by disparity ID.

**Acceptance gate:** All 42 findings have a documented disposition. “Resolved” requires a passing regression test or a reviewed, evidence-backed non-applicability decision.

---

# 12. Workstream I: Verify generated applications, not just contracts

**Priority:** P2  
**Files:** Generated-project fixture harness, build/test runner, pipeline integration tests.

Contract consistency does not prove the application builds or works. The review called out possible missing dependencies, broken routes, type errors, dead UI actions, and incorrect business logic; those require runtime/integration evidence.

### Implementation tasks

1. Build a small representative fixture set for supported frameworks and route conventions.
2. Cover entry-point discovery, static assets/public paths, nested/dynamic routes, dependency and lockfile handling, type errors, broken imports, dead UI actions where testable, localized repair, and workspace-bound Security/Reviewer reports.
3. Run supported install/build/typecheck/test commands in the project’s isolated execution environment.
4. Treat command failure, timeout, or unavailable runtime as explicit outcomes, not passes.
5. Verify command, path, and resource limits in the execution environment.
6. Distinguish contract-valid, build-valid, test-valid, security-reviewed, and final-gate-approved states.
7. Report exactly which checks ran.

### Required tests

- Known-good fixture builds and passes.
- Broken import/type-error fixtures fail correctly.
- Route fixtures validate framework-specific conventions.
- Missing dependencies are detected.
- Repaired fixture is rebuilt/retested after actual file mutation.
- Timeout/unavailable command is not reported as successful verification.

**Acceptance gate:** The final result reports actual executed checks and does not infer correctness from static contract validation.

---

# 13. Workstream J: Test artifact persistence and recovery

**Priority:** P2  
**Files:** `artifact-store.ts`, projection/reconciliation logic and tests.

### Concern from the review

The artifact store tracks projection states such as `PENDING`, `SYNCED`, and `FAILED`. The prior review found coverage for a `PENDING` → `SYNCED` path, but crash/corruption behavior was not established by the available evidence.

### Implementation tasks

1. Map the authoritative store and projection/reconciliation lifecycle.
2. Define outcomes for partial writes, missing projections, stale projections, corrupted content, and interrupted reconciliation.
3. Inject failures at persistence boundaries.
4. Ensure partial/corrupt artifacts cannot be accepted as complete stage results.
5. Make recovery idempotent.
6. Bind artifact metadata to pipeline run and workspace version where applicable.
7. Preserve useful diagnostics without leaking sensitive content.

### Required tests

- `PENDING` projection recovers to `SYNCED`.
- Reconciliation is repeatable and safe.
- Missing/corrupted source artifacts fail closed.
- Stale projection cannot override authoritative data.
- Interrupted writes recover or produce clear failure.
- One run’s artifacts cannot satisfy another run’s gate.

**Acceptance gate:** Recovery is tested under injected failures, not only the happy path.

---

# 14. Recommended implementation sequence

## Phase 0: Reconfirm baseline

- [ ] Fetch current repository state and record the exact commit SHA.
- [ ] Confirm branch and working-tree status.
- [ ] Inspect all files listed in Section 2.
- [ ] Read the full 42-disparity inventory in `somanycpds.pdf`.
- [ ] Map every finding to current code and existing tests.
- [ ] Identify test scripts and CI workflows.
- [ ] Run baseline tests and record failures before edits.
- [ ] Trace the actual Debugger/Coder/tool execution path.

**Exit:** Baseline and reproduction status are recorded; changes are not based solely on an old snapshot.

## Phase 1: P0 safety and correctness

- [ ] Fix final-gate collection handling and run scoping.
- [ ] Add multi-run authorization regression tests.
- [ ] Define the Debugger repair-plan contract.
- [ ] Implement explicit Debugger → Coder handoff.
- [ ] Prove authorized VFS writes reach the workspace Tester reads.
- [ ] Add bounded retries and honest failure states.
- [ ] Establish canonical file classification and write authorization.
- [ ] Bind Security/Reviewer artifacts to trusted workspace metadata.

**Exit:** Critical repair, authorization, and provenance paths have passing regression tests.

## Phase 2: P1 validation and scanner behavior

- [ ] Reduce scanner false positives with context-aware checks.
- [ ] Add positive and negative scanner fixtures.
- [ ] Move System specification checks before acceptance/commit.
- [ ] Feed actionable validation errors into bounded retries.
- [ ] Implement target-scoped Coder retries.
- [ ] Verify supporting edits remain authorized.

**Exit:** Invalid candidates are rejected before acceptance; repairs are scoped and observable.

## Phase 3: P2 contract parity and runtime coverage

- [ ] Add a stable inventory for all 42 disparities.
- [ ] Implement prompt/schema/parser/validator table-driven tests.
- [ ] Add generated-project build/typecheck/test fixtures.
- [ ] Add route, dependency, path-normalization, and asset-policy fixtures.
- [ ] Add artifact crash/corruption fault-injection tests.
- [ ] Integrate relevant tests into CI.
- [ ] Publish evidence-backed status for each disparity.

**Exit:** Static contracts and runtime behavior have repeatable regression coverage.

## Phase 4: Final verification and release readiness

- [ ] Run formatting, lint, typecheck, unit tests, integration tests, and build commands supported by the repository.
- [ ] Run the end-to-end failing-test → Debugger → Coder → retest fixture.
- [ ] Verify final gate rejects stale/wrong-run artifacts.
- [ ] Verify no repair path reports success without required evidence.
- [ ] Review authorization and security-sensitive changes.
- [ ] Record exact commit SHA, commands/results, skipped checks, and known remaining issues.
- [ ] Update the disparity inventory and remediation status.

**Exit:** Completion is based on observed test results and reviewed code, not generated reports or an unverified status field.

---

# 15. Definition of done

## Debugger repair loop

- [ ] Tester failures reach Debugger with usable evidence.
- [ ] Debugger returns a validated, actionable repair plan.
- [ ] Coder is explicitly invoked with that plan.
- [ ] Authorized tools modify the actual workspace.
- [ ] Workspace identity/version before and after is recorded correctly.
- [ ] Tester reads the updated workspace.
- [ ] A passing retest confirms the repaired fixture.
- [ ] Failed repairs and retry exhaustion remain explicit failures.

## Gate, ownership, and provenance

- [ ] Final-gate collection checks use correct semantics.
- [ ] Authorization/artifact reads are scoped to the active pipeline run.
- [ ] Required files, owned files, writable files, and setup-managed files are distinct.
- [ ] Prompts and schemas agree on ordering and ownership.
- [ ] Security/Reviewer reports use trusted workspace metadata.
- [ ] Stale, malformed, mismatched, or corrupted artifacts fail safely.

## Security and validation

- [ ] Scanner true-positive and false-positive fixtures pass.
- [ ] Specification checks run before acceptance/commit.
- [ ] Retry feedback is actionable and bounded.
- [ ] Coder retry scope is authorized and evidence-driven.
- [ ] Build/test/runtime checks are reported only when actually executed.

## Inventory and delivery

- [ ] All 42 disparities have a recorded disposition.
- [ ] Every confirmed issue has a regression test or reviewed exception.
- [ ] CI runs the new tests.
- [ ] Final PR records exact commands and results, plus remaining risks.
- [ ] No item is complete solely because a prompt, report, or mock test claims success.

---

# 16. Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| Debugger returns a plan but Coder is never invoked | Project remains broken | Explicit orchestration and integration test proving Coder invocation |
| Coder writes to a different/stale workspace | Retest does not verify the edit | Verify workspace identity/version at each handoff |
| Hash change is treated as proof of correctness | False repair success | Require retest evidence as well as mutation evidence |
| Repair plan authorizes too many files | Unintended/unsafe edits | Intersect plan targets with canonical policy and per-attempt authorization |
| File policy is loosened to make validation pass | Missing ownership/accountability | Separate required files from writable and setup-managed files |
| Scanner changes suppress real findings | Security regression | Pair each false-positive fixture with true-positive fixtures |
| Spec check remains post-commit | Invalid artifact becomes accepted | Validate candidate before acceptance/commit |
| Retries are unbounded | Excessive cost or non-terminating pipeline | Enforce attempt limit and preserve unresolved failures |
| Model-produced provenance is trusted | Stale reports can pass | Bind trusted workspace metadata in execution context |
| Mock-only tests pass while real tools fail | Runtime defects remain hidden | Add a real VFS/tool-runner integration test |
| Recovery tests cover only happy paths | Corrupt/partial state may be accepted | Inject crash, corruption, and stale-projection failures |

---

# 17. Required implementation report

At completion, provide this evidence for every finding:

| Field | Required evidence |
|---|---|
| Baseline and final commit | Exact full commit SHAs |
| Finding/disparity ID | Stable ID from the inventory |
| Original issue | Source-backed description |
| Files changed | Actual diff paths |
| Fix implemented | Code-level summary |
| Regression test | Test name and what it proves |
| Commands run | Exact commands |
| Result | Pass, fail, skipped, or not applicable |
| Runtime evidence | Workspace mutation, retest result, run ID, or artifact metadata as appropriate |
| Remaining risk | Known limitations or unresolved findings |

Do not claim “all 42 fixed” unless each item has an evidence-backed disposition and all applicable tests have actually run.

## Final recommendation

Start with the final-gate defect and the Debugger → Coder handoff, but implement the handoff as a complete, observable workflow rather than adding a single function call. Then unify file authorization and report provenance before proceeding to scanner precision, stage lifecycle, and the full disparity test suite.

**Core acceptance principle:** Diagnosis is not repair; a report is not a workspace mutation; a hash change is not correctness; and contract acceptance is not proof that the generated application works.

---

# 18. Required architectural amendments

This section strengthens and, where needed, supersedes the earlier workstreams. These requirements are part of the original plan, not optional follow-up work.

## 18.1 One canonical repair coordinator

**Requirement:** Workstreams A (Debugger-to-Coder handoff) and G (targeted Coder retries) must use **one canonical repair coordinator**. Do not create two independent repair loops, retry policies, or competing sources of truth.

The coordinator owns the complete lifecycle:

1. Normalize Tester output into stable failure IDs.
2. Receive and validate the Debugger repair plan against those failures.
3. Resolve authorized target files using the canonical file policy.
4. Invoke Coder through AutoCoder's existing generation, agent-runner, and tool-execution architecture.
5. Capture and enforce the workspace version on which the plan was based.
6. Apply authorized changes through the actual write boundary.
7. Capture a fresh post-write workspace version/snapshot.
8. Run required verification checks against that exact snapshot.
9. Associate verification results with original failure IDs and the repair attempt.
10. Decide whether to retry, stop, or report unresolved failures using one bounded policy.

`verification-loop.ts` should delegate to this coordinator or become its thin lifecycle adapter. Target selection, repair execution, retry policy, and failure tracking must not be independently reimplemented in separate paths.

### Suggested module boundary

Use existing naming and dependency-injection conventions. If no suitable coordinator exists, introduce a module such as `repair-coordinator.ts` and make it the only owner of repair-attempt state transitions.

Illustrative interfaces (adapt to actual repository types):

```ts
type FailureId = string;
type WorkspaceVersion = string;
type RepairAttemptId = string;

interface NormalizedFailure {
  id: FailureId;
  source: "tester" | "validator" | "build";
  message: string;
  affectedFiles: string[];
  evidence?: string[];
}

interface RepairPlan {
  basedOnWorkspaceVersion: WorkspaceVersion;
  failureIds: FailureId[];
  affectedFiles: string[];
  instructions: string[];
  verificationTargets: string[];
}

interface RepairAttemptResult {
  attemptId: RepairAttemptId;
  status: "repaired" | "retryable" | "conflict" | "failed";
  beforeVersion: WorkspaceVersion;
  afterVersion?: WorkspaceVersion;
  resolvedFailureIds: FailureId[];
  unresolvedFailureIds: FailureId[];
  changedFiles: string[];
  reason?: string;
}
```

These are design examples, not claims about existing repository types.

### Suggested coordinator flow

```ts
async function coordinateRepair(input: RepairInput): Promise<RepairResult> {
  const failures = normalizeFailures(input.testerResult);
  if (failures.length === 0) return noRepairNeeded();

  const baseVersion = await workspace.getVersion(input.workspaceId);
  const plan = await debuggerAgent.createRepairPlan({
    failures,
    workspaceVersion: baseVersion,
  });

  validateRepairPlan(plan, failures, baseVersion);

  const authorizedTargets = await filePolicy.resolveWritableTargets({
    workspaceId: input.workspaceId,
    pipelineRunId: input.pipelineRunId,
    requestedPaths: plan.affectedFiles,
    operation: "repair",
  });

  if (plan.basedOnWorkspaceVersion !== baseVersion) {
    return conflictResult("Repair plan was created for a different workspace version.");
  }

  return executeRepairAttempt({
    plan,
    failures,
    authorizedTargets,
    expectedWorkspaceVersion: baseVersion,
  });
}
```

This is a sequencing sketch, not a drop-in patch. Adapt it to the actual APIs and avoid adding a second abstraction if the current orchestrator already provides the canonical boundary.

### Coordinator invariants and tests

- One authoritative repair-attempt state machine exists.
- Failure IDs remain stable across retries for the same underlying failure; newly discovered failures receive new IDs.
- Every attempt records pipeline run, workspace ID/version, plan, authorized targets, changed paths, and verification result.
- Coder runs through the existing execution architecture, not a parallel ad hoc tool path.
- No component can declare success because Debugger produced a plan or report.
- Terminal states distinguish success, conflict, retry exhaustion, invalid plan, tool failure, and unresolved test failures.
- Tests prove initial repair and targeted retry both use the coordinator, IDs remain associated, authorization is run-scoped, and retry exhaustion produces one authoritative result.

**Acceptance gate:** Workstreams A and G are not complete until both are implemented and tested through the same coordinator.

---

## 18.2 Define repair success as a strict conjunction of evidence

A repair attempt succeeds **only if every condition below is true**:

1. The Debugger repair plan is structurally valid and references the current normalized failures.
2. Every file change is within the authorized target set and permitted for the active pipeline run.
3. The workspace version used by Tester is exactly the version produced by that repair attempt.
4. All required verification checks actually execute. Skipped, timed-out, unavailable, or errored checks do not count as passes.
5. The relevant original failures are resolved according to their verification criteria.
6. The accepted result is recorded against the correct pipeline run, repair attempt, and workspace version.

Illustrative predicate:

```ts
function isRepairSuccessful(e: RepairEvidence): boolean {
  return (
    e.planValid &&
    e.allChangesAuthorized &&
    e.testerWorkspaceVersion === e.postRepairWorkspaceVersion &&
    e.requiredChecks.every(check => check.status === "passed") &&
    e.unresolvedOriginalFailureIds.length === 0 &&
    e.acceptedRunId === e.pipelineRunId &&
    e.acceptedWorkspaceVersion === e.postRepairWorkspaceVersion
  );
}
```

This assumes checks have explicit statuses and IDs/versions come from trusted execution metadata. Model-authored claims alone are not evidence. A skipped or unavailable required check means the result is inconclusive or failed, never successful by default.

---

## 18.3 Prevent concurrent workspace changes from corrupting repairs

A repair plan must be tied to the exact workspace version it analyzed. A hash change alone is insufficient when other agents or pipeline operations may write concurrently.

### Required concurrency protocol

1. Capture a trusted workspace version/fingerprint when Tester failures are normalized and the repair plan is requested.
2. Include that version in the Debugger execution context and validated repair plan.
3. Before applying any change, compare the current workspace version with the plan's base version.
4. If the version differs unexpectedly, do not apply the stale plan. Return a conflict result and either re-read/retest/replan or abort under the bounded retry policy.
5. Apply the authorized patch atomically where the storage layer supports it. If multi-file atomic transactions are unavailable, define the write sequence, partial-write recovery, and rollback/abort semantics explicitly.
6. Capture a fresh, immutable verification snapshot/version after writes complete.
7. Run Tester and other required checks against that exact snapshot.
8. Before accepting the result, verify that the accepted workspace version still matches the version tested. If another write occurred during verification, invalidate the result and re-verify or abort.
9. Scope all reads and writes to the correct workspace and `pipelineRunId`.

### Suggested compare-and-swap write contract

```ts
interface ApplyRepairInput {
  workspaceId: string;
  pipelineRunId: string;
  expectedBaseVersion: string;
  authorizedPaths: string[];
  patch: RepairPatch;
}

async function applyRepair(input: ApplyRepairInput) {
  return workspace.withExclusiveWrite(input.workspaceId, async () => {
    const currentVersion = await workspace.getVersion(input.workspaceId);

    if (currentVersion !== input.expectedBaseVersion) {
      return {
        status: "conflict" as const,
        expectedVersion: input.expectedBaseVersion,
        actualVersion: currentVersion,
      };
    }

    await authorization.assertPatchAllowed({
      workspaceId: input.workspaceId,
      pipelineRunId: input.pipelineRunId,
      paths: input.patch.paths,
      authorizedPaths: input.authorizedPaths,
    });

    await workspace.applyPatchAtomically({
      workspaceId: input.workspaceId,
      patch: input.patch,
      expectedVersion: input.expectedBaseVersion,
    });

    return {
      status: "applied" as const,
      version: await workspace.getVersion(input.workspaceId),
    };
  });
}
```

This is a reference contract, not a drop-in implementation. Use a true compare-and-swap/transaction mechanism if the VFS supports it. A process-local mutex is insufficient if multiple workers or processes can write to the same workspace. If atomic multi-file writes are unsupported, document and test the partial-write recovery strategy.

### Conflict policy and required tests

- **Conflict before write:** discard the stale patch, refresh the workspace, rerun relevant checks, and create a new plan within the attempt budget; otherwise abort with an explicit conflict.
- **Conflict during/after write:** do not accept the result. Reconcile workspace state, determine whether partial writes occurred, and either recover safely or abort.
- **Conflict during verification:** the test result is stale relative to the current workspace. Re-run checks on a fresh snapshot or stop with a conflict.
- Never blindly reapply a patch generated against an older workspace version.
- Test plan-to-write conflicts, concurrent attempts on one workspace, unrelated concurrent edits, partial multi-file write failures, changes during Tester execution, stale acceptance, and bounded conflict retries.

**Acceptance gate:** Every patch has a checked base version, writes have defined atomicity/conflict semantics, and verification is bound to a fresh post-repair snapshot.

---

## 18.4 Enforce authorization at the actual write boundary

Plan validation and coordinator target resolution are necessary but insufficient. The tool/write layer must independently enforce authorization so an agent cannot bypass the coordinator by calling a tool directly.

For every `write_file`, `apply_diff`, patch, rename, delete, or equivalent mutation:

- Normalize and validate the path; reject absolute paths, traversal, symlink escapes, and paths outside the active workspace.
- Validate workspace ID and active `pipelineRunId`.
- Verify the operation is permitted for the file class and lifecycle stage.
- Verify the path is authorized for this attempt, not merely authorized in another run.
- Verify the expected base workspace version when applying a repair patch.
- Apply the mutation atomically where supported, or follow documented partial-write recovery.
- Record the operation outcome and changed paths in trusted metadata.
- Fail closed if authorization metadata is missing, stale, or inconsistent.

Illustrative boundary guard:

```ts
async function guardedWrite(input: WriteInput) {
  const path = normalizeAndValidateWorkspacePath(input.path);

  await authorization.assertCanWrite({
    workspaceId: input.workspaceId,
    pipelineRunId: input.pipelineRunId,
    repairAttemptId: input.repairAttemptId,
    path,
    operation: input.operation,
  });

  await workspace.assertVersion(input.workspaceId, input.expectedVersion);
  return workspace.writeAtomically({
    workspaceId: input.workspaceId,
    path,
    content: input.content,
    expectedVersion: input.expectedVersion,
  });
}
```

Adapt this to the real VFS/toolbox APIs. Authorization must run inside the trusted mutation boundary for every write, patch, delete, and rename, not only once when a plan is created.

### Required tests

- Direct tool call to an unauthorized file is rejected.
- A path authorized in another pipeline run is rejected.
- Path traversal and symlink escape are rejected.
- Rename/delete/apply-diff receive the same policy enforcement as file writes.
- Missing authorization context fails closed.
- Stale expected workspace version is rejected.
- Authorized writes succeed and produce auditable mutation metadata.

**Acceptance gate:** No mutation tool can change workspace content without independently checking path, operation, run, attempt, and version authorization.

---

## 18.5 Specify security-detection semantics per rule

Do not define the scanner requirement merely as “use AST-based checks.” AST analysis helps with source-language structure but does not automatically understand SQL semantics, shell behavior, data flow, dynamic evaluation, or runtime-generated strings.

For every security rule, document:

- **Threat/behavior:** the unsafe behavior the rule intends to detect.
- **Scope:** supported languages, syntax forms, and contexts.
- **Detection method:** lexical analysis, language AST, data-flow analysis, SQL parser, shell-aware analysis, established static-analysis tool, or a layered approach.
- **Positive examples:** unsafe constructs that must be detected.
- **Negative examples:** safe constructs and text contexts that must not trigger.
- **Known blind spots:** unsupported syntax, dynamic construction, reflection, generated code, or cross-file/data-flow cases.
- **Severity/confidence:** how findings are classified and when a result must be marked inconclusive.
- **Failure semantics:** what happens if parsing or analysis cannot complete.

Rule-specific guidance:

- **Dynamic evaluation:** use a TypeScript/JavaScript parser for syntactic context, then define how aliases, computed properties, and dynamically referenced functions are handled. A text match alone is insufficient.
- **SQL injection:** distinguish SQL text from query execution and assess whether untrusted data reaches query structure. Use framework-aware APIs, query construction analysis, or taint/data-flow analysis where supported. A host-language AST alone does not prove a query is safe.
- **Shell command injection:** distinguish fixed command invocations from user-controlled data entering command strings or arguments. Use API-aware and data-flow checks where possible; document cases that cannot be analyzed reliably.
- **Comments and strings:** prevent plain examples or documentation from being reported as executable vulnerabilities unless a rule intentionally scans those contexts.
- **Analysis failures:** syntax errors, unsupported constructs, and tool failures must be surfaced as failed/inconclusive analysis, not silently converted into a clean scan.

Every rule needs paired positive and negative fixtures, plus tests for parser/tool failure and documented blind spots. A rule is not complete if only its false-positive fixture is tested.

**Acceptance gate:** Each scanner rule has explicit detection semantics, test fixtures, and known limitations. The analysis method is chosen for the rule rather than mandated uniformly.

---

## 18.6 Make the 42-disparity inventory a first-class deliverable

Create and review the disparity inventory **before declaring contract-parity work complete**. The count of 42 is a report claim to reconcile against the actual report and confirmed baseline; it must not be treated as 42 reproduced defects without evidence.

Track the inventory in a file such as `docs/remediation/contract-prompt-disparities.md` or an equivalent machine-readable format, using existing repository conventions where suitable. Each report item must have:

- Stable disparity ID.
- Exact report reference (page, section, table row, or finding number in `somanycpds.pdf`).
- Exact prompt, schema, parser, validator, or runtime components involved.
- Confirmed baseline commit SHA.
- Reproduction status on that baseline.
- Minimal reproduction steps or regression-test name.
- Expected behavior.
- Observed behavior and evidence.
- Planned resolution or documented rationale for no change.
- Current status: `untriaged`, `confirmed`, `not_reproduced`, `fix_in_progress`, `fixed_test_pending`, `verified`, `deferred`, or `not_applicable`.
- Evidence for each status transition, including relevant test result/commit.
- Dependencies on other findings or shared fixes.

### Suggested machine-readable record

```ts
interface DisparityRecord {
  id: string;
  reportReference: {
    file: "somanycpds.pdf";
    page?: number;
    section?: string;
    finding?: string;
  };
  components: Array<{
    kind: "prompt" | "schema" | "parser" | "validator" | "runtime";
    path: string;
  }>;
  baselineCommit: string;
  reproductionStatus: "confirmed" | "not_reproduced" | "not_yet_tested";
  reproduction?: string;
  regressionTest?: string;
  expectedBehavior: string;
  observedBehavior?: string;
  resolution?: string;
  status:
    | "untriaged"
    | "confirmed"
    | "fix_in_progress"
    | "fixed_test_pending"
    | "verified"
    | "deferred"
    | "not_applicable";
  evidence: string[];
  relatedIds: string[];
}
```

Use the existing documentation/data conventions if a suitable inventory already exists. Do not create a duplicate source of truth unnecessarily.

### Inventory acceptance criteria

- All report entries are accounted for, including duplicates, overlaps, and findings that do not reproduce.
- Every item has an exact report reference and identified source components.
- Every confirmed item has a minimal reproduction or regression test.
- `verified` requires a passing relevant test on a recorded commit.
- `not_reproduced` and `not_applicable` require a reason and review evidence.
- The inventory can generate a summary by status and test coverage.
- A validation script checks missing IDs, duplicate IDs, missing report references, and invalid status transitions where practical.
- P2 is not complete while any report item is unaccounted for, even if all currently confirmed defects have been fixed.

Suggested inventory validation example:

```ts
function validateInventory(records: DisparityRecord[]) {
  const ids = new Set<string>();

  for (const record of records) {
    if (!record.id.trim()) throw new Error("Disparity ID is required.");
    if (ids.has(record.id)) throw new Error(`Duplicate disparity ID: ${record.id}`);
    ids.add(record.id);

    if (!record.reportReference.file) {
      throw new Error(`Missing report reference for ${record.id}`);
    }
    if (record.status === "verified" && record.evidence.length === 0) {
      throw new Error(`Verified disparity lacks evidence: ${record.id}`);
    }
    if (
      record.reproductionStatus === "confirmed" &&
      !record.regressionTest &&
      !record.reproduction
    ) {
      throw new Error(`Confirmed disparity lacks reproduction evidence: ${record.id}`);
    }
  }
}
```

This is a conceptual example; implement it in the project's chosen language and test framework if useful.

**Acceptance gate:** Every reported disparity has a traceable disposition, and “all 42 resolved” is not claimed until inventory completeness and evidence requirements are satisfied.

---

# 19. Updated definition of done

The earlier definition of done remains in force, with these additional mandatory conditions:

- [ ] One canonical repair coordinator owns failure normalization, plan validation, target resolution, Coder invocation, verification, retries, and terminal status.
- [ ] Workstreams A and G share the same coordinator and retry policy.
- [ ] Repair success requires all six evidence conditions in Section 18.2.
- [ ] Repair plans are tied to a trusted base workspace version.
- [ ] Stale plans are rejected before patch application.
- [ ] Concurrent modifications trigger explicit conflict handling.
- [ ] Writes have defined atomicity or partial-write recovery semantics.
- [ ] Verification uses a fresh snapshot and acceptance checks that it is still current.
- [ ] Authorization is rechecked at every actual write/patch/delete/rename boundary.
- [ ] Every security rule documents threat semantics, supported contexts, detection method, positive/negative fixtures, and limitations.
- [ ] The 42-disparity inventory is complete, reviewed, and evidence-backed.
- [ ] Every status marked `verified` points to a passing test result and commit.

## Updated final recommendation

Implement the repair coordinator and workspace-version/conflict protocol before treating the Debugger repair workflow as complete. Enforce authorization at the write boundary, not only in planning. Then make the 42-disparity inventory the auditable source of truth for contract-parity progress.

**Governing rule:** A repair is successful only when a valid plan is safely applied to the workspace version it was based on, required checks run against the resulting current version, the original failures are resolved, and the accepted evidence is recorded against the correct run.

---

# 20. Resolve remaining architectural ambiguities

This section addresses six implementation risks that must be resolved before the coordinator and release behavior are treated as implementation-ready. It refines earlier requirements; where wording conflicts, this section is the controlling specification.

## 20.1 Dependency order: define policy contracts before implementing the coordinator

The earlier Phase 1 sequence could be read as implementing the coordinator before the canonical authorization policy exists. That creates a risk of building coordinator logic against provisional rules and then duplicating or bypassing policy later.

**Required dependency order:**

1. Inventory the current path authorization and workspace APIs.
2. Define the canonical file classification and authorization contract, including required files vs. writable files, stage ownership, workspace/run scope, and repair-attempt scope.
3. Implement and test the authorization service and write-boundary enforcement.
4. Define the normalized failure and repair-plan contracts against that policy.
5. Implement the canonical repair coordinator using the stable policy interfaces.
6. Connect Debugger, Coder, VFS mutation tools, and Tester to the coordinator.
7. Add concurrency, recovery, and end-to-end integration tests.
8. Enable the coordinator in the active pipeline only after its safety and integration gates pass.

Some interfaces and test doubles can be drafted in parallel, but production coordinator logic must not independently encode authorization rules. The coordinator should request a decision from the canonical policy; the actual mutation boundary must enforce that decision again.

### Revised phase dependencies

| Phase | Required work | Depends on |
|---|---|---|
| 0. Baseline | Confirm commit, trace current execution, inventory existing policy and workspace semantics | None |
| 1. Policy foundations | Canonical file policy, run/attempt scope, path normalization, write-boundary authorization | Phase 0 |
| 2. Repair contracts | Stable failure IDs, validated repair-plan schema, verification evidence model | Phase 1 interfaces |
| 3. Coordinator | One repair state machine for plan validation, target resolution, Coder execution, verification, and retries | Phases 1–2 |
| 4. Consistency and resilience | Version/conflict protocol, write recovery, scanner failure policy, stage acceptance boundaries | Phases 1–3 as applicable |
| 5. Contract inventory and integration | 42-disparity inventory, fixtures, CI, end-to-end verification | Relevant fixes from Phases 1–4 |
| 6. Release readiness | Full tests, operational evidence, rollout/rollback checks | All required phases |

This sequence replaces the earlier phase order wherever the two conflict.

## 20.2 Distinguish workspace identity, content hash, version, and snapshot

The plan previously used “hash,” “version,” “snapshot,” and “exclusive write” near one another without defining their different roles. These terms must not be treated as interchangeable.

| Concept | Meaning | Required use |
|---|---|---|
| Workspace identity | Stable ID for the logical workspace | Prevent cross-workspace reads/writes |
| Pipeline run ID | Stable ID for one pipeline execution | Isolate artifacts, permissions, and accepted results |
| Repair attempt ID | Stable ID for one repair attempt | Trace mutations, retries, and evidence |
| Content hash | Digest of defined workspace content at a point in time | Detect content equality/change; specify algorithm and included files/metadata |
| Workspace version/revision | Authoritative monotonic revision or opaque compare-and-swap token managed by storage | Detect stale writes and order accepted mutations |
| Verification snapshot | Immutable view of exact workspace content consumed by Tester and other checks | Bind verification results to the code tested |
| Contract fingerprint | Digest/version of stage contract or prompt/schema configuration | Detect contract changes; never substitute for a workspace version |

A content hash can detect that content differs, but by itself does not establish ordering, lock ownership, atomicity, or whether a write was based on the latest state. An opaque version token can enforce compare-and-swap only if the storage layer guarantees its semantics. A snapshot must identify immutable content; a label pointing to mutable files is not sufficient.

### Required workspace-store contract

Before implementation, document what the current VFS/storage system actually supports:

- Is there a monotonic revision or compare-and-swap token?
- Can a patch be applied only if the base revision still matches?
- Can a multi-file change be committed atomically?
- Can the system create immutable snapshots or content-addressed workspace states?
- What consistency guarantees apply across workers/processes?
- How are partial writes detected and recovered?
- Can verification run against a pinned snapshot while the live workspace continues to change?

Do not claim these guarantees exist until implementation and tests establish them.

### Required acceptance rules

- The repair plan records the authoritative base revision/token and may record a content hash as supplementary evidence.
- The write operation checks the expected revision at the storage boundary.
- The completed mutation returns the authoritative resulting revision/token.
- Verification runs against an immutable snapshot of that resulting revision.
- The accepted result references the exact snapshot/revision tested.
- Immediately before acceptance, the pipeline checks the storage system's authoritative state according to the selected consistency model. If acceptance requires the live head to remain unchanged, reject or re-verify if the head advanced. If acceptance is for an immutable artifact revision, record that revision explicitly and do not imply it is the current live head.
- Hashes and contract fingerprints are stored as separate metadata with defined purposes.

### Suggested type separation

```ts
type WorkspaceId = string;
type PipelineRunId = string;
type RepairAttemptId = string;
type WorkspaceRevision = string;
type ContentHash = string;
type SnapshotId = string;
type ContractFingerprint = string;

interface WorkspaceState {
  workspaceId: WorkspaceId;
  revision: WorkspaceRevision;
  contentHash: ContentHash;
}

interface VerificationEvidence {
  snapshotId: SnapshotId;
  testedRevision: WorkspaceRevision;
  testedContentHash: ContentHash;
  checks: VerificationCheckResult[];
}
```

These aliases illustrate semantic separation; use actual branded types or validated opaque tokens if supported by the repository. Do not manufacture a revision by hashing content unless the storage design explicitly defines content-addressed identity as the revision mechanism and also provides the necessary concurrency semantics.

## 20.3 Concurrency: do not rely on a process-local mutex

A process-local mutex protects only callers sharing that in-memory mutex instance. It does not protect a workspace from another worker, process, container, or machine. Therefore it cannot be the primary concurrency guarantee for a multi-worker deployment.

### Required concurrency primitive

Use a storage-enforced atomic compare-and-swap, transaction, revision precondition, or a distributed lock with fencing tokens, depending on what the actual workspace backend supports. Prefer storage-enforced conditional writes because they bind the precondition to the mutation itself.

If the backend only offers a distributed lock, specify lease expiry, lock ownership, fencing tokens, crash recovery, and what prevents an expired lock holder from writing after a newer holder takes over. A lock without fencing or equivalent protection may still permit stale writes.

### Required protocol

1. Read authoritative workspace revision `R`.
2. Create the repair plan against `R`.
3. Resolve the write set under the canonical authorization policy.
4. Submit the mutation with an expected-base-revision precondition of `R`.
5. Have storage atomically reject the mutation if the current revision is not `R`.
6. On conflict, do not apply the stale patch. Refresh state and either re-test/re-plan within the attempt budget or abort.
7. If a multi-file atomic transaction is unavailable, use a documented journal/staging/commit protocol with recovery semantics. Do not imply that several independent writes are atomic.
8. Produce a committed revision `R2` and immutable snapshot `S2`.
9. Run Tester and required checks against `S2`.
10. Accept evidence only for `S2`/`R2`, and apply the explicitly chosen live-head versus immutable-artifact acceptance rule.

### Concurrency tests

- Two independent worker processes race to write the same base revision; at most one conditional mutation commits.
- A stale worker cannot write after its lock expires and a newer fencing token is issued.
- Conflict detection happens at the atomic storage boundary, not only in an earlier read.
- A multi-file operation fails halfway and recovery follows the documented journal/rollback policy.
- A new write during verification does not mutate the immutable snapshot under test.
- Acceptance correctly distinguishes “tested immutable revision” from “current workspace head.”

**Acceptance gate:** The implementation names and tests the actual cross-process concurrency primitive. A local mutex may be an optimization, but not the correctness guarantee.

## 20.4 Validate repair-plan completeness and scope before Coder runs

Schema-valid does not mean semantically complete, safe, or appropriately scoped. A plan may omit a necessary file, refer to unrelated failures, or request a broad set of files.

### Required plan validation layers

1. **Structural validation:** required fields, valid enums, normalized paths, no malformed values.
2. **Failure linkage:** every plan item references known failure IDs; each repairable failure is addressed or explicitly marked unaddressed with a reason.
3. **Evidence linkage:** root-cause claims point to Tester output, build diagnostics, source locations, or other available evidence. Do not require invented evidence where a source provides none.
4. **Scope validation:** affected files are justified by the failures and pass the canonical file policy.
5. **Completeness validation:** each repairable failure has an actionable change and a verification target; unresolved/blocked failures are explicit.
6. **Risk/ambiguity handling:** broad changes, whole-project regeneration, wildcard targets, or uncertain root causes require a narrower plan or explicit policy-controlled escalation.
7. **Execution validation:** Coder receives the validated plan, allowed paths, base revision, and original failure IDs as trusted execution context.

### Suggested plan validation result

```ts
interface RepairPlanValidation {
  valid: boolean;
  acceptedFailureIds: string[];
  unaddressedFailureIds: string[];
  authorizedTargets: string[];
  rejectedTargets: Array<{ path: string; reason: string }>;
  issues: Array<{
    code: string;
    message: string;
    relatedFailureIds: string[];
  }>;
}
```

The coordinator must not turn a partially valid plan into an unrestricted one. It may allow a partial repair only if policy explicitly supports it, tracks unaddressed failures, and ensures the overall attempt cannot be declared successful while required original failures remain unresolved.

### Required tests

- A structurally valid but incomplete plan is rejected or explicitly classified as partial.
- A broad plan requesting unrelated files is narrowed or rejected before Coder runs.
- An unknown failure ID is rejected.
- A plan omitting a repairable original failure cannot yield overall success.
- A legitimate shared dependency edit is accepted only when justified and authorized.
- A plan that cannot safely resolve the root cause returns a clear blocked/unrepairable result instead of inventing edits.

## 20.5 Define release behavior when required security checks fail or cannot run

“Scanner failure is not a pass” is necessary but does not fully specify the pipeline's release decision. Define policy by check criticality and execution state.

### Required result states

Each required check should produce one of:

- `passed`
- `failed`
- `inconclusive` (ran but could not reach a reliable conclusion)
- `unavailable` (required tool/runtime was not available)
- `timed_out`
- `skipped` (with a machine-readable reason and authorization, if skipping is allowed at all)

Do not collapse `inconclusive`, `unavailable`, `timed_out`, or `skipped` into `passed`.

### Default release policy

Unless the product's explicitly approved release policy states otherwise:

- **Blocking security gate fails:** block acceptance/release.
- **Required scanner unavailable, times out, or returns inconclusive:** block acceptance/release; surface the exact reason.
- **Required verification skipped:** block acceptance/release unless an explicit, auditable exception policy allows that exact check to be skipped.
- **Non-blocking advisory check fails:** release may proceed only if the policy labels it advisory in advance and records the finding.
- **Authorized exception:** must be explicit, scoped to the check and artifact/run, recorded with rationale and approver identity, and must not be model-authorized by itself.
- **Pipeline infrastructure error:** do not report release success. Mark the run blocked/failed/inconclusive according to the defined operational status, with retryability recorded.

### Suggested gate policy

```ts
type CheckStatus =
  | "passed"
  | "failed"
  | "inconclusive"
  | "unavailable"
  | "timed_out"
  | "skipped";

type CheckCriticality = "blocking" | "advisory";

interface GateDecision {
  decision: "allow" | "block";
  reasons: string[];
}

function decideRelease(
  checks: Array<{
    name: string;
    status: CheckStatus;
    criticality: CheckCriticality;
    approvedException?: boolean;
  }>
): GateDecision {
  const blockers = checks.filter(check => {
    if (check.criticality === "advisory") return false;
    if (check.status === "passed") return false;
    if (check.approvedException === true) return false;
    return true;
  });

  return blockers.length === 0
    ? { decision: "allow", reasons: [] }
    : {
        decision: "block",
        reasons: blockers.map(
          check => `${check.name}: ${check.status}`
        ),
      };
}
```

This is an illustrative policy function. In production, exception approval must be validated from trusted authorization records; a boolean supplied by an agent or report is not sufficient. The implementation should also validate that every required blocking check is present, so omitting a check cannot make the list appear green.

### Required tests

- Blocking scanner finding prevents release.
- Blocking scanner unavailable/inconclusive/timeout prevents release.
- Missing required check prevents release.
- Advisory failure follows the declared advisory policy.
- Invalid or unauthorized exception does not unblock release.
- Infrastructure error cannot produce a release-success state.
- Final gate and preview/release use the same canonical check-criticality policy.

## 20.6 Specify the commit and acceptance boundary for file writes

The phrase “atomic or recoverable writes” is not enough until the repository's persistence model is known. The implementation must define when a repair is considered applied, when it becomes visible, and when its result may be accepted.

### Required storage decision record

Before implementing multi-file repair writes, document:

- The authoritative source of workspace content.
- Whether edits are direct writes, staged writes, VFS operations, or artifact projections.
- Whether one file or a set of files can be committed atomically.
- The durable point at which a write is considered committed.
- Whether the write is visible to readers before commit.
- How the system records the base revision and resulting revision.
- How interrupted writes are identified and recovered.
- Whether a failed repair can be rolled back safely.
- How projection status (`PENDING`, `SYNCED`, `FAILED` or current equivalents) relates to authoritative content.
- How acceptance is prevented until the chosen commit boundary has been reached.

### Recommended transaction shape, subject to actual backend support

Prefer the following conceptual sequence if the current architecture can support it:

1. **Prepare:** validate plan, authorization, base revision, and intended changes.
2. **Stage:** apply changes in an isolated staging workspace or transaction.
3. **Validate staged state:** ensure all paths are authorized and the staged result is internally consistent.
4. **Commit:** atomically publish the new workspace revision, or use the backend's documented recoverable commit protocol.
5. **Snapshot:** create/pin an immutable snapshot of the committed revision.
6. **Verify:** run required checks against that snapshot.
7. **Accept:** record the result against the run, attempt, committed revision, snapshot, and checks.
8. **Recover/abort:** on failure, follow the documented rollback or recovery protocol and do not mark the attempt accepted.

Verification may occur before or after publishing depending on the repository's existing architecture and isolation model. If verification happens on a staged revision before publishing, the commit operation must prove that the exact verified revision is the one being published. If verification happens after publishing, the workspace may need a state that is committed but not yet release-accepted. The implementation must choose and document one model rather than mixing the two.

### Required state transitions

Use explicit states equivalent to the following, mapped to current pipeline conventions:

`PLANNED → AUTHORIZED → STAGED → COMMITTED → VERIFIED → ACCEPTED`

Failure paths should transition to explicit states such as `REJECTED`, `CONFLICTED`, `WRITE_FAILED`, `VERIFICATION_FAILED`, or `RECOVERY_REQUIRED`. Do not allow an arbitrary jump from `PLANNED` to `ACCEPTED`.

If the backend cannot support atomic multi-file commits, document the actual weaker guarantee and implement a journal/manifest plus deterministic recovery. Do not describe that design as atomic.

### Required tests

- Readers cannot mistake an uncommitted partial write for a committed workspace.
- Interrupted staging and interrupted commit recover deterministically.
- The accepted snapshot exactly matches the committed revision.
- Failed verification cannot transition directly to accepted/released.
- Projection failure cannot silently override authoritative state.
- Recovery is idempotent.
- Run-scoped acceptance metadata is durable and cannot point to a different workspace revision.

---

# 21. Updated implementation order and go/no-go gates

The implementation order in Section 14 is superseded where it conflicts with this section.

## Gate 0: Baseline facts

- [ ] Confirm current commit and working tree.
- [ ] Trace the real VFS/write path, agent runner, artifact store, and release gate.
- [ ] Document current workspace revision, snapshot, atomicity, and cross-process concurrency guarantees.
- [ ] Inventory existing authorization checks and every mutation tool.

**Go/no-go:** Do not design production compare-and-swap or atomic-commit code around assumed capabilities. Establish what the backend actually supports first.

## Gate 1: Policy and mutation boundary

- [ ] Define canonical file classes and stage/operation permissions.
- [ ] Separate required files from writable targets and setup-managed files.
- [ ] Define workspace/run/attempt scope and normalized path rules.
- [ ] Enforce authorization at every write/patch/rename/delete boundary.
- [ ] Test unauthorized direct tool calls and cross-run access.

**Go/no-go:** Do not enable the coordinator to mutate production workspaces until authorization is enforced at the mutation boundary.

## Gate 2: Workspace consistency and commit model

- [ ] Define workspace identity, revision token, content hash, snapshot ID, and contract fingerprint separately.
- [ ] Implement the supported conditional-write/concurrency primitive.
- [ ] Define atomic commit or staged/journaled recovery semantics.
- [ ] Implement stale-plan conflict detection and bounded conflict policy.
- [ ] Test cross-process races and interrupted writes.

**Go/no-go:** Do not enable concurrent repair execution if the storage layer cannot prevent stale writes or recover partial mutations safely.

## Gate 3: Repair contracts and coordinator

- [ ] Define stable failure normalization.
- [ ] Define and validate repair-plan completeness and scope.
- [ ] Implement one coordinator for target resolution, Coder execution, verification, retry, and terminal outcomes.
- [ ] Verify all Coder tool calls use the trusted write boundary.
- [ ] Verify Tester uses an immutable snapshot of the resulting revision.
- [ ] Implement strict repair-success criteria.

**Go/no-go:** Do not mark repair attempts successful without the complete evidence conjunction in Section 18.2.

## Gate 4: Security and release policy

- [ ] Specify semantics and limitations for each scanner rule.
- [ ] Define blocking/advisory criticality for every required check.
- [ ] Make missing, failed, skipped, timed-out, unavailable, or inconclusive blocking checks fail closed.
- [ ] Require trusted, auditable exception approval where policy allows an exception.
- [ ] Verify final gate and release path use the same policy.

**Go/no-go:** Do not release when a required blocking check has not passed or has no valid, authorized exception.

## Gate 5: Inventory, integration, and rollout

- [ ] Complete the evidence-driven inventory of all 42 reported disparities.
- [ ] Add regression tests for confirmed findings and documented dispositions for the rest.
- [ ] Run full repair-loop, concurrency, recovery, scanner, and release-gate integration tests.
- [ ] Run the repository's actual lint, typecheck, build, and test commands.
- [ ] Enable the feature in a controlled rollout if the product has an appropriate feature-flag mechanism.
- [ ] Define measurable pause/disable triggers for coordinator safety failures, with thresholds populated from baseline measurements before autonomous repair is enabled. At minimum, specify behavior for ambiguous commits, repeated recovery failures, duplicate mutation/acceptance detection, budget-enforcement failures, trusted-policy load/validation failures, required-check failures, and sustained conflict/write/verification failure rates.
- [ ] Provide an operator stop control that blocks new repairs while allowing safe reconciliation of already-started or committed attempts. Document whether in-flight work is drained, cancelled, or fenced, and require commit-state reconciliation before retry.
- [ ] Define the disposition for every workspace in `RECOVERY_REQUIRED`: isolate it from new writes, preserve attempt/journal/evidence, attempt backend-supported reconciliation, and escalate to an authorized operator if outcome remains ambiguous. Do not silently reset or auto-retry it.
- [ ] Define metric names, sampling windows, threshold values, alert destinations, and owners for rollback triggers. Include recovery-required count/age, ambiguous commit count, duplicate-operation detection, repair success rate, blocking-check failure rate, conflict/write/verification failure rates, budget exhaustion, and orphaned subprocesses. Numeric thresholds must be chosen from representative baseline runs and recorded in trusted configuration before rollout, not guessed in this plan.
- [ ] Document rollback to the last known-good release: identify immutable release/artifact reference, deploy/feature-flag procedure, compatibility and migration constraints, verification checks, and rollback owner. Rollback must stop new repairs without erasing attempt records or abandoning safe recovery of committed work.
- [ ] Name the roles allowed to resume a paused coordinator and require a pre-resume evidence checklist: root cause resolved, recovery-required workspaces reconciled or explicitly isolated, subprocesses accounted for, budget/policy configuration validated, required checks passing, and rollback readiness confirmed. Record who resumed it, when, and on what evidence.
- [ ] Publish exact commit, commands, results, skipped tests, actual backend guarantees, selected thresholds and rationale, operator runbooks, and unresolved risks.

**Go/no-go:** Release readiness requires evidence from the actual implementation and test run, not only a completed checklist or valid Markdown plan. Autonomous repair remains disabled until backend guarantees are classified, measurable rollout thresholds are populated from baseline evidence, operator pause/recovery/resume procedures are tested, and rollback to a known-good release is demonstrated.

---

# 22. Crash-Safe Repair Recovery, Global Budgets, and Trusted Gate Authority

This section adds mandatory safeguards for three failure modes that can invalidate an otherwise well-designed repair coordinator: an ambiguous commit after a worker crash, unbounded retries/resource use, and an agent weakening the policy that judges its own changes.

## 22.1 Crash after commit: idempotent recovery and attempt identity

A worker may commit workspace changes and crash before persisting the final repair result. On restart, recovery must determine whether the original attempt committed before deciding whether to resume, verify, retry, or abort. It must not blindly reapply the same patch or create a second competing record for the same logical attempt.

### Required identity and durable records

- Assign each logical repair attempt a stable, unique `RepairAttemptId` before any mutation.
- Give every mutation/commit operation a stable idempotency key derived from the attempt and operation identity; retries of the same operation must reuse it.
- Persist a durable attempt record before mutation, including workspace ID, pipeline run ID, attempt ID, base revision, normalized failure IDs, validated plan digest, authorized target set, and current state.
- Persist a commit receipt or equivalent authoritative record that identifies the attempt, committed revision, resulting content hash, and transaction/journal identifier. The authoritative storage layer, not a worker's in-memory state, decides whether the commit occurred.
- Enforce uniqueness for logical attempt identity and relevant commit/idempotency keys in the storage layer using a unique constraint, transaction, compare-and-set, or equivalent atomic primitive. A stable key by itself is only an identifier; it does not provide exactly-once execution.
- The implementation report must name the actual backend and identify, guarantee by guarantee, what it enforces: key uniqueness, atomicity, durability, commit-outcome lookup, multi-worker concurrency, partial-write recovery, and terminal-result uniqueness. Classify each guarantee as **backend-enforced**, **application-enforced with tested atomic primitives**, or **best-effort/unsupported**, and cite the code path and tests. Do not describe best-effort behavior as exactly-once.

### Recovery algorithm

On restart or lease takeover:

1. Load the durable attempt record and its latest valid state.
2. Query the authoritative workspace/transaction/journal layer for the attempt's commit outcome using the stable idempotency key or transaction identifier.
3. If the commit is confirmed, reconcile the attempt record with the authoritative commit receipt and continue from the committed revision. Do not apply the patch again. Create or resume verification against that exact revision/snapshot.
4. If the storage layer proves the commit did not occur and no partial mutation remains, the attempt may resume or retry within its original budget, after rechecking its base revision and authorization.
5. If the outcome is ambiguous, or a partial write/recovery journal exists, move to `RECOVERY_REQUIRED`. Do not blindly replay the patch, report success, or start a competing repair. Resolve the state through backend-specific recovery or operator intervention.
6. Treat cancellation and timeout as requests to stop work, not evidence that a mutation failed. After cancellation, query/reconcile the authoritative commit state before any retry. Terminate subprocesses where safe and supported; otherwise track them as in-flight, collect their exit/result state, and prevent a new attempt from writing the same workspace until they are known stopped or fenced off. If a subprocess may still be writing or a commit may still be in progress, preserve `RECOVERY_REQUIRED` (or the equivalent explicit recovery state) until the backend proves a safe next action.
7. Make reconciliation idempotent: running it repeatedly must converge on the same attempt state and must not duplicate commits, checks, or accepted results.
8. Persist acceptance only after verification evidence and commit identity have been reconciled. Use a uniqueness constraint or equivalent compare-and-set so only one terminal acceptance record can exist for the same attempt/revision.

### Required crash-injection tests

- Crash immediately before commit; recovery proves no commit occurred and safely resumes or retries.
- Crash immediately after commit but before recording the commit receipt in the attempt record; recovery discovers the committed revision without reapplying the patch.
- Crash after commit receipt but before verification; recovery verifies the existing revision.
- Crash after verification but before acceptance; recovery reuses valid evidence only if it is bound to the exact immutable revision and policy version.
- Two workers recover the same attempt concurrently; only one logical commit and one terminal result are recorded.
- An ambiguous or partially completed commit enters `RECOVERY_REQUIRED`, never a false success state.
- Cancellation during file writes or commit is injected at multiple points; cancellation alone never causes the system to classify the mutation as failed or replay it.
- Subprocess termination, process-group cleanup, outstanding-write fencing, and accounting are tested for the actual execution environment.
- Repeated recovery runs are idempotent.

**Acceptance criterion:** A crash at any point cannot cause a duplicate patch application, conflicting attempt records, or an accepted result detached from the revision that was actually committed.

## 22.2 One global budget for attempts, retries, runtime, and resource consumption

Repair retries and concurrency-conflict retries must consume a single coherent budget. Separate counters that reset when a conflict occurs or a new worker takes over are not an effective bound; they are a loophole with a spreadsheet attached.

### Define hard limits in trusted configuration

Before enabling repair execution, define and document configurable hard limits for at least:

- Maximum repair attempts per pipeline run and per original failure set.
- Maximum wall-clock time for the complete repair operation, including queueing, recovery, conflict handling, generation, writes, builds, tests, and verification.
- Maximum total model invocations and total tool invocations across all attempts and retries.
- Maximum build/test runtime, both per invocation and cumulatively across the repair operation.
- Maximum total resource consumption using metrics the runtime can actually enforce, such as CPU time, memory, subprocess count, generated/changed bytes, network calls, or token usage/cost where available.
- Maximum concurrency-conflict retries and maximum repair retries, both subordinate to the global budget.

Do not invent numeric defaults without measuring current workloads and agreeing operational limits. Choose initial values from representative integration runs, document the rationale, and keep hard ceilings in trusted configuration. Missing, malformed, or unbounded limits must prevent repair execution rather than silently disable limits.

### Budget model

Create a durable budget record scoped to the pipeline run and repair operation. It should track limits, consumed amounts, reservations/in-flight work, and the terminal reason. All workers and retries must share this record through an atomic or storage-enforced update; process-local counters are insufficient in multi-worker deployments.

Illustrative shape, to adapt to repository conventions:

```ts
interface RepairBudget {
  pipelineRunId: PipelineRunId;
  repairOperationId: string;
  deadlineAt: string;
  maxRepairAttempts: number;
  repairAttemptsUsed: number;
  maxConflictRetries: number;
  conflictRetriesUsed: number;
  maxModelInvocations: number;
  modelInvocationsUsed: number;
  maxToolInvocations: number;
  toolInvocationsUsed: number;
  maxBuildTestRuntimeMs: number;
  buildTestRuntimeMsUsed: number;
  resourceLimits: Record<string, number>;
  resourceUsage: Record<string, number>;
  state: "ACTIVE" | "EXHAUSTED" | "CANCELLED" | "COMPLETED";
}
```

This is a design example, not a claim that the current repository has these types. Use monotonic elapsed-time accounting for local durations and a durable absolute deadline for cross-worker recovery. Reserve budget before launching expensive work, reconcile actual consumption afterward, and release unused reservations only when the operation is known to have stopped. A worker crash must not reset counters or extend the deadline.

### Unified retry rules

- Every conflict retry consumes the shared conflict-retry budget and the overall wall-clock/resource budget.
- Every new repair attempt consumes the repair-attempt budget and all model/tool/runtime budgets used by that attempt.
- A conflict must not implicitly create a fresh repair operation or reset the budget.
- A new plan for the same unresolved original failures remains within the same overall repair-operation budget unless a trusted orchestrator explicitly starts a separately authorized operation with a new budget.
- Check the deadline and remaining budget before each model call, tool call, mutation, retry, build, and test. Cancellation must propagate to subprocesses and workers where supported.
- If a hard limit is reached, stop scheduling new work and request cancellation of in-flight work where supported. Cancellation is not proof that a write or commit failed: reconcile authoritative commit state, terminate or account for subprocesses, and preserve the correct recovery state before any subsequent attempt. Persist a terminal reason such as `BUDGET_EXHAUSTED` and report unresolved failures. Do not turn exhaustion into success or silently start a fresh budget.
- Budget exhaustion is a terminal outcome for that repair operation. Any operator-approved new operation must have an auditable relationship to the prior attempt and must not erase its history.

### Required budget tests

- Combined conflict and repair retries cannot exceed the total operation deadline or global invocation/resource caps.
- Worker restarts and lease transfers do not reset consumed budget.
- Parallel workers cannot overspend a shared cap through racing read-modify-write operations.
- A model/tool call is not launched when its reservation would exceed a hard limit.
- Build/test timeouts stop or account for the process correctly; timed-out checks are not treated as passed.
- Cancellation during mutation or commit reconciles backend state and prevents a retry until any writer is stopped or safely fenced off.
- Exhaustion records unresolved failure IDs and prevents acceptance/release where the unresolved findings are blocking.

## 22.3 Separate repair authority from gate policy and exception authority

The agent that edits the workspace must not be able to change the rules used to judge that workspace, remove required checks, downgrade a blocking check, or authorize its own exception in the same repair operation. Generated project files, prompts, repair plans, tool output, and agent-written configuration are untrusted inputs for policy purposes.

### Trusted policy source

- Load gate policy, required-check definitions, check criticality, release thresholds, and exception rules from trusted, versioned configuration or a trusted policy service outside the repair agent's writable workspace.
- Bind each repair/release decision to a policy version or immutable policy digest and record it in durable evidence.
- Do not derive authoritative policy from files generated or edited by Architect, Coder, Debugger, Tester, or another project agent.
- If a project legitimately contains configuration that influences which checks run, treat it only as an input to a trusted policy evaluator. It must not be allowed to remove mandatory baseline checks or weaken the trusted minimum. Validate changes to such configuration through separate trusted review/authorization.
- Ensure workspace write authorization explicitly denies agents permission to modify the live gate policy, trusted policy source, exception ledger, release approvals, or the credentials/roles that authorize them. If policy files must be versioned in the repository, changes to them require a separate protected workflow and cannot take effect for the repair currently proposing them.

### Independent exception authority

- The repair agent cannot approve, sign, mint, or self-assert an exception for its own changes.
- An exception must be issued by a trusted identity with the required role, through an independent authorization path, and stored in a trusted audit record.
- Bind each exception to the exact workspace/revision, check or finding IDs, scope, rationale, expiry, approver identity, and applicable policy version. Reject broad, expired, replayed, or mismatched exceptions.
- The gate must independently authenticate and validate exception records. A field such as `approvedException: true` in agent output is not authorization.
- Any policy change or exception approval must be auditable and must not retroactively change the policy under which an already-recorded result was evaluated.

### Required separation-of-authority tests

- A Coder/Debugger repair that edits project configuration to remove a required check is rejected or has no effect on trusted gate policy.
- Agent output that lowers a blocking check to advisory is ignored unless a separately authorized policy-change workflow approves it.
- Agent-generated `approvedException: true`, forged approver identities, expired approvals, and approvals for a different revision are rejected.
- The gate uses the policy version recorded for the decision and fails closed if trusted policy cannot be loaded or validated.
- A legitimate policy update follows a protected workflow and applies only according to its explicitly defined effective version; it cannot self-approve as part of the same repair.
- The repairing agent has no write path to trusted policy storage, exception records, or authorization grants.

**Acceptance criterion:** The workspace being repaired cannot alter the policy that judges it, and the actor performing the repair cannot authorize its own exception. Missing or unverifiable trusted policy/authorization blocks acceptance and release.

## 22.4 Additional go/no-go gates

Add these gates to Section 21; they are mandatory and take precedence over any earlier checklist that omits them.

### Gate 2A: Crash recovery and idempotency

- [ ] Stable attempt and mutation idempotency identities exist before writes.
- [ ] Authoritative commit receipts/outcome lookup are implemented for the actual storage backend.
- [ ] Recovery reconciles commit state before retrying any mutation.
- [ ] Concurrent recovery cannot duplicate a commit or terminal result.
- [ ] Crash-injection tests cover commit/result-recording gaps.

**No-go:** If recovery cannot distinguish committed, uncommitted, and ambiguous outcomes, do not automatically retry mutations after worker failure.

### Gate 2B: Global budget enforcement

- [ ] Hard limits and their trusted configuration source are documented.
- [ ] Durable shared budget accounting is atomic across workers.
- [ ] Conflict retries and repair retries consume the same operation budget.
- [ ] Model/tool calls and build/test execution are bounded and cancellable where supported.
- [ ] Exhaustion stops work and produces an auditable unresolved outcome.

**No-go:** Do not enable autonomous repair with missing limits, resettable per-worker counters, or unbounded subprocess/model/tool execution.

### Gate 4A: Trusted gate and exception authority

- [ ] Required checks and criticality come from trusted versioned policy.
- [ ] Agent-write permissions cannot mutate trusted policy or exception authority.
- [ ] Exceptions are independently authorized and revision/policy-bound.
- [ ] Forgery, downgrade, policy-tampering, and self-approval tests pass.

**No-go:** Do not release if the repair agent can weaken the gate that evaluates its own changes or approve its own exception.
