export interface PrismaValidationError {
  file: string;
  line: number;
  model: string;
  message: string;
}

export interface PrismaValidationResult {
  valid: boolean;
  parsedModels: string[];
  errors: PrismaValidationError[];
  warnings: PrismaValidationError[];
}

export interface PrismaSchemaModel {
  name: string;
  fields: Map<string, string>;
}

/**
 * Parses a Prisma schema definition into structured model metadata.
 */
export function parsePrismaSchema(schemaContent: string): Map<string, PrismaSchemaModel> {
  const models = new Map<string, PrismaSchemaModel>();
  if (!schemaContent) return models;

  const modelBlocks = schemaContent.split(/model\s+([A-Za-z0-9_]+)\s*\{/gi);
  for (let i = 1; i < modelBlocks.length; i += 2) {
    const modelName = modelBlocks[i].trim();
    const body = modelBlocks[i + 1] ? modelBlocks[i + 1].split('}')[0] : '';
    const fields = new Map<string, string>();

    const lines = body.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue;
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2) {
        fields.set(parts[0], parts[1]);
      }
    }

    models.set(modelName.toLowerCase(), { name: modelName, fields });
  }

  return models;
}

/**
 * Validates generated code's Prisma model & field accesses against prisma/schema.prisma.
 */
export function validatePrismaUsage(
  vfsFiles: Record<string, string>,
  schemaContent: string
): PrismaValidationResult {
  const schemaModels = parsePrismaSchema(schemaContent);
  const parsedModelNames = Array.from(schemaModels.values()).map(m => m.name);
  const errors: PrismaValidationError[] = [];
  const warnings: PrismaValidationError[] = [];

  if (schemaModels.size === 0) {
    // Check if any file calls prisma.*
    for (const [filename, content] of Object.entries(vfsFiles)) {
      if (!/\.(js|jsx|ts|tsx)$/.test(filename) || !content) continue;
      if (/prisma\.[A-Za-z0-9_]+\.(find|create|update|delete|upsert)/i.test(content)) {
        errors.push({
          file: filename,
          line: 1,
          model: 'unknown',
          message: 'Code contains Prisma database queries, but prisma/schema.prisma is missing or contains no model definitions.',
        });
      }
    }

    return {
      valid: errors.length === 0,
      parsedModels: [],
      errors,
      warnings,
    };
  }

  // Scan all JS/TS files for prisma.<model>.<action> calls
  for (const [filename, content] of Object.entries(vfsFiles)) {
    if (!/\.(js|jsx|ts|tsx)$/.test(filename) || !content) continue;

    const lines = content.split('\n');
    for (let lIdx = 0; lIdx < lines.length; lIdx++) {
      const line = lines[lIdx];
      const prismaMatch = line.matchAll(/prisma\.([A-Za-z0-9_]+)\.(findMany|findUnique|findFirst|create|update|delete|upsert|count|aggregate|groupBy)/g);

      for (const pm of prismaMatch) {
        const calledModel = pm[1];
        const normCalled = calledModel.toLowerCase();

        if (!schemaModels.has(normCalled)) {
          errors.push({
            file: filename,
            line: lIdx + 1,
            model: calledModel,
            message: `Prisma query references model "${calledModel}" which is not defined in prisma/schema.prisma. Available models: ${parsedModelNames.join(', ')}`,
          });
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    parsedModels: parsedModelNames,
    errors,
    warnings,
  };
}
