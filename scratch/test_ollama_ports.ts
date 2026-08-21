export {};

async function main() {
  const urls = [
    'http://127.0.0.1:11434/api/tags',
    'http://localhost:11434/api/tags',
    'http://0.0.0.0:11434/api/tags',
  ];

  for (const u of urls) {
    try {
      const res = await fetch(u, { method: 'GET' });
      console.log(`Fetch to ${u} -> status: ${res.status} OK: ${res.ok}`);
      const data = await res.json();
      console.log(`Models found: ${data.models?.map((m: any) => m.name).join(', ')}`);
    } catch (err: any) {
      console.log(`Fetch to ${u} -> ERROR: ${err.message}`);
    }
  }
}

main().catch(console.error);
