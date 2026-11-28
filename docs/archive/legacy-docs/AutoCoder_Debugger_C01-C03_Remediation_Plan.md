# AutoCoder — Debugger Contract Remediation Plan

**Scope:** C-01, C-02, C-03  
**Source of truth:** `d5d168b18f23298b724d6153a54d7e7662a15501`  
**Objective:** Fully migrate the Debugger from the legacy JSON patch-response model to the current Markdown artifact contract.

## 1. Problem Definition

### C-01 — Debugger contract format mismatch

The active contract registry declares `debug_report.md` but still identifies the format as JSON, while required headings are Markdown. This is internally contradictory.

### C-02 — Debugger prompt/validator mismatch

The current Debugger prompt instructs the LLM to produce a structured patch response, while the current parser expects a Markdown report containing:

```text
### Issues Addressed
### Patches Applied
### Verification
```

The active producer and consumer therefore implement different contracts.

### C-03 — Debugger execution/acceptance mismatch

The executor currently interprets the Debugger response as a legacy patch payload and applies those patches, after which the candidate is passed to Markdown validation.

The target flow is:

```text
Debugger LLM
    ↓
authorized workspace tools
    ↓
workspace repaired
    ↓
verification
    ↓
Markdown report
    ↓
Markdown parser
    ↓
stage acceptance
    ↓
debug_report.md
```

The migration is therefore not merely a parser change. The legacy JSON producer/executor path must be removed.

## 2. Target Contract

The Debugger has one responsibility:

> Repair the authorized project workspace, verify the repairs, and produce a Markdown report describing the work performed.

Accepted artifact:

```text
debug_report.md
```

Accepted structure:

```markdown
### Issues Addressed

...

### Patches Applied

...

### Verification

...
```

The Markdown report is **evidence of the repair**, not an instruction payload for the orchestrator. The actual project workspace is the source of truth for code changes.

## 3. Replacement Debugger Prompt

### File

```text
src/agents/Debugger.ts
```

Replace the current Debugger system prompt with:

```ts
export const systemPrompt = `You are a surgical code repair agent.

You receive source files and diagnostics identifying syntax, type, build, or test failures. Your responsibility is to repair the reported failures with the smallest safe changes possible, verify the repairs, and produce a concise Markdown repair report.

## INPUT

You may receive:

1. Source code files from the authorized project workspace.
2. Diagnostics containing file paths, line numbers, error messages, and relevant test or build failures.
3. Project context required to understand the reported failures.

## WORKFLOW

Follow this sequence:

1. Inspect the reported files and diagnostics.
2. Identify the direct cause of each reported failure.
3. Make the smallest change required to resolve the failure.
4. Preserve existing architecture, exports, function signatures, APIs, and intended behavior.
5. Verify every repair using the available project tools.
6. Re-check the affected files after verification.
7. Produce the final Markdown repair report using the required structure below.

## REPAIR RULES

### Surgical Changes

- Fix only the reported failures.
- Prefer the smallest possible modification.
- Do not refactor unrelated code.
- Do not rewrite functioning code unnecessarily.
- Do not introduce new dependencies unless required to resolve the reported failure.
- Preserve existing public interfaces and function signatures.

### Workspace Safety

- Modify only files within the authorized project workspace.
- Do not modify pipeline control-plane files, contract definitions, prompts, orchestration logic, or other protected infrastructure unless the reported diagnostic explicitly identifies an authorized project file requiring the change.
- Follow the authorization boundaries enforced by the available workspace tools.

### Verification

After making repairs:

- Run the most relevant syntax, typecheck, build, or test verification available.
- Verify that the reported failure is resolved.
- If a repair introduces another failure, correct it before producing the final report.
- Clearly report any remaining failure that could not be resolved.

### Scope Discipline

Every change must have a direct relationship to a reported diagnostic.

If a diagnostic is ambiguous or cannot be safely resolved, leave the affected code unchanged and document the issue in the repair report.

## REQUIRED MARKDOWN OUTPUT

The final response must be a Markdown repair report containing exactly these sections:

### Issues Addressed

Describe each reported issue that was investigated and repaired.

For each issue, include:

- File path
- Relevant diagnostic
- Root cause
- Result

### Patches Applied

Describe every modification made during the repair.

For each modification, include:

- File path
- Area changed
- What was changed
- Why the change was necessary

Keep descriptions concise and technically precise.

### Verification

Document the verification performed after the repairs.

Include:

- Commands or verification methods used
- Results obtained
- Tests, typechecks, builds, or syntax checks that passed
- Any remaining failures or limitations

The report must contain substantive information based on the actual repair and verification performed.

Do not invent diagnostics, patches, test results, or verification results.

## FINAL OUTPUT REQUIREMENTS

The final response must:

- Be Markdown.
- Use the three required ### sections exactly as specified.
- Describe actual workspace changes.
- Describe actual verification results.
- Remain concise and factual.
- Reflect the state of the workspace after the repair is complete.`;
```

Keep the existing tool list unless the implementation audit proves a tool is unnecessary.

## 4. Contract Registry Fix

### File

```text
src/contracts/versions.ts
```

Change the Debugger entry from:

```ts
format: 'json',
```

to:

```ts
format: 'markdown',
```

Keep:

```ts
outputArtifactName: 'debug_report.md',
requiredHeadings: [
  '### Issues Addressed',
  '### Patches Applied',
  '### Verification',
],
```

The active registry, artifact, prompt, parser, and acceptance behavior must all describe the same Markdown contract.

## 5. Debugger Schema Alignment

### File

```text
src/contracts/schemas/debugger.ts
```

Align the schema version with the active contract:

```ts
version: '1.2.0'
```

Keep the Markdown-derived semantic shape:

```ts
export interface DebuggerOutput {
  issuesAddressed: string;
  patchesApplied: string;
  verification: string;
}
```

The parser remains Markdown-based.

## 6. Strengthen the Markdown Parser

### File

```text
src/contracts/schemas/debugger.ts
```

The parser already checks for required and duplicate headings. Add rejection for empty required sections.

Recommended logic:

```ts
const issuesAddressed =
  extractRequiredSection(content, 'Issues Addressed')?.trim() || '';

const patchesApplied =
  extractRequiredSection(content, 'Patches Applied')?.trim() || '';

const verification =
  extractRequiredSection(content, 'Verification')?.trim() || '';

if (!issuesAddressed) {
  errors.push(
    'Debugger Contract Error: Section "### Issues Addressed" cannot be empty.'
  );
}

if (!patchesApplied) {
  errors.push(
    'Debugger Contract Error: Section "### Patches Applied" cannot be empty.'
  );
}

if (!verification) {
  errors.push(
    'Debugger Contract Error: Section "### Verification" cannot be empty.'
  );
}
```

The parser should own structural validation, not attempt to understand every sentence in the report.

## 7. Remove the Legacy JSON Executor Path

### File

```text
src/contract-executor.ts
```

Remove the Debugger-specific response interpretation equivalent to:

```ts
try {
  const parsed = JSON.parse(candidateContent);

  if (parsed && Array.isArray(parsed.patches)) {
    for (const p of parsed.patches) {
      if (p.file && p.startLine && p.endLine && p.replacement !== undefined) {
        await applyAuthorizedDiff({
          conversationId,
          pipelineRunId,
          stageExecutionId: stageExecution.id,
          filePath: p.file,
          startLine: p.startLine,
          endLine: p.endLine,
          newContent: p.replacement,
        });
      }
    }
  }
} catch {
  // Debugger output may be markdown report
}
```

The executor should no longer parse the Debugger candidate as a command payload.

Target behavior:

```text
runAgent()
    ↓
candidateContent
    ↓
validateStageCandidate()
    ↓
persist accepted debug_report.md
```

## 8. Critical Authorization Check

Before removing executor-side patch application, inspect the implementations of:

```text
apply_diff
write_file
```

and confirm that Debugger tool calls enforce the same authorization boundary currently enforced by `applyAuthorizedDiff()`.

Required security boundary:

```text
Debugger
   ↓
workspace tool
   ↓
authorization check
   ↓
authorized project mutation
```

Do not leave the Debugger with unrestricted write access to pipeline control-plane files or contract infrastructure.

If the tools lack the required boundary, implement the authorization bridge first. Only then remove the executor-side legacy patch path.

## 9. Remove Legacy Debugger Types

### File

```text
src/contracts/schemas/debugger.ts
```

Review:

```ts
export interface DebuggerFix {
  filePath: string;
  description: string;
}
```

Search the repository for `DebuggerFix`. Delete it only if it is unused after migration.

## 10. Remove the Legacy JSON Schema

### File

```text
src/agents/Debugger.ts
```

The current agent contains a JSON-oriented schema describing `patches` and `unfixable`.

First determine whether the generic agent runner still consumes `schema`.

If it is unused, delete the Debugger-specific JSON schema.

If the generic runner requires a schema, refactor the runner so Markdown-producing stages are first-class rather than creating a fake JSON schema solely to preserve the legacy system.

## 11. Stage Acceptance

### File

```text
src/stage-acceptance.ts
```

Keep the existing direction:

```ts
import { parseDebuggerOutput } from './contracts/schemas/debugger';
```

The Debugger candidate should be passed through the Markdown parser and acceptance path. Do not reintroduce JSON parsing in stage acceptance.

## 12. Tests

### File

```text
src/prompt-contract-sync.test.ts
```

Keep the existing valid Markdown fixture and add coverage for:

- Valid Markdown report → accepted
- Missing `Issues Addressed` → rejected
- Missing `Patches Applied` → rejected
- Missing `Verification` → rejected
- Duplicate required section → rejected
- Empty required section → rejected
- Realistic multi-file Markdown report → accepted
- Retired patch-style response → not accepted as the current Debugger artifact

## 13. Integration Test

Add an integration test covering:

```text
Debugger invocation
        ↓
workspace mutation
        ↓
verification
        ↓
Markdown report
        ↓
stage validation
        ↓
artifact persistence
```

The test must prove both:

1. The workspace was actually repaired.
2. The resulting Markdown report satisfies the Debugger contract.

This prevents a false positive where a valid report exists but the code was never fixed.

## 14. Repository-Wide Cleanup Search

Search for:

```text
JSON.parse(candidateContent)
parsed.patches
unfixable
DebuggerFix
DEBUGGER_SCHEMA
DebuggerOutput
format: 'json'
debug_report.md
applyAuthorizedDiff
```

Classify every result as:

- Required by current architecture
- Legacy Debugger path
- Shared infrastructure
- Unrelated usage

Do not blindly delete shared patch infrastructure.

## 15. Version Alignment

After migration:

| Layer | Required state |
|---|---|
| Contract registry | 1.2.0 |
| Prompt | 1.2.0 |
| Validator | 1.2.0 |
| Debugger parser/schema | 1.2.0 |
| Acceptance tests | 1.2.0 behavior |
| Artifact | `debug_report.md` |
| Format | Markdown |

No active Debugger component should continue declaring the retired 1.0.0 contract unless it is explicitly historical and unused.

## 16. Final Architecture

### Before

```text
Debugger LLM
    ↓
legacy patch response
    ↓
executor parser
    ↓
applyAuthorizedDiff()
    ↓
workspace mutation
    ↓
Markdown validation
    ↓
debug_report.md
```

### After

```text
Debugger LLM
    ↓
authorized workspace tools
    ↓
workspace mutation
    ↓
verification
    ↓
Markdown report
    ↓
Markdown parser
    ↓
stage acceptance
    ↓
debug_report.md
```

The Debugger's report is evidence of work already performed in the workspace. It is no longer a serialized command payload for another component to execute.

## 17. Implementation Order

### Phase 1 — Authorization

- [ ] Inspect `apply_diff`
- [ ] Inspect `write_file`
- [ ] Confirm Debugger tool mutations are authorized
- [ ] Add authorization enforcement if missing
- [ ] Verify control-plane protection

### Phase 2 — Prompt

- [ ] Replace Debugger prompt
- [ ] Make Markdown the sole output protocol
- [ ] Keep exact required headings
- [ ] Require real verification
- [ ] Require factual reporting

### Phase 3 — Contract

- [ ] Change Debugger format from `json` to `markdown`
- [ ] Align Debugger schema version to `1.2.0`
- [ ] Keep Markdown parser
- [ ] Add empty-section validation

### Phase 4 — Executor

- [ ] Remove `JSON.parse(candidateContent)`
- [ ] Remove `parsed.patches`
- [ ] Remove executor-side Debugger patch application
- [ ] Keep candidate flowing to normal stage validation
- [ ] Confirm workspace mutations occur through authorized tools

### Phase 5 — Legacy Cleanup

- [ ] Remove unused `DebuggerFix`
- [ ] Remove unused Debugger JSON schema
- [ ] Remove obsolete `patches` / `unfixable` dependencies
- [ ] Remove dead imports
- [ ] Remove dead compatibility logic

### Phase 6 — Tests

- [ ] Valid Markdown
- [ ] Missing section
- [ ] Duplicate section
- [ ] Empty section
- [ ] Realistic report
- [ ] Retired response not accepted
- [ ] Workspace mutation integration test
- [ ] Full pipeline regression test

## 18. Definition of Done

C-01, C-02, and C-03 are fixed only when:

- [ ] `CONTRACT_VERSIONS.Debugger.format === 'markdown'`
- [ ] Debugger prompt produces the three required Markdown sections
- [ ] Debugger parser consumes Markdown
- [ ] Debugger validator consumes Markdown
- [ ] Debugger artifact is `debug_report.md`
- [ ] No executor-side JSON parsing remains for Debugger
- [ ] No executor-side `parsed.patches` application remains
- [ ] Debugger workspace mutations go through an authorized tool path
- [ ] Control-plane files remain protected
- [ ] Parser rejects malformed reports
- [ ] Parser rejects empty required sections
- [ ] Integration test proves actual workspace mutation
- [ ] Integration test proves report acceptance
- [ ] Full pipeline regression passes
- [ ] No active Debugger code depends on the retired JSON response contract

## 19. Core Architectural Principle

The migration should **not** become:

```text
Support JSON + Markdown
```

It should become:

```text
Retire legacy Debugger response contract
            ↓
Adopt Markdown Debugger contract
            ↓
Make workspace tools responsible for mutations
            ↓
Make Markdown responsible for repair evidence
```

This removes the fundamental producer/executor/validator contradiction behind C-01, C-02, and C-03.
