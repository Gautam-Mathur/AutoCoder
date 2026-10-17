import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedSession } from '@/lib/auth';

export async function GET(request?: NextRequest) {
  try {
    const session = await getAuthenticatedSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const list = await prisma.conversation.findMany({
      where: { ownerId: session.user.id },
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json(list);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthenticatedSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const title = typeof body?.title === 'string' && body.title.trim() ? body.title.trim() : 'New Autocoder Project';

    // Owner ID is strictly derived from the authenticated session, never from client-supplied fields
    const conversation = await prisma.conversation.create({
      data: {
        ownerId: session.user.id,
        title,
        status: 'Idle',
        currentStage: 'Queen',
      },
    });
    return NextResponse.json(conversation);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
