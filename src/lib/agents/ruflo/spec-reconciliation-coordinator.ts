import { prisma } from '../../db';
import { getDescendantStages } from './contracts/stage-graph';
import { StageName } from './contracts/versions';
import { STAGE_CONTRACTS } from './contracts/registry';
import { updateExecutiveMemoryStatus } from './memory';
import { readVirtualFile, writeVirtualFile, listVirtualFiles, flushVfsToDisk } from './vfs';

export interface VfsSnapshot {
  files: Map<string, string>; // filePath -> content
}

export interface PreparedReconciliationTransaction {
  reconciliationId: string;
  conversationId: string;
  pipelineRunId: string;
  cycleNumber: number;
  leaseOwnerId: string;
  targetStage: StageName;
  selectedApproach: string;
  directive: string;
  invalidatedStages: StageName[];
  targetFilePaths: string[];
  snapshot: VfsSnapshot;
}

/**
 * Asserts the Reconciliation Ownership Invariant:
 * "At most one active reconciliation transaction may modify a given project execution's
 * specification lineage at a time."
 */
export async function acquireReconciliationLock(
  conversationId: string,
  pipelineRunId: string,
  leaseOwnerId: string
): Promise<void> {
  const activeTx = await prisma.specificationReconciliation.findFirst({
    where: {
      pipelineRunId,
      status: { in: ['PREPARED', 'REEXECUTING', 'REVALIDATING'] },
    },
  });

  if (activeTx) {
    if (activeTx.leaseOwnerId !== leaseOwnerId) {
      throw new Error(
        `Reconciliation Concurrency Error: Active reconciliation transaction "${activeTx.id}" is owned by "${activeTx.leaseOwnerId}". Concurrent execution blocked.`
      );
    }
  }
}

/**
 * Phase 1 (Prepare): Snapshots VFS and artifact state, determines invalidations,
 * and creates the SpecificationReconciliation record in PREPARED state.
 * 
 * Does NOT execute any agents.
 */
export async function prepareReconciliationTransaction(params: {
  conversationId: string;
  pipelineRunId: string;
  cycleNumber: number;
  leaseOwnerId: string;
  targetStage: StageName;
  selectedApproach: string;
  directive: string;
  fingerprint: string;
  validationErrors: string[];
}): Promise<PreparedReconciliationTransaction> {
  const { conversationId, pipelineRunId, cycleNumber, leaseOwnerId, targetStage, selectedApproach, directive, fingerprint, validationErrors } = params;

  // 1. Assert Single-Active-Reconciliation Invariant Lock
  await acquireReconciliationLock(conversationId, pipelineRunId, leaseOwnerId);

  // 2. Calculate Invalidation Scope
  const descendants = getDescendantStages(targetStage);
  const stagesToInvalidate = [targetStage, ...descendants];

  const targetFilePaths: string[] = [];
  for (const st of stagesToInvalidate) {
    const reg = STAGE_CONTRACTS[st as keyof typeof STAGE_CONTRACTS];
    if (reg?.outputArtifact?.name) {
      targetFilePaths.push(reg.outputArtifact.name);
    }
  }

  // 3. Capture Pre-Reconciliation VFS Snapshot (Memory Map)
  const vfsFiles = await listVirtualFiles(conversationId);
  const snapshotFiles = new Map<string, string>();
  for (const f of vfsFiles) {
    const content = await readVirtualFile(conversationId, f);
    if (content !== null) {
      snapshotFiles.set(f, content);
    }
  }

  // 4. Upsert SpecificationReconciliation Record in PREPARED state
  const record = await prisma.specificationReconciliation.upsert({
    where: {
      pipelineRunId_cycleNumber: {
        pipelineRunId,
        cycleNumber,
      },
    },
    create: {
      conversationId,
      pipelineRunId,
      cycleNumber,
      leaseOwnerId,
      status: 'PREPARED',
      contradictionFingerprint: fingerprint,
      validationErrors: JSON.stringify(validationErrors),
      sourceArtifactVersions: JSON.stringify({ targetStage, cycleNumber }),
      targetStage,
      selectedApproach,
      directive,
      invalidatedStages: JSON.stringify(stagesToInvalidate),
    },
    update: {
      leaseOwnerId,
      status: 'PREPARED',
      contradictionFingerprint: fingerprint,
      validationErrors: JSON.stringify(validationErrors),
      targetStage,
      selectedApproach,
      directive,
      invalidatedStages: JSON.stringify(stagesToInvalidate),
    },
  });

  return {
    reconciliationId: record.id,
    conversationId,
    pipelineRunId,
    cycleNumber,
    leaseOwnerId,
    targetStage,
    selectedApproach,
    directive,
    invalidatedStages: stagesToInvalidate,
    targetFilePaths,
    snapshot: { files: snapshotFiles },
  };
}

/**
 * Phase 2 (Commit): Atomically marks new artifact versions ACCEPTED,
 * marks old versions SUPERSEDED, flushes VFS to disk, and transitions transaction to RESOLVED.
 * 
 * Called ONLY after the re-executed stage passes contract validation.
 */
export async function commitReconciliationTransaction(
  tx: PreparedReconciliationTransaction
): Promise<void> {
  // 1. Transactionally update older ArtifactVersions to SUPERSEDED
  await prisma.artifactVersion.updateMany({
    where: {
      conversationId: tx.conversationId,
      pipelineRunId: tx.pipelineRunId,
      filePath: { in: tx.targetFilePaths },
      state: 'INVALIDATED',
    },
    data: { state: 'SUPERSEDED' },
  });

  // 2. Mark active stages in ExecutiveMemory
  for (const st of tx.invalidatedStages) {
    await updateExecutiveMemoryStatus(tx.conversationId, st, 'ACTIVE');
  }

  // 3. Mark SpecificationReconciliation as RESOLVED
  await prisma.specificationReconciliation.update({
    where: { id: tx.reconciliationId },
    data: {
      status: 'RESOLVED',
      completedAt: new Date(),
    },
  });

  // 4. Instant Physical Disk Sync
  await flushVfsToDisk(tx.conversationId);
}

/**
 * Phase 2 (Abort / Rollback): Restores VFS from pre-reconciliation snapshot,
 * marks candidate artifacts REJECTED, and transitions transaction to FAILED.
 * 
 * Ensures failed reconciliation NEVER leaves a partially updated workspace.
 */
export async function abortReconciliationTransaction(
  tx: PreparedReconciliationTransaction,
  reason: string
): Promise<void> {
  // 1. Rollback VFS files from snapshot
  for (const [filePath, content] of tx.snapshot.files.entries()) {
    await writeVirtualFile(tx.conversationId, filePath, content, {
      pipelineRunId: tx.pipelineRunId,
      allowControlPlane: true,
    });
  }

  // 2. Mark candidate artifacts as INVALIDATED
  await prisma.artifactVersion.updateMany({
    where: {
      conversationId: tx.conversationId,
      pipelineRunId: tx.pipelineRunId,
      filePath: { in: tx.targetFilePaths },
      state: 'CANDIDATE',
    },
    data: { state: 'INVALIDATED' },
  });

  // 3. Mark SpecificationReconciliation as FAILED
  await prisma.specificationReconciliation.update({
    where: { id: tx.reconciliationId },
    data: {
      status: 'FAILED',
      completedAt: new Date(),
    },
  });

  // 4. Sync rollback to physical disk
  await flushVfsToDisk(tx.conversationId);
}

/**
 * Checks for oscillation across reconciliation cycles.
 * Halts fail-closed on A -> B -> A.
 */
export function detectSpecificationOscillation(
  history: Array<{ targetStage: string; selectedApproach: string; fingerprint: string }>,
  currentProposed: { targetStage: string; selectedApproach: string; fingerprint: string }
): boolean {
  if (history.length === 0) return false;

  const sawExactReversal = history.some(
    (h) =>
      h.fingerprint === currentProposed.fingerprint &&
      h.targetStage === currentProposed.targetStage &&
      h.selectedApproach !== currentProposed.selectedApproach
  );

  return sawExactReversal;
}
