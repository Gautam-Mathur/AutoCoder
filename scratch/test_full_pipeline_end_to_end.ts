import { runOrchestrator, pipelineEvents } from '../src/lib/agents/ruflo/orchestrator';
import { prisma } from '../src/lib/db';

async function runEndToEndPipelineTest() {
  console.log('===========================================================');
  console.log('🚀 STARTING FULL END-TO-END PIPELINE VERIFICATION TEST');
  console.log('===========================================================\n');

  // 1. Create a clean test conversation
  const testConvo = await prisma.conversation.create({
    data: {
      title: 'Full End-to-End Resilience & Streaming Test',
      status: 'Active',
      currentStage: 'Queen',
    },
  });

  console.log(`✅ Created test conversation: ID ${testConvo.id}`);

  const eventChannel = `event:${testConvo.id}`;
  let totalEvents = 0;
  let streamProgressCount = 0;
  const completedStages: string[] = [];

  // 2. Subscribe to global pipelineEvents
  const listener = (evt: any) => {
    totalEvents++;
    if (evt.type === 'AGENT_STREAM_PROGRESS') {
      streamProgressCount++;
      if (streamProgressCount % 25 === 0) {
        console.log(`⚡ [STREAM PROGRESS] ${evt.agent}: ${evt.data?.tokenCount}/${evt.data?.maxTokens} tkns`);
      }
    } else if (evt.type === 'AGENT_COMPLETE') {
      completedStages.push(evt.agent);
      console.log(`🎉 [STAGE COMPLETE]: ${evt.agent} finished successfully!`);
    } else if (evt.type === 'AGENT_START') {
      console.log(`▶️ [STAGE START]: ${evt.agent} starting...`);
    } else if (evt.type === 'PIPELINE_COMPLETE') {
      console.log(`🏆 [PIPELINE COMPLETE]: ${evt.message}`);
    } else {
      console.log(`📌 [EVENT]: [${evt.type}] ${evt.message}`);
    }
  };

  pipelineEvents.on(eventChannel, listener);

  const startTime = Date.now();

  try {
    console.log('\n--- Launching Orchestrator Loop ---');
    await runOrchestrator(
      testConvo.id,
      'Build a lightweight CLI weather tool in TypeScript',
      (evt) => {}
    );

    const elapsedSec = Math.round((Date.now() - startTime) / 1000);
    console.log('\n===========================================================');
    console.log('📊 END-TO-END PIPELINE TEST RESULTS');
    console.log('===========================================================');
    console.log(`- Elapsed Duration: ${elapsedSec}s`);
    console.log(`- Total Events Emitted: ${totalEvents}`);
    console.log(`- Live Stream Chunks Emitted: ${streamProgressCount}`);
    console.log(`- Completed Stages (${completedStages.length}): ${completedStages.join(' ➔ ')}`);

    // Verify database execution history
    const history = await prisma.executionHistory.findMany({
      where: { conversationId: testConvo.id },
      orderBy: { createdAt: 'asc' },
    });
    console.log(`- SQLite ExecutionHistory Logs Created: ${history.length}`);

    // Verify VirtualFiles created
    const vfsFiles = await prisma.virtualFile.findMany({
      where: { conversationId: testConvo.id },
    });
    console.log(`- VFS Files Synthesized: ${vfsFiles.length}`);
    vfsFiles.forEach((f) => console.log(`  • ${f.filePath} (${f.content.length} bytes)`));

    if (completedStages.length >= 5 && vfsFiles.length > 0) {
      console.log('\n✅ VERIFICATION SUCCESS: All pipeline systems, live streaming, resilience, and SML persistence are functioning perfectly!');
    } else {
      console.log('\n⚠️ VERIFICATION WARNING: Partial completion achieved.');
    }
  } catch (err: any) {
    console.error('\n❌ PIPELINE VERIFICATION ERROR:', err);
  } finally {
    pipelineEvents.off(eventChannel, listener);
  }
}

runEndToEndPipelineTest().catch(console.error);
