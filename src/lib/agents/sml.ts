import { prisma } from '../db';

export interface WriteAgentOutputParams {
  conversationId: string;
  agentName: string;
  stage: string;
  schemaVersion: string;
  model: string;
  validatedJson: Record<string, any>;
  executionTime: number;
  tokenUsage: number;
  attempt: number;
}

export async function writeAgentOutput(params: WriteAgentOutputParams) {
  const {
    conversationId,
    agentName,
    stage,
    schemaVersion,
    model,
    validatedJson,
    executionTime,
    tokenUsage,
    attempt,
  } = params;

  const jsonStr = JSON.stringify(validatedJson);

  // 1. Save main output
  const output = await prisma.agentOutput.create({
    data: {
      conversationId,
      agentName,
      stage,
      schemaVersion,
      model,
      validatedJson: jsonStr,
      executionTime,
      tokenUsage,
      attempt,
    },
  });

  // 2. Generate indexes for top-level keys
  if (validatedJson && typeof validatedJson === 'object') {
    const indexPromises = Object.keys(validatedJson).map((key) => {
      const path = `${agentName}.${key}`;
      const value = JSON.stringify(validatedJson[key]);
      return prisma.agentIndex.create({
        data: {
          conversationId,
          outputId: output.id,
          path,
          value,
        },
      });
    });
    await Promise.all(indexPromises);
  }

  return output;
}

export async function queryAgentOutput(
  conversationId: string,
  agentName: string,
  path: string
): Promise<any | null> {
  const indexPath = `${agentName}.${path}`;
  const index = await prisma.agentIndex.findFirst({
    where: {
      conversationId,
      path: indexPath,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!index) return null;
  try {
    return JSON.parse(index.value);
  } catch {
    return index.value;
  }
}

export async function getVocabulary(conversationId: string): Promise<string[]> {
  return [];
}
