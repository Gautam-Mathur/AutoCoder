import { ProjectContextManager } from './project-context-manager.js';
import type { FileMetadata } from './project-context-manager.js';

export interface EditRequest {
  userMessage: string;
  projectFiles: { path: string; content: string; language: string }[];
  conversationHistory?: string;
}

export interface FileEdit {
  filePath: string;
  editType: 'modify' | 'create' | 'delete';
  oldContent?: string;
  newContent: string;
  description: string;
  linesChanged: number;
}

export interface EditResult {
  edits: FileEdit[];
  summary: string;
  thinkingSteps: { phase: string; label: string; detail?: string }[];
  affectedFiles: string[];
  editType: 'style' | 'content' | 'structure' | 'feature' | 'fix' | 'refactor';
}

type EditType = EditResult['editType'];

interface ThinkingStep {
  phase: string;
  label: string;
  detail?: string;
}

interface ClassifiedIntent {
  editType: EditType;
  confidence: number;
  keywords: string[];
  targets: TargetHint[];
}

interface TargetHint {
  kind: 'component' | 'page' | 'schema' | 'style' | 'route' | 'api' | 'config' | 'file';
  name: string;
  raw: string;
}

const STYLE_KEYWORDS = [
  'text color', 'font color', 'background color', 'border color', 'accent color',
  'primary color', 'secondary color', 'foreground color',
  'font family', 'font size', 'font weight', 'font style',
  'color', 'background', 'font', 'size', 'spacing', 'padding', 'margin',
  'border', 'rounded', 'shadow', 'dark', 'light', 'theme', 'opacity',
  'width', 'height', 'gap', 'align', 'justify', 'layout', 'flex', 'grid',
  'text-sm', 'text-lg', 'text-xl', 'bold', 'italic', 'underline',
  'bg-', 'text-', 'p-', 'm-', 'w-', 'h-', 'rounded-', 'shadow-',
  'blue', 'red', 'green', 'yellow', 'purple', 'pink', 'orange', 'gray',
  'white', 'black', 'indigo', 'teal', 'cyan', 'slate', 'zinc', 'neutral',
  'bigger', 'smaller', 'larger', 'wider', 'narrower', 'taller', 'shorter',
  'transparent', 'gradient', 'monospace', 'serif', 'sans-serif',
];

const CONTENT_KEYWORDS = [
  'title', 'heading', 'text', 'label', 'placeholder', 'description',
  'name', 'copy', 'wording', 'string', 'message', 'tooltip', 'caption',
  'subtitle', 'paragraph', 'headline', 'tagline', 'slogan',
  'change the text', 'update the text', 'rename', 'change the title',
  'change the label', 'update the label', 'change the heading',
];

const STRUCTURE_KEYWORDS = [
  'add page', 'new page', 'add route', 'new route', 'add section',
  'new section', 'add tab', 'new tab', 'remove page', 'delete page',
  'add navigation', 'add nav', 'add link', 'add menu', 'sidebar',
  'reorder', 'move', 'reorganize', 'restructure',
];

const FEATURE_KEYWORDS = [
  'add field', 'new field', 'add column', 'new column', 'add button',
  'new button', 'add form', 'new form', 'add input', 'add select',
  'add dropdown', 'add checkbox', 'add table', 'add endpoint',
  'add api', 'new api', 'add filter', 'add search', 'add sort',
  'add modal', 'add dialog', 'add card', 'add list', 'add grid',
  'add feature', 'add functionality', 'add validation', 'add export',
  'add import', 'add upload', 'add download', 'add pagination',
  'add notification', 'add toast', 'add badge', 'add icon',
  'add toggle', 'add switch', 'add slider', 'add progress',
  'add chart', 'add graph', 'add counter', 'add timer',
];

const FIX_KEYWORDS = [
  'fix', 'broken', 'error', 'bug', 'issue', 'wrong', 'incorrect',
  'not working', 'crash', 'fail', 'missing', 'undefined', 'null',
  'import error', 'type error', 'syntax error', 'reference error',
  'cannot find', 'does not exist', 'not found', 'unresolved',
  'not rendering', 'blank page', 'white screen', 'not showing',
  'layout broken', 'overflow', 'overlapping',
];

const REFACTOR_KEYWORDS = [
  'refactor', 'rename', 'extract', 'move to', 'separate', 'split',
  'combine', 'merge', 'consolidate', 'reorganize', 'clean up',
  'simplify', 'optimize', 'deduplicate', 'dry', 'abstract',
];

const TARGET_PATTERNS: { pattern: RegExp; kind: TargetHint['kind'] }[] = [
  { pattern: /(?:the|in|on|to)\s+(?:the\s+)?header/i, kind: 'component' },
  { pattern: /(?:the|in|on|to)\s+(?:the\s+)?footer/i, kind: 'component' },
  { pattern: /(?:the|in|on|to)\s+(?:the\s+)?sidebar/i, kind: 'component' },
  { pattern: /(?:the|in|on|to)\s+(?:the\s+)?navbar?/i, kind: 'component' },
  { pattern: /(?:the|in|on|to)\s+(?:the\s+)?hero\s*(?:section)?/i, kind: 'component' },
  { pattern: /(?:the|in|on|to)\s+(?:the\s+)?modal/i, kind: 'component' },
  { pattern: /(?:the|in|on|to)\s+(?:the\s+)?dialog/i, kind: 'component' },
  { pattern: /(?:the|in|on|to)\s+(?:the\s+)?form/i, kind: 'component' },
  { pattern: /(?:the|in|on|to)\s+(?:the\s+)?table/i, kind: 'component' },
  { pattern: /(?:the|in|on|to)\s+(?:the\s+)?card/i, kind: 'component' },
  { pattern: /(?:the|in|on)\s+(?:the\s+)?(\w+)\s*page/i, kind: 'page' },
  { pattern: /(?:the|in|on)\s+(?:the\s+)?(\w+)\s*view/i, kind: 'page' },
  { pattern: /(?:the|in|on)\s+(?:the\s+)?(\w+)\s*screen/i, kind: 'page' },
  { pattern: /(?:the|in)\s+(?:the\s+)?(\w+)\s*schema/i, kind: 'schema' },
  { pattern: /(?:the|in)\s+(?:the\s+)?(\w+)\s*model/i, kind: 'schema' },
  { pattern: /(?:the|in)\s+(?:the\s+)?(\w+)\s*table/i, kind: 'schema' },
  { pattern: /(?:the|in)\s+(?:the\s+)?(\w+)\s*(?:css|styles?|stylesheet)/i, kind: 'style' },
  { pattern: /(?:the|in)\s+(?:the\s+)?(\w+)\s*(?:route|endpoint|api)/i, kind: 'api' },
  { pattern: /(?:the|in)\s+(?:the\s+)?(\w+)\s*component/i, kind: 'component' },
  { pattern: /(?:the|in)\s+(?:the\s+)?(\w+)\s*(?:config|configuration)/i, kind: 'config' },
];

const TAILWIND_COLOR_MAP: Record<string, string> = {
  blue: 'blue', red: 'red', green: 'green', yellow: 'yellow',
  purple: 'purple', pink: 'pink', orange: 'orange', gray: 'gray',
  white: 'white', black: 'black', indigo: 'indigo', teal: 'teal',
  cyan: 'cyan', slate: 'slate', zinc: 'zinc', neutral: 'neutral',
  emerald: 'emerald', violet: 'violet', rose: 'rose', amber: 'amber',
  lime: 'lime', sky: 'sky', fuchsia: 'fuchsia', stone: 'stone',
};

const COMPOUND_COLOR_MAP: Record<string, { color: string; shade: string }> = {
  'dark blue': { color: 'blue', shade: '900' },
  'dark red': { color: 'red', shade: '900' },
  'dark green': { color: 'green', shade: '900' },
  'dark gray': { color: 'gray', shade: '800' },
  'dark grey': { color: 'gray', shade: '800' },
  'dark purple': { color: 'purple', shade: '900' },
  'light blue': { color: 'blue', shade: '200' },
  'light red': { color: 'red', shade: '200' },
  'light green': { color: 'green', shade: '200' },
  'light gray': { color: 'gray', shade: '200' },
  'light grey': { color: 'gray', shade: '200' },
  'light purple': { color: 'purple', shade: '200' },
  'navy blue': { color: 'blue', shade: '950' },
  'navy': { color: 'blue', shade: '950' },
  'royal blue': { color: 'blue', shade: '700' },
  'deep red': { color: 'red', shade: '800' },
  'bright red': { color: 'red', shade: '500' },
  'bright green': { color: 'green', shade: '500' },
  'bright blue': { color: 'blue', shade: '500' },
  'forest green': { color: 'green', shade: '800' },
  'dark teal': { color: 'teal', shade: '900' },
  'light teal': { color: 'teal', shade: '200' },
  'dark slate': { color: 'slate', shade: '800' },
  'dark cyan': { color: 'cyan', shade: '900' },
  'pastel blue': { color: 'sky', shade: '200' },
  'pastel pink': { color: 'pink', shade: '200' },
  'pastel green': { color: 'emerald', shade: '200' },
};

function resolveColor(message: string): { color: string; shade: string } | null {
  const lower = message.toLowerCase();
  const colorPatterns = [
    /(?:change|make|set|update)\s+(?:the\s+)?(?:background|bg|color|text)\s+(?:color\s+)?(?:to|=)\s*([\w\s]+?)(?:\.|,|$|\s+(?:and|with|on|in|for))/,
    /make\s+(?:the\s+)?\w+\s+([\w\s]+?)(?:\.|,|$)/,
    /(?:to|=)\s+([\w\s]+?)(?:\.|,|$|\s+(?:and|with|on|in|for))/,
  ];
  for (const pat of colorPatterns) {
    const m = lower.match(pat);
    if (m) {
      const raw = m[1].trim();
      const compound = COMPOUND_COLOR_MAP[raw];
      if (compound) return compound;
      const words = raw.split(/\s+/);
      for (let i = words.length; i >= 1; i--) {
        const sub = words.slice(0, i).join(' ');
        const comp = COMPOUND_COLOR_MAP[sub];
        if (comp) return comp;
        if (i === 1 && TAILWIND_COLOR_MAP[words[0]]) {
          return { color: TAILWIND_COLOR_MAP[words[0]], shade: '500' };
        }
      }
      const lastWord = words[words.length - 1];
      if (TAILWIND_COLOR_MAP[lastWord]) {
        return { color: TAILWIND_COLOR_MAP[lastWord], shade: '500' };
      }
    }
  }
  return null;
}

const TAILWIND_SIZE_SCALE = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl'];
const TAILWIND_SPACING_SCALE = ['0', '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '5', '6', '7', '8', '9', '10', '11', '12', '14', '16', '20', '24', '28', '32', '36', '40', '44', '48', '52', '56', '60', '64', '72', '80', '96'];

function classifyIntent(message: string): ClassifiedIntent {
  const lower = message.toLowerCase();
  const scores: Record<EditType, number> = {
    style: 0,
    content: 0,
    structure: 0,
    feature: 0,
    fix: 0,
    refactor: 0,
  };
  const matchedKeywords: string[] = [];

  for (const kw of STYLE_KEYWORDS) {
    if (lower.includes(kw)) {
      scores.style += kw.includes(' ') ? 3 : 1;
      matchedKeywords.push(kw);
    }
  }
  const styleCompounds = ['text color', 'font color', 'background color', 'border color', 'font family', 'font size', 'font weight'];
  const hasStyleCompound = styleCompounds.some(sc => lower.includes(sc));
  for (const kw of CONTENT_KEYWORDS) {
    if (lower.includes(kw)) {
      if (hasStyleCompound && (kw === 'text' || kw === 'change the text' || kw === 'update the text')) {
        continue;
      }
      scores.content += kw.includes(' ') ? 3 : 1;
      matchedKeywords.push(kw);
    }
  }
  for (const kw of STRUCTURE_KEYWORDS) {
    if (lower.includes(kw)) {
      scores.structure += kw.includes(' ') ? 3 : 1;
      matchedKeywords.push(kw);
    }
  }
  for (const kw of FEATURE_KEYWORDS) {
    if (lower.includes(kw)) {
      scores.feature += kw.includes(' ') ? 3 : 1;
      matchedKeywords.push(kw);
    }
  }
  for (const kw of FIX_KEYWORDS) {
    if (lower.includes(kw)) {
      scores.fix += kw.includes(' ') ? 3 : 1;
      matchedKeywords.push(kw);
    }
  }
  for (const kw of REFACTOR_KEYWORDS) {
    if (lower.includes(kw)) {
      scores.refactor += kw.includes(' ') ? 3 : 1;
      matchedKeywords.push(kw);
    }
  }

  if (/make\s+(?:it\s+)?(?:the\s+)?(?:\w+\s+)?(?:bigger|smaller|larger|wider|narrower|taller|shorter)/i.test(message)) {
    scores.style += 3;
  }
  if (/change\s+(?:the\s+)?(?:background|bg)\s+(?:color\s+)?(?:to|of)/i.test(message)) {
    scores.style += 3;
  }
  if (/change\s+(?:the\s+)?(?:text|title|heading|label|name)\s+(?:to|of|from)/i.test(message)) {
    scores.content += 3;
  }
  if (/add\s+(?:a\s+)?(?:new\s+)?(?:\w+\s+)?(?:field|column|input|button|endpoint)/i.test(message)) {
    scores.feature += 3;
  }
  if (/add\s+(?:a\s+)?(?:new\s+)?(?:\w+\s+)?page/i.test(message)) {
    scores.structure += 3;
  }

  const targets = extractTargets(message);

  let bestType: EditType = 'feature';
  let bestScore = 0;
  for (const [type, score] of Object.entries(scores) as [EditType, number][]) {
    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  }

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = total > 0 ? bestScore / total : 0.5;

  return {
    editType: bestType,
    confidence,
    keywords: Array.from(new Set(matchedKeywords)),
    targets,
  };
}

function extractTargets(message: string): TargetHint[] {
  const targets: TargetHint[] = [];
  const seen = new Set<string>();

  for (const { pattern, kind } of TARGET_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      const name = (match[1] || match[0]).replace(/^(?:the|in|on|to)\s+(?:the\s+)?/i, '').trim();
      const key = `${kind}:${name.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        targets.push({ kind, name, raw: match[0] });
      }
    }
  }

  const fileRefMatch = message.match(/(?:file|in)\s+[`"']([^`"']+)[`"']/i);
  if (fileRefMatch) {
    targets.push({ kind: 'file', name: fileRefMatch[1], raw: fileRefMatch[0] });
  }

  return targets;
}

function findTargetFiles(
  intent: ClassifiedIntent,
  contextManager: ProjectContextManager,
  files: { path: string; content: string; language: string }[],
  message?: string
): { path: string; content: string; language: string; meta: FileMetadata }[] {
  const results: Map<string, { path: string; content: string; language: string; meta: FileMetadata }> = new Map();
  const fileIndex = contextManager.getFileIndex();

  const addFile = (path: string) => {
    if (results.has(path)) return;
    const meta = fileIndex.get(path);
    const file = files.find(f => f.path === path);
    if (file && meta) {
      results.set(path, { ...file, meta });
    }
  };

  for (const target of intent.targets) {
    const lowerName = target.name.toLowerCase();

    if (target.kind === 'file') {
      const exact = files.find(f => f.path === target.name || f.path.endsWith(target.name));
      if (exact) addFile(exact.path);
      continue;
    }

    if (target.kind === 'page') {
      const pageFiles = contextManager.getFilesByType('page');
      const isGenericPage = ['main', 'home', 'index', 'landing', 'app', 'default', 'primary'].includes(lowerName);

      if (isGenericPage) {
        const homePages = pageFiles.filter(pf =>
          /(?:home|index|dashboard|landing|app)/i.test(pf.path)
        );
        if (homePages.length > 0) {
          for (const hp of homePages) addFile(hp.path);
        } else if (pageFiles.length > 0) {
          addFile(pageFiles[0].path);
        }
        const appFile = files.find(f => /App\.(tsx|jsx)$/.test(f.path));
        if (appFile) addFile(appFile.path);
      } else {
        for (const pf of pageFiles) {
          if (pf.path.toLowerCase().includes(lowerName)) {
            addFile(pf.path);
          }
        }
      }
    }

    if (target.kind === 'component') {
      const componentFiles = contextManager.getFilesByType('component');
      for (const cf of componentFiles) {
        const pathLower = cf.path.toLowerCase();
        const hasName = pathLower.includes(lowerName) ||
          cf.components.some(c => c.toLowerCase().includes(lowerName));
        if (hasName) {
          addFile(cf.path);
        }
      }
      if (results.size === 0) {
        for (const file of files) {
          if (file.content.toLowerCase().includes(lowerName)) {
            addFile(file.path);
          }
        }
      }
    }

    if (target.kind === 'schema') {
      const schemaFiles = contextManager.getFilesByType('schema');
      for (const sf of schemaFiles) {
        addFile(sf.path);
      }
    }

    if (target.kind === 'style') {
      const styleFiles = contextManager.getFilesByType('style');
      for (const sf of styleFiles) {
        addFile(sf.path);
      }
    }

    if (target.kind === 'api' || target.kind === 'route') {
      const apiFiles = contextManager.getFilesByType('api');
      for (const af of apiFiles) {
        addFile(af.path);
      }
    }
  }

  if ((intent.editType === 'style' || intent.editType === 'content') && message) {
    const msgWords = message.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const mentionedPages = files.filter(f => {
      if (!/\.(tsx|jsx)$/.test(f.path)) return false;
      const fileName = f.path.split('/').pop()?.replace(/\.\w+$/, '').toLowerCase() || '';
      for (const word of msgWords) {
        if (fileName.includes(word) || word.includes(fileName)) return true;
      }
      return false;
    });
    for (const pf of mentionedPages) addFile(pf.path);
  }

  if (results.size === 0) {
    if (intent.editType === 'style') {
      const styleFiles = contextManager.getFilesByType('style');
      for (const sf of styleFiles) addFile(sf.path);
      const pageFiles = contextManager.getFilesByType('page');
      for (const pf of pageFiles) {
        if (/className[=]/.test(files.find(f => f.path === pf.path)?.content || '')) {
          addFile(pf.path);
        }
      }
      if (results.size === 0) {
        for (const file of files) {
          if (/className[=]/.test(file.content) || /tailwind|css/i.test(file.path)) {
            addFile(file.path);
          }
        }
      }
    }

    if (intent.editType === 'content') {
      const pageFiles = contextManager.getFilesByType('page');
      for (const pf of pageFiles) addFile(pf.path);

      if (results.size === 0) {
        for (const file of files) {
          if (/\.(tsx|jsx)$/.test(file.path) && /<[A-Za-z]/.test(file.content)) {
            addFile(file.path);
          }
        }
      }
    }

    if (intent.editType === 'fix') {
      for (const file of files) {
        if (/\.(tsx?|jsx?)$/.test(file.path)) {
          addFile(file.path);
        }
      }
    }

    if (intent.editType === 'feature') {
      const schemaFiles = contextManager.getFilesByType('schema');
      const apiFiles = contextManager.getFilesByType('api');
      const componentFiles = contextManager.getFilesByType('component');
      for (const f of schemaFiles) addFile(f.path);
      for (const f of apiFiles) addFile(f.path);
      for (const f of componentFiles.slice(0, 5)) addFile(f.path);
    }

    if (intent.editType === 'structure') {
      for (const file of files) {
        if (/App\.(tsx|jsx)$/.test(file.path) || /routes?\.(tsx?|jsx?)$/.test(file.path)) {
          addFile(file.path);
        }
      }
      const componentFiles = contextManager.getFilesByType('component');
      for (const cf of componentFiles) {
        if (cf.path.toLowerCase().includes('nav') || cf.path.toLowerCase().includes('sidebar') ||
            cf.path.toLowerCase().includes('layout') || cf.path.toLowerCase().includes('menu')) {
          addFile(cf.path);
        }
      }
    }

    if (intent.editType === 'refactor') {
      for (const file of files) {
        if (/\.(tsx?|jsx?)$/.test(file.path)) {
          addFile(file.path);
        }
      }
    }
  }

  return Array.from(results.values());
}

function generateStyleEdits(
  message: string,
  targetFiles: { path: string; content: string; language: string; meta: FileMetadata }[],
  steps: ThinkingStep[]
): FileEdit[] {
  const edits: FileEdit[] = [];
  const lower = message.toLowerCase();

  const resolved = resolveColor(message);

  const makeColorMatch = lower.match(/make\s+(?:the\s+)?(\w+)\s+(?:[\w\s]+?)$/);
  const impliedTarget = makeColorMatch ? makeColorMatch[1] : null;

  const sizeDirection = /(?:bigger|larger|wider|taller)/.test(lower) ? 'up' : /(?:smaller|narrower|shorter)/.test(lower) ? 'down' : null;

  for (const file of targetFiles) {
    if (!/\.(tsx|jsx|css|html)$/.test(file.path)) continue;
    let modified = file.content;
    let changed = false;
    let desc = '';

    if (resolved) {
      const color = resolved.color;
      const shade = resolved.shade;
      const newBg = `bg-${color}-${shade}`;

      const replaceBgClasses = (text: string): string => {
        let result = text;
        result = result.replace(/bg-(\w+)-(\d+)/g, newBg);
        result = result.replace(/bg-(background|card|muted|popover|accent|secondary|primary|white|black)\b/g, newBg);
        return result;
      };

      if (impliedTarget) {
        if (impliedTarget === 'header' || impliedTarget === 'navbar' || impliedTarget === 'nav') {
          const headerBlock = findComponentBlock(modified, ['header', 'Header', 'Navbar', 'Nav']);
          if (headerBlock) {
            const section = modified.substring(headerBlock.start, headerBlock.end);
            const replaced = replaceBgClasses(section);
            if (replaced !== section) {
              modified = modified.substring(0, headerBlock.start) + replaced + modified.substring(headerBlock.end);
              changed = true;
              desc = `Changed header background color to ${color}-${shade}`;
            }
          }
        }

        if (!changed) {
          modified = replaceBgClasses(modified);
          changed = modified !== file.content;
          if (changed) desc = `Changed background color to ${color}-${shade}`;
        }
      }

      if (!changed && /(?:background|bg)/.test(lower)) {
        modified = replaceBgClasses(modified);
        if (modified !== file.content) {
          changed = true;
          desc = `Changed background colors to ${color}-${shade}`;
        }
      }

      if (!changed && /(?:text|font)\s*color/.test(lower)) {
        modified = modified.replace(/(?<!\bg-)text-(\w+)-(\d+)/g, `text-${color}-${shade}`);
        if (modified !== file.content) {
          changed = true;
          desc = `Changed text colors to ${color}-${shade}`;
        }
      }

      if (!changed && /(?:border)\s*color/.test(lower)) {
        modified = modified.replace(/border-(\w+)-(\d+)/g, `border-${color}-${shade}`);
        if (modified !== file.content) {
          changed = true;
          desc = `Changed border colors to ${color}-${shade}`;
        }
      }

      if (!changed) {
        modified = replaceBgClasses(modified);
        if (modified !== file.content) {
          changed = true;
          desc = `Changed colors to ${color}-${shade}`;
        }
      }

      if (!changed && /\.(tsx|jsx)$/.test(file.path)) {
        const returnMatch = modified.match(/return\s*\(\s*\n?\s*(<\w+)/);
        if (returnMatch) {
          const idx = modified.indexOf(returnMatch[0]);
          const tagEnd = modified.indexOf('>', idx);
          if (tagEnd > idx) {
            const tag = modified.substring(idx, tagEnd + 1);
            const classNameMatch = tag.match(/className\s*=\s*["']([^"']*)["']/);
            if (classNameMatch) {
              const oldClasses = classNameMatch[1];
              const newClasses = oldClasses + ` ${newBg}`;
              modified = modified.substring(0, idx) + tag.replace(classNameMatch[0], `className="${newClasses}"`) + modified.substring(tagEnd + 1);
            } else if (tag.includes('className={')) {
              const cnMatch = tag.match(/className=\{`([^`]*)`\}/);
              if (cnMatch) {
                modified = modified.substring(0, idx) + tag.replace(cnMatch[0], `className={\`${cnMatch[1]} ${newBg}\`}`) + modified.substring(tagEnd + 1);
              }
            } else {
              const insertPos = modified.indexOf(returnMatch[1], idx) + returnMatch[1].length;
              modified = modified.substring(0, insertPos) + ` className="${newBg}"` + modified.substring(insertPos);
            }
            if (modified !== file.content) {
              changed = true;
              desc = `Added ${newBg} background to main container`;
            }
          }
        }
      }
    }

    if (sizeDirection && !changed) {
      if (/text|font/.test(lower)) {
        modified = adjustTailwindScale(modified, 'text-', TAILWIND_SIZE_SCALE, sizeDirection);
        if (modified !== file.content) {
          changed = true;
          desc = `${sizeDirection === 'up' ? 'Increased' : 'Decreased'} text size`;
        }
      } else if (/padding|spacing/.test(lower)) {
        modified = adjustTailwindScale(modified, 'p-', TAILWIND_SPACING_SCALE, sizeDirection);
        if (modified !== file.content) {
          changed = true;
          desc = `${sizeDirection === 'up' ? 'Increased' : 'Decreased'} padding`;
        }
      } else if (/margin/.test(lower)) {
        modified = adjustTailwindScale(modified, 'm-', TAILWIND_SPACING_SCALE, sizeDirection);
        if (modified !== file.content) {
          changed = true;
          desc = `${sizeDirection === 'up' ? 'Increased' : 'Decreased'} margin`;
        }
      } else if (/gap/.test(lower)) {
        modified = adjustTailwindScale(modified, 'gap-', TAILWIND_SPACING_SCALE, sizeDirection);
        if (modified !== file.content) {
          changed = true;
          desc = `${sizeDirection === 'up' ? 'Increased' : 'Decreased'} gap`;
        }
      } else {
        for (const prefix of ['text-', 'p-', 'w-', 'h-']) {
          modified = adjustTailwindScale(modified, prefix, prefix === 'text-' ? TAILWIND_SIZE_SCALE : TAILWIND_SPACING_SCALE, sizeDirection);
        }
        if (modified !== file.content) {
          changed = true;
          desc = `${sizeDirection === 'up' ? 'Increased' : 'Decreased'} element sizing`;
        }
      }
    }

    if (/rounded|border.?radius/.test(lower) && !changed) {
      const roundedValues = ['none', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', 'full'];
      if (/more\s+rounded|rounder|increase.*round/.test(lower)) {
        modified = adjustTailwindScale(modified, 'rounded-', roundedValues, 'up');
      } else if (/less\s+rounded|square|decrease.*round|remove.*round/.test(lower)) {
        modified = adjustTailwindScale(modified, 'rounded-', roundedValues, 'down');
      }
      if (modified !== file.content) {
        changed = true;
        desc = 'Adjusted border radius';
      }
    }

    if (/shadow/.test(lower) && !changed) {
      const shadowValues = ['none', 'sm', 'md', 'lg', 'xl', '2xl'];
      if (/add.*shadow|more.*shadow|increase.*shadow/.test(lower)) {
        modified = adjustTailwindScale(modified, 'shadow-', shadowValues, 'up');
      } else if (/remove.*shadow|no.*shadow|less.*shadow/.test(lower)) {
        modified = adjustTailwindScale(modified, 'shadow-', shadowValues, 'down');
      }
      if (modified !== file.content) {
        changed = true;
        desc = 'Adjusted shadow';
      }
    }

    if (file.path.endsWith('.css') && !changed) {
      const cssVarMatch = lower.match(/(?:change|set|update)\s+(?:the\s+)?(?:--)?(\w[\w-]*)\s+(?:to|=)\s*([#\w()%,.\s]+)/);
      if (cssVarMatch) {
        const varName = cssVarMatch[1].startsWith('--') ? cssVarMatch[1] : `--${cssVarMatch[1]}`;
        const varValue = cssVarMatch[2].trim();
        const varRegex = new RegExp(`(${escapeRegex(varName)}\\s*:\\s*)([^;]+)(;)`, 'g');
        modified = modified.replace(varRegex, `$1${varValue}$3`);
        if (modified !== file.content) {
          changed = true;
          desc = `Updated CSS variable ${varName} to ${varValue}`;
        }
      }

      if (!changed && resolved) {
        const COLOR_HSL_MAP: Record<string, Record<string, string>> = {
          red: { '50': '0 86% 97%', '100': '0 93% 94%', '200': '0 96% 89%', '300': '0 94% 82%', '400': '0 91% 71%', '500': '0 84% 60%', '600': '0 72% 51%', '700': '0 74% 42%', '800': '0 70% 35%', '900': '0 63% 31%' },
          orange: { '50': '33 100% 96%', '100': '34 100% 92%', '200': '32 98% 83%', '300': '31 97% 72%', '400': '27 96% 61%', '500': '25 95% 53%', '600': '21 90% 48%', '700': '17 88% 40%', '800': '15 79% 34%', '900': '15 75% 28%' },
          yellow: { '50': '55 92% 95%', '100': '55 97% 88%', '200': '53 98% 77%', '300': '50 98% 64%', '400': '48 96% 53%', '500': '45 93% 47%', '600': '41 96% 40%', '700': '35 92% 33%', '800': '32 81% 29%', '900': '28 73% 26%' },
          green: { '50': '138 76% 97%', '100': '141 84% 93%', '200': '141 79% 85%', '300': '142 77% 73%', '400': '142 69% 58%', '500': '142 71% 45%', '600': '142 76% 36%', '700': '142 72% 29%', '800': '143 64% 24%', '900': '144 61% 20%' },
          blue: { '50': '214 100% 97%', '100': '214 95% 93%', '200': '213 97% 87%', '300': '212 96% 78%', '400': '213 94% 68%', '500': '217 91% 60%', '600': '221 83% 53%', '700': '224 76% 48%', '800': '226 71% 40%', '900': '224 64% 33%' },
          indigo: { '50': '226 100% 97%', '100': '226 100% 94%', '200': '228 96% 89%', '300': '230 94% 82%', '400': '234 89% 74%', '500': '239 84% 67%', '600': '243 75% 59%', '700': '245 58% 51%', '800': '244 55% 41%', '900': '242 47% 34%' },
          violet: { '50': '250 100% 98%', '100': '251 91% 95%', '200': '251 95% 92%', '300': '252 95% 85%', '400': '255 92% 76%', '500': '258 90% 66%', '600': '262 83% 58%', '700': '263 70% 50%', '800': '263 69% 42%', '900': '264 67% 35%' },
          purple: { '50': '270 100% 98%', '100': '269 100% 95%', '200': '269 100% 92%', '300': '269 97% 85%', '400': '270 95% 75%', '500': '271 91% 65%', '600': '271 81% 56%', '700': '272 72% 47%', '800': '273 67% 39%', '900': '274 66% 32%' },
          pink: { '50': '327 73% 97%', '100': '326 78% 95%', '200': '326 85% 90%', '300': '327 87% 82%', '400': '329 86% 70%', '500': '330 81% 60%', '600': '333 71% 51%', '700': '335 78% 42%', '800': '336 74% 35%', '900': '336 69% 30%' },
          teal: { '50': '166 76% 97%', '100': '167 85% 89%', '200': '168 84% 78%', '300': '171 77% 64%', '400': '172 66% 50%', '500': '173 80% 40%', '600': '175 84% 32%', '700': '175 77% 26%', '800': '176 69% 22%', '900': '176 61% 19%' },
          cyan: { '50': '183 100% 96%', '100': '185 96% 90%', '200': '186 94% 82%', '300': '187 92% 69%', '400': '188 86% 53%', '500': '189 94% 43%', '600': '192 91% 36%', '700': '193 82% 31%', '800': '194 70% 27%', '900': '196 64% 24%' },
        };

        const colorHSL = COLOR_HSL_MAP[resolved.color];
        if (colorHSL) {
          const primaryHSL = colorHSL[resolved.shade] || colorHSL['500'];
          const lightHSL = colorHSL['100'] || colorHSL['50'];
          const darkHSL = colorHSL['900'] || colorHSL['800'];

          const isBackgroundEdit = /background|bg\b/.test(lower);
          const isPrimaryEdit = /primary|main|brand|theme/.test(lower) || /(?:change|set|update)\s+(?:the\s+)?(?:color|colours?)/.test(lower);
          const isAccentEdit = /accent|highlight|emphasis/.test(lower);
          const isSecondaryEdit = /secondary/.test(lower);
          const isForegroundEdit = /(?:text|font|foreground)\s*colou?r/.test(lower);

          if (isBackgroundEdit) {
            modified = modified.replace(/(--background\s*:\s*)([^;]+)(;)/g, `$1${darkHSL}$3`);
            modified = modified.replace(/(--card\s*:\s*)([^;]+)(;)/g, (match, p1, _p2, p3) => {
              return `${p1}${colorHSL['800'] || darkHSL}${p3}`;
            });
            modified = modified.replace(/(--foreground\s*:\s*)([^;]+)(;)/g, `$1${lightHSL}$3`);
            modified = modified.replace(/(--card-foreground\s*:\s*)([^;]+)(;)/g, `$1${lightHSL}$3`);
          } else if (isForegroundEdit) {
            modified = modified.replace(/(--foreground\s*:\s*)([^;]+)(;)/g, `$1${primaryHSL}$3`);
          } else if (isPrimaryEdit) {
            modified = modified.replace(/(--primary\s*:\s*)([^;]+)(;)/g, `$1${primaryHSL}$3`);
            modified = modified.replace(/(--primary-foreground\s*:\s*)([^;]+)(;)/g, `$1${lightHSL}$3`);
          } else if (isAccentEdit) {
            modified = modified.replace(/(--accent\s*:\s*)([^;]+)(;)/g, `$1${primaryHSL}$3`);
          } else if (isSecondaryEdit) {
            modified = modified.replace(/(--secondary\s*:\s*)([^;]+)(;)/g, `$1${primaryHSL}$3`);
          } else {
            modified = modified.replace(/(--primary\s*:\s*)([^;]+)(;)/g, `$1${primaryHSL}$3`);
            modified = modified.replace(/(--primary-foreground\s*:\s*)([^;]+)(;)/g, `$1${lightHSL}$3`);
          }

          const editTypeLabel = isBackgroundEdit ? 'background' : isForegroundEdit ? 'foreground' : isPrimaryEdit ? 'primary' : isAccentEdit ? 'accent' : isSecondaryEdit ? 'secondary' : 'primary';
          if (modified !== file.content) {
            changed = true;
            desc = `Updated ${editTypeLabel} color to ${resolved.color}`;
          }
        }
      }
    }

    if (changed) {
      steps.push({ phase: 'edit', label: `Style edit: ${file.path}`, detail: desc });
      edits.push({
        filePath: file.path,
        editType: 'modify',
        oldContent: file.content,
        newContent: modified,
        description: desc,
        linesChanged: countChangedLines(file.content, modified),
      });
    }
  }

  return edits;
}

function generateContentEdits(
  message: string,
  targetFiles: { path: string; content: string; language: string; meta: FileMetadata }[],
  steps: ThinkingStep[]
): FileEdit[] {
  const edits: FileEdit[] = [];

  const changeToMatch = message.match(/change\s+(?:the\s+)?(?:(?:main|page|app|site|website|home|landing)\s+)*(?:title|heading|text|label|name|header)\s+(?:to|=)\s*['""]?([^'""]+)['""]?/i);
  const fromToMatch = message.match(/(?:change|replace|update)\s+['""]?([^'""]+?)['""]?\s+(?:to|with|→)\s+['""]?([^'""]+)['""]?/i);
  const renameMatch = message.match(/rename\s+['""]?([^'""]+?)['""]?\s+to\s+['""]?([^'""]+)['""]?/i);

  if (changeToMatch) {
    const newText = changeToMatch[1].trim().replace(/['""]$/, '');
    steps.push({ phase: 'analysis', label: 'Content change detected', detail: `New value: "${newText}"` });

    for (const file of targetFiles) {
      if (!/\.(tsx|jsx|html)$/.test(file.path)) continue;
      let modified = file.content;
      let changed = false;
      let desc = '';

      if (/title|heading/i.test(message)) {
        const headingRegex = /(<h[1-6][^>]*>)([\s\S]*?)(<\/h[1-6]>)/g;
        const firstMatch = headingRegex.exec(modified);
        if (firstMatch) {
          modified = modified.replace(firstMatch[0], `${firstMatch[1]}${newText}${firstMatch[3]}`);
          changed = true;
          desc = `Changed heading to "${newText}"`;
        }
      }

      if (!changed && /label/i.test(message)) {
        const labelRegex = /(<label[^>]*>)([\s\S]*?)(<\/label>)/g;
        const firstMatch = labelRegex.exec(modified);
        if (firstMatch) {
          modified = modified.replace(firstMatch[0], `${firstMatch[1]}${newText}${firstMatch[3]}`);
          changed = true;
          desc = `Changed label to "${newText}"`;
        }
      }

      if (!changed) {
        const titleRegex = /(<(?:h[1-6]|title|span|p|div|a|button)[^>]*>)\s*([^<{]+?)\s*(<\/(?:h[1-6]|title|span|p|div|a|button)>)/;
        const match = modified.match(titleRegex);
        if (match) {
          modified = modified.replace(match[0], `${match[1]}${newText}${match[3]}`);
          changed = true;
          desc = `Changed text content to "${newText}"`;
        }
      }

      if (!changed) {
        const stringVarRegex = /(?:const|let|var)\s+\w*(?:title|name|heading|appName|siteName|brand)\w*\s*=\s*['"`]([^'"`]+)['"`]/i;
        const strMatch = modified.match(stringVarRegex);
        if (strMatch) {
          modified = modified.replace(strMatch[0], strMatch[0].replace(strMatch[1], newText));
          changed = true;
          desc = `Changed title variable to "${newText}"`;
        }
      }

      if (!changed) {
        const jsxTextRegex = /(>)\s*([A-Z][^<{]*?)\s*(<)/;
        const jsxMatch = modified.match(jsxTextRegex);
        if (jsxMatch && jsxMatch[2].trim().length > 2) {
          modified = modified.replace(jsxMatch[0], `${jsxMatch[1]}${newText}${jsxMatch[3]}`);
          changed = true;
          desc = `Changed displayed text to "${newText}"`;
        }
      }

      if (changed) {
        steps.push({ phase: 'edit', label: `Content edit: ${file.path}`, detail: desc });
        edits.push({
          filePath: file.path,
          editType: 'modify',
          oldContent: file.content,
          newContent: modified,
          description: desc,
          linesChanged: countChangedLines(file.content, modified),
        });
      }
    }
  }

  if (fromToMatch || renameMatch) {
    const match = fromToMatch || renameMatch;
    const oldText = match![1].trim();
    const newText = match![2].trim().replace(/['""]$/, '');
    steps.push({ phase: 'analysis', label: 'Text replacement detected', detail: `"${oldText}" → "${newText}"` });

    for (const file of targetFiles) {
      if (!/\.(tsx|jsx|html|ts|js)$/.test(file.path)) continue;
      if (!file.content.includes(oldText)) continue;

      const modified = file.content.split(oldText).join(newText);
      if (modified !== file.content) {
        const desc = `Replaced "${oldText}" with "${newText}"`;
        steps.push({ phase: 'edit', label: `Content edit: ${file.path}`, detail: desc });
        edits.push({
          filePath: file.path,
          editType: 'modify',
          oldContent: file.content,
          newContent: modified,
          description: desc,
          linesChanged: countChangedLines(file.content, modified),
        });
      }
    }
  }

  if (edits.length === 0) {
    const quotedMatch = message.match(/['""]([^'""]+)['""].*?['""]([^'""]+)['""/]/);
    if (quotedMatch) {
      const oldText = quotedMatch[1];
      const newText = quotedMatch[2];
      for (const file of targetFiles) {
        if (!file.content.includes(oldText)) continue;
        const modified = file.content.split(oldText).join(newText);
        if (modified !== file.content) {
          const desc = `Replaced "${oldText}" with "${newText}"`;
          steps.push({ phase: 'edit', label: `Content edit: ${file.path}`, detail: desc });
          edits.push({
            filePath: file.path,
            editType: 'modify',
            oldContent: file.content,
            newContent: modified,
            description: desc,
            linesChanged: countChangedLines(file.content, modified),
          });
        }
      }
    }
  }

  return edits;
}

function generateStructureEdits(
  message: string,
  targetFiles: { path: string; content: string; language: string; meta: FileMetadata }[],
  allFiles: { path: string; content: string; language: string }[],
  contextManager: ProjectContextManager,
  steps: ThinkingStep[]
): FileEdit[] {
  const edits: FileEdit[] = [];
  const lower = message.toLowerCase();

  const addPageMatch = lower.match(/add\s+(?:a\s+)?(?:new\s+)?(\w+)\s*page/);
  if (addPageMatch) {
    const pageName = addPageMatch[1];
    const componentName = pageName.charAt(0).toUpperCase() + pageName.slice(1);
    const fileName = pageName.toLowerCase();

    steps.push({ phase: 'structure', label: `Creating ${componentName} page` });

    const existingPage = allFiles.find(f => f.path.toLowerCase().includes(`pages/${fileName}`));
    if (existingPage) {
      steps.push({ phase: 'structure', label: 'Page already exists', detail: existingPage.path });
      return edits;
    }

    const pagesDir = allFiles.some(f => f.path.includes('client/src/pages/')) ? 'client/src/pages' :
                     allFiles.some(f => f.path.includes('src/pages/')) ? 'src/pages' : 'pages';

    const pageContent = generatePageTemplate(componentName);
    edits.push({
      filePath: `${pagesDir}/${fileName}.tsx`,
      editType: 'create',
      newContent: pageContent,
      description: `Created ${componentName} page component`,
      linesChanged: pageContent.split('\n').length,
    });

    const appFile = allFiles.find(f => /App\.(tsx|jsx)$/.test(f.path));
    if (appFile) {
      const { content: modifiedApp, changed } = addRouteToApp(appFile.content, componentName, `/${fileName}`, `${pagesDir}/${fileName}`);
      if (changed) {
        edits.push({
          filePath: appFile.path,
          editType: 'modify',
          oldContent: appFile.content,
          newContent: modifiedApp,
          description: `Added route for ${componentName} page`,
          linesChanged: countChangedLines(appFile.content, modifiedApp),
        });
      }
    }

    const navFiles = allFiles.filter(f =>
      /sidebar|nav|menu|layout/i.test(f.path) && /\.(tsx|jsx)$/.test(f.path)
    );
    for (const navFile of navFiles) {
      const { content: modifiedNav, changed } = addNavItem(navFile.content, componentName, `/${fileName}`);
      if (changed) {
        edits.push({
          filePath: navFile.path,
          editType: 'modify',
          oldContent: navFile.content,
          newContent: modifiedNav,
          description: `Added ${componentName} to navigation`,
          linesChanged: countChangedLines(navFile.content, modifiedNav),
        });
      }
    }

    return edits;
  }

  const addSectionMatch = lower.match(/add\s+(?:a\s+)?(?:new\s+)?(\w+)\s*section/);
  if (addSectionMatch) {
    const sectionName = addSectionMatch[1];
    const componentName = sectionName.charAt(0).toUpperCase() + sectionName.slice(1) + 'Section';

    for (const file of targetFiles) {
      if (!/\.(tsx|jsx)$/.test(file.path)) continue;
      const returnMatch = file.content.match(/(return\s*\(\s*[\s\S]*?)(\s*<\/(?:div|main|section)>\s*\)\s*;?\s*})/);
      if (returnMatch) {
        const sectionJsx = `\n        <section className="py-8">\n          <h2 className="text-2xl font-bold mb-4">${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}</h2>\n          <p className="text-muted-foreground">Content for ${sectionName} section</p>\n        </section>`;
        const modified = file.content.replace(
          returnMatch[0],
          `${returnMatch[1]}${sectionJsx}${returnMatch[2]}`
        );
        if (modified !== file.content) {
          edits.push({
            filePath: file.path,
            editType: 'modify',
            oldContent: file.content,
            newContent: modified,
            description: `Added ${sectionName} section`,
            linesChanged: countChangedLines(file.content, modified),
          });
        }
        break;
      }
    }
  }

  return edits;
}

function generateFeatureEdits(
  message: string,
  targetFiles: { path: string; content: string; language: string; meta: FileMetadata }[],
  allFiles: { path: string; content: string; language: string }[],
  contextManager: ProjectContextManager,
  steps: ThinkingStep[]
): FileEdit[] {
  const edits: FileEdit[] = [];
  const lower = message.toLowerCase();

  const addFieldMatch = lower.match(/add\s+(?:a\s+)?(?:an?\s+)?(\w+)\s*(?:field|column|input)\s*(?:to\s+(?:the\s+)?(\w+))?/);
  if (addFieldMatch) {
    const fieldName = addFieldMatch[1];
    const targetEntity = addFieldMatch[2];
    steps.push({ phase: 'feature', label: `Adding ${fieldName} field`, detail: targetEntity ? `to ${targetEntity}` : undefined });

    const fieldType = inferFieldType(fieldName);

    const schemaFiles = contextManager.getFilesByType('schema');
    for (const sf of schemaFiles) {
      const file = allFiles.find(f => f.path === sf.path);
      if (!file) continue;

      if (targetEntity) {
        const tableMatch = file.content.match(new RegExp(`(\\w+)\\s*=\\s*pgTable\\s*\\(\\s*['"]${escapeRegex(targetEntity)}['"]\\s*,\\s*\\{([\\s\\S]*?)\\}\\s*\\)`, 'i'));
        if (!tableMatch) {
          const altMatch = file.content.match(new RegExp(`(\\w+)\\s*=\\s*pgTable\\s*\\(\\s*['"]\\w*${escapeRegex(targetEntity)}\\w*['"]\\s*,\\s*\\{([\\s\\S]*?)\\}\\s*\\)`, 'i'));
          if (!altMatch) continue;
        }
      }

      const drizzleCol = mapFieldToDrizzle(fieldName, fieldType);
      const lastColMatch = file.content.match(/(\w+:\s*(?:text|integer|boolean|timestamp|serial|varchar|real|numeric|jsonb|uuid)\([^)]*\)[^,\n]*),?\s*(\n\s*\})/);
      if (lastColMatch) {
        const modified = file.content.replace(
          lastColMatch[0],
          `${lastColMatch[1]},\n  ${fieldName}: ${drizzleCol},${lastColMatch[2]}`
        );
        if (modified !== file.content) {
          edits.push({
            filePath: file.path,
            editType: 'modify',
            oldContent: file.content,
            newContent: modified,
            description: `Added ${fieldName} column to schema`,
            linesChanged: countChangedLines(file.content, modified),
          });
          steps.push({ phase: 'cascade', label: 'Schema updated', detail: `Added ${fieldName}: ${fieldType}` });
        }
      }
    }

    for (const file of targetFiles) {
      if (!/\.(tsx|jsx)$/.test(file.path)) continue;
      if (!/<form/i.test(file.content) && !/<Form/i.test(file.content) && !/useForm/.test(file.content)) continue;

      const formFieldJsx = generateFormFieldJsx(fieldName, fieldType);
      const submitBtnMatch = file.content.match(/(\s*<(?:Button|button)[^>]*type\s*=\s*["']submit["'][^>]*>)/);
      if (submitBtnMatch) {
        const modified = file.content.replace(
          submitBtnMatch[0],
          `\n${formFieldJsx}\n${submitBtnMatch[0]}`
        );
        if (modified !== file.content) {
          edits.push({
            filePath: file.path,
            editType: 'modify',
            oldContent: file.content,
            newContent: modified,
            description: `Added ${fieldName} input field to form`,
            linesChanged: countChangedLines(file.content, modified),
          });
        }
      }
    }

    return edits;
  }

  const addButtonMatch = lower.match(/add\s+(?:a\s+)?(?:an?\s+)?(\w+)\s*button/);
  if (addButtonMatch) {
    const buttonLabel = addButtonMatch[1].charAt(0).toUpperCase() + addButtonMatch[1].slice(1);
    for (const file of targetFiles) {
      if (!/\.(tsx|jsx)$/.test(file.path)) continue;
      const closeTagMatch = file.content.match(/(\s*<\/(?:div|section|main|header|footer)>\s*\)\s*;?\s*})/);
      if (closeTagMatch) {
        const buttonJsx = `\n        <Button data-testid="button-${addButtonMatch[1].toLowerCase()}" onClick={() => {}}>${buttonLabel}</Button>`;
        const modified = file.content.replace(
          closeTagMatch[0],
          `${buttonJsx}${closeTagMatch[0]}`
        );
        if (modified !== file.content) {
          const needsImport = !file.content.includes("from '@/components/ui/button'") && !file.content.includes('from "@/components/ui/button"');
          let final = modified;
          if (needsImport) {
            final = `import { Button } from '@/components/ui/button';\n${final}`;
          }
          edits.push({
            filePath: file.path,
            editType: 'modify',
            oldContent: file.content,
            newContent: final,
            description: `Added ${buttonLabel} button`,
            linesChanged: countChangedLines(file.content, final),
          });
          break;
        }
      }
    }
    return edits;
  }

  const addEndpointMatch = lower.match(/add\s+(?:a\s+)?(?:an?\s+)?(get|post|put|patch|delete)\s+(?:endpoint|route|api)\s+(?:for\s+)?(\w+)/i);
  if (addEndpointMatch) {
    const method = addEndpointMatch[1].toLowerCase();
    const resource = addEndpointMatch[2].toLowerCase();
    const routeFiles = contextManager.getFilesByType('api');

    for (const rf of routeFiles) {
      const file = allFiles.find(f => f.path === rf.path);
      if (!file) continue;

      const routeCode = generateRouteTemplate(method, resource);
      const lastRouteMatch = file.content.match(/(app|router)\.(get|post|put|patch|delete)\s*\([^)]+\)\s*;?\s*$/m);
      if (lastRouteMatch) {
        const insertPos = file.content.indexOf(lastRouteMatch[0]) + lastRouteMatch[0].length;
        const modified = file.content.substring(0, insertPos) + '\n\n' + routeCode + file.content.substring(insertPos);
        edits.push({
          filePath: file.path,
          editType: 'modify',
          oldContent: file.content,
          newContent: modified,
          description: `Added ${method.toUpperCase()} /api/${resource} endpoint`,
          linesChanged: countChangedLines(file.content, modified),
        });
      } else {
        const modified = file.content + '\n\n' + routeCode;
        edits.push({
          filePath: file.path,
          editType: 'modify',
          oldContent: file.content,
          newContent: modified,
          description: `Added ${method.toUpperCase()} /api/${resource} endpoint`,
          linesChanged: countChangedLines(file.content, modified),
        });
      }
      break;
    }
    return edits;
  }

  const searchMatch = lower.match(/add\s+(?:a\s+)?(?:an?\s+)?(?:search|filter)(?:\s+(?:to|for|on|in)\s+(?:the\s+)?(\w+))?/);
  if (searchMatch) {
    const targetName = searchMatch[1] || '';
    steps.push({ phase: 'feature', label: 'Adding search/filter', detail: targetName ? `to ${targetName}` : 'to list page' });

    const listFiles = findListPageFiles(targetFiles, allFiles, targetName, contextManager);
    for (const file of listFiles) {
      if (!/\.(tsx|jsx)$/.test(file.path)) continue;
      const result = injectSearchFilter(file.content, file.path);
      if (result.changed) {
        edits.push({
          filePath: file.path,
          editType: 'modify',
          oldContent: file.content,
          newContent: result.content,
          description: `Added search/filter functionality`,
          linesChanged: countChangedLines(file.content, result.content),
        });
        break;
      }
    }
    return edits;
  }

  const paginationMatch = lower.match(/add\s+(?:a\s+)?(?:an?\s+)?pagination(?:\s+(?:to|for|on|in)\s+(?:the\s+)?(\w+))?/);
  if (paginationMatch) {
    const targetName = paginationMatch[1] || '';
    steps.push({ phase: 'feature', label: 'Adding pagination', detail: targetName ? `to ${targetName}` : 'to list page' });

    const listFiles = findListPageFiles(targetFiles, allFiles, targetName, contextManager);
    for (const file of listFiles) {
      if (!/\.(tsx|jsx)$/.test(file.path)) continue;
      const result = injectPagination(file.content, file.path);
      if (result.changed) {
        edits.push({
          filePath: file.path,
          editType: 'modify',
          oldContent: file.content,
          newContent: result.content,
          description: `Added pagination functionality`,
          linesChanged: countChangedLines(file.content, result.content),
        });
        break;
      }
    }
    return edits;
  }

  const sortMatch = lower.match(/add\s+(?:a\s+)?(?:an?\s+)?sort(?:ing)?(?:\s+(?:to|for|on|in)\s+(?:the\s+)?(\w+))?/);
  if (sortMatch) {
    const targetName = sortMatch[1] || '';
    steps.push({ phase: 'feature', label: 'Adding sort', detail: targetName ? `to ${targetName}` : 'to list/table page' });

    const listFiles = findListPageFiles(targetFiles, allFiles, targetName, contextManager);
    for (const file of listFiles) {
      if (!/\.(tsx|jsx)$/.test(file.path)) continue;
      const result = injectSort(file.content, file.path);
      if (result.changed) {
        edits.push({
          filePath: file.path,
          editType: 'modify',
          oldContent: file.content,
          newContent: result.content,
          description: `Added sort functionality`,
          linesChanged: countChangedLines(file.content, result.content),
        });
        break;
      }
    }
    return edits;
  }

  const modalMatch = lower.match(/add\s+(?:a\s+)?(?:an?\s+)?(?:modal|dialog)(?:\s+(?:to|for|on|in)\s+(?:the\s+)?(\w+))?(?:\s+(?:for\s+)?(?:creating|adding|editing|new)\s+(\w+))?/);
  if (modalMatch) {
    const targetPage = modalMatch[1] || '';
    const entityName = modalMatch[2] || '';
    steps.push({ phase: 'feature', label: 'Adding modal/dialog', detail: entityName ? `for ${entityName}` : (targetPage ? `to ${targetPage}` : '') });

    const candidates = targetPage
      ? targetFiles.filter(f => f.path.toLowerCase().includes(targetPage.toLowerCase()) && /\.(tsx|jsx)$/.test(f.path))
      : targetFiles.filter(f => /\.(tsx|jsx)$/.test(f.path));

    if (candidates.length === 0) {
      const pageFiles = contextManager.getFilesByType('page');
      for (const pf of pageFiles) {
        const file = allFiles.find(f => f.path === pf.path);
        if (file) candidates.push({ ...file, meta: pf });
      }
    }

    for (const file of candidates) {
      const result = injectModal(file.content, file.path, entityName);
      if (result.changed) {
        edits.push({
          filePath: file.path,
          editType: 'modify',
          oldContent: file.content,
          newContent: result.content,
          description: `Added modal/dialog${entityName ? ` for ${entityName}` : ''}`,
          linesChanged: countChangedLines(file.content, result.content),
        });
        break;
      }
    }
    return edits;
  }

  const addFormMatch = lower.match(/add\s+(?:a\s+)?(?:an?\s+)?form(?:\s+(?:to|for|on|in)\s+(?:the\s+)?(\w+))?/);
  if (addFormMatch) {
    const targetEntity = addFormMatch[1] || '';
    steps.push({ phase: 'feature', label: 'Adding form', detail: targetEntity ? `for ${targetEntity}` : '' });

    let fields: { name: string; type: string }[] = [];
    if (targetEntity) {
      fields = extractEntityFieldsFromSchema(targetEntity, allFiles, contextManager);
    }
    if (fields.length === 0) {
      fields = [
        { name: 'name', type: 'text' },
        { name: 'description', type: 'textarea' },
      ];
    }

    const candidates = targetFiles.filter(f => /\.(tsx|jsx)$/.test(f.path));
    if (candidates.length === 0) {
      const pageFiles = contextManager.getFilesByType('page');
      for (const pf of pageFiles) {
        const file = allFiles.find(f => f.path === pf.path);
        if (file) candidates.push({ ...file, meta: pf });
      }
    }

    for (const file of candidates) {
      const result = injectForm(file.content, file.path, targetEntity, fields);
      if (result.changed) {
        edits.push({
          filePath: file.path,
          editType: 'modify',
          oldContent: file.content,
          newContent: result.content,
          description: `Added form${targetEntity ? ` for ${targetEntity}` : ''}`,
          linesChanged: countChangedLines(file.content, result.content),
        });
        break;
      }
    }
    return edits;
  }

  const addColumnMatch = lower.match(/add\s+(?:a\s+)?(?:an?\s+)?(\w+)\s*(?:table\s+)?column(?:\s+(?:to|in)\s+(?:the\s+)?(\w+))?/);
  if (addColumnMatch) {
    const columnName = addColumnMatch[1];
    const targetTable = addColumnMatch[2] || '';
    steps.push({ phase: 'feature', label: `Adding ${columnName} column`, detail: targetTable ? `to ${targetTable} table` : 'to table' });

    const tableFiles = targetFiles.filter(f =>
      /\.(tsx|jsx)$/.test(f.path) && (/<table/i.test(f.content) || /<Table/i.test(f.content) || /TableHeader/.test(f.content))
    );

    if (tableFiles.length === 0) {
      for (const file of allFiles) {
        if (/\.(tsx|jsx)$/.test(file.path) && (/<table/i.test(file.content) || /<Table/i.test(file.content) || /TableHeader/.test(file.content))) {
          const meta = contextManager.getFileIndex().get(file.path);
          if (meta) tableFiles.push({ ...file, meta });
        }
      }
    }

    for (const file of tableFiles) {
      const result = injectTableColumn(file.content, columnName);
      if (result.changed) {
        edits.push({
          filePath: file.path,
          editType: 'modify',
          oldContent: file.content,
          newContent: result.content,
          description: `Added ${columnName} column to table`,
          linesChanged: countChangedLines(file.content, result.content),
        });
        break;
      }
    }
    return edits;
  }

  const loadingMatch = lower.match(/add\s+(?:a\s+)?(?:an?\s+)?(?:loading|skeleton|spinner)\s*(?:state)?(?:\s+(?:to|for|on|in)\s+(?:the\s+)?(\w+))?/);
  if (loadingMatch) {
    const targetName = loadingMatch[1] || '';
    steps.push({ phase: 'feature', label: 'Adding loading state', detail: targetName ? `to ${targetName}` : '' });

    const candidates = targetName
      ? targetFiles.filter(f => f.path.toLowerCase().includes(targetName.toLowerCase()) && /\.(tsx|jsx)$/.test(f.path))
      : targetFiles.filter(f => /\.(tsx|jsx)$/.test(f.path));

    for (const file of candidates) {
      if (file.content.includes('useQuery') || file.content.includes('isLoading')) {
        const result = injectLoadingState(file.content, file.path);
        if (result.changed) {
          edits.push({
            filePath: file.path,
            editType: 'modify',
            oldContent: file.content,
            newContent: result.content,
            description: `Added loading state with skeleton/spinner`,
            linesChanged: countChangedLines(file.content, result.content),
          });
          break;
        }
      }
    }
    return edits;
  }

  return edits;
}

function findListPageFiles(
  targetFiles: { path: string; content: string; language: string; meta: FileMetadata }[],
  allFiles: { path: string; content: string; language: string }[],
  targetName: string,
  contextManager: ProjectContextManager
): { path: string; content: string; language: string; meta: FileMetadata }[] {
  const results: { path: string; content: string; language: string; meta: FileMetadata }[] = [];

  const candidates = targetName
    ? targetFiles.filter(f => f.path.toLowerCase().includes(targetName.toLowerCase()) && /\.(tsx|jsx)$/.test(f.path))
    : targetFiles.filter(f => /\.(tsx|jsx)$/.test(f.path));

  for (const c of candidates) {
    if (isListLikePage(c.content)) {
      results.push(c);
    }
  }

  if (results.length === 0) {
    const pageFiles = contextManager.getFilesByType('page');
    for (const pf of pageFiles) {
      if (targetName && !pf.path.toLowerCase().includes(targetName.toLowerCase())) continue;
      const file = allFiles.find(f => f.path === pf.path);
      if (file && isListLikePage(file.content)) {
        results.push({ ...file, meta: pf });
      }
    }
  }

  if (results.length === 0 && candidates.length > 0) {
    results.push(candidates[0]);
  }

  return results;
}

function isListLikePage(content: string): boolean {
  return /\.map\s*\(/.test(content) ||
    /useQuery/.test(content) ||
    /<table/i.test(content) ||
    /<Table/.test(content) ||
    /\bdata\b.*\.map/.test(content) ||
    /items.*\.map/.test(content);
}

function injectSearchFilter(content: string, filePath: string): { content: string; changed: boolean } {
  if (content.includes('searchQuery') || content.includes('searchTerm') || content.includes('filterText')) {
    return { content, changed: false };
  }

  let modified = content;

  const stateHook = `\n  const [searchQuery, setSearchQuery] = useState("");\n`;
  const searchInput = `\n        <div className="mb-4">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-sm rounded-md border px-3 py-2"
            data-testid="input-search"
          />
        </div>\n`;

  const hookInsertMatch = modified.match(/((?:const|let)\s+\[?\w+.*?=\s*use(?:Query|State|Effect)\s*[(<])/);
  const returnMatch = modified.match(/return\s*\(\s*\n?\s*(<\w+)/);

  if (!returnMatch) return { content, changed: false };

  if (hookInsertMatch) {
    const insertIdx = modified.indexOf(hookInsertMatch[0]);
    modified = modified.substring(0, insertIdx) + stateHook + modified.substring(insertIdx);
  } else {
    const returnIdx = modified.indexOf(returnMatch[0]);
    modified = modified.substring(0, returnIdx) + stateHook + '\n' + modified.substring(returnIdx);
  }

  const returnMatchAfter = modified.match(/return\s*\(\s*\n?\s*(<\w+[^>]*>)/);
  if (returnMatchAfter) {
    const tagEnd = modified.indexOf(returnMatchAfter[1]) + returnMatchAfter[1].length;
    modified = modified.substring(0, tagEnd) + searchInput + modified.substring(tagEnd);
  }

  const mapMatch = modified.match(/(\w+)\.map\s*\(/);
  if (mapMatch) {
    const dataVar = mapMatch[1];
    const filteredVar = `filtered${dataVar.charAt(0).toUpperCase() + dataVar.slice(1)}`;
    const filterLogic = `\n  const ${filteredVar} = ${dataVar}?.filter((item: any) => {\n    if (!searchQuery) return true;\n    const q = searchQuery.toLowerCase();\n    return Object.values(item).some((val) => String(val).toLowerCase().includes(q));\n  }) ?? [];\n`;

    const mapIdx = modified.indexOf(mapMatch[0]);
    const returnIdx = modified.indexOf('return');
    if (returnIdx > -1 && returnIdx < mapIdx) {
      modified = modified.substring(0, returnIdx) + filterLogic + modified.substring(returnIdx);
    }
    modified = modified.replace(new RegExp(`${escapeRegex(dataVar)}\\.map\\s*\\(`, 'g'), `${filteredVar}.map(`);
  }

  if (!modified.includes("import { useState")) {
    if (!modified.includes("useState")) {
      const firstImport = modified.match(/^import\s+/m);
      if (firstImport) {
        modified = `import { useState } from 'react';\n` + modified;
      }
    }
  }

  return { content: modified, changed: modified !== content };
}

function injectPagination(content: string, filePath: string): { content: string; changed: boolean } {
  if (content.includes('currentPage') || content.includes('pageSize') || content.includes('pagination')) {
    return { content, changed: false };
  }

  let modified = content;

  const stateHook = `\n  const [currentPage, setCurrentPage] = useState(1);\n  const pageSize = 10;\n`;

  const paginationControls = `\n        <div className="flex items-center justify-between gap-2 mt-4">
          <span className="text-sm text-muted-foreground" data-testid="text-page-info">
            Page {currentPage}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
              data-testid="button-prev-page"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              className="rounded-md border px-3 py-1 text-sm"
              data-testid="button-next-page"
            >
              Next
            </button>
          </div>
        </div>\n`;

  const hookInsertMatch = modified.match(/((?:const|let)\s+\[?\w+.*?=\s*use(?:Query|State|Effect)\s*[(<])/);
  const returnMatch = modified.match(/return\s*\(\s*\n?\s*(<\w+)/);

  if (!returnMatch) return { content, changed: false };

  if (hookInsertMatch) {
    const insertIdx = modified.indexOf(hookInsertMatch[0]);
    modified = modified.substring(0, insertIdx) + stateHook + modified.substring(insertIdx);
  } else {
    const returnIdx = modified.indexOf(returnMatch[0]);
    modified = modified.substring(0, returnIdx) + stateHook + '\n' + modified.substring(returnIdx);
  }

  const mapMatch = modified.match(/(\w+)\.map\s*\(/);
  if (mapMatch) {
    const dataVar = mapMatch[1];
    const paginatedVar = `paginated${dataVar.charAt(0).toUpperCase() + dataVar.slice(1)}`;
    const paginateLogic = `\n  const ${paginatedVar} = (${dataVar} ?? []).slice((currentPage - 1) * pageSize, currentPage * pageSize);\n`;

    const returnIdx = modified.indexOf('return');
    if (returnIdx > -1) {
      modified = modified.substring(0, returnIdx) + paginateLogic + modified.substring(returnIdx);
    }
    modified = modified.replace(new RegExp(`${escapeRegex(dataVar)}\\.map\\s*\\(`, 'g'), `${paginatedVar}.map(`);
  }

  const lastCloseDiv = modified.lastIndexOf('</div>');
  if (lastCloseDiv > -1) {
    const secondLastClose = modified.lastIndexOf('</div>', lastCloseDiv - 1);
    if (secondLastClose > -1) {
      modified = modified.substring(0, secondLastClose) + paginationControls + modified.substring(secondLastClose);
    } else {
      modified = modified.substring(0, lastCloseDiv) + paginationControls + modified.substring(lastCloseDiv);
    }
  }

  if (!modified.includes("import { useState")) {
    if (!modified.includes("useState")) {
      const firstImport = modified.match(/^import\s+/m);
      if (firstImport) {
        modified = `import { useState } from 'react';\n` + modified;
      }
    }
  }

  return { content: modified, changed: modified !== content };
}

function injectSort(content: string, filePath: string): { content: string; changed: boolean } {
  if (content.includes('sortField') || content.includes('sortKey') || content.includes('sortColumn')) {
    return { content, changed: false };
  }

  let modified = content;

  const stateHook = `\n  const [sortField, setSortField] = useState<string>("");\n  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");\n\n  const handleSort = (field: string) => {\n    if (sortField === field) {\n      setSortDirection(sortDirection === "asc" ? "desc" : "asc");\n    } else {\n      setSortField(field);\n      setSortDirection("asc");\n    }\n  };\n`;

  const hookInsertMatch = modified.match(/((?:const|let)\s+\[?\w+.*?=\s*use(?:Query|State|Effect)\s*[(<])/);
  const returnMatch = modified.match(/return\s*\(\s*\n?\s*(<\w+)/);

  if (!returnMatch) return { content, changed: false };

  if (hookInsertMatch) {
    const insertIdx = modified.indexOf(hookInsertMatch[0]);
    modified = modified.substring(0, insertIdx) + stateHook + modified.substring(insertIdx);
  } else {
    const returnIdx = modified.indexOf(returnMatch[0]);
    modified = modified.substring(0, returnIdx) + stateHook + '\n' + modified.substring(returnIdx);
  }

  const mapMatch = modified.match(/(\w+)\.map\s*\(/);
  if (mapMatch) {
    const dataVar = mapMatch[1];
    const sortedVar = `sorted${dataVar.charAt(0).toUpperCase() + dataVar.slice(1)}`;
    const sortLogic = `\n  const ${sortedVar} = [...(${dataVar} ?? [])].sort((a: any, b: any) => {\n    if (!sortField) return 0;\n    const aVal = a[sortField] ?? "";\n    const bVal = b[sortField] ?? "";\n    const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });\n    return sortDirection === "asc" ? cmp : -cmp;\n  });\n`;

    const returnIdx = modified.indexOf('return');
    if (returnIdx > -1) {
      modified = modified.substring(0, returnIdx) + sortLogic + modified.substring(returnIdx);
    }
    modified = modified.replace(new RegExp(`${escapeRegex(dataVar)}\\.map\\s*\\(`, 'g'), `${sortedVar}.map(`);
  }

  const thMatch = modified.match(/<(?:th|TableHead)[^>]*>(\w+)<\/(?:th|TableHead)>/);
  if (thMatch) {
    const headerText = thMatch[1];
    const sortableHeader = `<th className="cursor-pointer select-none" onClick={() => handleSort("${headerText.toLowerCase()}")} data-testid="button-sort-${headerText.toLowerCase()}">${headerText} {sortField === "${headerText.toLowerCase()}" ? (sortDirection === "asc" ? " \\u2191" : " \\u2193") : ""}</th>`;
    modified = modified.replace(thMatch[0], sortableHeader);
  }

  if (!modified.includes("import { useState")) {
    if (!modified.includes("useState")) {
      const firstImport = modified.match(/^import\s+/m);
      if (firstImport) {
        modified = `import { useState } from 'react';\n` + modified;
      }
    }
  }

  return { content: modified, changed: modified !== content };
}

function injectModal(content: string, filePath: string, entityName: string): { content: string; changed: boolean } {
  if (content.includes('isDialogOpen') || content.includes('isModalOpen') || content.includes('showDialog') || content.includes('showModal')) {
    return { content, changed: false };
  }

  let modified = content;
  const label = entityName
    ? entityName.charAt(0).toUpperCase() + entityName.slice(1)
    : 'Item';

  const stateHook = `\n  const [isDialogOpen, setIsDialogOpen] = useState(false);\n`;

  const dialogImport = `import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';\n`;

  const triggerButton = `\n        <Button onClick={() => setIsDialogOpen(true)} data-testid="button-open-dialog">Add ${label}</Button>\n`;

  const dialogJsx = `\n        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle data-testid="text-dialog-title">Add ${label}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <input type="text" className="w-full rounded-md border px-3 py-2" data-testid="input-dialog-name" placeholder="${label} name" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-dialog-cancel">Cancel</Button>
                <Button onClick={() => setIsDialogOpen(false)} data-testid="button-dialog-submit">Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>\n`;

  const hookInsertMatch = modified.match(/((?:const|let)\s+\[?\w+.*?=\s*use(?:Query|State|Effect)\s*[(<])/);
  const returnMatch = modified.match(/return\s*\(\s*\n?\s*(<\w+[^>]*>)/);

  if (!returnMatch) return { content, changed: false };

  if (hookInsertMatch) {
    const insertIdx = modified.indexOf(hookInsertMatch[0]);
    modified = modified.substring(0, insertIdx) + stateHook + modified.substring(insertIdx);
  } else {
    const returnIdx = modified.indexOf(returnMatch[0]);
    modified = modified.substring(0, returnIdx) + stateHook + '\n' + modified.substring(returnIdx);
  }

  const returnMatchAfter = modified.match(/return\s*\(\s*\n?\s*(<\w+[^>]*>)/);
  if (returnMatchAfter) {
    const tagEnd = modified.indexOf(returnMatchAfter[1]) + returnMatchAfter[1].length;
    modified = modified.substring(0, tagEnd) + triggerButton + dialogJsx + modified.substring(tagEnd);
  }

  if (!modified.includes("from '@/components/ui/dialog'") && !modified.includes('from "@/components/ui/dialog"')) {
    const firstImport = modified.match(/^import\s+/m);
    if (firstImport) {
      modified = dialogImport + modified;
    }
  }

  if (!modified.includes("import { Button")) {
    if (!modified.includes("from '@/components/ui/button'") && !modified.includes('from "@/components/ui/button"')) {
      modified = `import { Button } from '@/components/ui/button';\n` + modified;
    }
  }

  if (!modified.includes("import { useState")) {
    if (!modified.includes("useState")) {
      modified = `import { useState } from 'react';\n` + modified;
    }
  }

  return { content: modified, changed: modified !== content };
}

function injectForm(
  content: string,
  filePath: string,
  entityName: string,
  fields: { name: string; type: string }[]
): { content: string; changed: boolean } {
  const label = entityName
    ? entityName.charAt(0).toUpperCase() + entityName.slice(1)
    : 'New Item';

  const fieldInputs = fields.map(f => {
    const fieldLabel = f.name.charAt(0).toUpperCase() + f.name.slice(1).replace(/([A-Z])/g, ' $1');
    if (f.type === 'boolean') {
      return `            <div className="flex items-center gap-2">
              <input type="checkbox" id="${f.name}" name="${f.name}" data-testid="input-${f.name}" />
              <label htmlFor="${f.name}">${fieldLabel}</label>
            </div>`;
    }
    if (f.type === 'textarea') {
      return `            <div className="space-y-2">
              <label htmlFor="${f.name}" className="text-sm font-medium">${fieldLabel}</label>
              <textarea id="${f.name}" name="${f.name}" className="w-full min-h-[80px] rounded-md border px-3 py-2" data-testid="input-${f.name}" />
            </div>`;
    }
    const inputType = f.type === 'email' ? 'email' : f.type === 'password' ? 'password' : f.type === 'integer' || f.type === 'money' ? 'number' : 'text';
    return `            <div className="space-y-2">
              <label htmlFor="${f.name}" className="text-sm font-medium">${fieldLabel}</label>
              <input type="${inputType}" id="${f.name}" name="${f.name}" className="w-full rounded-md border px-3 py-2" data-testid="input-${f.name}" />
            </div>`;
  }).join('\n');

  const formJsx = `\n        <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-4" data-testid="form-${entityName || 'item'}">
          <h3 className="text-lg font-semibold">${label}</h3>
${fieldInputs}
            <Button type="submit" data-testid="button-submit">Save ${label}</Button>
        </form>\n`;

  let modified = content;
  const returnMatch = modified.match(/return\s*\(\s*\n?\s*(<\w+[^>]*>)/);
  if (!returnMatch) return { content, changed: false };

  const tagEnd = modified.indexOf(returnMatch[1]) + returnMatch[1].length;
  modified = modified.substring(0, tagEnd) + formJsx + modified.substring(tagEnd);

  if (!modified.includes("import { Button")) {
    if (!modified.includes("from '@/components/ui/button'") && !modified.includes('from "@/components/ui/button"')) {
      modified = `import { Button } from '@/components/ui/button';\n` + modified;
    }
  }

  return { content: modified, changed: modified !== content };
}

function injectTableColumn(content: string, columnName: string): { content: string; changed: boolean } {
  let modified = content;
  const label = columnName.charAt(0).toUpperCase() + columnName.slice(1).replace(/([A-Z])/g, ' $1');

  const headerMatch = modified.match(/(<\/(?:th|TableHead)>)(\s*\n?\s*<\/(?:tr|TableRow)>\s*\n?\s*<\/(?:thead|TableHeader)>)/);
  if (headerMatch) {
    const newHeader = `<th data-testid="text-header-${columnName}">${label}</th>`;
    modified = modified.replace(
      headerMatch[0],
      `${headerMatch[1]}\n              ${newHeader}${headerMatch[2]}`
    );
  } else {
    const altHeaderMatch = modified.match(/(<(?:th|TableHead)[^>]*>[^<]*<\/(?:th|TableHead)>)(\s*\n?\s*<\/(?:tr|TableRow)>)/);
    if (altHeaderMatch) {
      const newHeader = `<th data-testid="text-header-${columnName}">${label}</th>`;
      modified = modified.replace(
        altHeaderMatch[0],
        `${altHeaderMatch[1]}\n              ${newHeader}${altHeaderMatch[2]}`
      );
    }
  }

  const rowMatch = modified.match(/(<\/(?:td|TableCell)>)(\s*\n?\s*<\/(?:tr|TableRow)>(?![\s\S]*<\/(?:thead|TableHeader)>))/);
  if (rowMatch) {
    const itemVarMatch = modified.match(/(\w+)\.map\s*\(\s*\(?\s*(\w+)/);
    const itemVar = itemVarMatch ? itemVarMatch[2] : 'item';
    const newCell = `<td data-testid="text-${columnName}">{${itemVar}.${columnName}}</td>`;
    modified = modified.replace(
      rowMatch[0],
      `${rowMatch[1]}\n              ${newCell}${rowMatch[2]}`
    );
  }

  return { content: modified, changed: modified !== content };
}

function injectLoadingState(content: string, filePath: string): { content: string; changed: boolean } {
  if (content.includes('isLoading') && (content.includes('Skeleton') || content.includes('spinner') || content.includes('Loading...'))) {
    return { content, changed: false };
  }

  let modified = content;

  const queryMatch = modified.match(/(?:const\s+\{[^}]*)\bdata\b([^}]*)\}\s*=\s*useQuery/);
  if (queryMatch && !queryMatch[0].includes('isLoading')) {
    modified = modified.replace(
      queryMatch[0],
      queryMatch[0].replace('data', 'data, isLoading')
    );
  }

  const returnMatch = modified.match(/return\s*\(\s*\n?\s*(<\w+[^>]*>)/);
  if (returnMatch && modified.includes('isLoading')) {
    const returnIdx = modified.indexOf(returnMatch[0]);
    const loadingCheck = `\n  if (isLoading) {\n    return (\n      <div className="flex items-center justify-center p-8" data-testid="status-loading">\n        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />\n        <span className="ml-2 text-muted-foreground">Loading...</span>\n      </div>\n    );\n  }\n`;
    modified = modified.substring(0, returnIdx) + loadingCheck + '\n' + modified.substring(returnIdx);
  }

  return { content: modified, changed: modified !== content };
}

function extractEntityFieldsFromSchema(
  entityName: string,
  allFiles: { path: string; content: string; language: string }[],
  contextManager: ProjectContextManager
): { name: string; type: string }[] {
  const fields: { name: string; type: string }[] = [];
  const schemaFiles = contextManager.getFilesByType('schema');

  for (const sf of schemaFiles) {
    const file = allFiles.find(f => f.path === sf.path);
    if (!file) continue;

    const tableRegex = new RegExp(
      `\\w+\\s*=\\s*pgTable\\s*\\(\\s*['"]\\w*${escapeRegex(entityName)}\\w*['"]\\s*,\\s*\\{([\\s\\S]*?)\\}\\s*\\)`,
      'i'
    );
    const tableMatch = file.content.match(tableRegex);
    if (!tableMatch) continue;

    const columnsBlock = tableMatch[1];
    const columnRegex = /(\w+)\s*:\s*(text|integer|boolean|timestamp|serial|varchar|real|numeric|jsonb|uuid)\(/g;
    let colMatch;
    while ((colMatch = columnRegex.exec(columnsBlock)) !== null) {
      const colName = colMatch[1];
      const colType = colMatch[2];
      if (colName === 'id') continue;
      let fieldType = 'text';
      if (colType === 'integer' || colType === 'serial') fieldType = 'integer';
      else if (colType === 'boolean') fieldType = 'boolean';
      else if (colType === 'timestamp') fieldType = 'date';
      else if (colType === 'real' || colType === 'numeric') fieldType = 'money';
      else fieldType = inferFieldType(colName);
      fields.push({ name: colName, type: fieldType });
    }
  }

  return fields;
}

function generateFixEdits(
  message: string,
  targetFiles: { path: string; content: string; language: string; meta: FileMetadata }[],
  allFiles: { path: string; content: string; language: string }[],
  contextManager: ProjectContextManager,
  steps: ThinkingStep[]
): FileEdit[] {
  const edits: FileEdit[] = [];
  const lower = message.toLowerCase();

  const importErrorMatch = lower.match(/(?:cannot find|missing|broken)\s+(?:module|import)\s+['"]?([^'"]+)['"]?/);
  if (importErrorMatch) {
    const missingModule = importErrorMatch[1];
    steps.push({ phase: 'fix', label: 'Import fix', detail: `Looking for "${missingModule}"` });

    for (const file of targetFiles) {
      if (!/\.(tsx?|jsx?)$/.test(file.path)) continue;
      const importRegex = new RegExp(`import\\s+.*?from\\s+['"]([^'"]*${escapeRegex(missingModule)}[^'"]*)['"]`);
      const match = file.content.match(importRegex);
      if (match) {
        const wrongPath = match[1];
        const correctFile = allFiles.find(f => {
          const fName = f.path.split('/').pop()?.replace(/\.\w+$/, '') || '';
          return fName.toLowerCase() === missingModule.toLowerCase().replace(/\.\w+$/, '');
        });

        if (correctFile) {
          const correctPath = getRelativePath(file.path, correctFile.path);
          const modified = file.content.replace(wrongPath, correctPath);
          if (modified !== file.content) {
            edits.push({
              filePath: file.path,
              editType: 'modify',
              oldContent: file.content,
              newContent: modified,
              description: `Fixed import path: "${wrongPath}" → "${correctPath}"`,
              linesChanged: 1,
            });
          }
        }
      }
    }
    return edits;
  }

  for (const file of targetFiles) {
    if (!/\.(tsx?|jsx?)$/.test(file.path)) continue;
    let modified = file.content;
    let fixCount = 0;
    const descriptions: string[] = [];

    const openBraces = (modified.match(/\{/g) || []).length;
    const closeBraces = (modified.match(/\}/g) || []).length;
    if (openBraces > closeBraces) {
      modified += '\n' + '}'.repeat(openBraces - closeBraces);
      fixCount += openBraces - closeBraces;
      descriptions.push(`Added ${openBraces - closeBraces} missing closing brace(s)`);
    }

    const openParens = (modified.match(/\(/g) || []).length;
    const closeParens = (modified.match(/\)/g) || []).length;
    if (openParens > closeParens) {
      modified += ')'.repeat(openParens - closeParens);
      fixCount += openParens - closeParens;
      descriptions.push(`Added ${openParens - closeParens} missing closing paren(s)`);
    }

    const unusedImportLines = modified.match(/import\s+.*?from\s+['"]([^'"]+)['"]\s*;?\n/g);
    if (unusedImportLines) {
      for (const impLine of unusedImportLines) {
        const nameMatch = impLine.match(/import\s+(?:type\s+)?(?:\{([^}]+)\}|(\w+))\s+from/);
        if (nameMatch) {
          const names = (nameMatch[1] || nameMatch[2] || '').split(',').map(n => n.trim().replace(/\s+as\s+\w+/, ''));
          const rest = modified.replace(impLine, '');
          const allUnused = names.every(n => {
            if (!n) return true;
            const usageRegex = new RegExp(`\\b${escapeRegex(n)}\\b`);
            return !usageRegex.test(rest);
          });
          if (allUnused && names.length > 0 && names[0]) {
            // Don't remove side-effect imports or common needed ones
          }
        }
      }
    }

    if (modified !== file.content) {
      edits.push({
        filePath: file.path,
        editType: 'modify',
        oldContent: file.content,
        newContent: modified,
        description: descriptions.join('; ') || 'Applied syntax fixes',
        linesChanged: countChangedLines(file.content, modified),
      });
    }
  }

  return edits;
}

function generateRefactorEdits(
  message: string,
  targetFiles: { path: string; content: string; language: string; meta: FileMetadata }[],
  allFiles: { path: string; content: string; language: string }[],
  steps: ThinkingStep[]
): FileEdit[] {
  const edits: FileEdit[] = [];
  const lower = message.toLowerCase();

  const renameMatch = lower.match(/rename\s+(?:the\s+)?(?:component\s+)?(\w+)\s+to\s+(\w+)/);
  if (renameMatch) {
    const oldName = renameMatch[1];
    const newName = renameMatch[2];
    const oldNameCapitalized = oldName.charAt(0).toUpperCase() + oldName.slice(1);
    const newNameCapitalized = newName.charAt(0).toUpperCase() + newName.slice(1);

    steps.push({ phase: 'refactor', label: `Renaming ${oldNameCapitalized} → ${newNameCapitalized}` });

    for (const file of allFiles) {
      if (!/\.(tsx?|jsx?|css)$/.test(file.path)) continue;
      if (!file.content.includes(oldNameCapitalized) && !file.content.includes(oldName)) continue;

      let modified = file.content;
      modified = modified.split(oldNameCapitalized).join(newNameCapitalized);

      const oldFilePart = oldName.toLowerCase();
      const newFilePart = newName.toLowerCase();
      modified = modified.replace(
        new RegExp(`(['"/])([^'"]*?)${escapeRegex(oldFilePart)}([^'"]*?)(['"])`, 'g'),
        `$1$2${newFilePart}$3$4`
      );

      if (modified !== file.content) {
        let newPath = file.path;
        if (file.path.toLowerCase().includes(oldFilePart)) {
          newPath = file.path.replace(new RegExp(escapeRegex(oldFilePart), 'i'), newFilePart);
        }

        if (newPath !== file.path) {
          edits.push({
            filePath: file.path,
            editType: 'delete',
            newContent: '',
            description: `Removed old file ${file.path}`,
            linesChanged: file.content.split('\n').length,
          });
          edits.push({
            filePath: newPath,
            editType: 'create',
            newContent: modified,
            description: `Created renamed file ${newPath}`,
            linesChanged: modified.split('\n').length,
          });
        } else {
          edits.push({
            filePath: file.path,
            editType: 'modify',
            oldContent: file.content,
            newContent: modified,
            description: `Renamed ${oldNameCapitalized} to ${newNameCapitalized}`,
            linesChanged: countChangedLines(file.content, modified),
          });
        }
      }
    }
  }

  return edits;
}

function detectAddedSchemaFields(edit: FileEdit): { entityName: string; fieldName: string; fieldType: string }[] {
  if (!edit.oldContent || !edit.newContent) return [];
  const oldLines = new Set(edit.oldContent.split('\n').map(l => l.trim()));
  const newLines = edit.newContent.split('\n');
  const added: { entityName: string; fieldName: string; fieldType: string }[] = [];

  let currentEntity = '';
  for (const line of newLines) {
    const trimmed = line.trim();
    const tableMatch = trimmed.match(/\w+\s*=\s*pgTable\s*\(\s*['"](\w+)['"]/);
    if (tableMatch) {
      currentEntity = tableMatch[1];
    }
    if (!oldLines.has(trimmed) && currentEntity) {
      const colMatch = trimmed.match(/^(\w+)\s*:\s*(text|integer|boolean|timestamp|serial|varchar|real|numeric|jsonb|uuid|pgEnum)\(/);
      if (colMatch) {
        const fieldName = colMatch[1];
        const drizzleType = colMatch[2];
        let fieldType = 'text';
        if (drizzleType === 'integer' || drizzleType === 'serial') fieldType = 'integer';
        else if (drizzleType === 'boolean') fieldType = 'boolean';
        else if (drizzleType === 'timestamp') fieldType = 'date';
        else if (drizzleType === 'real' || drizzleType === 'numeric') fieldType = 'money';
        else fieldType = inferFieldType(fieldName);
        added.push({ entityName: currentEntity, fieldName, fieldType });
      }
    }
  }
  return added;
}

function cascadeFieldToRoutes(
  fieldName: string,
  entityName: string,
  allFiles: { path: string; content: string; language: string }[],
  contextManager: ProjectContextManager,
  editedPaths: Set<string>,
  steps: ThinkingStep[]
): FileEdit[] {
  const edits: FileEdit[] = [];
  const apiFiles = contextManager.getFilesByType('api');
  const routeFiles = apiFiles.length > 0
    ? apiFiles
    : allFiles.filter(f => /routes?\.ts/.test(f.path)).map(f => {
        const meta = contextManager.getFileIndex().get(f.path);
        return meta ? { ...meta, path: f.path } : null;
      }).filter(Boolean) as any[];

  for (const rf of routeFiles) {
    if (editedPaths.has(rf.path)) continue;
    const file = allFiles.find(f => f.path === rf.path);
    if (!file) continue;

    const entityLower = entityName.toLowerCase();
    const entityPattern = new RegExp(
      `(app|router)\\.(post|put|patch)\\s*\\(\\s*['"][^'"]*${escapeRegex(entityLower)}[^'"]*['"]\\s*,\\s*async\\s*\\(\\s*req\\s*,\\s*res\\s*\\)\\s*=>\\s*\\{([\\s\\S]*?)\\}\\s*\\)`,
      'gi'
    );

    let modified = file.content;
    let changed = false;

    const reqBodyMatch = modified.match(new RegExp(
      `(const\\s+(?:\\{[^}]*)(\\}\\s*=\\s*req\\.body))`,
      'g'
    ));
    if (reqBodyMatch) {
      for (const rbm of reqBodyMatch) {
        const contextArea = modified.substring(
          Math.max(0, modified.indexOf(rbm) - 200),
          modified.indexOf(rbm) + rbm.length + 200
        );
        if (contextArea.toLowerCase().includes(entityLower)) {
          if (!rbm.includes(fieldName)) {
            const destructEnd = rbm.indexOf('}');
            if (destructEnd > -1) {
              const newDestructure = rbm.substring(0, destructEnd) + `, ${fieldName} ` + rbm.substring(destructEnd);
              modified = modified.replace(rbm, newDestructure);
              changed = true;
            }
          }
        }
      }
    }

    const createCallMatch = modified.match(new RegExp(
      `(create\\w*${escapeRegex(entityName)}\\w*\\s*\\(\\s*\\{)([^}]*)(\\})`,
      'i'
    ));
    if (createCallMatch && !createCallMatch[2].includes(fieldName)) {
      const existingFields = createCallMatch[2].trim();
      const separator = existingFields.endsWith(',') ? ' ' : ', ';
      const newFields = existingFields + separator + fieldName;
      modified = modified.replace(createCallMatch[0], `${createCallMatch[1]}${newFields}${createCallMatch[3]}`);
      changed = true;
    }

    const updateCallMatch = modified.match(new RegExp(
      `(update\\w*${escapeRegex(entityName)}\\w*\\s*\\(\\s*\\w+\\s*,\\s*\\{)([^}]*)(\\})`,
      'i'
    ));
    if (updateCallMatch && !updateCallMatch[2].includes(fieldName)) {
      const existingFields = updateCallMatch[2].trim();
      const separator = existingFields.endsWith(',') ? ' ' : ', ';
      const newFields = existingFields + separator + fieldName;
      modified = modified.replace(updateCallMatch[0], `${updateCallMatch[1]}${newFields}${updateCallMatch[3]}`);
      changed = true;
    }

    if (changed && modified !== file.content) {
      edits.push({
        filePath: file.path,
        editType: 'modify',
        oldContent: file.content,
        newContent: modified,
        description: `Cascaded ${fieldName} field to route handlers for ${entityName}`,
        linesChanged: countChangedLines(file.content, modified),
      });
      editedPaths.add(file.path);
      steps.push({ phase: 'cascade', label: 'Route handler updated', detail: `Added ${fieldName} to ${rf.path}` });
    }
  }
  return edits;
}

function cascadeFieldToDisplay(
  fieldName: string,
  entityName: string,
  allFiles: { path: string; content: string; language: string }[],
  contextManager: ProjectContextManager,
  editedPaths: Set<string>,
  steps: ThinkingStep[]
): FileEdit[] {
  const edits: FileEdit[] = [];
  const entityLower = entityName.toLowerCase();
  const pageFiles = contextManager.getFilesByType('page');
  const componentFiles = contextManager.getFilesByType('component');
  const displayFiles = [...pageFiles, ...componentFiles];

  for (const df of displayFiles) {
    if (editedPaths.has(df.path)) continue;
    const file = allFiles.find(f => f.path === df.path);
    if (!file) continue;
    if (!/\.(tsx|jsx)$/.test(file.path)) continue;

    const contentLower = file.content.toLowerCase();
    const mentionsEntity = contentLower.includes(entityLower) ||
      contentLower.includes(entityLower + 's') ||
      file.path.toLowerCase().includes(entityLower);

    if (!mentionsEntity) continue;

    const hasTable = /<table/i.test(file.content) || /<Table/.test(file.content) || /TableHeader/.test(file.content);
    const hasCardGrid = /\.map\s*\(/.test(file.content) && /<Card/.test(file.content);
    const hasList = /\.map\s*\(/.test(file.content);

    if (!hasTable && !hasCardGrid && !hasList) continue;

    let modified = file.content;
    let changed = false;

    if (hasTable) {
      const result = injectTableColumn(modified, fieldName);
      if (result.changed) {
        modified = result.content;
        changed = true;
      }
    } else if (hasCardGrid || hasList) {
      const itemVarMatch = modified.match(/(\w+)\.map\s*\(\s*\(?\s*(\w+)/);
      if (itemVarMatch) {
        const itemVar = itemVarMatch[2];
        const label = fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1');

        const cardContentClose = modified.match(new RegExp(`(\\{${escapeRegex(itemVar)}\\.\\w+\\}[^]*?)(</(?:CardContent|CardDescription|p|span)>)`, 's'));
        if (cardContentClose) {
          const insertPoint = modified.indexOf(cardContentClose[2], modified.indexOf(cardContentClose[1]));
          if (insertPoint > -1) {
            const fieldDisplay = `\n              <p className="text-sm text-muted-foreground" data-testid="text-${fieldName}"><span className="font-medium">${label}:</span> {${itemVar}.${fieldName}}</p>\n              `;
            modified = modified.substring(0, insertPoint) + fieldDisplay + modified.substring(insertPoint);
            changed = true;
          }
        }

        if (!changed) {
          const closingAfterField = modified.match(new RegExp(`(\\{${escapeRegex(itemVar)}\\.\\w+\\})([^{]*?)(</)`));
          if (closingAfterField) {
            const idx = modified.indexOf(closingAfterField[0]);
            if (idx > -1) {
              const afterFirstField = idx + closingAfterField[1].length;
              const fieldDisplay = `\n                <span className="text-sm text-muted-foreground" data-testid="text-${fieldName}">{${itemVar}.${fieldName}}</span>`;
              modified = modified.substring(0, afterFirstField) + fieldDisplay + modified.substring(afterFirstField);
              changed = true;
            }
          }
        }
      }
    }

    if (changed && modified !== file.content) {
      edits.push({
        filePath: file.path,
        editType: 'modify',
        oldContent: file.content,
        newContent: modified,
        description: `Cascaded ${fieldName} field to display in ${file.path}`,
        linesChanged: countChangedLines(file.content, modified),
      });
      editedPaths.add(file.path);
      steps.push({ phase: 'cascade', label: 'Display updated', detail: `Added ${fieldName} to ${file.path}` });
    }
  }
  return edits;
}

function cascadeFieldToTypes(
  fieldName: string,
  fieldType: string,
  entityName: string,
  allFiles: { path: string; content: string; language: string }[],
  editedPaths: Set<string>,
  steps: ThinkingStep[]
): FileEdit[] {
  const edits: FileEdit[] = [];
  const tsType = fieldType === 'integer' || fieldType === 'money' ? 'number'
    : fieldType === 'boolean' ? 'boolean'
    : fieldType === 'date' ? 'string'
    : 'string';

  for (const file of allFiles) {
    if (editedPaths.has(file.path)) continue;
    if (!/\.(ts|tsx)$/.test(file.path)) continue;
    if (!/shared|types|models|interfaces/i.test(file.path)) continue;

    const interfacePattern = new RegExp(
      `((?:export\\s+)?(?:interface|type)\\s+\\w*${escapeRegex(entityName)}\\w*\\s*(?:=\\s*)?\\{)([^}]*)(\\})`,
      'i'
    );
    const ifMatch = file.content.match(interfacePattern);
    if (!ifMatch) continue;
    if (ifMatch[2].includes(fieldName)) continue;

    const existingFields = ifMatch[2].trimEnd();
    const semicolonStyle = existingFields.includes(';');
    const separator = semicolonStyle ? ';' : ',';
    const newField = `\n  ${fieldName}${semicolonStyle ? '?' : '?'}: ${tsType}${separator}`;
    const modified = file.content.replace(ifMatch[0], `${ifMatch[1]}${existingFields}${newField}\n${ifMatch[3]}`);

    if (modified !== file.content) {
      edits.push({
        filePath: file.path,
        editType: 'modify',
        oldContent: file.content,
        newContent: modified,
        description: `Cascaded ${fieldName} field to type definition in ${file.path}`,
        linesChanged: countChangedLines(file.content, modified),
      });
      editedPaths.add(file.path);
      steps.push({ phase: 'cascade', label: 'Type definition updated', detail: `Added ${fieldName}: ${tsType} to ${file.path}` });
    }
  }
  return edits;
}

function cascadeFieldToForms(
  fieldName: string,
  fieldType: string,
  entityName: string,
  allFiles: { path: string; content: string; language: string }[],
  contextManager: ProjectContextManager,
  editedPaths: Set<string>,
  steps: ThinkingStep[]
): FileEdit[] {
  const edits: FileEdit[] = [];
  const entityLower = entityName.toLowerCase();
  const pageFiles = contextManager.getFilesByType('page');
  const componentFiles = contextManager.getFilesByType('component');
  const candidates = [...pageFiles, ...componentFiles];

  for (const cf of candidates) {
    if (editedPaths.has(cf.path)) continue;
    const file = allFiles.find(f => f.path === cf.path);
    if (!file) continue;
    if (!/\.(tsx|jsx)$/.test(file.path)) continue;

    const contentLower = file.content.toLowerCase();
    const mentionsEntity = contentLower.includes(entityLower) ||
      file.path.toLowerCase().includes(entityLower);
    if (!mentionsEntity) continue;

    const hasForm = /<form/i.test(file.content) || /<Form/i.test(file.content) || /useForm/.test(file.content);
    if (!hasForm) continue;

    if (file.content.includes(`name="${fieldName}"`) || file.content.includes(`id="${fieldName}"`)) continue;

    const formFieldJsx = generateFormFieldJsx(fieldName, fieldType);
    const submitBtnMatch = file.content.match(/(\s*<(?:Button|button)[^>]*type\s*=\s*["']submit["'][^>]*>)/);
    if (submitBtnMatch) {
      const modified = file.content.replace(
        submitBtnMatch[0],
        `\n${formFieldJsx}\n${submitBtnMatch[0]}`
      );
      if (modified !== file.content) {
        edits.push({
          filePath: file.path,
          editType: 'modify',
          oldContent: file.content,
          newContent: modified,
          description: `Cascaded ${fieldName} field to form in ${file.path}`,
          linesChanged: countChangedLines(file.content, modified),
        });
        editedPaths.add(file.path);
        steps.push({ phase: 'cascade', label: 'Form updated', detail: `Added ${fieldName} input to ${file.path}` });
      }
    }
  }
  return edits;
}

function detectCascades(
  edits: FileEdit[],
  allFiles: { path: string; content: string; language: string }[],
  contextManager: ProjectContextManager,
  steps: ThinkingStep[]
): FileEdit[] {
  const cascadeEdits: FileEdit[] = [];
  const editedPaths = new Set(edits.map(e => e.filePath));

  for (const edit of edits) {
    if (edit.editType === 'delete') continue;

    const meta = contextManager.getFileIndex().get(edit.filePath);
    if (!meta) continue;

    const isSchema = meta.dbTables.length > 0 || /schema/i.test(edit.filePath);
    if (isSchema && edit.editType === 'modify') {
      steps.push({ phase: 'cascade', label: 'Schema change cascade', detail: 'Checking dependent API routes, display components, types, and forms' });

      const addedFields = detectAddedSchemaFields(edit);

      for (const { entityName, fieldName, fieldType } of addedFields) {
        const routeEdits = cascadeFieldToRoutes(fieldName, entityName, allFiles, contextManager, editedPaths, steps);
        cascadeEdits.push(...routeEdits);

        const displayEdits = cascadeFieldToDisplay(fieldName, entityName, allFiles, contextManager, editedPaths, steps);
        cascadeEdits.push(...displayEdits);

        const typeEdits = cascadeFieldToTypes(fieldName, fieldType, entityName, allFiles, editedPaths, steps);
        cascadeEdits.push(...typeEdits);

        const formEdits = cascadeFieldToForms(fieldName, fieldType, entityName, allFiles, contextManager, editedPaths, steps);
        cascadeEdits.push(...formEdits);
      }

      if (addedFields.length === 0) {
        const relatedFiles = contextManager.getRelatedFiles(edit.filePath);
        for (const related of relatedFiles) {
          if (editedPaths.has(related.path)) continue;
          const file = allFiles.find(f => f.path === related.path);
          if (!file) continue;

          const isApi = related.apiRoutes.length > 0 || /routes?\.ts/.test(related.path);
          if (isApi) {
            steps.push({ phase: 'cascade', label: 'API route may need update', detail: related.path });
          }
        }
      }
    }

    if (edit.editType === 'create' && edit.filePath.includes('pages/')) {
      const appFile = allFiles.find(f => /App\.(tsx|jsx)$/.test(f.path));
      if (appFile && !editedPaths.has(appFile.path)) {
        const pageName = edit.filePath.split('/').pop()?.replace(/\.\w+$/, '') || '';
        const componentName = pageName.charAt(0).toUpperCase() + pageName.slice(1);
        const { content: modifiedApp, changed } = addRouteToApp(appFile.content, componentName, `/${pageName}`, edit.filePath.replace(/\.\w+$/, ''));
        if (changed) {
          cascadeEdits.push({
            filePath: appFile.path,
            editType: 'modify',
            oldContent: appFile.content,
            newContent: modifiedApp,
            description: `Added route for new ${componentName} page`,
            linesChanged: countChangedLines(appFile.content, modifiedApp),
          });
          editedPaths.add(appFile.path);
        }
      }
    }
  }

  return cascadeEdits;
}

export function processEditRequest(request: EditRequest): EditResult {
  const steps: ThinkingStep[] = [];
  const { userMessage, projectFiles, conversationHistory } = request;

  steps.push({ phase: 'init', label: 'Processing edit request', detail: userMessage.substring(0, 100) });

  const contextManager = new ProjectContextManager();
  contextManager.buildContext(projectFiles);
  steps.push({ phase: 'init', label: 'Project context built', detail: `${projectFiles.length} files indexed` });

  const intent = classifyIntent(userMessage);
  steps.push({
    phase: 'classification',
    label: `Intent classified: ${intent.editType}`,
    detail: `Confidence: ${Math.round(intent.confidence * 100)}% | Keywords: ${intent.keywords.slice(0, 5).join(', ')}`,
  });

  if (intent.targets.length > 0) {
    steps.push({
      phase: 'targeting',
      label: 'Target hints found',
      detail: intent.targets.map(t => `${t.kind}: ${t.name}`).join(', '),
    });
  }

  const targetFiles = findTargetFiles(intent, contextManager, projectFiles, userMessage);
  steps.push({
    phase: 'targeting',
    label: `${targetFiles.length} target file(s) identified`,
    detail: targetFiles.slice(0, 5).map(f => f.path).join(', '),
  });

  let edits: FileEdit[] = [];

  switch (intent.editType) {
    case 'style':
      edits = generateStyleEdits(userMessage, targetFiles, steps);
      break;
    case 'content':
      edits = generateContentEdits(userMessage, targetFiles, steps);
      break;
    case 'structure':
      edits = generateStructureEdits(userMessage, targetFiles, projectFiles, contextManager, steps);
      break;
    case 'feature':
      edits = generateFeatureEdits(userMessage, targetFiles, projectFiles, contextManager, steps);
      break;
    case 'fix':
      edits = generateFixEdits(userMessage, targetFiles, projectFiles, contextManager, steps);
      break;
    case 'refactor':
      edits = generateRefactorEdits(userMessage, targetFiles, projectFiles, steps);
      break;
  }

  steps.push({ phase: 'cascade', label: 'Checking for cascade effects' });
  const cascadeEdits = detectCascades(edits, projectFiles, contextManager, steps);
  edits = [...edits, ...cascadeEdits];

  const affectedFiles = Array.from(new Set(edits.map(e => e.filePath)));
  const totalLinesChanged = edits.reduce((sum, e) => sum + e.linesChanged, 0);

  const summary = edits.length > 0
    ? `Applied ${edits.length} edit(s) across ${affectedFiles.length} file(s), changing ~${totalLinesChanged} line(s). Type: ${intent.editType}.`
    : `No edits could be determined for: "${userMessage.substring(0, 80)}". Try being more specific about what to change and where.`;

  steps.push({
    phase: 'complete',
    label: edits.length > 0 ? 'Edits generated successfully' : 'No edits produced',
    detail: summary,
  });

  return {
    edits,
    summary,
    thinkingSteps: steps,
    affectedFiles,
    editType: intent.editType,
  };
}

function findComponentBlock(content: string, names: string[]): { start: number; end: number } | null {
  for (const name of names) {
    const tagOpen = new RegExp(`<${name}[\\s>]`);
    const match = content.match(tagOpen);
    if (match && match.index !== undefined) {
      const start = match.index;
      const closeTag = new RegExp(`</${name}>`);
      const closeMatch = content.substring(start).match(closeTag);
      if (closeMatch && closeMatch.index !== undefined) {
        return { start, end: start + closeMatch.index + closeMatch[0].length };
      }
      const selfClose = content.substring(start).indexOf('/>');
      if (selfClose !== -1) {
        return { start, end: start + selfClose + 2 };
      }
    }

    const funcRegex = new RegExp(`function\\s+${name}\\s*\\(`);
    const funcMatch = content.match(funcRegex);
    if (funcMatch && funcMatch.index !== undefined) {
      const braceStart = content.indexOf('{', funcMatch.index);
      if (braceStart !== -1) {
        let depth = 0;
        for (let i = braceStart; i < content.length; i++) {
          if (content[i] === '{') depth++;
          if (content[i] === '}') depth--;
          if (depth === 0) return { start: funcMatch.index, end: i + 1 };
        }
      }
    }
  }
  return null;
}

function adjustTailwindScale(content: string, prefix: string, scale: string[], direction: 'up' | 'down'): string {
  const regex = new RegExp(`${escapeRegex(prefix)}(${scale.map(escapeRegex).join('|')})(?=[\\s"'\\]])`, 'g');
  return content.replace(regex, (match, currentValue) => {
    const idx = scale.indexOf(currentValue);
    if (idx === -1) return match;
    const newIdx = direction === 'up' ? Math.min(idx + 1, scale.length - 1) : Math.max(idx - 1, 0);
    return `${prefix}${scale[newIdx]}`;
  });
}

function countChangedLines(oldContent: string, newContent: string): number {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  let changes = 0;
  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLen; i++) {
    if ((oldLines[i] || '') !== (newLines[i] || '')) changes++;
  }
  return Math.max(changes, 1);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getRelativePath(from: string, to: string): string {
  const fromParts = from.split('/').slice(0, -1);
  const toParts = to.split('/');
  const toFile = toParts.pop()!;
  const toFileNoExt = toFile.replace(/\.\w+$/, '');

  let common = 0;
  while (common < fromParts.length && common < toParts.length && fromParts[common] === toParts[common]) {
    common++;
  }

  const ups = fromParts.length - common;
  const remaining = toParts.slice(common);

  const prefix = ups > 0 ? '../'.repeat(ups) : './';
  return prefix + [...remaining, toFileNoExt].join('/');
}

function inferFieldType(fieldName: string): string {
  const lower = fieldName.toLowerCase();
  if (lower.includes('email')) return 'email';
  if (lower.includes('phone') || lower.includes('tel')) return 'phone';
  if (lower.includes('url') || lower.includes('link') || lower.includes('website')) return 'url';
  if (lower.includes('password') || lower.includes('secret')) return 'password';
  if (lower.includes('date') || lower.includes('time') || lower.includes('created') || lower.includes('updated')) return 'date';
  if (lower.includes('price') || lower.includes('cost') || lower.includes('amount') || lower.includes('total')) return 'money';
  if (lower.includes('count') || lower.includes('quantity') || lower.includes('number') || lower.includes('age')) return 'integer';
  if (lower.includes('rating') || lower.includes('score')) return 'integer';
  if (lower.includes('active') || lower.includes('enabled') || lower.includes('visible') || lower.includes('published') || lower.startsWith('is') || lower.startsWith('has')) return 'boolean';
  if (lower.includes('description') || lower.includes('body') || lower.includes('content') || lower.includes('bio') || lower.includes('notes')) return 'textarea';
  if (lower.includes('image') || lower.includes('avatar') || lower.includes('photo') || lower.includes('logo')) return 'url';
  if (lower.includes('color')) return 'color';
  if (lower.includes('status') || lower.includes('type') || lower.includes('category') || lower.includes('role')) return 'enum';
  return 'text';
}

function mapFieldToDrizzle(fieldName: string, fieldType: string): string {
  switch (fieldType) {
    case 'email':
    case 'phone':
    case 'url':
    case 'password':
    case 'text':
    case 'color':
      return `text('${fieldName}')`;
    case 'textarea':
      return `text('${fieldName}')`;
    case 'integer':
      return `integer('${fieldName}')`;
    case 'money':
      return `real('${fieldName}')`;
    case 'boolean':
      return `boolean('${fieldName}').default(false)`;
    case 'date':
      return `timestamp('${fieldName}')`;
    case 'enum':
      return `text('${fieldName}')`;
    default:
      return `text('${fieldName}')`;
  }
}

function generateFormFieldJsx(fieldName: string, fieldType: string): string {
  const label = fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1');
  const inputType = fieldType === 'email' ? 'email' : fieldType === 'password' ? 'password' : fieldType === 'url' ? 'url' : fieldType === 'phone' ? 'tel' : fieldType === 'integer' || fieldType === 'money' ? 'number' : 'text';

  if (fieldType === 'boolean') {
    return `          <div className="flex items-center gap-2">
            <input type="checkbox" id="${fieldName}" name="${fieldName}" data-testid="input-${fieldName}" />
            <label htmlFor="${fieldName}">${label}</label>
          </div>`;
  }

  if (fieldType === 'textarea') {
    return `          <div className="space-y-2">
            <label htmlFor="${fieldName}" className="text-sm font-medium">${label}</label>
            <textarea id="${fieldName}" name="${fieldName}" className="w-full min-h-[80px] rounded-md border px-3 py-2" data-testid="input-${fieldName}" />
          </div>`;
  }

  return `          <div className="space-y-2">
            <label htmlFor="${fieldName}" className="text-sm font-medium">${label}</label>
            <input type="${inputType}" id="${fieldName}" name="${fieldName}" className="w-full rounded-md border px-3 py-2" data-testid="input-${fieldName}" />
          </div>`;
}

function generatePageTemplate(componentName: string): string {
  return `import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ${componentName}() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6" data-testid="text-page-title">${componentName}</h1>
      <Card>
        <CardHeader>
          <CardTitle data-testid="text-card-title">${componentName}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground" data-testid="text-placeholder">
            This is the ${componentName} page. Add your content here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
`;
}

function addRouteToApp(appContent: string, componentName: string, routePath: string, importPath: string): { content: string; changed: boolean } {
  if (appContent.includes(`path="${routePath}"`) || appContent.includes(`path={"${routePath}"`)) {
    return { content: appContent, changed: false };
  }

  let modified = appContent;

  const relImportPath = importPath.replace(/^client\/src\//, '@/').replace(/\.\w+$/, '');
  const importLine = `import ${componentName} from '${relImportPath}';\n`;

  const lastImportMatch = modified.match(/^import\s+.*\n/gm);
  if (lastImportMatch) {
    const lastImport = lastImportMatch[lastImportMatch.length - 1];
    const lastImportIdx = modified.lastIndexOf(lastImport);
    modified = modified.substring(0, lastImportIdx + lastImport.length) + importLine + modified.substring(lastImportIdx + lastImport.length);
  } else {
    modified = importLine + modified;
  }

  if (modified.includes('<Switch>') || modified.includes('<Switch ')) {
    const notFoundRoute = modified.match(/(<Route\s[^>]*component\s*=\s*\{?\s*NotFound\s*\}?\s*\/>)/);
    if (notFoundRoute) {
      modified = modified.replace(
        notFoundRoute[0],
        `<Route path="${routePath}" component={${componentName}} />\n              ${notFoundRoute[0]}`
      );
    } else {
      const switchClose = modified.match(/<\/Switch>/);
      if (switchClose) {
        modified = modified.replace(
          '</Switch>',
          `  <Route path="${routePath}" component={${componentName}} />\n            </Switch>`
        );
      }
    }
  } else if (modified.includes('<Routes>') || modified.includes('<Routes ')) {
    const routesClose = modified.match(/<\/Routes>/);
    if (routesClose) {
      modified = modified.replace(
        '</Routes>',
        `  <Route path="${routePath}" element={<${componentName} />} />\n            </Routes>`
      );
    }
  }

  return { content: modified, changed: modified !== appContent };
}

function addNavItem(navContent: string, label: string, path: string): { content: string; changed: boolean } {
  if (navContent.includes(`"${path}"`) || navContent.includes(`'${path}'`)) {
    return { content: navContent, changed: false };
  }

  const itemsArrayMatch = navContent.match(/(const\s+\w*[Ii]tems\s*=\s*\[)([\s\S]*?)(\];)/);
  if (itemsArrayMatch) {
    const existingItems = itemsArrayMatch[2];
    const newItem = `\n  {\n    title: "${label}",\n    url: "${path}",\n  },`;
    const modified = navContent.replace(
      itemsArrayMatch[0],
      `${itemsArrayMatch[1]}${existingItems}${newItem}\n${itemsArrayMatch[3]}`
    );
    return { content: modified, changed: true };
  }

  const linkListMatch = navContent.match(/(<(?:Link|NavLink|a)\s+[^>]*(?:href|to)\s*=\s*["'][^"']+["'][^>]*>[^<]*<\/(?:Link|NavLink|a)>)\s*\n/);
  if (linkListMatch) {
    const newLink = `\n            <Link href="${path}" data-testid="link-${label.toLowerCase()}">${label}</Link>`;
    const modified = navContent.replace(
      linkListMatch[0],
      `${linkListMatch[0]}${newLink}\n`
    );
    return { content: modified, changed: true };
  }

  return { content: navContent, changed: false };
}

function generateRouteTemplate(method: string, resource: string): string {
  const plural = resource.endsWith('s') ? resource : resource + 's';

  if (method === 'get') {
    return `  app.get('/api/${plural}', async (req, res) => {
    try {
      const items = await storage.getAll${resource.charAt(0).toUpperCase() + resource.slice(1)}s();
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch ${plural}' });
    }
  });`;
  }

  if (method === 'post') {
    return `  app.post('/api/${plural}', async (req, res) => {
    try {
      const item = await storage.create${resource.charAt(0).toUpperCase() + resource.slice(1)}(req.body);
      res.status(201).json(item);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create ${resource}' });
    }
  });`;
  }

  if (method === 'put' || method === 'patch') {
    return `  app.${method}('/api/${plural}/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.update${resource.charAt(0).toUpperCase() + resource.slice(1)}(id, req.body);
      if (!item) return res.status(404).json({ message: '${resource} not found' });
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update ${resource}' });
    }
  });`;
  }

  if (method === 'delete') {
    return `  app.delete('/api/${plural}/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.delete${resource.charAt(0).toUpperCase() + resource.slice(1)}(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete ${resource}' });
    }
  });`;
  }

  return `  app.${method}('/api/${plural}', async (req, res) => {
    res.json({ message: '${method.toUpperCase()} ${plural} endpoint' });
  });`;
}