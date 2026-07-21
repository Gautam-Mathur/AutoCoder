import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Fetch all outputs for the conversation
    const outputs = await prisma.agentOutput.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
    });

    // Fetch all history logs to extract in-progress stats
    const history = await prisma.executionHistory.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
    });

    // 1. Calculate Agent Token Usage, Latency, and Frequency
    const tokenUsageMap: Record<string, number> = {};
    const latencyHistory: Array<{ stage: string; timeMs: number }> = [];
    const frequencyMap: Record<string, number> = {};

    history.forEach((h: any) => {
      const logMsg = h.logs || '';
      if (logMsg.trim().startsWith('{') && logMsg.includes('"telemetryType":"rich_step_log"')) {
        try {
          const parsed = JSON.parse(logMsg);
          const stage = parsed.executionMemory?.stage || h.stage;
          if (stage && stage !== 'System' && stage !== 'Unknown') {
            frequencyMap[stage] = (frequencyMap[stage] || 0) + 1;
            if (parsed.orchestration?.durationMs) {
              latencyHistory.push({
                stage,
                timeMs: parsed.orchestration.durationMs,
              });
            }
            const inputLen = (parsed.inflow?.systemInstructions?.length || 0) + (parsed.inflow?.userContent?.length || 0);
            const outputLen = parsed.thought?.length || 0;
            const estTokens = Math.round((inputLen + outputLen) / 4);
            tokenUsageMap[stage] = (tokenUsageMap[stage] || 0) + estTokens;
          }
          return;
        } catch (e) {
          // fallback
        }
      }

      const match = h.logs.match(/(?:Estimated tokens:|Tokens generated: ~)\s*(\d+)/i);
      if (match) {
        const val = parseInt(match[1]);
        if (h.stage !== 'System' && h.stage !== 'Unknown') {
          tokenUsageMap[h.stage] = (tokenUsageMap[h.stage] || 0) + val;
        }
      }

      const lMatch = h.logs.match(/in (\d+)ms/i);
      if (lMatch) {
        latencyHistory.push({
          stage: h.stage,
          timeMs: parseInt(lMatch[1]),
        });
      }

      if (h.logs.includes('started (Attempt') || h.logs.includes('loop started')) {
        frequencyMap[h.stage] = (frequencyMap[h.stage] || 0) + 1;
      }
    });

    // Seed from outputs (successful states)
    outputs.forEach((out: any) => {
      const tokens = out.tokenUsage || 0;
      if (!tokenUsageMap[out.agentName]) {
        tokenUsageMap[out.agentName] = tokens;
      }
      if (latencyHistory.length === 0) {
        latencyHistory.push({
          stage: out.stage,
          timeMs: out.executionTime || 0,
        });
      }
      if (Object.keys(frequencyMap).length === 0) {
        frequencyMap[out.agentName] = (frequencyMap[out.agentName] || 0) + 1;
      }
    });

    let totalTokens = 0;
    Object.keys(tokenUsageMap).forEach((k) => {
      totalTokens += tokenUsageMap[k];
    });

    const tokenUsage = Object.keys(tokenUsageMap).map((name) => ({
      name,
      tokens: tokenUsageMap[name],
      percentage: totalTokens > 0 ? Math.round((tokenUsageMap[name] / totalTokens) * 100) : 0,
    }));

    const avgLatency = latencyHistory.length > 0 
      ? Math.round(latencyHistory.reduce((sum, item) => sum + item.timeMs, 0) / latencyHistory.length)
      : 0;

    const toolFrequency = Object.keys(frequencyMap).map((name) => ({
      tool: name,
      count: frequencyMap[name],
    }));

    return NextResponse.json({
      totalTokens,
      avgLatency,
      tokenUsage,
      latencyHistory,
      toolFrequency,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
