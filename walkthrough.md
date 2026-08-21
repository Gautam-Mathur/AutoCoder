# Comprehensive Walkthrough: Page Refresh Persistence & Live Telemetry

This document details the architectural enhancements implemented to ensure background persistence across browser reloads, auto-reattachment of the UI on page refresh, and real-time live telemetry streaming.

---

## 1. Page Refresh Auto-Reconnection & UI State Persistence

- **Problem Solved**: Refreshing the browser page reset the UI to `Provide project details and hit run to compile the specifications.` and did not auto-connect to an active background pipeline.
- **Root Cause**:
  1. `WorkspaceContent.tsx` rendered the static blank prompt message unconditionally on every render.
  2. Auto-reconnect `useEffect` was blocked waiting for client-side `ollamaConnected` status check.
- **Fix Implemented**:
  1. Removed `ollamaConnected` gate for resuming streams on mount. As long as `detailsLoaded` is true and `pipelineStatus` is `Active` or `Paused`, the UI instantly establishes an SSE stream connection (`/api/pipeline/stream?conversationId=...`).
  2. Wrapped static prompt banner with `{logs.length === 0 && (...)}` and updated text dynamically to `"Connected to active compiler loop — receiving live telemetry..."`.
  3. Added `HISTORY_REPLAY` SSE event handling so refreshed tabs instantly populate past execution logs.

---

## 2. Real-Time Live Telemetry Streaming (`onChunk` Integration)

- Integrated live `onChunk` handler into `runAgent()` in `orchestrator.ts`.
- Emits `AGENT_STREAM_PROGRESS` events every 120ms with token count and a rolling window of generated text/markdown.
- Updates the UI Live Telemetry terminal in real-time with live progress bar and token counter (`{tokenCount} / {maxTokens} tokens`).

---

## 3. Browser Reload Decoupling Architecture

- Decoupled `runOrchestrator()` execution from browser request signals using a dedicated internal Node `AbortController` (`pipelineAbortControllers`).
- Added global `pipelineEvents` (`EventEmitter`) for SSE streams.
- Reloading browser tab closes only that tab's SSE connection. `runOrchestrator()` runs uninterrupted in Node.

---

## 4. Verification

- TypeScript compilation verified (`npx tsc --noEmit` ➔ **0 errors**).
- Re-connection stream verified with dynamic status banners and `HISTORY_REPLAY` event listeners.
