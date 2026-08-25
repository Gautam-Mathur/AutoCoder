import { prisma } from '../src/lib/db.js';
import {
  writeExecutiveMemoryRecord,
  loadExecutiveMemory,
  StageLedger
} from '../src/lib/agents/ruflo/memory.js';
import { buildStageContext } from '../src/lib/agents/ruflo/orchestrator.js';

async function main() {
  console.log('🧪 Starting Executive Memory Ledger Unit & Integration Test...\n');

  const testConvoId = `em-test-${Date.now()}`;

  // 1. Create dummy Conversation
  const convo = await prisma.conversation.create({
    data: {
      id: testConvoId,
      title: 'EM Ledger Integration Test',
      status: 'Active',
      currentStage: 'Queen',
    },
  });
  console.log(`✓ Created test Conversation ID: ${convo.id}`);

  // 2. Test Queen Stage write
  const queenInfId = await writeExecutiveMemoryRecord({
    conversationId: convo.id,
    agentName: 'Queen',
    contentMd: '### Context Snapshot\nProject Name: TaskFlow Pro\nGoal: Build a modern task manager.',
  });
  console.log(`✓ Written Queen record: inferenceId = ${queenInfId}`);
  if (!queenInfId.startsWith('Queen-1-')) {
    throw new Error(`Expected Queen-1 prefix, got ${queenInfId}`);
  }

  // 3. Test Planner Stage write consuming Queen
  const { context: plannerCtx, consumedInferenceIds: plannerConsumed } = await buildStageContext(convo.id, 'Planner');
  console.log(`✓ Planner buildStageContext returned consumedIds: ${JSON.stringify(plannerConsumed)}`);
  if (!plannerConsumed.includes(queenInfId)) {
    throw new Error(`Expected Planner to consume ${queenInfId}`);
  }

  const plannerInfId = await writeExecutiveMemoryRecord({
    conversationId: convo.id,
    agentName: 'Planner',
    contentMd: '### Context Snapshot\n- Feature 1: Task Lists\n- Feature 2: Tags & Labels',
    consumedInferenceIds: plannerConsumed,
  });
  console.log(`✓ Written Planner record: inferenceId = ${plannerInfId}`);

  // 4. Test Coder file-level superseding
  const coderInfId1 = await writeExecutiveMemoryRecord({
    conversationId: convo.id,
    agentName: 'Coder',
    contentMd: 'console.log("v1");',
    filePath: 'src/app.ts',
  });
  console.log(`✓ Written Coder file 1 (src/app.ts): ${coderInfId1}`);

  const coderInfId2 = await writeExecutiveMemoryRecord({
    conversationId: convo.id,
    agentName: 'Coder',
    contentMd: 'console.log("v2");',
    filePath: 'src/app.ts',
  });
  console.log(`✓ Written Coder file 1 update (src/app.ts): ${coderInfId2}`);

  // 5. Verify database states & superseding
  const rows = await prisma.executiveMemory.findMany({
    where: { conversationId: convo.id },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`\n📊 ExecutiveMemory DB Records (${rows.length} total):`);
  rows.forEach((r) => {
    console.log(`  • ${r.inferenceId} | Agent: ${r.agentName} | Status: ${r.status} | File: ${r.filePath || 'N/A'}`);
  });

  const appTsRows = rows.filter((r) => r.filePath === 'src/app.ts');
  if (appTsRows[0].status !== 'SUPERSEDED' || appTsRows[1].status !== 'ACTIVE') {
    throw new Error('Coder file superseding logic failed!');
  }
  console.log('✓ Coder file superseding correctly marked initial version as SUPERSEDED');

  // 6. Test loadExecutiveMemory hydration
  const memoryState = await loadExecutiveMemory(convo.id);
  console.log('\n🧠 Reconstructed MemoryState from SQLite:');
  console.log(`  • TaskSpec (Queen): ${Boolean(memoryState.taskSpec)}`);
  console.log(`  • Planner: ${Boolean(memoryState.planner)}`);
  console.log(`  • Coder Files: ${Object.keys(memoryState.coder).join(', ')}`);
  console.log(`  • Coder App.ts Content: ${memoryState.coder['src/app.ts']?.content}`);

  if (memoryState.coder['src/app.ts']?.content !== 'console.log("v2");') {
    throw new Error('loadExecutiveMemory failed to hydrate latest ACTIVE file content');
  }

  // 7. Cleanup
  await prisma.conversation.delete({ where: { id: convo.id } });
  console.log('\n🎉 ALL EXECUTIVE MEMORY LEDGER TESTS PASSED SUCCESSFULLY!');
}

main().catch((err) => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
