import type { ProjectPlan, PlannedEntity, PlannedPage, PlannedEndpoint, PlannedWorkflow } from './plan-generator.js';

export interface FieldSemantics {
  fieldName: string;
  inputType: 'text' | 'email' | 'tel' | 'url' | 'number' | 'currency' | 'percentage' | 'date' | 'datetime' | 'time' | 'color' | 'password' | 'textarea' | 'select' | 'checkbox' | 'file' | 'image' | 'rating' | 'range' | 'address';
  validation?: string;
  placeholder?: string;
  format?: string;
  mask?: string;
  icon?: string;
  displayFormat?: (value: string) => string;
  componentHint?: string;
}

export interface EntityRelationship {
  from: string;
  to: string;
  type: 'parent-child' | 'reference' | 'many-to-many' | 'aggregation' | 'composition';
  cardinality: '1:1' | '1:N' | 'N:1' | 'N:M';
  uiImplication: string;
  fromField?: string;
  toField?: string;
}

export interface ComputedField {
  entityName: string;
  fieldName: string;
  expression: string;
  dependencies: string[];
  description: string;
  displayInList: boolean;
  displayInDetail: boolean;
}

export interface BusinessRule {
  entityName: string;
  ruleName: string;
  type: 'validation' | 'computation' | 'constraint' | 'automation' | 'derivation';
  condition?: string;
  action: string;
  description: string;
  codeSnippet: string;
}

export interface UIPattern {
  entityName: string;
  pattern: 'master-detail' | 'kanban' | 'timeline' | 'calendar' | 'gallery' | 'tree' | 'card-grid' | 'table' | 'form-wizard' | 'dashboard-widget';
  reason: string;
  config: Record<string, any>;
}

export interface ReasoningResult {
  fieldSemantics: Map<string, FieldSemantics[]>;
  relationships: EntityRelationship[];
  computedFields: ComputedField[];
  businessRules: BusinessRule[];
  uiPatterns: UIPattern[];
  formGroupings: Map<string, FormGroup[]>;
  searchableFields: Map<string, string[]>;
  sortableFields: Map<string, string[]>;
  filterableFields: Map<string, FilterConfig[]>;
  architecturePatterns: ArchitecturePattern[];
  crossEntityLogic: CrossEntityLogic[];
  codeQualityPatterns: CodeQualityPattern[];
}

export interface FormGroup {
  label: string;
  fields: string[];
  collapsible?: boolean;
  order: number;
}

export interface FilterConfig {
  field: string;
  filterType: 'select' | 'range' | 'date-range' | 'search' | 'toggle' | 'multi-select';
  options?: string[];
  label: string;
}

export interface ArchitecturePattern {
  entityName: string;
  pattern: 'pagination' | 'search-filter' | 'sorting' | 'infinite-scroll' | 'optimistic-update' | 'debounced-search' | 'error-boundary' | 'loading-skeleton';
  reason: string;
  config: Record<string, any>;
  codeHint: string;
}

export interface CrossEntityLogic {
  sourceEntity: string;
  targetEntity: string;
  logicType: 'status-propagation' | 'cascade-update' | 'aggregate-computation' | 'derived-filter' | 'shared-validation';
  description: string;
  codeSnippet: string;
}

export interface CodeQualityPattern {
  type: 'shared-utility' | 'error-boundary' | 'loading-state' | 'empty-state' | 'form-validation-schema' | 'api-error-handler' | 'optimistic-update-hook';
  name: string;
  description: string;
  applicableEntities: string[];
  codeSnippet: string;
}

const FIELD_SEMANTIC_PATTERNS: Record<string, FieldSemantics> = {
  email: { fieldName: 'email', inputType: 'email', validation: 'email', placeholder: 'name@example.com', icon: 'Mail' },
  phone: { fieldName: 'phone', inputType: 'tel', validation: 'phone', placeholder: '+1 (555) 000-0000', icon: 'Phone' },
  website: { fieldName: 'website', inputType: 'url', validation: 'url', placeholder: 'https://example.com', icon: 'Globe' },
  url: { fieldName: 'url', inputType: 'url', validation: 'url', placeholder: 'https://...', icon: 'Link' },
  price: { fieldName: 'price', inputType: 'currency', format: '$0,0.00', icon: 'DollarSign', componentHint: 'currency-input' },
  cost: { fieldName: 'cost', inputType: 'currency', format: '$0,0.00', icon: 'DollarSign', componentHint: 'currency-input' },
  amount: { fieldName: 'amount', inputType: 'currency', format: '$0,0.00', icon: 'DollarSign', componentHint: 'currency-input' },
  total: { fieldName: 'total', inputType: 'currency', format: '$0,0.00', icon: 'DollarSign', componentHint: 'currency-input' },
  salary: { fieldName: 'salary', inputType: 'currency', format: '$0,0.00', icon: 'Banknote', componentHint: 'currency-input' },
  revenue: { fieldName: 'revenue', inputType: 'currency', format: '$0,0.00', icon: 'TrendingUp', componentHint: 'currency-input' },
  rate: { fieldName: 'rate', inputType: 'currency', format: '$0.00/hr', icon: 'Clock', componentHint: 'currency-input' },
  discount: { fieldName: 'discount', inputType: 'percentage', format: '0%', icon: 'Percent' },
  tax: { fieldName: 'tax', inputType: 'percentage', format: '0.0%', icon: 'Percent' },
  percentage: { fieldName: 'percentage', inputType: 'percentage', format: '0%', icon: 'Percent' },
  progress: { fieldName: 'progress', inputType: 'range', icon: 'BarChart3', componentHint: 'progress-bar' },
  rating: { fieldName: 'rating', inputType: 'rating', icon: 'Star', componentHint: 'star-rating' },
  score: { fieldName: 'score', inputType: 'number', icon: 'Award' },
  description: { fieldName: 'description', inputType: 'textarea', placeholder: 'Enter description...', icon: 'FileText' },
  notes: { fieldName: 'notes', inputType: 'textarea', placeholder: 'Add notes...', icon: 'StickyNote' },
  comment: { fieldName: 'comment', inputType: 'textarea', placeholder: 'Write a comment...', icon: 'MessageSquare' },
  bio: { fieldName: 'bio', inputType: 'textarea', placeholder: 'Tell us about yourself...', icon: 'User' },
  summary: { fieldName: 'summary', inputType: 'textarea', placeholder: 'Brief summary...', icon: 'AlignLeft' },
  address: { fieldName: 'address', inputType: 'address', placeholder: '123 Main St', icon: 'MapPin' },
  city: { fieldName: 'city', inputType: 'text', placeholder: 'City', icon: 'MapPin' },
  state: { fieldName: 'state', inputType: 'text', placeholder: 'State', icon: 'MapPin' },
  zipCode: { fieldName: 'zipCode', inputType: 'text', placeholder: '12345', icon: 'MapPin', validation: 'zipcode' },
  country: { fieldName: 'country', inputType: 'select', icon: 'Flag' },
  password: { fieldName: 'password', inputType: 'password', validation: 'password', icon: 'Lock' },
  avatar: { fieldName: 'avatar', inputType: 'image', icon: 'Camera', componentHint: 'image-upload' },
  photo: { fieldName: 'photo', inputType: 'image', icon: 'Image', componentHint: 'image-upload' },
  image: { fieldName: 'image', inputType: 'image', icon: 'Image', componentHint: 'image-upload' },
  logo: { fieldName: 'logo', inputType: 'image', icon: 'Image', componentHint: 'image-upload' },
  file: { fieldName: 'file', inputType: 'file', icon: 'Paperclip', componentHint: 'file-upload' },
  attachment: { fieldName: 'attachment', inputType: 'file', icon: 'Paperclip', componentHint: 'file-upload' },
  color: { fieldName: 'color', inputType: 'color', icon: 'Palette' },
  date: { fieldName: 'date', inputType: 'date', icon: 'Calendar' },
  startDate: { fieldName: 'startDate', inputType: 'date', icon: 'CalendarPlus' },
  endDate: { fieldName: 'endDate', inputType: 'date', icon: 'CalendarMinus' },
  dueDate: { fieldName: 'dueDate', inputType: 'date', icon: 'CalendarClock' },
  birthday: { fieldName: 'birthday', inputType: 'date', icon: 'Cake' },
  time: { fieldName: 'time', inputType: 'time', icon: 'Clock' },
  quantity: { fieldName: 'quantity', inputType: 'number', validation: 'positive-integer', icon: 'Hash' },
  count: { fieldName: 'count', inputType: 'number', validation: 'non-negative', icon: 'Hash' },
  weight: { fieldName: 'weight', inputType: 'number', icon: 'Scale' },
  duration: { fieldName: 'duration', inputType: 'number', icon: 'Timer', componentHint: 'duration-input' },
  priority: { fieldName: 'priority', inputType: 'select', icon: 'AlertTriangle', componentHint: 'priority-select' },
  tags: { fieldName: 'tags', inputType: 'text', icon: 'Tags', componentHint: 'tag-input' },
};

const CURRENCY_FIELD_PATTERNS = /price|cost|amount|total|salary|revenue|fee|charge|budget|balance|payment|wage|rate|commission|profit|margin|subtotal|discount_amount/i;
const PERCENTAGE_FIELD_PATTERNS = /percentage|percent|rate|ratio|discount|tax|commission_rate|utilization|coverage|completion/i;
const DATE_FIELD_PATTERNS = /date|created_at|updated_at|start|end|due|deadline|birth|hire|expire|schedule/i;
const TEXTAREA_FIELD_PATTERNS = /description|notes|comment|bio|summary|content|body|details|message|feedback|reason|remarks/i;
const IMAGE_FIELD_PATTERNS = /avatar|photo|image|logo|thumbnail|picture|icon|banner|cover/i;

export function analyzeSemantics(plan: ProjectPlan): ReasoningResult {
  const fieldSemantics = new Map<string, FieldSemantics[]>();
  const relationships: EntityRelationship[] = [];
  const computedFields: ComputedField[] = [];
  const businessRules: BusinessRule[] = [];
  const uiPatterns: UIPattern[] = [];
  const formGroupings = new Map<string, FormGroup[]>();
  const searchableFields = new Map<string, string[]>();
  const sortableFields = new Map<string, string[]>();
  const filterableFields = new Map<string, FilterConfig[]>();

  for (const entity of plan.dataModel) {
    const semantics = inferFieldSemantics(entity);
    fieldSemantics.set(entity.name, semantics);

    const groups = inferFormGroupings(entity, semantics);
    formGroupings.set(entity.name, groups);

    const searchable = inferSearchableFields(entity);
    searchableFields.set(entity.name, searchable);

    const sortable = inferSortableFields(entity);
    sortableFields.set(entity.name, sortable);

    const filters = inferFilterableFields(entity);
    filterableFields.set(entity.name, filters);
  }

  const rels = inferRelationships(plan.dataModel);
  relationships.push(...rels);

  const computed = inferComputedFields(plan.dataModel, relationships);
  computedFields.push(...computed);

  const rules = inferBusinessRules(plan.dataModel, plan.workflows, relationships);
  businessRules.push(...rules);

  const patterns = inferUIPatterns(plan.dataModel, relationships, plan.workflows);
  uiPatterns.push(...patterns);

  const archPatterns = inferArchitecturePatterns(plan.dataModel, rels);
  const crossLogic = inferCrossEntityLogic(plan.dataModel, rels, plan.workflows);
  const smartRules = inferSmartValidationRules(plan.dataModel, rels);
  rules.push(...smartRules);
  const qualityPatterns = inferCodeQualityPatterns(plan.dataModel, rels, patterns);

  return {
    fieldSemantics,
    relationships,
    computedFields,
    businessRules,
    uiPatterns,
    formGroupings,
    searchableFields,
    sortableFields,
    filterableFields,
    architecturePatterns: archPatterns,
    crossEntityLogic: crossLogic,
    codeQualityPatterns: qualityPatterns,
  };
}

function inferFieldSemantics(entity: PlannedEntity): FieldSemantics[] {
  const results: FieldSemantics[] = [];

  for (const field of entity.fields) {
    if (field.name === 'id') continue;

    const lowerName = field.name.toLowerCase();
    let matched = false;

    for (const [pattern, semantics] of Object.entries(FIELD_SEMANTIC_PATTERNS)) {
      if (lowerName === pattern.toLowerCase() ||
          lowerName.endsWith(pattern.toLowerCase()) ||
          lowerName.includes(pattern.toLowerCase())) {
        results.push({ ...semantics, fieldName: field.name });
        matched = true;
        break;
      }
    }

    if (matched) continue;

    if (CURRENCY_FIELD_PATTERNS.test(field.name) && (field.type.includes('number') || field.type.includes('real') || field.type.includes('decimal') || field.type.includes('integer'))) {
      results.push({ fieldName: field.name, inputType: 'currency', format: '$0,0.00', icon: 'DollarSign', componentHint: 'currency-input' });
      continue;
    }

    if (PERCENTAGE_FIELD_PATTERNS.test(field.name) && !CURRENCY_FIELD_PATTERNS.test(field.name)) {
      results.push({ fieldName: field.name, inputType: 'percentage', format: '0%', icon: 'Percent' });
      continue;
    }

    if (DATE_FIELD_PATTERNS.test(field.name) || field.type === 'date' || field.type === 'timestamp') {
      results.push({ fieldName: field.name, inputType: field.type === 'timestamp' ? 'datetime' : 'date', icon: 'Calendar' });
      continue;
    }

    if (TEXTAREA_FIELD_PATTERNS.test(field.name)) {
      results.push({ fieldName: field.name, inputType: 'textarea', icon: 'FileText' });
      continue;
    }

    if (IMAGE_FIELD_PATTERNS.test(field.name)) {
      results.push({ fieldName: field.name, inputType: 'image', icon: 'Image', componentHint: 'image-upload' });
      continue;
    }

    if (field.type.startsWith('enum(') || field.type.startsWith('enum:')) {
      const options = field.type.replace(/enum[\(:]/, '').replace(')', '').split(',').map(s => s.trim());
      results.push({ fieldName: field.name, inputType: 'select', icon: 'ChevronDown' });
      continue;
    }

    if (field.type === 'boolean') {
      results.push({ fieldName: field.name, inputType: 'checkbox', icon: 'Check' });
      continue;
    }

    if (field.type.includes('number') || field.type.includes('integer') || field.type.includes('real')) {
      results.push({ fieldName: field.name, inputType: 'number', icon: 'Hash' });
      continue;
    }

    if (lowerName.endsWith('id') && lowerName !== 'id') {
      results.push({ fieldName: field.name, inputType: 'select', icon: 'Link', componentHint: 'entity-reference' });
      continue;
    }

    results.push({
      fieldName: field.name,
      inputType: 'text',
      placeholder: `Enter ${field.name.replace(/([A-Z])/g, ' $1').toLowerCase().trim()}...`,
    });
  }

  return results;
}

function inferRelationships(entities: PlannedEntity[]): EntityRelationship[] {
  const relationships: EntityRelationship[] = [];
  const entityNames = entities.map(e => e.name.toLowerCase());

  for (const entity of entities) {
    for (const field of entity.fields) {
      const lowerField = field.name.toLowerCase();

      if (lowerField.endsWith('id') && lowerField !== 'id') {
        const refName = lowerField.replace(/id$/i, '');
        const matchedEntity = entities.find(e =>
          e.name.toLowerCase() === refName ||
          e.name.toLowerCase() === refName + 's' ||
          e.name.toLowerCase().startsWith(refName)
        );

        if (matchedEntity) {
          const isComposition = isCompositionalRelationship(entity.name, matchedEntity.name);
          relationships.push({
            from: entity.name,
            to: matchedEntity.name,
            type: isComposition ? 'composition' : 'reference',
            cardinality: 'N:1',
            uiImplication: isComposition
              ? `Show ${entity.name} list within ${matchedEntity.name} detail view`
              : `Add ${matchedEntity.name} selector dropdown in ${entity.name} form`,
            fromField: field.name,
            toField: 'id',
          });
        }
      }
    }

    if (entity.relationships) {
      for (const rel of entity.relationships) {
        const existing = relationships.find(r =>
          r.from === entity.name && r.to === rel.entity
        );
        if (!existing) {
          relationships.push({
            from: entity.name,
            to: rel.entity,
            type: rel.type === 'many-to-many' ? 'many-to-many' :
                  rel.type === 'one-to-many' ? 'parent-child' : 'reference',
            cardinality: rel.type === 'one-to-many' ? '1:N' :
                         rel.type === 'many-to-one' ? 'N:1' :
                         rel.type === 'many-to-many' ? 'N:M' : '1:1',
            uiImplication: rel.type === 'one-to-many'
              ? `Show ${rel.entity} list in ${entity.name} detail view`
              : `Reference ${rel.entity} in ${entity.name}`,
            fromField: rel.field,
          });
        }
      }
    }
  }

  return relationships;
}

function isCompositionalRelationship(childName: string, parentName: string): boolean {
  const compositions: Record<string, string[]> = {
    'Order': ['OrderItem', 'OrderLine', 'LineItem'],
    'Invoice': ['InvoiceItem', 'InvoiceLine'],
    'Project': ['Task', 'Milestone', 'Deliverable'],
    'Course': ['Lesson', 'Module', 'Assignment'],
    'Timesheet': ['TimeEntry'],
    'Menu': ['MenuItem', 'Dish'],
    'PurchaseOrder': ['PurchaseOrderItem'],
    'Shipment': ['ShipmentItem'],
  };

  for (const [parent, children] of Object.entries(compositions)) {
    if (parentName.includes(parent) && children.some(c => childName.includes(c))) {
      return true;
    }
  }

  return childName.toLowerCase().includes(parentName.toLowerCase() + 'item') ||
         childName.toLowerCase().includes(parentName.toLowerCase() + 'line') ||
         childName.toLowerCase().includes(parentName.toLowerCase() + 'entry') ||
         childName.toLowerCase().includes(parentName.toLowerCase() + 'detail');
}

function inferComputedFields(entities: PlannedEntity[], relationships: EntityRelationship[]): ComputedField[] {
  const computed: ComputedField[] = [];

  for (const entity of entities) {
    const fields = entity.fields;
    const fieldNames = fields.map(f => f.name.toLowerCase());

    if (fieldNames.includes('firstname') && fieldNames.includes('lastname')) {
      computed.push({
        entityName: entity.name,
        fieldName: 'fullName',
        expression: '`${item.firstName} ${item.lastName}`',
        dependencies: ['firstName', 'lastName'],
        description: 'Full name derived from first and last name',
        displayInList: true,
        displayInDetail: true,
      });
    }

    const hasQuantity = fields.find(f => /quantity|qty|units|count/i.test(f.name) && f.type.includes('number'));
    const hasPrice = fields.find(f => /price|unitPrice|unitCost|rate/i.test(f.name));
    if (hasQuantity && hasPrice) {
      computed.push({
        entityName: entity.name,
        fieldName: 'lineTotal',
        expression: `(item.${hasQuantity.name} || 0) * (item.${hasPrice.name} || 0)`,
        dependencies: [hasQuantity.name, hasPrice.name],
        description: 'Line total calculated from quantity x price',
        displayInList: true,
        displayInDetail: true,
      });
    }

    const hasStartDate = fields.find(f => /startDate|start|checkIn|startTime/i.test(f.name));
    const hasEndDate = fields.find(f => /endDate|end|checkOut|endTime|dueDate/i.test(f.name));
    if (hasStartDate && hasEndDate) {
      computed.push({
        entityName: entity.name,
        fieldName: 'duration',
        expression: `Math.ceil((new Date(item.${hasEndDate.name}).getTime() - new Date(item.${hasStartDate.name}).getTime()) / (1000 * 60 * 60 * 24))`,
        dependencies: [hasStartDate.name, hasEndDate.name],
        description: 'Duration in days between start and end dates',
        displayInList: false,
        displayInDetail: true,
      });
    }

    const hasStatus = fields.find(f => f.name === 'status');
    const childRelations = relationships.filter(r => r.to === entity.name && r.cardinality === 'N:1');
    if (childRelations.length > 0) {
      for (const rel of childRelations) {
        computed.push({
          entityName: entity.name,
          fieldName: `${rel.from.charAt(0).toLowerCase() + rel.from.slice(1)}Count`,
          expression: `related${rel.from}s.length`,
          dependencies: [],
          description: `Count of related ${rel.from} records`,
          displayInList: true,
          displayInDetail: true,
        });
      }
    }

    if (fieldNames.includes('hours') && fieldNames.some(f => /rate|hourlyrate/i.test(f))) {
      const hoursField = fields.find(f => f.name.toLowerCase() === 'hours')!;
      const rateField = fields.find(f => /rate|hourlyrate/i.test(f.name.toLowerCase()))!;
      computed.push({
        entityName: entity.name,
        fieldName: 'totalBillable',
        expression: `(item.${hoursField.name} || 0) * (item.${rateField.name} || 0)`,
        dependencies: [hoursField.name, rateField.name],
        description: 'Total billable amount (hours x rate)',
        displayInList: true,
        displayInDetail: true,
      });
    }

    if (fieldNames.includes('subtotal') || (fieldNames.includes('total') && fieldNames.includes('tax'))) {
      const taxField = fields.find(f => f.name.toLowerCase().includes('tax'));
      const subtotalField = fields.find(f => f.name.toLowerCase() === 'subtotal' || f.name.toLowerCase() === 'amount');
      if (subtotalField && taxField) {
        computed.push({
          entityName: entity.name,
          fieldName: 'grandTotal',
          expression: `(item.${subtotalField.name} || 0) + (item.${taxField.name} || 0)`,
          dependencies: [subtotalField.name, taxField.name],
          description: 'Grand total including tax',
          displayInList: true,
          displayInDetail: true,
        });
      }
    }
  }

  return computed;
}

function inferBusinessRules(entities: PlannedEntity[], workflows: PlannedWorkflow[], relationships: EntityRelationship[]): BusinessRule[] {
  const rules: BusinessRule[] = [];

  for (const entity of entities) {
    const fields = entity.fields;

    const emailField = fields.find(f => f.name.toLowerCase().includes('email'));
    if (emailField) {
      rules.push({
        entityName: entity.name,
        ruleName: `validate_${emailField.name}`,
        type: 'validation',
        condition: `!(/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value))`,
        action: 'reject',
        description: `Validate ${emailField.name} format`,
        codeSnippet: `if (data.${emailField.name} && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(data.${emailField.name})) {
  return res.status(400).json({ error: "Invalid email format" });
}`,
      });
    }

    const phoneField = fields.find(f => f.name.toLowerCase().includes('phone'));
    if (phoneField) {
      rules.push({
        entityName: entity.name,
        ruleName: `format_${phoneField.name}`,
        type: 'validation',
        action: 'format',
        description: `Validate phone number format`,
        codeSnippet: `const phoneClean = data.${phoneField.name}?.replace(/[^\\d+]/g, '') || '';`,
      });
    }

    const quantityField = fields.find(f => /quantity|qty|stock|count|units/i.test(f.name) && f.type.includes('number'));
    if (quantityField) {
      rules.push({
        entityName: entity.name,
        ruleName: `validate_${quantityField.name}_positive`,
        type: 'validation',
        condition: `data.${quantityField.name} < 0`,
        action: 'reject',
        description: `${quantityField.name} must be non-negative`,
        codeSnippet: `if (data.${quantityField.name} !== undefined && data.${quantityField.name} < 0) {
  return res.status(400).json({ error: "${quantityField.name} cannot be negative" });
}`,
      });
    }

    const startField = fields.find(f => /startDate|start|checkIn/i.test(f.name));
    const endField = fields.find(f => /endDate|end|checkOut|dueDate/i.test(f.name));
    if (startField && endField) {
      rules.push({
        entityName: entity.name,
        ruleName: `validate_date_range`,
        type: 'validation',
        condition: `new Date(data.${endField.name}) < new Date(data.${startField.name})`,
        action: 'reject',
        description: `End date must be after start date`,
        codeSnippet: `if (data.${startField.name} && data.${endField.name} && new Date(data.${endField.name}) < new Date(data.${startField.name})) {
  return res.status(400).json({ error: "End date must be after start date" });
}`,
      });
    }

    const statusField = fields.find(f => f.name === 'status');
    if (statusField && statusField.type.startsWith('enum')) {
      const validStatuses = statusField.type.replace(/enum[\(:]/, '').replace(')', '').split(',').map(s => s.trim());
      rules.push({
        entityName: entity.name,
        ruleName: 'validate_status_value',
        type: 'validation',
        action: 'reject',
        description: `Status must be one of: ${validStatuses.join(', ')}`,
        codeSnippet: `const validStatuses = ${JSON.stringify(validStatuses)};
if (data.status && !validStatuses.includes(data.status)) {
  return res.status(400).json({ error: \`Invalid status. Must be one of: \${validStatuses.join(', ')}\` });
}`,
      });
    }

    const priceFields = fields.filter(f => CURRENCY_FIELD_PATTERNS.test(f.name));
    for (const pf of priceFields) {
      rules.push({
        entityName: entity.name,
        ruleName: `format_${pf.name}_currency`,
        type: 'derivation',
        action: 'format',
        description: `Format ${pf.name} to 2 decimal places`,
        codeSnippet: `const formatted${pf.name.charAt(0).toUpperCase() + pf.name.slice(1)} = typeof item.${pf.name} === 'number' ? \`$\${item.${pf.name}.toFixed(2)}\` : '$0.00';`,
      });
    }
  }

  for (const workflow of workflows) {
    for (const transition of workflow.transitions) {
      rules.push({
        entityName: workflow.entity,
        ruleName: `transition_${transition.from}_to_${transition.to}`,
        type: 'constraint',
        condition: `currentStatus === '${transition.from}'`,
        action: `setStatus('${transition.to}')`,
        description: `${transition.action}: ${transition.from} -> ${transition.to}`,
        codeSnippet: `if (data.status === '${transition.to}' && currentItem.status !== '${transition.from}') {
  return res.status(400).json({ error: \`Cannot ${transition.action.toLowerCase()} from \${currentItem.status} status\` });
}`,
      });
    }
  }

  return rules;
}

function inferUIPatterns(entities: PlannedEntity[], relationships: EntityRelationship[], workflows: PlannedWorkflow[]): UIPattern[] {
  const patterns: UIPattern[] = [];

  for (const entity of entities) {
    const fields = entity.fields;
    const hasStatus = fields.some(f => f.name === 'status');
    const hasDate = fields.some(f => DATE_FIELD_PATTERNS.test(f.name));
    const hasImage = fields.some(f => IMAGE_FIELD_PATTERNS.test(f.name));

    const relatedWorkflow = workflows.find(w => w.entity === entity.name);
    if (relatedWorkflow && relatedWorkflow.states.length >= 3) {
      patterns.push({
        entityName: entity.name,
        pattern: 'kanban',
        reason: `${entity.name} has a multi-state workflow (${relatedWorkflow.states.join(' -> ')}) that maps naturally to kanban columns`,
        config: {
          columns: relatedWorkflow.states,
          cardTitle: inferPrimaryDisplayField(entity),
          cardSubtitle: inferSecondaryDisplayField(entity),
        },
      });
    }

    if (hasDate && (entity.name.toLowerCase().includes('event') ||
        entity.name.toLowerCase().includes('appointment') ||
        entity.name.toLowerCase().includes('booking') ||
        entity.name.toLowerCase().includes('schedule') ||
        entity.name.toLowerCase().includes('reservation'))) {
      patterns.push({
        entityName: entity.name,
        pattern: 'calendar',
        reason: `${entity.name} is a time-bound entity that benefits from calendar visualization`,
        config: {
          dateField: fields.find(f => /date|start|scheduled/i.test(f.name))?.name || 'date',
          titleField: inferPrimaryDisplayField(entity),
        },
      });
    }

    if (hasImage || entity.name.toLowerCase().includes('product') ||
        entity.name.toLowerCase().includes('property') || entity.name.toLowerCase().includes('listing')) {
      patterns.push({
        entityName: entity.name,
        pattern: 'card-grid',
        reason: `${entity.name} benefits from a visual card layout for browsing`,
        config: {
          imageField: fields.find(f => IMAGE_FIELD_PATTERNS.test(f.name))?.name,
          titleField: inferPrimaryDisplayField(entity),
          subtitleField: inferSecondaryDisplayField(entity),
        },
      });
    }

    const childRelations = relationships.filter(r => r.to === entity.name && r.type === 'composition');
    if (childRelations.length > 0) {
      patterns.push({
        entityName: entity.name,
        pattern: 'master-detail',
        reason: `${entity.name} has child entities (${childRelations.map(r => r.from).join(', ')}) that should be shown in detail view`,
        config: {
          children: childRelations.map(r => r.from),
        },
      });
    }

    if (fields.length > 8) {
      patterns.push({
        entityName: entity.name,
        pattern: 'form-wizard',
        reason: `${entity.name} has ${fields.length} fields, which benefits from a multi-step form`,
        config: {
          steps: inferFormSteps(entity),
        },
      });
    }

    const kpiFields = fields.filter(f =>
      CURRENCY_FIELD_PATTERNS.test(f.name) || PERCENTAGE_FIELD_PATTERNS.test(f.name) ||
      /count|total|score|rating/i.test(f.name)
    );
    if (kpiFields.length >= 2) {
      patterns.push({
        entityName: entity.name,
        pattern: 'dashboard-widget',
        reason: `${entity.name} has ${kpiFields.length} numeric/metric fields suitable for dashboard KPIs`,
        config: {
          metrics: kpiFields.map(f => f.name),
        },
      });
    }
  }

  return patterns;
}

function inferFormGroupings(entity: PlannedEntity, semantics: FieldSemantics[]): FormGroup[] {
  const groups: FormGroup[] = [];
  const assignedFields = new Set<string>();

  const identityFields = entity.fields.filter(f =>
    /^(name|firstName|lastName|title|companyName|displayName|username|code|sku|orderNumber)$/i.test(f.name)
  ).map(f => f.name);
  if (identityFields.length > 0) {
    groups.push({ label: 'Basic Information', fields: identityFields, order: 1 });
    identityFields.forEach(f => assignedFields.add(f));
  }

  const contactFields = entity.fields.filter(f =>
    /^(email|phone|mobile|fax|website|address|city|state|zipCode|country|contactName)$/i.test(f.name)
  ).map(f => f.name);
  if (contactFields.length > 0) {
    groups.push({ label: 'Contact Details', fields: contactFields, order: 2 });
    contactFields.forEach(f => assignedFields.add(f));
  }

  const dateFields = entity.fields.filter(f =>
    DATE_FIELD_PATTERNS.test(f.name) && !assignedFields.has(f.name)
  ).map(f => f.name);
  if (dateFields.length > 0) {
    groups.push({ label: 'Dates & Schedule', fields: dateFields, order: 3 });
    dateFields.forEach(f => assignedFields.add(f));
  }

  const financialFields = entity.fields.filter(f =>
    (CURRENCY_FIELD_PATTERNS.test(f.name) || PERCENTAGE_FIELD_PATTERNS.test(f.name)) && !assignedFields.has(f.name)
  ).map(f => f.name);
  if (financialFields.length > 0) {
    groups.push({ label: 'Financial', fields: financialFields, order: 4, collapsible: true });
    financialFields.forEach(f => assignedFields.add(f));
  }

  const textareaFields = entity.fields.filter(f =>
    TEXTAREA_FIELD_PATTERNS.test(f.name) && !assignedFields.has(f.name)
  ).map(f => f.name);
  if (textareaFields.length > 0) {
    groups.push({ label: 'Additional Details', fields: textareaFields, order: 5, collapsible: true });
    textareaFields.forEach(f => assignedFields.add(f));
  }

  const remaining = entity.fields
    .filter(f => f.name !== 'id' && !assignedFields.has(f.name) && f.name !== 'createdAt')
    .map(f => f.name);
  if (remaining.length > 0) {
    groups.push({ label: 'Other', fields: remaining, order: groups.length > 0 ? 6 : 1 });
  }

  if (groups.length === 0) {
    groups.push({
      label: 'Details',
      fields: entity.fields.filter(f => f.name !== 'id' && f.name !== 'createdAt').map(f => f.name),
      order: 1,
    });
  }

  return groups;
}

function inferSearchableFields(entity: PlannedEntity): string[] {
  return entity.fields
    .filter(f =>
      f.name !== 'id' &&
      (f.type === 'text' || f.type === 'string' || f.type.includes('text')) &&
      /name|title|email|description|code|sku|number|label/i.test(f.name)
    )
    .map(f => f.name);
}

function inferSortableFields(entity: PlannedEntity): string[] {
  return entity.fields
    .filter(f =>
      f.name !== 'id' &&
      (/name|title|date|created|status|amount|total|price|priority|score|count/i.test(f.name))
    )
    .map(f => f.name);
}

function inferFilterableFields(entity: PlannedEntity): FilterConfig[] {
  const filters: FilterConfig[] = [];

  for (const field of entity.fields) {
    if (field.name === 'id') continue;

    if (field.name === 'status' || field.type.startsWith('enum')) {
      const options = field.type.startsWith('enum')
        ? field.type.replace(/enum[\(:]/, '').replace(')', '').split(',').map(s => s.trim())
        : ['active', 'inactive', 'pending', 'completed'];
      filters.push({
        field: field.name,
        filterType: 'select',
        options,
        label: field.name.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
      });
    } else if (field.type === 'boolean') {
      filters.push({
        field: field.name,
        filterType: 'toggle',
        label: field.name.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
      });
    } else if (field.type === 'date' || field.type === 'timestamp') {
      filters.push({
        field: field.name,
        filterType: 'date-range',
        label: field.name.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
      });
    } else if (CURRENCY_FIELD_PATTERNS.test(field.name) || /quantity|count|score/i.test(field.name)) {
      filters.push({
        field: field.name,
        filterType: 'range',
        label: field.name.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
      });
    }
  }

  return filters;
}

function inferPrimaryDisplayField(entity: PlannedEntity): string {
  const priorityNames = ['name', 'title', 'companyName', 'firstName', 'displayName', 'label', 'orderNumber', 'code', 'sku', 'subject'];
  for (const name of priorityNames) {
    const field = entity.fields.find(f => f.name.toLowerCase() === name.toLowerCase());
    if (field) return field.name;
  }
  const textField = entity.fields.find(f => f.type === 'text' && f.name !== 'id' && f.required);
  return textField?.name || entity.fields[1]?.name || 'id';
}

function inferSecondaryDisplayField(entity: PlannedEntity): string {
  const primaryField = inferPrimaryDisplayField(entity);
  const secondaryPriority = ['status', 'email', 'type', 'category', 'description', 'date', 'amount', 'priority'];
  for (const name of secondaryPriority) {
    const field = entity.fields.find(f =>
      f.name.toLowerCase().includes(name.toLowerCase()) && f.name !== primaryField
    );
    if (field) return field.name;
  }
  const remainingFields = entity.fields.filter(f => f.name !== 'id' && f.name !== primaryField);
  return remainingFields[0]?.name || '';
}

function inferFormSteps(entity: PlannedEntity): { name: string; fields: string[] }[] {
  const steps: { name: string; fields: string[] }[] = [];
  const allFields = entity.fields.filter(f => f.name !== 'id' && f.name !== 'createdAt');

  const chunkSize = Math.ceil(allFields.length / 3);
  for (let i = 0; i < allFields.length; i += chunkSize) {
    const chunk = allFields.slice(i, i + chunkSize);
    const stepNames = ['Basic Info', 'Details', 'Additional Settings'];
    steps.push({
      name: stepNames[Math.floor(i / chunkSize)] || `Step ${Math.floor(i / chunkSize) + 1}`,
      fields: chunk.map(f => f.name),
    });
  }

  return steps;
}

export function generateSmartInputComponent(fieldSemantic: FieldSemantics): string {
  switch (fieldSemantic.inputType) {
    case 'currency':
      return `<div className="relative">
  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
  <Input
    id="${fieldSemantic.fieldName}"
    type="number"
    step="0.01"
    min="0"
    placeholder="0.00"
    className="pl-7"
    data-testid="input-${toKebabCase(fieldSemantic.fieldName)}"
  />
</div>`;

    case 'percentage':
      return `<div className="relative">
  <Input
    id="${fieldSemantic.fieldName}"
    type="number"
    step="0.1"
    min="0"
    max="100"
    placeholder="0"
    className="pr-8"
    data-testid="input-${toKebabCase(fieldSemantic.fieldName)}"
  />
  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
</div>`;

    case 'email':
      return `<Input
  id="${fieldSemantic.fieldName}"
  type="email"
  placeholder="${fieldSemantic.placeholder || 'name@example.com'}"
  data-testid="input-${toKebabCase(fieldSemantic.fieldName)}"
/>`;

    case 'tel':
      return `<Input
  id="${fieldSemantic.fieldName}"
  type="tel"
  placeholder="${fieldSemantic.placeholder || '+1 (555) 000-0000'}"
  data-testid="input-${toKebabCase(fieldSemantic.fieldName)}"
/>`;

    case 'url':
      return `<Input
  id="${fieldSemantic.fieldName}"
  type="url"
  placeholder="${fieldSemantic.placeholder || 'https://example.com'}"
  data-testid="input-${toKebabCase(fieldSemantic.fieldName)}"
/>`;

    case 'textarea':
      return `<textarea
  id="${fieldSemantic.fieldName}"
  placeholder="${fieldSemantic.placeholder || 'Enter text...'}"
  className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-600"
  rows={3}
  data-testid="input-${toKebabCase(fieldSemantic.fieldName)}"
/>`;

    case 'date':
    case 'datetime':
      return `<Input
  id="${fieldSemantic.fieldName}"
  type="${fieldSemantic.inputType === 'datetime' ? 'datetime-local' : 'date'}"
  data-testid="input-${toKebabCase(fieldSemantic.fieldName)}"
/>`;

    case 'rating':
      return `<div className="flex gap-1">
  {[1,2,3,4,5].map(star => (
    <button key={star} className="text-yellow-400 hover:text-yellow-500" data-testid={\`input-rating-\${star}\`}>
      {"\\u2605"}
    </button>
  ))}
</div>`;

    case 'checkbox':
      return `<input
  id="${fieldSemantic.fieldName}"
  type="checkbox"
  className="h-4 w-4 rounded border-gray-300"
  data-testid="input-${toKebabCase(fieldSemantic.fieldName)}"
/>`;

    default:
      return `<Input
  id="${fieldSemantic.fieldName}"
  placeholder="${fieldSemantic.placeholder || ''}"
  data-testid="input-${toKebabCase(fieldSemantic.fieldName)}"
/>`;
  }
}

export function generateCurrencyDisplay(fieldName: string): string {
  return `{typeof item.${fieldName} === 'number' ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.${fieldName}) : '$0.00'}`;
}

export function generatePercentageDisplay(fieldName: string): string {
  return `{typeof item.${fieldName} === 'number' ? \`\${item.${fieldName}}%\` : '0%'}`;
}

export function generateDateDisplay(fieldName: string): string {
  return `{item.${fieldName} ? new Date(item.${fieldName}).toLocaleDateString() : '—'}`;
}

export function generateSmartTableCell(fieldName: string, semantics: FieldSemantics): string {
  switch (semantics.inputType) {
    case 'currency':
      return `<td className="p-3 text-sm font-medium">${generateCurrencyDisplay(fieldName)}</td>`;
    case 'percentage':
      return `<td className="p-3 text-sm">${generatePercentageDisplay(fieldName)}</td>`;
    case 'date':
    case 'datetime':
      return `<td className="p-3 text-sm text-muted-foreground">${generateDateDisplay(fieldName)}</td>`;
    case 'email':
      return `<td className="p-3 text-sm"><a href={\`mailto:\${item.${fieldName}}\`} className="text-blue-600 hover:underline">{item.${fieldName}}</a></td>`;
    case 'tel':
      return `<td className="p-3 text-sm"><a href={\`tel:\${item.${fieldName}}\`} className="text-blue-600 hover:underline">{item.${fieldName}}</a></td>`;
    case 'url':
      return `<td className="p-3 text-sm"><a href={item.${fieldName}} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Link</a></td>`;
    case 'checkbox':
      return `<td className="p-3 text-sm">{item.${fieldName} ? "Yes" : "No"}</td>`;
    case 'rating':
      return `<td className="p-3 text-sm text-yellow-500">{"\\u2605".repeat(item.${fieldName} || 0)}</td>`;
    default:
      return `<td className="p-3 text-sm">{item.${fieldName}}</td>`;
  }
}

function inferArchitecturePatterns(entities: PlannedEntity[], relationships: EntityRelationship[]): ArchitecturePattern[] {
  const patterns: ArchitecturePattern[] = [];

  for (const entity of entities) {
    const fields = entity.fields;
    const fieldNames = fields.map(f => f.name.toLowerCase());
    const textFields = fields.filter(f => /name|title|description|email|label|subject/i.test(f.name) && (f.type === 'text' || f.type === 'string' || f.type.includes('text')));
    const sortableFields = fields.filter(f => /date|created|amount|total|price|name|title|status|priority/i.test(f.name));
    const hasImage = fields.some(f => IMAGE_FIELD_PATTERNS.test(f.name));
    const hasStatus = fields.some(f => f.name === 'status');
    const hasBooleanToggle = fields.some(f => f.type === 'boolean');

    if (fields.length > 5) {
      patterns.push({
        entityName: entity.name,
        pattern: 'pagination',
        reason: `${entity.name} has ${fields.length} fields, likely many records that need paginated display`,
        config: { pageSize: 10, showPageNumbers: true },
        codeHint: `const [page, setPage] = useState(1);
const pageSize = 10;
const { data } = useQuery({ queryKey: ['/${entity.name.toLowerCase()}s', page], queryFn: () => fetch(\`/api/${entity.name.toLowerCase()}s?page=\${page}&limit=\${pageSize}\`).then(r => r.json()) });
<div className="flex items-center justify-between mt-4">
  <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
  <span>Page {page}</span>
  <Button onClick={() => setPage(p => p + 1)} disabled={!data?.hasMore}>Next</Button>
</div>`,
      });
    }

    if (textFields.length > 0) {
      patterns.push({
        entityName: entity.name,
        pattern: 'search-filter',
        reason: `${entity.name} has searchable text fields (${textFields.map(f => f.name).join(', ')})`,
        config: { searchFields: textFields.map(f => f.name), debounceMs: 300 },
        codeHint: `const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 300);
const { data } = useQuery({ queryKey: ['/${entity.name.toLowerCase()}s', debouncedSearch], queryFn: () => fetch(\`/api/${entity.name.toLowerCase()}s?search=\${debouncedSearch}\`).then(r => r.json()) });
<Input placeholder="Search ${entity.name.toLowerCase()}s..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />`,
      });
    }

    if (sortableFields.length > 0) {
      patterns.push({
        entityName: entity.name,
        pattern: 'sorting',
        reason: `${entity.name} has sortable fields (${sortableFields.map(f => f.name).join(', ')})`,
        config: { sortableColumns: sortableFields.map(f => f.name), defaultSort: sortableFields[0]?.name },
        codeHint: `const [sortBy, setSortBy] = useState('${sortableFields[0]?.name || 'id'}');
const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
const toggleSort = (field: string) => { if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortBy(field); setSortDir('asc'); } };
<th onClick={() => toggleSort('${sortableFields[0]?.name || 'name'}')} className="cursor-pointer hover:bg-muted">${sortableFields[0]?.name || 'Name'} {sortBy === '${sortableFields[0]?.name || 'name'}' && (sortDir === 'asc' ? '↑' : '↓')}</th>`,
      });
    }

    if (hasImage) {
      patterns.push({
        entityName: entity.name,
        pattern: 'infinite-scroll',
        reason: `${entity.name} has image fields, better suited for infinite scroll with visual card layout`,
        config: { batchSize: 20, threshold: 200 },
        codeHint: `const observerRef = useRef<IntersectionObserver>();
const lastElementRef = useCallback((node: HTMLElement | null) => {
  if (observerRef.current) observerRef.current.disconnect();
  observerRef.current = new IntersectionObserver(entries => { if (entries[0].isIntersecting && hasNextPage) fetchNextPage(); });
  if (node) observerRef.current.observe(node);
}, [hasNextPage, fetchNextPage]);`,
      });
    }

    if (hasStatus || hasBooleanToggle) {
      patterns.push({
        entityName: entity.name,
        pattern: 'optimistic-update',
        reason: `${entity.name} has ${hasStatus ? 'status' : 'toggle'} fields suitable for optimistic UI updates`,
        config: { fields: fields.filter(f => f.name === 'status' || f.type === 'boolean').map(f => f.name) },
        codeHint: `const queryClient = useQueryClient();
const updateMutation = useMutation({
  mutationFn: (data: Partial<${entity.name}>) => fetch(\`/api/${entity.name.toLowerCase()}s/\${data.id}\`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey: ['/${entity.name.toLowerCase()}s'] });
    const prev = queryClient.getQueryData(['/${entity.name.toLowerCase()}s']);
    queryClient.setQueryData(['/${entity.name.toLowerCase()}s'], (old: any[]) => old.map(item => item.id === newData.id ? { ...item, ...newData } : item));
    return { prev };
  },
  onError: (_err, _data, context) => { queryClient.setQueryData(['/${entity.name.toLowerCase()}s'], context?.prev); },
  onSettled: () => { queryClient.invalidateQueries({ queryKey: ['/${entity.name.toLowerCase()}s'] }); },
});`,
      });
    }

    if (textFields.length >= 3) {
      patterns.push({
        entityName: entity.name,
        pattern: 'debounced-search',
        reason: `${entity.name} has ${textFields.length} text fields, benefits from debounced search to reduce API calls`,
        config: { delayMs: 300, minChars: 2 },
        codeHint: `function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => { const handler = setTimeout(() => setDebouncedValue(value), delay); return () => clearTimeout(handler); }, [value, delay]);
  return debouncedValue;
}`,
      });
    }

    const hasDetailPage = relationships.some(r => r.to === entity.name || r.from === entity.name);
    if (hasDetailPage) {
      patterns.push({
        entityName: entity.name,
        pattern: 'error-boundary',
        reason: `${entity.name} has detail pages with relationships that may fail to load`,
        config: { fallbackMessage: `Failed to load ${entity.name.toLowerCase()} details` },
        codeHint: `<ErrorBoundary fallback={<div className="p-8 text-center"><AlertCircle className="mx-auto h-12 w-12 text-destructive" /><h3 className="mt-4 text-lg font-semibold">Something went wrong</h3><p className="text-muted-foreground">Failed to load ${entity.name.toLowerCase()} details. Please try again.</p><Button onClick={() => window.location.reload()} className="mt-4">Retry</Button></div>}><${entity.name}Detail /></ErrorBoundary>`,
      });
    }

    const kpiFields = fields.filter(f => CURRENCY_FIELD_PATTERNS.test(f.name) || PERCENTAGE_FIELD_PATTERNS.test(f.name) || /count|total|score/i.test(f.name));
    if (kpiFields.length >= 2 || fields.length > 5) {
      patterns.push({
        entityName: entity.name,
        pattern: 'loading-skeleton',
        reason: `${entity.name} ${kpiFields.length >= 2 ? 'is a dashboard entity' : 'has a list page'} that benefits from skeleton loading`,
        config: { skeletonRows: 5, showHeaderSkeleton: true },
        codeHint: `{isLoading ? (
  <div className="space-y-3">
    <Skeleton className="h-8 w-[250px]" />
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2"><Skeleton className="h-4 w-[250px]" /><Skeleton className="h-4 w-[200px]" /></div>
      </div>
    ))}
  </div>
) : (<${entity.name}List data={data} />)}`,
      });
    }
  }

  return patterns;
}

function inferCrossEntityLogic(entities: PlannedEntity[], relationships: EntityRelationship[], workflows: PlannedWorkflow[]): CrossEntityLogic[] {
  const logic: CrossEntityLogic[] = [];

  for (const rel of relationships) {
    const parentEntity = entities.find(e => e.name === rel.to);
    const childEntity = entities.find(e => e.name === rel.from);
    if (!parentEntity || !childEntity) continue;

    const parentHasStatus = parentEntity.fields.some(f => f.name === 'status');
    const childHasStatus = childEntity.fields.some(f => f.name === 'status');

    if (parentHasStatus && childHasStatus && (rel.type === 'composition' || rel.type === 'parent-child')) {
      const parentWorkflow = workflows.find(w => w.entity === parentEntity.name);
      const cancelState = parentWorkflow?.states.find(s => /cancel|void|reject|close/i.test(s)) || 'cancelled';
      logic.push({
        sourceEntity: parentEntity.name,
        targetEntity: childEntity.name,
        logicType: 'status-propagation',
        description: `When ${parentEntity.name} status changes to '${cancelState}', propagate to all related ${childEntity.name} records`,
        codeSnippet: `async function propagateStatusTo${childEntity.name}(${parentEntity.name.toLowerCase()}Id: number, newStatus: string) {
  if (newStatus === '${cancelState}') {
    await db.update(${childEntity.name.toLowerCase()}s).set({ status: '${cancelState}' }).where(eq(${childEntity.name.toLowerCase()}s.${rel.fromField || parentEntity.name.toLowerCase() + 'Id'}, ${parentEntity.name.toLowerCase()}Id));
  }
}`,
      });
    }

    if (rel.type === 'composition' || rel.type === 'parent-child') {
      logic.push({
        sourceEntity: parentEntity.name,
        targetEntity: childEntity.name,
        logicType: 'cascade-update',
        description: `When ${parentEntity.name} is deleted, cascade delete all related ${childEntity.name} records`,
        codeSnippet: `async function cascadeDelete${parentEntity.name}(id: number) {
  await db.delete(${childEntity.name.toLowerCase()}s).where(eq(${childEntity.name.toLowerCase()}s.${rel.fromField || parentEntity.name.toLowerCase() + 'Id'}, id));
  await db.delete(${parentEntity.name.toLowerCase()}s).where(eq(${parentEntity.name.toLowerCase()}s.id, id));
}`,
      });
    }

    const childNumericFields = childEntity.fields.filter(f =>
      CURRENCY_FIELD_PATTERNS.test(f.name) || /quantity|count|amount|total|hours/i.test(f.name)
    );
    if (childNumericFields.length > 0 && (rel.type === 'composition' || rel.cardinality === 'N:1')) {
      for (const numField of childNumericFields) {
        logic.push({
          sourceEntity: childEntity.name,
          targetEntity: parentEntity.name,
          logicType: 'aggregate-computation',
          description: `Compute sum of ${childEntity.name}.${numField.name} on ${parentEntity.name} detail page`,
          codeSnippet: `const ${childEntity.name.toLowerCase()}${numField.name.charAt(0).toUpperCase() + numField.name.slice(1)}Total = useMemo(() => {
  return related${childEntity.name}s?.reduce((sum: number, item: any) => sum + (Number(item.${numField.name}) || 0), 0) ?? 0;
}, [related${childEntity.name}s]);`,
        });
      }
    }

    if (rel.cardinality === 'N:1' || rel.type === 'reference') {
      const parentDisplayField = parentEntity.fields.find(f => /name|title|label|code/i.test(f.name))?.name || 'name';
      logic.push({
        sourceEntity: childEntity.name,
        targetEntity: parentEntity.name,
        logicType: 'derived-filter',
        description: `${childEntity.name} list page should have a filter dropdown for ${parentEntity.name}.${parentDisplayField}`,
        codeSnippet: `const [selected${parentEntity.name}Id, setSelected${parentEntity.name}Id] = useState<number | null>(null);
const { data: ${parentEntity.name.toLowerCase()}s } = useQuery({ queryKey: ['/${parentEntity.name.toLowerCase()}s'], queryFn: () => fetch('/api/${parentEntity.name.toLowerCase()}s').then(r => r.json()) });
<Select value={selected${parentEntity.name}Id?.toString() || ''} onValueChange={v => setSelected${parentEntity.name}Id(v ? Number(v) : null)}>
  <SelectTrigger><SelectValue placeholder="Filter by ${parentEntity.name}" /></SelectTrigger>
  <SelectContent>{${parentEntity.name.toLowerCase()}s?.map((item: any) => <SelectItem key={item.id} value={item.id.toString()}>{item.${parentDisplayField}}</SelectItem>)}</SelectContent>
</Select>`,
      });
    }
  }

  const fieldPatternMap: Record<string, string[]> = {};
  for (const entity of entities) {
    for (const field of entity.fields) {
      if (/email/i.test(field.name)) {
        if (!fieldPatternMap['email']) fieldPatternMap['email'] = [];
        fieldPatternMap['email'].push(entity.name);
      }
      if (/phone/i.test(field.name)) {
        if (!fieldPatternMap['phone']) fieldPatternMap['phone'] = [];
        fieldPatternMap['phone'].push(entity.name);
      }
      if (/url|website/i.test(field.name)) {
        if (!fieldPatternMap['url']) fieldPatternMap['url'] = [];
        fieldPatternMap['url'].push(entity.name);
      }
    }
  }

  for (const [pattern, entityNames] of Object.entries(fieldPatternMap)) {
    if (entityNames.length >= 2) {
      const validatorMap: Record<string, string> = {
        email: `export function validateEmail(value: string): boolean { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value); }`,
        phone: `export function validatePhone(value: string): boolean { return /^\\+?[\\d\\s\\-()]{7,15}$/.test(value); }`,
        url: `export function validateUrl(value: string): boolean { try { new URL(value); return true; } catch { return false; } }`,
      };
      logic.push({
        sourceEntity: entityNames[0],
        targetEntity: entityNames[1],
        logicType: 'shared-validation',
        description: `Shared ${pattern} validation used by ${entityNames.join(', ')}`,
        codeSnippet: validatorMap[pattern] || `export function validate${pattern.charAt(0).toUpperCase() + pattern.slice(1)}(value: string): boolean { return value.length > 0; }`,
      });
    }
  }

  return logic;
}

function inferSmartValidationRules(entities: PlannedEntity[], relationships: EntityRelationship[]): BusinessRule[] {
  const rules: BusinessRule[] = [];

  for (const entity of entities) {
    const fields = entity.fields;
    const fieldNames = fields.map(f => f.name.toLowerCase());

    const hasStartDate = fields.find(f => /^(startDate|startTime|start|checkIn|beginDate)$/i.test(f.name));
    const hasEndDate = fields.find(f => /^(endDate|endTime|end|checkOut|deadline|dueDate)$/i.test(f.name));
    if (hasStartDate && hasEndDate) {
      rules.push({
        entityName: entity.name,
        ruleName: `zod_date_range_${hasStartDate.name}_${hasEndDate.name}`,
        type: 'validation',
        condition: `${hasEndDate.name} < ${hasStartDate.name}`,
        action: 'reject',
        description: `${hasEndDate.name} must be on or after ${hasStartDate.name}`,
        codeSnippet: `.refine((data) => !data.${hasStartDate.name} || !data.${hasEndDate.name} || new Date(data.${hasEndDate.name}) >= new Date(data.${hasStartDate.name}), { message: "${hasEndDate.name} must be on or after ${hasStartDate.name}", path: ["${hasEndDate.name}"] })`,
      });
    }

    const statusField = fields.find(f => f.name === 'status');
    const assignableFields = fields.filter(f => /assignedTo|assignee|owner|responsible|handler/i.test(f.name));
    if (statusField && assignableFields.length > 0) {
      for (const aField of assignableFields) {
        rules.push({
          entityName: entity.name,
          ruleName: `conditional_required_${aField.name}`,
          type: 'validation',
          condition: `status === 'in_progress' && !${aField.name}`,
          action: 'reject',
          description: `${aField.name} is required when status is 'in_progress'`,
          codeSnippet: `.refine((data) => !(data.status === 'in_progress' && !data.${aField.name}), { message: "${aField.name} is required when status is in_progress", path: ["${aField.name}"] })`,
        });
      }
    }

    const uniqueCandidates = fields.filter(f => /^(email|username|code|sku|slug|orderNumber|invoiceNumber)$/i.test(f.name));
    for (const uf of uniqueCandidates) {
      rules.push({
        entityName: entity.name,
        ruleName: `unique_${uf.name}`,
        type: 'constraint',
        action: 'check-unique',
        description: `${uf.name} must be unique across all ${entity.name} records`,
        codeSnippet: `const existing = await db.select().from(${entity.name.toLowerCase()}s).where(eq(${entity.name.toLowerCase()}s.${uf.name}, data.${uf.name})).limit(1);
if (existing.length > 0 && existing[0].id !== data.id) {
  return res.status(409).json({ error: "${uf.name} already exists" });
}`,
      });
    }

    const refFields = fields.filter(f => f.name.toLowerCase().endsWith('id') && f.name.toLowerCase() !== 'id');
    for (const rf of refFields) {
      const refName = rf.name.replace(/Id$/i, '');
      const refEntity = entities.find(e => e.name.toLowerCase() === refName.toLowerCase() || e.name.toLowerCase() === refName.toLowerCase() + 's');
      if (refEntity) {
        rules.push({
          entityName: entity.name,
          ruleName: `ref_integrity_${rf.name}`,
          type: 'constraint',
          action: 'check-exists',
          description: `Referenced ${refEntity.name} must exist for ${rf.name}`,
          codeSnippet: `if (data.${rf.name}) {
  const ref = await db.select().from(${refEntity.name.toLowerCase()}s).where(eq(${refEntity.name.toLowerCase()}s.id, data.${rf.name})).limit(1);
  if (ref.length === 0) { return res.status(400).json({ error: "Referenced ${refEntity.name} not found" }); }
}`,
        });
      }
    }

    const priceFields = fields.filter(f => CURRENCY_FIELD_PATTERNS.test(f.name) && (f.type.includes('number') || f.type.includes('integer') || f.type.includes('real') || f.type.includes('decimal')));
    for (const pf of priceFields) {
      rules.push({
        entityName: entity.name,
        ruleName: `numeric_bound_${pf.name}_non_negative`,
        type: 'validation',
        condition: `${pf.name} < 0`,
        action: 'reject',
        description: `${pf.name} must be >= 0`,
        codeSnippet: `z.number().min(0, { message: "${pf.name} must be a non-negative number" })`,
      });
    }

    const percentFields = fields.filter(f => PERCENTAGE_FIELD_PATTERNS.test(f.name) && !CURRENCY_FIELD_PATTERNS.test(f.name));
    for (const pf of percentFields) {
      rules.push({
        entityName: entity.name,
        ruleName: `numeric_bound_${pf.name}_percentage`,
        type: 'validation',
        condition: `${pf.name} < 0 || ${pf.name} > 100`,
        action: 'reject',
        description: `${pf.name} must be between 0 and 100`,
        codeSnippet: `z.number().min(0).max(100, { message: "${pf.name} must be between 0 and 100" })`,
      });
    }

    const ratingField = fields.find(f => /^(rating|score|stars)$/i.test(f.name));
    if (ratingField) {
      rules.push({
        entityName: entity.name,
        ruleName: `numeric_bound_${ratingField.name}_rating`,
        type: 'validation',
        condition: `${ratingField.name} < 1 || ${ratingField.name} > 5`,
        action: 'reject',
        description: `${ratingField.name} must be between 1 and 5`,
        codeSnippet: `z.number().min(1).max(5, { message: "${ratingField.name} must be between 1 and 5" })`,
      });
    }

    const nameFields = fields.filter(f => /^(name|firstName|lastName|title|companyName|displayName|label)$/i.test(f.name));
    for (const nf of nameFields) {
      rules.push({
        entityName: entity.name,
        ruleName: `string_length_${nf.name}`,
        type: 'validation',
        action: 'reject',
        description: `${nf.name} must be at most 100 characters`,
        codeSnippet: `z.string().max(100, { message: "${nf.name} must be at most 100 characters" })`,
      });
    }

    const descFields = fields.filter(f => TEXTAREA_FIELD_PATTERNS.test(f.name));
    for (const df of descFields) {
      rules.push({
        entityName: entity.name,
        ruleName: `string_length_${df.name}`,
        type: 'validation',
        action: 'reject',
        description: `${df.name} must be at most 2000 characters`,
        codeSnippet: `z.string().max(2000, { message: "${df.name} must be at most 2000 characters" })`,
      });
    }

    const codeFields = fields.filter(f => /^(code|sku|slug|abbreviation)$/i.test(f.name));
    for (const cf of codeFields) {
      rules.push({
        entityName: entity.name,
        ruleName: `string_length_${cf.name}`,
        type: 'validation',
        action: 'reject',
        description: `${cf.name} must be at most 50 characters`,
        codeSnippet: `z.string().max(50, { message: "${cf.name} must be at most 50 characters" })`,
      });
    }

    const hasPassword = fieldNames.includes('password');
    const hasConfirmPassword = fieldNames.includes('confirmpassword') || fieldNames.includes('passwordconfirm');
    if (hasPassword && hasConfirmPassword) {
      const confirmField = fields.find(f => /confirmpassword|passwordconfirm/i.test(f.name));
      rules.push({
        entityName: entity.name,
        ruleName: 'cross_field_password_match',
        type: 'validation',
        condition: `password !== ${confirmField?.name || 'confirmPassword'}`,
        action: 'reject',
        description: 'Password and confirmation must match',
        codeSnippet: `.refine((data) => data.password === data.${confirmField?.name || 'confirmPassword'}, { message: "Passwords do not match", path: ["${confirmField?.name || 'confirmPassword'}"] })`,
      });
    }
  }

  return rules;
}

function inferCodeQualityPatterns(entities: PlannedEntity[], relationships: EntityRelationship[], uiPatterns: UIPattern[]): CodeQualityPattern[] {
  const patterns: CodeQualityPattern[] = [];

  const entitiesWithCurrency = entities.filter(e => e.fields.some(f => CURRENCY_FIELD_PATTERNS.test(f.name)));
  if (entitiesWithCurrency.length >= 3) {
    patterns.push({
      type: 'shared-utility',
      name: 'formatCurrency',
      description: 'Shared currency formatting utility used across multiple entities',
      applicableEntities: entitiesWithCurrency.map(e => e.name),
      codeSnippet: `export function formatCurrency(value: number | null | undefined, currency = 'USD'): string {
  if (value == null) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}

export function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[^0-9.-]+/g, '')) || 0;
}`,
    });
  }

  const entitiesWithDetailPages = entities.filter(e =>
    relationships.some(r => r.to === e.name || r.from === e.name)
  );
  if (entitiesWithDetailPages.length >= 2) {
    patterns.push({
      type: 'error-boundary',
      name: 'EntityErrorBoundary',
      description: 'Error boundary component for entity detail pages',
      applicableEntities: entitiesWithDetailPages.map(e => e.name),
      codeSnippet: `class EntityErrorBoundary extends React.Component<{ children: React.ReactNode; entityName: string }, { hasError: boolean; error?: Error }> {
  state = { hasError: false, error: undefined as Error | undefined };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (<div className="p-8 text-center border rounded-lg bg-destructive/5">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
        <h3 className="mt-4 text-lg font-semibold">Error loading {this.props.entityName}</h3>
        <p className="mt-2 text-muted-foreground">{this.state.error?.message}</p>
        <Button onClick={() => this.setState({ hasError: false })} className="mt-4">Try Again</Button>
      </div>);
    }
    return this.props.children;
  }
}`,
    });
  }

  if (entities.length >= 3) {
    patterns.push({
      type: 'loading-state',
      name: 'TableSkeleton',
      description: 'Reusable skeleton loading component for data tables',
      applicableEntities: entities.map(e => e.name),
      codeSnippet: `export function TableSkeleton({ columns = 4, rows = 5 }: { columns?: number; rows?: number }) {
  return (
    <div className="w-full space-y-3">
      <div className="flex gap-4">{Array.from({ length: columns }).map((_, i) => <Skeleton key={i} className="h-8 flex-1" />)}</div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">{Array.from({ length: columns }).map((_, j) => <Skeleton key={j} className="h-12 flex-1" />)}</div>
      ))}
    </div>
  );
}`,
    });
  }

  for (const entity of entities) {
    const displayName = entity.name.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
    patterns.push({
      type: 'empty-state',
      name: `${entity.name}EmptyState`,
      description: `Empty state component for ${entity.name} list when no records exist`,
      applicableEntities: [entity.name],
      codeSnippet: `export function ${entity.name}EmptyState({ onCreateNew }: { onCreateNew?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <FileX className="h-12 w-12 text-muted-foreground" />
      <h3 className="mt-4 text-lg font-semibold">No ${displayName}s yet</h3>
      <p className="mt-2 text-sm text-muted-foreground">Get started by creating your first ${displayName}.</p>
      {onCreateNew && <Button onClick={onCreateNew} className="mt-4"><Plus className="mr-2 h-4 w-4" />Create ${entity.name}</Button>}
    </div>
  );
}`,
    });
  }

  const entitiesWithManyFields = entities.filter(e => e.fields.filter(f => f.name !== 'id').length >= 5);
  for (const entity of entitiesWithManyFields) {
    const zodFields = entity.fields
      .filter(f => f.name !== 'id' && f.name !== 'createdAt')
      .map(f => {
        if (f.type === 'boolean') return `  ${f.name}: z.boolean()`;
        if (f.type.includes('number') || f.type.includes('integer') || f.type.includes('real')) return `  ${f.name}: z.number()${f.required ? '' : '.optional()'}`;
        if (f.type === 'date' || f.type === 'timestamp') return `  ${f.name}: z.string()${f.required ? '' : '.optional()'}`;
        return `  ${f.name}: z.string()${f.required ? '.min(1, "Required")' : '.optional()'}`;
      })
      .join(',\n');
    patterns.push({
      type: 'form-validation-schema',
      name: `${entity.name}FormSchema`,
      description: `Zod validation schema for ${entity.name} form with ${entity.fields.length} fields`,
      applicableEntities: [entity.name],
      codeSnippet: `export const ${entity.name.charAt(0).toLowerCase() + entity.name.slice(1)}FormSchema = z.object({\n${zodFields}\n});`,
    });
  }

  if (entities.length >= 2) {
    patterns.push({
      type: 'api-error-handler',
      name: 'handleApiError',
      description: 'Shared API error handler with toast notifications for consistent error handling',
      applicableEntities: entities.map(e => e.name),
      codeSnippet: `export function handleApiError(error: unknown, toast: (opts: { title: string; description?: string; variant?: string }) => void) {
  if (error instanceof Response) {
    error.json().then(body => {
      toast({ title: 'Error', description: body.error || body.message || 'An unexpected error occurred', variant: 'destructive' });
    }).catch(() => {
      toast({ title: 'Error', description: \`Request failed with status \${error.status}\`, variant: 'destructive' });
    });
  } else if (error instanceof Error) {
    toast({ title: 'Error', description: error.message, variant: 'destructive' });
  } else {
    toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' });
  }
}`,
    });
  }

  const entitiesWithFrequentUpdates = entities.filter(e =>
    e.fields.some(f => f.name === 'status' || f.type === 'boolean') &&
    relationships.some(r => r.from === e.name || r.to === e.name)
  );
  if (entitiesWithFrequentUpdates.length >= 2) {
    patterns.push({
      type: 'optimistic-update-hook',
      name: 'useOptimisticUpdate',
      description: 'Reusable hook for optimistic UI updates with automatic rollback on error',
      applicableEntities: entitiesWithFrequentUpdates.map(e => e.name),
      codeSnippet: `export function useOptimisticUpdate<T extends { id: number }>(queryKey: string[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<T> }) => {
      const res = await fetch(\`/api/\${queryKey[0]}/\${id}\`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Update failed');
      return res.json();
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<T[]>(queryKey);
      queryClient.setQueryData<T[]>(queryKey, (old) => old?.map(item => item.id === id ? { ...item, ...data } : item) || []);
      return { previousData };
    },
    onError: (_err, _vars, context) => { if (context?.previousData) queryClient.setQueryData(queryKey, context.previousData); },
    onSettled: () => { queryClient.invalidateQueries({ queryKey }); },
  });
}`,
    });
  }

  return patterns;
}

function toKebabCase(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
}