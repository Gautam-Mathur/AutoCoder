// Version History System - Track all code generations with undo/redo and diff view

export interface CodeVersion {
  id: string;
  timestamp: number;
  files: { path: string; content: string; language: string }[];
  prompt: string;
  description: string;
  type: 'ai-generated' | 'template' | 'manual-edit' | 'auto-fix';
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber: number;
}

export interface FileDiff {
  path: string;
  hunks: DiffLine[][];
  additions: number;
  deletions: number;
}

class VersionHistoryManager {
  private versions: Map<number, CodeVersion[]> = new Map(); // conversationId -> versions
  private currentIndex: Map<number, number> = new Map(); // conversationId -> current index
  private maxVersions = 50;

  // Add a new version
  addVersion(
    conversationId: number,
    files: { path: string; content: string; language: string }[],
    prompt: string,
    type: CodeVersion['type'] = 'ai-generated'
  ): CodeVersion {
    const versions = this.versions.get(conversationId) || [];
    const currentIdx = this.currentIndex.get(conversationId) ?? -1;

    // Remove any versions after current index (for redo functionality)
    const trimmedVersions = versions.slice(0, currentIdx + 1);

    const version: CodeVersion = {
      id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      files: JSON.parse(JSON.stringify(files)), // Deep clone
      prompt,
      description: this.generateDescription(prompt, type),
      type
    };

    trimmedVersions.push(version);

    // Limit version history
    if (trimmedVersions.length > this.maxVersions) {
      trimmedVersions.shift();
    }

    this.versions.set(conversationId, trimmedVersions);
    this.currentIndex.set(conversationId, trimmedVersions.length - 1);

    // Persist to localStorage
    this.saveToStorage(conversationId);

    return version;
  }

  // Undo - go to previous version
  undo(conversationId: number): CodeVersion | null {
    const currentIdx = this.currentIndex.get(conversationId) ?? -1;
    const versions = this.versions.get(conversationId) || [];

    if (currentIdx > 0) {
      this.currentIndex.set(conversationId, currentIdx - 1);
      return versions[currentIdx - 1];
    }
    return null;
  }

  // Redo - go to next version
  redo(conversationId: number): CodeVersion | null {
    const currentIdx = this.currentIndex.get(conversationId) ?? -1;
    const versions = this.versions.get(conversationId) || [];

    if (currentIdx < versions.length - 1) {
      this.currentIndex.set(conversationId, currentIdx + 1);
      return versions[currentIdx + 1];
    }
    return null;
  }

  // Jump to specific version
  jumpToVersion(conversationId: number, versionId: string): CodeVersion | null {
    const versions = this.versions.get(conversationId) || [];
    const index = versions.findIndex(v => v.id === versionId);

    if (index !== -1) {
      this.currentIndex.set(conversationId, index);
      return versions[index];
    }
    return null;
  }

  // Get all versions for a conversation
  getVersions(conversationId: number): CodeVersion[] {
    return this.versions.get(conversationId) || [];
  }

  // Get current version
  getCurrentVersion(conversationId: number): CodeVersion | null {
    const versions = this.versions.get(conversationId) || [];
    const currentIdx = this.currentIndex.get(conversationId) ?? -1;
    return versions[currentIdx] || null;
  }

  // Check if can undo/redo
  canUndo(conversationId: number): boolean {
    return (this.currentIndex.get(conversationId) ?? -1) > 0;
  }

  canRedo(conversationId: number): boolean {
    const versions = this.versions.get(conversationId) || [];
    return (this.currentIndex.get(conversationId) ?? -1) < versions.length - 1;
  }

  // Generate diff between two versions
  getDiff(conversationId: number, fromVersionId: string, toVersionId: string): FileDiff[] {
    const versions = this.versions.get(conversationId) || [];
    const fromVersion = versions.find(v => v.id === fromVersionId);
    const toVersion = versions.find(v => v.id === toVersionId);

    if (!fromVersion || !toVersion) return [];

    const diffs: FileDiff[] = [];
    const allPaths = new Set([
      ...fromVersion.files.map(f => f.path),
      ...toVersion.files.map(f => f.path)
    ]);

    for (const path of Array.from(allPaths)) {
      const fromFile = fromVersion.files.find(f => f.path === path);
      const toFile = toVersion.files.find(f => f.path === path);

      const fromContent = fromFile?.content || '';
      const toContent = toFile?.content || '';

      if (fromContent !== toContent) {
        diffs.push(this.computeFileDiff(path, fromContent, toContent));
      }
    }

    return diffs;
  }

  // Compute diff for a single file using simple line-by-line diff
  private computeFileDiff(path: string, fromContent: string, toContent: string): FileDiff {
    const fromLines = fromContent.split('\n');
    const toLines = toContent.split('\n');

    const hunks: DiffLine[][] = [];
    let currentHunk: DiffLine[] = [];
    let additions = 0;
    let deletions = 0;

    // Simple LCS-based diff
    const lcs = this.longestCommonSubsequence(fromLines, toLines);

    let fromIdx = 0;
    let toIdx = 0;
    let lcsIdx = 0;

    while (fromIdx < fromLines.length || toIdx < toLines.length) {
      if (lcsIdx < lcs.length && fromLines[fromIdx] === lcs[lcsIdx] && toLines[toIdx] === lcs[lcsIdx]) {
        // Common line
        currentHunk.push({ type: 'unchanged', content: fromLines[fromIdx], lineNumber: toIdx + 1 });
        fromIdx++;
        toIdx++;
        lcsIdx++;
      } else if (toIdx < toLines.length && (lcsIdx >= lcs.length || toLines[toIdx] !== lcs[lcsIdx])) {
        // Added line
        currentHunk.push({ type: 'added', content: toLines[toIdx], lineNumber: toIdx + 1 });
        additions++;
        toIdx++;
      } else if (fromIdx < fromLines.length) {
        // Removed line
        currentHunk.push({ type: 'removed', content: fromLines[fromIdx], lineNumber: fromIdx + 1 });
        deletions++;
        fromIdx++;
      }

      // Split into hunks every 10 unchanged lines
      const unchangedCount = currentHunk.filter(l => l.type === 'unchanged').length;
      if (unchangedCount > 10 && currentHunk[currentHunk.length - 1]?.type === 'unchanged') {
        hunks.push(currentHunk);
        currentHunk = [];
      }
    }

    if (currentHunk.length > 0) {
      hunks.push(currentHunk);
    }

    return { path, hunks, additions, deletions };
  }

  // LCS algorithm for diff
  private longestCommonSubsequence(arr1: string[], arr2: string[]): string[] {
    const m = arr1.length;
    const n = arr2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (arr1[i - 1] === arr2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // Backtrack to find LCS
    const lcs: string[] = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
      if (arr1[i - 1] === arr2[j - 1]) {
        lcs.unshift(arr1[i - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    return lcs;
  }

  // Generate description from prompt
  private generateDescription(prompt: string, type: CodeVersion['type']): string {
    switch (type) {
      case 'template':
        return `Generated from template: ${prompt.slice(0, 50)}`;
      case 'manual-edit':
        return `Manual edit: ${prompt.slice(0, 50)}`;
      case 'auto-fix':
        return `Auto-fixed: ${prompt.slice(0, 50)}`;
      default:
        return `AI generated: ${prompt.slice(0, 50)}${prompt.length > 50 ? '...' : ''}`;
    }
  }

  // Persist to localStorage
  private saveToStorage(conversationId: number): void {
    try {
      const versions = this.versions.get(conversationId) || [];
      const currentIdx = this.currentIndex.get(conversationId) ?? -1;
      localStorage.setItem(`version-history-${conversationId}`, JSON.stringify({ versions, currentIdx }));
    } catch (e) {
      console.warn('Failed to save version history:', e);
    }
  }

  // Load from localStorage
  loadFromStorage(conversationId: number): void {
    try {
      const stored = localStorage.getItem(`version-history-${conversationId}`);
      if (stored) {
        const { versions, currentIdx } = JSON.parse(stored);
        this.versions.set(conversationId, versions);
        this.currentIndex.set(conversationId, currentIdx);
      }
    } catch (e) {
      console.warn('Failed to load version history:', e);
    }
  }

  // Clear history for conversation
  clearHistory(conversationId: number): void {
    this.versions.delete(conversationId);
    this.currentIndex.delete(conversationId);
    localStorage.removeItem(`version-history-${conversationId}`);
  }

  // Export version as JSON
  exportVersion(version: CodeVersion): string {
    return JSON.stringify(version, null, 2);
  }

  // Import version from JSON
  importVersion(conversationId: number, json: string): CodeVersion | null {
    try {
      const version = JSON.parse(json) as CodeVersion;
      version.id = `v-${Date.now()}-imported`;
      version.timestamp = Date.now();

      const versions = this.versions.get(conversationId) || [];
      versions.push(version);
      this.versions.set(conversationId, versions);
      this.currentIndex.set(conversationId, versions.length - 1);
      this.saveToStorage(conversationId);

      return version;
    } catch (e) {
      console.error('Failed to import version:', e);
      return null;
    }
  }
}

// Singleton instance
export const versionHistory = new VersionHistoryManager();

// React hook for version history
export function useVersionHistory(conversationId: number) {
  return {
    addVersion: (files: { path: string; content: string; language: string }[], prompt: string, type?: CodeVersion['type']) =>
      versionHistory.addVersion(conversationId, files, prompt, type),
    undo: () => versionHistory.undo(conversationId),
    redo: () => versionHistory.redo(conversationId),
    jumpToVersion: (versionId: string) => versionHistory.jumpToVersion(conversationId, versionId),
    getVersions: () => versionHistory.getVersions(conversationId),
    getCurrentVersion: () => versionHistory.getCurrentVersion(conversationId),
    canUndo: () => versionHistory.canUndo(conversationId),
    canRedo: () => versionHistory.canRedo(conversationId),
    getDiff: (fromId: string, toId: string) => versionHistory.getDiff(conversationId, fromId, toId),
    clearHistory: () => versionHistory.clearHistory(conversationId),
    loadFromStorage: () => versionHistory.loadFromStorage(conversationId)
  };
}