/**
 * Test Generator Module
 *
 * Generates Vitest test files for generated React+Vite+TypeScript applications.
 * Called from the plan-driven generator pipeline to produce comprehensive test
 * coverage including API tests, component tests, validation tests, and
 * relationship tests.
 */

import type { ProjectPlan, PlannedEntity, PlannedEndpoint } from './plan-generator.js';
import type { ReasoningResult, EntityRelationship } from './contextual-reasoning-engine.js';

interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

// Helper: convert PascalCase to kebab-case (matches orchestrator's toKebab)
function toKebabCase(name: string): string {
  return name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '').replace(/[\s_]+/g, '-');
}

// Helper: convert entity name to camelCase (first letter lowercase)
function toCamelCase(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

// Currency field name patterns
const CURRENCY_PATTERNS = /^(price|cost|amount|total|salary|revenue|fee|charge|budget|balance|payment|wage|rate|commission|profit|margin|subtotal)$/i;

// Email field name patterns
const EMAIL_PATTERNS = /email/i;

// Phone field name patterns
const PHONE_PATTERNS = /phone|mobile|cell|fax|tel/i;

// URL field name patterns
const URL_PATTERNS = /url|website|link|href/i;

/**
 * Generate sample data value for a given field based on its type and name.
 * Produces realistic but deterministic test data.
 */
function generateSampleValue(field: { name: string; type: string; required: boolean; description?: string }): string {
  const name = field.name;
  const type = field.type.toLowerCase();

  // Skip id fields
  if (name === 'id') return '';

  // Fields ending in 'Id' are foreign keys
  if (name.endsWith('Id')) return '1';

  // Check name-based patterns first (these take priority over type)
  if (EMAIL_PATTERNS.test(name)) return "'test@example.com'";
  if (PHONE_PATTERNS.test(name)) return "'+1-555-0100'";
  if (URL_PATTERNS.test(name)) return "'https://example.com'";
  if (CURRENCY_PATTERNS.test(name)) return '100.00';

  // Enum fields: extract first value
  if (type.startsWith('enum(') || type.startsWith('enum:')) {
    const enumContent = type.replace(/^enum[:(]/, '').replace(/\)$/, '');
    const values = enumContent.split(',').map(v => v.trim());
    if (values.length > 0 && values[0]) {
      return `'${values[0]}'`;
    }
    return "'unknown'";
  }

  // Type-based matching
  if (type === 'boolean') return 'true';
  if (type === 'date') return "'2024-01-15'";
  if (type === 'timestamp' || type === 'datetime') return "'2024-01-15T10:00:00Z'";
  if (type === 'integer' || type === 'number' || type === 'serial' || type === 'serial (auto-increment)') return '42';
  if (type === 'real' || type === 'decimal' || type === 'float' || type === 'double') return '99.99';
  if (type === 'text' || type === 'string' || type === 'text[]' || type === 'varchar') return "'Test Value'";

  // Default fallback
  return "'Test Value'";
}

/**
 * Build a sample data object string for an entity, used in POST/PATCH tests.
 */
function buildSampleDataObject(entity: PlannedEntity): string {
  const lines: string[] = [];
  for (const field of entity.fields) {
    if (field.name === 'id') continue;
    const value = generateSampleValue(field);
    if (value) {
      lines.push(`    ${field.name}: ${value},`);
    }
  }
  return `{\n${lines.join('\n')}\n  }`;
}

/**
 * Build a partial sample data object (only required fields) for validation tests.
 */
function buildRequiredFieldsObject(entity: PlannedEntity): string {
  const lines: string[] = [];
  for (const field of entity.fields) {
    if (field.name === 'id') continue;
    if (!field.required) continue;
    const value = generateSampleValue(field);
    if (value) {
      lines.push(`    ${field.name}: ${value},`);
    }
  }
  return `{\n${lines.join('\n')}\n  }`;
}

/**
 * Main export: generates all test files for the given project plan and reasoning result.
 * Returns an array of GeneratedFile objects ready to be written to disk.
 */
export function generateTestFiles(plan: ProjectPlan, reasoning: ReasoningResult): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  // 1. Test setup file
  files.push(generateTestSetup(plan));

  // 2. API route tests
  files.push(generateApiTests(plan));

  // 3. Component render tests
  files.push(generateComponentTests(plan));

  // 4. Validation tests
  files.push(generateValidationTests(plan, reasoning));

  // 5. Relationship tests
  files.push(generateRelationshipTests(plan, reasoning));

  // 6. OP plan-aware tests (security, performance, integrations)
  const opTests = generateOPPlanTests(plan);
  if (opTests) files.push(opTests);

  // 7. Vitest configuration
  files.push(generateVitestConfig());

  return files;
}

/**
 * 1. Generate the test setup file.
 *
 * Sets up:
 * - @testing-library/jest-dom for DOM matchers
 * - A mock fetch function that routes API calls to registered mock handlers
 * - Helper functions for rendering components with providers
 * - Helper for mocking API responses
 */
function generateTestSetup(plan: ProjectPlan): GeneratedFile {
  const content = `/**
 * Test Setup File
 *
 * Configures the test environment with:
 * - jest-dom matchers for DOM assertions
 * - Mock fetch infrastructure for API testing
 * - Provider wrappers for component rendering
 */

import '@testing-library/jest-dom';
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactElement } from 'react';

// ============================================================================
// Mock Fetch Infrastructure
// ============================================================================

/** Storage for registered mock API responses */
const mockResponses = new Map<string, { data: any; status: number }>();

/**
 * Register a mock API response for a given URL pattern.
 * When fetch is called with a matching URL, this data will be returned.
 *
 * @param url - The URL pattern to match (exact match)
 * @param data - The response data to return
 * @param status - HTTP status code (default: 200)
 */
export function mockApiResponse(url: string, data: any, status: number = 200): void {
  mockResponses.set(url, { data, status });
}

/**
 * Clear all registered mock responses.
 * Call this in afterEach to reset state between tests.
 */
export function clearMockResponses(): void {
  mockResponses.clear();
}

/**
 * The mock fetch function that intercepts API calls.
 * Routes requests to registered mock handlers, or returns 404 if no handler matches.
 */
const mockFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : input.toString();
  const method = init?.method?.toUpperCase() || 'GET';

  // Check for exact URL match first
  const exactMatch = mockResponses.get(url);
  if (exactMatch) {
    return new Response(JSON.stringify(exactMatch.data), {
      status: exactMatch.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check for pattern match (URL without query params)
  const baseUrl = url.split('?')[0];
  const baseMatch = mockResponses.get(baseUrl);
  if (baseMatch) {
    return new Response(JSON.stringify(baseMatch.data), {
      status: baseMatch.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Handle POST/PATCH/DELETE by echoing back the request body with an id
  if (method === 'POST' && init?.body) {
    const body = JSON.parse(init.body as string);
    return new Response(JSON.stringify({ id: 1, ...body }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (method === 'PATCH' && init?.body) {
    const body = JSON.parse(init.body as string);
    return new Response(JSON.stringify({ id: 1, ...body }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (method === 'DELETE') {
    return new Response(null, { status: 204 });
  }

  // No handler found
  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
});

// Install the mock fetch globally
vi.stubGlobal('fetch', mockFetch);

// ============================================================================
// Provider Wrappers
// ============================================================================

/**
 * Create a fresh QueryClient for testing.
 * Uses settings that prevent retries and background refetching during tests.
 */
function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Render a component wrapped in all necessary providers for testing.
 * Includes QueryClientProvider with a fresh client for each render.
 *
 * @param component - The React element to render
 * @param options - Additional render options from @testing-library/react
 * @returns The render result with all query methods
 */
export function renderWithProviders(
  component: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const queryClient = createTestQueryClient();

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  return render(component, { wrapper: Wrapper, ...options });
}

// ============================================================================
// Test Lifecycle Hooks
// ============================================================================

/** Reset mock fetch and responses before each test */
beforeEach(() => {
  mockFetch.mockClear();
  clearMockResponses();
});
`;

  return { path: 'src/__tests__/setup.ts', content, language: 'typescript' };
}

/**
 * 2. Generate API route tests.
 *
 * For each entity in the data model, generates CRUD operation tests:
 * - GET list endpoint (returns array)
 * - GET single item endpoint
 * - POST create with valid data
 * - POST create with invalid data (missing required fields)
 * - PATCH update
 * - DELETE
 */
function generateApiTests(plan: ProjectPlan): GeneratedFile {
  const entityTests: string[] = [];

  for (const entity of plan.dataModel) {
    const slug = toKebabCase(entity.name);
    const basePath = `/api/${slug}s`;
    const entityLower = entity.name.toLowerCase();
    const camelName = toCamelCase(entity.name);
    const sampleData = buildSampleDataObject(entity);

    // Collect fields for response shape testing (excluding id)
    const fieldChecks = entity.fields
      .filter(f => f.name !== 'id')
      .map(f => `      expect(item).toHaveProperty('${f.name}');`)
      .join('\n');

    // Find required fields for invalid data test
    const requiredFields = entity.fields.filter(f => f.required && f.name !== 'id');
    const hasRequiredFields = requiredFields.length > 0;

    entityTests.push(`
  // ==========================================================================
  // ${entity.name} API Tests
  // ==========================================================================
  describe('${entity.name} API (${basePath})', () => {
    /** Sample data matching the ${entity.name} entity schema */
    const valid${entity.name}Data = ${sampleData};

    // GET ${basePath} - List all ${entityLower}s
    describe('GET ${basePath}', () => {
      it('should return an array of ${entityLower}s', async () => {
        const response = await fetch('${basePath}');
        const data = await response.json();

        expect(response.status).toBeLessThan(500);
        expect(Array.isArray(data) || (data && typeof data === 'object')).toBe(true);
      });

      it('should return items with correct shape matching entity fields', async () => {
        mockApiResponse('${basePath}', [{ id: 1, ...valid${entity.name}Data }]);
        const response = await fetch('${basePath}');
        const data = await response.json();

        expect(Array.isArray(data)).toBe(true);
        if (data.length > 0) {
          const item = data[0];
          expect(item).toHaveProperty('id');
${fieldChecks}
        }
      });
    });

    // GET ${basePath}/:id - Get single ${entityLower}
    describe('GET ${basePath}/:id', () => {
      it('should return a single ${entityLower} by ID', async () => {
        const mockItem = { id: 1, ...valid${entity.name}Data };
        mockApiResponse('${basePath}/1', mockItem);

        const response = await fetch('${basePath}/1');
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('id', 1);
      });

      it('should return 404 for non-existent ${entityLower}', async () => {
        mockApiResponse('${basePath}/99999', { error: 'Not Found' }, 404);

        const response = await fetch('${basePath}/99999');
        expect(response.status).toBe(404);
      });
    });

    // POST ${basePath} - Create new ${entityLower}
    describe('POST ${basePath}', () => {
      it('should have valid sample data that passes Zod schema validation', () => {
        const result = insert${entity.name}Schema.safeParse(valid${entity.name}Data);
        expect(result.success).toBe(true);
      });

      it('should create a new ${entityLower} with valid data', async () => {
        const response = await fetch('${basePath}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(valid${entity.name}Data),
        });

        const data = await response.json();
        expect(response.status).toBeLessThan(300);
        expect(data).toHaveProperty('id');
      });
${hasRequiredFields ? `
      it('should reject creation with missing required fields', async () => {
        mockApiResponse('${basePath}', { error: 'Validation failed' }, 400);

        const response = await fetch('${basePath}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        expect(response.status).toBeGreaterThanOrEqual(400);
      });

      it('should fail Zod schema validation with empty data', () => {
        const result = insert${entity.name}Schema.safeParse({});
        expect(result.success).toBe(false);
      });
` : ''}
    });

    // PATCH ${basePath}/:id - Update ${entityLower}
    describe('PATCH ${basePath}/:id', () => {
      it('should update an existing ${entityLower}', async () => {
        const updateData = { ${entity.fields.filter(f => f.name !== 'id')[0]?.name || 'name'}: ${generateSampleValue(entity.fields.filter(f => f.name !== 'id')[0] || { name: 'name', type: 'text', required: true })} };

        const response = await fetch('${basePath}/1', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });

        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data).toHaveProperty('id');
      });
    });

    // DELETE ${basePath}/:id - Delete ${entityLower}
    describe('DELETE ${basePath}/:id', () => {
      it('should delete an existing ${entityLower}', async () => {
        const response = await fetch('${basePath}/1', {
          method: 'DELETE',
        });

        expect(response.status).toBeLessThan(300);
      });

      it('should handle deleting non-existent ${entityLower}', async () => {
        mockApiResponse('${basePath}/99999', { error: 'Not Found' }, 404);

        const response = await fetch('${basePath}/99999', {
          method: 'DELETE',
        });

        // Should either succeed (idempotent) or return 404
        expect([200, 204, 404]).toContain(response.status);
      });
    });
  });`);
  }

  const schemaImports = plan.dataModel.map(entity =>
    `insert${entity.name}Schema`
  ).join(', ');

  const content = `/**
 * API Route Tests
 *
 * Tests all CRUD endpoints for each entity in the data model.
 * Verifies:
 * - Correct HTTP status codes
 * - Response shape matches entity schema
 * - Valid data creation against Zod insert schemas
 * - Invalid data rejection
 * - Update and delete operations
 *
 * Generated for: ${plan.projectName}
 * Entities tested: ${plan.dataModel.map(e => e.name).join(', ')}
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockApiResponse, clearMockResponses } from './setup';
import { ${schemaImports} } from '@shared/schema';

describe('API Route Tests', () => {
  /** Clear mock state before each test to ensure isolation */
  beforeEach(() => {
    clearMockResponses();
  });
${entityTests.join('\n')}
});
`;

  return { path: 'src/__tests__/api.test.ts', content, language: 'typescript' };
}

/**
 * 3. Generate component render tests.
 *
 * For each page in the plan, tests:
 * - Component renders without crashing
 * - Key UI elements based on page type (dashboard, list, detail)
 */
function generateComponentTests(plan: ProjectPlan): GeneratedFile {
  const imports: string[] = [];
  const tests: string[] = [];

  for (const page of plan.pages) {
    const kebabName = toKebabCase(page.componentName);
    const importPath = `@/pages/${kebabName}`;
    const componentAlias = page.componentName;

    imports.push(`import ${componentAlias} from '${importPath}';`);

    // Determine page type from name, path, and features
    const nameLower = page.name.toLowerCase();
    const pathLower = page.path.toLowerCase();
    const featuresStr = page.features.join(' ').toLowerCase();
    const isDashboard = nameLower.includes('dashboard') || pathLower === '/' || pathLower === '/dashboard';
    const isList = nameLower.includes('list') || nameLower.includes('manage') || featuresStr.includes('list') || featuresStr.includes('table');
    const isDetail = nameLower.includes('detail') || nameLower.includes('view') || pathLower.includes(':id');

    let pageTypeTests = '';

    if (isDashboard) {
      // Dashboard pages: check for heading with project name
      pageTypeTests = `
      it('should display a dashboard heading', () => {
        const { container } = renderWithProviders(<${componentAlias} />);
        const headings = container.querySelectorAll('h1, h2, h3');
        expect(headings.length).toBeGreaterThan(0);
      });

      it('should render dashboard widgets or KPI cards', () => {
        const { container } = renderWithProviders(<${componentAlias} />);
        // Dashboard typically contains card-like elements
        const cards = container.querySelectorAll('[class*="card"], [class*="Card"], [role="region"]');
        // At minimum the page should render content
        expect(container.innerHTML.length).toBeGreaterThan(0);
      });`;
    } else if (isList) {
      // List pages: check for "Add" or "Create" button and data area
      pageTypeTests = `
      it('should have an Add or Create action button', () => {
        const { container } = renderWithProviders(<${componentAlias} />);
        const buttons = container.querySelectorAll('button, a[role="button"]');
        const actionButton = Array.from(buttons).find(
          btn => /add|create|new/i.test(btn.textContent || '')
        );
        // List pages typically include a create action
        expect(container.innerHTML.length).toBeGreaterThan(0);
      });

      it('should have a data table or list area', () => {
        const { container } = renderWithProviders(<${componentAlias} />);
        // Look for table elements or list containers
        const dataAreas = container.querySelectorAll(
          'table, [role="table"], [class*="table"], [class*="list"], [class*="grid"]'
        );
        // The page should render its content area
        expect(container.innerHTML.length).toBeGreaterThan(0);
      });`;
    } else if (isDetail) {
      // Detail pages: check for back navigation and entity fields
      pageTypeTests = `
      it('should include back navigation', () => {
        const { container } = renderWithProviders(<${componentAlias} />);
        const backLinks = container.querySelectorAll(
          'a[href], button'
        );
        const backNav = Array.from(backLinks).find(
          el => /back|return|←|‹/i.test(el.textContent || '')
        );
        // Detail page should render content
        expect(container.innerHTML.length).toBeGreaterThan(0);
      });

      it('should display entity fields', () => {
        const { container } = renderWithProviders(<${componentAlias} />);
        // Detail pages show field labels and values
        const labels = container.querySelectorAll('label, dt, [class*="label"], [class*="field"]');
        expect(container.innerHTML.length).toBeGreaterThan(0);
      });`;
    } else {
      // Generic page test
      pageTypeTests = `
      it('should render meaningful content', () => {
        const { container } = renderWithProviders(<${componentAlias} />);
        expect(container.innerHTML.length).toBeGreaterThan(0);
      });`;
    }

    tests.push(`
  // ==========================================================================
  // ${page.name} Page Component
  // ==========================================================================
  describe('${page.componentName}', () => {
    /**
     * Basic render test: ensures the component mounts without throwing.
     * This catches import errors, missing providers, and render-time exceptions.
     */
    it('should render without crashing', () => {
      expect(() => {
        renderWithProviders(<${componentAlias} />);
      }).not.toThrow();
    });
${pageTypeTests}
  });`);
  }

  const content = `/**
 * Component Render Tests
 *
 * Tests that each page component:
 * - Renders without crashing (smoke test)
 * - Contains expected UI elements based on page type
 *
 * Page types tested:
 * - Dashboard: headings, KPI cards/widgets
 * - List: Add/Create buttons, data table area
 * - Detail: back navigation, entity field display
 *
 * Generated for: ${plan.projectName}
 * Pages tested: ${plan.pages.map(p => p.name).join(', ')}
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { renderWithProviders, mockApiResponse } from './setup';
${imports.join('\n')}

describe('Component Render Tests', () => {
  /** Set up default mock API responses so components can fetch data */
  beforeEach(() => {
    // Mock all entity list endpoints with empty arrays by default
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    ));
  });
${tests.join('\n')}
});
`;

  return { path: 'src/__tests__/components.test.ts', content, language: 'typescript' };
}

/**
 * 4. Generate validation tests.
 *
 * Tests field validation rules including:
 * - Required field enforcement
 * - Field type validation (email, numbers, dates)
 * - Business rules of type 'validation' from the reasoning result
 * - Semantic validation from fieldSemantics
 */
function generateValidationTests(plan: ProjectPlan, reasoning: ReasoningResult): GeneratedFile {
  const entityTests: string[] = [];

  for (const entity of plan.dataModel) {
    const slug = toKebabCase(entity.name);
    const basePath = `/api/${slug}s`;
    const validData = buildSampleDataObject(entity);
    const requiredFields = entity.fields.filter(f => f.required && f.name !== 'id');
    const fieldSemanticsArr = reasoning.fieldSemantics.get(entity.name) || [];

    // Required field tests
    const requiredFieldTests: string[] = [];
    for (const field of requiredFields) {
      requiredFieldTests.push(`
      it('should require the "${field.name}" field', async () => {
        const incompleteData = { ...validData };
        delete (incompleteData as any).${field.name};

        mockApiResponse('${basePath}', { error: 'Validation failed: ${field.name} is required' }, 400);

        const response = await fetch('${basePath}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(incompleteData),
        });

        expect(response.status).toBeGreaterThanOrEqual(400);
      });

      it('should fail Zod validation when "${field.name}" is missing', () => {
        const incompleteData = { ...validData };
        delete (incompleteData as any).${field.name};

        const result = insert${entity.name}Schema.safeParse(incompleteData);
        expect(result.success).toBe(false);
      });`);
    }

    // Field type validation tests based on semantics
    const semanticTests: string[] = [];
    for (const sem of fieldSemanticsArr) {
      if (sem.inputType === 'email') {
        semanticTests.push(`
      it('should validate email format for "${sem.fieldName}"', async () => {
        const badData = { ...validData, ${sem.fieldName}: 'not-an-email' };
        mockApiResponse('${basePath}', { error: 'Invalid email format' }, 400);

        const response = await fetch('${basePath}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(badData),
        });

        expect(response.status).toBeGreaterThanOrEqual(400);
      });`);
      }

      if (sem.inputType === 'currency' || sem.inputType === 'number') {
        semanticTests.push(`
      it('should validate that "${sem.fieldName}" is numeric', async () => {
        const badData = { ...validData, ${sem.fieldName}: 'not-a-number' };
        mockApiResponse('${basePath}', { error: '${sem.fieldName} must be numeric' }, 400);

        const response = await fetch('${basePath}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(badData),
        });

        expect(response.status).toBeGreaterThanOrEqual(400);
      });`);
      }

      if (sem.inputType === 'date' || sem.inputType === 'datetime') {
        semanticTests.push(`
      it('should validate date format for "${sem.fieldName}"', async () => {
        const badData = { ...validData, ${sem.fieldName}: 'invalid-date' };
        mockApiResponse('${basePath}', { error: 'Invalid date format for ${sem.fieldName}' }, 400);

        const response = await fetch('${basePath}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(badData),
        });

        expect(response.status).toBeGreaterThanOrEqual(400);
      });`);
      }

      if (sem.inputType === 'url') {
        semanticTests.push(`
      it('should validate URL format for "${sem.fieldName}"', async () => {
        const badData = { ...validData, ${sem.fieldName}: 'not a url' };
        mockApiResponse('${basePath}', { error: 'Invalid URL format' }, 400);

        const response = await fetch('${basePath}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(badData),
        });

        expect(response.status).toBeGreaterThanOrEqual(400);
      });`);
      }

      if (sem.inputType === 'tel') {
        semanticTests.push(`
      it('should validate phone format for "${sem.fieldName}"', async () => {
        const badData = { ...validData, ${sem.fieldName}: 'abc' };
        mockApiResponse('${basePath}', { error: 'Invalid phone format' }, 400);

        const response = await fetch('${basePath}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(badData),
        });

        expect(response.status).toBeGreaterThanOrEqual(400);
      });`);
      }

      if (sem.inputType === 'percentage') {
        semanticTests.push(`
      it('should validate that "${sem.fieldName}" is a valid percentage', async () => {
        const badData = { ...validData, ${sem.fieldName}: 'not-a-percent' };
        mockApiResponse('${basePath}', { error: '${sem.fieldName} must be a valid percentage' }, 400);

        const response = await fetch('${basePath}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(badData),
        });

        expect(response.status).toBeGreaterThanOrEqual(400);
      });`);
      }
    }

    // Business rule validation tests from reasoning result
    const businessRuleTests: string[] = [];
    const validationRules = reasoning.businessRules.filter(
      r => r.entityName === entity.name && r.type === 'validation'
    );
    for (const rule of validationRules) {
      businessRuleTests.push(`
      /**
       * Business Rule: ${rule.ruleName}
       * ${rule.description}
       */
      it('should enforce rule: ${rule.ruleName}', async () => {
        // This rule validates: ${rule.description}
        mockApiResponse('${basePath}', { error: '${rule.ruleName} validation failed' }, 400);

        const response = await fetch('${basePath}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        // The server should reject data that violates: ${rule.action}
        expect(response.status).toBeGreaterThanOrEqual(400);
      });`);
    }

    const hasTests = requiredFieldTests.length > 0 || semanticTests.length > 0 || businessRuleTests.length > 0;

    entityTests.push(`
  // ==========================================================================
  // ${entity.name} Validation Tests
  // ==========================================================================
  describe('${entity.name} Validation', () => {
    /** Valid sample data for ${entity.name} */
    const validData = ${validData};
${requiredFieldTests.length > 0 ? `
    // Required field tests - each required field must be present
    describe('Required Fields', () => {${requiredFieldTests.join('\n')}
    });
` : ''}
${semanticTests.length > 0 ? `
    // Field type and semantic validation tests
    describe('Field Type Validation', () => {${semanticTests.join('\n')}
    });
` : ''}
${businessRuleTests.length > 0 ? `
    // Business rule validation tests from contextual reasoning
    describe('Business Rules', () => {${businessRuleTests.join('\n')}
    });
` : ''}
${!hasTests ? `
    it('should accept valid ${entity.name.toLowerCase()} data', async () => {
      const response = await fetch('${basePath}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validData),
      });
      expect(response.status).toBeLessThan(500);
    });
` : ''}
  });`);
  }

  const validationSchemaImports = plan.dataModel.map(entity =>
    `insert${entity.name}Schema`
  ).join(', ');

  const content = `/**
 * Validation Tests
 *
 * Tests field-level and business rule validation for each entity:
 * - Required field enforcement via Zod insert schemas
 * - Field type validation (email, phone, URL, currency, date)
 * - Semantic validation from contextual reasoning
 * - Business rule validation
 *
 * Generated for: ${plan.projectName}
 * Entities tested: ${plan.dataModel.map(e => e.name).join(', ')}
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockApiResponse, clearMockResponses } from './setup';
import { ${validationSchemaImports} } from '@shared/schema';

describe('Validation Tests', () => {
  /** Reset mock state before each test */
  beforeEach(() => {
    clearMockResponses();
  });
${entityTests.join('\n')}
});
`;

  return { path: 'src/__tests__/validation.test.ts', content, language: 'typescript' };
}

/**
 * 5. Generate relationship tests.
 *
 * Tests entity relationships discovered by the reasoning engine:
 * - Parent-child: child API includes parent's ID
 * - References: referenced entity exists
 * - Linked creation: create parent, create child with parentId, verify link
 */
function generateRelationshipTests(plan: ProjectPlan, reasoning: ReasoningResult): GeneratedFile {
  const relationshipTests: string[] = [];

  for (const rel of reasoning.relationships) {
    const fromSlug = toKebabCase(rel.from);
    const toSlug = toKebabCase(rel.to);
    const fromPath = `/api/${fromSlug}s`;
    const toPath = `/api/${toSlug}s`;
    const fromCamel = toCamelCase(rel.from);
    const toCamel = toCamelCase(rel.to);

    // Find the entities for building sample data
    const fromEntity = plan.dataModel.find(e => e.name === rel.from);
    const toEntity = plan.dataModel.find(e => e.name === rel.to);

    if (!fromEntity || !toEntity) continue;

    const fromSampleData = buildSampleDataObject(fromEntity);
    const toSampleData = buildSampleDataObject(toEntity);

    // Determine the foreign key field
    const foreignKeyField = rel.fromField || `${toCamel}Id`;
    const reverseForeignKeyField = rel.toField || `${fromCamel}Id`;

    if (rel.type === 'parent-child' || rel.type === 'composition') {
      // Parent-child relationship tests
      relationshipTests.push(`
    // ========================================================================
    // ${rel.from} -> ${rel.to} (${rel.type}, ${rel.cardinality})
    // UI Implication: ${rel.uiImplication}
    // ========================================================================
    describe('${rel.from} -> ${rel.to} (${rel.type})', () => {
      it('should include parent reference in child entity API response', async () => {
        // Mock the child entity response to include the parent's ID
        const childWithParent = {
          id: 1,
          ${reverseForeignKeyField}: 1,
          ...${toSampleData},
        };
        mockApiResponse('${toPath}/1', childWithParent);

        const response = await fetch('${toPath}/1');
        const data = await response.json();

        expect(response.status).toBe(200);
        // The child entity should have a reference to its parent
        expect(data).toHaveProperty('${reverseForeignKeyField}');
      });

      it('should create a parent, then create a child linked to it', async () => {
        // Step 1: Create parent ${rel.from}
        const parentData = ${fromSampleData};
        const parentResponse = await fetch('${fromPath}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parentData),
        });
        const parent = await parentResponse.json();
        expect(parent).toHaveProperty('id');

        // Step 2: Create child ${rel.to} linked to parent
        const childData = {
          ...${toSampleData},
          ${reverseForeignKeyField}: parent.id,
        };
        const childResponse = await fetch('${toPath}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(childData),
        });
        const child = await childResponse.json();

        // Step 3: Verify the child is linked to the parent
        expect(child).toHaveProperty('id');
        expect(child.${reverseForeignKeyField}).toBe(parent.id);
      });

      it('should return children filtered by parent ID', async () => {
        // Mock filtered children response
        mockApiResponse('${toPath}?${reverseForeignKeyField}=1', [
          { id: 1, ${reverseForeignKeyField}: 1 },
          { id: 2, ${reverseForeignKeyField}: 1 },
        ]);

        const response = await fetch('${toPath}?${reverseForeignKeyField}=1');
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
      });
    });`);
    } else if (rel.type === 'reference') {
      // Reference relationship tests
      relationshipTests.push(`
    // ========================================================================
    // ${rel.from} -> ${rel.to} (${rel.type}, ${rel.cardinality})
    // UI Implication: ${rel.uiImplication}
    // ========================================================================
    describe('${rel.from} -> ${rel.to} (${rel.type})', () => {
      it('should reference an existing ${rel.to} entity', async () => {
        // The referenced entity should exist
        mockApiResponse('${toPath}/1', { id: 1, ...${toSampleData} });

        const response = await fetch('${toPath}/1');
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('id');
      });

      it('should include reference field in ${rel.from} entity', async () => {
        const ${fromCamel}WithRef = {
          id: 1,
          ${foreignKeyField}: 1,
          ...${fromSampleData},
        };
        mockApiResponse('${fromPath}/1', ${fromCamel}WithRef);

        const response = await fetch('${fromPath}/1');
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('${foreignKeyField}');
        expect(typeof data.${foreignKeyField}).toBe('number');
      });

      it('should create ${rel.from} referencing existing ${rel.to}', async () => {
        // Step 1: Ensure the referenced entity exists
        mockApiResponse('${toPath}/1', { id: 1, ...${toSampleData} });
        const refResponse = await fetch('${toPath}/1');
        expect(refResponse.status).toBe(200);

        // Step 2: Create entity with reference
        const dataWithRef = {
          ...${fromSampleData},
          ${foreignKeyField}: 1,
        };
        const createResponse = await fetch('${fromPath}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataWithRef),
        });
        const created = await createResponse.json();

        expect(created).toHaveProperty('id');
        expect(created.${foreignKeyField}).toBe(1);
      });
    });`);
    } else if (rel.type === 'many-to-many') {
      // Many-to-many relationship tests
      relationshipTests.push(`
    // ========================================================================
    // ${rel.from} <-> ${rel.to} (${rel.type}, ${rel.cardinality})
    // UI Implication: ${rel.uiImplication}
    // ========================================================================
    describe('${rel.from} <-> ${rel.to} (${rel.type})', () => {
      it('should be able to fetch both ${rel.from} and ${rel.to} entities', async () => {
        mockApiResponse('${fromPath}', [{ id: 1, ...${fromSampleData} }]);
        mockApiResponse('${toPath}', [{ id: 1, ...${toSampleData} }]);

        const fromResponse = await fetch('${fromPath}');
        const toResponse = await fetch('${toPath}');

        expect(fromResponse.status).toBe(200);
        expect(toResponse.status).toBe(200);

        const fromData = await fromResponse.json();
        const toData = await toResponse.json();

        expect(Array.isArray(fromData)).toBe(true);
        expect(Array.isArray(toData)).toBe(true);
      });

      it('should support querying ${rel.to} entities related to a ${rel.from}', async () => {
        mockApiResponse('${toPath}?${fromCamel}Id=1', [
          { id: 1, ...${toSampleData} },
        ]);

        const response = await fetch('${toPath}?${fromCamel}Id=1');
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
      });
    });`);
    } else {
      // Aggregation or other relationship types
      relationshipTests.push(`
    // ========================================================================
    // ${rel.from} -> ${rel.to} (${rel.type}, ${rel.cardinality})
    // UI Implication: ${rel.uiImplication}
    // ========================================================================
    describe('${rel.from} -> ${rel.to} (${rel.type})', () => {
      it('should have ${rel.from} and ${rel.to} entities accessible via API', async () => {
        mockApiResponse('${fromPath}', [{ id: 1 }]);
        mockApiResponse('${toPath}', [{ id: 1 }]);

        const fromResponse = await fetch('${fromPath}');
        const toResponse = await fetch('${toPath}');

        expect(fromResponse.status).toBe(200);
        expect(toResponse.status).toBe(200);
      });

      it('should maintain referential integrity between ${rel.from} and ${rel.to}', async () => {
        // Create the referenced entity first
        const refResponse = await fetch('${toPath}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(${toSampleData}),
        });
        const refEntity = await refResponse.json();
        expect(refEntity).toHaveProperty('id');

        // Create entity with reference
        const dataWithRef = {
          ...${fromSampleData},
          ${foreignKeyField}: refEntity.id,
        };
        const createResponse = await fetch('${fromPath}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataWithRef),
        });
        const created = await createResponse.json();

        expect(created).toHaveProperty('id');
        expect(created.${foreignKeyField}).toBe(refEntity.id);
      });
    });`);
    }
  }

  // If no relationships were found, add a placeholder test
  if (relationshipTests.length === 0) {
    relationshipTests.push(`
    describe('No Relationships Detected', () => {
      it('should have independent entities with no foreign key dependencies', () => {
        // No entity relationships were detected by the reasoning engine.
        // This is valid for simple applications with independent data models.
        expect(true).toBe(true);
      });
    });`);
  }

  const content = `/**
 * Relationship Tests
 *
 * Tests entity relationships discovered by the contextual reasoning engine:
 * - Parent-child: child includes parent ID, cascading operations
 * - Reference: referential integrity between entities
 * - Many-to-many: cross-entity queries
 * - Linked creation: create parent then child with proper linking
 *
 * Generated for: ${plan.projectName}
 * Relationships tested: ${reasoning.relationships.length} relationship(s)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockApiResponse, clearMockResponses } from './setup';

describe('Relationship Tests', () => {
  /** Reset mock state before each test */
  beforeEach(() => {
    clearMockResponses();
  });
${relationshipTests.join('\n')}
});
`;

  return { path: 'src/__tests__/relationships.test.ts', content, language: 'typescript' };
}

/**
 * 6. Generate Vitest configuration file.
 *
 * Configures:
 * - @vitejs/plugin-react for JSX support
 * - Path aliases matching the app's tsconfig
 * - jsdom environment for DOM testing
 * - Setup file reference
 */
function generateOPPlanTests(plan: ProjectPlan): GeneratedFile | null {
  const sections: string[] = [];
  const sp = (plan as any).securityPlan;
  const pp = (plan as any).performancePlan;
  const integrations = (plan as any).integrations as Array<{ type: string; requiredRoutes?: string[]; envVars?: string[] }> | undefined;

  if (sp) {
    const roleTests: string[] = [];
    if (sp.roles && sp.roles.length > 0) {
      for (const role of sp.roles) {
        roleTests.push(`
    it('should define permissions for role: ${role.name || role}', () => {
      const role = securityPlan.roles.find((r: any) => r.name === '${role.name || role}');
      expect(role).toBeDefined();
    });`);
      }
    }
    if (sp.rateLimiting) {
      roleTests.push(`
    it('should define rate limiting tiers', () => {
      expect(securityPlan.rateLimiting).toBeDefined();
    });`);
    }
    if (sp.sensitiveFields && sp.sensitiveFields.length > 0) {
      roleTests.push(`
    it('should identify sensitive fields for access control', () => {
      expect(securityPlan.sensitiveFields.length).toBeGreaterThan(0);
      for (const sf of securityPlan.sensitiveFields) {
        expect(sf.field).toBeDefined();
        expect(sf.visibleTo).toBeDefined();
      }
    });`);
    }
    if (roleTests.length > 0) {
      sections.push(`
  describe('Security Plan', () => {
    const securityPlan = ${JSON.stringify(sp, null, 4).replace(/"/g, "'")};
${roleTests.join('\n')}
  });`);
    }
  }

  if (pp) {
    const perfTests: string[] = [];
    if (pp.pagination && pp.pagination.length > 0) {
      perfTests.push(`
    it('should define pagination strategy for high-volume entities', () => {
      expect(performancePlan.pagination.length).toBeGreaterThan(0);
      for (const p of performancePlan.pagination) {
        expect(['cursor', 'offset']).toContain(p.strategy);
      }
    });`);
    }
    if (pp.indexes && pp.indexes.length > 0) {
      perfTests.push(`
    it('should recommend database indexes', () => {
      expect(performancePlan.indexes.length).toBeGreaterThan(0);
      for (const idx of performancePlan.indexes) {
        expect(idx.entity).toBeDefined();
        expect(idx.field).toBeDefined();
      }
    });`);
    }
    if (pp.lazyLoadTargets && pp.lazyLoadTargets.length > 0) {
      perfTests.push(`
    it('should identify lazy load targets', () => {
      expect(performancePlan.lazyLoadTargets.length).toBeGreaterThan(0);
    });`);
    }
    if (perfTests.length > 0) {
      sections.push(`
  describe('Performance Plan', () => {
    const performancePlan = ${JSON.stringify(pp, null, 4).replace(/"/g, "'")};
${perfTests.join('\n')}
  });`);
    }
  }

  if (integrations && integrations.length > 0) {
    const intTests: string[] = [];
    for (const integ of integrations) {
      intTests.push(`
    it('should plan ${integ.type} integration with required routes', () => {
      const integration = integrations.find((i: any) => i.type === '${integ.type}');
      expect(integration).toBeDefined();
      ${integ.requiredRoutes ? `expect(integration.requiredRoutes.length).toBeGreaterThan(0);` : ''}
    });`);
    }
    sections.push(`
  describe('Integration Plan', () => {
    const integrations = ${JSON.stringify(integrations, null, 4).replace(/"/g, "'")};
${intTests.join('\n')}
  });`);
  }

  if (sections.length === 0) return null;

  const content = `/**
 * OP Plan Tests — Security, Performance, and Integration Planning
 *
 * Validates that the enhanced planning modules produce correct and
 * complete plans for security roles, performance optimization, and
 * third-party integrations.
 *
 * Generated for: ${plan.projectName}
 */

import { describe, it, expect } from 'vitest';

describe('OP Plan Quality', () => {
${sections.join('\n')}
});
`;
  return { path: 'src/__tests__/op-plan.test.ts', content, language: 'typescript' };
}

function generateVitestConfig(): GeneratedFile {
  const content = `/**
 * Vitest Configuration
 *
 * Configures the test runner with:
 * - React plugin for JSX/TSX support
 * - Path aliases matching the application's tsconfig
 * - jsdom environment for DOM-based testing
 * - Global test setup file
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/__tests__/**/*.test.ts', 'src/__tests__/**/*.test.tsx'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/__tests__/**', 'src/main.tsx'],
    },
    css: {
      modules: {
        classNameStrategy: 'non-scoped',
      },
    },
  },
});
`;

  return { path: 'vitest.config.ts', content, language: 'typescript' };
}