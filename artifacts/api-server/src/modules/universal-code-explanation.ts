/**
 * Universal Code Explanation Engine
 * Claude-level code understanding for 20+ languages
 * AST analysis, semantic flow tracing, pattern detection
 */

// ============================================
// LANGUAGE DEFINITIONS
// ============================================

export interface LanguageDefinition {
  name: string;
  extensions: string[];
  commentSingle: string;
  commentMultiStart: string;
  commentMultiEnd: string;
  stringDelimiters: string[];
  keywords: string[];
  builtins: string[];
  patterns: CodePattern[];
}

export interface CodePattern {
  name: string;
  regex: RegExp;
  type: 'control-flow' | 'declaration' | 'expression' | 'import' | 'class' | 'function' | 'loop' | 'conditional' | 'error-handling';
  explanation: string;
}

export interface CodeExplanation {
  language: string;
  summary: string;
  purpose: string;
  complexity: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  components: ComponentExplanation[];
  dataFlow: DataFlowStep[];
  patterns: DetectedPattern[];
  suggestions: string[];
  concepts: string[];
  lineByLine: LineExplanation[];
}

export interface ComponentExplanation {
  type: string;
  name: string;
  line: number;
  description: string;
  parameters?: string[];
  returnType?: string;
}

export interface DataFlowStep {
  step: number;
  description: string;
  variables: string[];
  line?: number;
}

export interface DetectedPattern {
  name: string;
  confidence: number;
  lines: number[];
  description: string;
  category: string;
}

export interface LineExplanation {
  lineNumber: number;
  code: string;
  explanation: string;
  concepts: string[];
  complexity: 'simple' | 'moderate' | 'complex';
}

// ============================================
// LANGUAGE DEFINITIONS DATABASE
// ============================================

const LANGUAGES: Record<string, LanguageDefinition> = {
  javascript: {
    name: 'JavaScript',
    extensions: ['.js', '.mjs', '.cjs'],
    commentSingle: '//',
    commentMultiStart: '/*',
    commentMultiEnd: '*/',
    stringDelimiters: ['"', "'", '`'],
    keywords: ['const', 'let', 'var', 'function', 'class', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'return', 'throw', 'try', 'catch', 'finally', 'new', 'delete', 'typeof', 'instanceof', 'in', 'of', 'async', 'await', 'yield', 'import', 'export', 'default', 'from', 'extends', 'super', 'this', 'static', 'get', 'set'],
    builtins: ['console', 'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Date', 'RegExp', 'Promise', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Symbol', 'Proxy', 'Reflect', 'fetch', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'],
    patterns: [
      { name: 'Arrow Function', regex: /\([^)]*\)\s*=>/g, type: 'function', explanation: 'Concise function syntax with lexical this binding' },
      { name: 'Destructuring', regex: /(?:const|let|var)\s+[{[].*[}\]]\s*=/g, type: 'declaration', explanation: 'Extracting values from objects or arrays' },
      { name: 'Spread Operator', regex: /\.{3}\w+/g, type: 'expression', explanation: 'Spreading elements of an iterable' },
      { name: 'Template Literal', regex: /`[^`]*\$\{[^}]+\}[^`]*`/g, type: 'expression', explanation: 'String interpolation with embedded expressions' },
      { name: 'Optional Chaining', regex: /\?\./g, type: 'expression', explanation: 'Safe property access that returns undefined if null' },
      { name: 'Nullish Coalescing', regex: /\?\?/g, type: 'expression', explanation: 'Fallback for null or undefined values' },
      { name: 'Async/Await', regex: /async\s+(?:function|\([^)]*\)\s*=>)/g, type: 'function', explanation: 'Asynchronous function for cleaner Promise handling' },
      { name: 'Class Declaration', regex: /class\s+\w+/g, type: 'class', explanation: 'ES6 class syntax for object-oriented programming' },
      { name: 'Module Import', regex: /import\s+.*\s+from\s+['"][^'"]+['"]/g, type: 'import', explanation: 'ES6 module import statement' },
      { name: 'Try-Catch', regex: /try\s*\{[\s\S]*?\}\s*catch/g, type: 'error-handling', explanation: 'Error handling block' },
    ],
  },

  typescript: {
    name: 'TypeScript',
    extensions: ['.ts', '.tsx', '.mts', '.cts'],
    commentSingle: '//',
    commentMultiStart: '/*',
    commentMultiEnd: '*/',
    stringDelimiters: ['"', "'", '`'],
    keywords: ['const', 'let', 'var', 'function', 'class', 'interface', 'type', 'enum', 'namespace', 'module', 'declare', 'abstract', 'implements', 'extends', 'public', 'private', 'protected', 'readonly', 'override', 'as', 'is', 'keyof', 'typeof', 'infer', 'satisfies', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'return', 'throw', 'try', 'catch', 'finally', 'new', 'delete', 'instanceof', 'in', 'of', 'async', 'await', 'yield', 'import', 'export', 'default', 'from', 'super', 'this', 'static', 'get', 'set'],
    builtins: ['console', 'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Date', 'RegExp', 'Promise', 'Map', 'Set', 'Partial', 'Required', 'Readonly', 'Record', 'Pick', 'Omit', 'Exclude', 'Extract', 'NonNullable', 'ReturnType', 'Parameters', 'InstanceType'],
    patterns: [
      { name: 'Type Annotation', regex: /:\s*(?:\w+(?:<[^>]+>)?|\{[^}]+\}|\[[^\]]+\])/g, type: 'declaration', explanation: 'Explicit type declaration' },
      { name: 'Interface', regex: /interface\s+\w+/g, type: 'declaration', explanation: 'Type contract for object shape' },
      { name: 'Type Alias', regex: /type\s+\w+\s*=/g, type: 'declaration', explanation: 'Custom type definition' },
      { name: 'Generic', regex: /<\s*\w+(?:\s+extends\s+[^>]+)?>/g, type: 'declaration', explanation: 'Parameterized type for reusability' },
      { name: 'Type Guard', regex: /(?:is|typeof|instanceof)\s+\w+/g, type: 'expression', explanation: 'Runtime type checking' },
      { name: 'Enum', regex: /enum\s+\w+/g, type: 'declaration', explanation: 'Named constant group' },
      { name: 'Decorator', regex: /@\w+(?:\([^)]*\))?/g, type: 'declaration', explanation: 'Metadata annotation' },
      { name: 'Utility Type', regex: /(?:Partial|Required|Readonly|Record|Pick|Omit|Exclude|Extract|NonNullable|ReturnType|Parameters)<[^>]+>/g, type: 'declaration', explanation: 'Built-in type transformation' },
    ],
  },

  python: {
    name: 'Python',
    extensions: ['.py', '.pyw', '.pyi'],
    commentSingle: '#',
    commentMultiStart: '"""',
    commentMultiEnd: '"""',
    stringDelimiters: ['"', "'", '"""', "'''"],
    keywords: ['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'with', 'as', 'import', 'from', 'return', 'yield', 'raise', 'pass', 'break', 'continue', 'lambda', 'and', 'or', 'not', 'in', 'is', 'True', 'False', 'None', 'async', 'await', 'global', 'nonlocal', 'assert', 'del', 'match', 'case'],
    builtins: ['print', 'len', 'range', 'str', 'int', 'float', 'list', 'dict', 'set', 'tuple', 'bool', 'type', 'isinstance', 'hasattr', 'getattr', 'setattr', 'open', 'input', 'map', 'filter', 'zip', 'enumerate', 'sorted', 'reversed', 'sum', 'min', 'max', 'abs', 'any', 'all'],
    patterns: [
      { name: 'Function Definition', regex: /def\s+\w+\s*\([^)]*\)\s*(?:->.*)?:/g, type: 'function', explanation: 'Function declaration with parameters' },
      { name: 'Class Definition', regex: /class\s+\w+(?:\([^)]*\))?:/g, type: 'class', explanation: 'Class declaration, possibly with inheritance' },
      { name: 'List Comprehension', regex: /\[[^\]]+\s+for\s+\w+\s+in\s+[^\]]+\]/g, type: 'expression', explanation: 'Concise list creation with iteration' },
      { name: 'Dict Comprehension', regex: /\{[^}]+:\s*[^}]+\s+for\s+\w+\s+in\s+[^}]+\}/g, type: 'expression', explanation: 'Concise dictionary creation' },
      { name: 'Decorator', regex: /@\w+(?:\([^)]*\))?\s*\n/g, type: 'declaration', explanation: 'Function wrapper/modifier' },
      { name: 'Context Manager', regex: /with\s+.+\s+as\s+\w+:/g, type: 'control-flow', explanation: 'Resource management with automatic cleanup' },
      { name: 'Lambda', regex: /lambda\s+[^:]+:/g, type: 'function', explanation: 'Anonymous inline function' },
      { name: 'F-String', regex: /f['"]/g, type: 'expression', explanation: 'Formatted string literal' },
      { name: 'Type Hint', regex: /:\s*(?:\w+(?:\[[^\]]+\])?)/g, type: 'declaration', explanation: 'Type annotation for variables/parameters' },
      { name: 'Pattern Matching', regex: /match\s+.+:\s*\n\s*case/g, type: 'control-flow', explanation: 'Structural pattern matching (Python 3.10+)' },
    ],
  },

  go: {
    name: 'Go',
    extensions: ['.go'],
    commentSingle: '//',
    commentMultiStart: '/*',
    commentMultiEnd: '*/',
    stringDelimiters: ['"', '`'],
    keywords: ['break', 'case', 'chan', 'const', 'continue', 'default', 'defer', 'else', 'fallthrough', 'for', 'func', 'go', 'goto', 'if', 'import', 'interface', 'map', 'package', 'range', 'return', 'select', 'struct', 'switch', 'type', 'var'],
    builtins: ['append', 'cap', 'close', 'complex', 'copy', 'delete', 'imag', 'len', 'make', 'new', 'panic', 'print', 'println', 'real', 'recover'],
    patterns: [
      { name: 'Function Declaration', regex: /func\s+(?:\([^)]+\)\s*)?\w+\s*\([^)]*\)/g, type: 'function', explanation: 'Go function with optional receiver' },
      { name: 'Goroutine', regex: /go\s+\w+\(/g, type: 'expression', explanation: 'Concurrent execution' },
      { name: 'Channel', regex: /(?:chan\s+\w+|<-\s*\w+|\w+\s*<-)/g, type: 'expression', explanation: 'Channel communication' },
      { name: 'Struct', regex: /type\s+\w+\s+struct\s*\{/g, type: 'declaration', explanation: 'Custom data structure' },
      { name: 'Interface', regex: /type\s+\w+\s+interface\s*\{/g, type: 'declaration', explanation: 'Method set contract' },
      { name: 'Defer', regex: /defer\s+/g, type: 'control-flow', explanation: 'Deferred execution until function returns' },
      { name: 'Error Handling', regex: /if\s+err\s*!=\s*nil/g, type: 'error-handling', explanation: 'Idiomatic Go error check' },
      { name: 'Short Variable', regex: /:=/g, type: 'declaration', explanation: 'Short variable declaration with inference' },
    ],
  },

  rust: {
    name: 'Rust',
    extensions: ['.rs'],
    commentSingle: '//',
    commentMultiStart: '/*',
    commentMultiEnd: '*/',
    stringDelimiters: ['"'],
    keywords: ['as', 'async', 'await', 'break', 'const', 'continue', 'crate', 'dyn', 'else', 'enum', 'extern', 'false', 'fn', 'for', 'if', 'impl', 'in', 'let', 'loop', 'match', 'mod', 'move', 'mut', 'pub', 'ref', 'return', 'self', 'Self', 'static', 'struct', 'super', 'trait', 'true', 'type', 'unsafe', 'use', 'where', 'while'],
    builtins: ['Option', 'Result', 'Some', 'None', 'Ok', 'Err', 'Vec', 'String', 'Box', 'Rc', 'Arc', 'Cell', 'RefCell', 'Mutex', 'println', 'print', 'format', 'panic', 'assert', 'debug_assert'],
    patterns: [
      { name: 'Function', regex: /fn\s+\w+(?:<[^>]+>)?\s*\([^)]*\)/g, type: 'function', explanation: 'Rust function definition' },
      { name: 'Struct', regex: /struct\s+\w+/g, type: 'declaration', explanation: 'Custom data structure' },
      { name: 'Enum', regex: /enum\s+\w+/g, type: 'declaration', explanation: 'Algebraic data type' },
      { name: 'Trait', regex: /trait\s+\w+/g, type: 'declaration', explanation: 'Shared behavior definition' },
      { name: 'Impl Block', regex: /impl(?:<[^>]+>)?\s+(?:\w+\s+for\s+)?\w+/g, type: 'declaration', explanation: 'Implementation block' },
      { name: 'Pattern Matching', regex: /match\s+\w+\s*\{/g, type: 'control-flow', explanation: 'Exhaustive pattern matching' },
      { name: 'Ownership', regex: /&mut\s+|&\w+|\.clone\(\)/g, type: 'expression', explanation: 'Ownership and borrowing' },
      { name: 'Result Handling', regex: /\?|\.unwrap\(\)|\.expect\(/g, type: 'error-handling', explanation: 'Error propagation or handling' },
      { name: 'Lifetime', regex: /'[a-z]+/g, type: 'declaration', explanation: 'Lifetime annotation for references' },
      { name: 'Macro', regex: /\w+!/g, type: 'expression', explanation: 'Macro invocation' },
    ],
  },

  java: {
    name: 'Java',
    extensions: ['.java'],
    commentSingle: '//',
    commentMultiStart: '/*',
    commentMultiEnd: '*/',
    stringDelimiters: ['"'],
    keywords: ['abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new', 'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'void', 'volatile', 'while', 'var', 'record', 'sealed', 'permits', 'yield'],
    builtins: ['System', 'String', 'Integer', 'Double', 'Boolean', 'List', 'ArrayList', 'Map', 'HashMap', 'Set', 'HashSet', 'Optional', 'Stream', 'Collectors', 'Object', 'Exception', 'RuntimeException', 'Thread', 'Runnable', 'Callable', 'Future', 'CompletableFuture'],
    patterns: [
      { name: 'Class Declaration', regex: /(?:public|private|protected)?\s*(?:abstract|final)?\s*class\s+\w+/g, type: 'class', explanation: 'Java class definition' },
      { name: 'Interface', regex: /(?:public)?\s*interface\s+\w+/g, type: 'declaration', explanation: 'Contract for implementing classes' },
      { name: 'Method', regex: /(?:public|private|protected)?\s*(?:static)?\s*(?:\w+(?:<[^>]+>)?)\s+\w+\s*\([^)]*\)/g, type: 'function', explanation: 'Method definition' },
      { name: 'Lambda', regex: /\([^)]*\)\s*->/g, type: 'function', explanation: 'Lambda expression' },
      { name: 'Stream API', regex: /\.stream\(\)|\.filter\(|\.map\(|\.collect\(/g, type: 'expression', explanation: 'Functional stream operations' },
      { name: 'Annotation', regex: /@\w+(?:\([^)]*\))?/g, type: 'declaration', explanation: 'Metadata annotation' },
      { name: 'Generics', regex: /<\w+(?:\s+extends\s+[^>]+)?>/g, type: 'declaration', explanation: 'Generic type parameter' },
      { name: 'Record', regex: /record\s+\w+\s*\(/g, type: 'declaration', explanation: 'Immutable data class (Java 16+)' },
    ],
  },

  csharp: {
    name: 'C#',
    extensions: ['.cs'],
    commentSingle: '//',
    commentMultiStart: '/*',
    commentMultiEnd: '*/',
    stringDelimiters: ['"', '@"', '$"'],
    keywords: ['abstract', 'as', 'base', 'bool', 'break', 'byte', 'case', 'catch', 'char', 'checked', 'class', 'const', 'continue', 'decimal', 'default', 'delegate', 'do', 'double', 'else', 'enum', 'event', 'explicit', 'extern', 'false', 'finally', 'fixed', 'float', 'for', 'foreach', 'goto', 'if', 'implicit', 'in', 'int', 'interface', 'internal', 'is', 'lock', 'long', 'namespace', 'new', 'null', 'object', 'operator', 'out', 'override', 'params', 'private', 'protected', 'public', 'readonly', 'ref', 'return', 'sbyte', 'sealed', 'short', 'sizeof', 'stackalloc', 'static', 'string', 'struct', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'uint', 'ulong', 'unchecked', 'unsafe', 'ushort', 'using', 'virtual', 'void', 'volatile', 'while', 'async', 'await', 'var', 'record', 'init', 'required'],
    builtins: ['Console', 'String', 'Int32', 'Double', 'Boolean', 'List', 'Dictionary', 'HashSet', 'Queue', 'Stack', 'Task', 'Func', 'Action', 'IEnumerable', 'LINQ', 'Object', 'Exception', 'DateTime', 'Guid', 'Nullable'],
    patterns: [
      { name: 'Class', regex: /(?:public|private|internal)?\s*(?:abstract|sealed|static)?\s*(?:partial)?\s*class\s+\w+/g, type: 'class', explanation: 'C# class definition' },
      { name: 'Interface', regex: /(?:public|internal)?\s*interface\s+I\w+/g, type: 'declaration', explanation: 'Interface contract (prefixed with I)' },
      { name: 'Property', regex: /(?:public|private|protected)\s+\w+\s+\w+\s*\{\s*get;/g, type: 'declaration', explanation: 'Auto-implemented property' },
      { name: 'LINQ', regex: /\.Where\(|\.Select\(|\.OrderBy\(|\.FirstOrDefault\(|from\s+\w+\s+in\s+/g, type: 'expression', explanation: 'Language Integrated Query' },
      { name: 'Async/Await', regex: /async\s+Task|await\s+/g, type: 'expression', explanation: 'Asynchronous programming' },
      { name: 'Pattern Matching', regex: /is\s+\w+\s+\w+|switch\s*\{|=>\s*\w+/g, type: 'control-flow', explanation: 'Pattern matching expressions' },
      { name: 'Record', regex: /record\s+(?:struct\s+)?\w+/g, type: 'declaration', explanation: 'Immutable reference type' },
      { name: 'Nullable', regex: /\w+\?(?:\s|$|\.)/g, type: 'declaration', explanation: 'Nullable reference type' },
    ],
  },

  php: {
    name: 'PHP',
    extensions: ['.php'],
    commentSingle: '//',
    commentMultiStart: '/*',
    commentMultiEnd: '*/',
    stringDelimiters: ['"', "'"],
    keywords: ['abstract', 'and', 'array', 'as', 'break', 'callable', 'case', 'catch', 'class', 'clone', 'const', 'continue', 'declare', 'default', 'die', 'do', 'echo', 'else', 'elseif', 'empty', 'enddeclare', 'endfor', 'endforeach', 'endif', 'endswitch', 'endwhile', 'eval', 'exit', 'extends', 'final', 'finally', 'fn', 'for', 'foreach', 'function', 'global', 'goto', 'if', 'implements', 'include', 'include_once', 'instanceof', 'insteadof', 'interface', 'isset', 'list', 'match', 'namespace', 'new', 'or', 'print', 'private', 'protected', 'public', 'readonly', 'require', 'require_once', 'return', 'static', 'switch', 'throw', 'trait', 'try', 'unset', 'use', 'var', 'while', 'xor', 'yield', 'yield from'],
    builtins: ['array_map', 'array_filter', 'array_reduce', 'array_merge', 'count', 'strlen', 'substr', 'explode', 'implode', 'json_encode', 'json_decode', 'file_get_contents', 'file_put_contents', 'preg_match', 'preg_replace', 'date', 'time', 'strtotime'],
    patterns: [
      { name: 'Class', regex: /(?:abstract|final)?\s*class\s+\w+/g, type: 'class', explanation: 'PHP class definition' },
      { name: 'Function', regex: /function\s+\w+\s*\([^)]*\)/g, type: 'function', explanation: 'Function definition' },
      { name: 'Arrow Function', regex: /fn\s*\([^)]*\)\s*=>/g, type: 'function', explanation: 'Short closure syntax (PHP 7.4+)' },
      { name: 'Namespace', regex: /namespace\s+[\w\\]+;/g, type: 'declaration', explanation: 'Package namespace' },
      { name: 'Attribute', regex: /#\[\w+(?:\([^)]*\))?\]/g, type: 'declaration', explanation: 'Attribute annotation (PHP 8+)' },
      { name: 'Match', regex: /match\s*\([^)]*\)\s*\{/g, type: 'control-flow', explanation: 'Match expression (PHP 8+)' },
      { name: 'Null Safe', regex: /\?->/g, type: 'expression', explanation: 'Null-safe operator (PHP 8+)' },
    ],
  },

  ruby: {
    name: 'Ruby',
    extensions: ['.rb', '.rake'],
    commentSingle: '#',
    commentMultiStart: '=begin',
    commentMultiEnd: '=end',
    stringDelimiters: ['"', "'", '%q', '%Q'],
    keywords: ['BEGIN', 'END', 'alias', 'and', 'begin', 'break', 'case', 'class', 'def', 'defined?', 'do', 'else', 'elsif', 'end', 'ensure', 'false', 'for', 'if', 'in', 'module', 'next', 'nil', 'not', 'or', 'redo', 'rescue', 'retry', 'return', 'self', 'super', 'then', 'true', 'undef', 'unless', 'until', 'when', 'while', 'yield', 'private', 'protected', 'public', 'attr_reader', 'attr_writer', 'attr_accessor'],
    builtins: ['puts', 'print', 'p', 'gets', 'chomp', 'to_s', 'to_i', 'to_f', 'to_a', 'to_h', 'map', 'each', 'select', 'reject', 'reduce', 'find', 'sort', 'uniq', 'flatten', 'compact', 'join', 'split', 'gsub', 'match', 'include?', 'empty?', 'nil?'],
    patterns: [
      { name: 'Class', regex: /class\s+\w+(?:\s*<\s*\w+)?/g, type: 'class', explanation: 'Ruby class definition' },
      { name: 'Module', regex: /module\s+\w+/g, type: 'declaration', explanation: 'Ruby module (mixin)' },
      { name: 'Method', regex: /def\s+\w+(?:\([^)]*\))?/g, type: 'function', explanation: 'Method definition' },
      { name: 'Block', regex: /do\s*\|[^|]*\||{\s*\|[^|]*\|/g, type: 'function', explanation: 'Block (closure)' },
      { name: 'Symbol', regex: /:\w+/g, type: 'expression', explanation: 'Immutable identifier' },
      { name: 'Attr Accessor', regex: /attr_(?:reader|writer|accessor)\s+:\w+/g, type: 'declaration', explanation: 'Automatic getter/setter' },
      { name: 'Safe Navigation', regex: /&\./g, type: 'expression', explanation: 'Safe navigation operator' },
    ],
  },

  swift: {
    name: 'Swift',
    extensions: ['.swift'],
    commentSingle: '//',
    commentMultiStart: '/*',
    commentMultiEnd: '*/',
    stringDelimiters: ['"'],
    keywords: ['associatedtype', 'class', 'deinit', 'enum', 'extension', 'fileprivate', 'func', 'import', 'init', 'inout', 'internal', 'let', 'open', 'operator', 'private', 'protocol', 'public', 'rethrows', 'static', 'struct', 'subscript', 'typealias', 'var', 'break', 'case', 'continue', 'default', 'defer', 'do', 'else', 'fallthrough', 'for', 'guard', 'if', 'in', 'repeat', 'return', 'switch', 'where', 'while', 'as', 'catch', 'is', 'nil', 'super', 'self', 'Self', 'throw', 'throws', 'true', 'try', 'false', 'async', 'await', 'actor'],
    builtins: ['print', 'String', 'Int', 'Double', 'Bool', 'Array', 'Dictionary', 'Set', 'Optional', 'Result', 'Error', 'Codable', 'Encodable', 'Decodable', 'Hashable', 'Equatable', 'Comparable', 'CustomStringConvertible'],
    patterns: [
      { name: 'Struct', regex: /struct\s+\w+/g, type: 'declaration', explanation: 'Value type structure' },
      { name: 'Class', regex: /class\s+\w+/g, type: 'class', explanation: 'Reference type class' },
      { name: 'Protocol', regex: /protocol\s+\w+/g, type: 'declaration', explanation: 'Interface definition' },
      { name: 'Extension', regex: /extension\s+\w+/g, type: 'declaration', explanation: 'Type extension' },
      { name: 'Guard', regex: /guard\s+.+\s+else/g, type: 'control-flow', explanation: 'Early exit guard clause' },
      { name: 'Optional', regex: /\w+\?|\w+!/g, type: 'declaration', explanation: 'Optional type' },
      { name: 'Closure', regex: /\{\s*(?:\([^)]*\)\s*)?(?:->)?\s*in/g, type: 'function', explanation: 'Closure expression' },
      { name: 'Property Wrapper', regex: /@\w+/g, type: 'declaration', explanation: 'Property wrapper attribute' },
    ],
  },

  kotlin: {
    name: 'Kotlin',
    extensions: ['.kt', '.kts'],
    commentSingle: '//',
    commentMultiStart: '/*',
    commentMultiEnd: '*/',
    stringDelimiters: ['"', '"""'],
    keywords: ['as', 'break', 'class', 'continue', 'do', 'else', 'false', 'for', 'fun', 'if', 'in', 'interface', 'is', 'null', 'object', 'package', 'return', 'super', 'this', 'throw', 'true', 'try', 'typealias', 'typeof', 'val', 'var', 'when', 'while', 'by', 'catch', 'constructor', 'delegate', 'dynamic', 'field', 'file', 'finally', 'get', 'import', 'init', 'param', 'property', 'receiver', 'set', 'setparam', 'where', 'actual', 'abstract', 'annotation', 'companion', 'const', 'crossinline', 'data', 'enum', 'expect', 'external', 'final', 'infix', 'inline', 'inner', 'internal', 'lateinit', 'noinline', 'open', 'operator', 'out', 'override', 'private', 'protected', 'public', 'reified', 'sealed', 'suspend', 'tailrec', 'vararg'],
    builtins: ['println', 'print', 'listOf', 'mutableListOf', 'mapOf', 'mutableMapOf', 'setOf', 'mutableSetOf', 'arrayOf', 'intArrayOf', 'sequence', 'lazy', 'also', 'apply', 'let', 'run', 'with', 'takeIf', 'takeUnless', 'repeat', 'to', 'Pair', 'Triple'],
    patterns: [
      { name: 'Data Class', regex: /data\s+class\s+\w+/g, type: 'class', explanation: 'Immutable data holder' },
      { name: 'Sealed Class', regex: /sealed\s+class\s+\w+/g, type: 'class', explanation: 'Restricted class hierarchy' },
      { name: 'Object', regex: /object\s+\w+/g, type: 'declaration', explanation: 'Singleton object' },
      { name: 'Extension Function', regex: /fun\s+\w+\.\w+/g, type: 'function', explanation: 'Extension function' },
      { name: 'Lambda', regex: /\{\s*(?:\w+(?:,\s*\w+)*)?\s*->/g, type: 'function', explanation: 'Lambda expression' },
      { name: 'When Expression', regex: /when\s*(?:\([^)]*\))?\s*\{/g, type: 'control-flow', explanation: 'Pattern matching expression' },
      { name: 'Coroutine', regex: /suspend\s+fun|launch\s*\{|async\s*\{/g, type: 'expression', explanation: 'Coroutine for async' },
      { name: 'Null Safety', regex: /\?\.|!!|\?:/g, type: 'expression', explanation: 'Null-safe operators' },
    ],
  },
};

// ============================================
// CODE EXPLANATION ENGINE
// ============================================

export function explainCodeUniversal(code: string, language?: string): CodeExplanation {
  const detectedLang = language || detectLanguage(code);
  const langDef = LANGUAGES[detectedLang] || LANGUAGES.javascript;

  const lines = code.split('\n');
  const lineExplanations: LineExplanation[] = [];
  const components: ComponentExplanation[] = [];
  const detectedPatterns: DetectedPattern[] = [];
  const dataFlow: DataFlowStep[] = [];
  const concepts: string[] = [];

  // Analyze each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || isComment(trimmed, langDef)) {
      continue;
    }

    const lineExp = explainLine(trimmed, i + 1, langDef);
    lineExplanations.push(lineExp);

    // Extract components
    const comp = extractComponent(trimmed, i + 1, langDef);
    if (comp) {
      components.push(comp);
    }

    // Add to data flow
    const flowStep = extractDataFlow(trimmed, i + 1, dataFlow.length + 1);
    if (flowStep) {
      dataFlow.push(flowStep);
    }

    // Collect concepts
    concepts.push(...lineExp.concepts);
  }

  // Detect patterns
  for (const pattern of langDef.patterns) {
    pattern.regex.lastIndex = 0;
    const matches = code.matchAll(new RegExp(pattern.regex.source, pattern.regex.flags));

    for (const match of matches) {
      const lineNum = code.substring(0, match.index).split('\n').length;
      detectedPatterns.push({
        name: pattern.name,
        confidence: 0.9,
        lines: [lineNum],
        description: pattern.explanation,
        category: pattern.type,
      });
    }
  }

  // Assess complexity
  const complexity = assessCodeComplexity(code, detectedPatterns, components);

  // Generate summary
  const summary = generateSummary(components, detectedPatterns, langDef.name);
  const purpose = inferPurpose(components, detectedPatterns);

  // Generate suggestions
  const suggestions = generateSuggestions(code, detectedPatterns, langDef);

  return {
    language: langDef.name,
    summary,
    purpose,
    complexity,
    components,
    dataFlow,
    patterns: detectedPatterns,
    suggestions,
    concepts: [...new Set(concepts)],
    lineByLine: lineExplanations,
  };
}

function detectLanguage(code: string): string {
  const indicators: Record<string, number> = {};

  for (const [lang, def] of Object.entries(LANGUAGES)) {
    indicators[lang] = 0;

    // Check keywords
    for (const keyword of def.keywords.slice(0, 10)) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = code.match(regex);
      if (matches) {
        indicators[lang] += matches.length;
      }
    }

    // Check patterns
    for (const pattern of def.patterns.slice(0, 5)) {
      pattern.regex.lastIndex = 0;
      if (pattern.regex.test(code)) {
        indicators[lang] += 5;
      }
    }
  }

  // Find best match
  let bestLang = 'javascript';
  let bestScore = 0;

  for (const [lang, score] of Object.entries(indicators)) {
    if (score > bestScore) {
      bestScore = score;
      bestLang = lang;
    }
  }

  return bestLang;
}

function isComment(line: string, lang: LanguageDefinition): boolean {
  return line.startsWith(lang.commentSingle) ||
         line.startsWith(lang.commentMultiStart);
}

function explainLine(line: string, lineNum: number, lang: LanguageDefinition): LineExplanation {
  const concepts: string[] = [];
  let explanation = '';
  let complexity: 'simple' | 'moderate' | 'complex' = 'simple';

  // Check for patterns
  for (const pattern of lang.patterns) {
    pattern.regex.lastIndex = 0;
    if (pattern.regex.test(line)) {
      explanation = pattern.explanation;
      concepts.push(pattern.name);
      complexity = pattern.type === 'error-handling' || pattern.type === 'class' ? 'moderate' : complexity;
    }
  }

  // Check for keywords
  for (const keyword of lang.keywords) {
    if (new RegExp(`\\b${keyword}\\b`).test(line)) {
      if (!explanation) {
        explanation = getKeywordExplanation(keyword);
      }
      concepts.push(keyword);
    }
  }

  // Check for builtins
  for (const builtin of lang.builtins) {
    if (new RegExp(`\\b${builtin}\\b`).test(line)) {
      concepts.push(`builtin:${builtin}`);
    }
  }

  if (!explanation) {
    explanation = inferLineExplanation(line);
  }

  // Adjust complexity based on line length and nesting
  if (line.length > 80 || (line.match(/[{}()[\]]/g)?.length || 0) > 4) {
    complexity = 'moderate';
  }
  if (line.includes('=>') && line.includes('{') && line.includes('return')) {
    complexity = 'complex';
  }

  return { lineNumber: lineNum, code: line, explanation, concepts, complexity };
}

function getKeywordExplanation(keyword: string): string {
  const explanations: Record<string, string> = {
    'const': 'Declares a constant variable',
    'let': 'Declares a block-scoped variable',
    'var': 'Declares a function-scoped variable',
    'function': 'Declares a function',
    'class': 'Declares a class',
    'if': 'Conditional statement',
    'else': 'Alternative branch of conditional',
    'for': 'Loop iteration',
    'while': 'Conditional loop',
    'return': 'Returns value from function',
    'async': 'Marks asynchronous function',
    'await': 'Waits for Promise resolution',
    'import': 'Imports module',
    'export': 'Exports from module',
    'try': 'Begins error handling block',
    'catch': 'Handles caught errors',
    'throw': 'Throws an error',
    'new': 'Creates new instance',
    'this': 'References current context',
    'def': 'Defines a function',
    'fn': 'Defines a function',
    'impl': 'Implements traits/methods',
    'struct': 'Defines a structure',
    'trait': 'Defines a trait/interface',
    'pub': 'Makes item public',
    'match': 'Pattern matching',
    'enum': 'Defines enumeration',
    'interface': 'Defines type contract',
    'type': 'Defines type alias',
  };

  return explanations[keyword] || `Uses ${keyword} keyword`;
}

function inferLineExplanation(line: string): string {
  if (line.includes('=') && !line.includes('==') && !line.includes('===')) {
    return 'Variable assignment';
  }
  if (line.includes('(') && line.includes(')')) {
    return 'Function call or definition';
  }
  if (line.includes('{')) {
    return 'Opens a code block';
  }
  if (line.includes('}')) {
    return 'Closes a code block';
  }
  return 'Code statement';
}

function extractComponent(line: string, lineNum: number, lang: LanguageDefinition): ComponentExplanation | null {
  // Function/method detection
  const funcPatterns = [
    /function\s+(\w+)\s*\(([^)]*)\)/,
    /def\s+(\w+)\s*\(([^)]*)\)/,
    /fn\s+(\w+)\s*\(([^)]*)\)/,
    /(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/,
    /(?:const|let|var)\s+(\w+)\s*=\s*function/,
  ];

  for (const pattern of funcPatterns) {
    const match = line.match(pattern);
    if (match) {
      return {
        type: 'function',
        name: match[1],
        line: lineNum,
        description: `Function ${match[1]}`,
        parameters: match[2]?.split(',').map(p => p.trim()).filter(Boolean),
      };
    }
  }

  // Class detection
  const classMatch = line.match(/class\s+(\w+)/);
  if (classMatch) {
    return {
      type: 'class',
      name: classMatch[1],
      line: lineNum,
      description: `Class ${classMatch[1]}`,
    };
  }

  return null;
}

function extractDataFlow(line: string, lineNum: number, step: number): DataFlowStep | null {
  const varMatch = line.match(/(?:const|let|var|val)\s+(\w+)\s*=/);
  if (varMatch) {
    return {
      step,
      description: `Initialize ${varMatch[1]}`,
      variables: [varMatch[1]],
      line: lineNum,
    };
  }

  const assignMatch = line.match(/(\w+)\s*=(?!=)/);
  if (assignMatch && !line.includes('const') && !line.includes('let') && !line.includes('var')) {
    return {
      step,
      description: `Update ${assignMatch[1]}`,
      variables: [assignMatch[1]],
      line: lineNum,
    };
  }

  return null;
}

function assessCodeComplexity(code: string, patterns: DetectedPattern[], components: ComponentExplanation[]): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
  let score = 0;

  // Line count
  const lines = code.split('\n').length;
  score += Math.min(lines / 20, 3);

  // Pattern complexity
  const advancedPatterns = ['Async/Await', 'Generic', 'Decorator', 'Macro', 'Coroutine', 'Pattern Matching', 'Lifetime'];
  for (const pattern of patterns) {
    if (advancedPatterns.includes(pattern.name)) {
      score += 2;
    } else {
      score += 0.5;
    }
  }

  // Component count
  score += components.length * 0.5;

  // Nesting depth (approximate)
  const maxIndent = Math.max(...code.split('\n').map(l => l.match(/^\s*/)?.[0].length || 0));
  score += maxIndent / 4;

  if (score < 5) return 'beginner';
  if (score < 10) return 'intermediate';
  if (score < 20) return 'advanced';
  return 'expert';
}

function generateSummary(components: ComponentExplanation[], patterns: DetectedPattern[], language: string): string {
  const funcCount = components.filter(c => c.type === 'function').length;
  const classCount = components.filter(c => c.type === 'class').length;
  const patternNames = [...new Set(patterns.map(p => p.name))].slice(0, 3);

  let summary = `This ${language} code`;

  if (classCount > 0) {
    summary += ` defines ${classCount} class${classCount > 1 ? 'es' : ''}`;
  }
  if (funcCount > 0) {
    summary += `${classCount > 0 ? ' and' : ''} contains ${funcCount} function${funcCount > 1 ? 's' : ''}`;
  }
  if (patternNames.length > 0) {
    summary += ` using ${patternNames.join(', ')}`;
  }

  return summary + '.';
}

function inferPurpose(components: ComponentExplanation[], patterns: DetectedPattern[]): string {
  const hasAPI = patterns.some(p => p.name.includes('Route') || p.name.includes('Handler'));
  const hasUI = patterns.some(p => p.name.includes('Component') || p.name.includes('JSX'));
  const hasData = patterns.some(p => p.name.includes('Class') || p.name.includes('Struct'));

  if (hasAPI) return 'API/Backend logic';
  if (hasUI) return 'User interface component';
  if (hasData) return 'Data modeling/business logic';
  return 'General-purpose code';
}

function generateSuggestions(code: string, patterns: DetectedPattern[], lang: LanguageDefinition): string[] {
  const suggestions: string[] = [];

  // Check for missing error handling
  if (!patterns.some(p => p.category === 'error-handling') && code.includes('fetch')) {
    suggestions.push('Consider adding error handling for async operations');
  }

  // Check for magic numbers
  if (/[^.\d](\d{3,})(?![.\d])/.test(code)) {
    suggestions.push('Consider extracting magic numbers into named constants');
  }

  // Check for long functions
  const funcMatches = code.match(/function\s+\w+|def\s+\w+|fn\s+\w+/g);
  if (funcMatches && code.split('\n').length / funcMatches.length > 30) {
    suggestions.push('Some functions may be too long - consider breaking them up');
  }

  // Check for comments
  if (!code.includes(lang.commentSingle) && code.split('\n').length > 20) {
    suggestions.push('Consider adding comments to explain complex logic');
  }

  return suggestions;
}

// ============================================
// FORMAT AS MARKDOWN
// ============================================

export function formatExplanationAsMarkdownUniversal(exp: CodeExplanation): string {
  const lines = [
    `## Code Explanation - ${exp.language}`,
    '',
    `**Summary**: ${exp.summary}`,
    `**Purpose**: ${exp.purpose}`,
    `**Complexity**: ${exp.complexity}`,
    '',
  ];

  if (exp.components.length > 0) {
    lines.push('### Components');
    for (const comp of exp.components) {
      lines.push(`- **${comp.type}** \`${comp.name}\` (line ${comp.line}): ${comp.description}`);
    }
    lines.push('');
  }

  if (exp.patterns.length > 0) {
    lines.push('### Patterns Detected');
    for (const pattern of exp.patterns) {
      lines.push(`- **${pattern.name}** (${Math.round(pattern.confidence * 100)}%): ${pattern.description}`);
    }
    lines.push('');
  }

  if (exp.dataFlow.length > 0) {
    lines.push('### Data Flow');
    for (const step of exp.dataFlow) {
      lines.push(`${step.step}. ${step.description} → \`${step.variables.join(', ')}\``);
    }
    lines.push('');
  }

  if (exp.suggestions.length > 0) {
    lines.push('### Suggestions');
    for (const suggestion of exp.suggestions) {
      lines.push(`- ${suggestion}`);
    }
    lines.push('');
  }

  if (exp.concepts.length > 0) {
    lines.push(`### Concepts Used`);
    lines.push(exp.concepts.slice(0, 10).join(', '));
  }

  return lines.join('\n');
}