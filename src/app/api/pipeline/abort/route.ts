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

    // Abort internal Node orchestrator execution
    abortPipelineExecution(conversationId);

    // Update conversation status in SQLite
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'Paused' },
    });

    return NextResponse.json({ success: true, message: 'Pipeline aborted by user.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
