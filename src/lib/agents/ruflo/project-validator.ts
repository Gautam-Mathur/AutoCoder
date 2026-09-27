import ts from 'typescript';
import { readVirtualFile, listVirtualFiles } from './vfs';

export interface ProjectValidationError {
  file: string;
  line: number;
  message: string;
  code?: number;
}

export interface ProjectValidationResult {
  success: boolean;
  errors: ProjectValidationError[];
  warnings: ProjectValidationError[];
}

/**
 * Executes a whole-project TypeScript compilation pass across all files in the Virtual File System.
 */
export async function validateGeneratedProject(conversationId: string): Promise<ProjectValidationResult> {
  const allVfsFiles = await listVirtualFiles(conversationId);
  const codeFiles = allVfsFiles.filter((f: string) => /\.(js|jsx|ts|tsx)$/.test(f));
  const vfsContentMap = new Map<string, string>();

  for (const f of codeFiles) {
    const content = await readVirtualFile(conversationId, f);
    if (content !== null) {
      vfsContentMap.set(f, content);
    }
  }

  const errors: ProjectValidationError[] = [];
  const warnings: ProjectValidationError[] = [];

  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    allowJs: true,
    noEmit: true,
    skipLibCheck: true,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    baseUrl: '.',
    paths: {
      '@/*': ['./src/*', './*'],
    },
  };

  const host = ts.createCompilerHost(compilerOptions);
  const defaultReadFile = host.readFile;
  const defaultFileExists = host.fileExists;

  host.readFile = (fileName: string) => {
    const normalized = fileName.replace(/\\/g, '/').replace(/^\.\//, '');
    if (vfsContentMap.has(normalized)) {
      return vfsContentMap.get(normalized)!;
    }
    // Search with src/ prefix fallback
    for (const [k, v] of vfsContentMap.entries()) {
      if (normalized.endsWith(k)) return v;
    }
    return defaultReadFile(fileName);
  };

  host.fileExists = (fileName: string) => {
    const normalized = fileName.replace(/\\/g, '/').replace(/^\.\//, '');
    if (vfsContentMap.has(normalized)) return true;
    for (const k of vfsContentMap.keys()) {
      if (normalized.endsWith(k)) return true;
    }
    return defaultFileExists(fileName);
  };

  const program = ts.createProgram(codeFiles, compilerOptions, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);

  for (const diag of diagnostics) {
    let file = 'project';
    let line = 1;

    if (diag.file) {
      file = diag.file.fileName.replace(/\\/g, '/');
      if (diag.start !== undefined) {
        const pos = diag.file.getLineAndCharacterOfPosition(diag.start);
        line = pos.line + 1;
      }
    }

    const message = ts.flattenDiagnosticMessageText(diag.messageText, '\n');
    const errObj: ProjectValidationError = {
      file,
      line,
      message,
      code: diag.code,
    };

    if (diag.category === ts.DiagnosticCategory.Error) {
      errors.push(errObj);
    } else {
      warnings.push(errObj);
    }
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
  };
}
