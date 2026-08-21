import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { runOrchestrator } from '@/lib/agents/ruflo/orchestrator';

export const dynamic = 'force-dynamic';

const STAGES = [
  'Queen',
  'Planner',
  'Architect',
  'System',
  'Designer',
  'Blueprinter',
  'Coder',
  'Tester',
  'Debugger',
  'Security',
  'Reviewer',
];

export async function POST(request: NextRequest) {
  try {
    const { conversationId, conflictDescription, resolvedConflictOption } = await request.json();

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { history: { orderBy: { createdAt: 'desc' } } },
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

    // Advance stage to the next stage in sequence if current stage has completed or is a paused gate
    let nextStage = conversation.currentStage;
    const currentIdx = STAGES.indexOf(conversation.currentStage);
    if (currentIdx >= 0 && currentIdx < STAGES.length - 1) {
      const currentCompleted = conversation.history.some(
        (h) => h.stage === conversation.currentStage && h.status === 'Completed'
      );
      if (currentCompleted || conversation.currentStage === 'Architect' || conversation.currentStage === 'Queen') {
        nextStage = STAGES[currentIdx + 1];
      }
    }

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: 'Active',
        currentStage: nextStage,
        qualityGateOverride: true,
      },
    });

    // Derive prompt from conversation title or fallback
    const userPrompt = conversation.title || 'Resume software development pipeline';

    // Asynchronously resume orchestrator from nextStage
    runOrchestrator(
      conversationId,
      userPrompt,
      () => {},
      undefined,
      nextStage
    ).catch((err) => console.error('Error resuming orchestrator:', err));

    return NextResponse.json({ success: true, nextStage });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
