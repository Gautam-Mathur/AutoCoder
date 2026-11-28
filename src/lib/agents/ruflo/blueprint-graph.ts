import { ProjectContract } from './contracts';
import { resolveModule, parseTsConfigOptions } from './module-resolver';
import { parseSpecsRequired } from './coder-context';

function escapeRegex(val: string): string {
  return val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface BlueprintFileSection {
  file: string;
  purpose: string;
  dependencies: string[];
  specsRequired: string[];
  exports: string[];
  details: string;
  rawSection: string;
}

export function parseBlueprintFiles(blueprintText: string): BlueprintFileSection[] {
  const sections: BlueprintFileSection[] = [];
  const fileBlocks = blueprintText.split(/###\s*File:\s*/i).slice(1);

  const seenFileMap = new Map<string, number>();

  for (const block of fileBlocks) {
    const lines = block.trim().split('\n');
    const rawFile = lines[0].trim();
    if (!rawFile) continue;

    const file = rawFile
      .replace(/[*`'"]/g, '')
      .replace(/^\.\//, '')
      .replace(/^\//, '')
      .split(/\s+[\(\[\{]/)[0]
      .trim()
      .replace(/\/+$/, '');

    if (!file || rawFile.trim().endsWith('/') || rawFile.trim().endsWith('/`')) continue;

    const normKey = file.toLowerCase();

    const rawSection = '### File: ' + block.trim();
    const purposeMatch = block.match(/\*\*Purpose\*\*:\s*(.+)/i);
    const depsMatch = block.match(/\*\*Dependencies\*\*:\s*(.+)/i);
    const exportsMatch = block.match(/\*\*Exports\*\*:\s*(.+)/i);

    const purpose = purposeMatch ? purposeMatch[1].trim() : '';
    const depsRaw = depsMatch ? depsMatch[1].trim() : 'None';
    const dependencies =
      depsRaw.toLowerCase() === 'none'
        ? []
        : depsRaw
            .split(',')
            .map((d) => d.trim().replace(/[*`'"]/g, '').replace(/^\.\//, '').replace(/^\//, ''))
            .filter(Boolean);
    const specsRequired = parseSpecsRequired(rawSection).map((s) => `${s.file}#${s.section}`);
    const exportsRaw = exportsMatch ? exportsMatch[1].trim() : 'None';
    const exportsList =
      exportsRaw.toLowerCase() === 'none' ? [] : exportsRaw.split(',').map((e) => e.trim()).filter(Boolean);

    if (seenFileMap.has(normKey)) {
      const existingIdx = seenFileMap.get(normKey)!;
      const existing = sections[existingIdx];
      for (const d of dependencies) {
        if (!existing.dependencies.includes(d)) {
          existing.dependencies.push(d);
        }
      }
      continue;
    }

    seenFileMap.set(normKey, sections.length);
    sections.push({
      file,
      purpose,
      dependencies,
      specsRequired,
      exports: exportsList,
      details: block,
      rawSection,
    });
  }

  const isWebProject = sections.some(
    (s) =>
      s.file.endsWith('.css') ||
      s.file.endsWith('.html') ||
      s.file.endsWith('.js') ||
      s.file.endsWith('.jsx') ||
      s.file.endsWith('.tsx')
  );
  const hasHtmlEntryPoint = sections.some(
    (s) => s.file === 'index.html' || s.file === 'public/index.html' || s.file.endsWith('.html')
  );
  const isFrameworkApp = sections.some(
    (s) => s.file.startsWith('pages/') || s.file.startsWith('app/') || s.file === 'next.config.js' || s.file === 'vite.config.js'
  );

  if (isWebProject && !hasHtmlEntryPoint && !isFrameworkApp) {
    const cssFiles = sections.filter((s) => s.file.endsWith('.css')).map((s) => s.file);
    const jsFiles = sections.filter((s) => /\.(js|ts)$/.test(s.file)).map((s) => s.file);
    const primaryCss = cssFiles[0] || 'style.css';
    const primaryJs = jsFiles[jsFiles.length - 1] || 'script.js';
    const allDeps = [...cssFiles, ...jsFiles];
    const defaultHtmlSection: BlueprintFileSection = {
      file: 'index.html',
      purpose: 'Main web entry point mounting project layout and scripts',
      dependencies: allDeps,
      specsRequired: [],
      exports: [],
      details: `HTML5 entry linking ${primaryCss} and loading ${primaryJs}`,
      rawSection: `### File: index.html\n- **Purpose**: Main web entry point\n- **Dependencies**: ${allDeps.join(', ') || 'None'}\n- **Specs Required**: None\n- **Exports**: None\n- **Implementation Details**:\n  1. HTML5 Doctype lang="en"\n  2. Head with meta charset="UTF-8", viewport meta, descriptive title\n  3. Head: <link rel="stylesheet" href="${primaryCss}">\n  4. Body with main container div id="app"\n  5. End of body: <script src="${primaryJs}" defer></script>`,
    };
    sections.unshift(defaultHtmlSection);
  }

  return sections;
}

export function validateBlueprintImports(sections: BlueprintFileSection[]): string[] {
  const val = validateBlueprintGraph(sections);
  return [...val.errors, ...val.warnings];
}

export interface BlueprintGraphValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  order: string[];
}

export function classifyBlueprintDependency(dep: string): 'LOCAL_FILE' | 'PACKAGE' | 'EXTERNAL' {
  if (!dep || dep === 'None') return 'EXTERNAL';
  const clean = dep.trim();

  if (clean.startsWith('.') || clean.startsWith('@/') || clean.startsWith('~/') || /\.(ts|tsx|js|jsx|css|json|prisma)$/i.test(clean)) {
    return 'LOCAL_FILE';
  }

  if (/^@[a-z0-9_.-]+\/[a-z0-9_.-]+/i.test(clean)) {
    return 'PACKAGE';
  }

  if (/^[a-z0-9_.-]+(\/[a-z0-9_.-]+)*$/i.test(clean)) {
    return 'PACKAGE';
  }

  return 'EXTERNAL';
}

export function validateBlueprintGraph(
  sections: BlueprintFileSection[],
  tsConfigContent?: string,
  contract?: ProjectContract
): BlueprintGraphValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fileMap = new Map<string, BlueprintFileSection>();
  const normalizedFileSet = new Set<string>();

  for (const s of sections) {
    const norm = s.file.replace(/\\/g, '/').replace(/^[/\\]+/, '').toLowerCase();
    if (normalizedFileSet.has(norm)) {
      errors.push(`Duplicate file section in blueprint: "${s.file}"`);
    } else {
      normalizedFileSet.add(norm);
      fileMap.set(norm, s);
    }
  }

  const tsOpts = parseTsConfigOptions(tsConfigContent || '');
  const moduleContext = {
    files: sections.map((s) => s.file),
    baseUrl: tsOpts.baseUrl || '.',
    paths: tsOpts.paths || { '@/*': ['./src/*', './*'], '~/*': ['./src/*', './*'] },
  };

  const inDegree = new Map<string, number>();
  const graph = new Map<string, string[]>();

  for (const normFile of normalizedFileSet) {
    inDegree.set(normFile, 0);
    graph.set(normFile, []);
  }

  for (const [normFile, section] of fileMap.entries()) {
    for (const dep of section.dependencies) {
      if (!dep || dep === 'None') continue;
      const depType = classifyBlueprintDependency(dep);
      if (depType === 'LOCAL_FILE') {
        const resolved = resolveModule(section.file, dep, moduleContext);
        if (!resolved) {
          errors.push(`Blueprint file "${section.file}" lists local file dependency "${dep}" which is not defined in blueprint.`);
        } else {
          const normResolved = resolved.replace(/\\/g, '/').replace(/^[/\\]+/, '').toLowerCase();
          if (fileMap.has(normResolved) && normResolved !== normFile) {
            graph.get(normResolved)!.push(normFile);
            inDegree.set(normFile, (inDegree.get(normFile) || 0) + 1);
          }
        }
      } else {
        warnings.push(`Blueprint file "${section.file}" lists external/package dependency "${dep}".`);
      }
    }
  }

  const queue: string[] = [];
  for (const [node, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(node);
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    const section = fileMap.get(curr);
    if (section) order.push(section.file);

    const neighbors = graph.get(curr) || [];
    for (const n of neighbors) {
      const newDeg = (inDegree.get(n) || 1) - 1;
      inDegree.set(n, newDeg);
      if (newDeg === 0) queue.push(n);
    }
  }

  if (order.length < normalizedFileSet.size) {
    errors.push(`Dependency cycle detected in blueprint file graph.`);
  }

  const framework = contract?.framework || 'STATIC_HTML';

  for (const [, section] of fileMap.entries()) {
    const srcFile = section.file.replace(/\\/g, '/').replace(/^\.\//, '');
    const isHtml = srcFile.endsWith('.html');
    const isNextServerFile =
      framework === 'NEXT_APP_ROUTER' &&
      (/(^|\/)api\//i.test(srcFile) ||
        srcFile.endsWith('/route.ts') ||
        srcFile.endsWith('/route.js') ||
        srcFile.includes('lib/prisma') ||
        srcFile.includes('lib/db'));

    const isClientFile =
      !isNextServerFile &&
      !srcFile.startsWith('server/') &&
      !srcFile.startsWith('api/') &&
      (isHtml ||
        srcFile.startsWith('src/') ||
        /(^|\/)(main|index|app)\.(tsx|jsx|ts|js)$/i.test(srcFile) ||
        /(^|\/)(components|hooks|styles|pages|services|utils)\//i.test(srcFile) ||
        (contract?.entryPoints?.includes(srcFile) ?? false));

    for (const dep of section.dependencies) {
      if (!dep || dep === 'None') continue;
      const cleanDep = dep.replace(/\\/g, '/').replace(/^\.\//, '');

      const isServerDep =
        cleanDep.startsWith('server/') ||
        cleanDep.startsWith('api/') ||
        cleanDep.includes('/server/') ||
        cleanDep.includes('/api/') ||
        /(^|\/)(server|app)\.(js|ts)$/i.test(cleanDep);

      const isDatabaseDep =
        cleanDep.startsWith('prisma/') ||
        cleanDep.includes('/prisma/') ||
        cleanDep.endsWith('prisma/schema.prisma') ||
        cleanDep.includes('lib/prisma') ||
        cleanDep === '@prisma/client' ||
        cleanDep === 'prisma';

      if (isHtml) {
        if (isServerDep || isDatabaseDep) {
          errors.push(
            `Blueprint Runtime Boundary Error: HTML entry "${srcFile}" cannot depend on server/database file "${cleanDep}". HTML cannot import server/database runtime files.`
          );
        }
      } else if (framework === 'VITE_SPA' || framework === 'REACT_WEBPACK_SPA' || framework === 'STATIC_HTML') {
        if (isClientFile && (isServerDep || isDatabaseDep)) {
          errors.push(
            `Blueprint Runtime Boundary Error: Frontend file "${srcFile}" cannot depend on server/database file "${cleanDep}". Client code cannot import server/database runtime files.`
          );
        }
      } else if (framework === 'NEXT_APP_ROUTER') {
        if (!isNextServerFile && isDatabaseDep && !cleanDep.startsWith('/api/') && !cleanDep.startsWith('api/')) {
          const purposeLower = section.purpose.toLowerCase();
          const isClientComponent =
            /(^|\/)components\//i.test(srcFile) ||
            (purposeLower.includes('client') && !purposeLower.includes('prisma') && !purposeLower.includes('db'));
          if (isClientComponent) {
            errors.push(
              `Blueprint Runtime Boundary Error: Next.js client component "${srcFile}" cannot depend on server-only database file "${cleanDep}".`
            );
          }
        }
      }
    }
  }

  if (contract?.contractHash) {
    let bpHash: string | undefined;
    for (const s of sections) {
      const match = s.rawSection.match(/(?:Contract\s*Hash|contractHash)\s*:\s*([a-f0-9]{64})/i);
      if (match) {
        bpHash = match[1];
        break;
      }
    }
    if (bpHash && bpHash !== contract.contractHash) {
      errors.push(
        `Contract Hash Mismatch: Blueprint was generated from contract hash ${bpHash}, but current spec contract hash is ${contract.contractHash}.`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    order,
  };
}

export function extractFilesFromArchitecture(archContent: string): string[] {
  const files: string[] = [];
  if (!archContent) return files;

  const ownedMatches = archContent.matchAll(/Owned Files:\s*([^\n]+)/gi);
  for (const match of ownedMatches) {
    const parts = match[1].split(/[,;]/).map((s) => s.trim());
    for (const p of parts) {
      const clean = p.replace(/[*`'"]/g, '').replace(/^\.\//, '').replace(/^\//, '').split(/\s*[\(\[\{]/)[0].trim();
      if (clean && clean.toLowerCase() !== 'none' && !clean.endsWith('/') && !files.includes(clean)) {
        files.push(clean);
      }
    }
  }

  if (files.length === 0) {
    const treeMatch = archContent.match(/### Project Folder Structure([\s\S]*?)(###|$)/i);
    if (treeMatch) {
      const lines = treeMatch[1].split('\n');
      const dirStack: { depth: number; path: string }[] = [];

      for (const line of lines) {
        if (!line.trim() || line.trim().startsWith('#')) continue;

        const indentMatch = line.match(/^([│├└─\s]*)/);
        const indentStr = indentMatch ? indentMatch[1] : '';
        const depth = Math.floor(indentStr.replace(/│/g, ' ').length / 2);

        const cleanItem = line.replace(/[│├└─\s]/g, '').replace(/[*`'"]/g, '').trim();
        if (!cleanItem || cleanItem.startsWith('project-root') || cleanItem === 'project-root/') continue;

        const nameOnly = cleanItem.split(/\s*[\(\[\{]/)[0].replace(/^\.\//, '').replace(/^\//, '').trim();
        if (!nameOnly) continue;

        while (dirStack.length > 0 && dirStack[dirStack.length - 1].depth >= depth) {
          dirStack.pop();
        }

        const parentPath = dirStack.map((d) => d.path).join('');

        if (nameOnly.endsWith('/') || (!nameOnly.includes('.') && !nameOnly.startsWith('['))) {
          const dirName = nameOnly.endsWith('/') ? nameOnly : `${nameOnly}/`;
          dirStack.push({ depth, path: dirName });
        } else {
          const fullPath = `${parentPath}${nameOnly}`;
          if (!files.includes(fullPath)) {
            files.push(fullPath);
          }
        }
      }
    }
  }

  return files;
}

export function syncHtmlAssetLinks(
  htmlContent: string,
  allFiles: string[],
  contract?: ProjectContract
): { updatedHtml: string; syncedLinks: string[] } {
  let updatedHtml = htmlContent;
  const syncedLinks: string[] = [];

  const serverScriptRegex = /<script\b[^>]*\bsrc=["'](?:(?:\/)?(?:server|api)\/|[^"']*\b(?:server|app)\.(?:js|ts))["'][^>]*>(?:<\/script>)?\n?/gi;
  if (serverScriptRegex.test(updatedHtml)) {
    updatedHtml = updatedHtml.replace(serverScriptRegex, '');
    syncedLinks.push('Removed backend script reference from HTML');
  }

  const framework = contract?.framework || 'STATIC_HTML';

  if (framework === 'VITE_SPA') {
    const entryPoints = contract?.entryPoints || ['src/pages/index.tsx', 'src/main.tsx', 'src/index.tsx'];
    const canonicalEntry = entryPoints.find((e: string) => allFiles.includes(e)) || entryPoints[0] || 'src/pages/index.tsx';
    const normEntry = canonicalEntry.startsWith('/') ? canonicalEntry : `/${canonicalEntry}`;
    const altEntry = canonicalEntry.replace(/^\//, '');

    const scriptPattern = new RegExp(
      `<script\\b[^>]*\\bsrc=["'](?:${escapeRegex(normEntry)}|${escapeRegex(altEntry)}|${escapeRegex('/' + altEntry)})["'][^>]*>`,
      'i'
    );

    if (scriptPattern.test(updatedHtml)) {
      if (
        !/<script\b[^>]*type=["']module["'][^>]*\bsrc=/i.test(updatedHtml) &&
        !/<script\b[^>]*\bsrc=[^>]*type=["']module["']/i.test(updatedHtml)
      ) {
        updatedHtml = updatedHtml.replace(
          new RegExp(`(<script\\b)([^>]*\\bsrc=["'](?:${escapeRegex(normEntry)}|${escapeRegex(altEntry)}|${escapeRegex('/' + altEntry)})["'])`, 'i'),
          '$1 type="module"$2'
        );
        syncedLinks.push(`Added type="module" to Vite entry script tag (${normEntry})`);
      }
    } else {
      const scriptTag = `  <script type="module" src="${normEntry}"></script>\n`;
      if (/<\/body>/i.test(updatedHtml)) {
        updatedHtml = updatedHtml.replace(/<\/body>/i, `${scriptTag}</body>`);
      } else if (/<\/head>/i.test(updatedHtml)) {
        updatedHtml = updatedHtml.replace(/<\/head>/i, `${scriptTag}</head>`);
      } else {
        updatedHtml = `${updatedHtml}\n${scriptTag}`;
      }
      syncedLinks.push(`Connected Vite module script <script type="module" src="${normEntry}"></script>`);
    }

    const cssFiles = allFiles.filter((f) => f.endsWith('.css') && !f.includes('node_modules'));
    for (const cssFile of cssFiles) {
      const cssBasename = cssFile.split('/').pop() || cssFile;
      const isLinked = updatedHtml.includes(cssFile) || updatedHtml.includes(cssBasename);
      if (!isLinked) {
        const linkTag = `  <link rel="stylesheet" href="${cssFile}">\n`;
        if (/<\/head>/i.test(updatedHtml)) {
          updatedHtml = updatedHtml.replace(/<\/head>/i, `${linkTag}</head>`);
        } else {
          updatedHtml = `${linkTag}` + updatedHtml;
        }
        syncedLinks.push(`Connected stylesheet <link rel="stylesheet" href="${cssFile}"> to <head>`);
      }
    }

    return { updatedHtml, syncedLinks };
  }

  if (framework === 'NEXT_APP_ROUTER' || framework === 'NEXT_PAGES_ROUTER') {
    const badScriptRegex =
      /<script\b[^>]*\bsrc=["'](?:(?:\/)?(?:server|api|src\/components|components|src\/services)\/|[^"']*\.(?:tsx|jsx|ts))["'][^>]*>(?:<\/script>)?\n?/gi;
    if (badScriptRegex.test(updatedHtml)) {
      updatedHtml = updatedHtml.replace(badScriptRegex, '');
      syncedLinks.push('Removed raw component/server script reference from Next.js HTML');
    }
    return { updatedHtml, syncedLinks };
  }

  if (framework === 'REACT_WEBPACK_SPA') {
    const entryPoints = contract?.entryPoints || ['src/index.tsx', 'src/pages/index.tsx'];
    const canonicalEntry = entryPoints[0] || 'bundle.js';
    const bundleName = canonicalEntry.endsWith('.js') ? canonicalEntry : 'bundle.js';

    if (!updatedHtml.includes(bundleName) && !updatedHtml.includes('dist/bundle.js')) {
      const scriptTag = `  <script src="${bundleName}" defer></script>\n`;
      if (/<\/body>/i.test(updatedHtml)) {
        updatedHtml = updatedHtml.replace(/<\/body>/i, `${scriptTag}</body>`);
      } else {
        updatedHtml = `${updatedHtml}\n${scriptTag}`;
      }
      syncedLinks.push(`Connected React Webpack bundle script <script src="${bundleName}" defer></script>`);
    }
    return { updatedHtml, syncedLinks };
  }

  const cssFiles = allFiles.filter((f) => f.endsWith('.css') && !f.includes('node_modules'));
  const jsFiles = allFiles.filter(
    (f) =>
      /\.(js|ts|jsx|tsx)$/.test(f) &&
      !f.endsWith('.d.ts') &&
      !f.includes('config') &&
      !f.includes('test') &&
      !f.startsWith('server/') &&
      !f.startsWith('api/') &&
      !f.startsWith('src/components/') &&
      !f.startsWith('src/services/') &&
      !f.startsWith('src/hooks/') &&
      !f.includes('/server/') &&
      !f.includes('/api/') &&
      !f.includes('/components/')
  );

  for (const cssFile of cssFiles) {
    const cssBasename = cssFile.split('/').pop() || cssFile;
    const isLinked = updatedHtml.includes(cssFile) || updatedHtml.includes(cssBasename);
    if (!isLinked) {
      const linkTag = `  <link rel="stylesheet" href="${cssFile}">\n`;
      if (/<\/head>/i.test(updatedHtml)) {
        updatedHtml = updatedHtml.replace(/<\/head>/i, `${linkTag}</head>`);
      } else {
        updatedHtml = `${linkTag}` + updatedHtml;
      }
      syncedLinks.push(`Connected stylesheet <link rel="stylesheet" href="${cssFile}"> to <head>`);
    }
  }

  for (const jsFile of jsFiles) {
    const jsBasename = jsFile.split('/').pop() || jsFile;
    const isLinked = updatedHtml.includes(jsFile) || updatedHtml.includes(jsBasename);
    if (!isLinked) {
      const scriptTag = `  <script src="${jsFile}" defer></script>\n`;
      if (/<\/body>/i.test(updatedHtml)) {
        updatedHtml = updatedHtml.replace(/<\/body>/i, `${scriptTag}</body>`);
      } else if (/<\/head>/i.test(updatedHtml)) {
        updatedHtml = updatedHtml.replace(/<\/head>/i, `${scriptTag}</head>`);
      } else {
        updatedHtml = `${updatedHtml}\n${scriptTag}`;
      }
      syncedLinks.push(`Connected script <script src="${jsFile}" defer></script>`);
    }
  }

  return { updatedHtml, syncedLinks };
}
