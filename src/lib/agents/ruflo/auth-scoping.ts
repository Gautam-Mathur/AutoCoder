export type AuthScope = 'AUTH_UI' | 'CLIENT_MOCK_AUTH' | 'SERVER_AUTH_INFRASTRUCTURE' | 'NONE' | 'UNSPECIFIED';

export interface ScopedAuthEvidence {
  source: string;
  scope: AuthScope;
  rawText: string;
}

/**
 * Classifies an authentication clause into its correct semantic tier:
 * 1. AUTH_UI: Visual forms, login modals, input fields, tabs.
 * 2. CLIENT_MOCK_AUTH: localStorage state, demo role switcher, hardcoded client users.
 * 3. SERVER_AUTH_INFRASTRUCTURE: JWT, OAuth, session cookies, bcrypt, authMiddleware, DB user tables.
 * 4. NONE: Explicit declaration of no authentication (e.g. "Authentication: None", "No auth required").
 * 5. UNSPECIFIED: No authentication requirements mentioned in the document.
 */
export function classifyAuthenticationScope(text: string, source: string): ScopedAuthEvidence {
  if (!text || !text.trim()) {
    return { source, scope: 'UNSPECIFIED', rawText: 'Empty content' };
  }

  // 1. Check for explicit declaration of NONE
  const techStackSectionMatch = text.match(/###\s*Tech Stack([\s\S]*?)(?=###|$)/i);
  const techStackText = techStackSectionMatch ? techStackSectionMatch[1] : '';

  const explicitNoneInTechStack = /(?:\*\*)?auth(?:entication)?(?:\*\*)?\s*:\s*(?:\*\*)?none\b/i.test(techStackText);
  const explicitNoneInText = [
    /(?:\*\*)?auth(?:entication)?(?:\*\*)?\s*:\s*(?:\*\*)?none\b/i,
    /(?:\*\*)?auth(?:entication)?\s*\/\s*session(?:\*\*)?\s*:\s*(?:\*\*)?none\b/i,
    /(?:\*\*)?auth(?:entication)?\s*required(?:\*\*)?\s*:\s*(?:\*\*)?(?:no|false)\b/i,
    /\bno\s+auth(?:entication)?(?:\s+required|\s+needed)?\b/i,
    /\bwithout\s+auth(?:entication)?\b/i,
  ].some((pattern) => pattern.test(text));

  // 2. Check for Server-Side Auth Infrastructure
  // Strip negated auth clauses before scanning for positive auth keywords to avoid "no auth needed" or "Auth Required: No" matching positive patterns
  const stripped = text
    .replace(/\b(?:auth(?:entication)?\s*required\s*:\s*(?:no|false|none))/gi, '')
    .replace(/\b(?:auth(?:entication)?\s*:\s*(?:none|no|false))/gi, '')
    .replace(
      /\b(?:no|not|without|never|don't|do\s+not|doesn't|does\s+not)\s+(?:need\s+to\s+|require\s+)?(?:log\s*in|sign\s*in|auth(?:entication)?|jwt|oauth|session)[^\n.;]*/gi,
      ''
    );

  const serverAuthPatterns = [
    /\b(?:jwt|bearer\s+tokens?|access_token|refresh_token)\b/i,
    /\b(?:oauth2?|next-auth|passport|express-session|cookie-session)\b/i,
    /\b(?:authmiddleware|verifytoken|requireauth|hashpassword|bcrypt)\b/i,
    /\b(?:database\s+users?|users?\s+table|prisma\.user)\b/i,
    /\brole-based\s+access\s+control\s+\(rbac\)\s+middleware\b/i,
    /\bauth(?:entication)?\s*:\s*(?:jwt|session|token|oauth|next-auth|clerk|yes|true|required)\b/i,
    /\bauth\s*required\s*:\s*(?:yes|true)\b/i,
    /\b(?:user\s+)?auth(?:entication)?\s+(?:is\s+)?(?:required|needed|mandatory|enabled)\b/i,
  ];

  const hasServerAuth = serverAuthPatterns.some((pattern) => pattern.test(stripped));

  // If text explicitly declares no auth in Tech Stack, check if it has server-level auth infrastructure elsewhere
  if (explicitNoneInTechStack || explicitNoneInText) {
    if (hasServerAuth) {
      return { source, scope: 'SERVER_AUTH_INFRASTRUCTURE', rawText: 'Server-side authentication infrastructure requested' };
    }
    return { source, scope: 'NONE', rawText: 'Explicit Authentication: None' };
  }

  if (hasServerAuth) {
    return { source, scope: 'SERVER_AUTH_INFRASTRUCTURE', rawText: 'Server-side authentication infrastructure requested' };
  }

  // 3. Check for Client-Side Mock Auth
  const mockAuthPatterns = [
    /\b(?:mock\s+login|demo\s+accounts?|localstorage\s+session|fake\s+auth)\b/i,
    /\bclient[- ]side\s+(?:auth|login|role\s+toggle|switcher)\b/i,
    /\bsimulated\s+(?:login|authentication)\b/i,
  ];

  if (mockAuthPatterns.some((pattern) => pattern.test(text))) {
    return { source, scope: 'CLIENT_MOCK_AUTH', rawText: 'Client-side mock authentication requested' };
  }

  // 4. Check for Generic Auth UI (modals, forms, buttons)
  const uiAuthPatterns = [
    /\b(?:login|sign[- ]in|sign[- ]up)\s+(?:modal|form|page|screen|button|view)\b/i,
    /\buser\s+profile\s+(?:dropdown|menu|icon)\b/i,
  ];

  if (uiAuthPatterns.some((pattern) => pattern.test(text))) {
    return { source, scope: 'AUTH_UI', rawText: 'Authentication UI elements requested' };
  }

  // 5. Feature-level user login / signin requirement
  if (/\b(?:user\s+)?(?:log\s*in|logged\s+in|sign\s*in|signed\s+in|authentication)\b/i.test(stripped)) {
    return { source, scope: 'SERVER_AUTH_INFRASTRUCTURE', rawText: 'User authentication requested' };
  }

  return { source, scope: 'UNSPECIFIED', rawText: 'No authentication clauses declared' };
}
