/**
 * Quality Scoring Engine
 *
 * Scores each generated file on a 0-100 scale across multiple quality dimensions:
 * - Error handling coverage
 * - Type safety
 * - Completeness (all expected patterns present)
 * - Consistency with project conventions
 * - Security practices
 * - Performance patterns
 *
 * Aggregates into an overall project quality score and flags files below threshold
 * for potential regeneration.
 */

import type { ConsistencyReport } from './cross-file-validator.js';
import type { HardeningReport } from './code-hardening-pass.js';
import type { TypeContractReport } from './type-contract-verifier.js';
import type { AntiPatternReport } from './anti-pattern-scanner.js';

interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

export interface FileQualityScore {
  path: string;
  overall: number;
  dimensions: {
    errorHandling: number;
    typeSafety: number;
    completeness: number;
    consistency: number;
    security: number;
    performance: number;
  };
  issues: string[];
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  flaggedForRegeneration: boolean;
}

export interface ProjectQualityScore {
  overall: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  fileScores: FileQualityScore[];
  flaggedFiles: string[];
  dimensions: {
    errorHandling: number;
    typeSafety: number;
    completeness: number;
    consistency: number;
    security: number;
    performance: number;
  };
  summary: string;
  recommendations: string[];
}

export interface QualityPassResults {
  consistency?: ConsistencyReport;
  hardening?: HardeningReport;
  typeContracts?: TypeContractReport;
  antiPatterns?: AntiPatternReport;
}

const REGEN_THRESHOLD = 45;

function scoreToGrade(score: number): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 95) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function scoreErrorHandling(content: string, filePath: string): number {
  let score = 70;
  const isComponent = filePath.endsWith('.tsx');
  const isBackend = filePath.includes('server/') || filePath.includes('routes');

  if (isBackend) {
    const routeCount = (content.match(/app\.(get|post|put|patch|delete)\s*\(/g) || []).length;
    const tryCatchCount = (content.match(/\btry\s*\{/g) || []).length;
    if (routeCount > 0) {
      const ratio = tryCatchCount / routeCount;
      score += Math.min(20, ratio * 20);
    }
    if (/res\.status\s*\(\s*5\d\d\s*\)/.test(content)) score += 5;
    if (/res\.status\s*\(\s*4\d\d\s*\)/.test(content)) score += 5;
  }

  if (isComponent) {
    if (content.includes('isLoading') || content.includes('isPending')) score += 10;
    if (content.includes('error') && /if\s*\(\s*error\s*\)/.test(content)) score += 10;
    if (content.includes('.catch(') || content.includes('onError')) score += 5;
    if (content.includes('ErrorBoundary') || content.includes('errorElement')) score += 5;
  }

  return Math.min(100, score);
}

function scoreTypeSafety(content: string, filePath: string): number {
  let score = 70;

  const anyCount = (content.match(/:\s*any\b/g) || []).length;
  score -= anyCount * 5;

  if (/:\s*(string|number|boolean|Record|Array|Map|Set)\b/.test(content)) score += 5;
  if (content.includes('interface ') || content.includes('type ')) score += 5;

  if (filePath.endsWith('.tsx')) {
    if (/:\s*React\.FC|:\s*FC</.test(content)) score += 5;
    if (content.includes('Props') || content.includes('Props {')) score += 5;
  }

  if (content.includes('import type') || content.includes('import { type')) score += 5;

  const castCount = (content.match(/as\s+\w+/g) || []).length;
  score -= Math.min(15, castCount * 3);

  return Math.max(0, Math.min(100, score));
}

function scoreCompleteness(content: string, filePath: string): number {
  let score = 60;
  const isComponent = filePath.endsWith('.tsx');
  const isBackend = filePath.includes('server/') || filePath.includes('routes');

  if (content.includes('export ')) score += 5;
  if (content.length > 50) score += 5;

  if (isComponent) {
    if (content.includes('return') && content.includes('<')) score += 5;
    if (content.includes('useQuery') || content.includes('useMutation') || content.includes('useState')) score += 5;
    if (content.includes('className=')) score += 5;
    if (content.includes('data-testid')) score += 5;
    if (/Loading|Spinner|Skeleton/.test(content)) score += 5;
    if (/empty|no\s+\w+\s+found|nothing/i.test(content)) score += 5;
  }

  if (isBackend) {
    if (/app\.(get|post|put|patch|delete)/.test(content)) score += 5;
    if (/res\.status/.test(content)) score += 5;
    if (/res\.json/.test(content)) score += 5;
    if (content.includes('validation') || content.includes('.parse(')) score += 5;
  }

  return Math.min(100, score);
}

function scoreConsistency(content: string, filePath: string): number {
  let score = 75;

  const usesConst = (content.match(/\bconst\s/g) || []).length;
  const usesLet = (content.match(/\blet\s/g) || []).length;
  const usesVar = (content.match(/\bvar\s/g) || []).length;

  if (usesVar > 0) score -= 10;
  if (usesConst > 0 && usesLet === 0 && usesVar === 0) score += 10;

  if (filePath.endsWith('.tsx')) {
    const arrowFns = (content.match(/=>\s*\{/g) || []).length;
    const regularFns = (content.match(/function\s+\w/g) || []).length;
    if (arrowFns > 0 && regularFns > 3) score -= 5;
  }

  const singleQuotes = (content.match(/'/g) || []).length;
  const doubleQuotes = (content.match(/"/g) || []).length;

  if (/import\s.*from\s+'/.test(content) && /import\s.*from\s+"/.test(content)) {
    score -= 5;
  }

  const todoCount = (content.match(/\/\/\s*TODO/gi) || []).length;
  score -= todoCount * 3;

  return Math.max(0, Math.min(100, score));
}

function scoreSecurity(content: string, filePath: string): number {
  let score = 80;
  const isBackend = filePath.includes('server/') || filePath.includes('routes');

  if (isBackend) {
    if (/eval\s*\(/.test(content)) score -= 30;
    if (/innerHTML/.test(content)) score -= 15;
    if (/password|secret|token|key/i.test(content) && /console\.log/.test(content)) score -= 20;
    if (content.includes('SQL') && !/parameterized|prepared|\$\d|\?/.test(content)) {
      if (/\+\s*req\./.test(content) || /\$\{req\./.test(content)) score -= 20;
    }
    if (content.includes('cors(') && content.includes("origin: '*'")) score -= 10;
    if (content.includes('.parse(') || content.includes('validate')) score += 5;
    if (content.includes('sanitize') || content.includes('escape')) score += 5;
  }

  if (filePath.endsWith('.tsx')) {
    if (content.includes('dangerouslySetInnerHTML')) score -= 15;
    if (content.includes('eval(')) score -= 30;
  }

  return Math.max(0, Math.min(100, score));
}

function scorePerformance(content: string, filePath: string): number {
  let score = 75;
  const isComponent = filePath.endsWith('.tsx');

  if (isComponent) {
    if (content.includes('useMemo') || content.includes('useCallback')) score += 5;
    if (content.includes('React.lazy') || content.includes('lazy(')) score += 5;
    if (content.includes('virtualiz') || content.includes('useVirtual')) score += 5;
    if (/useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*\}\s*\)/.test(content)) {
      score -= 5;
    }
    const rerenderRisks = (content.match(/new\s+(?:Object|Array|Map|Set)\s*\(/g) || []).length;
    score -= Math.min(10, rerenderRisks * 3);
  }

  if (filePath.includes('server/') || filePath.includes('routes')) {
    if (content.includes('pagination') || content.includes('limit') && content.includes('offset')) score += 5;
    if (content.includes('cache') || content.includes('Cache')) score += 5;
    if (content.includes('index') || content.includes('INDEX')) score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

function scoreFile(file: GeneratedFile): FileQualityScore {
  const dimensions = {
    errorHandling: scoreErrorHandling(file.content, file.path),
    typeSafety: scoreTypeSafety(file.content, file.path),
    completeness: scoreCompleteness(file.content, file.path),
    consistency: scoreConsistency(file.content, file.path),
    security: scoreSecurity(file.content, file.path),
    performance: scorePerformance(file.content, file.path),
  };

  const weights = {
    errorHandling: 0.20,
    typeSafety: 0.20,
    completeness: 0.20,
    consistency: 0.15,
    security: 0.15,
    performance: 0.10,
  };

  const overall = Math.round(
    dimensions.errorHandling * weights.errorHandling +
    dimensions.typeSafety * weights.typeSafety +
    dimensions.completeness * weights.completeness +
    dimensions.consistency * weights.consistency +
    dimensions.security * weights.security +
    dimensions.performance * weights.performance
  );

  const issues: string[] = [];
  if (dimensions.errorHandling < 50) issues.push('Weak error handling');
  if (dimensions.typeSafety < 50) issues.push('Type safety concerns');
  if (dimensions.completeness < 50) issues.push('Incomplete implementation');
  if (dimensions.consistency < 50) issues.push('Inconsistent code style');
  if (dimensions.security < 50) issues.push('Security concerns');
  if (dimensions.performance < 50) issues.push('Performance concerns');

  return {
    path: file.path,
    overall,
    dimensions,
    issues,
    grade: scoreToGrade(overall),
    flaggedForRegeneration: overall < REGEN_THRESHOLD,
  };
}

export function scoreProjectQuality(
  files: GeneratedFile[],
  passResults?: QualityPassResults
): ProjectQualityScore {
  const codeFiles = files.filter(f =>
    f.path.endsWith('.ts') || f.path.endsWith('.tsx')
  );

  const fileScores = codeFiles.map(f => scoreFile(f));

  if (fileScores.length === 0) {
    return {
      overall: 0,
      grade: 'F',
      fileScores: [],
      flaggedFiles: [],
      dimensions: { errorHandling: 0, typeSafety: 0, completeness: 0, consistency: 0, security: 0, performance: 0 },
      summary: 'No code files to score',
      recommendations: [],
    };
  }

  const avgDimension = (dim: keyof FileQualityScore['dimensions']) =>
    Math.round(fileScores.reduce((sum, s) => sum + s.dimensions[dim], 0) / fileScores.length);

  const dimensions = {
    errorHandling: avgDimension('errorHandling'),
    typeSafety: avgDimension('typeSafety'),
    completeness: avgDimension('completeness'),
    consistency: avgDimension('consistency'),
    security: avgDimension('security'),
    performance: avgDimension('performance'),
  };

  let overall = Math.round(fileScores.reduce((sum, s) => sum + s.overall, 0) / fileScores.length);

  if (passResults) {
    let penalty = 0;
    if (passResults.consistency) {
      const errorIssues = passResults.consistency.issues.filter(i => i.severity === 'error').length;
      penalty += errorIssues * 2;
    }
    if (passResults.typeContracts) {
      const errorIssues = passResults.typeContracts.issues.filter(i => i.severity === 'error').length;
      penalty += errorIssues * 3;
    }
    if (passResults.antiPatterns) {
      const errorIssues = passResults.antiPatterns.issues.filter(i => i.severity === 'error').length;
      penalty += errorIssues * 2;
    }
    overall = Math.max(0, overall - Math.min(20, penalty));
  }

  const flaggedFiles = fileScores.filter(s => s.flaggedForRegeneration).map(s => s.path);

  const recommendations: string[] = [];
  if (dimensions.errorHandling < 60) recommendations.push('Add try/catch blocks to API calls and error states to components');
  if (dimensions.typeSafety < 60) recommendations.push('Replace "any" types with specific interfaces and add type annotations');
  if (dimensions.completeness < 60) recommendations.push('Ensure all components have loading, error, and empty states');
  if (dimensions.consistency < 60) recommendations.push('Standardize code style: use const, arrow functions, consistent quotes');
  if (dimensions.security < 60) recommendations.push('Add input validation, auth checks on sensitive routes, sanitize outputs');
  if (dimensions.performance < 60) recommendations.push('Add pagination to list endpoints, memoize expensive computations');
  if (flaggedFiles.length > 0) recommendations.push(`${flaggedFiles.length} files scored below ${REGEN_THRESHOLD} and may benefit from regeneration`);

  if (passResults?.antiPatterns) {
    const secIssues = passResults.antiPatterns.issues.filter(i => i.category === 'security' && i.severity === 'error');
    if (secIssues.length > 0) {
      recommendations.push(`Fix ${secIssues.length} security anti-patterns: ${secIssues.slice(0, 2).map(i => i.type).join(', ')}`);
    }
  }

  const gradeDistribution = fileScores.reduce((acc, s) => {
    acc[s.grade] = (acc[s.grade] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const gradeStr = Object.entries(gradeDistribution)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([grade, count]) => `${grade}: ${count}`)
    .join(', ');

  const summary = `Project Quality: ${scoreToGrade(overall)} (${overall}/100) | ${fileScores.length} files scored | Grades: ${gradeStr}${flaggedFiles.length > 0 ? ` | ${flaggedFiles.length} flagged for review` : ''}`;

  return {
    overall,
    grade: scoreToGrade(overall),
    fileScores,
    flaggedFiles,
    dimensions,
    summary,
    recommendations,
  };
}

export function formatQualityReport(score: ProjectQualityScore): string {
  const lines: string[] = [];

  lines.push(`## Quality Report: Grade ${score.grade} (${score.overall}/100)`);
  lines.push('');

  lines.push('| Dimension | Score |');
  lines.push('|-----------|-------|');
  for (const [dim, val] of Object.entries(score.dimensions)) {
    const dimName = dim.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
    const bar = '█'.repeat(Math.round(val / 10)) + '░'.repeat(10 - Math.round(val / 10));
    lines.push(`| ${dimName} | ${bar} ${val}/100 |`);
  }
  lines.push('');

  if (score.flaggedFiles.length > 0) {
    lines.push(`### Files Flagged for Review (${score.flaggedFiles.length})`);
    for (const file of score.flaggedFiles) {
      const fileScore = score.fileScores.find(s => s.path === file);
      lines.push(`- **${file}** — ${fileScore?.grade} (${fileScore?.overall}/100): ${fileScore?.issues.join(', ') || 'Below threshold'}`);
    }
    lines.push('');
  }

  if (score.recommendations.length > 0) {
    lines.push('### Recommendations');
    for (const rec of score.recommendations) {
      lines.push(`- ${rec}`);
    }
  }

  return lines.join('\n');
}