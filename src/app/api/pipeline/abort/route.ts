import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { abortPipelineExecution } from '@/lib/agents/ruflo/orchestrator';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { conversationId } = await request.json();

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }

    // Abort internal Node orchestrator execution and persist Cancelled status
    await abortPipelineExecution(conversationId);

    return NextResponse.json({ success: true, message: 'Pipeline aborted by user.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
