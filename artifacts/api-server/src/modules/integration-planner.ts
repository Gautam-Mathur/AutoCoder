import type { ProjectPlan, PlannedIntegration } from './plan-generator.js';

interface IntegrationPattern {
  type: PlannedIntegration['type'];
  keywords: string[];
  name: string;
  packages: string[];
  envVariables: string[];
  apiRoutes: { method: string; path: string; description: string }[];
  uiComponents: string[];
  setupNotes: string;
}

const INTEGRATION_PATTERNS: IntegrationPattern[] = [
  {
    type: 'payment',
    keywords: [
      'checkout', 'payment', 'billing', 'subscription', 'pricing', 'plan', 'tier',
      'stripe', 'paypal', 'invoice', 'charge', 'refund', 'credit card', 'debit',
      'premium', 'freemium', 'monetize', 'revenue', 'transaction fee', 'payout',
      'recurring', 'one-time payment', 'pay per use', 'shopping cart', 'purchase',
    ],
    name: 'Payment Processing (Stripe)',
    packages: ['stripe', '@stripe/stripe-js', '@stripe/react-stripe-js'],
    envVariables: ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET'],
    apiRoutes: [
      { method: 'POST', path: '/api/payments/create-intent', description: 'Create payment intent' },
      { method: 'POST', path: '/api/payments/webhook', description: 'Handle Stripe webhooks' },
      { method: 'GET', path: '/api/payments/history', description: 'Get payment history' },
      { method: 'POST', path: '/api/subscriptions/create', description: 'Create subscription' },
      { method: 'PATCH', path: '/api/subscriptions/:id/cancel', description: 'Cancel subscription' },
    ],
    uiComponents: ['CheckoutForm', 'PricingTable', 'PaymentHistory', 'SubscriptionManager'],
    setupNotes: 'Configure Stripe API keys. Set up webhook endpoint for payment confirmations. Use Stripe Elements for PCI-compliant card input.',
  },
  {
    type: 'email',
    keywords: [
      'notification', 'send email', 'invite', 'welcome', 'newsletter', 'alert',
      'email', 'mail', 'smtp', 'sendgrid', 'mailgun', 'transactional email',
      'password reset', 'verification email', 'confirm email', 'digest',
      'unsubscribe', 'email template', 'broadcast',
    ],
    name: 'Email Service (SendGrid/Nodemailer)',
    packages: ['nodemailer', '@sendgrid/mail'],
    envVariables: ['SENDGRID_API_KEY', 'EMAIL_FROM_ADDRESS', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'],
    apiRoutes: [
      { method: 'POST', path: '/api/email/send', description: 'Send transactional email' },
      { method: 'POST', path: '/api/email/template', description: 'Send templated email' },
      { method: 'GET', path: '/api/email/templates', description: 'List email templates' },
    ],
    uiComponents: ['EmailComposer', 'NotificationPreferences', 'EmailTemplateEditor'],
    setupNotes: 'Configure SMTP or SendGrid API credentials. Create email templates for transactional emails (welcome, reset password, notifications).',
  },
  {
    type: 'file-storage',
    keywords: [
      'upload', 'attachment', 'document', 'image', 'photo', 'avatar', 'resume',
      'pdf', 'file', 'media', 'gallery', 'download', 'import csv', 'export csv',
      'spreadsheet', 'logo', 'banner', 'thumbnail', 'video', 'asset',
      'drag and drop', 'bulk upload', 'cloud storage', 's3',
    ],
    name: 'File Storage (S3-compatible)',
    packages: ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner', 'multer'],
    envVariables: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_BUCKET', 'AWS_REGION'],
    apiRoutes: [
      { method: 'POST', path: '/api/files/upload', description: 'Upload file' },
      { method: 'GET', path: '/api/files/:id', description: 'Get file metadata' },
      { method: 'GET', path: '/api/files/:id/download', description: 'Download file' },
      { method: 'DELETE', path: '/api/files/:id', description: 'Delete file' },
      { method: 'POST', path: '/api/files/presigned-url', description: 'Generate presigned upload URL' },
    ],
    uiComponents: ['FileUploader', 'FilePreview', 'ImageGallery', 'AvatarUpload', 'DocumentViewer'],
    setupNotes: 'Configure S3-compatible storage credentials. Set file size limits. Support image resizing for thumbnails. Use presigned URLs for direct browser uploads.',
  },
  {
    type: 'auth-provider',
    keywords: [
      'login with', 'social login', 'google login', 'github login', 'oauth',
      'sso', 'single sign-on', 'sign in with', 'third party auth',
      'google auth', 'facebook login', 'microsoft login', 'apple login',
      'openid', 'saml', 'ldap', 'active directory',
    ],
    name: 'OAuth / Social Authentication',
    packages: ['passport', 'passport-google-oauth20', 'passport-github2'],
    envVariables: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'OAUTH_CALLBACK_URL'],
    apiRoutes: [
      { method: 'GET', path: '/api/auth/google', description: 'Initiate Google OAuth' },
      { method: 'GET', path: '/api/auth/google/callback', description: 'Google OAuth callback' },
      { method: 'GET', path: '/api/auth/github', description: 'Initiate GitHub OAuth' },
      { method: 'GET', path: '/api/auth/github/callback', description: 'GitHub OAuth callback' },
      { method: 'POST', path: '/api/auth/logout', description: 'Logout and clear session' },
    ],
    uiComponents: ['SocialLoginButtons', 'OAuthCallbackHandler', 'AccountLinking'],
    setupNotes: 'Register OAuth apps with providers. Configure callback URLs. Handle account linking for users who sign in with multiple providers.',
  },
  {
    type: 'calendar',
    keywords: [
      'schedule', 'booking', 'appointment', 'availability', 'time slot',
      'calendar', 'event scheduling', 'reservation', 'book a time',
      'meeting', 'recurring event', 'time picker', 'date picker',
      'agenda', 'planner', 'timetable',
    ],
    name: 'Calendar & Scheduling',
    packages: ['date-fns', '@fullcalendar/react', '@fullcalendar/daygrid', '@fullcalendar/timegrid', '@fullcalendar/interaction'],
    envVariables: [],
    apiRoutes: [
      { method: 'GET', path: '/api/availability', description: 'Get available time slots' },
      { method: 'POST', path: '/api/bookings', description: 'Create booking' },
      { method: 'GET', path: '/api/bookings', description: 'List bookings' },
      { method: 'PATCH', path: '/api/bookings/:id/cancel', description: 'Cancel booking' },
      { method: 'GET', path: '/api/calendar/events', description: 'Get calendar events' },
    ],
    uiComponents: ['CalendarView', 'TimeSlotPicker', 'BookingForm', 'AvailabilityGrid', 'EventDetail'],
    setupNotes: 'Implement conflict detection for overlapping bookings. Support timezone handling. Add recurring event patterns.',
  },
  {
    type: 'maps',
    keywords: [
      'location', 'address', 'directions', 'nearby', 'distance',
      'map', 'geolocation', 'latitude', 'longitude', 'geocode',
      'places', 'route', 'navigation', 'delivery zone', 'store locator',
      'tracking', 'gps', 'coordinates',
    ],
    name: 'Maps & Geolocation (Google Maps / Mapbox)',
    packages: ['@react-google-maps/api', 'mapbox-gl', 'react-map-gl'],
    envVariables: ['GOOGLE_MAPS_API_KEY', 'MAPBOX_ACCESS_TOKEN'],
    apiRoutes: [
      { method: 'GET', path: '/api/locations/search', description: 'Search locations' },
      { method: 'POST', path: '/api/locations/geocode', description: 'Geocode address' },
      { method: 'GET', path: '/api/locations/nearby', description: 'Find nearby locations' },
      { method: 'GET', path: '/api/locations/:id/directions', description: 'Get directions' },
    ],
    uiComponents: ['MapView', 'LocationPicker', 'AddressAutocomplete', 'DirectionsPanel', 'StoreLocator'],
    setupNotes: 'Configure Maps API key with appropriate billing. Implement address autocomplete. Cache geocoding results to reduce API calls.',
  },
  {
    type: 'realtime',
    keywords: [
      'live', 'real-time', 'realtime', 'chat', 'push notification', 'websocket',
      'instant', 'streaming', 'collaborative', 'presence', 'typing indicator',
      'live feed', 'live update', 'notification bell', 'message',
      'broadcast', 'pubsub', 'event-driven',
    ],
    name: 'Real-time Communication (WebSocket)',
    packages: ['socket.io', 'socket.io-client'],
    envVariables: [],
    apiRoutes: [
      { method: 'GET', path: '/api/notifications', description: 'Get notification history' },
      { method: 'PATCH', path: '/api/notifications/:id/read', description: 'Mark notification as read' },
      { method: 'POST', path: '/api/messages', description: 'Send message' },
      { method: 'GET', path: '/api/messages', description: 'Get message history' },
    ],
    uiComponents: ['ChatWindow', 'NotificationBell', 'PresenceIndicator', 'LiveFeed', 'TypingIndicator'],
    setupNotes: 'Set up Socket.IO server alongside Express. Implement rooms for scoped broadcasts. Add reconnection logic on client. Handle offline message queuing.',
  },
  {
    type: 'charts',
    keywords: [
      'chart', 'graph', 'analytics', 'report', 'dashboard', 'metrics',
      'visualization', 'bar chart', 'line chart', 'pie chart', 'donut',
      'histogram', 'heatmap', 'sparkline', 'kpi', 'data visualization',
      'trend', 'funnel', 'gauge', 'statistics',
    ],
    name: 'Charts & Data Visualization (Recharts)',
    packages: ['recharts'],
    envVariables: [],
    apiRoutes: [
      { method: 'GET', path: '/api/analytics/overview', description: 'Get analytics overview' },
      { method: 'GET', path: '/api/analytics/trends', description: 'Get trend data' },
      { method: 'GET', path: '/api/analytics/reports', description: 'Get reports' },
      { method: 'GET', path: '/api/analytics/export', description: 'Export analytics data' },
    ],
    uiComponents: ['DashboardCharts', 'StatCards', 'TrendLine', 'DataTable', 'ReportBuilder'],
    setupNotes: 'Use Recharts for React-native charting. Implement server-side aggregation for large datasets. Add date range filtering for all analytics endpoints.',
  },
  {
    type: 'sms',
    keywords: [
      'sms', 'text message', 'twilio', 'phone verification', 'otp',
      'two-factor', '2fa', 'mfa', 'multi-factor', 'phone notification',
      'whatsapp', 'telegram bot',
    ],
    name: 'SMS & Phone Verification (Twilio)',
    packages: ['twilio'],
    envVariables: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'],
    apiRoutes: [
      { method: 'POST', path: '/api/sms/send', description: 'Send SMS' },
      { method: 'POST', path: '/api/verification/send', description: 'Send verification code' },
      { method: 'POST', path: '/api/verification/verify', description: 'Verify code' },
    ],
    uiComponents: ['PhoneInput', 'OTPInput', 'VerificationFlow'],
    setupNotes: 'Configure Twilio credentials. Implement rate limiting on verification endpoints. Store verification codes with expiry.',
  },
  {
    type: 'analytics',
    keywords: [
      'analytics', 'tracking', 'page view', 'user behavior', 'conversion',
      'funnel analysis', 'a/b test', 'experiment', 'mixpanel', 'amplitude',
      'segment', 'google analytics', 'event tracking', 'retention',
      'cohort', 'engagement',
    ],
    name: 'Analytics & Event Tracking',
    packages: ['posthog-js', 'posthog-node'],
    envVariables: ['POSTHOG_API_KEY', 'POSTHOG_HOST'],
    apiRoutes: [
      { method: 'POST', path: '/api/analytics/track', description: 'Track custom event' },
      { method: 'GET', path: '/api/analytics/funnel', description: 'Get funnel analysis' },
      { method: 'GET', path: '/api/analytics/retention', description: 'Get retention data' },
    ],
    uiComponents: ['AnalyticsProvider', 'EventTracker', 'FunnelChart', 'RetentionChart'],
    setupNotes: 'Initialize analytics on app load. Track key user actions. Set up server-side tracking for accurate data. Respect user privacy preferences.',
  },
];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesKeywords(text: string, keywords: string[]): { matched: boolean; matchedKeywords: string[]; score: number } {
  const normalizedText = normalizeText(text);
  const matchedKeywords: string[] = [];

  for (const keyword of keywords) {
    const normalizedKeyword = normalizeText(keyword);
    const words = normalizedKeyword.split(' ');

    if (words.length > 1) {
      if (normalizedText.includes(normalizedKeyword)) {
        matchedKeywords.push(keyword);
      }
    } else {
      const regex = new RegExp(`\\b${normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      if (regex.test(normalizedText)) {
        matchedKeywords.push(keyword);
      }
    }
  }

  return {
    matched: matchedKeywords.length >= 1,
    matchedKeywords,
    score: matchedKeywords.length,
  };
}

function buildSearchText(plan: ProjectPlan, userDescription: string): string {
  const parts: string[] = [
    userDescription,
    plan.overview,
    plan.projectName,
  ];

  for (const mod of plan.modules) {
    parts.push(mod.name, mod.description, ...mod.features);
  }

  for (const entity of plan.dataModel) {
    parts.push(entity.name);
    for (const field of entity.fields) {
      parts.push(field.name, field.description || '');
    }
  }

  for (const page of plan.pages) {
    parts.push(page.name, page.description, ...page.features, ...page.dataNeeded);
  }

  for (const endpoint of plan.apiEndpoints) {
    parts.push(endpoint.description, endpoint.path);
  }

  for (const workflow of plan.workflows) {
    parts.push(workflow.name, ...workflow.states);
    for (const t of workflow.transitions) {
      parts.push(t.action);
    }
  }

  if (plan.kpis) {
    parts.push(...plan.kpis);
  }

  return parts.filter(Boolean).join(' ');
}

function inferIntegrationReason(pattern: IntegrationPattern, matchedKeywords: string[], plan: ProjectPlan): string {
  const keywordList = matchedKeywords.slice(0, 3).join(', ');
  const entityNames = plan.dataModel.map(e => e.name).join(', ');

  const reasonMap: Record<PlannedIntegration['type'], string> = {
    'payment': `Payment processing detected (keywords: ${keywordList}). Entities like ${entityNames} suggest financial transactions requiring secure payment handling.`,
    'email': `Email functionality detected (keywords: ${keywordList}). The application needs transactional emails for notifications, invitations, or alerts.`,
    'file-storage': `File handling detected (keywords: ${keywordList}). The application requires file upload, storage, and retrieval capabilities.`,
    'auth-provider': `Third-party authentication detected (keywords: ${keywordList}). OAuth/social login integration needed for user authentication.`,
    'calendar': `Scheduling features detected (keywords: ${keywordList}). Calendar integration needed for booking, availability, and event management.`,
    'maps': `Location features detected (keywords: ${keywordList}). Map integration needed for address handling, directions, or proximity search.`,
    'realtime': `Real-time features detected (keywords: ${keywordList}). WebSocket integration needed for live updates, chat, or notifications.`,
    'charts': `Data visualization detected (keywords: ${keywordList}). Chart library needed for dashboards, analytics, and reporting.`,
    'sms': `SMS/phone verification detected (keywords: ${keywordList}). Twilio integration needed for text messaging or two-factor authentication.`,
    'analytics': `User analytics detected (keywords: ${keywordList}). Event tracking integration needed for monitoring user behavior and conversions.`,
  };

  return reasonMap[pattern.type] || `Integration detected based on keywords: ${keywordList}.`;
}

function detectImplicitIntegrations(plan: ProjectPlan): PlannedIntegration[] {
  const implicit: PlannedIntegration[] = [];

  const hasDashboardPage = plan.pages.some(p =>
    p.name.toLowerCase().includes('dashboard') ||
    p.features.some(f => f.toLowerCase().includes('chart') || f.toLowerCase().includes('kpi'))
  );

  if (hasDashboardPage) {
    const chartsPattern = INTEGRATION_PATTERNS.find(p => p.type === 'charts')!;
    implicit.push({
      type: 'charts',
      name: chartsPattern.name,
      reason: 'Dashboard page detected with KPI/chart features. Chart library recommended for data visualization.',
      packages: chartsPattern.packages,
      envVariables: chartsPattern.envVariables,
      apiRoutes: chartsPattern.apiRoutes,
      uiComponents: chartsPattern.uiComponents,
      setupNotes: chartsPattern.setupNotes,
    });
  }

  const hasImageFields = plan.dataModel.some(e =>
    e.fields.some(f =>
      ['avatar', 'photo', 'image', 'logo', 'banner', 'thumbnail', 'picture', 'cover'].some(
        kw => f.name.toLowerCase().includes(kw)
      )
    )
  );

  if (hasImageFields) {
    const filePattern = INTEGRATION_PATTERNS.find(p => p.type === 'file-storage')!;
    implicit.push({
      type: 'file-storage',
      name: filePattern.name,
      reason: 'Image/file fields detected in data model. File storage integration needed for media handling.',
      packages: filePattern.packages,
      envVariables: filePattern.envVariables,
      apiRoutes: filePattern.apiRoutes,
      uiComponents: filePattern.uiComponents,
      setupNotes: filePattern.setupNotes,
    });
  }

  const hasStatusWorkflows = plan.workflows.some(w => w.states.length >= 3);
  const hasNotificationKeywords = plan.dataModel.some(e =>
    e.fields.some(f => f.name.toLowerCase().includes('email') || f.name.toLowerCase().includes('notify'))
  );

  if (hasStatusWorkflows && hasNotificationKeywords) {
    const emailPattern = INTEGRATION_PATTERNS.find(p => p.type === 'email')!;
    implicit.push({
      type: 'email',
      name: emailPattern.name,
      reason: 'Status workflows with email fields detected. Email notifications recommended for status change alerts.',
      packages: emailPattern.packages,
      envVariables: emailPattern.envVariables,
      apiRoutes: emailPattern.apiRoutes,
      uiComponents: emailPattern.uiComponents,
      setupNotes: emailPattern.setupNotes,
    });
  }

  return implicit;
}

export function detectIntegrations(plan: ProjectPlan, userDescription: string): PlannedIntegration[] {
  const searchText = buildSearchText(plan, userDescription);
  const detected: PlannedIntegration[] = [];
  const seenTypes = new Set<PlannedIntegration['type']>();

  const scoredPatterns = INTEGRATION_PATTERNS.map(pattern => {
    const result = matchesKeywords(searchText, pattern.keywords);
    return { pattern, ...result };
  })
    .filter(r => r.matched)
    .sort((a, b) => b.score - a.score);

  for (const { pattern, matchedKeywords } of scoredPatterns) {
    if (seenTypes.has(pattern.type)) continue;
    seenTypes.add(pattern.type);

    detected.push({
      type: pattern.type,
      name: pattern.name,
      reason: inferIntegrationReason(pattern, matchedKeywords, plan),
      packages: pattern.packages,
      envVariables: pattern.envVariables,
      apiRoutes: pattern.apiRoutes,
      uiComponents: pattern.uiComponents,
      setupNotes: pattern.setupNotes,
    });
  }

  const implicitIntegrations = detectImplicitIntegrations(plan);
  for (const implicit of implicitIntegrations) {
    if (!seenTypes.has(implicit.type)) {
      seenTypes.add(implicit.type);
      detected.push(implicit);
    }
  }

  return detected;
}

export function planIntegrations(plan: ProjectPlan, userDescription: string): PlannedIntegration[] {
  return detectIntegrations(plan, userDescription);
}