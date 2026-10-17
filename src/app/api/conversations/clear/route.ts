import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedSession } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthenticatedSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (process.env.NODE_ENV === 'production') {
      const authHeader = request.headers.get('x-admin-secret');
      if (!authHeader || authHeader !== process.env.ADMIN_SECRET) {
        return NextResponse.json({ error: 'Unauthorized clear operation' }, { status: 401 });
      }
    }

    // 1. Find only conversations belonging to the authenticated owner
    const ownedConversations = await prisma.conversation.findMany({
      where: { ownerId: session.user.id },
      select: { id: true },
    });
    const ownedIds = ownedConversations.map((c) => c.id);

    // 2. Delete only conversations owned by this user
    if (ownedIds.length > 0) {
      await prisma.conversation.deleteMany({
        where: { id: { in: ownedIds }, ownerId: session.user.id },
      });
    }

    // 3. Clean up only the owned project directories on disk
    const projectsDir = path.join(process.cwd(), 'projects');
    if (fs.existsSync(projectsDir)) {
      for (const id of ownedIds) {
        const itemPath = path.join(projectsDir, id);
        if (fs.existsSync(itemPath)) {
          try {
            fs.rmSync(itemPath, { recursive: true, force: true });
          } catch (fileErr) {
            console.warn(`Could not delete item ${itemPath}:`, fileErr);
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
