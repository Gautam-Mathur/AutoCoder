import { ContractValidation } from './spec-contract';
import { BlueprintGraphValidation } from './orchestrator';
import { ProjectValidationResult } from './project-validator';
import { DependencyValidationResult } from './dependency-validator';
import { PrismaValidationResult } from './prisma-validator';
import { ApiContractValidationResult } from './api-contract-validator';
import { FrameworkValidationResult } from './framework-validator';
import { RuntimeTestResult } from './runtime-validator';
import { SecurityGateResult } from './security-gate';

export type QualityGateStatus = 'PASS' | 'REPAIR_REQUIRED' | 'BLOCKED';

export interface QualityGateEvaluationInput {
  specValidation?: ContractValidation;
  blueprintValidation?: BlueprintGraphValidation;
  projectValidation?: ProjectValidationResult;
  packageValidation?: DependencyValidationResult;
  prismaValidation?: PrismaValidationResult;
  apiValidation?: ApiContractValidationResult;
  frameworkValidation?: FrameworkValidationResult;
  runtimeValidation?: RuntimeTestResult;
  securityValidation?: SecurityGateResult;
}

export interface QualityGateResult {
  status: QualityGateStatus;
  passed: boolean;
  score: number; // 0 - 100
  blockingReasons: string[];
  warnings: string[];
  summary: {
    specsValid: boolean;
    blueprintValid: boolean;
    projectCompiles: boolean;
    packagesValid: boolean;
    prismaValid: boolean;
    apiContractsValid: boolean;
    frameworkBoundariesValid: boolean;
    runtimeProbesValid: boolean;
    securityGatePassed: boolean;
  };
}

/**
 * Consolidates all deterministic verification results into an authoritative Quality Gate evaluation.
 */
export function evaluateQualityGate(input: QualityGateEvaluationInput): QualityGateResult {
  const blockingReasons: string[] = [];
  const warnings: string[] = [];

  const specsValid = input.specValidation ? input.specValidation.valid : false;
  const blueprintValid = input.blueprintValidation ? input.blueprintValidation.valid : false;
  const projectCompiles = input.projectValidation ? input.projectValidation.success : false;
  const packagesValid = input.packageValidation ? input.packageValidation.valid : false;
  const prismaValid = input.prismaValidation ? input.prismaValidation.valid : true; // Optional if no DB
  const apiContractsValid = input.apiValidation ? input.apiValidation.valid : true; // Optional if no API
  const frameworkBoundariesValid = input.frameworkValidation ? input.frameworkValidation.valid : false;
  const runtimeProbesValid = input.runtimeValidation ? input.runtimeValidation.success : true; // Optional structural probe
  const securityGatePassed = input.securityValidation ? input.securityValidation.passed : false;

  if (!input.specValidation) blockingReasons.push('Verification Incomplete: Spec contract validation was NOT_RUN.');
  if (!input.blueprintValidation) blockingReasons.push('Verification Incomplete: Blueprint graph validation was NOT_RUN.');
  if (!input.projectValidation) blockingReasons.push('Verification Incomplete: TypeScript project compilation was NOT_RUN.');
  if (!input.packageValidation) blockingReasons.push('Verification Incomplete: Package dependency validation was NOT_RUN.');
  if (!input.frameworkValidation) blockingReasons.push('Verification Incomplete: Framework boundary validation was NOT_RUN.');
  if (!input.securityValidation) blockingReasons.push('Verification Incomplete: Security gate check was NOT_RUN.');

  // Collect Spec Contract Errors
  if (input.specValidation && !input.specValidation.valid) {
    for (const e of input.specValidation.errors) blockingReasons.push(`Spec Contradiction: ${e}`);
    for (const w of input.specValidation.warnings) warnings.push(`Spec Warning: ${w}`);
  }

  // Collect Blueprint Errors
  if (input.blueprintValidation && !input.blueprintValidation.valid) {
    for (const e of input.blueprintValidation.errors) blockingReasons.push(`Blueprint Graph Error: ${e}`);
    for (const w of input.blueprintValidation.warnings) warnings.push(`Blueprint Warning: ${w}`);
  }

  // Collect Project Compilation Errors
  if (input.projectValidation && !input.projectValidation.success) {
    for (const e of input.projectValidation.errors) {
      blockingReasons.push(`TypeScript Compile Error (${e.file}:${e.line}): ${e.message}`);
    }
  }

  // Collect Package Dependencies Errors
  if (input.packageValidation && !input.packageValidation.valid) {
    for (const mp of input.packageValidation.missingPackages) {
      blockingReasons.push(`Missing NPM Package: Import references package "${mp}" which is missing in package.json.`);
    }
  }

  // Collect Prisma Database Contract Errors
  if (input.prismaValidation && !input.prismaValidation.valid) {
    for (const e of input.prismaValidation.errors) {
      blockingReasons.push(`Prisma DB Contract Error (${e.file}:${e.line}): ${e.message}`);
    }
  }

  // Collect API Contract Errors
  if (input.apiValidation && !input.apiValidation.valid) {
    for (const e of input.apiValidation.errors) {
      blockingReasons.push(`API Contract Error (${e.endpoint}): ${e.message}`);
    }
  }

  // Collect Framework & Next.js Boundary Errors
  if (input.frameworkValidation && !input.frameworkValidation.valid) {
    for (const e of input.frameworkValidation.errors) {
      blockingReasons.push(`Framework Boundary Error (${e.file}): ${e.message}`);
    }
  }

  // Collect Runtime Probe Errors
  if (input.runtimeValidation && !input.runtimeValidation.success) {
    for (const e of input.runtimeValidation.errors) {
      blockingReasons.push(`Runtime Probe Failure: ${e}`);
    }
  }

  // Collect Security Gate Blocking Findings
  if (input.securityValidation && !input.securityValidation.passed) {
    for (const f of input.securityValidation.blocking) {
      blockingReasons.push(`Security Hard Block (${f.file}:${f.line}): ${f.message}`);
    }
    for (const w of input.securityValidation.warnings) {
      warnings.push(`Security Warning (${w.file}:${w.line}): ${w.message}`);
    }
  }

  let status: QualityGateStatus = 'PASS';
  if (blockingReasons.length > 0) {
    const hasFatal = blockingReasons.some(r => r.includes('Spec Contradiction') || r.includes('Security Hard Block') || r.includes('Blueprint Graph Error') || r.includes('Verification Incomplete'));
    status = hasFatal ? 'BLOCKED' : 'REPAIR_REQUIRED';
  }

  const passedChecks = [
    specsValid,
    blueprintValid,
    projectCompiles,
    packagesValid,
    prismaValid,
    apiContractsValid,
    frameworkBoundariesValid,
    runtimeProbesValid,
    securityGatePassed,
  ].filter(Boolean).length;

  const score = Math.round((passedChecks / 9) * 100);

  return {
    status,
    passed: status === 'PASS' && blockingReasons.length === 0,
    score,
    blockingReasons,
    warnings,
    summary: {
      specsValid,
      blueprintValid,
      projectCompiles,
      packagesValid,
      prismaValid,
      apiContractsValid,
      frameworkBoundariesValid,
      runtimeProbesValid,
      securityGatePassed,
    },
  };
}
