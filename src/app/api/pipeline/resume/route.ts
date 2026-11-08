import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { runOrchestrator } from '@/lib/agents/ruflo/orchestrator';
import { verifyConversationOwnership } from '@/lib/auth';

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
    const body = await request.json();
    const {
      conversationId,
      stage,
      conflictDescription,
      resolvedConflictOption,
      action,
      reason,
    } = body;

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }

    const auth = await verifyConversationOwnership(request, conversationId);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        history: { orderBy: { createdAt: 'desc' } },
        pipelineRun: true,
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const activeRunId = conversation.pipelineRun?.id;

    const isApproveQualityGate = action === 'approve_quality_gate';
    if (isApproveQualityGate) {
      if (
        conversation.status !== 'PausedQualityGate' &&
        conversation.status !== 'Paused' &&
        conversation.currentStage !== 'QualityGate' &&
        conversation.currentStage !== 'Architect'
      ) {
        return NextResponse.json(
          { error: 'Quality gate override is only allowed when conversation is paused at a quality gate.' },
          { status: 400 }
        );
      }

      if (activeRunId) {
        await prisma.gateDecision.create({
          data: {
            conversationId,
            pipelineRunId: activeRunId,
            stageName: conversation.currentStage,
            gateName: 'QUALITY_GATE_OVERRIDE',
            decision: 'APPROVED',
            actor: auth.session.user.id,
            reason: reason || 'User explicitly approved quality gate override',
          },
        });
      }
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

    // Determine stage to resume from (explicit stage from body or next stage based on StageExecution acceptance)
    let nextStage = stage;
    if (!nextStage) {
      if (activeRunId) {
        const acceptedStages = await prisma.stageExecution.findMany({
          where: {
            pipelineRunId: activeRunId,
            state: 'ACCEPTED',
          },
          select: { stageName: true },
        });
        const acceptedSet = new Set(acceptedStages.map((s) => s.stageName));

        // If approving quality gate after Architect, advance to next stage (System)
        if (isApproveQualityGate && acceptedSet.has('Architect')) {
          const archIdx = STAGES.indexOf('Architect');
          nextStage = STAGES[archIdx + 1] || 'System';
        } else {
          // Find the first stage in canonical order that is not yet ACCEPTED
          const firstUnaccepted = STAGES.find((s) => !acceptedSet.has(s));
          nextStage = firstUnaccepted || STAGES[STAGES.length - 1];
        }
      } else {
        const currentIdx = STAGES.indexOf(conversation.currentStage);
        if (currentIdx >= 0 && currentIdx < STAGES.length - 1) {
          const isStageAccepted = conversation.history.some(
            (h) => h.stage === conversation.currentStage && h.status === 'Completed'
          );
          if (isStageAccepted || conversation.currentStage === 'Architect' || conversation.currentStage === 'Queen') {
            nextStage = STAGES[currentIdx + 1];
          } else {
            nextStage = conversation.currentStage;
          }
        } else {
          nextStage = conversation.currentStage || 'Queen';
        }
      }
    }

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: 'Active',
        currentStage: nextStage,
        ...(isApproveQualityGate ? { qualityGateOverride: true } : {}),
      },
    });

    if (activeRunId) {
      await prisma.pipelineRun.update({
        where: { id: activeRunId },
        data: {
          state: 'RUNNING',
          currentStage: nextStage,
          leaseOwner: null,
          leaseExpiresAt: null,
        },
      });
    }

    // Derive prompt from stored original prompt, title or fallback
    const userPrompt = conversation.originalPrompt || conversation.title || 'Resume software development pipeline';

    // Asynchronously resume orchestrator from nextStage
    runOrchestrator(
      conversationId,
      userPrompt,
      () => {},
      undefined,
      nextStage
    ).catch((err) => console.error('Error resuming orchestrator:', err));

    return NextResponse.json({
      success: true,
      nextStage,
      qualityGateOverride: isApproveQualityGate ? true : conversation.qualityGateOverride,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
