import crypto from 'crypto';
import { prisma } from './db';

export interface AuthenticatedSession {
  user: {
    id: string;
    role: 'owner' | 'admin';
  };
}

const DEFAULT_LOCAL_OWNER = 'local-owner';

function getSessionSecret(): string {
  return process.env.AUTOCODER_SESSION_SECRET || process.env.ADMIN_SECRET || 'autocoder-local-session-secret-v1';
}

export function createSessionToken(userId: string, secret: string = getSessionSecret()): string {
  const cleanUserId = userId.trim();
  if (!cleanUserId || cleanUserId.includes('.')) {
    throw new Error('Invalid session user ID');
  }
  const hmac = crypto.createHmac('sha256', secret).update(cleanUserId).digest('hex');
  return `autocoder.${cleanUserId}.${hmac}`;
}

export function verifySessionToken(token: string, secret: string = getSessionSecret()): string | null {
  const parts = token.trim().split('.');
  if (parts.length !== 3 || parts[0] !== 'autocoder') {
    return null;
  }
  const [, userId, providedHmac] = parts;
  if (!userId || !providedHmac) return null;

  const expectedHmac = crypto.createHmac('sha256', secret).update(userId).digest('hex');
  const a = Buffer.from(providedHmac, 'utf8');
  const b = Buffer.from(expectedHmac, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }
  return userId;
}

function extractTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)autocoder_session=([^;]+)/);
  return match ? decodeURIComponent(match[1].trim()) : null;
}

export async function getAuthenticatedSession(request?: Request): Promise<AuthenticatedSession | null> {
  const enforceStrictAuth =
    process.env.NODE_ENV === 'production' ||
    process.env.AUTOCODER_REQUIRE_AUTH === 'true' ||
    request?.headers.get('x-autocoder-auth-enforce') === 'true';

  const authHeader = request?.headers.get('authorization');
  const sessionHeader = request?.headers.get('x-autocoder-session');
  const cookieToken = extractTokenFromCookie(request?.headers.get('cookie') || null);

  let rawToken: string | null = null;
  if (authHeader) {
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      return null;
    }
    rawToken = authHeader.slice(7).trim();
  } else if (sessionHeader) {
    rawToken = sessionHeader.trim();
  } else if (cookieToken) {
    rawToken = cookieToken;
  }

  if (rawToken !== null) {
    if (!rawToken) return null;
    const verifiedUserId = verifySessionToken(rawToken);
    if (!verifiedUserId) {
      return null;
    }
    return {
      user: {
        id: verifiedUserId,
        role: 'owner',
      },
    };
  }

  if (enforceStrictAuth) {
    return null;
  }

  return {
    user: {
      id: DEFAULT_LOCAL_OWNER,
      role: 'owner',
    },
  };
}

export async function verifyConversationOwnership(
  firstArg: string | Request,
  secondArg: AuthenticatedSession | null | string
): Promise<{
  authorized: boolean;
  status: 200 | 401 | 403 | 404;
  error?: string;
  conversation?: any;
  session: AuthenticatedSession;
}> {
  let conversationId: string;
  let session: AuthenticatedSession | null;

  if (typeof firstArg === 'string') {
    conversationId = firstArg;
    session = secondArg as AuthenticatedSession | null;
  } else {
    conversationId = secondArg as string;
    session = await getAuthenticatedSession(firstArg);
  }

  if (!session?.user?.id) {
    return {
      authorized: false,
      status: 401,
      error: 'Unauthorized',
      session: { user: { id: '', role: 'owner' } },
    };
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    return {
      authorized: false,
      status: 404,
      error: 'Conversation not found',
      session,
    };
  }

  if (conversation.ownerId !== session.user.id) {
    return {
      authorized: false,
      status: 403,
      error: 'Forbidden: You do not own this conversation',
      session,
    };
  }

  return { authorized: true, status: 200, conversation, session };
}
