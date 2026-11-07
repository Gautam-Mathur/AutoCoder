import { describe, it } from 'node:test';
import assert from 'node:assert';
import { sanitizeCoderOutputForFile } from '../../orchestrator';
import { runCrossFileImportCheck } from '../../linter';
import { validateReactHookImports, ProjectValidationError } from '../../project-validator';
import { validatePackageDependencies } from '../../dependency-validator';
import { validateFrameworkBoundaries } from '../../framework-validator';
import { validatePrismaUsage } from '../../prisma-validator';
import { parseTesterOutput } from '../schemas/tester';

describe('AutoCoder Reconciled Priority Remediation Suite (Issues 1–5)', () => {
  describe('Issue 1: Coder Output Sanitization (Language-Aware & Disambiguated)', () => {
    it('extracts fenced code block preceded and followed by conversational prose', () => {
      const raw = `Here is the requested component file:\n\`\`\`tsx\n'use client';\n\nimport React from 'react';\nexport function Component() { return <div>OK</div>; }\n\`\`\`\nHope this helps! Let me know if you need changes.`;
      const sanitized = sanitizeCoderOutputForFile(raw, 'src/components/Component.tsx');
      assert.ok(sanitized.startsWith("'use client';"));
      assert.strictEqual(sanitized.includes('Here is the requested'), false);
      assert.strictEqual(sanitized.includes('Hope this helps!'), false);
    });

    it('disambiguates multiple fences prioritizing export-containing code', () => {
      const raw = `\`\`\`tsx\nconst helper = 123;\n\`\`\`\nAnd here is the main component:\n\`\`\`tsx\nimport React from 'react';\nexport default function Main() { return <div>Main</div>; }\n\`\`\``;
      const sanitized = sanitizeCoderOutputForFile(raw, 'src/components/Main.tsx');
      assert.ok(sanitized.includes('export default function Main'));
    });

    it('preserves async functions, Next.js directives, and comments without fences', () => {
      const raw = `'use server';\n\n// Database action\nexport async function submitForm(data: FormData) {\n  return { success: true };\n}`;
      const sanitized = sanitizeCoderOutputForFile(raw, 'src/app/actions.ts');
      assert.ok(sanitized.startsWith("'use server';"));
      assert.ok(sanitized.includes('export async function submitForm'));
    });

    it('extracts valid JSON even when trailing conversational text exists', () => {
      const raw = `{\n  "name": "my-app",\n  "version": "1.0.0"\n}\nNote: Make sure to run npm install after creating this file.`;
      const sanitized = sanitizeCoderOutputForFile(raw, 'package.json');
      assert.doesNotThrow(() => JSON.parse(sanitized));
      const parsed = JSON.parse(sanitized);
      assert.strictEqual(parsed.name, 'my-app');
    });

    it('preserves CSS @media and @container at-rules', () => {
      const raw = `@media (max-width: 768px) {\n  .container {\n    padding: 1rem;\n  }\n}\n@container (min-width: 400px) {\n  .card { font-size: 1.2rem; }\n}`;
      const sanitized = sanitizeCoderOutputForFile(raw, 'src/styles/responsive.css');
      assert.ok(sanitized.includes('@media (max-width: 768px)'));
      assert.ok(sanitized.includes('@container (min-width: 400px)'));
    });
  });

  describe('Issue 2: Strict Conjunction Gating & INCOMPLETE Handling', () => {
    it('accepts INCOMPLETE as a valid contract token in parseTesterOutput', () => {
      const validIncompleteReport = `# Test Report\n\n### Result\nINCOMPLETE\n\n### Summary\nBuild was not executed.\n\n### Tests\n- Static: PASS\n- Build: NOT_EXECUTED\n\n### Failures\nNone\n\n### Workspace Hash\n0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef\n`;
      const { output, errors } = parseTesterOutput(validIncompleteReport);
      assert.strictEqual(errors.length, 0);
      assert.ok(output);
      assert.strictEqual(output.result, 'INCOMPLETE');
    });

    it('rejects invalid Result token in parseTesterOutput', () => {
      const invalidReport = `# Test Report\n\n### Result\nUNKNOWN\n\n### Summary\nTest\n\n### Tests\nNone\n\n### Failures\nNone\n\n### Workspace Hash\n0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef\n`;
      const { errors } = parseTesterOutput(invalidReport);
      assert.ok(errors.some((e) => e.includes('Invalid Result token')));
    });
  });

  describe('Issue 3: Semantic Validator Signatures & Diagnostic States', () => {
    it('validates package dependencies using exact (vfsFiles, packageJson) signature', () => {
      const vfsFiles = {
        'src/index.ts': "import express from 'express';\nimport lodash from 'lodash';",
      };
      const pkgJson = JSON.stringify({ dependencies: { express: '^4.18.2' } });
      const res = validatePackageDependencies(vfsFiles, pkgJson);
      assert.strictEqual(res.valid, false);
      assert.ok(res.missingPackages.includes('lodash'));
      assert.strictEqual(res.missingPackages.includes('express'), false);
    });

    it('validates framework boundaries with auto-detected framework', () => {
      const vfsFiles = {
        'app/page.tsx': "import { db } from '@/lib/db';\nexport default function Page() { return null; }",
        'src/components/ClientButton.tsx': "'use client';\nimport { PrismaClient } from '@prisma/client';\nconst p = new PrismaClient();",
      };
      const res = validateFrameworkBoundaries(vfsFiles, 'NEXT_APP_ROUTER');
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some((e) => e.message.toLowerCase().includes('server-only module')));
    });

    it('validates Prisma schema accesses using exact (vfsFiles, schemaContent) signature', () => {
      const vfsFiles = {
        'src/routes.ts': 'await prisma.unknownModel.findMany();',
      };
      const schema = `datasource db { provider = "sqlite" url = "file:./dev.db" }\nmodel User { id String @id }`;
      const res = validatePrismaUsage(vfsFiles, schema);
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some((e) => e.model.toLowerCase() === 'unknownmodel'));
    });
  });

  describe('Issue 4: Recursive Symbol-Aware Module Resolution', () => {
    it('resolves named export through export * re-export chain', () => {
      const fileMap = new Map<string, string>([
        ['src/core.ts', 'export const coreVal = 42;'],
        ['src/barrel.ts', "export * from './core';"],
        ['src/index.ts', "import { coreVal } from './barrel';\nconsole.log(coreVal);"],
      ]);
      const res = runCrossFileImportCheck(fileMap);
      assert.strictEqual(res.success, true);
    });

    it('rejects default import through export * (export * never re-exports default)', () => {
      const fileMap = new Map<string, string>([
        ['src/core.ts', 'export default function coreFn() {}'],
        ['src/barrel.ts', "export * from './core';"],
        ['src/index.ts', "import coreFn from './barrel';"],
      ]);
      const res = runCrossFileImportCheck(fileMap);
      assert.strictEqual(res.success, false);
      assert.ok(res.errors.some((e) => e.message.includes('does not have a default export')));
    });

    it('rejects export { missing } when symbol is not declared locally', () => {
      const fileMap = new Map<string, string>([
        ['src/mod.ts', 'export { nonExistent };'],
      ]);
      const res = runCrossFileImportCheck(fileMap);
      assert.strictEqual(res.success, false);
      assert.ok(res.errors.some((e) => e.message.includes('is not declared in this file')));
    });
  });

  describe('Issue 5: Lexical Scope-Aware React Hook Validation', () => {
    it('accepts combined import React, { useState } from "react"', () => {
      const code = "import React, { useState } from 'react';\nexport function C() { const [s] = useState(0); return null; }";
      const errors: ProjectValidationError[] = [];
      validateReactHookImports('src/C.tsx', code, errors);
      assert.strictEqual(errors.length, 0);
    });

    it('rejects unimported React.useState() when React is never imported', () => {
      const code = 'export function C() { const [s] = React.useState(0); return null; }';
      const errors: ProjectValidationError[] = [];
      validateReactHookImports('src/C.tsx', code, errors);
      assert.strictEqual(errors.length, 1);
      assert.ok(errors[0].message.includes('was not imported from "react"'));
    });

    it('allows locally shadowed hook identifier in its lexical scope while catching unimported hook elsewhere', () => {
      const code = `
function LocalScopeComponent() {
  const useState = () => [1, () => {}];
  const [val] = useState(); // Shadowed locally: VALID
  return null;
}

function GlobalComponent() {
  const [val, setVal] = useState(0); // Not imported or shadowed: INVALID
  return null;
}
`;
      const errors: ProjectValidationError[] = [];
      validateReactHookImports('src/Component.tsx', code, errors);
      assert.strictEqual(errors.length, 1);
      assert.ok(errors[0].message.includes('React hook "useState"') && errors[0].message.includes('not explicitly imported'));
    });
  });
});
