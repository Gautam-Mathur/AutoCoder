import { runInference } from '../inference';
import { writeHistoryLog, writeRichTelemetryLog } from './orchestrator';
import { StageLedger } from './memory';

export type FailureType = 
  | 'syntax'
  | 'compilation'
  | 'conflict'
  | 'performance'
  | 'quality'
  | 'test_failure';

export interface TriageResult {
  failureType: FailureType;
  specialistAgent: string;
  reproducibleLogs: string;
  contextHint: string;
}

/**
 * Event Dispatcher inspects validation logs/outputs and dispatches the issues to the correct specialist agent.
 */
export function dispatchFailureEvent(
  logs: string,
  stage: string
): TriageResult {
  const normalizedLogs = logs.toLowerCase();

  // 1. Check for specification / cross-contract conflicts
  if (
    normalizedLogs.includes('specificationconflict') || 
    normalizedLogs.includes('conflict detected') ||
    normalizedLogs.includes('mismatched')
  ) {
    return {
      failureType: 'conflict',
      specialistAgent: 'ConflictResolver', // Hypothetical cross-contract conflict agent
      reproducibleLogs: logs,
      contextHint: 'Analyze conflicts between system specifications, requirements database mapping, or UI layout rules.'
    };
  }

  // 2. Check for syntax/bracket mismatches
  if (
    normalizedLogs.includes('syntaxerror') ||
    normalizedLogs.includes('unexpected token') ||
    normalizedLogs.includes('unbalanced brackets') ||
    normalizedLogs.includes('bracket/parentheses mismatch')
  ) {
    return {
      failureType: 'syntax',
      specialistAgent: 'Debugger',
      reproducibleLogs: logs,
      contextHint: 'Perform bracket matching check and verify syntax constraints.'
    };
  }

  // 3. Check for TypeScript compilation errors
  if (
    normalizedLogs.includes('tsc error') ||
    normalizedLogs.includes('cannot find name') ||
    normalizedLogs.includes('property does not exist') ||
    normalizedLogs.includes('is not assignable to')
  ) {
    return {
      failureType: 'compilation',
      specialistAgent: 'Debugger',
      reproducibleLogs: logs,
      contextHint: 'Compile codebase with tsc diagnostics, target missing exports, invalid type signatures, or incorrect import routes.'
    };
  }

  // 4. Check for performance / query optimization problems
  if (
    normalizedLogs.includes('slow query') ||
    normalizedLogs.includes('out of memory') ||
    normalizedLogs.includes('performance warning') ||
    normalizedLogs.includes('large bundle')
  ) {
    return {
      failureType: 'performance',
      specialistAgent: 'OptimizationRefiner',
      reproducibleLogs: logs,
      contextHint: 'Examine bundle optimization parameters, query indices, or memory leaking references.'
    };
  }

  // 5. Check for code quality / linting rules alerts
  if (
    normalizedLogs.includes('eslint') ||
    normalizedLogs.includes('lint error') ||
    normalizedLogs.includes('unused variable') ||
    normalizedLogs.includes('deprecated')
  ) {
    return {
      failureType: 'quality',
      specialistAgent: 'RefactoringAdvisor',
      reproducibleLogs: logs,
      contextHint: 'Review code quality standards and apply clean code refactoring policies.'
    };
  }

  // 6. Default to Test Failure / general Debugger
  return {
    failureType: 'test_failure',
    specialistAgent: 'Debugger',
    reproducibleLogs: logs,
    contextHint: 'Execute root-cause analysis on test runner failure log and implement surgical repairs.'
  };
}

export async function executeSpecialistRecovery(
  conversationId: string,
  errorLog: string,
  failedFile: string,
  currentCode: string,
  ledger?: StageLedger
): Promise<{ file: string; patchCode: string }> {
  const specialistPrompt = `You are the Debugger Specialist. Analyze the failure: ${errorLog}
Target File: ${failedFile}
Current Code:
${currentCode}

Provide a targeted patch code to fix the defect. Output only JSON: {"file": "${failedFile}", "patchCode": "your_patched_code_here"}`;

  const startTime = Date.now();
  await writeHistoryLog(conversationId, 'SpecialistRecovery', 'Retrying', `Specialist Recovery started for target file: ${failedFile}`);

  try {
    const responseText = await runInference([
      { role: 'system', content: specialistPrompt }
    ], {
      temperature: 0.1,
      format: 'json'
    });

    const parsed = JSON.parse(responseText.trim());
    const durationMs = Date.now() - startTime;

    if (ledger) {
      await writeRichTelemetryLog({
        conversationId,
        agentName: 'SpecialistRecovery',
        status: 'Success',
        systemInstructions: specialistPrompt,
        userContent: `Target File: ${failedFile}\nError Log: ${errorLog}`,
        rawOutput: responseText,
        parsedJson: parsed,
        durationMs,
        attempt: 1,
        model: 'ollama/specialist-debugger',
        budget: 16384,
        timeoutMs: 300000,
        schema: { type: 'object', properties: { file: { type: 'string' }, patchCode: { type: 'string' } } },
        ledger
      });
    }

    await writeHistoryLog(conversationId, 'SpecialistRecovery', 'Success', `Specialist Recovery compiled surgical patch for ${failedFile} in ${durationMs}ms.`);

    return {
      file: parsed.file || failedFile,
      patchCode: parsed.patchCode || currentCode
    };
  } catch (err: any) {
    await writeHistoryLog(conversationId, 'SpecialistRecovery', 'Failed', `Specialist Recovery failed: ${err.message}`);
    return {
      file: failedFile,
      patchCode: currentCode
    };
  }
}

