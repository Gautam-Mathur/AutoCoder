export interface CodeError {
  type: "syntax" | "runtime" | "type" | "reference" | "logic";
  message: string;
  line?: number;
  column?: number;
  code?: string;
}

export interface FixSuggestion {
  description: string;
  code: string;
  confidence: "high" | "medium" | "low";
  explanation: string;
}

const ERROR_PATTERNS: {
  pattern: RegExp;
  type: CodeError["type"];
  fixes: (match: RegExpMatchArray, code: string) => FixSuggestion[];
}[] = [
  {
    pattern: /[Uu]nclosed string literal|[Uu]nterminated string/,
    type: "syntax",
    fixes: (match, code) => {
      const lines = code.split('\n');
      const fixedLines = lines.map(line => {
        const singleQuoteCount = (line.match(/'/g) || []).length;
        const doubleQuoteCount = (line.match(/"/g) || []).length;
        const backtickCount = (line.match(/`/g) || []).length;

        if (singleQuoteCount % 2 !== 0) return line + "'";
        if (doubleQuoteCount % 2 !== 0) return line + '"';
        if (backtickCount % 2 !== 0) return line + '`';
        return line;
      });

      return [{
        description: "Close unclosed string literals",
        code: fixedLines.join('\n'),
        confidence: "high",
        explanation: "Added missing closing quotes to string literals",
      }];
    },
  },
  {
    pattern: /[Pp]otential XSS|innerHTML.*dangerous|innerHTML/i,
    type: "logic",
    fixes: (match, code) => {
      const fixedCode = code.replace(
        /\.innerHTML\s*=\s*([^;]+)/g,
        '.textContent = $1'
      );

      return [
        {
          description: "Replace innerHTML with textContent",
          code: fixedCode,
          confidence: "high",
          explanation: "Using textContent prevents XSS attacks by not parsing HTML",
        },
        {
          description: "Sanitize HTML before inserting",
          code: code.replace(
            /\.innerHTML\s*=\s*([^;]+)/g,
            '.innerHTML = DOMPurify.sanitize($1)'
          ),
          confidence: "medium",
          explanation: "Use DOMPurify library to sanitize HTML content",
        },
      ];
    },
  },
  {
    pattern: /[Mm]issing.*<!DOCTYPE|DOCTYPE.*missing/i,
    type: "logic",
    fixes: (match, code) => {
      const hasDoctype = code.trim().toLowerCase().startsWith('<!doctype');
      if (hasDoctype) {
        return [{
          description: "DOCTYPE already present",
          code: code,
          confidence: "high",
          explanation: "The document already has a DOCTYPE declaration",
        }];
      }

      return [{
        description: "Add HTML5 DOCTYPE declaration",
        code: '<!DOCTYPE html>\n' + code,
        confidence: "high",
        explanation: "Added HTML5 DOCTYPE to ensure standards mode rendering",
      }];
    },
  },
  {
    pattern: /SyntaxError: Unexpected token '([^']+)'/,
    type: "syntax",
    fixes: (match, code) => {
      const token = match[1];
      const suggestions: FixSuggestion[] = [];

      if (token === ")") {
        suggestions.push({
          description: "Add missing opening parenthesis",
          code: code.replace(/\(\s*\)/, "(/* add parameter */)"),
          confidence: "medium",
          explanation: "There might be a missing '(' before this closing parenthesis",
        });
      }

      if (token === "}") {
        suggestions.push({
          description: "Add missing opening brace",
          code: code.replace(/{\s*}/, "{ /* add code */ }"),
          confidence: "medium",
          explanation: "There might be a missing '{' before this closing brace",
        });
      }

      return suggestions;
    },
  },
  {
    pattern: /ReferenceError: (\w+) is not defined/,
    type: "reference",
    fixes: (match, code) => {
      const varName = match[1];
      const suggestions: FixSuggestion[] = [];

      const commonImports: Record<string, string> = {
        React: "import React from 'react';",
        useState: "import { useState } from 'react';",
        useEffect: "import { useEffect } from 'react';",
        useCallback: "import { useCallback } from 'react';",
        useMemo: "import { useMemo } from 'react';",
        useRef: "import { useRef } from 'react';",
        axios: "import axios from 'axios';",
        fetch: "// fetch is available globally in modern browsers",
        console: "// console is available globally",
        document: "// document is available in browser environment",
        window: "// window is available in browser environment",
      };

      if (commonImports[varName]) {
        suggestions.push({
          description: `Import ${varName}`,
          code: commonImports[varName] + "\n" + code,
          confidence: "high",
          explanation: `Add the import statement for ${varName}`,
        });
      }

      suggestions.push({
        description: `Define ${varName}`,
        code: `const ${varName} = null; // TODO: define ${varName}\n${code}`,
        confidence: "low",
        explanation: `Create a variable named ${varName}`,
      });

      return suggestions;
    },
  },
  {
    pattern: /TypeError: Cannot read propert(?:y|ies) '?(\w+)'? of (undefined|null)/,
    type: "type",
    fixes: (match, code) => {
      const property = match[1];
      const nullType = match[2];

      return [
        {
          description: "Add optional chaining",
          code: code.replace(
            new RegExp(`\\.${property}\\b`),
            `?.${property}`
          ),
          confidence: "high",
          explanation: `Use optional chaining (?.) to safely access ${property}`,
        },
        {
          description: "Add null check",
          code: `if (obj != null) {\n  ${code}\n}`,
          confidence: "medium",
          explanation: `Check if the object is not ${nullType} before accessing ${property}`,
        },
        {
          description: "Add default value",
          code: code.replace(
            new RegExp(`(\\w+)\\.${property}`),
            `($1 ?? {}).${property}`
          ),
          confidence: "medium",
          explanation: "Provide a default empty object to prevent null access",
        },
      ];
    },
  },
  {
    pattern: /Uncaught \(in promise\) (.+)/,
    type: "runtime",
    fixes: (match, code) => {
      const error = match[1];

      return [
        {
          description: "Add try-catch block",
          code: `try {\n  ${code}\n} catch (error) {\n  console.error('Error:', error);\n}`,
          confidence: "high",
          explanation: "Wrap async code in try-catch to handle promise rejections",
        },
        {
          description: "Add .catch() handler",
          code: code.replace(
            /\)(\s*);?\s*$/,
            ").catch(error => console.error(error));"
          ),
          confidence: "medium",
          explanation: "Chain a .catch() to handle the rejected promise",
        },
      ];
    },
  },
  {
    pattern: /SyntaxError: Unexpected end of input/,
    type: "syntax",
    fixes: (match, code) => {
      const openBraces = (code.match(/{/g) || []).length;
      const closeBraces = (code.match(/}/g) || []).length;
      const openParens = (code.match(/\(/g) || []).length;
      const closeParens = (code.match(/\)/g) || []).length;

      const suggestions: FixSuggestion[] = [];

      if (openBraces > closeBraces) {
        suggestions.push({
          description: `Add ${openBraces - closeBraces} missing closing brace(s)`,
          code: code + "}".repeat(openBraces - closeBraces),
          confidence: "high",
          explanation: "The code is missing closing braces",
        });
      }

      if (openParens > closeParens) {
        suggestions.push({
          description: `Add ${openParens - closeParens} missing closing parenthesis`,
          code: code + ")".repeat(openParens - closeParens),
          confidence: "high",
          explanation: "The code is missing closing parentheses",
        });
      }

      return suggestions;
    },
  },
  {
    pattern: /SyntaxError: missing \) after argument list/,
    type: "syntax",
    fixes: (match, code) => [{
      description: "Add missing closing parenthesis",
      code: code.replace(/([^)])\s*;?\s*$/, "$1);"),
      confidence: "high",
      explanation: "A function call is missing its closing parenthesis",
    }],
  },
  {
    pattern: /'(\w+)' is not a function/,
    type: "type",
    fixes: (match, code) => {
      const funcName = match[1];
      return [
        {
          description: `Check if ${funcName} is actually a function`,
          code: `if (typeof ${funcName} === 'function') {\n  ${funcName}();\n}`,
          confidence: "medium",
          explanation: `Verify ${funcName} is a function before calling it`,
        },
      ];
    },
  },
];

export function analyzeError(errorMessage: string, code: string): FixSuggestion[] {
  for (const { pattern, fixes } of ERROR_PATTERNS) {
    const match = errorMessage.match(pattern);
    if (match) {
      return fixes(match, code);
    }
  }

  return [{
    description: "Check browser console for details",
    code: code,
    confidence: "low",
    explanation: `Unable to automatically fix: ${errorMessage}`,
  }];
}

export function extractLineFromError(errorMessage: string): number | undefined {
  const lineMatch = errorMessage.match(/(?:line|Line)\s*:?\s*(\d+)/);
  if (lineMatch) {
    return parseInt(lineMatch[1], 10);
  }

  const stackMatch = errorMessage.match(/:(\d+):\d+/);
  if (stackMatch) {
    return parseInt(stackMatch[1], 10);
  }

  return undefined;
}

export function categorizeError(errorMessage: string): CodeError["type"] {
  if (/SyntaxError/i.test(errorMessage)) return "syntax";
  if (/TypeError/i.test(errorMessage)) return "type";
  if (/ReferenceError/i.test(errorMessage)) return "reference";
  if (/promise|async|await/i.test(errorMessage)) return "runtime";
  return "logic";
}

export function formatErrorForDisplay(error: CodeError): string {
  let message = `[${error.type.toUpperCase()}] ${error.message}`;
  if (error.line) {
    message += ` (line ${error.line}${error.column ? `:${error.column}` : ""})`;
  }
  return message;
}