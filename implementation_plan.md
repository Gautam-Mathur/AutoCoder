# Frontend Entry Point, Category Awareness & Import Validation Engine

This implementation plan details the end-to-end solution to guarantee that:
1. **Every web application has a valid, runnable entry point (`index.html`)** generated as **File #1** without token cutoffs.
2. **CLI scripts and backend services** (`main.py`, `server.js`) are built without unnecessary HTML files.
3. **All imports, script links, and CSS references** across generated files are automatically validated and verified.

---

## User Review Required

> [!IMPORTANT]
> For any Web Application request, `index.html` is mandated as **File #1** in the `Architect` and `Blueprinter` stages, ensuring it is synthesized first with full DOM structure, `<link rel="stylesheet">`, and `<script defer>` tags referencing downstream assets.

> [!NOTE]
> CLI scripts (`.py`, `.js` terminal utilities) and pure backend API services will be categorized as `Frontend: None`, outputting `main.py` or `server.js` as File #1 without generating `index.html`.

---

## Proposed Changes

### 1. Architect System Prompt Update

#### [MODIFY] [Architect.ts](file:///home/lenovo/autogod/src/lib/agents/ruflo/registry/Architect.ts)
- Add explicit `- **Frontend Entry Point**: [file path, e.g., "index.html" for web apps, or "main.js" for scripts]` in `### Tech Stack`.
- Add mandatory rule: *For web applications, `index.html` MUST be listed as the FIRST file in `### Project Folder Structure`.*

---

### 2. Blueprinter File Order Enforcement

#### [MODIFY] [Blueprinter.ts](file:///home/lenovo/autogod/src/lib/agents/ruflo/registry/Blueprinter.ts)
- Enforce rule: *For web apps, `### File: index.html` MUST be the VERY FIRST file section in the blueprint list so it is never truncated by token limits.*

---

### 3. Orchestrator Entry Point Guard & Import Link Verifier

#### [MODIFY] [orchestrator.ts](file:///home/lenovo/autogod/src/lib/agents/ruflo/orchestrator.ts)
- In `parseBlueprintFiles()`:
  - Detect if project is a web app (contains frontend assets or web prompt).
  - If no `index.html` is present in `BlueprintFileSection[]`, automatically inject a default `index.html` entry section at the top of the Coder queue.
- In `runLinter()` & `Tester` stage:
  - Add link verification check: verify that all `<link href="...">` and `<script src="...">` tags in `index.html` correspond to actual generated files in VFS/disk.
  - Automatically flag missing or broken import references for the `Debugger` stage to self-heal.

---

## Verification Plan

### Automated Type Safety Check
- Run `npx tsc --noEmit` to verify 0 compilation errors.

### Entry Point & Import Verification Test Script
- Create `scratch/test_entrypoint_imports.ts`:
  1. Test web app blueprint missing `index.html` → verify orchestrator injects `index.html` as File #1.
  2. Test script/CSS linkages in `index.html` → verify linter checks and passes when linked assets exist.
