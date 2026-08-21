# Architect Quality Gate Approval Solution Specification (`aprcsol.md`)

This document outlines the design and exact code modifications required to restore the **Architect Approval Gate**, ensuring the pipeline pauses after the `Architect` stage to present an interactive approval modal before building downstream specifications and source code.

---

## 1. Architectural Overview

```
[Queen → Planner → Architect] ──(Pause & Prompt User)──> [User Reviews & Clicks Approve] ──> [System → Designer → Blueprinter → Coder → Tester → Security → Reviewer]
```

When `Architect` completes:
1. `orchestrator.ts` checks `qualityGateOverride`. If false, it emits a `QUALITY_GATE_PAUSE` event, sets `conversation.status = 'Paused'`, and halts execution.
2. The UI (`WorkspaceContent.tsx`) renders an **Architecture Approval Modal** displaying `architecture.md` and outlining the exact downstream steps (`System`, `Designer`, `Blueprinter`, `Coder`).
3. Upon clicking **"Approve & Continue"**, `/api/pipeline/resume` updates status to `'Active'` and resumes `runOrchestrator()` starting from stage `'System'`.

---

## 2. Proposed Changes

### **Component 1: Orchestrator Stage Resumption (`src/lib/agents/ruflo/orchestrator.ts`)**

#### A. Add `startStage` Parameter & Quality Gate Check
Modify `runOrchestrator()` to support starting from any stage (e.g. `'System'`) and pausing after `'Architect'`:

```typescript
export async function runOrchestrator(
  conversationId: string,
  userPrompt: string,
  onEvent: PipelineEventCallback,
  signal?: AbortSignal,
  startStage?: string
): Promise<void> {
  ...
  const STAGES = [
    'Queen',
    'Planner',
    'Architect',
    'System',
    'Designer',
    'Blueprinter',
    'Coder',
    'Tester',
    'Debugger',
    'Security',
    'Reviewer',
  ];

  // Slice stages if resuming from a specific stage
  const startIndex = startStage ? STAGES.indexOf(startStage) : 0;
  const executionStages = startIndex >= 0 ? STAGES.slice(startIndex) : STAGES;

  for (const stageName of executionStages) {
    ...
    // Stage Execution
    const stageOutput = await runAgent(...);
    await flushVfsToDisk(conversationId);

    // Architect Quality Gate Pause
    if (stageName === 'Architect' && !conversation.qualityGateOverride) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { status: 'Paused', currentStage: 'Architect' },
      });

      onEvent({
        type: 'QUALITY_GATE_PAUSE',
        agent: 'Architect',
        message: '📐 Architect stage completed. Paused for user review & approval before continuing to System, Designer, Blueprinter, and Coder stages.',
        data: stageOutput.content,
      });

      return; // Exit orchestrator loop, waiting for user resume signal
    }
  }
```

---

### **Component 2: Pipeline Resume Endpoint (`src/app/api/pipeline/resume/route.ts`)**

Update `/api/pipeline/resume` to update DB status and trigger `runOrchestrator()` starting at the next stage (`'System'`):

```typescript
export async function POST(request: NextRequest) {
  const { conversationId } = await request.json();
  ...
  let nextStage = conversation.currentStage;
  if (conversation.currentStage === 'Architect') {
    nextStage = 'System';
  }

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { status: 'Active', currentStage: nextStage },
  });

  // Resume orchestrator asynchronously starting from nextStage
  runOrchestrator(conversationId, userPrompt, eventCallback, undefined, nextStage).catch(console.error);

  return NextResponse.json({ success: true, nextStage });
}
```

---

### **Component 3: Frontend Approval Modal (`src/app/workspace/WorkspaceContent.tsx`)**

When `conversation.status === 'Paused'` and `currentStage === 'Architect'`, render an interactive approval card:

```tsx
{conversationStatus === 'Paused' && currentStage === 'Architect' && (
  <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-6 shadow-2xl space-y-4">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
        <span className="text-indigo-400">📐</span> Architecture Designed & Ready for Review
      </h3>
      <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-2.5 py-1 rounded-full font-bold">
        Awaiting Permission
      </span>
    </div>

    <p className="text-slate-300 text-sm">
      The <strong>Architect Agent</strong> has defined the tech stack, component structure, and backend design. Review <code>architecture.md</code> and approve to proceed with the build sequence.
    </p>

    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs text-slate-400 space-y-1.5 font-mono">
      <div className="text-indigo-400 font-bold">⚡ What is about to happen next:</div>
      <div>1. 🗄️ <strong>System Stage</strong>: Design SQLite schema & API routes (<code>backend_spec.md</code>)</div>
      <div>2. 🎨 <strong>Designer Stage</strong>: Create UI theme & layout (<code>ui_spec.md</code>)</div>
      <div>3. 🗺️ <strong>Blueprinter Stage</strong>: Construct project tree blueprint (<code>blueprint.md</code>)</div>
      <div>4. 💻 <strong>Coder Stage</strong>: Synthesize raw source code files to disk workspace</div>
      <div>5. 🧪 <strong>Tester & Security Stages</strong>: Execute static analysis & security audits</div>
    </div>

    <div className="flex gap-3 pt-2">
      <button
        onClick={handleApproveResume}
        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-sm transition-all shadow-lg flex items-center gap-2"
      >
        <span>🚀 Approve & Build Code</span>
      </button>
    </div>
  </div>
)}
```

---

## 3. Verification Plan

1. **Type Safety**: Run `npx tsc --noEmit` to verify zero compilation errors.
2. **Interactive Quality Gate Test**:
   - Start a pipeline run for a project.
   - Verify pipeline runs `Queen → Planner → Architect` and **pauses** with status `'Paused'`.
   - Verify UI displays the **Architecture Approval Modal** and halts execution.
   - Click **"Approve & Build Code"** and verify pipeline resumes smoothly from `'System'` through `'Reviewer'`.
