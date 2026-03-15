export interface ValidationError {
  file: string;
  line: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  file: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  fixedFiles: { path: string; content: string }[];
}

const VOID_ELEMENTS = [
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
];

const REACT_IMPORT_TYPOS: Record<string, string> = {
  'usestate': 'useState',
  'useeffect': 'useEffect',
  'usecontext': 'useContext',
  'usereducer': 'useReducer',
  'usecallback': 'useCallback',
  'usememo': 'useMemo',
  'useref': 'useRef',
  'uselayouteffect': 'useLayoutEffect',
  'useimperativehandle': 'useImperativeHandle',
  'usedebugvalue': 'useDebugValue',
  'useid': 'useId',
  'usetransition': 'useTransition',
  'usedeferredvalue': 'useDeferredValue',
  'usesyncexternalstore': 'useSyncExternalStore',
  'useinsertioneffect': 'useInsertionEffect',
  'createcontext': 'createContext',
  'forwardref': 'forwardRef',
  'createref': 'createRef',
};

const EVENT_HANDLER_FIXES: Record<string, string> = {
  'onclick': 'onClick',
  'onchange': 'onChange',
  'onsubmit': 'onSubmit',
  'oninput': 'onInput',
  'onfocus': 'onFocus',
  'onblur': 'onBlur',
  'onkeydown': 'onKeyDown',
  'onkeyup': 'onKeyUp',
  'onkeypress': 'onKeyPress',
  'onmousedown': 'onMouseDown',
  'onmouseup': 'onMouseUp',
  'onmouseover': 'onMouseOver',
  'onmouseout': 'onMouseOut',
  'onmouseenter': 'onMouseEnter',
  'onmouseleave': 'onMouseLeave',
  'ondoubleclick': 'onDoubleClick',
  'onscroll': 'onScroll',
  'ontouchstart': 'onTouchStart',
  'ontouchend': 'onTouchEnd',
  'ontouchmove': 'onTouchMove',
  'ondrag': 'onDrag',
  'ondragstart': 'onDragStart',
  'ondragend': 'onDragEnd',
  'ondrop': 'onDrop',
  'ondragover': 'onDragOver',
};

function isJsxFile(filePath: string): boolean {
  return /\.(jsx|tsx)$/.test(filePath);
}

function isJsFile(filePath: string): boolean {
  return /\.(js|jsx|ts|tsx)$/.test(filePath);
}

function isEntryFile(filePath: string): boolean {
  const baseName = filePath.split('/').pop()?.toLowerCase() || '';
  return baseName === 'main.jsx' || baseName === 'main.tsx' || baseName === 'index.jsx' || baseName === 'index.tsx';
}

function preserveImports(original: string, modified: string): string {
  const importRegex = /^(import\s+.+;\s*$)/gm;
  const originalImports: string[] = [];
  let match;
  while ((match = importRegex.exec(original)) !== null) {
    originalImports.push(match[1].trim());
  }
  if (originalImports.length === 0) return modified;

  let result = modified;
  for (const imp of originalImports) {
    if (!result.includes(imp)) {
      const corrupted = result.split('\n');
      const origLines = original.split('\n');
      for (let i = 0; i < origLines.length; i++) {
        const origLine = origLines[i].trim();
        if (origLine === imp && corrupted[i] !== undefined && corrupted[i].trim() !== origLine) {
          const importBlock = findImportBlock(original, imp);
          const corruptedBlock = findCorruptedImportBlock(result, imp);
          if (importBlock && corruptedBlock) {
            result = result.replace(corruptedBlock, importBlock);
          }
        }
      }
    }
  }
  return result;
}

function findImportBlock(content: string, importLine: string): string | null {
  const idx = content.indexOf(importLine);
  if (idx === -1) return null;
  const lineStart = content.lastIndexOf('\n', idx) + 1;
  const lineEnd = content.indexOf('\n', idx);
  return content.substring(lineStart, lineEnd === -1 ? content.length : lineEnd);
}

function findCorruptedImportBlock(content: string, importLine: string): string | null {
  const parts = importLine.match(/^import\s+\{?\s*(\w+)/);
  if (!parts) return null;
  const name = parts[1];
  const regex = new RegExp(`import\\s+[^;]*${name}[^;]*;[\\s\\S]*?from\\s+['"][^'"]+['"];?`, 'g');
  const match = regex.exec(content);
  if (match) return match[0];
  return null;
}

function getLineNumber(content: string, index: number): number {
  return content.substring(0, index).split('\n').length;
}

function isInsideTemplateLiteral(content: string, index: number): boolean {
  let backtickCount = 0;
  for (let i = 0; i < index; i++) {
    if (content[i] === '`' && (i === 0 || content[i - 1] !== '\\')) {
      backtickCount++;
    }
  }
  return backtickCount % 2 === 1;
}

function isInsideString(content: string, index: number): boolean {
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  for (let i = 0; i < index; i++) {
    const ch = content[i];
    const prev = i > 0 ? content[i - 1] : '';
    if (prev === '\\') continue;
    if (ch === "'" && !inDouble && !inTemplate) inSingle = !inSingle;
    if (ch === '"' && !inSingle && !inTemplate) inDouble = !inDouble;
    if (ch === '`' && !inSingle && !inDouble) inTemplate = !inTemplate;
  }
  return inSingle || inDouble || inTemplate;
}

function isInsideComment(content: string, index: number): boolean {
  const before = content.substring(0, index);
  const lastSingleComment = before.lastIndexOf('//');
  if (lastSingleComment !== -1) {
    const afterComment = before.substring(lastSingleComment);
    if (!afterComment.includes('\n')) return true;
  }
  const lastBlockOpen = before.lastIndexOf('/*');
  const lastBlockClose = before.lastIndexOf('*/');
  if (lastBlockOpen !== -1 && lastBlockOpen > lastBlockClose) return true;
  return false;
}

function stripCommentsAndStrings(content: string): string {
  let result = '';
  let i = 0;
  while (i < content.length) {
    if (content[i] === '/' && content[i + 1] === '/') {
      while (i < content.length && content[i] !== '\n') i++;
    } else if (content[i] === '/' && content[i + 1] === '*') {
      i += 2;
      while (i < content.length - 1 && !(content[i] === '*' && content[i + 1] === '/')) i++;
      i += 2;
    } else if (content[i] === "'" || content[i] === '"' || content[i] === '`') {
      const quote = content[i];
      result += ' ';
      i++;
      while (i < content.length) {
        if (content[i] === '\\') { i += 2; continue; }
        if (content[i] === quote) { i++; break; }
        if (quote === '`' && content[i] === '$' && content[i + 1] === '{') {
          i += 2;
          let depth = 1;
          while (i < content.length && depth > 0) {
            if (content[i] === '{') depth++;
            if (content[i] === '}') depth--;
            i++;
          }
          continue;
        }
        i++;
      }
    } else {
      result += content[i];
      i++;
    }
  }
  return result;
}

function checkBalancedBrackets(
  content: string,
  filePath: string,
  errors: ValidationError[]
): void {
  const stripped = stripCommentsAndStrings(content);
  const stack: { char: string; line: number }[] = [];
  const pairs: Record<string, string> = { '(': ')', '{': '}', '[': ']' };
  const closers: Record<string, string> = { ')': '(', '}': '{', ']': '[' };
  const lines = stripped.split('\n');

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (pairs[ch]) {
        stack.push({ char: ch, line: lineIdx + 1 });
      } else if (closers[ch]) {
        if (stack.length === 0 || stack[stack.length - 1].char !== closers[ch]) {
          errors.push({
            file: filePath,
            line: lineIdx + 1,
            message: `Unmatched closing bracket '${ch}'`,
            severity: 'error',
          });
        } else {
          stack.pop();
        }
      }
    }
  }

  for (const unclosed of stack) {
    errors.push({
      file: filePath,
      line: unclosed.line,
      message: `Unclosed bracket '${unclosed.char}'`,
      severity: 'error',
    });
  }
}

function checkBalancedQuotes(
  content: string,
  filePath: string,
  errors: ValidationError[]
): void {
  const lines = content.split('\n');
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    if (isInsideComment(content, content.indexOf(line))) continue;
    let inSingle = false;
    let inDouble = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (i > 0 && line[i - 1] === '\\') continue;
      if (ch === '`') return;
      if (ch === "'" && !inDouble) inSingle = !inSingle;
      if (ch === '"' && !inSingle) inDouble = !inDouble;
    }
    if (inSingle) {
      errors.push({
        file: filePath,
        line: lineIdx + 1,
        message: 'Unclosed single quote on this line',
        severity: 'warning',
      });
    }
    if (inDouble) {
      errors.push({
        file: filePath,
        line: lineIdx + 1,
        message: 'Unclosed double quote on this line',
        severity: 'warning',
      });
    }
  }
}

function checkStraySemicolons(
  content: string,
  filePath: string,
  errors: ValidationError[]
): void {
  const patterns = [
    { regex: /\(;/g, msg: "Stray semicolon after '('" },
    { regex: /\[;/g, msg: "Stray semicolon after '['" },
    { regex: /=>;/g, msg: "Stray semicolon after '=>'" },
  ];
  for (const { regex, msg } of patterns) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      if (isInsideString(content, match.index) || isInsideComment(content, match.index)) continue;
      errors.push({
        file: filePath,
        line: getLineNumber(content, match.index),
        message: msg,
        severity: 'error',
      });
    }
  }
}

function checkEmptyImports(
  content: string,
  filePath: string,
  errors: ValidationError[]
): void {
  const regex = /import\s*\{\s*\}\s*from/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (isInsideComment(content, match.index)) continue;
    errors.push({
      file: filePath,
      line: getLineNumber(content, match.index),
      message: 'Empty import statement (no named imports)',
      severity: 'warning',
    });
  }
}

function checkUndefinedNaNInJsx(
  content: string,
  filePath: string,
  errors: ValidationError[]
): void {
  if (!isJsxFile(filePath)) return;
  const regex = />\s*(undefined|NaN)\s*</g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (isInsideComment(content, match.index) || isInsideString(content, match.index)) continue;
    errors.push({
      file: filePath,
      line: getLineNumber(content, match.index),
      message: `'${match[1]}' used as JSX text content`,
      severity: 'warning',
    });
  }
}

function checkDefaultExport(
  content: string,
  filePath: string,
  errors: ValidationError[]
): void {
  if (!isJsxFile(filePath)) return;
  const baseName = filePath.split('/').pop()?.toLowerCase() || '';
  if (baseName === 'main.jsx' || baseName === 'main.tsx' || baseName === 'index.jsx' || baseName === 'index.tsx') return;
  if (/Context|Provider|hook/i.test(baseName)) return;
  const hasDefaultExport =
    /export\s+default\s+/.test(content) ||
    /export\s*\{\s*\w+\s+as\s+default\s*\}/.test(content);
  if (!hasDefaultExport) {
    errors.push({
      file: filePath,
      line: 1,
      message: 'JSX file is missing a default export',
      severity: 'warning',
    });
  }
}

function checkComponentReturnsJsx(
  content: string,
  filePath: string,
  errors: ValidationError[]
): void {
  if (!isJsxFile(filePath)) return;
  const stripped = stripCommentsAndStrings(content);
  const componentPattern = /(?:function\s+([A-Z]\w*)|const\s+([A-Z]\w*)\s*=)/g;
  let match: RegExpExecArray | null;
  while ((match = componentPattern.exec(stripped)) !== null) {
    const name = match[1] || match[2];
    if (/Context$|Provider$|Consumer$/.test(name)) continue;
    if (/createContext/.test(content)) continue;
    const afterMatch = stripped.substring(match.index);
    const searchRange = afterMatch.substring(0, 1000);
    const hasReturn = /return\s*[\s(]*</.test(searchRange);
    const hasArrowJsx = /=>\s*[\s(]*</.test(searchRange);
    const hasChildrenReturn = /return\s+.*children/.test(searchRange);
    if (!hasReturn && !hasArrowJsx && !hasChildrenReturn) {
      errors.push({
        file: filePath,
        line: getLineNumber(content, match.index),
        message: `Component '${name}' may not return JSX`,
        severity: 'warning',
      });
    }
  }
}

function checkDuplicateDeclarations(
  content: string,
  filePath: string,
  errors: ValidationError[]
): void {
  if (!isJsFile(filePath)) return;
  const stripped = stripCommentsAndStrings(content);
  const declPattern = /(?:function\s+(\w+)\s*\(|(?:const|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)|[^=])\s*=>|(?:const|let|var)\s+(\w+)\s*=\s*function)/g;
  const seen: Record<string, number> = {};
  let match: RegExpExecArray | null;
  while ((match = declPattern.exec(stripped)) !== null) {
    const name = match[1] || match[2] || match[3];
    if (!name) continue;
    if (seen[name] !== undefined) {
      errors.push({
        file: filePath,
        line: getLineNumber(content, match.index),
        message: `Duplicate declaration of '${name}'`,
        severity: 'error',
      });
    } else {
      seen[name] = getLineNumber(content, match.index);
    }
  }
}

function checkVoidElements(
  content: string,
  filePath: string,
  errors: ValidationError[]
): void {
  if (!isJsxFile(filePath)) return;
  for (const tag of VOID_ELEMENTS) {
    const regex = new RegExp(`<${tag}\\b`, 'g');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      if (isInsideString(content, match.index) || isInsideComment(content, match.index)) continue;
      let depth = 0;
      let i = match.index + match[0].length;
      let isSelfClosed = false;
      let isUnclosed = false;
      while (i < content.length) {
        const ch = content[i];
        if (ch === '{') { depth++; i++; continue; }
        if (ch === '}') { depth--; i++; continue; }
        if (depth > 0) { i++; continue; }
        if (ch === '/' && content[i + 1] === '>') { isSelfClosed = true; break; }
        if (ch === '>' && content[i - 1] !== '=') { isUnclosed = true; break; }
        i++;
      }
      if (isUnclosed && !isSelfClosed) {
        if (tag === 'link' && isReactRouterLink(content, match.index)) continue;
        errors.push({
          file: filePath,
          line: getLineNumber(content, match.index),
          message: `Void element <${tag}> should be self-closing (<${tag} />)`,
          severity: 'warning',
        });
      }
    }
  }
}

function checkClassVsClassName(
  content: string,
  filePath: string,
  warnings: ValidationWarning[]
): void {
  if (!isJsxFile(filePath)) return;
  const regex = /\bclass=/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (isInsideString(content, match.index) || isInsideComment(content, match.index)) continue;
    const before = content.substring(Math.max(0, match.index - 30), match.index);
    if (before.includes('svg') || before.includes('SVG')) continue;
    warnings.push({
      file: filePath,
      message: `Use 'className' instead of 'class' in JSX (line ${getLineNumber(content, match.index)})`,
    });
  }
}

function checkHtmlFor(
  content: string,
  filePath: string,
  warnings: ValidationWarning[]
): void {
  if (!isJsxFile(filePath)) return;
  const regex = /<label[^>]*\bfor=/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (isInsideString(content, match.index) || isInsideComment(content, match.index)) continue;
    warnings.push({
      file: filePath,
      message: `Use 'htmlFor' instead of 'for' on <label> in JSX (line ${getLineNumber(content, match.index)})`,
    });
  }
}

function checkEventHandlerCasing(
  content: string,
  filePath: string,
  warnings: ValidationWarning[]
): void {
  if (!isJsxFile(filePath)) return;
  for (const lower of Object.keys(EVENT_HANDLER_FIXES)) {
    const regex = new RegExp(`\\b${lower}=`, 'g');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      if (isInsideString(content, match.index) || isInsideComment(content, match.index)) continue;
      warnings.push({
        file: filePath,
        message: `Event handler '${lower}' should be '${EVENT_HANDLER_FIXES[lower]}' in JSX (line ${getLineNumber(content, match.index)})`,
      });
    }
  }
}

function checkKeyInMap(
  content: string,
  filePath: string,
  warnings: ValidationWarning[]
): void {
  if (!isJsxFile(filePath)) return;
  const mapRegex = /\.map\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = mapRegex.exec(content)) !== null) {
    if (isInsideComment(content, match.index)) continue;
    const afterMap = content.substring(match.index, Math.min(content.length, match.index + 500));
    const hasJsx = /<\w/.test(afterMap);
    const hasKey = /key\s*=/.test(afterMap);
    if (hasJsx && !hasKey) {
      warnings.push({
        file: filePath,
        message: `Array .map() renders JSX without a 'key' prop (line ${getLineNumber(content, match.index)})`,
      });
    }
  }
}

function checkCrossFileImports(
  files: { path: string; content: string }[],
  filePath: string,
  content: string,
  warnings: ValidationWarning[]
): void {
  const importRegex = /import\s+.*?\s+from\s+['"](\.[^'"]+)['"]/g;
  const knownPaths = new Set(files.map(f => f.path));
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    const dir = filePath.substring(0, filePath.lastIndexOf('/') + 1);
    let resolved = dir + importPath;
    resolved = resolved.replace(/\/\.\//g, '/');

    const parts = resolved.split('/');
    const normalized: string[] = [];
    for (const part of parts) {
      if (part === '..') normalized.pop();
      else if (part !== '.') normalized.push(part);
    }
    const base = normalized.join('/');

    const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.json'];
    const found = extensions.some(ext => knownPaths.has(base + ext));
    const indexVariants = extensions.some(ext => knownPaths.has(base + '/index' + ext));

    if (!found && !indexVariants) {
      warnings.push({
        file: filePath,
        message: `Import '${importPath}' may reference a missing file (line ${getLineNumber(content, match.index)})`,
      });
    }
  }
}

function checkPackageJson(
  content: string,
  filePath: string,
  errors: ValidationError[]
): void {
  if (!filePath.endsWith('package.json')) return;
  try {
    JSON.parse(content);
  } catch (e: any) {
    errors.push({
      file: filePath,
      line: 1,
      message: `Invalid JSON in package.json: ${e.message || 'parse error'}`,
      severity: 'error',
    });
  }
}

function fixStraySemicolons(content: string): string {
  let result = content;
  result = result.replace(/\(;/g, (match, offset) => {
    if (isInsideString(content, offset) || isInsideComment(content, offset)) return match;
    return '(';
  });
  result = result.replace(/\[;/g, (match, offset) => {
    if (isInsideString(content, offset) || isInsideComment(content, offset)) return match;
    return '[';
  });
  result = result.replace(/=>;/g, (match, offset) => {
    if (isInsideString(content, offset) || isInsideComment(content, offset)) return match;
    return '=>';
  });
  return result;
}

function fixDuplicateSemicolons(content: string): string {
  return content.replace(/;;+/g, ';');
}

function isReactRouterLink(content: string, matchIndex: number): boolean {
  let i = matchIndex + 5;
  let depth = 0;
  let tagContent = '';
  while (i < content.length) {
    const ch = content[i];
    if (ch === '{') { depth++; i++; continue; }
    if (ch === '}') { depth--; i++; continue; }
    if (depth > 0) { tagContent += ch; i++; continue; }
    if (ch === '/' && content[i + 1] === '>') break;
    if (ch === '>') break;
    tagContent += ch;
    i++;
  }
  if (/\bto\s*=/.test(tagContent)) return true;
  if (/\.\.\.\w/.test(tagContent)) return true;
  if (content[i] === '>') {
    const searchEnd = Math.min(content.length, i + 1000);
    const afterTag = content.substring(i + 1, searchEnd);
    const closeLinkIdx = afterTag.indexOf('</Link>');
    const closeLinkLowerIdx = afterTag.indexOf('</link>');
    const nextOpenLink = afterTag.indexOf('<link');
    const nextOpenLinkUpper = afterTag.indexOf('<Link');
    const closeIdx = closeLinkIdx !== -1 ? closeLinkIdx : closeLinkLowerIdx;
    if (closeIdx !== -1) {
      if (nextOpenLink === -1 || nextOpenLink > closeIdx) {
        if (nextOpenLinkUpper === -1 || nextOpenLinkUpper > closeIdx) {
          return true;
        }
      }
    }
  }
  return false;
}

function fixLinkCasing(content: string, filePath: string): string {
  if (!isJsxFile(filePath)) return content;
  let result = content;
  const openRegex = /<link\b/g;
  let m: RegExpExecArray | null;
  const openPositions: number[] = [];
  while ((m = openRegex.exec(result)) !== null) {
    if (isInsideString(result, m.index) || isInsideComment(result, m.index)) continue;
    if (!isReactRouterLink(result, m.index)) continue;
    openPositions.push(m.index);
  }
  if (openPositions.length === 0) return result;

  const allReplacements: { start: number; end: number; text: string }[] = [];
  for (const pos of openPositions) {
    allReplacements.push({ start: pos, end: pos + 5, text: '<Link' });
    const tagEnd = result.indexOf('>', pos);
    if (tagEnd === -1) continue;
    const closeLowerIdx = result.indexOf('</link>', tagEnd);
    const closeUpperIdx = result.indexOf('</Link>', tagEnd);
    let closeIdx = -1;
    let closeLen = 7;
    if (closeLowerIdx !== -1 && closeUpperIdx !== -1) {
      closeIdx = Math.min(closeLowerIdx, closeUpperIdx);
    } else if (closeLowerIdx !== -1) {
      closeIdx = closeLowerIdx;
    } else if (closeUpperIdx !== -1) {
      closeIdx = closeUpperIdx;
    }
    if (closeIdx !== -1) {
      const nextOpen = result.indexOf('<link', tagEnd + 1);
      if (nextOpen === -1 || nextOpen > closeIdx) {
        allReplacements.push({ start: closeIdx, end: closeIdx + closeLen, text: '</Link>' });
      }
    }
  }

  allReplacements.sort((a, b) => b.start - a.start);
  for (const r of allReplacements) {
    result = result.slice(0, r.start) + r.text + result.slice(r.end);
  }
  return result;
}

function fixVoidElements(content: string, filePath: string): string {
  if (!isJsxFile(filePath)) return content;
  let result = content;
  for (const tag of VOID_ELEMENTS) {
    const openTagRegex = new RegExp(`<${tag}\\b`, 'g');
    let tagMatch: RegExpExecArray | null;
    const replacements: { start: number; end: number; replacement: string }[] = [];
    while ((tagMatch = openTagRegex.exec(result)) !== null) {
      if (isInsideString(result, tagMatch.index) || isInsideComment(result, tagMatch.index)) continue;
      if (tag === 'link' && isReactRouterLink(result, tagMatch.index)) continue;
      let depth = 0;
      let i = tagMatch.index + tagMatch[0].length;
      let foundEnd = false;
      while (i < result.length) {
        const ch = result[i];
        if (ch === '{') { depth++; i++; continue; }
        if (ch === '}') { depth--; i++; continue; }
        if (depth > 0) { i++; continue; }
        if (ch === '/' && result[i + 1] === '>') { foundEnd = true; break; }
        if (ch === '>' && result[i - 1] !== '=') {
          replacements.push({ start: i, end: i + 1, replacement: ' />' });
          foundEnd = true;
          break;
        }
        i++;
      }
    }
    for (let r = replacements.length - 1; r >= 0; r--) {
      const rep = replacements[r];
      result = result.slice(0, rep.start) + rep.replacement + result.slice(rep.end);
    }
  }
  return result;
}

function fixClassToClassName(content: string, filePath: string): string {
  if (!isJsxFile(filePath)) return content;
  return content.replace(/(<[a-zA-Z][a-zA-Z0-9]*\b[^>]*?)\bclass=/g, (match, before, offset) => {
    if (isInsideString(content, offset) || isInsideComment(content, offset)) return match;
    const context = content.substring(Math.max(0, offset - 30), offset);
    if (context.includes('svg') || context.includes('SVG')) return match;
    return `${before}className=`;
  });
}

function fixForToHtmlFor(content: string, filePath: string): string {
  if (!isJsxFile(filePath)) return content;
  return content.replace(/(<label\b[^>]*?)\bfor=/g, (match, before, offset) => {
    if (isInsideString(content, offset) || isInsideComment(content, offset)) return match;
    return `${before}htmlFor=`;
  });
}

function fixReactImportTypos(content: string): string {
  let result = content;
  for (const [typo, correct] of Object.entries(REACT_IMPORT_TYPOS)) {
    const regex = new RegExp(
      `(import\\s*\\{[^}]*?)\\b${typo}\\b([^}]*\\}\\s*from\\s*['"]react['"])`,
      'g'
    );
    result = result.replace(regex, `$1${correct}$2`);
  }
  return result;
}

function fixMissingDefaultExport(content: string, filePath: string): string {
  if (!isJsxFile(filePath)) return content;
  if (isEntryFile(filePath)) return content;
  if (/export\s+default\s+/.test(content)) return content;
  if (/export\s*\{\s*\w+\s+as\s+default\s*\}/.test(content)) return content;

  const fnMatch = content.match(/(?:export\s+)?function\s+([A-Z]\w*)\s*\(/);
  if (fnMatch) {
    const name = fnMatch[1];
    if (fnMatch[0].startsWith('export ')) {
      return content.replace(
        `export function ${name}`,
        `export default function ${name}`
      );
    }
    return content + `\nexport default ${name};\n`;
  }

  const constMatch = content.match(/(?:export\s+)?const\s+([A-Z]\w*)\s*=/);
  if (constMatch) {
    const name = constMatch[1];
    if (/export\s+default/.test(content)) return content;
    return content + `\nexport default ${name};\n`;
  }

  return content;
}

function fixUnclosedTags(content: string, filePath: string): string {
  if (!isJsxFile(filePath)) return content;
  let result = content;
  const CONTAINER_TAGS_HANDLED = ['Routes', 'Switch', 'BrowserRouter', 'HashRouter', 'MemoryRouter'];
  const tagStartRegex = /<([a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*)*)(?=[\s>\/])/g;
  let tagMatch: RegExpExecArray | null;
  const fixes: { index: number; tag: string }[] = [];

  while ((tagMatch = tagStartRegex.exec(content)) !== null) {
    const tag = tagMatch[1];
    // Skip TypeScript generic type parameters (e.g., React.HTMLAttributes<HTMLDivElement>)
    // In JSX, opening tags are never directly preceded by a word character
    const charBefore = tagMatch.index > 0 ? content[tagMatch.index - 1] : '';
    if (/\w/.test(charBefore)) continue;
    const baseName = tag.split('.')[0].toLowerCase();
    if (VOID_ELEMENTS.includes(baseName)) continue;
    if (CONTAINER_TAGS_HANDLED.includes(tag)) continue;
    if (isInsideString(content, tagMatch.index) || isInsideComment(content, tagMatch.index)) continue;
    const lineStart = content.lastIndexOf('\n', tagMatch.index) + 1;
    if (/^\s*import\s/.test(content.substring(lineStart))) continue;
    let depth = 0;
    let i = tagMatch.index + tagMatch[0].length;
    let selfClosed = false;
    let tagEndIndex = -1;
    while (i < content.length) {
      const ch = content[i];
      if (ch === '{') { depth++; i++; continue; }
      if (ch === '}') { depth--; i++; continue; }
      if (depth > 0) { i++; continue; }
      if (ch === '/' && content[i + 1] === '>') { selfClosed = true; break; }
      if (ch === '>') { tagEndIndex = i + 1; break; }
      i++;
    }
    if (selfClosed || tagEndIndex === -1) continue;
    const afterTag = content.substring(tagEndIndex);
    const closingTag = `</${tag}>`;
    if (!afterTag.includes(closingTag)) {
      fixes.push({ index: tagEndIndex, tag });
    }
  }

  for (let i = fixes.length - 1; i >= 0; i--) {
    const fix = fixes[i];
    const lineEnd = result.indexOf('\n', fix.index);
    const insertAt = lineEnd !== -1 ? lineEnd : result.length;
    result = result.substring(0, insertAt) + `</${fix.tag}>` + result.substring(insertAt);
  }

  return result;
}

function fixMissingClosingTags(content: string, filePath: string): string {
  if (!isJsxFile(filePath)) return content;
  let result = content;
  const containerTags = ['Routes', 'Switch', 'BrowserRouter', 'HashRouter', 'MemoryRouter'];
  for (const tag of containerTags) {
    const openRegex = new RegExp(`<${tag}[\\s>/]`, 'g');
    const closingTag = `</${tag}>`;
    const openMatches = result.match(openRegex);
    const closeMatches = result.match(new RegExp(closingTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
    const openCount = openMatches ? openMatches.length : 0;
    const closeCount = closeMatches ? closeMatches.length : 0;
    if (openCount === 0 || openCount <= closeCount) continue;

    const openIdxMatch = result.match(new RegExp(`<${tag}[\\s>/]`));
    if (!openIdxMatch) continue;
    const openIdx = openIdxMatch.index!;

    let lastChildEnd = -1;
    const routeCloseRegex = /<\/Route>/g;
    let rm: RegExpExecArray | null;
    while ((rm = routeCloseRegex.exec(result)) !== null) {
      if (rm.index > openIdx) lastChildEnd = rm.index + rm[0].length;
    }
    if (lastChildEnd === -1) {
      const selfCloseRegex = /<Route\b[^>]*\/>/g;
      while ((rm = selfCloseRegex.exec(result)) !== null) {
        if (rm.index > openIdx) lastChildEnd = rm.index + rm[0].length;
      }
    }

    if (lastChildEnd !== -1) {
      const lineEnd = result.indexOf('\n', lastChildEnd);
      const insertPos = lineEnd !== -1 ? lineEnd + 1 : lastChildEnd;
      const lineStart = result.lastIndexOf('\n', lastChildEnd - 1);
      const currentIndent = result.substring(lineStart + 1, lastChildEnd).match(/^(\s*)/)?.[1] || '';
      const parentIndent = currentIndent.length >= 2 ? currentIndent.slice(0, -2) : currentIndent;
      result = result.substring(0, insertPos) + parentIndent + closingTag + '\n' + result.substring(insertPos);
    } else {
      const openTagEnd = result.indexOf('>', openIdx);
      if (openTagEnd !== -1) {
        const lineEnd = result.indexOf('\n', openTagEnd);
        const insertPos = lineEnd !== -1 ? lineEnd + 1 : openTagEnd + 1;
        result = result.substring(0, insertPos) + '      ' + closingTag + '\n' + result.substring(insertPos);
      }
    }
  }
  return result;
}

export function autoFixCode(content: string, filePath: string): string {
  if (isEntryFile(filePath)) {
    let fixed = content;
    fixed = fixStraySemicolons(fixed);
    fixed = fixDuplicateSemicolons(fixed);
    return fixed;
  }

  const original = content;
  let fixed = content;
  fixed = fixStraySemicolons(fixed);
  fixed = fixDuplicateSemicolons(fixed);
  fixed = fixLinkCasing(fixed, filePath);
  fixed = fixVoidElements(fixed, filePath);
  fixed = fixClassToClassName(fixed, filePath);
  fixed = fixForToHtmlFor(fixed, filePath);
  fixed = fixReactImportTypos(fixed);
  fixed = fixMissingDefaultExport(fixed, filePath);
  fixed = fixUnclosedTags(fixed, filePath);
  fixed = fixMissingClosingTags(fixed, filePath);
  fixed = preserveImports(original, fixed);
  return fixed;
}

export function validateGeneratedCode(
  files: { path: string; content: string }[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const fixedFiles: { path: string; content: string }[] = [];

  for (const file of files) {
    const { path: filePath, content } = file;

    if (filePath.endsWith('package.json')) {
      checkPackageJson(content, filePath, errors);
      fixedFiles.push({ path: filePath, content });
      continue;
    }

    if (!isJsFile(filePath)) {
      fixedFiles.push({ path: filePath, content });
      continue;
    }

    checkBalancedBrackets(content, filePath, errors);
    checkBalancedQuotes(content, filePath, errors);
    checkStraySemicolons(content, filePath, errors);
    checkEmptyImports(content, filePath, errors);
    checkUndefinedNaNInJsx(content, filePath, errors);
    checkDefaultExport(content, filePath, errors);
    checkComponentReturnsJsx(content, filePath, errors);
    checkDuplicateDeclarations(content, filePath, errors);
    checkVoidElements(content, filePath, errors);
    checkClassVsClassName(content, filePath, warnings);
    checkHtmlFor(content, filePath, warnings);
    checkEventHandlerCasing(content, filePath, warnings);
    checkKeyInMap(content, filePath, warnings);
    checkCrossFileImports(files, filePath, content, warnings);

    const fixed = autoFixCode(content, filePath);
    fixedFiles.push({ path: filePath, content: fixed });
  }

  const criticalErrors = errors.filter(e => e.severity === 'error');
  const isValid = criticalErrors.length === 0;

  return { isValid, errors, warnings, fixedFiles };
}