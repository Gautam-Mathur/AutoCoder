# Solutions Specification: Resilient Network & Compiler Connection Engine (`sol_network_connection.md`)

This document presents the complete technical specification to achieve 100% network resilience between the **Browser Frontend**, **Compiler Pipeline**, and **Ollama**.

---

## 1. Solution Overview

```
[Browser Frontend (WorkspaceContent.tsx)]
       │  ▲
       │  │ (Auto-Reconnecting SSE Stream + 5s Ping Heartbeat)
       ▼  │
[Next.js API Stream (/api/pipeline/stream)]
       │  ▲
       │  │ (30-Minute Undici Socket Dispatcher)
       ▼  │
[Ollama Local LLM (127.0.0.1:11434 via Dual NO_PROXY)]
```

---

## 2. Technical Implementation Specifications

### **Fix 1: Resilient SSE Auto-Reconnection & Status Verification**
**File**: `src/app/workspace/WorkspaceContent.tsx`

Replace the instant-kill `onerror` handler with an auto-reconnection algorithm:
- When SSE drops, `eventSource.onerror` increments `reconnectAttempts`.
- Rather than marking status as `Failed`, it queries `/api/conversations/[id]` to check if the pipeline is actively running in SQLite.
- If status is `Active` or `Paused`, it automatically re-establishes the SSE stream (`EventSource`) with exponential backoff (1s, 2s, 4s, 8s).

### **Fix 2: High-Frequency Keep-Alive Pings (5-Second Interval)**
**File**: `src/app/api/pipeline/stream/route.ts`

- Update `pingInterval` from 15 seconds to **5 seconds**:
  ```typescript
  const pingInterval = setInterval(() => {
    sendEvent({ type: 'PING', message: 'keep-alive' });
  }, 5000);
  ```
- Guarantees that proxies, firewalls, and browser idle socket timers never close the connection during long compilation steps.

### **Fix 3: Dual `NO_PROXY` & Undici Long-Timeout Socket Dispatcher**
**File**: `src/lib/agents/inference.ts`

- Enforce both uppercase and lowercase `NO_PROXY` environment variables at module initialization:
  ```typescript
  const noProxyVal = 'localhost,127.0.0.1,::1,127.0.0.1:11434,*';
  process.env.no_proxy = process.env.no_proxy ? `${process.env.no_proxy},${noProxyVal}` : noProxyVal;
  process.env.NO_PROXY = process.env.no_proxy;
  ```
- Configure global `undiciAgent` dispatcher with 30-minute idle socket timeouts:
  ```typescript
  const longTimeoutDispatcher = globalForAgent.ollamaAgent ?? (undiciAgent ? new undiciAgent({
    headersTimeout: 1800000,
    bodyTimeout: 1800000,
    keepAliveTimeout: 1800000,
  }) : null);
  ```

---

## 3. Verification Plan

1. **Type Safety Check**:
   Run `npx tsc --noEmit` to verify 0 compilation errors.

2. **Integration Verification**:
   Test inference calls and verified SSE ping events under 5-second frequency.
