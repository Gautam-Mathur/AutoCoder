export {};

process.env.NO_PROXY = '*';
process.env.no_proxy = '*';
delete process.env.HTTP_PROXY;
delete process.env.http_proxy;
delete process.env.HTTPS_PROXY;
delete process.env.https_proxy;

async function main() {
  console.log('=== TESTING OLLAMA WITH PROXY BYPASS ===\n');

  try {
    const res = await fetch('http://127.0.0.1:11434/api/tags', { method: 'GET' });
    console.log(`Fetch Status: ${res.status}`);
    const data = await res.json();
    console.log(`Installed Ollama Models:`, data.models?.map((m: any) => m.name));
  } catch (err: any) {
    console.error(`Fetch error:`, err.message);
  }
}

main().catch(console.error);
