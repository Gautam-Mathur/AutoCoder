# AutoCoder — Final Goal Document

## 1. What AutoCoder Is

AutoCoder (internal codename **AutoGod**) is a multi-agent autonomous software engine that turns a single natural-language prompt into a complete, working, multi-file web application — without a human writing a line of code in between.

It is built on the **RuFlo Multi-Agent Architecture**: 11 specialized agents (Queen → Planner → Architect → System → Designer → Blueprinter → Coder → Tester → Debugger → Security → Reviewer) running through a deterministic pipeline, backed by a Virtual File System, an in-loop linter with self-healing, dual-tier executive memory, and a live Next.js frontend.

## 2. The Four Non-Negotiable Goals

Everything the project does should be measured against these four outcomes. If a feature doesn't serve one of them, it's scope creep.

### Goal 1 — Full Code via Pipeline
The pipeline must go all the way from prompt to a complete, deployable codebase — not a scaffold, not a partial stub.
- Every stage (spec → architecture → backend → UI → blueprint → code → test → debug → security → review) must run to completion without silent gaps.
- The Blueprinter's file-by-file plan must be fully realized by the Coder — no blueprint file should be left unsynthesized.
- Output must include everything needed to run the app: config, schema, seed data, frontend, backend, and routing — not just isolated snippets.

### Goal 2 — Quality Code, Minimum Time
Speed and correctness are both required — one without the other is a failure.
- **Quality is enforced structurally**, not hoped for: the AST/regex linter, cross-file import checker, DOM coherence validator, Tester, Debugger, Security auditor, and Reviewer all exist to catch defects before a human ever sees the code.
- **Time is protected by design**: the self-healing loop (surgical diffs for ≤3 errors, full rewrites only when necessary), the 400-hour timeout ceiling so long local-model runs never get killed by socket drops, and VRAM model retention (`keep_alive: -1`) so the model never has to reload mid-run.
- The target is a system where "fast" and "correct" stop being a tradeoff — the pipeline should not need a human debugging pass to reach working state.

### Goal 3 — Can Edit Code
Generated code isn't a one-shot artifact; it must be modifiable after the fact, by both the system and the user.
- **Agent-side editing**: `applyDiff()` (surgical line-range edits) and the ReAct toolbox (`read_file`, `write_file`, `apply_diff`, `list_files`) let agents make targeted fixes instead of regenerating whole files.
- **Upstream-edit propagation**: `handleUpstreamModification()` invalidates downstream stages when an upstream spec changes, so edits don't leave stale, inconsistent code behind.
- **Human-side editing**: the Monaco editor in the Workspace lets a user directly view and modify any file in the live VFS, with state restored across sessions.
- The Virtual File System is the single source of truth that keeps agent edits, human edits, and the physical disk copy all in sync.

### Goal 4 — Can Host on Vercel
The final output must be a live, working deployment — not just code sitting in a repo.
- The VFS must support a **complete flush to disk** (`flushVfsToDisk()`) that produces a clean, deployable project directory (`projects/<conversationId>/`).
- Generated projects need to be structured so they're Vercel-compatible out of the box: correct Next.js project conventions, no leftover local-only assumptions (e.g., hardcoded `localhost` Ollama calls in generated app code), and a valid build (`npm run build`) that passes without manual fixes.
- The pipeline should end with a deployable artifact, not just a passing test report — "it works on my machine" is not the finish line.

## 3. How the Pieces Serve the Goals

| System Component | Goal(s) it Serves |
|---|---|
| Orchestrator + 11-agent stage sequence | Full code via pipeline |
| Blueprinter → Coder handoff | Full code via pipeline |
| Linter, Tester, Debugger, Security, Reviewer | Quality code |
| Self-healing diff loop, token budgeter, extended timeout | Minimum time |
| VFS mutex locks, `applyDiff`, ReAct toolbox | Can edit code |
| Executive Memory + upstream invalidation | Can edit code (consistency) |
| Monaco editor in Workspace | Can edit code (human side) |
| `flushVfsToDisk`, clean project directory output | Can host on Vercel |

## 4. Definition of Done

A single AutoCoder run is successful when, from one prompt, it produces:
1. A complete set of specs (requirements, plan, architecture, backend spec, UI spec, blueprint).
2. A fully synthesized, linted, tested, debugged, and security-reviewed codebase — with zero unresolved `REQUIRES_REWORK` flags.
3. A codebase that can be edited — by the agents via diffs, or by the user via the Monaco editor — without breaking downstream consistency.
4. A project directory that builds and deploys cleanly on Vercel with no manual intervention.

Anything short of all four is a partial win, not a finished pipeline.
