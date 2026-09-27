import { checkOllamaConnection, getLLMConfig } from '../src/lib/agents/inference';

async function testConn() {
  console.log('Testing Ollama Connection Fix...');
  const config = await getLLMConfig();
  console.log('LLM Config:', config);

  const connected = await checkOllamaConnection(config.ollamaHost);
  console.log('Ollama Connected Result:', connected);
}

testConn().catch(console.error);
