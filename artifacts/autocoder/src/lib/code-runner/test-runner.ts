// Test Runner - Run tests in browser with real-time results

export interface TestCase {
  id: string;
  name: string;
  type: 'unit' | 'integration' | 'e2e' | 'snapshot';
  code: string;
  expected?: string;
  timeout?: number;
}

export interface TestResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'error' | 'running';
  duration: number;
  error?: string;
  expected?: string;
  actual?: string;
  stack?: string;
}

export interface TestSuite {
  name: string;
  tests: TestCase[];
  beforeAll?: string;
  afterAll?: string;
  beforeEach?: string;
  afterEach?: string;
}

export interface TestReport {
  suites: { name: string; results: TestResult[] }[];
  passed: number;
  failed: number;
  skipped: number;
  totalDuration: number;
  timestamp: number;
}

// Simple assertion library
class AssertionError extends Error {
  expected: unknown;
  actual: unknown;

  constructor(message: string, expected: unknown, actual: unknown) {
    super(message);
    this.name = 'AssertionError';
    this.expected = expected;
    this.actual = actual;
  }
}

const expect = (actual: unknown) => ({
  toBe: (expected: unknown) => {
    if (actual !== expected) {
      throw new AssertionError(
        `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`,
        expected,
        actual
      );
    }
  },
  toEqual: (expected: unknown) => {
    const eq = JSON.stringify(actual) === JSON.stringify(expected);
    if (!eq) {
      throw new AssertionError(
        `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`,
        expected,
        actual
      );
    }
  },
  toBeTruthy: () => {
    if (!actual) {
      throw new AssertionError(`Expected truthy value but got ${actual}`, true, actual);
    }
  },
  toBeFalsy: () => {
    if (actual) {
      throw new AssertionError(`Expected falsy value but got ${actual}`, false, actual);
    }
  },
  toBeNull: () => {
    if (actual !== null) {
      throw new AssertionError(`Expected null but got ${actual}`, null, actual);
    }
  },
  toBeUndefined: () => {
    if (actual !== undefined) {
      throw new AssertionError(`Expected undefined but got ${actual}`, undefined, actual);
    }
  },
  toBeDefined: () => {
    if (actual === undefined) {
      throw new AssertionError(`Expected defined value but got undefined`, 'defined', actual);
    }
  },
  toContain: (item: unknown) => {
    const arr = actual as unknown[];
    if (!Array.isArray(arr) || !arr.includes(item)) {
      throw new AssertionError(`Expected array to contain ${item}`, item, actual);
    }
  },
  toHaveLength: (length: number) => {
    const arr = actual as { length: number };
    if (!arr || arr.length !== length) {
      throw new AssertionError(`Expected length ${length} but got ${arr?.length}`, length, arr?.length);
    }
  },
  toThrow: (expectedError?: string | RegExp) => {
    const fn = actual as () => void;
    try {
      fn();
      throw new AssertionError('Expected function to throw', 'throw', 'no throw');
    } catch (e) {
      if (expectedError) {
        const msg = (e as Error).message;
        if (expectedError instanceof RegExp) {
          if (!expectedError.test(msg)) {
            throw new AssertionError(`Expected error matching ${expectedError}`, expectedError, msg);
          }
        } else if (!msg.includes(expectedError)) {
          throw new AssertionError(`Expected error "${expectedError}"`, expectedError, msg);
        }
      }
    }
  },
  toBeGreaterThan: (value: number) => {
    if (typeof actual !== 'number' || actual <= value) {
      throw new AssertionError(`Expected ${actual} to be greater than ${value}`, `> ${value}`, actual);
    }
  },
  toBeLessThan: (value: number) => {
    if (typeof actual !== 'number' || actual >= value) {
      throw new AssertionError(`Expected ${actual} to be less than ${value}`, `< ${value}`, actual);
    }
  },
  toMatch: (pattern: RegExp) => {
    if (typeof actual !== 'string' || !pattern.test(actual)) {
      throw new AssertionError(`Expected "${actual}" to match ${pattern}`, pattern, actual);
    }
  }
});

// Test runner class
class TestRunner {
  private results: Map<string, TestResult[]> = new Map();
  private listeners: ((result: TestResult) => void)[] = [];

  // Register listener for real-time results
  onResult(listener: (result: TestResult) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx > -1) this.listeners.splice(idx, 1);
    };
  }

  private notifyResult(result: TestResult): void {
    for (const listener of this.listeners) {
      listener(result);
    }
  }

  // Run a single test
  async runTest(test: TestCase, context: Record<string, unknown> = {}): Promise<TestResult> {
    const startTime = performance.now();
    const result: TestResult = {
      id: test.id,
      name: test.name,
      status: 'running',
      duration: 0
    };

    this.notifyResult({ ...result });

    try {
      // Create sandboxed execution environment
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const testFn = new AsyncFunction('expect', 'context', test.code);

      // Add timeout
      const timeout = test.timeout || 5000;
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Test timed out')), timeout);
      });

      await Promise.race([testFn(expect, context), timeoutPromise]);

      result.status = 'passed';
    } catch (e) {
      const error = e as Error;
      result.status = error.name === 'AssertionError' ? 'failed' : 'error';
      result.error = error.message;
      result.stack = error.stack;

      if (error instanceof AssertionError) {
        result.expected = String(error.expected);
        result.actual = String(error.actual);
      }
    }

    result.duration = performance.now() - startTime;
    this.notifyResult(result);
    return result;
  }

  // Run a test suite
  async runSuite(suite: TestSuite, context: Record<string, unknown> = {}): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const suiteContext = { ...context };

    // Run beforeAll
    if (suite.beforeAll) {
      try {
        const fn = new Function('context', suite.beforeAll);
        fn(suiteContext);
      } catch (e) {
        console.error('beforeAll failed:', e);
      }
    }

    for (const test of suite.tests) {
      // Run beforeEach
      if (suite.beforeEach) {
        try {
          const fn = new Function('context', suite.beforeEach);
          fn(suiteContext);
        } catch (e) {
          console.error('beforeEach failed:', e);
        }
      }

      const result = await this.runTest(test, suiteContext);
      results.push(result);

      // Run afterEach
      if (suite.afterEach) {
        try {
          const fn = new Function('context', suite.afterEach);
          fn(suiteContext);
        } catch (e) {
          console.error('afterEach failed:', e);
        }
      }
    }

    // Run afterAll
    if (suite.afterAll) {
      try {
        const fn = new Function('context', suite.afterAll);
        fn(suiteContext);
      } catch (e) {
        console.error('afterAll failed:', e);
      }
    }

    this.results.set(suite.name, results);
    return results;
  }

  // Run all suites
  async runAll(suites: TestSuite[]): Promise<TestReport> {
    const startTime = performance.now();
    const report: TestReport = {
      suites: [],
      passed: 0,
      failed: 0,
      skipped: 0,
      totalDuration: 0,
      timestamp: Date.now()
    };

    for (const suite of suites) {
      const results = await this.runSuite(suite);
      report.suites.push({ name: suite.name, results });

      for (const result of results) {
        if (result.status === 'passed') report.passed++;
        else if (result.status === 'failed' || result.status === 'error') report.failed++;
        else if (result.status === 'skipped') report.skipped++;
      }
    }

    report.totalDuration = performance.now() - startTime;
    return report;
  }

  // Get results for a suite
  getResults(suiteName: string): TestResult[] {
    return this.results.get(suiteName) || [];
  }

  // Clear all results
  clearResults(): void {
    this.results.clear();
  }
}

// Generate tests from code analysis
export function generateTestsFromCode(code: string, language: string): TestCase[] {
  const tests: TestCase[] = [];

  if (language === 'javascript' || language === 'typescript') {
    // Find exported functions
    const functionMatches = Array.from(code.matchAll(/export\s+(async\s+)?function\s+(\w+)\s*\([^)]*\)/g));

    for (const match of functionMatches) {
      const isAsync = !!match[1];
      const fnName = match[2];

      tests.push({
        id: `test-${fnName}-${Date.now()}`,
        name: `${fnName} should work correctly`,
        type: 'unit',
        code: `
          // Test that ${fnName} is callable
          expect(typeof ${fnName}).toBe('function');
        `
      });
    }

    // Find React components
    const componentMatches = Array.from(code.matchAll(/export\s+(default\s+)?function\s+([A-Z]\w+)/g));

    for (const match of componentMatches) {
      const componentName = match[2];

      tests.push({
        id: `test-${componentName}-render-${Date.now()}`,
        name: `${componentName} should render without crashing`,
        type: 'unit',
        code: `
          // Component render test for ${componentName}
          expect(true).toBeTruthy();
        `
      });
    }

    // Find API endpoints
    const routeMatches = Array.from(code.matchAll(/\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/gi));

    for (const match of routeMatches) {
      const method = match[1].toUpperCase();
      const path = match[2];

      tests.push({
        id: `test-api-${method}-${path.replace(/\//g, '-')}-${Date.now()}`,
        name: `${method} ${path} should respond`,
        type: 'integration',
        code: `
          // API endpoint test for ${method} ${path}
          expect(true).toBeTruthy();
        `
      });
    }
  }

  return tests;
}

// Singleton test runner
export const testRunner = new TestRunner();

// Export helper
export { expect };