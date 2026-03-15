import type { ProjectPlan, PlannedEntity, PlannedPage, PlannedEndpoint, PerformancePlan } from './plan-generator.js';

const HIGH_VOLUME_ENTITY_KEYWORDS = [
  'order', 'transaction', 'log', 'message', 'notification', 'event',
  'activity', 'audit', 'comment', 'payment', 'session', 'request',
  'entry', 'record', 'history', 'email', 'invoice', 'ticket',
  'shipment', 'delivery', 'visit', 'click', 'impression', 'metric',
  'timeentry', 'timelog', 'chatmessage', 'auditlog',
];

const HEAVY_COMPONENT_KEYWORDS = [
  'chart', 'graph', 'map', 'editor', 'calendar', 'kanban', 'gantt',
  'dashboard', 'analytics', 'report', 'visualization', 'timeline',
  'spreadsheet', 'diagram', 'flowchart', 'whiteboard',
];

const SEARCH_FIELD_NAMES = [
  'name', 'title', 'description', 'content', 'body', 'summary',
  'bio', 'notes', 'label', 'subject', 'text', 'query',
];

const FILTER_FIELD_NAMES = [
  'status', 'type', 'category', 'priority', 'level', 'role',
  'state', 'kind', 'group', 'department', 'tag',
];

const DATE_FIELD_NAMES = [
  'created_at', 'updated_at', 'date', 'due_date', 'start_date',
  'end_date', 'published_at', 'scheduled_at', 'completed_at',
  'expires_at', 'issued_at', 'paid_at', 'shipped_at', 'delivered_at',
];

const UNIQUE_FIELD_NAMES = [
  'email', 'username', 'slug', 'code', 'sku', 'phone',
  'invoice_number', 'order_number', 'tracking_number',
];

const IMAGE_FIELD_NAMES = [
  'image', 'photo', 'avatar', 'thumbnail', 'cover', 'banner',
  'logo', 'picture', 'icon', 'media', 'attachment',
  'image_url', 'photo_url', 'avatar_url', 'cover_image',
];

export function planPerformance(plan: ProjectPlan): PerformancePlan {
  const entities = plan.dataModel || [];
  const pages = plan.pages || [];
  const endpoints = plan.apiEndpoints || [];

  const pagination = planPagination(entities);
  const caching = planCaching(endpoints, entities);
  const lazyLoadTargets = planLazyLoading(pages, entities);
  const virtualScroll = planVirtualScroll(entities);
  const indexRecommendations = planIndexes(entities);
  const prefetch = planPrefetch(pages, entities);
  const imageOptimization = planImageOptimization(entities);

  return {
    pagination,
    caching,
    lazyLoadTargets,
    virtualScroll,
    indexRecommendations,
    prefetch,
    imageOptimization,
  };
}

function isHighVolumeEntity(entityName: string): boolean {
  const lower = entityName.toLowerCase();
  return HIGH_VOLUME_ENTITY_KEYWORDS.some(kw => lower.includes(kw));
}

function planPagination(entities: PlannedEntity[]): PerformancePlan['pagination'] {
  const result: PerformancePlan['pagination'] = [];

  for (const entity of entities) {
    const highVolume = isHighVolumeEntity(entity.name);

    if (highVolume) {
      result.push({
        entity: entity.name,
        strategy: 'cursor',
        pageSize: 25,
        reason: `${entity.name} is expected to have high record volume — cursor-based pagination avoids offset performance degradation`,
      });
    } else {
      result.push({
        entity: entity.name,
        strategy: 'offset',
        pageSize: 20,
        reason: `${entity.name} has moderate expected volume — offset pagination with configurable page size`,
      });
    }
  }

  return result;
}

function planCaching(endpoints: PlannedEndpoint[], entities: PlannedEntity[]): PerformancePlan['caching'] {
  const result: PerformancePlan['caching'] = [];
  const entityNames = new Set(entities.map(e => e.name.toLowerCase()));

  const listEndpoints = endpoints.filter(ep => ep.method === 'GET' && !ep.path.includes(':id') && !ep.path.includes('/stats') && !ep.path.includes('/export'));
  for (const ep of listEndpoints) {
    result.push({
      endpoint: ep.path,
      ttlSeconds: 30,
      invalidateOn: [`POST ${ep.path}`, `PUT ${ep.path}/:id`, `PATCH ${ep.path}/:id`, `DELETE ${ep.path}/:id`],
    });
  }

  const detailEndpoints = endpoints.filter(ep => ep.method === 'GET' && ep.path.includes(':id') && !ep.path.includes('/stats'));
  for (const ep of detailEndpoints) {
    const basePath = ep.path.replace('/:id', '');
    result.push({
      endpoint: ep.path,
      ttlSeconds: 60,
      invalidateOn: [`PUT ${basePath}/:id`, `PATCH ${basePath}/:id`, `DELETE ${basePath}/:id`],
    });
  }

  const statsEndpoints = endpoints.filter(ep => ep.method === 'GET' && (ep.path.includes('/stats') || ep.path.includes('/summary') || ep.path.includes('/metrics')));
  for (const ep of statsEndpoints) {
    result.push({
      endpoint: ep.path,
      ttlSeconds: 300,
      invalidateOn: entities.map(e => `POST /api/${toSnakeCase(e.name)}s`),
    });
  }

  return result;
}

function planLazyLoading(pages: PlannedPage[], entities: PlannedEntity[]): PerformancePlan['lazyLoadTargets'] {
  const result: PerformancePlan['lazyLoadTargets'] = [];
  const seen = new Set<string>();

  if (pages.length > 3) {
    const lazyPages = pages.slice(3);
    for (const page of lazyPages) {
      if (!seen.has(page.componentName)) {
        seen.add(page.componentName);
        result.push({
          component: page.componentName,
          reason: `Page beyond initial navigation set — lazy load to reduce initial bundle size`,
        });
      }
    }
  }

  for (const page of pages) {
    const features = (page.features || []).map(f => f.toLowerCase());
    const dataNeeded = (page.dataNeeded || []).map(d => d.toLowerCase());
    const combined = [...features, ...dataNeeded, page.name.toLowerCase(), page.description.toLowerCase()];

    for (const keyword of HEAVY_COMPONENT_KEYWORDS) {
      if (combined.some(item => item.includes(keyword))) {
        const componentName = `${capitalize(keyword)}Component`;
        if (!seen.has(componentName)) {
          seen.add(componentName);
          result.push({
            component: componentName,
            reason: `${capitalize(keyword)} is a heavy component — dynamic import recommended to reduce initial load`,
          });
        }
        break;
      }
    }
  }

  return result;
}

function planVirtualScroll(entities: PlannedEntity[]): PerformancePlan['virtualScroll'] {
  const result: PerformancePlan['virtualScroll'] = [];

  for (const entity of entities) {
    if (isHighVolumeEntity(entity.name)) {
      result.push({
        entity: entity.name,
        reason: `${entity.name} is expected to have 100+ records in list view — virtual scrolling recommended for smooth rendering`,
      });
    }
  }

  return result;
}

function planIndexes(entities: PlannedEntity[]): PerformancePlan['indexRecommendations'] {
  const result: PerformancePlan['indexRecommendations'] = [];

  for (const entity of entities) {
    const fieldNames = entity.fields.map(f => f.name.toLowerCase());

    const searchFields = fieldNames.filter(f => SEARCH_FIELD_NAMES.some(sf => f.includes(sf)));
    if (searchFields.length > 0) {
      result.push({
        entity: entity.name,
        fields: searchFields,
        type: 'gin',
        reason: `Text search fields — GIN index for full-text search performance`,
      });
    }

    const filterFields = fieldNames.filter(f => FILTER_FIELD_NAMES.some(ff => f === ff || f.endsWith(`_${ff}`)));
    if (filterFields.length > 0) {
      result.push({
        entity: entity.name,
        fields: filterFields,
        type: 'btree',
        reason: `Filter/enum fields — B-tree index for efficient filtering`,
      });
    }

    const dateFields = fieldNames.filter(f => DATE_FIELD_NAMES.some(df => f === df || f.includes('date') || f.includes('_at')));
    if (dateFields.length > 0) {
      result.push({
        entity: entity.name,
        fields: dateFields,
        type: 'btree',
        reason: `Date fields — B-tree index for range queries and sorting`,
      });
    }

    const uniqueFields = fieldNames.filter(f => UNIQUE_FIELD_NAMES.some(uf => f === uf || f.includes(uf)));
    if (uniqueFields.length > 0) {
      result.push({
        entity: entity.name,
        fields: uniqueFields,
        type: 'unique',
        reason: `Unique constraint fields — unique index for data integrity and fast lookups`,
      });
    }

    const fkFields = fieldNames.filter(f => f.endsWith('_id') || f.endsWith('id'));
    const actualFkFields = fkFields.filter(f => f !== 'id');
    if (actualFkFields.length > 0) {
      result.push({
        entity: entity.name,
        fields: actualFkFields,
        type: 'btree',
        reason: `Foreign key fields — B-tree index for join performance`,
      });
    }
  }

  return result;
}

function planPrefetch(pages: PlannedPage[], entities: PlannedEntity[]): PerformancePlan['prefetch'] {
  const result: PerformancePlan['prefetch'] = [];
  const seen = new Set<string>();

  for (const page of pages) {
    const pageLower = page.name.toLowerCase();

    if (pageLower.includes('list') || pageLower.includes('index') || pageLower.includes('all')) {
      const detailPage = pages.find(p => {
        const pLower = p.name.toLowerCase();
        return (pLower.includes('detail') || pLower.includes('view') || pLower.includes('edit')) &&
               p.module === page.module;
      });

      if (detailPage) {
        const key = `${page.componentName}->${detailPage.componentName}`;
        if (!seen.has(key)) {
          seen.add(key);
          result.push({
            from: page.componentName,
            prefetchTarget: detailPage.componentName,
          });
        }
      }
    }
  }

  const navPages = pages.slice(0, 5);
  for (let i = 0; i < navPages.length; i++) {
    for (let j = i + 1; j < Math.min(i + 2, navPages.length); j++) {
      const key = `${navPages[i].componentName}->${navPages[j].componentName}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({
          from: navPages[i].componentName,
          prefetchTarget: navPages[j].componentName,
        });
      }
    }
  }

  return result;
}

function planImageOptimization(entities: PlannedEntity[]): PerformancePlan['imageOptimization'] {
  const result: PerformancePlan['imageOptimization'] = [];

  for (const entity of entities) {
    for (const field of entity.fields) {
      const lower = field.name.toLowerCase();
      if (IMAGE_FIELD_NAMES.some(img => lower.includes(img))) {
        const strategies: string[] = ['lazy-loading'];

        if (lower.includes('avatar') || lower.includes('thumbnail') || lower.includes('icon')) {
          strategies.push('thumbnail-generation', 'fixed-dimensions');
        } else if (lower.includes('cover') || lower.includes('banner') || lower.includes('hero')) {
          strategies.push('responsive-srcset', 'webp-conversion', 'blur-placeholder');
        } else {
          strategies.push('responsive-srcset', 'thumbnail-generation', 'webp-conversion');
        }

        result.push({
          entity: entity.name,
          field: field.name,
          strategies,
        });
      }
    }
  }

  return result;
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}