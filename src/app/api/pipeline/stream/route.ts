import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { runOrchestrator, activePipelines, pipelineEvents, startPipelineIfUnowned } from '@/lib/agents/ruflo/orchestrator';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('conversationId');
  const userPrompt = searchParams.get('prompt') || '';

  if (!conversationId) {
    return new Response('conversationId is required', { status: 400 });
  }

  const lastEventIdHeader = request.headers.get('Last-Event-ID') || searchParams.get('lastEventId');
  const lastSeq = lastEventIdHeader ? parseInt(lastEventIdHeader, 10) : 0;

  const encoder = new TextEncoder();

  // Create SSE stream
  const responseStream = new ReadableStream({
    async start(controller) {
      let seqCounter = isNaN(lastSeq) ? 0 : lastSeq;

      const sendEvent = (event: any, customId?: number) => {
        try {
          const eventId = customId !== undefined ? customId : ++seqCounter;
          const eventType = event.type || 'message';
          controller.enqueue(
            encoder.encode(`id: ${eventId}\nevent: ${eventType}\ndata: ${JSON.stringify(event)}\n\n`)
          );
        } catch (e) {
          // Stream closed
        }
      };

      // 1. Replay past pipeline events from SQLite filtering by sequence > lastSeq
      try {
        const events = await prisma.pipelineEvent.findMany({
          where: {
            conversationId,
            ...(lastSeq > 0 ? { sequence: { gt: lastSeq } } : {}),
          },
          orderBy: { sequence: 'asc' },
          take: 500,
        });

        if (events.length > 0) {
          for (const ev of events) {
            let parsedPayload: any = {};
            try {
              parsedPayload = JSON.parse(ev.payload);
            } catch (err) {
              parsedPayload = { message: ev.payload };
            }
            sendEvent(
              {
                type: ev.eventType,
                stage: ev.stageName,
                data: parsedPayload,
                timestamp: ev.createdAt,
              },
              ev.sequence
            );
          }
        } else {
          // Fallback to history logs replay if no pipeline events exist yet
          const historyLogs = await prisma.executionHistory.findMany({
            where: {
              conversationId,
              ...(lastSeq > 0 ? { sequence: { gt: lastSeq } } : {}),
            },
            orderBy: { sequence: 'asc' },
            take: 500,
            select: { sequence: true, stage: true, status: true, logs: true, createdAt: true },
          });

          for (const logItem of historyLogs) {
            if (logItem.status === 'Streaming') continue;
            sendEvent(
              {
                type: 'HISTORY_REPLAY',
                agent: logItem.stage,
                status: logItem.status,
                message: logItem.logs,
                timestamp: logItem.createdAt,
              },
              logItem.sequence
            );
          }
        }
      } catch (e) {
        // Ignore DB read errors during replay
      }

      // 2. Subscribe to live events emitted by background orchestrator
      const eventChannel = `event:${conversationId}`;
      const liveEventListener = (evt: any) => {
        sendEvent(evt);
      };
      pipelineEvents.on(eventChannel, liveEventListener);

      // High-frequency 5-second Keep-Alive PING interval to prevent proxy socket drops
      const pingInterval = setInterval(() => {
        sendEvent({ type: 'PING', message: 'keep-alive' });
      }, 5000);

      // 3. Clean up subscription when browser SSE connection aborts/reloads
      const abortHandler = () => {
        clearInterval(pingInterval);
        pipelineEvents.off(eventChannel, liveEventListener);
      };
      request.signal.addEventListener('abort', abortHandler);

      // 4. Atomic Pipeline ownership check & launch
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (
        conversation &&
        conversation.status !== 'Completed' &&
        conversation.status !== 'Failed' &&
        conversation.status !== 'Cancelled'
      ) {
        if (userPrompt && (!conversation.originalPrompt || userPrompt.length > conversation.originalPrompt.length)) {
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { originalPrompt: userPrompt },
          });
        }

        if (conversation.status !== 'Active') {
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { status: 'Active' },
          });
        }

        const promptToUse = userPrompt || conversation.originalPrompt || conversation.title || 'Software development request';

        const launchResult = await startPipelineIfUnowned(
          conversationId,
          promptToUse,
          (evt: any) => sendEvent(evt),
          conversation.currentStage !== 'Queen' ? conversation.currentStage : undefined
        );

        if (!launchResult.started) {
          sendEvent({
            type: 'AGENT_LOG',
            message: 'Connected to active background pipeline execution.',
          });
        }
      }
    },
  });

  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
