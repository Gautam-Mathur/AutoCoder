import { prisma } from '../src/lib/db';

async function main() {
  console.log('=== CHECKING RECENT CONVERSATIONS & CURRENT STAGE ===\n');

  const convos = await prisma.conversation.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 5,
    include: {
      history: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  });

  for (const c of convos) {
    console.log(`ID: ${c.id}`);
    console.log(`Title: "${c.title}"`);
    console.log(`Status: ${c.status} | CurrentStage: ${c.currentStage} | QualityGateOverride: ${c.qualityGateOverride}`);
    console.log(`Updated At: ${c.updatedAt.toISOString()}`);
    console.log('Recent History Logs:');
    for (const h of c.history) {
      console.log(`  - [${h.createdAt.toISOString()}] Stage: ${h.stage} | Status: ${h.status} | Logs: ${h.logs.substring(0, 150)}`);
    }
    console.log('-'.repeat(80));
  }
}

main().catch(console.error);
