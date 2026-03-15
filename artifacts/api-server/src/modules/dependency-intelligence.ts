// Dependency Intelligence - Auto-detect dependencies, generate .env.example, warn about insecure configs

interface Dependency {
  name: string;
  type: 'npm' | 'cdn' | 'internal';
  version?: string;
  purpose: string;
  isDevDependency: boolean;
  securityNotes?: string;
}

interface EnvVariable {
  key: string;
  description: string;
  required: boolean;
  example: string;
  sensitive: boolean;
  category: 'api' | 'database' | 'auth' | 'config' | 'feature';
}

interface DependencyAnalysis {
  dependencies: Dependency[];
  envVariables: EnvVariable[];
  warnings: DependencyWarning[];
  recommendations: string[];
}

interface DependencyWarning {
  severity: 'critical' | 'high' | 'medium' | 'low';
  dependency: string;
  issue: string;
  recommendation: string;
}

// Common dependencies and their purposes
const KNOWN_DEPENDENCIES: Record<string, Partial<Dependency>> = {
  'express': { purpose: 'Web server framework', isDevDependency: false },
  'react': { purpose: 'UI component library', isDevDependency: false },
  'react-dom': { purpose: 'React DOM rendering', isDevDependency: false },
  'typescript': { purpose: 'Type-safe JavaScript', isDevDependency: true },
  'vite': { purpose: 'Build tool and dev server', isDevDependency: true },
  'drizzle-orm': { purpose: 'Type-safe database ORM', isDevDependency: false },
  'zod': { purpose: 'Schema validation', isDevDependency: false },
  'tailwindcss': { purpose: 'Utility-first CSS framework', isDevDependency: true },
  'bcrypt': { purpose: 'Password hashing', isDevDependency: false, securityNotes: 'Use minimum 12 salt rounds' },
  'jsonwebtoken': { purpose: 'JWT token handling', isDevDependency: false, securityNotes: 'Use strong secrets, set expiration' },
  'helmet': { purpose: 'Security headers', isDevDependency: false },
  'cors': { purpose: 'Cross-Origin Resource Sharing', isDevDependency: false, securityNotes: 'Configure specific origins in production' },
  'pg': { purpose: 'PostgreSQL client', isDevDependency: false },
  'stripe': { purpose: 'Payment processing', isDevDependency: false, securityNotes: 'Never log API keys, use webhook signatures' },
  'nodemailer': { purpose: 'Email sending', isDevDependency: false },
  'dotenv': { purpose: 'Environment variable loading', isDevDependency: false },
};

// Analyze code to detect dependencies
export function analyzeDependencies(
  files: { path: string; content: string; language: string }[]
): DependencyAnalysis {
  const dependencies: Dependency[] = [];
  const envVariables: EnvVariable[] = [];
  const warnings: DependencyWarning[] = [];
  const recommendations: string[] = [];
  const seenDeps = new Set<string>();

  for (const file of files) {
    // Detect npm imports
    if (file.language === 'javascript' || file.language === 'typescript') {
      const importPattern = /(?:import\s+.*?\s+from\s+['"]([^'"./][^'"]*)['"]]|require\s*\(\s*['"]([^'"./][^'"]*)['"]\s*\))/g;
      let match;

      while ((match = importPattern.exec(file.content)) !== null) {
        const depName = match[1] || match[2];
        const packageName = depName.split('/')[0].replace(/^@/, '@' + (depName.split('/')[1] || ''));

        if (!seenDeps.has(packageName)) {
          seenDeps.add(packageName);
          const known = KNOWN_DEPENDENCIES[packageName];

          dependencies.push({
            name: packageName,
            type: 'npm',
            purpose: known?.purpose || 'Third-party package',
            isDevDependency: known?.isDevDependency || false,
            securityNotes: known?.securityNotes,
          });

          if (known?.securityNotes) {
            warnings.push({
              severity: 'medium',
              dependency: packageName,
              issue: `Security consideration for ${packageName}`,
              recommendation: known.securityNotes,
            });
          }
        }
      }

      // Detect environment variable usage
      const envPattern = /process\.env\.(\w+)|import\.meta\.env\.(\w+)/g;
      while ((match = envPattern.exec(file.content)) !== null) {
        const envKey = match[1] || match[2];
        if (!envVariables.find(e => e.key === envKey)) {
          envVariables.push(inferEnvVariable(envKey));
        }
      }
    }

    // Detect CDN dependencies in HTML
    if (file.language === 'html') {
      const cdnPattern = /<script[^>]+src=["']([^"']+)["'][^>]*>/gi;
      let cdnMatch;
      while ((cdnMatch = cdnPattern.exec(file.content)) !== null) {
        const url = cdnMatch[1];
        if (url.includes('cdn') || url.includes('unpkg') || url.includes('jsdelivr')) {
          const depName = extractCdnPackageName(url);
          if (depName && !seenDeps.has(depName)) {
            seenDeps.add(depName);
            dependencies.push({
              name: depName,
              type: 'cdn',
              purpose: 'Loaded from CDN',
              isDevDependency: false,
            });

            // Warn about CDN usage
            warnings.push({
              severity: 'low',
              dependency: depName,
              issue: 'Loaded from external CDN',
              recommendation: 'Consider bundling locally for better reliability and offline support',
            });
          }
        }
      }
    }
  }

  // Add recommendations based on detected dependencies
  if (dependencies.find(d => d.name === 'express') && !dependencies.find(d => d.name === 'helmet')) {
    recommendations.push('Add `helmet` package for secure HTTP headers');
  }

  if (dependencies.find(d => d.name === 'express') && !dependencies.find(d => d.name === 'express-rate-limit')) {
    recommendations.push('Consider adding `express-rate-limit` for API rate limiting');
  }

  if (envVariables.find(e => e.key.includes('DATABASE')) && !dependencies.find(d => d.name === 'drizzle-orm' || d.name === 'prisma')) {
    recommendations.push('Consider using an ORM like Drizzle for type-safe database queries');
  }

  return {
    dependencies,
    envVariables,
    warnings,
    recommendations,
  };
}

function extractCdnPackageName(url: string): string | null {
  // Extract package name from common CDN URLs
  const patterns = [
    /unpkg\.com\/([^/@]+)/,
    /jsdelivr\.net\/npm\/([^/@]+)/,
    /cdnjs\.cloudflare\.com\/ajax\/libs\/([^/]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

function inferEnvVariable(key: string): EnvVariable {
  const keyLower = key.toLowerCase();

  // API keys
  if (keyLower.includes('api_key') || keyLower.includes('apikey')) {
    const service = key.replace(/_?API_?KEY$/i, '');
    return {
      key,
      description: `API key for ${service || 'external service'}`,
      required: true,
      example: 'sk_live_xxxxxxxxxxxx',
      sensitive: true,
      category: 'api',
    };
  }

  // Database URLs
  if (keyLower.includes('database') || keyLower.includes('db_')) {
    return {
      key,
      description: 'Database connection string',
      required: true,
      example: 'postgresql://user:password@localhost:5432/dbname',
      sensitive: true,
      category: 'database',
    };
  }

  // Secrets and tokens
  if (keyLower.includes('secret') || keyLower.includes('token')) {
    return {
      key,
      description: 'Secret key for encryption or signing',
      required: true,
      example: 'your-secret-key-here',
      sensitive: true,
      category: 'auth',
    };
  }

  // URLs
  if (keyLower.includes('url') || keyLower.includes('endpoint')) {
    return {
      key,
      description: 'External service URL',
      required: true,
      example: 'https://api.example.com',
      sensitive: false,
      category: 'config',
    };
  }

  // Port
  if (keyLower.includes('port')) {
    return {
      key,
      description: 'Server port number',
      required: false,
      example: '3000',
      sensitive: false,
      category: 'config',
    };
  }

  // Default
  return {
    key,
    description: 'Configuration variable',
    required: false,
    example: 'value',
    sensitive: keyLower.includes('password') || keyLower.includes('key'),
    category: 'config',
  };
}

// Generate .env.example content
export function generateEnvExample(envVariables: EnvVariable[]): string {
  if (envVariables.length === 0) {
    return '# No environment variables detected\n';
  }

  let content = '# Environment Variables\n';
  content += '# Copy this file to .env and fill in the values\n\n';

  // Group by category
  const grouped = new Map<string, EnvVariable[]>();
  for (const env of envVariables) {
    const group = grouped.get(env.category) || [];
    group.push(env);
    grouped.set(env.category, group);
  }

  const categoryOrder = ['database', 'auth', 'api', 'config', 'feature'];

  for (const category of categoryOrder) {
    const vars = grouped.get(category);
    if (!vars || vars.length === 0) continue;

    content += `# ${category.toUpperCase()}\n`;
    for (const env of vars) {
      content += `# ${env.description}${env.required ? ' (REQUIRED)' : ''}\n`;
      if (env.sensitive) {
        content += `# ⚠️ Keep this secret - never commit to git\n`;
      }
      content += `${env.key}=${env.example}\n\n`;
    }
  }

  return content;
}

// Generate package.json dependencies section
export function generatePackageJsonDeps(dependencies: Dependency[]): {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} {
  const deps: Record<string, string> = {};
  const devDeps: Record<string, string> = {};

  for (const dep of dependencies) {
    if (dep.type !== 'npm') continue;

    const version = dep.version || 'latest';
    if (dep.isDevDependency) {
      devDeps[dep.name] = version;
    } else {
      deps[dep.name] = version;
    }
  }

  return { dependencies: deps, devDependencies: devDeps };
}

// Format dependency analysis as markdown
export function formatDependencyReport(analysis: DependencyAnalysis): string {
  let report = '## Dependency Analysis\n\n';

  // Dependencies
  report += `### Dependencies (${analysis.dependencies.length})\n`;

  const npmDeps = analysis.dependencies.filter(d => d.type === 'npm');
  const cdnDeps = analysis.dependencies.filter(d => d.type === 'cdn');

  if (npmDeps.length > 0) {
    report += '\n**NPM Packages:**\n';
    for (const dep of npmDeps) {
      report += `- \`${dep.name}\`: ${dep.purpose}${dep.isDevDependency ? ' _(dev)_' : ''}\n`;
    }
  }

  if (cdnDeps.length > 0) {
    report += '\n**CDN Dependencies:**\n';
    for (const dep of cdnDeps) {
      report += `- \`${dep.name}\`: ${dep.purpose}\n`;
    }
  }

  // Environment Variables
  if (analysis.envVariables.length > 0) {
    report += '\n### Environment Variables\n';
    for (const env of analysis.envVariables) {
      const badge = env.required ? '[REQUIRED]' : '[optional]';
      const secret = env.sensitive ? ' [secret]' : '';
      report += `- \`${env.key}\`${badge}${secret}: ${env.description}\n`;
    }
  }

  // Warnings
  if (analysis.warnings.length > 0) {
    report += '\n### Security Warnings\n';
    for (const warning of analysis.warnings) {
      report += `- [${warning.severity.toUpperCase()}] **${warning.dependency}**: ${warning.issue}\n`;
      report += `  _Fix: ${warning.recommendation}_\n`;
    }
  }

  // Recommendations
  if (analysis.recommendations.length > 0) {
    report += '\n### Recommendations\n';
    for (const rec of analysis.recommendations) {
      report += `- ${rec}\n`;
    }
  }

  return report;
}

export {
  Dependency,
  EnvVariable,
  DependencyAnalysis,
  DependencyWarning,
};