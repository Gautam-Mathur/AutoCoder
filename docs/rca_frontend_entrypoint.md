# Root Cause Analysis (RCA): Missing Frontend Entry Point (`rca_frontend_entrypoint.md`)

This document explains why certain AI-generated web applications lacked a frontend entry point (`index.html`), even though CSS and JavaScript files were generated successfully.

---

## 1. Problem Description

When generating web applications, certain projects would output `style.css`, component files, or logic scripts, but failed to output a root `index.html` (or `public/index.html`). As a result, opening the preview server or workspace rendered a `404 Not Found` or blank page.

---

## 2. Root Cause Analysis (RCA)

### **Cause 1: Blueprinter Token Truncation (Entry Point Listed Last)**
- The `Blueprinter` agent outputs files sequentially as markdown blocks:
  ```markdown
  ### File: style.css
  ...
  ### File: calculator.js
  ...
  ### File: index.html
  ```
- Because LLM max tokens was capped at `2048`, if a project had multiple CSS/JS/utility files, the response ran out of output tokens **before reaching `### File: index.html`**.
- The Coder agent only synthesizes files that were parsed from `parseBlueprintFiles()`. Because `index.html` was truncated at the end of the blueprint, the Coder stage never received `index.html` to generate.

### **Cause 2: Subdirectory Placement Misalignment (`public/index.html` vs Root `index.html`)**
- The `Architect` agent sometimes placed `index.html` inside `public/index.html` or `src/pages/index.html`.
- The preview server and VFS file picker looked specifically for root `index.html`. When placed in nested folders, the root workspace appeared to have no entry point.

### **Cause 3: Missing Mandatory Entry Point Validation Gate**
- Upstream agents (`Architect`, `Blueprinter`) lacked an explicit constraint requiring `index.html` to be **File #1** in the project tree.

---

## 3. How to Fix (Architect & Blueprinter Mandate)

1. **Mandate `index.html` as File #1 in `Blueprinter.ts`**:
   Update `Blueprinter.ts` rules so `index.html` MUST always be the **very first file** in the `### File:` output list. Even if token truncation occurs on secondary files, the main HTML entry point is guaranteed to be generated.

2. **Deterministic Entry Point Guard in `orchestrator.ts`**:
   In `parseBlueprintFiles()`, if no `index.html` or `public/index.html` is found in the blueprint list, automatically inject a default `index.html` section into `BlueprintFileSection[]`.

3. **Subdirectory Normalization**:
   If `public/index.html` is generated, automatically create a root fallback copy in `projects/<id>/index.html`.

---

## 4. Summary Table

| Issue | Root Cause | Solution |
|---|---|---|
| No `index.html` | Blueprinter truncated output before reaching `index.html` | Force `index.html` to be File #1 in Blueprinter order |
| 404 Preview | `index.html` inside `public/` or `src/` | Auto-link/copy root `index.html` entry point |
| Empty Webpage | Missing DOM container elements | Mandate explicit `<div id="app">` & `<script>` linkage |
