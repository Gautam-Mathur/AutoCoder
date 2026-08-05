import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
    const projectDir = path.join(process.cwd(), 'projects', id);

    if (!fs.existsSync(projectDir)) {
      return NextResponse.json([]);
    }

    const files = getFilesRecursively(projectDir);
    return NextResponse.json(files);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
