import ts from 'typescript';
import path from 'path';
import * as parse5 from 'parse5';
import * as cssWhat from 'css-what';
import { VerificationFailure } from './verification-loop';

export interface DomDocumentModel {
  filePath: string;
  ids: Set<string>;
  classes: Set<string>;
  tags: Set<string>;
  linkedScripts: string[];
  linkedStylesheets: string[];
}

export interface DomContractResult {
  status: 'PASS' | 'FAIL' | 'NOT_APPLICABLE' | 'INCOMPLETE';
  failures: VerificationFailure[];
  inspectedSelectorsCount: number;
  matchedCount: number;
  unresolvedCount: number;
  dynamicCount: number;
  details: string[];
}

/**
 * Resolves an HTML asset URL (script or stylesheet) to a canonical project-relative path.
 * Correctly distinguishes root-relative (/assets/app.js) from document-relative (../scripts/app.js).
 */
export function resolveHtmlAssetPath(htmlPath: string, assetUrl: string): string | null {
  // Strip external protocols or inlined data URIs
  if (/^(?:[a-z]+:)?\/\//i.test(assetUrl) || assetUrl.startsWith('data:') || assetUrl.startsWith('blob:')) {
    return null;
  }

  // Strip query strings and hash fragments
  const cleanUrl = assetUrl.split('?')[0].split('#')[0].trim();
  if (!cleanUrl) return null;

  // Decode URI components
  const decodedPath = decodeURIComponent(cleanUrl);

  let resolvedPath: string;
  if (decodedPath.startsWith('/')) {
    // Root-relative: relative to project root
    resolvedPath = path.posix.normalize(decodedPath.replace(/^\/+/, ''));
  } else {
    // Document-relative: relative to directory of the HTML document
    const htmlDir = path.posix.dirname(htmlPath);
    resolvedPath = path.posix.normalize(path.posix.join(htmlDir, decodedPath));
  }

  // Project root confinement check
  if (resolvedPath.startsWith('..') || path.posix.isAbsolute(resolvedPath)) {
    return null;
  }

  return resolvedPath;
}

/**
 * Parses an HTML file into a structured document model using the WHATWG parse5 parser.
 * Automatically handles unquoted attributes, uppercase attribute names, HTML entities, and comments.
 */
export function parseHtmlDocument(filePath: string, content: string): DomDocumentModel {
  const ids = new Set<string>();
  const classes = new Set<string>();
  const tags = new Set<string>();
  const linkedScripts: string[] = [];
  const linkedStylesheets: string[] = [];

  const documentAst = parse5.parse(content);

  function walk(node: any) {
    if (node.tagName) {
      const tagName = node.tagName.toLowerCase();
      tags.add(tagName);

      if (node.attrs && Array.isArray(node.attrs)) {
        for (const attr of node.attrs) {
          const attrName = attr.name.toLowerCase();
          const attrValue = attr.value || '';

          if (attrName === 'id' && attrValue) {
            ids.add(attrValue.trim());
          }
          if (attrName === 'class' && attrValue) {
            for (const c of attrValue.trim().split(/\s+/).filter(Boolean)) {
              classes.add(c);
            }
          }
          if (tagName === 'script' && attrName === 'src' && attrValue) {
            const resolved = resolveHtmlAssetPath(filePath, attrValue);
            if (resolved) linkedScripts.push(resolved);
          }
          if (tagName === 'link' && attrName === 'href' && attrValue) {
            const isStylesheet = node.attrs.some(
              (a: any) => a.name.toLowerCase() === 'rel' && a.value?.toLowerCase() === 'stylesheet'
            );
            if (isStylesheet) {
              const resolved = resolveHtmlAssetPath(filePath, attrValue);
              if (resolved) linkedStylesheets.push(resolved);
            }
          }
        }
      }
    }

    if (node.childNodes && Array.isArray(node.childNodes)) {
      for (const child of node.childNodes) {
        walk(child);
      }
    }
  }

  walk(documentAst);

  return {
    filePath,
    ids,
    classes,
    tags,
    linkedScripts,
    linkedStylesheets,
  };
}

/**
 * Validates a CSS selector string using the css-what AST parser.
 * Correctly distinguishes classes from attribute values (e.g. [data-label=".missing"]).
 */
export function validateCssSelectorTokens(
  selector: string,
  doc: DomDocumentModel
): { missingIds: string[]; missingClasses: string[]; missingTags: string[] } {
  const missingIds: string[] = [];
  const missingClasses: string[] = [];
  const missingTags: string[] = [];

  let parsedTokens: cssWhat.Selector[][];
  try {
    parsedTokens = cssWhat.parse(selector);
  } catch {
    // If selector syntax is invalid or unsupported, mark as missing so it is escalated
    return { missingIds: [], missingClasses: [], missingTags: [selector] };
  }

  for (const tokenSequence of parsedTokens) {
    for (const token of tokenSequence) {
      if (token.type === 'attribute') {
        if (token.name === 'id' && token.action === 'equals' && typeof token.value === 'string') {
          if (!doc.ids.has(token.value)) missingIds.push(token.value);
        }
        if (token.name === 'class' && token.action === 'element' && typeof token.value === 'string') {
          if (!doc.classes.has(token.value)) missingClasses.push(token.value);
        }
      }
      if (token.type === 'tag') {
        const tagName = token.name.toLowerCase();
        if (!['html', 'body', '*', ':root'].includes(tagName) && !doc.tags.has(tagName)) {
          missingTags.push(tagName);
        }
      }
    }
  }

  return {
    missingIds: [...new Set(missingIds)],
    missingClasses: [...new Set(missingClasses)],
    missingTags: [...new Set(missingTags)],
  };
}

/**
 * Validates DOM queries in JavaScript files against paired HTML documents.
 */
export function validateDomContracts(files: Record<string, string>): DomContractResult {
  const htmlEntries = Object.entries(files).filter(([p]) => p.endsWith('.html'));
  const jsEntries = Object.entries(files).filter(([p]) => /\.(js|jsx|ts|tsx)$/.test(p));

  if (htmlEntries.length === 0 && jsEntries.length === 0) {
    return {
      status: 'NOT_APPLICABLE',
      failures: [],
      inspectedSelectorsCount: 0,
      matchedCount: 0,
      unresolvedCount: 0,
      dynamicCount: 0,
      details: ['No HTML or JS files exist in workspace.'],
    };
  }

  if (htmlEntries.length === 0 && jsEntries.length > 0) {
    return {
      status: 'NOT_APPLICABLE',
      failures: [],
      inspectedSelectorsCount: 0,
      matchedCount: 0,
      unresolvedCount: 0,
      dynamicCount: 0,
      details: ['DOM contract validation not applicable: Backend project without HTML templates.'],
    };
  }

  const documents = htmlEntries.map(([p, content]) => parseHtmlDocument(path.posix.normalize(p), content));
  const scriptToDocs = new Map<string, DomDocumentModel[]>();

  for (const doc of documents) {
    for (const canonicalScriptPath of doc.linkedScripts) {
      const existing = scriptToDocs.get(canonicalScriptPath) || [];
      existing.push(doc);
      scriptToDocs.set(canonicalScriptPath, existing);
    }
  }

  const failures: VerificationFailure[] = [];
  const details: string[] = [];
  let inspectedCount = 0;
  let matchedCount = 0;
  let unresolvedCount = 0;
  let dynamicCount = 0;
  let hasOrphanScript = false;

  for (const [jsPath, content] of jsEntries) {
    const canonicalJsPath = path.posix.normalize(jsPath);
    const targetDocs = scriptToDocs.get(canonicalJsPath);

    // If script is not referenced in any HTML template:
    if (!targetDocs || targetDocs.length === 0) {
      hasOrphanScript = true;
      details.push(`[UNRESOLVED_SCRIPT] ${jsPath} is not referenced by any HTML template in the project.`);
      continue;
    }

    const sourceFile = ts.createSourceFile(jsPath, content, ts.ScriptTarget.ES2022, true);

    function visit(node: ts.Node) {
      if (ts.isCallExpression(node)) {
        const expr = node.expression;
        if (ts.isPropertyAccessExpression(expr)) {
          const propName = expr.name.text;
          const isDomQuery = [
            'getElementById',
            'getElementsByClassName',
            'getElementsByTagName',
            'querySelector',
            'querySelectorAll',
          ].includes(propName);

          if (isDomQuery) {
            inspectedCount++;
            const arg = node.arguments[0];
            const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

            if (!arg || !ts.isStringLiteral(arg)) {
              dynamicCount++;
              details.push(
                `[DYNAMIC_SELECTOR] ${jsPath}:${line + 1}:${character + 1} queries dynamic selector in ${propName}(). Marked as incomplete.`
              );
            } else {
              const selector = arg.text.trim();

              if (propName === 'getElementById') {
                // Disjunctive matching: Valid if present in AT LEAST ONE host document
                const existsInAny = targetDocs!.some((d) => d.ids.has(selector));
                if (!existsInAny) {
                  unresolvedCount++;
                  const docPaths = targetDocs!.map((d) => d.filePath).join(', ');
                  failures.push({
                    file: jsPath,
                    message: `DOM Contract Violation at Line ${line + 1}, Col ${character + 1}: getElementById("${selector}") references ID missing from paired template(s): ${docPaths}.`,
                    code: 'DOM_SELECTOR_MISSING_ID',
                  });
                } else {
                  matchedCount++;
                }
              } else if (propName === 'getElementsByClassName') {
                const parts = selector.split(/\s+/).filter(Boolean);
                const existsInAny = targetDocs!.some((d) => parts.every((c) => d.classes.has(c)));
                if (!existsInAny) {
                  unresolvedCount++;
                  failures.push({
                    file: jsPath,
                    message: `DOM Contract Violation at Line ${line + 1}: getElementsByClassName("${selector}") references class(es) missing from paired template(s).`,
                    code: 'DOM_SELECTOR_MISSING_CLASS',
                  });
                } else {
                  matchedCount++;
                }
              } else if (propName === 'getElementsByTagName') {
                const tag = selector.toLowerCase();
                const existsInAny = targetDocs!.some((d) => d.tags.has(tag));
                if (!existsInAny) {
                  unresolvedCount++;
                  failures.push({
                    file: jsPath,
                    message: `DOM Contract Violation at Line ${line + 1}: getElementsByTagName("${selector}") references tag not found in paired template(s).`,
                    code: 'DOM_SELECTOR_MISSING_TAG',
                  });
                } else {
                  matchedCount++;
                }
              } else if (propName === 'querySelector' || propName === 'querySelectorAll') {
                // Disjunctive matching across all host docs using parser-backed token extraction
                const existsInAny = targetDocs!.some((d) => {
                  const check = validateCssSelectorTokens(selector, d);
                  return check.missingIds.length === 0 && check.missingClasses.length === 0 && check.missingTags.length === 0;
                });

                if (!existsInAny) {
                  unresolvedCount++;
                  failures.push({
                    file: jsPath,
                    message: `DOM Contract Violation at Line ${line + 1}: ${propName}("${selector}") references element(s) missing from paired template(s).`,
                    code: 'DOM_SELECTOR_MISSING_ELEMENT',
                  });
                } else {
                  matchedCount++;
                }
              }
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }

  let status: 'PASS' | 'FAIL' | 'NOT_APPLICABLE' | 'INCOMPLETE' = 'PASS';
  if (failures.length > 0) {
    status = 'FAIL';
  } else if (dynamicCount > 0 || hasOrphanScript) {
    status = 'INCOMPLETE';
  }

  return {
    status,
    failures,
    inspectedSelectorsCount: inspectedCount,
    matchedCount,
    unresolvedCount,
    dynamicCount,
    details,
  };
}
