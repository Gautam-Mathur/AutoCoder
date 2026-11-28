# AutoCoder --- Architect Contract & Downstream Pipeline Fix Plan

## Surgical remediation for module ownership, folder-tree coverage, and Architect→System→Designer→Blueprinter→Coder consistency

**Repository:** `Gautam-Mathur/AutoCoder`\
**Scope:** Architect stage and every downstream contract that consumes
`architecture.md`\
**Observed failure:**

``` text
Pipeline Execution Failed: Stage validation failed for Architect:
Architecture Contract Error: File "src/components/TaskCard.tsx" is claimed by modules "Frontend Application" and "Drag and Drop Module". Each file must have exactly one owning module.
Architecture Contract Error: File "src/components/Column.tsx" is claimed by modules "Frontend Application" and "Drag and Drop Module". Each file must have exactly one owning module.
Architecture Contract Error: File "src/app/api/route.ts" from Project Folder Structure is not claimed by any module.
Architecture Contract Error: File "public/favicon.ico" from Project Folder Structure is not claimed by any module.
```

------------------------------------------------------------------------

# 1. Executive Verdict

## Current state

The latest source confirms that the Architect contract is **partially
enforced but not closed**.

The immediate failure is valid:

-   `TaskCard.tsx` has two module owners.
-   `Column.tsx` has two module owners.
-   `src/app/api/route.ts` exists in the architecture tree but has no
    owner.
-   `public/favicon.ico` exists in the architecture tree but has no
    owner.

The validator is correctly catching the final three conditions. The
problem is that the **contract does not give the model a deterministic
enough ownership model to avoid generating them**, and the downstream
pipeline has no single canonical interpretation of what constitutes a
framework/config/static file.

The correct fix is therefore:

``` text
Architect prompt
        +
Architect parser
        +
Architect validator
        +
architecture.md contract schema
        +
downstream architecture consumers
        +
Blueprint file coverage
        +
Coder workspace manifest
        +
regression tests
```

must all share the same ownership semantics.

Do **not** solve this by weakening the validator.

------------------------------------------------------------------------

# 2. Severity Matrix

  -----------------------------------------------------------------------------------
  ID               Issue                                 Severity Fix
  ---------------- ------------------------ --------------------- -------------------
  A-001            One file claimed by                         P0 Enforce one-owner
                   multiple modules                               invariant and make
                                                                  prompt ownership
                                                                  rule explicit

  A-002            Tree file can exist                         P0 Require exact
                   without module owner                           tree↔ownership
                                                                  bijection for
                                                                  implementation
                                                                  files

  A-003            `public/favicon.ico` has                    P0 Treat static assets
                   no ownership policy                            as real files
                                                                  requiring ownership

  A-004            `src/app/api/route.ts`                      P0 Require route
                   has no ownership                               handlers to belong
                                                                  to exactly one
                                                                  backend/API module

  A-005            Root/config file                            P1 Centralize explicit
                   exemption semantics are                        exemption policy
                   implicit                                       

  A-006            Architect parser and                        P1 Create one
                   contract extractor use                         canonical parser
                   different module parsing                       and reuse it
                   logic                                          

  A-007            Tree parser is                              P1 Replace with
                   indentation-sensitive                          deterministic path
                   and fragile                                    extraction

  A-008            Missing/empty required                      P0 Required-section
                   Architect sections can                         gate before
                   still bypass semantic                          semantic validation
                   checks                                         

  A-009            Duplicate `### Modules`                     P1 Reject duplicate
                   sections are not                               singleton sections
                   structurally rejected                          

  A-010            `Depends On` is                             P1 Preserve current
                   correctly intended as                          strict semantics
                   module graph but must                          and add regression
                   remain strictly                                cases
                   validated                                      

  A-011            Blueprint must preserve                     P0 Add
                   exact architecture file                        architecture-tree ↔
                   set                                            blueprint bijection

  A-012            Coder must not                              P0 Enforce target-file
                   invent/delete files                            set against
                   relative to Blueprint                          approved blueprint

  A-013            System must not alter                       P1 Validate backend
                   architecture topology                          topology against
                                                                  Architect

  A-014            Designer must not invent                    P1 Cross-check UI spec
                   pages/components                               against
                   requiring unowned                              architecture
                   architecture files                             

  A-015            Retry feedback must                         P1 Generate
                   identify exact ownership                       machine-readable
                   conflicts                                      correction feedback

  A-016            Tests need adversarial                      P0 Add positive and
                   ownership fixtures                             negative contract
                                                                  tests
  -----------------------------------------------------------------------------------

------------------------------------------------------------------------

# 3. Non-Negotiable Architecture Invariants

These are the invariants the pipeline should treat as contractual, not
suggestions.

## 3.1 File ownership

For every implementation file in the Project Folder Structure:

``` text
treeFile -> exactly one module owner
```

Therefore:

``` text
ownerCount(treeFile) === 1
```

is mandatory.

Invalid:

``` text
TaskCard.tsx -> Frontend Application
TaskCard.tsx -> Drag and Drop Module
```

Valid:

``` text
TaskCard.tsx -> Frontend Application
```

or:

``` text
TaskCard.tsx -> Drag and Drop Module
```

but never both.

------------------------------------------------------------------------

## 3.2 Module-owned files must exist

For every module-owned file:

``` text
ownedFile -> must exist in Project Folder Structure
```

Invalid:

``` text
Owned Files:
- src/components/TaskCard.tsx
```

when the tree does not contain that file.

------------------------------------------------------------------------

## 3.3 Tree files must be owned

For every non-exempt tree file:

``` text
treeFile -> must appear exactly once in Owned Files
```

This catches:

``` text
src/app/api/route.ts
public/favicon.ico
```

when they are present in the tree but not assigned to any module.

------------------------------------------------------------------------

# 4. Do NOT Use a Global "Ignore Root Files" Shortcut

Current validator has:

``` ts
const IGNORED_ROOT_FILES = new Set([
  'package.json',
  'tsconfig.json',
  ...
  'prisma/schema.prisma',
]);
```

This is too implicit.

The contract needs an explicit classification model.

Create one canonical function:

``` ts
export type ArchitectureFileClass =
  | 'implementation'
  | 'framework'
  | 'static-asset'
  | 'config'
  | 'schema'
  | 'documentation';

export interface ArchitectureFilePolicy {
  path: string;
  class: ArchitectureFileClass;
  requiresModuleOwnership: boolean;
}
```

Then classify deterministically.

Suggested policy:

  ---------------------------------------------------------------------------
  File class            Examples                    Requires module ownership
  --------------------- ------------------------ ----------------------------
  implementation        `.ts`, `.tsx`, `.js`,                             YES
                        `.jsx`, `.css`, `.html`  

  framework             `layout.tsx`,                                     YES
                        `page.tsx`, `route.ts`   

  static asset          `public/favicon.ico`,                             YES
                        `.svg`, `.png`           

  config                `package.json`,                 NO, unless explicitly
                        `tsconfig.json`,                         module-owned
                        `vite.config.js`         

  schema                `prisma/schema.prisma`                  NO by default

  docs                  `README.md`                             NO by default
  ---------------------------------------------------------------------------

The key point:

``` text
public/favicon.ico
```

is **not** a config file.

It is a project asset and must have an owner.

Likewise:

``` text
src/app/api/route.ts
```

is a framework implementation file and must have an owner.

------------------------------------------------------------------------

# 5. P0 --- Fix Architect Prompt Ownership Semantics

## File

``` text
src/lib/agents/ruflo/registry/Architect.ts
```

The current prompt already says:

``` text
Every file in Project Folder Structure ...
must appear in exactly one module's Owned Files.
```

That is directionally correct but insufficiently operational.

Replace the ownership section with an explicit algorithm.

## Required prompt text

``` text
MODULE OWNERSHIP CONTRACT:

Treat Project Folder Structure as the authoritative file inventory.

For every file in Project Folder Structure:

1. Classify the file as:
   - implementation
   - framework
   - static asset
   - config
   - schema
   - documentation

2. Every implementation, framework, and static-asset file MUST belong to exactly ONE module.

3. Config, schema, and documentation files may remain unowned ONLY when they are explicitly classified as exempt by the ownership policy.

4. NEVER assign the same file to two modules.

5. NEVER omit a framework implementation file such as:
   - page.tsx
   - layout.tsx
   - route.ts
   - loading.tsx
   - error.tsx
   - not-found.tsx

6. NEVER omit static assets that appear in the tree.
   Example:
   - public/favicon.ico
   - public/logo.svg

7. Every module's Owned Files list must contain exact paths from Project Folder Structure.

8. Owned Files are file paths, not concepts.
   Invalid:
   - TaskCard
   - Column
   - API routes
   - Public assets

   Valid:
   - src/components/TaskCard.tsx
   - src/components/Column.tsx
   - src/app/api/route.ts
   - public/favicon.ico

9. A file cannot be split across modules merely because multiple modules use it.
   Usage is NOT ownership.

10. If multiple features use one component, assign the component to the single module responsible for implementing it.

11. Shared usage does not create shared ownership.

12. Before output, construct an internal map:
      file path -> owner module
    and verify every required file has exactly one owner.
```

------------------------------------------------------------------------

# 6. P0 --- Fix the Exact Failure Pattern

The current failure:

``` text
Frontend Application
  Owned Files:
    src/components/TaskCard.tsx
    src/components/Column.tsx

Drag and Drop Module
  Owned Files:
    src/components/TaskCard.tsx
    src/components/Column.tsx
```

should become something like:

``` text
**Frontend Application**
- Responsibility: Implements the primary React application and reusable board components.
- Owned Files: src/app/page.tsx, src/components/TaskCard.tsx, src/components/Column.tsx
- Depends On: None
- Supports Features: Task Card Management, Column Organization, Drag and Drop Functionality

**Drag and Drop Module**
- Responsibility: Provides drag-and-drop behavior used by the frontend.
- Owned Files: src/lib/dragDrop.ts
- Depends On: Frontend Application
- Supports Features: Drag and Drop Functionality
```

Or, if drag/drop is entirely component-local:

``` text
**Frontend Application**
- Owned Files: src/app/page.tsx, src/components/TaskCard.tsx, src/components/Column.tsx
- Depends On: None
```

There is no requirement to invent a separate module simply because a
feature exists.

This is important:

``` text
feature != module
component != module
file != module
```

A module is an architectural ownership boundary.

------------------------------------------------------------------------

# 7. P0 --- Route Ownership

For:

``` text
src/app/api/route.ts
```

the Architect must assign ownership to an API/backend module.

Example:

``` text
**API Routes**
- Responsibility: Implements application API route handlers.
- Owned Files: src/app/api/route.ts
- Depends On: Data Access
- Supports Features: State Persistence
```

If the application genuinely does not require an API route, the route
must not appear in the tree.

The model must not generate:

``` text
src/app/api/route.ts
```

merely because "Next.js apps usually have APIs."

------------------------------------------------------------------------

# 8. P0 --- Public Asset Ownership

For:

``` text
public/favicon.ico
```

the model has two valid choices:

### Choice A: Own it

``` text
**Frontend Application**
- Owned Files: src/app/page.tsx, public/favicon.ico
```

### Choice B: Do not generate it

If favicon support is not required:

``` text
public/favicon.ico
```

must not appear in Project Folder Structure.

The invalid state is:

``` text
tree contains favicon
+
no module owns favicon
```

------------------------------------------------------------------------

# 9. P0 --- Required Architect Sections

`validateArchitectureArtifact()` currently has:

``` ts
if (!architectureContent.trim()) {
  return { valid: true, errors, warnings };
}
```

This must be changed.

Required behavior:

``` ts
if (!architectureContent.trim()) {
  return {
    valid: false,
    errors: ['Architecture Contract Error: architecture.md is empty.'],
    warnings,
  };
}
```

Then require exactly these singleton sections:

``` ts
const REQUIRED_ARCHITECT_SECTIONS = [
  'Tech Stack',
  'Project Folder Structure',
  'Modules',
  'Conventions',
];
```

Reject:

``` text
missing section
empty section
duplicate section
wrong section order
unexpected preamble
unexpected trailing content
```

------------------------------------------------------------------------

# 10. P0 --- Make Project Folder Structure Mandatory

Do not allow:

``` text
### Modules
...
```

without:

``` text
### Project Folder Structure
...
```

The invariant must be:

``` text
tree exists
AND
tree has at least one valid file
AND
modules exist
AND
ownership relation is valid
```

Never use:

``` ts
if (normalizedTreeFileSet.size > 0) {
   validate ownership
}
```

as the gate.

Instead:

``` ts
if (!treeSectionExists) {
  errors.push('Architecture Contract Error: Missing required "### Project Folder Structure" section.');
}

if (treeFiles.length === 0) {
  errors.push('Architecture Contract Error: Project Folder Structure contains no files.');
}
```

Then always run ownership validation against the resulting structure.

------------------------------------------------------------------------

# 11. P0 --- Canonical Architecture File Parser

There are currently multiple interpretations of architecture structure.

At minimum:

``` text
parseArchitectureModules()
validateArchitectureArtifact()
extractProjectContract()
```

must not independently parse the same module structure.

Create:

``` text
src/lib/agents/ruflo/architecture-parser.ts
```

with:

``` ts
export interface ParsedArchitecture {
  sections: {
    techStack: string;
    projectFolderStructure: string;
    modules: ParsedArchitectureModule[];
    conventions: string;
  };

  treeFiles: string[];

  filePolicies: ArchitectureFilePolicy[];

  ownership: Map<string, string>;

  moduleGraph: Map<string, string[]>;

  parserErrors: string[];
}
```

Then:

``` text
architecture.md
      |
      v
parseArchitecture()
      |
      +--> sections
      +--> tree
      +--> file policy
      +--> module ownership
      +--> module graph
      |
      v
all validators consume ParsedArchitecture
```

Do not re-parse Markdown differently in downstream code.

------------------------------------------------------------------------

# 12. P1 --- Deterministic Tree Extraction

The current tree parser relies on indentation:

``` ts
const nameStartCol = line.indexOf(cleanName);
```

This is fragile because:

-   ASCII tree glyphs affect columns.
-   inconsistent indentation changes parent resolution.
-   Markdown whitespace can alter interpretation.
-   filenames containing special characters can be mishandled.

Prefer a deterministic parser that accepts only the generated tree
grammar.

Supported form:

``` text
project-root/
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   └── api/
│   │       └── route.ts
│   └── components/
│       ├── TaskCard.tsx
│       └── Column.tsx
└── public/
    └── favicon.ico
```

Extract directory nodes and file nodes based on tree-prefix depth.

Add negative tests for malformed tree indentation.

------------------------------------------------------------------------

# 13. P1 --- Reject Duplicate Modules Sections

Current module parser finds the first:

``` text
### Modules
```

and then processes until:

``` text
### Conventions
```

Therefore a second Modules section can be ignored.

Reject:

``` text
### Modules
...

### Modules
...
```

with:

``` text
Architecture Parser Error: Duplicate "### Modules" section.
```

The same singleton rule should apply to:

``` text
### Tech Stack
### Project Folder Structure
### Modules
### Conventions
```

------------------------------------------------------------------------

# 14. P1 --- Reject Unknown Module Fields

A module currently accepts known fields:

``` text
Responsibility
Owned Files
Depends On
Supports Features
```

Unknown field-like lines should not silently mutate module state.

Reject:

``` text
- Responsibility: ...
- Owned Files: ...
- Depends On: ...
- Something Else: ...
```

with:

``` text
Architecture Parser Error:
Unknown module field "Something Else".
```

This prevents malformed prose from becoming contract data.

------------------------------------------------------------------------

# 15. P1 --- Module Dependency Graph

Keep the current strict rule:

``` text
Depends On = architecture module names only
```

Valid:

``` text
Depends On: API Routes, Data Access
```

Invalid:

``` text
Depends On: TaskCard
Depends On: SearchBar
Depends On: Prisma
Depends On: @prisma/client
Depends On: src/lib/prisma.ts
Depends On: React
```

The validator should reject all of them.

Also reject:

``` text
self dependency
unknown module
cycle
duplicate dependency
```

------------------------------------------------------------------------

# 16. P0 --- Architecture → Blueprint Must Be Bijective

Current Blueprinter prompt says:

``` text
Do NOT add files that aren't in architecture.md's folder structure
Do NOT remove files that ARE in architecture.md's folder structure
```

Good, but the system must enforce this.

After Blueprinter generation:

``` text
Architecture implementation files
          ↕
Blueprint file sections
```

must match exactly.

Define:

``` ts
architectureRequiredFiles
blueprintFiles
```

and reject:

``` text
missing blueprint file
extra blueprint file
duplicate blueprint file
```

Example:

``` text
Architecture:
src/components/TaskCard.tsx
src/components/Column.tsx
public/favicon.ico
```

Blueprint must contain exactly:

``` text
### File: src/components/TaskCard.tsx
### File: src/components/Column.tsx
### File: public/favicon.ico
```

unless the centralized file policy explicitly classifies an item as
non-Coder-generated config/schema/documentation.

------------------------------------------------------------------------

# 17. P0 --- Architecture → Coder Must Be Immutable

The Coder must not decide:

``` text
"I think this project needs another file."
```

The approved file set is:

``` text
Architect
   ↓
Blueprinter
   ↓
approved blueprint file set
   ↓
Coder
```

Coder may implement:

``` text
approved target file
```

Coder may not:

``` text
create unapproved file
delete approved file
rename approved file
change architecture ownership
```

The final workspace validator must compare:

``` text
actual VFS files
        vs
approved blueprint files
```

and fail on drift.

------------------------------------------------------------------------

# 18. P1 --- System Must Preserve Architect Topology

Current System prompt correctly says:

``` text
Do NOT modify the folder structure from architecture.md.
```

Strengthen this with deterministic validation.

For every backend entry declared by Architect:

``` text
architecture.backendEntryPoints
```

System must reference the same topology.

Example:

``` text
Architect:
Backend Entry Point: server/app.js
```

System cannot implicitly replace it with:

``` text
src/app/api/route.ts
```

unless the architecture itself explicitly defines that topology.

For Next App Router:

``` text
src/app/api/.../route.ts
```

is a framework route handler.

For Express:

``` text
server/app.js
```

is the backend entry.

Do not merge these models accidentally.

------------------------------------------------------------------------

# 19. P1 --- Designer Must Not Create Architecture Files

Designer may reference:

``` text
TaskCard
Column
Board
```

but must not silently invent:

``` text
src/components/DragDropProvider.tsx
```

unless that file already exists in Architect or is passed into a
controlled architecture amendment flow.

UI specification describes UI.

Architect owns file topology.

------------------------------------------------------------------------

# 20. P0 --- Blueprint Must Preserve Single Ownership

The Blueprint must not create a conceptual split such as:

``` text
TaskCard.tsx
  -> Frontend Application
  -> Drag and Drop Module
```

Blueprint does not need module ownership metadata today, but the
validation layer should be able to trace:

``` text
Blueprint file
      ↓
Architecture owner
```

For every Blueprint file:

``` ts
architectureOwnership.has(file)
```

must be true for implementation files.

------------------------------------------------------------------------

# 21. P0 --- Add Architecture Ownership Contract Tests

Create or extend:

``` text
src/lib/agents/ruflo/__tests__/architecture-contract.test.ts
```

Minimum positive fixture:

``` md
### Tech Stack
- **Frontend**: Next.js
- **Frontend Entry Point**: src/app/page.tsx
- **Backend**: Next.js API Routes
- **Backend Entry Point**: src/app/api/route.ts
- **Database**: None
- **ORM**: None
- **Authentication**: None
- **Build Tool**: Next.js
- **Additional**: None

### Project Folder Structure
project-root/
├── src/
│   └── app/
│       ├── page.tsx
│       └── api/
│           └── route.ts
└── public/
    └── favicon.ico

### Modules

**Frontend Application**
- Responsibility: Implements the frontend.
- Owned Files: src/app/page.tsx, public/favicon.ico
- Depends On: None
- Supports Features: Board

**API Routes**
- Responsibility: Implements API route handlers.
- Owned Files: src/app/api/route.ts
- Depends On: None
- Supports Features: Persistence

### Conventions
- **File Naming**: kebab-case
- **Function Naming**: camelCase
- **Import Style**: ES6
- **Entry Point**: src/app/page.tsx
```

Expected:

``` ts
valid === true
```

------------------------------------------------------------------------

# 22. P0 --- Negative Test: Duplicate Ownership

Fixture:

``` md
**Frontend Application**
- Responsibility: Main frontend.
- Owned Files: src/components/TaskCard.tsx
- Depends On: None
- Supports Features: Task Cards

**Drag and Drop Module**
- Responsibility: Drag and drop.
- Owned Files: src/components/TaskCard.tsx
- Depends On: None
- Supports Features: Drag and Drop
```

Expected:

``` text
FAIL
File "src/components/TaskCard.tsx" ... exactly one owning module.
```

------------------------------------------------------------------------

# 23. P0 --- Negative Test: Unclaimed Route

Tree:

``` text
src/app/api/route.ts
```

No module ownership.

Expected:

``` text
FAIL
File "src/app/api/route.ts" ... is not claimed by any module.
```

------------------------------------------------------------------------

# 24. P0 --- Negative Test: Unclaimed Public Asset

Tree:

``` text
public/favicon.ico
```

No module ownership.

Expected:

``` text
FAIL
File "public/favicon.ico" ... is not claimed by any module.
```

------------------------------------------------------------------------

# 25. P0 --- Negative Test: Same File Used by Two Features

Fixture:

``` text
TaskCard.tsx
```

used by:

``` text
Task Card Module
Drag and Drop Module
```

but owned by:

``` text
Frontend Application
```

Expected:

``` text
PASS
```

Reason:

``` text
usage != ownership
```

This test is essential because otherwise the model will continue
creating duplicate ownership modules whenever a file supports multiple
features.

------------------------------------------------------------------------

# 26. P0 --- Negative Test: Missing Tree

Architecture:

``` md
### Modules
**Frontend Application**
- Responsibility: Frontend.
- Owned Files: src/app/page.tsx
- Depends On: None
- Supports Features: Home
```

No Project Folder Structure.

Expected:

``` text
FAIL
Missing required "### Project Folder Structure" section.
```

------------------------------------------------------------------------

# 27. P0 --- Negative Test: Empty Architecture

Input:

``` text
```

Expected:

``` text
FAIL
architecture.md is empty.
```

------------------------------------------------------------------------

# 28. P1 --- Negative Test: Duplicate Modules Section

Input:

``` md
### Modules
...

### Modules
...
```

Expected:

``` text
FAIL
Duplicate "### Modules" section.
```

------------------------------------------------------------------------

# 29. P1 --- Negative Test: Unknown Dependency

``` text
**Frontend Application**
- Depends On: TaskCard
```

Expected:

``` text
FAIL
Depends On must contain declared architecture module names only.
```

------------------------------------------------------------------------

# 30. P1 --- Negative Test: Dependency Cycle

``` text
**A**
- Depends On: B

**B**
- Depends On: A
```

Expected:

``` text
FAIL
Module dependency cycle detected.
```

------------------------------------------------------------------------

# 31. P0 --- Architect Retry Feedback Must Be Structured

When validation fails, do not return a giant concatenated error blob
only.

Create structured feedback:

``` ts
interface ArchitectureValidationFeedback {
  category:
    | 'DUPLICATE_OWNERSHIP'
    | 'UNCLAIMED_TREE_FILE'
    | 'ORPHAN_MODULE_FILE'
    | 'INVALID_MODULE_DEPENDENCY'
    | 'MISSING_SECTION'
    | 'INVALID_ROUTE'
    | 'INVALID_FILE_PATH';

  file?: string;
  modules?: string[];
  message: string;
  correction: string;
}
```

Example:

``` json
{
  "category": "DUPLICATE_OWNERSHIP",
  "file": "src/components/TaskCard.tsx",
  "modules": [
    "Frontend Application",
    "Drag and Drop Module"
  ],
  "message": "File has multiple owners.",
  "correction": "Assign the file to exactly one module. Other modules may depend on or use it but must not list it in Owned Files."
}
```

This gives the retry model actionable information.

------------------------------------------------------------------------

# 32. P0 --- Do Not Let Retry Accumulate Bad State

Architect candidates must remain candidate-only until accepted.

The intended lifecycle is:

``` text
Generate candidate
       ↓
Validate candidate
       ↓
FAIL ───────────────→ discard candidate
       |
       ↓
retry
       |
       ↓
PASS
       ↓
commit architecture.md
```

Rejected Architect output must never become authoritative VFS state.

Verify that `executeContractStage()` is the only production Architect
execution path.

------------------------------------------------------------------------

# 33. P1 --- Remove Duplicate Architect Execution Infrastructure

`orchestrator.ts` still contains:

``` ts
generateStageCandidate()
```

This creates a second inference path.

Canonical execution should be:

``` text
orchestrator
   ↓
executeContractStage()
   ↓
runAgent()
   ↓
validate
   ↓
compatibility
   ↓
commit
```

Do not maintain:

``` text
orchestrator
   ↓
generateStageCandidate()
   ↓
runInference()
```

as another route.

Otherwise future Architect fixes may only affect one path.

------------------------------------------------------------------------

# 34. P0 --- Canonical Architecture Contract Flow

The final intended flow:

``` text
Queen
  ↓
plan.md
  ↓
Planner
  ↓
requirements.md
  ↓
Architect
  ↓
architecture.md
  │
  ├── required sections
  ├── tree grammar
  ├── file classification
  ├── ownership bijection
  ├── dependency graph
  ├── framework invariants
  ├── route invariants
  └── project contract extraction
  ↓
System
  ↓
backend_spec.md
  ↓
Designer
  ↓
ui_spec.md
  ↓
Blueprinter
  │
  └── architecture ↔ blueprint exact file-set validation
  ↓
Coder
  │
  └── blueprint ↔ VFS exact file-set validation
  ↓
Tester
  ↓
Debugger
  ↓
Security
  ↓
Reviewer
  ↓
Final Gate
```

------------------------------------------------------------------------

# 35. Required File Changes

## P0

### `src/lib/agents/ruflo/spec-contract.ts`

Implement:

-   required Architect section validation
-   empty artifact rejection
-   canonical file classification
-   exact one-owner invariant
-   unclaimed tree detection
-   orphan owned-file detection
-   duplicate module rejection
-   unknown field rejection
-   route validation
-   public asset validation

Prefer extracting architecture-specific logic to:

``` text
src/lib/agents/ruflo/architecture-parser.ts
src/lib/agents/ruflo/architecture-validator.ts
```

rather than allowing `spec-contract.ts` to become a second god-file.

------------------------------------------------------------------------

### `src/lib/agents/ruflo/registry/Architect.ts`

Strengthen:

-   ownership algorithm
-   static asset ownership
-   framework special-file ownership
-   route ownership
-   usage != ownership
-   feature != module
-   no unnecessary modules
-   exact tree ↔ ownership mapping

------------------------------------------------------------------------

### `src/lib/agents/ruflo/stage-acceptance.ts`

Ensure Architect acceptance calls the canonical validator and does not
maintain a weaker duplicate check.

------------------------------------------------------------------------

### `src/lib/agents/ruflo/contract-executor.ts`

Ensure:

``` text
candidate
→ validate
→ compatibility
→ commit
```

and never:

``` text
candidate
→ VFS
→ validate
```

for Architect.

------------------------------------------------------------------------

### `src/lib/agents/ruflo/registry/Blueprinter.ts`

Add explicit requirement:

``` text
The set of implementation/framework/static-asset files in blueprint.md MUST equal the corresponding approved architecture file set.

Do not omit or add files.
```

------------------------------------------------------------------------

## P1

### `src/lib/agents/ruflo/registry/System.ts`

Add:

``` text
Never change the architectural file topology.
Backend design must operate within the exact architecture paths.
```

------------------------------------------------------------------------

### `src/lib/agents/ruflo/registry/Designer.ts`

Add:

``` text
Do not introduce file paths or implementation modules.
Components described here must map to files already declared by architecture.md or blueprint.md.
```

------------------------------------------------------------------------

### `src/lib/agents/ruflo/contracts/schemas/coder.ts`

Extend manifest validation with:

``` text
manifest.files == approved blueprint implementation files
```

subject to the centralized file policy.

------------------------------------------------------------------------

# 36. File Policy Must Be Shared Downstream

Do not duplicate this logic in:

``` text
Architect validator
Blueprint validator
Coder validator
Final gate
```

Create one source:

``` text
architecture-file-policy.ts
```

Example:

``` ts
export function requiresModuleOwnership(path: string): boolean;
export function isCoderGeneratedFile(path: string): boolean;
export function classifyArchitectureFile(path: string): ArchitectureFileClass;
```

Then every stage uses it.

This prevents the absurd future situation where:

``` text
Architect says favicon must be owned
Blueprinter says favicon is optional
Coder says favicon is configuration
Final gate says favicon doesn't matter
```

Humanity has suffered enough from inconsistent schemas.

------------------------------------------------------------------------

# 37. Acceptance Matrix

  -----------------------------------------------------------------------------------
  Artifact               Must contain             Must not contain  Gate
  ---------------------- ------------------------ ----------------- -----------------
  `architecture.md`      complete tree +          duplicate         P0
                         modules + conventions    ownership         

  `backend_spec.md`      backend design           topology changes  P1
                         consistent with                            
                         architecture                               

  `ui_spec.md`           pages/components         new               P1
                         consistent with          files/topology    
                         architecture                               

  `blueprint.md`         exact approved           extra/missing     P0
                         implementation file set  files             

  workspace              exact blueprint file set invented files    P0

  `test_report.md`       current workspace        stale workspace   P0
                         verification             result            

  `debug_report.md`      actual repair record     fake PASS         P0

  `security_report.md`   current workspace        stale result      P1
                         security result                            

  `review_report.md`     current                  stale result      P1
                         architecture/workspace                     
                         review                                     
  -----------------------------------------------------------------------------------

------------------------------------------------------------------------

# 38. Regression Scenario: Current Failure

Add the exact failure as a permanent regression fixture.

Input architecture must contain:

``` text
src/components/TaskCard.tsx
src/components/Column.tsx
src/app/api/route.ts
public/favicon.ico
```

And deliberately create:

``` text
TaskCard.tsx -> Frontend Application
TaskCard.tsx -> Drag and Drop Module

Column.tsx -> Frontend Application
Column.tsx -> Drag and Drop Module

src/app/api/route.ts -> nobody
public/favicon.ico -> nobody
```

Expected:

``` text
4 ownership failures
```

The validator must never regress to accepting this.

------------------------------------------------------------------------

# 39. Regression Scenario: Corrected Version

Correct ownership:

``` text
Frontend Application:
  src/components/TaskCard.tsx
  src/components/Column.tsx
  public/favicon.ico

API Routes:
  src/app/api/route.ts
```

Expected:

``` text
Architecture valid
```

assuming all other required sections and framework rules pass.

------------------------------------------------------------------------

# 40. Verification Commands

After implementation, run at minimum:

``` bash
npm run build
npm run lint
```

Then add a dedicated contract command:

``` json
{
  "scripts": {
    "test:contracts": "vitest run src/lib/agents/ruflo/**/__tests__ src/lib/agents/ruflo/**/*.test.ts",
    "check:pipeline-invariants": "tsx scripts/check_pipeline_invariants.ts"
  }
}
```

If the repository uses another test runner, use the existing runner
instead of introducing a second one.

The important requirement is:

``` text
contract tests must be runnable by one deterministic command.
```

------------------------------------------------------------------------

# 41. Required Test Groups

## Architect

-   empty output
-   missing Tech Stack
-   missing Project Folder Structure
-   missing Modules
-   missing Conventions
-   duplicate sections
-   malformed tree
-   duplicate file ownership
-   unclaimed tree file
-   orphan module-owned file
-   duplicate module
-   unknown module field
-   unknown dependency
-   self dependency
-   cycle
-   invalid Next.js route
-   valid `[id]`
-   valid `[...slug]`
-   valid `[[...slug]]`
-   invalid `[...]`
-   root `public/`
-   invalid `src/public/`

## Blueprint

-   exact architecture file set
-   missing architecture file
-   extra blueprint file
-   duplicate blueprint file

## Coder

-   exact blueprint file set
-   no invented files
-   no missing files
-   manifest hashes equal VFS
-   entry points equal approved architecture

## Final Gate

-   stale architecture rejected
-   stale blueprint rejected
-   stale workspace rejected
-   current workspace fingerprint required

------------------------------------------------------------------------

# 42. Definition of Done

Do not consider this fix complete until all are true:

-   [ ] Architect cannot accept empty output.
-   [ ] Architect cannot omit required sections.
-   [ ] Architect cannot contain duplicate singleton sections.
-   [ ] Every implementation/framework/static file has exactly one
    owner.
-   [ ] No file can have two module owners.
-   [ ] No module can claim a file absent from the tree.
-   [ ] `public/favicon.ico` is either explicitly owned or absent from
    the tree.
-   [ ] `src/app/api/route.ts` is either explicitly owned or absent from
    the tree.
-   [ ] Feature usage cannot create duplicate file ownership.
-   [ ] Component names cannot be interpreted as module dependencies.
-   [ ] `Depends On` only references declared modules.
-   [ ] Module dependency cycles are rejected.
-   [ ] Invalid Next.js routes are rejected.
-   [ ] Valid Next.js dynamic routes remain accepted.
-   [ ] `src/public/` remains rejected for Next.js static assets.
-   [ ] Architecture parsing is centralized.
-   [ ] Blueprint file set exactly matches approved architecture file
    set.
-   [ ] Coder workspace file set exactly matches approved blueprint file
    set.
-   [ ] System cannot silently alter backend topology.
-   [ ] Designer cannot silently invent implementation files.
-   [ ] Architect rejected candidates never become authoritative VFS
    state.
-   [ ] Duplicate Architect execution path is removed or proven
    unreachable.
-   [ ] Exact current failure is a regression test.
-   [ ] Positive corrected architecture passes.
-   [ ] Contract tests are runnable from package scripts.
-   [ ] `npm run build` passes.
-   [ ] `npm run lint` passes.

------------------------------------------------------------------------

# 43. Implementation Order

Do this in this order. Do not scatter fixes across the pipeline like
confetti.

## Phase 1 --- Architect parser/validator

1.  [ ] Extract canonical architecture parser.
2.  [ ] Add required-section validation.
3.  [ ] Reject empty architecture.
4.  [ ] Add canonical file classification.
5.  [ ] Enforce exact ownership cardinality.
6.  [ ] Reject unclaimed implementation/framework/static files.
7.  [ ] Reject orphan module-owned files.
8.  [ ] Reject duplicate module sections.
9.  [ ] Reject unknown module fields.
10. [ ] Preserve dependency graph validation.
11. [ ] Preserve Next.js route validation.

## Phase 2 --- Architect prompt

12. [ ] Replace ownership rules with explicit algorithm.
13. [ ] Add `usage != ownership`.
14. [ ] Add `feature != module`.
15. [ ] Add explicit public asset rule.
16. [ ] Add explicit route handler ownership rule.
17. [ ] Add final ownership self-check.

## Phase 3 --- Downstream contract alignment

18. [ ] Blueprinter exact file-set validation.
19. [ ] Coder exact file-set validation.
20. [ ] System topology preservation.
21. [ ] Designer topology preservation.
22. [ ] Final workspace manifest validation.

## Phase 4 --- Execution hygiene

23. [ ] Confirm Architect candidate is not persisted before validation.
24. [ ] Remove/disable duplicate `generateStageCandidate()` path.
25. [ ] Ensure retry uses canonical `executeContractStage()`.

## Phase 5 --- Tests

26. [ ] Add exact current failure fixture.
27. [ ] Add corrected fixture.
28. [ ] Add adversarial parser fixtures.
29. [ ] Add Blueprint/Coder file-set fixtures.
30. [ ] Add package scripts.
31. [ ] Run build/lint/contracts.

------------------------------------------------------------------------

# 44. Final Target Invariant

The architecture contract should ultimately satisfy this equation:

``` text
APPROVED_ARCHITECTURE_FILES
    =
OWNED_IMPLEMENTATION_FILES
    =
BLUEPRINT_IMPLEMENTATION_FILES
    =
CODER_WORKSPACE_FILES
```

with explicit exclusions only through the centralized file policy.

And for every owned file:

``` text
ownerCount(file) === 1
```

And for every dependency:

``` text
dependency ∈ declaredModules
```

And for every framework route:

``` text
routePath satisfies framework grammar
```

That is the actual fix.

Not:

``` text
"Tell the model harder."
```

The model is probabilistic. The contract is supposed to be the adult in
the room.
