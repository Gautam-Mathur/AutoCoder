import { prisma } from '../../db';
import { createContentHash } from './contracts/fingerprints';
import { runLinter, runCrossFileImportCheck } from './linter';
import { validateGeneratedProject } from './project-validator';
import { runInference, cleanJsonResponse } from '../inference';
import { AGENT_DEFS } from './agents';
import { listVirtualFiles, readVirtualFile, writeVirtualFile, applyDiff } from './vfs';

const MAX_DEBUG_CYCLES = 3;

export interface VerificationResult {
  runId: string;
  cycle: number;
  workspaceFingerprint: string;
  success: boolean;
  failures: Array<{
    file: string;
    message: string;
    code?: string;
  }>;
}

export async function computeWorkspaceFingerprint(conversationId: string): Promise<string> {
  const records = await prisma.virtualFile.findMany({
    where: { conversationId },
    orderBy: { filePath: 'asc' },
  });
  return createContentHash(JSON.stringify(records.map((f) => ({ path: f.filePath, content: f.content }))));
}

export async function runFullWorkspaceTester(
  conversationId: string,
  cycle: number
): Promise<VerificationResult> {
  const fingerprint = await computeWorkspaceFingerprint(conversationId);
  const failures: Array<{ file: string; message: string; code?: string }> = [];

  try {
    const virtualFiles = await prisma.virtualFile.findMany({
      where: { conversationId },
    });

    const fileMap = new Map<string, string>();
    for (const vf of virtualFiles) {
      fileMap.set(vf.filePath.replace(/\\/g, '/'), vf.content);
    }

    // 1. Run Linter on all files
    for (const vf of virtualFiles) {
      const linterResult = await runLinter(conversationId, vf.filePath);
      if (!linterResult.success) {
        for (const err of linterResult.errors) {
          failures.push({ file: vf.filePath, message: err.message });
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

export async function verifyAndRepairWorkspace(
  conversationId: string,
  pipelineRunId: string,
  userPrompt: string,
  emit: (evt: any) => void,
  executionSignal?: AbortSignal
): Promise<void> {
  const seenHashes = new Map<string, Set<string>>();

  for (let cycle = 1; cycle <= MAX_DEBUG_CYCLES; cycle++) {
    emit({
      type: 'AGENT_START',
      agent: 'Tester',
      message: `Running workspace verification cycle ${cycle}/${MAX_DEBUG_CYCLES}...`,
    });

    const testResult = await runFullWorkspaceTester(conversationId, cycle);

    await prisma.verificationRun.create({
      data: {
        conversationId,
        pipelineRunId,
        cycle,
        workspaceHash: testResult.workspaceFingerprint,
        success: testResult.success,
        failuresJson: JSON.stringify(testResult.failures),
        warningsJson: JSON.stringify([]),
      },
    });

    if (testResult.success) {
      emit({
        type: 'AGENT_COMPLETE',
        agent: 'Tester',
        message: `Workspace verification passed on cycle ${cycle}.`,
      });
      return;
    }

    emit({
      type: 'AGENT_LOG',
      agent: 'Tester',
      message: `Cycle ${cycle} found ${testResult.failures.length} verification error(s).`,
    });

    if (cycle === MAX_DEBUG_CYCLES) {
      throw new Error(`Workspace verification failed after ${MAX_DEBUG_CYCLES} cycles. Failures: ${testResult.failures.map((f) => f.message).join('; ')}`);
    }

    emit({
      type: 'AGENT_START',
      agent: 'Debugger',
      message: `Launching Debugger repair cycle ${cycle}...`,
    });

    // Run Debugger repair cycle
    const failuresSummary = testResult.failures.map((f) => `- [${f.file}] ${f.message}`).join('\n');
    const prompt = `Fix the following workspace errors found in verification cycle ${cycle}:\n${failuresSummary}\n\nUser Goal:\n${userPrompt}\n\nOutput repaired files as JSON object: {"patches": [{"file": "src/App.tsx", "startLine": 1, "endLine": 10, "replacement": "..."}]} OR {"files": [{"path": "src/App.tsx", "content": "..."}]}`;

    const debugResponse = await runInference(
      [
        { role: 'system', content: AGENT_DEFS.Debugger.systemPrompt || '' },
        { role: 'user', content: prompt },
      ],
      { signal: executionSignal }
    );

    // Apply repairs to VFS
    let appliedRepair = false;
    if (debugResponse) {
      try {
        const cleaned = cleanJsonResponse(debugResponse);
        const parsed = JSON.parse(cleaned);

        if (parsed && Array.isArray(parsed.patches) && parsed.patches.length > 0) {
          for (const patch of parsed.patches) {
            if (patch.file && patch.startLine && patch.endLine && patch.replacement !== undefined) {
              await applyDiff(conversationId, patch.file, patch.startLine, patch.endLine, patch.replacement);
              appliedRepair = true;
            }
          }
        }

        if (parsed && Array.isArray(parsed.files) && parsed.files.length > 0) {
          for (const file of parsed.files) {
            if (file.path && file.content !== undefined) {
              await writeVirtualFile(conversationId, file.path, file.content);
              appliedRepair = true;
            }
          }
        }
      } catch (e) {
        // Fallback: check if failure referenced specific file
        const targetFail = testResult.failures.find((f) => f.file && f.file !== 'imports' && f.file !== 'project' && f.file !== 'tester');
        if (targetFail && targetFail.file) {
          await writeVirtualFile(conversationId, targetFail.file, debugResponse);
          appliedRepair = true;
        }
      }
    }

    const postFingerprint = await computeWorkspaceFingerprint(conversationId);
    if (testResult.workspaceFingerprint === postFingerprint && !appliedRepair) {
      emit({
        type: 'AGENT_LOG',
        agent: 'Debugger',
        message: `⚠️ Debugger repair output produced no changes to workspace fingerprint.`,
      });
    }

    // Oscillation check & patch application
    const vFiles = await prisma.virtualFile.findMany({ where: { conversationId } });
    for (const vf of vFiles) {
      const contentHash = createContentHash(vf.content);
      const hashes = seenHashes.get(vf.filePath) || new Set<string>();
      if (hashes.has(contentHash) && hashes.size >= 2) {
        throw new Error(`Repair oscillation detected for file ${vf.filePath}. Stopping verification loop.`);
      }
      hashes.add(contentHash);
      seenHashes.set(vf.filePath, hashes);
    }

    emit({
      type: 'AGENT_COMPLETE',
      agent: 'Debugger',
      message: `Debugger repair cycle ${cycle} completed. Re-running Tester verification...`,
    });
  }
}
