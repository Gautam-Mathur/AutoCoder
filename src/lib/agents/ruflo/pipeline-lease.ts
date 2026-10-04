import { randomUUID } from 'crypto';
import { prisma } from '../../db';

const LEASE_MS = 60_000;

export interface PipelineLease {
  conversationId: string;
  ownerId: string;
  acquired: boolean;
}

export async function acquirePipelineLease(
  conversationId: string
): Promise<PipelineLease> {
  const ownerId = randomUUID();
  const now = new Date();
  const expires = new Date(now.getTime() + LEASE_MS);

  const acquired = await prisma.$transaction(async (tx) => {
    const run = await tx.pipelineRun.findUnique({
      where: { conversationId },
    });

    if (!run) {
      await tx.pipelineRun.create({
        data: {
          conversationId,
          state: 'RUNNING',
          leaseOwner: ownerId,
          leaseExpiresAt: expires,
        },
      });

      return true;
    }

    const leaseExpired =
      !run.leaseExpiresAt || run.leaseExpiresAt.getTime() <= now.getTime();

    const available =
      run.leaseOwner === null ||
      leaseExpired ||
      run.state === 'QUEUED' ||
      run.state === 'PAUSED';

    if (!available) return false;

    await tx.pipelineRun.update({
      where: { conversationId },
      data: {
        state: 'RUNNING',
        leaseOwner: ownerId,
        leaseExpiresAt: expires,
        attempt: { increment: 1 },
      },
    });

    return true;
  });

  return {
    conversationId,
    ownerId,
    acquired,
  };
}

export async function renewPipelineLease(
  conversationId: string,
  ownerId: string
): Promise<boolean> {
  const now = new Date();
  const expires = new Date(now.getTime() + LEASE_MS);

  const updated = await prisma.pipelineRun.updateMany({
    where: {
      conversationId,
      leaseOwner: ownerId,
      state: 'RUNNING',
    },
    data: {
      leaseExpiresAt: expires,
    },
  });

  return updated.count === 1;
}

export async function releasePipelineLease(
  conversationId: string,
  ownerId: string,
  finalState?: string
): Promise<void> {
  await prisma.pipelineRun.updateMany({
    where: {
      conversationId,
      leaseOwner: ownerId,
    },
    data: {
      leaseOwner: null,
      leaseExpiresAt: null,
      ...(finalState ? { state: finalState } : {}),
    },
  });
}

export async function assertPipelineLease(
  conversationId: string,
  ownerId: string
): Promise<void> {
  const now = new Date();
  const run = await prisma.pipelineRun.findUnique({
    where: { conversationId },
  });

  if (!run) {
    throw new Error(`Pipeline lease assertion failed: no pipeline run found for conversation ${conversationId}`);
  }

  if (run.leaseOwner !== ownerId) {
    throw new Error(`Pipeline lease assertion failed: worker ${ownerId} is not lease owner (${run.leaseOwner})`);
  }

  if (run.leaseExpiresAt && run.leaseExpiresAt.getTime() <= now.getTime()) {
    throw new Error(`Pipeline lease assertion failed: lease for worker ${ownerId} expired at ${run.leaseExpiresAt.toISOString()}`);
  }
}

export function startLeaseHeartbeat(
  conversationId: string,
  ownerId: string,
  onLeaseLost?: () => void,
  intervalMs = 20_000
): () => void {
  const timer = setInterval(async () => {
    try {
      const renewed = await renewPipelineLease(conversationId, ownerId);
      if (!renewed) {
        clearInterval(timer);
        if (onLeaseLost) onLeaseLost();
      }
    } catch (e) {
      console.error(`Lease heartbeat renewal error for ${conversationId}:`, e);
    }
  }, intervalMs);

  return () => clearInterval(timer);
}
