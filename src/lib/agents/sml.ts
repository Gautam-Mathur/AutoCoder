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

  return await prisma.$transaction(async (tx) => {
    // 1. Save main output
    const output = await tx.agentOutput.create({
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
      for (const key of Object.keys(validatedJson)) {
        const path = `${agentName}.${key}`;
        const value = JSON.stringify(validatedJson[key]);
        await tx.agentIndex.create({
          data: {
            conversationId,
            outputId: output.id,
            path,
            value,
          },
        });
      }
    }

    return output;
  });
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
