# Telemetry Dashboard Error Badge Fix — Solution Specification (`soltelrc.md`)

This document outlines the solution and exact code modifications required to fix the status evaluation and badge rendering issue on the Telemetry Dashboard (`http://localhost:3000/telemetry`).

---

## 1. Overview of Fix

To resolve false "ERROR" badges on successful telemetry logs, we normalize the status evaluation logic across the frontend UI (`src/app/telemetry/page.tsx`) and backend database writers (`orchestrator.ts`).

---

## 2. Proposed Changes

### **Component 1: Telemetry Dashboard UI (`src/app/telemetry/page.tsx`)**

#### A. Status Evaluation Normalization (Line 692)
Replace strict `'Success'` equality with a lifecycle status matcher:

```typescript
// BEFORE:
const isSuccess = log.status === 'Success';

// AFTER:
const isSuccess = ['success', 'completed', 'started', 'skipped'].includes((log.status || '').toLowerCase());
const isFailed = ['failed', 'error', 'rejected'].includes((log.status || '').toLowerCase());
```

#### B. Filter Logic Update (Lines 205-206)
Update filter handlers to properly group lifecycle statuses:

```typescript
// BEFORE:
if (filter === 'SUCCESS' && log.status !== 'Success') return false;
if (filter === 'FAILED' && log.status !== 'Failed' && log.status !== 'Retrying') return false;

// AFTER:
if (filter === 'SUCCESS' && !['success', 'completed', 'started', 'skipped'].includes((log.status || '').toLowerCase())) return false;
if (filter === 'FAILED' && !['failed', 'error', 'rejected'].includes((log.status || '').toLowerCase())) return false;
```

#### C. Context-Aware Badge Renderer (Lines 758-767)
Render accurate, color-coded badges matching the specific status:

```typescript
// AFTER:
<td className="p-3">
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
    isFailed
      ? 'bg-red-500/10 border-red-500/20 text-red-500'
      : log.status === 'Started'
      ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
      : log.status === 'Skipped'
      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
  }`}>
    {isFailed ? <XCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
    {log.status || 'Completed'}
  </span>
</td>
```

#### D. Detail Modal Status Indicator (Line 784)

```typescript
// BEFORE:
<span className={`w-2 h-2 rounded-full ${selectedLog.executionMemory?.status === 'Success' ? 'bg-emerald-400' : 'bg-red-500'}`} />

// AFTER:
<span className={`w-2 h-2 rounded-full ${
  ['success', 'completed', 'started', 'skipped'].includes((selectedLog.executionMemory?.status || selectedLog.status || '').toLowerCase())
    ? 'bg-emerald-400'
    : 'bg-red-500'
}`} />
```

---

### **Component 2: Orchestrator Engine (`src/lib/agents/ruflo/orchestrator.ts`)**

Ensure `writeAgentOutput()` and `writeRichTelemetryLog()` set `status: 'Completed'` consistently for finished stages:

```typescript
await writeAgentOutput({
  conversationId,
  agentName,
  stage: agentName,
  schemaVersion: '2.0.0',
  model: config.ollamaModel,
  validatedJson: { content: sanitized },
  executionTime: durationMs,
  tokenUsage: estimatedTokens,
  attempt,
});
```

---

## 3. Verification Plan

1. **Type Safety Check**: Run `npx tsc --noEmit` to verify 0 TypeScript errors.
2. **Dashboard UI Verification**: Launch `npm run dev` and navigate to `http://localhost:3000/telemetry` to verify:
   - Completed stages show 🟢 **Completed** badges.
   - Stage entries show 🔵 **Started** badges.
   - Skipped stages show 🟡 **Skipped** badges.
   - Failed stages show 🔴 **Failed** badges.
   - Clicking **"All Status"**, **"Success"**, and **"Failed"** filters properly categorizes log entries.
