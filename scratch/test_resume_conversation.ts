import { prisma } from '../src/lib/db';
import { runOrchestrator } from '../src/lib/agents/ruflo/orchestrator';

async function main() {
  const convoId = '4e92e988-0e9d-4fe3-ad17-5b74047f5443';
  console.log(`=== RESUMING CONVERSATION ${convoId} ===\n`);

  const convo = await prisma.conversation.findUnique({
    where: { id: convoId },
  });

  if (!convo) {
    console.log('Conversation not found');
    return;
  }

  console.log(`Current status before resume: ${convo.status} | currentStage: ${convo.currentStage}`);

  // Update DB status to Active and advance to Designer (since System already completed)
  const nextStage = convo.currentStage === 'System' ? 'Designer' : convo.currentStage;
  await prisma.conversation.update({
    where: { id: convoId },
    data: {
      status: 'Active',
      currentStage: nextStage,
      qualityGateOverride: true,
    },
  });

  console.log(`Updated conversation status to Active. Resuming pipeline from stage: ${nextStage}...`);

  // Asynchronously launch runOrchestrator from nextStage
  runOrchestrator(
    convoId,
    convo.title || 'E-Commerce Core',
    (event) => {
      console.log(`[Event ${event.type}] Agent: ${event.agent || 'Orchestrator'} | Message: ${event.message}`);
    },
    undefined,
    nextStage
  ).then(() => {
    console.log('\n🎉 Pipeline run completed successfully!');
  }).catch((err) => {
    console.error('\n❌ Pipeline execution error:', err.message);
  });
}

main().catch(console.error);
