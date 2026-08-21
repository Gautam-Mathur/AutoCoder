import { prisma } from '../src/lib/db';

async function main() {
  const convo = await prisma.conversation.findUnique({
    where: { id: '4e92e988-0e9d-4fe3-ad17-5b74047f5443' },
    include: { history: { orderBy: { createdAt: 'desc' }, take: 5 } },
  });

  if (!convo) return;
  console.log(`Status: ${convo.status} | CurrentStage: ${convo.currentStage}`);
  for (const h of convo.history) {
    console.log(`  - [${h.createdAt.toISOString()}] Stage: ${h.stage} | Status: ${h.status} | Logs: ${h.logs.substring(0, 100)}...`);
  }
}

main().catch(console.error);
