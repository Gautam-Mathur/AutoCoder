import { checkOllamaConnection, getLLMConfig } from '../src/lib/agents/inference.js';

async function main() {
  console.log('🧪 Testing Ollama Connection Check & Config Resolution...\n');

  console.log(`process.env.no_proxy: ${process.env.no_proxy}`);
  console.log(`process.env.HTTP_PROXY: ${process.env.HTTP_PROXY}`);
  console.log(`process.env.HTTPS_PROXY: ${process.env.HTTPS_PROXY}`);

  const config = await getLLMConfig();
  console.log(`Resolved LLM Config:`, config);

  const isConnected = await checkOllamaConnection(config.ollamaHost);
  console.log(`checkOllamaConnection("${config.ollamaHost}") result: ${isConnected}`);

  if (!isConnected) {
    console.log('\n❌ Ollama connection check returned FALSE!');
  } else {
    console.log('\n✅ Ollama connection check returned TRUE!');
  }
}

main().catch(err => {
  console.error('Test error:', err);
});
