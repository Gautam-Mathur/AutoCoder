import { 
  executeTool, 
  getToolsForAgent, 
  toolToOllamaFormat, 
  TOOL_REGISTRY 
} from '../src/lib/agents/ruflo/toolbox';
import { readVirtualFile } from '../src/lib/agents/ruflo/vfs';
import { prisma } from '../src/lib/db';

async function runToolboxTests() {
  console.log('--- STARTING AGENT TOOLBOX SUITE VERIFICATION ---');
  const testConvoId = 'toolbox-test-suite-' + Date.now();

  try {
    // Clean pre-existing test data
    await prisma.virtualFile.deleteMany({ where: { conversationId: testConvoId } });

    // 1. Test Parameter Type Coercion & Execution
    console.log('[TEST 1] Parameter Type Coercion & Tool Execution...');
    // Write initial file using write_file tool
    const writeResult = await executeTool(
      'write_file',
      { file_path: 'app.ts', content: 'console.log("initial");' },
      testConvoId
    );
    if (!writeResult.success) {
      throw new Error(`write_file tool failed: ${JSON.stringify(writeResult)}`);
    }

    // Apply diff passing string representations of integer parameters ("1")
    const diffResult = await executeTool(
      'apply_diff',
      {
        file_path: 'app.ts',
        start_line: '1',
        end_line: '1',
        new_content: 'console.log("coerced diff success");',
      },
      testConvoId
    );
    console.log('  diffResult:', diffResult);
    if (!diffResult.success) {
      throw new Error(`apply_diff tool failed: ${JSON.stringify(diffResult)}`);
    }

    const updatedContent = await readVirtualFile(testConvoId, 'app.ts');
    if (updatedContent !== 'console.log("coerced diff success");') {
      throw new Error(`Content mismatch after coerced apply_diff: got '${updatedContent}'`);
    }
    console.log('  ✓ Parameter Type Coercion & Tool Execution passed');

    // 2. Test Missing File Handling
    console.log('[TEST 2] Missing File Recovery Response...');
    const readResult = await executeTool('read_file', { file_path: 'nonexistent.ts' }, testConvoId);
    console.log('  readResult:', readResult);
    if (readResult.found !== false || readResult.content !== null || !readResult.message.includes('does not exist')) {
      throw new Error('read_file missing file response mismatch');
    }
    console.log('  ✓ Missing File Recovery Response passed');

    // 3. Test Ollama Tool Schema Formatting
    console.log('[TEST 3] Ollama Schema Formatting...');
    const diffTool = TOOL_REGISTRY.find((t) => t.name === 'apply_diff')!;
    const ollamaFormat: any = toolToOllamaFormat(diffTool);
    console.log('  Ollama Format:', JSON.stringify(ollamaFormat, null, 2));
    if (
      ollamaFormat.type !== 'function' ||
      ollamaFormat.function.name !== 'apply_diff' ||
      ollamaFormat.function.parameters.properties.start_line.type !== 'integer'
    ) {
      throw new Error('Ollama schema formatting mismatch');
    }
    console.log('  ✓ Ollama Schema Formatting passed');

    // 4. Test Agent Permission Filtering
    console.log('[TEST 4] Agent Permission Filtering...');
    const agentTools = getToolsForAgent(['read_file', 'check_syntax']);
    console.log('  Agent Tools:', agentTools.map((t) => t.name));
    if (agentTools.length !== 2 || agentTools[0].name !== 'read_file' || agentTools[1].name !== 'check_syntax') {
      throw new Error('Agent permission filtering failed');
    }
    console.log('  ✓ Agent Permission Filtering passed');

    // 5. Test Error Handling (Missing Required Parameter)
    console.log('[TEST 5] Exception Safety Wrapper (Missing Parameter)...');
    const errResult = await executeTool('write_file', { file_path: 'test.ts' }, testConvoId);
    console.log('  Error Result:', errResult);
    if (!errResult.error || !errResult.message.includes('Missing required parameter')) {
      throw new Error('Exception safety wrapper test failed: expected missing parameter error');
    }
    console.log('  ✓ Exception Safety Wrapper passed');

    // Clean test data
    await prisma.virtualFile.deleteMany({ where: { conversationId: testConvoId } });
    console.log('--- ALL TOOLBOX TESTS PASSED SUCCESSFULLY! ---');
  } catch (err: any) {
    console.error('❌ AGENT TOOLBOX TEST SUITE FAILED:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runToolboxTests();
