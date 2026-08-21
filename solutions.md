# Telemetry System Restoration & Solutions Blueprint

This document details the root causes behind telemetry data loss in the AutoCoder application and specifies the complete implementation to restore telemetry logging across all 11 pipeline stages.

---

## Problem Statement

When users navigate to the `/telemetry` dashboard, the metrics panels display **0 Total Tokens**, **0ms Average Latency**, and empty tool frequency charts, even after a full 11-stage pipeline compilation has executed.

---

## Root Cause Analysis (RCA)

### 1. Missing Database Telemetry Writes in `runAgent()` (`orchestrator.ts`)
* `runAgent()` streams live execution messages (`AGENT_START`, `AGENT_LOG`, `AGENT_COMPLETE`) to the frontend SSE listener via `onEvent()`.
* However, `runAgent()` **does not write telemetry records to the database** (`prisma.executionHistory` or `prisma.agentOutput`).
* Consequently, when `/api/conversations/[id]/telemetry` queries the database for metrics, `prisma.executionHistory` and `prisma.agentOutput` return **0 records**.

### 2. Log Signature Regex Disconnect in `telemetry/route.ts`
The telemetry API route (`/api/conversations/[id]/telemetry/route.ts`) calculates metrics by matching regex patterns against `executionHistory.logs`:
- **Tokens**: `/(?:Estimated tokens:|Tokens generated: ~)\s*(\d+)/i`
- **Latency**: `/in (\d+)ms/i`
- **Stage Start**: `/started \(Attempt|loop started/i`
- **Rich Telemetry**: `{"telemetryType":"rich_step_log", ...}`

The string logs emitted by `runAgent()` in `orchestrator.ts` contained `(Budget: 2048 tokens...)` instead of `"Estimated tokens: 2048"`, causing token parsing to return `0`.

### 3. `writeAgentOutput()` Is Never Invoked
The database helper `writeAgentOutput()` in `src/lib/agents/sml.ts` (which populates `prisma.agentOutput`) is never called inside `orchestrator.ts`, leaving `prisma.agentOutput` permanently empty.

### 4. Uninstrumented Stage Loops (Coder, Tester, Debugger)
- **Coder loop**: Synthesizes multiple source files in a loop, but individual file latency and token usage are never saved to `prisma.executionHistory`.
- **Tester stage**: Executes `runLinter()` on all VFS code files, but never logs test counts to `prisma.executionHistory`.
- **Debugger stage**: Runs SLM triage and targeted file repairs, but skips database logging entirely.

---

## Solution & Implementation Plan

### Step 1: Instrument `runAgent()` in `orchestrator.ts`
Update `runAgent()` to write to both `prisma.executionHistory` and `prisma.agentOutput` at every stage transition:

```typescript
// At Agent Start:
await writeHistoryLog(
  conversationId,
  agentName,
  'Started',
  `Agent ${agentName} started (Attempt ${attempt}/3)... Estimated tokens: ${budget}`
);

// At Agent Completion:
const durationMs = Date.now() - startTime;
const estimatedTokens = Math.round((systemInstructions.length + userContent.length + sanitized.length) / 4);

await writeRichTelemetryLog({
  conversationId,
  agentName,
  status: 'Completed',
  richLog: {
    telemetryType: 'rich_step_log',
    executionMemory: { stage: agentName },
    orchestration: { durationMs },
    inflow: { systemInstructions, userContent },
    thought: sanitized,
    model: config.ollamaModel,
    budget,
    timeoutMs,
  },
});

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

await writeHistoryLog(
  conversationId,
  agentName,
  'Completed',
  `Agent ${agentName} completed in ${durationMs}ms (${sanitized.length} bytes generated). Estimated tokens: ${estimatedTokens}`
);
```

---

### Step 2: Instrument Special Stage Loops

#### Coder Loop Telemetry
For each synthesized file in the Coder stage:
```typescript
const durationMs = Date.now() - fileStartTime;
const estTokens = Math.round((coderPrompt.length + coderOutput.content.length) / 4);

await writeHistoryLog(
  conversationId,
  'Coder',
  'Completed',
  `File ${fileSec.file} synthesized in ${durationMs}ms (${coderOutput.content.length} bytes). Estimated tokens: ${estTokens}`
);
```

#### Tester Stage Telemetry
```typescript
await writeHistoryLog(
  conversationId,
  'Tester',
  failed === 0 ? 'Completed' : 'Failed',
  `Tester completed in ${Date.now() - startTime}ms: ${passed} passed, ${failed} failed. Estimated tokens: 0`
);
```

#### Debugger Stage Telemetry
```typescript
await writeHistoryLog(
  conversationId,
  'Debugger',
  triage.action === 'RETRY' ? 'Completed' : 'Skipped',
  `Debugger ${triage.action}: ${triage.reason}. Estimated tokens: 100`
);
```

---

### Step 3: Verify Telemetry Pipeline

1. **Type Safety Check**: Run `npx tsc --noEmit` to ensure zero compilation errors.
2. **Database Record Verification**: Execute a test run and query `prisma.executionHistory` and `prisma.agentOutput` to verify record creation.
3. **API Endpoint Response Verification**: Fetch `/api/conversations/[id]/telemetry` and confirm non-zero `totalTokens`, `avgLatency`, and populated `tokenUsage`/`toolFrequency` arrays.

---

## Summary of Impact

| Component | Before Fix | After Fix |
|---|---|---|
| `prisma.executionHistory` | 0 rows logged | Logged at start & completion for every stage |
| `prisma.agentOutput` | 0 rows logged | Populated with stage outputs, latency, and tokens |
| Telemetry API (`/api/.../telemetry`) | Returns 0s across all metrics | Calculates exact tokens, latency history, and frequency |
| `/telemetry` Dashboard | Empty graphs & zero counts | Real-time graphs for tokens, latency, and tool usage |
