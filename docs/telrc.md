# Root Cause Analysis (RCA): Telemetry Log Error Badge Bug (`telrc.md`)

This document details why every log entry on the Telemetry Dashboard (`http://localhost:3000/telemetry`) is flagged with a red **"ERROR"** badge, and specifies the status string normalization solution.

---

## 1. Problem Statement

On the Telemetry Dashboard (`/telemetry`), every single log row in the **Telemetry Action Log** table displays a red `<XCircle />` **ERROR** badge with a red highlight background, even when the underlying stage completed successfully.

---

## 2. Root Cause Analysis (RCA)

### **The Status String Mismatch**

#### **Orchestrator DB Output (`orchestrator.ts`)**
When stages finish execution, `runAgent()` and stage helpers log records into `prisma.executionHistory` using standard lifecycle status strings:
- `status: 'Completed'` (for successful stage completions)
- `status: 'Started'` (for stage entry markers)
- `status: 'Skipped'` (for non-applicable stages)
- `status: 'Failed'` (for actual runtime errors)

#### **Telemetry Dashboard Evaluator (`page.tsx`)**
In `src/app/telemetry/page.tsx` line 692:
```typescript
const isSuccess = log.status === 'Success';
```

And lines 759-766:
```typescript
<span className={`... ${
  isSuccess
    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
    : 'bg-red-500/10 border-red-500/20 text-red-500'
}`}>
  {isSuccess ? <CheckCircle /> : <XCircle />}
  {isSuccess ? 'Success' : 'Error'}
</span>
```

### **Why Every Log Showed "Error":**
Because `log.status` is saved as `'Completed'` or `'Started'`, evaluating `log.status === 'Success'` returns `false` for **100% of logs**. Consequently:
1. `isSuccess` is ALWAYS `false`.
2. The UI renders the red `<XCircle />` icon and labels every row as `"Error"`.
3. The table row applies a red background tint `bg-red-500/5`.
4. Filtering by "SUCCESS" returns zero results.

---

## 3. Solution Blueprint

### **Fix 1: Normalize `isSuccess` Evaluation in `page.tsx`**

Update `isSuccess` evaluation to recognize all positive lifecycle statuses (`'Success'`, `'Completed'`, `'Started'`, `'Skipped'`):

```typescript
const isSuccess = ['success', 'completed', 'started', 'skipped'].includes((log.status || '').toLowerCase());
const isFailed = ['failed', 'error', 'rejected'].includes((log.status || '').toLowerCase());
```

### **Fix 2: Update Filter Logic in `page.tsx`**

```typescript
if (filter === 'SUCCESS' && !['success', 'completed', 'started', 'skipped'].includes((log.status || '').toLowerCase())) return false;
if (filter === 'FAILED' && !['failed', 'error', 'rejected'].includes((log.status || '').toLowerCase())) return false;
```

### **Fix 3: Context-Aware Badge Labels in UI Table**

Render accurate status badges based on `log.status`:
- `'Completed'` / `'Success'` → 🟢 Green **Completed**
- `'Started'` → 🔵 Blue **Started**
- `'Skipped'` → 🟡 Amber **Skipped**
- `'Failed'` / `'Error'` → 🔴 Red **Failed**

```typescript
<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
  log.status === 'Failed' || log.status === 'Error'
    ? 'bg-red-500/10 border-red-500/20 text-red-500'
    : log.status === 'Started'
    ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
    : log.status === 'Skipped'
    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
}`}>
  {log.status === 'Failed' || log.status === 'Error' ? <XCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
  {log.status}
</span>
```

### **Fix 4: Align Orchestrator Status Writers**

In `orchestrator.ts`, ensure `writeAgentOutput()` and `writeRichTelemetryLog()` consistently set `status: 'Completed'` or `status: 'Success'` for completed stages.

---

## 4. Summary of Impact

| Component | Before Fix | After Fix |
|---|---|---|
| Status Evaluation | `log.status === 'Success'` | Checks `['completed', 'success', 'started', 'skipped']` |
| Table Row Styling | All rows highlighted red | Green/blue for success & lifecycle, red for failures |
| Status Badge | `<XCircle /> Error` on all rows | `<CheckCircle /> Completed` / `Started` / `Failed` |
| Success Filter | 0 items returned | Returns all successful stage executions |
