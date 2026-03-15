/**
 * API Designer - The "API Architect" of the development team
 *
 * Designs production-quality REST APIs:
 * - RESTful route generation with proper HTTP methods
 * - URL parameter and query parameter design
 * - Request/response schema definitions
 * - Middleware chain planning
 * - Pagination, filtering, sorting, search
 * - Error response standardization
 * - Batch operations
 * - File upload handling
 * - Rate limiting recommendations
 * - Validation schemas
 */

import type { ProjectPlan, PlannedEntity, PlannedEndpoint, SecurityPlan } from './plan-generator.js';
import type { ReasoningResult, EntityRelationship } from './contextual-reasoning-engine.js';
import type { SchemaDesign } from './schema-designer.js';

export interface APIDesign {
  basePath: string;
  version: string;
  routes: RouteDesign[];
  middleware: MiddlewareDesign[];
  errorFormat: ErrorFormat;
  pagination: PaginationDesign;
  rateLimiting: RateLimitDesign;
  validation: ValidationDesign;
  responseFormat: ResponseFormat;
  batchOperations: BatchOperation[];
  fileUploadRoutes: FileUploadRoute[];
}

export interface RouteDesign {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  handler: string;
  entity: string;
  operation: CRUDOperation;
  description: string;
  params: ParamDesign[];
  queryParams: QueryParamDesign[];
  requestBody?: RequestBodyDesign;
  responseSchema: ResponseSchemaDesign;
  middleware: string[];
  cacheable: boolean;
  cacheTTL?: number;
}

export type CRUDOperation = 'list' | 'get' | 'create' | 'update' | 'patch' | 'delete' | 'search' | 'batch' | 'custom';

export interface ParamDesign {
  name: string;
  type: 'string' | 'number';
  description: string;
  required: boolean;
}

export interface QueryParamDesign {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  description: string;
  defaultValue?: string;
  enum?: string[];
}

export interface RequestBodyDesign {
  contentType: 'application/json' | 'multipart/form-data';
  fields: BodyFieldDesign[];
  zodSchema: string;
}

export interface BodyFieldDesign {
  name: string;
  type: string;
  required: boolean;
  validation?: string;
}

export interface ResponseSchemaDesign {
  statusCode: number;
  contentType: string;
  shape: 'single' | 'list' | 'paginated' | 'empty';
  entityName: string;
}

export interface MiddlewareDesign {
  name: string;
  purpose: string;
  appliesTo: string;
  order: number;
  config?: Record<string, unknown>;
}

export interface ErrorFormat {
  shape: {
    error: boolean;
    message: string;
    code: string;
    details?: string;
  };
  httpStatusMapping: Record<string, number>;
}

export interface PaginationDesign {
  strategy: 'offset' | 'cursor';
  defaultPageSize: number;
  maxPageSize: number;
  paramNames: {
    page: string;
    limit: string;
    cursor?: string;
  };
  responseShape: {
    data: string;
    total: string;
    page: string;
    pageSize: string;
    hasMore: string;
  };
}

export interface RateLimitDesign {
  enabled: boolean;
  defaultLimit: number;
  windowMs: number;
  perRoute: Record<string, number>;
}

export interface ValidationDesign {
  library: 'zod';
  schemas: ValidationSchema[];
}

export interface ValidationSchema {
  name: string;
  entity: string;
  operation: 'create' | 'update';
  fields: ValidatedField[];
}

export interface ValidatedField {
  name: string;
  zodType: string;
  optional: boolean;
}

export interface ResponseFormat {
  success: {
    data: string;
    meta?: string;
  };
  error: {
    error: boolean;
    message: string;
    code?: string;
  };
}

export interface BatchOperation {
  entity: string;
  operations: ('create' | 'update' | 'delete')[];
  maxItems: number;
  path: string;
}

export interface FileUploadRoute {
  entity: string;
  field: string;
  path: string;
  maxSize: string;
  allowedTypes: string[];
}

export function designAPI(plan: ProjectPlan, reasoning?: ReasoningResult | null, schema?: SchemaDesign | null): APIDesign {
  const entities = plan.dataModel || [];
  const relationships = reasoning?.relationships || [];

  const routes = generateRoutes(entities, relationships, plan.apiEndpoints || []);
  const middleware = designMiddleware(entities, plan.roles || [], plan.securityPlan);
  const errorFormat = designErrorFormat();
  const pagination = designPagination(entities);
  const rateLimiting = designRateLimiting(entities, plan.securityPlan);
  const validation = generateValidationSchemas(entities);
  const responseFormat = designResponseFormat();
  const batchOperations = detectBatchOperations(entities);
  const fileUploadRoutes = detectFileUploadRoutes(entities);

  return {
    basePath: '/api',
    version: 'v1',
    routes,
    middleware,
    errorFormat,
    pagination,
    rateLimiting,
    validation,
    responseFormat,
    batchOperations,
    fileUploadRoutes,
  };
}

function generateRoutes(entities: PlannedEntity[], relationships: EntityRelationship[], existingEndpoints: PlannedEndpoint[]): RouteDesign[] {
  const routes: RouteDesign[] = [];

  for (const entity of entities) {
    const basePath = `/${toKebab(entity.name)}`;
    const entityName = entity.name;

    routes.push({
      method: 'GET',
      path: basePath,
      handler: `list${entityName}`,
      entity: entityName,
      operation: 'list',
      description: `List all ${entityName} records with pagination, filtering, and sorting`,
      params: [],
      queryParams: generateListQueryParams(entity),
      responseSchema: { statusCode: 200, contentType: 'application/json', shape: 'paginated', entityName },
      middleware: ['validateQuery'],
      cacheable: true,
      cacheTTL: 30000,
    });

    routes.push({
      method: 'GET',
      path: `${basePath}/:id`,
      handler: `get${entityName}`,
      entity: entityName,
      operation: 'get',
      description: `Get a single ${entityName} by ID`,
      params: [{ name: 'id', type: 'number', description: `${entityName} ID`, required: true }],
      queryParams: [],
      responseSchema: { statusCode: 200, contentType: 'application/json', shape: 'single', entityName },
      middleware: [],
      cacheable: true,
      cacheTTL: 60000,
    });

    routes.push({
      method: 'POST',
      path: basePath,
      handler: `create${entityName}`,
      entity: entityName,
      operation: 'create',
      description: `Create a new ${entityName}`,
      params: [],
      queryParams: [],
      requestBody: generateRequestBody(entity, 'create'),
      responseSchema: { statusCode: 201, contentType: 'application/json', shape: 'single', entityName },
      middleware: ['validateBody'],
      cacheable: false,
    });

    routes.push({
      method: 'PUT',
      path: `${basePath}/:id`,
      handler: `update${entityName}`,
      entity: entityName,
      operation: 'update',
      description: `Update an existing ${entityName}`,
      params: [{ name: 'id', type: 'number', description: `${entityName} ID`, required: true }],
      queryParams: [],
      requestBody: generateRequestBody(entity, 'update'),
      responseSchema: { statusCode: 200, contentType: 'application/json', shape: 'single', entityName },
      middleware: ['validateBody'],
      cacheable: false,
    });

    routes.push({
      method: 'DELETE',
      path: `${basePath}/:id`,
      handler: `delete${entityName}`,
      entity: entityName,
      operation: 'delete',
      description: `Delete a ${entityName}`,
      params: [{ name: 'id', type: 'number', description: `${entityName} ID`, required: true }],
      queryParams: [],
      responseSchema: { statusCode: 204, contentType: 'application/json', shape: 'empty', entityName },
      middleware: [],
      cacheable: false,
    });

    const hasSearch = entity.fields.some(f => {
      const n = f.name.toLowerCase();
      return n.includes('name') || n.includes('title') || n.includes('description') || n === 'email';
    });
    if (hasSearch) {
      routes.push({
        method: 'GET',
        path: `${basePath}/search`,
        handler: `search${entityName}`,
        entity: entityName,
        operation: 'search',
        description: `Full-text search across ${entityName} fields`,
        params: [],
        queryParams: [
          { name: 'q', type: 'string', description: 'Search query' },
          { name: 'limit', type: 'number', description: 'Max results', defaultValue: '20' },
        ],
        responseSchema: { statusCode: 200, contentType: 'application/json', shape: 'list', entityName },
        middleware: [],
        cacheable: true,
        cacheTTL: 15000,
      });
    }

    for (const rel of relationships) {
      if (rel.from === entityName && (rel.type === 'parent-child' || rel.type === 'aggregation')) {
        const childPath = `${basePath}/:id/${toKebab(rel.to)}`;
        routes.push({
          method: 'GET',
          path: childPath,
          handler: `get${entityName}${rel.to}`,
          entity: rel.to,
          operation: 'list',
          description: `List ${rel.to} records belonging to a ${entityName}`,
          params: [{ name: 'id', type: 'number', description: `${entityName} ID`, required: true }],
          queryParams: [{ name: 'limit', type: 'number', description: 'Max results', defaultValue: '50' }],
          responseSchema: { statusCode: 200, contentType: 'application/json', shape: 'list', entityName: rel.to },
          middleware: [],
          cacheable: true,
          cacheTTL: 30000,
        });
      }
    }
  }

  return routes;
}

function generateListQueryParams(entity: PlannedEntity): QueryParamDesign[] {
  const params: QueryParamDesign[] = [
    { name: 'page', type: 'number', description: 'Page number', defaultValue: '1' },
    { name: 'limit', type: 'number', description: 'Items per page', defaultValue: '20' },
    { name: 'sortBy', type: 'string', description: 'Sort field', defaultValue: 'createdAt' },
    { name: 'sortOrder', type: 'string', description: 'Sort direction', defaultValue: 'desc', enum: ['asc', 'desc'] },
  ];

  for (const field of entity.fields) {
    const lower = field.name.toLowerCase();
    if (lower === 'status' || lower === 'type' || lower === 'category' || lower === 'priority' || lower === 'role') {
      params.push({ name: field.name, type: 'string', description: `Filter by ${field.name}` });
    }
    if (lower.includes('date') || lower.includes('created') || lower.includes('due')) {
      params.push({ name: `${field.name}From`, type: 'string', description: `Filter ${field.name} from date` });
      params.push({ name: `${field.name}To`, type: 'string', description: `Filter ${field.name} to date` });
    }
  }

  const searchableFields = entity.fields.filter(f => {
    const n = f.name.toLowerCase();
    return n.includes('name') || n.includes('title') || n === 'email';
  });
  if (searchableFields.length > 0) {
    params.push({ name: 'search', type: 'string', description: `Search across: ${searchableFields.map(f => f.name).join(', ')}` });
  }

  return params;
}

function generateRequestBody(entity: PlannedEntity, operation: 'create' | 'update'): RequestBodyDesign {
  const fields: BodyFieldDesign[] = [];

  for (const field of entity.fields) {
    if (field.name.toLowerCase() === 'id') continue;
    if (field.name.toLowerCase() === 'createdat' || field.name.toLowerCase() === 'created_at') continue;
    if (field.name.toLowerCase() === 'updatedat' || field.name.toLowerCase() === 'updated_at') continue;

    const zodType = fieldToZodType(field);
    fields.push({
      name: field.name,
      type: field.type,
      required: operation === 'create' ? (field.required || false) : false,
      validation: zodType,
    });
  }

  const schemaLines = fields.map(f => {
    let line = `  ${f.name}: ${f.validation}`;
    if (!f.required || operation === 'update') line += '.optional()';
    return line;
  }).join(',\n');

  const zodSchema = `z.object({\n${schemaLines}\n})`;

  return {
    contentType: 'application/json',
    fields,
    zodSchema,
  };
}

function fieldToZodType(field: { name: string; type: string }): string {
  const lower = field.type.toLowerCase();
  const nameL = field.name.toLowerCase();

  if (nameL.includes('email')) return "z.string().email()";
  if (nameL.includes('url') || nameL.includes('website')) return "z.string().url()";
  if (nameL.includes('phone')) return "z.string().min(7).max(20)";

  if (lower === 'string' || lower === 'text') {
    if (nameL.includes('name') || nameL.includes('title')) return "z.string().min(1).max(255)";
    return "z.string()";
  }
  if (lower === 'number' || lower === 'integer' || lower === 'int') return "z.number().int()";
  if (lower === 'float' || lower === 'decimal' || lower === 'double') return "z.number()";
  if (lower === 'boolean' || lower === 'bool') return "z.boolean()";
  if (lower === 'date' || lower === 'datetime') return "z.string().datetime()";
  if (lower === 'json' || lower === 'object') return "z.record(z.unknown())";
  if (lower === 'array') return "z.array(z.unknown())";

  return "z.string()";
}

function designMiddleware(entities: PlannedEntity[], roles: Array<{ name: string }>, securityPlan?: SecurityPlan): MiddlewareDesign[] {
  const middleware: MiddlewareDesign[] = [
    { name: 'cors', purpose: 'Cross-origin resource sharing', appliesTo: '*', order: 1 },
    { name: 'bodyParser', purpose: 'Parse JSON request bodies', appliesTo: '*', order: 2 },
    { name: 'requestLogger', purpose: 'Log incoming requests', appliesTo: '*', order: 3 },
    { name: 'errorHandler', purpose: 'Global error handling', appliesTo: '*', order: 100 },
  ];

  if (roles.length > 0) {
    middleware.push(
      { name: 'authenticate', purpose: 'Verify user session/token', appliesTo: 'protected', order: 4 },
      { name: 'authorize', purpose: 'Check user role permissions', appliesTo: 'protected', order: 5 },
    );
  }

  middleware.push(
    { name: 'validateBody', purpose: 'Validate request body against Zod schema', appliesTo: 'POST,PUT,PATCH', order: 6 },
    { name: 'validateQuery', purpose: 'Validate query parameters', appliesTo: 'GET', order: 7 },
  );

  if (securityPlan?.rateLimiting && securityPlan.rateLimiting.length > 0) {
    for (const rl of securityPlan.rateLimiting) {
      middleware.push({
        name: `rateLimit_${rl.category}`,
        purpose: `Rate limiting for ${rl.category}: ${rl.maxRequests} requests per ${rl.windowSeconds}s`,
        appliesTo: rl.category === 'global' ? '*' : rl.category,
        order: 3.5,
        config: {
          maxRequests: rl.maxRequests,
          windowSeconds: rl.windowSeconds,
          category: rl.category,
        },
      });
    }
  }

  if (securityPlan?.entityPermissions && securityPlan.entityPermissions.length > 0) {
    for (const perm of securityPlan.entityPermissions) {
      const entityPath = `/${toKebab(perm.entity)}`;
      middleware.push({
        name: `permissionCheck_${perm.entity}_${perm.role}`,
        purpose: `Permission check: role "${perm.role}" can [${perm.actions.join(', ')}] on ${perm.entity}`,
        appliesTo: entityPath,
        order: 5.5,
        config: {
          entity: perm.entity,
          role: perm.role,
          allowedActions: perm.actions,
        },
      });
    }
  }

  return middleware.sort((a, b) => a.order - b.order);
}

function designErrorFormat(): ErrorFormat {
  return {
    shape: {
      error: true,
      message: 'Human-readable error message',
      code: 'MACHINE_READABLE_CODE',
      details: 'Optional additional context',
    },
    httpStatusMapping: {
      'VALIDATION_ERROR': 400,
      'UNAUTHORIZED': 401,
      'FORBIDDEN': 403,
      'NOT_FOUND': 404,
      'CONFLICT': 409,
      'RATE_LIMITED': 429,
      'INTERNAL_ERROR': 500,
    },
  };
}

function designPagination(entities: PlannedEntity[]): PaginationDesign {
  return {
    strategy: 'offset',
    defaultPageSize: 20,
    maxPageSize: 100,
    paramNames: { page: 'page', limit: 'limit' },
    responseShape: { data: 'data', total: 'total', page: 'page', pageSize: 'pageSize', hasMore: 'hasMore' },
  };
}

function designRateLimiting(entities: PlannedEntity[], securityPlan?: SecurityPlan): RateLimitDesign {
  const perRoute: Record<string, number> = {};

  for (const entity of entities) {
    perRoute[`POST /api/${toKebab(entity.name)}`] = 30;
    perRoute[`DELETE /api/${toKebab(entity.name)}/:id`] = 10;
  }

  if (securityPlan?.rateLimiting && securityPlan.rateLimiting.length > 0) {
    for (const rl of securityPlan.rateLimiting) {
      if (rl.category === 'global') {
        perRoute['*'] = rl.maxRequests;
      } else {
        perRoute[rl.category] = rl.maxRequests;
      }
    }
  }

  return {
    enabled: true,
    defaultLimit: 100,
    windowMs: 60000,
    perRoute,
  };
}

function generateValidationSchemas(entities: PlannedEntity[]): ValidationDesign {
  const schemas: ValidationSchema[] = [];

  for (const entity of entities) {
    const fields: ValidatedField[] = entity.fields
      .filter(f => f.name.toLowerCase() !== 'id' && !f.name.toLowerCase().includes('created') && !f.name.toLowerCase().includes('updated'))
      .map(f => ({
        name: f.name,
        zodType: fieldToZodType(f),
        optional: !f.required,
      }));

    schemas.push({ name: `create${entity.name}Schema`, entity: entity.name, operation: 'create', fields });
    schemas.push({
      name: `update${entity.name}Schema`,
      entity: entity.name,
      operation: 'update',
      fields: fields.map(f => ({ ...f, optional: true })),
    });
  }

  return { library: 'zod', schemas };
}

function designResponseFormat(): ResponseFormat {
  return {
    success: { data: 'data', meta: 'meta' },
    error: { error: true, message: 'message', code: 'code' },
  };
}

function detectBatchOperations(entities: PlannedEntity[]): BatchOperation[] {
  const batchOps: BatchOperation[] = [];

  for (const entity of entities) {
    const hasStatus = entity.fields.some(f => f.name.toLowerCase() === 'status');
    if (hasStatus || entity.fields.length > 3) {
      batchOps.push({
        entity: entity.name,
        operations: ['update', 'delete'],
        maxItems: 50,
        path: `/api/${toKebab(entity.name)}/batch`,
      });
    }
  }

  return batchOps;
}

function detectFileUploadRoutes(entities: PlannedEntity[]): FileUploadRoute[] {
  const routes: FileUploadRoute[] = [];

  for (const entity of entities) {
    for (const field of entity.fields) {
      const lower = field.name.toLowerCase();
      if (lower.includes('image') || lower.includes('photo') || lower.includes('avatar') ||
          lower.includes('file') || lower.includes('attachment') || lower.includes('document')) {
        const isImage = lower.includes('image') || lower.includes('photo') || lower.includes('avatar');
        routes.push({
          entity: entity.name,
          field: field.name,
          path: `/api/${toKebab(entity.name)}/:id/${toKebab(field.name)}`,
          maxSize: isImage ? '5MB' : '25MB',
          allowedTypes: isImage
            ? ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
            : ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'],
        });
      }
    }
  }

  return routes;
}

function toKebab(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}