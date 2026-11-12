import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { prisma } from '../../../db';
import { writeVirtualFile } from '../vfs';
import { sanitizeCoderOutputForFile } from '../orchestrator';
import { executeStaticFrontendSmokeTest } from '../runtime-validator';
import { runFullWorkspaceTester, runDeterministicTesterReport } from '../verification-loop';
import {
  normalizeFailures,
  resolveCanonicalRepairContext,
  coordinateRepair,
  buildCompactLineDiff,
  computeDiagnosticFingerprint,
  analyzeRepairTrajectory,
} from '../repair-coordinator';
import { scanUnguardedDomDereferences, validateSecurityGate } from '../security-gate';
import { validateStageCandidate } from '../stage-acceptance';

describe('Verification, Repair Context, Security Evidence & Trajectory Hardening Suite', () => {
  const testPrefix = `hardening-${Date.now()}`;
  const convId = `${testPrefix}-conv`;
  const runId = `${testPrefix}-run`;
  const execId = `${testPrefix}-exec`;
  const createdConvIds = [convId];

  function buildAsciiTree(filePaths: string[]): string {
    interface Node {
      [key: string]: Node | null;
    }
    const root: Node = {};
    for (const fp of [...filePaths].sort()) {
      const parts = fp.split('/').filter(Boolean);
      let cur = root;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          cur[part] = null;
        } else {
          cur[part] = (cur[part] as Node) || {};
          cur = cur[part] as Node;
        }
      }
    }
    const lines = ['project-root/'];
    const render = (node: Node, indent: string) => {
      for (const key of Object.keys(node).sort()) {
        const child = node[key];
        if (child === null) {
          lines.push(`${indent}├── ${key}`);
        } else {
          lines.push(`${indent}├── ${key}/`);
          render(child, indent + '│   ');
        }
      }
    };
    render(root, '');
    return lines.join('\n');
  }

  async function seedAuthorizedWorkspace(opts: {
    conversationId: string;
    pipelineRunId: string;
    currentStage: string;
    frontendEntryPoint: string;
    files: Record<string, string>;
  }): Promise<{ coderExecId: string; testerExecId: string }> {
    const filePaths = Object.keys(opts.files);
    const coderExecId = `${opts.pipelineRunId}-coder`;
    const testerExecId = `${opts.pipelineRunId}-tester`;

    createdConvIds.push(opts.conversationId);

    await prisma.conversation.create({
      data: {
        id: opts.conversationId,
        title: `Conv ${opts.conversationId}`,
        status: 'Active',
        currentStage: opts.currentStage,
      },
    });
    await prisma.pipelineRun.create({
      data: {
        id: opts.pipelineRunId,
        conversationId: opts.conversationId,
        state: 'RUNNING',
      },
    });
    await prisma.stageExecution.create({
      data: {
        id: coderExecId,
        conversationId: opts.conversationId,
        pipelineRunId: opts.pipelineRunId,
        stageName: 'Coder',
        attempt: 1,
        state: 'RUNNING',
      },
    });
    await prisma.stageExecution.create({
      data: {
        id: testerExecId,
        conversationId: opts.conversationId,
        pipelineRunId: opts.pipelineRunId,
        stageName: 'Tester',
        attempt: 1,
        state: 'RUNNING',
      },
    });

    const archMd = `### Tech Stack
- Frontend: Static HTML/TS
- Frontend Entry Point: ${opts.frontendEntryPoint}
- Backend: None
- Backend Entry Point: None
- Database: None
- ORM: None
- Authentication: None
- Build Tool: None
- Additional: None

### Project Folder Structure
${buildAsciiTree(filePaths)}

### Project Files
${filePaths.map((p) => `- ${p}`).join('\n')}

### Modules
**Core Module**
- Responsibility: Main application logic
- Owned Files: ${filePaths.join(', ')}
- Depends On: None
- Supports Features: Core

### Conventions
- File Naming: camelCase
`;

    const blueprintMd = filePaths
      .map(
        (p) => `### File: ${p}
- Owner Module: Core Module
- Purpose: Application file ${p}
- Dependencies: None
- Specs Required: None
- Exports: default`
      )
      .join('\n\n');

    await prisma.artifactVersion.create({
      data: {
        conversationId: opts.conversationId,
        pipelineRunId: opts.pipelineRunId,
        stageName: 'Architect',
        filePath: 'architecture.md',
        version: 1,
        contentHash: `hash-arch-${opts.pipelineRunId}`,
        content: archMd,
        state: 'ACCEPTED',
      },
    });
    await prisma.artifactVersion.create({
      data: {
        conversationId: opts.conversationId,
        pipelineRunId: opts.pipelineRunId,
        stageName: 'Blueprinter',
        filePath: 'blueprint.md',
        version: 1,
        contentHash: `hash-blue-${opts.pipelineRunId}`,
        content: blueprintMd,
        state: 'ACCEPTED',
      },
    });

    for (const [fp, content] of Object.entries(opts.files)) {
      await writeVirtualFile(opts.conversationId, fp, content, {
        pipelineRunId: opts.pipelineRunId,
        stageExecutionId: coderExecId,
      });
    }

    return { coderExecId, testerExecId };
  }

  before(async () => {
    await prisma.conversation.create({
      data: {
        id: convId,
        title: 'Hardening Test Conversation',
        status: 'Active',
        currentStage: 'Tester',
      },
    });
    await prisma.pipelineRun.create({
      data: {
        id: runId,
        conversationId: convId,
        state: 'RUNNING',
      },
    });
    await prisma.stageExecution.create({
      data: {
        id: execId,
        conversationId: convId,
        pipelineRunId: runId,
        stageName: 'Tester',
        attempt: 1,
        state: 'RUNNING',
      },
    });
  });

  after(async () => {
    for (const cid of createdConvIds) {
      await prisma.verificationRun.deleteMany({ where: { conversationId: cid } }).catch(() => {});
      await prisma.artifactVersion.deleteMany({ where: { conversationId: cid } }).catch(() => {});
      await prisma.stageExecution.deleteMany({ where: { conversationId: cid } }).catch(() => {});
      await prisma.virtualFile.deleteMany({ where: { conversationId: cid } }).catch(() => {});
      await prisma.pipelineRun.deleteMany({ where: { conversationId: cid } }).catch(() => {});
      await prisma.conversation.deleteMany({ where: { id: cid } }).catch(() => {});
      const projDir = path.join(process.cwd(), 'projects', cid);
      if (fs.existsSync(projDir)) {
        fs.rmSync(projDir, { recursive: true, force: true });
      }
    }
    await prisma.$disconnect();
  });

  describe('Sanitization & Runtime Headless Chrome Diagnostics', () => {
    it('preserves valid code containing "Note:" prose tokens during Coder sanitization', () => {
      const code = `// Note: this handler formats user notes\nexport function noteFormatter(note: string) {\n  return \`Note: \${note}\`;\n}`;
      const sanitized = sanitizeCoderOutputForFile(code, 'src/utils/notes.ts');
      assert.ok(sanitized.includes('Note: this handler formats user notes'));
      assert.ok(sanitized.includes('export function noteFormatter'));
    });

    it('captures exact blocked external resource URL on CDP Fetch AccessDenied', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hardening-cdp-blocked-'));
      try {
        fs.writeFileSync(
          path.join(tmpDir, 'index.html'),
          `<!DOCTYPE html><html><head><script src="https://cdn.example.com/lib.js"></script></head><body><h1>Blocked CDN</h1></body></html>`
        );
        const res = await executeStaticFrontendSmokeTest({
          conversationId: `${testPrefix}-blocked`,
          projectDir: tmpDir,
          observationWindowMs: 800,
        });
        assert.equal(res.executed, true);
        assert.equal(res.success, false);
        assert.match(res.error || '', /https:\/\/cdn\.example\.com\/lib\.js/);
        assert.match(res.error || '', /AccessDenied/);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('fails runtime smoke test on missing local script/asset (HTTP 404)', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hardening-cdp-404-'));
      try {
        fs.writeFileSync(
          path.join(tmpDir, 'index.html'),
          `<!DOCTYPE html><html><body><h1>Missing Asset</h1><script src="missing-bundle.js"></script></body></html>`
        );
        const res = await executeStaticFrontendSmokeTest({
          conversationId: `${testPrefix}-404`,
          projectDir: tmpDir,
          observationWindowMs: 800,
        });
        assert.equal(res.executed, true);
        assert.equal(res.success, false);
        assert.match(res.error || '', /404|missing-bundle\.js/i);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('captures Runtime.consoleAPICalled error calls in static runtime smoke test', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hardening-cdp-console-'));
      try {
        fs.writeFileSync(
          path.join(tmpDir, 'index.html'),
          `<!DOCTYPE html><html><body><script>console.error("FATAL_UI_INIT_ERROR: missing widget");</script></body></html>`
        );
        const res = await executeStaticFrontendSmokeTest({
          conversationId: `${testPrefix}-console`,
          projectDir: tmpDir,
          observationWindowMs: 800,
        });
        assert.equal(res.executed, true);
        assert.equal(res.success, false);
        assert.match(res.error || '', /FATAL_UI_INIT_ERROR/);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe('Tester INCOMPLETE Propagation & Honest Test Report Status', () => {
    it('propagates validateDomContracts INCOMPLETE (dynamic selector / orphan script) to overallStatus INCOMPLETE and NOT_APPLICABLE dependencies', async () => {
      const cidDomIncomplete = `${testPrefix}-dom-inc`;
      const ridDomIncomplete = `${testPrefix}-run-inc`;
      const { testerExecId } = await seedAuthorizedWorkspace({
        conversationId: cidDomIncomplete,
        pipelineRunId: ridDomIncomplete,
        currentStage: 'Tester',
        frontendEntryPoint: 'index.html',
        files: {
          'index.html': `<!DOCTYPE html><html><body><div id="app">OK</div><script src="app.js"></script></body></html>`,
          'app.js': `const key = "app"; const el = document.querySelector("#" + key);`,
        },
      });

      const testerRes = await runFullWorkspaceTester(cidDomIncomplete, 1);
      assert.equal(testerRes.success, false, 'DOM INCOMPLETE must never produce success=true');
      assert.equal(testerRes.telemetry.overallStatus, 'INCOMPLETE');

      const report = await runDeterministicTesterReport({
        conversationId: cidDomIncomplete,
        pipelineRunId: ridDomIncomplete,
        stageExecutionId: testerExecId,
        cycle: 1,
      });
      assert.equal(report.success, false);
      assert.match(report.content, /### Result\nINCOMPLETE/);
      assert.match(report.content, /- Dependency Validation: NOT_APPLICABLE/);
    });

    it('passes static HTML project without package.json via headless browser and marks Dependency Validation NOT_APPLICABLE', async () => {
      const cidStaticPass = `${testPrefix}-static-pass`;
      const ridStaticPass = `${testPrefix}-run-pass`;
      const { testerExecId } = await seedAuthorizedWorkspace({
        conversationId: cidStaticPass,
        pipelineRunId: ridStaticPass,
        currentStage: 'Tester',
        frontendEntryPoint: 'index.html',
        files: {
          'index.html': `<!DOCTYPE html><html><body><div id="greeting">Hello</div><script src="app.js"></script></body></html>`,
          'app.js': `const el = document.getElementById("greeting"); if (el) { el.textContent = "Verified"; }`,
        },
      });

      const report = await runDeterministicTesterReport({
        conversationId: cidStaticPass,
        pipelineRunId: ridStaticPass,
        stageExecutionId: testerExecId,
        cycle: 1,
      });
      assert.equal(report.success, true);
      assert.match(report.content, /### Result\nPASS/);
      assert.match(report.content, /- Runtime Smoke Test: PASS/);
      assert.match(report.content, /- Dependency Validation: NOT_APPLICABLE/);
    });
  });

  describe('Repair Context, Multi-line Normalization, Prior Diff & Trajectory', () => {
    it('normalizeFailures preserves multi-line failure details and stack traces', () => {
      const report = `# Test Report
### Result
FAIL

### Failures
- [runtime] Runtime Smoke Test Failed:
TypeError: Cannot read properties of null (reading 'style')
at http://127.0.0.1:41000/app.js:4
- [app.js] Syntax error near line 10

### Workspace Hash
${'b'.repeat(64)}
`;
      const failures = normalizeFailures(report);
      assert.equal(failures.length, 2);
      assert.match(failures[0].message, /Runtime Smoke Test Failed:/);
      assert.match(failures[0].message, /TypeError: Cannot read properties of null/);
      assert.match(failures[0].message, /at http:\/\/127\.0\.0\.1:41000\/app\.js:4/);
      assert.equal(failures[1].message, 'Syntax error near line 10');
    });

    it('resolveCanonicalRepairContext pairs scripts/HTML/CSS accurately, isolates same-named scripts, and resolves TS imports', async () => {
      const cidRepair = `${testPrefix}-repair-ctx`;
      const ridRepair = `${testPrefix}-run-ctx`;
      await seedAuthorizedWorkspace({
        conversationId: cidRepair,
        pipelineRunId: ridRepair,
        currentStage: 'Debugger',
        frontendEntryPoint: 'admin/index.html',
        files: {
          'admin/index.html': `<!DOCTYPE html><html><head><link rel="stylesheet" href="admin.css"></head><body><div id="admin-box"></div><script src="script.js"></script></body></html>`,
          'admin/admin.css': `.admin-btn { color: red; }`,
          'admin/script.js': `document.getElementById("admin-box");`,
          'shop/index.html': `<!DOCTYPE html><html><head><link rel="stylesheet" href="shop.css"></head><body><div id="shop-cart"></div><script src="script.js"></script></body></html>`,
          'shop/shop.css': `.cart { color: blue; }`,
          'shop/script.js': `document.getElementById("shop-cart");`,
          'tsconfig.json': JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@/*': ['./src/*'] } } }),
          'src/lib/store.ts': `export const storeName = "AutoShop";`,
          'src/components/Card.tsx': `export function Card() { return null; }`,
          'src/app/page.tsx': `import { storeName } from '@/lib/store';\nimport { Card } from '../components/Card';\nexport default function Page() { return storeName + Card(); }`,
        },
      });

      // 1. Directory-scoped script disambiguation
      const adminCtx = await resolveCanonicalRepairContext(cidRepair, 'admin/script.js');
      const adminPaths = adminCtx.inflowFiles.map((f) => f.path);
      assert.ok(adminPaths.includes('admin/script.js'));
      assert.ok(adminPaths.includes('admin/index.html'));
      assert.ok(adminPaths.includes('admin/admin.css'));
      assert.equal(adminPaths.includes('shop/index.html'), false);
      assert.equal(adminPaths.includes('shop/shop.css'), false);
      assert.match(adminCtx.domContractSnippet || '', /admin-box/);
      assert.doesNotMatch(adminCtx.domContractSnippet || '', /shop-cart/);

      // 2. HTML target receives itself + linked scripts/CSS + DOM contract snippet
      const htmlCtx = await resolveCanonicalRepairContext(cidRepair, 'shop/index.html');
      const htmlPaths = htmlCtx.inflowFiles.map((f) => f.path);
      assert.ok(htmlPaths.includes('shop/index.html'));
      assert.ok(htmlPaths.includes('shop/script.js'));
      assert.ok(htmlPaths.includes('shop/shop.css'));
      assert.match(htmlCtx.domContractSnippet || '', /shop-cart/);

      // 3. TS/JS local imports resolved cleanly via AST + module-resolver
      const pageCtx = await resolveCanonicalRepairContext(cidRepair, 'src/app/page.tsx');
      const pagePaths = pageCtx.inflowFiles.map((f) => f.path);
      assert.ok(pagePaths.includes('src/app/page.tsx'));
      assert.ok(pagePaths.includes('src/lib/store.ts'));
      assert.ok(pagePaths.includes('src/components/Card.tsx'));
    });

    it('coordinateRepair gives Debugger canonical source context, computes priorRepairDiff across cycles, and avoids repeating stale plans', async () => {
      const cidLoop = `${testPrefix}-loop`;
      const ridLoop = `${testPrefix}-run-loop`;
      const { coderExecId } = await seedAuthorizedWorkspace({
        conversationId: cidLoop,
        pipelineRunId: ridLoop,
        currentStage: 'Tester',
        frontendEntryPoint: 'index.html',
        files: {
          'index.html': `<!DOCTYPE html><html><body><div id="cake-el"></div><script src="app.js"></script></body></html>`,
          'app.js': `const el = document.getElementById("cake");\nel.style.color = "red";`,
        },
      });

      let testerCalls = 0;
      const debuggerInputs: string[] = [];
      const coderInputs: string[] = [];

      await coordinateRepair({
        conversationId: cidLoop,
        pipelineRunId: ridLoop,
        authorizedFileSet: {
          authorizedFiles: ['index.html', 'app.js'],
          coderAuthorizedFiles: ['index.html', 'app.js'],
        } as any,
        emit: () => {},
        executeStageFn: async (stageName, customInput, targetFile) => {
          if (stageName === 'Tester') {
            testerCalls++;
            const hash = testerCalls === 1 ? '1'.repeat(64) : testerCalls === 2 ? '2'.repeat(64) : '3'.repeat(64);
            if (testerCalls === 1) {
              return {
                status: 'ACCEPTED',
                stageExecution: { id: `t-${testerCalls}`, state: 'ACCEPTED' },
                content: `# Test Report\n\n### Result\nFAIL\n\n### Summary\nFail 1\n\n### Tests\n- DOM: FAIL\n\n### Failures\n- [app.js] getElementById("cake") missing ID\n\n### Workspace Hash\n${hash}`,
              };
            }
            if (testerCalls === 2) {
              return {
                status: 'ACCEPTED',
                stageExecution: { id: `t-${testerCalls}`, state: 'ACCEPTED' },
                content: `# Test Report\n\n### Result\nFAIL\n\n### Summary\nFail 2\n\n### Tests\n- Security: FAIL\n\n### Failures\n- [app.js] Unguarded DOM access on el.style\n\n### Workspace Hash\n${hash}`,
              };
            }
            return {
              status: 'ACCEPTED',
              stageExecution: { id: `t-${testerCalls}`, state: 'ACCEPTED' },
              content: `# Test Report\n\n### Result\nPASS\n\n### Summary\nPassed\n\n### Tests\n- All: PASS\n\n### Failures\nNone\n\n### Workspace Hash\n${hash}`,
            };
          }

          if (stageName === 'Debugger') {
            debuggerInputs.push(customInput || '');
            return {
              status: 'ACCEPTED',
              stageExecution: { id: `d-${debuggerInputs.length}`, state: 'ACCEPTED' },
              content: `# Debug Report\n\n### Issues Addressed\n- File: app.js\nDiagnostics cycle ${debuggerInputs.length}\n\n### Patches Applied\n- File: app.js\nWhat was changed: Fix selector and null check\n\n### Verification\nPending Tester.`,
            };
          }

          if (stageName === 'Coder') {
            coderInputs.push(customInput || '');
            if (targetFile === 'app.js' && coderInputs.length === 1) {
              await writeVirtualFile(
                cidLoop,
                'app.js',
                `const el = document.getElementById("cake-el");\nel.style.color = "red";`,
                { pipelineRunId: ridLoop, stageExecutionId: coderExecId }
              );
            } else if (targetFile === 'app.js') {
              await writeVirtualFile(
                cidLoop,
                'app.js',
                `const el = document.getElementById("cake-el");\nif (el) { el.style.color = "red"; }`,
                { pipelineRunId: ridLoop, stageExecutionId: coderExecId }
              );
            }
            return {
              status: 'ACCEPTED',
              stageExecution: { id: `c-${coderInputs.length}`, state: 'ACCEPTED' },
              content: 'ok',
            };
          }
          throw new Error(`Unexpected stage: ${stageName}`);
        },
      });

      assert.equal(debuggerInputs.length, 2, 'Debugger must run freshly on every failing cycle');
      assert.match(debuggerInputs[0], /id="cake-el"/, 'Debugger Cycle 1 must receive host HTML context');
      assert.match(debuggerInputs[1], /Prior Cycle Repair Diff/, 'Debugger Cycle 2 must receive prior repair diff');
      assert.match(coderInputs[1], /Prior Repair Diff/, 'Coder Cycle 2 must receive prior repair diff');
      assert.match(coderInputs[1], /- L1: const el = document\.getElementById\("cake"\);/);
      assert.match(coderInputs[1], /\+ L1: const el = document\.getElementById\("cake-el"\);/);
    });

    it('analyzeRepairTrajectory distinguishes consecutive plateau (DIMINISHING_RETURNS) from true oscillation (A -> B -> A)', () => {
      const fA = [{ file: 'app.js', message: 'Error A', code: 'E_A' }];
      const fB = [{ file: 'app.js', message: 'Error B', code: 'E_B' }];

      const c1 = computeDiagnosticFingerprint(1, fA);
      const c2 = computeDiagnosticFingerprint(2, fA);
      const c3 = computeDiagnosticFingerprint(3, fA);
      const c4 = computeDiagnosticFingerprint(4, fA);

      assert.equal(analyzeRepairTrajectory([c1], c2, 10).shouldHalt, false);
      // Cycle 3 on A -> A -> A must NOT misclassify as OSCILLATION_DETECTED
      assert.equal(analyzeRepairTrajectory([c1, c2], c3, 10).shouldHalt, false);
      // Cycle 4 on A -> A -> A -> A hits DIMINISHING_RETURNS cleanly
      const dimRes = analyzeRepairTrajectory([c1, c2, c3], c4, 10);
      assert.equal(dimRes.shouldHalt, true);
      assert.equal(dimRes.reason, 'DIMINISHING_RETURNS');

      // Whereas A -> B -> A MUST still hit OSCILLATION_DETECTED
      const b2 = computeDiagnosticFingerprint(2, fB);
      const a3 = computeDiagnosticFingerprint(3, fA);
      const oscRes = analyzeRepairTrajectory([c1, b2], a3, 10);
      assert.equal(oscRes.shouldHalt, true);
      assert.equal(oscRes.reason, 'OSCILLATION_DETECTED');
    });
  });

  describe('Security AST Coverage (.tsx / Inline HTML) & Evidence-Backed Stage Acceptance', () => {
    it('scans .tsx and inline <script> in .html accurately while ignoring React e.target.value / item.value / props.style', () => {
      const files = {
        'src/Widget.tsx': `import React, { useRef } from 'react';
export function Widget({ items, onChange }: any) {
  const boxRef = useRef<HTMLDivElement>(null);
  const el = document.getElementById('banner');
  el.style.display = 'block';
  return <input value={items[0].value} onChange={(e) => onChange(e.target.value)} />;
}`,
        'index.html': `<!DOCTYPE html>
<html>
<body>
<div id="status"></div>
<script>
const statusEl = document.getElementById('status');
statusEl.innerHTML = '<span>Unsafe</span>';
</script>
</body>
</html>`,
      };

      const scanRes = scanUnguardedDomDereferences(files);
      assert.equal(scanRes.hasViolations, true);
      const tsxViolations = scanRes.violations.filter((v) => v.file === 'src/Widget.tsx');
      const htmlViolations = scanRes.violations.filter((v) => v.file === 'index.html');

      assert.equal(tsxViolations.length, 1, 'Should catch only unguarded el.style in TSX without React false positives');
      assert.equal(tsxViolations[0].line, 5);
      assert.equal(htmlViolations.length, 1, 'Should catch inline <script> unguarded DOM dereference in HTML');
      assert.equal(htmlViolations[0].line, 7, 'Must report exact 1-based line number in HTML file');

      const gateRes = validateSecurityGate(files);
      assert.equal(gateRes.passed, false);
      assert.ok(gateRes.blocking.some((b) => b.ruleId === 'UNGUARDED_DOM_DEREFERENCE' && b.file === 'index.html'));
    });

    it('rejects unsupported SECURE claims, false external dependency denials, and fabricated files when evidence.workspaceFiles is supplied', async () => {
      const hash = 'f'.repeat(64);
      const vfsFiles = {
        'index.html': `<!DOCTYPE html><html><head><script src="https://cdn.example.com/pkg.js"></script></head><body><script src="app.js"></script></body></html>`,
        'app.js': `const el = document.getElementById('cake'); el.style.filter = 'none';`,
      };

      // 1. Report claims SECURE despite unguarded DOM dereference
      const fakeSecure = `# Security Audit Report

### Overall Status
SECURE

### Security Score
95

### Vulnerabilities Found
No vulnerabilities found. The code passed security review.

### Security Checks Performed
- **Authentication**: NOT_APPLICABLE — static site
- **Input Validation**: PASS — safe
- **Data Protection**: PASS — All DOM elements were properly null-checked and there are no external dependencies.

### Recommendations
- None

### Workspace Hash
${hash}`;

      const resFake = await validateStageCandidate({
        conversationId: convId,
        pipelineRunId: runId,
        candidate: {
          stage: 'Security',
          executionId: execId,
          attempt: 1,
          content: fakeSecure,
          contentHash: 'c1',
          generatedAt: new Date(),
        },
        evidence: {
          currentWorkspaceHash: hash,
          workspaceFiles: vfsFiles,
        },
      });
      assert.equal(resFake.accepted, false);
      assert.ok(resFake.errors.some((e) => e.includes('Security Evidence Error')));
      assert.ok(resFake.errors.some((e) => e.includes('external dependencies')));
      assert.ok(resFake.errors.some((e) => e.includes('guarded')));

      // 2. Honest VULNERABLE report with score < 80 citing real file must be ACCEPTED at stage level (so final gate handles it accurately)
      const honestVulnerable = `# Security Audit Report

### Overall Status
VULNERABLE

### Security Score
55

### Vulnerabilities Found
**MEDIUM: Unguarded DOM Dereference & External CDN Script**
- File: app.js
- Line: Line 1
- Description: el.style is accessed without checking if getElementById returned null.
- Attack Scenario: Runtime TypeError disrupts page functionality.
- Recommendation: Guard with if (el) before accessing style.

### Security Checks Performed
- **Input Validation**: FAIL — Unchecked DOM element reference in app.js.
- **Dependency Security**: FAIL — External script loaded from https://cdn.example.com/pkg.js without SRI.

### Recommendations
- Guard DOM element access and add SRI or bundle dependencies locally.

### Workspace Hash
${hash}`;

      const resHonest = await validateStageCandidate({
        conversationId: convId,
        pipelineRunId: runId,
        candidate: {
          stage: 'Security',
          executionId: execId,
          attempt: 2,
          content: honestVulnerable,
          contentHash: 'c2',
          generatedAt: new Date(),
        },
        evidence: {
          currentWorkspaceHash: hash,
          workspaceFiles: vfsFiles,
        },
      });
      assert.equal(resHonest.accepted, true, `Honest VULNERABLE report failed: ${resHonest.errors.join('; ')}`);

      // 3. Fabricated file citation must be rejected
      const fabricatedCite = honestVulnerable.replace('- File: app.js', '- File: src/nonexistent.ts');
      const resFab = await validateStageCandidate({
        conversationId: convId,
        pipelineRunId: runId,
        candidate: {
          stage: 'Security',
          executionId: execId,
          attempt: 3,
          content: fabricatedCite,
          contentHash: 'c3',
          generatedAt: new Date(),
        },
        evidence: {
          currentWorkspaceHash: hash,
          workspaceFiles: vfsFiles,
        },
      });
      assert.equal(resFab.accepted, false);
      assert.ok(resFab.errors.some((e) => e.includes('non-existent workspace file')));
    });
  });
});
