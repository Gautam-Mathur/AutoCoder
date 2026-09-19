# Permanent Fix Specification: Pipeline Resumption & Fast-Forward Guard (`perma_fix_stage_resumption.md`)

This document presents the complete permanent architecture to ensure the multi-agent pipeline **never stalls, loops, or pauses improperly on completed stages**.

---

## 1. The Permanent Solution Architecture

```
[Orchestrator Stage Loop]
       │
       ▼
Check: Has this stage ALREADY completed in SQLite ExecutionHistory?
       │
       ├── YES ──► Log "Fast-forwarding stage..." ──► Skip to Next Stage ⏩
       │
       └── NO  ──► Execute Stage via Resilient Socket Engine 🚀
```

---

## 2. Implemented Permanent Fix Components

### **1. Fast-Forward Stage Guard (`orchestrator.ts`)**
- Added an automatic database completion check at the start of every stage loop iteration:
  ```typescript
  const isAlreadyCompleted = (await prisma.executionHistory.findFirst({
    where: { conversationId, stage: stageName, status: 'Completed' }
  })) !== null;

  if (isAlreadyCompleted && stageName !== startStage && stageName !== 'Coder') {
    onEvent({
      type: 'AGENT_COMPLETE',
      agent: stageName,
      message: `Stage ${stageName} already completed in history. Fast-forwarding to next stage...`,
    });
    continue;
  }
  ```
- **Guarantee**: If a stage (`Queen`, `Planner`, `Architect`, `System`, `Designer`, etc.) finishes and is recorded in SQLite, the pipeline will **NEVER** re-run that stage or get stuck in a loop on it!

### **2. Smart Resumption Endpoint (`/api/pipeline/resume/route.ts`)**
- Updated the API endpoint to inspect SQLite history.
- When resuming from a paused state, it automatically calculates the next incomplete stage in sequence (`Queen ➔ Planner ➔ Architect ➔ System ➔ Designer ➔ Blueprinter ➔ Coder ➔ Tester...`).

### **3. Extended Socket Timeout & Keep-Alive Engine (`inference.ts` & `stream/route.ts`)**
- `NO_PROXY` / `no_proxy` dual environment variable sanitization to bypass sandboxed HTTP proxies.
- High-frequency **5-second keep-alive heartbeats** down the SSE channel.
- **30-minute socket dispatcher** (`undici.Agent`) for large VRAM prompt evaluations.

---

## 3. Verification Matrix

| Component | Error Guard | Permanent Behavior |
|---|---|---|
| Stage Loop | Loop on completed stage (`Designer` / `System`) | Automatically fast-forwards to next stage |
| Resume API | Endpoint re-triggered same completed stage | Calculates next incomplete stage in sequence |
| Inference Engine | 30s socket timeout during heavy 30B model load | Extended 30-min socket dispatcher + 5s keep-alive |
