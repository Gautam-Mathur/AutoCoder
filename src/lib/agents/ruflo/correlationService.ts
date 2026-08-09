import { prisma } from '../../db';

export const AGENT_CODE_MAP: Record<string, string> = Object.freeze({
  Queen: 'Q',
  Planner: 'P',
  Architect: 'A',
  System: 'BA',
  Designer: 'UI',
  Blueprinter: 'B',
  Tester: 'T',
  Debugger: 'D',
  Reviewer: 'R',
  Security: 'S',
});

export const DOWNSTREAM_STAGES_MAP: Record<string, string[]> = Object.freeze({
  Q: ['P', 'A', 'BA', 'UI', 'B', 'T', 'D', 'S', 'R'],
  P: ['A', 'BA', 'UI', 'B', 'T', 'D', 'S', 'R'],
  A: ['BA', 'UI', 'B', 'T', 'D', 'S', 'R'],
  BA: ['UI', 'B', 'T', 'D', 'S', 'R'],
  UI: ['B', 'T', 'D', 'S', 'R'],
  B: ['T', 'D', 'S', 'R'],
  T: ['D', 'S', 'R'],
  D: ['S', 'R'],
  S: ['R'],
  R: [],
});

export interface CorrelationResult {
  correlationCode: string;
  sequence: number;
  status: 'ACTIVE' | 'SUPERSEDED' | 'INVALIDATED' | 'FAILED';
}

export class CorrelationService {
  static getAgentCode(stageOrAgentName: string): string {
    const code = AGENT_CODE_MAP[stageOrAgentName];
    if (!code) {
      throw new Error(`Unknown stage/agent name for correlation code mapping: ${stageOrAgentName}`);
    }
    return code;
  }

  static getDownstreamAgentCodes(stageOrAgentName: string): string[] {
    const code = this.getAgentCode(stageOrAgentName);
    return DOWNSTREAM_STAGES_MAP[code] || [];
  }

  static async createAuthoritativeCorrelation(params: {
    conversationId: string;
    stage: string;
    stageOutputId: string;
    schemaVersion?: string;
  }): Promise<CorrelationResult> {
    const { conversationId, stage, stageOutputId, schemaVersion = '1.0' } = params;
    const agentCode = CorrelationService.getAgentCode(stage);
    const shortConvo = conversationId.replace(/[^a-zA-Z0-9]/g, '').slice(-8);

    // Atomic transaction: Compute sequence, update previous ACTIVE to SUPERSEDED, invalidate downstream, insert new ACTIVE
    return await prisma.$transaction(async (tx) => {
      // 1. Get current max sequence for (conversationId, agentCode)
      const existing = await tx.correlation.findMany({
        where: { conversationId, agentCode },
        orderBy: { sequence: 'desc' },
        take: 1,
      });

      const sequence = existing.length > 0 ? existing[0].sequence + 1 : 1;
      const paddedSeq = String(sequence).padStart(4, '0');
      const correlationCode = `${agentCode}-${shortConvo}-i${paddedSeq}`;

      // 2. Mark previous ACTIVE inferences for this stage as SUPERSEDED
      await tx.correlation.updateMany({
        where: { conversationId, agentCode, status: 'ACTIVE' },
        data: { status: 'SUPERSEDED' },
      });

      // 3. Mark all downstream stages as INVALIDATED (due to upstream change)
      const downstreamCodes = DOWNSTREAM_STAGES_MAP[agentCode] || [];
      if (downstreamCodes.length > 0) {
        await tx.correlation.updateMany({
          where: {
            conversationId,
            agentCode: { in: downstreamCodes },
            status: 'ACTIVE',
          },
          data: { status: 'INVALIDATED' },
        });
      }

      // 4. Create new ACTIVE correlation record
      await tx.correlation.create({
        data: {
          correlationCode,
          conversationId,
          agentCode,
          sequence,
          stage,
          stageOutputId,
          schemaVersion,
          status: 'ACTIVE',
        },
      });

      return {
        correlationCode,
        sequence,
        status: 'ACTIVE',
      };
    });
  }

  static async markFailedInference(params: {
    conversationId: string;
    stage: string;
    stageOutputId: string;
  }): Promise<CorrelationResult> {
    const { conversationId, stage, stageOutputId } = params;
    const agentCode = CorrelationService.getAgentCode(stage);
    const shortConvo = conversationId.replace(/[^a-zA-Z0-9]/g, '').slice(-8);

    return await prisma.$transaction(async (tx) => {
      const existing = await tx.correlation.findMany({
        where: { conversationId, agentCode },
        orderBy: { sequence: 'desc' },
        take: 1,
      });

      const sequence = existing.length > 0 ? existing[0].sequence + 1 : 1;
      const paddedSeq = String(sequence).padStart(4, '0');
      const correlationCode = `${agentCode}-${shortConvo}-i${paddedSeq}`;

      await tx.correlation.create({
        data: {
          correlationCode,
          conversationId,
          agentCode,
          sequence,
          stage,
          stageOutputId,
          schemaVersion: '1.0',
          status: 'FAILED',
        },
      });

      return {
        correlationCode,
        sequence,
        status: 'FAILED',
      };
    });
  }
}
