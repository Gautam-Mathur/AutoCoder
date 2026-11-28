# AutoCoder Live-Run Debugging Playbook

**Purpose:** Help you catch real AutoCoder failures while you run it,
pinpoint the responsible layer, and patch one proven cause at a time.
The earlier ten items are a watchlist---not assumptions that all ten are
currently broken.

## The loop

1.  **Observe:** Save the full relevant log, not just the last error.
2.  **Checkpoint:** Record run ID, timestamp, stage, commit/branch, and
    generated workspace path.
3.  **Localize:** Find the *first point* where actual behavior diverges
    from expected behavior.
4.  **Reproduce:** Make the smallest test/fixture that shows the same
    failure.
5.  **Confirm:** Separate confirmed root cause from suspicion,
    environment problems, and false alarms.
6.  **Patch one cause:** Avoid combining unrelated prompt, validator,
    retry, and orchestration changes.
7.  **Verify:** Run the regression test and relevant existing checks.
8.  **Compare:** Repeat the same scenario with the same
    inputs/environment; inspect collateral changes.
9.  **Continue:** Move to the next issue only after the patch is
    verified or explicitly reverted.

Do not change several components just to make a run green. That makes it
impossible to tell which change fixed the issue.

## Incident note template

Copy this for each suspicious result:

``` text
Issue ID:
Run ID / timestamp:
AutoCoder commit / branch:
Stage:
Generated workspace:
Expected behavior:
Observed behavior:
Exact error / log excerpt:
First divergence point:
Relevant files/functions:
Reproduction steps:
Status: SUSPECTED / REPRODUCED / ROOT_CAUSE_CONFIRMED / ENVIRONMENT / FALSE_ALARM
Patch:
Regression test:
Checks actually run + results:
Checks not run:
Generated output changed:
Unrelated regressions checked:
Rollback:
```

Save the raw log and generated project before rerunning or overwriting
it. Never include credentials, tokens, or private customer data in the
note.

## Live-run watchlist: 10 problem areas

### 1. Unauthorized repair targets survive filtering

**Watch for:** coordinator keeps going after all proposed files should
have been filtered out; repair request includes paths outside the
allowed set.

**Inspect:** `src/lib/agents/ruflo/repair-coordinator.ts`,
`affectedFiles`, `validAuth`, downstream VFS/executor decision.

**Prove it:** Test all-authorized, mixed, and all-unauthorized lists. In
the last case, assert no target is passed onward. Separately confirm
VFS/executor still blocks unauthorized writes.

**Minimal fix:** Always use the filtered list. If empty, stop/skip with
a structured reason. Preserve downstream authorization.

**Avoid false conclusion:** An unauthorized target in a log does not
prove an unauthorized write occurred. Check the actual write decision.

### 2. Fabricated blueprint context reaches the Coder

**Watch for:** Coder generates a file despite no matching blueprint
section; prompt invents "Dependencies: None" or "Exports: None" when the
section was actually missing.

**Inspect:** `src/lib/agents/ruflo/orchestrator.ts`, target-section
lookup, exact blueprint and prompt supplied to the Coder.

**Prove it:** Compare a valid target section with a missing one. Missing
section should cause no Coder call or file write. Distinguish missing
section from a section explicitly listing no dependencies.

**Minimal fix:** Fail with a structured missing-context reason or fix
the target-to-blueprint mapping. Do not invent facts to keep generation
moving.

**Avoid false conclusion:** Bad generated code does not by itself prove
the fallback caused it; inspect the actual prompt first.

### 3. Reviewer findings are treated as an invalid report

**Watch for:** a well-formed low-score/negative review is discarded or
triggers a retry as if the report were malformed.

**Inspect:** `src/lib/agents/ruflo/stage-acceptance.ts`,
`validateReviewer` and all callers, final release gate.

**Prove it:** Feed a valid negative report, a malformed report, and a
stale report. The negative report should be retained while release
remains blocked; malformed/stale reports should be rejected.

**Minimal fix:** Separate *report validity* from *release eligibility*.
Do not lower the quality threshold or remove the final gate.

### 4. Tester PASS/FAIL depends on Markdown formatting

**Watch for:** Markdown says PASS while structured failures exist;
duplicate headings or wording change the stage outcome.

**Inspect:** `repair-coordinator.ts`, `verification-loop.ts`, Tester
return type/persistence, structured fields such as `success`,
`failures`, `workspaceFingerprint`.

**Prove it:** Structured FAIL + Markdown PASS must remain FAIL; wording
changes must not change a structured PASS; missing/stale structured
evidence must not authorize success.

**Minimal fix:** Use structured verification for control flow only after
confirming it is available and tied to the tested workspace. Keep
Markdown for people. Fix the narrow result-passing boundary if
structured data is lost.

### 5. Static checks pass but the generated app fails at runtime

**Watch for:** lint/import checks pass but build/start/API behavior
fails; UI calls return 404/500; Tester says PASS without identifying
runtime checks as skipped.

**Inspect:** `runFullWorkspaceTester`, callers, generated build/start
logs and endpoint responses.

**Prove it:** Use a tiny isolated fixture: build if supported, start
with timeout, call one known endpoint, assert response, terminate
process and clean up. Report static and runtime checks separately.

**Minimal fix:** Add a bounded integration fixture. Use separate `PASS`,
`FAIL`, and `NOT_RUN` outcomes. Do not require a live database/external
service for the first fixture.

**Avoid false conclusion:** An unavailable runtime environment is not
automatically a code defect; mark the check `NOT_RUN` and record why.

### 6. Frontend API request has no matching route

**Watch for:** frontend calls `/api/...`, but no matching route exists
in the final tree; build passes while the request fails.

**Inspect:** exact request path, final route tree, framework/router
conventions, validator timing after repairs.

**Prove it:** One fixture with a matching route and one with a missing
route. For Next.js App Router, verify path mapping from the final tree
rather than guessing from filenames.

**Minimal fix:** Extend the existing route validator only if it misses a
reproduced supported case. Keep framework-specific rules separate; treat
proxy/dynamic/unknown cases as unverified instead of rewriting by guess.

### 7. Imported package is missing from the generated manifest

**Watch for:** source imports an external package absent from the
delivered manifest; it works in the generator host but fails in a clean
install/build.

**Inspect:** importing file, final `package.json`/manifest, dependency
extraction and validation order, built-in/local/framework imports.

**Prove it:** Declared package passes; undeclared external package fails
with package + file evidence; built-ins and relative imports do not
trigger false positives.

**Minimal fix:** Correct validator timing or detection. Start with a
precise diagnostic, not automatic installs or version changes. Verify
import specifier-to-package mapping.

### 8. Files disagree on exports, props, or data shapes

**Watch for:** missing named export, default/named import mismatch,
component prop mismatch, consumer expects fields the provider does not
return, files pass individually but fail together.

**Inspect:** provider and consumer files, existing cross-file
validators, whether validation runs on the final repaired workspace.

**Prove it:** Tiny positive/negative fixtures for the exact contract
type; diagnostic should identify both files and the mismatched
symbol/field.

**Minimal fix:** Extend the existing validator for the demonstrated
blind spot. Do not claim full semantic validation if it checks only
imports. Mark dynamic/ambiguous patterns unverified.

### 9. Prisma suppression hides a real TypeScript error

**Watch for:** invalid Prisma model/field has no diagnostic, especially
when a TS2339 message contains `PrismaClient`; removing suppression
causes a wave of errors when client types are absent.

**Inspect:** `src/lib/agents/ruflo/linter.ts`, Prisma schema/client
availability, exact diagnostic and suppression branch.

**Prove it:** Valid model/field with generated types passes; invalid
field remains an error; unrelated TS2339 remains; missing generated
client is marked inconclusive rather than silently clean.

**Minimal fix:** Replace broad message matching with narrow,
evidence-based classification. Do not just delete the suppression before
testing false-positive cases.

### 10. Repair makes no progress or verification is stale

**Watch for:** repeated failures with no relevant diff; repair claims
success but files are unchanged; verification fingerprint does not match
current workspace; flush fails but run says committed; resume trusts old
results after files change.

**Inspect:** snapshot/fingerprint, repair write, VFS flush/persistence,
verification result storage, retry/stagnation logic, resume path.

**Prove it:** fixed defect gives a new fingerprint and passing
verification; unchanged failure is identified as stagnation; introduced
regression fails; stale fingerprint/failed flush cannot authorize
acceptance.

**Minimal fix:** Fix the first proven break in the lifecycle. Add
stagnation detection only if missing. Keep retry limits unchanged until
evidence says otherwise.

**Avoid false conclusion:** Repeated error text alone does not prove the
workspace was unchanged; compare diffs and fingerprints.

## Quick triage table

  -----------------------------------------------------------------------
  Symptom                 First place to inspect  Evidence needed before
                                                  patch
  ----------------------- ----------------------- -----------------------
  Wrong repair target     Coordinator + VFS/auth  Target list
                                                  before/after filtering
                                                  and actual write
                                                  decision

  Missing integration in  Blueprint lookup +      Active blueprint
  file                    exact prompt            section and Coder
                                                  context

  Review report discarded Reviewer validator +    Report validity
                          final gate              separated from release
                                                  decision

  PASS changes with       Tester result boundary  Structured result and
  wording                                         Markdown side by side

  Build/start failure     Generated project +     Reproducible fixture
                          logs                    and exact stack trace

  API 404                 Request path + route    Actual route mapping
                          tree                    

  Clean install failure   Manifest + imports      Clean install/build
                                                  reproduction

  Missing                 Provider + consumer +   Minimal two-file
  export/prop/data field  validator               reproducer

  Prisma error missing    Suppression +           Diagnostic with client
                          schema/client           available

  Repair repeats          Diff + fingerprint +    Before/after tree,
                          persistence             fingerprint, flush
                                                  result
  -----------------------------------------------------------------------

## Patching while a run is active

-   Prefer a saved reproduction, separate branch, or worktree. Do not
    mutate the active run's workspace unless the tool explicitly
    supports safe hot-patching.
-   Preserve the failing project before rerunning.
-   Patch one root cause; add the regression test; run the targeted test
    and nearest relevant checks.
-   Repeat the same scenario with the same input/environment. A
    different prompt/project is not a valid before/after comparison.
-   Inspect collateral changes: generated files, manifest, routes,
    exports, stage decisions, and acceptance outcome.
-   Log newly discovered issues separately; do not bundle them into the
    current patch.
-   If evidence is ambiguous, add logging or a test before changing
    behavior.
-   Never weaken authorization, release gates, or validation just to get
    a green run.

## Patch ledger

  ----------------------------------------------------------------------------------------------
  ID       Symptom   Status      Reproduced?   Root cause   Patch    Regression   Verification
                                               confirmed?            test         
  -------- --------- ----------- ------------- ------------ -------- ------------ --------------
  AC-01              SUSPECTED   No            No                                 

  AC-02              SUSPECTED   No            No                                 

  AC-03              SUSPECTED   No            No                                 
  ----------------------------------------------------------------------------------------------

Status values: `SUSPECTED`, `REPRODUCED`, `ROOT_CAUSE_CONFIRMED`,
`PATCHED`, `VERIFIED`, `REVERTED`, `FALSE_ALARM`, `ENVIRONMENT`.

## First-run checklist

-   [ ] Record commit/branch and run ID.
-   [ ] Save baseline logs and generated workspace.
-   [ ] Capture the first failure, not only the final summary.
-   [ ] Check the ten signals above.
-   [ ] Find the earliest divergence point.
-   [ ] Create a minimal reproduction.
-   [ ] Patch one root cause only.
-   [ ] Add a regression test.
-   [ ] Run targeted and relevant existing checks.
-   [ ] Repeat the same scenario and compare.
-   [ ] Record checks not run and remaining uncertainty.
-   [ ] Move on only after verification or explicit revert.

**Definition of success:** the original defect is reproducible, the
smallest responsible fix is applied, a regression test protects it, and
the same scenario passes without weakening safety controls or causing
unexplained collateral changes.


---

# Part II — AutoCoder Fixing Philosophies
## How to make a fix effective without creating regressions

These principles govern every live-run patch. They are deliberately conservative: the goal is not to make the code change look clever, but to make the system measurably more reliable.

## 1. Evidence before edits

**Rule:** Never patch a suspected cause merely because it sounds plausible.

Before changing code, capture:
- The exact observed behavior and expected behavior.
- The relevant log, stage, and generated workspace.
- The first point where actual behavior diverges from expected behavior.
- A minimal reproduction, when possible.

Classify the issue as:
- **Confirmed:** reproduction and evidence identify the responsible behavior.
- **Likely:** evidence points to a cause, but the reproducer is incomplete.
- **Environment:** the failure is caused by missing tools, credentials, services, or runtime support.
- **Unknown:** evidence is insufficient.
- **False alarm:** the behavior is valid or already safely blocked downstream.

**Decision:** Patch confirmed issues. For likely issues, improve instrumentation or build a reproducer first. Do not disguise uncertainty as certainty.

## 2. Find the earliest divergence, not the loudest error

The component reporting an error is not always the component causing it.

For example:
- A Tester failure may originate from missing blueprint context.
- A route 404 may originate from generated file layout, not the API validator.
- A missing package may originate in manifest generation, not the build step.
- A repair loop may originate in stale result handling, not the model's repair quality.

Trace the data from the first relevant input through each stage until it differs from the expected value. Patch the earliest incorrect transformation, while preserving checks in downstream layers.

**Avoid:** fixing a downstream symptom with special cases when an upstream source is demonstrably wrong.

## 3. One root cause per patch

Each patch should answer one question: *What is the smallest behavior change that corrects this demonstrated failure?*

- Keep unrelated formatting and cleanup out of the diff.
- Avoid changing prompts, validators, retries, persistence, and acceptance logic together.
- If a second issue appears, record it separately.
- Prefer one focused commit or pull request per root cause.

If one patch must touch several files, document why each file is necessary to fix the same root cause.

**Reason:** Small patches are easier to review, test, compare, and revert.

## 4. Regression test first, then implementation

A bug fix without a regression test is a bug that can quietly return.

Where practical:
1. Create the smallest test that reproduces the failure.
2. Confirm it fails for the expected reason.
3. Implement the smallest fix.
4. Confirm the test now passes.
5. Run nearby tests and relevant invariant/build checks.
6. Repeat the original live scenario.

The test should assert the intended behavior, not implementation details that may legitimately change.

**If the failure cannot be automated:** preserve a reproducible manual test, exact inputs, expected output, and verification steps.

## 5. Preserve defense in depth

A check in one layer should not be removed because another layer exists; nor should a new check be treated as a replacement for established enforcement.

Examples:
- Coordinator path filtering is useful, but VFS/executor authorization remains necessary.
- A valid reviewer report can describe failure, but the release gate must still block unacceptable output.
- Static validation helps, but it must not claim to prove runtime correctness.
- A dependency warning should not automatically install arbitrary packages.
- A retry limit should not be increased to hide a failure to detect stagnation.

**Rule:** Fix the faulty layer and preserve independent safety checks unless there is clear evidence that a check itself is defective.

## 6. Fail closed on safety; fail visibly on uncertainty

When a decision affects authorization, release acceptance, or whether a result is safe to trust:
- Missing or invalid evidence must not be treated as success.
- An empty authorized target set must not fall back to the original unfiltered set.
- Stale verification must not authorize acceptance.
- A failed write/flush must not be reported as a committed repair.

For ordinary diagnostics where certainty is impossible, prefer an explicit `UNKNOWN` or `NOT_VERIFIED` status over a guessed pass or a guessed failure.

**Important distinction:** “Fail closed” does not mean silently crashing or discarding useful information. Return a clear reason, retain diagnostic evidence, and make the next safe action visible.

## 7. Separate validity, quality, and release decisions

Do not collapse these different questions into one boolean:

1. **Validity:** Is this result well-formed and associated with the correct run/workspace?
2. **Quality:** Does the result reveal defects or unmet requirements?
3. **Release eligibility:** Does the project meet the configured release criteria?

A valid report can correctly say the project failed. Retain that report as evidence, while keeping release blocked. A malformed or stale report should not be trusted as evidence.

Use explicit, typed status fields wherever feasible. Human-readable Markdown is for people; machine control flow should rely on structured values.

## 8. Make uncertainty visible in reports

Never let a report imply that a check ran when it did not.

Use clear per-check statuses, such as:
- `PASS` — check executed and passed.
- `FAIL` — check executed and failed.
- `NOT_RUN` — check was not executed.
- `BLOCKED` — check could not proceed because a prerequisite failed.
- `INCONCLUSIVE` — check ran but evidence was insufficient.
- `ERROR` — the checker itself malfunctioned.

Keep the exact reason and evidence alongside the status. Do not roll `NOT_RUN`, `INCONCLUSIVE`, or checker errors into `PASS`.

## 9. Treat generated code as a deliverable, not a pile of files

A generated project must be assessed as a connected system.

Where applicable, check in layers:
1. **Structure:** expected files and manifest exist.
2. **Static integrity:** syntax, types, imports, and supported framework rules.
3. **Contracts:** routes, exports, props, dependencies, and data shapes agree.
4. **Build:** the project builds in a controlled environment.
5. **Runtime smoke test:** the application starts and a small known behavior works.
6. **Evidence freshness:** results refer to the exact workspace being delivered.

Do not attempt to build a massive end-to-end testing platform as the first response. Start with one deterministic fixture and add coverage only where real failures justify it.

## 10. Verify the same scenario, not a vaguely similar one

A valid before/after comparison holds constant:
- Input request/prompt.
- Relevant configuration.
- Tool/model settings where practical.
- Test fixture and environment.
- Expected behavior.

Save the original failing workspace. Re-run the same case after the patch. If the inputs or environment changed, record that difference; do not attribute the outcome solely to the patch.

## 11. Make changes observable and reversible

Every fix should make it easier to understand what happened.

- Add structured error codes or concise diagnostic context when useful.
- Include relevant file, stage, run ID, and failure reason.
- Avoid logging secrets or private data.
- Keep patches small enough to revert cleanly.
- Record the commit, tests run, tests skipped, and observed output changes.
- If a patch causes an unrelated regression, revert it or isolate the regression before proceeding.

Do not add noisy logging everywhere. Add the smallest diagnostic that distinguishes the plausible causes.

## 12. Do not tune limits before understanding the failure

Increasing timeouts, retry counts, token budgets, or repair cycles can hide the symptom without fixing the cause.

Before changing a limit, determine:
- Was the process making measurable progress?
- Did the workspace change?
- Did the failure set change?
- Was the process blocked by environment or missing context?
- Did the checker return a valid result?
- Would another attempt reasonably change the outcome?

Keep current limits until evidence demonstrates that they are the limiting factor. If retries repeat the same state, detect stagnation instead of simply spending more resources.

## 13. Prefer compatibility-preserving changes

When changing a stage contract or validator:
- Search for all callers and consumers.
- Preserve existing valid behavior.
- Add explicit handling for missing/legacy fields only where needed.
- Avoid introducing a second competing validation framework.
- Do not change public output formats without checking downstream consumers.
- Use a narrow adapter only when required, and document its removal/transition plan.

A change is not safe just because the edited function's unit test passes; its callers and outputs matter too.

## 14. Do not silently repair ambiguous code

Autonomous rewriting is risky when the system cannot confidently determine the intended contract.

If a route, package, export, schema, or blueprint mapping is ambiguous:
1. Report the ambiguity with evidence.
2. Identify what information is missing.
3. Use an existing authoritative source if available.
4. Ask for clarification or mark the check inconclusive when no safe inference exists.

Do not invent dependencies, delete code, rename exports, or change architecture merely to silence a checker.

## 15. Use a patch acceptance gate

A patch is ready only when all applicable checks below are satisfied:

- [ ] The original issue was reproduced or directly demonstrated.
- [ ] Root cause is identified with source/log evidence.
- [ ] Patch changes only the intended behavior.
- [ ] Regression test fails before and passes after the fix.
- [ ] Relevant neighboring tests/checks pass, or failures are clearly identified as pre-existing.
- [ ] Same live scenario behaves correctly after the patch.
- [ ] No safety or release gate was weakened.
- [ ] Generated output and unrelated behavior were compared.
- [ ] Unrun checks and uncertainty are documented.
- [ ] Patch can be reverted cleanly.

If one item is not satisfied, label the patch `PATCHED_NOT_VERIFIED`, not `FIXED`.

## 16. Practical priority order

When multiple issues appear, prioritize using these questions:

1. **Safety boundary:** Could this bypass authorization, expose secrets, or accept stale/untrusted evidence?
2. **Data integrity:** Could it overwrite, lose, or misrepresent project state?
3. **Pipeline truthfulness:** Could it report success when a stage failed or never ran?
4. **Generated-project correctness:** Does it produce broken code, routes, dependencies, or contracts?
5. **Reliability and resource use:** Does it loop, waste calls, or fail to stop?
6. **Usability and polish:** Does it reduce clarity or developer experience without affecting correctness?

This is a triage order, not permission to ignore lower-priority defects. Handle one confirmed issue at a time.

## 17. Anti-patterns to reject

- “It passed once, so the fix is proven.”
- “The logs look better, so the underlying problem is fixed.”
- “Remove the validator; it creates false positives.”
- “Raise retries until the model gets it right.”
- “Rewrite the entire coordinator to fix one condition.”
- “The report says PASS, so the project must work.”
- “The app wasn't runnable here, so count runtime as passed.”
- “The file is missing from the expected path, so create a guessed replacement.”
- “A patch has no type errors, so no regressions are possible.”
- “The model claims it fixed the file, so the file must have changed.”

Replace each claim with a test, a diff, a runtime observation, or an explicit statement of uncertainty.

## Final rule

**A green run is a result; it is not proof by itself.** A trustworthy fix has a reproduced failure, a traceable root cause, a narrow patch, a regression test, and a same-scenario verification. Keep the evidence so another person—including a skeptical reviewer—can independently reach the same conclusion.
