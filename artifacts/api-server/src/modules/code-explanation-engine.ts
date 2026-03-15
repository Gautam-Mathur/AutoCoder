/**
 * Code Explanation Engine
 * Provides nuanced code explanations: line-by-line breakdown, pattern recognition, idiom identification
 */

// ============================================
// Pattern Recognition
// ============================================

export interface CodePattern {
  name: string;
  type: 'design-pattern' | 'idiom' | 'anti-pattern' | 'best-practice';
  language: string[];
  description: string;
  example: string;
}

const PATTERNS_DATABASE: Record<string, CodePattern> = {
  // Design Patterns
  singleton: {
    name: 'Singleton Pattern',
    type: 'design-pattern',
    language: ['javascript', 'typescript', 'python', 'java'],
    description: 'Ensures a class has only one instance and provides global access to it.',
    example: 'class Singleton { static instance; static getInstance() { if (!this.instance) this.instance = new Singleton(); return this.instance; } }',
  },
  factory: {
    name: 'Factory Pattern',
    type: 'design-pattern',
    language: ['javascript', 'typescript', 'python', 'java'],
    description: 'Creates objects without specifying the exact class, delegating instantiation to subclasses.',
    example: 'function createUser(type) { if (type === "admin") return new AdminUser(); return new User(); }',
  },
  observer: {
    name: 'Observer Pattern',
    type: 'design-pattern',
    language: ['javascript', 'typescript'],
    description: 'Defines a subscription mechanism to notify multiple objects about events.',
    example: 'class EventEmitter { listeners = []; subscribe(fn) { this.listeners.push(fn); } emit(data) { this.listeners.forEach(fn => fn(data)); } }',
  },
  decorator: {
    name: 'Decorator Pattern',
    type: 'design-pattern',
    language: ['javascript', 'typescript', 'python'],
    description: 'Attaches additional responsibilities to an object dynamically.',
    example: '@withLogging class Service {} // or function withLogging(fn) { return (...args) => { console.log("called"); return fn(...args); } }',
  },
  strategy: {
    name: 'Strategy Pattern',
    type: 'design-pattern',
    language: ['javascript', 'typescript', 'python'],
    description: 'Defines a family of algorithms and makes them interchangeable.',
    example: 'const strategies = { add: (a,b) => a+b, multiply: (a,b) => a*b }; function calculate(strategy, a, b) { return strategies[strategy](a, b); }',
  },

  // React Idioms
  react_hooks: {
    name: 'React Hooks Pattern',
    type: 'idiom',
    language: ['javascript', 'typescript'],
    description: 'Using useState/useEffect for state and side effects in functional components.',
    example: 'const [state, setState] = useState(initial); useEffect(() => { /* side effect */ }, [deps]);',
  },
  react_custom_hook: {
    name: 'Custom Hook Pattern',
    type: 'idiom',
    language: ['javascript', 'typescript'],
    description: 'Extracting reusable stateful logic into a custom hook starting with "use".',
    example: 'function useLocalStorage(key) { const [value, setValue] = useState(localStorage.getItem(key)); /* ... */ return [value, setValue]; }',
  },
  react_render_props: {
    name: 'Render Props Pattern',
    type: 'idiom',
    language: ['javascript', 'typescript'],
    description: 'Passing a function as prop to share code between components.',
    example: '<DataProvider render={data => <DisplayComponent data={data} />} />',
  },
  react_compound: {
    name: 'Compound Components Pattern',
    type: 'idiom',
    language: ['javascript', 'typescript'],
    description: 'Components that work together sharing implicit state.',
    example: '<Select><Select.Option value="a">A</Select.Option></Select>',
  },

  // JavaScript Idioms
  destructuring: {
    name: 'Destructuring Assignment',
    type: 'idiom',
    language: ['javascript', 'typescript'],
    description: 'Unpacking values from arrays or properties from objects into distinct variables.',
    example: 'const { name, age } = user; const [first, ...rest] = array;',
  },
  spread_operator: {
    name: 'Spread/Rest Operator',
    type: 'idiom',
    language: ['javascript', 'typescript'],
    description: 'Expanding iterables or collecting remaining elements.',
    example: 'const merged = { ...obj1, ...obj2 }; const sum = (...nums) => nums.reduce((a,b) => a+b);',
  },
  optional_chaining: {
    name: 'Optional Chaining',
    type: 'idiom',
    language: ['javascript', 'typescript'],
    description: 'Safe property access that short-circuits if null/undefined.',
    example: 'const name = user?.profile?.name ?? "default";',
  },
  nullish_coalescing: {
    name: 'Nullish Coalescing',
    type: 'idiom',
    language: ['javascript', 'typescript'],
    description: 'Returns right operand when left is null or undefined (not falsy).',
    example: 'const value = input ?? defaultValue;',
  },
  iife: {
    name: 'IIFE (Immediately Invoked Function Expression)',
    type: 'idiom',
    language: ['javascript', 'typescript'],
    description: 'A function that runs immediately after it is defined.',
    example: '(function() { /* private scope */ })(); // or (() => { /* ... */ })();',
  },

  // Python Idioms
  list_comprehension: {
    name: 'List Comprehension',
    type: 'idiom',
    language: ['python'],
    description: 'Concise way to create lists based on existing iterables.',
    example: 'squares = [x**2 for x in range(10) if x % 2 == 0]',
  },
  context_manager: {
    name: 'Context Manager (with statement)',
    type: 'idiom',
    language: ['python'],
    description: 'Manages resource allocation and cleanup automatically.',
    example: 'with open("file.txt") as f: content = f.read()',
  },
  generator: {
    name: 'Generator Function',
    type: 'idiom',
    language: ['python', 'javascript'],
    description: 'A function that can pause and resume, yielding multiple values over time.',
    example: 'def count(): n = 0; while True: yield n; n += 1',
  },

  // Anti-patterns
  callback_hell: {
    name: 'Callback Hell',
    type: 'anti-pattern',
    language: ['javascript'],
    description: 'Deeply nested callbacks making code hard to read. Use async/await instead.',
    example: 'getData(a => { process(a, b => { save(b, c => { /* pyramid of doom */ }) }) })',
  },
  god_object: {
    name: 'God Object',
    type: 'anti-pattern',
    language: ['javascript', 'typescript', 'python', 'java'],
    description: 'An object that knows or does too much. Split into smaller, focused classes.',
    example: 'class AppManager { handleAuth() {} handleDB() {} handleUI() {} handleAPI() {} /* too many responsibilities */ }',
  },
  magic_numbers: {
    name: 'Magic Numbers',
    type: 'anti-pattern',
    language: ['javascript', 'typescript', 'python'],
    description: 'Unexplained numeric literals in code. Use named constants instead.',
    example: 'if (status === 3) // What does 3 mean? Use: if (status === STATUS.PENDING)',
  },

  // Best Practices
  early_return: {
    name: 'Early Return / Guard Clause',
    type: 'best-practice',
    language: ['javascript', 'typescript', 'python'],
    description: 'Return early to avoid deep nesting and improve readability.',
    example: 'function process(x) { if (!x) return null; if (!x.valid) return error; /* main logic */ }',
  },
  immutability: {
    name: 'Immutability',
    type: 'best-practice',
    language: ['javascript', 'typescript'],
    description: 'Not modifying existing data, creating new copies instead.',
    example: 'const newArray = [...oldArray, newItem]; const updated = { ...obj, prop: newValue };',
  },
  pure_function: {
    name: 'Pure Function',
    type: 'best-practice',
    language: ['javascript', 'typescript', 'python'],
    description: 'A function that always returns the same output for the same input, with no side effects.',
    example: 'const add = (a, b) => a + b; // Pure: no side effects, deterministic',
  },
};

// Pattern detection rules
const PATTERN_DETECTORS: { pattern: string; detect: (code: string) => boolean }[] = [
  { pattern: 'singleton', detect: (code) => /static\s+instance|getInstance\s*\(/.test(code) },
  { pattern: 'factory', detect: (code) => /function\s+create\w+|factory|Factory/.test(code) },
  { pattern: 'observer', detect: (code) => /subscribe|unsubscribe|notify|emit|on\s*\(|addEventListener/.test(code) },
  { pattern: 'decorator', detect: (code) => /@\w+\s*(class|function)|withAuth|withLogging|Higher.?Order/.test(code) },
  { pattern: 'react_hooks', detect: (code) => /use(State|Effect|Memo|Callback|Ref|Context)\s*\(/.test(code) },
  { pattern: 'react_custom_hook', detect: (code) => /function\s+use[A-Z]\w*\s*\(/.test(code) },
  { pattern: 'destructuring', detect: (code) => /const\s*\{[^}]+\}\s*=|const\s*\[[^\]]+\]\s*=/.test(code) },
  { pattern: 'spread_operator', detect: (code) => /\.\.\.\w+|\[\s*\.\.\.|{\s*\.\.\./.test(code) },
  { pattern: 'optional_chaining', detect: (code) => /\w+\?\.\w+/.test(code) },
  { pattern: 'nullish_coalescing', detect: (code) => /\?\?/.test(code) },
  { pattern: 'iife', detect: (code) => /\(\s*(function|async function|\(\)|async\s*\()\s*=>?\s*{/.test(code) || /\)\s*\(\s*\)/.test(code) },
  { pattern: 'list_comprehension', detect: (code) => /\[\s*\w+\s+for\s+\w+\s+in/.test(code) },
  { pattern: 'context_manager', detect: (code) => /with\s+\w+.*:\s*$/.test(code) },
  { pattern: 'generator', detect: (code) => /function\s*\*|yield\s+/.test(code) },
  { pattern: 'callback_hell', detect: (code) => (code.match(/=>\s*\{/g) || []).length > 3 && code.includes('=>') },
  { pattern: 'magic_numbers', detect: (code) => /===?\s*\d{2,}|return\s+\d{3,}/.test(code) },
  { pattern: 'early_return', detect: (code) => /if\s*\([^)]+\)\s*return/.test(code) },
  { pattern: 'pure_function', detect: (code) => /=>\s*[^{]/.test(code) && !/this\.|console\.|fetch|localStorage/.test(code) },
];

export function detectPatterns(code: string): CodePattern[] {
  const detected: CodePattern[] = [];

  for (const { pattern, detect } of PATTERN_DETECTORS) {
    if (detect(code) && PATTERNS_DATABASE[pattern]) {
      detected.push(PATTERNS_DATABASE[pattern]);
    }
  }

  return detected;
}

// ============================================
// Line-by-Line Explanation
// ============================================

export interface LineExplanation {
  lineNumber: number;
  code: string;
  purpose: string;
  category: 'import' | 'declaration' | 'assignment' | 'condition' | 'loop' | 'function' | 'return' | 'call' | 'comment' | 'export' | 'other';
  importance: 'critical' | 'important' | 'normal' | 'optional';
}

export function explainLines(code: string, language: string = 'javascript'): LineExplanation[] {
  const lines = code.split('\n');
  const explanations: LineExplanation[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || trimmed === '{' || trimmed === '}' || trimmed === ');') {
      continue;
    }

    const explanation = explainSingleLine(trimmed, i + 1, language);
    explanations.push(explanation);
  }

  return explanations;
}

function explainSingleLine(line: string, lineNumber: number, language: string): LineExplanation {
  // Import detection
  if (/^import\s/.test(line) || /^from\s/.test(line) || /^require\s*\(/.test(line)) {
    const match = line.match(/['"]([\w\-@/]+)['"]/);
    return {
      lineNumber,
      code: line,
      purpose: `Imports ${match ? match[1] : 'a module'} for use in this file`,
      category: 'import',
      importance: 'important',
    };
  }

  // Export detection
  if (/^export\s/.test(line)) {
    return {
      lineNumber,
      code: line,
      purpose: 'Makes this code available to other files',
      category: 'export',
      importance: 'important',
    };
  }

  // Comment detection
  if (/^\/\/|^#|^\/\*|^\*/.test(line)) {
    return {
      lineNumber,
      code: line,
      purpose: 'Documentation/explanation for developers',
      category: 'comment',
      importance: 'optional',
    };
  }

  // Function declaration
  if (/^(async\s+)?function\s+\w+|^const\s+\w+\s*=\s*(async\s*)?\(/.test(line) || /^def\s+\w+/.test(line)) {
    const match = line.match(/(function|const)\s+(\w+)|def\s+(\w+)/);
    const name = match ? (match[2] || match[3]) : 'a function';
    return {
      lineNumber,
      code: line,
      purpose: `Defines ${name} - a reusable block of code`,
      category: 'function',
      importance: 'critical',
    };
  }

  // Variable declaration
  if (/^(const|let|var)\s+\w+|^\w+\s*=/.test(line)) {
    const match = line.match(/(const|let|var)\s+(\w+)|^(\w+)\s*=/);
    const name = match ? (match[2] || match[3]) : 'a variable';
    const isConst = line.startsWith('const');
    return {
      lineNumber,
      code: line,
      purpose: `Creates ${isConst ? 'a constant' : 'a variable'} called "${name}" to store data`,
      category: isConst ? 'declaration' : 'assignment',
      importance: 'important',
    };
  }

  // Conditional
  if (/^if\s*\(|^else\s+if|^else\s*{?$|^elif\s/.test(line)) {
    return {
      lineNumber,
      code: line,
      purpose: 'Checks a condition and decides what code to run',
      category: 'condition',
      importance: 'critical',
    };
  }

  // Loop
  if (/^for\s*\(|^while\s*\(|^for\s+\w+\s+in/.test(line)) {
    return {
      lineNumber,
      code: line,
      purpose: 'Repeats code multiple times (loop)',
      category: 'loop',
      importance: 'critical',
    };
  }

  // Return
  if (/^return\s/.test(line)) {
    return {
      lineNumber,
      code: line,
      purpose: 'Sends a value back from this function',
      category: 'return',
      importance: 'critical',
    };
  }

  // Function call
  if (/\w+\s*\([^)]*\)/.test(line)) {
    const match = line.match(/(\w+)\s*\(/);
    return {
      lineNumber,
      code: line,
      purpose: `Calls the ${match ? match[1] : ''} function to perform an action`,
      category: 'call',
      importance: 'normal',
    };
  }

  return {
    lineNumber,
    code: line,
    purpose: 'General code statement',
    category: 'other',
    importance: 'normal',
  };
}

// ============================================
// Code Summary
// ============================================

export interface CodeSummary {
  overview: string;
  purpose: string;
  keyComponents: string[];
  patterns: CodePattern[];
  complexity: 'beginner' | 'intermediate' | 'advanced';
  techStack: string[];
}

export function summarizeCode(code: string, language: string = 'javascript'): CodeSummary {
  const lines = code.split('\n');
  const patterns = detectPatterns(code);

  // Detect tech stack
  const techStack: string[] = [];
  if (/import.*from\s+['"]react['"]/.test(code)) techStack.push('React');
  if (/useState|useEffect/.test(code)) techStack.push('React Hooks');
  if (/express\(\)/.test(code)) techStack.push('Express.js');
  if (/async.*await/.test(code)) techStack.push('Async/Await');
  if (/\.then\(/.test(code)) techStack.push('Promises');
  if (/class\s+\w+/.test(code)) techStack.push('OOP');
  if (/@\w+/.test(code)) techStack.push('Decorators');

  // Determine complexity
  const hasAdvancedPatterns = patterns.some(p => ['decorator', 'observer', 'strategy'].includes(p.name.toLowerCase()));
  const hasClasses = /class\s+\w+/.test(code);
  const hasGenerics = /<\w+>/.test(code);
  const lineCount = lines.length;

  const complexity: CodeSummary['complexity'] =
    (hasAdvancedPatterns || hasGenerics || lineCount > 100) ? 'advanced' :
    (hasClasses || lineCount > 30) ? 'intermediate' : 'beginner';

  // Key components
  const functions = code.match(/function\s+(\w+)|const\s+(\w+)\s*=\s*(\(|async)/g) || [];
  const classes = code.match(/class\s+(\w+)/g) || [];
  const keyComponents = [...functions.slice(0, 5), ...classes.slice(0, 3)].map(s => s.replace(/function\s+|const\s+|class\s+|=.*/, '').trim());

  // Generate overview
  const patternNames = patterns.map(p => p.name).join(', ');
  const overview = `This ${language} code ${patterns.length > 0 ? `uses ${patternNames}` : 'is a straightforward implementation'}. It contains ${lines.length} lines with ${keyComponents.length} main components.`;

  // Determine purpose
  let purpose = 'General purpose code';
  if (/fetch|axios|http/.test(code)) purpose = 'Makes API/HTTP requests';
  if (/addEventListener|onClick|onSubmit/.test(code)) purpose = 'Handles user interactions';
  if (/app\.(get|post|put|delete)/.test(code)) purpose = 'Defines API endpoints';
  if (/useState|render|component/i.test(code)) purpose = 'React UI component';
  if (/SELECT|INSERT|UPDATE|DELETE/.test(code)) purpose = 'Database operations';
  if (/test\(|describe\(|expect\(/.test(code)) purpose = 'Unit tests';

  return {
    overview,
    purpose,
    keyComponents,
    patterns,
    complexity,
    techStack,
  };
}

// ============================================
// Export Full Explanation
// ============================================

export interface FullExplanation {
  summary: CodeSummary;
  lines: LineExplanation[];
  patterns: CodePattern[];
  forBeginners: string;
  forExperts: string;
}

export function explainCode(code: string, language: string = 'javascript'): FullExplanation {
  const summary = summarizeCode(code, language);
  const lines = explainLines(code, language);
  const patterns = detectPatterns(code);

  // Beginner explanation
  const forBeginners = `This code ${summary.purpose.toLowerCase()}. It's ${summary.complexity} level code with ${lines.length} important lines. ${patterns.length > 0 ? `It uses common programming patterns like ${patterns.map(p => p.name).join(' and ')}.` : 'It uses straightforward programming techniques.'}`;

  // Expert explanation
  const forExperts = `${summary.techStack.join('/')} implementation using ${patterns.map(p => p.name).join(', ') || 'procedural patterns'}. Complexity: O(n) estimated. ${summary.keyComponents.length} exported symbols. ${summary.complexity} cognitive load.`;

  return {
    summary,
    lines,
    patterns,
    forBeginners,
    forExperts,
  };
}

export function formatExplanationAsMarkdown(explanation: FullExplanation): string {
  const sections = [
    '## Code Explanation',
    '',
    `### Overview`,
    explanation.summary.overview,
    '',
    `**Purpose**: ${explanation.summary.purpose}`,
    `**Complexity**: ${explanation.summary.complexity}`,
    `**Tech Stack**: ${explanation.summary.techStack.join(', ') || 'Standard'}`,
    '',
  ];

  if (explanation.patterns.length > 0) {
    sections.push('### Patterns Detected');
    for (const pattern of explanation.patterns) {
      sections.push(`- **${pattern.name}** (${pattern.type}): ${pattern.description}`);
    }
    sections.push('');
  }

  sections.push('### Key Lines');
  for (const line of explanation.lines.filter(l => l.importance === 'critical').slice(0, 10)) {
    sections.push(`- Line ${line.lineNumber}: ${line.purpose}`);
  }

  sections.push('', '### For Beginners');
  sections.push(explanation.forBeginners);

  sections.push('', '### For Experts');
  sections.push(explanation.forExperts);

  return sections.join('\n');
}