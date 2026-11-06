# AutoCoder Live Issues & Incident Ledger (Run 2 & Run 3 — October 2026)

## Core Philosophy & Discipline
> **"Putting the fire out, not removing the smoke detector."**  
> We do not bypass contracts, silence linters, widen security exemptions, or fake validation. When a stage or contract fails, we determine the exact mechanistic reason (LLM prompt disparity, token budget truncation, context omission, schema mismatch, or orchestration defect) and apply a permanent root-cause fix to the engine following `AutoCoder_Live_Run_Debugging_Playbook_with_Fixing_Philosophies.md`.

---

## 1. Issue Tracking Dashboard (Aligned with AutoCoder_Revised_Remediation_Plan.md)

| Issue ID | Stage | Severity | Status (Vocabulary: Hypothesized / Observed / Patched / Verified) | Description & Mechanism | Desired Outcome & Patch Target |
|---|---|---|---|---|---|
| **`ARCH-01`** | **Architect** | `P0` | **`Verified`** (Run 3) | `index.html` and `style.css` classified under framework/application shell. Attempt 1 passed cleanly in 96.54s with zero orphan errors. | **Patch A**: Inventory & ownership policy; framework entry/styles under `Application Shell`. |
| **`RESUME-01`** | **Resume / Artifact Store** | `P1` | **`Verified`** (Run 3) | `getExpectedContractName` resolves canonical `ArchitectureOutput`. System input compatibility asserted cleanly without drift. | **Patch B**: Canonical contract name resolver across commit and resume. |
| **`BLUEPRINT-01`** | **Blueprinter** | `P1` | **`Verified`** (Run 3) | Blueprinter instructions and example updated to mandate explicit specifications for manifest/config files. | **Patch C**: Derive blueprint coverage from validated project inventory. |
| **`CODER-01`** | **Coder** | `P1` | **`Verified`** (Run 3) | Deleted fabricated `Dependencies: None`. Injected `architecture.md#Tech Stack` and `plan.md#Project Goal` into context. | **Patch D**: Grounded Coder context; extract real Tech Stack from architecture. |
| **`REPAIR-01`** | **Repair Coordinator** | `P0` | **`Verified`** (Run 3) | Updated `extractRepairPlanFromDebuggerOutput` regex to match root files (`package.json`, `tsconfig.json`) and numbered list items. | **Patch E Extension**: Root file regex matching in repair coordinator. |
| **`LINT-01`** | **Tester / Debugger / Coder** | `P1` | **`Patched`** (Verified in 157 Tests) | Eliminates 10-cycle repair oscillation between TS8010 syntax errors and TS2339 DOM property errors under `checkJs: true` in vanilla JS. | **Patch F**: Idiomatic JS DOM typing rules in Debugger, pure ECMAScript enforcement in Coder, JS context injection in Repair Coordinator. |

*Severity Scale: `P0: Blocker (Pipeline halted)`, `P1: Critical (Corrupt output/Contract violation)`, `P2: Major (Degraded quality/Retry loop)`, `P3: Minor (Telemetry/Format anomaly)`*

---

## 2. Active Watchlist (Based on Playbook 10 Signals)

1. **Unauthorized repair targets survive filtering**: Ensure `repair-coordinator.ts` drops unauthorized paths before invocation.
2. **Fabricated blueprint context reaches Coder**: Ensure Coder receives strictly mapped blueprint sections, not synthetic fallbacks.
3. **Reviewer findings treated as invalid report**: Ensure valid negative review reports are structurally accepted, with quality thresholds enforced at the release gate.
4. **Tester PASS/FAIL depends on Markdown formatting**: Ensure structured failures in `failures[]` take precedence over textual PASS.
5. **Static checks pass but app fails at runtime**: Watch for Next.js App Router route mapping discrepancies and unmigrated database dependencies.
6. **Frontend API request has no matching route**: Watch if client components fetch `/api/...` endpoints that lack matching route directories.
7. **Imported package missing from manifest**: Watch for external package imports absent from `package.json`.
8. **Files disagree on exports/props**: Watch for default vs. named import mismatches between components and page.
9. **Prisma suppression hides a real error**: Ensure model access errors on PrismaClient are handled cleanly without masking syntax flaws.
10. **Repair makes no progress or verification is stale**: Ensure repair iterations produce fresh workspace fingerprints and avoid stagnation loops.

---

## 3. Incident Notes (Playbook Template Format)

```text
Issue ID: ISSUE-ARCH-01
Run ID / timestamp: da6beb05-0aa1-44c6-b6e6-ab0074f6f7aa / 2026-10-29T12:39:36.213Z (Sequence 1006)
AutoCoder commit / branch: 9d60c67 / main
Stage: Architect (Attempt 1)
Generated workspace: projects/8c6b6878-128f-4ccd-accb-a7c179da8c7f
Expected behavior: Every declared project file has exactly one owning module, and all project files (except unowned configs) are mapped to modules.
Observed behavior: Candidate validation failed with 5 contract errors:
  1. "src/components/WorkoutForm.tsx" claimed by both "Frontend Application" and "UI Components".
  2. "src/components/ExerciseList.tsx" claimed by both "Frontend Application" and "UI Components".
  3. "src/components/WorkoutHistoryTable.tsx" claimed by both "Frontend Application" and "UI Components".
  4. "src/components/ProgressChart.tsx" claimed by both "Frontend Application" and "UI Components".
  5. "index.html" from Project Folder Structure not claimed by any module.
Status: FIXED_AND_VERIFIED (Verified in Run 3: Attempt 1 passed in 96.54s)
Mechanistic Root Cause:
  1. The LLM correctly separated component modules in Attempt 3 (zero duplicate ownerships across components).
  2. However, Vite projects use root `index.html` as the browser entry point, and global CSS `src/styles/global.css` for styling.
  3. Under `architecture-file-policy.ts`, both files classify as `implementation` (not exempt config/schema/doc/static-asset), requiring explicit module ownership.
  4. The LLM's Attempt 3 listed them in `Project Folder Structure` and `Project Files`, but left them out of `Modules`, triggering contract rejection.
Patch Plan:
  - Added `index.html` and `src/styles/global.css` to `Frontend Application` Owned Files in `architecture.md`.
  - Added explicit directive in `src/lib/agents/ruflo/registry/Architect.ts` under `MODULE OWNERSHIP CONTRACT` mandating root HTML and stylesheet module assignment.
```

---

```text
Issue ID: ISSUE-CODER-01
Run ID / timestamp: da6beb05-0aa1-44c6-b6e6-ab0074f6f7aa / 2026-10-29T13:45:00.000Z (Run 2 Coder)
AutoCoder commit / branch: 9d60c67 / main
Stage: Coder (Attempt 1)
Generated workspace: projects/8c6b6878-128f-4ccd-accb-a7c179da8c7f
Expected behavior: Coder synthesizes package.json containing dependencies declared in architecture.md#Tech Stack (e.g. react, lucide-react, tailwindcss).
Observed behavior: Coder synthesized a 272-byte package.json for "calculator-app" with 0 dependencies.
Status: FIXED_AND_VERIFIED (Verified in Run 3: Coder synthesized fully grounded workspace without fake dependencies)
Mechanistic Root Cause:
  1. `loadAuthorizedFileSet` includes unowned architecture files (`package.json`, `tsconfig.json`, `vite.config.ts`, `README.md`) in `authorizedFiles`.
  2. Blueprinter only generated sections for implementation files with explicit module ownership, omitting `package.json`.
  3. In `orchestrator.ts:1269-1271`, when `targetSection` was empty, orchestrator synthesized:
     `targetSection = "### File: " + targetFile + "\n- **Purpose**: Implementation of " + targetFile + "\n- **Dependencies**: None\n- **Exports**: None";`
  4. With zero project context, Coder fell back to prompt example and hallucinated `calculator-app`.
Patch Plan:
  1. In `src/lib/agents/ruflo/registry/Blueprinter.ts`, mandated dedicated blueprint specification for root configuration files.
  2. In `orchestrator.ts:buildCoderContext`, injected `architecture.md#Tech Stack` and `plan.md#Project Goal` into Coder context.
```

---

```text
Issue ID: ISSUE-REPAIR-01
Run ID / timestamp: da6beb05-0aa1-44c6-b6e6-ab0074f6f7aa / 2026-10-29T14:09:59.578Z (Sequence 14013)
AutoCoder commit / branch: 9d60c67 / main
Stage: Repair Coordinator (Tester -> Debugger -> Coder Cycle 1)
Generated workspace: projects/8c6b6878-128f-4ccd-accb-a7c179da8c7f
Expected behavior: Debugger identified 9 files in "Patches Applied" (tsconfig.json, package.json, vite.config.ts, and 6 React components). RepairCoordinator should extract all 9 files, validate them against authorizedFiles, and invoke Coder to repair all 9 files.
Observed behavior: RepairCoordinator reported:
  "Invoking Coder to implement targeted repairs across 6 authorized file(s)..."
  The 3 root configuration files (`package.json`, `tsconfig.json`, `vite.config.ts`) were silently omitted from `plan.affectedFiles`.
Status: FIXED_AND_VERIFIED (Implemented in repair-coordinator.ts:540-565 with root manifest + numbered list regex support; verified across all 10 cycles in Run 3)
Mechanistic Root Cause:
  1. `debug_report.md` listed files as `1. **tsconfig.json**\n2. **package.json**\n...`.
  2. The fallback regex `/\b(?:src|app|pages|server|components|lib|utils|public|config|styles)[\/\w\-\[\].]+\.(?:tsx|ts|jsx|js|html|css|json|prisma|sql|md)\b/gi` specifically required a directory prefix from the alternation group.
  3. Root files (`package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`) have no directory prefix and were discarded.
Patch Plan:
  1. Updated `extractRepairPlanFromDebuggerOutput` regex in `repair-coordinator.ts` to match root config and manifest files and numbered list items.
  2. Reinforced formatting: `File: <path>` in Debugger prompt.
```

---

```text
Issue ID: ISSUE-LINT-01
Run ID / timestamp: 05944f51-b4aa-42ff-a3ad-7c8169245d5f / 2026-10-30T17:29:40.386Z - 2026-10-30T18:47:07.491Z (Cycles 1-10)
AutoCoder commit / branch: 9d60c67 / main
Stage: Deterministic Verification (Tester -> Debugger -> Coder Cycles 1-10)
Generated workspace: projects/1bdead13-0374-4e14-8df7-fe05ac4b1fcc
Expected behavior:
  Vanilla JavaScript projects (.html, .js, .css) should pass deterministic verification when syntactically valid DOM manipulation is performed without crashing or emitting false-positive TypeScript typing diagnostics.
Observed behavior:
  In Cycle 1, Tester flagged DOM element typing issues:
    - Property 'value' does not exist on type 'HTMLElement'.
    - Property 'reset' does not exist on type 'HTMLElement'.
  In Cycle 2, Debugger advised type assertions (`as HTMLFormElement`), causing Coder to output TypeScript syntax in `script.js`.
  Tester Cycle 2 immediately failed with 7 instances of TS8010:
    - `Type assertion expressions can only be used in TypeScript files.`
  In Cycle 3, Coder removed `as ...` expressions and used standard vanilla JS (`new FormData(salesForm)`), but TypeScript's `checkJs: true` in `linter.ts` failed with:
    - `Argument of type 'HTMLElement' is not assignable to parameter of type 'HTMLFormElement'.`
    - `Argument of type 'FormDataEntryValue' is not assignable to parameter of type 'string'.`
    - `Property 'reset' does not exist on type 'HTMLElement'.`
  Oscillation between TS8010 and TS2339 continued through Cycles 4, 5, 6, 7, 8, 9, 10 until hitting the hard ceiling of 10 cycles, failing the pipeline.
Status: PATCHED_AND_VERIFIED (Implemented in Debugger.ts, Coder.ts, and repair-coordinator.ts; 157 unit tests pass)
Mechanistic Root Cause:
  1. `src/lib/agents/ruflo/linter.ts` sets `checkJs: true` and `strict: false` in `compilerOptions` for all files including `.js`.
  2. In vanilla JS with `checkJs: true`, TypeScript performs semantic type checking on JavaScript code, but forbids TypeScript type assertion syntax (`<Type>x` or `x as Type`).
  3. Standard DOM calls like `document.getElementById('form-id')` return `HTMLElement | null`.
  4. Passing `HTMLElement` to `new FormData(el)` or calling `.reset()` fails TypeScript's type checker because `HTMLElement` does not declare `reset()`, only `HTMLFormElement` does.
  5. In idiomatic vanilla JavaScript, developers either use `document.querySelector('form')`, `document.forms[0]`, JSDoc comments (`/** @type {HTMLFormElement} */ (document.getElementById(...))`), or runtime `instanceof HTMLFormElement` / `instanceof HTMLInputElement` type guards.
  6. Debugger LLM oscillated: when confronted with type mismatch diagnostics (TS2339), it instinctively output TypeScript type assertions (`as HTMLInputElement`), triggering syntax error TS8010 on the next deterministic test. When confronted with TS8010, it removed the type assertion, re-triggering TS2339.
Patch Applied (Philosophy: "Putting out the fire, not removing the smoke detector"):
  1. In `src/lib/agents/ruflo/registry/Debugger.ts`, added explicit `Language-Specific Syntax Rules` forbidding prescribing `as Type` or `: Type` in `.js` files, and mandating runtime `instanceof` guards, DOM-specific selectors (`querySelector`), or JSDoc type casts.
  2. In `src/lib/agents/ruflo/registry/Coder.ts`, added Rule 7 enforcing pure ECMAScript for `.js` files, forbidding TypeScript syntax and requiring standard DOM access patterns.
  3. In `src/lib/agents/ruflo/repair-coordinator.ts`, added targeted JavaScript context injection to `debugContext` and per-file `coderRepairInstructions` when `.js` or `.jsx` files fail verification.
  4. Preserved linter rigor: `checkJs: true` and semantic typechecking remain 100% active.
  5. Verified: 157/157 unit and contract tests pass with 0 failures.
```
