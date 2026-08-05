import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFilePromise = promisify(execFile);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const projectDir = path.join(process.cwd(), 'projects', id);

    if (!fs.existsSync(projectDir)) {
      return NextResponse.json({ error: 'Project folder not found' }, { status: 404 });
    }

    const tempZipPath = path.join(process.cwd(), 'projects', `${id}.zip`);
    
    if (fs.existsSync(tempZipPath)) {
      fs.unlinkSync(tempZipPath);
    }

    // Run system zip safely via execFile without shell interpretation
    await execFilePromise('zip', ['-r', tempZipPath, '.'], { cwd: projectDir });

    if (!fs.existsSync(tempZipPath)) {
      return NextResponse.json({ error: 'Failed to package files' }, { status: 500 });
    }

    const fileBuffer = fs.readFileSync(tempZipPath);
    fs.unlinkSync(tempZipPath);

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="autocoder-project-${id}.zip"`,
      },
    });
  } catch (err: any) {
    const errorMsg = err.code === 'ENOENT'
      ? 'System "zip" utility is not installed on the host environment. Please install zip to download projects as archives.'
      : err.message;
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
