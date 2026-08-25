import { prisma } from '../src/lib/db.js';
import { runOrchestrator, pipelineEvents, activePipelines } from '../src/lib/agents/ruflo/orchestrator.js';

async function main() {
  console.log('🔍 Debugging Pipeline Liveness, Event Stream, and Queen Stage...\n');

  // 1. Inspect recent Conversations in DB
  const recentConvos = await prisma.conversation.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  console.log(`Found ${recentConvos.length} recent Conversations in DB:`);
  recentConvos.forEach(c => {
    console.log(`  • ID: ${c.id} | Title: "${c.title}" | Status: ${c.status} | Stage: ${c.currentStage} | Updated: ${c.updatedAt.toISOString()}`);
  });

  if (recentConvos.length > 0) {
    const latest = recentConvos[0];
    const history = await prisma.executionHistory.findMany({
      where: { conversationId: latest.id },
      orderBy: { createdAt: 'asc' },
    });
    console.log(`\nHistory logs for latest conversation (${latest.id}): ${history.length} records`);
    history.forEach(h => console.log(`  [${h.createdAt.toISOString()}] ${h.stage} - ${h.status}: ${h.logs}`));
  }

  // 2. Test event listener on pipelineEvents
  const testId = `live-test-${Date.now()}`;
  console.log(`\n🧪 Testing live pipelineEvents emission for test conversation: ${testId}`);

  let eventCount = 0;
  const listener = (evt: any) => {
    eventCount++;
    console.log(`  📡 [EVENT RECEIVED #${eventCount}] Type: ${evt.type} | Agent: ${evt.agent || 'N/A'} | Msg: ${evt.message}`);
  };

  pipelineEvents.on(`event:${testId}`, listener);

  // Create temporary conversation for liveness test
  const testConvo = await prisma.conversation.create({
    data: {
      id: testId,
      title: 'Pipeline Liveness Verification',
      status: 'Active',
      currentStage: 'Queen',
    },
  });

  // Run orchestrator with mock event callback
  console.log('Starting runOrchestrator execution...');
  try {
    // We will abort after initial stage to avoid full LLM run if needed, or monitor Queen
    const controller = new AbortController();

    // Set timeout to abort after 5s to check initial event emission
    setTimeout(() => {
      console.log('Aborting test run after 5s event capture...');
      controller.abort();
    }, 5000);

    await runOrchestrator(
      testId,
      'Build a simple hello world HTML page',
      (evt) => {
        console.log(`  Direct Callback -> Type: ${evt.type} | Msg: ${evt.message}`);
      },
      controller.signal
    );
  } catch (err: any) {
    console.log(`Orchestrator finished/aborted with: ${err.message}`);
  } finally {
    pipelineEvents.off(`event:${testId}`, listener);
    await prisma.conversation.delete({ where: { id: testId } }).catch(() => {});
  }

  console.log(`Total events captured via pipelineEvents listener: ${eventCount}`);
}

main().catch(err => {
  console.error('Debug script error:', err);
});
