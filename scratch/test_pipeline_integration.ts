import { 
  writeVirtualFile, 
  readVirtualFile, 
  listVirtualFiles, 
  flushVfsToDisk 
} from '../src/lib/agents/ruflo/vfs';
import { runLinter } from '../src/lib/agents/ruflo/linter';
import { executeTool, getToolsForAgent, TOOL_REGISTRY } from '../src/lib/agents/ruflo/toolbox';
import { prisma } from '../src/lib/db';
import * as fs from 'fs';
import * as path from 'path';

async function runPipelineIntegrationTests() {
  console.log('--- STARTING COMPLETE PIPELINE INTEGRATION VERIFICATION ---');
  const testConvoId = 'pipeline-integration-' + Date.now();

  try {
    // 1. Clean pre-existing test state
    await prisma.virtualFile.deleteMany({ where: { conversationId: testConvoId } });

    // 2. VFS Primary Storage Test
    console.log('[INTEGRATION TEST 1] VFS Primary Source of Truth Write...');
    await writeVirtualFile(
      testConvoId,
      'src/math.ts',
      'export function multiply(a: number, b: number): number { return a * b; }'
    );
    await writeVirtualFile(
      testConvoId,
      'src/app.ts',
      'import { multiply } from "./math";\nconst num: number = "broken string";'
    );

    const vfsList = await listVirtualFiles(testConvoId);
    console.log('  VFS File List:', vfsList);
    if (vfsList.length !== 2 || !vfsList.includes('src/math.ts') || !vfsList.includes('src/app.ts')) {
      throw new Error('VFS listing failed');
    }
    console.log('  ✓ VFS Primary Storage passed');

    // 3. Automated Linter Diagnostic Interception
    console.log('[INTEGRATION TEST 2] In-Memory Linter Interception...');
    const linterResultInitial = await runLinter(testConvoId, 'src/app.ts');
    console.log('  Initial Linter Summary:', linterResultInitial.summary);
    if (linterResultInitial.success || linterResultInitial.errors.length === 0) {
      throw new Error('Expected linter failure on invalid string type assignment');
    }
    if (linterResultInitial.errors[0].line !== 2) {
      throw new Error(`Expected linter error at line 2, got line ${linterResultInitial.errors[0].line}`);
    }
    console.log(`  ✓ Linter caught type error on line ${linterResultInitial.errors[0].line}`);

    // 4. Toolbox Diff Repair Execution & Parameter Coercion
    console.log('[INTEGRATION TEST 3] Toolbox apply_diff Repair Execution...');
    const repairResult = await executeTool(
      'apply_diff',
      {
        file_path: 'src/app.ts',
        start_line: '2', // Passed as string to test coercion
        end_line: '2',
        new_content: 'const num: number = multiply(6, 7);',
      },
      testConvoId
    );
    console.log('  Repair Result:', repairResult);
    if (!repairResult.success) {
      throw new Error(`Toolbox repair failed: ${JSON.stringify(repairResult)}`);
    }
    console.log('  ✓ Toolbox apply_diff repair passed');

    // 5. Post-Repair Linter Verification
    console.log('[INTEGRATION TEST 4] Post-Repair Linter Re-Verification...');
    const linterResultRepaired = await runLinter(testConvoId, 'src/app.ts');
    console.log('  Post-Repair Linter Summary:', linterResultRepaired.summary);
    if (!linterResultRepaired.success) {
      throw new Error(`Post-repair linter check failed: ${linterResultRepaired.summary}`);
    }
    console.log('  ✓ Post-Repair Linter verification passed');

    // 6. VFS Disk Flushing to physical workspace
    console.log('[INTEGRATION TEST 5] VFS Disk Flushing (Physical Storage Sync)...');
    const countFlushed = await flushVfsToDisk(testConvoId);
    console.log(`  Flushed ${countFlushed} file(s) to physical disk.`);

    const physicalAppPath = path.join(process.cwd(), 'projects', testConvoId, 'src/app.ts');
    if (!fs.existsSync(physicalAppPath)) {
      throw new Error(`Physical flushed file does not exist at path: ${physicalAppPath}`);
    }

    const physicalContent = fs.readFileSync(physicalAppPath, 'utf8');
    if (!physicalContent.includes('multiply(6, 7)')) {
      throw new Error(`Physical content mismatch: expected multiply(6, 7), got '${physicalContent}'`);
    }
    console.log('  ✓ VFS Disk Flushing passed');

    // Cleanup test data
    await prisma.virtualFile.deleteMany({ where: { conversationId: testConvoId } });
    const projectDir = path.join(process.cwd(), 'projects', testConvoId);
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }

    console.log('--- ALL PIPELINE INTEGRATION TESTS PASSED PERFECTLY! ---');
  } catch (err: any) {
    console.error('❌ PIPELINE INTEGRATION TEST SUITE FAILED:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPipelineIntegrationTests();
