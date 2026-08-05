import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      const authHeader = request.headers.get('x-admin-secret');
      if (!authHeader || authHeader !== process.env.ADMIN_SECRET) {
        return NextResponse.json({ error: 'Unauthorized clear operation' }, { status: 401 });
      }
    }
    // 1. Delete all conversations from SQLite database (will cascade delete history & outputs)
    await prisma.conversation.deleteMany();

    // 2. Clean up projects directory on disk if it exists
    const projectsDir = path.join(process.cwd(), 'projects');
    if (fs.existsSync(projectsDir)) {
      const list = fs.readdirSync(projectsDir);
      list.forEach((item) => {
        const itemPath = path.join(projectsDir, item);
        try {
          fs.rmSync(itemPath, { recursive: true, force: true });
        } catch (fileErr) {
          console.warn(`Could not delete item ${itemPath}:`, fileErr);
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
