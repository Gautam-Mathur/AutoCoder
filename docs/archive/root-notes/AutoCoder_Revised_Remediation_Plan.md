# AutoCoder Permanent Fixes Specification & Remediation Blueprint

## Revised Engineering Plan

**Revision date:** October 29, 2026\
**Status:** Proposed plan only. This document does not claim that code
changes or tests have been executed.

## 1. Purpose and invariants

Correct the reported pipeline failures without weakening validation or
disguising incomplete work.

1.  Do not relax contract schemas, suppress compiler/linter diagnostics,
    delete tests, or bypass release gates.
2.  Treat the project-file inventory as authoritative.
3.  Distinguish complete file coverage from functional-module ownership.
    Files that require ownership must have exactly one owner;
    configuration and static assets must be tracked without being forced
    into inappropriate functional modules.
4.  Resolve contract names through one canonical registry.
5.  Recover missing context from authoritative artifacts or fail
    explicitly. Never invent facts such as `Dependencies: None`.
6.  Keep fixes minimal, observable, reversible, and covered by
    regression tests.
7.  Use `Observed`, `Hypothesized`, `Patched`, and `Verified` only when
    supported by evidence.
8.  The source audit reports 155 existing tests. Confirm the current
    checkout's actual baseline and test count before treating 155 as
    verified.

## 2. Reported issue matrix

The source audit reports these issues. Reproduce them against the
current checkout/run before treating each mechanism as proven.

  -------------------------------------------------------------------------------------------
  ID             Area                     Severity Reported mechanism        Desired outcome
  -------------- --------------- ----------------- ------------------------- ----------------
  ARCH-01        Architect                      P0 `index.html` and          Explicit file
                                                   `src/styles/global.css`   classification
                                                   omitted from module       and correct
                                                   ownership                 ownership
                                                                             validation

  RESUME-01      Artifact                       P1 `ArchitectureArtifact`    Canonical
                 store/resume                      conflicts with canonical  contract
                                                   `ArchitectureOutput`      identity across
                                                                             commit and
                                                                             resume

  BLUEPRINT-01   Blueprinter                    P1 Config files such as      Coverage derived
                                                   `package.json`,           from
                                                   `tsconfig.json`,          authoritative
                                                   `vite.config.ts` omitted  project
                                                   from blueprint            inventory

  CODER-01       Coder context                  P1 Missing blueprint entry   Grounded
                                                   triggers fabricated       recovery or
                                                   `Dependencies: None`      structured
                                                   fallback                  failure

  TESTER-01      Tester/repair                  P1 Generated imports         Structured
                 coordinator                       reference packages        diagnostics and
                                                   missing from manifest     verified
                                                                             manifest repair
  -------------------------------------------------------------------------------------------

A report is not proof that a proposed patch fixes the issue. Capture
stage, sequence/event IDs, artifact versions, logs, database records
where relevant, and a minimal reproduction.

## 3. P0: Clarify project inventory and ownership

### Problem

Complete project-file coverage and functional-module ownership are
separate invariants. A configuration file may need to be represented in
the architecture and blueprint without belonging to a functional module.

### Implementation

1.  Inspect `requiresModuleOwnership`, `validateArchitectureArtifact`,
    and existing file-classification rules.
2.  Define explicit file classes, using the project's existing model
    where possible: implementation, configuration, schema, static asset,
    documentation, and any already-supported tooling/generated category.
3.  For each class, specify whether functional ownership is required.
4.  Update Architect instructions to describe framework-specific entry
    files and styling files, without making file extensions alone the
    universal ownership rule.
5.  Keep validation strict. Report separately: unaccounted files,
    missing required owners, duplicate owners, invalid paths, and
    unexpected files.
6.  Provide exact path-level diagnostics to a bounded Architect retry.
    If validation still fails, stop with a structured error.
7.  Preserve VFS authorization and all existing contract/release checks.

### Acceptance tests

-   A Vite fixture passes when `index.html` and application styles are
    correctly classified and owned according to policy.
-   The same fixture fails when a file requiring ownership is unclaimed.
-   Duplicate ownership is rejected.
-   Configuration and static assets are inventoried without being forced
    into inappropriate functional ownership.
-   Existing validators are not weakened.

## 4. P1: Canonical contract names across commit and resume

### Problem

The audit reports a mismatch between `ArchitectureArtifact` and
`ArchitectureOutput`.

### Implementation

1.  Inspect `CONTRACT_VERSIONS`, `commitAcceptedArtifact`, resume
    endpoints, quality-gate persistence, and all artifact write paths.
2.  Add a typed resolver such as `getExpectedContractName(stageName)`
    using the canonical registry.
3.  At persistence boundaries, derive the expected name from the stage.
    If a caller supplies a conflicting non-empty name, reject it with a
    structured error. Persist the canonical name when omission is
    allowed.
4.  Reuse the same resolver and validation path for normal execution and
    resume.
5.  Preserve contract version and lineage metadata.

Do **not** rely only on
`params.contractName || getExpectedContractName(...)`: a wrong but
non-empty value would bypass that fallback.

### Acceptance tests

-   Missing contract name is handled according to an explicit omission
    policy.
-   Correct explicit name is accepted.
-   Incorrect non-empty name is rejected.
-   Unknown stage fails clearly.
-   Commit and resume preserve canonical name, version, and lineage.
-   A regression test reproduces the original mismatch before the patch
    and passes after it.

## 5. P1: Blueprint coverage from the project inventory

### Problem

The audit reports that Blueprinter only iterates module-owned files and
omits configuration files.

### Implementation

1.  Inspect the Blueprinter prompt and project-file parser.
2.  Derive expected blueprint coverage from the validated project
    inventory, not solely from module ownership.
3.  Require a section for each file the blueprint contract defines as
    requiring one, including applicable configuration manifests.
4.  Describe configuration-file purpose, inputs, outputs, constraints,
    and dependencies.
5.  For `package.json`, derive expected dependencies from validated
    tech-stack requirements and source imports. Do not turn every
    technology mentioned in prose into a package.
6.  Add a deterministic coverage check for missing and unexpected
    sections.
7.  Retry with exact missing paths, then fail explicitly if required
    coverage remains incomplete.

### Acceptance tests

-   Required configuration files receive blueprint sections.
-   Every required file has exactly one section.
-   Unexpected files are not silently introduced.
-   Ownership and dependency-boundary checks remain intact.

## 6. P1: Grounded Coder context; remove fabricated fallback

### Problem

The audit identifies a fallback in `orchestrator.ts` that synthesizes a
blueprint entry with `Dependencies: None` when the requested file is
absent.

### Implementation

1.  Inspect `buildCoderContext`, `runAgent`, `readVirtualFile`,
    `extractMdSection`, and blueprint lookup.
2.  If the target has no blueprint section, look it up in the
    authoritative project inventory and recover relevant context from
    validated architecture, tech stack, project scope, user/project
    prompt, applicable specs, and existing imports/interfaces.
3.  For `package.json`, `tsconfig.json`, and Vite config, inject only
    relevant, grounded context rather than entire artifacts where
    focused extraction is possible.
4.  Replace fabricated dependency claims with an explicit state such as
    "blueprint section missing; context reconstructed from \[sources\]".
    If required sources are unavailable, return a structured
    context-construction error.
5.  Record context provenance where practical.
6.  Preserve VFS authorization and run/stage context; context recovery
    must not expand write permissions.
7.  Constrain generic examples so they cannot override the actual
    project specification.

### Acceptance tests

-   Manifest context includes grounded tech-stack and project-scope
    information using explicit fixtures/mocks.
-   Missing blueprint context never silently becomes
    `Dependencies: None`.
-   Missing required artifacts produce an actionable error.
-   Project-specific requirements take precedence over generic examples.
-   Tests assert meaningful context and provenance, not merely a heading
    string.

## 7. P1: Structured dependency diagnosis and manifest repair

### Problem

The audit anticipates generated imports that are absent from
`package.json`, causing install/build/lint failures.

### Implementation

1.  Inspect Tester diagnostics, `affectedFiles`, repair target
    selection, Debugger context, and VFS authorization.
2.  Normalize diagnostics into structured fields: diagnostic
    code/message, importing file, module specifier, source tool,
    classification, confidence, and suggested repair targets.
3.  Distinguish external packages from internal relative/alias imports,
    misspellings, package subpaths, type packages, and configuration
    errors.
4.  Add `package.json` to authorized repair targets only when evidence
    supports a manifest change and existing authorization permits it.
5.  Provide the exact missing specifier and importing file to the repair
    context.
6.  Select `dependencies` versus `devDependencies` using runtime/build
    usage and project conventions.
7.  Preserve existing version constraints and package-manager/lockfile
    conventions. Do not install every unresolved specifier
    automatically.
8.  After repair, rerun applicable install/build/typecheck/lint checks.
    Keep the issue failed until verification passes.
9.  If classification is ambiguous, use a bounded diagnosis/retry or
    return an explicit unresolved diagnostic rather than guessing.

### Acceptance tests

-   Confirmed missing external package is added to the appropriate
    manifest section.
-   Internal and misspelled imports do not trigger inappropriate package
    installation.
-   Existing versions and lockfile conventions are preserved.
-   Unauthorized repair targets are rejected.
-   A repair is not marked successful until verification passes.

## 8. Regression and integration test strategy

The source audit reports 155 existing tests. Verify the actual test
baseline and status from the target checkout.

### Unit tests

-   Contract resolver and conflicting-name rejection.
-   File classification and ownership policy.
-   Blueprint inventory coverage.
-   Context reconstruction and missing-source behavior.
-   Dependency-diagnostic classification.

### Contract/invariant tests

-   No weakened ownership or artifact validators.
-   VFS authorization remains enforced.
-   Module ownership and release-gate decisions remain independent.
-   Canonical contract identity holds across persistence and resume.

### Integration tests

-   Architecture generation → validation → blueprint generation.
-   Blueprint/context construction → Coder manifest generation.
-   Missing-dependency diagnostic → authorized repair → verification.
-   Artifact commit → resume → downstream contract validation.

### Live-run reproduction

Use the referenced Fitness Logger run's artifacts/logs, if available, or
a deterministic fixture reproducing the same mechanism. Record stage,
sequence/event IDs, artifact versions, relevant database records,
diagnostics, and file diffs.

### Test quality rules

-   Demonstrate each regression failing before and passing after its
    patch.
-   Mock file reads and external boundaries explicitly in unit tests.
-   Assert semantic outcomes, not only prompt strings or headings.
-   Keep fixtures minimal and deterministic.
-   Run targeted tests after each patch and the full suite before final
    acceptance.
-   Never claim tests passed without command output or CI evidence.

## 9. Patch sequence

Implement one root cause per reversible commit:

1.  **Patch A:** Inventory and ownership policy (`ARCH-01`).
2.  **Patch B:** Canonical contract resolution across persistence/resume
    (`RESUME-01`).
3.  **Patch C:** Blueprint inventory coverage (`BLUEPRINT-01`).
4.  **Patch D:** Grounded Coder context; remove fabricated fallback
    (`CODER-01`).
5.  **Patch E:** Structured dependency diagnosis and manifest repair
    (`TESTER-01`).

Each patch must include root-cause evidence, minimal production changes,
targeted regression tests, full-suite result, affected-file/diff
summary, and confirmation that authorization and validation boundaries
remain intact. Do not bundle unrelated cleanup. If two issues share a
root cause, document the evidence before combining them.

## 10. Acceptance gate

A patch is **Verified** only when applicable items are satisfied:

-   [ ] Root cause reproduced or supported by concrete trace evidence.
-   [ ] Regression fails before and passes after the patch.
-   [ ] Relevant unit, contract, and integration tests pass.
-   [ ] Full existing suite passes without regressions.
-   [ ] Inventory and ownership policy remain consistent.
-   [ ] Canonical contract identity holds across commit and resume.
-   [ ] Missing context is surfaced rather than fabricated.
-   [ ] Dependency repair is evidence-based and followed by
    verification.
-   [ ] VFS authorization and release-gate boundaries remain unchanged.
-   [ ] Compiler/linter diagnostics are not suppressed.
-   [ ] Dedicated, reversible Git commit exists.
-   [ ] Logs, test output, and diff are attached to the remediation
    record.

## 11. Issue status ledger

Do not pre-mark any issue as fixed or verified.

  ------------------------------------------------------------------------
  Issue                   Initial status          Evidence required
  ----------------------- ----------------------- ------------------------
  ARCH-01                 Reported by audit;      Architecture fixture or
                          reproduce/confirm       trace plus before/after
                                                  regression

  RESUME-01               Reported by audit;      Artifact metadata and
                          reproduce/confirm       resume trace

  BLUEPRINT-01            Reported by audit;      Inventory-to-blueprint
                          reproduce/confirm       comparison

  CODER-01                Reported by audit;      Captured fabricated
                          reproduce/confirm       fallback and resulting
                                                  manifest

  TESTER-01               Anticipated by source   Actual missing-module
                          audit; confirm          diagnostic and repair
                                                  trace, or deterministic
                                                  regression fixture
  ------------------------------------------------------------------------

Status vocabulary: - **Hypothesized:** plausible mechanism, not
reproduced. - **Observed:** reproduced or supported by direct
trace/artifact evidence. - **Patched:** code change exists, verification
incomplete. - **Verified:** regression, relevant integration checks,
full suite, and safety invariants pass.

## 12. MCP and agent-tooling scope

This plan does not identify MCP as the cause. The reported failures
concern file coverage, contract naming, context construction, and
dependency synchronization.

Do not introduce MCP as part of these patches unless trace evidence
shows that the affected execution path depends on MCP and MCP behavior
causes the failure. Keep this remediation focused on demonstrated
defects. Evaluate MCP separately only if there is a clear
interoperability requirement, measurable benefit, and dedicated
integration tests.

## 13. Out of scope

Unless evidence establishes a direct causal connection, do not: -
redesign the full orchestration architecture; - introduce MCP or another
tool protocol; - relax architecture or release-gate contracts; - rewrite
unrelated agents or prompts; - change VFS authorization semantics; -
claim the live-run issue is resolved without reproduction and
verification.

## 14. Final recommendation

Treat this as a **proposed implementation plan**, not a report of
completed fixes. Prove each failure mechanism against the actual
checkout and run data, implement the smallest deterministic correction,
add a regression test capturing the original failure, and verify the
pipeline before proceeding.

**Engineering rule:** project-file coverage, explicit ownership
semantics, canonical contracts, grounded context, and evidence-based
repair should be enforced by the engine wherever possible. Prompts
should guide the model, not carry the entire burden of correctness.
