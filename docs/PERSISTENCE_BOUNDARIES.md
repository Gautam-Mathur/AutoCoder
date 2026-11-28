# Persistence Boundaries & Source-of-Truth Matrix

To prevent split-brain drift across SQLite, local disk files, configuration JSON, and browser storage, every domain has one authoritative Source of Truth:

| Domain | Authoritative Store | Derived / Cache Stores | Reconciliation Rule |
|---|---|---|---|
| **Workspace Files** | SQLite `VirtualFile` via [`vfs.ts`](../src/lib/agents/ruflo/vfs.ts) | `projects/<conversationId>/` on disk | `writeVirtualFile` / `applyDiff` mirror best-effort; `flushVfsToDisk` enforces fail-closed parity before tests/preview/export; `verifyVfsDiskParity` detects SHA-256 drift. |
| **Accepted Stage Specs & Reports** | SQLite `ArtifactVersion` via [`artifact-store.ts`](../src/lib/agents/ruflo/artifact-store.ts) | Projected `VirtualFile` rows | `ArtifactStore` tracks `projectionStatus` (`PENDING` → `SYNCED` / `FAILED`) and reconciles idempotently. |
| **Pipeline Control & Leases** | SQLite `PipelineRun`, `StageExecution`, `PipelineEvent`, `GateDecision`, `VerificationRun` | In-memory `EventEmitter` (`pipelineEvents`) | Database row state & sequences are authoritative; in-memory emitters only push real-time notifications. |
| **Legacy Telemetry / Per-Stage Tables** | Read-only / telemetry compat (`ExecutionHistory`, `AgentOutput`) | [`persistence.ts`](../src/lib/agents/ruflo/persistence.ts) (`StagePersistence` deprecated, 0 active callers) | Do not add new pipeline dependencies on `StagePersistence` or `*StageOutput` tables. |
| **LLM Settings & Secrets** | `.env` / `.env.local` for secrets; untracked `settings.json` (`0o600`) for runtime routing overrides | None (never committed) | Empty values in `settings.json` never override populated environment variables. |
| **Browser UI Session** | Server `/api/conversations/[id]` | `localStorage` (`activeId`, `activeTitle`) | `localStorage` is UI selection convenience only and must defer to server state. |
