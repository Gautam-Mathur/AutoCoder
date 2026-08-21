import { prisma } from '../src/lib/db';
import { runOrchestrator } from '../src/lib/agents/ruflo/orchestrator';

const STAGES = [
  'Queen',
  'Planner',
  'Architect',
  'System',
  'Designer',
  'Blueprinter',
  'Coder',
  'Tester',
  'Debugger',
  'Security',
  'Reviewer',
];

async function main() {
  const convoId = '4e92e988-0e9d-4fe3-ad17-5b74047f5443';
  console.log(`=== ADVANCING PIPELINE PAST DESIGNER TO BLUEPRINTER ===\n`);

  const convo = await prisma.conversation.findUnique({
    where: { id: convoId },
    include: { history: { orderBy: { createdAt: 'desc' } } },
  });

  if (!convo) return;

  const currentIdx = STAGES.indexOf(convo.currentStage);
  const nextStage = STAGES[currentIdx + 1];

  console.log(`Advancing stage from ${convo.currentStage} to ${nextStage}...`);

  await prisma.conversation.update({
    where: { id: convoId },
    data: {
      status: 'Active',
      currentStage: nextStage,
      qualityGateOverride: true,
    },
  });

  console.log(`Updated status to Active. Launching runOrchestrator at stage: ${nextStage}...`);

  runOrchestrator(
    convoId,
    convo.title || 'E-Commerce Core',
    (event) => {
      console.log(`[Event ${event.type}] Agent: ${event.agent || 'Orchestrator'} | ${event.message}`);
    },
    undefined,
    nextStage
  ).then(() => {
    console.log('\n🎉 Pipeline execution completed successfully!');
  }).catch((err) => {
    console.error('\n❌ Pipeline execution error:', err.message);
  });
}

main().catch(console.error);
