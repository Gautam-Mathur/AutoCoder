import { describe, it } from 'node:test';
import assert from 'node:assert';
import { assertArtifactCompatibility, checkArtifactCompatibility, verifyArtifactConsumable } from '../compatibility';
import { getExpectedContractName, getExpectedContractVersion, commitAcceptedArtifact } from '../../artifact-store';
import { getTargetLanguagePolicy } from '../../orchestrator';
import { extractRepairPlanFromDebuggerOutput, normalizeFailures } from '../../repair-coordinator';

describe('Contract Compatibility', () => {
  it('passes when produced version is greater than or equal to minVersion', () => {
    const res = checkArtifactCompatibility({
      produced: { name: 'plan.md', contract: 'PlannerOutput', version: '1.0.0' },
      required: [{ name: 'plan.md', contract: 'PlannerOutput', minVersion: '1.0.0' }],
    });
    assert.strictEqual(res.compatible, true);
  });

  it('fails when produced version is less than minVersion', () => {
    const res = checkArtifactCompatibility({
      produced: { name: 'plan.md', contract: 'PlannerOutput', version: '0.9.0' },
      required: [{ name: 'plan.md', contract: 'PlannerOutput', minVersion: '1.0.0' }],
    });
    assert.strictEqual(res.compatible, false);
    assert.match(res.error || '', /Version mismatch/);
  });

  it('throws on assertArtifactCompatibility when incompatible', () => {
    assert.throws(
      () =>
        assertArtifactCompatibility({
          produced: { name: 'plan.md', contract: 'PlannerOutput', version: '0.9.0' },
          required: [{ name: 'plan.md', contract: 'PlannerOutput', minVersion: '1.0.0' }],
          stageName: 'Architect',
        }),
      /CONTRACT COMPATIBILITY ERROR/
    );
  });

  it('verifies artifact consumable conditions strictly', () => {
    const valid = verifyArtifactConsumable({
      name: 'plan.md',
      contract: 'PlannerOutput',
      version: '1.0.0',
      status: 'ACCEPTED',
      contentHash: 'hash1',
      persistedHash: 'hash1',
      dependencyFingerprint: 'fp1',
      currentDependencyFingerprint: 'fp1',
      artifactVersion: 1,
      expectedArtifactVersion: 1,
    });
    assert.strictEqual(valid.consumable, true);

    const invalidStatus = verifyArtifactConsumable({
      name: 'plan.md',
      contract: 'PlannerOutput',
      version: '1.0.0',
      status: 'CANDIDATE',
      contentHash: 'hash1',
      persistedHash: 'hash1',
      dependencyFingerprint: 'fp1',
      currentDependencyFingerprint: 'fp1',
      artifactVersion: 1,
      expectedArtifactVersion: 1,
    });
    assert.strictEqual(invalidStatus.consumable, false);
  });

  it('proves getExpectedContractName returns canonical names and rejects unknown stages (Patch B)', () => {
    assert.strictEqual(getExpectedContractName('Queen'), 'QueenOutput');
    assert.strictEqual(getExpectedContractName('Planner'), 'PlannerOutput');
    assert.strictEqual(getExpectedContractName('Architect'), 'ArchitectureOutput');
    assert.strictEqual(getExpectedContractName('System'), 'SystemOutput');
    assert.strictEqual(getExpectedContractName('Designer'), 'DesignerOutput');
    assert.strictEqual(getExpectedContractName('Blueprinter'), 'BlueprintOutput');
    assert.strictEqual(getExpectedContractName('Coder'), 'CoderOutput');
    assert.strictEqual(getExpectedContractName('Tester'), 'TesterOutput');
    assert.strictEqual(getExpectedContractName('Debugger'), 'DebuggerOutput');
    assert.strictEqual(getExpectedContractName('Security'), 'SecurityOutput');
    assert.strictEqual(getExpectedContractName('Reviewer'), 'ReviewerOutput');

    assert.throws(
      () => getExpectedContractName('NonExistentStage'),
      /Unknown stage "NonExistentStage" in contract registry/
    );
  });

  it('rejects conflicting contract names at persistence boundary with structured error (Patch B / RESUME-01)', async () => {
    await assert.rejects(
      async () => {
        await commitAcceptedArtifact({
          conversationId: 'dummy-conv',
          pipelineRunId: 'dummy-run',
          stage: 'Architect',
          filePath: 'architecture.md',
          content: '### Tech Stack\nReact\n',
          contractName: 'ArchitectureArtifact', // Legacy wrong name
        });
      },
      /Canonical Contract Conflict: Caller supplied contract name "ArchitectureArtifact" for stage "Architect", but canonical contract registry mandates "ArchitectureOutput"/
    );
  });

  it('determines language policy accurately by file extension (Patch SAFE-F2A)', () => {
    const jsPolicy = getTargetLanguagePolicy('src/app.js');
    assert.strictEqual(jsPolicy.language, 'javascript');
    assert.ok(jsPolicy.rules.some((r) => r.includes('ECMAScript')));
    assert.ok(jsPolicy.rules.some((r) => r.includes('as Type')));

    const tsPolicy = getTargetLanguagePolicy('src/app.ts');
    assert.strictEqual(tsPolicy.language, 'typescript');

    const htmlPolicy = getTargetLanguagePolicy('index.html');
    assert.strictEqual(htmlPolicy.language, 'html');

    const jsonPolicy = getTargetLanguagePolicy('package.json');
    assert.strictEqual(jsonPolicy.language, 'json');
  });

  it('extracts repair plan prioritizing Patches Applied including root manifests (Patch SAFE-F1R)', () => {
    const debuggerOutput = `### Issues Addressed
Diagnostic error in src/lib/unused.ts when referencing global config.

### Patches Applied
- File: package.json
  Fixed scripts and dependencies.
- File: index.html
  Added missing input tag.

### Verification
Syntax check passed.`;

    const plan = extractRepairPlanFromDebuggerOutput(
      debuggerOutput,
      'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
      []
    );

    assert.ok(plan.affectedFiles.includes('package.json'));
    assert.ok(plan.affectedFiles.includes('index.html'));
    // Should NOT extract src/lib/unused.ts which was only in diagnostic explanation
    assert.strictEqual(plan.affectedFiles.includes('src/lib/unused.ts'), false);
  });
});
