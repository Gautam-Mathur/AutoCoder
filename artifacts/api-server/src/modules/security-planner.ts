import type { ProjectPlan, PlannedEntity, PlannedRole, SecurityPlan } from './plan-generator.js';

const WELL_KNOWN_ROLE_LEVELS: Record<string, number> = {
  'superadmin': 100,
  'super_admin': 100,
  'super admin': 100,
  'owner': 90,
  'admin': 80,
  'administrator': 80,
  'manager': 60,
  'supervisor': 55,
  'lead': 50,
  'editor': 40,
  'moderator': 40,
  'author': 35,
  'contributor': 30,
  'member': 25,
  'user': 20,
  'customer': 20,
  'student': 20,
  'patient': 20,
  'employee': 20,
  'tenant': 20,
  'agent': 30,
  'staff': 30,
  'viewer': 10,
  'guest': 5,
  'public': 0,
};

const ROLE_PERMISSION_SETS: Record<string, ('create' | 'read' | 'update' | 'delete')[]> = {
  'superadmin': ['create', 'read', 'update', 'delete'],
  'admin': ['create', 'read', 'update', 'delete'],
  'manager': ['create', 'read', 'update', 'delete'],
  'editor': ['create', 'read', 'update'],
  'author': ['create', 'read', 'update'],
  'contributor': ['create', 'read'],
  'member': ['create', 'read'],
  'user': ['create', 'read'],
  'viewer': ['read'],
  'guest': ['read'],
};

const SENSITIVE_FIELDS = new Set([
  'salary', 'wage', 'compensation', 'pay', 'income', 'bonus',
  'ssn', 'social_security', 'socialSecurity', 'social_security_number',
  'password', 'passwordHash', 'password_hash', 'secret', 'token', 'apiKey', 'api_key',
  'medical', 'diagnosis', 'prescription', 'treatment', 'healthRecord', 'health_record',
  'creditCard', 'credit_card', 'cardNumber', 'card_number', 'cvv', 'expiry',
  'bankAccount', 'bank_account', 'routingNumber', 'routing_number', 'accountNumber', 'account_number',
  'taxId', 'tax_id', 'ein',
  'dob', 'dateOfBirth', 'date_of_birth', 'birthDate', 'birth_date',
  'address', 'homeAddress', 'home_address',
  'phone', 'phoneNumber', 'phone_number', 'mobile',
  'revenue', 'profit', 'margin', 'cost', 'expense',
  'notes', 'internalNotes', 'internal_notes', 'privateNotes', 'private_notes',
]);

const FINANCIAL_ENTITY_KEYWORDS = ['invoice', 'payment', 'transaction', 'salary', 'budget', 'expense', 'billing', 'order', 'subscription', 'revenue', 'refund', 'payout'];
const ADMIN_ONLY_ENTITY_KEYWORDS = ['setting', 'config', 'configuration', 'role', 'permission', 'audit', 'log', 'system'];
const PROFILE_ENTITY_KEYWORDS = ['profile', 'account', 'preference', 'user'];
const PUBLIC_CONTENT_KEYWORDS = ['article', 'post', 'blog', 'page', 'faq', 'announcement', 'news'];

const FIELD_VALIDATION_MAP: Record<string, { rule: string; description: string }> = {
  'email': { rule: 'email-format', description: 'Must be a valid email address' },
  'phone': { rule: 'phone-format', description: 'Must be a valid phone number' },
  'phoneNumber': { rule: 'phone-format', description: 'Must be a valid phone number' },
  'phone_number': { rule: 'phone-format', description: 'Must be a valid phone number' },
  'mobile': { rule: 'phone-format', description: 'Must be a valid phone number' },
  'url': { rule: 'url-format', description: 'Must be a valid URL' },
  'website': { rule: 'url-format', description: 'Must be a valid URL' },
  'link': { rule: 'url-format', description: 'Must be a valid URL' },
  'password': { rule: 'password-strength', description: 'Minimum 8 characters with uppercase, lowercase, number, and special character' },
  'zip': { rule: 'zip-format', description: 'Must be a valid ZIP/postal code' },
  'zipCode': { rule: 'zip-format', description: 'Must be a valid ZIP/postal code' },
  'zip_code': { rule: 'zip-format', description: 'Must be a valid ZIP/postal code' },
  'postalCode': { rule: 'zip-format', description: 'Must be a valid ZIP/postal code' },
  'postal_code': { rule: 'zip-format', description: 'Must be a valid ZIP/postal code' },
};

function getRoleLevel(roleName: string): number {
  const normalized = roleName.toLowerCase().trim();
  if (WELL_KNOWN_ROLE_LEVELS[normalized] !== undefined) {
    return WELL_KNOWN_ROLE_LEVELS[normalized];
  }
  for (const [key, level] of Object.entries(WELL_KNOWN_ROLE_LEVELS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return level;
    }
  }
  return 20;
}

function getStandardPermissions(roleName: string): ('create' | 'read' | 'update' | 'delete')[] {
  const normalized = roleName.toLowerCase().trim();
  if (ROLE_PERMISSION_SETS[normalized]) {
    return ROLE_PERMISSION_SETS[normalized];
  }
  for (const [key, perms] of Object.entries(ROLE_PERMISSION_SETS)) {
    if (normalized.includes(key)) {
      return perms;
    }
  }
  return ['create', 'read'];
}

function matchesKeywords(name: string, keywords: string[]): boolean {
  const lower = name.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

function detectAuthStrategy(plan: ProjectPlan, description: string): SecurityPlan['authStrategy'] {
  const text = description.toLowerCase();
  if (text.includes('oauth') || text.includes('social login') || text.includes('login with google') || text.includes('login with github')) {
    return 'oauth';
  }
  if (text.includes('jwt') || text.includes('json web token')) {
    return 'jwt';
  }
  if (text.includes('api key') || text.includes('api-key') || text.includes('apikey')) {
    return 'api-key';
  }
  if (plan.roles && plan.roles.length > 0) {
    return 'session';
  }
  const hasUserEntity = plan.dataModel.some(e => matchesKeywords(e.name, ['user', 'account', 'member']));
  if (hasUserEntity) {
    return 'session';
  }
  return 'none';
}

function buildRoleHierarchy(roles: PlannedRole[]): SecurityPlan['roleHierarchy'] {
  if (!roles || roles.length === 0) return [];

  const hierarchy = roles.map(role => {
    const level = getRoleLevel(role.name);
    return { role: role.name, level };
  });

  hierarchy.sort((a, b) => b.level - a.level);

  return hierarchy.map((entry, index) => ({
    role: entry.role,
    inheritsFrom: index < hierarchy.length - 1 ? hierarchy[index + 1].role : undefined,
    level: entry.level,
  }));
}

function buildEntityPermissions(entities: PlannedEntity[], roles: PlannedRole[]): SecurityPlan['entityPermissions'] {
  if (!roles || roles.length === 0) return [];

  const permissions: SecurityPlan['entityPermissions'] = [];

  for (const entity of entities) {
    const entityName = entity.name.toLowerCase();

    for (const role of roles) {
      const roleLevel = getRoleLevel(role.name);
      let actions: ('create' | 'read' | 'update' | 'delete')[];

      if (matchesKeywords(entityName, ADMIN_ONLY_ENTITY_KEYWORDS)) {
        actions = roleLevel >= 80 ? ['create', 'read', 'update', 'delete'] : roleLevel >= 60 ? ['read'] : [];
      } else if (matchesKeywords(entityName, FINANCIAL_ENTITY_KEYWORDS)) {
        actions = roleLevel >= 60 ? ['create', 'read', 'update', 'delete'] : roleLevel >= 20 ? ['read'] : [];
      } else if (matchesKeywords(entityName, PROFILE_ENTITY_KEYWORDS)) {
        actions = roleLevel >= 80 ? ['create', 'read', 'update', 'delete'] : roleLevel >= 20 ? ['read', 'update'] : ['read'];
      } else if (matchesKeywords(entityName, PUBLIC_CONTENT_KEYWORDS)) {
        actions = roleLevel >= 40 ? ['create', 'read', 'update', 'delete'] : ['read'];
      } else {
        actions = getStandardPermissions(role.name);
      }

      if (actions.length > 0) {
        permissions.push({ entity: entity.name, role: role.name, actions });
      }
    }
  }

  return permissions;
}

function detectFieldVisibility(entities: PlannedEntity[], roles: PlannedRole[]): SecurityPlan['fieldVisibility'] {
  if (!roles || roles.length === 0) return [];

  const visibility: SecurityPlan['fieldVisibility'] = [];
  const highRoles = roles.filter(r => getRoleLevel(r.name) >= 60).map(r => r.name);

  if (highRoles.length === 0) return [];

  for (const entity of entities) {
    for (const field of entity.fields) {
      const fieldName = field.name.toLowerCase();
      if (SENSITIVE_FIELDS.has(field.name) || SENSITIVE_FIELDS.has(fieldName)) {
        visibility.push({
          entity: entity.name,
          field: field.name,
          visibleTo: highRoles,
        });
      }
    }
  }

  return visibility;
}

function detectDataIsolation(plan: ProjectPlan, description: string): SecurityPlan['dataIsolation'] {
  const text = description.toLowerCase();
  const isolation: SecurityPlan['dataIsolation'] = [];

  if (text.includes('multi-tenant') || text.includes('multitenant') || text.includes('organization') || text.includes('company') || text.includes('workspace') || text.includes('team')) {
    isolation.push({ strategy: 'org-scoped', scopeField: 'organizationId' });
  } else if (text.includes('personal') || text.includes('private') || text.includes('my ')) {
    isolation.push({ strategy: 'user-scoped', scopeField: 'userId' });
  } else if (plan.roles && plan.roles.length > 1) {
    isolation.push({ strategy: 'role-scoped', scopeField: 'roleId' });
  } else {
    isolation.push({ strategy: 'none' });
  }

  return isolation;
}

function deriveValidationRules(entities: PlannedEntity[]): SecurityPlan['validationRules'] {
  const rules: SecurityPlan['validationRules'] = [];

  for (const entity of entities) {
    for (const field of entity.fields) {
      const fieldLower = field.name.toLowerCase();

      if (FIELD_VALIDATION_MAP[field.name]) {
        const mapped = FIELD_VALIDATION_MAP[field.name];
        rules.push({ entity: entity.name, field: field.name, rule: mapped.rule, description: mapped.description });
        continue;
      }

      if (FIELD_VALIDATION_MAP[fieldLower]) {
        const mapped = FIELD_VALIDATION_MAP[fieldLower];
        rules.push({ entity: entity.name, field: field.name, rule: mapped.rule, description: mapped.description });
        continue;
      }

      if (fieldLower.includes('email')) {
        rules.push({ entity: entity.name, field: field.name, rule: 'email-format', description: 'Must be a valid email address' });
      } else if (fieldLower.includes('phone') || fieldLower.includes('mobile') || fieldLower.includes('fax')) {
        rules.push({ entity: entity.name, field: field.name, rule: 'phone-format', description: 'Must be a valid phone number' });
      } else if (fieldLower.includes('url') || fieldLower.includes('website') || fieldLower.includes('link') || fieldLower.includes('href')) {
        rules.push({ entity: entity.name, field: field.name, rule: 'url-format', description: 'Must be a valid URL' });
      } else if (fieldLower.includes('password')) {
        rules.push({ entity: entity.name, field: field.name, rule: 'password-strength', description: 'Minimum 8 characters with uppercase, lowercase, number, and special character' });
      }

      if (field.type.includes('integer') || field.type.includes('decimal') || field.type.includes('numeric') || field.type.includes('real') || field.type.includes('float')) {
        if (fieldLower.includes('amount') || fieldLower.includes('price') || fieldLower.includes('cost') || fieldLower.includes('total') ||
            fieldLower.includes('subtotal') || fieldLower.includes('tax') || fieldLower.includes('fee') || fieldLower.includes('rate') ||
            fieldLower.includes('salary') || fieldLower.includes('wage') || fieldLower.includes('balance') || fieldLower.includes('quantity') || fieldLower.includes('count')) {
          rules.push({ entity: entity.name, field: field.name, rule: 'positive-number', description: 'Must be a positive number' });
        }
      }

      if (field.type.includes('date') || field.type.includes('timestamp')) {
        if (fieldLower.includes('start') || fieldLower.includes('begin')) {
          rules.push({ entity: entity.name, field: field.name, rule: 'date-not-past', description: 'Start date should not be in the past' });
        }
        if (fieldLower.includes('end') || fieldLower.includes('due') || fieldLower.includes('expir')) {
          rules.push({ entity: entity.name, field: field.name, rule: 'date-after-start', description: 'End/due date must be after start date' });
        }
      }
    }
  }

  return rules;
}

function buildRateLimiting(): SecurityPlan['rateLimiting'] {
  return [
    { category: 'auth', maxRequests: 5, windowSeconds: 60 },
    { category: 'write', maxRequests: 30, windowSeconds: 60 },
    { category: 'read', maxRequests: 100, windowSeconds: 60 },
    { category: 'upload', maxRequests: 10, windowSeconds: 60 },
    { category: 'export', maxRequests: 5, windowSeconds: 300 },
    { category: 'bulk', maxRequests: 3, windowSeconds: 60 },
  ];
}

function detectAuditLogEntities(entities: PlannedEntity[]): SecurityPlan['auditLog'] {
  const auditEntities: string[] = [];

  for (const entity of entities) {
    const name = entity.name.toLowerCase();
    if (matchesKeywords(name, FINANCIAL_ENTITY_KEYWORDS) ||
        matchesKeywords(name, ADMIN_ONLY_ENTITY_KEYWORDS) ||
        matchesKeywords(name, PROFILE_ENTITY_KEYWORDS)) {
      auditEntities.push(entity.name);
      continue;
    }
    const hasSensitiveFields = entity.fields.some(f =>
      SENSITIVE_FIELDS.has(f.name) || SENSITIVE_FIELDS.has(f.name.toLowerCase())
    );
    if (hasSensitiveFields) {
      auditEntities.push(entity.name);
    }
  }

  return {
    entities: auditEntities,
    operations: ['create', 'update', 'delete'],
  };
}

export function planSecurity(plan: ProjectPlan, userDescription?: string): SecurityPlan {
  const description = userDescription || plan.overview || '';

  const authStrategy = detectAuthStrategy(plan, description);
  const roleHierarchy = buildRoleHierarchy(plan.roles || []);
  const entityPermissions = buildEntityPermissions(plan.dataModel, plan.roles || []);
  const fieldVisibility = detectFieldVisibility(plan.dataModel, plan.roles || []);
  const dataIsolation = detectDataIsolation(plan, description);
  const validationRules = deriveValidationRules(plan.dataModel);
  const rateLimiting = buildRateLimiting();
  const auditLog = detectAuditLogEntities(plan.dataModel);

  return {
    authStrategy,
    roleHierarchy,
    entityPermissions,
    fieldVisibility,
    dataIsolation,
    validationRules,
    rateLimiting,
    auditLog,
  };
}