# AutoCoder: Specification Contract Validation Failure Fix Plan

**Repository:** `Gautam-Mathur/AutoCoder`\
**Failed Conversation:** `a17f95c9-4baa-4d51-9f3c-8a6fcd9d2e3e`\
**Failure Stage:** Post-Designer / Pre-Blueprinter\
**Status:** Implementation plan only

## 1. Objective

Fix the Kanban Workspace contract-validation failure while preserving
the invariant that genuine contradictory authentication requirements
must stop the pipeline before code generation.

The fix must: 1. Stop generic uses of `session` from being interpreted
as authentication. 2. Recognize explicit no-auth declarations such as
`Auth/Session: None`. 3. Preserve genuine authentication detection for
login, accounts, JWT, bearer tokens, OAuth, authentication middleware,
and explicit session authentication. 4. Add regression coverage for
false positives and genuine auth requirements. 5. Address the
PostgreSQL/Prisma model warning separately. 6. Strengthen the existing
canonical contract-validation pipeline. Do not create a parallel
validator.

## 2. Root Cause

The immediate bug is in authentication evidence extraction in
`src/lib/agents/ruflo/spec-contract.ts`.

A bare pattern equivalent to:

``` regex
/\bsession\b/i
```

is too broad. It turns phrases such as `preserved across sessions`,
`browser session`, or `session state` into authentication-required
evidence.

The UI artifact also contains:

``` text
Auth/Session: None
```

but the no-auth detector does not recognize that form. The slash causes
the intended no-auth declaration to be missed, while the generic
`session` matcher incorrectly classifies it as auth-required.

The contract validator itself is behaving correctly by stopping on
contradictory evidence. The evidence extractor is the layer that needs
correction.

## 3. Phase 1: Fix Authentication Evidence Extraction

### File

``` text
src/lib/agents/ruflo/spec-contract.ts
```

### 3.1 Remove bare `session` as auth evidence

Do not use a standalone `session` word as proof of authentication.

These must **not** produce auth-required evidence:

-   `preserved across sessions`
-   `across browser sessions`
-   `session state`
-   `session persistence`
-   `restore the previous session`
-   browser/session-storage terminology

### 3.2 Use contextual auth patterns

Detect authentication when there is actual authentication context,
including patterns such as:

-   login / log in / logged in
-   sign in / sign-in
-   authentication required
-   auth required
-   user authentication
-   authenticated users
-   authenticated session
-   session authentication
-   session-based authentication
-   JWT
-   bearer token
-   access token / refresh token
-   OAuth / OAuth2
-   `AuthMiddleware`
-   `express-session`
-   `next-auth`
-   Passport

The important distinction is that `session` by itself is not enough.

### 3.3 Recognize `Auth/Session: None`

Extend `detectExplicitNoAuth()` to recognize forms such as:

``` text
Auth/Session: None
Authentication/Session: None
Auth / Session: None
Authentication / Session: None
```

Keep all existing no-auth patterns. This is an extension, not a
replacement.

### 3.4 Preserve genuine contradictions

Do **not** solve the bug by making no-auth always override auth
evidence.

For example:

``` text
Architecture:
Authentication: None

Requirements:
Users must log in before accessing their board.
```

must still produce a contradiction and fail validation.

The goal is accurate evidence extraction, not a weaker contract gate.

## 4. Phase 2: Add Regression Tests

### File

``` text
src/lib/agents/ruflo/__tests__/spec-contract.test.ts
```

Add tests for:

### Test A: Generic session is not authentication

``` text
User's board state should persist across sessions.
```

Expected: no auth-required evidence.

### Test B: Browser session is not authentication

``` text
Restore state across browser sessions.
```

Expected: no auth-required evidence.

### Test C: `Auth/Session: None` is no-auth

``` text
Auth/Session: None
```

Expected: `authentication.required === false`.

### Test D: Explicit login is authentication

``` text
Users must log in before accessing their board.
```

Expected: `authentication.required === true`.

### Test E: JWT is authentication

``` text
Authentication: JWT
```

Expected: `authentication.required === true`.

### Test F: Real contradiction still fails

Architecture:

``` text
Authentication: None
```

Requirements:

``` text
Users must log in before accessing their board.
```

Expected: `validateProjectContract()` reports an authentication
contradiction.

## 5. Phase 3: Fix PostgreSQL + Prisma Model Extraction

This is separate from the authentication failure.

### Problem

The architecture specifies:

``` text
Database: PostgreSQL
ORM: Prisma
```

but `backend_spec.md` describes database entities in prose rather than
emitting machine-readable Prisma models. The contract consequently sees:

``` text
database = postgresql
orm = prisma
models = []
```

and emits the warning about missing database models.

### File

``` text
src/lib/agents/ruflo/registry/System.ts
```

When Prisma is selected, require a machine-readable schema
representation such as:

``` prisma
model Board {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
}
```

The actual fields must come from the requirements and architecture. Do
not invent auth-related entities merely to satisfy the parser.

Preserve:

``` text
Database: PostgreSQL
ORM: Prisma
Authentication: None
```

and do not introduce `User`, `Account`, `Session`, `AuthMiddleware`,
JWT, etc. unless upstream requirements explicitly require them.

## 6. Prisma Regression Test

Add a test proving that valid Prisma model blocks are extracted when
PostgreSQL + Prisma is selected.

Expected:

``` text
models.length > 0
```

Also retain coverage for the genuine missing-model case. Do not suppress
the warning merely because PostgreSQL/Prisma is configured.

## 7. Phase 4: Re-run the Kanban 2.0 Fixture

Run the same Kanban specification that produced:

``` text
Authentication: None
```

and:

``` text
User's board state should be accessible from any browser session where they log in
```

The goal is **not** simply to make Kanban pass.

The desired behavior depends on what the final upstream artifacts
actually mean:

### If the project is intended to be no-auth

All artifacts should consistently express no authentication, for
example:

``` text
Authentication: None
Auth Required: No
Auth/Session: None
```

Then the contract should pass.

### If the requirements genuinely require login

The contradiction should remain:

``` text
Architecture -> no auth
Requirements -> auth required
```

and the pipeline should stop before Blueprinter.

## 8. Phase 5: Verify the Full Pipeline

After targeted tests pass, inspect the full flow:

``` text
Queen
  ↓
Planner
  ↓
Architect
  ↓
System
  ↓
Designer
  ↓
extractProjectContract
  ↓
validateProjectContract
  ↓
Blueprinter
  ↓
Coder
  ↓
Validators
  ↓
Quality Gate
```

Inspect:

1.  `requirements.md`
2.  `architecture.md`
3.  `backend_spec.md`
4.  `ui_spec.md`
5.  extracted `ProjectContract`
6.  authentication evidence
7.  database/ORM/model extraction
8.  Blueprinter execution
9.  generated project structure
10. final Quality Gate result

## 9. Files Expected to Change

Primary files:

``` text
src/lib/agents/ruflo/spec-contract.ts
src/lib/agents/ruflo/__tests__/spec-contract.test.ts
src/lib/agents/ruflo/registry/System.ts
```

Potentially:

``` text
src/lib/agents/ruflo/registry/Planner.ts
```

Only change Planner if requirements continue producing ambiguous
authentication language after the parser fix.

Do not create:

``` text
spec-contract-v2.ts
auth-validator-v2.ts
project-contract-v2.ts
```

Strengthen the canonical implementation.

## 10. Recommended Implementation Order

``` text
1. Fix auth evidence extraction
        ↓
2. Add exact regression tests for the RCA
        ↓
3. Run spec-contract tests
        ↓
4. Fix Prisma model output/extraction
        ↓
5. Add Prisma regression coverage
        ↓
6. Run the original Kanban 2.0 pipeline
        ↓
7. Inspect generated artifacts and ProjectContract
        ↓
8. Adjust Planner wording only if evidence shows it is necessary
```

Do not change Planner first. The RCA identifies the parser as the
immediate false-positive source. Fix the canonical parser and prove it
with tests before changing upstream generation.

## 11. What This Fix Must Not Do

Do not:

-   remove authentication contradiction validation;
-   make no-auth universally override requirements;
-   treat every occurrence of `login`, `session`, or `user` as
    authentication;
-   hard-code Kanban's expected output;
-   suppress the PostgreSQL model warning;
-   invent database entities;
-   create another validation layer;
-   bypass Blueprinter validation;
-   weaken the Quality Gate just to make the run complete.

The objective is better semantic extraction, not a softer gate.

## 12. Definition of Done

### Authentication

-   [ ] Bare `session` is not authentication evidence.
-   [ ] `Auth/Session: None` is recognized as no-auth.
-   [ ] Existing explicit no-auth forms still work.
-   [ ] Explicit login requirements are detected.
-   [ ] JWT/OAuth/bearer/session-auth mechanisms are detected.
-   [ ] Genuine auth/no-auth contradictions still fail.
-   [ ] The original false-positive Kanban case no longer fails solely
    because of generic `session` wording.

### Prisma

-   [ ] PostgreSQL + Prisma remains correctly detected.
-   [ ] Valid Prisma model blocks are parsed.
-   [ ] System emits machine-readable model definitions.
-   [ ] Models are not invented just to suppress warnings.

### Regression Safety

-   [ ] Existing spec-contract tests pass.
-   [ ] New auth regression tests pass.
-   [ ] New Prisma regression tests pass.
-   [ ] No duplicate validation infrastructure is introduced.
-   [ ] A genuinely coherent Kanban pipeline reaches Blueprinter.

## 13. Final Intended Behavior

### Valid no-auth project

``` text
Architecture:
Authentication: None

Backend:
Auth Required: No

UI:
Auth/Session: None

Requirements:
State persists across browser sessions.
```

Result:

``` text
Contract Valid
→ Blueprinter executes
```

### Genuine contradiction

``` text
Architecture:
Authentication: None

Requirements:
Users must log in to access their board.
```

Result:

``` text
Contract Invalid
→ Pipeline stops before Blueprinter
```

The validator should become **more precise**, not more permissive.
