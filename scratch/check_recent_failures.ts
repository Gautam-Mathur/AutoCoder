import { prisma } from '../src/lib/db';

async function main() {
  const convoId = '628d5e0c-1c94-4edb-a0db-268c7a906181';
  console.log(`=== DEEP INSPECTION FOR CONVERSATION ${convoId} ===\n`);

  const convo = await prisma.conversation.findUnique({
    where: { id: convoId },
    include: {
      history: { orderBy: { createdAt: 'asc' } },
      outputs: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!convo) {
    console.log('Conversation not found');
    return;
  }

  console.log(`Title: ${convo.title}`);
  console.log(`Status: ${convo.status}`);
  console.log(`CurrentStage: ${convo.currentStage}`);
  console.log(`History Logs count: ${convo.history.length}`);

  for (const h of convo.history) {
    console.log(`\n[History ${h.createdAt.toISOString()}] Stage: ${h.stage} | Status: ${h.status}`);
    console.log(`Logs: ${h.logs}`);
  }

  console.log(`\nAgent Outputs count: ${convo.outputs.length}`);
  for (const o of convo.outputs) {
    console.log(`\n[AgentOutput] Agent: ${o.agentName} | Attempt: ${o.attempt} | Model: ${o.model}`);
    console.log(`Output: ${o.validatedJson}`);
  }
}

main().catch(console.error);
