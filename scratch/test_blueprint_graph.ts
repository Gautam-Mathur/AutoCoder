import { validateBlueprintGraph, BlueprintFileSection } from '../src/lib/agents/ruflo/orchestrator';

async function testBlueprintGraph() {
  console.log('=== TESTING BLUEPRINT GRAPH VALIDATION & TOPOLOGICAL SORT ===\n');

  // Test 1: Clean blueprint with valid dependencies
  const cleanSections: BlueprintFileSection[] = [
    { file: 'src/app.ts', purpose: 'App entry', dependencies: ['src/services/payment.ts'], specsRequired: [], exports: [], details: '', rawSection: '' },
    { file: 'src/services/payment.ts', purpose: 'Payment service', dependencies: ['src/db.ts'], specsRequired: [], exports: [], details: '', rawSection: '' },
    { file: 'src/db.ts', purpose: 'Database client', dependencies: ['None'], specsRequired: [], exports: [], details: '', rawSection: '' },
  ];

  const cleanResult = validateBlueprintGraph(cleanSections);
  console.log('[Test 1] Clean Blueprint Valid:', cleanResult.valid);
  console.log('[Test 1] Topological Order:', cleanResult.order);
  if (!cleanResult.valid || cleanResult.order[0] !== 'src/db.ts') {
    throw new Error('Test 1 failed: Expected db.ts to be sorted first in topological order.');
  }

  // Test 2: Duplicate file section
  const duplicateSections: BlueprintFileSection[] = [
    { file: 'src/index.ts', purpose: 'Index', dependencies: [], specsRequired: [], exports: [], details: '', rawSection: '' },
    { file: 'src/index.ts', purpose: 'Index Duplicate', dependencies: [], specsRequired: [], exports: [], details: '', rawSection: '' },
  ];

  const dupResult = validateBlueprintGraph(duplicateSections);
  console.log('[Test 2] Duplicate Section Valid:', dupResult.valid, '(Errors:', dupResult.errors, ')');
  if (dupResult.valid || !dupResult.errors[0].includes('Duplicate')) {
    throw new Error('Test 2 failed: Expected duplicate section error.');
  }

  // Test 3: Dependency Cycle (A -> B -> C -> A)
  const cycleSections: BlueprintFileSection[] = [
    { file: 'src/a.ts', purpose: 'A', dependencies: ['src/b.ts'], specsRequired: [], exports: [], details: '', rawSection: '' },
    { file: 'src/b.ts', purpose: 'B', dependencies: ['src/c.ts'], specsRequired: [], exports: [], details: '', rawSection: '' },
    { file: 'src/c.ts', purpose: 'C', dependencies: ['src/a.ts'], specsRequired: [], exports: [], details: '', rawSection: '' },
  ];

  const cycleResult = validateBlueprintGraph(cycleSections);
  console.log('[Test 3] Cycle Detection Valid:', cycleResult.valid, '(Errors:', cycleResult.errors, ')');
  if (cycleResult.valid || !cycleResult.errors[0].includes('cycle')) {
    throw new Error('Test 3 failed: Expected cycle detection error.');
  }

  // Test 4: Missing Dependency Warning
  const missingDepSections: BlueprintFileSection[] = [
    { file: 'src/main.ts', purpose: 'Main', dependencies: ['src/missing.ts'], specsRequired: [], exports: [], details: '', rawSection: '' },
  ];

  const missingResult = validateBlueprintGraph(missingDepSections);
  console.log('[Test 4] Missing Dep Warning:', missingResult.warnings);
  if (missingResult.warnings.length === 0) {
    throw new Error('Test 4 failed: Expected missing dependency warning.');
  }

  console.log('\n✅ ALL BLUEPRINT GRAPH TESTS PASSED SUCCESSFULLY!');
}

testBlueprintGraph().catch((err) => {
  console.error('❌ Blueprint Graph Test Error:', err);
  process.exit(1);
});
