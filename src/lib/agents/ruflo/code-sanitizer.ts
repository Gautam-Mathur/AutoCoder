import path from 'path';
import ts from 'typescript';
import { stripRawToolCallMarkup } from './tool-loop';

/**
 * Strips outer markdown fences and anchors stage output on the expected first markdown header.
 */
export function sanitizeStageOutput(rawOutput: string, expectedFirstHeader?: string): string {
  let cleaned = rawOutput.trim();

  while (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z0-9_-]*\r?\n?/, '').trim();
  }
  while (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/\r?\n?```$/, '').trim();
  }

  if (!expectedFirstHeader) return cleaned.trim();

  const headerRegex = new RegExp(
    `(#{1,4})\\s*${expectedFirstHeader.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
    'i'
  );
  const headerMatch = cleaned.match(headerRegex);

  if (headerMatch && headerMatch.index !== undefined && headerMatch.index > 0) {
    cleaned = cleaned.substring(headerMatch.index);
  }

  while (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/\r?\n?```$/, '').trim();
  }

  return cleaned.trim();
}

export function sanitizeCoderOutput(raw: string): string {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```[a-zA-Z0-9_+.-]*\r?\n?/gm, '').replace(/\r?\n?```\s*$/gm, '');
  const codeStart = cleaned.search(/^(<[!a-zA-Z\/]|[a-zA-Z_$\/*{]|import |const |let |var |function |class |\/\/|\/\*|#!|\s*<!)/m);
  if (codeStart > 5) cleaned = cleaned.substring(codeStart);
  const trailingIdx = cleaned.search(/\n{2,}(?:I hope|This implementation|This code|Note:|The above|Feel free|Let me know)/i);
  if (trailingIdx > 0) cleaned = cleaned.substring(0, trailingIdx);

  const placeholderPattern = /\/\/\s*\.\.\.?\s*(rest of|existing|unchanged|same as|remaining|previous)/i;
  if (placeholderPattern.test(cleaned)) {
    console.warn(`[WARN] Coder output contains lazy placeholder: "${cleaned.match(placeholderPattern)?.[0]}". Content preserved for linter detection.`);
  }

  return cleaned.trim();
}

/**
 * Verifies syntax validity using actual language parsers before accepting extracted code.
 */
export function isParserValid(content: string, ext: string): boolean {
  if (!content || !content.trim()) return false;
  if (ext === '.json') {
    try {
      JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  }
  if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
    try {
      const sf = ts.createSourceFile('test' + ext, content, ts.ScriptTarget.Latest, true);
      const diagnostics = (sf as unknown as { parseDiagnostics?: ts.Diagnostic[] }).parseDiagnostics || [];
      const fatalErrors = diagnostics.filter((d: ts.Diagnostic) => d.category === ts.DiagnosticCategory.Error);
      return fatalErrors.length === 0;
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Robust, parser-backed, file-type-aware sanitizer for Coder output.
 */
export function sanitizeCoderOutputForFile(raw: string, filePath?: string): string {
  if (!raw || !raw.trim()) return '';

  if (stripRawToolCallMarkup(raw).trim().length === 0) return '';

  let text = raw.trim();
  const ext = filePath ? path.extname(filePath).toLowerCase() : '';
  const extWithoutDot = ext.replace(/^\./, '');

  // 1. Language-Aware Fence Parsing
  const fenceRegex = /```([a-zA-Z0-9_+.-]*)\r?\n([\s\S]*?)\r?\n```/g;
  const matches = [...text.matchAll(fenceRegex)];

  if (matches.length > 0) {
    const isMatchingTag = (tag: string): boolean => {
      const t = tag.toLowerCase().trim();
      if (!t) return false;
      if (t === extWithoutDot) return true;
      if (['ts', 'tsx'].includes(extWithoutDot) && ['typescript', 'ts', 'tsx'].includes(t)) return true;
      if (['js', 'jsx', 'mjs', 'cjs'].includes(extWithoutDot) && ['javascript', 'js', 'jsx'].includes(t)) return true;
      if (['css', 'scss', 'less'].includes(extWithoutDot) && ['css', 'scss', 'less'].includes(t)) return true;
      if (extWithoutDot === 'html' && ['html', 'htm'].includes(t)) return true;
      if (extWithoutDot === 'json' && t === 'json') return true;
      if (extWithoutDot === 'prisma' && t === 'prisma') return true;
      return false;
    };

    const candidateFences = matches.filter((m) => isMatchingTag(m[1]));

    if (candidateFences.length === 1) {
      const codeCandidate = candidateFences[0][2].trim();
      if (isParserValid(codeCandidate, ext) && stripRawToolCallMarkup(codeCandidate).length > 0) {
        return codeCandidate;
      }
    } else if (candidateFences.length > 1) {
      const validBlocks = candidateFences
        .map((m) => m[2].trim())
        .filter((code) => isParserValid(code, ext) && stripRawToolCallMarkup(code).length > 0);
      if (validBlocks.length === 1) {
        return validBlocks[0];
      }
      const exportContaining = validBlocks.filter((b) => /\b(export\s+|module\.exports\b)/.test(b));
      if (exportContaining.length === 1) {
        return exportContaining[0];
      }
      if (validBlocks.length > 0) {
        return validBlocks.reduce((prev, curr) => (curr.length > prev.length ? curr : prev));
      }
    } else {
      const validGeneric = matches
        .map((m) => m[2].trim())
        .filter((code) => code.length > 10 && isParserValid(code, ext) && stripRawToolCallMarkup(code).length > 0);
      if (validGeneric.length === 1) {
        return validGeneric[0];
      }
    }
  }

  // 2. Strip single unclosed outer markdown fence if present
  text = text.replace(/^```[a-zA-Z0-9_+.-]*\r?\n/, '').replace(/\r?\n```\s*$/, '').trim();

  // 3. JSON Parsing (.json)
  if (ext === '.json') {
    const cleaned = stripRawToolCallMarkup(text);
    const firstBrace = cleaned.search(/[{\[]/);
    if (firstBrace >= 0) {
      for (let endIdx = cleaned.length; endIdx > firstBrace; endIdx--) {
        const char = cleaned[endIdx - 1];
        if (char === '}' || char === ']') {
          const candidate = cleaned.substring(firstBrace, endIdx);
          try {
            JSON.parse(candidate);
            return candidate.trim();
          } catch {}
        }
      }
    }
    return '';
  }

  // 4. JavaScript / TypeScript (.js, .jsx, .ts, .tsx)
  if (['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext)) {
    const cleaned = stripRawToolCallMarkup(text);
    const jsStart = cleaned.search(
      /^(?:\s*['"]use (?:client|server)['"];?|#!|\/\/|\/\*|import\s+|export\s+|const\s+|let\s+|var\s+|(?:async\s+)?function\s+|class\s+|interface\s+|type\s+|enum\s+|declare\s+|namespace\s+|\(\s*(?:async\s*)?\([^)]*\)\s*=>)/m
    );
    if (jsStart >= 0) {
      const candidate = cleaned.substring(jsStart).trim();
      if (isParserValid(candidate, ext)) {
        return candidate;
      }
    }
    if (isParserValid(cleaned, ext) && cleaned.length > 0) {
      return cleaned.trim();
    }
    return '';
  }

  // 5. CSS / SCSS (.css, .scss, .less)
  if (['.css', '.scss', '.less'].includes(ext)) {
    const cleaned = stripRawToolCallMarkup(text);
    const cssStart = cleaned.search(
      /^(?:\/\*|@(?:tailwind|import|charset|layer|property|keyframes|media|supports|font-face|container|page)|:root|\*|[.#a-zA-Z0-9_\-\[\]="':,\s]+\{)/m
    );
    if (cssStart >= 0) {
      const candidate = cleaned.substring(cssStart).trim();
      if (isParserValid(candidate, ext)) {
        return candidate;
      }
    }
    return cleaned.trim();
  }

  // 6. HTML / SVG (.html, .svg)
  if (['.html', '.svg'].includes(ext)) {
    const cleaned = stripRawToolCallMarkup(text);
    const htmlStart = cleaned.search(
      /^(?:<!DOCTYPE\s+html|<\?xml|<html|<head|<title|<meta|<link|<style|<script|<body|<header|<main|<nav|<footer|<section|<div|<svg|<!--)/im
    );
    if (htmlStart >= 0) {
      return cleaned.substring(htmlStart).trim();
    }
    return cleaned.trim();
  }

  // 7. Markdown (.md, .markdown)
  if (['.md', '.markdown'].includes(ext)) {
    const cleaned = stripRawToolCallMarkup(text);
    return cleaned.trim();
  }

  // 8. Prisma (.prisma)
  if (ext === '.prisma') {
    const cleaned = stripRawToolCallMarkup(text);
    const prismaStart = cleaned.search(/^(?:\/\/\s*[\w\-\s]+|datasource\s+|generator\s+|model\s+|enum\s+|type\s+)/m);
    if (prismaStart >= 0) {
      return cleaned.substring(prismaStart).trim();
    }
    return cleaned.trim();
  }

  const cleaned = stripRawToolCallMarkup(text);
  return cleaned.trim();
}

/**
 * Real-time stream extractor: unpacks pure source code as it streams character-by-character,
 * dynamically stripping XML tool invocation envelopes and markdown fences.
 */
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
