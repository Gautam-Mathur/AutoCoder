// Security Module - Comprehensive whitebox security analysis with 35+ checks

interface SecurityIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'xss' | 'injection' | 'auth' | 'config' | 'dependency' | 'exposure' | 'validation' | 'crypto' | 'prototype';
  title: string;
  description: string;
  location?: string;
  recommendation: string;
  cweId?: string;
}

interface SecurityCheck {
  id: string;
  name: string;
  category: string;
  status: 'passed' | 'failed' | 'warning' | 'info';
  detail?: string;
  cweId?: string;
}

interface SecurityScanResult {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: SecurityIssue[];
  passedChecks: string[];
  checks: SecurityCheck[];
  totalChecks: number;
  timestamp: Date;
}

interface VulnerabilityPattern {
  pattern: RegExp;
  severity: SecurityIssue['severity'];
  category: SecurityIssue['category'];
  title: string;
  description: string;
  recommendation: string;
  cweId: string;
  fileFilter?: (path: string) => boolean;
}

const VULNERABILITY_PATTERNS: Record<string, VulnerabilityPattern> = {
  xss_innerHTML: {
    pattern: /innerHTML\s*=/gi,
    severity: 'high',
    category: 'xss',
    title: 'innerHTML assignment detected',
    description: 'Direct innerHTML assignment can lead to XSS attacks',
    recommendation: 'Use textContent or sanitize with DOMPurify',
    cweId: 'CWE-79',
  },
  xss_documentWrite: {
    pattern: /document\.write\s*\(/gi,
    severity: 'high',
    category: 'xss',
    title: 'document.write() usage',
    description: 'document.write() can inject unescaped content',
    recommendation: 'Use DOM manipulation methods instead',
    cweId: 'CWE-79',
  },
  xss_dangerouslySetInnerHTML: {
    pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:/gi,
    severity: 'medium',
    category: 'xss',
    title: 'React dangerouslySetInnerHTML usage',
    description: 'dangerouslySetInnerHTML bypasses React XSS protection',
    recommendation: 'Sanitize HTML with DOMPurify before using dangerouslySetInnerHTML',
    cweId: 'CWE-79',
  },
  xss_outerHTML: {
    pattern: /outerHTML\s*=/gi,
    severity: 'high',
    category: 'xss',
    title: 'outerHTML assignment detected',
    description: 'outerHTML assignment can inject unsanitized content',
    recommendation: 'Use safe DOM manipulation methods',
    cweId: 'CWE-79',
  },
  injection_eval: {
    pattern: /\beval\s*\(/gi,
    severity: 'critical',
    category: 'injection',
    title: 'eval() usage detected',
    description: 'eval() executes arbitrary code and is a major injection risk',
    recommendation: 'Use JSON.parse() for JSON data or Function constructor alternatives',
    cweId: 'CWE-94',
  },
  injection_newFunction: {
    pattern: /new\s+Function\s*\(/gi,
    severity: 'critical',
    category: 'injection',
    title: 'new Function() constructor',
    description: 'Function constructor can execute arbitrary code like eval()',
    recommendation: 'Avoid dynamic code execution; use static function definitions',
    cweId: 'CWE-94',
  },
  injection_setTimeout_string: {
    pattern: /setTimeout\s*\(\s*["'`]/gi,
    severity: 'medium',
    category: 'injection',
    title: 'setTimeout with string argument',
    description: 'Passing a string to setTimeout acts like eval()',
    recommendation: 'Pass a function reference instead of a string',
    cweId: 'CWE-94',
  },
  injection_setInterval_string: {
    pattern: /setInterval\s*\(\s*["'`]/gi,
    severity: 'medium',
    category: 'injection',
    title: 'setInterval with string argument',
    description: 'Passing a string to setInterval acts like eval()',
    recommendation: 'Pass a function reference instead of a string',
    cweId: 'CWE-94',
  },
  injection_sql: {
    pattern: /(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)\s+.*\$\{|(?:SELECT|INSERT|UPDATE|DELETE)\s+.*\+\s*(?:req\.|params\.|body\.|query\.)/gi,
    severity: 'critical',
    category: 'injection',
    title: 'Potential SQL injection',
    description: 'String interpolation/concatenation in SQL queries',
    recommendation: 'Use parameterized queries or an ORM',
    cweId: 'CWE-89',
  },
  injection_command: {
    pattern: /child_process|exec\s*\(|execSync\s*\(|spawn\s*\(/gi,
    severity: 'high',
    category: 'injection',
    title: 'Command execution detected',
    description: 'Shell command execution can lead to command injection',
    recommendation: 'Validate and sanitize all inputs before command execution',
    cweId: 'CWE-78',
    fileFilter: (path) => /\.(js|ts|jsx|tsx)$/.test(path),
  },
  injection_regex_dos: {
    pattern: /new\s+RegExp\s*\(\s*(?:req\.|params\.|body\.|query\.|user)/gi,
    severity: 'medium',
    category: 'injection',
    title: 'Dynamic regex from user input',
    description: 'Creating regex from user input can cause ReDoS attacks',
    recommendation: 'Validate and escape user input before creating regex',
    cweId: 'CWE-1333',
  },
  secrets_hardcoded_password: {
    pattern: /(?:password|passwd|pwd)\s*[:=]\s*["'][^"']{3,}["']/gi,
    severity: 'critical',
    category: 'exposure',
    title: 'Hardcoded password',
    description: 'Passwords should never be hardcoded in source code',
    recommendation: 'Use environment variables: process.env.PASSWORD',
    cweId: 'CWE-798',
  },
  secrets_hardcoded_apikey: {
    pattern: /(?:api[_-]?key|apikey|api[_-]?secret)\s*[:=]\s*["'][a-zA-Z0-9]{10,}["']/gi,
    severity: 'critical',
    category: 'exposure',
    title: 'Hardcoded API key',
    description: 'API keys should not be hardcoded in source code',
    recommendation: 'Use environment variables: process.env.API_KEY',
    cweId: 'CWE-798',
  },
  secrets_hardcoded_token: {
    pattern: /(?:access[_-]?token|auth[_-]?token|bearer[_-]?token|jwt[_-]?secret)\s*[:=]\s*["'][^"']{8,}["']/gi,
    severity: 'critical',
    category: 'exposure',
    title: 'Hardcoded token/secret',
    description: 'Tokens and secrets should never appear in source code',
    recommendation: 'Store in environment variables and use a secrets manager',
    cweId: 'CWE-798',
  },
  secrets_private_key: {
    pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/gi,
    severity: 'critical',
    category: 'exposure',
    title: 'Private key in source code',
    description: 'Private keys must never be committed to source code',
    recommendation: 'Store private keys in secure key management systems',
    cweId: 'CWE-321',
  },
  secrets_aws_credentials: {
    pattern: /AKIA[0-9A-Z]{16}|(?:aws[_-]?secret[_-]?access[_-]?key)\s*[:=]\s*["'][^"']+["']/gi,
    severity: 'critical',
    category: 'exposure',
    title: 'AWS credentials detected',
    description: 'AWS access keys should not appear in source code',
    recommendation: 'Use IAM roles or environment variables for AWS credentials',
    cweId: 'CWE-798',
  },
  exposure_console_secrets: {
    pattern: /console\.\w+\s*\([^)]*(?:password|secret|token|apiKey|private)/gi,
    severity: 'high',
    category: 'exposure',
    title: 'Sensitive data in console logs',
    description: 'Logging sensitive data can expose secrets in production',
    recommendation: 'Never log passwords, tokens, or API keys',
    cweId: 'CWE-532',
  },
  exposure_error_details: {
    pattern: /res\.(?:json|send)\s*\(\s*(?:err|error)\s*\)/gi,
    severity: 'medium',
    category: 'exposure',
    title: 'Full error object sent to client',
    description: 'Sending raw error objects can leak stack traces and internal info',
    recommendation: 'Send generic error messages; log details server-side only',
    cweId: 'CWE-209',
  },
  prototype_pollution: {
    pattern: /Object\.assign\s*\(\s*\{\}\s*,\s*(?:req\.|body\.|params\.|query\.)|__proto__|constructor\s*\[\s*["']prototype["']\]/gi,
    severity: 'high',
    category: 'prototype',
    title: 'Prototype pollution risk',
    description: 'Object merging from user input can lead to prototype pollution',
    recommendation: 'Use Object.create(null) or validated schemas instead',
    cweId: 'CWE-1321',
  },
  prototype_merge: {
    pattern: /(?:lodash|_)\.(?:merge|extend|defaultsDeep)\s*\([^,]*,\s*(?:req\.|body\.|params\.)/gi,
    severity: 'high',
    category: 'prototype',
    title: 'Deep merge from user input',
    description: 'Deep merging user input can lead to prototype pollution',
    recommendation: 'Validate and whitelist properties before merging',
    cweId: 'CWE-1321',
  },
  config_cors_wildcard: {
    pattern: /cors\s*\(\s*\{[^}]*origin\s*:\s*(?:['"]\*['"]|true)/gi,
    severity: 'medium',
    category: 'config',
    title: 'CORS allows all origins',
    description: 'Wildcard CORS origin exposes API to any website',
    recommendation: 'Restrict CORS to specific trusted origins',
    cweId: 'CWE-942',
  },
  config_debug_mode: {
    pattern: /(?:debug|DEBUG|verbose)\s*[:=]\s*(?:true|1)\b/gi,
    severity: 'low',
    category: 'config',
    title: 'Debug mode enabled',
    description: 'Debug mode can expose internal state in production',
    recommendation: 'Disable debug mode for production builds',
    cweId: 'CWE-489',
  },
  config_http_insecure: {
    pattern: /http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)/gi,
    severity: 'medium',
    category: 'config',
    title: 'Insecure HTTP URL',
    description: 'Using HTTP instead of HTTPS exposes data in transit',
    recommendation: 'Use HTTPS for all external URLs',
    cweId: 'CWE-319',
  },
  config_no_strict_mode: {
    pattern: /(?:^|\n)\s*(?:var\s+\w+\s*=)/m,
    severity: 'info',
    category: 'config',
    title: 'var declaration used (prefer const/let)',
    description: 'var has function-scoping which can lead to bugs',
    recommendation: 'Use const for constants and let for variables',
    cweId: 'CWE-398',
    fileFilter: (path) => /\.(js|jsx)$/.test(path),
  },
  auth_weak_password: {
    pattern: /password\.length\s*[<>]=?\s*[0-5]\b/gi,
    severity: 'medium',
    category: 'auth',
    title: 'Weak password policy',
    description: 'Password length requirement is too short',
    recommendation: 'Require at least 8 characters with mixed case, numbers, and symbols',
    cweId: 'CWE-521',
  },
  auth_plaintext_password: {
    pattern: /password\s*===?\s*(?:req\.body|params|query)\.\w+/gi,
    severity: 'critical',
    category: 'auth',
    title: 'Plaintext password comparison',
    description: 'Comparing passwords in plaintext instead of using hashing',
    recommendation: 'Use bcrypt.compare() or argon2.verify() for password checks',
    cweId: 'CWE-256',
  },
  auth_jwt_none: {
    pattern: /algorithm\s*:\s*["']none["']/gi,
    severity: 'critical',
    category: 'auth',
    title: 'JWT with "none" algorithm',
    description: 'Using "none" algorithm disables JWT signature verification',
    recommendation: 'Always specify a secure algorithm like RS256 or HS256',
    cweId: 'CWE-327',
  },
  crypto_weak_hash: {
    pattern: /createHash\s*\(\s*["'](?:md5|sha1)["']\)/gi,
    severity: 'medium',
    category: 'crypto',
    title: 'Weak hash algorithm',
    description: 'MD5 and SHA1 are cryptographically broken',
    recommendation: 'Use SHA-256 or SHA-3 for hashing',
    cweId: 'CWE-328',
  },
  crypto_weak_random: {
    pattern: /Math\.random\s*\(\s*\)/gi,
    severity: 'medium',
    category: 'crypto',
    title: 'Math.random() for security-sensitive operation',
    description: 'Math.random() is not cryptographically secure',
    recommendation: 'Use crypto.randomBytes() or crypto.getRandomValues()',
    cweId: 'CWE-338',
    fileFilter: (path) => /\.(js|ts|jsx|tsx)$/.test(path),
  },
  validation_noInputValidation: {
    pattern: /req\.(?:body|params|query)\.\w+/gi,
    severity: 'info',
    category: 'validation',
    title: 'Direct request input access',
    description: 'Input should be validated before use',
    recommendation: 'Validate inputs using Zod, Joi, or express-validator',
    cweId: 'CWE-20',
    fileFilter: (path) => /\.(js|ts)$/.test(path) && !path.includes('.test.'),
  },
  dependency_vulnerable_version: {
    pattern: /"(?:express|lodash|axios|moment|jquery|angular|backbone|ember|meteor|react-scripts)"\s*:\s*"[~^]?[0-3]\./gi,
    severity: 'medium',
    category: 'dependency',
    title: 'Potentially outdated dependency',
    description: 'Old major versions may contain known vulnerabilities',
    recommendation: 'Update to the latest stable version',
    cweId: 'CWE-1104',
    fileFilter: (path) => path.endsWith('package.json'),
  },
  xss_href_javascript: {
    pattern: /href\s*=\s*["']javascript:/gi,
    severity: 'high',
    category: 'xss',
    title: 'javascript: URL in href',
    description: 'javascript: URLs can execute arbitrary scripts',
    recommendation: 'Use onClick handlers instead of javascript: URLs',
    cweId: 'CWE-79',
  },
  injection_path_traversal: {
    pattern: /(?:readFile|readFileSync|writeFile|writeFileSync|createReadStream|createWriteStream)\s*\(\s*(?:req\.|params\.|body\.|query\.)/gi,
    severity: 'high',
    category: 'injection',
    title: 'Path traversal risk',
    description: 'Using user input directly in file paths allows directory traversal',
    recommendation: 'Validate and sanitize file paths; use path.resolve with a base directory',
    cweId: 'CWE-22',
  },
};

interface WhiteboxCheck {
  id: string;
  name: string;
  category: string;
  cweId?: string;
  check: (files: { path: string; content: string; language: string }[]) => { passed: boolean; detail: string };
}

const WHITEBOX_CHECKS: WhiteboxCheck[] = [
  {
    id: 'wb_no_eval',
    name: 'No eval() or Function constructor',
    category: 'Injection Prevention',
    cweId: 'CWE-94',
    check: (files) => {
      const jsFiles = files.filter(f => /\.(js|ts|jsx|tsx)$/.test(f.path));
      const hasEval = jsFiles.some(f => /\beval\s*\(|new\s+Function\s*\(/.test(f.content));
      return { passed: !hasEval, detail: hasEval ? 'eval() or new Function() found' : 'No dynamic code execution' };
    },
  },
  {
    id: 'wb_no_innerhtml',
    name: 'No direct innerHTML manipulation',
    category: 'XSS Prevention',
    cweId: 'CWE-79',
    check: (files) => {
      const hasInner = files.some(f => /innerHTML\s*=/.test(f.content));
      return { passed: !hasInner, detail: hasInner ? 'innerHTML assignment found' : 'Safe DOM manipulation' };
    },
  },
  {
    id: 'wb_no_document_write',
    name: 'No document.write() calls',
    category: 'XSS Prevention',
    cweId: 'CWE-79',
    check: (files) => {
      const has = files.some(f => /document\.write\s*\(/.test(f.content));
      return { passed: !has, detail: has ? 'document.write() found' : 'No document.write usage' };
    },
  },
  {
    id: 'wb_no_hardcoded_secrets',
    name: 'No hardcoded secrets or API keys',
    category: 'Secret Management',
    cweId: 'CWE-798',
    check: (files) => {
      const patterns = [
        /(?:password|passwd|pwd|secret|api[_-]?key|apikey|token|auth[_-]?token)\s*[:=]\s*["'][a-zA-Z0-9!@#$%^&*]{8,}["']/i,
        /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/,
        /AKIA[0-9A-Z]{16}/,
      ];
      const has = files.some(f => patterns.some(p => p.test(f.content)));
      return { passed: !has, detail: has ? 'Hardcoded secrets detected' : 'No embedded credentials' };
    },
  },
  {
    id: 'wb_no_sql_injection',
    name: 'No SQL injection vectors',
    category: 'Injection Prevention',
    cweId: 'CWE-89',
    check: (files) => {
      const has = files.some(f => /(?:SELECT|INSERT|UPDATE|DELETE)\s+.*\$\{|(?:SELECT|INSERT|UPDATE|DELETE)\s+.*\+\s*(?:req\.|params\.|body\.)/i.test(f.content));
      return { passed: !has, detail: has ? 'SQL string interpolation found' : 'No SQL injection patterns' };
    },
  },
  {
    id: 'wb_no_command_injection',
    name: 'No command injection vectors',
    category: 'Injection Prevention',
    cweId: 'CWE-78',
    check: (files) => {
      const has = files.some(f => /exec\s*\(\s*(?:req\.|body\.|params\.|`)/i.test(f.content));
      return { passed: !has, detail: has ? 'User input in shell commands' : 'No command injection' };
    },
  },
  {
    id: 'wb_no_prototype_pollution',
    name: 'No prototype pollution vectors',
    category: 'Prototype Safety',
    cweId: 'CWE-1321',
    check: (files) => {
      const has = files.some(f => /__proto__|constructor\["prototype"\]/.test(f.content));
      return { passed: !has, detail: has ? '__proto__ access detected' : 'No prototype pollution' };
    },
  },
  {
    id: 'wb_no_unsafe_regex',
    name: 'No unsafe regex from user input',
    category: 'DoS Prevention',
    cweId: 'CWE-1333',
    check: (files) => {
      const has = files.some(f => /new\s+RegExp\s*\(\s*(?:req\.|body\.|params\.|query\.)/.test(f.content));
      return { passed: !has, detail: has ? 'Dynamic regex from user input' : 'No regex injection' };
    },
  },
  {
    id: 'wb_no_exposed_errors',
    name: 'No raw error objects sent to client',
    category: 'Information Disclosure',
    cweId: 'CWE-209',
    check: (files) => {
      const has = files.some(f => /res\.(?:json|send)\s*\(\s*(?:err|error)\s*\)/.test(f.content));
      return { passed: !has, detail: has ? 'Raw error sent to client' : 'Errors properly handled' };
    },
  },
  {
    id: 'wb_no_console_secrets',
    name: 'No sensitive data in console logs',
    category: 'Data Protection',
    cweId: 'CWE-532',
    check: (files) => {
      const has = files.some(f => /console\.\w+\s*\([^)]*(?:password|secret|token|apiKey|private)/i.test(f.content));
      return { passed: !has, detail: has ? 'Sensitive data logged' : 'No secrets in logs' };
    },
  },
  {
    id: 'wb_uses_https',
    name: 'Uses HTTPS for external URLs',
    category: 'Transport Security',
    cweId: 'CWE-319',
    check: (files) => {
      const allCode = files.map(f => f.content).join('\n');
      const httpUrls = allCode.match(/http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)/g);
      return { passed: !httpUrls || httpUrls.length === 0, detail: httpUrls ? `${httpUrls.length} insecure URL(s) found` : 'All external URLs use HTTPS' };
    },
  },
  {
    id: 'wb_no_javascript_urls',
    name: 'No javascript: protocol in URLs',
    category: 'XSS Prevention',
    cweId: 'CWE-79',
    check: (files) => {
      const has = files.some(f => /href\s*=\s*["']javascript:/i.test(f.content));
      return { passed: !has, detail: has ? 'javascript: URL found' : 'No javascript: URLs' };
    },
  },
  {
    id: 'wb_no_dangerously_set',
    name: 'No dangerouslySetInnerHTML without sanitization',
    category: 'XSS Prevention',
    cweId: 'CWE-79',
    check: (files) => {
      const jsxFiles = files.filter(f => /\.(jsx|tsx)$/.test(f.path));
      const hasDangerous = jsxFiles.some(f => /dangerouslySetInnerHTML/.test(f.content));
      const hasSanitizer = files.some(f => /DOMPurify|sanitize/i.test(f.content));
      if (!hasDangerous) return { passed: true, detail: 'No dangerouslySetInnerHTML usage' };
      return { passed: hasSanitizer, detail: hasSanitizer ? 'dangerouslySetInnerHTML used with sanitizer' : 'dangerouslySetInnerHTML without sanitizer' };
    },
  },
  {
    id: 'wb_no_path_traversal',
    name: 'No path traversal vectors',
    category: 'File Security',
    cweId: 'CWE-22',
    check: (files) => {
      const has = files.some(f => /(?:readFile|writeFile|createReadStream)\s*\(\s*(?:req\.|body\.|params\.)/i.test(f.content));
      return { passed: !has, detail: has ? 'User input in file paths' : 'No path traversal risk' };
    },
  },
  {
    id: 'wb_no_open_redirect',
    name: 'No open redirect vulnerabilities',
    category: 'Redirect Safety',
    cweId: 'CWE-601',
    check: (files) => {
      const has = files.some(f => /res\.redirect\s*\(\s*(?:req\.|body\.|params\.|query\.)/i.test(f.content));
      return { passed: !has, detail: has ? 'Redirect from user input' : 'No open redirects' };
    },
  },
  {
    id: 'wb_no_weak_crypto',
    name: 'No weak cryptographic algorithms',
    category: 'Cryptography',
    cweId: 'CWE-328',
    check: (files) => {
      const has = files.some(f => /createHash\s*\(\s*["'](?:md5|sha1)["']\)/i.test(f.content));
      return { passed: !has, detail: has ? 'MD5 or SHA1 hash found' : 'No weak hash algorithms' };
    },
  },
  {
    id: 'wb_no_plaintext_password',
    name: 'No plaintext password comparison',
    category: 'Authentication',
    cweId: 'CWE-256',
    check: (files) => {
      const has = files.some(f => /password\s*===?\s*(?:req\.body|params|query)\.\w+/i.test(f.content));
      return { passed: !has, detail: has ? 'Plaintext password comparison' : 'No plaintext password checks' };
    },
  },
  {
    id: 'wb_no_jwt_none',
    name: 'No JWT "none" algorithm',
    category: 'Authentication',
    cweId: 'CWE-327',
    check: (files) => {
      const has = files.some(f => /algorithm\s*:\s*["']none["']/i.test(f.content));
      return { passed: !has, detail: has ? 'JWT none algorithm found' : 'No insecure JWT config' };
    },
  },
  {
    id: 'wb_safe_event_handlers',
    name: 'Event handlers use React patterns',
    category: 'Framework Security',
    check: (files) => {
      const jsxFiles = files.filter(f => /\.(jsx|tsx)$/.test(f.path));
      if (jsxFiles.length === 0) return { passed: true, detail: 'No JSX files to check' };
      const hasUnsafe = jsxFiles.some(f => /\bonclick\s*=\s*["']/i.test(f.content));
      return { passed: !hasUnsafe, detail: hasUnsafe ? 'Inline HTML event handlers found' : 'React event handlers used' };
    },
  },
  {
    id: 'wb_no_setTimeout_string',
    name: 'No string arguments in setTimeout/setInterval',
    category: 'Injection Prevention',
    cweId: 'CWE-94',
    check: (files) => {
      const has = files.some(f => /(?:setTimeout|setInterval)\s*\(\s*["'`]/.test(f.content));
      return { passed: !has, detail: has ? 'String passed to timer function' : 'Timer functions use safe callbacks' };
    },
  },
  {
    id: 'wb_no_var_declarations',
    name: 'Uses const/let instead of var',
    category: 'Code Quality',
    cweId: 'CWE-398',
    check: (files) => {
      const jsFiles = files.filter(f => /\.(js|jsx)$/.test(f.path));
      const hasVar = jsFiles.some(f => /(?:^|\n)\s*var\s+\w+/.test(f.content));
      return { passed: !hasVar, detail: hasVar ? 'var declarations found' : 'Modern variable declarations' };
    },
  },
  {
    id: 'wb_proper_form_action',
    name: 'Forms use proper submit handlers',
    category: 'Form Security',
    check: (files) => {
      const jsxFiles = files.filter(f => /\.(jsx|tsx)$/.test(f.path));
      if (jsxFiles.length === 0) return { passed: true, detail: 'No JSX files to check' };
      const hasForms = jsxFiles.some(f => /<form\b/.test(f.content));
      if (!hasForms) return { passed: true, detail: 'No forms to check' };
      const hasOnSubmit = jsxFiles.some(f => /onSubmit\s*=/.test(f.content));
      return { passed: hasOnSubmit, detail: hasOnSubmit ? 'Forms use onSubmit handlers' : 'Forms missing onSubmit handlers' };
    },
  },
  {
    id: 'wb_no_target_blank',
    name: 'External links have rel="noopener"',
    category: 'Link Security',
    cweId: 'CWE-1022',
    check: (files) => {
      const jsxFiles = files.filter(f => /\.(jsx|tsx|html)$/.test(f.path));
      const hasTargetBlank = jsxFiles.some(f => /target\s*=\s*["']_blank["']/.test(f.content));
      if (!hasTargetBlank) return { passed: true, detail: 'No target="_blank" links' };
      const hasNoopener = jsxFiles.some(f => /rel\s*=\s*["'][^"']*noopener/.test(f.content));
      return { passed: hasNoopener, detail: hasNoopener ? 'Links have rel="noopener"' : 'Missing rel="noopener" on target="_blank"' };
    },
  },
  {
    id: 'wb_img_alt_text',
    name: 'Images have alt text for accessibility',
    category: 'Accessibility',
    check: (files) => {
      const jsxFiles = files.filter(f => /\.(jsx|tsx)$/.test(f.path));
      const hasImages = jsxFiles.some(f => /<img\b/.test(f.content));
      if (!hasImages) return { passed: true, detail: 'No images to check' };
      const hasImgWithoutAlt = jsxFiles.some(f => {
        const imgTags = f.content.match(/<img\b[^>]*>/g) || [];
        return imgTags.some(tag => !/alt\s*=/.test(tag));
      });
      return { passed: !hasImgWithoutAlt, detail: hasImgWithoutAlt ? 'Images missing alt attributes' : 'All images have alt text' };
    },
  },
  {
    id: 'wb_semantic_html',
    name: 'Uses semantic HTML elements',
    category: 'Accessibility',
    check: (files) => {
      const jsxFiles = files.filter(f => /\.(jsx|tsx|html)$/.test(f.path));
      if (jsxFiles.length === 0) return { passed: true, detail: 'No HTML/JSX files' };
      const allContent = jsxFiles.map(f => f.content).join('\n');
      const hasSemantics = /<(?:header|nav|main|footer|article|section|aside)\b/.test(allContent);
      return { passed: hasSemantics, detail: hasSemantics ? 'Uses semantic HTML elements' : 'Missing semantic HTML elements' };
    },
  },
  {
    id: 'wb_aria_labels',
    name: 'Interactive elements have ARIA labels',
    category: 'Accessibility',
    check: (files) => {
      const jsxFiles = files.filter(f => /\.(jsx|tsx)$/.test(f.path));
      if (jsxFiles.length === 0) return { passed: true, detail: 'No JSX files' };
      const allContent = jsxFiles.map(f => f.content).join('\n');
      const hasAria = /aria-label\s*=/.test(allContent);
      return { passed: hasAria, detail: hasAria ? 'ARIA labels present' : 'Missing ARIA labels on interactive elements' };
    },
  },
  {
    id: 'wb_react_key_prop',
    name: 'List items use key prop',
    category: 'React Best Practice',
    check: (files) => {
      const jsxFiles = files.filter(f => /\.(jsx|tsx)$/.test(f.path));
      if (jsxFiles.length === 0) return { passed: true, detail: 'No JSX files' };
      const hasMaps = jsxFiles.some(f => /\.map\s*\(/.test(f.content));
      if (!hasMaps) return { passed: true, detail: 'No list rendering' };
      const hasKeys = jsxFiles.some(f => /key\s*=\s*\{/.test(f.content));
      return { passed: hasKeys, detail: hasKeys ? 'List items have key props' : 'Missing key props in lists' };
    },
  },
  {
    id: 'wb_no_inline_styles',
    name: 'Minimal inline styles (uses CSS classes)',
    category: 'Code Quality',
    check: (files) => {
      const jsxFiles = files.filter(f => /\.(jsx|tsx)$/.test(f.path));
      if (jsxFiles.length === 0) return { passed: true, detail: 'No JSX files' };
      const hasClassName = jsxFiles.some(f => /className\s*=/.test(f.content));
      return { passed: hasClassName, detail: hasClassName ? 'Uses CSS class-based styling' : 'No className usage found' };
    },
  },
  {
    id: 'wb_error_boundary',
    name: 'Error handling patterns present',
    category: 'Error Handling',
    check: (files) => {
      const allContent = files.map(f => f.content).join('\n');
      const hasErrorHandling = /try\s*\{|catch\s*\(|\.catch\s*\(|onError|ErrorBoundary/i.test(allContent);
      return { passed: hasErrorHandling, detail: hasErrorHandling ? 'Error handling implemented' : 'No error handling found' };
    },
  },
  {
    id: 'wb_no_mixed_content',
    name: 'No mixed HTTP/HTTPS content',
    category: 'Transport Security',
    cweId: 'CWE-319',
    check: (files) => {
      const htmlFiles = files.filter(f => /\.(html|jsx|tsx)$/.test(f.path));
      const hasMixed = htmlFiles.some(f => /src\s*=\s*["']http:\/\/(?!localhost)/.test(f.content));
      return { passed: !hasMixed, detail: hasMixed ? 'Mixed content (HTTP in HTTPS)' : 'No mixed content issues' };
    },
  },
  {
    id: 'wb_csp_meta',
    name: 'Content Security Policy considered',
    category: 'Headers',
    cweId: 'CWE-693',
    check: (files) => {
      const allContent = files.map(f => f.content).join('\n');
      const hasCsp = /Content-Security-Policy|csp|helmet/i.test(allContent);
      return { passed: hasCsp, detail: hasCsp ? 'CSP or security headers found' : 'No CSP headers configured (recommended for production)' };
    },
  },
  {
    id: 'wb_input_validation',
    name: 'Input validation present',
    category: 'Input Safety',
    cweId: 'CWE-20',
    check: (files) => {
      const allContent = files.map(f => f.content).join('\n');
      const hasValidation = /required|pattern\s*=|minLength|maxLength|type\s*=\s*["']email["']|\.test\s*\(|validate|schema|zod|joi/i.test(allContent);
      return { passed: hasValidation, detail: hasValidation ? 'Input validation patterns found' : 'No input validation detected' };
    },
  },
  {
    id: 'wb_viewport_meta',
    name: 'Viewport meta tag set for responsive design',
    category: 'Best Practice',
    check: (files) => {
      const htmlFiles = files.filter(f => f.path.endsWith('.html'));
      if (htmlFiles.length === 0) return { passed: true, detail: 'No HTML files' };
      const has = htmlFiles.some(f => /viewport/.test(f.content));
      return { passed: has, detail: has ? 'Viewport meta tag present' : 'Missing viewport meta tag' };
    },
  },
  {
    id: 'wb_charset_declared',
    name: 'Character encoding declared',
    category: 'Best Practice',
    check: (files) => {
      const htmlFiles = files.filter(f => f.path.endsWith('.html'));
      if (htmlFiles.length === 0) return { passed: true, detail: 'No HTML files' };
      const has = htmlFiles.some(f => /charset/i.test(f.content));
      return { passed: has, detail: has ? 'Character encoding set' : 'Missing charset declaration' };
    },
  },
  {
    id: 'wb_no_console_in_prod',
    name: 'Minimal console.log in production code',
    category: 'Code Quality',
    check: (files) => {
      const jsFiles = files.filter(f => /\.(js|jsx|ts|tsx)$/.test(f.path) && !f.path.includes('test'));
      const count = jsFiles.reduce((acc, f) => acc + (f.content.match(/console\.log\s*\(/g) || []).length, 0);
      return { passed: count < 5, detail: count === 0 ? 'No console.log statements' : `${count} console.log statement(s) found` };
    },
  },
  {
    id: 'wb_dependency_integrity',
    name: 'Package.json has proper structure',
    category: 'Dependency Security',
    check: (files) => {
      const pkg = files.find(f => f.path === 'package.json' || f.path.endsWith('/package.json'));
      if (!pkg) return { passed: true, detail: 'No package.json' };
      try {
        const parsed = JSON.parse(pkg.content);
        const hasName = !!parsed.name;
        const hasVersion = !!parsed.version;
        return { passed: hasName && hasVersion, detail: hasName && hasVersion ? 'Valid package.json structure' : 'Incomplete package.json' };
      } catch {
        return { passed: false, detail: 'Invalid package.json JSON' };
      }
    },
  },
];

export function scanForVulnerabilities(
  files: { path: string; content: string; language: string }[]
): SecurityScanResult {
  const issues: SecurityIssue[] = [];
  const passedChecks: string[] = [];
  const checks: SecurityCheck[] = [];

  for (const [key, vuln] of Object.entries(VULNERABILITY_PATTERNS)) {
    const relevantFiles = vuln.fileFilter ? files.filter(f => vuln.fileFilter!(f.path)) : files;
    const allCode = relevantFiles.map(f => f.content).join('\n');

    const regex = new RegExp(vuln.pattern.source, vuln.pattern.flags);
    const matches = allCode.match(regex);

    if (matches && matches.length > 0) {
      let location = 'Multiple files';
      for (const file of relevantFiles) {
        const fileRegex = new RegExp(vuln.pattern.source, vuln.pattern.flags);
        if (fileRegex.test(file.content)) {
          location = file.path;
          break;
        }
      }

      issues.push({
        id: `sec-${key}`,
        severity: vuln.severity,
        category: vuln.category,
        title: vuln.title,
        description: vuln.description,
        location,
        recommendation: vuln.recommendation,
        cweId: vuln.cweId,
      });
    }
  }

  for (const wb of WHITEBOX_CHECKS) {
    const result = wb.check(files);
    checks.push({
      id: wb.id,
      name: wb.name,
      category: wb.category,
      status: result.passed ? 'passed' : 'warning',
      detail: result.detail,
      cweId: wb.cweId,
    });
    if (result.passed) {
      passedChecks.push(wb.name);
    }
  }

  const score = calculateSecurityScore(issues, checks);
  const grade = scoreToGrade(score);

  return {
    score,
    grade,
    issues,
    passedChecks,
    checks,
    totalChecks: WHITEBOX_CHECKS.length,
    timestamp: new Date(),
  };
}

function calculateSecurityScore(issues: SecurityIssue[], checks: SecurityCheck[]): number {
  let score = 100;

  for (const issue of issues) {
    switch (issue.severity) {
      case 'critical': score -= 20; break;
      case 'high': score -= 12; break;
      case 'medium': score -= 7; break;
      case 'low': score -= 3; break;
      case 'info': score -= 1; break;
    }
  }

  const passedCount = checks.filter(c => c.status === 'passed').length;
  const totalChecks = checks.length;
  if (totalChecks > 0) {
    const passRate = passedCount / totalChecks;
    score += Math.round(passRate * 15);
  }

  return Math.max(0, Math.min(100, score));
}

function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export function getSecurityRecommendations(projectType: string): string[] {
  const base = [
    'Validate all user inputs using a schema validation library',
    'Use HTTPS for all external communications',
    'Implement proper error handling that does not expose sensitive info',
    'Store secrets in environment variables, never in code',
    'Keep all dependencies up to date',
  ];

  if (projectType === 'webapp' || projectType === 'saas' || projectType === 'dashboard') {
    base.push(
      'Implement authentication with secure password hashing (bcrypt/argon2)',
      'Use HTTP-only, secure cookies for session management',
      'Implement CSRF protection for state-changing operations',
      'Add rate limiting to prevent brute force attacks',
      'Set up proper CORS configuration for your API',
    );
  }

  if (projectType === 'ecommerce') {
    base.push(
      'Never store raw credit card data - use a payment processor',
      'Implement PCI-DSS compliance measures',
      'Add fraud detection mechanisms',
      'Log all transactions for audit purposes',
    );
  }

  if (projectType === 'api') {
    base.push(
      'Implement API key authentication or OAuth 2.0',
      'Add rate limiting per API key',
      'Validate Content-Type headers',
      'Implement request size limits',
    );
  }

  return base;
}

export function generateSecurePatterns(language: string): string {
  if (language === 'javascript' || language === 'typescript') {
    return `
// Input Validation with Zod
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)/),
  name: z.string().min(2).max(100),
});

// Secure password hashing
import bcrypt from 'bcrypt';
const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Safe database query (using parameterized queries)
const user = await db.query.users.findFirst({
  where: eq(users.email, email) // Never concatenate strings!
});

// CSRF Protection
import csrf from 'csurf';
app.use(csrf({ cookie: { httpOnly: true, secure: true } }));

// Rate Limiting
import rateLimit from 'express-rate-limit';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per window
});
app.use('/api/', limiter);

// Secure Headers
import helmet from 'helmet';
app.use(helmet());
    `.trim();
  }

  return '';
}

export function formatSecurityReport(result: SecurityScanResult): string {
  let report = `## Security Scan Report\n\n`;
  report += `**Score:** ${result.score}/100 (Grade: ${result.grade})\n`;
  report += `**Checks Run:** ${result.totalChecks} | **Passed:** ${result.checks.filter(c => c.status === 'passed').length} | **Warnings:** ${result.checks.filter(c => c.status === 'warning').length}\n\n`;

  if (result.issues.length === 0) {
    report += `No critical security vulnerabilities detected.\n\n`;
  } else {
    report += `### Vulnerabilities Found (${result.issues.length})\n\n`;

    const critical = result.issues.filter(i => i.severity === 'critical');
    const high = result.issues.filter(i => i.severity === 'high');
    const medium = result.issues.filter(i => i.severity === 'medium');
    const low = result.issues.filter(i => i.severity === 'low' || i.severity === 'info');

    if (critical.length > 0) {
      report += `#### CRITICAL (${critical.length})\n`;
      for (const issue of critical) {
        report += `- **${issue.title}** (${issue.location}) [${issue.cweId}]\n`;
        report += `  ${issue.description}\n`;
        report += `  _Fix: ${issue.recommendation}_\n`;
      }
      report += '\n';
    }

    if (high.length > 0) {
      report += `#### HIGH (${high.length})\n`;
      for (const issue of high) {
        report += `- **${issue.title}** (${issue.location})\n`;
        report += `  _Fix: ${issue.recommendation}_\n`;
      }
      report += '\n';
    }

    if (medium.length > 0) {
      report += `#### MEDIUM (${medium.length})\n`;
      for (const issue of medium) {
        report += `- **${issue.title}**: ${issue.recommendation}\n`;
      }
      report += '\n';
    }

    if (low.length > 0) {
      report += `#### LOW/INFO (${low.length})\n`;
      for (const issue of low) {
        report += `- ${issue.title}\n`;
      }
      report += '\n';
    }
  }

  report += `### Whitebox Security Checks (${result.checks.length})\n\n`;

  const categories = Array.from(new Set(result.checks.map(c => c.category)));
  for (const cat of categories) {
    const catChecks = result.checks.filter(c => c.category === cat);
    report += `**${cat}**\n`;
    for (const check of catChecks) {
      const icon = check.status === 'passed' ? '[PASS]' : '[WARN]';
      report += `${icon} ${check.name}: ${check.detail}\n`;
    }
    report += '\n';
  }

  return report;
}