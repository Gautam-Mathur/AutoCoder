// Code Cleaner - Removes markdown artifacts and fixes common issues
// This ensures generated code is clean and immediately runnable

export interface CleanCodeResult {
  code: string;
  fixes: string[];
  isValid: boolean;
}

// Clean markdown artifacts from generated code
export function cleanCodeArtifacts(code: string, language?: string): CleanCodeResult {
  const fixes: string[] = [];
  let cleaned = code;

  // Remove markdown code fences (```javascript, ```html, etc.)
  const fenceMatch = cleaned.match(/^```[\w]*\s*\n?([\s\S]*?)```\s*$/);
  if (fenceMatch) {
    cleaned = fenceMatch[1];
    fixes.push('Removed markdown code fences');
  }

  // Remove multiple code fence blocks and extract just the code
  const multipleBlocks = cleaned.match(/```[\w]*\n([\s\S]*?)\n```/g);
  if (multipleBlocks && multipleBlocks.length > 1) {
    // Extract content from each block
    const extractedCode = multipleBlocks.map(block => {
      const match = block.match(/```[\w]*\n([\s\S]*?)\n```/);
      return match ? match[1] : '';
    }).join('\n\n');
    cleaned = extractedCode;
    fixes.push(`Combined ${multipleBlocks.length} code blocks`);
  }

  // Remove inline code markers
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
  if (cleaned !== code) {
    fixes.push('Removed inline code markers');
  }

  // Remove common AI explanation text patterns
  const explanationPatterns = [
    /^Here'?s? (the|your|an?) .*?:\s*\n/gim,
    /^This (code|file|script|function|component) .*?:\s*\n/gim,
    /^I'?ve? (created|generated|written|made) .*?:\s*\n/gim,
    /^Below is .*?:\s*\n/gim,
    /^\*\*[^*]+\*\*\s*\n/gim,
    /^#+ .*?\n/gm, // Remove markdown headers
  ];

  for (const pattern of explanationPatterns) {
    const before = cleaned;
    cleaned = cleaned.replace(pattern, '');
    if (before !== cleaned) {
      fixes.push('Removed AI explanation text');
    }
  }

  // Remove trailing explanation
  cleaned = cleaned.replace(/\n\n(Note:|Remember:|This |The above|Usage:)[\s\S]*$/i, '');

  // Fix common malformed syntax patterns
  // Fix malformed imports with semicolons/newlines inside (e.g., "import { createRoot;\n} from")
  cleaned = cleaned.replace(/import\s*\{([^}]*);+\s*\n?\s*\}/g, 'import {$1}');
  cleaned = cleaned.replace(/import\s*\{\s*\n+\s*([^}]*)\}/g, 'import { $1 }');
  // Fix malformed return statements (e.g., "return (;" -> "return (")
  cleaned = cleaned.replace(/return\s*\(\s*;+/g, 'return (');
  // Clean up double/triple semicolons
  cleaned = cleaned.replace(/;{2,}/g, ';');
  // Fix "{ ;" patterns
  cleaned = cleaned.replace(/\{\s*;+\s*\}/g, '{}');
  // Remove empty statements
  cleaned = cleaned.replace(/^\s*;\s*$/gm, '');

  // Remove empty lines at start/end
  cleaned = cleaned.trim();

  // Validate based on language (do NOT try to fix syntax - rely on validation only)
  const isValid = validateSyntax(cleaned, language);

  return { code: cleaned, fixes, isValid };
}

// Basic syntax validation
function validateSyntax(code: string, language?: string): boolean {
  if (!code || code.trim().length === 0) return false;

  const lang = language?.toLowerCase() || detectLanguage(code);

  switch (lang) {
    case 'javascript':
    case 'typescript':
    case 'js':
    case 'ts':
      return validateJavaScript(code);
    case 'html':
      return validateHTML(code);
    case 'css':
      return validateCSS(code);
    case 'json':
      return validateJSON(code);
    default:
      return true; // Assume valid for unknown languages
  }
}

function validateJavaScript(code: string): boolean {
  // Check for balanced brackets
  const brackets = { '(': 0, '[': 0, '{': 0 };
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const prevChar = i > 0 ? code[i - 1] : '';

    // Handle strings
    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
      continue;
    }

    if (inString) continue;

    // Count brackets
    if (char === '(' || char === '[' || char === '{') {
      brackets[char as keyof typeof brackets]++;
    } else if (char === ')') {
      brackets['(']--;
    } else if (char === ']') {
      brackets['[']--;
    } else if (char === '}') {
      brackets['{']--;
    }

    // Check for negative (too many closing brackets)
    if (Object.values(brackets).some(v => v < 0)) {
      return false;
    }
  }

  // All brackets should be balanced
  return Object.values(brackets).every(v => v === 0);
}

function validateHTML(code: string): boolean {
  // Check for DOCTYPE or html tag
  if (!code.includes('<!DOCTYPE') && !code.includes('<html')) {
    // Could be a fragment, which is ok
    return code.includes('<') && code.includes('>');
  }
  return true;
}

function validateCSS(code: string): boolean {
  // Check for balanced braces
  const open = (code.match(/{/g) || []).length;
  const close = (code.match(/}/g) || []).length;
  return open === close;
}

function validateJSON(code: string): boolean {
  try {
    JSON.parse(code);
    return true;
  } catch {
    return false;
  }
}

function detectLanguage(code: string): string {
  if (code.includes('<!DOCTYPE') || code.includes('<html')) return 'html';
  if (code.startsWith('{') && code.endsWith('}')) {
    try { JSON.parse(code); return 'json'; } catch {}
  }
  if (code.includes('function') || code.includes('const ') || code.includes('let ')) return 'javascript';
  if (code.includes('import ') && code.includes('from ')) return 'javascript';
  if (code.includes('interface ') || code.includes(': string') || code.includes(': number')) return 'typescript';
  if (code.includes('{') && code.includes(':') && code.includes(';')) return 'css';
  return 'unknown';
}

// Clean a project's files
export function cleanProjectFiles(files: { path: string; content: string; language?: string }[]): {
  files: { path: string; content: string; language: string }[];
  totalFixes: number;
} {
  let totalFixes = 0;

  const cleanedFiles = files.map(file => {
    const lang = file.language || detectLanguageFromPath(file.path);
    const result = cleanCodeArtifacts(file.content, lang);
    totalFixes += result.fixes.length;

    return {
      path: file.path,
      content: result.code,
      language: lang
    };
  });

  return { files: cleanedFiles, totalFixes };
}

function detectLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    html: 'html',
    htm: 'html',
    css: 'css',
    json: 'json',
    py: 'python',
    go: 'go',
    rs: 'rust',
    java: 'java',
    md: 'markdown'
  };
  return langMap[ext] || 'unknown';
}
