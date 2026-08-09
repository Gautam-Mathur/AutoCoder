import { NextResponse } from 'next/server';
import { getLLMConfig, checkOllamaConnection } from '@/lib/agents/inference';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const config = await getLLMConfig();
  const host = config.ollamaHost || 'http://localhost:11434';
  
  let connected = false;
  let models: string[] = [];

  try {
    const urlsToTry = [host];
    if (host.includes('localhost')) {
      urlsToTry.push(host.replace('localhost', '127.0.0.1'));
    }

    for (const targetHost of urlsToTry) {
      try {
        const res = await fetch(`${targetHost}/api/tags`, {
          method: 'GET',
          cache: 'no-store',
          signal: AbortSignal.timeout(3000),
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
