import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../../../db';
import { writeVirtualFile, flushVfsToDisk, verifyVfsDiskParity } from '../vfs';

const convId = `vfs-parity-${Date.now()}`;
const runId = `run-${Date.now()}`;

describe('VFS SQLite <-> Disk Parity Boundary', () => {
  after(async () => {
    await prisma.virtualFile.deleteMany({ where: { conversationId: convId } }).catch(() => {});
    await prisma.pipelineRun.deleteMany({ where: { conversationId: convId } }).catch(() => {});
    await prisma.conversation.deleteMany({ where: { id: convId } }).catch(() => {});
    const projDir = path.join(process.cwd(), 'projects', convId);
    fs.rmSync(projDir, { recursive: true, force: true });
  });

  test('verifyVfsDiskParity detects disk drift and flushVfsToDisk restores exact parity', async () => {
    await prisma.conversation.create({
      data: { id: convId, title: 'VFS Parity Test', status: 'Active', currentStage: 'Planner' },
    });
    await prisma.pipelineRun.create({
      data: { id: runId, conversationId: convId, state: 'RUNNING', currentStage: 'Planner' },
    });

    await writeVirtualFile(convId, 'plan.md', '# Project Plan\nOriginal canonical content\n', {
      pipelineRunId: runId,
      allowControlPlane: true,
    });

    const initialParity = await verifyVfsDiskParity(convId);
    assert.equal(initialParity.inSync, true);
    assert.equal(initialParity.checkedCount, 1);

    // Simulate external disk drift/corruption
    const diskPath = path.join(process.cwd(), 'projects', convId, 'plan.md');
    fs.writeFileSync(diskPath, '# Drifted stale disk copy\n', 'utf8');

    const driftedParity = await verifyVfsDiskParity(convId);
    assert.equal(driftedParity.inSync, false);
    assert.deepEqual(driftedParity.drifted, ['plan.md']);

    // flushVfsToDisk must restore authoritative SQLite content onto disk
    await flushVfsToDisk(convId);
    const restoredParity = await verifyVfsDiskParity(convId);
    assert.equal(restoredParity.inSync, true);
    assert.deepEqual(restoredParity.drifted, []);
  });
});
