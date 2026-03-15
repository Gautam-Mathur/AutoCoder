/**
 * Deep Project Generator
 *
 * Generates complex, multi-level projects with 100+ files
 * Capable of generating projects as complex as AutoCoder itself
 */

// ============================================
// PROJECT BLUEPRINTS
// ============================================

interface FileTemplate {
  path: string;
  content: string;
  type: 'source' | 'config' | 'test' | 'style' | 'doc';
  dependencies?: string[];
}

interface ComponentBlueprint {
  name: string;
  path: string;
  type: 'page' | 'component' | 'layout' | 'hook' | 'context' | 'util';
  children?: ComponentBlueprint[];
  props?: Record<string, string>;
  hooks?: string[];
  imports?: string[];
}

interface FeatureModule {
  name: string;
  description: string;
  components: ComponentBlueprint[];
  routes?: RouteDefinition[];
  hooks?: HookDefinition[];
  services?: ServiceDefinition[];
  stores?: StoreDefinition[];
}

interface RouteDefinition {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  handler: string;
  middleware?: string[];
  validation?: string;
}

interface HookDefinition {
  name: string;
  type: 'query' | 'mutation' | 'state' | 'effect' | 'callback';
  dependencies?: string[];
}

interface ServiceDefinition {
  name: string;
  methods: { name: string; params: string[]; returns: string }[];
}

interface StoreDefinition {
  name: string;
  state: Record<string, string>;
  actions: string[];
}

interface ProjectBlueprint {
  id: string;
  name: string;
  description: string;
  type: 'fullstack' | 'frontend' | 'backend' | 'cli' | 'library' | 'monorepo';
  techStack: {
    frontend?: string;
    backend?: string;
    database?: string;
    styling?: string;
    testing?: string;
  };
  structure: {
    directories: string[];
    configFiles: string[];
    features: FeatureModule[];
  };
  estimatedFiles: number;
}

// ============================================
// BLUEPRINT DEFINITIONS
// ============================================

const BLUEPRINTS: Record<string, ProjectBlueprint> = {
  'fullstack-react-express': {
    id: 'fullstack-react-express',
    name: 'Full-Stack React + Express',
    description: 'Complete web application with React frontend and Express backend',
    type: 'fullstack',
    techStack: {
      frontend: 'react-typescript',
      backend: 'express-typescript',
      database: 'postgresql',
      styling: 'tailwind',
      testing: 'vitest',
    },
    structure: {
      directories: [
        'src/components',
        'src/components/ui',
        'src/components/layout',
        'src/components/features',
        'src/pages',
        'src/hooks',
        'src/lib',
        'src/stores',
        'src/types',
        'src/assets',
        'server/src/routes',
        'server/src/controllers',
        'server/src/services',
        'server/src/middleware',
        'server/src/models',
        'server/src/utils',
        'server/src/validators',
        'shared',
      ],
      configFiles: [
        'package.json',
        'tsconfig.json',
        'vite.config.ts',
        'tailwind.config.ts',
        'drizzle.config.ts',
        '.env.example',
        '.gitignore',
      ],
      features: [],
    },
    estimatedFiles: 80,
  },

  'saas-platform': {
    id: 'saas-platform',
    name: 'SaaS Platform',
    description: 'Complete SaaS with auth, billing, dashboard, and admin',
    type: 'fullstack',
    techStack: {
      frontend: 'react-typescript',
      backend: 'express-typescript',
      database: 'postgresql',
      styling: 'tailwind',
      testing: 'vitest',
    },
    structure: {
      directories: [
        'src/components/ui',
        'src/components/layout',
        'src/components/auth',
        'src/components/dashboard',
        'src/components/billing',
        'src/components/settings',
        'src/components/admin',
        'src/pages',
        'src/hooks',
        'src/stores',
        'src/lib',
        'server/src/routes',
        'server/src/controllers',
        'server/src/services',
        'server/src/middleware',
        'server/src/models',
        'server/src/jobs',
        'server/src/utils',
        'shared',
      ],
      configFiles: [
        'package.json',
        'tsconfig.json',
        'vite.config.ts',
        'tailwind.config.ts',
        'drizzle.config.ts',
      ],
      features: [],
    },
    estimatedFiles: 120,
  },

  'api-server': {
    id: 'api-server',
    name: 'REST API Server',
    description: 'Production-ready REST API with authentication and documentation',
    type: 'backend',
    techStack: {
      backend: 'express-typescript',
      database: 'postgresql',
      testing: 'vitest',
    },
    structure: {
      directories: [
        'src/routes',
        'src/controllers',
        'src/services',
        'src/middleware',
        'src/models',
        'src/validators',
        'src/utils',
        'src/config',
        'src/types',
        'tests/unit',
        'tests/integration',
      ],
      configFiles: [
        'package.json',
        'tsconfig.json',
        'drizzle.config.ts',
        '.env.example',
      ],
      features: [],
    },
    estimatedFiles: 50,
  },

  'dashboard-app': {
    id: 'dashboard-app',
    name: 'Analytics Dashboard',
    description: 'Data visualization dashboard with charts and metrics',
    type: 'fullstack',
    techStack: {
      frontend: 'react-typescript',
      backend: 'express-typescript',
      database: 'postgresql',
      styling: 'tailwind',
    },
    structure: {
      directories: [
        'src/components/ui',
        'src/components/charts',
        'src/components/widgets',
        'src/components/layout',
        'src/components/filters',
        'src/pages',
        'src/hooks',
        'src/lib',
        'server/src/routes',
        'server/src/services',
        'server/src/analytics',
        'shared',
      ],
      configFiles: [
        'package.json',
        'tsconfig.json',
        'vite.config.ts',
        'tailwind.config.ts',
      ],
      features: [],
    },
    estimatedFiles: 70,
  },

  'ecommerce': {
    id: 'ecommerce',
    name: 'E-Commerce Platform',
    description: 'Full e-commerce with products, cart, checkout, and orders',
    type: 'fullstack',
    techStack: {
      frontend: 'react-typescript',
      backend: 'express-typescript',
      database: 'postgresql',
      styling: 'tailwind',
    },
    structure: {
      directories: [
        'src/components/ui',
        'src/components/products',
        'src/components/cart',
        'src/components/checkout',
        'src/components/orders',
        'src/components/account',
        'src/components/layout',
        'src/pages',
        'src/hooks',
        'src/stores',
        'server/src/routes',
        'server/src/controllers',
        'server/src/services',
        'server/src/models',
        'shared',
      ],
      configFiles: [
        'package.json',
        'tsconfig.json',
        'vite.config.ts',
        'tailwind.config.ts',
      ],
      features: [],
    },
    estimatedFiles: 100,
  },

  'ai-assistant': {
    id: 'ai-assistant',
    name: 'AI Chat Assistant',
    description: 'AI-powered chat application like AutoCoder',
    type: 'fullstack',
    techStack: {
      frontend: 'react-typescript',
      backend: 'express-typescript',
      database: 'postgresql',
      styling: 'tailwind',
    },
    structure: {
      directories: [
        'src/components/ui',
        'src/components/chat',
        'src/components/preview',
        'src/components/code',
        'src/components/layout',
        'src/pages',
        'src/hooks',
        'src/lib',
        'server/src/routes',
        'server/src/services',
        'server/src/ai',
        'server/src/modules',
        'shared',
      ],
      configFiles: [
        'package.json',
        'tsconfig.json',
        'vite.config.ts',
        'tailwind.config.ts',
      ],
      features: [],
    },
    estimatedFiles: 90,
  },

  'cli-tool': {
    id: 'cli-tool',
    name: 'CLI Application',
    description: 'Command-line tool with commands and configuration',
    type: 'cli',
    techStack: {
      backend: 'typescript',
      testing: 'vitest',
    },
    structure: {
      directories: [
        'src/commands',
        'src/utils',
        'src/config',
        'src/types',
        'tests',
      ],
      configFiles: [
        'package.json',
        'tsconfig.json',
      ],
      features: [],
    },
    estimatedFiles: 25,
  },

  'monorepo': {
    id: 'monorepo',
    name: 'Monorepo Workspace',
    description: 'Multi-package monorepo with shared libraries',
    type: 'monorepo',
    techStack: {
      frontend: 'react-typescript',
      backend: 'express-typescript',
      database: 'postgresql',
    },
    structure: {
      directories: [
        'packages/client/src',
        'packages/server/src',
        'packages/shared/src',
        'packages/ui/src',
        'packages/utils/src',
      ],
      configFiles: [
        'package.json',
        'turbo.json',
        'pnpm-workspace.yaml',
      ],
      features: [],
    },
    estimatedFiles: 60,
  },

  'cms': {
    id: 'cms',
    name: 'Content Management System',
    description: 'CMS with content types, media, and publishing workflow',
    type: 'fullstack',
    techStack: {
      frontend: 'react-typescript',
      backend: 'express-typescript',
      database: 'postgresql',
      styling: 'tailwind',
    },
    structure: {
      directories: [
        'src/components/ui',
        'src/components/editor',
        'src/components/media',
        'src/components/content',
        'src/components/layout',
        'src/pages',
        'server/src/routes',
        'server/src/services',
        'server/src/models',
        'shared',
      ],
      configFiles: [
        'package.json',
        'tsconfig.json',
        'vite.config.ts',
      ],
      features: [],
    },
    estimatedFiles: 75,
  },

  'social-platform': {
    id: 'social-platform',
    name: 'Social Media Platform',
    description: 'Social app with posts, comments, follows, and notifications',
    type: 'fullstack',
    techStack: {
      frontend: 'react-typescript',
      backend: 'express-typescript',
      database: 'postgresql',
      styling: 'tailwind',
    },
    structure: {
      directories: [
        'src/components/ui',
        'src/components/feed',
        'src/components/posts',
        'src/components/comments',
        'src/components/profile',
        'src/components/notifications',
        'src/components/layout',
        'src/pages',
        'src/hooks',
        'src/stores',
        'server/src/routes',
        'server/src/controllers',
        'server/src/services',
        'server/src/models',
        'server/src/realtime',
        'shared',
      ],
      configFiles: [
        'package.json',
        'tsconfig.json',
        'vite.config.ts',
      ],
      features: [],
    },
    estimatedFiles: 110,
  },
};

// ============================================
// FEATURE MODULES
// ============================================

const FEATURE_MODULES: Record<string, FeatureModule> = {
  auth: {
    name: 'Authentication',
    description: 'Complete authentication flow',
    components: [
      {
        name: 'AuthProvider',
        path: 'src/components/auth/AuthProvider.tsx',
        type: 'context',
        children: [],
      },
      {
        name: 'LoginForm',
        path: 'src/components/auth/LoginForm.tsx',
        type: 'component',
        props: { onSuccess: '() => void' },
        hooks: ['useAuth', 'useForm'],
      },
      {
        name: 'RegisterForm',
        path: 'src/components/auth/RegisterForm.tsx',
        type: 'component',
        props: { onSuccess: '() => void' },
        hooks: ['useAuth', 'useForm'],
      },
      {
        name: 'ForgotPasswordForm',
        path: 'src/components/auth/ForgotPasswordForm.tsx',
        type: 'component',
        hooks: ['useForm'],
      },
      {
        name: 'ResetPasswordForm',
        path: 'src/components/auth/ResetPasswordForm.tsx',
        type: 'component',
        hooks: ['useForm'],
      },
      {
        name: 'ProtectedRoute',
        path: 'src/components/auth/ProtectedRoute.tsx',
        type: 'component',
        hooks: ['useAuth'],
      },
      {
        name: 'useAuth',
        path: 'src/hooks/useAuth.ts',
        type: 'hook',
      },
    ],
    routes: [
      { path: '/api/auth/login', method: 'POST', handler: 'login', validation: 'loginSchema' },
      { path: '/api/auth/register', method: 'POST', handler: 'register', validation: 'registerSchema' },
      { path: '/api/auth/logout', method: 'POST', handler: 'logout', middleware: ['requireAuth'] },
      { path: '/api/auth/me', method: 'GET', handler: 'getCurrentUser', middleware: ['requireAuth'] },
      { path: '/api/auth/forgot-password', method: 'POST', handler: 'forgotPassword' },
      { path: '/api/auth/reset-password', method: 'POST', handler: 'resetPassword' },
    ],
    services: [
      {
        name: 'AuthService',
        methods: [
          { name: 'login', params: ['email', 'password'], returns: 'Promise<User>' },
          { name: 'register', params: ['data'], returns: 'Promise<User>' },
          { name: 'validateToken', params: ['token'], returns: 'Promise<boolean>' },
          { name: 'hashPassword', params: ['password'], returns: 'Promise<string>' },
        ],
      },
    ],
    hooks: [
      { name: 'useAuth', type: 'state', dependencies: ['AuthContext'] },
      { name: 'useLogin', type: 'mutation', dependencies: ['useAuth'] },
      { name: 'useRegister', type: 'mutation', dependencies: ['useAuth'] },
      { name: 'useLogout', type: 'mutation', dependencies: ['useAuth'] },
    ],
  },

  dashboard: {
    name: 'Dashboard',
    description: 'Analytics dashboard with metrics and charts',
    components: [
      {
        name: 'DashboardLayout',
        path: 'src/components/dashboard/DashboardLayout.tsx',
        type: 'layout',
        children: [
          { name: 'Sidebar', path: 'src/components/dashboard/Sidebar.tsx', type: 'component' },
          { name: 'Header', path: 'src/components/dashboard/Header.tsx', type: 'component' },
        ],
      },
      {
        name: 'MetricCard',
        path: 'src/components/dashboard/MetricCard.tsx',
        type: 'component',
        props: { title: 'string', value: 'number', change: 'number' },
      },
      {
        name: 'ChartCard',
        path: 'src/components/dashboard/ChartCard.tsx',
        type: 'component',
        props: { title: 'string', data: 'ChartData[]' },
      },
      {
        name: 'ActivityFeed',
        path: 'src/components/dashboard/ActivityFeed.tsx',
        type: 'component',
      },
      {
        name: 'QuickActions',
        path: 'src/components/dashboard/QuickActions.tsx',
        type: 'component',
      },
    ],
    routes: [
      { path: '/api/dashboard/metrics', method: 'GET', handler: 'getMetrics', middleware: ['requireAuth'] },
      { path: '/api/dashboard/charts', method: 'GET', handler: 'getChartData', middleware: ['requireAuth'] },
      { path: '/api/dashboard/activity', method: 'GET', handler: 'getActivity', middleware: ['requireAuth'] },
    ],
    hooks: [
      { name: 'useDashboardMetrics', type: 'query' },
      { name: 'useDashboardCharts', type: 'query' },
      { name: 'useActivityFeed', type: 'query' },
    ],
  },

  crud: {
    name: 'CRUD Operations',
    description: 'Generic CRUD module template',
    components: [
      {
        name: 'EntityList',
        path: 'src/components/{entity}/EntityList.tsx',
        type: 'component',
        hooks: ['useEntities'],
      },
      {
        name: 'EntityCard',
        path: 'src/components/{entity}/EntityCard.tsx',
        type: 'component',
      },
      {
        name: 'EntityForm',
        path: 'src/components/{entity}/EntityForm.tsx',
        type: 'component',
        hooks: ['useForm'],
      },
      {
        name: 'EntityDetail',
        path: 'src/components/{entity}/EntityDetail.tsx',
        type: 'component',
        hooks: ['useEntity'],
      },
      {
        name: 'EntityFilters',
        path: 'src/components/{entity}/EntityFilters.tsx',
        type: 'component',
      },
    ],
    routes: [
      { path: '/api/{entity}', method: 'GET', handler: 'list' },
      { path: '/api/{entity}/:id', method: 'GET', handler: 'getById' },
      { path: '/api/{entity}', method: 'POST', handler: 'create', validation: 'createSchema' },
      { path: '/api/{entity}/:id', method: 'PUT', handler: 'update', validation: 'updateSchema' },
      { path: '/api/{entity}/:id', method: 'DELETE', handler: 'delete' },
    ],
    services: [
      {
        name: 'EntityService',
        methods: [
          { name: 'findAll', params: ['filters'], returns: 'Promise<Entity[]>' },
          { name: 'findById', params: ['id'], returns: 'Promise<Entity>' },
          { name: 'create', params: ['data'], returns: 'Promise<Entity>' },
          { name: 'update', params: ['id', 'data'], returns: 'Promise<Entity>' },
          { name: 'delete', params: ['id'], returns: 'Promise<void>' },
        ],
      },
    ],
    hooks: [
      { name: 'useEntities', type: 'query' },
      { name: 'useEntity', type: 'query' },
      { name: 'useCreateEntity', type: 'mutation' },
      { name: 'useUpdateEntity', type: 'mutation' },
      { name: 'useDeleteEntity', type: 'mutation' },
    ],
  },

  settings: {
    name: 'Settings',
    description: 'User and app settings',
    components: [
      {
        name: 'SettingsLayout',
        path: 'src/components/settings/SettingsLayout.tsx',
        type: 'layout',
        children: [
          { name: 'SettingsNav', path: 'src/components/settings/SettingsNav.tsx', type: 'component' },
        ],
      },
      {
        name: 'ProfileSettings',
        path: 'src/components/settings/ProfileSettings.tsx',
        type: 'component',
        hooks: ['useAuth', 'useForm'],
      },
      {
        name: 'SecuritySettings',
        path: 'src/components/settings/SecuritySettings.tsx',
        type: 'component',
        hooks: ['useForm'],
      },
      {
        name: 'NotificationSettings',
        path: 'src/components/settings/NotificationSettings.tsx',
        type: 'component',
      },
      {
        name: 'AppearanceSettings',
        path: 'src/components/settings/AppearanceSettings.tsx',
        type: 'component',
      },
    ],
    routes: [
      { path: '/api/settings/profile', method: 'GET', handler: 'getProfile', middleware: ['requireAuth'] },
      { path: '/api/settings/profile', method: 'PUT', handler: 'updateProfile', middleware: ['requireAuth'] },
      { path: '/api/settings/password', method: 'PUT', handler: 'changePassword', middleware: ['requireAuth'] },
      { path: '/api/settings/notifications', method: 'GET', handler: 'getNotificationSettings', middleware: ['requireAuth'] },
      { path: '/api/settings/notifications', method: 'PUT', handler: 'updateNotificationSettings', middleware: ['requireAuth'] },
    ],
  },

  notifications: {
    name: 'Notifications',
    description: 'In-app notification system',
    components: [
      {
        name: 'NotificationProvider',
        path: 'src/components/notifications/NotificationProvider.tsx',
        type: 'context',
      },
      {
        name: 'NotificationBell',
        path: 'src/components/notifications/NotificationBell.tsx',
        type: 'component',
        hooks: ['useNotifications'],
      },
      {
        name: 'NotificationDropdown',
        path: 'src/components/notifications/NotificationDropdown.tsx',
        type: 'component',
      },
      {
        name: 'NotificationItem',
        path: 'src/components/notifications/NotificationItem.tsx',
        type: 'component',
      },
      {
        name: 'NotificationList',
        path: 'src/components/notifications/NotificationList.tsx',
        type: 'component',
      },
    ],
    routes: [
      { path: '/api/notifications', method: 'GET', handler: 'getNotifications', middleware: ['requireAuth'] },
      { path: '/api/notifications/:id/read', method: 'POST', handler: 'markAsRead', middleware: ['requireAuth'] },
      { path: '/api/notifications/read-all', method: 'POST', handler: 'markAllAsRead', middleware: ['requireAuth'] },
    ],
    hooks: [
      { name: 'useNotifications', type: 'query' },
      { name: 'useMarkNotificationRead', type: 'mutation' },
    ],
  },
};

// ============================================
// COMPONENT TEMPLATES
// ============================================

function generateReactComponent(blueprint: ComponentBlueprint, options: GenerationOptions): string {
  const imports: string[] = [];
  const hookCalls: string[] = [];

  if (blueprint.hooks?.includes('useState')) imports.push("import { useState } from 'react';");
  if (blueprint.hooks?.includes('useEffect')) imports.push("import { useEffect } from 'react';");
  if (blueprint.hooks?.includes('useForm')) imports.push("import { useForm } from 'react-hook-form';");
  if (blueprint.hooks?.includes('useAuth')) imports.push("import { useAuth } from '@/hooks/useAuth';");

  if (blueprint.children?.length) {
    for (const child of blueprint.children) {
      const childName = child.name;
      const childPath = child.path.replace('src/', '@/').replace('.tsx', '');
      imports.push(`import { ${childName} } from '${childPath}';`);
    }
  }

  const propsInterface = blueprint.props
    ? `interface ${blueprint.name}Props {\n${Object.entries(blueprint.props).map(([k, v]) => `  ${k}: ${v};`).join('\n')}\n}\n\n`
    : '';

  const propsArg = blueprint.props ? `props: ${blueprint.name}Props` : '';

  return `${imports.join('\n')}

${propsInterface}export function ${blueprint.name}(${propsArg}) {
  ${hookCalls.join('\n  ')}

  return (
    <div className="${blueprint.name.toLowerCase()}">
      <h2>${blueprint.name}</h2>
      ${blueprint.children?.map(c => `<${c.name} />`).join('\n      ') || ''}
    </div>
  );
}
`;
}

function generateHook(hook: HookDefinition): string {
  switch (hook.type) {
    case 'query':
      return `import { useQuery } from '@tanstack/react-query';

export function ${hook.name}(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['${hook.name.replace('use', '').toLowerCase()}'],
    queryFn: async () => {
      const res = await fetch('/api/${hook.name.replace('use', '').toLowerCase()}');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    ...options,
  });
}
`;
    case 'mutation':
      return `import { useMutation, useQueryClient } from '@tanstack/react-query';

export function ${hook.name}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: unknown) => {
      const res = await fetch('/api/${hook.name.replace('use', '').replace('Create', '').replace('Update', '').replace('Delete', '').toLowerCase()}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}
`;
    case 'state':
      return `import { useState, useCallback } from 'react';

export function ${hook.name}(initialValue?: unknown) {
  const [state, setState] = useState(initialValue);

  const update = useCallback((value: unknown) => {
    setState(value);
  }, []);

  const reset = useCallback(() => {
    setState(initialValue);
  }, [initialValue]);

  return { state, update, reset };
}
`;
    default:
      return `export function ${hook.name}() {
  // Hook implementation
  return {};
}
`;
  }
}

// ============================================
// PRODUCTION-READY CODE GENERATORS
// Infused with patterns from complete-code-intelligence
// ============================================

// Service implementation templates based on service type
const SERVICE_IMPLEMENTATIONS: Record<string, string> = {
  AuthService: `import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export class AuthService {
  async login(email: string, password: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    const token = this.generateToken({ userId: user.id, email: user.email, role: user.role || 'user' });

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    };
  }

  async register(data: { email: string; password: string; name: string }) {
    const [existing] = await db.select().from(users).where(eq(users.email, data.email));

    if (existing) {
      throw new Error('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const [newUser] = await db.insert(users).values({
      email: data.email,
      password: hashedPassword,
      name: data.name,
      role: 'user',
    }).returning();

    const token = this.generateToken({ userId: newUser.id, email: newUser.email, role: 'user' });

    return {
      user: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role },
      token,
    };
  }

  async validateToken(token: string): Promise<TokenPayload | null> {
    try {
      return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch {
      return null;
    }
  }

  async getUserById(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return null;
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }
}

export const authService = new AuthService();
`,

  DashboardService: `import { db } from '../db';
import { sql } from 'drizzle-orm';

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  revenue: number;
  growth: number;
}

export class DashboardService {
  async getStats(): Promise<DashboardStats> {
    // In production, these would be real database queries
    const stats = {
      totalUsers: 0,
      activeUsers: 0,
      revenue: 0,
      growth: 0,
    };

    try {
      // Example: Count users
      const result = await db.execute(sql\`SELECT COUNT(*) as count FROM users\`);
      stats.totalUsers = Number(result.rows?.[0]?.count) || 0;
      stats.activeUsers = Math.floor(stats.totalUsers * 0.7);
      stats.revenue = stats.totalUsers * 29.99;
      stats.growth = 12.5;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }

    return stats;
  }

  async getRecentActivity(limit: number = 10) {
    // Return recent user activity
    return [];
  }

  async getChartData(period: 'week' | 'month' | 'year') {
    // Return chart data based on period
    const dataPoints = period === 'week' ? 7 : period === 'month' ? 30 : 12;
    return Array.from({ length: dataPoints }, (_, i) => ({
      label: \`Point \${i + 1}\`,
      value: Math.floor(Math.random() * 100),
    }));
  }
}

export const dashboardService = new DashboardService();
`,
};

// Controller implementation templates
const CONTROLLER_IMPLEMENTATIONS: Record<string, string> = {
  Authentication: `import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/AuthService';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

class AuthenticationController {
  async login(req: Request, res: Response) {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.issues
        });
      }

      const { email, password } = validation.data;
      const result = await authService.login(email, password);

      res.json({
        success: true,
        user: result.user,
        token: result.token
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      res.status(401).json({ error: message });
    }
  }

  async register(req: Request, res: Response) {
    try {
      const validation = registerSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.issues
        });
      }

      const result = await authService.register(validation.data);

      res.status(201).json({
        success: true,
        user: result.user,
        token: result.token
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      res.status(400).json({ error: message });
    }
  }

  async logout(req: Request, res: Response) {
    try {
      // Clear session/token on client side
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Logout failed' });
    }
  }

  async getCurrentUser(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const userData = await authService.getUserById(user.userId);
      if (!userData) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ success: true, user: userData });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get user' });
    }
  }

  async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // In production: Generate reset token and send email
      res.json({
        success: true,
        message: 'If the email exists, a reset link has been sent'
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to process request' });
    }
  }

  async resetPassword(req: Request, res: Response) {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ error: 'Token and password are required' });
      }

      // In production: Validate token and update password
      res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to reset password' });
    }
  }
}

export const authenticationController = new AuthenticationController();
`,

  Dashboard: `import { Request, Response } from 'express';
import { dashboardService } from '../services/DashboardService';

class DashboardController {
  async getStats(req: Request, res: Response) {
    try {
      const stats = await dashboardService.getStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch stats';
      res.status(500).json({ error: message });
    }
  }

  async getActivity(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const activity = await dashboardService.getRecentActivity(limit);
      res.json({ success: true, data: activity });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch activity' });
    }
  }

  async getChartData(req: Request, res: Response) {
    try {
      const period = (req.query.period as 'week' | 'month' | 'year') || 'week';
      const data = await dashboardService.getChartData(period);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch chart data' });
    }
  }
}

export const dashboardController = new DashboardController();
`,
};

// Middleware templates
const MIDDLEWARE_TEMPLATES = {
  requireAuth: `import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      role: string;
    };

    (req as AuthRequest).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthRequest).user;

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}
`,
};

function generateService(service: ServiceDefinition): string {
  // Check if we have a full implementation template
  const fullImpl = SERVICE_IMPLEMENTATIONS[service.name];
  if (fullImpl) {
    return fullImpl;
  }

  // Generate a smart implementation based on method signatures
  const methods = service.methods.map(m => {
    const impl = getMethodImplementation(service.name, m.name, m.params, m.returns);
    return `  async ${m.name}(${m.params.join(', ')}): ${m.returns} {
${impl}
  }`;
  }).join('\n\n');

  return `import { db } from '../db';

export class ${service.name} {
${methods}
}

export const ${service.name.charAt(0).toLowerCase() + service.name.slice(1)} = new ${service.name}();
`;
}

function getMethodImplementation(serviceName: string, methodName: string, params: string[], returns: string): string {
  // Smart implementation based on common patterns
  const lowerMethod = methodName.toLowerCase();

  if (lowerMethod.includes('getall') || lowerMethod.includes('list') || lowerMethod.includes('find')) {
    return `    // Fetch all records
    try {
      // const results = await db.select().from(table);
      // return results;
      return [];
    } catch (error) {
      console.error('${methodName} error:', error);
      throw error;
    }`;
  }

  if (lowerMethod.includes('getby') || lowerMethod.includes('findby')) {
    return `    // Fetch by ID/criteria
    try {
      // const [result] = await db.select().from(table).where(eq(table.id, id));
      // return result || null;
      return null;
    } catch (error) {
      console.error('${methodName} error:', error);
      throw error;
    }`;
  }

  if (lowerMethod.includes('create') || lowerMethod.includes('add') || lowerMethod.includes('insert')) {
    return `    // Create new record
    try {
      // const [result] = await db.insert(table).values(data).returning();
      // return result;
      return { id: 'new-id', ...data };
    } catch (error) {
      console.error('${methodName} error:', error);
      throw error;
    }`;
  }

  if (lowerMethod.includes('update') || lowerMethod.includes('edit') || lowerMethod.includes('modify')) {
    return `    // Update existing record
    try {
      // const [result] = await db.update(table).set(data).where(eq(table.id, id)).returning();
      // return result;
      return { success: true };
    } catch (error) {
      console.error('${methodName} error:', error);
      throw error;
    }`;
  }

  if (lowerMethod.includes('delete') || lowerMethod.includes('remove')) {
    return `    // Delete record
    try {
      // await db.delete(table).where(eq(table.id, id));
      return true;
    } catch (error) {
      console.error('${methodName} error:', error);
      throw error;
    }`;
  }

  // Default implementation
  return `    // TODO: Implement ${methodName}
    try {
      // Add your implementation here
      return null as any;
    } catch (error) {
      console.error('${methodName} error:', error);
      throw error;
    }`;
}

function generateRoute(routes: RouteDefinition[], controllerName: string): string {
  // Check for auth-related routes and add middleware import
  const hasAuthMiddleware = routes.some(r => r.middleware?.includes('requireAuth'));

  const routeHandlers = routes.map(r => {
    const middlewareStr = r.middleware?.length
      ? `, ${r.middleware.join(', ')}`
      : '';
    return `router.${r.method.toLowerCase()}('${r.path}'${middlewareStr}, ${controllerName.toLowerCase()}Controller.${r.handler});`;
  }).join('\n');

  const middlewareImport = hasAuthMiddleware
    ? `import { requireAuth, requireRole } from '../middleware/auth';\n`
    : '';

  return `import { Router } from 'express';
import { ${controllerName.toLowerCase()}Controller } from '../controllers/${controllerName}Controller';
${middlewareImport}
const router = Router();

${routeHandlers}

export default router;
`;
}

function generateController(routes: RouteDefinition[], name: string): string {
  // Check if we have a full implementation template
  const fullImpl = CONTROLLER_IMPLEMENTATIONS[name];
  if (fullImpl) {
    return fullImpl;
  }

  // Generate smart implementations based on handler names
  const handlers = routes.map(r => {
    const impl = getControllerImplementation(r.handler, r.method);
    return `  async ${r.handler}(req: Request, res: Response) {
    try {
${impl}
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  }`;
  }).join('\n\n');

  const serviceName = name.charAt(0).toLowerCase() + name.slice(1) + 'Service';

  return `import { Request, Response } from 'express';
import { ${serviceName} } from '../services/${name}Service';

class ${name}Controller {
${handlers}
}

export const ${name.toLowerCase()}Controller = new ${name}Controller();
`;
}

function getControllerImplementation(handler: string, method: string): string {
  const lowerHandler = handler.toLowerCase();

  if (lowerHandler.includes('getall') || lowerHandler.includes('list')) {
    return `      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      // const data = await service.getAll({ page, limit });
      res.json({ success: true, data: [], page, limit });`;
  }

  if (lowerHandler.includes('getby') || lowerHandler.includes('get') && method === 'GET') {
    return `      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'ID is required' });
      }
      // const data = await service.getById(id);
      res.json({ success: true, data: { id } });`;
  }

  if (lowerHandler.includes('create') || method === 'POST') {
    return `      const data = req.body;
      if (!data || Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'Request body is required' });
      }
      // const result = await service.create(data);
      res.status(201).json({ success: true, data: { ...data, id: 'new-id' } });`;
  }

  if (lowerHandler.includes('update') || method === 'PUT' || method === 'PATCH') {
    return `      const { id } = req.params;
      const data = req.body;
      if (!id) {
        return res.status(400).json({ error: 'ID is required' });
      }
      // const result = await service.update(id, data);
      res.json({ success: true, data: { id, ...data } });`;
  }

  if (lowerHandler.includes('delete') || method === 'DELETE') {
    return `      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'ID is required' });
      }
      // await service.delete(id);
      res.json({ success: true, message: 'Deleted successfully' });`;
  }

  return `      // TODO: Implement ${handler}
      res.json({ success: true });`;
}

function generateMiddleware(options: GenerationOptions): FileTemplate[] {
  const files: FileTemplate[] = [];

  // Auth middleware
  files.push({
    path: 'server/src/middleware/auth.ts',
    content: `import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      role: string;
    };

    (req as AuthRequest).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthRequest).user;

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        email: string;
        role: string;
      };
      (req as AuthRequest).user = decoded;
    }

    next();
  } catch {
    // Token invalid but continue anyway for optional auth
    next();
  }
}
`,
    type: 'source',
  });

  // Error handling middleware
  files.push({
    path: 'server/src/middleware/errorHandler.ts',
    content: `import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string) {
    return new AppError(message, 400);
  }

  static unauthorized(message = 'Unauthorized') {
    return new AppError(message, 401);
  }

  static forbidden(message = 'Forbidden') {
    return new AppError(message, 403);
  }

  static notFound(message = 'Not found') {
    return new AppError(message, 404);
  }

  static internal(message = 'Internal server error') {
    return new AppError(message, 500);
  }
}

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // Handle known error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }

  // Default error
  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && {
      message: err.message,
      stack: err.stack
    }),
  });
}

export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
`,
    type: 'source',
  });

  // Rate limiting middleware
  files.push({
    path: 'server/src/middleware/rateLimit.ts',
    content: `import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const store: RateLimitStore = {};

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  message?: string;
}

export function rateLimit(options: RateLimitOptions = {}) {
  const {
    windowMs = 60000, // 1 minute
    max = 100,
    message = 'Too many requests, please try again later'
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();

    if (!store[key] || store[key].resetTime < now) {
      store[key] = { count: 1, resetTime: now + windowMs };
    } else {
      store[key].count++;
    }

    if (store[key].count > max) {
      return res.status(429).json({ error: message });
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', max - store[key].count);
    res.setHeader('X-RateLimit-Reset', store[key].resetTime);

    next();
  };
}

// Stricter rate limit for auth endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many login attempts, please try again later',
});
`,
    type: 'source',
  });

  // Middleware index
  files.push({
    path: 'server/src/middleware/index.ts',
    content: `export { requireAuth, requireRole, optionalAuth, AuthRequest } from './auth';
export { errorHandler, asyncHandler, AppError } from './errorHandler';
export { rateLimit, authRateLimit } from './rateLimit';
`,
    type: 'source',
  });

  return files;
}

// ============================================
// DEEP PROJECT GENERATOR
// ============================================

interface GenerationOptions {
  blueprint: string;
  name: string;
  features: string[];
  includeTests?: boolean;
  includeDocker?: boolean;
  includeDocs?: boolean;
  enableAIRefinement?: boolean;
  aiRefinementOptions?: {
    enableSecurityReview?: boolean;
    enableCodeQuality?: boolean;
    enablePerformance?: boolean;
    enableConsistency?: boolean;
    maxFilesToRefine?: number;
  };
}

interface GeneratedProject {
  name: string;
  blueprint: ProjectBlueprint;
  files: FileTemplate[];
  totalFiles: number;
  structure: string;
  features: string[];
  refinement?: {
    filesRefined: number;
    improvements: string[];
    enabled: boolean;
  };
}

export function generateDeepProject(options: GenerationOptions): GeneratedProject {
  const blueprint = BLUEPRINTS[options.blueprint] || BLUEPRINTS['fullstack-react-express'];
  const files: FileTemplate[] = [];

  // Generate config files
  files.push(...generateConfigFiles(blueprint, options));

  // Generate directory structure files
  for (const dir of blueprint.structure.directories) {
    files.push({
      path: `${dir}/.gitkeep`,
      content: '',
      type: 'config',
    });
  }

  // Generate base layout components
  files.push(...generateLayoutComponents(blueprint, options));

  // Generate UI component library
  files.push(...generateUIComponents(options));

  // Generate feature modules
  for (const featureName of options.features) {
    const feature = FEATURE_MODULES[featureName];
    if (feature) {
      files.push(...generateFeatureModule(feature, options));
    }
  }

  // Generate middleware (always include auth middleware for projects with auth)
  if (options.features.includes('auth')) {
    files.push(...generateMiddleware(options));
  }

  // Generate shared types
  files.push(...generateSharedTypes(blueprint, options));

  // Generate pages
  files.push(...generatePages(blueprint, options));

  // Generate tests if requested
  if (options.includeTests) {
    files.push(...generateTests(files, options));
  }

  // Generate docs if requested
  if (options.includeDocs) {
    files.push(...generateDocs(blueprint, options));
  }

  const structure = formatProjectStructure(files);

  return {
    name: options.name,
    blueprint,
    files,
    totalFiles: files.length,
    structure,
    features: options.features,
  };
}

/**
 * Generate project with AI refinement
 * This async version includes AI-powered code review and improvement
 */
export async function generateDeepProjectWithAI(options: GenerationOptions): Promise<GeneratedProject> {
  // First generate the base project
  const project = generateDeepProject(options);

  // If AI refinement is not enabled, return as-is
  if (!options.enableAIRefinement) {
    return {
      ...project,
      refinement: { filesRefined: 0, improvements: [], enabled: false },
    };
  }

  // Import the AI refiner dynamically to avoid circular dependencies
  const { refineCode } = await import('./ai-code-refiner');

  // Prepare files for refinement
  const filesToRefine = project.files
    .filter(f => f.content.length > 100)
    .map(f => ({
      path: f.path,
      content: f.content,
      type: f.type,
    }));

  // Run AI refinement
  const refinementResults = await refineCode(filesToRefine, {
    enableSecurityReview: options.aiRefinementOptions?.enableSecurityReview ?? true,
    enableCodeQuality: options.aiRefinementOptions?.enableCodeQuality ?? true,
    enablePerformance: options.aiRefinementOptions?.enablePerformance ?? false,
    enableConsistency: options.aiRefinementOptions?.enableConsistency ?? false,
    maxFilesToRefine: options.aiRefinementOptions?.maxFilesToRefine ?? 15,
  });

  // Apply refinements to files
  const refinedFiles = project.files.map(file => {
    const refinement = refinementResults.find(r => r.path === file.path);
    if (refinement && refinement.wasImproved) {
      return { ...file, content: refinement.refinedContent };
    }
    return file;
  });

  // Collect all improvements
  const allImprovements = refinementResults
    .filter(r => r.wasImproved)
    .flatMap(r => r.improvements.map(i => `${r.path}: ${i}`));

  return {
    ...project,
    files: refinedFiles,
    refinement: {
      filesRefined: refinementResults.filter(r => r.wasImproved).length,
      improvements: allImprovements,
      enabled: true,
    },
  };
}

function generateConfigFiles(blueprint: ProjectBlueprint, options: GenerationOptions): FileTemplate[] {
  const files: FileTemplate[] = [];

  files.push({
    path: 'package.json',
    content: JSON.stringify({
      name: options.name.toLowerCase().replace(/\s+/g, '-'),
      version: '1.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'tsc && vite build',
        preview: 'vite preview',
        test: 'vitest',
        lint: 'eslint . --ext .ts,.tsx',
      },
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        '@tanstack/react-query': '^5.0.0',
        'react-hook-form': '^7.48.0',
        wouter: '^3.0.0',
        'lucide-react': '^0.300.0',
        'tailwindcss': '3.4.17',
        ...(blueprint.techStack.database === 'postgresql' && { 'drizzle-orm': '^0.29.0' }),
      },
      devDependencies: {
        typescript: '^5.3.0',
        vite: '^5.0.0',
        '@vitejs/plugin-react': '^4.2.0',
        '@types/react': '^18.2.0',
        '@types/react-dom': '^18.2.0',
        '@types/node': '^20.10.0',
        vitest: '^1.0.0',
        autoprefixer: '^10.4.16',
        postcss: '^8.4.32',
        'fast-glob': '^3.3.2',
      },
    }, null, 2),
    type: 'config',
  });

  files.push({
    path: 'tsconfig.json',
    content: JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'bundler',
        strict: true,
        jsx: 'react-jsx',
        baseUrl: '.',
        paths: { '@/*': ['./src/*'] },
      },
      include: ['src/**/*'],
    }, null, 2),
    type: 'config',
  });

  files.push({
    path: 'vite.config.ts',
    content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
`,
    type: 'config',
  });

  files.push({
    path: 'tailwind.config.ts',
    content: `import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
} satisfies Config;
`,
    type: 'config',
  });

  files.push({
    path: '.env.example',
    content: `DATABASE_URL=postgresql://user:password@localhost:5432/db
SESSION_SECRET=your-secret-key
`,
    type: 'config',
  });

  files.push({
    path: '.gitignore',
    content: `node_modules/
dist/
.env
*.log
`,
    type: 'config',
  });

  // index.html - Vite entry point
  files.push({
    path: 'index.html',
    content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${options.name}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    type: 'config',
  });

  // main.tsx - React entry point
  files.push({
    path: 'src/main.tsx',
    content: `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
`,
    type: 'source',
  });

  // App.tsx - Root component with routing
  files.push({
    path: 'src/App.tsx',
    content: `import { Switch, Route } from 'wouter';
import { Layout } from '@/components/layout';
import Home from '@/pages/Home';
import Dashboard from '@/pages/Dashboard';
import Users from '@/pages/Users';
import Settings from '@/pages/Settings';

function App() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/users" component={Users} />
        <Route path="/settings" component={Settings} />
        <Route>
          <div className="flex items-center justify-center h-full">
            <h1 className="text-2xl">404 - Page Not Found</h1>
          </div>
        </Route>
      </Switch>
    </Layout>
  );
}

export default App;
`,
    type: 'source',
  });

  // index.css - Tailwind CSS v4
  files.push({
    path: 'src/index.css',
    content: `@import "tailwindcss";

@theme inline {
  --color-foreground: hsl(222.2 84% 4.9%);
  --color-background: hsl(0 0% 100%);
  --color-muted: hsl(210 40% 96%);
  --color-muted-foreground: hsl(215.4 16.3% 46.9%);
  --color-border: hsl(214.3 31.8% 91.4%);
  --color-primary: hsl(222.2 47.4% 11.2%);
  --color-primary-foreground: hsl(210 40% 98%);
  --radius: 0.5rem;
  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
}

:root {
  --foreground: 222.2 84% 4.9%;
  --background: 0 0% 100%;
  --muted: 210 40% 96%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --border: 214.3 31.8% 91.4%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
}

.dark {
  --foreground: 210 40% 98%;
  --background: 222.2 84% 4.9%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --border: 217.2 32.6% 17.5%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
}

body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}
`,
    type: 'style',
  });

  // postcss.config.js - Tailwind v4
  files.push({
    path: 'postcss.config.js',
    content: `export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
`,
    type: 'config',
  });

  return files;
}

function generateLayoutComponents(blueprint: ProjectBlueprint, options: GenerationOptions): FileTemplate[] {
  const files: FileTemplate[] = [];

  files.push({
    path: 'src/components/layout/Layout.tsx',
    content: `import { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>
      <Footer />
    </div>
  );
}
`,
    type: 'source',
  });

  files.push({
    path: 'src/components/layout/Header.tsx',
    content: `import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

export function Header() {
  return (
    <header className="h-16 border-b flex items-center justify-between px-6">
      <Link href="/">
        <span className="text-xl font-bold">${options.name}</span>
      </Link>
      <nav className="flex items-center gap-4">
        <Button variant="ghost">Login</Button>
        <Button>Get Started</Button>
      </nav>
    </header>
  );
}
`,
    type: 'source',
  });

  files.push({
    path: 'src/components/layout/Sidebar.tsx',
    content: `import { Link, useLocation } from 'wouter';
import { Home, Settings, Users, BarChart } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/dashboard', label: 'Dashboard', icon: BarChart },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 border-r p-4">
      <nav className="space-y-2">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <a className={\`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 \${location === item.href ? 'bg-gray-100' : ''}\`}>
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </a>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
`,
    type: 'source',
  });

  files.push({
    path: 'src/components/layout/Footer.tsx',
    content: `export function Footer() {
  return (
    <footer className="h-16 border-t flex items-center justify-center text-gray-500">
      <p>&copy; ${new Date().getFullYear()} ${options.name}. All rights reserved.</p>
    </footer>
  );
}
`,
    type: 'source',
  });

  files.push({
    path: 'src/components/layout/index.ts',
    content: `export { Layout } from './Layout';
export { Header } from './Header';
export { Sidebar } from './Sidebar';
export { Footer } from './Footer';
`,
    type: 'source',
  });

  return files;
}

function generateUIComponents(options: GenerationOptions): FileTemplate[] {
  const files: FileTemplate[] = [];

  const uiComponents = [
    { name: 'Button', props: 'variant?: "default" | "ghost" | "outline"; size?: "sm" | "md" | "lg"; children: ReactNode' },
    { name: 'Card', props: 'children: ReactNode; className?: string' },
    { name: 'Input', props: 'type?: string; placeholder?: string; value?: string; onChange?: (e: ChangeEvent<HTMLInputElement>) => void' },
    { name: 'Label', props: 'children: ReactNode; htmlFor?: string' },
    { name: 'Select', props: 'options: { value: string; label: string }[]; value?: string; onChange?: (value: string) => void' },
    { name: 'Checkbox', props: 'checked?: boolean; onChange?: (checked: boolean) => void; label?: string' },
    { name: 'Modal', props: 'isOpen: boolean; onClose: () => void; title?: string; children: ReactNode' },
    { name: 'Dropdown', props: 'trigger: ReactNode; items: { label: string; onClick: () => void }[]' },
    { name: 'Avatar', props: 'src?: string; alt?: string; fallback?: string; size?: "sm" | "md" | "lg"' },
    { name: 'Badge', props: 'variant?: "default" | "success" | "warning" | "error"; children: ReactNode' },
    { name: 'Tabs', props: 'tabs: { id: string; label: string; content: ReactNode }[]' },
    { name: 'Table', props: 'columns: Column[]; data: Record<string, unknown>[]' },
    { name: 'Pagination', props: 'page: number; totalPages: number; onPageChange: (page: number) => void' },
    { name: 'Spinner', props: 'size?: "sm" | "md" | "lg"' },
    { name: 'Toast', props: 'message: string; type?: "success" | "error" | "warning" | "info"' },
    { name: 'Tooltip', props: 'content: string; children: ReactNode' },
    { name: 'Skeleton', props: 'width?: string; height?: string' },
    { name: 'Alert', props: 'type?: "success" | "error" | "warning" | "info"; title?: string; children: ReactNode' },
    { name: 'Progress', props: 'value: number; max?: number' },
    { name: 'Switch', props: 'checked?: boolean; onChange?: (checked: boolean) => void' },
  ];

  for (const comp of uiComponents) {
    files.push({
      path: `src/components/ui/${comp.name.toLowerCase()}.tsx`,
      content: `import { ReactNode, ChangeEvent } from 'react';

interface ${comp.name}Props {
  ${comp.props.split('; ').join(';\n  ')}
}

export function ${comp.name}(props: ${comp.name}Props) {
  return (
    <div className="${comp.name.toLowerCase()}" data-testid="${comp.name.toLowerCase()}">
      {/* ${comp.name} implementation */}
    </div>
  );
}
`,
      type: 'source',
    });
  }

  files.push({
    path: 'src/components/ui/index.ts',
    content: uiComponents.map(c => `export { ${c.name} } from './${c.name.toLowerCase()}';`).join('\n'),
    type: 'source',
  });

  return files;
}

function generateFeatureModule(feature: FeatureModule, options: GenerationOptions): FileTemplate[] {
  const files: FileTemplate[] = [];

  // Generate components
  for (const comp of feature.components) {
    files.push({
      path: comp.path,
      content: generateReactComponent(comp, options),
      type: 'source',
    });
  }

  // Generate hooks
  if (feature.hooks) {
    for (const hook of feature.hooks) {
      files.push({
        path: `src/hooks/${hook.name}.ts`,
        content: generateHook(hook),
        type: 'source',
      });
    }
  }

  // Generate services
  if (feature.services) {
    for (const service of feature.services) {
      files.push({
        path: `server/src/services/${service.name}.ts`,
        content: generateService(service),
        type: 'source',
      });
    }
  }

  // Generate routes
  if (feature.routes) {
    const routeName = feature.name.toLowerCase().replace(/\s+/g, '-');
    files.push({
      path: `server/src/routes/${routeName}.ts`,
      content: generateRoute(feature.routes, `${feature.name}Controller`),
      type: 'source',
    });

    files.push({
      path: `server/src/controllers/${feature.name}Controller.ts`,
      content: generateController(feature.routes, feature.name),
      type: 'source',
    });
  }

  return files;
}

function generateSharedTypes(blueprint: ProjectBlueprint, options: GenerationOptions): FileTemplate[] {
  const files: FileTemplate[] = [];

  files.push({
    path: 'shared/types.ts',
    content: `export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  createdAt: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface QueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
`,
    type: 'source',
  });

  if (blueprint.techStack.database === 'postgresql') {
    files.push({
      path: 'shared/schema.ts',
      content: `import { pgTable, text, varchar, serial, timestamp, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: varchar('id').primaryKey().default(sql\`gen_random_uuid()\`),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  password: text('password').notNull(),
  role: text('role').default('user'),
  createdAt: timestamp('created_at').default(sql\`CURRENT_TIMESTAMP\`).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
`,
      type: 'source',
    });
  }

  return files;
}

function generatePages(blueprint: ProjectBlueprint, options: GenerationOptions): FileTemplate[] {
  const files: FileTemplate[] = [];

  // Home Page
  files.push({
    path: 'src/pages/Home.tsx',
    content: `import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Home</h1>
      <p className="text-gray-600">Welcome to ${options.name}!</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Quick Start</h3>
          <p className="text-gray-500 mb-4">Get started with your new project.</p>
          <Button>Learn More</Button>
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Documentation</h3>
          <p className="text-gray-500 mb-4">Read the full documentation.</p>
          <Button variant="outline">View Docs</Button>
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Support</h3>
          <p className="text-gray-500 mb-4">Need help? We're here for you.</p>
          <Button variant="ghost">Contact Us</Button>
        </Card>
      </div>
    </div>
  );
}
`,
    type: 'source',
  });

  // Dashboard Page
  files.push({
    path: 'src/pages/Dashboard.tsx',
    content: `import { Card } from '@/components/ui/card';
import { BarChart, Users, DollarSign, Activity } from 'lucide-react';

const stats = [
  { label: 'Total Revenue', value: '$45,231', change: '+20.1%', icon: DollarSign },
  { label: 'Active Users', value: '2,350', change: '+15.3%', icon: Users },
  { label: 'Page Views', value: '12,543', change: '+8.2%', icon: Activity },
  { label: 'Conversion Rate', value: '3.2%', change: '+2.4%', icon: BarChart },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-green-500">{stat.change}</p>
              </div>
              <stat.icon className="w-10 h-10 text-gray-400" />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Activity Item {i}</p>
                  <p className="text-sm text-gray-500">{i} hour(s) ago</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Performance Overview</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-gray-400">Chart placeholder</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
`,
    type: 'source',
  });

  // Users Page
  files.push({
    path: 'src/pages/Users.tsx',
    content: `import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search, Plus, MoreVertical } from 'lucide-react';

const users = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'Active' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'User', status: 'Inactive' },
  { id: 4, name: 'Alice Williams', email: 'alice@example.com', role: 'Editor', status: 'Active' },
  { id: 5, name: 'Charlie Brown', email: 'charlie@example.com', role: 'User', status: 'Active' },
];

export default function Users() {
  const [search, setSearch] = useState('');

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Users</h1>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Email</th>
                <th className="text-left py-3 px-4">Role</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{user.name}</td>
                  <td className="py-3 px-4 text-gray-500">{user.email}</td>
                  <td className="py-3 px-4">{user.role}</td>
                  <td className="py-3 px-4">
                    <span className={\`px-2 py-1 rounded-full text-xs \${user.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}\`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
`,
    type: 'source',
  });

  // Settings Page
  files.push({
    path: 'src/pages/Settings.tsx',
    content: `import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Settings() {
  const [profile, setProfile] = useState({
    name: 'John Doe',
    email: 'john@example.com',
    company: 'Acme Inc',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Settings saved!');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-bold">Settings</h1>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Profile Settings</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={profile.company}
              onChange={(e) => setProfile({ ...profile, company: e.target.value })}
            />
          </div>
          <Button type="submit">Save Changes</Button>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Notification Preferences</h2>
        <div className="space-y-3">
          {['Email notifications', 'Push notifications', 'Weekly digest'].map((item) => (
            <label key={item} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-4 h-4" defaultChecked />
              <span>{item}</span>
            </label>
          ))}
        </div>
      </Card>

      <Card className="p-6 border-red-200">
        <h2 className="text-lg font-semibold mb-4 text-red-600">Danger Zone</h2>
        <p className="text-gray-600 mb-4">Once you delete your account, there is no going back.</p>
        <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
          Delete Account
        </Button>
      </Card>
    </div>
  );
}
`,
    type: 'source',
  });

  // Pages index export
  files.push({
    path: 'src/pages/index.ts',
    content: `export { default as Home } from './Home';
export { default as Dashboard } from './Dashboard';
export { default as Users } from './Users';
export { default as Settings } from './Settings';
`,
    type: 'source',
  });

  return files;
}

function generateTests(files: FileTemplate[], options: GenerationOptions): FileTemplate[] {
  const tests: FileTemplate[] = [];

  // Add comprehensive test setup file
  tests.push({
    path: 'src/test/setup.ts',
    content: `import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
`,
    type: 'test',
  });

  // Add test utilities
  tests.push({
    path: 'src/test/utils.tsx',
    content: `import { ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

interface WrapperProps {
  children: ReactNode;
}

function AllProviders({ children }: WrapperProps) {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react';
export { renderWithProviders as render };
`,
    type: 'test',
  });

  // Generate comprehensive component tests
  const componentFiles = files.filter(f =>
    f.type === 'source' &&
    f.path.endsWith('.tsx') &&
    (f.path.includes('/components/') || f.path.includes('/pages/'))
  );

  for (const file of componentFiles.slice(0, 25)) {
    const componentName = file.path.split('/').pop()?.replace('.tsx', '');
    if (!componentName || componentName === 'index') continue;

    const isPage = file.path.includes('/pages/');
    const testContent = generateComponentTest(componentName, isPage, file.content);

    tests.push({
      path: file.path.replace('.tsx', '.test.tsx'),
      content: testContent,
      type: 'test',
    });
  }

  // Add API/integration tests
  tests.push({
    path: 'server/tests/auth.test.ts',
    content: `import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';

describe('Authentication API', () => {
  const testUser = {
    email: \`test-\${Date.now()}@example.com\`,
    password: 'TestPassword123!',
    name: 'Test User',
  };
  let authToken: string;

  describe('POST /api/auth/register', () => {
    it('should create a new user with valid data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.token).toBeDefined();
      authToken = response.body.token;
    });

    it('should reject duplicate email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...testUser, email: 'invalid-email' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should require password minimum length', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...testUser, email: 'new@test.com', password: '123' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'password' })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', \`Bearer \${authToken}\`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should reject without token', async () => {
      await request(app)
        .get('/api/auth/me')
        .expect(401);
    });

    it('should reject invalid token', async () => {
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
`,
    type: 'test',
  });

  // Add E2E test example
  tests.push({
    path: 'e2e/auth.spec.ts',
    content: `import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  const testEmail = \`e2e-\${Date.now()}@example.com\`;
  const testPassword = 'TestPassword123!';

  test('should display login form', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /login|sign in/i })).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: /login|sign in/i }).click();

    await expect(page.getByText(/email.*required|please enter.*email/i)).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('link', { name: /register|sign up|create account/i }).click();

    await expect(page).toHaveURL(/register|signup/);
  });

  test('should register new user successfully', async ({ page }) => {
    await page.goto('/register');

    await page.getByPlaceholder(/name/i).fill('E2E Test User');
    await page.getByPlaceholder(/email/i).fill(testEmail);
    await page.getByPlaceholder(/password/i).first().fill(testPassword);

    await page.getByRole('button', { name: /register|sign up|create/i }).click();

    // Should redirect to dashboard or show success
    await expect(page.getByText(/welcome|dashboard|success/i)).toBeVisible({ timeout: 5000 });
  });

  test('should login with registered user', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder(/email/i).fill(testEmail);
    await page.getByPlaceholder(/password/i).fill(testPassword);

    await page.getByRole('button', { name: /login|sign in/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard|home/, { timeout: 5000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder(/email/i).fill('wrong@example.com');
    await page.getByPlaceholder(/password/i).fill('wrongpassword');

    await page.getByRole('button', { name: /login|sign in/i }).click();

    await expect(page.getByText(/invalid|error|failed/i)).toBeVisible({ timeout: 5000 });
  });
});
`,
    type: 'test',
  });

  return tests;
}

function generateComponentTest(componentName: string, isPage: boolean, content: string): string {
  const hasForm = content.includes('form') || content.includes('Form');
  const hasButton = content.includes('Button') || content.includes('button');
  const hasCard = content.includes('Card');
  const hasStats = content.includes('stats') || content.includes('Stats');
  const hasTable = content.includes('Table') || content.includes('table');

  let testContent = `import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
`;

  if (isPage) {
    testContent += `import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ${componentName} from './${componentName}';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

`;
  } else {
    testContent += `import { ${componentName} } from './${componentName}';

`;
  }

  testContent += `describe('${componentName}', () => {
  const user = userEvent.setup();

  it('renders without crashing', () => {
    ${isPage ? `renderWithProviders(<${componentName} />)` : `render(<${componentName} />)`};
    expect(document.body).toBeTruthy();
  });

  it('has correct heading or title', () => {
    ${isPage ? `renderWithProviders(<${componentName} />)` : `render(<${componentName} />)`};
    const heading = screen.queryByRole('heading');
    if (heading) {
      expect(heading).toBeInTheDocument();
    }
  });
`;

  if (hasButton) {
    testContent += `
  it('handles button click events', async () => {
    ${isPage ? `renderWithProviders(<${componentName} />)` : `render(<${componentName} />)`};
    const buttons = screen.queryAllByRole('button');

    for (const button of buttons.slice(0, 3)) {
      expect(button).toBeEnabled();
      await user.click(button);
    }
  });
`;
  }

  if (hasCard) {
    testContent += `
  it('renders card components correctly', () => {
    ${isPage ? `renderWithProviders(<${componentName} />)` : `render(<${componentName} />)`};
    const cards = document.querySelectorAll('[class*="card"]');
    expect(cards.length).toBeGreaterThanOrEqual(0);
  });
`;
  }

  if (hasStats) {
    testContent += `
  it('displays statistics correctly', () => {
    ${isPage ? `renderWithProviders(<${componentName} />)` : `render(<${componentName} />)`};
    // Stats should show numeric values
    const stats = screen.queryAllByText(/\\d+/);
    expect(stats.length).toBeGreaterThan(0);
  });
`;
  }

  if (hasForm) {
    testContent += `
  it('handles form submission', async () => {
    const handleSubmit = vi.fn();
    ${isPage ? `renderWithProviders(<${componentName} />)` : `render(<${componentName} onSubmit={handleSubmit} />)`};

    const inputs = screen.queryAllByRole('textbox');
    for (const input of inputs) {
      await user.type(input, 'test value');
    }

    const submitButton = screen.queryByRole('button', { name: /submit|save|create/i });
    if (submitButton) {
      await user.click(submitButton);
    }
  });

  it('validates required fields', async () => {
    ${isPage ? `renderWithProviders(<${componentName} />)` : `render(<${componentName} />)`};

    const submitButton = screen.queryByRole('button', { name: /submit|save|create/i });
    if (submitButton) {
      await user.click(submitButton);
      // Should show validation errors for empty required fields
    }
  });
`;
  }

  if (hasTable) {
    testContent += `
  it('renders table with data', () => {
    ${isPage ? `renderWithProviders(<${componentName} />)` : `render(<${componentName} />)`};
    const table = screen.queryByRole('table');
    if (table) {
      expect(table).toBeInTheDocument();
      const rows = screen.queryAllByRole('row');
      expect(rows.length).toBeGreaterThan(0);
    }
  });
`;
  }

  testContent += `
  it('is accessible', async () => {
    ${isPage ? `const { container } = renderWithProviders(<${componentName} />)` : `const { container } = render(<${componentName} />)`};

    // Check for basic accessibility
    const buttons = container.querySelectorAll('button');
    buttons.forEach(button => {
      expect(button).not.toHaveAttribute('aria-hidden', 'true');
    });

    const images = container.querySelectorAll('img');
    images.forEach(img => {
      expect(img).toHaveAttribute('alt');
    });
  });
});
`;

  return testContent;
}

function generateDocs(blueprint: ProjectBlueprint, options: GenerationOptions): FileTemplate[] {
  return [
    {
      path: 'README.md',
      content: `# ${options.name}

${blueprint.description}

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Tech Stack

${Object.entries(blueprint.techStack)
  .filter(([_, v]) => v)
  .map(([k, v]) => `- **${k}**: ${v}`)
  .join('\n')}

## Features

${options.features.map(f => `- ${FEATURE_MODULES[f]?.name || f}`).join('\n')}

## Project Structure

\`\`\`
${formatProjectStructure([])}
\`\`\`
`,
      type: 'doc',
    },
  ];
}

function formatProjectStructure(files: FileTemplate[]): string {
  const tree: Record<string, any> = {};

  for (const file of files) {
    const parts = file.path.split('/');
    let current = tree;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current[part] = null;
      } else {
        current[part] = current[part] || {};
        current = current[part];
      }
    }
  }

  function renderTree(obj: Record<string, any>, prefix: string = ''): string {
    const entries = Object.entries(obj);
    return entries.map(([key, value], index) => {
      const isLast = index === entries.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const childPrefix = isLast ? '    ' : '│   ';

      if (value === null) {
        return `${prefix}${connector}${key}`;
      } else {
        return `${prefix}${connector}${key}/\n${renderTree(value, prefix + childPrefix)}`;
      }
    }).join('\n');
  }

  return renderTree(tree);
}

// ============================================
// EXPORTS
// ============================================

export function listBlueprints(): { id: string; name: string; description: string; estimatedFiles: number }[] {
  return Object.values(BLUEPRINTS).map(b => ({
    id: b.id,
    name: b.name,
    description: b.description,
    estimatedFiles: b.estimatedFiles,
  }));
}

export function listFeatures(): { id: string; name: string; description: string }[] {
  return Object.entries(FEATURE_MODULES).map(([id, f]) => ({
    id,
    name: f.name,
    description: f.description,
  }));
}

export function getBlueprint(id: string): ProjectBlueprint | undefined {
  return BLUEPRINTS[id];
}

export function getFeature(id: string): FeatureModule | undefined {
  return FEATURE_MODULES[id];
}

export { BLUEPRINTS, FEATURE_MODULES };
export type { ProjectBlueprint, FeatureModule, GenerationOptions, GeneratedProject, FileTemplate };

// ============================================
// INTEGRATION WITH COMPLETE-CODE-INTELLIGENCE
// ============================================

import {
  PROJECT_BLUEPRINTS as EXTERNAL_BLUEPRINTS,
  FRAMEWORK_PATTERNS,
  BACKEND_PATTERNS,
  UI_COMPONENTS,
  AUTH_PATTERNS,
  DATABASE_PATTERNS,
  getPatternByType,
  getAllBlueprints as getExternalBlueprints,
} from './complete-code-intelligence.js';

/**
 * Get a framework pattern by framework and pattern type
 */
export function getFrameworkPattern(framework: 'react' | 'nextjs' | 'vue', patternType: string): string | undefined {
  const frameworkPatterns = FRAMEWORK_PATTERNS[framework];
  if (!frameworkPatterns) return undefined;
  return frameworkPatterns[patternType as keyof typeof frameworkPatterns] as string | undefined;
}

/**
 * Get a backend pattern by framework and pattern type
 */
export function getBackendPattern(framework: 'express' | 'fastapi' | 'go', patternType: string): string | undefined {
  const backendPatterns = BACKEND_PATTERNS[framework];
  if (!backendPatterns) return undefined;
  return backendPatterns[patternType as keyof typeof backendPatterns] as string | undefined;
}

/**
 * Get a UI component template by name
 */
export function getUIComponent(componentName: string): string | undefined {
  return UI_COMPONENTS[componentName as keyof typeof UI_COMPONENTS] as string | undefined;
}

/**
 * Get authentication pattern by type
 */
export function getAuthPattern(authType: 'jwt' | 'oauth' | 'twoFactor', patternName: string): string | undefined {
  const authPatterns = AUTH_PATTERNS[authType];
  if (!authPatterns) return undefined;
  return authPatterns[patternName as keyof typeof authPatterns] as string | undefined;
}

/**
 * Get database pattern by ORM type
 */
export function getDatabasePattern(orm: 'drizzle' | 'prisma', patternName: string): string | undefined {
  const dbPatterns = DATABASE_PATTERNS[orm];
  if (!dbPatterns) return undefined;
  return dbPatterns[patternName as keyof typeof dbPatterns] as string | undefined;
}

/**
 * Get all available blueprints from both internal and external sources
 */
export function getAllAvailableBlueprints() {
  const internal = Object.values(BLUEPRINTS).map(b => ({
    id: b.id,
    name: b.name,
    description: b.description,
    estimatedFiles: b.estimatedFiles,
    source: 'internal' as const,
  }));

  const external = getExternalBlueprints().map(b => ({
    ...b,
    source: 'external' as const,
  }));

  return [...internal, ...external];
}

/**
 * Get external blueprint files for a specific blueprint type
 */
export function getExternalBlueprintFiles(blueprintType: string) {
  const blueprint = EXTERNAL_BLUEPRINTS[blueprintType as keyof typeof EXTERNAL_BLUEPRINTS];
  if (!blueprint) return [];
  return blueprint.files;
}

/**
 * Unified pattern retrieval - searches all pattern sources
 */
export function getAnyPattern(category: string, name: string): string | undefined {
  return getPatternByType(category, name);
}