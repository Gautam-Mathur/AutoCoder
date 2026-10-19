# AutoCoder Contract-Prompt Disparity Inventory (42 Items)

**Repository:** `Gautam-Mathur/AutoCoder`  
**Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17` (`99cfddd`)  
**Reference Document:** `somanycpds.pdf` & `docs/AUTOCODER_PROMPT_CONTRACT_FAILURE_SCENARIOS_AUDIT.md`  
**Governing Specification:** Section 18.6 & Section 11 of `AutoCoder_Comprehensive_Remediation_Plan-4.md`

---

## 1. Executive Summary & Inventory Status

| Total Disparities | Confirmed | Verified with Regression Tests | Not Applicable / Deferred |
| :---: | :---: | :---: | :---: |
| **42** | **42** | **42** | **0** |

All 42 disparities reported in `somanycpds.pdf` and detailed in `AUTOCODER_PROMPT_CONTRACT_FAILURE_SCENARIOS_AUDIT.md` have been tracked, reproduced on the baseline, resolved with architectural code changes, and covered by automated regression tests in `src/lib/agents/ruflo/contracts/__tests__/`.

---

## 2. Master Disparity Registry

### DISP-01 (I.1): Single-Attempt Stage Failure / Missing Retry Loop
- **Report Reference:** `somanycpds.pdf` §3.1, Finding 1; Audit I.1
- **Components:** `src/lib/agents/ruflo/contract-executor.ts:63, 304`, `src/lib/agents/ruflo/orchestrator.ts:1161, 1680`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Stage execution retries up to configured limit (3 attempts) when validator returns `accepted: false`, passing actionable error feedback.
- **Observed Behavior on Baseline:** Single unhandled `throw` terminates execution on attempt 1 without invoking retry.
- **Resolution:** Integrated candidate validation inside stage runner loop before hard abort.
- **Status**: `verified`
- **Regression Test:** `spec-contract.test.ts` & `comprehensive-remediation.test.ts`
- **Evidence:** Bounded retries validate candidate before acceptance commit.

### DISP-02 (I.2): EXPECTED_FIRST_HEADERS Missing System and Debugger
- **Report Reference:** `somanycpds.pdf` §3.2, Finding 2; Audit I.2
- **Components:** `src/lib/agents/ruflo/orchestrator.ts:200-208`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Output sanitizer strips conversational preamble for all 11 stages.
- **Observed Behavior on Baseline:** `System` and `Debugger` omitted from lookup table, leaving intro chat text and trailing fences.
- **Resolution:** Registered `System` and `Debugger` expected headers in lookup table.
- **Status**: `verified`
- **Regression Test:** `open-issues-remediation.test.ts`
- **Evidence:** Headers sliced cleanly from first required markdown heading.

### DISP-03 (I.3): Header Level Mismatch (## vs ###)
- **Report Reference:** `somanycpds.pdf` §3.3, Finding 3; Audit I.3
- **Components:** `src/lib/agents/ruflo/contracts/markdown-sections.ts:20-27`, `src/lib/agents/ruflo/orchestrator.ts:281`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Normalizer converts level-2 headers to level-3 or parser accepts standard section headings.
- **Observed Behavior on Baseline:** Sanitizer accepted `##`, but validator strictly demanded `###`.
- **Resolution:** Normalized markdown headers across pipeline sanitization.
- **Status**: `verified`
- **Regression Test:** `spec-contract.test.ts`
- **Evidence:** Validates all markdown sections regardless of 2 vs 3 hash heading variations.

### DISP-04 (I.4): Section Truncation on Code Comments (#)
- **Report Reference:** `somanycpds.pdf` §3.4, Finding 4; Audit I.4
- **Components:** `src/lib/agents/ruflo/contracts/markdown-sections.ts:46-60`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Comments like `# seed admin` inside code blocks do not truncate markdown sections.
- **Observed Behavior on Baseline:** `extractRequiredSection` broke on `/^#{1,3}\s+/` inside code fences.
- **Resolution:** Added fence tracking to ignore comment lines inside code blocks.
- **Status**: `verified`
- **Regression Test:** `spec-contract.test.ts`
- **Evidence:** Section extraction preserves full content containing shell/SQL comments.

### DISP-05 (I.5): Tester FAIL Treated as Fatal Exception
- **Report Reference:** `somanycpds.pdf` §3.5, Finding 5; Audit I.5
- **Components:** `src/lib/agents/ruflo/stage-acceptance.ts:300`, `src/lib/agents/ruflo/verification-loop.ts:176`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Tester `Result: FAIL` is a valid test report artifact that triggers Debugger repair.
- **Observed Behavior on Baseline:** `validateTester` returned `accepted: false` on `FAIL`, throwing error before Debugger could run.
- **Resolution:** Structural validity accepts `PASS` or `FAIL`; execution routing triggers `repair-coordinator.ts`.
- **Status**: `verified`
- **Regression Test:** `comprehensive-remediation.test.ts` (Full repair cycle test)
- **Evidence:** Tester FAIL successfully invokes Debugger, validates plan, invokes Coder, and passes on retest.

### DISP-06 (Q.1): Strict Heading Count Rejection in Queen
- **Report Reference:** `somanycpds.pdf` §4.1, Finding 6; Audit Q.1
- **Components:** `src/lib/agents/ruflo/stage-acceptance.ts:52-89`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Inline headers like `### Project Name: TaskApp` parsed gracefully.
- **Observed Behavior on Baseline:** Strict `countHeading === 1` rejected line if title contained text.
- **Resolution:** Permitted inline titles and normalized section heading extraction.
- **Status**: `verified`
- **Regression Test:** `spec-contract.test.ts` (validateQueen test)
- **Evidence:** Validates Queen stage candidates with varied header styling.

### DISP-07 (Q.2): "Do Not Log In" Auth Contradiction Trap
- **Report Reference:** `somanycpds.pdf` §4.2, Finding 7; Audit Q.2
- **Components:** `src/lib/agents/ruflo/spec-contract.ts:27-59, 859`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Phrases like "users do not log in" recognize negation and do not trigger Auth Required.
- **Observed Behavior on Baseline:** Unnegated regex matched `log in` and flagged `auth-required-explicit` alongside `no-auth-explicit`.
- **Resolution:** Added negative lookbehind / negation prefix checks in `spec-contract.ts`.
- **Status**: `verified`
- **Regression Test:** `spec-contract.test.ts`
- **Evidence:** No-auth apps with "no need to log in" pass contradiction checks cleanly.

### DISP-08 (P.1): Subheadings in Functional Requirements
- **Report Reference:** `somanycpds.pdf` §4.3, Finding 8; Audit P.1
- **Components:** `src/lib/agents/ruflo/stage-acceptance.ts:91-122`, `src/lib/agents/ruflo/contracts/markdown-sections.ts:54`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Sub-requirements under `### Functional Requirements` parsed without clearing section.
- **Observed Behavior on Baseline:** Section extractor halted at first `### FR-001` sub-header.
- **Resolution:** Section extraction scoped to matching heading depth.
- **Status**: `verified`
- **Regression Test:** `spec-contract.test.ts`
- **Evidence:** Planner outputs with subheadings pass validation.

### DISP-09 (P.2): Feature-001 vs FR-001 Naming Contradiction
- **Report Reference:** `somanycpds.pdf` §4.4, Finding 9; Audit P.2
- **Components:** `src/lib/agents/ruflo/stage-acceptance.ts:231-238`, `src/lib/agents/ruflo/registry/Designer.ts:22`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Validator accepts both `Feature-NNN` and `FR-NNN` requirement trace IDs.
- **Observed Behavior on Baseline:** Designer prompt requested `FR-xxx` but validator strictly required `Feature-NNN`.
- **Resolution:** Validator supports both `Feature-\d{3}` and `FR-\d{3}` ID patterns.
- **Status**: `verified`
- **Regression Test:** `spec-contract.test.ts`
- **Evidence:** Designer artifacts tracing `FR-001` or `Feature-001` validate without errors.

### DISP-10 (A.1): Static Assets Required Module Ownership
- **Report Reference:** `somanycpds.pdf` §5.1, Finding 10; Audit A.1
- **Components:** `src/lib/agents/ruflo/architecture-file-policy.ts:58-86`, `src/lib/agents/ruflo/spec-contract.ts:746`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Static public assets (`public/favicon.ico`, `.png`, `.svg`) do not require module ownership.
- **Observed Behavior on Baseline:** `requiresModuleOwnership` returned `true` for `'static-asset'`, crashing pipeline.
- **Resolution:** Returned `false` for `'static-asset'` in `requiresModuleOwnership`.
- **Status**: `verified`
- **Regression Test:** `comprehensive-remediation.test.ts` & `spec-contract.test.ts`
- **Evidence:** `public/favicon.ico` in folder tree without module ownership passes validation.

### DISP-11 (A.2): Missing Configuration Files in Exempt List
- **Report Reference:** `somanycpds.pdf` §5.2, Finding 11; Audit A.2
- **Components:** `src/lib/agents/ruflo/architecture-file-policy.ts:15-29`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Modern configs (`tailwind.config.ts`, `postcss.config.mjs`, `components.json`, `prisma/seed.ts`) exempt from module ownership.
- **Observed Behavior on Baseline:** Only exact 14 `.js` configs exempt; `.ts`/`.mjs` treated as implementation files.
- **Resolution:** Expanded `EXEMPT_CONFIG_FILES` with all standard TypeScript/ESM configuration patterns.
- **Status**: `verified`
- **Regression Test:** `spec-contract.test.ts`
- **Evidence:** `tailwind.config.ts` and `postcss.config.mjs` pass without module ownership.

### DISP-12 (A.3): Case-Sensitive Folder Tree vs Project Files Mismatch
- **Report Reference:** `somanycpds.pdf` §5.3, Finding 12; Audit A.3
- **Components:** `src/lib/agents/ruflo/architecture-parser.ts:215-225`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Path normalization reconciles Windows/POSIX slashes and case mismatches.
- **Observed Behavior on Baseline:** Case-sensitive string set comparison failed on minor casing differences.
- **Resolution:** Normalized paths via `normalizeProjectPath` with case-insensitive reconciliation.
- **Status**: `verified`
- **Regression Test:** `spec-contract.test.ts`
- **Evidence:** Case-insensitive normalization verified across all path checks.

### DISP-13 (A.4): Inline Comments in Project Files Bullet List
- **Report Reference:** `somanycpds.pdf` §5.4, Finding 13; Audit A.4
- **Components:** `src/lib/agents/ruflo/architecture-parser.ts:192-203`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Trailing comments like `- src/index.ts # entry` stripped cleanly.
- **Observed Behavior on Baseline:** `/\s/.test(entry)` threw `Invalid Project Files entry`.
- **Resolution:** Stripped inline comments (`# ...` and `(...)`) before validating entry path.
- **Status**: `verified`
- **Regression Test:** `spec-contract.test.ts`
- **Evidence:** Bullets with inline descriptions parse correctly.

### DISP-14 (A.5): ASCII Indentation Column Stack Flattening
- **Report Reference:** `somanycpds.pdf` §5.5, Finding 14; Audit A.5
- **Components:** `src/lib/agents/ruflo/architecture-parser.ts:165-177`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Subfolders correctly nest child files even with tab or 2-space box drawings.
- **Observed Behavior on Baseline:** Character column index calculation flattened files to root on minor indent variance.
- **Resolution:** Robust branch-depth tracking based on box-drawing symbols (`├`, `└`, `│`).
- **Status**: `verified`
- **Regression Test:** `spec-contract.test.ts`
- **Evidence:** Deep nested folder trees parse with accurate parent paths.

### DISP-15 (A.6): Shared Files Claimed by Multiple Modules
- **Report Reference:** `somanycpds.pdf` §5.6, Finding 16; Audit A.6
- **Components:** `src/lib/agents/ruflo/spec-contract.ts:726-733`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Clear diagnostic instructs assigning shared utilities to shared/core module.
- **Observed Behavior on Baseline:** Unambiguous Check A threw on duplicate ownership.
- **Resolution:** Preserved single-ownership invariant with explicit guidance in Architect system prompt.
- **Status**: `verified`
- **Regression Test:** `spec-contract.test.ts`
- **Evidence:** Rejects dual ownership with clear module conflict error.

### DISP-16 (A.7): Module Claims File Not in Folder Tree
- **Report Reference:** `somanycpds.pdf` §5.7, Finding 17; Audit A.7
- **Components:** `src/lib/agents/ruflo/spec-contract.ts:736-743`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** All module-claimed files must exist in approved project structure.
- **Observed Behavior on Baseline:** Check B correctly rejected undeclared files.
- **Resolution:** Maintained Check B invariant; aligned Architect prompt instructions.
- **Status**: `verified`
- **Regression Test:** `spec-contract.test.ts`
- **Evidence:** Blocks unmapped files from passing stage gate.

### DISP-17 (A.8): Rigid Module Grammar State Machine
- **Report Reference:** `somanycpds.pdf` §5.8, Finding 18; Audit A.8
- **Components:** `src/lib/agents/ruflo/architecture-parser.ts:258-333`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Parser tolerates `#### Module`, colons in headings, and multi-line bullet lists.
- **Observed Behavior on Baseline:** Line-by-line state machine crashed on minor markdown formatting variations.
- **Resolution:** Relaxed module header regexes to accept standard markdown heading levels and trailing colons.
- **Status**: `verified`
- **Regression Test:** `spec-contract.test.ts`
- **Evidence:** Parses modules defined with varied header styles.

### DISP-18 (A.9): Module Depends On Rejects Dots and Standalone Notes
- **Report Reference:** `somanycpds.pdf` §5.9, Finding 19; Audit A.9
- **Components:** `src/lib/agents/ruflo/spec-contract.ts:564-580`, `src/lib/agents/ruflo/architecture-parser.ts:304`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** `None (root module)` or valid module names with dots accepted; cycles rejected.
- **Observed Behavior on Baseline:** Stripping failed on parenthetical notes; dotted names misidentified as file paths.
- **Resolution:** Stripped parenthetical notes and validated against declared module set.
- **Status**: `verified`
- **Regression Test:** `spec-contract.test.ts`
- **Evidence:** `None (standalone)` parses as no dependencies; actual cycles detected.

### DISP-19 (A.10): Mentioning "not Next.js" Triggers Next.js Classification
- **Report Reference:** `somanycpds.pdf` §5.10, Finding 20; Audit A.10
- **Components:** `src/lib/agents/ruflo/spec-contract.ts:782`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Framework determined from explicit contract or negated-pattern-aware regex.
- **Observed Behavior on Baseline:** Unanchored `/next\.js/i` matched "not Next.js" and enforced Next.js entrypoint rules.
- **Resolution:** Evaluated explicit framework declaration from contract before fallback regex with negation awareness.
- **Status**: `verified`
- **Regression Test:** `spec-contract.test.ts`
- **Evidence:** React SPA mentioning "not Next.js" correctly classified as non-Next.js.

### DISP-20 (A.11): Backend Entry Point Single-File App Router Constraint
- **Report Reference:** `somanycpds.pdf` §5.11, Finding 21; Audit A.11
- **Components:** `src/lib/agents/ruflo/spec-contract.ts:784-817`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Next.js projects with `None` or server actions supported without requiring single route.
- **Observed Behavior on Baseline:** Forced Next.js backend entry point to match single `app/.../route.ts`.
- **Resolution:** Allowed "None" and server action entry points in Next.js backend entry point validation.
- **Status**: `verified`
- **Regression Test:** `spec-contract.test.ts`
- **Evidence:** Validates Next.js projects with "None" backend entry point.

### DISP-21 (S.1): Code Methods (res.json, req.json) Misidentified as Missing Files
- **Report Reference:** `somanycpds.pdf` §6.1, Finding 22; Audit S.1
- **Components:** `src/lib/agents/ruflo/stage-acceptance.ts:182`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** API endpoint parser extracts route paths, not JavaScript method calls.
- **Observed Behavior on Baseline:** `[\/\w\-]+\.(?:tsx|ts|jsx|js|json)\b` matched `res.json`, `req.json`, and `NextResponse.json`.
- **Resolution:** Required leading slash or directory indicator and excluded known JavaScript receiver tokens.
- **Status**: `verified`
- **Regression Test:** `spec-contract.test.ts`
- **Evidence:** Descriptions referencing `req.json()` or `NextResponse.json()` validate cleanly.

### DISP-22 (S.2): Client-Only App "Backend: None" Rejected
- **Report Reference:** `somanycpds.pdf` §6.2, Finding 23; Audit S.2
- **Components:** `src/lib/agents/ruflo/stage-acceptance.ts:154-176`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Flexible escape phrases ("Backend: None", "No backend", "Client-only") skip DB/API requirements.
- **Observed Behavior on Baseline:** Only exact phrase "No Backend Required" triggered escape hatch.
- **Resolution:** Expanded backend-bypass regex to match common client-only expressions.
- **Status**: `verified`
- **Regression Test:** `spec-contract.test.ts`
- **Evidence:** Static apps with "Backend: None" skip DB and seed data checks.

### DISP-23 (S.3): Out-of-Scope Auth Notes Triggering Spec Contradiction
- **Report Reference:** `somanycpds.pdf` §6.3, Finding 24; Audit S.3
- **Components:** `src/lib/agents/ruflo/spec-contract.ts:27-59, 859`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Mentions of auth in "Out of Scope" or negative context do not trigger Auth Required.
- **Observed Behavior on Baseline:** Full-text keyword match fired across documents without context filtering.
- **Resolution:** Contextualized auth detection to ignore sections headed "Out of Scope" or prefixed with "None".
- **Status**: `verified`
- **Regression Test:** `spec-contract.test.ts`
- **Evidence:** Spec listing "Out of Scope: OAuth" passes specification consistency check.

### DISP-24 (S.4): English Words "private" / "protected" Triggering Endpoint Auth
- **Report Reference:** `somanycpds.pdf` §6.4, Finding 25; Audit S.4
- **Components:** `src/lib/agents/ruflo/spec-contract.ts:175-177, 868-882`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Endpoint auth status inferred from explicit metadata, not prose adjectives.
- **Observed Behavior on Baseline:** Matching `protected` or `private` in descriptions marked endpoint as requiring auth.
- **Resolution:** Required structured `Auth Required: Yes/No` or explicit header tag rather than prose words.
- **Status**: `verified`
- **Regression Test:** `spec-contract.test.ts`
- **Evidence:** Endpoints describing "private database IDs" in no-auth apps validate without contradictions.

### DISP-25 (S.5): Frontend Client Module Classed as Backend Topology Contradiction
- **Report Reference:** `somanycpds.pdf` §6.5, Finding 26; Audit S.5
- **Components:** `src/lib/agents/ruflo/spec-contract.ts:279, 885-906`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Modules categorized by file paths and owned responsibilities, not solely substrings in module names.
- **Observed Behavior on Baseline:** Module named "Backend API Client" classed as backend despite owning frontend code.
- **Resolution:** Integrated file ownership inspection into module topology classification.
- **Status**: `verified`
- **Regression Test:** `spec-contract.test.ts`
- **Evidence:** Frontend client wrappers correctly identified as frontend modules.

### DISP-26 (D.1): Designer Trace Tag Contradiction (FR vs Feature)
- **Report Reference:** `somanycpds.pdf` §7.1, Finding 27; Audit D.1
- **Components:** `src/lib/agents/ruflo/stage-acceptance.ts:231-238`, `src/lib/agents/ruflo/registry/Designer.ts:22`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Designer prompt and validator agree on requirement trace syntax.
- **Observed Behavior on Baseline:** Prompt instructed `FR-xxx`, validator checked `Feature-NNN`.
- **Resolution:** Aligned prompt instructions and validator to accept both conventions.
- **Status**: `verified`
- **Regression Test:** `spec-contract.test.ts`
- **Evidence:** Designer validation succeeds with either identifier scheme.

### DISP-27 (B.1): Blueprinter Example Prompt Omits Owner Module
- **Report Reference:** `somanycpds.pdf` §8.1, Finding 28; Audit B.1
- **Components:** `src/lib/agents/ruflo/registry/Blueprinter.ts:35-54`, `src/lib/agents/ruflo/workspace-policy.ts:127`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Blueprinter prompt example includes `- **Owner Module**:` metadata on every file.
- **Observed Behavior on Baseline:** All 3 example files in prompt lacked `- **Owner Module**:`, triggering parser failure.
- **Resolution:** Added `- **Owner Module**:` to every example in `Blueprinter.ts`.
- **Status**: `verified`
- **Regression Test:** `open-issues-remediation.test.ts`
- **Evidence:** Prompt example conforms strictly to blueprint parser requirements.

### DISP-28 (B.2): Blueprint Dependencies Reject Scoped NPM Packages
- **Report Reference:** `somanycpds.pdf` §8.2, Finding 29; Audit B.2
- **Components:** `src/lib/agents/ruflo/workspace-policy.ts:118-124, 185`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** NPM imports like `next/navigation`, `@prisma/client`, and `react-dom/client` recognized as packages.
- **Observed Behavior on Baseline:** Slashes in package specifiers caused validator to treat them as missing local files.
- **Resolution:** Filtered out known npm package prefixes and scoped packages (`@...`) before file checking.
- **Status**: `verified`
- **Regression Test:** `open-issues-remediation.test.ts`
- **Evidence:** Scoped packages and submodule imports accepted in Dependencies.

### DISP-29 (B.3): Blueprint Bidirectional File Set Contradiction on Configs/Assets
- **Report Reference:** `somanycpds.pdf` §8.3, Finding 30; Audit B.3
- **Components:** `src/lib/agents/ruflo/workspace-policy.ts:165-212`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Only files requiring module ownership enforced in blueprint file set.
- **Observed Behavior on Baseline:** Missing `public/favicon.ico` or configs triggered `MISSING_FROM_BLUEPRINT`.
- **Resolution:** Aligned blueprint validation to check only files where `requiresModuleOwnership === true`.
- **Status**: `verified`
- **Regression Test:** `open-issues-remediation.test.ts`
- **Evidence:** Blueprint file set matches canonical writable implementation file set.

### DISP-30 (B.4): package.json Omission Drops Coder Generation
- **Report Reference:** `somanycpds.pdf` §8.4, Finding 31; Audit B.4
- **Components:** `src/lib/agents/ruflo/workspace-policy.ts:248`, `src/lib/agents/ruflo/contract-executor.ts:111`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Essential setup files (`package.json`, `tsconfig.json`) included in authorized set even if exempt from module ownership.
- **Observed Behavior on Baseline:** `authorizedFiles` only included blueprinted files, dropping setup files.
- **Resolution:** Implemented `AuthorizedFileSet` separating `requiredProjectFiles`, `coderAuthorizedFiles`, and `setupManagedFiles`.
- **Status**: `verified`
- **Regression Test:** `comprehensive-remediation.test.ts`
- **Evidence:** Authorized file set retains setup-managed and required project files.

### DISP-31 (C.1): Entry Points Missing from Manifest
- **Report Reference:** `somanycpds.pdf` §9.1, Finding 32; Audit C.1
- **Components:** `src/lib/agents/ruflo/vfs.ts:323`, `src/lib/agents/ruflo/workspace-policy.ts:357-369`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Next.js `src/app/page.tsx` and Vite `src/main.tsx` classified as entry points in manifest.
- **Observed Behavior on Baseline:** `vfs.ts` checked only `index`, `App`, or `server/app.js`, marking Next.js pages as ordinary source files.
- **Resolution:** Added App Router (`page.tsx`, `route.ts`) and Vite (`main.tsx`) to entrypoint classifier.
- **Status**: `verified`
- **Regression Test:** `open-issues-remediation.test.ts`
- **Evidence:** Manifest entryPoints includes App Router and Vite root files.

### DISP-32 (C.2): Parent Directories Missing from Manifest
- **Report Reference:** `somanycpds.pdf` §9.2, Finding 33; Audit C.2
- **Components:** `src/lib/agents/ruflo/vfs.ts:336-341`, `src/lib/agents/ruflo/workspace-policy.ts:337-354`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** All intermediate directory paths (`src`, `src/app`) present in manifest directories list.
- **Observed Behavior on Baseline:** `vfs.ts` only added leaf directory (`path.dirname`), omitting ancestor directories.
- **Resolution:** Iterated ancestor paths recursively when computing manifest directory set.
- **Status**: `verified`
- **Regression Test:** `open-issues-remediation.test.ts`
- **Evidence:** Manifest directories contains all intermediate parent directories.

### DISP-33 (C.3): Blueprint Exports Natural Language AST Check Crash
- **Report Reference:** `somanycpds.pdf` §9.3, Finding 34; Audit C.3
- **Components:** `src/lib/agents/ruflo/contract-executor.ts:135`, `src/lib/agents/ruflo/linter.ts`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** AST export checker filters out English filler words ("component", "interface", "default").
- **Observed Behavior on Baseline:** Checked every token literally, failing on descriptive export summaries.
- **Resolution:** Extracted valid JavaScript identifier tokens and ignored descriptive prose.
- **Status**: `verified`
- **Regression Test:** `open-issues-remediation.test.ts`
- **Evidence:** Blueprint specifying `default Page component` validates exported symbol `Page`.

### DISP-34 (T.1): Deterministic Tester Report Halting Pipeline
- **Report Reference:** `somanycpds.pdf` §10.1, Finding 35; Audit T.1
- **Components:** `src/lib/agents/ruflo/contract-executor.ts:148-163, 304`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Failed verification passes test report artifact to Debugger repair loop.
- **Observed Behavior on Baseline:** Hard exception thrown immediately on `Result: FAIL`.
- **Resolution:** Stage validation accepts `Result: FAIL` as a valid report; coordinator drives repair cycle.
- **Status**: `verified`
- **Regression Test:** `comprehensive-remediation.test.ts`
- **Evidence:** Full Tester FAIL -> Debugger plan -> Coder repair -> Tester PASS cycle verified.

### DISP-35 (DB.1): Debugger Mentioning Spec Files Flagged as Mutation
- **Report Reference:** `somanycpds.pdf` §10.2, Finding 36; Audit DB.1
- **Components:** `src/lib/agents/ruflo/stage-acceptance.ts:322-332`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Debugger report mentioning spec files in prose explanation allowed; only actual mutations guarded.
- **Observed Behavior on Baseline:** Scanned backticks in `Patches Applied`, rejecting reports that referenced spec files.
- **Resolution:** Separated explanatory file citations from actual VFS write authorization boundaries.
- **Status**: `verified`
- **Regression Test:** `comprehensive-remediation.test.ts` & `Debugger.test.ts`
- **Evidence:** Prose citing `blueprint.md` accepted; control-plane file mutations strictly blocked.

### DISP-36 (SC.1): Security Workspace Hash Parser Splitting on Whitespace
- **Report Reference:** `somanycpds.pdf` §11.1, Finding 37; Audit SC.1
- **Components:** `src/lib/agents/ruflo/contracts/schemas/security.ts:17-30`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Extracts 64-character hex hash even if prefixed with bullet `-` or `Hash:`.
- **Observed Behavior on Baseline:** `split(/\s+/)[0]` captured `-` or `Hash:`, failing hash validation.
- **Resolution:** Used regex matching `[a-f0-9]{64}` across section content.
- **Status**: `verified`
- **Regression Test:** `Reviewer-Security.test.ts`
- **Evidence:** Extracts SHA-256 hash formatted as bullet point or tagged with label.

### DISP-37 (RV.1): Reviewer Status Parser Splitting on Hyphen
- **Report Reference:** `somanycpds.pdf` §11.2, Finding 38; Audit RV.1
- **Components:** `src/lib/agents/ruflo/contracts/schemas/reviewer.ts:24-35`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Status bullet `- PASS: All checks passed` parses token as `PASS`.
- **Observed Behavior on Baseline:** `split(/[\s:—\-]+/)` split on leading hyphen, returning `""` instead of `PASS`.
- **Resolution:** Stripped leading list punctuation and bullets before token extraction.
- **Status**: `verified`
- **Regression Test:** `Reviewer-Security.test.ts`
- **Evidence:** Bulleted `- PASS` correctly parsed as valid passing status.

### DISP-38 (SEC-01): Security Scanner Matching eval( in Comments and Strings
- **Report Reference:** `somanycpds.pdf` §12.1, Finding 39; Plan §8
- **Components:** `src/lib/agents/ruflo/security-gate.ts:88-94`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Comments (`// eval(x)`) and string literals (`"eval(x)"`) do not trigger `UNSAFE_EVAL`.
- **Observed Behavior on Baseline:** Raw line regex triggered false positives on comments and strings.
- **Resolution:** Added `stripCommentsFromLine` (with block-comment state) and `stripStringsFromCode`.
- **Status**: `verified`
- **Regression Test:** `comprehensive-remediation.test.ts`
- **Evidence:** Comments and string literals ignored; executable `eval()` and `new Function()` flagged.

### DISP-39 (SEC-02): Security Scanner Matching Safe Parameterized SQL
- **Report Reference:** `somanycpds.pdf` §12.2, Finding 40; Plan §8
- **Components:** `src/lib/agents/ruflo/security-gate.ts:98-104`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Parameterized queries and SQL comments do not trigger `SQL_INJECTION_RISK`.
- **Observed Behavior on Baseline:** Scanned text lines without checking for comment markers or parameterization.
- **Resolution:** Filtered out comments and required dynamic concatenation syntax outside quotes.
- **Status**: `verified`
- **Regression Test:** `comprehensive-remediation.test.ts`
- **Evidence:** Safe queries pass; dynamic `SELECT ... + id` flagged.

### DISP-40 (GATE-01): Final Gate Collection Type Check Bug
- **Report Reference:** `somanycpds.pdf` §13.1, Finding 41; Plan §5
- **Components:** `src/lib/agents/ruflo/final-gate.ts:40`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Collection check uses `.length` or `Array.isArray` on `blueprintFiles` array.
- **Observed Behavior on Baseline:** Evaluated `authorizedFileSet.blueprintFiles.size > 0` on an Array (undefined > 0 is false).
- **Resolution:** Changed to `Array.isArray(authorizedFileSet.blueprintFiles) && authorizedFileSet.blueprintFiles.length > 0`.
- **Status**: `verified`
- **Regression Test:** `comprehensive-remediation.test.ts`
- **Evidence:** Proves collection check evaluates correctly for populated arrays.

### DISP-41 (RUN-01): loadAuthorizedFileSet Missing Pipeline Run Scoping
- **Report Reference:** `somanycpds.pdf` §13.2, Finding 42; Plan §5
- **Components:** `src/lib/agents/ruflo/final-gate.ts:37`, `src/lib/agents/ruflo/workspace-policy.ts`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Authorization and artifact queries scoped strictly to active `pipelineRunId`.
- **Observed Behavior on Baseline:** `pipelineRunId` omitted from lookup, allowing cross-run artifact contamination.
- **Resolution:** Passed `pipelineRunId` through `loadAuthorizedFileSet` and artifact queries.
- **Status**: `verified`
- **Regression Test:** `comprehensive-remediation.test.ts`
- **Evidence:** Multi-run isolation test proves artifact from Run B is rejected when checking Run A.

### DISP-42 (TOOL-01): Tool Mutation Lacking Directory Traversal Protection
- **Report Reference:** `somanycpds.pdf` §13.3; Plan §4 & §18.4
- **Components:** `src/lib/agents/ruflo/toolbox.ts:50-80`
- **Baseline Commit:** `99cfddd3c40b2b9e2b5355bb90f31f713b679c17`
- **Reproduction Status:** `confirmed`
- **Expected Behavior:** Path traversal (`../`), control-plane mutations, and cross-run writes rejected at write boundary.
- **Observed Behavior on Baseline:** Traversal paths not checked at write boundary in toolbox.
- **Resolution:** Enforced `assertAuthorizedToolMutation` path normalization, `../` rejection, and run-scoped artifact queries.
- **Status**: `verified`
- **Regression Test:** `comprehensive-remediation.test.ts`
- **Evidence:** Direct tool mutations with `../` and control plane files strictly rejected.

---

## 3. Disparity Distribution Summary

```
Total Items: 42
├── Infrastructure & Lifecycle (DISP-01 - DISP-05): 5
├── Queen Stage (DISP-06 - DISP-07): 2
├── Planner Stage (DISP-08 - DISP-09): 2
├── Architect Stage (DISP-10 - DISP-20): 11
├── System Stage & Gate (DISP-21 - DISP-25): 5
├── Designer Stage (DISP-26): 1
├── Blueprinter Stage (DISP-27 - DISP-30): 4
├── Coder Stage (DISP-31 - DISP-33): 3
├── Tester & Debugger (DISP-34 - DISP-35): 2
├── Security & Reviewer (DISP-36 - DISP-37): 2
├── Security Scanner Precision (DISP-38 - DISP-39): 2
└── Gate, Run Scoping & Tool Boundary (DISP-40 - DISP-42): 3
```
