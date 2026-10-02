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

export function validateReactHookImports(
  file: string,
  content: string,
  errors: ProjectValidationError[]
): void {
  const hooks = [
    'useState',
    'useEffect',
    'useContext',
    'useReducer',
    'useCallback',
    'useMemo',
    'useRef',
    'useLayoutEffect',
    'useTransition',
  ];

  for (const hook of hooks) {
    if (!new RegExp(`\\b${hook}\\s*\\(`).test(content)) {
      continue;
    }

    const imported = new RegExp(
      `import\\s*\\{[^}]*\\b${hook}\\b[^}]*\\}\\s*from\\s*['"]react['"]`
    ).test(content);

    if (!imported) {
      errors.push({
        file,
        line: 1,
        message: `React hook "${hook}" is used but is not explicitly imported from "react".`,
      });
    }
  }
}

function getProjectCompilerOptions(
  vfsContentMap: Map<string, string>
): ts.CompilerOptions {
  let tsconfigRaw: string | undefined;
  for (const [k, v] of vfsContentMap.entries()) {
    if (k === 'tsconfig.json' || k.endsWith('/tsconfig.json')) {
      tsconfigRaw = v;
      break;
    }
  }

  const baseOptions: ts.CompilerOptions = {
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

  if (!tsconfigRaw) {
    return baseOptions;
  }

  const parsedJson = ts.parseConfigFileTextToJson('tsconfig.json', tsconfigRaw);
  if (parsedJson.error) {
    return baseOptions;
  }

  const parseHost: ts.ParseConfigHost = {
    useCaseSensitiveFileNames: true,
    readDirectory: () => [],
    fileExists: (f) => {
      const normalized = f.replace(/\\/g, '/').replace(/^\.\//, '');
      if (vfsContentMap.has(normalized)) return true;
      for (const k of vfsContentMap.keys()) {
        if (normalized.endsWith(k)) return true;
      }
      return false;
    },
    readFile: (f) => {
      const normalized = f.replace(/\\/g, '/').replace(/^\.\//, '');
      if (vfsContentMap.has(normalized)) return vfsContentMap.get(normalized);
      for (const [k, v] of vfsContentMap.entries()) {
        if (normalized.endsWith(k)) return v;
      }
      return undefined;
    },
  };

  const parsed = ts.parseJsonConfigFileContent(
    parsedJson.config,
    parseHost,
    '.'
  );

  return {
    ...baseOptions,
    ...parsed.options,
    noEmit: true,
    skipLibCheck: parsed.options.skipLibCheck ?? true,
  };
}

/**
 * Executes a whole-project TypeScript compilation pass across all files in the Virtual File System.
 */
export async function validateGeneratedProject(
  input: string | Map<string, string> | Record<string, string>
): Promise<ProjectValidationResult> {
  const vfsContentMap = new Map<string, string>();
  let codeFiles: string[] = [];

  if (typeof input === 'string') {
    const allVfsFiles = await listVirtualFiles(input);
    codeFiles = allVfsFiles.filter((f: string) => /\.(js|jsx|ts|tsx)$/.test(f));
    for (const f of codeFiles) {
      const content = await readVirtualFile(input, f);
      if (content !== null) {
        vfsContentMap.set(f, content);
      }
    }
  } else if (input instanceof Map) {
    for (const [k, v] of input.entries()) {
      vfsContentMap.set(k.replace(/\\/g, '/').replace(/^\.\//, ''), v);
    }
    codeFiles = Array.from(vfsContentMap.keys()).filter((f) => /\.(js|jsx|ts|tsx)$/.test(f));
  } else {
    for (const [k, v] of Object.entries(input)) {
      vfsContentMap.set(k.replace(/\\/g, '/').replace(/^\.\//, ''), v);
    }
    codeFiles = Array.from(vfsContentMap.keys()).filter((f) => /\.(js|jsx|ts|tsx)$/.test(f));
  }

  const errors: ProjectValidationError[] = [];
  const warnings: ProjectValidationError[] = [];

  for (const [file, content] of vfsContentMap.entries()) {
    if (/\.(tsx?|jsx?)$/.test(file)) {
      validateReactHookImports(file, content, errors);
    }
  }

  const compilerOptions = getProjectCompilerOptions(vfsContentMap);
  const host = ts.createCompilerHost(compilerOptions);
  const defaultReadFile = host.readFile;
  const defaultFileExists = host.fileExists;

  host.readFile = (fileName: string) => {
    const normalized = fileName.replace(/\\/g, '/').replace(/^\.\//, '');
    if (vfsContentMap.has(normalized)) {
      return vfsContentMap.get(normalized)!;
    }
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
