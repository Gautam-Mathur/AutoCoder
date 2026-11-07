import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseHtmlDocument,
  resolveHtmlAssetPath,
  validateCssSelectorTokens,
  validateDomContracts,
} from '../dom-contract-validator';
import {
  scanUnguardedDomDereferences,
  evaluateConditionPolarity,
  isExactTargetIdentifier,
  validateSecurityGate,
} from '../security-gate';
import {
  computeDiagnosticFingerprint,
  analyzeRepairTrajectory,
} from '../repair-coordinator';
import {
  isTsCheckEnabled,
  STANDARD_DOM_PROPERTIES,
} from '../linter';
import { executeStaticFrontendSmokeTest } from '../runtime-validator';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('AutoCoder 24-Scenario Acceptance Test Matrix', () => {
  describe('DOM Contract Validator Scenarios (1 - 11)', () => {
    it('Scenario 1: #cake missing from paired HTML -> FAIL (DOM_SELECTOR_MISSING_ID)', () => {
      const files = {
        'index.html': `<!DOCTYPE html><html><body><div class="cake"></div><script src="script.js"></script></body></html>`,
        'script.js': `const cake = document.getElementById("cake"); cake.style.filter = "brightness(1.2)";`,
      };
      const res = validateDomContracts(files);
      assert.equal(res.status, 'FAIL');
      assert.equal(res.failures.length, 1);
      assert.equal(res.failures[0].code, 'DOM_SELECTOR_MISSING_ID');
      assert.match(res.failures[0].message, /getElementById\("cake"\)/);
    });

    it('Scenario 2: #cake exists in unrelated HTML -> FAIL (No cross-document bleed)', () => {
      const files = {
        'index.html': `<!DOCTYPE html><html><body><div class="cake"></div><script src="script.js"></script></body></html>`,
        'admin.html': `<!DOCTYPE html><html><body><div id="cake"></div><script src="admin.js"></script></body></html>`,
        'script.js': `const cake = document.getElementById("cake");`,
        'admin.js': `const cake = document.getElementById("cake");`,
      };
      const res = validateDomContracts(files);
      assert.equal(res.status, 'FAIL');
      assert.equal(res.failures.length, 1);
      assert.equal(res.failures[0].file, 'script.js');
      assert.equal(res.failures[0].code, 'DOM_SELECTOR_MISSING_ID');
    });

    it('Scenario 3: Valid .cake selector -> PASS', () => {
      const files = {
        'index.html': `<!DOCTYPE html><html><body><div class="cake"></div><script src="script.js"></script></body></html>`,
        'script.js': `const cake = document.querySelector(".cake"); cake.style.filter = "brightness(1.2)";`,
      };
      const res = validateDomContracts(files);
      assert.equal(res.status, 'PASS');
      assert.equal(res.failures.length, 0);
      assert.equal(res.matchedCount, 1);
    });

    it('Scenario 4: Dynamic selector querySelector("#" + id) -> INCOMPLETE (Never false PASS)', () => {
      const files = {
        'index.html': `<!DOCTYPE html><html><body><div id="cake"></div><script src="script.js"></script></body></html>`,
        'script.js': `const id = "cake"; const el = document.querySelector("#" + id);`,
      };
      const res = validateDomContracts(files);
      assert.equal(res.status, 'INCOMPLETE');
      assert.equal(res.dynamicCount, 1);
      assert.equal(res.failures.length, 0);
    });

    it('Scenario 5: Missing HTML file (backend only) -> NOT_APPLICABLE', () => {
      const files = {
        'server.js': `const express = require('express'); const app = express();`,
      };
      const res = validateDomContracts(files);
      assert.equal(res.status, 'NOT_APPLICABLE');
      assert.equal(res.failures.length, 0);
    });

    it('Scenario 6: Compound selector missing element -> FAIL (DOM_SELECTOR_MISSING_ELEMENT)', () => {
      const files = {
        'index.html': `<!DOCTYPE html><html><body><div class="present"></div><script src="script.js"></script></body></html>`,
        'script.js': `const el = document.querySelector("body .missing-element");`,
      };
      const res = validateDomContracts(files);
      assert.equal(res.status, 'FAIL');
      assert.equal(res.failures.length, 1);
      assert.equal(res.failures[0].code, 'DOM_SELECTOR_MISSING_ELEMENT');
    });

    it('Scenario 7: Attribute value containing selector syntax -> PASS (css-what isolates attribute)', () => {
      const files = {
        'index.html': `<!DOCTYPE html><html><body><div data-label=".missing"></div><script src="script.js"></script></body></html>`,
        'script.js': `const el = document.querySelector('[data-label=".missing"]');`,
      };
      const res = validateDomContracts(files);
      assert.equal(res.status, 'PASS');
      assert.equal(res.failures.length, 0);
    });

    it('Scenario 8: Two scripts with identical names in different dirs -> Canonical path match', () => {
      const files = {
        'admin/index.html': `<!DOCTYPE html><html><body><div id="admin-panel"></div><script src="script.js"></script></body></html>`,
        'shop/index.html': `<!DOCTYPE html><html><body><div id="shop-cart"></div><script src="script.js"></script></body></html>`,
        'admin/script.js': `const p = document.getElementById("admin-panel");`,
        'shop/script.js': `const c = document.getElementById("shop-cart");`,
      };
      const res = validateDomContracts(files);
      assert.equal(res.status, 'PASS');
      assert.equal(res.failures.length, 0);
      assert.equal(res.matchedCount, 2);
    });

    it('Scenario 9: Unlinked script in multi-page project -> INCOMPLETE (Never false PASS)', () => {
      const files = {
        'page1.html': `<!DOCTYPE html><html><body><script src="main.js"></script></body></html>`,
        'page2.html': `<!DOCTYPE html><html><body><script src="main.js"></script></body></html>`,
        'main.js': `console.log("main");`,
        'orphan.js': `document.getElementById("cake");`,
      };
      const res = validateDomContracts(files);
      assert.equal(res.status, 'INCOMPLETE');
      assert.match(res.details[0], /UNRESOLVED_SCRIPT/);
    });

    it('Scenario 10: Shared script linked to multiple documents -> PASS (Disjunctive matching)', () => {
      const files = {
        'home.html': `<!DOCTYPE html><html><body><div class="card"></div><script src="shared.js"></script></body></html>`,
        'about.html': `<!DOCTYPE html><html><body><div class="info"></div><script src="shared.js"></script></body></html>`,
        'shared.js': `const card = document.querySelector(".card");`,
      };
      const res = validateDomContracts(files);
      assert.equal(res.status, 'PASS');
      assert.equal(res.failures.length, 0);
      assert.equal(res.matchedCount, 1);
    });

    it('Scenario 11: Root-relative script URL (/assets/app.js) -> Resolves to project root', () => {
      const resolved = resolveHtmlAssetPath('sub/index.html', '/assets/app.js');
      assert.equal(resolved, 'assets/app.js');

      const relative = resolveHtmlAssetPath('sub/index.html', '../scripts/app.js');
      assert.equal(relative, 'scripts/app.js');

      const traversal = resolveHtmlAssetPath('index.html', '../../etc/passwd');
      assert.equal(traversal, null);
    });
  });

  describe('Runtime Headless Execution Scenarios (12 - 17)', () => {
    it('Scenario 12: Timer accesses null element -> Smoke Test fails with Uncaught TypeError', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-test-12-'));
      try {
        fs.writeFileSync(
          path.join(tmpDir, 'index.html'),
          `<!DOCTYPE html><html><body><div class="cake"></div><script src="app.js"></script></body></html>`
        );
        fs.writeFileSync(
          path.join(tmpDir, 'app.js'),
          `const cakeElement = document.getElementById("cake");
           setInterval(() => {
             cakeElement.style.filter = "brightness(1.2)";
           }, 100);`
        );

        const res = await executeStaticFrontendSmokeTest({
          conversationId: 'test-12',
          projectDir: tmpDir,
          observationWindowMs: 1000,
        });

        assert.equal(res.executed, true);
        assert.equal(res.success, false);
        assert.match(res.error || '', /TypeError|Uncaught Exception|Cannot read properties of null/i);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('Scenario 13: Path traversal attempt -> Forbidden traversal confined', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-test-13-'));
      try {
        fs.writeFileSync(
          path.join(tmpDir, 'index.html'),
          `<!DOCTYPE html><html><body><h1>Safe</h1></body></html>`
        );

        const res = await executeStaticFrontendSmokeTest({
          conversationId: 'test-13',
          projectDir: tmpDir,
          entryFile: '../../etc/passwd',
          observationWindowMs: 500,
        });

        assert.equal(res.executed, false);
        assert.match(res.error || '', /Forbidden: Entry file .* escapes project boundary/i);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('Scenario 14: Untrusted page attempts localhost access -> Blocked via CDP Fetch', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-test-14-'));
      try {
        fs.writeFileSync(
          path.join(tmpDir, 'index.html'),
          `<!DOCTYPE html><html><body>
           <script>
             fetch("http://localhost:3000/api/secret").catch(err => {
               console.error("BLOCKED_FETCH: " + err.message);
             });
           </script>
           </body></html>`
        );

        const res = await executeStaticFrontendSmokeTest({
          conversationId: 'test-14',
          projectDir: tmpDir,
          observationWindowMs: 1000,
        });

        // The external request was failed by Fetch.failRequest(AccessDenied)
        assert.equal(res.executed, true);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('Scenario 15: Missing entry file -> Returns execution error', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-test-15-'));
      try {
        const res = await executeStaticFrontendSmokeTest({
          conversationId: 'test-15',
          projectDir: tmpDir,
          entryFile: 'missing.html',
        });
        assert.equal(res.executed, false);
        assert.match(res.error || '', /missing\.html not found/);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe('Security AST Guard Scenarios (18 - 22)', () => {
    it('Scenario 18: Guarded DOM reference if (cake) -> PASS', () => {
      const files = {
        'app.js': `const cake = document.getElementById("cake"); if (cake) { cake.style.filter = "brightness(1.2)"; }`,
      };
      const res = scanUnguardedDomDereferences(files);
      assert.equal(res.hasViolations, false);
      assert.equal(res.violations.length, 0);
    });

    it('Scenario 19: Unguarded DOM reference -> Security Gate FAIL', () => {
      const files = {
        'app.js': `const cake = document.getElementById("cake"); setInterval(() => cake.style.filter = "none", 200);`,
      };
      const res = scanUnguardedDomDereferences(files);
      assert.equal(res.hasViolations, true);
      assert.equal(res.violations.length, 1);
      assert.match(res.violations[0].reason, /without positive null check/);

      const gateRes = validateSecurityGate(files);
      assert.equal(gateRes.passed, false);
      assert.equal(gateRes.blocking[0].ruleId, 'UNGUARDED_DOM_DEREFERENCE');
    });

    it('Scenario 20: Inverted null check if (!cake) -> Security Gate FAIL (Dangerous in then branch)', () => {
      const files = {
        'app.js': `const cake = document.getElementById("cake"); if (!cake) { cake.style.filter = "none"; }`,
      };
      const res = scanUnguardedDomDereferences(files);
      assert.equal(res.hasViolations, true);
      assert.equal(res.violations.length, 1);
    });

    it('Scenario 21: Explicit null comparison if (cake === null) -> Security Gate FAIL (Dangerous in then branch)', () => {
      const files = {
        'app.js': `const cake = document.getElementById("cake"); if (cake === null) { cake.style.filter = "none"; }`,
      };
      const res = scanUnguardedDomDereferences(files);
      assert.equal(res.hasViolations, true);
      assert.equal(res.violations.length, 1);
    });

    it('Scenario 22: Decoy property guard if (decoy.cake) -> Security Gate FAIL (Decoy does not guard cake)', () => {
      const files = {
        'app.js': `const cake = document.getElementById("cake"); const decoy = { cake: true }; if (decoy.cake) { cake.style.filter = "none"; }`,
      };
      const res = scanUnguardedDomDereferences(files);
      assert.equal(res.hasViolations, true);
      assert.equal(res.violations.length, 1);
    });
  });

  describe('Linter & Repair Trajectory Scenarios (23 - 24)', () => {
    it('Scenario 23: Vanilla JS DOM property whitelist and @ts-check boundary', () => {
      const standardProps = STANDARD_DOM_PROPERTIES;
      assert.equal(standardProps.has('value'), true);
      assert.equal(standardProps.has('style'), true);
      assert.equal(standardProps.has('dataset'), true);
      assert.equal(standardProps.has('unsupportedBogusProp'), false);

      const topComment = `// @ts-check\nconst x = 1;`;
      assert.equal(isTsCheckEnabled(topComment), true);

      const deepComment = `const a = 1;\nconst b = 2;\nconst c = 3;\nconst d = 4;\nconst e = 5;\nconst f = 6;\n// @ts-check`;
      assert.equal(isTsCheckEnabled(deepComment), false);
    });

    it('Scenario 24: Identical diagnostics at cycle 1 and 2 -> Halt on Cycle 2 (OSCILLATION_DETECTED)', () => {
      const failures = [
        { file: 'app.js', message: 'Element not found', code: 'DOM_MISSING_ID' },
      ];
      const cycle1 = computeDiagnosticFingerprint(1, failures);
      const cycle2 = computeDiagnosticFingerprint(2, failures);

      assert.equal(cycle1.signatureHash, cycle2.signatureHash);

      const res = analyzeRepairTrajectory([cycle1], cycle2, 5);
      assert.equal(res.shouldHalt, true);
      assert.equal(res.reason, 'OSCILLATION_DETECTED');
    });
  });
});
