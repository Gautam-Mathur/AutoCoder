import { NextResponse } from 'next/server';
import { getLLMConfig, directAgent } from '@/lib/agents/inference';
import { prisma } from '@/lib/db';

const undici = typeof window === 'undefined' ? require('undici') : null;
const undiciFetch = undici ? undici.fetch : fetch;

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  delete process.env.HTTP_PROXY;
  delete process.env.http_proxy;
  delete process.env.HTTPS_PROXY;
  delete process.env.https_proxy;
  process.env.NO_PROXY = '*';
  process.env.no_proxy = '*';

  const config = await getLLMConfig();
  const host = config.ollamaHost || 'http://127.0.0.1:11434';
  
  let connected = false;
  let models: string[] = [];

  try {
    const urlsToTry = Array.from(new Set([
      host,
      'http://127.0.0.1:11434',
      'http://localhost:11434',
      'http://0.0.0.0:11434',
    ]));

    for (const targetHost of urlsToTry) {
      try {
        const res = await undiciFetch(`${targetHost}/api/tags`, {
          method: 'GET',
          cache: 'no-store',
          signal: AbortSignal.timeout(3000),
          ...(directAgent ? { dispatcher: directAgent } : {} as any),
        });
        if (res.ok) {
          connected = true;
          const data = await res.json();
          if (data && Array.isArray(data.models)) {
            models = data.models.map((m: any) => m.name);
          }
          break;
        }
      } catch (err) {
        // Try next host if any
      }
    }
  } catch (e) {
    // Connection failed
  }

  // Calculate real latency stats from AgentOutput table
  const modelStats: Record<string, { ttft: string; tps: string; avgDurationMs: number; runs: number }> = {};
  
  try {
    const outputs = await prisma.agentOutput.findMany({
      where: {
        executionTime: { gt: 0 } // Only real runs
      }
    });

    // Group by model
    const groups: Record<string, { totalTime: number; totalTokens: number; count: number }> = {};
    outputs.forEach((o: any) => {
      // Normalize model name (e.g. remove "ollama/" prefix if any)
      const modelName = (o.model || 'unknown').replace('ollama/', '');
      if (!groups[modelName]) {
        groups[modelName] = { totalTime: 0, totalTokens: 0, count: 0 };
      }
      groups[modelName].totalTime += o.executionTime;
      groups[modelName].totalTokens += o.tokenUsage;
      groups[modelName].count++;
    });

    Object.keys(groups).forEach((modelName) => {
      const g = groups[modelName];
      const avgDuration = g.totalTime / g.count;
      const avgTps = g.totalTime > 0 ? (g.totalTokens / (g.totalTime / 1000)) : 0;
      const estimatedTtft = Math.max(500, Math.min(3500, Math.round(avgDuration * 0.05)));
      
      modelStats[modelName] = {
        ttft: `${estimatedTtft}ms`,
        tps: avgTps.toFixed(1),
        avgDurationMs: Math.round(avgDuration),
        runs: g.count
      };
    });
  } catch (dbErr) {
    console.error('Failed to query database for latency stats:', dbErr);
  }

  return NextResponse.json({
    connected,
    provider: config.provider,
    host,
    model: config.ollamaModel,
    models,
    modelStats
  });
}
