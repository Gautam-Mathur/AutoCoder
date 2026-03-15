// Debug Module - Comprehensive error detection, learning, and fix suggestions
// Catches syntax, runtime, logic, security, performance, accessibility, and hidden bugs

export interface CodeError {
  type: 'syntax' | 'runtime' | 'logic' | 'style' | 'security' | 'performance' | 'accessibility' | 'compatibility' | 'hidden';
  severity: 'error' | 'warning' | 'info';
  language: string;
  line?: number;
  column?: number;
  message: string;
  code: string;
  suggestion?: string;
  confidence: number;
  category?: string;
}

export interface DebugFix {
  errorPattern: string;
  fixPattern: string;
  language: string;
  description: string;
  successCount: number;
}

export interface CodeChange {
  before: string;
  after: string;
  timestamp: number;
  wasError: boolean;
  userFixed: boolean;
}

// Runtime error patterns and their fixes
const runtimeErrorPatterns: Record<string, { pattern: RegExp; fix: string; description: string }[]> = {
  python: [
    { pattern: /IndentationError/, fix: 'Check indentation - Python requires consistent spaces/tabs', description: 'Indentation error' },
    { pattern: /SyntaxError: invalid syntax/, fix: 'Check for missing colons, parentheses, or quotes', description: 'Syntax error' },
    { pattern: /NameError: name '(\w+)' is not defined/, fix: 'Variable "$1" not defined - check spelling or import it', description: 'Undefined variable' },
    { pattern: /TypeError: .* takes (\d+) .* but (\d+)/, fix: 'Wrong number of arguments passed to function', description: 'Argument count mismatch' },
    { pattern: /ImportError: No module named '(\w+)'/, fix: 'Install module with: pip install $1', description: 'Missing module' },
    { pattern: /ModuleNotFoundError/, fix: 'Module not installed - check requirements.txt', description: 'Missing module' },
    { pattern: /KeyError: '(\w+)'/, fix: 'Key "$1" not found - use .get() or check existence first', description: 'Missing dictionary key' },
    { pattern: /AttributeError: .* has no attribute '(\w+)'/, fix: 'Object doesn\'t have attribute "$1" - check type or spelling', description: 'Missing attribute' },
    { pattern: /ZeroDivisionError/, fix: 'Division by zero - add check: if divisor != 0', description: 'Division by zero' },
    { pattern: /FileNotFoundError/, fix: 'File path incorrect or file doesn\'t exist', description: 'File not found' },
    { pattern: /JSONDecodeError/, fix: 'Invalid JSON format - validate structure', description: 'JSON parse error' },
    { pattern: /ValueError: invalid literal/, fix: 'String cannot be converted to number - validate input', description: 'Value conversion error' },
    { pattern: /RecursionError/, fix: 'Infinite recursion - add base case to recursive function', description: 'Stack overflow' },
    { pattern: /MemoryError/, fix: 'Out of memory - process data in chunks', description: 'Memory exhausted' },
    { pattern: /TimeoutError/, fix: 'Operation timed out - check network or add retry logic', description: 'Timeout' },
    { pattern: /ConnectionError/, fix: 'Network connection failed - check URL and connectivity', description: 'Connection error' },
    { pattern: /PermissionError/, fix: 'Permission denied - check file/directory permissions', description: 'Permission denied' },
    { pattern: /UnicodeDecodeError/, fix: 'Encoding issue - specify encoding: open(file, encoding="utf-8")', description: 'Encoding error' }
  ],
  javascript: [
    { pattern: /Unexpected token/, fix: 'Check for missing brackets, commas, or semicolons', description: 'Unexpected token' },
    { pattern: /(\w+) is not defined/, fix: 'Variable "$1" not defined - declare it or check imports', description: 'Undefined reference' },
    { pattern: /Cannot read propert.* of (undefined|null)/, fix: 'Add null check: obj?.property or if (obj)', description: 'Null reference' },
    { pattern: /Cannot set propert.* of (undefined|null)/, fix: 'Object is null/undefined before assignment', description: 'Null assignment' },
    { pattern: /is not a function/, fix: 'Value is not callable - check variable type', description: 'Not a function' },
    { pattern: /is not iterable/, fix: 'Cannot iterate - value is not an array or iterable', description: 'Not iterable' },
    { pattern: /Unexpected end of input/, fix: 'Missing closing bracket or parenthesis', description: 'Unclosed block' },
    { pattern: /Unexpected end of JSON/, fix: 'Invalid JSON - response may not be JSON', description: 'JSON parse error' },
    { pattern: /Missing .* after/, fix: 'Syntax error - check punctuation', description: 'Missing punctuation' },
    { pattern: /Failed to fetch/, fix: 'Network request failed - check URL/CORS/server', description: 'Network error' },
    { pattern: /NetworkError/, fix: 'Network unavailable - add offline handling', description: 'Network error' },
    { pattern: /CORS/, fix: 'Cross-origin blocked - configure CORS on server', description: 'CORS error' },
    { pattern: /Maximum call stack/, fix: 'Infinite recursion - add base case', description: 'Stack overflow' },
    { pattern: /SyntaxError: .* JSON/, fix: 'Response is not valid JSON', description: 'JSON error' },
    { pattern: /out of memory/, fix: 'Memory exhausted - reduce data size or process in chunks', description: 'Memory error' },
    { pattern: /Script error/, fix: 'Error in external script - check CORS for scripts', description: 'Cross-origin script error' },
    { pattern: /ResizeObserver loop/, fix: 'Infinite resize loop - debounce resize handler', description: 'Resize loop' },
    { pattern: /AbortError/, fix: 'Request was aborted - handle cancellation', description: 'Request aborted' },
    { pattern: /QuotaExceededError/, fix: 'Storage full - clear old data or use less storage', description: 'Storage quota exceeded' },
    { pattern: /SecurityError/, fix: 'Security policy violation - check same-origin policy', description: 'Security error' },
    { pattern: /NotAllowedError/, fix: 'Permission denied - request permission from user first', description: 'Permission denied' },
    { pattern: /TypeError: Failed to construct/, fix: 'Invalid constructor arguments - check API documentation', description: 'Constructor error' }
  ],
  html: [
    { pattern: /Unclosed tag/, fix: 'Missing closing tag - ensure all tags are closed', description: 'Unclosed tag' },
    { pattern: /duplicate id/, fix: 'IDs must be unique - use class instead', description: 'Duplicate ID' },
    { pattern: /Element .* not allowed/, fix: 'Invalid element nesting - check HTML structure', description: 'Invalid nesting' }
  ],
  css: [
    { pattern: /Unknown property/, fix: 'CSS property doesn\'t exist - check spelling', description: 'Unknown property' },
    { pattern: /Expected .*\}/, fix: 'Missing closing brace', description: 'Unclosed rule' },
    { pattern: /Invalid value/, fix: 'CSS value is incorrect for this property', description: 'Invalid value' }
  ]
};

// Comprehensive code analysis patterns
interface AnalysisPattern {
  pattern: RegExp;
  languages: string[];
  type: CodeError['type'];
  severity: CodeError['severity'];
  message: string;
  suggestion: string;
  category: string;
}

const analysisPatterns: AnalysisPattern[] = [
  // ==================== SECURITY ====================
  // XSS Vulnerabilities
  { pattern: /\.innerHTML\s*=(?!=)/, languages: ['javascript', 'html'], type: 'security', severity: 'error',
    message: 'Potential XSS: innerHTML assignment', suggestion: 'Use textContent or sanitize HTML with DOMPurify', category: 'XSS' },
  { pattern: /\.outerHTML\s*=/, languages: ['javascript'], type: 'security', severity: 'error',
    message: 'Potential XSS: outerHTML assignment', suggestion: 'Avoid direct HTML manipulation', category: 'XSS' },
  { pattern: /\.insertAdjacentHTML\s*\(/, languages: ['javascript'], type: 'security', severity: 'warning',
    message: 'Potential XSS: insertAdjacentHTML', suggestion: 'Sanitize HTML input before insertion', category: 'XSS' },
  { pattern: /document\.write\s*\(/, languages: ['javascript', 'html'], type: 'security', severity: 'error',
    message: 'document.write is dangerous and deprecated', suggestion: 'Use DOM methods instead', category: 'XSS' },
  { pattern: /\$\(\s*['"`].*\+.*['"`]\s*\)/, languages: ['javascript'], type: 'security', severity: 'error',
    message: 'jQuery selector with dynamic content - XSS risk', suggestion: 'Validate input before using in selector', category: 'XSS' },

  // Code Injection
  { pattern: /eval\s*\(/, languages: ['javascript', 'python'], type: 'security', severity: 'error',
    message: 'eval() is a security risk', suggestion: 'Avoid eval - use JSON.parse or safer alternatives', category: 'Injection' },
  { pattern: /new Function\s*\(/, languages: ['javascript'], type: 'security', severity: 'error',
    message: 'new Function() is similar to eval()', suggestion: 'Avoid dynamic code execution', category: 'Injection' },
  { pattern: /setTimeout\s*\(\s*["'`]/, languages: ['javascript'], type: 'security', severity: 'warning',
    message: 'setTimeout with string is like eval', suggestion: 'Pass a function instead of string', category: 'Injection' },
  { pattern: /setInterval\s*\(\s*["'`]/, languages: ['javascript'], type: 'security', severity: 'warning',
    message: 'setInterval with string is like eval', suggestion: 'Pass a function instead of string', category: 'Injection' },
  { pattern: /exec\s*\(/, languages: ['python'], type: 'security', severity: 'error',
    message: 'exec() executes arbitrary code', suggestion: 'Avoid exec - find a safer approach', category: 'Injection' },
  { pattern: /subprocess\..*shell\s*=\s*True/, languages: ['python'], type: 'security', severity: 'error',
    message: 'Shell injection vulnerability', suggestion: 'Use shell=False and pass args as list', category: 'Injection' },
  { pattern: /os\.system\s*\(/, languages: ['python'], type: 'security', severity: 'warning',
    message: 'os.system can be vulnerable to injection', suggestion: 'Use subprocess with shell=False', category: 'Injection' },

  // SQL Injection
  { pattern: /f["'].*SELECT.*\{/, languages: ['python'], type: 'security', severity: 'error',
    message: 'SQL injection risk in f-string', suggestion: 'Use parameterized queries', category: 'SQL Injection' },
  { pattern: /f["'].*INSERT.*\{/, languages: ['python'], type: 'security', severity: 'error',
    message: 'SQL injection risk', suggestion: 'Use parameterized queries', category: 'SQL Injection' },
  { pattern: /f["'].*UPDATE.*\{/, languages: ['python'], type: 'security', severity: 'error',
    message: 'SQL injection risk', suggestion: 'Use parameterized queries', category: 'SQL Injection' },
  { pattern: /f["'].*DELETE.*\{/, languages: ['python'], type: 'security', severity: 'error',
    message: 'SQL injection risk', suggestion: 'Use parameterized queries', category: 'SQL Injection' },
  { pattern: /["'`].*\+.*SELECT|SELECT.*\+.*["'`]/, languages: ['javascript'], type: 'security', severity: 'error',
    message: 'SQL injection risk with string concatenation', suggestion: 'Use parameterized queries', category: 'SQL Injection' },
  { pattern: /\$\{.*\}.*SELECT|SELECT.*\$\{/, languages: ['javascript'], type: 'security', severity: 'error',
    message: 'SQL injection in template literal', suggestion: 'Use parameterized queries', category: 'SQL Injection' },
  { pattern: /\.format\s*\(.*\).*SELECT|SELECT.*\.format\s*\(/, languages: ['python'], type: 'security', severity: 'error',
    message: 'SQL injection with .format()', suggestion: 'Use parameterized queries', category: 'SQL Injection' },
  { pattern: /%s.*SELECT|SELECT.*%s/, languages: ['python'], type: 'security', severity: 'warning',
    message: 'Potential SQL injection with % formatting', suggestion: 'Verify parameterized query usage', category: 'SQL Injection' },

  // Hardcoded Secrets
  { pattern: /password\s*[:=]\s*["'][^"']{3,}["']/, languages: ['javascript', 'python', 'html'], type: 'security', severity: 'error',
    message: 'Hardcoded password detected', suggestion: 'Use environment variables', category: 'Secrets' },
  { pattern: /api[_-]?key\s*[:=]\s*["'][^"']{10,}["']/i, languages: ['javascript', 'python'], type: 'security', severity: 'error',
    message: 'Hardcoded API key detected', suggestion: 'Use environment variables', category: 'Secrets' },
  { pattern: /secret\s*[:=]\s*["'][^"']{5,}["']/i, languages: ['javascript', 'python'], type: 'security', severity: 'error',
    message: 'Hardcoded secret detected', suggestion: 'Use environment variables', category: 'Secrets' },
  { pattern: /token\s*[:=]\s*["'][A-Za-z0-9_-]{20,}["']/, languages: ['javascript', 'python'], type: 'security', severity: 'error',
    message: 'Hardcoded token detected', suggestion: 'Use environment variables', category: 'Secrets' },
  { pattern: /private[_-]?key\s*[:=]\s*["']/, languages: ['javascript', 'python'], type: 'security', severity: 'error',
    message: 'Hardcoded private key', suggestion: 'Never commit private keys', category: 'Secrets' },
  { pattern: /-----BEGIN.*PRIVATE KEY-----/, languages: ['javascript', 'python', 'html'], type: 'security', severity: 'error',
    message: 'Private key in code', suggestion: 'Store keys securely, never in code', category: 'Secrets' },
  { pattern: /aws[_-]?(access|secret)[_-]?key\s*[:=]\s*["']/i, languages: ['javascript', 'python'], type: 'security', severity: 'error',
    message: 'AWS credentials in code', suggestion: 'Use AWS credential provider chain', category: 'Secrets' },

  // Path Traversal
  { pattern: /open\s*\([^)]*\+[^)]*\)/, languages: ['python'], type: 'security', severity: 'warning',
    message: 'Potential path traversal', suggestion: 'Validate and sanitize file paths', category: 'Path Traversal' },
  { pattern: /fs\.(read|write).*\+/, languages: ['javascript'], type: 'security', severity: 'warning',
    message: 'Potential path traversal', suggestion: 'Validate file paths with path.resolve', category: 'Path Traversal' },
  { pattern: /\.\.\//, languages: ['javascript', 'python', 'html'], type: 'security', severity: 'info',
    message: 'Relative path with parent directory', suggestion: 'Ensure path traversal is intended', category: 'Path Traversal' },

  // Prototype Pollution
  { pattern: /\[.*\]\s*=.*\[.*\]/, languages: ['javascript'], type: 'security', severity: 'info',
    message: 'Dynamic property access pattern', suggestion: 'Validate keys to prevent __proto__ pollution', category: 'Prototype Pollution' },
  { pattern: /Object\.assign\s*\(.*,.*\)/, languages: ['javascript'], type: 'security', severity: 'info',
    message: 'Object.assign can be prototype pollution vector', suggestion: 'Validate source objects', category: 'Prototype Pollution' },

  // ==================== PERFORMANCE ====================
  // Memory Leaks
  { pattern: /addEventListener\s*\([^)]+\)(?![\s\S]*removeEventListener)/, languages: ['javascript'], type: 'performance', severity: 'warning',
    message: 'Event listener without cleanup', suggestion: 'Remove listener in cleanup/unmount', category: 'Memory Leak' },
  { pattern: /setInterval\s*\([^)]+\)(?![\s\S]*clearInterval)/, languages: ['javascript'], type: 'performance', severity: 'warning',
    message: 'setInterval without clearInterval', suggestion: 'Clear interval when done', category: 'Memory Leak' },
  { pattern: /setTimeout\s*\([^)]+\)(?![\s\S]*clearTimeout)/, languages: ['javascript'], type: 'performance', severity: 'info',
    message: 'setTimeout without clearTimeout', suggestion: 'Clear timeout on cleanup if component unmounts', category: 'Memory Leak' },
  { pattern: /new\s+WebSocket\s*\(/, languages: ['javascript'], type: 'performance', severity: 'info',
    message: 'WebSocket connection', suggestion: 'Ensure socket is closed on cleanup', category: 'Memory Leak' },
  { pattern: /new\s+MutationObserver/, languages: ['javascript'], type: 'performance', severity: 'info',
    message: 'MutationObserver without disconnect', suggestion: 'Call observer.disconnect() on cleanup', category: 'Memory Leak' },

  // Inefficient Patterns
  { pattern: /for\s*\([^)]+\)\s*\{[^}]*document\.(getElementById|querySelector)/, languages: ['javascript'], type: 'performance', severity: 'warning',
    message: 'DOM query inside loop', suggestion: 'Move DOM query outside loop', category: 'Performance' },
  { pattern: /for\s*\([^)]+\)\s*\{[^}]*\.innerHTML\s*\+=/, languages: ['javascript'], type: 'performance', severity: 'error',
    message: 'innerHTML concatenation in loop', suggestion: 'Build string first, then assign once', category: 'Performance' },
  { pattern: /document\.querySelectorAll\([^)]+\)\.forEach/, languages: ['javascript'], type: 'performance', severity: 'info',
    message: 'querySelectorAll creates static NodeList', suggestion: 'Consider caching result if used multiple times', category: 'Performance' },
  { pattern: /JSON\.parse\s*\(\s*JSON\.stringify/, languages: ['javascript'], type: 'performance', severity: 'warning',
    message: 'JSON clone is slow', suggestion: 'Use structuredClone() or spread operator for shallow clone', category: 'Performance' },
  { pattern: /new Array\s*\(\s*\d{6,}/, languages: ['javascript'], type: 'performance', severity: 'warning',
    message: 'Very large array allocation', suggestion: 'Consider lazy initialization or streaming', category: 'Performance' },
  { pattern: /\.style\.\w+\s*=.*\n.*\.style\.\w+\s*=/, languages: ['javascript'], type: 'performance', severity: 'info',
    message: 'Multiple style assignments cause reflows', suggestion: 'Use classList or cssText for multiple styles', category: 'Performance' },

  // Async Issues
  { pattern: /async\s+function[^{]*\{(?![\s\S]*await)/, languages: ['javascript'], type: 'performance', severity: 'info',
    message: 'Async function without await', suggestion: 'Remove async if not using await', category: 'Async' },
  { pattern: /await\s+Promise\.all\s*\(\s*\[[\s\S]*await/, languages: ['javascript'], type: 'performance', severity: 'warning',
    message: 'Await inside Promise.all', suggestion: 'Promises in array should not have await', category: 'Async' },
  { pattern: /for\s*\([^)]*\)\s*\{[\s\S]*await/, languages: ['javascript'], type: 'performance', severity: 'warning',
    message: 'Sequential awaits in loop', suggestion: 'Use Promise.all for parallel execution', category: 'Async' },

  // ==================== LOGIC ERRORS ====================
  // Comparison Issues
  { pattern: /if\s*\(\s*\w+\s*=\s*[^=]/, languages: ['javascript', 'python'], type: 'logic', severity: 'error',
    message: 'Assignment in condition (= instead of ==)', suggestion: 'Use == or === for comparison', category: 'Logic Error' },
  { pattern: /==\s*NaN/, languages: ['javascript'], type: 'logic', severity: 'error',
    message: 'NaN comparison always fails', suggestion: 'Use Number.isNaN() or isNaN()', category: 'Logic Error' },
  { pattern: /typeof\s+\w+\s*===?\s*["']undefined["']/, languages: ['javascript'], type: 'logic', severity: 'info',
    message: 'typeof undefined check', suggestion: 'Consider optional chaining (?.) instead', category: 'Logic Error' },
  { pattern: /\.length\s*[=!]==?\s*0/, languages: ['javascript'], type: 'logic', severity: 'info',
    message: 'Length comparison', suggestion: 'Truthy check: if (arr.length) is simpler', category: 'Logic Error' },

  // Type Coercion Issues
  { pattern: /==(?!=)/, languages: ['javascript'], type: 'logic', severity: 'warning',
    message: 'Loose equality can cause type coercion bugs', suggestion: 'Use === for strict equality', category: 'Type Coercion' },
  { pattern: /!=(?!=)/, languages: ['javascript'], type: 'logic', severity: 'warning',
    message: 'Loose inequality can cause bugs', suggestion: 'Use !== for strict inequality', category: 'Type Coercion' },
  { pattern: /\+\s*["']|["']\s*\+/, languages: ['javascript'], type: 'logic', severity: 'info',
    message: 'String concatenation with +', suggestion: 'Consider template literals for clarity', category: 'Type Coercion' },

  // Dead Code / Unreachable
  { pattern: /return\s+[^;]+;[\s\n]+[^\s}]/, languages: ['javascript'], type: 'logic', severity: 'warning',
    message: 'Code after return statement', suggestion: 'Remove unreachable code', category: 'Dead Code' },
  { pattern: /while\s*\(\s*false\s*\)/, languages: ['javascript', 'python'], type: 'logic', severity: 'warning',
    message: 'while(false) never executes', suggestion: 'Remove dead code', category: 'Dead Code' },
  { pattern: /if\s*\(\s*false\s*\)/, languages: ['javascript'], type: 'logic', severity: 'warning',
    message: 'if(false) never executes', suggestion: 'Remove dead code', category: 'Dead Code' },

  // Infinite Loop Risk
  { pattern: /while\s*\(\s*true\s*\)\s*\{(?![\s\S]*(break|return))/, languages: ['javascript', 'python'], type: 'logic', severity: 'error',
    message: 'Infinite loop - no break or return', suggestion: 'Add exit condition', category: 'Infinite Loop' },
  { pattern: /for\s*\(\s*;\s*;\s*\)\s*\{(?![\s\S]*(break|return))/, languages: ['javascript'], type: 'logic', severity: 'error',
    message: 'Infinite for loop', suggestion: 'Add exit condition', category: 'Infinite Loop' },

  // ==================== ADDITIONAL LOGIC ERRORS ====================
  // Missing await on async operations
  { pattern: /(?<!await\s+)fetch\s*\([^)]+\)(?!\s*\.then)/, languages: ['javascript'], type: 'logic', severity: 'error',
    message: 'fetch() without await or .then()', suggestion: 'Add await before fetch() or handle with .then()', category: 'Async Error' },
  { pattern: /const\s+\w+\s*=\s*(?<!await\s*)async\s+/, languages: ['javascript'], type: 'logic', severity: 'warning',
    message: 'Async function assigned without await', suggestion: 'Call the async function with await', category: 'Async Error' },

  // Array mutation issues
  { pattern: /\.sort\s*\(\s*\)(?!\s*;?\s*\/\/)/, languages: ['javascript'], type: 'logic', severity: 'warning',
    message: '.sort() mutates the original array', suggestion: 'Use [...arr].sort() to avoid mutation', category: 'Array Mutation' },
  { pattern: /\.reverse\s*\(\s*\)/, languages: ['javascript'], type: 'logic', severity: 'warning',
    message: '.reverse() mutates the original array', suggestion: 'Use [...arr].reverse() to avoid mutation', category: 'Array Mutation' },
  { pattern: /\.splice\s*\(/, languages: ['javascript'], type: 'logic', severity: 'info',
    message: '.splice() mutates the original array', suggestion: 'Consider .slice() or .filter() for immutable operations', category: 'Array Mutation' },

  // Empty blocks and missing handlers
  { pattern: /catch\s*\([^)]*\)\s*\{\s*\}/, languages: ['javascript'], type: 'logic', severity: 'error',
    message: 'Empty catch block silently swallows errors', suggestion: 'Log the error or rethrow it', category: 'Error Handling' },
  { pattern: /\.catch\s*\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/, languages: ['javascript'], type: 'logic', severity: 'error',
    message: 'Empty .catch() handler', suggestion: 'Handle the error properly', category: 'Error Handling' },
  { pattern: /if\s*\([^)]+\)\s*\{\s*\}\s*else/, languages: ['javascript'], type: 'logic', severity: 'warning',
    message: 'Empty if block with else', suggestion: 'Invert the condition or add code to if block', category: 'Logic Error' },

  // Off-by-one and boundary errors
  { pattern: /for\s*\([^;]+;\s*\w+\s*<=\s*\w+\.length\s*;/, languages: ['javascript'], type: 'logic', severity: 'error',
    message: 'Off-by-one error: <= length causes out of bounds', suggestion: 'Use < length instead of <= length', category: 'Logic Error' },
  { pattern: /\[\s*\w+\.length\s*\]/, languages: ['javascript'], type: 'logic', severity: 'error',
    message: 'Accessing arr[arr.length] is always undefined', suggestion: 'Use arr[arr.length - 1] for last element', category: 'Logic Error' },

  // Incorrect boolean logic
  { pattern: /!\s*\w+\s*&&\s*!\s*\w+/, languages: ['javascript'], type: 'logic', severity: 'info',
    message: 'Double negative AND - consider De Morgan\'s law', suggestion: 'Simplify: !a && !b can be !(a || b)', category: 'Logic Error' },
  { pattern: /\|\|\s*\w+\s*&&/, languages: ['javascript'], type: 'logic', severity: 'warning',
    message: '|| and && without parentheses - precedence issue', suggestion: 'Add parentheses to clarify precedence', category: 'Logic Error' },

  // State update issues (React)
  { pattern: /set\w+\s*\(\s*\w+\s*\+\s*1\s*\)/, languages: ['javascript'], type: 'logic', severity: 'warning',
    message: 'State update based on stale value', suggestion: 'Use functional update: setCount(prev => prev + 1)', category: 'React Bug' },
  { pattern: /set\w+\s*\(\s*\[\s*\.\.\.\w+\s*,/, languages: ['javascript'], type: 'logic', severity: 'info',
    message: 'Spreading state in setter', suggestion: 'Consider functional update: setState(prev => [...prev, item])', category: 'React Bug' },

  // Comparison issues
  { pattern: /===?\s*\[\s*\]/, languages: ['javascript'], type: 'logic', severity: 'error',
    message: 'Comparing to [] always fails (different reference)', suggestion: 'Use arr.length === 0 to check empty array', category: 'Logic Error' },
  { pattern: /===?\s*\{\s*\}/, languages: ['javascript'], type: 'logic', severity: 'error',
    message: 'Comparing to {} always fails (different reference)', suggestion: 'Use Object.keys(obj).length === 0 for empty object', category: 'Logic Error' },

  // String issues
  { pattern: /\.includes\s*\(\s*\)/, languages: ['javascript'], type: 'logic', severity: 'error',
    message: '.includes() called without argument', suggestion: 'Pass a value to search for', category: 'Logic Error' },
  { pattern: /\.indexOf\s*\([^)]+\)\s*>\s*0/, languages: ['javascript'], type: 'logic', severity: 'error',
    message: '.indexOf() > 0 misses first element', suggestion: 'Use >= 0 or !== -1 to check existence', category: 'Logic Error' },

  // Division and math
  { pattern: /\/\s*0(?!\.)/, languages: ['javascript'], type: 'logic', severity: 'error',
    message: 'Division by zero', suggestion: 'Add check: divisor !== 0', category: 'Math Error' },
  { pattern: /Math\.random\s*\(\s*\)\s*\*\s*(\d+)/, languages: ['javascript'], type: 'logic', severity: 'info',
    message: 'Math.random() returns 0 to 0.999...', suggestion: 'Use Math.floor(Math.random() * n) for integers', category: 'Math Error' },

  // Date issues
  { pattern: /new\s+Date\s*\(\s*\d{4}\s*,\s*\d+/, languages: ['javascript'], type: 'logic', severity: 'warning',
    message: 'Date months are 0-indexed', suggestion: 'Month 1 = February, use month-1 for correct month', category: 'Date Bug' },

  // Object/Array confusion
  { pattern: /Object\.keys\s*\([^)]+\)\.length\s*===?\s*0\s*\|\|\s*\w+\.length/, languages: ['javascript'], type: 'logic', severity: 'warning',
    message: 'Mixing object and array length checks', suggestion: 'Ensure consistent data type handling', category: 'Type Confusion' },

  // Return value ignored
  { pattern: /\w+\.filter\s*\([^)]+\)\s*;(?!\s*(?:const|let|var|return|\w+\s*=))/, languages: ['javascript'], type: 'logic', severity: 'warning',
    message: '.filter() return value not used', suggestion: 'filter() returns new array - assign or return it', category: 'Logic Error' },
  { pattern: /\w+\.map\s*\([^)]+\)\s*;(?!\s*(?:const|let|var|return|\w+\s*=))/, languages: ['javascript'], type: 'logic', severity: 'warning',
    message: '.map() return value not used', suggestion: 'map() returns new array - use forEach() for side effects', category: 'Logic Error' },

  // ==================== HIDDEN BUGS ====================
  // Closure Issues
  { pattern: /for\s*\(\s*var\s+\w+.*\)\s*\{[\s\S]*setTimeout|for\s*\(\s*var\s+\w+.*\)\s*\{[\s\S]*addEventListener/, languages: ['javascript'], type: 'hidden', severity: 'error',
    message: 'Closure bug: var in loop with async callback', suggestion: 'Use let instead of var, or use IIFE', category: 'Closure' },
  { pattern: /\.map\s*\(\s*async/, languages: ['javascript'], type: 'hidden', severity: 'warning',
    message: 'Async map returns Promise array, not values', suggestion: 'Use await Promise.all(arr.map(async ...))', category: 'Async Gotcha' },
  { pattern: /\.forEach\s*\(\s*async/, languages: ['javascript'], type: 'hidden', severity: 'error',
    message: 'forEach with async doesn\'t wait', suggestion: 'Use for...of with await, or Promise.all with map', category: 'Async Gotcha' },

  // Object Reference Issues
  { pattern: /JSON\.parse\s*\(\s*localStorage/, languages: ['javascript'], type: 'hidden', severity: 'warning',
    message: 'localStorage.getItem can return null', suggestion: 'Handle null: JSON.parse(localStorage.getItem(x) || "{}")', category: 'Null Safety' },

  // Race Conditions
  { pattern: /if\s*\([^)]*\.length[^)]*\)[\s\S]{0,50}\.pop\(\)|if\s*\([^)]*\.length[^)]*\)[\s\S]{0,50}\.shift\(\)/, languages: ['javascript'], type: 'hidden', severity: 'warning',
    message: 'TOCTOU race: length check then modify', suggestion: 'Use atomic operations or mutex', category: 'Race Condition' },
  { pattern: /fetch\([^)]+\)[\s\S]*fetch\([^)]+\)(?![\s\S]*Promise\.all)/, languages: ['javascript'], type: 'hidden', severity: 'info',
    message: 'Multiple sequential fetches', suggestion: 'Consider Promise.all for parallel requests', category: 'Race Condition' },

  // Floating Point
  { pattern: /\d+\.\d+\s*[+\-*/]\s*\d+\.\d+\s*===?/, languages: ['javascript'], type: 'hidden', severity: 'warning',
    message: 'Floating point comparison is unreliable', suggestion: 'Use tolerance: Math.abs(a - b) < 0.0001', category: 'Floating Point' },

  // ==================== ACCESSIBILITY ====================
  { pattern: /<img(?![^>]*alt\s*=)/, languages: ['html'], type: 'accessibility', severity: 'error',
    message: 'Image missing alt attribute', suggestion: 'Add alt="" for decorative, alt="description" for meaningful', category: 'A11y' },
  { pattern: /<input(?![^>]*(?:aria-label|id[^>]*<label|aria-labelledby))/, languages: ['html'], type: 'accessibility', severity: 'warning',
    message: 'Input may lack accessible label', suggestion: 'Add <label>, aria-label, or aria-labelledby', category: 'A11y' },
  { pattern: /<button[^>]*>\s*<\/button>/, languages: ['html'], type: 'accessibility', severity: 'error',
    message: 'Empty button has no accessible name', suggestion: 'Add text or aria-label', category: 'A11y' },
  { pattern: /onclick\s*=\s*["'][^"']+["'](?![^>]*role=)/, languages: ['html'], type: 'accessibility', severity: 'warning',
    message: 'Click handler on non-interactive element', suggestion: 'Use <button> or add role="button" and tabindex', category: 'A11y' },
  { pattern: /<a[^>]*href\s*=\s*["']#["'][^>]*>/, languages: ['html'], type: 'accessibility', severity: 'info',
    message: 'Link with href="#"', suggestion: 'Use <button> for actions, real URL for navigation', category: 'A11y' },
  { pattern: /<div[^>]*onclick/, languages: ['html'], type: 'accessibility', severity: 'warning',
    message: 'Clickable div is not keyboard accessible', suggestion: 'Use <button> or add role, tabindex, keydown handler', category: 'A11y' },
  { pattern: /<table(?![^>]*role)(?![\s\S]*<th)/, languages: ['html'], type: 'accessibility', severity: 'warning',
    message: 'Table without headers', suggestion: 'Add <th> elements for data tables, or role="presentation" for layout', category: 'A11y' },
  { pattern: /tabindex\s*=\s*["'][2-9]|tabindex\s*=\s*["']\d{2,}/, languages: ['html'], type: 'accessibility', severity: 'warning',
    message: 'tabindex > 1 disrupts natural tab order', suggestion: 'Use tabindex="0" or "-1" only', category: 'A11y' },
  { pattern: /autofocus/, languages: ['html'], type: 'accessibility', severity: 'info',
    message: 'autofocus can be disorienting for screen reader users', suggestion: 'Use sparingly, consider focus management', category: 'A11y' },

  // ==================== COMPATIBILITY ====================
  { pattern: /\?\.\[/, languages: ['javascript'], type: 'compatibility', severity: 'info',
    message: 'Optional chaining needs modern browser', suggestion: 'Check browser support or use babel', category: 'Browser Support' },
  { pattern: /\?\?/, languages: ['javascript'], type: 'compatibility', severity: 'info',
    message: 'Nullish coalescing needs modern browser', suggestion: 'Use || if supporting older browsers', category: 'Browser Support' },
  { pattern: /replaceAll\s*\(/, languages: ['javascript'], type: 'compatibility', severity: 'info',
    message: 'replaceAll not in older browsers', suggestion: 'Use replace with /g flag: str.replace(/x/g, "y")', category: 'Browser Support' },
  { pattern: /\.flat\s*\(|\.flatMap\s*\(/, languages: ['javascript'], type: 'compatibility', severity: 'info',
    message: 'Array flat/flatMap not in IE', suggestion: 'Check browser requirements', category: 'Browser Support' },
  { pattern: /Object\.fromEntries/, languages: ['javascript'], type: 'compatibility', severity: 'info',
    message: 'Object.fromEntries needs modern browser', suggestion: 'Use reduce for older browser support', category: 'Browser Support' },
  { pattern: /\basync\s+\w+\s*=>/, languages: ['javascript'], type: 'compatibility', severity: 'info',
    message: 'Async arrow functions need transpilation for older browsers', suggestion: 'Ensure build process handles this', category: 'Browser Support' },

  // ==================== STYLE / BEST PRACTICES ====================
  { pattern: /var\s+\w+/, languages: ['javascript'], type: 'style', severity: 'info',
    message: 'var is function-scoped', suggestion: 'Use const or let for block scoping', category: 'Best Practice' },
  { pattern: /console\.log(?!.*\/\/\s*(debug|TODO|FIXME))/i, languages: ['javascript'], type: 'style', severity: 'info',
    message: 'Console.log in code', suggestion: 'Remove before production', category: 'Best Practice' },
  { pattern: /debugger\s*;/, languages: ['javascript'], type: 'style', severity: 'warning',
    message: 'Debugger statement in code', suggestion: 'Remove before production', category: 'Best Practice' },
  { pattern: /TODO|FIXME|HACK|XXX/, languages: ['javascript', 'python', 'html', 'css'], type: 'style', severity: 'info',
    message: 'TODO/FIXME comment found', suggestion: 'Address or track in issue tracker', category: 'Technical Debt' },
  { pattern: /except:\s*$|except:\s*\n\s*pass/, languages: ['python'], type: 'style', severity: 'warning',
    message: 'Bare except catches everything', suggestion: 'Catch specific exceptions', category: 'Best Practice' },
  { pattern: /==\s*True|==\s*False|is\s+True|is\s+False/, languages: ['python'], type: 'style', severity: 'info',
    message: 'Explicit boolean comparison', suggestion: 'Use: if x or if not x', category: 'Best Practice' },
  { pattern: /from\s+\w+\s+import\s+\*/, languages: ['python'], type: 'style', severity: 'warning',
    message: 'Star import pollutes namespace', suggestion: 'Import specific names', category: 'Best Practice' },
  { pattern: /print\s*\(.*\).*#.*debug/i, languages: ['python'], type: 'style', severity: 'info',
    message: 'Debug print statement', suggestion: 'Use logging module or remove', category: 'Best Practice' },

  // React-specific
  { pattern: /dangerouslySetInnerHTML/, languages: ['javascript'], type: 'security', severity: 'warning',
    message: 'dangerouslySetInnerHTML is XSS-risky', suggestion: 'Sanitize content with DOMPurify', category: 'React Security' },
  { pattern: /setState\s*\(\s*\{[\s\S]*this\.state/, languages: ['javascript'], type: 'hidden', severity: 'error',
    message: 'Reading this.state in setState - stale data', suggestion: 'Use functional update: setState(prev => ...)', category: 'React Bug' },
  { pattern: /useEffect\s*\(\s*async/, languages: ['javascript'], type: 'logic', severity: 'error',
    message: 'useEffect callback cannot be async directly', suggestion: 'Define async function inside and call it', category: 'React Bug' },
  { pattern: /\.map\s*\([^)]*\)\s*(?![\s\S]{0,100}key\s*=)/, languages: ['javascript'], type: 'hidden', severity: 'warning',
    message: 'React list items may need key prop', suggestion: 'Add unique key prop to mapped elements', category: 'React Performance' },
];

// Debug Engine class
class DebugEngine {
  private fixes: DebugFix[] = [];
  private changes: CodeChange[] = [];
  private storageKey = 'codeai_debug_memory';

  constructor() {
    this.loadMemory();
  }

  private loadMemory(): void {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        this.fixes = data.fixes || [];
        this.changes = data.changes?.slice(-100) || [];
      }
    } catch (e) {
      console.log('Debug module: Starting fresh');
    }
  }

  private saveMemory(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        fixes: this.fixes.slice(-50),
        changes: this.changes.slice(-100)
      }));
    } catch (e) {
      this.changes = this.changes.slice(-50);
      this.fixes = this.fixes.slice(-25);
    }
  }

  detectLanguage(code: string): string {
    const lowerCode = code.toLowerCase();
    if (code.includes('<!DOCTYPE') || code.includes('<html') || (code.includes('<') && code.includes('>'))) return 'html';
    if ((code.includes('def ') && code.includes(':')) || code.includes('import ') && code.includes('from ')) return 'python';
    if (code.includes('function ') || code.includes('=>') || code.includes('const ') || code.includes('let ')) return 'javascript';
    if (code.includes('{') && code.includes(':') && code.includes(';') && !code.includes('function')) return 'css';
    if (lowerCode.includes('select ') || lowerCode.includes('insert ') || lowerCode.includes('create table')) return 'sql';
    return 'javascript'; // Default
  }

  analyzeCode(code: string, consoleOutput?: string): CodeError[] {
    const errors: CodeError[] = [];
    const language = this.detectLanguage(code);

    // Syntax analysis
    errors.push(...this.checkSyntax(code, language));

    // Pattern-based analysis
    errors.push(...this.runPatternAnalysis(code, language));

    // Parse console/runtime errors
    if (consoleOutput) {
      errors.push(...this.parseRuntimeErrors(consoleOutput, language));
    }

    // HTML-specific checks
    if (language === 'html') {
      errors.push(...this.analyzeHTML(code));
    }

    // Deduplicate
    return this.deduplicateErrors(errors);
  }

  private deduplicateErrors(errors: CodeError[]): CodeError[] {
    const seen = new Set<string>();
    return errors.filter(err => {
      const key = `${err.type}-${err.message}-${err.line || 0}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private checkSyntax(code: string, language: string): CodeError[] {
    const errors: CodeError[] = [];
    const lines = code.split('\n');

    if (language === 'python') {
      errors.push(...this.checkPythonSyntax(code, lines));
    }

    if (language === 'javascript' || language === 'html') {
      errors.push(...this.checkJavaScriptSyntax(code, lines));
    }

    if (language === 'html') {
      errors.push(...this.checkHTMLSyntax(code, lines));
    }

    if (language === 'css') {
      errors.push(...this.checkCSSSyntax(code, lines));
    }

    return errors;
  }

  private checkPythonSyntax(code: string, lines: string[]): CodeError[] {
    const errors: CodeError[] = [];

    // Check for unclosed strings (handling triple quotes)
    let inTripleDouble = false;
    let inTripleSingle = false;
    let inSingleDouble = false;
    let inSingleSingle = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('#')) continue;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        const prev = line[j - 1] || '';
        const next2 = line.substring(j, j + 3);

        if (!inSingleDouble && !inSingleSingle && !inTripleSingle && !inTripleDouble) {
          if (next2 === '"""') { inTripleDouble = true; j += 2; continue; }
          if (next2 === "'''") { inTripleSingle = true; j += 2; continue; }
          if (char === '"' && prev !== '\\') { inSingleDouble = true; continue; }
          if (char === "'" && prev !== '\\') { inSingleSingle = true; continue; }
        } else {
          if (inTripleDouble && next2 === '"""') { inTripleDouble = false; j += 2; continue; }
          if (inTripleSingle && next2 === "'''") { inTripleSingle = false; j += 2; continue; }
          if (inSingleDouble && char === '"' && prev !== '\\') { inSingleDouble = false; continue; }
          if (inSingleSingle && char === "'" && prev !== '\\') { inSingleSingle = false; continue; }
        }
      }
    }

    if (inSingleDouble || inSingleSingle) {
      errors.push({
        type: 'syntax', severity: 'error', language: 'python',
        message: 'Unclosed string literal',
        code, suggestion: 'Check for missing closing quote', confidence: 0.9
      });
    }

    // Check for missing colons
    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (/^(if|elif|else|for|while|def|class|try|except|finally|with|async def)\s/.test(trimmed) || trimmed === 'else' || trimmed === 'try' || trimmed === 'finally') {
        if (!trimmed.endsWith(':') && !trimmed.includes('#')) {
          errors.push({
            type: 'syntax', severity: 'error', language: 'python',
            line: i + 1,
            message: `Missing colon after "${trimmed.split(/\s/)[0]}"`,
            code: line,
            suggestion: `Add ":" at the end: ${trimmed}:`,
            confidence: 0.95
          });
        }
      }
    });

    // Check for inconsistent indentation
    let prevIndent = 0;
    lines.forEach((line, i) => {
      if (line.trim() === '' || line.trim().startsWith('#')) return;
      const indent = line.match(/^(\s*)/)?.[1].length || 0;
      const usesTabs = line.match(/^\t/);
      const usesSpaces = line.match(/^ /);

      if (usesTabs && usesSpaces) {
        errors.push({
          type: 'syntax', severity: 'error', language: 'python',
          line: i + 1,
          message: 'Mixed tabs and spaces',
          code: line,
          suggestion: 'Use consistent indentation (spaces recommended)',
          confidence: 0.95
        });
      }
    });

    return errors;
  }

  private checkJavaScriptSyntax(code: string, lines: string[]): CodeError[] {
    const errors: CodeError[] = [];

    // Advanced bracket matching
    const brackets: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
    const closeBrackets: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
    const stack: { char: string; line: number }[] = [];
    let inString = false;
    let stringChar = '';
    let inComment = false;
    let inMultiComment = false;
    let inRegex = false;
    let lineNum = 1;

    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const nextChar = code[i + 1] || '';
      const prevChar = code[i - 1] || '';

      if (char === '\n') lineNum++;

      // Handle comments
      if (!inString && !inRegex && char === '/' && nextChar === '/') {
        inComment = true;
        continue;
      }
      if (inComment && char === '\n') {
        inComment = false;
        continue;
      }
      if (!inString && !inRegex && char === '/' && nextChar === '*') {
        inMultiComment = true;
        i++;
        continue;
      }
      if (inMultiComment && char === '*' && nextChar === '/') {
        inMultiComment = false;
        i++;
        continue;
      }
      if (inComment || inMultiComment) continue;

      // Handle strings
      if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
        if (!inString && !inRegex) {
          inString = true;
          stringChar = char;
        } else if (inString && char === stringChar) {
          inString = false;
        }
      }
      if (inString) continue;

      // Handle regex (simplified)
      if (char === '/' && !inRegex && prevChar !== '*' && prevChar !== '/') {
        const beforeSlash = code.substring(Math.max(0, i - 20), i).trim();
        if (/[=(:,\[{!&|;]$/.test(beforeSlash) || beforeSlash === '' || beforeSlash.endsWith('return')) {
          inRegex = true;
          continue;
        }
      }
      if (inRegex && char === '/' && prevChar !== '\\') {
        inRegex = false;
        continue;
      }
      if (inRegex) continue;

      // Track brackets
      if (brackets[char]) {
        stack.push({ char, line: lineNum });
      } else if (closeBrackets[char]) {
        const expected = stack.pop();
        if (!expected || closeBrackets[char] !== expected.char) {
          errors.push({
            type: 'syntax', severity: 'error', language: 'javascript',
            line: lineNum,
            message: `Mismatched bracket: '${char}'`,
            code: lines[lineNum - 1] || char,
            suggestion: expected
              ? `The '${expected.char}' on line ${expected.line} needs '${brackets[expected.char]}'`
              : `Unexpected closing bracket '${char}'`,
            confidence: 0.9
          });
          break;
        }
      }
    }

    if (stack.length > 0 && errors.length === 0) {
      const unclosed = stack[stack.length - 1];
      errors.push({
        type: 'syntax', severity: 'error', language: 'javascript',
        line: unclosed.line,
        message: `Unclosed '${unclosed.char}'`,
        code: lines[unclosed.line - 1] || unclosed.char,
        suggestion: `Add closing '${brackets[unclosed.char]}'`,
        confidence: 0.95
      });
    }

    if (inString && errors.length === 0) {
      errors.push({
        type: 'syntax', severity: 'error', language: 'javascript',
        message: 'Unclosed string literal',
        code, suggestion: `Missing closing ${stringChar} quote`, confidence: 0.9
      });
    }

    return errors;
  }

  private checkHTMLSyntax(code: string, lines: string[]): CodeError[] {
    const errors: CodeError[] = [];

    // Check for unclosed tags
    const voidElements = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
    const tagStack: { tag: string; line: number }[] = [];

    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*\/?>/g;
    let match;
    let lineNum = 1;
    let lastIndex = 0;

    while ((match = tagRegex.exec(code)) !== null) {
      // Count newlines to track line number
      const segment = code.substring(lastIndex, match.index);
      lineNum += (segment.match(/\n/g) || []).length;
      lastIndex = match.index;

      const fullTag = match[0];
      const tagName = match[1].toLowerCase();

      if (fullTag.startsWith('</')) {
        // Closing tag
        const lastOpen = tagStack.pop();
        if (!lastOpen) {
          errors.push({
            type: 'syntax', severity: 'error', language: 'html',
            line: lineNum,
            message: `Unexpected closing tag </${tagName}>`,
            code: fullTag,
            suggestion: 'Remove this tag or add matching opening tag',
            confidence: 0.9
          });
        } else if (lastOpen.tag !== tagName) {
          errors.push({
            type: 'syntax', severity: 'error', language: 'html',
            line: lineNum,
            message: `Mismatched tags: <${lastOpen.tag}> closed with </${tagName}>`,
            code: fullTag,
            suggestion: `Expected </${lastOpen.tag}>`,
            confidence: 0.95
          });
          tagStack.push(lastOpen); // Put back for further analysis
        }
      } else if (!fullTag.endsWith('/>') && !voidElements.has(tagName)) {
        // Opening tag (not self-closing)
        tagStack.push({ tag: tagName, line: lineNum });
      }
    }

    // Report unclosed tags
    for (const unclosed of tagStack) {
      errors.push({
        type: 'syntax', severity: 'error', language: 'html',
        line: unclosed.line,
        message: `Unclosed <${unclosed.tag}> tag`,
        code: `<${unclosed.tag}>`,
        suggestion: `Add </${unclosed.tag}> closing tag`,
        confidence: 0.9
      });
    }

    // Check for duplicate IDs
    const idRegex = /\bid\s*=\s*["']([^"']+)["']/gi;
    const ids = new Map<string, number>();
    lineNum = 1;
    lastIndex = 0;

    while ((match = idRegex.exec(code)) !== null) {
      const segment = code.substring(lastIndex, match.index);
      lineNum += (segment.match(/\n/g) || []).length;
      lastIndex = match.index;

      const id = match[1];
      if (ids.has(id)) {
        errors.push({
          type: 'logic', severity: 'error', language: 'html',
          line: lineNum,
          message: `Duplicate ID "${id}" (first on line ${ids.get(id)})`,
          code: match[0],
          suggestion: 'IDs must be unique - use class for multiple elements',
          confidence: 1.0
        });
      } else {
        ids.set(id, lineNum);
      }
    }

    return errors;
  }

  private checkCSSSyntax(code: string, lines: string[]): CodeError[] {
    const errors: CodeError[] = [];

    // Check for unclosed braces
    let braceCount = 0;
    let inComment = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (let j = 0; j < line.length; j++) {
        if (line[j] === '/' && line[j + 1] === '*') inComment = true;
        if (line[j] === '*' && line[j + 1] === '/') inComment = false;
        if (inComment) continue;

        if (line[j] === '{') braceCount++;
        if (line[j] === '}') braceCount--;

        if (braceCount < 0) {
          errors.push({
            type: 'syntax', severity: 'error', language: 'css',
            line: i + 1,
            message: 'Unexpected closing brace',
            code: line,
            suggestion: 'Remove extra } or add opening {',
            confidence: 0.9
          });
          braceCount = 0;
        }
      }
    }

    if (braceCount > 0) {
      errors.push({
        type: 'syntax', severity: 'error', language: 'css',
        message: `Missing ${braceCount} closing brace(s)`,
        code, suggestion: 'Add closing }', confidence: 0.9
      });
    }

    // Check for invalid property values
    const propValueRegex = /([a-z-]+)\s*:\s*([^;{}]+);/gi;
    let match;

    while ((match = propValueRegex.exec(code)) !== null) {
      const prop = match[1].toLowerCase();
      const value = match[2].trim();

      // Check for common mistakes
      if (value === '' || value === ';') {
        errors.push({
          type: 'syntax', severity: 'error', language: 'css',
          message: `Empty value for ${prop}`,
          code: match[0],
          suggestion: 'Provide a value for this property',
          confidence: 0.9
        });
      }

      // Check for px on unitless properties
      const unitless = ['z-index', 'opacity', 'font-weight', 'line-height', 'flex-grow', 'flex-shrink', 'order'];
      if (unitless.includes(prop) && /\d+px/.test(value)) {
        errors.push({
          type: 'style', severity: 'warning', language: 'css',
          message: `${prop} typically doesn't use px`,
          code: match[0],
          suggestion: 'Remove px unit',
          confidence: 0.8
        });
      }
    }

    return errors;
  }

  private analyzeHTML(code: string): CodeError[] {
    const errors: CodeError[] = [];

    // Check for missing doctype
    if (!code.trim().toLowerCase().startsWith('<!doctype')) {
      errors.push({
        type: 'compatibility', severity: 'warning', language: 'html',
        message: 'Missing <!DOCTYPE html>',
        code: code.substring(0, 50),
        suggestion: 'Add <!DOCTYPE html> at the start',
        confidence: 0.9
      });
    }

    // Check for missing lang attribute
    if (/<html(?![^>]*lang\s*=)/i.test(code)) {
      errors.push({
        type: 'accessibility', severity: 'warning', language: 'html',
        message: 'Missing lang attribute on <html>',
        code: '<html>',
        suggestion: 'Add lang="en" or appropriate language code',
        confidence: 0.9,
        category: 'A11y'
      });
    }

    // Check for missing viewport meta
    if (code.includes('<head') && !code.includes('viewport')) {
      errors.push({
        type: 'compatibility', severity: 'warning', language: 'html',
        message: 'Missing viewport meta tag',
        code: '<head>',
        suggestion: 'Add: <meta name="viewport" content="width=device-width, initial-scale=1">',
        confidence: 0.85,
        category: 'Mobile'
      });
    }

    // Check for deprecated tags
    const deprecated = ['center', 'font', 'marquee', 'blink', 'frame', 'frameset'];
    for (const tag of deprecated) {
      if (new RegExp(`<${tag}[\\s>]`, 'i').test(code)) {
        errors.push({
          type: 'compatibility', severity: 'warning', language: 'html',
          message: `Deprecated <${tag}> tag`,
          code: `<${tag}>`,
          suggestion: 'Use CSS instead',
          confidence: 1.0,
          category: 'Deprecated'
        });
      }
    }

    // Check for inline styles (many of them)
    const inlineStyleCount = (code.match(/style\s*=\s*["'][^"']+["']/g) || []).length;
    if (inlineStyleCount > 10) {
      errors.push({
        type: 'style', severity: 'info', language: 'html',
        message: `Found ${inlineStyleCount} inline styles`,
        code: 'style="..."',
        suggestion: 'Consider moving styles to CSS file/stylesheet',
        confidence: 0.8,
        category: 'Maintainability'
      });
    }

    // Check for inline event handlers
    const eventHandlers = ['onclick', 'onmouseover', 'onload', 'onerror', 'onsubmit', 'onchange'];
    for (const handler of eventHandlers) {
      if (code.includes(`${handler}="`)) {
        errors.push({
          type: 'style', severity: 'info', language: 'html',
          message: `Inline ${handler} handler`,
          code: `${handler}="..."`,
          suggestion: 'Use addEventListener for better separation of concerns',
          confidence: 0.7,
          category: 'Best Practice'
        });
        break; // Only report once
      }
    }

    return errors;
  }

  private runPatternAnalysis(code: string, language: string): CodeError[] {
    const errors: CodeError[] = [];

    for (const pattern of analysisPatterns) {
      if (!pattern.languages.includes(language)) continue;

      const matches = code.match(pattern.pattern);
      if (matches) {
        // Find line number
        let line: number | undefined;
        const idx = code.indexOf(matches[0]);
        if (idx >= 0) {
          line = code.substring(0, idx).split('\n').length;
        }

        errors.push({
          type: pattern.type,
          severity: pattern.severity,
          language,
          line,
          message: pattern.message,
          code: matches[0].substring(0, 100),
          suggestion: pattern.suggestion,
          confidence: 0.85,
          category: pattern.category
        });
      }
    }

    return errors;
  }

  private parseRuntimeErrors(output: string, language: string): CodeError[] {
    const errors: CodeError[] = [];
    const patterns = runtimeErrorPatterns[language] || runtimeErrorPatterns.javascript;

    for (const { pattern, fix, description } of patterns) {
      const match = output.match(pattern);
      if (match) {
        let suggestion = fix;
        match.forEach((m, i) => {
          if (i > 0) suggestion = suggestion.replace(`$${i}`, m);
        });

        // Extract line number if present
        const lineMatch = output.match(/line\s*(\d+)/i) || output.match(/:(\d+):/);

        errors.push({
          type: 'runtime',
          severity: 'error',
          language,
          line: lineMatch ? parseInt(lineMatch[1]) : undefined,
          message: description,
          code: match[0].substring(0, 100),
          suggestion,
          confidence: 0.85
        });
      }
    }

    return errors;
  }

  suggestFix(error: CodeError): string[] {
    const suggestions: string[] = [];

    if (error.suggestion) {
      suggestions.push(error.suggestion);
    }

    const learnedFix = this.fixes.find(f =>
      f.language === error.language &&
      error.message.includes(f.errorPattern)
    );

    if (learnedFix && learnedFix.successCount > 2) {
      suggestions.unshift(`[Learned] ${learnedFix.description}`);
    }

    return suggestions;
  }

  recordChange(before: string, after: string, wasError: boolean): void {
    this.changes.push({
      before,
      after,
      timestamp: Date.now(),
      wasError,
      userFixed: wasError && before !== after
    });

    if (wasError && before !== after) {
      this.learnFromFix(before, after);
    }

    this.saveMemory();
  }

  private learnFromFix(errorCode: string, fixedCode: string): void {
    const language = this.detectLanguage(fixedCode);
    const beforeLines = errorCode.split('\n');
    const afterLines = fixedCode.split('\n');

    for (let i = 0; i < Math.min(beforeLines.length, afterLines.length); i++) {
      if (beforeLines[i] !== afterLines[i]) {
        const existingFix = this.fixes.find(f =>
          f.errorPattern === beforeLines[i].trim() &&
          f.fixPattern === afterLines[i].trim()
        );

        if (existingFix) {
          existingFix.successCount++;
        } else {
          this.fixes.push({
            errorPattern: beforeLines[i].trim(),
            fixPattern: afterLines[i].trim(),
            language,
            description: `"${beforeLines[i].trim().substring(0, 20)}..." → "${afterLines[i].trim().substring(0, 20)}..."`,
            successCount: 1
          });
        }
        break;
      }
    }
  }

  generateDebugResponse(code: string, consoleOutput?: string): string {
    const errors = this.analyzeCode(code, consoleOutput);

    if (errors.length === 0) {
      return "✅ **No issues detected!** Your code looks good.";
    }

    // Group by type
    const grouped = new Map<string, CodeError[]>();
    for (const error of errors) {
      const key = error.type;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(error);
    }

    const icons: Record<string, string> = {
      syntax: '🔴 SYNTAX',
      runtime: '🟠 RUNTIME',
      logic: '🟡 LOGIC',
      security: '🔒 SECURITY',
      performance: '⚡ PERFORMANCE',
      accessibility: '♿ A11Y',
      compatibility: '🌐 COMPAT',
      hidden: '👻 HIDDEN',
      style: '🔵 STYLE'
    };

    let response = `🔍 **Debug Analysis** - Found ${errors.length} issue${errors.length > 1 ? 's' : ''}:\n\n`;

    for (const [type, typeErrors] of Array.from(grouped)) {
      response += `### ${icons[type] || type.toUpperCase()}\n`;

      for (const error of typeErrors.slice(0, 5)) { // Limit per type
        response += `- **${error.message}**`;
        if (error.line) response += ` (line ${error.line})`;
        response += '\n';
        if (error.suggestion) {
          response += `  💡 ${error.suggestion}\n`;
        }
      }

      if (typeErrors.length > 5) {
        response += `  _...and ${typeErrors.length - 5} more_\n`;
      }
      response += '\n';
    }

    const learnedFixes = this.fixes.filter(f => f.successCount > 2);
    if (learnedFixes.length > 0) {
      response += `\n📚 **${learnedFixes.length} patterns learned from your fixes!**`;
    }

    return response;
  }

  getStats(): { errorsFound: number; fixesLearned: number; changesObserved: number } {
    return {
      errorsFound: this.changes.filter(c => c.wasError).length,
      fixesLearned: this.fixes.filter(f => f.successCount > 2).length,
      changesObserved: this.changes.length
    };
  }

  reset(): void {
    this.fixes = [];
    this.changes = [];
    this.saveMemory();
  }
}

// Singleton
let debugEngine: DebugEngine | null = null;

export function getDebugEngine(): DebugEngine {
  if (!debugEngine) {
    debugEngine = new DebugEngine();
  }
  return debugEngine;
}

export function debugCode(code: string, consoleOutput?: string): string {
  return getDebugEngine().generateDebugResponse(code, consoleOutput);
}

export function checkErrors(code: string): CodeError[] {
  return getDebugEngine().analyzeCode(code);
}

export function recordCodeChange(before: string, after: string, hadError: boolean): void {
  getDebugEngine().recordChange(before, after, hadError);
}

export function getDebugStats() {
  return getDebugEngine().getStats();
}