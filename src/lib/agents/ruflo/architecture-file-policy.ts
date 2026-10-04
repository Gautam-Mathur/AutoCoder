export type ArchitectureFileClass =
  | 'implementation'
  | 'framework'
  | 'static-asset'
  | 'config'
  | 'schema'
  | 'documentation';

export interface ArchitectureFilePolicy {
  path: string;
  class: ArchitectureFileClass;
  requiresModuleOwnership: boolean;
}

const EXEMPT_CONFIG_FILES = new Set([
  'package.json',
  'tsconfig.json',
  'vite.config.ts',
  'vite.config.js',
  'next.config.js',
  'next.config.mjs',
  'next.config.ts',
  'tailwind.config.js',
  'postcss.config.js',
  '.gitignore',
  '.env',
  '.env.local',
  '.env.example',
]);

const EXEMPT_SCHEMA_FILES = new Set([
  'prisma/schema.prisma',
  'schema.prisma',
]);

const EXEMPT_DOC_FILES = new Set([
  'readme.md',
  'license',
]);

export function classifyArchitectureFile(filePath: string): ArchitectureFileClass {
  const clean = filePath.replace(/\\/g, '/').replace(/^\.\//, '').trim();
  const lower = clean.toLowerCase();
  const fileName = lower.split('/').pop() || '';

  if (EXEMPT_CONFIG_FILES.has(lower) || EXEMPT_CONFIG_FILES.has(fileName)) {
    return 'config';
  }

  if (EXEMPT_SCHEMA_FILES.has(lower) || EXEMPT_SCHEMA_FILES.has(fileName)) {
    return 'schema';
  }

  if (EXEMPT_DOC_FILES.has(lower) || EXEMPT_DOC_FILES.has(fileName)) {
    return 'documentation';
  }

  if (
    /^public\//.test(clean) ||
    /\.(ico|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot)$/i.test(clean)
  ) {
    return 'static-asset';
  }

  if (
    /(^|\/)(page|layout|route|loading|error|not-found)\.(tsx|ts|js|jsx)$/i.test(clean)
  ) {
    return 'framework';
  }

  return 'implementation';
}

export function requiresModuleOwnership(filePath: string): boolean {
  const fileClass = classifyArchitectureFile(filePath);
  switch (fileClass) {
    case 'implementation':
    case 'framework':
    case 'static-asset':
      return true;
    case 'config':
    case 'schema':
    case 'documentation':
      return false;
  }
}

export function isCoderGeneratedFile(filePath: string): boolean {
  const fileClass = classifyArchitectureFile(filePath);
  return (
    fileClass === 'implementation' ||
    fileClass === 'framework' ||
    fileClass === 'static-asset' ||
    fileClass === 'config' ||
    fileClass === 'schema'
  );
}
