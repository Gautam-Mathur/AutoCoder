import { startOllamaKeepAlive, stopOllamaKeepAlive, runInference } from '../src/lib/agents/inference';

async function main() {
  console.log('=== TESTING OLLAMA PERMANENT VRAM PINNING & HEARTBEAT DAEMON ===\n');

  startOllamaKeepAlive();
  console.log('🟢 Active Ollama Heartbeat Daemon started (pinging http://127.0.0.1:11434 every 10s)...');

  console.log('\nRunning test inference with keep_alive: -1 payload...');
  const res = await runInference([
    { role: 'user', content: 'Say hello and confirm VRAM pinning is active.' }
  ], {
    timeoutMs: 1800000,
    maxTokens: 50,
  });

  console.log(`\n🎉 Model Response: "${res.trim()}"`);

  console.log('\nWaiting 5 seconds to observe active daemon pings...');
  await new Promise(r => setTimeout(r, 5000));

  stopOllamaKeepAlive();
  console.log('\n🔴 Ollama Keep-Alive Daemon stopped cleanly.');
}

main().catch(console.error);
