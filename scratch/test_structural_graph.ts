import { writeVirtualFile, listVirtualFiles, readVirtualFile } from '../src/lib/agents/ruflo/vfs';
import {
  buildStructuralGraph,
  detectAndPersistArchitectureDrift,
  BlueprintFileSection,
  fileNodeId,
  symbolNodeId,
} from '../src/lib/agents/ruflo/structural-graph';

async function testStructuralGraph() {
  const testConvoId = `test-graph-${Date.now()}`;
  console.log(`=== TESTING STRUCTURAL GRAPH & ARCHITECTURE DRIFT (${testConvoId}) ===\n`);

  // 1. Setup mock VFS files
  await writeVirtualFile(
    testConvoId,
    'src/lib/db.ts',
    `export interface DbConfig { host: string; port: number; }
export class DatabaseClient {
  connect() { return true; }
}`
  );

  await writeVirtualFile(
    testConvoId,
    'src/services/payment.ts',
    `import { DatabaseClient } from '../lib/db';
export function processPayment(amount: number) {
  const db = new DatabaseClient();
  return db.connect();
}`
  );

  await writeVirtualFile(
    testConvoId,
    'src/app.ts',
    `import { processPayment } from './services/payment';
import { missingHelper } from './missing';

export function main() {
  processPayment(100);
}`
  );

  // 2. Build Structural Graph
  const graph = await buildStructuralGraph(testConvoId);
  console.log(`✓ Nodes Extracted: ${graph.nodes.length}`);
  console.log(`✓ Edges Extracted: ${graph.edges.length}`);
  console.log(`✓ Warnings Extracted: ${graph.warnings.length}`);

  const fileNodes = graph.nodes.filter((n) => n.type === 'FILE');
  const symbolNodes = graph.nodes.filter((n) => n.type === 'SYMBOL');
  console.log(`  - File Nodes (${fileNodes.length}):`, fileNodes.map((n) => n.title));
  console.log(`  - Symbol Nodes (${symbolNodes.length}):`, symbolNodes.map((n) => n.title));

  const importEdges = graph.edges.filter((e) => e.type === 'IMPORTS');
  console.log(`  - Import Edges (${importEdges.length})`);

  if (fileNodes.length !== 3) {
    throw new Error(`Expected 3 FILE nodes, got ${fileNodes.length}`);
  }

  // Check broken import warning for missing
  const hasMissingWarning = graph.warnings.some((w) => w.includes('missing'));
  console.log(`✓ Captured Broken Import Warning:`, hasMissingWarning);
  if (!hasMissingWarning) {
    throw new Error('Expected broken import warning for missing module.');
  }

  // 3. Test Architecture Drift Detection
  const mockBlueprintSections: BlueprintFileSection[] = [
    { file: 'src/lib/db.ts', purpose: 'DB Client', dependencies: [], specsRequired: [], exports: [], details: '', rawSection: '' },
    { file: 'src/services/payment.ts', purpose: 'Payment Service', dependencies: ['src/lib/db.ts'], specsRequired: [], exports: [], details: '', rawSection: '' },
    { file: 'src/app.ts', purpose: 'App Entry', dependencies: ['src/services/payment.ts'], specsRequired: [], exports: [], details: '', rawSection: '' },
    { file: 'src/services/unimplemented.ts', purpose: 'Unimplemented Service', dependencies: [], specsRequired: [], exports: [], details: '', rawSection: '' },
  ];

  const reportMd = await detectAndPersistArchitectureDrift(testConvoId, mockBlueprintSections);
  console.log('\n--- GENERATED DRIFT REPORT ---');
  console.log(reportMd);

  const savedReport = await readVirtualFile(testConvoId, 'architecture_drift_report.md');
  if (!savedReport || !savedReport.includes('src/services/unimplemented.ts')) {
    throw new Error('Expected drift report to contain missing implementation src/services/unimplemented.ts.');
  }

  console.log('✅ ALL STRUCTURAL GRAPH & DRIFT TESTS PASSED SUCCESSFULLY!');
}

testStructuralGraph().catch((err) => {
  console.error('❌ Structural Graph Test Error:', err);
  process.exit(1);
});
