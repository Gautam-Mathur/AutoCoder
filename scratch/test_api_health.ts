import { GET } from '../src/app/api/health/route.js';

async function main() {
  console.log('🧪 Testing Next.js /api/health endpoint response...\n');
  const response = await GET();
  const data = await response.json();
  console.log('API Health Response:', data);
}

main().catch(err => {
  console.error('Test error:', err);
});
