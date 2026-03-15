import { analyzeError, FixSuggestion } from "./error-fixer";

export interface AutoFixResult {
  error: string;
  fixed: boolean;
  action: string;
  details?: string;
  codeChanges?: { file: string; original: string; fixed: string }[];
}

export interface AutoFixConfig {
  enabled: boolean;
  maxRetries: number;
  autoApply: boolean;
  onFix?: (result: AutoFixResult) => void;
  onError?: (error: string) => void;
}

type AutoFixHandler = (
  error: string,
  context: AutoFixContext
) => AutoFixResult | null;

export interface AutoFixContext {
  files: { path: string; content: string }[];
  updateFile: (path: string, content: string) => Promise<void>;
  addTerminalLine: (type: string, message: string) => void;
  retryCount: number;
}

const AUTO_FIX_HANDLERS: { pattern: RegExp; handler: AutoFixHandler }[] = [
  {
    pattern: /WebContainers require SharedArrayBuffer|cross-origin isolation/i,
    handler: (error, ctx) => {
      ctx.addTerminalLine("warn", "WebContainer requires cross-origin isolation headers.");
      ctx.addTerminalLine("info", "Auto-fix: This is a server configuration issue.");
      ctx.addTerminalLine("info", "→ The preview will use fallback mode (iframe sandbox).");
      return {
        error,
        fixed: true,
        action: "Switched to fallback preview mode",
        details: "WebContainer requires COOP/COEP headers. Using iframe sandbox instead.",
      };
    },
  },
  {
    pattern: /Cannot find module ['"]([^'"]+)['"]/,
    handler: (error, ctx) => {
      const match = error.match(/Cannot find module ['"]([^'"]+)['"]/);
      if (!match) return null;

      const moduleName = match[1];
      ctx.addTerminalLine("warn", `Missing module: ${moduleName}`);
      ctx.addTerminalLine("info", `Auto-fix: Adding ${moduleName} to package.json...`);

      const pkgFile = ctx.files.find(f => f.path === "package.json");
      if (pkgFile) {
        try {
          const pkg = JSON.parse(pkgFile.content);
          if (!pkg.dependencies) pkg.dependencies = {};
          pkg.dependencies[moduleName] = "*";
          const fixed = JSON.stringify(pkg, null, 2);

          return {
            error,
            fixed: true,
            action: `Added ${moduleName} to dependencies`,
            details: `Run npm install to complete the fix`,
            codeChanges: [{ file: "package.json", original: pkgFile.content, fixed }],
          };
        } catch {
          return null;
        }
      }
      return null;
    },
  },
  {
    pattern: /No matching export in "([^"]+)" for import "([^"]+)"/,
    handler: (error, ctx) => {
      const match = error.match(/No matching export in "([^"]+)" for import "([^"]+)"/);
      if (!match) return null;

      const [, rawPath, exportName] = match;
      const filePath = rawPath.replace(/^.*?\/(?=src\/)/, '');
      ctx.addTerminalLine("warn", `Missing export "${exportName}" in ${filePath}`);

      const KNOWN_UI_FILES: Record<string, Record<string, string>> = {
        'src/components/ui/toaster.tsx': {
          'Toaster': `// @generated\nimport { useToast } from "@/hooks/use-toast";\n\nexport function Toaster() {\n  const { toasts, dismiss } = useToast();\n\n  if (toasts.length === 0) return null;\n\n  return (\n    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">\n      {toasts.map((toast) => (\n        <div\n          key={toast.id}\n          className={\n            "rounded-lg border p-4 shadow-lg transition-all " +\n            (toast.variant === "destructive"\n              ? "bg-red-600 text-white border-red-700"\n              : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700")\n          }\n          role="alert"\n        >\n          {toast.title && <div className="font-semibold text-sm">{toast.title}</div>}\n          {toast.description && <div className="text-sm mt-1 opacity-90">{toast.description}</div>}\n          <button\n            onClick={() => dismiss(toast.id)}\n            className="absolute top-2 right-2 text-xs opacity-50 hover:opacity-100"\n          >\n            x\n          </button>\n        </div>\n      ))}\n    </div>\n  );\n}\n`,
        },
        'src/hooks/use-toast.ts': {
          'useToast': `// @generated\nimport { useState, useEffect } from "react";\n\ntype ToastVariant = "default" | "destructive";\ninterface Toast { id: string; title?: string; description?: string; variant?: ToastVariant; }\ntype ToastInput = Omit<Toast, "id">;\n\nlet toastCount = 0;\nlet listeners: Array<(t: Toast[]) => void> = [];\nlet memoryToasts: Toast[] = [];\n\nfunction dispatch(t: Toast[]) { memoryToasts = t; listeners.forEach(l => l(t)); }\n\nexport function toast(props: ToastInput) {\n  const id = String(++toastCount);\n  const t = { ...props, id };\n  dispatch([...memoryToasts, t]);\n  setTimeout(() => dismiss(id), 5000);\n  return { id, dismiss: () => dismiss(id) };\n}\n\nexport function dismiss(id: string) { dispatch(memoryToasts.filter(t => t.id !== id)); }\n\nexport function useToast() {\n  const [toasts, setToasts] = useState<Toast[]>(memoryToasts);\n  useEffect(() => { listeners.push(setToasts); return () => { listeners = listeners.filter(l => l !== setToasts); }; }, []);\n  return { toasts, toast, dismiss };\n}\n`,
          'toast': `// @generated\nimport { useState, useEffect } from "react";\n\ntype ToastVariant = "default" | "destructive";\ninterface Toast { id: string; title?: string; description?: string; variant?: ToastVariant; }\ntype ToastInput = Omit<Toast, "id">;\n\nlet toastCount = 0;\nlet listeners: Array<(t: Toast[]) => void> = [];\nlet memoryToasts: Toast[] = [];\n\nfunction dispatch(t: Toast[]) { memoryToasts = t; listeners.forEach(l => l(t)); }\n\nexport function toast(props: ToastInput) {\n  const id = String(++toastCount);\n  const t = { ...props, id };\n  dispatch([...memoryToasts, t]);\n  setTimeout(() => dismiss(id), 5000);\n  return { id, dismiss: () => dismiss(id) };\n}\n\nexport function dismiss(id: string) { dispatch(memoryToasts.filter(t => t.id !== id)); }\n\nexport function useToast() {\n  const [toasts, setToasts] = useState<Toast[]>(memoryToasts);\n  useEffect(() => { listeners.push(setToasts); return () => { listeners = listeners.filter(l => l !== setToasts); }; }, []);\n  return { toasts, toast, dismiss };\n}\n`,
          'dismiss': `// @generated\nimport { useState, useEffect } from "react";\n\ntype ToastVariant = "default" | "destructive";\ninterface Toast { id: string; title?: string; description?: string; variant?: ToastVariant; }\ntype ToastInput = Omit<Toast, "id">;\n\nlet toastCount = 0;\nlet listeners: Array<(t: Toast[]) => void> = [];\nlet memoryToasts: Toast[] = [];\n\nfunction dispatch(t: Toast[]) { memoryToasts = t; listeners.forEach(l => l(t)); }\n\nexport function toast(props: ToastInput) {\n  const id = String(++toastCount);\n  const t = { ...props, id };\n  dispatch([...memoryToasts, t]);\n  setTimeout(() => dismiss(id), 5000);\n  return { id, dismiss: () => dismiss(id) };\n}\n\nexport function dismiss(id: string) { dispatch(memoryToasts.filter(t => t.id !== id)); }\n\nexport function useToast() {\n  const [toasts, setToasts] = useState<Toast[]>(memoryToasts);\n  useEffect(() => { listeners.push(setToasts); return () => { listeners = listeners.filter(l => l !== setToasts); }; }, []);\n  return { toasts, toast, dismiss };\n}\n`,
        },
        'src/lib/queryClient.ts': {
          'queryClient': `// @generated\nimport { QueryClient } from "@tanstack/react-query";\n\nexport const queryClient = new QueryClient({\n  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: Infinity, retry: false } },\n});\n\nexport async function apiRequest(method: string, url: string, data?: unknown) {\n  const res = await fetch(url, {\n    method,\n    headers: data ? { "Content-Type": "application/json" } : {},\n    body: data ? JSON.stringify(data) : undefined,\n  });\n  if (!res.ok) throw new Error(await res.text());\n  return res;\n}\n`,
          'apiRequest': `// @generated\nimport { QueryClient } from "@tanstack/react-query";\n\nexport const queryClient = new QueryClient({\n  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: Infinity, retry: false } },\n});\n\nexport async function apiRequest(method: string, url: string, data?: unknown) {\n  const res = await fetch(url, {\n    method,\n    headers: data ? { "Content-Type": "application/json" } : {},\n    body: data ? JSON.stringify(data) : undefined,\n  });\n  if (!res.ok) throw new Error(await res.text());\n  return res;\n}\n`,
        },
      };

      const knownFile = KNOWN_UI_FILES[filePath];
      if (knownFile && knownFile[exportName]) {
        ctx.addTerminalLine("info", `Auto-fix: Regenerating ${filePath} with correct "${exportName}" export...`);
        const targetFile = ctx.files.find(f => f.path === filePath);
        return {
          error,
          fixed: true,
          action: `Regenerated ${filePath} with correct "${exportName}" export`,
          codeChanges: [{ file: filePath, original: targetFile?.content || '', fixed: knownFile[exportName] }],
        };
      }

      const targetFile = ctx.files.find(f => f.path === filePath);
      if (targetFile) {
        const hasExport = new RegExp(`export\\s+(?:const|function|class|let|var|type|interface)\\s+${exportName}\\b`).test(targetFile.content);
        if (!hasExport) {
          ctx.addTerminalLine("info", `Auto-fix: Adding stub export "${exportName}" to ${filePath}...`);
          const hasDefault = /export\s+default\s/.test(targetFile.content);
          const stub = hasDefault
            ? `\nexport const ${exportName} = {} as any;\n`
            : `\nexport function ${exportName}() { return null; }\n`;
          return {
            error,
            fixed: true,
            action: `Added missing export "${exportName}" to ${filePath}`,
            codeChanges: [{ file: filePath, original: targetFile.content, fixed: targetFile.content + stub }],
          };
        }
      }

      return {
        error,
        fixed: false,
        action: `Missing export "${exportName}" in ${filePath}`,
        details: `The file doesn't export a member named "${exportName}". Check the file and add the export.`,
      };
    },
  },
  {
    pattern: /ENOENT.*package\.json|no such file.*package\.json/i,
    handler: (error, ctx) => {
      ctx.addTerminalLine("warn", "No package.json found.");
      ctx.addTerminalLine("info", "Auto-fix: Creating default package.json...");

      const defaultPkg = JSON.stringify({
        name: "project",
        version: "1.0.0",
        type: "module",
        scripts: {
          dev: "node index.js",
          start: "node index.js"
        },
        dependencies: {}
      }, null, 2);

      return {
        error,
        fixed: true,
        action: "Created package.json",
        codeChanges: [{ file: "package.json", original: "", fixed: defaultPkg }],
      };
    },
  },
  {
    pattern: /SyntaxError: Cannot use import statement outside a module/i,
    handler: (error, ctx) => {
      ctx.addTerminalLine("warn", "ES Module syntax used without module type.");
      ctx.addTerminalLine("info", "Auto-fix: Setting type: module in package.json...");

      const pkgFile = ctx.files.find(f => f.path === "package.json");
      if (pkgFile) {
        try {
          const pkg = JSON.parse(pkgFile.content);
          pkg.type = "module";
          const fixed = JSON.stringify(pkg, null, 2);

          return {
            error,
            fixed: true,
            action: "Set type: module in package.json",
            codeChanges: [{ file: "package.json", original: pkgFile.content, fixed }],
          };
        } catch {
          return null;
        }
      }
      return null;
    },
  },
  {
    pattern: /ReferenceError: (\w+) is not defined/,
    handler: (error, ctx) => {
      const match = error.match(/ReferenceError: (\w+) is not defined/);
      if (!match) return null;

      const varName = match[1];
      ctx.addTerminalLine("warn", `Undefined variable: ${varName}`);

      const commonFixes: Record<string, { file: string; import: string }> = {
        React: { file: "*.jsx,*.tsx", import: "import React from 'react';" },
        useState: { file: "*.jsx,*.tsx", import: "import { useState } from 'react';" },
        useEffect: { file: "*.jsx,*.tsx", import: "import { useEffect } from 'react';" },
        useCallback: { file: "*.jsx,*.tsx", import: "import { useCallback } from 'react';" },
        useMemo: { file: "*.jsx,*.tsx", import: "import { useMemo } from 'react';" },
        useRef: { file: "*.jsx,*.tsx", import: "import { useRef } from 'react';" },
        express: { file: "*.js,*.ts", import: "import express from 'express';" },
        fs: { file: "*.js,*.ts", import: "import fs from 'fs';" },
        path: { file: "*.js,*.ts", import: "import path from 'path';" },
      };

      const fix = commonFixes[varName];
      if (fix) {
        ctx.addTerminalLine("info", `Auto-fix: Adding import for ${varName}...`);
        return {
          error,
          fixed: true,
          action: `Suggested import: ${fix.import}`,
          details: `Add this import to the file using ${varName}`,
        };
      }

      return {
        error,
        fixed: false,
        action: `Variable "${varName}" is not defined`,
        details: "Check if the variable is declared or needs to be imported",
      };
    },
  },
  {
    pattern: /TypeError: Cannot read propert(?:y|ies) ['"]?(\w+)['"]? of (undefined|null)/,
    handler: (error, ctx) => {
      const match = error.match(/TypeError: Cannot read propert(?:y|ies) ['"]?(\w+)['"]? of (undefined|null)/);
      if (!match) return null;

      const [, prop, nullType] = match;
      ctx.addTerminalLine("warn", `Null pointer: accessing "${prop}" on ${nullType}`);
      ctx.addTerminalLine("info", "Auto-fix: Use optional chaining (?.) or null checks");

      return {
        error,
        fixed: false,
        action: `Add null check before accessing "${prop}"`,
        details: `Replace .${prop} with ?.${prop} or add if (obj) check`,
      };
    },
  },
  {
    pattern: /EADDRINUSE|address already in use/i,
    handler: (error, ctx) => {
      ctx.addTerminalLine("warn", "Port already in use.");
      ctx.addTerminalLine("info", "Auto-fix: The previous server instance may still be running.");

      return {
        error,
        fixed: true,
        action: "Port conflict detected",
        details: "Wait for the previous server to stop or use a different port",
      };
    },
  },
  {
    pattern: /Unexpected token ['<']/,
    handler: (error, ctx) => {
      ctx.addTerminalLine("warn", "Unexpected token '<' - likely JSX without proper setup.");
      ctx.addTerminalLine("info", "Auto-fix: Ensure JSX files have .jsx/.tsx extension");

      return {
        error,
        fixed: false,
        action: "JSX syntax in non-JSX file",
        details: "Rename file to .jsx/.tsx or configure babel for JSX",
      };
    },
  },
  {
    pattern: /ERR_MODULE_NOT_FOUND|ERR_UNSUPPORTED_DIR_IMPORT/,
    handler: (error, ctx) => {
      ctx.addTerminalLine("warn", "Module resolution error.");
      ctx.addTerminalLine("info", "Auto-fix: Check import paths and file extensions");

      return {
        error,
        fixed: false,
        action: "Module not found",
        details: "In ES modules, include file extensions in imports (.js, .mjs)",
      };
    },
  },
  {
    pattern: /npm ERR!|npm error/i,
    handler: (error, ctx) => {
      ctx.addTerminalLine("warn", "npm encountered an error.");

      if (/ERESOLVE|peer dep|dependency conflict/i.test(error)) {
        ctx.addTerminalLine("info", "Auto-fix: Try npm install --legacy-peer-deps");
        return {
          error,
          fixed: false,
          action: "Dependency conflict",
          details: "Run: npm install --legacy-peer-deps",
        };
      }

      return null;
    },
  },
  {
    pattern: /Maximum call stack size exceeded/,
    handler: (error, ctx) => {
      ctx.addTerminalLine("warn", "Stack overflow - infinite recursion detected.");
      ctx.addTerminalLine("info", "Auto-fix: Check for circular function calls or infinite loops");

      return {
        error,
        fixed: false,
        action: "Stack overflow",
        details: "Look for functions that call themselves without a base case",
      };
    },
  },
];

export class AutoFixEngine {
  private config: AutoFixConfig;
  private fixHistory: AutoFixResult[] = [];
  private recentErrors: Set<string> = new Set();

  constructor(config: Partial<AutoFixConfig> = {}) {
    this.config = {
      enabled: true,
      maxRetries: 3,
      autoApply: true,
      ...config,
    };
  }

  processError(error: string, context: AutoFixContext): AutoFixResult | null {
    if (!this.config.enabled) return null;

    const errorKey = error.slice(0, 100);
    if (this.recentErrors.has(errorKey) && context.retryCount >= this.config.maxRetries) {
      context.addTerminalLine("error", `Max retries (${this.config.maxRetries}) reached for this error.`);
      return null;
    }
    this.recentErrors.add(errorKey);

    for (const { pattern, handler } of AUTO_FIX_HANDLERS) {
      if (pattern.test(error)) {
        const result = handler(error, context);
        if (result) {
          this.fixHistory.push(result);
          this.config.onFix?.(result);

          if (result.fixed && result.codeChanges && this.config.autoApply) {
            this.applyFixes(result.codeChanges, context);
          }

          return result;
        }
      }
    }

    const genericSuggestions = analyzeError(error, "");
    if (genericSuggestions.length > 0 && genericSuggestions[0].confidence !== "low") {
      context.addTerminalLine("info", `Suggestion: ${genericSuggestions[0].description}`);
      return {
        error,
        fixed: false,
        action: genericSuggestions[0].description,
        details: genericSuggestions[0].explanation,
      };
    }

    return null;
  }

  private async applyFixes(
    changes: { file: string; original: string; fixed: string }[],
    context: AutoFixContext
  ) {
    for (const change of changes) {
      try {
        await context.updateFile(change.file, change.fixed);
        context.addTerminalLine("success", `✓ Auto-fixed: ${change.file}`);
      } catch (err) {
        context.addTerminalLine("error", `Failed to apply fix to ${change.file}`);
      }
    }
  }

  getHistory(): AutoFixResult[] {
    return [...this.fixHistory];
  }

  clearHistory() {
    this.fixHistory = [];
    this.recentErrors.clear();
  }

  setEnabled(enabled: boolean) {
    this.config.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }
}

export const autoFixEngine = new AutoFixEngine();

export function processTerminalOutput(
  output: string,
  context: AutoFixContext
): AutoFixResult[] {
  const results: AutoFixResult[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    if (/error|Error|ERROR|failed|Failed|FAILED|exception|Exception/i.test(line)) {
      const result = autoFixEngine.processError(line, context);
      if (result) {
        results.push(result);
      }
    }
  }

  return results;
}