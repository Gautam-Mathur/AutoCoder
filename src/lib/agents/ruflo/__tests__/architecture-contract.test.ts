import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateArchitectureArtifact } from '../spec-contract';
import { parseArchitecture } from '../architecture-parser';

describe('Architect Contract & Module Ownership Invariants', () => {
  it('rejects empty architecture content', () => {
    const res = validateArchitectureArtifact('');
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes('architecture.md is empty')));
  });

  it('rejects missing required singleton sections', () => {
    const missingSections = `### Tech Stack
- **Frontend**: React

### Project Folder Structure
project-root/
└── src/
    └── index.tsx

### Conventions
- **File Naming**: camelCase`;

    const res = validateArchitectureArtifact(missingSections);
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes('Missing required "### Modules" section')));
  });

  it('rejects duplicate singleton sections', () => {
    const duplicateSections = `### Tech Stack
- **Frontend**: React

### Project Folder Structure
project-root/
└── src/
    └── index.tsx

### Modules
**Main Module**
- Responsibility: Main UI
- Owned Files: src/index.tsx
- Depends On: None
- Supports Features: Main

### Modules
**Second Module**
- Responsibility: Second
- Owned Files: src/second.tsx
- Depends On: None
- Supports Features: Second

### Conventions
- **File Naming**: camelCase`;

    const res = validateArchitectureArtifact(duplicateSections);
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes('Duplicate "### Modules" section')));
  });

  it('fails on the exact observed production failure (A-001, A-002, A-003, A-004)', () => {
    const failureFixture = `### Tech Stack
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
│   └── components/
│       ├── TaskCard.tsx
│       └── Column.tsx
└── public/
    └── favicon.ico

### Modules

**Frontend Application**
- Responsibility: Implements UI.
- Owned Files: src/app/page.tsx, src/components/TaskCard.tsx, src/components/Column.tsx
- Depends On: None
- Supports Features: Tasks

**Drag and Drop Module**
- Responsibility: Drag & drop support.
- Owned Files: src/components/TaskCard.tsx, src/components/Column.tsx
- Depends On: Frontend Application
- Supports Features: Drag & drop

### Conventions
- **File Naming**: camelCase`;

    const res = validateArchitectureArtifact(failureFixture);
    assert.strictEqual(res.valid, false);

    // Duplicate ownership errors
    assert.ok(res.errors.some((e) => e.includes('TaskCard.tsx') && e.includes('claimed by modules')));
    assert.ok(res.errors.some((e) => e.includes('Column.tsx') && e.includes('claimed by modules')));

    // Unclaimed tree files errors
    assert.ok(res.errors.some((e) => e.includes('src/app/api/route.ts') && e.includes('is not claimed by any module')));
    assert.ok(res.errors.some((e) => e.includes('public/favicon.ico') && e.includes('is not claimed by any module')));
  });

  it('accepts corrected architecture with exact single ownership (Regression Scenario 39)', () => {
    const correctedFixture = `### Tech Stack
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
│   └── components/
│       ├── TaskCard.tsx
│       └── Column.tsx
└── public/
    └── favicon.ico

### Modules

**Frontend Application**
- Responsibility: Implements UI and board components.
- Owned Files: src/app/page.tsx, src/components/TaskCard.tsx, src/components/Column.tsx, public/favicon.ico
- Depends On: None
- Supports Features: Tasks, Drag & drop

**API Routes**
- Responsibility: Implements API route handlers.
- Owned Files: src/app/api/route.ts
- Depends On: None
- Supports Features: API

### Conventions
- **File Naming**: camelCase`;

    const res = validateArchitectureArtifact(correctedFixture);
    assert.strictEqual(res.valid, true, `Corrected architecture failed: ${res.errors.join(', ')}`);
  });

  it('accepts usage across features when single ownership is maintained (A-010, Regression Scenario 25)', () => {
    const sharedUsageFixture = `### Tech Stack
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
    ├── pages/
    │   └── index.tsx
    └── components/
        └── TaskCard.tsx

### Modules

**Frontend Application**
- Responsibility: Implements frontend UI including TaskCard.
- Owned Files: src/pages/index.tsx, src/components/TaskCard.tsx
- Depends On: None
- Supports Features: Task Management, Drag and Drop

### Conventions
- **File Naming**: camelCase`;

    const res = validateArchitectureArtifact(sharedUsageFixture);
    assert.strictEqual(res.valid, true, `Shared usage fixture failed: ${res.errors.join(', ')}`);
  });

  it('allows config files (package.json, tsconfig.json) to remain unowned while requiring public assets', () => {
    const configFixture = `### Tech Stack
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
├── package.json
├── tsconfig.json
└── src/
    └── pages/
        └── index.tsx

### Modules

**Frontend Application**
- Responsibility: UI
- Owned Files: src/pages/index.tsx
- Depends On: None
- Supports Features: Core

### Conventions
- **File Naming**: camelCase`;

    const res = validateArchitectureArtifact(configFixture);
    assert.strictEqual(res.valid, true, `Config exemption fixture failed: ${res.errors.join(', ')}`);
  });

  it('rejects unknown module dependencies and dependency cycles', () => {
    const cycleFixture = `### Tech Stack
- **Frontend**: React
- **Frontend Entry Point**: src/index.tsx
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
    ├── index.tsx
    └── second.tsx

### Modules

**Module A**
- Responsibility: Module A
- Owned Files: src/index.tsx
- Depends On: Module B
- Supports Features: A

**Module B**
- Responsibility: Module B
- Owned Files: src/second.tsx
- Depends On: Module A
- Supports Features: B

### Conventions
- **File Naming**: camelCase`;

    const res = validateArchitectureArtifact(cycleFixture);
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes('Module dependency cycle detected')));
  });
});
