import { prisma } from '../../../db';
import { createContentHash } from './fingerprints';
import { isControlPlaneArtifact, normalizeProjectPath } from '../workspace-policy';

export interface SourceEvidenceItem {
  id: string;
  filePath: string;
  sha256: string;
  lineCount: number;
  byteLength: number;
  excerpt: string;
}

export interface SourceEvidenceBundle {
  workspaceHash: string;
  generatedAt: string;
  fileCount: number;
  items: SourceEvidenceItem[];
}

/**
 * Computes a deterministic workspace fingerprint from non-control-plane VirtualFile records.
 */
export async function computeEvidenceWorkspaceHash(conversationId: string): Promise<string> {
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

/**
 * Builds a deterministic source evidence bundle for Security and Reviewer stages.
 * Every authorized project file is indexed with a stable EV-NNN identifier, SHA-256 hash,
 * line count, and bounded source excerpt so audit stages inspect actual workspace files.
 */
export async function buildWorkspaceEvidenceBundle(
  conversationId: string,
  authorizedFiles?: Iterable<string>,
  maxExcerptCharsPerFile: number = 4000
): Promise<SourceEvidenceBundle> {
  const records = await prisma.virtualFile.findMany({
    where: { conversationId },
    orderBy: { filePath: 'asc' },
  });

  const authorizedSet = authorizedFiles
    ? new Set(Array.from(authorizedFiles).map((f) => normalizeProjectPath(f)))
    : null;

  const projectRecords = records
    .map((r) => ({
      normPath: normalizeProjectPath(r.filePath),
      content: r.content || '',
    }))
    .filter((r) => {
      if (isControlPlaneArtifact(r.normPath)) return false;
      if (authorizedSet && authorizedSet.size > 0 && !authorizedSet.has(r.normPath)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.normPath.localeCompare(b.normPath));

  const workspaceHash = await computeEvidenceWorkspaceHash(conversationId);

  const items: SourceEvidenceItem[] = projectRecords.map((rec, idx) => {
    const id = `EV-${String(idx + 1).padStart(3, '0')}`;
    const sha256 = createContentHash(rec.content);
    const lines = rec.content.split('\n');
    const numberedLines = lines
      .map((line, i) => `${i + 1}: ${line}`)
      .join('\n');
    const excerpt =
      numberedLines.length > maxExcerptCharsPerFile
        ? `${numberedLines.slice(0, maxExcerptCharsPerFile)}\n... [truncated ${numberedLines.length - maxExcerptCharsPerFile} chars]`
        : numberedLines;

    return {
      id,
      filePath: rec.normPath,
      sha256,
      lineCount: lines.length,
      byteLength: Buffer.byteLength(rec.content, 'utf8'),
      excerpt,
    };
  });

  return {
    workspaceHash,
    generatedAt: new Date().toISOString(),
    fileCount: items.length,
    items,
  };
}

/**
 * Formats a SourceEvidenceBundle into a deterministic markdown block for Security and Reviewer context.
 */
export function formatEvidenceBundleForPrompt(bundle: SourceEvidenceBundle): string {
  const header = [
    `=== DETERMINISTIC WORKSPACE SOURCE EVIDENCE (Workspace Hash: ${bundle.workspaceHash}) ===`,
    `Total Project Files: ${bundle.fileCount}`,
    `Evidence Index:`,
    ...bundle.items.map(
      (item) => `- [${item.id}] \`${item.filePath}\` (lines: ${item.lineCount}, sha256: ${item.sha256.slice(0, 12)})`
    ),
    '',
  ].join('\n');

  const blocks = bundle.items.map(
    (item) =>
      `--- EVIDENCE [${item.id}] FILE: ${item.filePath} (sha256: ${item.sha256}) ---\n${item.excerpt}`
  );

  return `${header}\n${blocks.join('\n\n')}`;
}
