import path from 'path';
import { prisma } from '../../db';
import { createContentHash } from './contracts/fingerprints';
import { runLinter, runCrossFileImportCheck } from './linter';
import { validateGeneratedProject } from './project-validator';
import { isControlPlaneArtifact, normalizeProjectPath } from './workspace-policy';
import { validatePackageDependencies } from './dependency-validator';
import { validateApiContracts } from './api-contract-validator';
import { validateFrameworkBoundaries } from './framework-validator';
import { validatePrismaUsage } from './prisma-validator';
import { extractProjectContract } from './spec-contract';
import { executeProjectBuild, executeProjectRuntimeSmokeTest, executeStaticFrontendSmokeTest } from './runtime-validator';
import { validateDomContracts } from './dom-contract-validator';
import { readVirtualFile, flushVfsToDisk } from './vfs';

const MAX_DEBUG_CYCLES = 10;

export interface VerificationFailure {
  file: string;
  message: string;
  code?: string;
}

export interface ValidatorDiagnostic {
  name: string;
  applicable: boolean;
  executed: boolean;
  status: 'PASS' | 'FAIL' | 'NOT_APPLICABLE' | 'NOT_EXECUTED';
  errors: string[];
  warnings: string[];
}

export interface VerificationTelemetry {
  staticStatus: 'PASS' | 'FAIL' | 'NOT_EXECUTED';
  buildStatus: 'PASS' | 'FAIL' | 'NOT_APPLICABLE' | 'NOT_EXECUTED';
  runtimeStatus: 'PASS' | 'FAIL' | 'NOT_APPLICABLE' | 'NOT_EXECUTED';
  overallStatus: 'PASS' | 'FAIL' | 'INCOMPLETE';
  validators: ValidatorDiagnostic[];
  notes: string[];
}

export interface VerificationResult {
  runId: string;
  cycle: number;
  workspaceFingerprint: string;
  success: boolean;
  failures: VerificationFailure[];
  telemetry?: VerificationTelemetry;
}

export async function computeWorkspaceFingerprint(conversationId: string): Promise<string> {
  const records = await prisma.virtualFile.findMany({
    where: { conversationId },
    orderBy: { filePath: 'asc' },
  });
  const projectRecords = records.filter(
    (f) => !isControlPlaneArtifact(normalizeProjectPath(f.filePath))
  );
  return createContentHash(
    JSON.stringify(
      projectRecords.map((f) => ({
        path: normalizeProjectPath(f.filePath),
        content: f.content,
      }))
    )
  );
}

export function detectProjectFramework(
  files: Record<string, string>,
  declaredFramework?: string
): 'NEXT_APP_ROUTER' | 'NEXT_PAGES_ROUTER' | 'VITE_SPA' | 'REACT_WEBPACK_SPA' | 'STATIC_HTML' {
  if (
    declaredFramework &&
    ['NEXT_APP_ROUTER', 'NEXT_PAGES_ROUTER', 'VITE_SPA', 'REACT_WEBPACK_SPA', 'STATIC_HTML'].includes(
      declaredFramework
    )
  ) {
    return declaredFramework as any;
  }
  const filePaths = Object.keys(files).map((f) => f.replace(/\\/g, '/').replace(/^\.\//, ''));
  if (filePaths.some((f) => f.startsWith('app/') || f.startsWith('src/app/'))) return 'NEXT_APP_ROUTER';
  if (filePaths.some((f) => f.startsWith('pages/') || f.startsWith('src/pages/'))) return 'NEXT_PAGES_ROUTER';
  if (filePaths.some((f) => f.includes('vite.config'))) return 'VITE_SPA';
  if (files['package.json'] && files['package.json'].includes('webpack')) return 'REACT_WEBPACK_SPA';
  return 'STATIC_HTML';
}

export async function runFullWorkspaceTester(
  conversationId: string,
  cycle: number
): Promise<VerificationResult & { telemetry: VerificationTelemetry }> {
  const fingerprint = await computeWorkspaceFingerprint(conversationId);
  const failures: VerificationFailure[] = [];
  const notes: string[] = [];
  const validatorReports: ValidatorDiagnostic[] = [];

  const virtualFiles = await prisma.virtualFile.findMany({
    where: { conversationId },
  });

  const projectFiles = virtualFiles.filter(
    (vf) => !isControlPlaneArtifact(normalizeProjectPath(vf.filePath))
  );

  const fileMap = new Map<string, string>();
  const fileObj: Record<string, string> = {};
  for (const vf of projectFiles) {
    const norm = normalizeProjectPath(vf.filePath);
    fileMap.set(norm, vf.content);
    fileObj[norm] = vf.content;
  }

  // 1. File-level Linter & Syntax Checks
  for (const vf of projectFiles) {
    const norm = normalizeProjectPath(vf.filePath);
    try {
      const linterResult = await runLinter(conversationId, norm);
      if (!linterResult.success) {
        for (const err of linterResult.errors) {
          failures.push({ file: norm, message: err.message });
        }
      }
    } catch (e: any) {
      failures.push({ file: norm, message: `Linter execution failed: ${e?.message || e}` });
    }
  }

  // 2. TypeScript-backed Cross-File Import / Export Validation
  try {
    const importCheck = runCrossFileImportCheck(fileMap);
    if (!importCheck.success) {
      for (const err of importCheck.errors) {
        failures.push({ file: 'imports', message: err.message });
      }
    }
  } catch (e: any) {
    failures.push({ file: 'imports', message: `Import validation exception: ${e?.message || e}` });
  }

  // 3. Project Structure & AST-based Hook Validation
  try {
    const projectVal = await validateGeneratedProject(conversationId);
    if (!projectVal.success) {
      for (const err of projectVal.errors) {
        failures.push({ file: err.file || 'project', message: err.message });
      }
    }
  } catch (e: any) {
    failures.push({ file: 'project', message: `Project validation exception: ${e?.message || e}` });
  }

  // 4. Semantic Dependency Validation (Exact Signature Match: vfsFiles, packageJsonContent)
  const packageJsonContent = fileObj['package.json'];
  if (packageJsonContent) {
    try {
      const depVal = validatePackageDependencies(fileObj, packageJsonContent);
      if (!depVal.valid) {
        for (const missing of depVal.missingPackages) {
          failures.push({
            file: 'package.json',
            message: `Package "${missing}" is imported in code but missing from dependencies in package.json.`,
          });
        }
      }
      validatorReports.push({
        name: 'Dependency Validation',
        applicable: true,
        executed: true,
        status: depVal.valid ? 'PASS' : 'FAIL',
        errors: depVal.missingPackages.map((p) => `Missing package "${p}"`),
        warnings: depVal.warnings,
      });
    } catch (e: any) {
      failures.push({ file: 'package.json', message: `Dependency validation exception: ${e?.message || e}` });
      validatorReports.push({
        name: 'Dependency Validation',
        applicable: true,
        executed: false,
        status: 'FAIL',
        errors: [e?.message || String(e)],
        warnings: [],
      });
    }
  } else {
    validatorReports.push({
      name: 'Dependency Validation',
      applicable: false,
      executed: false,
      status: 'NOT_APPLICABLE',
      errors: [],
      warnings: [],
    });
  }

  // 5. Semantic Framework Boundaries (Exact Signature Match: vfsFiles, detectedFramework)
  try {
    const detectedFw = detectProjectFramework(fileObj);
    const fwVal = validateFrameworkBoundaries(fileObj, detectedFw);
    if (!fwVal.valid) {
      for (const err of fwVal.errors) {
        failures.push({ file: err.file, message: err.message });
      }
    }
    validatorReports.push({
      name: 'Framework Boundaries',
      applicable: true,
      executed: true,
      status: fwVal.valid ? 'PASS' : 'FAIL',
      errors: fwVal.errors.map((e) => e.message),
      warnings: fwVal.warnings.map((w) => w.message),
    });
  } catch (e: any) {
    failures.push({ file: 'framework', message: `Framework validation exception: ${e?.message || e}` });
    validatorReports.push({
      name: 'Framework Boundaries',
      applicable: true,
      executed: false,
      status: 'FAIL',
      errors: [e?.message || String(e)],
      warnings: [],
    });
  }

  // 6. Semantic Prisma Database Validation (Exact Signature Match: vfsFiles, schemaContent)
  const schemaContent = fileObj['prisma/schema.prisma'];
  const hasPrismaQuery = Object.values(fileObj).some((c) => /prisma\.[A-Za-z0-9_]+\./.test(c));
  if (schemaContent || hasPrismaQuery) {
    try {
      const prismaVal = validatePrismaUsage(fileObj, schemaContent || '');
      if (!prismaVal.valid) {
        for (const err of prismaVal.errors) {
          failures.push({ file: err.file, message: err.message });
        }
      }
      validatorReports.push({
        name: 'Prisma Validation',
        applicable: true,
        executed: true,
        status: prismaVal.valid ? 'PASS' : 'FAIL',
        errors: prismaVal.errors.map((e) => e.message),
        warnings: prismaVal.warnings.map((w) => w.message),
      });
    } catch (e: any) {
      failures.push({ file: 'prisma', message: `Prisma validation exception: ${e?.message || e}` });
      validatorReports.push({
        name: 'Prisma Validation',
        applicable: true,
        executed: false,
        status: 'FAIL',
        errors: [e?.message || String(e)],
        warnings: [],
      });
    }
  } else {
    validatorReports.push({
      name: 'Prisma Validation',
      applicable: false,
      executed: false,
      status: 'NOT_APPLICABLE',
      errors: [],
      warnings: [],
    });
  }

  // 7. Semantic API Contract Validation (Exact Signature Match: ProjectContract, vfsFiles)
  const backendSpec = await readVirtualFile(conversationId, 'backend_spec.md');
  const archSpec = await readVirtualFile(conversationId, 'architecture.md');
  if (backendSpec) {
    try {
      const extractedContract = extractProjectContract({
        'backend_spec.md': backendSpec,
        'architecture.md': archSpec || '',
      });
      if (extractedContract.apiEndpoints && extractedContract.apiEndpoints.length > 0) {
        const apiVal = validateApiContracts(extractedContract, fileObj);
        if (!apiVal.valid) {
          for (const err of apiVal.errors) {
            failures.push({
              file: err.file || 'api',
              message: `API Contract Violation for ${err.method} ${err.endpoint}: ${err.message}`,
            });
          }
        }
        validatorReports.push({
          name: 'API Contract Validation',
          applicable: true,
          executed: true,
          status: apiVal.valid ? 'PASS' : 'FAIL',
          errors: apiVal.errors.map((e) => e.message),
          warnings: apiVal.warnings.map((w) => w.message),
        });
      } else {
        validatorReports.push({
          name: 'API Contract Validation',
          applicable: false,
          executed: false,
          status: 'NOT_APPLICABLE',
          errors: [],
          warnings: [],
        });
      }
    } catch (e: any) {
      failures.push({ file: 'api', message: `API contract validation exception: ${e?.message || e}` });
      validatorReports.push({
        name: 'API Contract Validation',
        applicable: true,
        executed: false,
        status: 'FAIL',
        errors: [e?.message || String(e)],
        warnings: [],
      });
    }
  } else {
    validatorReports.push({
      name: 'API Contract Validation',
      applicable: false,
      executed: false,
      status: 'NOT_APPLICABLE',
      errors: [],
      warnings: [],
    });
  }

  // 7b. Semantic DOM Contract Validation (parse5 & css-what AST validation)
  let domIncomplete = false;
  try {
    const domResult = validateDomContracts(fileObj);
    if (domResult.status !== 'NOT_APPLICABLE') {
      if (domResult.status === 'FAIL') {
        for (const f of domResult.failures) {
          failures.push(f);
        }
      } else if (domResult.status === 'INCOMPLETE') {
        domIncomplete = true;
        notes.push(...domResult.details);
      }
      validatorReports.push({
        name: 'DOM Contract Validation',
        applicable: true,
        executed: true,
        status: domResult.status === 'FAIL' ? 'FAIL' : domResult.status === 'INCOMPLETE' ? 'NOT_EXECUTED' : 'PASS',
        errors: domResult.failures.map((f) => f.message),
        warnings: domResult.details,
      });
    } else {
      validatorReports.push({
        name: 'DOM Contract Validation',
        applicable: false,
        executed: false,
        status: 'NOT_APPLICABLE',
        errors: [],
        warnings: [],
      });
    }
  } catch (e: any) {
    failures.push({ file: 'dom', message: `DOM contract validation exception: ${e?.message || e}` });
    validatorReports.push({
      name: 'DOM Contract Validation',
      applicable: true,
      executed: false,
      status: 'FAIL',
      errors: [e?.message || String(e)],
      warnings: [],
    });
  }

  const staticStatus: 'PASS' | 'FAIL' = failures.length === 0 ? 'PASS' : 'FAIL';

  // 8. Physical Execution Verification Pipeline
  let isBuildApplicable = false;
  let isRuntimeApplicable = false;
  let isStaticFrontend = false;

  if (packageJsonContent) {
    try {
      const parsedPkg = JSON.parse(packageJsonContent);
      isBuildApplicable = Boolean(parsedPkg.scripts?.build);
      isRuntimeApplicable =
        Boolean(
          parsedPkg.scripts?.start ||
          parsedPkg.scripts?.dev ||
          parsedPkg.scripts?.serve ||
          parsedPkg.scripts?.preview
        ) ||
        Boolean(fileObj['server.js'] || fileObj['src/server.ts'] || fileObj['server/index.js']);
    } catch {}
  }

  // If there is an index.html and no backend server scripts, this is a static frontend project
  if (!isRuntimeApplicable && Boolean(fileObj['index.html'])) {
    isRuntimeApplicable = true;
    isStaticFrontend = true;
  }

  let buildStatus: 'PASS' | 'FAIL' | 'NOT_APPLICABLE' | 'NOT_EXECUTED' = isBuildApplicable
    ? 'NOT_EXECUTED'
    : 'NOT_APPLICABLE';
  let runtimeStatus: 'PASS' | 'FAIL' | 'NOT_APPLICABLE' | 'NOT_EXECUTED' = isRuntimeApplicable
    ? 'NOT_EXECUTED'
    : 'NOT_APPLICABLE';

  // Hydrate physical disk before running execution commands
  if (isBuildApplicable || isRuntimeApplicable) {
    await flushVfsToDisk(conversationId);
  }

  // 8a. Execute Production Build
  if (isBuildApplicable) {
    const buildRes = await executeProjectBuild(conversationId);
    if (buildRes.executed) {
      if (buildRes.success) {
        buildStatus = 'PASS';
        notes.push(`Production build verified successfully via "${buildRes.command}".`);
      } else {
        buildStatus = 'FAIL';
        failures.push({
          file: 'build',
          message: `Production build command "${buildRes.command}" failed (exit code ${buildRes.exitCode}): ${
            buildRes.stderr.slice(0, 300) || buildRes.stdout.slice(0, 300)
          }`,
        });
      }
    } else {
      buildStatus = 'NOT_EXECUTED';
      notes.push(`Build was applicable but could not be executed: ${buildRes.error}`);
    }
  }

  // 8b. Execute Runtime Smoke Test
  if (isRuntimeApplicable) {
    if (buildStatus === 'FAIL') {
      runtimeStatus = 'FAIL';
      failures.push({
        file: 'runtime',
        message: 'Runtime smoke test skipped because production build failed.',
      });
    } else if (buildStatus === 'PASS' || !isBuildApplicable) {
      if (isStaticFrontend) {
        const projectDir = path.join(process.cwd(), 'projects', conversationId);
        const staticRes = await executeStaticFrontendSmokeTest({
          conversationId,
          projectDir,
          entryFile: 'index.html',
        });
        if (staticRes.executed) {
          if (staticRes.success) {
            runtimeStatus = 'PASS';
            notes.push(`Headless Chrome static frontend smoke test passed cleanly (${staticRes.logs}).`);
          } else {
            runtimeStatus = 'FAIL';
            failures.push({
              file: 'runtime',
              message: staticRes.error || 'Static frontend runtime smoke test failed.',
            });
          }
        } else {
          runtimeStatus = 'NOT_EXECUTED';
          notes.push(`Static frontend smoke test was applicable but could not be executed: ${staticRes.error}`);
        }
      } else {
        const routesToProbe = ['/'];
        if (backendSpec) {
          const contract = extractProjectContract({ 'backend_spec.md': backendSpec });
          for (const ep of contract.apiEndpoints || []) {
            if (ep.method.toUpperCase() === 'GET') {
              routesToProbe.push(ep.path);
            }
          }
        }

        const runtimeRes = await executeProjectRuntimeSmokeTest(conversationId, routesToProbe);
        if (runtimeRes.executed) {
          if (runtimeRes.success) {
            runtimeStatus = 'PASS';
            notes.push(`Runtime HTTP smoke test passed across ${runtimeRes.probedRoutes.length} route(s).`);
          } else {
            runtimeStatus = 'FAIL';
            const failingRoutes = runtimeRes.probedRoutes.filter((r) => !r.ok);
            failures.push({
              file: 'runtime',
              message: `Runtime smoke test failed: ${
                failingRoutes.map((r) => `${r.route} returned HTTP ${r.status}`).join(', ') || runtimeRes.error
              }`,
            });
          }
        } else {
          runtimeStatus = 'NOT_EXECUTED';
          notes.push(`Runtime smoke test was applicable but could not be executed: ${runtimeRes.error}`);
        }
      }
    } else {
      runtimeStatus = 'NOT_EXECUTED';
    }
  }

  // 8c. Strict Mandatory Conjunction & Overall Status Determination:
  // - PASS: static passed AND all applicable execution checks passed cleanly AND DOM contracts complete.
  // - FAIL: any static or execution check failed.
  // - INCOMPLETE: required build, runtime execution, or DOM contract stages could not be completely verified.
  let overallStatus: 'PASS' | 'FAIL' | 'INCOMPLETE';

  if (staticStatus === 'FAIL' || buildStatus === 'FAIL' || runtimeStatus === 'FAIL') {
    overallStatus = 'FAIL';
  } else if (
    domIncomplete ||
    (isBuildApplicable && buildStatus === 'NOT_EXECUTED') ||
    (isRuntimeApplicable && runtimeStatus === 'NOT_EXECUTED')
  ) {
    overallStatus = 'INCOMPLETE';
    if (domIncomplete) {
      notes.push('Static DOM contract validation reported INCOMPLETE (dynamic selectors or unlinked scripts detected).');
    }
    if (
      (isBuildApplicable && buildStatus === 'NOT_EXECUTED') ||
      (isRuntimeApplicable && runtimeStatus === 'NOT_EXECUTED')
    ) {
      notes.push('Mandatory build or runtime execution could not be verified in this environment.');
    }
  } else if (
    staticStatus === 'PASS' &&
    (!isBuildApplicable || buildStatus === 'PASS') &&
    (!isRuntimeApplicable || runtimeStatus === 'PASS')
  ) {
    overallStatus = 'PASS';
  } else {
    overallStatus = 'INCOMPLETE';
  }

  // CRITICAL INVARIANT: Overall success is true IF AND ONLY IF overallStatus is strictly 'PASS'.
  // Under NO circumstances can an INCOMPLETE or unexecuted verification result in success: true.
  const success = overallStatus === 'PASS';

  return {
    runId: `run-${Date.now()}-${cycle}`,
    cycle,
    workspaceFingerprint: fingerprint,
    success,
    failures,
    telemetry: {
      staticStatus,
      buildStatus,
      runtimeStatus,
      overallStatus,
      validators: validatorReports,
      notes,
    },
  };
}

export async function runDeterministicTesterReport(params: {
  conversationId: string;
  pipelineRunId: string;
  stageExecutionId: string;
  cycle?: number;
}): Promise<{ content: string; success: boolean; verificationRunId: string; workspaceHash: string }> {
  const { conversationId, pipelineRunId, stageExecutionId, cycle = 1 } = params;
  const testResult = await runFullWorkspaceTester(conversationId, cycle);

  const runRecord = await prisma.verificationRun.create({
    data: {
      conversationId,
      pipelineRunId,
      stageExecutionId,
      cycle: testResult.cycle,
      workspaceHash: testResult.workspaceFingerprint,
      success: testResult.success, // false on INCOMPLETE or FAIL; true ONLY on PASS
      failuresJson: JSON.stringify(testResult.failures),
      warningsJson: JSON.stringify([]),
    },
  });

  const failuresList = testResult.failures.length === 0
    ? 'None'
    : testResult.failures
        .map((f) => `- [${f.file}] ${String(f.message || '').replace(/\s*\r?\n\s*/g, ' | ')}`)
        .join('\n');

  const depValidator = testResult.telemetry.validators.find((v) => v.name === 'Dependency Validation');
  const depStatusLabel = depValidator
    ? depValidator.status
    : (testResult.failures.some((f) => f.file === 'package.json') ? 'FAIL' : 'PASS');

  // Exact Result token output: PASS | FAIL | INCOMPLETE
  const resultToken: 'PASS' | 'FAIL' | 'INCOMPLETE' = testResult.telemetry.overallStatus;

  const content = `# Test Report

### Result
${resultToken}

### Summary
Verification run ${runRecord.id} completed on cycle ${testResult.cycle} with status ${testResult.telemetry.overallStatus}. Workspace fingerprint ${testResult.workspaceFingerprint}. ${
    testResult.telemetry.overallStatus === 'PASS'
      ? 'All applicable static, semantic, and execution verification checks passed cleanly.'
      : testResult.telemetry.overallStatus === 'INCOMPLETE'
      ? 'Mandatory verification checks (build, runtime, or static DOM contracts) could not be completely verified. Overall status is INCOMPLETE.'
      : `Found ${testResult.failures.length} error(s).`
  }

### Verification Levels
- Static Analysis: ${testResult.telemetry.staticStatus}
- Build Execution: ${testResult.telemetry.buildStatus}
- Runtime Smoke Test: ${testResult.telemetry.runtimeStatus}
- Overall Result: ${testResult.telemetry.overallStatus}
${testResult.telemetry.notes.map((n) => `> Note: ${n}`).join('\n')}

### Semantic Validators
${testResult.telemetry.validators.map((v) => `- ${v.name}: ${v.status}`).join('\n')}

### Tests
- Project File Linter: ${testResult.failures.some((f) => !['imports', 'project', 'package.json', 'build', 'runtime'].includes(f.file)) ? 'FAIL' : 'PASS'}
- Cross-File Imports: ${testResult.failures.some((f) => f.file === 'imports') ? 'FAIL' : 'PASS'}
- Project Structure: ${testResult.failures.some((f) => f.file === 'project') ? 'FAIL' : 'PASS'}
- Dependency Validation: ${depStatusLabel}
- Production Build: ${testResult.telemetry.buildStatus}
- Runtime Smoke Test: ${testResult.telemetry.runtimeStatus}

### Failures
${failuresList}

### Workspace Hash
${testResult.workspaceFingerprint}

### Verification Run ID
${runRecord.id}
`;

  return {
    content,
    success: testResult.success,
    verificationRunId: runRecord.id,
    workspaceHash: testResult.workspaceFingerprint,
  };
}

export async function verifyAndRepairWorkspace(
  conversationId: string,
  pipelineRunId: string,
  executeStageFn: (stageName: string, customInput?: string, targetFile?: string) => Promise<any>,
  emit: (evt: any) => void,
  options?: {
    authorizedFileSet?: any;
    loadAuthorizedFileSetFn?: (conversationId: string, pipelineRunId: string) => Promise<any>;
    maxCycles?: number;
  }
): Promise<void> {
  const { coordinateRepair } = await import('./repair-coordinator');
  return coordinateRepair({
    conversationId,
    pipelineRunId,
    executeStageFn,
    emit,
    maxCycles: options?.maxCycles ?? MAX_DEBUG_CYCLES,
    authorizedFileSet: options?.authorizedFileSet,
    loadAuthorizedFileSetFn: options?.loadAuthorizedFileSetFn,
  });
}
