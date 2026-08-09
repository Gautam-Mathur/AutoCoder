import { prisma } from '../../db';
import { CorrelationService } from './correlationService';

export interface AuthoritativeInference {
  correlationCode: string;
  conversationId: string;
  agentCode: string;
  sequence: number;
  stage: string;
  stageOutputId: string;
  schemaVersion: string;
  status: string;
}

export class CorrelationResolver {
  static async getAuthoritativeCorrelation(conversationId: string, stageOrAgentName: string): Promise<AuthoritativeInference | null> {
    const agentCode = CorrelationService.getAgentCode(stageOrAgentName);

    const record = await prisma.correlation.findFirst({
      where: {
        conversationId,
        agentCode,
        status: 'ACTIVE',
      },
    });

    if (!record) return null;
    return record;
  }

  static async resolveInferenceByCode(correlationCode: string): Promise<AuthoritativeInference | null> {
    const record = await prisma.correlation.findUnique({
      where: { correlationCode },
    });

    if (!record) return null;
    return record;
  }
}
