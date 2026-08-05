import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { runOrchestrator } from '@/lib/agents/ruflo/orchestrator';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('conversationId');
  const userPrompt = searchParams.get('prompt') || '';

  if (!conversationId) {
    return new Response('conversationId is required', { status: 400 });
  }

  const encoder = new TextEncoder();

  // Create stream
  const responseStream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch (e) {
          // Stream might already be closed
        }
      };

      const pingInterval = setInterval(() => {
        sendEvent({ type: 'PING', message: 'keep-alive' });
      }, 15000);

      const abortHandler = () => {
        clearInterval(pingInterval);
      };
      request.signal.addEventListener('abort', abortHandler);

      try {
        await runOrchestrator(conversationId, userPrompt, (event) => {
          sendEvent(event);
        }, request.signal);
      } catch (err: any) {
        sendEvent({
          type: 'PIPELINE_ERROR',
          message: err.message,
        });
      } finally {
        clearInterval(pingInterval);
        request.signal.removeEventListener('abort', abortHandler);
        try {
          controller.close();
        } catch (e) {
          // Stream might already be closed
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
