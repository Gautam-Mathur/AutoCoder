import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateStageCandidate } from '../../stage-acceptance';

describe('Prompt/Contract Synchronization (All 11 Stages)', () => {
  const dummyCtx = (stage: string, content: string, upstreamContext?: Record<string, string>, evidence?: any) => ({
    conversationId: 'test-conv',
    pipelineRunId: 'test-run',
    candidate: {
      stage,
      executionId: 'exec-1',
      attempt: 1,
      content,
      contentHash: 'hash123',
      generatedAt: new Date(),
    },
    upstreamContext,
    evidence,
  });

  const validArchContent = `### Tech Stack
- **Frontend**: React
- **Frontend Entry Point**: src/pages/index.tsx
- **Backend**: None
- **Backend Entry Point**: None
- **Database**: None
- **ORM**: None
- **Authentication**: None
- **Build Tool**: Vite
- **Additional**: None

### Project Folder Structure
project-root/
└── src/
    └── pages/
        └── index.tsx

### Project Files
- src/pages/index.tsx

### Modules
**UI Module**
- Responsibility: Renders application interface
- Owned Files: src/pages/index.tsx
- Depends On: None
- Supports Features: Feature-001

### Conventions
- **File Naming**: camelCase`;

  it('validates Queen stage candidate correctly', async () => {
    const validQueen = `### Project Name
Kanban Board Application

### Project Goal
A visual task management application.

### MVP Scope
- Create tasks
- Move tasks across columns

### Technical Constraints
No specific constraints.

### Risks
- State persistence edge cases.`;

    const resValid = await validateStageCandidate(dummyCtx('Queen', validQueen));
    assert.strictEqual(resValid.accepted, true, `Queen valid fixture failed: ${resValid.errors.join(', ')}`);

    const invalidQueen = `# Project Plan
Kanban Board`;
    const resInvalid = await validateStageCandidate(dummyCtx('Queen', invalidQueen));
    assert.strictEqual(resInvalid.accepted, false);
    assert.ok(resInvalid.errors.some((e) => e.includes('Project Name')));
  });

  it('validates Planner stage candidate correctly', async () => {
    const validPlanner = `### Features
1. **Feature-001**
   - Description: Perform addition and subtraction
   - Priority: CRITICAL
   - Depends On: None

### Functional Requirements
1. User can click buttons to enter numbers.

### Acceptance Criteria
- **Feature-001**: Addition verified`;

    const resValid = await validateStageCandidate(dummyCtx('Planner', validPlanner));
    assert.strictEqual(resValid.accepted, true, `Planner valid fixture failed: ${resValid.errors.join(', ')}`);

    const invalidPlanner = `# Requirements
Some broad text`;
    const resInvalid = await validateStageCandidate(dummyCtx('Planner', invalidPlanner));
    assert.strictEqual(resInvalid.accepted, false);
  });

  it('validates Architect stage candidate correctly', async () => {
    const resValid = await validateStageCandidate(dummyCtx('Architect', validArchContent));
    assert.strictEqual(resValid.accepted, true, `Architect valid fixture failed: ${resValid.errors.join(', ')}`);
  });

  it('validates System stage candidate correctly', async () => {
    const validNoBackend = `### No Backend Required
This is a frontend-only project. No backend, database, or API endpoints are needed.`;

    const resNoBackend = await validateStageCandidate(dummyCtx('System', validNoBackend));
    assert.strictEqual(resNoBackend.accepted, true);

    const validSystem = `### Database Design
**Task Entity**
- Purpose: Stores tasks

### Seed Data
- Task: { id: 1, name: "Sample" }

### API Endpoints
**GET /src/pages/index.tsx** — List all tasks`;


    const resSystem = await validateStageCandidate(
      dummyCtx('System', validSystem, { 'architecture.md': validArchContent })
    );
    assert.strictEqual(resSystem.accepted, true, `System valid fixture failed: ${resSystem.errors.join(', ')}`);
  });

  it('validates Designer stage candidate correctly', async () => {
    const validDesigner = `### Design System
- **Style**: Modern
- **Breakpoints**: Mobile <640px
- **Colors**: Primary #000
- **Typography**: Inter
- **a11y Baseline**: Contrast 4.5:1

### Pages
**Dashboard** (/) — Access: Public
- Trace: Feature-001
- Components: TaskList
- File: src/pages/index.tsx

### Components
**TaskList** (Display)
- Trace: Feature-001
- Used On: Dashboard

### Global Feedback
- **Form Errors**: Inline`;

    const resValid = await validateStageCandidate(
      dummyCtx('Designer', validDesigner, {
        'architecture.md': validArchContent,
        'requirements.md': '### Features\n- Feature-001',
      })
    );
    assert.strictEqual(resValid.accepted, true, `Designer valid fixture failed: ${resValid.errors.join(', ')}`);
  });

  it('validates Blueprinter stage candidate correctly', async () => {
    const validBlueprint = `### File: src/pages/index.tsx
- **Owner Module**: UI Module
- **Purpose**: Entry point
- **Dependencies**: None
- **Specs Required**: None
- **Exports**: None`;

    const resValid = await validateStageCandidate(
      dummyCtx('Blueprinter', validBlueprint, { 'architecture.md': validArchContent })
    );
    assert.strictEqual(resValid.accepted, true, `Blueprinter valid fixture failed: ${resValid.errors.join(', ')}`);

    const invalidBlueprint = `# Blueprint Document
No file sections`;
    const resInvalid = await validateStageCandidate(
      dummyCtx('Blueprinter', invalidBlueprint, { 'architecture.md': validArchContent })
    );
    assert.strictEqual(resInvalid.accepted, false);
  });

  it('validates Coder stage candidate correctly', async () => {
    const validCoder = JSON.stringify({
      schemaVersion: '1.0.0',
      projectRoot: '.',
      files: [{ path: 'src/pages/index.tsx', hash: 'abc12345' }],
      directories: ['src/pages'],
      entryPoints: ['src/pages/index.tsx'],
      generatedAt: new Date().toISOString(),
      sourceStageExecutionId: 'exec-1',
    });

    const resValid = await validateStageCandidate(dummyCtx('Coder', validCoder));
    assert.strictEqual(resValid.accepted, true);
  });

  it('validates Tester stage candidate correctly', async () => {
    const testHash = 'a'.repeat(64);
    const validTester = `# Test Report

### Result
PASS

### Summary
All tests passed.

### Tests
- Automated Check: PASS

### Failures
None

### Workspace Hash
${testHash}`;

    const resValid = await validateStageCandidate(
      dummyCtx('Tester', validTester, undefined, { currentWorkspaceHash: testHash })
    );
    assert.strictEqual(resValid.accepted, true, `Tester valid fixture failed: ${resValid.errors.join(', ')}`);
  });

  it('validates Debugger stage candidate correctly', async () => {
    // 1. Valid Markdown report -> accepted
    const validDebugger = `# Debug Report

### Issues Addressed
Fixed syntax error in index.tsx.

### Patches Applied
Patched \`src/pages/index.tsx\`.

### Verification
All tests passed.`;

    const resValid = await validateStageCandidate(dummyCtx('Debugger', validDebugger));
    assert.strictEqual(resValid.accepted, true, `Debugger valid fixture failed: ${resValid.errors.join(', ')}`);

    // 2. Missing "Issues Addressed" -> rejected
    const missingIssues = `# Debug Report

### Patches Applied
Patched \`src/pages/index.tsx\`.

### Verification
All tests passed.`;
    const resMissingIssues = await validateStageCandidate(dummyCtx('Debugger', missingIssues));
    assert.strictEqual(resMissingIssues.accepted, false);
    assert.ok(resMissingIssues.errors.some((e) => e.includes('Missing required section "### Issues Addressed"')));

    // 3. Missing "Patches Applied" -> rejected
    const missingPatches = `# Debug Report

### Issues Addressed
Fixed syntax error.

### Verification
All tests passed.`;
    const resMissingPatches = await validateStageCandidate(dummyCtx('Debugger', missingPatches));
    assert.strictEqual(resMissingPatches.accepted, false);
    assert.ok(resMissingPatches.errors.some((e) => e.includes('Missing required section "### Patches Applied"')));

    // 4. Missing "Verification" -> rejected
    const missingVerification = `# Debug Report

### Issues Addressed
Fixed syntax error.

### Patches Applied
Patched \`src/pages/index.tsx\`.`;
    const resMissingVerification = await validateStageCandidate(dummyCtx('Debugger', missingVerification));
    assert.strictEqual(resMissingVerification.accepted, false);
    assert.ok(resMissingVerification.errors.some((e) => e.includes('Missing required section "### Verification"')));

    // 5. Duplicate required section -> rejected
    const duplicateSection = `# Debug Report

### Issues Addressed
Issue 1

### Issues Addressed
Duplicate Issue 1

### Patches Applied
Patched \`src/pages/index.tsx\`.

### Verification
Passed.`;
    const resDuplicate = await validateStageCandidate(dummyCtx('Debugger', duplicateSection));
    assert.strictEqual(resDuplicate.accepted, false);
    assert.ok(resDuplicate.errors.some((e) => e.includes('Duplicate section "### Issues Addressed"')));

    // 6. Empty required section -> rejected
    const emptySection = `# Debug Report

### Issues Addressed
   

### Patches Applied
Patched \`src/pages/index.tsx\`.

### Verification
Passed.`;
    const resEmpty = await validateStageCandidate(dummyCtx('Debugger', emptySection));
    assert.strictEqual(resEmpty.accepted, false);
    assert.ok(resEmpty.errors.some((e) => e.includes('Section "### Issues Addressed" cannot be empty')));

    // 7. Realistic multi-file Markdown report -> accepted
    const realisticReport = `# Debug Repair Report

### Issues Addressed
- **src/components/Header.tsx**: Unresolved import error TS2307 for './Logo'. Root cause was incorrect file casing.
- **src/utils/calc.ts**: Off-by-one boundary failure in loop condition on line 42.

### Patches Applied
- **src/components/Header.tsx**: Updated import path from './Logo' to './logo'.
- **src/utils/calc.ts**: Replaced \`i <= max\` with \`i < max\` to adhere to array bounds.

### Verification
- Executed \`npx tsc --noEmit\`: Exit code 0, 0 errors.
- Executed \`npm test\`: All 14 unit test suites passed successfully.`;
    const resRealistic = await validateStageCandidate(dummyCtx('Debugger', realisticReport));
    assert.strictEqual(resRealistic.accepted, true, `Realistic report failed: ${resRealistic.errors.join(', ')}`);

    // 8. Retired patch-style response -> not accepted as the current Debugger artifact
    const legacyJsonResponse = JSON.stringify({
      patches: [
        {
          file: 'src/pages/index.tsx',
          startLine: 1,
          endLine: 2,
          replacement: 'export default function App() {}',
          reason: 'Fix syntax',
        },
      ],
      unfixable: [],
    });
    const resLegacy = await validateStageCandidate(dummyCtx('Debugger', legacyJsonResponse));
    assert.strictEqual(resLegacy.accepted, false, 'Retired JSON patch response must not be accepted as Debugger artifact');
  });

  it('validates Security stage candidate correctly', async () => {
    const testHash = 'a'.repeat(64);
    const validSecurity = `# Security Audit Report

### Overall Status
SECURE

### Security Score
95

### Vulnerabilities Found
No vulnerabilities found. The code passed security review.

### Security Checks Performed
- **Authentication**: PASS — Properly implemented.
- **Input Validation**: PASS — Sanitization in place.

### Recommendations
- Add Content-Security-Policy headers in production.

### Workspace Hash
${testHash}`;

    // S-01: Valid SECURE report -> accepted
    const resValid = await validateStageCandidate(
      dummyCtx('Security', validSecurity, undefined, { currentWorkspaceHash: testHash })
    );
    assert.strictEqual(resValid.accepted, true, `Security valid fixture failed: ${resValid.errors.join(', ')}`);

    // S-02: SECURE_WITH_WARNINGS -> accepted at stage acceptance
    const warningsSecurity = validSecurity.replace('SECURE', 'SECURE_WITH_WARNINGS');
    const resWarnings = await validateStageCandidate(
      dummyCtx('Security', warningsSecurity, undefined, { currentWorkspaceHash: testHash })
    );
    assert.strictEqual(resWarnings.accepted, true);

    // S-03 & S-04: VULNERABLE and CRITICAL -> structurally valid & accepted at stage acceptance
    const vulnerableSecurity = validSecurity.replace('SECURE', 'VULNERABLE');
    const resVulnerable = await validateStageCandidate(
      dummyCtx('Security', vulnerableSecurity, undefined, { currentWorkspaceHash: testHash })
    );
    assert.strictEqual(resVulnerable.accepted, true, 'VULNERABLE report must be accepted at stage acceptance');

    // S-05: Invalid status -> rejected
    const invalidStatus = validSecurity.replace('SECURE', 'UNKNOWN_STATUS');
    const resInvalidStatus = await validateStageCandidate(
      dummyCtx('Security', invalidStatus, undefined, { currentWorkspaceHash: testHash })
    );
    assert.strictEqual(resInvalidStatus.accepted, false);

    // S-06: Missing required heading -> rejected
    const missingChecks = validSecurity.replace('### Security Checks Performed', '### Ignored Header');
    const resMissing = await validateStageCandidate(
      dummyCtx('Security', missingChecks, undefined, { currentWorkspaceHash: testHash })
    );
    assert.strictEqual(resMissing.accepted, false);

    // S-07: Stale workspace hash -> rejected
    const staleHash = 'b'.repeat(64);
    const resStale = await validateStageCandidate(
      dummyCtx('Security', validSecurity, undefined, { currentWorkspaceHash: staleHash })
    );
    assert.strictEqual(resStale.accepted, false);
    assert.ok(resStale.errors.some((e) => e.includes('Stale workspace hash')));
  });

  it('validates Reviewer stage candidate correctly', async () => {
    const testHash = 'a'.repeat(64);
    const validReviewer = `# Review Report

### Overall Assessment
Codebase is clean, well-structured, and meets all requirements.

### Quality Score
92

### Architectural Conformance
PASS — Implementation conforms to accepted architecture.

### Requirement Coverage
PASS — All requirements are satisfied.

### Findings
No findings.

### Workspace Hash
${testHash}`;

    // R-01: Valid Markdown report -> accepted
    const resValid = await validateStageCandidate(
      dummyCtx('Reviewer', validReviewer, undefined, { currentWorkspaceHash: testHash })
    );
    assert.strictEqual(resValid.accepted, true, `Reviewer valid fixture failed: ${resValid.errors.join(', ')}`);

    // R-02: Missing required section -> rejected
    const missingAssessment = validReviewer.replace('### Overall Assessment', '### Summary');
    const resMissing = await validateStageCandidate(
      dummyCtx('Reviewer', missingAssessment, undefined, { currentWorkspaceHash: testHash })
    );
    assert.strictEqual(resMissing.accepted, false);

    // R-03: Quality score below 80 -> rejected at stage acceptance
    const lowScore = validReviewer.replace('92', '75');
    const resLowScore = await validateStageCandidate(
      dummyCtx('Reviewer', lowScore, undefined, { currentWorkspaceHash: testHash })
    );
    assert.strictEqual(resLowScore.accepted, false);
    assert.ok(resLowScore.errors.some((e) => e.includes('below required minimum of 80')));

    // R-04: Architectural Conformance FAIL -> rejected
    const archFail = validReviewer.replace('PASS — Implementation', 'FAIL — Missing module');
    const resArchFail = await validateStageCandidate(
      dummyCtx('Reviewer', archFail, undefined, { currentWorkspaceHash: testHash })
    );
    assert.strictEqual(resArchFail.accepted, false);
    assert.ok(resArchFail.errors.some((e) => e.includes('Architectural conformance is false')));

    // R-05: Requirement Coverage FAIL -> rejected
    const reqFail = validReviewer.replace('PASS — All requirements', 'FAIL — Incomplete');
    const resReqFail = await validateStageCandidate(
      dummyCtx('Reviewer', reqFail, undefined, { currentWorkspaceHash: testHash })
    );
    assert.strictEqual(resReqFail.accepted, false);
    assert.ok(resReqFail.errors.some((e) => e.includes('Requirement coverage is false')));

    // R-06: Stale workspace hash -> rejected
    const staleHash = 'b'.repeat(64);
    const resStale = await validateStageCandidate(
      dummyCtx('Reviewer', validReviewer, undefined, { currentWorkspaceHash: staleHash })
    );
    assert.strictEqual(resStale.accepted, false);
    assert.ok(resStale.errors.some((e) => e.includes('Stale workspace hash')));

    // R-07: Legacy JSON payload -> rejected
    const legacyReviewer = JSON.stringify({
      summary: 'Code structure is sound.',
      qualityScore: 95,
      architecturalConformance: true,
      requirementCoverage: true,
      workspaceHash: testHash,
      findings: [],
    });
    const resLegacy = await validateStageCandidate(
      dummyCtx('Reviewer', legacyReviewer, undefined, { currentWorkspaceHash: testHash })
    );
    assert.strictEqual(resLegacy.accepted, false, 'Retired JSON payload must not be accepted as Reviewer candidate');
  });
});
