import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateStageCandidate } from '../../stage-acceptance';

describe('Prompt/Contract Synchronization (All 11 Stages)', () => {
  const dummyCtx = (stage: string, content: string) => ({
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
  });

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
    assert.ok(resInvalid.errors.some((e) => e.includes('### Project Name')));
  });

  it('validates Planner stage candidate correctly', async () => {
    const validPlanner = `### Features
1. **Basic Arithmetic**
   - Description: Perform addition and subtraction
   - Priority: CRITICAL
   - Depends On: None

### Functional Requirements
1. User can click buttons to enter numbers.

### Acceptance Criteria
- **Basic Arithmetic**: Addition verified`;

    const resValid = await validateStageCandidate(dummyCtx('Planner', validPlanner));
    assert.strictEqual(resValid.accepted, true, `Planner valid fixture failed: ${resValid.errors.join(', ')}`);

    const invalidPlanner = `# Requirements
Some broad text`;
    const resInvalid = await validateStageCandidate(dummyCtx('Planner', invalidPlanner));
    assert.strictEqual(resInvalid.accepted, false);
  });

  it('validates Architect stage candidate correctly', async () => {
    const validArchitect = `### Tech Stack
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

### Modules
**UI Module**
- Responsibility: Renders application interface
- Owned Files: src/pages/index.tsx
- Depends On: None
- Supports Features: Basic Arithmetic

### Conventions
- **File Naming**: camelCase`;

    const resValid = await validateStageCandidate(dummyCtx('Architect', validArchitect));
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
**GET /api/tasks** — List all tasks`;

    const resSystem = await validateStageCandidate(dummyCtx('System', validSystem));
    assert.strictEqual(resSystem.accepted, true);
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
- Trace: FR-001
- Components: TaskList

### Components
**TaskList** (Display)
- Trace: FR-001
- Used On: Dashboard

### Global Feedback
- **Form Errors**: Inline`;

    const resValid = await validateStageCandidate(dummyCtx('Designer', validDesigner));
    assert.strictEqual(resValid.accepted, true);
  });

  it('validates Blueprinter stage candidate correctly', async () => {
    const validBlueprint = `### File: src/index.ts
- **Purpose**: Entry point
- **Dependencies**: None
- **Specs Required**: None
- **Exports**: None`;

    const resValid = await validateStageCandidate(dummyCtx('Blueprinter', validBlueprint));
    assert.strictEqual(resValid.accepted, true);

    const invalidBlueprint = `# Blueprint Document
No file sections`;
    const resInvalid = await validateStageCandidate(dummyCtx('Blueprinter', invalidBlueprint));
    assert.strictEqual(resInvalid.accepted, false);
  });

  it('validates Coder stage candidate correctly', async () => {
    const validCoder = JSON.stringify({
      schemaVersion: '1.0.0',
      projectRoot: '/',
      files: [{ path: 'src/app.ts', hash: 'abc12345' }],
      directories: ['src'],
    });

    const resValid = await validateStageCandidate(dummyCtx('Coder', validCoder));
    assert.strictEqual(resValid.accepted, true);
  });

  it('validates Tester stage candidate correctly', async () => {
    const validTester = `# Test Report

## Result

PASS`;

    const resValid = await validateStageCandidate(dummyCtx('Tester', validTester));
    assert.strictEqual(resValid.accepted, true);
  });

  it('validates Debugger stage candidate correctly', async () => {
    const validDebugger = JSON.stringify({
      patches: [
        {
          file: 'src/index.ts',
          startLine: 1,
          endLine: 2,
          replacement: 'const x = 5;',
          reason: 'Fix missing assignment',
        },
      ],
      unfixable: [],
    });

    const resValid = await validateStageCandidate(dummyCtx('Debugger', validDebugger));
    assert.strictEqual(resValid.accepted, true);

    const invalidPathDebugger = JSON.stringify({
      patches: [
        {
          file: '/etc/passwd',
          startLine: 1,
          endLine: 2,
          replacement: 'bad',
          reason: 'Unsafe path',
        },
      ],
    });

    const resInvalid = await validateStageCandidate(dummyCtx('Debugger', invalidPathDebugger));
    assert.strictEqual(resInvalid.accepted, false);
  });

  it('validates Security stage candidate correctly', async () => {
    const validSecurity = `### Overall Status
SECURE

### Security Score
95

### Vulnerabilities Found
No vulnerabilities found.

### Security Checks Performed
- **Authentication**: PASS

### Recommendations
- Add CSP headers`;

    const resValid = await validateStageCandidate(dummyCtx('Security', validSecurity));
    assert.strictEqual(resValid.accepted, true);
  });

  it('validates Reviewer stage candidate correctly', async () => {
    const validReviewer = JSON.stringify({
      status: 'PASS',
      findings: [],
      summary: 'Code structure is sound.',
    });

    const resValid = await validateStageCandidate(dummyCtx('Reviewer', validReviewer));
    assert.strictEqual(resValid.accepted, true);
  });
});
