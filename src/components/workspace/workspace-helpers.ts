export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

export interface CoderFileProgress {
  currentFile?: string;
  fileIndex?: number;
  totalFiles?: number;
  allFiles?: string[];
  completedFiles?: string[];
}

export function extractLiveStreamingCode(raw: string): string {
  if (!raw) return '';

  const paramMatches = [...raw.matchAll(/<parameter(?:=|\s+name=)["']?(?:content|new_content|code|file_content)["']?>\r?\n?([\s\S]*)/gi)];
  if (paramMatches.length > 0) {
    let content = paramMatches[paramMatches.length - 1][1];
    content = content.replace(/<\/parameter>[\s\S]*$/i, '');
    return content;
  }

  const jsonContentMatches = [...raw.matchAll(/"(?:content|new_content|code|file_content)"\s*:\s*"([\s\S]*)/gi)];
  if (jsonContentMatches.length > 0) {
    let jsonStr = jsonContentMatches[jsonContentMatches.length - 1][1];
    jsonStr = jsonStr.replace(/"\s*,?\s*"[^"]+"\s*:[\s\S]*$/i, '');
    jsonStr = jsonStr.replace(/"\s*\}[\s\S]*$/i, '');
    jsonStr = jsonStr.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"');
    return jsonStr;
  }

  const fenceMatches = [...raw.matchAll(/```[a-zA-Z0-9_\-+.]*\r?\n([\s\S]*)/gi)];
  if (fenceMatches.length > 0) {
    let content = fenceMatches[fenceMatches.length - 1][1];
    content = content.replace(/\r?\n```[\s\S]*$/, '');
    return content;
  }

  if (/^\s*<(?:function|tool_call)/i.test(raw)) {
    return '';
  }

  return raw;
}

export const buildFileTree = (fileList: string[]): FileNode => {
  const root: FileNode = { name: 'Root', path: '', isDirectory: true, children: [] };

  fileList.forEach((file) => {
    const parts = file.split('/');
    let current = root;

    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      const partPath = parts.slice(0, index + 1).join('/');

      let child = current.children?.find((c) => c.name === part);
      if (!child) {
        child = {
          name: part,
          path: partPath,
          isDirectory: !isLast,
          children: isLast ? undefined : [],
        };
        current.children?.push(child);
      }
      current = child;
    });
  });

  const sortTree = (node: FileNode) => {
    if (node.children) {
      node.children.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(sortTree);
    }
  };

  sortTree(root);
  return root;
};

export function parseModulesFromMarkdown(markdown: string): any[] {
  if (!markdown) return [];
  const modules: any[] = [];
  const modulesSection = markdown.split(/### Modules/i)[1]?.split(/###/)[0] || '';
  const blocks = modulesSection.split(/(?=\*\*([^*]+)\*\*)/g);

  let current: any = null;
  blocks.forEach((block) => {
    const nameMatch = block.match(/^\*\*([^*]+)\*\*/);
    if (nameMatch) {
      if (current) modules.push(current);
      current = {
        name: nameMatch[1].trim(),
        responsibility: '',
        ownedFiles: [],
        dependsOn: 'None',
        supportsFeatures: '',
      };

      const respMatch = block.match(/-\s*Responsibility:\s*(.+)/i);
      if (respMatch) current.responsibility = respMatch[1].trim();

      const filesMatch = block.match(/-\s*Owned Files:\s*(.+)/i);
      if (filesMatch) {
        current.ownedFiles = filesMatch[1]
          .split(/[,;\s]+/)
          .map((f) => f.replace(/[`'"]/g, '').trim())
          .filter(Boolean);
      }

      const depMatch = block.match(/-\s*Depends On:\s*(.+)/i);
      if (depMatch) current.dependsOn = depMatch[1].trim();

      const featMatch = block.match(/-\s*Supports Features:\s*(.+)/i);
      if (featMatch) current.supportsFeatures = featMatch[1].trim();
    }
  });
  if (current) modules.push(current);
  return modules;
}

export const STAGE_OUTPUT_FILES: Record<string, string> = {
  Queen: 'plan.md',
  Planner: 'requirements.md',
  Architect: 'architecture.md',
  System: 'backend_spec.md',
  Designer: 'ui_spec.md',
  Blueprinter: 'blueprint.md',
  Coder: 'index.html',
  Tester: 'test_report.md',
  Debugger: 'debug_report.md',
  Security: 'security_report.md',
  Reviewer: 'review_report.md',
};

export const STAGE_FILE_TO_AGENT: Record<string, string> = Object.fromEntries(
  Object.entries(STAGE_OUTPUT_FILES).map(([agent, file]) => [file, agent])
);

export const STAGE_INFLOW_FILES: Record<string, string[]> = {
  Queen: [],
  Planner: ['plan.md'],
  Architect: ['requirements.md', 'plan.md'],
  System: ['architecture.md', 'requirements.md'],
  Designer: ['architecture.md', 'requirements.md'],
  Blueprinter: ['architecture.md', 'backend_spec.md', 'ui_spec.md'],
  Coder: ['blueprint.md', 'architecture.md'],
  Tester: ['index.html'],
  Debugger: ['test_report.md'],
  Security: ['backend_spec.md', 'architecture.md'],
  Reviewer: ['blueprint.md', 'architecture.md'],
};

export function safeParseJson(val: any) {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return null;
  }
}

export function unwrapStageData(raw: any): any {
  if (!raw) return null;
  let data = raw;
  if (data.outflow && typeof data.outflow === 'object') data = data.outflow;
  if (data.validatedJson) {
    if (typeof data.validatedJson === 'object') data = data.validatedJson;
    else if (typeof data.validatedJson === 'string') {
      try {
        data = JSON.parse(data.validatedJson);
      } catch {}
    }
  }

  if (data && typeof data === 'object' && typeof data.content === 'string') {
    const trimmed = data.content.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        return { ...data, ...parsed };
      } catch {}
    }
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      try {
        const parsed = JSON.parse(codeBlockMatch[1]);
        return { ...data, ...parsed };
      } catch {}
    }
  }
  return data;
}

export function extractStageMetrics(stage: string, rawData: any, promptText: string, allFiles: string[] = []) {
  if (!rawData) return null;
  const data = unwrapStageData(rawData);
  const text = typeof data === 'string' ? data : data?.content || JSON.stringify(data || {});

  switch (stage) {
    case 'Queen': {
      const rawProjName =
        data?.projectName ||
        data?.project?.name ||
        text.match(/Project Name:\s*(.+)/i)?.[1] ||
        text.match(/Project:\s*(.+)/i)?.[1];
      const cleanedProjName = rawProjName
        ? rawProjName.replace(/^#+\s*/, '').replace(/Context Snapshot/i, '').trim()
        : '';
      const projName = cleanedProjName || 'Defined';
      const includedCount = Array.isArray(data?.mvpScope?.included)
        ? data.mvpScope.included.length
        : (text.match(/[-*]\s+Include/gi) || text.match(/^[-*]\s+.+$/gm) || []).length;
      return {
        inflow: promptText ? `Prompt (${promptText.length} chars)` : 'Natural User Prompt',
        outflow: `Project: ${projName} | ${includedCount > 0 ? `${includedCount} Scope Items` : 'MVP Scope Defined'}`,
      };
    }
    case 'Planner': {
      let featuresCount = Array.isArray(data?.features) ? data.features.length : 0;
      if (featuresCount === 0) {
        featuresCount = (text.match(/^[-*]\s+.+$/gm) || text.match(/Feature\s*\d+/gi) || text.match(/-\s*Priority:/gi) || []).length;
      }
      const tech =
        data?.recommendedTechStack?.frontend ||
        text.match(/Frontend:\s*(.+)/i)?.[1] ||
        text.match(/Tech Stack:\s*(.+)/i)?.[1] ||
        'HTML5/JS/CSS';
      return {
        inflow: 'Queen Spec & Scope',
        outflow: `${featuresCount || 3} Features Planned | Tech: ${tech}`,
      };
    }
    case 'Architect': {
      let modulesCount = Array.isArray(data?.modules) ? data.modules.length : 0;
      if (modulesCount === 0) {
        const parsed = parseModulesFromMarkdown(text);
        const moduleHeaders = (text.match(/###?\s+(?:Module\s*\d+:?|[A-Za-z0-9_]+\s+Module|System Module|UI Module|[A-Z][a-zA-Z0-9_\s]+Module)/gi) || []).length;
        const boldModules = (text.match(/\*\*(?:Module\s*\d+:?|[A-Z][a-zA-Z0-9_\s]+Module|[A-Z][a-zA-Z0-9_\s]+Service|Frontend|Backend|Database)\*\*/gi) || []).length;
        modulesCount = Math.max(parsed.length, moduleHeaders, boldModules, (text.match(/-\s*Responsibility:/gi) || []).length);
      }
      return {
        inflow: 'Planner Reqs & Features',
        outflow: `${modulesCount || 3} Architectural Modules & Dependency Hierarchy`,
      };
    }
    case 'System': {
      let entityMatches = Array.isArray(data?.entities) ? data.entities.length : 0;
      if (entityMatches === 0) {
        const prismaModels = (text.match(/model\s+[A-Z][a-zA-Z0-9_]+/gi) || []).length;
        const entityBullets = (text.match(/(?:Entity|Table|Model|Schema):\s*[A-Z][a-zA-Z0-9_]+/gi) || []).length;
        const bulletEntities = (text.match(/^[-*]\s+\*\*([A-Z][a-zA-Z0-9_]+)\*\*/gm) || []).length;
        entityMatches = Math.max(prismaModels, entityBullets, bulletEntities, (text.match(/model\s+[A-Z]/gi) || []).length);
      }
      const apiMatches = Array.isArray(data?.apis)
        ? data.apis.length
        : (text.match(/(GET|POST|PUT|DELETE|PATCH)\s+\/[^\s\n]+/gi) || text.match(/Route:\s*\/[^\s\n]+/gi) || []).length;
      return {
        inflow: 'Architect Structure & Modules',
        outflow: `${entityMatches || 2} DB Entities | ${apiMatches || 3} API Routes`,
      };
    }
    case 'Designer': {
      let compMatches = Array.isArray(data?.components) ? data.components.length : 0;
      if (compMatches === 0) {
        const componentHeaders = (text.match(/###?\s+(?:[A-Z][a-zA-Z0-9_]+ Component|[A-Z][a-zA-Z0-9_]+ Screen|[A-Z][a-zA-Z0-9_]+ Page|[A-Z][a-zA-Z0-9_]+ Modal)/gi) || []).length;
        const boldComponents = (text.match(/\*\*([A-Z][a-zA-Z0-9_]+ (?:Component|Screen|Page|View|Modal))\*\*/gi) || []).length;
        const bulletComponents = (text.match(/-\s*(?:Component|Screen|Page|Modal):\s*.+/gi) || []).length;
        compMatches = Math.max(componentHeaders, boldComponents, bulletComponents, (text.match(/Component\s*\d+/gi) || []).length);
      }
      return {
        inflow: 'System DB Schema & API Spec',
        outflow: `${compMatches || 4} UI Components | Design Tokens & Layouts`,
      };
    }
    case 'Blueprinter': {
      const fileMatches = Array.isArray(data?.fileManifest)
        ? data.fileManifest.length
        : (text.match(/^File:\s*([^\s\n]+)/gm) || text.match(/```[a-z]*\s*file:\s*([^\s\n]+)/gi) || text.match(/=== [A-Z._]+ ===/g) || []).length;
      return {
        inflow: 'Full Spec Suite (Plan, Reqs, Arch, System, UI)',
        outflow: `${fileMatches || 5} Files Planned with Code Specifications`,
      };
    }
    case 'Coder': {
      const generatedCount = allFiles.length > 0 ? allFiles.length : (text.match(/Completed/gi) || []).length;
      return {
        inflow: 'Blueprint Manifest & Code Specifications',
        outflow: `${generatedCount || 5} Source Code Files Synthesized & VFS Synced`,
      };
    }
    case 'Tester': {
      const passed = data?.passed ?? (text.match(/PASSED/g) || []).length;
      const failed = data?.failed ?? (text.match(/FAILED/g) || []).length;
      return {
        inflow: 'Synthesized Source Code & AST Linter Rules',
        outflow: `${passed} Passed, ${failed} Failed | Diagnostics Complete`,
      };
    }
    case 'Debugger': {
      const repaired = data?.repairedCount ?? (text.match(/repaired|fixed/gi) || []).length;
      return {
        inflow: 'Linter Diagnostics & Failing Source Code',
        outflow: `${repaired || 0} Files Repaired via Differential Patches`,
      };
    }
    case 'Security': {
      const status = data?.overallStatus || (text.includes('PASSED') ? 'PASSED' : 'REVIEW');
      return {
        inflow: 'Full Specification Suite & Synthesized Source Code',
        outflow: `Security Status: ${status}`,
      };
    }
    case 'Reviewer': {
      const assessment = data?.overallAssessment || (text.includes('APPROVED') || text.includes('PASSED') ? 'PASSED' : 'QUALITY GATE');
      return {
        inflow: 'Security Report & Synthesized Source Code',
        outflow: `Quality Gate Decision: ${assessment}`,
      };
    }
    default:
      return {
        inflow: 'Upstream Pipeline Context',
        outflow: 'Stage execution completed',
      };
  }
}

export function getFileBasename(f: any): string {
  if (!f) return '';
  if (typeof f === 'string') return f.split('/').pop() || '';
  if (typeof f === 'object' && f !== null) {
    if (typeof f.path === 'string') return f.path.split('/').pop() || '';
    if (typeof f.file === 'string') return f.file.split('/').pop() || '';
  }
  return String(f);
}

export function normalizeFilePath(f: any): string {
  if (!f) return '';
  if (typeof f === 'string') return f;
  if (typeof f === 'object') {
    if (typeof f.path === 'string') return f.path;
    if (typeof f.file === 'string') return f.file;
  }
  return String(f);
}

export function getEditorLanguage(filepath: any): string {
  const pathStr = typeof filepath === 'string' ? filepath : normalizeFilePath(filepath);
  if (!pathStr) return 'plaintext';
  if (pathStr.endsWith('.tsx') || pathStr.endsWith('.jsx')) return 'typescript';
  if (pathStr.endsWith('.ts') || pathStr.endsWith('.js')) return 'typescript';
  if (pathStr.endsWith('.html') || pathStr.endsWith('.htm')) return 'html';
  if (pathStr.endsWith('.css')) return 'css';
  if (pathStr.endsWith('.json')) return 'json';
  if (pathStr.endsWith('.md')) return 'markdown';
  return 'plaintext';
}
