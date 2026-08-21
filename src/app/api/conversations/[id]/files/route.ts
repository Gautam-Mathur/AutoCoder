import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { listVirtualFiles } from '@/lib/agents/ruflo/vfs';

function getFilesRecursively(dir: string, baseDir: string = dir): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return [];
  const list = fs.readdirSync(dir);
  const ignoredDirs = new Set(['node_modules', '.git', '.next', 'dist', 'build', '.vscode']);
  list.forEach((file) => {
    if (ignoredDirs.has(file)) return;
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(filePath, baseDir));
    } else {
      // Normalize to forward slashes for cross-platform compatibility in the UI
      const relative = path.relative(baseDir, filePath).replace(/\\/g, '/');
      results.push(relative);
    }
  });
  return results;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const fileSet = new Set<string>();

    // 1. Fetch VFS Virtual Workspace files
    const virtualFiles = await listVirtualFiles(id);
    virtualFiles.forEach((f) => fileSet.add(f));

    // 2. Fetch Physical Disk Workspace files
    const projectDir = path.join(process.cwd(), 'projects', id);
    if (fs.existsSync(projectDir)) {
      const diskFiles = getFilesRecursively(projectDir);
      diskFiles.forEach((f) => fileSet.add(f));
    }

    const sortedFiles = Array.from(fileSet).sort();
    return NextResponse.json(sortedFiles);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
