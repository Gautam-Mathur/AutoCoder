import { runInference, cleanJsonResponse } from '../inference';
import { ProjectContract } from './contracts';
import { determineBackendTopology, BackendTopologyDecision } from './backend-topology';

export interface PermittedResolutionStrategy {
  strategy: 'ALIGN_TO_ARCHITECTURE' | 'UPGRADE_ARCHITECTURE' | 'REFINE_REQUIREMENTS';
  targetStage: 'Planner' | 'Architect' | 'System';
  description: string;
}

export interface ArbitrationDecision {
  selectedApproach: 'ALIGN_TO_ARCHITECTURE' | 'UPGRADE_ARCHITECTURE' | 'REFINE_REQUIREMENTS';
  targetStage: 'Planner' | 'Architect' | 'System';
  reasoning: string;
  reconciliationDirective: string;
  isFallback: boolean;
}

/**
 * Deterministically computes permitted resolution strategies based on User Intent Invariants.
 */
export function computePermittedStrategies(
  userPromptText: string,
  specs: Record<string, string>,
  contract: ProjectContract,
  validationErrors: string[]
): {
  permitted: PermittedResolutionStrategy[];
  topology: BackendTopologyDecision;
} {
  const topology = determineBackendTopology(userPromptText, specs, contract.framework);
  const permitted: PermittedResolutionStrategy[] = [];

  const authError = validationErrors.some((e) => /authentication/i.test(e));
  const endpointError = validationErrors.some((e) => /endpoint|backend topology/i.test(e));

  if (topology.status === 'REQUIRED') {
    // If user prompt demanded a backend/auth, architecture MUST be upgraded; downscaling to none is strictly FORBIDDEN.
    permitted.push({
      strategy: 'UPGRADE_ARCHITECTURE',
      targetStage: 'Architect',
      description: 'Upgrade architecture.md to declare required backend services, auth mechanisms, and modules.',
    });
  } else if (topology.status === 'FORBIDDEN') {
    // If user prompt forbade backends, downstream specs MUST align to architecture; upgrading is strictly FORBIDDEN.
    permitted.push({
      strategy: 'ALIGN_TO_ARCHITECTURE',
      targetStage: 'System',
      description: 'Align backend_spec.md by removing API routes and declaring "### No Backend Required".',
    });
    if (authError) {
      permitted.push({
        strategy: 'REFINE_REQUIREMENTS',
        targetStage: 'Planner',
        description: 'Clarify in plan.md and requirements.md that login/authentication is client-side mock only.',
      });
    }
  } else {
    // Optional / Mockable: Both paths are technically feasible. Let arbitrator choose.
    permitted.push(
      {
        strategy: 'ALIGN_TO_ARCHITECTURE',
        targetStage: 'System',
        description: 'Honor static architecture; strip backend routes and use client mocks.',
      },
      {
        strategy: 'UPGRADE_ARCHITECTURE',
        targetStage: 'Architect',
        description: 'Upgrade architecture to provide the services requested in requirements.',
      }
    );
  }

  return { permitted, topology };
}

/**
 * Executes constrained collective arbitration via Ollama, strictly bounded by permitted strategies.
 */
export async function arbitrateSpecificationContradiction(params: {
  userPromptText: string;
  specs: Record<string, string>;
  contract: ProjectContract;
  validationErrors: string[];
  signal?: AbortSignal;
}): Promise<ArbitrationDecision> {
  const { permitted, topology } = computePermittedStrategies(
    params.userPromptText,
    params.specs,
    params.contract,
    params.validationErrors
  );

  // If only 1 strategy is permissible under user invariants, return immediately without LLM invocation.
  if (permitted.length === 1) {
    const single = permitted[0];
    return {
      selectedApproach: single.strategy,
      targetStage: single.targetStage,
      reasoning: `Deterministic Prompt Invariant enforced: ${single.description} (Topology: ${topology.status})`,
      reconciliationDirective: generateDeterministicDirective(single.strategy, single.targetStage, params.validationErrors),
      isFallback: false,
    };
  }

  // Multi-option permitted: Consult Ollama with a strict JSON format schema
  try {
    const systemPrompt = `You are the AutoCoder Specification Contradiction Arbitrator.
A contradiction was caught between project specification artifacts.
Your job is to select the BEST approach strictly from the list of PERMITTED RESOLUTIONS.

PERMITTED RESOLUTIONS:
${JSON.stringify(permitted, null, 2)}

You MUST respond ONLY with a valid JSON object matching this exact schema:
{
  "selectedApproach": "ALIGN_TO_ARCHITECTURE" | "UPGRADE_ARCHITECTURE" | "REFINE_REQUIREMENTS",
  "targetStage": "Planner" | "Architect" | "System",
  "reasoning": "A concise explanation of why this choice best honors user prompt intent and technical feasibility.",
  "reconciliationDirective": "Clear, authoritative markdown instructions for the target agent on how to update their artifact."
}
Do NOT output codeblocks, markdown fences, or extra text. Output raw JSON only.`;

    const userMessage = `User Request: "${params.userPromptText}"
Validation Errors:
${params.validationErrors.map((e) => `- ${e}`).join('\n')}

Plan Summary: ${params.specs['plan.md']?.slice(0, 300) || 'None'}
Architecture Summary: ${params.specs['architecture.md']?.slice(0, 400) || 'None'}
Backend Spec Summary: ${params.specs['backend_spec.md']?.slice(0, 300) || 'None'}`;

    const responseText = await runInference(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      {
        temperature: 0.1,
        format: 'json',
        timeoutMs: 60000,
        signal: params.signal,
      }
    );

    const cleaned = cleanJsonResponse(responseText);
    const parsed = JSON.parse(cleaned);

    // Guardrail Check: Verify the model selected an approach from the PERMITTED set
    const isValidSelection = permitted.some(
      (p) => p.strategy === parsed.selectedApproach && p.targetStage === parsed.targetStage
    );

    if (isValidSelection && parsed.reconciliationDirective) {
      return {
        selectedApproach: parsed.selectedApproach,
        targetStage: parsed.targetStage,
        reasoning: parsed.reasoning || 'Ollama selected optimal strategy within deterministic bounds.',
        reconciliationDirective: parsed.reconciliationDirective,
        isFallback: false,
      };
    }
  } catch (err) {
    // Model timeout, offline, or JSON parse error -> fall through to safe fallback
  }

  // Fail-Safe Fallback: Pick first permitted strategy
  const fallback = permitted[0];
  return {
    selectedApproach: fallback.strategy,
    targetStage: fallback.targetStage,
    reasoning: `Fail-safe fallback selected deterministic strategy: ${fallback.description}`,
    reconciliationDirective: generateDeterministicDirective(fallback.strategy, fallback.targetStage, params.validationErrors),
    isFallback: true,
  };
}

function generateDeterministicDirective(
  strategy: string,
  targetStage: string,
  errors: string[]
): string {
  if (strategy === 'ALIGN_TO_ARCHITECTURE' && targetStage === 'System') {
    return `[SPECIFICATION CONTRADICTION RECONCILIATION DIRECTIVE]:
The specification contract validator identified a contradiction:
${errors.map((e) => `- ${e}`).join('\n')}

Directive: Upstream architecture.md declares no backend or no authentication.
You MUST update backend_spec.md to declare "### No Backend Required" and remove all protected endpoints.`;
  }

  if (strategy === 'UPGRADE_ARCHITECTURE' && targetStage === 'Architect') {
    return `[SPECIFICATION CONTRADICTION RECONCILIATION DIRECTIVE]:
The specification contract validator identified a contradiction:
${errors.map((e) => `- ${e}`).join('\n')}

Directive: Upstream user requirements demand server-side features.
You MUST update architecture.md to include the necessary backend runtime, database engine, authentication mechanism, and owned files.`;
  }

  return `[SPECIFICATION CONTRADICTION RECONCILIATION DIRECTIVE]:
Update specification to resolve: ${errors.join('; ')}`;
}
