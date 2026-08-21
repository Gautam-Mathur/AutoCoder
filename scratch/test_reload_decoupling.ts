import { runOrchestrator, activePipelines, pipelineEvents } from '../src/lib/agents/ruflo/orchestrator';

async function testReloadDecoupling() {
  console.log('=== TESTING BROWSER RELOAD DECOUPLING & BACKEND PERSISTENCE ===\n');

  const testConvoId = '4e92e988-0e9d-4fe3-ad17-5b74047f5443';
  const eventChannel = `event:${testConvoId}`;

  let eventCount = 0;
  const listener = (evt: any) => {
    eventCount++;
    console.log(`📡 [Live Event #${eventCount}]: [${evt.type}] Agent: ${evt.agent || 'Orchestrator'} | ${evt.message}`);
  };

  pipelineEvents.on(eventChannel, listener);
  console.log('🟢 Subscribed browser SSE listener to global EventEmitter.');

  // Simulate tab reload: disconnect listener after 2 seconds
  setTimeout(() => {
    console.log('\n🔄 [SIMULATED BROWSER TAB RELOAD]: Tab closed or reloaded. Disconnecting listener...');
    pipelineEvents.off(eventChannel, listener);
    console.log(`Is pipeline still active in background Node process? activePipelines.has(${testConvoId}) = ${activePipelines.has(testConvoId)}`);
  }, 2000);

  // Simulate new tab opening 3 seconds later and re-attaching:
  setTimeout(() => {
    console.log('\n✨ [SIMULATED NEW TAB RE-ATTACHMENT]: New tab opened. Re-subscribing...');
    pipelineEvents.on(eventChannel, (evt: any) => {
      console.log(`⚡ [Re-attached Tab Event]: [${evt.type}] ${evt.message}`);
    });
  }, 3000);

  await new Promise(r => setTimeout(r, 4500));
  console.log('\n🎉 Test completed successfully!');
}

testReloadDecoupling().catch(console.error);
