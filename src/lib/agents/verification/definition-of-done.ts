export interface ReviewResultSummary {
  status?: string;
  findings?: Array<{
    id: string;
    severity: string;
    category?: string;
    file?: string;
    description: string;
  }>;
  summary?: string;
}

export interface LintResultSummary {
  passedCount: number;
  failedCount: number;
  totalFiles: number;
}

export interface CompletionEvaluation {
  done: boolean;
  reason: string;
  linterClean: boolean;
  reviewPassed: boolean;
  highSeverityCount: number;
}

/**
 * Evaluates whether a generated project satisfies the Definition of Done.
 * Requires:
 * 1. Zero failing files in Tester linter verification
 * 2. Reviewer status is PASS (or no HIGH severity findings)
 * 3. At least one code file was produced
 */
export function evaluateCompletion(
  lintSummary: LintResultSummary,
  reviewSummary?: ReviewResultSummary
): CompletionEvaluation {
  const linterClean = lintSummary.failedCount === 0 && lintSummary.totalFiles > 0;
  
  const highSeverityFindings = (reviewSummary?.findings || []).filter(
    (f) => f.severity === 'HIGH'
  );
  const highSeverityCount = highSeverityFindings.length;

  const reviewPassed = reviewSummary
    ? (reviewSummary.status === 'PASS' || highSeverityCount === 0)
    : true;

  if (!linterClean) {
    return {
      done: false,
      reason: `Linter verification failed: ${lintSummary.failedCount}/${lintSummary.totalFiles} files have syntax/type errors.`,
      linterClean,
      reviewPassed,
      highSeverityCount,
    };
  }

  if (!reviewPassed) {
    return {
      done: false,
      reason: `Reviewer quality gate failed: Found ${highSeverityCount} HIGH severity issue(s).`,
      linterClean,
      reviewPassed,
      highSeverityCount,
    };
  }

  return {
    done: true,
    reason: `Definition of Done satisfied cleanly. ${lintSummary.passedCount} file(s) verified with 0 linter errors and 0 HIGH severity review findings.`,
    linterClean: true,
    reviewPassed: true,
    highSeverityCount: 0,
  };
}
