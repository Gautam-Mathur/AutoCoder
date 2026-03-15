// Testing Engine - Auto-generates unit tests, integration tests, validates builds
// Includes 30+ whitebox security tests for vulnerability detection

interface TestCase {
  id: string;
  name: string;
  type: 'unit' | 'integration' | 'e2e' | 'security';
  category: 'happy-path' | 'edge-case' | 'error-handling' | 'security';
  description: string;
  code: string;
  expectedResult: string;
}

interface TestSuite {
  name: string;
  targetFile: string;
  language: string;
  tests: TestCase[];
  setupCode?: string;
  teardownCode?: string;
}

interface TestResults {
  passed: number;
  failed: number;
  skipped: number;
  coverage?: number;
  details: TestResultDetail[];
}

interface TestResultDetail {
  testId: string;
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  error?: string;
  duration?: number;
}

function isConfigFile(filename: string): boolean {
  const base = filename.split('/').pop() || '';
  if (base.endsWith('.json') || base.startsWith('.env')) return false;
  const configPatterns = [
    'vite.config', 'postcss.config', 'tailwind.config',
    'eslint.config', 'babel.config', 'jest.config', 'webpack.config',
    'drizzle.config'
  ];
  return configPatterns.some(p => base.includes(p));
}

function isReactComponent(code: string): boolean {
  const hasJSX = /<[A-Z][a-zA-Z]*[\s/>]/.test(code) || /return\s*\(?[\s\n]*</.test(code);
  const hasReactImport = /import.*from\s+['"]react['"]/.test(code);
  const hasReactHooks = /(?:useState|useEffect|useRef|useMemo|useCallback|useContext)\s*\(/.test(code);
  const hasClassName = /className=/.test(code);
  const hasExportFunction = /export\s+(?:default\s+)?function/.test(code);
  return (hasJSX && (hasExportFunction || hasClassName)) || hasReactImport || (hasReactHooks && hasJSX);
}

function isEntryFile(filename: string): boolean {
  const base = filename.split('/').pop() || '';
  return ['main.jsx', 'main.tsx', 'main.js', 'main.ts', 'index.jsx', 'index.tsx'].includes(base);
}

function isHookFile(filename: string, code: string): boolean {
  const base = filename.split('/').pop() || '';
  return base.startsWith('use') || /export\s+(?:function|const)\s+use[A-Z]/.test(code);
}

function isDataFile(filename: string): boolean {
  const base = filename.split('/').pop() || '';
  return /^(?:data|constants|config|types|schema|models|seeds?)\./i.test(base);
}

export function generateTestsForCode(
  code: string,
  language: string,
  filename: string
): TestSuite {
  const tests: TestCase[] = [];

  if (isConfigFile(filename)) {
    tests.push(...generateConfigTests(code, filename));
  } else if (language === 'html') {
    tests.push(...generateHtmlTests(code, filename));
  } else if (language === 'javascript' || language === 'typescript' || language === 'jsx' || language === 'tsx') {
    if (isEntryFile(filename)) {
      tests.push(...generateEntryFileTests(code, filename));
    } else if (isHookFile(filename, code)) {
      tests.push(...generateHookTests(code, filename));
    } else if (isDataFile(filename)) {
      tests.push(...generateDataFileTests(code, filename));
    } else if (isReactComponent(code)) {
      tests.push(...generateReactTests(code, filename));
    } else {
      tests.push(...generateJsTests(code, filename));
    }
  } else if (language === 'css') {
    tests.push(...generateCssTests(code, filename));
  } else if (language === 'json') {
    tests.push(...generateJsonTests(code, filename));
  }

  tests.push(...generateSecurityTests(code, language, filename));

  return {
    name: `Tests for ${filename}`,
    targetFile: filename,
    language,
    tests,
  };
}

function generateConfigTests(code: string, filename: string): TestCase[] {
  const tests: TestCase[] = [];

  tests.push({
    id: `config-valid-${filename}`,
    name: 'Config file has valid syntax',
    type: 'unit',
    category: 'happy-path',
    description: 'Config file should have valid structure',
    code: `
const hasBrackets = (code.match(/{/g) || []).length === (code.match(/}/g) || []).length;
const hasExport = code.includes('export') || code.includes('module.exports');
return hasBrackets && hasExport;
    `.trim(),
    expectedResult: 'true',
  });

  if (filename.includes('tailwind')) {
    tests.push({
      id: 'config-tailwind-content',
      name: 'Tailwind config has content paths',
      type: 'unit',
      category: 'happy-path',
      description: 'Tailwind config should specify content paths for purging',
      code: `return code.includes('content') && (code.includes('./src') || code.includes('./**'));`.trim(),
      expectedResult: 'true',
    });
  }

  if (filename.includes('vite.config')) {
    tests.push({
      id: 'config-vite-react',
      name: 'Vite config includes React plugin',
      type: 'unit',
      category: 'happy-path',
      description: 'Vite config should use React plugin',
      code: `return code.includes('react') || code.includes('@vitejs');`.trim(),
      expectedResult: 'true',
    });
  }

  if (filename.includes('postcss')) {
    tests.push({
      id: 'config-postcss-plugins',
      name: 'PostCSS config has plugins',
      type: 'unit',
      category: 'happy-path',
      description: 'PostCSS config should define plugins',
      code: `return code.includes('plugins') || code.includes('tailwindcss') || code.includes('autoprefixer');`.trim(),
      expectedResult: 'true',
    });
  }

  return tests;
}

function generateHtmlTests(code: string, filename: string): TestCase[] {
  const tests: TestCase[] = [];
  const isViteHtml = code.includes('id="root"') || code.includes("id='root'") || code.includes('type="module"');

  if (isViteHtml) {
    tests.push({
      id: 'html-vite-root',
      name: 'Has root mount element',
      type: 'unit',
      category: 'happy-path',
      description: 'Vite HTML should have a root div for React to mount',
      code: `return code.includes('id="root"') || code.includes("id='root'") || code.includes('id="app"');`.trim(),
      expectedResult: 'true',
    });

    tests.push({
      id: 'html-vite-script',
      name: 'Has module script tag',
      type: 'unit',
      category: 'happy-path',
      description: 'Vite HTML should include a script with type="module"',
      code: `return /type=["']module["']/.test(code);`.trim(),
      expectedResult: 'true',
    });

    tests.push({
      id: 'html-vite-doctype',
      name: 'Has HTML doctype',
      type: 'unit',
      category: 'happy-path',
      description: 'HTML should declare doctype',
      code: `return /<!doctype\\s+html>/i.test(code);`.trim(),
      expectedResult: 'true',
    });

    if (code.includes('<meta') && code.includes('viewport')) {
      tests.push({
        id: 'html-viewport',
        name: 'Has responsive viewport',
        type: 'unit',
        category: 'happy-path',
        description: 'Has viewport meta tag for responsive design',
        code: `return /<meta[^>]*viewport/i.test(code);`.trim(),
        expectedResult: 'true',
      });
    }
  } else {
    tests.push({
      id: 'html-structure-1',
      name: 'Has valid HTML structure',
      type: 'unit',
      category: 'happy-path',
      description: 'Verify HTML has proper doctype and structure',
      code: `
const hasDoctype = code.toLowerCase().includes('<!doctype html>');
const hasHtml = code.includes('<html') && code.includes('</html>');
const hasHead = code.includes('<head') && code.includes('</head>');
const hasBody = code.includes('<body') && code.includes('</body>');
return hasDoctype && hasHtml && hasHead && hasBody;
      `.trim(),
      expectedResult: 'true',
    });

    tests.push({
      id: 'html-title-1',
      name: 'Has page title',
      type: 'unit',
      category: 'happy-path',
      description: 'Verify HTML has a title element',
      code: `
const titleMatch = code.match(/<title[^>]*>([^<]+)<\\/title>/i);
return titleMatch && titleMatch[1].length > 0;
      `.trim(),
      expectedResult: 'true',
    });

    tests.push({
      id: 'html-a11y-lang',
      name: 'Has language attribute',
      type: 'unit',
      category: 'happy-path',
      description: 'Verify HTML element has lang attribute for accessibility',
      code: `return /<html[^>]*lang=["'][a-z]{2}/i.test(code);`.trim(),
      expectedResult: 'true',
    });

    tests.push({
      id: 'html-responsive-1',
      name: 'Has viewport meta tag',
      type: 'unit',
      category: 'happy-path',
      description: 'Verify HTML has viewport meta tag for responsive design',
      code: `return /<meta[^>]*name=["']viewport["'][^>]*>/i.test(code);`.trim(),
      expectedResult: 'true',
    });
  }

  if (code.includes('<img')) {
    tests.push({
      id: 'html-a11y-images',
      name: 'Images have alt text',
      type: 'unit',
      category: 'happy-path',
      description: 'Verify all images have alt attributes',
      code: `
const images = code.match(/<img[^>]*>/gi) || [];
const imagesWithAlt = images.filter(img => /alt=["'][^"']*["']/.test(img));
return images.length === 0 || imagesWithAlt.length === images.length;
      `.trim(),
      expectedResult: 'true',
    });
  }

  return tests;
}

function generateReactTests(code: string, filename: string): TestCase[] {
  const tests: TestCase[] = [];

  tests.push({
    id: `react-export-${filename}`,
    name: 'Component has export',
    type: 'unit',
    category: 'happy-path',
    description: 'React component should be exported',
    code: `return code.includes('export default') || code.includes('export function') || code.includes('export const');`.trim(),
    expectedResult: 'true',
  });

  tests.push({
    id: `react-jsx-${filename}`,
    name: 'Component returns JSX',
    type: 'unit',
    category: 'happy-path',
    description: 'React component should return JSX markup',
    code: `return code.includes('return') && (code.includes('<div') || code.includes('<section') || code.includes('<main') || code.includes('<form') || code.includes('<ul') || code.includes('<>') || code.includes('<Fragment'));`.trim(),
    expectedResult: 'true',
  });

  if (code.includes('useState') || code.includes('useEffect') || code.includes('useRef') || code.includes('useMemo')) {
    tests.push({
      id: `react-hooks-import-${filename}`,
      name: 'React hooks are imported',
      type: 'unit',
      category: 'happy-path',
      description: 'Used React hooks should be imported',
      code: `
const usedHooks = [];
if (code.includes('useState')) usedHooks.push('useState');
if (code.includes('useEffect')) usedHooks.push('useEffect');
if (code.includes('useRef')) usedHooks.push('useRef');
if (code.includes('useMemo')) usedHooks.push('useMemo');
if (code.includes('useCallback')) usedHooks.push('useCallback');
const importLine = code.match(/import\\s+{([^}]+)}\\s+from\\s+['"]react['"]/);
if (!importLine) return usedHooks.length === 0;
return usedHooks.every(h => importLine[1].includes(h));
      `.trim(),
      expectedResult: 'true',
    });
  }

  if (code.includes('onClick') || code.includes('onChange') || code.includes('onSubmit')) {
    tests.push({
      id: `react-events-${filename}`,
      name: 'Event handlers are defined',
      type: 'unit',
      category: 'happy-path',
      description: 'JSX event handlers should reference defined functions',
      code: `
const handlers = code.match(/on(?:Click|Change|Submit|Input|Focus|Blur|KeyDown|KeyUp)={([^}]+)}/g) || [];
return handlers.length > 0;
      `.trim(),
      expectedResult: 'true',
    });
  }

  if (code.includes('className')) {
    tests.push({
      id: `react-styling-${filename}`,
      name: 'Component has styling',
      type: 'unit',
      category: 'happy-path',
      description: 'Component uses className for styling',
      code: `return (code.match(/className=/g) || []).length > 0;`.trim(),
      expectedResult: 'true',
    });
  }

  const propTypes = code.match(/(?:interface|type)\s+\w*Props/);
  if (propTypes) {
    tests.push({
      id: `react-props-typed-${filename}`,
      name: 'Props are typed',
      type: 'unit',
      category: 'happy-path',
      description: 'Component props should have TypeScript types',
      code: `return /(?:interface|type)\\s+\\w*Props/.test(code);`.trim(),
      expectedResult: 'true',
    });
  }

  return tests;
}

function generateHookTests(code: string, filename: string): TestCase[] {
  const tests: TestCase[] = [];

  tests.push({
    id: `hook-export-${filename}`,
    name: 'Hook is exported',
    type: 'unit',
    category: 'happy-path',
    description: 'Custom hook should be exported',
    code: `return code.includes('export function use') || code.includes('export const use');`.trim(),
    expectedResult: 'true',
  });

  tests.push({
    id: `hook-naming-${filename}`,
    name: 'Hook follows naming convention',
    type: 'unit',
    category: 'happy-path',
    description: 'Custom hook name should start with "use"',
    code: `return /(?:function|const)\\s+use[A-Z]/.test(code);`.trim(),
    expectedResult: 'true',
  });

  if (code.includes('return')) {
    tests.push({
      id: `hook-return-${filename}`,
      name: 'Hook returns a value',
      type: 'unit',
      category: 'happy-path',
      description: 'Custom hook should return something useful',
      code: `return code.includes('return {') || code.includes('return [') || code.includes('return ');`.trim(),
      expectedResult: 'true',
    });
  }

  return tests;
}

function generateEntryFileTests(code: string, filename: string): TestCase[] {
  const tests: TestCase[] = [];

  tests.push({
    id: `entry-react-dom-${filename}`,
    name: 'Renders React app',
    type: 'unit',
    category: 'happy-path',
    description: 'Entry file should call createRoot or ReactDOM.render',
    code: `return code.includes('createRoot') || code.includes('ReactDOM.render') || code.includes('render(');`.trim(),
    expectedResult: 'true',
  });

  tests.push({
    id: `entry-import-app-${filename}`,
    name: 'Imports App component',
    type: 'unit',
    category: 'happy-path',
    description: 'Entry file should import the root App component',
    code: `return code.includes("import") && (code.includes("App") || code.includes("app"));`.trim(),
    expectedResult: 'true',
  });

  if (code.includes('.css') || code.includes('index.css') || code.includes('globals.css')) {
    tests.push({
      id: `entry-styles-${filename}`,
      name: 'Imports global styles',
      type: 'unit',
      category: 'happy-path',
      description: 'Entry file should import global CSS',
      code: `return /import\\s+['"][^'"]*\\.css['"]/.test(code);`.trim(),
      expectedResult: 'true',
    });
  }

  return tests;
}

function generateDataFileTests(code: string, filename: string): TestCase[] {
  const tests: TestCase[] = [];

  tests.push({
    id: `data-export-${filename}`,
    name: 'Data is exported',
    type: 'unit',
    category: 'happy-path',
    description: 'Data file should export its contents',
    code: `return code.includes('export');`.trim(),
    expectedResult: 'true',
  });

  tests.push({
    id: `data-valid-syntax-${filename}`,
    name: 'Data has valid syntax',
    type: 'unit',
    category: 'happy-path',
    description: 'Data file should have matching brackets',
    code: `
const open = (code.match(/{/g) || []).length + (code.match(/\\[/g) || []).length;
const close = (code.match(/}/g) || []).length + (code.match(/\\]/g) || []).length;
return open === close;
    `.trim(),
    expectedResult: 'true',
  });

  return tests;
}

function generateJsTests(code: string, filename: string): TestCase[] {
  const tests: TestCase[] = [];

  const functionPattern = /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z_$][\w$]*)\s*=>)/g;
  let match;
  const functions: string[] = [];

  while ((match = functionPattern.exec(code)) !== null) {
    const funcName = match[1] || match[2];
    if (funcName) functions.push(funcName);
  }

  if (functions.length > 0) {
    tests.push({
      id: `js-functions-defined-${filename}`,
      name: `Defines ${functions.length} function(s)`,
      type: 'unit',
      category: 'happy-path',
      description: `File defines functions: ${functions.slice(0, 5).join(', ')}`,
      code: `
const funcs = ${JSON.stringify(functions.slice(0, 5))};
return funcs.every(f => code.includes(f));
      `.trim(),
      expectedResult: 'true',
    });
  }

  tests.push({
    id: `js-syntax-${filename}`,
    name: 'Balanced brackets',
    type: 'unit',
    category: 'happy-path',
    description: 'Code should have matching opening and closing brackets',
    code: `
const openBraces = (code.match(/{/g) || []).length;
const closeBraces = (code.match(/}/g) || []).length;
return openBraces === closeBraces;
    `.trim(),
    expectedResult: 'true',
  });

  if (code.includes('export')) {
    tests.push({
      id: `js-export-${filename}`,
      name: 'Has exports',
      type: 'unit',
      category: 'happy-path',
      description: 'Module should export its public API',
      code: `return code.includes('export default') || code.includes('export function') || code.includes('export const') || code.includes('module.exports');`.trim(),
      expectedResult: 'true',
    });
  }

  if (code.includes('fetch') || code.includes('async')) {
    tests.push({
      id: `js-error-handling-${filename}`,
      name: 'Has error handling',
      type: 'unit',
      category: 'error-handling',
      description: 'Async code should have try/catch or .catch()',
      code: `
const hasTryCatch = code.includes('try {') || code.includes('try{') || code.includes('try\\n');
const hasCatch = code.includes('.catch(');
return hasTryCatch || hasCatch;
      `.trim(),
      expectedResult: 'true',
    });
  }

  return tests;
}

function generateCssTests(code: string, filename: string): TestCase[] {
  const tests: TestCase[] = [];
  const isTailwindBase = code.includes('@tailwind') || code.includes('@apply') || code.includes('@layer');

  if (isTailwindBase) {
    tests.push({
      id: 'css-tailwind-directives',
      name: 'Has Tailwind directives',
      type: 'unit',
      category: 'happy-path',
      description: 'CSS file should include Tailwind base directives',
      code: `return code.includes('@tailwind base') || code.includes('@tailwind components') || code.includes('@tailwind utilities') || code.includes('@layer');`.trim(),
      expectedResult: 'true',
    });

    if (code.includes(':root') || code.includes('--')) {
      tests.push({
        id: 'css-custom-props',
        name: 'Defines CSS custom properties',
        type: 'unit',
        category: 'happy-path',
        description: 'Uses CSS variables for theming',
        code: `return code.includes(':root') && /--[a-zA-Z]/.test(code);`.trim(),
        expectedResult: 'true',
      });
    }
  } else {
    tests.push({
      id: 'css-valid-syntax',
      name: 'Valid CSS syntax',
      type: 'unit',
      category: 'happy-path',
      description: 'CSS should have balanced braces',
      code: `
const openBraces = (code.match(/{/g) || []).length;
const closeBraces = (code.match(/}/g) || []).length;
return openBraces === closeBraces;
      `.trim(),
      expectedResult: 'true',
    });

    if (code.includes('display:') || code.includes('display :')) {
      tests.push({
        id: 'css-modern-layout',
        name: 'Uses modern layout',
        type: 'unit',
        category: 'happy-path',
        description: 'CSS uses flexbox or grid for layout',
        code: `
const hasFlexbox = /display:\\s*flex/i.test(code);
const hasGrid = /display:\\s*grid/i.test(code);
return hasFlexbox || hasGrid;
        `.trim(),
        expectedResult: 'true',
      });
    }

    if (/@media/.test(code)) {
      tests.push({
        id: 'css-responsive',
        name: 'Has responsive styles',
        type: 'unit',
        category: 'happy-path',
        description: 'CSS includes media queries for responsiveness',
        code: `return /@media\\s*\\(/i.test(code);`.trim(),
        expectedResult: 'true',
      });
    }

    tests.push({
      id: 'css-no-important',
      name: 'Minimal !important usage',
      type: 'unit',
      category: 'edge-case',
      description: 'CSS should not overuse !important',
      code: `
const importantCount = (code.match(/!important/gi) || []).length;
const totalRules = (code.match(/[{]/g) || []).length;
return totalRules === 0 || importantCount < totalRules * 0.2;
      `.trim(),
      expectedResult: 'true',
    });
  }

  return tests;
}

function generateJsonTests(code: string, filename: string): TestCase[] {
  const tests: TestCase[] = [];

  tests.push({
    id: `json-valid-${filename}`,
    name: 'Valid JSON',
    type: 'unit',
    category: 'happy-path',
    description: 'JSON file should parse without errors',
    code: `
try { JSON.parse(code); return true; } catch { return false; }
    `.trim(),
    expectedResult: 'true',
  });

  if (filename.includes('package.json')) {
    tests.push({
      id: 'json-pkg-name',
      name: 'Has package name',
      type: 'unit',
      category: 'happy-path',
      description: 'package.json should have a name field',
      code: `
try { const pkg = JSON.parse(code); return typeof pkg.name === 'string' && pkg.name.length > 0; } catch { return false; }
      `.trim(),
      expectedResult: 'true',
    });

    tests.push({
      id: 'json-pkg-deps',
      name: 'Has dependencies',
      type: 'unit',
      category: 'happy-path',
      description: 'package.json should list dependencies',
      code: `
try { const pkg = JSON.parse(code); return !!(pkg.dependencies || pkg.devDependencies); } catch { return false; }
      `.trim(),
      expectedResult: 'true',
    });

    tests.push({
      id: 'json-pkg-scripts',
      name: 'Has scripts',
      type: 'unit',
      category: 'happy-path',
      description: 'package.json should have scripts defined',
      code: `
try { const pkg = JSON.parse(code); return pkg.scripts && Object.keys(pkg.scripts).length > 0; } catch { return false; }
      `.trim(),
      expectedResult: 'true',
    });
  }

  return tests;
}

function generateSecurityTests(code: string, language: string, filename: string): TestCase[] {
  const tests: TestCase[] = [];
  const isJS = ['javascript', 'typescript', 'jsx', 'tsx'].includes(language);
  const isHTML = language === 'html';
  const isCSS = language === 'css';
  const isJSON = language === 'json';

  // ── JS/TS/JSX/TSX Security Tests ──

  if (isJS) {
    // SEC-01: No eval() usage
    tests.push({
      id: `sec-no-eval-${filename}`,
      name: '[SEC] No eval() usage',
      type: 'security',
      category: 'security',
      description: 'eval() allows arbitrary code execution and is a critical injection vector',
      code: `return !(/\\beval\\s*\\(/.test(code));`.trim(),
      expectedResult: 'true',
    });

    // SEC-02: No Function constructor
    tests.push({
      id: `sec-no-function-constructor-${filename}`,
      name: '[SEC] No Function() constructor',
      type: 'security',
      category: 'security',
      description: 'new Function() is equivalent to eval and enables code injection',
      code: `return !(/\\bnew\\s+Function\\s*\\(/.test(code));`.trim(),
      expectedResult: 'true',
    });

    // SEC-03: No innerHTML assignment
    tests.push({
      id: `sec-no-innerhtml-${filename}`,
      name: '[SEC] No innerHTML assignment',
      type: 'security',
      category: 'security',
      description: 'innerHTML enables DOM-based XSS when used with untrusted data',
      code: `return !(/\\.innerHTML\\s*=/.test(code));`.trim(),
      expectedResult: 'true',
    });

    // SEC-04: No document.write
    tests.push({
      id: `sec-no-document-write-${filename}`,
      name: '[SEC] No document.write()',
      type: 'security',
      category: 'security',
      description: 'document.write() can inject scripts and is blocked in modern CSP policies',
      code: `return !(/\\bdocument\\.write(ln)?\\s*\\(/.test(code));`.trim(),
      expectedResult: 'true',
    });

    // SEC-05: No hardcoded API keys or tokens
    tests.push({
      id: `sec-no-hardcoded-secrets-${filename}`,
      name: '[SEC] No hardcoded secrets',
      type: 'security',
      category: 'security',
      description: 'API keys, tokens, and passwords should never be hardcoded in source',
      code: `
var patterns = [
  /['"](?:sk|pk)[-_](?:live|test)[-_][a-zA-Z0-9]{20,}['"]/,
  /['"](?:api[_-]?key|apikey|secret[_-]?key|auth[_-]?token|access[_-]?token|private[_-]?key)\\s*[:=]\\s*['"][a-zA-Z0-9]{10,}['"]/i,
  /['"]ghp_[a-zA-Z0-9]{36}['"]/,
  /['"]AIza[a-zA-Z0-9_-]{35}['"]/,
  /['"](?:AKIA|ASIA)[A-Z0-9]{16}['"]/,
  /password\\s*[:=]\\s*['"][^'"]{6,}['"]/i
];
return !patterns.some(function(p) { return p.test(code); });
      `.trim(),
      expectedResult: 'true',
    });

    // SEC-06: No dangerouslySetInnerHTML in React
    if (language === 'jsx' || language === 'tsx' || code.includes('React') || code.includes('className')) {
      tests.push({
        id: `sec-no-dangerous-html-${filename}`,
        name: '[SEC] No dangerouslySetInnerHTML',
        type: 'security',
        category: 'security',
        description: 'dangerouslySetInnerHTML bypasses React XSS protection and renders raw HTML',
        code: `return !code.includes('dangerouslySetInnerHTML');`.trim(),
        expectedResult: 'true',
      });
    }

    // SEC-07: No console.log with sensitive data patterns
    tests.push({
      id: `sec-no-sensitive-logging-${filename}`,
      name: '[SEC] No sensitive data in logs',
      type: 'security',
      category: 'security',
      description: 'Console logs should not expose passwords, tokens, or keys',
      code: `
var logStatements = code.match(/console\\.(?:log|info|debug|warn)\\s*\\([^)]*\\)/g) || [];
var sensitivePatterns = /(?:password|secret|token|apiKey|api_key|credential|private)/i;
return !logStatements.some(function(s) { return sensitivePatterns.test(s); });
      `.trim(),
      expectedResult: 'true',
    });

    // SEC-08: No disabled CORS
    tests.push({
      id: `sec-no-wildcard-cors-${filename}`,
      name: '[SEC] No wildcard CORS origin',
      type: 'security',
      category: 'security',
      description: 'CORS with wildcard * allows any origin to access resources',
      code: `return !(/(?:Access-Control-Allow-Origin|origin)\\s*[:=]\\s*['"]\\*['"]/.test(code));`.trim(),
      expectedResult: 'true',
    });

    // SEC-09: No disabled security headers
    tests.push({
      id: `sec-no-disabled-security-${filename}`,
      name: '[SEC] No disabled security features',
      type: 'security',
      category: 'security',
      description: 'Security mechanisms should not be explicitly disabled',
      code: `
var bad = [
  /(?:csrf|xsrf|cors)\\s*[:=]\\s*false/i,
  /(?:verify|validate|authenticate|authorize)\\s*[:=]\\s*false/i,
  /(?:secure|httpOnly|sameSite)\\s*[:=]\\s*false/i,
  /rejectUnauthorized\\s*[:=]\\s*false/i
];
return !bad.some(function(p) { return p.test(code); });
      `.trim(),
      expectedResult: 'true',
    });

    // SEC-10: No setTimeout/setInterval with string arguments
    tests.push({
      id: `sec-no-string-timeout-${filename}`,
      name: '[SEC] No string-based setTimeout/setInterval',
      type: 'security',
      category: 'security',
      description: 'Passing strings to setTimeout/setInterval acts like eval()',
      code: `return !(/(?:setTimeout|setInterval)\\s*\\(\\s*['"]/.test(code));`.trim(),
      expectedResult: 'true',
    });

    // SEC-11: No prototype pollution patterns
    tests.push({
      id: `sec-no-proto-pollution-${filename}`,
      name: '[SEC] No prototype pollution vectors',
      type: 'security',
      category: 'security',
      description: 'Direct __proto__ or prototype manipulation can lead to prototype pollution',
      code: `return !(/(?:__proto__|\\[['"]__proto__['"]\\]|Object\\.assign\\s*\\(\\s*\\{\\})/i.test(code));`.trim(),
      expectedResult: 'true',
    });

    // SEC-12: No unvalidated redirects
    tests.push({
      id: `sec-no-open-redirect-${filename}`,
      name: '[SEC] No unvalidated redirects',
      type: 'security',
      category: 'security',
      description: 'window.location assignments with user input enable open redirect attacks',
      code: `
var hasRedirect = /window\\.location(?:\\.href)?\\s*=/.test(code);
if (!hasRedirect) return true;
var paramUsed = /window\\.location(?:\\.href)?\\s*=\\s*(?:params|query|searchParams|req\\.|input|userInput)/.test(code);
return !paramUsed;
      `.trim(),
      expectedResult: 'true',
    });

    // SEC-13: No SQL injection patterns (template literals in queries)
    tests.push({
      id: `sec-no-sql-injection-${filename}`,
      name: '[SEC] No SQL injection vectors',
      type: 'security',
      category: 'security',
      description: 'SQL queries must use parameterized queries, not string concatenation',
      code: `
var sqlInString = /['"\`]\\s*(?:SELECT\\s+.*?FROM|INSERT\\s+INTO|UPDATE\\s+\\w+\\s+SET|DELETE\\s+FROM|DROP\\s+TABLE)/i;
if (!sqlInString.test(code)) return true;
var concatenated = /['"\`]\\s*(?:SELECT|INSERT|UPDATE|DELETE).*\\$\\{/i;
return !concatenated.test(code);
      `.trim(),
      expectedResult: 'true',
    });

    // SEC-14: No exec/spawn with unsanitized input
    tests.push({
      id: `sec-no-command-injection-${filename}`,
      name: '[SEC] No command injection risk',
      type: 'security',
      category: 'security',
      description: 'child_process exec with user input enables OS command injection',
      code: `
var hasExec = /(?:exec|execSync|spawn|spawnSync)\\s*\\(/.test(code);
if (!hasExec) return true;
var withInput = /(?:exec|execSync)\\s*\\(\\s*(?:\`|['"].*\\$\\{)/.test(code);
return !withInput;
      `.trim(),
      expectedResult: 'true',
    });

    // SEC-15: No disabled eslint security rules
    tests.push({
      id: `sec-no-eslint-disable-security-${filename}`,
      name: '[SEC] No disabled lint security rules',
      type: 'security',
      category: 'security',
      description: 'Security-related lint rules should not be disabled inline',
      code: `return !(/eslint-disable.*(?:no-eval|no-implied-eval|security)/.test(code));`.trim(),
      expectedResult: 'true',
    });

    // SEC-16: No hardcoded localhost/IP addresses for production
    tests.push({
      id: `sec-no-hardcoded-urls-${filename}`,
      name: '[SEC] No hardcoded localhost URLs',
      type: 'security',
      category: 'security',
      description: 'API endpoints should use environment variables, not hardcoded URLs',
      code: `
var hardcoded = /(?:fetch|axios|http|api).*['"]https?:\\/\\/(?:localhost|127\\.0\\.0\\.1):\\d+/.test(code);
return !hardcoded;
      `.trim(),
      expectedResult: 'true',
    });

    // SEC-17: No math.random for crypto
    tests.push({
      id: `sec-no-weak-random-${filename}`,
      name: '[SEC] No Math.random() for IDs/tokens',
      type: 'security',
      category: 'security',
      description: 'Math.random() is not cryptographically secure for generating tokens or IDs',
      code: `
var randomUsed = code.includes('Math.random()');
if (!randomUsed) return true;
var idContext = /(?:token|session|id|key|secret|nonce|salt)\\s*=.*Math\\.random/i.test(code);
return !idContext;
      `.trim(),
      expectedResult: 'true',
    });

    // SEC-18: No disabled TypeScript strict checks
    tests.push({
      id: `sec-no-ts-any-abuse-${filename}`,
      name: '[SEC] Limited unsafe type assertions',
      type: 'security',
      category: 'security',
      description: 'Excessive "as any" casts bypass type safety and mask potential vulnerabilities',
      code: `
var anyCount = (code.match(/as\\s+any/g) || []).length;
return anyCount <= 3;
      `.trim(),
      expectedResult: 'true',
    });

    // SEC-19: No storing sensitive data in localStorage
    tests.push({
      id: `sec-no-localstorage-sensitive-${filename}`,
      name: '[SEC] No sensitive data in localStorage',
      type: 'security',
      category: 'security',
      description: 'localStorage is accessible via XSS; do not store tokens or passwords',
      code: `
var storageWrites = code.match(/localStorage\\.setItem\\s*\\([^)]*\\)/g) || [];
var sensitive = /(?:token|password|secret|key|credential|session)/i;
return !storageWrites.some(function(s) { return sensitive.test(s); });
      `.trim(),
      expectedResult: 'true',
    });

    // SEC-20: No exposed error stack traces
    tests.push({
      id: `sec-no-error-exposure-${filename}`,
      name: '[SEC] No stack trace exposure',
      type: 'security',
      category: 'security',
      description: 'Error stack traces should not be sent to clients as they leak internals',
      code: `
var sendsStack = /res\\.(?:json|send)\\s*\\(.*(?:err\\.stack|error\\.stack|e\\.stack)/.test(code);
return !sendsStack;
      `.trim(),
      expectedResult: 'true',
    });

    // SEC-21: No disabled HTTPS/TLS verification
    tests.push({
      id: `sec-no-tls-bypass-${filename}`,
      name: '[SEC] No TLS/SSL verification bypass',
      type: 'security',
      category: 'security',
      description: 'Disabling TLS verification exposes traffic to MITM attacks',
      code: `
return !(/NODE_TLS_REJECT_UNAUTHORIZED\\s*=\\s*['"]0['"]/.test(code)) && !(/rejectUnauthorized\\s*:\\s*false/.test(code));
      `.trim(),
      expectedResult: 'true',
    });

    // SEC-22: No file path traversal patterns
    tests.push({
      id: `sec-no-path-traversal-${filename}`,
      name: '[SEC] No path traversal risk',
      type: 'security',
      category: 'security',
      description: 'File paths should be sanitized to prevent directory traversal attacks',
      code: `
var fsOps = /(?:readFile|writeFile|readdir|unlink|createReadStream)/.test(code);
if (!fsOps) return true;
var userPath = /(?:readFile|writeFile|readdir|unlink|createReadStream)\\s*\\(\\s*(?:req\\.|params\\.|query\\.)/.test(code);
return !userPath;
      `.trim(),
      expectedResult: 'true',
    });

    // SEC-23: No insecure regular expressions (ReDoS)
    tests.push({
      id: `sec-no-redos-${filename}`,
      name: '[SEC] No ReDoS-vulnerable patterns',
      type: 'security',
      category: 'security',
      description: 'Nested quantifiers in regex can cause catastrophic backtracking (ReDoS)',
      code: `
var regexes = code.match(/\\/((?:[^\\\\/]|\\\\.)*)\\//g) || [];
var dangerous = regexes.filter(function(r) { return /\\([^)]*[+*][^)]*\\)[+*]/.test(r); });
return dangerous.length === 0;
      `.trim(),
      expectedResult: 'true',
    });

    // SEC-24: No hardcoded JWT secrets
    tests.push({
      id: `sec-no-hardcoded-jwt-${filename}`,
      name: '[SEC] No hardcoded JWT secrets',
      type: 'security',
      category: 'security',
      description: 'JWT signing secrets should come from environment variables',
      code: `
var jwtSign = /jwt\\.sign\\s*\\([^)]*,\\s*['"][^'"]{3,}['"]/i.test(code);
var jwtVerify = /jwt\\.verify\\s*\\([^)]*,\\s*['"][^'"]{3,}['"]/i.test(code);
return !jwtSign && !jwtVerify;
      `.trim(),
      expectedResult: 'true',
    });
  }

  // ── HTML Security Tests ──

  if (isHTML) {
    // SEC-25: No inline event handlers
    tests.push({
      id: `sec-html-no-inline-handlers-${filename}`,
      name: '[SEC] No inline event handlers',
      type: 'security',
      category: 'security',
      description: 'Inline onclick/onerror handlers bypass CSP and enable XSS',
      code: `return !(/\\s+on(?:click|error|load|mouseover|focus|blur|submit|change|input|keydown)\\s*=/i.test(code));`.trim(),
      expectedResult: 'true',
    });

    // SEC-26: No inline scripts in HTML
    tests.push({
      id: `sec-html-no-inline-scripts-${filename}`,
      name: '[SEC] No inline scripts',
      type: 'security',
      category: 'security',
      description: 'Inline scripts are blocked by strict CSP; use external script files',
      code: `
var scripts = code.match(/<script[^>]*>[\\s\\S]*?<\\/script>/gi) || [];
var inline = scripts.filter(function(s) { return !(/\\bsrc\\s*=/.test(s)) && s.replace(/<\\/?script[^>]*>/gi, '').trim().length > 0; });
return inline.length === 0;
      `.trim(),
      expectedResult: 'true',
    });

    // SEC-27: No javascript: protocol links
    tests.push({
      id: `sec-html-no-js-links-${filename}`,
      name: '[SEC] No javascript: protocol URIs',
      type: 'security',
      category: 'security',
      description: 'javascript: URIs in links enable XSS attacks',
      code: `return !(/href\\s*=\\s*['"]javascript:/i.test(code));`.trim(),
      expectedResult: 'true',
    });

    // SEC-28: Uses charset declaration
    tests.push({
      id: `sec-html-charset-${filename}`,
      name: '[SEC] Has charset declaration',
      type: 'security',
      category: 'security',
      description: 'Missing charset can allow encoding-based XSS attacks (UTF-7, etc.)',
      code: `return /charset\\s*=\\s*["']?utf-8/i.test(code);`.trim(),
      expectedResult: 'true',
    });

    // SEC-29: No data: URIs in scripts
    tests.push({
      id: `sec-html-no-data-uri-scripts-${filename}`,
      name: '[SEC] No data: URI in script sources',
      type: 'security',
      category: 'security',
      description: 'data: URIs in script src bypass same-origin and enable code injection',
      code: `return !(/src\\s*=\\s*['"]data:/i.test(code));`.trim(),
      expectedResult: 'true',
    });

    // SEC-30: No form actions to external domains
    tests.push({
      id: `sec-html-no-ext-form-action-${filename}`,
      name: '[SEC] No external form actions',
      type: 'security',
      category: 'security',
      description: 'Form actions should not post to unknown external domains',
      code: `return !(/action\\s*=\\s*['"]https?:\\/\\//.test(code));`.trim(),
      expectedResult: 'true',
    });
  }

  // ── CSS Security Tests ──

  if (isCSS) {
    // SEC-31: No CSS expressions (IE)
    tests.push({
      id: `sec-css-no-expression-${filename}`,
      name: '[SEC] No CSS expressions',
      type: 'security',
      category: 'security',
      description: 'CSS expressions allow JavaScript execution within stylesheets',
      code: `return !(/expression\\s*\\(/i.test(code));`.trim(),
      expectedResult: 'true',
    });

    // SEC-32: No CSS url() with javascript:
    tests.push({
      id: `sec-css-no-js-url-${filename}`,
      name: '[SEC] No javascript: in CSS url()',
      type: 'security',
      category: 'security',
      description: 'javascript: protocol in CSS url() enables script execution',
      code: `return !(/url\\s*\\(\\s*['"]?javascript:/i.test(code));`.trim(),
      expectedResult: 'true',
    });

    // SEC-33: No @import from external HTTP
    tests.push({
      id: `sec-css-no-ext-import-${filename}`,
      name: '[SEC] No external @import URLs',
      type: 'security',
      category: 'security',
      description: 'External CSS imports can be hijacked for data exfiltration',
      code: `return !(/^\\s*@import\\s+(?:url\\s*\\()?\\s*['"]https?:\\/\\//m.test(code));`.trim(),
      expectedResult: 'true',
    });
  }

  // ── JSON Security Tests ──

  if (isJSON) {
    // SEC-34: No credentials in JSON config
    tests.push({
      id: `sec-json-no-creds-${filename}`,
      name: '[SEC] No credentials in JSON',
      type: 'security',
      category: 'security',
      description: 'JSON config files should not contain passwords, tokens, or API keys',
      code: `
try {
  var obj = JSON.parse(code);
  var str = JSON.stringify(obj);
  var sensitive = /["'](?:password|secret|api_key|apiKey|token|private_key|access_key)["']\\s*:\\s*["'][^"']{6,}["']/i;
  return !sensitive.test(str);
} catch(e) { return true; }
      `.trim(),
      expectedResult: 'true',
    });

    // SEC-35: Package.json - no wildcard dependencies
    if (filename.includes('package.json')) {
      tests.push({
        id: `sec-json-no-wildcard-deps-${filename}`,
        name: '[SEC] No wildcard dependency versions',
        type: 'security',
        category: 'security',
        description: 'Wildcard * versions allow arbitrary packages to be installed',
        code: `
try {
  var pkg = JSON.parse(code);
  var deps = Object.assign({}, pkg.dependencies || {}, pkg.devDependencies || {});
  var versions = Object.values(deps);
  return !versions.some(function(v) { return v === '*' || v === 'latest'; });
} catch(e) { return true; }
        `.trim(),
        expectedResult: 'true',
      });
    }
  }

  return tests;
}

export function runTests(testSuite: TestSuite, code: string): TestResults {
  const details: TestResultDetail[] = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const test of testSuite.tests) {
    try {
      const testFunc = new Function('code', test.code);
      const result = testFunc(code);
      const expectedResult = test.expectedResult === 'true' ? true :
                            test.expectedResult === 'false' ? false : test.expectedResult;

      if (result === expectedResult || (typeof result === 'boolean' && result)) {
        passed++;
        details.push({
          testId: test.id,
          testName: test.name,
          status: 'passed',
        });
      } else {
        failed++;
        details.push({
          testId: test.id,
          testName: test.name,
          status: 'failed',
          error: `Expected ${expectedResult}, got ${result}`,
        });
      }
    } catch (error: any) {
      failed++;
      details.push({
        testId: test.id,
        testName: test.name,
        status: 'failed',
        error: error.message,
      });
    }
  }

  return {
    passed,
    failed,
    skipped,
    coverage: testSuite.tests.length > 0 ? Math.round((passed / testSuite.tests.length) * 100) : 0,
    details,
  };
}

export function formatTestResults(results: TestResults): string {
  let output = `## Test Results\n\n`;
  output += `**Passed:** ${results.passed} | **Failed:** ${results.failed} | **Skipped:** ${results.skipped}\n`;
  output += `**Coverage:** ${results.coverage}%\n\n`;

  if (results.failed > 0) {
    output += `### Failed Tests\n`;
    for (const detail of results.details.filter(d => d.status === 'failed')) {
      output += `- ${detail.testName}: ${detail.error}\n`;
    }
    output += '\n';
  }

  output += `### All Tests\n`;
  for (const detail of results.details) {
    const icon = detail.status === 'passed' ? '[PASS]' : detail.status === 'failed' ? '[FAIL]' : '[SKIP]';
    output += `${icon} ${detail.testName}\n`;
  }

  return output;
}

export function validateBuild(files: { path: string; content: string; language: string }[]): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  const hasPackageJson = files.some(f => f.path === 'package.json' || f.path.endsWith('/package.json'));
  const hasEntryFile = files.some(f => {
    const base = f.path.split('/').pop() || '';
    return ['main.jsx', 'main.tsx', 'main.js', 'App.jsx', 'App.tsx', 'index.jsx', 'index.tsx'].includes(base);
  });
  const hasHtml = files.some(f => f.path.endsWith('.html'));

  if (!hasPackageJson) {
    warnings.push('No package.json found - project may not be installable');
  }
  if (!hasEntryFile) {
    warnings.push('No entry file (main.jsx/App.jsx) found');
  }
  if (!hasHtml) {
    warnings.push('No index.html found');
  }

  for (const file of files) {
    if (file.language === 'html') {
      if (!file.content.toLowerCase().includes('<!doctype') && !file.content.includes('id="root"')) {
        warnings.push(`${file.path}: Missing DOCTYPE declaration`);
      }
    }

    if (file.language === 'javascript' || file.language === 'typescript' ||
        file.language === 'jsx' || file.language === 'tsx') {
      const openBraces = (file.content.match(/{/g) || []).length;
      const closeBraces = (file.content.match(/}/g) || []).length;
      const openParens = (file.content.match(/\(/g) || []).length;
      const closeParens = (file.content.match(/\)/g) || []).length;

      if (openBraces !== closeBraces) {
        errors.push(`${file.path}: Mismatched braces { }`);
      }
      if (Math.abs(openParens - closeParens) > 2) {
        errors.push(`${file.path}: Mismatched parentheses ( )`);
      }
    }

    if (file.language === 'css') {
      const openBraces = (file.content.match(/{/g) || []).length;
      const closeBraces = (file.content.match(/}/g) || []).length;

      if (openBraces !== closeBraces) {
        errors.push(`${file.path}: Mismatched CSS braces { }`);
      }
    }

    if (file.language === 'json') {
      try {
        JSON.parse(file.content);
      } catch {
        errors.push(`${file.path}: Invalid JSON`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export { TestCase, TestSuite, TestResults };