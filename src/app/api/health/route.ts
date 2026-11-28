import { NextRequest, NextResponse } from 'next/server';
import { getLLMConfig, directAgent } from '@/lib/agents/inference';
import { resolveProviderHealth } from '@/lib/agents/provider-health';
import { prisma } from '@/lib/db';

const undici = typeof window === 'undefined' ? require('undici') : null;
const undiciFetch = undici ? undici.fetch : fetch;

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request?: NextRequest) {
  delete process.env.HTTP_PROXY;
  delete process.env.http_proxy;
  delete process.env.HTTPS_PROXY;
  delete process.env.https_proxy;
  process.env.NO_PROXY = '*';
  process.env.no_proxy = '*';

  const config = await getLLMConfig();
  const verifyRemote = request?.nextUrl?.searchParams?.get('verify') === 'true';

  const health = await resolveProviderHealth(config, {
    verifyRemote,
    fetchImpl: undiciFetch,
    dispatcher: directAgent,
    timeoutMs: 3000,
  });

  // Calculate real latency stats from AgentOutput table
  const modelStats: Record<string, { ttft: string; tps: string; avgDurationMs: number; runs: number }> = {};

  try {
    const outputs = await prisma.agentOutput.findMany({
      where: {
        executionTime: { gt: 0 }, // Only real runs
      },
    });

    // Group by model
    const groups: Record<string, { totalTime: number; totalTokens: number; count: number }> = {};
    outputs.forEach((o: { model?: string | null; executionTime: number; tokenUsage: number }) => {
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
      const avgTps = g.totalTime > 0 ? g.totalTokens / (g.totalTime / 1000) : 0;
      const estimatedTtft = Math.max(500, Math.min(3500, Math.round(avgDuration * 0.05)));

      modelStats[modelName] = {
        ttft: `${estimatedTtft}ms`,
        tps: avgTps.toFixed(1),
        avgDurationMs: Math.round(avgDuration),
        runs: g.count,
      };
    });
  } catch (dbErr) {
    console.error('Failed to query database for latency stats:', dbErr);
  }

  return NextResponse.json({
    connected: health.connected,
    providerConnected: health.connected,
    ollamaConnected: health.ollamaConnected,
    provider: health.provider,
    host: health.host,
    model: health.model,
    models: health.models,
    reason: health.reason,
    modelStats,
  });
}
