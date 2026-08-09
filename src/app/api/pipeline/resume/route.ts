import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { loadExecutiveMemory, StageLedger } from '@/lib/agents/ruflo/memory';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { conversationId, conflictDescription, resolvedConflictOption } = await request.json();

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Handle conflict resolution log if provided
    if (conflictDescription && resolvedConflictOption) {
      await prisma.executionHistory.create({
        data: {
          conversationId,
          stage: conversation.currentStage,
          status: 'ConflictResolved',
          logs: JSON.stringify({
            type: 'conflict_resolution',
            description: conflictDescription,
            resolvedOption: resolvedConflictOption,
            timestamp: new Date().toISOString(),
          }),
        },
      });
    }

    // Advance stage if paused there
    let nextStage = conversation.currentStage;
    if (conversation.currentStage === 'Architect') {
      nextStage = 'System';
    } else if (conversation.currentStage === 'Queen') {
      nextStage = 'Planner';
    }

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: 'Active',
        currentStage: nextStage,
      },
    });

    return NextResponse.json({ success: true, nextStage });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
