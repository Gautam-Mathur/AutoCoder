import { prisma } from '../../db';
import { createContentHash } from './contracts/fingerprints';
import { runLinter, runCrossFileImportCheck } from './linter';
import { validateGeneratedProject } from './project-validator';
import { isControlPlaneArtifact, normalizeProjectPath } from './workspace-policy';

const MAX_DEBUG_CYCLES = 3;

export interface VerificationFailure {
  file: string;
  message: string;
  code?: string;
}

export interface VerificationResult {
  runId: string;
  cycle: number;
  workspaceFingerprint: string;
  success: boolean;
  failures: VerificationFailure[];
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

export async function runFullWorkspaceTester(
  conversationId: string,
  cycle: number
): Promise<VerificationResult> {
  const fingerprint = await computeWorkspaceFingerprint(conversationId);
  const failures: VerificationFailure[] = [];

  try {
    const virtualFiles = await prisma.virtualFile.findMany({
      where: { conversationId },
    });

    const projectFiles = virtualFiles.filter(
      (vf) => !isControlPlaneArtifact(normalizeProjectPath(vf.filePath))
    );

    const fileMap = new Map<string, string>();
    for (const vf of projectFiles) {
      fileMap.set(normalizeProjectPath(vf.filePath), vf.content);
    }

    // 1. Run Linter on project files
    for (const vf of projectFiles) {
      const norm = normalizeProjectPath(vf.filePath);
      const linterResult = await runLinter(conversationId, norm);
      if (!linterResult.success) {
        for (const err of linterResult.errors) {
          failures.push({ file: norm, message: err.message });
        }
      }
    }

    // 2. Cross file import check
    const importResult = runCrossFileImportCheck(fileMap);
    if (!importResult.success) {
      for (const err of importResult.errors) {
        failures.push({ file: 'imports', message: err.message });
      }
    }

    // 3. Project validation
    const projectVal = await validateGeneratedProject(conversationId);
    if (!projectVal.success) {
      for (const err of projectVal.errors) {
        failures.push({ file: err.file || 'project', message: err.message });
      }
    }
  } catch (err: any) {
    failures.push({ file: 'tester', message: err.message });
  }

  const success = failures.length === 0;

  return {
    runId: `run-${Date.now()}-${cycle}`,
    cycle,
    workspaceFingerprint: fingerprint,
    success,
    failures,
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
      success: testResult.success,
      failuresJson: JSON.stringify(testResult.failures),
      warningsJson: JSON.stringify([]),
    },
  });

  const failuresList = testResult.success
    ? 'None'
    : testResult.failures.map((f) => `- [${f.file}] ${f.message}`).join('\n');

  const content = `# Test Report

### Result
${testResult.success ? 'PASS' : 'FAIL'}

### Summary
Verification run ${runRecord.id} completed on cycle ${testResult.cycle}. Workspace fingerprint ${testResult.workspaceFingerprint}. ${
    testResult.success ? 'All automated verification checks passed cleanly.' : `Found ${testResult.failures.length} error(s).`
  }

### Tests
- Project File Linter: ${testResult.failures.some((f) => f.file !== 'imports' && f.file !== 'project' && f.file !== 'tester') ? 'FAIL' : 'PASS'}
- Cross-File Import Analysis: ${testResult.failures.some((f) => f.file === 'imports') ? 'FAIL' : 'PASS'}
- Full Project Structural Validation: ${testResult.failures.some((f) => f.file === 'project') ? 'FAIL' : 'PASS'}

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
  executeStageFn: (stageName: string, customInput?: string) => Promise<any>,
  emit: (evt: any) => void
): Promise<void> {
  for (let cycle = 1; cycle <= MAX_DEBUG_CYCLES; cycle++) {
    emit({
      type: 'AGENT_START',
      agent: 'Tester',
      message: `Running deterministic workspace verification cycle ${cycle}/${MAX_DEBUG_CYCLES}...`,
    });

    const testerResult = await executeStageFn('Tester');
    if (!testerResult || testerResult.status !== 'ACCEPTED') {
      throw new Error(`Tester execution failed on cycle ${cycle}.`);
    }

    const isPass = testerResult.content.includes('### Result\nPASS') || testerResult.content.includes('### Result\n\nPASS');

    if (isPass) {
      emit({
        type: 'AGENT_COMPLETE',
        agent: 'Tester',
        message: `Workspace verification passed cleanly on cycle ${cycle}.`,
      });
      return;
    }

    if (cycle === MAX_DEBUG_CYCLES) {
      throw new Error(`Workspace verification failed after ${MAX_DEBUG_CYCLES} debug repair cycles.`);
    }

    emit({
      type: 'AGENT_START',
      agent: 'Debugger',
      message: `Launching Debugger repair cycle ${cycle}...`,
    });

    const debugResult = await executeStageFn('Debugger', testerResult.content);
    if (!debugResult || debugResult.status !== 'ACCEPTED') {
      throw new Error(`Debugger repair execution failed on cycle ${cycle}.`);
    }

    emit({
      type: 'AGENT_COMPLETE',
      agent: 'Debugger',
      message: `Debugger repair cycle ${cycle} completed. Re-running Tester verification...`,
    });
  }
}
