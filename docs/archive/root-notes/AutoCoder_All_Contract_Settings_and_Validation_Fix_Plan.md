# AutoCoder — Contract Settings & Stage Validation Alignment Plan

**Repository:** `Gautam-Mathur/AutoCoder`  
**Audited commit:** `c89461a3bbe347a9479b5c123c15999395ca3f64`  
**Scope:** All 11 canonical pipeline stages  
**Primary failure observed:** Queen stage rejects valid Queen output because the Queen prompt and Queen validator define different output contracts.

---

## 1. Executive Finding

The current pipeline has a real contract-enforcement system, but the **producer contracts and consumer validators are not aligned**.

The live Queen failure is deterministic:

```text
Agent Queen failed in 12656ms (Attempt 1/3).
Agent Queen completed in 12656ms (730 bytes generated).
Pipeline Execution Failed:
Stage validation failed for Queen:
Queen candidate output must contain '# Project Plan' heading.
```

The Queen agent is explicitly instructed to begin with:

```text
### Project Name
```

and to end after:

```text
### Risks
```

The validator instead checks for:

```regex
#\s+(Project Plan|Plan|Executive Summary|Architectural Goal|Implementation Plan)
```

Therefore the validator is not validating the Queen contract. It is validating a different, older contract.

This is the first failure, but it is not the only one.

---

# 2. Contract Authority Rule

There must be exactly one source of truth for each stage's output contract.

The intended authority chain should be:

```text
Stage Contract Definition
        |
        +--> Agent Prompt
        |
        +--> Validator
        |
        +--> Persistence / Artifact Metadata
        |
        +--> Tests / Fixtures
```

NOT:

```text
Agent Prompt
        \
         > Validator with independent regexes
        /
Registry
```

The current architecture still has duplicated knowledge.

### Required invariant

For every stage:

```text
PROMPT FORMAT == CONTRACT SETTINGS == VALIDATOR == PERSISTED ARTIFACT
```

If one changes, the others must fail CI until updated.

---

# 3. Canonical Stage Matrix

| Stage | Output Artifact | Producer Format | Current Producer Contract | Current Validator | Status |
|---|---|---|---|---|---|
| Queen | `plan.md` | Markdown | `### Project Name`, `### Project Goal`, `### MVP Scope`, `### Technical Constraints`, `### Risks` | Looks for `# Project Plan` | **BROKEN** |
| Planner | `requirements.md` | Markdown | `### Features`, `### Functional Requirements`, `### Acceptance Criteria` | Broad heading regex | **PARTIALLY ALIGNED** |
| Architect | `architecture.md` | Markdown | `### Tech Stack`, `### Project Folder Structure`, `### Modules`, `### Conventions` | Structural architecture validator + broad heading check | **PARTIALLY ALIGNED** |
| System | `backend_spec.md` | Markdown | `### Database Design`, `### Seed Data`, `### API Endpoints`, etc. | Broad backend/API regex | **PARTIALLY ALIGNED** |
| Designer | `ui_spec.md` | Markdown | `### Design System`, `### Pages`, `### Components`, `### Global Feedback` | Broad UI regex | **PARTIALLY ALIGNED** |
| Blueprinter | `blueprint.md` | Markdown | Repeated `### File:` sections | Looks for Blueprint/File Structure or JSON | **BROKEN** |
| Coder | `workspace.manifest.json` | Generated JSON manifest | VFS files + generated manifest | Workspace manifest validation | **MOSTLY ALIGNED** |
| Tester | `test_report.md` | Deterministic verification report | Prompt explicitly unused | Markdown PASS/FAIL validator | **ARCHITECTURALLY DUPLICATED** |
| Debugger | `debug_report.md` | JSON patch response today | JSON patch schema | Markdown Debug Report + PASS/FAIL | **BROKEN** |
| Security | `security_report.md` | Markdown audit | `### Overall Status`, `### Security Score`, etc. | Markdown + PASS check | **BROKEN / WEAK** |
| Reviewer | `review_report.md` | JSON object | `{"status":"PASS",...}` | Markdown heading + PASS | **BROKEN** |

---

# 4. P0 Fix — Queen

## 4.1 Actual producer contract

File:

```text
src/lib/agents/ruflo/registry/Queen.ts
```

The prompt requires:

```text
### Project Name
### Project Goal
### MVP Scope
### Technical Constraints
### Risks
```

It also explicitly says:

```text
Start your output with "### Project Name" — nothing before it.
```

Therefore this is the authoritative Queen output shape.

## 4.2 Current validator defect

File:

```text
src/lib/agents/ruflo/stage-acceptance.ts
```

Current logic:

```ts
const hasPlanHeading =
  /#\s+(Project Plan|Plan|Executive Summary|Architectural Goal|Implementation Plan)/i.test(content);

if (!hasPlanHeading) {
  errors.push("Queen candidate output must contain '# Project Plan' heading.");
}
```

This is wrong.

It validates an artifact format that Queen no longer produces.

## 4.3 Required validator

Replace the Queen validator with exact canonical headings:

```ts
case 'Queen': {
  const requiredHeadings = [
    '### Project Name',
    '### Project Goal',
    '### MVP Scope',
    '### Technical Constraints',
    '### Risks',
  ];

  for (const heading of requiredHeadings) {
    if (!content.includes(heading)) {
      errors.push(`Queen candidate output must contain "${heading}".`);
    }
  }

  const projectName = extractRequiredSection(content, '### Project Name');
  const projectGoal = extractRequiredSection(content, '### Project Goal');
  const scope = extractRequiredSection(content, '### MVP Scope');
  const constraints = extractRequiredSection(content, '### Technical Constraints');
  const risks = extractRequiredSection(content, '### Risks');

  if (!projectName) errors.push('Queen Project Name section is empty.');
  if (!projectGoal) errors.push('Queen Project Goal section is empty.');
  if (!scope) errors.push('Queen MVP Scope section is empty.');
  if (!constraints) errors.push('Queen Technical Constraints section is empty.');
  if (!risks) errors.push('Queen Risks section is empty.');

  if (content.match(/^###\s+/gm)?.length !== 5) {
    warnings.push('Queen output contains unexpected additional H3 sections.');
  }

  return { accepted: errors.length === 0, errors, warnings };
}
```

Do NOT loosen this into:

```ts
content.length > 50
```

or:

```ts
content.includes('scope')
```

That simply converts a contract into decorative wallpaper.

---

# 5. Canonical Contract Settings

Create or extend the stage contract definitions so format knowledge is centralized.

Recommended structure:

```ts
export type MarkdownContract = {
  format: 'markdown';
  requiredHeadings?: string[];
  repeatedHeading?: string;
  requiredPatterns?: RegExp[];
  forbiddenPatterns?: RegExp[];
};

export type JsonContract = {
  format: 'json';
  schemaName: string;
};

export type StageOutputContract =
  | MarkdownContract
  | JsonContract;
```

Each stage should define:

```ts
output: {
  artifactName: 'plan.md',
  contract: 'QueenOutput',
  version: '1.0.0',
  format: 'markdown',
  requiredHeadings: [
    '### Project Name',
    '### Project Goal',
    '### MVP Scope',
    '### Technical Constraints',
    '### Risks'
  ]
}
```

The validator must consume this definition rather than re-inventing it.

---

# 6. Queen Prompt + Validator Tests

Add a fixture representing the exact Queen prompt output:

```md
### Project Name
Kanban Board

### Project Goal
A task management application for organizing work visually.

### MVP Scope
- Create tasks
- Move tasks between columns
- Persist board state

### Technical Constraints
No specific technical constraints mentioned.

### Risks
- State persistence may require careful synchronization.
```

Expected:

```text
ACCEPT
```

Negative fixture:

```md
# Project Plan
Kanban Board
```

Expected:

```text
REJECT
```

Negative fixture:

```md
### Project Name
Kanban Board

### Project Goal

### MVP Scope
- Create tasks

### Technical Constraints
None

### Risks
None
```

Expected:

```text
REJECT
```

---

# 7. Planner Contract

## Producer

File:

```text
src/lib/agents/ruflo/registry/Planner.ts
```

Canonical headings:

```text
### Features
### Functional Requirements
### Acceptance Criteria
```

## Validator problem

The current validator uses broad patterns:

```ts
/#\s+(Requirements|Project Requirements|Functional Requirements|Specification)/
```

This is not the actual Planner contract.

It should validate the exact three sections.

## Required checks

```text
### Features
### Functional Requirements
### Acceptance Criteria
```

Additionally:

### Features

Every feature must contain:

```text
Description
Priority
Depends On
```

### Functional Requirements

Must contain at least one testable requirement.

### Acceptance Criteria

Must contain criteria traceable to the features.

### Forbidden Planner content

Reject if Planner introduces:

```text
React
Express
PostgreSQL
Prisma
API routes
database schema
folder structure
source code
authentication
```

unless those terms were explicitly present in the user's requirements and are being preserved as requirements rather than architecture.

Planner's own prompt already prohibits architecture decisions. The validator should enforce this boundary.

---

# 8. Architect Contract

## Producer

File:

```text
src/lib/agents/ruflo/registry/Architect.ts
```

Canonical headings:

```text
### Tech Stack
### Project Folder Structure
### Modules
### Conventions
```

## Required validation

### Tech Stack

Must contain:

```text
Frontend
Frontend Entry Point
Backend
Backend Entry Point
Database
ORM
Authentication
Build Tool
Additional
```

### Project Folder Structure

Must contain a non-empty project tree.

### Modules

Each module must contain:

```text
Responsibility
Owned Files
Depends On
Supports Features
```

### Conventions

Must exist and be non-empty.

## Existing strong validation

`validateArchitectureArtifact()` already performs substantial structural checks:

- duplicate file ownership
- orphan module files
- unclaimed tree files
- invalid module dependencies
- dependency cycles
- Next.js route segment validation
- backend entry validation
- integration coverage

Keep this validator.

Do NOT replace it with regex checks.

## Required additional contract test

Ensure:

```text
Architecture Tech Stack
        ==
ProjectContract extracted from architecture
```

The validator must reject an architecture where:

```text
Frontend Entry Point: src/pages/index.tsx
```

but the folder tree contains:

```text
src/main.tsx
```

unless both are intentionally declared and the contract explains why.

---

# 9. System Contract

## Producer

File:

```text
src/lib/agents/ruflo/registry/System.ts
```

Canonical output begins:

```text
### Database Design
```

For backend projects it must include the sections defined by the System prompt, including:

```text
### Database Design
### Seed Data
### API Endpoints
```

and the remaining backend sections defined in that prompt.

For frontend-only projects the System agent has a special canonical output:

```md
### No Backend Required
This is a frontend-only project. No backend, database, or API endpoints are needed.
```

## Validator requirements

If architecture says:

```text
Backend: None
Database: None
```

then accept ONLY the no-backend contract.

If backend exists:

- database section required when database exists
- API endpoint section required when backend exists
- every endpoint must trace to a Planner feature
- every endpoint's auth requirement must respect architecture
- no invented User/Auth system
- no endpoint may contradict authentication settings

## Critical contradiction test

This must fail:

```text
Authentication: None
```

combined with:

```text
Auth Required: Yes
```

on an endpoint.

---

# 10. Designer Contract

## Producer

File:

```text
src/lib/agents/ruflo/registry/Designer.ts
```

Canonical headings:

```text
### Design System
### Pages
### Components
### Global Feedback
```

## Required checks

### Design System

Must define:

```text
Style
Breakpoints
Colors
Typography
a11y Baseline
```

### Pages

Each page must include:

```text
Trace
Layout
Auth/Session
Components
```

### Components

Each component must include:

```text
Trace
Used On
API Binding
Props/Inputs
Responsive Layout
a11y
States
```

### Global Feedback

Must define:

```text
Form Errors
Async Feedback
Destructive Actions
```

## Cross-contract validation

Every API Binding must reference an endpoint actually defined in:

```text
backend_spec.md
```

Every traced feature must exist in:

```text
requirements.md
```

Do not merely check whether the word `components` exists. That is how validators become astrology.

---

# 11. Blueprinter Contract

## Producer

File:

```text
src/lib/agents/ruflo/registry/Blueprinter.ts
```

Canonical format:

```text
### File: path/to/file.ext
```

There is no required `### Blueprint` heading.

## Current validator defect

Current validator looks for:

```regex
#\s+(Blueprint|Project Blueprint|File Ownership|File Structure)
```

or:

```regex
##\s+(Modules|Files|Dependencies|Architecture)
```

The producer instead emits:

```text
### File: ...
```

Therefore valid Blueprinter output can be rejected.

## Required validator

Validate repeated file blocks.

For every:

```text
### File: <path>
```

require:

```text
- **Purpose**:
- **Dependencies**:
- **Specs Required**:
- **Exports**:
```

Then validate:

```text
file path exists in architecture.md
```

and:

```text
file appears exactly once
```

and:

```text
file dependency ordering is valid
```

and:

```text
no blueprint file exists outside architecture folder structure
```

## Critical invariant

Blueprinter MUST NOT add files that Architect did not approve.

---

# 12. Coder Contract

## Producer

File:

```text
src/lib/agents/ruflo/registry/Coder.ts
```

Coder itself produces raw source code for one target file.

The canonical pipeline artifact is:

```text
workspace.manifest.json
```

generated after Coder writes to VFS.

This is the correct general architecture.

## Required invariants

The manifest must describe the actual VFS.

For every manifest file:

```text
manifest.path exists in VFS
manifest.hash == hash(VFS content)
```

The manifest must include:

```text
schemaVersion
projectRoot
files
directories
entryPoints
generatedAt
sourceStageExecutionId
```

## Required Coder enforcement

The canonical executor must ensure:

```text
Blueprint File
      |
      v
Coder targetFile
      |
      v
VFS write
      |
      v
Workspace manifest
```

NOT:

```text
Coder returns source code
      |
      X
discard source code
      |
      v
empty workspace manifest
```

Coder must write the target file to VFS through the canonical tool path.

---

# 13. Tester Contract

## Current architecture

File:

```text
src/lib/agents/ruflo/registry/Tester.ts
```

explicitly states:

```text
Tester is fully deterministic.
The orchestrator runs runLinter() directly.
This prompt is never sent to the LLM.
```

This is acceptable.

The problem is that the orchestrator currently calls:

```text
verifyAndRepairWorkspace()
```

and then invokes the canonical Tester contract again.

That creates two Tester semantics.

## Required architecture

Tester should have exactly one execution path:

```text
executeContractStage(Tester)
        |
        v
deterministic workspace verification
        |
        +--> VerificationRun
        |
        v
test_report.md
        |
        v
accepted artifact
```

Remove the duplicate:

```text
verifyAndRepairWorkspace()
```

Tester execution followed by another Tester execution.

## Test report contract

Canonical report:

```md
# Test Report

## Result

PASS

## Workspace

...

## Failures

None
```

or equivalent deterministic structure.

Validator must check actual deterministic fields rather than only:

```ts
/(PASS|FAIL)/i
```

---

# 14. Debugger Contract

## Current producer

File:

```text
src/lib/agents/ruflo/registry/Debugger.ts
```

Debugger produces JSON:

```json
{
  "patches": [
    {
      "file": "path/to/file.js",
      "startLine": 10,
      "endLine": 12,
      "replacement": "const x = 5;",
      "reason": "..."
    }
  ],
  "unfixable": []
}
```

## Current validator

The validator expects:

```text
# Debug Report
```

and:

```text
PASS / FAIL
```

This is incompatible.

## Required decision

Keep Debugger JSON. It is the better machine contract.

Change:

```text
debug_report.md
```

to a deterministic projection generated by the executor after applying the repair.

Pipeline:

```text
Tester failure
    |
    v
Debugger JSON
    |
    v
Validate JSON schema
    |
    v
Apply patches
    |
    v
Retest
    |
    v
Generate debug_report.md
```

The Debugger's LLM output should NOT itself be treated as the Markdown report.

## Required Debugger JSON validation

Validate:

```text
patches[]
file
startLine
endLine
replacement
reason
```

Rules:

```text
startLine >= 1
endLine >= startLine
file is safe relative VFS path
file exists unless creating a new file is explicitly allowed
replacement is string
reason is non-empty
```

Reject:

```text
absolute paths
../ traversal
patches outside workspace
empty patch
overlapping invalid ranges
```

---

# 15. Security Contract

## Producer

File:

```text
src/lib/agents/ruflo/registry/Security.ts
```

Canonical output:

```text
### Overall Status
### Security Score
### Vulnerabilities Found
### Security Checks Performed
### Recommendations
```

## Current validator problem

It checks for:

```text
# Security Report
```

or:

```text
## Result
```

which is not the producer contract.

It also accepts any occurrence of:

```text
PASS
```

This is too weak.

A report could contain:

```text
Authentication: PASS
Input Validation: FAIL
```

and still contain `PASS`.

That is not a security gate.

## Required validation

Parse:

```text
### Overall Status
```

and accept only:

```text
SECURE
SECURE_WITH_WARNINGS
VULNERABLE
CRITICAL
```

Map gate status:

```text
SECURE               -> PASS
SECURE_WITH_WARNINGS -> PASS_WITH_WARNINGS
VULNERABLE           -> FAIL
CRITICAL             -> FAIL
```

Require Security Score:

```text
0 <= score <= 100
```

Require all six security check categories:

```text
Authentication
Input Validation
Data Protection
Secret Management
API Security
Dependency Security
```

The final gate must use the parsed status, not a substring search.

---

# 16. Reviewer Contract

## Producer

File:

```text
src/lib/agents/ruflo/registry/Reviewer.ts
```

Reviewer produces JSON:

```json
{
  "status": "PASS",
  "findings": [],
  "summary": "..."
}
```

## Current validator defect

Validator expects Markdown:

```text
# Review Report
```

and checks:

```regex
/PASS/i
```

This is incompatible with the actual producer.

## Required validator

Parse JSON.

Schema:

```text
status:
  PASS | REPAIR_REQUIRED

findings:
  array

summary:
  non-empty string
```

Every finding requires:

```text
id
severity
category
description
```

If:

```text
status == REPAIR_REQUIRED
```

then final gate MUST reject completion.

Do not generate fake Markdown simply to satisfy the validator.

If:

```text
review_report.md
```

must remain the persisted artifact, generate it deterministically from the validated JSON:

```text
Reviewer JSON
    |
    v
validated
    |
    v
review_report.md projection
```

---

# 17. Contract Version Settings

Current versions are all:

```text
1.0.0
```

That is acceptable for the current migration, but prompt and validator versions are currently only metadata.

They must become meaningful.

For each stage:

```ts
{
  name: 'QueenOutput',
  version: '1.0.0',
  promptVersion: '1.0.0',
  validatorVersion: '1.0.0',
  outputArtifactName: 'plan.md'
}
```

must mean:

```text
promptVersion
    = exact producer contract version

validatorVersion
    = exact validator implementation contract version

version
    = artifact schema version
```

If the Queen heading contract changes:

```text
promptVersion: 1.1.0
validatorVersion: 1.1.0
version: 1.1.0
```

Do not silently modify the validator while leaving:

```text
validatorVersion: 1.0.0
```

---

# 18. Central Contract Definition

Recommended target:

```ts
export const STAGE_CONTRACTS = {
  Queen: {
    name: 'Queen',
    version: '1.1.0',
    output: {
      artifact: 'plan.md',
      format: 'markdown',
      requiredHeadings: [
        '### Project Name',
        '### Project Goal',
        '### MVP Scope',
        '### Technical Constraints',
        '### Risks',
      ],
    },
  },

  Planner: {
    name: 'Planner',
    version: '1.1.0',
    output: {
      artifact: 'requirements.md',
      format: 'markdown',
      requiredHeadings: [
        '### Features',
        '### Functional Requirements',
        '### Acceptance Criteria',
      ],
    },
  },

  Architect: {
    name: 'Architect',
    version: '1.1.0',
    output: {
      artifact: 'architecture.md',
      format: 'markdown',
      requiredHeadings: [
        '### Tech Stack',
        '### Project Folder Structure',
        '### Modules',
        '### Conventions',
      ],
    },
  },

  System: {
    name: 'System',
    version: '1.1.0',
    output: {
      artifact: 'backend_spec.md',
      format: 'markdown',
      variants: ['backend', 'no-backend'],
    },
  },

  Designer: {
    name: 'Designer',
    version: '1.1.0',
    output: {
      artifact: 'ui_spec.md',
      format: 'markdown',
      requiredHeadings: [
        '### Design System',
        '### Pages',
        '### Components',
        '### Global Feedback',
      ],
    },
  },

  Blueprinter: {
    name: 'Blueprinter',
    version: '1.1.0',
    output: {
      artifact: 'blueprint.md',
      format: 'markdown',
      repeatedHeading: '### File:',
    },
  },

  Coder: {
    name: 'Coder',
    version: '1.1.0',
    output: {
      artifact: 'workspace.manifest.json',
      format: 'workspace-manifest',
    },
  },

  Tester: {
    name: 'Tester',
    version: '1.1.0',
    output: {
      artifact: 'test_report.md',
      format: 'deterministic-test-report',
    },
  },

  Debugger: {
    name: 'Debugger',
    version: '1.1.0',
    output: {
      artifact: 'debug_report.md',
      format: 'debug-report-projection',
      inputFormat: 'debug-patch-json',
    },
  },

  Security: {
    name: 'Security',
    version: '1.1.0',
    output: {
      artifact: 'security_report.md',
      format: 'security-report',
      requiredHeadings: [
        '### Overall Status',
        '### Security Score',
        '### Vulnerabilities Found',
        '### Security Checks Performed',
        '### Recommendations',
      ],
    },
  },

  Reviewer: {
    name: 'Reviewer',
    version: '1.1.0',
    output: {
      artifact: 'review_report.md',
      format: 'review-report-projection',
      inputFormat: 'review-json',
    },
  },
};
```

This should become the contract registry's format authority.

---

# 19. Validator Architecture

Do NOT keep one enormous switch statement containing arbitrary regexes.

Recommended structure:

```text
stage-acceptance.ts
        |
        +-- validateQueen()
        +-- validatePlanner()
        +-- validateArchitect()
        +-- validateSystem()
        +-- validateDesigner()
        +-- validateBlueprinter()
        +-- validateCoder()
        +-- validateTester()
        +-- validateDebugger()
        +-- validateSecurity()
        +-- validateReviewer()
```

Common utilities:

```text
requireHeading()
requireSection()
requireNonEmptySection()
requireJson()
requireEnum()
requireSafePath()
requireTraceability()
```

The stage-specific validator should enforce semantic invariants.

---

# 20. Prompt/Validator Synchronization Test

Create:

```text
src/lib/agents/ruflo/contracts/__tests__/prompt-contract-sync.test.ts
```

For every stage, verify that the canonical prompt's required output shape is compatible with the validator.

Minimum tests:

```text
Queen prompt -> Queen fixture -> ACCEPT
Planner prompt -> Planner fixture -> ACCEPT
Architect prompt -> Architect fixture -> ACCEPT
System prompt -> System fixture -> ACCEPT
Designer prompt -> Designer fixture -> ACCEPT
Blueprinter prompt -> Blueprint fixture -> ACCEPT
Coder manifest -> Coder validator -> ACCEPT
Tester report -> Tester validator -> ACCEPT
Debugger JSON -> Debugger validator -> ACCEPT
Security report -> Security validator -> ACCEPT
Reviewer JSON -> Reviewer validator -> ACCEPT
```

---

# 21. Contract Registry Synchronization Test

Create:

```text
src/lib/agents/ruflo/contracts/__tests__/contract-sync.test.ts
```

Check:

```text
Every STAGE has CONTRACT_VERSIONS entry
Every STAGE has STAGE_CONTRACT entry
Every STAGE has AGENT_DEFS entry
Every STAGE has a validator
Every output artifact has exactly one producer
Every input artifact has exactly one producer
Every output artifact filename matches versions.ts
```

Also verify:

```text
Queen -> plan.md
Planner -> requirements.md
Architect -> architecture.md
System -> backend_spec.md
Designer -> ui_spec.md
Blueprinter -> blueprint.md
Coder -> workspace.manifest.json
Tester -> test_report.md
Debugger -> debug_report.md
Security -> security_report.md
Reviewer -> review_report.md
```

---

# 22. Contract Fixture Test Matrix

Create:

```text
src/lib/agents/ruflo/contracts/__fixtures__/
```

Recommended:

```text
queen.valid.md
queen.invalid-heading.md
queen.empty-section.md

planner.valid.md
planner.invalid.md

architect.valid.md
architect.duplicate-owner.md
architect.orphan-file.md
architect.invalid-dependency.md

system.valid.md
system.no-backend.md
system.auth-contradiction.md

designer.valid.md
designer.invalid-api-binding.md

blueprint.valid.md
blueprint.missing-file-metadata.md
blueprint.undeclared-file.md

coder.valid-manifest.json
coder.hash-mismatch.json
coder.empty-workspace.json

tester.pass.md
tester.fail.md

debugger.valid.json
debugger.invalid-path.json
debugger.invalid-range.json

security.secure.md
security.warning.md
security.vulnerable.md
security.critical.md

reviewer.pass.json
reviewer.repair-required.json
reviewer.invalid.json
```

---

# 23. Negative Tests That MUST Fail

## Queen

```text
# Project Plan
```

must not be accepted as a substitute for the canonical contract.

## Planner

Missing:

```text
### Acceptance Criteria
```

must fail.

## Architect

Two modules owning the same file must fail.

## System

Authentication contradiction must fail.

## Designer

API endpoint not present in backend spec must fail.

## Blueprinter

File not present in architecture tree must fail.

## Coder

Manifest hash mismatch must fail.

## Tester

No explicit PASS/FAIL result must fail.

## Debugger

Absolute path:

```text
/etc/passwd
```

must fail.

## Security

```text
### Overall Status
VULNERABLE
```

must fail final security gate.

## Reviewer

```json
{
  "status": "REPAIR_REQUIRED"
}
```

must fail final gate.

---

# 24. Remove `assertArtifactCompatibility()` From Output Validation

Current `contract-executor.ts` performs:

```ts
assertInputCompatibility(...)
assertOutputCompatibility(...)
assertArtifactCompatibility(...)
```

The last call compares the current stage's produced output against the current stage's input requirements.

That is conceptually incorrect.

Example:

```text
Coder output:
CoderOutput

Coder input:
BlueprintOutput
ArchitectureOutput
SystemOutput
DesignerOutput
```

There is no reason to compare `CoderOutput` against those input contracts.

Required:

```text
assertInputCompatibility()
```

for inputs.

```text
assertOutputCompatibility()
```

for outputs.

Remove:

```ts
assertArtifactCompatibility(...)
```

from this location.

Keep the helper only if it has a legitimate consumer elsewhere.

---

# 25. Remove Validator Regex Duplication

Current patterns such as:

```ts
/#\s+(Project Plan|Plan|Executive Summary|Architectural Goal|Implementation Plan)/
```

should not exist as free-floating alternatives.

Do not make validators accept every historical format.

Bad:

```text
# Project Plan
# Plan
# Executive Summary
# Architectural Goal
# Implementation Plan
### Project Name
### Whatever
```

Good:

```text
### Project Name
### Project Goal
### MVP Scope
### Technical Constraints
### Risks
```

The pipeline should be strict because the entire purpose of canonical contracts is deterministic interoperability.

---

# 26. Orchestrator Cleanup

File:

```text
src/lib/agents/ruflo/orchestrator.ts
```

Current VFS map omits:

```text
Coder
Tester
Debugger
```

This is intentional in some cases, but it must not create parallel execution semantics.

Required final ownership:

```text
Queen       -> executeContractStage
Planner     -> executeContractStage
Architect   -> executeContractStage
System      -> executeContractStage
Designer    -> executeContractStage
Blueprinter -> executeContractStage
Coder       -> executeContractStage
Tester      -> executeContractStage
Debugger    -> executeContractStage / verification subroutine
Security    -> executeContractStage
Reviewer    -> executeContractStage
```

No stage should have a hidden second execution path.

---

# 27. Tester/Debugger Canonical Flow

Required final pipeline:

```text
Coder
  |
  v
workspace.manifest.json
  |
  v
Tester
  |
  +---- PASS ----> Security
  |
  +---- FAIL ----> Debugger
                     |
                     v
                  Apply Patch
                     |
                     v
                   Tester
                     |
              +------+------+
              |             |
             PASS          FAIL
              |             |
              v             v
          continue       retry/abort
```

Each Debugger repair must produce:

```text
StageExecution(Debugger)
```

and:

```text
debug_report.md
```

The verification loop must not silently bypass the contract system.

---

# 28. Security and Reviewer Must Be Current-State Bound

Security and Reviewer consume the generated workspace.

Their accepted artifacts must be invalidated if:

```text
workspace.manifest.json changes
```

or any relevant upstream dependency changes.

Required dependency fingerprint:

```text
Security
  -> workspace.manifest
  -> architecture

Reviewer
  -> workspace.manifest
  -> architecture
  -> test_report
```

The current Reviewer registry only declares:

```text
test_report.md
architecture.md
```

This should be expanded if Reviewer is actually reviewing generated source code.

The reviewer cannot meaningfully review code while only depending on a test report and architecture document.

---

# 29. Final Gate Requirements

Final gate must require:

```text
Queen ACCEPTED
Planner ACCEPTED
Architect ACCEPTED
System ACCEPTED
Designer ACCEPTED
Blueprinter ACCEPTED
Coder ACCEPTED
Tester ACCEPTED
Security ACCEPTED
Reviewer ACCEPTED
VerificationRun SUCCESS
Current workspace hash == verification workspace hash
Active valid lease
```

Debugger is required when a repair cycle occurred.

Remove legacy fallback acceptance for:

```text
securityStageOutput
reviewerStageOutput
```

Final gate must consume canonical artifacts only.

---

# 30. Package Scripts

Current `package.json` does not expose the pipeline invariant scanner.

Add:

```json
{
  "scripts": {
    "pipeline:check": "tsx scripts/check_pipeline_invariants.ts",
    "test": "..."
  }
}
```

Use the repository's existing test runner rather than inventing another test framework.

The CI gate should execute:

```text
npm run pipeline:check
npm test
npm run build
```

as appropriate for the existing environment.

---

# 31. Actual Verification Performed During This Audit

The repository source at commit:

```text
c89461a3bbe347a9479b5c123c15999395ca3f64
```

was inspected for:

```text
contracts/versions.ts
contracts/registry.ts
contracts/compatibility.ts
contracts/schemas/coder.ts
contract-executor.ts
stage-acceptance.ts
orchestrator.ts
verification-loop.ts
agents.ts
registry/*.ts
package.json
```

A direct local repository clone could not be executed in this environment because the execution environment has no outbound GitHub DNS/network access.

A self-contained reproduction of the relevant heading checks confirms the core class of defect: producer headings and validator expectations are not consistently identical.

Therefore this document distinguishes:

```text
REPO-SOURCE AUDIT
```

from:

```text
LOCAL FULL TEST SUITE EXECUTION
```

The latter still needs to be run in the actual development environment.

---

# 32. Immediate Implementation Order

## P0-1 — Fix Queen

Files:

```text
src/lib/agents/ruflo/stage-acceptance.ts
src/lib/agents/ruflo/contracts/versions.ts
src/lib/agents/ruflo/contracts/registry.ts
```

Make validator consume the exact Queen contract.

---

## P0-2 — Fix All Markdown Stage Contracts

Update:

```text
Planner
Architect
System
Designer
Blueprinter
Security
```

so validators validate the actual producer format.

Do NOT broaden regexes.

---

## P0-3 — Fix JSON Stage Contracts

Fix:

```text
Debugger
Reviewer
```

to validate the JSON actually produced by their prompts.

---

## P0-4 — Fix Tester Architecture

Remove duplicate Tester execution.

There must be one deterministic verification path.

---

## P0-5 — Canonicalize Debugger

Make Debugger:

```text
JSON patch -> schema validation -> VFS patch -> debug report projection
```

---

## P0-6 — Strengthen Security Gate

Parse:

```text
Overall Status
Security Score
Security Checks
```

and gate on the actual status.

---

## P0-7 — Strengthen Reviewer Gate

Parse:

```text
status
findings
summary
```

and gate on:

```text
status === PASS
```

---

## P1-1 — Centralize Contract Settings

Move format definitions into the canonical registry.

---

## P1-2 — Add Prompt/Validator Sync Tests

Every stage needs at least one valid producer fixture.

---

## P1-3 — Remove Legacy Output Paths

Remove:

```text
legacy Security output
legacy Reviewer output
generateStageCandidate()
duplicate Tester path
direct Debugger inference path
```

where no legitimate consumer remains.

---

## P1-4 — Make Pipeline Invariants Runnable

Add the invariant scanner to package scripts and CI.

---

# 33. Definition of Done

The contract system is considered fixed only when:

- [ ] Queen's current prompt output passes validation.
- [ ] Planner's current prompt output passes validation.
- [ ] Architect's current prompt output passes validation.
- [ ] System's current prompt output passes validation.
- [ ] Designer's current prompt output passes validation.
- [ ] Blueprinter's current prompt output passes validation.
- [ ] Coder-generated workspace manifest passes validation.
- [ ] Tester deterministic report passes validation.
- [ ] Debugger's actual JSON output passes validation.
- [ ] Security's actual report passes validation.
- [ ] Reviewer's actual JSON output passes validation.
- [ ] Every stage has a valid contract version.
- [ ] Every stage has exactly one producer.
- [ ] Every stage has exactly one canonical validator.
- [ ] Prompt format and validator format are synchronized.
- [ ] Accepted artifacts contain correct provenance.
- [ ] Input compatibility is checked.
- [ ] Output compatibility is checked.
- [ ] Dependency fingerprints are checked.
- [ ] No stage bypasses the canonical executor without an explicitly documented deterministic reason.
- [ ] No legacy Security/Reviewer fallbacks remain.
- [ ] Debugger StageExecution lifecycle is canonical.
- [ ] Tester/Debugger verification loop is canonical.
- [ ] Final gate consumes canonical artifacts only.
- [ ] Contract sync tests pass.
- [ ] Pipeline invariant checks pass.
- [ ] Full project build passes.

---

# 34. Final Diagnosis

The current Queen failure is **not caused by the model generating an invalid document**.

The model generated according to its prompt.

The validator rejected according to a stale/different contract.

The correct fix is therefore:

```text
DO NOT weaken Queen validation.
DO NOT force the model to invent "# Project Plan".
DO NOT add another fallback heading.

Instead:

Queen Prompt
      |
      v
### Project Name
### Project Goal
### MVP Scope
### Technical Constraints
### Risks
      |
      v
Queen Contract v1.1.0
      |
      v
Queen Validator
      |
      v
plan.md
```

Then apply the exact same principle to all 11 stages.

The pipeline is supposed to be contract-driven. At the moment, several contracts are merely wearing the same name while disagreeing about what they mean. Fix the definitions first, then the validators, then the execution paths.
