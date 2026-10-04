import { prisma } from '../../db';

export async function appendPipelineEvent(params: {
  conversationId: string;
  pipelineRunId: string;
  eventType: string;
  stageName?: string;
  payload: unknown;
}) {
  let attempts = 0;
  while (attempts < 5) {
    try {
      return await prisma.$transaction(async (tx) => {
        const latest = await tx.pipelineEvent.findFirst({
          where: {
            pipelineRunId: params.pipelineRunId,
          },
          orderBy: {
            sequence: 'desc',
          },
          select: {
            sequence: true,
          },
        });

        const sequence = (latest?.sequence ?? 0) + 1;

        return tx.pipelineEvent.create({
          data: {
            conversationId: params.conversationId,
            pipelineRunId: params.pipelineRunId,
            sequence,
            eventType: params.eventType,
            stageName: params.stageName,
            payload: JSON.stringify(params.payload),
          },
        });
      });
    } catch (err: any) {
      attempts++;
      if (attempts >= 5) throw err;
      await new Promise((r) => setTimeout(r, 10 * attempts));
    }
  }
}
