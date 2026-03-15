export interface GeneratedTest {
  name: string;
  type: "unit" | "integration" | "e2e";
  code: string;
  description: string;
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

export function generateTests(code: string, filename: string): GeneratedTest[] {
  const tests: GeneratedTest[] = [];

  const functionMatches = Array.from(code.matchAll(/(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|(?:export\s+)?(?:async\s+)?function\s+(\w+))/g));
  const functions: string[] = [];

  for (const match of functionMatches) {
    const funcName = match[1] || match[2] || match[3];
    if (funcName && !funcName.startsWith("_") && funcName !== "default") {
      functions.push(funcName);
    }
  }

  for (const func of functions) {
    tests.push({
      name: `${func} should exist and be a function`,
      type: "unit",
      description: `Verifies that ${func} is defined and callable`,
      code: `
test('${func} should exist and be a function', () => {
  expect(typeof ${func}).toBe('function');
});
`,
    });

    if (func.startsWith("get") || func.startsWith("fetch")) {
      tests.push({
        name: `${func} should return data`,
        type: "unit",
        description: `Verifies that ${func} returns expected data`,
        code: `
test('${func} should return data', async () => {
  const result = await ${func}();
  expect(result).toBeDefined();
});
`,
      });
    }

    if (func.startsWith("handle") || func.startsWith("on")) {
      tests.push({
        name: `${func} should handle events`,
        type: "unit",
        description: `Verifies that ${func} handles events correctly`,
        code: `
test('${func} should handle events', () => {
  const mockEvent = { preventDefault: jest.fn() };
  ${func}(mockEvent);
  expect(mockEvent.preventDefault).toHaveBeenCalled();
});
`,
      });
    }
  }

  const apiMatches = Array.from(code.matchAll(/fetch\(['"](\/api\/[^'"]+)['"]/g));
  for (const match of apiMatches) {
    const endpoint = match[1];
    tests.push({
      name: `API ${endpoint} should respond`,
      type: "integration",
      description: `Tests the ${endpoint} API endpoint`,
      code: `
test('API ${endpoint} should respond', async () => {
  const response = await fetch('${endpoint}');
  expect(response.ok).toBe(true);
});
`,
    });
  }

  const componentMatches = Array.from(code.matchAll(/(?:function|const)\s+([A-Z]\w+)/g));
  for (const match of componentMatches) {
    const componentName = match[1];
    tests.push({
      name: `${componentName} should render`,
      type: "unit",
      description: `Verifies that ${componentName} component renders without errors`,
      code: `
import { render, screen } from '@testing-library/react';
import { ${componentName} } from './${filename.replace(/\.\w+$/, '')}';

test('${componentName} should render', () => {
  render(<${componentName} />);
  expect(document.body).toBeTruthy();
});
`,
    });
  }

  const formMatches = code.match(/<form|onSubmit|handleSubmit/g);
  if (formMatches) {
    tests.push({
      name: "Form should submit correctly",
      type: "e2e",
      description: "Tests form submission flow",
      code: `
test('Form should submit correctly', async () => {
  // Fill in form fields
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');

  // Submit form
  await page.click('button[type="submit"]');

  // Verify success
  await expect(page.locator('.success-message')).toBeVisible();
});
`,
    });
  }

  return tests;
}

export function generateTestFile(tests: GeneratedTest[], framework: "jest" | "vitest" = "vitest"): string {
  const imports = framework === "vitest"
    ? `import { describe, test, expect, vi } from 'vitest';`
    : `const { describe, test, expect } = require('@jest/globals');`;

  const unitTests = tests.filter(t => t.type === "unit");
  const integrationTests = tests.filter(t => t.type === "integration");
  const e2eTests = tests.filter(t => t.type === "e2e");

  let content = `${imports}\n\n`;

  if (unitTests.length > 0) {
    content += `describe('Unit Tests', () => {\n`;
    for (const test of unitTests) {
      content += test.code + "\n";
    }
    content += `});\n\n`;
  }

  if (integrationTests.length > 0) {
    content += `describe('Integration Tests', () => {\n`;
    for (const test of integrationTests) {
      content += test.code + "\n";
    }
    content += `});\n\n`;
  }

  if (e2eTests.length > 0) {
    content += `// E2E Tests (require Playwright or Cypress)\n`;
    content += `describe('E2E Tests', () => {\n`;
    for (const test of e2eTests) {
      content += test.code + "\n";
    }
    content += `});\n`;
  }

  return content;
}

export function runInlineTests(code: string): TestResult[] {
  const results: TestResult[] = [];
  const startTime = Date.now();

  try {
    const syntaxCheck = new Function(code);
    results.push({
      name: "Syntax Check",
      passed: true,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    results.push({
      name: "Syntax Check",
      passed: false,
      error: error instanceof Error ? error.message : "Syntax error",
      duration: Date.now() - startTime,
    });
  }

  const hasAsyncAwait = /async\s+function|await\s+/.test(code);
  const hasProperAsyncUsage = hasAsyncAwait ? /async\s+/.test(code) && /await\s+/.test(code) : true;
  results.push({
    name: "Async/Await Usage",
    passed: hasProperAsyncUsage,
    error: hasProperAsyncUsage ? undefined : "Found await without async function",
    duration: 0,
  });

  const hasConsoleLog = /console\.log\(/.test(code);
  results.push({
    name: "No Debug Logs",
    passed: !hasConsoleLog,
    error: hasConsoleLog ? "Found console.log statements" : undefined,
    duration: 0,
  });

  const hasHardcodedSecrets = /['"](?:sk-|api_key|password|secret)['"]\s*[:=]/.test(code);
  results.push({
    name: "No Hardcoded Secrets",
    passed: !hasHardcodedSecrets,
    error: hasHardcodedSecrets ? "Found potential hardcoded secrets" : undefined,
    duration: 0,
  });

  return results;
}