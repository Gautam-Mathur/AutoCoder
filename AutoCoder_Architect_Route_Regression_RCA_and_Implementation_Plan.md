# AutoCoder Architect Route Regression RCA & Implementation Plan

## 1. Executive Summary

### Observed regression

The Architect stage still produces:

``` text
Backend Entry Point: src/app/api/[...]/route.ts
```

even though the Architect system prompt explicitly says:

``` text
- [id] is a named dynamic segment.
- [...slug] is a named catch-all segment.
- [[...slug]] is a named optional catch-all segment.
- NEVER emit unnamed dynamic segments such as [...], [[]], or [...]/route.ts.
```

The current implementation therefore has a **validation placement
failure**, not merely a prompt-quality failure.

The repository now contains `validateArchitectureArtifact()`, and it
correctly knows that `[...]` is invalid. However, the function is
invoked inside the **Blueprinter** stage, after the Architect output has
already been accepted, written to VFS, emitted to the UI, and used as
the basis for the Architect quality-gate pause.

The practical result is:

``` text
Architect LLM
    ↓
sanitizeStageOutput()
    ↓
write architecture.md
    ↓
emit ARCHITECT COMPLETE / QUALITY_GATE_PAUSE
    ↓
user sees invalid architecture
    ↓
only later, on Resume, Blueprinter calls validateArchitectureArtifact()
```

So the system has learned how to detect the disease, but waits until the
patient has been discharged.

------------------------------------------------------------------------

# 2. Evidence From Current Code

## 2.1 Architect prompt already contains the correct rule

`src/lib/agents/ruflo/registry/Architect.ts` contains:

``` text
NEXT.JS ROUTE SEGMENT RULE:
- [id] is a named dynamic segment.
- [...slug] is a named catch-all segment.
- [[...slug]] is a named optional catch-all segment.
- NEVER emit unnamed dynamic segments such as [...], [[]], or [...]/route.ts.
```

Therefore the primary problem is no longer absence of instruction.

The LLM is still allowed to violate the rule because the pipeline does
not synchronously reject the artifact at the point where the Architect
output is accepted.

------------------------------------------------------------------------

## 2.2 The validator exists

`src/lib/agents/ruflo/spec-contract.ts` now exposes:

``` ts
export function validateArchitectureArtifact(
  architectureContent: string,
  contract?: ProjectContract
): ArchitectureValidationResult
```

It validates, among other things:

-   folder-tree/module ownership consistency
-   duplicate ownership
-   orphan module files
-   unclaimed tree files
-   malformed Next.js dynamic route segments

The regression test also explicitly verifies:

``` ts
const valUnnamedRoute = validateArchitectureArtifact(archUnnamedRoute);

assert.strictEqual(
  valUnnamedRoute.valid,
  false,
  'Expected unnamed dynamic catch-all segment [...] to be rejected'
);
```

Therefore the validator itself is already capable of detecting the exact
failure.

------------------------------------------------------------------------

## 2.3 The validator is called too late

The current search of the repository shows
`validateArchitectureArtifact()` is used in `orchestrator.ts` from the
**Blueprinter** stage.

The relevant flow is effectively:

``` ts
const specContents = ...
const specContract = extractProjectContract(specContents);

const archContent = specContents['architecture.md'] || '';

const archVal = validateArchitectureArtifact(
  archContent,
  specContract
);

if (!archVal.valid) {
  throw ...
}
```

This is inside Blueprinter processing.

It is not part of the Architect stage's acceptance path.

------------------------------------------------------------------------

## 2.4 Architect output is persisted before the gate

The orchestrator currently executes the generic stage flow:

``` ts
const stageOutput = await runAgent(
  conversationId,
  stageName,
  userPrompt,
  emit,
  ledger,
  1,
  extraContext,
  executionSignal
);

emit({
  type: 'AGENT_COMPLETE',
  agent: stageName,
  message: `Stage ${stageName} completed successfully.`,
  data: stageOutput.content,
});

await flushVfsToDisk(conversationId);

if (stageName === 'Architect' && !conversation.qualityGateOverride) {
  ...
  emit({
    type: 'QUALITY_GATE_PAUSE',
    agent: 'Architect',
    ...
    data: stageOutput.content,
  });

  return;
}
```

This means the Architect artifact can reach:

1.  `runAgent()`
2.  `AGENT_COMPLETE`
3.  VFS flush
4.  `QUALITY_GATE_PAUSE`

without passing the new architecture validator.

That is the direct reason the bad route remains visible.

------------------------------------------------------------------------

# 3. Root Cause

## Root Cause A: Validation was implemented at the wrong pipeline boundary

### Severity: P0

The architecture artifact is an Architect-owned contract.

Therefore:

> Architect output must be validated before Architect completion is
> emitted or the Architect quality gate is paused.

Current ownership is:

``` text
Architect generates architecture.md
Blueprinter later validates architecture.md
```

Correct ownership must be:

``` text
Architect generates architecture.md
Architect validates architecture.md
Architect either:
  ├── rejects/repairs it
  └── commits it as accepted
```

The Blueprinter validator should remain as a downstream defense-in-depth
check, but it must not be the first hard gate.

------------------------------------------------------------------------

# 4. Root Cause B: `Backend Entry Point` is not actually part of the architecture contract

### Severity: P0

The Architect prompt requires:

``` text
- **Backend Entry Point**: [file path]
```

But `extractProjectContract()` currently extracts `entryPoints`
primarily from:

``` text
Frontend Entry Point
```

For Next.js App Router:

``` ts
if (framework === 'NEXT_APP_ROUTER') {
  if (explicitFrontendEntry) {
    entryPoints.push(explicitFrontendEntry);
  } else if (...) {
    entryPoints.push('src/app/page.tsx');
  }
}
```

The contract therefore has no first-class representation for:

``` text
Backend Entry Point
```

This creates an architectural blind spot.

The system can validate the frontend canonical entry while treating a
malformed backend entry as ordinary prose.

### Required change

Extend the contract with explicit backend entry information.

Recommended shape:

``` ts
interface ProjectContract {
  ...
  entryPoints: string[];
  backendEntryPoints?: string[];
  ...
}
```

For Next App Router, the backend entry should be represented as a route
handler or backend boundary, not as an arbitrary path.

However, do not assume that a Next.js application has one global backend
entry point. App Router API routes are distributed route handlers.

A better representation is:

``` ts
backendEntryPoints?: string[];
```

Examples:

``` text
src/app/api/products/route.ts
src/app/api/checkout/route.ts
```

For a catch-all route:

``` text
src/app/api/[...slug]/route.ts
```

is syntactically valid.

But:

``` text
src/app/api/[...]/route.ts
```

is never valid.

------------------------------------------------------------------------

# 5. Root Cause C: The prompt asks for a single Backend Entry Point even when Next.js uses distributed route handlers

### Severity: P1

The current architecture schema encourages:

``` text
Backend Entry Point: src/app/api/[...slug]/route.ts
```

This is already a weak abstraction for Next.js App Router.

Next.js App Router does not require a single backend entry point.

It uses route handlers under:

``` text
src/app/api/**/route.ts
```

Therefore the Architect prompt should distinguish:

### Traditional backend

``` text
Backend Entry Point: server/index.ts
```

### Next.js App Router

``` text
Backend Entry Points:
- src/app/api/products/route.ts
- src/app/api/checkout/route.ts
```

or, if the application genuinely uses one catch-all handler:

``` text
Backend Entry Points:
- src/app/api/[...slug]/route.ts
```

The prompt should not force a singular "Backend Entry Point" abstraction
onto a framework that does not naturally have one.

------------------------------------------------------------------------

# 6. Root Cause D: The current dynamic-segment validation is artifact-level, not acceptance-level

### Severity: P0

The code already contains the right validation concept:

``` text
[id]
[...slug]
[[...slug]]
```

and rejects:

``` text
[...]
[[]]
```

But validation only becomes operationally meaningful if it is executed
before the artifact crosses the Architect acceptance boundary.

The correct invariant is:

``` text
Invalid architecture.md
    => Architect stage fails
    => architecture.md is not accepted as canonical output
    => downstream stages do not consume it
```

The current invariant is:

``` text
Invalid architecture.md
    => Architect succeeds
    => downstream pause occurs
    => later stage may detect it
```

That is too late.

------------------------------------------------------------------------

# 7. Root Cause E: No Architect-specific repair/retry loop

### Severity: P1

The system currently has deterministic validation, but no deterministic
feedback loop for Architect output.

For an LLM-generated artifact, the preferred flow should be:

``` text
Generate
  ↓
Sanitize
  ↓
Validate
  ↓
valid? ── yes ──> persist + complete
  │
  no
  ↓
Construct validation feedback
  ↓
Retry Architect with bounded attempt count
  ↓
Validate again
  ↓
still invalid?
  ↓
hard failure / pause
```

A bounded retry count of 2 or 3 is sufficient.

Do not create an infinite "please fix yourself" loop. Humanity has
already invented those.

------------------------------------------------------------------------

# 8. Root Cause F: Sanitization does not perform semantic route repair

### Severity: P1

`sanitizeStageOutput()` currently handles:

-   outer code fences
-   expected heading anchoring

It does not perform semantic architecture normalization.

That is correct behavior in principle. Sanitization should not silently
rewrite architectural decisions.

Therefore:

> Do not add a regex that silently converts `[...]/route.ts` into
> `[...slug]/route.ts`.

The slug name is an architectural decision.

The validator should reject it and ask the Architect to regenerate it.

Automatic mutation would hide LLM failures and create a second source of
truth.

------------------------------------------------------------------------

# 9. Why the Existing Regression Test Does Not Catch the Pipeline Bug

The test proves:

``` text
validateArchitectureArtifact("... [...] ...") === invalid
```

It does NOT prove:

``` text
Architect stage receiving invalid LLM output
    => pipeline rejects the stage
```

These are different tests.

Current coverage:

``` text
Unit validator test
        ↓
PASS
```

Missing coverage:

``` text
Architect acceptance test
        ↓
invalid architecture output
        ↓
stage must fail/retry
```

Therefore the regression suite can be green while the actual user-facing
pipeline still produces the bad artifact.

------------------------------------------------------------------------

# 10. Correct Architecture

The corrected stage lifecycle should be:

``` text
                    ┌──────────────────┐
                    │ Architect Agent  │
                    │     LLM output   │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Sanitize Output  │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────────────┐
                    │ Extract Project Contract │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │ Architecture Validator   │
                    │                          │
                    │ - framework              │
                    │ - entry points           │
                    │ - route syntax           │
                    │ - folder tree            │
                    │ - ownership              │
                    │ - dependencies            │
                    │ - integration boundaries │
                    └────────────┬─────────────┘
                                 │
                       ┌─────────┴─────────┐
                       │                   │
                     VALID               INVALID
                       │                   │
                       ▼                   ▼
             ┌─────────────────┐   ┌──────────────────┐
             │ Persist VFS     │   │ Validation       │
             │ architecture.md │   │ feedback         │
             └────────┬────────┘   └────────┬─────────┘
                      │                     │
                      ▼                     ▼
             ┌─────────────────┐   ┌──────────────────┐
             │ AGENT_COMPLETE  │   │ Bounded retry    │
             │ Quality Pause   │   │ Architect        │
             └─────────────────┘   └────────┬─────────┘
                                             │
                                             ▼
                                      Validate again
                                             │
                                      ┌──────┴──────┐
                                      │             │
                                    VALID         INVALID
                                      │             │
                                      ▼             ▼
                                   accept       hard fail
```

------------------------------------------------------------------------

# 11. Implementation Plan

## Phase 1: Move the architecture gate to Architect acceptance

### File

``` text
src/lib/agents/ruflo/orchestrator.ts
```

### Action

Create a dedicated helper:

``` ts
async function validateArchitectOutput(
  conversationId: string,
  content: string
): Promise<{
  valid: boolean;
  contract?: ProjectContract;
  errors: string[];
  warnings: string[];
}> {
  ...
}
```

The helper should:

1.  Load `plan.md`.
2.  Load `requirements.md`.
3.  Build a temporary spec map using:
    -   plan
    -   requirements
    -   architecture candidate
    -   backend_spec if available
    -   ui_spec if available
4.  Extract `ProjectContract`.
5.  Run `validateProjectContract()`.
6.  Run `validateArchitectureArtifact()`.
7.  Return deterministic errors/warnings.

Do not write the candidate architecture to canonical VFS before
validation succeeds.

------------------------------------------------------------------------

# 12. Phase 2: Validate before `AGENT_COMPLETE`

The current sequence:

``` ts
const stageOutput = await runAgent(...);

emit({
  type: 'AGENT_COMPLETE',
  ...
});

await flushVfsToDisk(...);
```

must become conceptually:

``` ts
const stageOutput = await runAgent(...);

if (stageName === 'Architect') {
  const validation = await validateArchitectOutput(
    conversationId,
    stageOutput.content
  );

  if (!validation.valid) {
    // retry or fail
  }
}

// only after validation succeeds
emit({
  type: 'AGENT_COMPLETE',
  ...
});

await flushVfsToDisk(...);
```

This is the critical fix.

------------------------------------------------------------------------

# 13. Phase 3: Add bounded Architect retry

Recommended constants:

``` ts
const MAX_ARCHITECT_VALIDATION_RETRIES = 2;
```

Flow:

``` ts
for (let attempt = 1; attempt <= MAX_ARCHITECT_VALIDATION_RETRIES + 1; attempt++) {
  const stageOutput = await runAgent(...);

  const validation = validateArchitectOutput(...);

  if (validation.valid) {
    return acceptedOutput;
  }

  if (attempt > MAX_ARCHITECT_VALIDATION_RETRIES) {
    throw new Error(
      `Architect validation failed after ${attempt} attempts: ${validation.errors.join('; ')}`
    );
  }

  // retry with deterministic validation feedback
}
```

Do not recursively call the whole pipeline.

Retry only the Architect generation.

------------------------------------------------------------------------

# 14. Phase 4: Feed validator errors back into the retry

Construct a compact deterministic feedback block:

``` text
=== ARCHITECT VALIDATION FAILURE ===

The previous architecture.md is invalid.

Errors:
- Invalid Next.js dynamic route segment "[...]".
- Next.js catch-all segments must use a parameter name, e.g. "[...slug]".
- Backend Entry Point must reference a valid Next.js route handler.

Regenerate the COMPLETE architecture.md.

Do not preserve invalid paths from the previous attempt.
Do not explain the correction.
Output only the required architecture.md document.
```

This feedback must be appended to the Architect retry context.

Do not rely on the original prompt alone. The original prompt has
already failed once.

------------------------------------------------------------------------

# 15. Phase 5: Make backend entry points framework-aware

## File

``` text
src/lib/agents/ruflo/spec-contract.ts
```

Add explicit extraction:

``` ts
const backendEntryPoints: string[] = [];
```

For Next.js App Router:

``` ts
const backendEntryMatch = arch.match(
  /Backend Entry Point[s]?:\s*([^\n]+)/i
);
```

Normalize the value and validate it.

For multiple entries, support:

``` text
Backend Entry Points:
- src/app/api/products/route.ts
- src/app/api/checkout/route.ts
```

Recommended contract:

``` ts
backendEntryPoints: string[];
```

------------------------------------------------------------------------

# 16. Phase 6: Add framework-specific architecture validation

In:

``` text
src/lib/agents/ruflo/spec-contract.ts
```

extend `validateArchitectureArtifact()`.

For:

``` ts
contract.framework === 'NEXT_APP_ROUTER'
```

validate:

### Frontend entry

Allowed:

``` text
app/page.tsx
src/app/page.tsx
```

### API route

Allowed route handlers:

``` text
app/api/foo/route.ts
src/app/api/foo/route.ts
```

### Dynamic segments

Allowed:

``` text
[id]
[...slug]
[[...slug]]
```

Forbidden:

``` text
[...]
[[]]
[[...]]
```

### Backend entry

If declared, it must resolve to:

``` text
**/app/**/route.ts
```

or:

``` text
**/app/**/route.js
```

for JavaScript projects.

Do not accept:

``` text
src/app/api/[...]/route.ts
```

------------------------------------------------------------------------

# 17. Phase 7: Validate module dependencies

The current architecture validator checks ownership, but not the
`Depends On` graph.

Add:

``` ts
interface ArchitectureModule {
  name: string;
  ownedFiles: string[];
  dependencies: string[];
  supportsFeatures: string[];
}
```

Validation rules:

### Rule 1

A module cannot depend on itself.

``` text
Module A
Depends On: Module A
```

=\> invalid.

### Rule 2

Every declared dependency must refer to an existing module.

``` text
Depends On: Prisma Layer
```

when no module named `Prisma Layer` exists

=\> invalid.

### Rule 3

Do not initially enforce hardcoded architectural direction such as:

``` text
components cannot depend on pages
```

That is too framework-specific and would create false positives.

Validate graph integrity first.

------------------------------------------------------------------------

# 18. Phase 8: Strengthen Stripe representation

The current validator detects:

``` text
Stripe
```

and currently produces a warning if it cannot find a Stripe/checkout
implementation path.

For explicit:

``` text
Additional: Stripe
```

the integration should have an implementation location.

Recommended accepted locations include:

``` text
src/lib/stripe.ts
src/app/api/checkout/route.ts
src/app/api/**/route.ts
server/...
```

For Next.js, prefer:

``` text
src/lib/stripe.ts
```

for the Stripe server SDK and:

``` text
src/app/api/checkout/route.ts
```

for the checkout route.

Do not accept client-side secret-key storage.

------------------------------------------------------------------------

# 19. Phase 9: Fix API route matching fallback

## File

``` text
src/lib/agents/ruflo/api-contract-validator.ts
```

Current fallback:

``` ts
return vfsFilePaths.find((f) =>
  f.toLowerCase().includes(cleanPath.toLowerCase())
);
```

This is unsafe because substring matching can associate an API contract
with an unrelated file.

Example:

``` text
requested:
src/app/api/products

candidate:
src/app/api/products-old-backup.ts
```

The candidate can accidentally match.

Remove the permissive substring fallback.

Route resolution should use only:

1.  exact route match
2.  validated Next dynamic route match
3.  validated Express/router composition where applicable

Otherwise return:

``` ts
undefined
```

and let the API validator report the missing route.

------------------------------------------------------------------------

# 20. Phase 10: Introduce a shared runtime classifier

This is a separate structural fix, but it should be implemented after
the Architect gate.

Current Blueprint validation uses heuristics such as:

``` ts
src/app/**
components/**
hooks/**
pages/**
services/**
utils/**
```

to decide whether a file is client-side.

That is not reliable for Next.js App Router.

Create:

``` text
src/lib/agents/ruflo/runtime-classifier.ts
```

Recommended runtime enum:

``` ts
export type RuntimeContext =
  | 'NEXT_SERVER'
  | 'NEXT_CLIENT'
  | 'BROWSER'
  | 'SERVER'
  | 'SHARED';
```

For Next.js App Router:

``` text
route.ts / route.js
    => NEXT_SERVER

src/app/** without "use client"
    => NEXT_SERVER

file beginning with "use client"
    => NEXT_CLIENT

server-only libraries
    => NEXT_SERVER
```

Then use this classifier in:

``` text
orchestrator.ts
framework-validator.ts
```

This prevents server components from being incorrectly classified as
browser code merely because they live under `src/`.

------------------------------------------------------------------------

# 21. Test Plan

## Test 1: Direct architecture validator

Existing test should remain:

``` text
[...] => invalid
```

------------------------------------------------------------------------

## Test 2: Architect acceptance gate

Add a test that simulates:

``` text
Architect output:
Backend Entry Point: src/app/api/[...]/route.ts
```

Expected:

``` text
Architect validation => invalid
```

and:

``` text
AGENT_COMPLETE => must not be emitted
```

------------------------------------------------------------------------

## Test 3: Architect retry

Mock the LLM to return:

### Attempt 1

``` text
src/app/api/[...]/route.ts
```

### Attempt 2

``` text
src/app/api/[...slug]/route.ts
```

Expected:

``` text
attempt 1 => rejected
attempt 2 => accepted
```

------------------------------------------------------------------------

## Test 4: Retry exhaustion

Mock all attempts to return:

``` text
src/app/api/[...]/route.ts
```

Expected:

``` text
Architect stage fails
```

and no downstream stage starts.

------------------------------------------------------------------------

## Test 5: Valid Next catch-all

``` text
src/app/api/[...slug]/route.ts
```

Expected:

``` text
valid
```

------------------------------------------------------------------------

## Test 6: Optional catch-all

``` text
src/app/api/[[...slug]]/route.ts
```

Expected:

``` text
valid
```

------------------------------------------------------------------------

## Test 7: Named dynamic route

``` text
src/app/api/[id]/route.ts
```

Expected:

``` text
valid
```

------------------------------------------------------------------------

## Test 8: Invalid empty segment

``` text
src/app/api/[[]/route.ts
```

Expected:

``` text
invalid
```

------------------------------------------------------------------------

## Test 9: Backend entry contract

For:

``` text
Backend Entry Point: src/app/api/[...slug]/route.ts
```

Expected:

``` text
backendEntryPoints includes src/app/api/[...slug]/route.ts
```

------------------------------------------------------------------------

## Test 10: Invalid backend entry

For:

``` text
Backend Entry Point: src/app/api/[...]/route.ts
```

Expected:

``` text
architecture validation fails
```

------------------------------------------------------------------------

## Test 11: Module dependency integrity

``` text
Frontend
Depends On: MissingModule
```

Expected:

``` text
invalid
```

------------------------------------------------------------------------

## Test 12: Self dependency

``` text
Frontend
Depends On: Frontend
```

Expected:

``` text
invalid
```

------------------------------------------------------------------------

## Test 13: API matching

Ensure:

``` text
/api/products
```

does not resolve to:

``` text
src/app/api/products-old-backup.ts
```

------------------------------------------------------------------------

# 22. Observability Requirements

Every Architect validation failure should emit a structured log:

``` text
Architect Validation Failed
Attempt: 1/3
Errors:
- ...
```

Recommended telemetry:

``` ts
{
  stage: 'Architect',
  attempt: 1,
  valid: false,
  errors: [...],
  warnings: [...]
}
```

Do not log entire LLM output repeatedly if it contains large artifacts.

Store the final accepted architecture and the validation result.

------------------------------------------------------------------------

# 23. Acceptance Criteria

The implementation is complete only when all of the following are true.

### A. Invalid route cannot pass Architect

``` text
src/app/api/[...]/route.ts
```

must never reach:

``` text
AGENT_COMPLETE
QUALITY_GATE_PAUSE
```

as an accepted Architect artifact.

### B. Valid route passes

``` text
src/app/api/[...slug]/route.ts
```

must pass.

### C. Validator runs at the correct boundary

Architecture validation must happen:

``` text
after Architect generation
before Architect completion
before canonical VFS persistence
```

### D. Retry is bounded

No infinite Architect retry loop.

### E. Backend entry is framework-aware

Next.js App Router must use route-handler semantics instead of
pretending there is necessarily one global backend entry file.

### F. Downstream validation remains

Blueprinter must continue validating the architecture as
defense-in-depth.

### G. Tests prove pipeline behavior

Unit tests alone are insufficient.

At least one integration-level test must prove:

``` text
invalid Architect output
→ rejected/retried
→ never accepted
```

------------------------------------------------------------------------

# 24. Implementation Order

Implement in this order:

``` text
P0-1  Move validateArchitectureArtifact() into Architect acceptance path
      ↓
P0-2  Prevent AGENT_COMPLETE / VFS flush on invalid architecture
      ↓
P0-3  Add bounded Architect validation retry
      ↓
P0-4  Add deterministic validation feedback
      ↓
P0-5  Add backendEntryPoints to ProjectContract
      ↓
P0-6  Validate backend entry against framework
      ↓
P1-1  Add Architect integration tests
      ↓
P1-2  Add module dependency validation
      ↓
P1-3  Remove permissive API route substring fallback
      ↓
P1-4  Add shared RuntimeContext classifier
      ↓
P1-5  Strengthen Stripe implementation validation
```

Do not start with another Architect prompt rewrite.

The prompt is already telling the model not to generate `[...]`. The
missing mechanism is enforcement.

------------------------------------------------------------------------

# 25. Files To Change

## Primary

``` text
src/lib/agents/ruflo/orchestrator.ts
src/lib/agents/ruflo/spec-contract.ts
src/lib/agents/ruflo/contracts.ts
src/lib/agents/ruflo/registry/Architect.ts
src/lib/agents/ruflo/__tests__/spec-contract.test.ts
```

## Secondary

``` text
src/lib/agents/ruflo/api-contract-validator.ts
src/lib/agents/ruflo/framework-validator.ts
```

## New

``` text
src/lib/agents/ruflo/runtime-classifier.ts
```

------------------------------------------------------------------------

# 26. Definition of Done

Run:

``` bash
npx tsc --noEmit
```

Then run the relevant regression suite.

The required behavioral result is:

``` text
Input:
Next.js + Prisma + SQLite + Stripe

Bad Architect output:
Backend Entry Point: src/app/api/[...]/route.ts

Result:
Architect validation failure
        ↓
retry
        ↓
valid:
Backend Entry Point: src/app/api/[...slug]/route.ts
        ↓
Architect accepted
        ↓
Blueprinter receives validated architecture
```

If every retry produces the invalid form:

``` text
Architect stage fails deterministically
```

rather than allowing the invalid architecture to continue downstream.

------------------------------------------------------------------------

# 27. Final RCA Verdict

The previous fix addressed **detection** but not **enforcement**.

The exact failure is:

``` text
Architecture validator exists
        +
Architect stage does not invoke it
        =
Invalid architecture can still be accepted
```

The next implementation should therefore focus on **pipeline boundary
placement**, not adding more wording to the Architect prompt.

The most important invariant to establish is:

> `architecture.md` becomes canonical only after it passes deterministic
> architecture validation.

Once that invariant exists, malformed routes such as:

``` text
src/app/api/[...]/route.ts
```

stop being a recurring model-behavior problem and become an ordinary
rejected artifact.
