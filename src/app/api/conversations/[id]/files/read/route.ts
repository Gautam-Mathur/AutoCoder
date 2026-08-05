import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const file = searchParams.get('file');

    if (!file) {
      return NextResponse.json({ error: 'file parameter is required' }, { status: 400 });
    }

    const projectDir = path.resolve(process.cwd(), 'projects', id);
    const safePath = path.resolve(projectDir, file);

    // Prevent directory traversal attacks
    if (!safePath.startsWith(projectDir + path.sep) && safePath !== projectDir) {
      return NextResponse.json({ error: 'Forbidden path access' }, { status: 403 });
    }

    if (!fs.existsSync(safePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (fs.statSync(safePath).isDirectory()) {
      return NextResponse.json({ error: 'Requested path is a directory, not a file' }, { status: 400 });
    }

    const content = fs.readFileSync(safePath, 'utf8');
    return NextResponse.json({ content });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
