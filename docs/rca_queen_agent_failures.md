# Root Cause Analysis (RCA): Agent Failure & Retry Loops (`rca_queen_agent_failures.md`)

This document details the root causes of agent execution failures (specifically the `Queen` stage failing over and over), how failure detection operates, and how we resolve them.

---

## 1. Why Do Agents Fail? (4 Primary Root Causes)

### **Cause 1: Local Ollama Inference Timeouts (120s Limit)**
- Local LLMs (e.g. `qwen2.5-coder:14b`, `deepseek-r1:14b`) running on consumer GPUs or CPUs can take >120 seconds to generate complex responses.
- `inference.ts` enforces a strict `120,000ms` (2-minute) HTTP timeout.
- When an inference request exceeds 120s, Node.js aborts the request, triggering a failure in `runInference()`.

### **Cause 2: Strict Header Validation (`EXPECTED_FIRST_HEADERS['Queen']`)**
- The `Queen` stage requires its output to start with `### Context Snapshot`.
- If the LLM produces conversational preamble (e.g., *"Certainly! Here is your specification:"*), single-hash titles (`# Context Snapshot`), or skips the header, `sanitizeStageOutput()` attempts fuzzy repair.
- If the LLM omits the `Context Snapshot` header entirely, downstream agents fail to extract required context, triggering a validation failure.

### **Cause 3: Small Token Budget (1024 Max Tokens in `Queen.ts`)**
- `Queen.ts` had a max token cap of `1024` tokens.
- For detailed user prompts, 1024 tokens was sometimes exhausted mid-generation, cutting off the output before `### MVP Scope - Included` or `### Technical Constraints` could be written.
- The incomplete output failed JSON/markdown schema parsing.

### **Cause 4: Concurrent Active Pipeline Locks (`activePipelines`)**
- If a user quickly submits multiple requests or refreshes the UI while a pipeline run is active, `runOrchestrator()` blocks execution to prevent race conditions.

---

## 2. Do We Check Agent Failures? (Yes — The 3-Tier Verification Engine)

1. **Header & Section Validator**: Checks that mandatory headers (`### Context Snapshot`, `### Project Name`) are present before writing to Virtual File System (VFS).
2. **Automatic Retry Loop (Up to 3 Attempts)**: If `Attempt 1` fails, `runAgent()` catches the error, appends a `Retry Repair Hint` detailing the exact error to the system prompt, and executes `Attempt 2`.
3. **Telemetry & Execution History Logging**: Every success, timeout, or format failure is logged to SQLite (`ExecutionHistory` table) and rendered live in the Telemetry tab (`http://localhost:3000/telemetry`).

---

## 3. How We Fix Queen & Agent Failures

1. **Increase Token Cap in `Queen.ts`**:
   Increase `maxTokens` in `Queen.ts` from `1024` to `2048` tokens so long prompts never truncate.

2. **Fuzzy Preamble & Header Stripping**:
   Enhance `sanitizeStageOutput()` so that if `Context Snapshot` appears anywhere in the first 500 characters, it automatically normalizes it to `### Context Snapshot`.

3. **Dynamic Timeout Scaling**:
   Scale `timeoutMs` dynamically based on model size (up to `180,000ms` / 3 minutes for local Ollama runs).

---

## 4. Summary Table

| Failure Symptom | Root Cause | Fix |
|---|---|---|
| Timeout Error (120s) | Ollama model generation stall | Dynamic timeout scaling (180s) |
| Format / Header Error | Missing `### Context Snapshot` | Fuzzy preamble stripping in `sanitizeStageOutput` |
| Truncated Specification | `maxTokens` set too low (1024) | Increase `Queen.ts` token cap to 2048 |
| Continuous Retries (1/3, 2/3, 3/3) | System prompt missing retry hint context | Enhanced `Retry Repair Hint` injection |
