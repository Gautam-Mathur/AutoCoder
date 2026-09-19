# Root Cause Analysis (RCA): Network & Compiler Connection Instability (`rca_network_compiler_connection.md`)

This document provides a deep, end-to-end RCA explaining why the system struggled to maintain connections between the **Browser Frontend**, the **Compiler Pipeline Service**, and **Ollama**, along with the architectural solution to achieve 100% connection resilience.

---

## 1. Executive Summary

Connection drops occurred across **3 distinct architectural layers**:
1. **Frontend SSE Stream Layer**: Premature closure of EventSource connections on transient network blips (`eventSource.onerror`).
2. **Compiler-to-Ollama Socket Layer**: TCP socket idle drops during large model (30B parameter) prompt evaluation phases.
3. **Environment & Sandbox Proxy Interception**: `http_proxy` environment variables routing `127.0.0.1:11434` calls through local proxies that rejected direct IP connections.

---

## 2. Deep Root Cause Breakdown

### **Layer 1: Frontend SSE Stream Connection Instability**
- **The Issue**: When the browser connects to `/api/pipeline/stream`, it opens a Server-Sent Events (SSE) stream.
- **The Flaw**: In `WorkspaceContent.tsx`, `eventSource.onerror` was implemented as:
  ```typescript
  eventSource.onerror = () => {
    addLog({ type: 'PIPELINE_ERROR', message: 'Connection to compiler service lost.' });
    setPipelineStatus('Failed');
    eventSource.close();
  };
  ```
- **Why It Failed**: Standard browser `EventSource` triggers `onerror` on momentary network ticks, server hot-reloads (Next.js Fast Refresh), or tab backgrounding. Instantly closing the stream and marking the pipeline as `Failed` killed perfectly healthy compiler runs!

### **Layer 2: Compiler to Ollama Socket Timeouts & Silence**
- **The Issue**: When executing 30B parameter models (`qwen3-coder:30b`), Ollama spends 30–60 seconds evaluating tokens in VRAM **before outputting the first byte**.
- **The Flaw**: Default Node.js `fetch` / `undici` HTTP socket timeouts (or HTTP Keep-Alive timers) interpret 30 seconds of HTTP body silence as a hung TCP connection, closing the socket mid-flight.

### **Layer 3: Local Proxy & Sandbox Interception**
- **The Issue**: In Linux / WSL / sandboxed CLI environments, system environment variables (`HTTP_PROXY`, `http_proxy`) intercept HTTP requests.
- **The Flaw**: Calls to `http://127.0.0.1:11434` were being routed through proxy ports (e.g. `127.0.0.1:37451`), which returned `HTTP 400 Direct IP access is not allowed` or reset the connection.
- `inference.ts` set lowercase `process.env.no_proxy`, but Node.js `fetch` and `undici` require **both uppercase `NO_PROXY` and lowercase `no_proxy`**.

---

## 3. The 3-Part Connection Stability Solution

### **Fix 1: Resilient SSE Reconnection Engine (`WorkspaceContent.tsx`)**
- Replace instant-kill `onerror` with an **Exponential Backoff Auto-Reconnect Loop** (up to 5 retries over 30s).
- Before marking status as `Failed`, query `/api/conversations/[id]` to verify if the pipeline is actually failed or still actively compiling in the background.

### **Fix 2: Keep-Alive Heartbeat & Undici Dispatcher (`inference.ts` & `stream/route.ts`)**
- In `/api/pipeline/stream/route.ts`, send high-frequency `PING` events every 5 seconds to keep the browser SSE channel alive.
- In `inference.ts`, configure an explicit `undici.Agent` dispatcher with extended `headersTimeout: 1800000` (30 mins) and `bodyTimeout: 1800000` (30 mins).

### **Fix 3: Dual `NO_PROXY` Environment Sanitization (`inference.ts`)**
- Enforce both uppercase and lowercase proxy bypass variables at the top of `inference.ts`:
  ```typescript
  process.env.no_proxy = 'localhost,127.0.0.1,::1,127.0.0.1:11434,*';
  process.env.NO_PROXY = process.env.no_proxy;
  ```

---

## 4. Summary Matrix

| Connection Layer | Root Cause | Impact | Solution |
|---|---|---|---|
| Browser ➔ Compiler SSE | `onerror` killed stream on 1s network tickle | "Connection to compiler service lost" error | Auto-reconnect loop + DB status check |
| Compiler ➔ Ollama TCP | 30s VRAM load silence dropped socket | "Operation aborted due to timeout" | 30-min Undici socket dispatcher |
| System Proxy | Proxy intercepted `127.0.0.1` requests | "Direct IP access is not allowed" | Dual `NO_PROXY` + `no_proxy` bypass |
