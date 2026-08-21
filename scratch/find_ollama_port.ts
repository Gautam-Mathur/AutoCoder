import fs from 'fs';
import path from 'path';

async function main() {
  const settingsPath = path.join(process.cwd(), 'settings.json');
  if (fs.existsSync(settingsPath)) {
    console.log('settings.json contents:');
    console.log(fs.readFileSync(settingsPath, 'utf8'));
  } else {
    console.log('No settings.json found');
  }

  // Scan common ports for Ollama or local LLM server
  const portsToScan = [11434, 11435, 8080, 8000, 5000, 1234];
  for (const p of portsToScan) {
    try {
      const res = await fetch(`http://127.0.0.1:${p}/api/tags`, { method: 'GET' });
      if (res.ok) {
        console.log(`\n🎉 Found Ollama running on port ${p}!`);
        const data = await res.json();
        console.log(`Models:`, data.models?.map((m: any) => m.name));
        return;
      }
    } catch (e) {
      // Port not responding
    }
  }

  console.log('\nTested ports 11434, 11435, 8080, 8000, 5000, 1234 — NONE responded.');
}

main().catch(console.error);
