# AutoCoder — Reviewer & Security Contract Remediation Plan

**Scope:** C-04–C-09, C-20, C-23, C-24  
**Source of truth:** `d5d168b18f23298b724d6153a54d7e7662a15501`  
**Primary objective:** Remove the remaining legacy JSON/schema authority from Reviewer and reconcile the Security Markdown producer with the current Markdown contract/validator architecture.

---

## 1. Executive Summary

The current Reviewer and Security problems are primarily **contract convergence failures**, not failures of the newer pipeline architecture.

The current pipeline already has the right general direction:

```text
Stage Agent
    ↓
Markdown artifact
    ↓
Markdown parser
    ↓
Stage acceptance
    ↓
Accepted artifact
    ↓
Final gate
```

Reviewer has not completed that migration:

```text
Reviewer prompt
    ↓
legacy JSON
    ↓
JSON parser/schema
    ↓
workspaceHash mutation
```

Security is further along, but its producer and consumer disagree:

```text
Security prompt
    ↓
Markdown with:
Overall Status
Security Score
Vulnerabilities Found
Security Checks Performed
Recommendations
    ↓
legacy parser expects:
Status
Vulnerabilities
Recommendations
Workspace Hash
```

The fix is therefore to establish **one Markdown contract per stage** and remove the old JSON schema authority.

---

# 2. Issues Covered

| Issue | Problem | Target |
|---|---|---|
| C-04 | Reviewer prompt/schema mismatch | Markdown Reviewer contract |
| C-05 | Reviewer registry declares JSON for `.md` artifact | `format: markdown` |
| C-06 | Security prompt headings differ from parser | One canonical Markdown structure |
| C-07 | Security prompt allows statuses parser rejects | Align status semantics |
| C-08 | Security prompt does not define Workspace Hash | Make hash an explicit contract field |
| C-09 | Executor mutates Security report after generation | Remove report mutation |
| C-20 | Reviewer workspace hash injected by executor | Reporter/contract owns the field |
| C-23 | Reviewer fields represent different concepts from prompt | Reconcile prompt/schema/parser |
| C-24 | Security `requiredHeadings` disagree with active prompt | Update registry/parser together |

---

# 3. Core Architectural Rule

Do **not** preserve the old JSON schemas as compatibility layers.

The desired architecture is:

```text
                    ┌────────────────────┐
                    │   Stage Prompt     │
                    └─────────┬──────────┘
                              │
                              ▼
                    Markdown artifact
                              │
                              ▼
                    Markdown parser
                              │
                              ▼
                    Semantic validation
                              │
                              ▼
                     Stage acceptance
                              │
                              ▼
                      Artifact store
```

The following must not remain as active authorities:

```text
LLM JSON schema
JSON.parse()
executor field injection
legacy JSON-only interfaces
```

The Markdown artifact itself is the stage contract.

---

# 4. Reviewer Target Contract

## 4.1 Canonical Reviewer artifact

```text
review_report.md
```

## 4.2 Canonical Markdown structure

Use these exact sections:

```md
### Overall Assessment

...

### Quality Score

...

### Architectural Conformance

...

### Requirement Coverage

...

### Findings

...

### Workspace Hash

...
```

These sections map directly to the semantic fields already required by the current Reviewer acceptance/final-gate logic:

| Markdown section | Parsed field |
|---|---|
| Overall Assessment | `summary` |
| Quality Score | `qualityScore` |
| Architectural Conformance | `architecturalConformance` |
| Requirement Coverage | `requirementCoverage` |
| Findings | `findings` |
| Workspace Hash | `workspaceHash` |

This avoids throwing away useful existing semantics merely because the old implementation serialized them as JSON.

---

# 5. Reviewer Prompt Replacement

## File

```text
src/lib/agents/ruflo/registry/Reviewer.ts
```

Replace the current JSON-producing prompt with a Markdown-only prompt.

Recommended prompt:

```ts
export const systemPrompt = `You are a senior software reviewer.

You receive the project's accepted specification artifacts, architecture, generated workspace, and verification evidence.

Your responsibility is to determine whether the generated project:

1. Satisfies the defined requirements.
2. Conforms to the accepted architecture.
3. Meets the expected implementation quality.
4. Has a workspace state consistent with the review being performed.

Review the actual project evidence available to you. Do not infer implementation details that are not supported by the provided files or verification evidence.

## REVIEW PROCESS

1. Inspect the relevant project files.
2. Compare implementation against the accepted requirements.
3. Compare implementation against the accepted architecture.
4. Review the latest verification evidence.
5. Identify concrete defects, omissions, regressions, or architectural violations.
6. Assign a quality score from 0 to 100.
7. Determine architectural conformance.
8. Determine requirement coverage.
9. Record the current workspace hash provided by the review context.
10. Produce the final Markdown review report.

## FINDING RULES

Every finding must be supported by actual project evidence.

For each finding include:

- Finding identifier
- Severity
- Category
- File path when applicable
- Concrete description
- Evidence or reason

Use these severity levels:

- HIGH
- MEDIUM
- LOW

Do not invent findings.

Do not report style preferences as defects unless they violate an accepted project requirement, architecture rule, or explicit quality constraint.

## QUALITY SCORE

The quality score must reflect the actual state of the generated project.

Consider:

- Requirement fulfillment
- Architectural conformance
- Implementation correctness
- Maintainability
- Verification results
- Presence of unresolved defects

A score below 80 is not release-ready.

## ARCHITECTURAL CONFORMANCE

Set the value to:

PASS

when the implementation conforms to the accepted architecture.

Set the value to:

FAIL

when the implementation violates an accepted architectural constraint.

## REQUIREMENT COVERAGE

Set the value to:

PASS

when the accepted requirements are adequately implemented.

Set the value to:

FAIL

when one or more required capabilities are missing or materially incomplete.

## REQUIRED MARKDOWN OUTPUT

Your entire output must be a Markdown review report containing exactly these sections:

### Overall Assessment

Provide a concise overall assessment of the project.

### Quality Score

Write one integer from 0 to 100.

### Architectural Conformance

Write exactly one of:

PASS
FAIL

Then provide a concise explanation.

### Requirement Coverage

Write exactly one of:

PASS
FAIL

Then provide a concise explanation.

### Findings

List every concrete finding.

For each finding use:

**FINDING-001**
- Severity: HIGH
- Category: Requirements
- File: `path/to/file`
- Description: Concrete defect or omission.
- Evidence: Specific evidence supporting the finding.

Continue numbering findings sequentially.

If no findings exist, write:

No findings.

### Workspace Hash

Write the current workspace hash supplied by the review context.

The report must contain actual evidence from the reviewed project and must reflect the workspace state that was reviewed.`;
```

### Important

The prompt intentionally uses **only Markdown as its output contract**.

Do not describe the retired JSON structure inside the prompt. The model does not need a museum exhibit explaining the old system.

---

# 6. Reviewer Registry Metadata

## File

```text
src/lib/agents/ruflo/contracts/versions.ts
```

Change:

```ts
Reviewer: {
  name: 'ReviewerOutput',
  version: '1.2.0',
  promptVersion: '1.2.0',
  validatorVersion: '1.2.0',
  outputArtifactName: 'review_report.md',
  format: 'json',
},
```

to:

```ts
Reviewer: {
  name: 'ReviewerOutput',
  version: '1.2.0',
  promptVersion: '1.2.0',
  validatorVersion: '1.2.0',
  outputArtifactName: 'review_report.md',
  format: 'markdown',
  requiredHeadings: [
    '### Overall Assessment',
    '### Quality Score',
    '### Architectural Conformance',
    '### Requirement Coverage',
    '### Findings',
    '### Workspace Hash',
  ],
},
```

---

# 7. Reviewer Schema Migration

## File

```text
src/lib/agents/ruflo/contracts/schemas/reviewer.ts
```

The current schema is the main legacy authority.

It currently:

- declares version `1.0.0`
- calls the output JSON
- calls `JSON.parse()`
- expects JSON properties
- validates a JSON object rather than the Markdown artifact

Replace that model with a Markdown parser.

---

## 7.1 Target interface

The interface can remain semantically similar:

```ts
export interface ReviewerOutput {
  summary: string;
  qualityScore: number;
  architecturalConformance: boolean;
  requirementCoverage: boolean;
  workspaceHash: string;
  findings: string[];
}
```

The important change is that these fields are now extracted from Markdown sections rather than JSON properties.

---

## 7.2 Target schema metadata

```ts
export const REVIEWER_SCHEMA = {
  contractName: 'ReviewerOutput',
  version: '1.2.0',
  requiredFields: [
    'summary',
    'qualityScore',
    'architecturalConformance',
    'requirementCoverage',
    'workspaceHash',
    'findings',
  ],
  mandatoryInvariants: [
    'Quality score must be an integer between 0 and 100',
    'Architectural conformance must be explicitly PASS or FAIL',
    'Requirement coverage must be explicitly PASS or FAIL',
    'Workspace hash must be a valid SHA-256 fingerprint',
    'Reviewer findings must be grounded in actual project evidence',
  ],
} as const;
```

---

# 8. Reviewer Markdown Parser

Implement:

```ts
parseReviewerOutput(content: string)
```

using the existing:

```ts
countHeading()
extractRequiredSection()
```

utilities.

Required sections:

```text
Overall Assessment
Quality Score
Architectural Conformance
Requirement Coverage
Findings
Workspace Hash
```

---

## 8.1 Structural checks

Reject:

- empty report
- missing section
- duplicate section
- empty required section

---

## 8.2 Quality Score

Extract the Quality Score section and parse the first valid integer.

Valid:

```text
85
```

Invalid:

```text
eighty five
```

Invalid:

```text
101
```

Invalid:

```text
-1
```

Accepted range:

```text
0–100
```

---

## 8.3 Architectural Conformance

The parser should recognize:

```text
PASS
```

or:

```text
FAIL
```

as the first meaningful token.

Map:

```text
PASS → true
FAIL → false
```

Do not use vague substring matching such as:

```ts
text.includes('PASS')
```

because a sentence like:

```text
PASS is not justified because...
```

could be misclassified.

---

## 8.4 Requirement Coverage

Apply the same explicit-token logic:

```text
PASS → true
FAIL → false
```

---

## 8.5 Workspace Hash

Require:

```text
64 hexadecimal characters
```

Example:

```text
9e107d9d372bb6826bd81d3542a419d6...
```

The parser should return the normalized hash.

---

## 8.6 Findings

Treat the Findings section as Markdown evidence.

The parser should preserve the section content as a string/list representation rather than attempting to build a complicated semantic finding engine.

The Reviewer stage's job is to produce evidence.

The validator's job is to ensure the report is structurally valid and meets objective release criteria.

---

# 9. Remove Reviewer Executor Mutation

## File

```text
src/lib/agents/ruflo/contract-executor.ts
```

Delete the Reviewer-specific logic:

```ts
try {
  const parsed = JSON.parse(candidateContent);
  if (parsed && typeof parsed === 'object') {
    parsed.workspaceHash = currentWorkspaceHash;
    candidateContent = JSON.stringify(parsed, null, 2);
  }
} catch {
  // Leave unchanged if not raw JSON
}
```

The executor must not rewrite the Reviewer artifact after generation.

Target:

```ts
} else if (stageName === 'Reviewer') {
  const agentResult = await runAgent(
    conversationId,
    'Reviewer',
    userPromptText,
    onEvent,
    ledger,
    attempt,
    customUserContent,
    signal,
    undefined,
    targetFile,
    true
  );

  candidateContent = agentResult?.content || '';
}
```

Then the candidate flows directly into normal validation.

---

# 10. Reviewer Workspace Hash Ownership

The hash has an important purpose:

```text
review report
     ↓
proves which workspace was reviewed
```

Therefore the hash must not be silently rewritten after generation.

The better flow is:

```text
Executor computes current workspace hash
        ↓
Hash is included in Reviewer context/input
        ↓
Reviewer writes that hash into report
        ↓
Parser extracts hash
        ↓
Stage acceptance compares it with current workspace
```

This makes the report self-contained and auditable.

If the current orchestration layer does not currently expose the hash to the Reviewer prompt, add it to the Reviewer context rather than mutating the completed artifact afterward.

---

# 11. Security Target Contract

Security is already Markdown-based at the producer level.

The main problem is that the producer and consumer describe different Markdown documents.

The current prompt produces:

```text
### Overall Status
### Security Score
### Vulnerabilities Found
### Security Checks Performed
### Recommendations
```

The parser expects:

```text
### Status
### Vulnerabilities
### Recommendations
### Workspace Hash
```

Do not maintain both.

Use the richer current Security prompt structure as the canonical report structure.

---

# 12. Canonical Security Markdown Structure

Use:

```md
### Overall Status

...

### Security Score

...

### Vulnerabilities Found

...

### Security Checks Performed

...

### Recommendations

...

### Workspace Hash

...
```

This preserves the information already requested by the Security auditor while adding the workspace-binding field required by the pipeline.

---

# 13. Security Registry Metadata

## File

```text
src/lib/agents/ruflo/contracts/versions.ts
```

Change:

```ts
Security: {
  name: 'SecurityOutput',
  version: '1.2.0',
  promptVersion: '1.2.0',
  validatorVersion: '1.2.0',
  outputArtifactName: 'security_report.md',
  format: 'markdown',
  requiredHeadings: [
    '### Status',
    '### Vulnerabilities',
    '### Recommendations',
    '### Workspace Hash',
  ],
},
```

to:

```ts
Security: {
  name: 'SecurityOutput',
  version: '1.2.0',
  promptVersion: '1.2.0',
  validatorVersion: '1.2.0',
  outputArtifactName: 'security_report.md',
  format: 'markdown',
  requiredHeadings: [
    '### Overall Status',
    '### Security Score',
    '### Vulnerabilities Found',
    '### Security Checks Performed',
    '### Recommendations',
    '### Workspace Hash',
  ],
},
```

---

# 14. Security Schema Migration

## File

```text
src/lib/agents/ruflo/contracts/schemas/security.ts
```

Current schema version:

```ts
1.0.0
```

Change to:

```ts
1.2.0
```

The schema should represent the Markdown report.

Recommended interface:

```ts
export type SecurityStatusToken =
  | 'SECURE'
  | 'SECURE_WITH_WARNINGS'
  | 'VULNERABLE'
  | 'CRITICAL';

export interface SecurityOutput {
  status: SecurityStatusToken;
  securityScore: number;
  vulnerabilities: string;
  checksPerformed: string;
  recommendations: string;
  workspaceHash: string;
}
```

---

# 15. Security Status Semantics

This is a key correction to C-07.

The current prompt defines four meaningful states:

```text
SECURE
SECURE_WITH_WARNINGS
VULNERABLE
CRITICAL
```

The parser currently rejects:

```text
VULNERABLE
CRITICAL
```

That is incorrect if Security is supposed to produce an audit report.

A security auditor must be allowed to report that the project is vulnerable.

The distinction should be:

### Security parser

Determines whether the report is structurally valid.

It should accept all four legitimate status tokens.

### Security stage/final gate

Determines whether the project is release-eligible.

Only:

```text
SECURE
SECURE_WITH_WARNINGS
```

should satisfy the final release gate.

Therefore:

```text
Security report:
VULNERABLE
        ↓
valid Security artifact
        ↓
Final Gate
        ↓
FAIL
```

This is substantially cleaner than making the parser reject the truth reported by the auditor.

---

# 16. Security Score Parser

Parse:

```text
0–100
```

as an integer.

Reject:

```text
-1
101
N/A
unknown
```

The score should be validated independently of the status token.

The parser does not need to independently prove that the score mathematically corresponds to the status.

That semantic policy belongs to the Security contract/prompt and, where needed, final-gate policy.

---

# 17. Security Vulnerability Section

Map:

```text
### Vulnerabilities Found
```

to:

```ts
vulnerabilities
```

Do not rename it to the shorter legacy:

```text
### Vulnerabilities
```

The richer heading is already the active producer contract.

---

# 18. Security Checks Section

Add:

```ts
checksPerformed
```

to the interface.

This information is currently produced by the Security prompt but discarded by the legacy parser.

That is a contract-loss bug.

The report should preserve:

```text
Authentication
Input Validation
Data Protection
Secret Management
API Security
Dependency Security
```

and their results.

---

# 19. Security Workspace Hash

The Security report must explicitly contain:

```md
### Workspace Hash
<sha256>
```

The Security prompt should be given the current workspace fingerprint through its execution context.

The Security agent then reports that exact value.

The parser validates the format.

Stage acceptance compares it to:

```ts
ctx.evidence.currentWorkspaceHash
```

This preserves the existing freshness check.

---

# 20. Remove Security Executor Mutation

## File

```text
src/lib/agents/ruflo/contract-executor.ts
```

Current behavior:

```ts
if (!candidateContent.includes('### Workspace Hash')) {
  candidateContent = `${candidateContent.trim()}\n\n### Workspace Hash\n${currentWorkspaceHash}\n`;
}
```

Remove this behavior.

The executor must not manufacture missing contract sections after the LLM response.

Target:

```ts
} else if (stageName === 'Security') {
  const agentResult = await runAgent(
    conversationId,
    'Security',
    userPromptText,
    onEvent,
    ledger,
    attempt,
    customUserContent,
    signal,
    undefined,
    targetFile,
    true
  );

  candidateContent = agentResult?.content || '';
}
```

If the Security agent fails to produce the hash, validation should fail.

That is a genuine contract violation and should remain visible.

---

# 21. Security Parser Target

Required sections:

```text
Overall Status
Security Score
Vulnerabilities Found
Security Checks Performed
Recommendations
Workspace Hash
```

Validation:

### Overall Status

Must be one of:

```text
SECURE
SECURE_WITH_WARNINGS
VULNERABLE
CRITICAL
```

### Security Score

Integer:

```text
0–100
```

### Vulnerabilities Found

Must be non-empty.

If no vulnerabilities exist, the canonical text should be:

```text
No vulnerabilities found. The code passed security review.
```

### Security Checks Performed

Must be non-empty.

### Recommendations

Must be non-empty.

### Workspace Hash

Must contain a valid SHA-256 fingerprint.

---

# 22. Security Stage Acceptance

## File

```text
src/lib/agents/ruflo/stage-acceptance.ts
```

Current:

```ts
const { output, errors } = parseSecurityOutput(content);
```

Keep this.

Add semantic validation only for objective contract rules.

Recommended behavior:

```text
Parser says report is structurally valid
        ↓
workspace hash must match current workspace
        ↓
artifact accepted
```

Do **not** reject `VULNERABLE` or `CRITICAL` merely because the status is negative.

The final gate should determine release eligibility.

This allows the pipeline to preserve a truthful Security artifact even when the project fails security.

---

# 23. Final Gate Security Logic

## File

```text
src/lib/agents/ruflo/final-gate.ts
```

The existing final gate already contains the correct high-level policy:

```ts
if (output.status !== 'SECURE' && output.status !== 'SECURE_WITH_WARNINGS') {
  errors.push(...);
}
```

Keep that policy.

The important change is to ensure the parser can actually return:

```text
VULNERABLE
CRITICAL
```

so that the final gate can correctly reject them.

Current broken architecture:

```text
VULNERABLE
    ↓
parser rejects it
```

Target:

```text
VULNERABLE
    ↓
valid Security artifact
    ↓
final gate rejects release
```

This makes the failure reason explicit and auditable.

---

# 24. Reviewer Final Gate

## File

```text
src/lib/agents/ruflo/final-gate.ts
```

The existing final-gate semantics can remain:

```text
qualityScore >= 80
architecturalConformance === true
requirementCoverage === true
```

Do not move these release criteria into the Markdown parser.

The parser validates representation.

The final gate validates release eligibility.

This separation is important.

---

# 25. Delete Legacy Reviewer JSON Schema

## File

```text
src/lib/agents/ruflo/registry/Reviewer.ts
```

The current:

```ts
export const schema = {
  type: 'object',
  ...
};
```

is a legacy JSON response contract.

Remove it if the generic orchestration layer no longer requires it.

If the generic runner still assumes every agent has a JSON schema, refactor the runner so Markdown-producing stages are first-class.

Do not replace the old schema with a fake JSON wrapper.

---

# 26. Security Legacy Schema Cleanup

## File

```text
src/lib/agents/ruflo/registry/Security.ts
```

The current schema:

```ts
export const schema = {
  type: 'object',
  properties: { content: { type: 'string' } },
  required: ['content']
};
```

does not describe the actual Security Markdown contract.

Determine whether it is consumed by the generic runner.

### If unused

Remove it.

### If required by shared infrastructure

Refactor the infrastructure to distinguish:

```text
Markdown stage
JSON stage
```

rather than pretending Security is a JSON object containing a Markdown string.

---

# 27. Do Not Change Coder's JSON Contract

There is one important boundary.

The existence of JSON in the system is not itself a bug.

Coder legitimately produces:

```text
workspace.manifest.json
```

Therefore:

```text
JSON
```

must not be globally removed.

The migration applies specifically to:

```text
Reviewer
Security
Debugger
```

where the accepted artifact contracts are Markdown.

Coder remains:

```text
workspace.manifest.json
```

---

# 28. Tests — Reviewer

## File

```text
src/prompt-contract-sync.test.ts
```

Add/update Reviewer tests.

### Test R-01 — Valid Markdown report

Expected:

```text
accepted = true
```

### Test R-02 — Missing Overall Assessment

Expected rejection.

### Test R-03 — Missing Quality Score

Expected rejection.

### Test R-04 — Invalid Quality Score

Examples:

```text
-1
101
abc
```

Expected rejection.

### Test R-05 — Invalid Architectural Conformance

Example:

```text
MAYBE
```

Expected rejection.

### Test R-06 — Invalid Requirement Coverage

Example:

```text
PARTIAL
```

Expected rejection.

### Test R-07 — Invalid workspace hash

Expected rejection.

### Test R-08 — Stale workspace hash

Valid SHA-256 but does not equal current workspace fingerprint.

Expected rejection at stage acceptance.

### Test R-09 — Quality score below 80

Report is structurally valid.

Expected:

```text
parser: PASS
stage acceptance: FAIL
```

### Test R-10 — Requirement coverage FAIL

Expected:

```text
stage acceptance: FAIL
```

### Test R-11 — Architectural conformance FAIL

Expected:

```text
stage acceptance: FAIL
```

---

# 29. Tests — Security

### Test S-01 — Valid secure report

```text
SECURE
```

Expected:

```text
parser: PASS
stage acceptance: PASS
final gate: PASS
```

assuming all other gates pass.

### Test S-02 — Secure with warnings

```text
SECURE_WITH_WARNINGS
```

Expected:

```text
parser: PASS
stage acceptance: PASS
final gate: PASS
```

### Test S-03 — Vulnerable

```text
VULNERABLE
```

Expected:

```text
parser: PASS
stage acceptance: PASS
final gate: FAIL
```

### Test S-04 — Critical

```text
CRITICAL
```

Expected:

```text
parser: PASS
stage acceptance: PASS
final gate: FAIL
```

### Test S-05 — Invalid status

Example:

```text
UNKNOWN
```

Expected:

```text
parser: FAIL
```

### Test S-06 — Missing Security Score

Expected rejection.

### Test S-07 — Missing Vulnerabilities Found

Expected rejection.

### Test S-08 — Missing Security Checks Performed

Expected rejection.

### Test S-09 — Missing Recommendations

Expected rejection.

### Test S-10 — Missing Workspace Hash

Expected rejection.

### Test S-11 — Stale Workspace Hash

Expected stage acceptance failure.

---

# 30. Executor Tests

Add regression coverage proving the executor no longer mutates stage reports.

## Reviewer

Given:

```md
### Workspace Hash
abc...
```

the stored artifact must contain the exact generated content.

No JSON parse/re-serialization should occur.

## Security

Given a report without:

```md
### Workspace Hash
```

the executor must not append it.

The candidate should fail validation.

This is intentional.

---

# 31. Repository-Wide Legacy Search

After implementation, search for:

```text
JSON.parse(candidateContent)
```

Classify every result.

For Reviewer and Security:

```text
must be zero
```

Search:

```text
parsed.workspaceHash
```

Expected:

```text
no executor-side mutation
```

Search:

```text
ReviewerOutput
```

Confirm all consumers use the Markdown-derived interface.

Search:

```text
SecurityOutput
```

Confirm all consumers use the Markdown-derived interface.

Search:

```text
REVIEWER_SCHEMA
SECURITY_SCHEMA
```

Confirm they represent version `1.2.0` Markdown contracts.

Search:

```text
format: 'json'
```

Confirm Reviewer and Security no longer appear.

Coder may legitimately remain JSON.

---

# 32. Version Alignment

After migration:

| Component | Reviewer | Security |
|---|---:|---:|
| Contract registry | 1.2.0 | 1.2.0 |
| Prompt | 1.2.0 | 1.2.0 |
| Parser | 1.2.0 | 1.2.0 |
| Stage acceptance | 1.2.0 behavior | 1.2.0 behavior |
| Artifact | `review_report.md` | `security_report.md` |
| Format | Markdown | Markdown |

No active Reviewer/Security parser should remain at `1.0.0`.

---

# 33. Ownership Model

The remediation establishes clear ownership.

## Prompt owns

```text
What the report means
What sections exist
What information the agent must provide
```

## Parser owns

```text
Can the artifact be structurally understood?
Are required fields present?
Are primitive values valid?
```

## Stage acceptance owns

```text
Does this artifact satisfy objective stage-level conditions?
Does the workspace hash match?
```

## Final gate owns

```text
Is the project eligible to finish the pipeline?
```

## Executor owns

```text
Running the stage
Providing context
Passing candidate content to validation
Persisting accepted artifacts
```

The executor must **not** rewrite stage reports.

---

# 34. Target Architecture

## Reviewer

```text
Accepted Specs
      +
Architecture
      +
Workspace
      +
Verification Evidence
      ↓
   Reviewer
      ↓
review_report.md
      ↓
Markdown Parser
      ↓
Stage Acceptance
      ↓
Final Gate
```

## Security

```text
Workspace
      +
Architecture
      +
Security Context
      ↓
   Security
      ↓
security_report.md
      ↓
Markdown Parser
      ↓
Stage Acceptance
      ↓
Final Gate
```

---

# 35. Implementation Order

## Phase 1 — Reviewer contract

- [ ] Rewrite Reviewer prompt as Markdown-only
- [ ] Define six canonical headings
- [ ] Change registry format to Markdown
- [ ] Change Reviewer schema version to 1.2.0
- [ ] Replace JSON parser with Markdown parser
- [ ] Remove legacy JSON schema
- [ ] Remove executor workspace-hash injection

## Phase 2 — Security contract

- [ ] Define six canonical headings
- [ ] Update registry required headings
- [ ] Update Security schema to 1.2.0
- [ ] Expand status token parser to four legitimate statuses
- [ ] Parse Security Score
- [ ] Parse Security Checks Performed
- [ ] Parse Workspace Hash
- [ ] Remove executor hash injection

## Phase 3 — Acceptance

- [ ] Update Reviewer stage acceptance
- [ ] Update Security stage acceptance
- [ ] Preserve workspace freshness checks
- [ ] Keep release eligibility in final gate

## Phase 4 — Tests

- [ ] Reviewer structural tests
- [ ] Reviewer semantic tests
- [ ] Reviewer stale-hash test
- [ ] Security structural tests
- [ ] Security status tests
- [ ] Security stale-hash test
- [ ] Final-gate vulnerable/critical tests
- [ ] Executor mutation regression tests
- [ ] Full pipeline regression

## Phase 5 — Cleanup

- [ ] Repository-wide JSON-path search
- [ ] Remove dead schema exports
- [ ] Remove dead imports
- [ ] Remove legacy comments
- [ ] Confirm no Markdown artifact is mutated after generation

---

# 36. Definition of Done

## Reviewer

- [ ] Reviewer produces Markdown
- [ ] `review_report.md` is declared Markdown
- [ ] Six required headings are canonical
- [ ] Reviewer parser uses Markdown sections
- [ ] JSON parsing is removed from Reviewer
- [ ] Executor does not mutate Reviewer output
- [ ] Workspace hash is supplied as review context
- [ ] Workspace hash is validated against current workspace
- [ ] Quality score is validated
- [ ] Architecture conformance is validated
- [ ] Requirement coverage is validated
- [ ] Final gate still enforces quality >= 80
- [ ] Final gate still enforces architecture conformance
- [ ] Final gate still enforces requirement coverage

## Security

- [ ] Security produces Markdown
- [ ] `security_report.md` is declared Markdown
- [ ] Producer and parser use identical headings
- [ ] Security score is parsed
- [ ] Vulnerabilities are preserved
- [ ] Security checks are preserved
- [ ] Recommendations are preserved
- [ ] Workspace hash is explicit
- [ ] Workspace hash is validated
- [ ] `VULNERABLE` is representable
- [ ] `CRITICAL` is representable
- [ ] Vulnerable reports reach the final gate
- [ ] Critical reports reach the final gate
- [ ] Final gate rejects vulnerable/critical security states
- [ ] Executor no longer modifies Security reports

---

# 37. Final Contract Principle

The goal is not:

```text
Make the old JSON schemas compatible with Markdown.
```

The goal is:

```text
Retire the old JSON authorities.
        ↓
Define Markdown artifact contracts.
        ↓
Make prompts produce those contracts.
        ↓
Make parsers consume those contracts.
        ↓
Make stage acceptance validate semantics.
        ↓
Make final gate decide release eligibility.
```

That gives Reviewer and Security the same contract architecture now being established for Debugger.

The pipeline should not have:

```text
Prompt contract
Schema contract
Parser contract
Executor mutation contract
```

all disagreeing with each other.

It should have one artifact contract with four clean responsibilities:

```text
Producer → Parser → Acceptance → Final Gate
```

Humanity has somehow survived this long without this being obvious, so we may as well fix it properly now.
