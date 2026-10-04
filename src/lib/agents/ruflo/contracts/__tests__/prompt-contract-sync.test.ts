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
    const validDebugger = `# Debug Report

### Issues Addressed
Fixed syntax error.

### Patches Applied
Patched \`src/pages/index.tsx\`.

### Verification
All tests passed.`;

    const resValid = await validateStageCandidate(dummyCtx('Debugger', validDebugger));
    assert.strictEqual(resValid.accepted, true, `Debugger valid fixture failed: ${resValid.errors.join(', ')}`);
  });

  it('validates Security stage candidate correctly', async () => {
    const testHash = 'a'.repeat(64);
    const validSecurity = `### Status
SECURE

### Vulnerabilities
No vulnerabilities found.

### Recommendations
Add CSP headers.

### Workspace Hash
${testHash}`;

    const resValid = await validateStageCandidate(
      dummyCtx('Security', validSecurity, undefined, { currentWorkspaceHash: testHash })
    );
    assert.strictEqual(resValid.accepted, true, `Security valid fixture failed: ${resValid.errors.join(', ')}`);
  });

  it('validates Reviewer stage candidate correctly', async () => {
    const testHash = 'a'.repeat(64);
    const validReviewer = JSON.stringify({
      summary: 'Code structure is sound.',
      qualityScore: 95,
      architecturalConformance: true,
      requirementCoverage: true,
      workspaceHash: testHash,
      findings: [],
    });

    const resValid = await validateStageCandidate(
      dummyCtx('Reviewer', validReviewer, undefined, { currentWorkspaceHash: testHash })
    );
    assert.strictEqual(resValid.accepted, true, `Reviewer valid fixture failed: ${resValid.errors.join(', ')}`);
  });
});
