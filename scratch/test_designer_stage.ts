import { runAgent } from '../src/lib/agents/ruflo/orchestrator';
import { loadExecutiveMemory, StageLedger } from '../src/lib/agents/ruflo/memory';
import { prisma } from '../src/lib/db';

async function main() {
  const convoId = '4e92e988-0e9d-4fe3-ad17-5b74047f5443';
  console.log(`=== TESTING DESIGNER STAGE FOR ${convoId} ===\n`);

  const memoryState = await loadExecutiveMemory(convoId);
  const ledger = new StageLedger(convoId, memoryState);

  const startTime = Date.now();
  try {
    const res = await runAgent(
      convoId,
      'Designer',
      'E-Commerce Core',
      (event) => {
        console.log(`[Event ${event.type}] Agent: ${event.agent || 'Orchestrator'} | ${event.message}`);
      },
      ledger,
      1
    );

    console.log(`\n🎉 Designer Completed in ${Date.now() - startTime}ms!`);
    console.log(`Output length: ${res.content.length} bytes`);
    console.log(`Output snippet:\n"${res.content.substring(0, 300)}..."`);
  } catch (err: any) {
    console.error(`\n❌ Designer Stage Error after ${Date.now() - startTime}ms:`, err.message);
  }
}

main().catch(console.error);
