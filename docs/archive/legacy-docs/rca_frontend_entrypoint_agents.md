# Root Cause Analysis (RCA): Agent Failure to Mandate Frontend Entry Points (`rca_frontend_entrypoint_agents.md`)

This document provides a deep RCA into why AI agents (`Planner`, `Architect`, `Blueprinter`, `Coder`) fail to explicitly prioritize and output a runnable **Frontend Entry Point** (`index.html` or standalone browser entry) when building web applications.

---

## 1. The Core Paradox

When a user requests a frontend web application (e.g. an e-commerce store, portfolio, or web tool), the generated project often contains CSS (`styles/globals.css`), React/Next.js components (`components/ProductCard.js`), and helper libraries (`lib/prisma.js`), but **lacks a runnable frontend entry point (`index.html`)**.

Without a root `index.html` (or single-page browser entry), opening the workspace in a browser returns a `404 Not Found` or blank page.

---

## 2. Root Cause Analysis (RCA)

### **Root Cause 1: Over-Engineering Framework Boilerplates (Next.js / SSR Hallucination)**
When asked to design full-stack or multi-page applications, the `Architect` LLM defaults to training weights for Next.js Pages Router:
```
project-root/
├── pages/
│   ├── _app.js
│   ├── _document.js
│   ├── index.js
...
```
- **The Flaw**: Next.js Pages Router relies on Next.js server-side routing (`pages/index.js`), completely omitting a static root `index.html`.
- **The Result**: In static preview environments or single-server workspace runners, `index.js` inside `pages/` cannot be opened directly by a browser without a running Next.js compiler server.

### **Root Cause 2: Entry Point Definition is Implicit, Not Explicitly Enforced**
- In `Architect.ts`, the system prompt asks for an `Entry Point` inside the `### Conventions` text bullet:
  ```markdown
  - **Entry Point**: [e.g., "index.html loads script.js"]
  ```
- **The Flaw**: It is treated as an optional text bullet under conventions, rather than a **Mandatory Architectural Contract** enforced at the top of `### Tech Stack` or `### Project Folder Structure`.
- Downstream agents (`Blueprinter` and `Coder`) read the folder tree as a list of files without realizing which file is the **PRIMARY ENTRY POINT** that must be loaded first.

### **Root Cause 3: Blueprinter File Ordering & Token Cutoff**
- When `Architect` generates 20+ Next.js/React component files (`Header.js`, `CartItem.js`, `ProductCard.js`, `Search.js`), the `Blueprinter` outputs file blueprint blocks sequentially.
- If the entry point file (`index.html` or `index.js`) is listed near the bottom of the blueprint, LLM output token limits cut off the response **before the entry point blueprint is written**.
- Consequently, the `Coder` stage never receives the entry point blueprint to synthesize.

---

## 3. Solution & Agent Prompt Enforcement Blueprint

To guarantee that **EVERY frontend request has a clear, guaranteed, runnable entry point**:

### **Fix 1: Explicit "Frontend Entry Point" Contract in `Architect.ts`**
Add a mandatory bullet in `### Tech Stack`:
```markdown
- **Frontend Entry Point**: [EXPLICIT FILE PATH, e.g. "index.html" at project root]
```
Add a strict rule:
> 🚨 **MANDATORY RULE**: Every web application MUST contain a root `index.html` file as its primary browser entry point, even if React/Next.js/Vite is used. The root `index.html` must mount the application DOM.

### **Fix 2: Order Entry Point as File #1 in `Blueprinter.ts`**
Enforce in `Blueprinter.ts`:
> 🚨 **FILE ORDER RULE**: The Frontend Entry Point (`index.html`) MUST ALWAYS be `### File: 1` in the blueprint output list. All styles (`style.css`) and scripts (`script.js` / `main.jsx`) MUST follow it.

### **Fix 3: Deterministic Entry Point Injector in `orchestrator.ts`**
In `orchestrator.ts`, before passing the blueprint to `Coder`:
- Inspect `BlueprintFileSection[]`.
- If no `index.html` or `public/index.html` is found, automatically inject a default `index.html` section into `BlueprintFileSection[]`.

---

## 4. Summary Table

| Issue | Why No Agent Mentioned Entry Point | Fix |
|---|---|---|
| Over-Engineered Next.js Structure | LLM defaulted to SSR `pages/index.js` omitting `index.html` | Mandate root `index.html` regardless of framework |
| Optional Convention Bullet | Entry point was just an unvalidated text bullet in Architect prompt | Elevate Entry Point to a mandatory schema contract |
| Blueprinter Token Truncation | Entry point was placed last in blueprint and cut off | Force Entry Point to be `### File: 1` in blueprint output |
