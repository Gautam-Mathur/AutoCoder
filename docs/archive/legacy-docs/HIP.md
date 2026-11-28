# AutoCoder: Hardening & Infrastructure Implementation Plan (HIP)

> This plan details the surgical hardening required for the AutoCoder UI and runtime infrastructure.
> Focus: Tab switching resilience, auto-reconnection, page unload protection, log streaming performance, state persistence, error boundaries, and utility convenience features.

---

## 1. Tool Hardening & Convenience Audit

### Category H — Tool Resilience & UX Conveniences

| ID | Component / File | Issue & Root Cause | Impact |
|---|---|---|---|
| **H1** | `WorkspaceContent.tsx:225-234` | **Tab Switching SSE Freeze**: Browsers throttle timers and suspend `EventSource` connections when tabs are backgrounded. Returning to the tab leaves the UI stuck in "Active" with an orphaned SSE connection. | User switches tabs, returns, and sees frozen logs even while background compiler completed. |
| **H2** | `WorkspaceContent.tsx` | **Unintentional Navigation Loss**: No `beforeunload` listener registered when `pipelineStatus === 'Active'`. | Accidental tab close or link click interrupts live stream monitoring without warning. |
| **H3** | `WorkspaceContent.tsx:466-510` | **Missing SSE Auto-Reconnect with Exponential Backoff**: When network drops or server restarts, `EventSource.onerror` logs an error but does not automatically reconnect to `/api/pipeline/stream`. | Temporary network flap permanently disconnects live log updates. |
| **H4** | `WorkspaceContent.tsx:248-251` | **Log Streaming Re-Render Bottleneck**: `logEndRef.current?.scrollIntoView()` fires on every single log line during rapid token generation without batching. | Causes UI lag, high CPU usage, and dropped frames on long runs. |
| **H5** | `AppContext.tsx` & `WorkspaceContent.tsx` | **State Persistence Gaps**: Open workspace tab (`flowchart` \| `code` \| `preview`), expanded directory tree state, and editor font size are lost on browser refresh. | Friction when user reloads the workspace. |
| **H6** | `WorkspaceContent.tsx` | **Missing Utility Features**: No "Download Project ZIP" button, no "Copy File Content" button, and no quick file filter in the file explorer. | Harder for users to export and inspect generated applications. |
| **H7** | `WorkspaceContent.tsx` & `layout.tsx` | **Missing React Error Boundaries**: Render error in Monaco editor or JSON parser crashes the entire application page. | Unhandled render errors crash the workspace tab. |
| **H8** | `TopAppBar.tsx` & `Sidebar.tsx` | **Unclear Visual Pipeline Status**: Pipeline status badge does not clearly reflect background reconnecting / streaming state. | User is unsure if pipeline is still actively compiling. |

---

## 2. Proposed Changes & Surgical Fixes

---

### Round 1 — Core Resilience (Tab Visibility & SSE Auto-Reconnect)

#### H1-1: Add Tab Visibility & Network Online Event Listeners (`visibilitychange` / `online`)
**File**: [WorkspaceContent.tsx](file:///home/lenovo/autogod/src/app/workspace/WorkspaceContent.tsx)

```typescript
// Auto-reconnect SSE stream when tab becomes visible again or network returns online
useEffect(() => {
  const handleVisibilityOrOnline = () => {
    if (document.visibilityState === 'visible' && (pipelineStatus === 'Active' || pipelineStatus === 'Paused')) {
      // Re-establish connection if eventSource is dead or closed
      if (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED) {
        addLog({ type: 'SYSTEM', message: 'Tab active / Network online: Re-connecting to pipeline stream...' });
        connectSSEStream(true);
      }
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityOrOnline);
  window.addEventListener('online', handleVisibilityOrOnline);
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityOrOnline);
    window.removeEventListener('online', handleVisibilityOrOnline);
  };
}, [pipelineStatus, conversationId]);
```

---

#### H1-2: Add `beforeunload` Page Navigation Guard
**File**: [WorkspaceContent.tsx](file:///home/lenovo/autogod/src/app/workspace/WorkspaceContent.tsx)

```typescript
// Prevent accidental tab closure / navigation during active compilation
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (pipelineStatus === 'Active') {
      e.preventDefault();
      e.returnValue = 'Code generation is currently active in the background. Are you sure you want to leave?';
      return e.returnValue;
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [pipelineStatus]);
```

---

#### H1-3: SSE Reconnection with Exponential Backoff
**File**: [WorkspaceContent.tsx](file:///home/lenovo/autogod/src/app/workspace/WorkspaceContent.tsx)

```typescript
const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
const reconnectAttemptsRef = useRef<number>(0);

const connectSSEStream = (isResume = false) => {
  if (!conversationId) return;

  if (eventSourceRef.current) {
    eventSourceRef.current.close();
    eventSourceRef.current = null;
  }

  const url = `/api/pipeline/stream?conversationId=${conversationId}&prompt=${encodeURIComponent(promptText)}`;
  const eventSource = new EventSource(url);
  eventSourceRef.current = eventSource;

  eventSource.onopen = () => {
    reconnectAttemptsRef.current = 0; // Reset backoff on clean connection
  };

  eventSource.onerror = () => {
    eventSource.close();
    eventSourceRef.current = null;

    if (pipelineStatus === 'Active') {
      const delay = Math.min(30000, Math.pow(2, reconnectAttemptsRef.current) * 1000);
      reconnectAttemptsRef.current += 1;
      
      addLog({
        type: 'SYSTEM',
        message: `Connection lost. Auto-reconnecting in ${Math.round(delay / 1000)}s (Attempt ${reconnectAttemptsRef.current})...`
      });

      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(() => {
        connectSSEStream(true);
      }, delay);
    }
  };

  // ... standard event handling ...
};
```

---

### Round 2 — Performance & State Persistence

#### H2-1: Log Updates Batching & Smart Auto-Scroll
**File**: [WorkspaceContent.tsx](file:///home/lenovo/autogod/src/app/workspace/WorkspaceContent.tsx)

- Buffer high-frequency logs and update React state using `requestAnimationFrame` or `setTimeout` throttling (100ms window).
- Only auto-scroll to log bottom if user is already within 100px of log bottom (prevents jumping when user scrolled up to read past logs).

---

#### H2-2: Persistent Workspace Workspace Settings & Active File
**File**: [WorkspaceContent.tsx](file:///home/lenovo/autogod/src/app/workspace/WorkspaceContent.tsx) & [AppContext.tsx](file:///home/lenovo/autogod/src/context/AppContext.tsx)

- Save `activeTab` (`flowchart`, `code`, `preview`), `selectedFile`, and `expandedDirs` state to `localStorage` per `conversationId`.
- Restore last viewed tab and open file on refresh seamlessly.

---

#### H2-3: React Error Boundary Component
**Files**: [NEW] `src/components/ErrorBoundary.tsx` & [layout.tsx](file:///home/lenovo/autogod/src/app/layout.tsx)

- Wrap children with a robust React Error Boundary fallback that renders a clean error box with a "Reload Workspace" button instead of blank screening.

---

### Round 3 — Productivity & Convenience Features

#### H3-1: Project ZIP Download API & UI Action
**Files**: [NEW] `src/app/api/conversations/[id]/download/route.ts` & [WorkspaceContent.tsx](file:///home/lenovo/autogod/src/app/workspace/WorkspaceContent.tsx)

- Add API route `GET /api/conversations/[id]/download` returning a generated `.zip` archive of all project files from VFS / disk workspace.
- Add "Download ZIP" button to workspace toolbar with instant single-click project export.

---

#### H3-2: File Search Filter & Copy Code Button
**File**: [WorkspaceContent.tsx](file:///home/lenovo/autogod/src/app/workspace/WorkspaceContent.tsx)

- Add quick search input above file tree to filter files by filename.
- Add "Copy Code" button above Monaco editor to copy current file contents to clipboard with visual toast feedback.

---

#### H3-3: Enhanced Pipeline Status Visual Indicator
**Files**: [TopAppBar.tsx](file:///home/lenovo/autogod/src/components/TopAppBar.tsx) & [Sidebar.tsx](file:///home/lenovo/autogod/src/components/Sidebar.tsx)

- Add pulsing status badges (Green = Compiling, Yellow = Paused Gate, Blue = Completed, Red = Failed, Amber = Reconnecting).

---

## 3. Verification & Validation Plan

### Automated Checks
- `npx tsc --noEmit`: Ensure 0 type errors across all new components and hooks.
- `npm run build`: Verify Next.js production build succeeds with all dynamic API routes.

### Manual Verification Scenarios
1. **Tab Switch & Backgrounding Test**:
   - Start code generation pipeline.
   - Switch to another browser tab for 2 minutes.
   - Return to workspace tab — verify log stream reconnects and updates without freeze or error.
2. **Page Navigation Warning**:
   - Trigger code generation.
   - Attempt to refresh page or navigate to `/` — verify browser prompt alerts user.
3. **ZIP Download Test**:
   - Click "Download ZIP" — verify `.zip` archive downloads containing all generated project files.
4. **Copy & Filter Test**:
   - Type in file filter input — verify tree filters correctly.
   - Click "Copy Code" — verify clipboard receives full file contents.

---
