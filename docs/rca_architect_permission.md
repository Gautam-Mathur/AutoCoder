# Root Cause Analysis (RCA): Architect Quality Gate Approval Bypass

This document details why the `Architect` stage stopped pausing to request user permission and explain what is about to happen before continuing the pipeline.

---

## 1. Problem Statement

Previously, after the `Architect` stage finished generating the technology stack, project folder tree, and module breakdown, the pipeline would pause execution and prompt the user for explicit approval, presenting a summary of downstream stages before proceeding. 

Currently, the pipeline runs straight through `Architect` into `System`, `Designer`, `Blueprinter`, and `Coder` without pausing or requesting permission.

---

## 2. Root Cause Analysis (RCA)

### **Cause 1: Conversion to Automated Single-Pass Stage Loop**
During the Hybrid v2 architecture refactoring, `runOrchestrator()` in `src/lib/agents/ruflo/orchestrator.ts` was updated to iterate through all 11 stages (`Queen → Planner → Architect → System → Designer → Blueprinter → Coder → Tester → Debugger → Security → Reviewer`) inside a single continuous `for (const stageName of STAGES)` loop:

```typescript
// Current orchestrator loop in orchestrator.ts:
const STAGES = ['Queen', 'Planner', 'Architect', 'System', 'Designer', 'Blueprinter', 'Coder', ...];

for (const stageName of STAGES) {
  // Executes stage, writes .md output to VFS, and immediately moves to next stage
}
```

### **Cause 2: Removal of the Quality Gate Pause Check after Architect**
In legacy versions, the orchestrator contained an explicit **Quality Gate Check** right after `Architect`:
1. It set `conversation.status = 'Paused'`.
2. It emitted a `QUALITY_GATE_PAUSE` event to the frontend UI.
3. It waited for the user to review the architecture and click **Approve & Resume** (triggering `/api/pipeline/resume`).

During the refactoring, this conditional pause check was omitted, causing the orchestrator to advance immediately into `System` and `Designer`.

### **Cause 3: Disconnected Resume Endpoint (`/api/pipeline/resume`)**
The resume API route (`src/app/api/pipeline/resume/route.ts`) still contains legacy code designed to handle this exact transition:

```typescript
// In src/app/api/pipeline/resume/route.ts:
let nextStage = conversation.currentStage;
if (conversation.currentStage === 'Architect') {
  nextStage = 'System';
}
```

Because `orchestrator.ts` no longer sets `conversation.status = 'Paused'` after `Architect`, this endpoint is never triggered.

---

## 3. How to Restore the Architect Permission Gate

To restore the behavior where Architect pauses, summarizes downstream actions, and requests user approval before proceeding:

1. **Insert Quality Gate Pause in `orchestrator.ts`**:
   After the `Architect` stage completes:
   - Emit a `QUALITY_GATE_PROMPT` event with a summary of the next stages (`System`, `Designer`, `Blueprinter`, `Coder`).
   - Update `conversation.status = 'Paused'` and `conversation.currentStage = 'Architect'`.
   - Remove `conversationId` from `activePipelines` and exit `runOrchestrator()`.

2. **Connect Frontend Approval Modal**:
   - In `WorkspaceContent.tsx`, when `QUALITY_GATE_PROMPT` is received or `status === 'Paused'` and `currentStage === 'Architect'`, show the **Architecture Approval Modal**.
   - User clicks **"Approve Architecture & Build"** → calls `/api/pipeline/resume` → resumes `runOrchestrator()` starting at stage `'System'`.

---

## 4. Summary

| Aspect | Legacy / Intended Behavior | Current Hybrid v2 Behavior |
|---|---|---|
| Architect Stage Output | Generated architecture document | Generated `architecture.md` to VFS |
| Quality Gate | Paused pipeline, requested user permission | Skips pause, executes all downstream stages automatically |
| User Control | User approved architecture before code generation | Unattended automated execution |
