import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedSession, verifyConversationOwnership } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthenticatedSession(request);
    const { id } = await context.params;
    const access = await verifyConversationOwnership(id, session);
    if (!access.authorized) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id, ownerId: session!.user.id },
      include: {
        outputs: true,
        history: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json(conversation);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthenticatedSession(request);
    const { id } = await context.params;
    const access = await verifyConversationOwnership(id, session);
    if (!access.authorized) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    // 1. Delete from database scoped to owner
    await prisma.conversation.deleteMany({
      where: { id, ownerId: session!.user.id },
    });

    // 2. Clean up compiled projects directory on disk if it exists
    const projectDir = path.join(process.cwd(), 'projects', id);
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
