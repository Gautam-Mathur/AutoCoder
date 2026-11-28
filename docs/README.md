# AutoCoder Canonical Documentation Index

This directory tracks **authoritative** repository documentation. Historical RCA notes, past run audits, and superseded remediation plans have been moved to [`docs/archive/`](./archive/README.md) so implementation decisions always rely on live code contracts rather than stale markdown specs.

## Authoritative Sources of Truth (in Code)
1. **Stage Contracts & Graph**: [`src/lib/agents/ruflo/contracts/`](../src/lib/agents/ruflo/contracts/) (`registry.ts`, `stage-graph.ts`, `versions.ts`, `schemas/`)
2. **Database Schema**: [`prisma/schema.prisma`](../prisma/schema.prisma)
3. **Persistence Boundaries**: [`src/lib/agents/ruflo/vfs.ts`](../src/lib/agents/ruflo/vfs.ts) & [`src/lib/agents/ruflo/artifact-store.ts`](../src/lib/agents/ruflo/artifact-store.ts)
4. **LLM Provider & Health Configuration**: [`src/lib/agents/inference.ts`](../src/lib/agents/inference.ts) & [`src/lib/agents/provider-health.ts`](../src/lib/agents/provider-health.ts)
5. **Active Remediation Inventory (Test-Referenced)**: [`docs/remediation/contract-prompt-disparities.md`](./remediation/contract-prompt-disparities.md)
6. **Runtime & Static Invariant Checks**: `npm run pipeline:check` and `npm test`
