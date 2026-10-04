import {
  classifyArchitectureFile,
  requiresModuleOwnership,
  ArchitectureFilePolicy,
} from './architecture-file-policy';

export interface ParsedArchitectureModule {
  name: string;
  responsibility: string;
  ownedFiles: string[];
  dependsOn: string[];
  supportsFeatures: string[];
  startLine: number;
  endLine: number;
}

export interface ParsedArchitecture {
  sections: {
    techStack: string;
    projectFolderStructure: string;
    modules: ParsedArchitectureModule[];
    conventions: string;
  };
  treeFiles: string[];
  filePolicies: ArchitectureFilePolicy[];
  ownership: Map<string, string[]>;
  moduleGraph: Map<string, { name: string; deps: string[] }>;
  parserErrors: string[];
}

const REQUIRED_SECTIONS = [
  'Tech Stack',
  'Project Folder Structure',
  'Modules',
  'Conventions',
];

const MODULE_HEADER_RE = /^\*\*\s*([^*\r\n]+?)\s*\*\*\s*$/;
const RESPONSIBILITY_RE = /^-\s*Responsibility:\s*(.*)$/i;
const OWNED_FILES_RE = /^-\s*Owned Files:\s*(.*)$/i;
const DEPENDS_ON_RE = /^-\s*Depends On:\s*(.*)$/i;
const SUPPORTS_FEATURES_RE = /^-\s*Supports Features:\s*(.*)$/i;

export function parseArchitecture(architectureContent: string): ParsedArchitecture {
  const parserErrors: string[] = [];

  const emptyResult = (): ParsedArchitecture => ({
    sections: { techStack: '', projectFolderStructure: '', modules: [], conventions: '' },
    treeFiles: [],
    filePolicies: [],
    ownership: new Map(),
    moduleGraph: new Map(),
    parserErrors,
  });

  if (!architectureContent || !architectureContent.trim()) {
    parserErrors.push('Architecture Contract Error: architecture.md is empty.');
    return emptyResult();
  }

  // 1. Singleton section validation
  const sectionCounts = new Map<string, number>();
  for (const s of REQUIRED_SECTIONS) {
    sectionCounts.set(s, 0);
  }

  const lines = architectureContent.replace(/\r\n/g, '\n').split('\n');
  const sectionIndices: { name: string; lineIndex: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('###')) {
      for (const sectionName of REQUIRED_SECTIONS) {
        const regex = new RegExp(`^###\\s*${sectionName.replace(/\s+/g, '\\s+')}\\s*$`, 'i');
        if (regex.test(line)) {
          const currentCount = sectionCounts.get(sectionName) || 0;
          sectionCounts.set(sectionName, currentCount + 1);
          if (currentCount >= 1) {
            parserErrors.push(`Architecture Parser Error: Duplicate "### ${sectionName}" section.`);
          } else {
            sectionIndices.push({ name: sectionName, lineIndex: i });
          }
        }
      }
    }
  }

  for (const [sectionName, count] of sectionCounts.entries()) {
    if (count === 0) {
      parserErrors.push(`Architecture Contract Error: Missing required "### ${sectionName}" section.`);
    }
  }

  if (parserErrors.length > 0) {
    return emptyResult();
  }

  // Verify section order
  for (let i = 0; i < sectionIndices.length - 1; i++) {
    const expectedIdx = REQUIRED_SECTIONS.indexOf(sectionIndices[i].name);
    const nextExpectedIdx = REQUIRED_SECTIONS.indexOf(sectionIndices[i + 1].name);
    if (nextExpectedIdx < expectedIdx) {
      parserErrors.push(
        `Architecture Contract Error: Sections out of order ("${sectionIndices[i].name}" appeared before "${sectionIndices[i + 1].name}").`
      );
    }
  }

  // Extract raw section text
  const extractSectionText = (name: string): string => {
    const idx = sectionIndices.find((s) => s.name === name);
    if (!idx) return '';
    const startLine = idx.lineIndex + 1;
    const nextSec = sectionIndices.find((s) => s.lineIndex > idx.lineIndex);
    const endLine = nextSec ? nextSec.lineIndex : lines.length;
    return lines.slice(startLine, endLine).join('\n').trim();
  };

  const techStackText = extractSectionText('Tech Stack');
  const treeText = extractSectionText('Project Folder Structure');
  const modulesText = extractSectionText('Modules');
  const conventionsText = extractSectionText('Conventions');

  // 2. Parse Project Folder Structure Tree
  const treeLines = treeText
    .split('\n')
    .filter((l) => {
      const t = l.trim();
      return t && !t.startsWith('###') && !t.startsWith('Format:') && !t.startsWith('Rules') && !t.startsWith('-');
    });

  const treeFiles: string[] = [];
  const pathStack: { depth: number; path: string }[] = [];

  for (const line of treeLines) {
    const cleanName = line
      .replace(/^[\s│\|├└─\+\-\\]+/, '')
      .replace(/[*`'"]/g, '')
      .trim();

    if (!cleanName || cleanName.toLowerCase() === 'project-root/' || cleanName === '.') continue;

    const nameStartCol = line.indexOf(cleanName);
    const isDir = cleanName.endsWith('/');
    const nameWithoutSlash = cleanName.replace(/\/$/, '');

    while (pathStack.length > 0 && pathStack[pathStack.length - 1].depth >= nameStartCol) {
      pathStack.pop();
    }

    const parentPath = pathStack.length > 0 ? pathStack[pathStack.length - 1].path : '';
    const fullPath = parentPath ? `${parentPath}/${nameWithoutSlash}` : nameWithoutSlash;

    if (isDir) {
      pathStack.push({ depth: nameStartCol, path: fullPath });
    } else {
      treeFiles.push(fullPath);
    }
  }

  if (treeFiles.length === 0) {
    parserErrors.push('Architecture Contract Error: Project Folder Structure contains no files.');
  }

  // 3. Parse Modules
  const modulesHeadingIdx = sectionIndices.find((s) => s.name === 'Modules')?.lineIndex ?? -1;
  const conventionsHeadingIdx = sectionIndices.find((s) => s.name === 'Conventions')?.lineIndex ?? lines.length;

  const parsedModules: ParsedArchitectureModule[] = [];
  let current: ParsedArchitectureModule | null = null;
  let currentStartLine = -1;

  const finishCurrent = (endLine: number) => {
    if (!current) return;
    current.endLine = endLine;

    if (!current.responsibility.trim()) {
      parserErrors.push(`Architecture Parser Error: Module "${current.name}" is missing "- Responsibility:".`);
    }

    if (current.ownedFiles.length === 0) {
      parserErrors.push(`Architecture Parser Error: Module "${current.name}" has no "- Owned Files:" entries.`);
    }

    parsedModules.push(current);
    current = null;
    currentStartLine = -1;
  };

  for (let index = modulesHeadingIdx + 1; index < conventionsHeadingIdx; index++) {
    const rawLine = lines[index];
    const line = rawLine.trim();
    if (!line) continue;

    const moduleMatch = line.match(MODULE_HEADER_RE);
    if (moduleMatch) {
      finishCurrent(index);
      const name = moduleMatch[1].trim();

      if (!name || name.includes(':')) {
        parserErrors.push(`Architecture Parser Error: Invalid module name "${name}".`);
        continue;
      }

      currentStartLine = index + 1;
      current = {
        name,
        responsibility: '',
        ownedFiles: [],
        dependsOn: [],
        supportsFeatures: [],
        startLine: currentStartLine,
        endLine: currentStartLine,
      };
      continue;
    }

    if (!current) {
      parserErrors.push(`Architecture Parser Error: Unexpected content in "### Modules" at line ${index + 1}: "${line}"`);
      continue;
    }

    const respMatch = line.match(RESPONSIBILITY_RE);
    if (respMatch) {
      current.responsibility = respMatch[1].trim();
      continue;
    }

    const ownedMatch = line.match(OWNED_FILES_RE);
    if (ownedMatch) {
      const rawFiles = ownedMatch[1].trim();
      if (rawFiles && rawFiles.toLowerCase() !== 'none') {
        current.ownedFiles = rawFiles
          .split(/[,;]/)
          .map((f) => f.trim().replace(/[*`'"]/g, '').replace(/^\.\/+/, '').replace(/^\/+/, ''))
          .filter(Boolean);
      }
      continue;
    }

    const depMatch = line.match(DEPENDS_ON_RE);
    if (depMatch) {
      const rawDeps = depMatch[1].trim();
      if (rawDeps && rawDeps.toLowerCase() !== 'none') {
        current.dependsOn = rawDeps
          .split(/[,;]/)
          .map((d) => d.trim().replace(/[*`'"]/g, ''))
          .filter(Boolean);
      }
      continue;
    }

    const featMatch = line.match(SUPPORTS_FEATURES_RE);
    if (featMatch) {
      const rawFeats = featMatch[1].trim();
      if (rawFeats && rawFeats.toLowerCase() !== 'none') {
        current.supportsFeatures = rawFeats
          .split(/[,;]/)
          .map((f) => f.trim().replace(/[*`'"]/g, ''))
          .filter(Boolean);
      }
      continue;
    }

    // Check for unknown field lines
    if (line.startsWith('-')) {
      const fieldName = line.replace(/^-/, '').split(':')[0].trim();
      parserErrors.push(`Architecture Parser Error: Unknown module field "${fieldName}".`);
    }
  }

  finishCurrent(conventionsHeadingIdx);

  // Check duplicate module names
  const seenModules = new Set<string>();
  for (const m of parsedModules) {
    const key = m.name.toLowerCase();
    if (seenModules.has(key)) {
      parserErrors.push(`Architecture Parser Error: Duplicate module declaration "${m.name}".`);
    }
    seenModules.add(key);
  }

  // Build ownership map and module graph
  const ownership = new Map<string, string[]>();
  const moduleGraph = new Map<string, { name: string; deps: string[] }>();

  for (const m of parsedModules) {
    moduleGraph.set(m.name.toLowerCase(), { name: m.name, deps: m.dependsOn });

    for (const rawFile of m.ownedFiles) {
      const cleanF = rawFile.replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase();
      if (!cleanF) continue;
      const owners = ownership.get(cleanF) || [];
      owners.push(m.name);
      ownership.set(cleanF, owners);
    }
  }

  // Classify file policies for tree files
  const filePolicies: ArchitectureFilePolicy[] = treeFiles.map((tf) => ({
    path: tf,
    class: classifyArchitectureFile(tf),
    requiresModuleOwnership: requiresModuleOwnership(tf),
  }));

  return {
    sections: {
      techStack: techStackText,
      projectFolderStructure: treeText,
      modules: parsedModules,
      conventions: conventionsText,
    },
    treeFiles,
    filePolicies,
    ownership,
    moduleGraph,
    parserErrors,
  };
}
