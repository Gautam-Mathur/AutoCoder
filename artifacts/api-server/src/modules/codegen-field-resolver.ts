import type { PlannedEntity } from './plan-generator.js';
import type { FieldSemantics, ReasoningResult } from './contextual-reasoning-engine.js';

export interface ResolvedField {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  semantic?: FieldSemantics;
  isId: boolean;
  isTimestamp: boolean;
  isForeignKey: boolean;
  foreignEntity?: string;
  isComputed: boolean;
  isStatus: boolean;
  isName: boolean;
  isEnum: boolean;
  enumValues?: string[];
  displayOrder: number;
}

export interface EntityFieldMap {
  entityName: string;
  allFields: ResolvedField[];
  displayFields: ResolvedField[];
  editableFields: ResolvedField[];
  nameField: ResolvedField | null;
  statusField: ResolvedField | null;
  foreignKeyFields: ResolvedField[];
  searchableFields: ResolvedField[];
  sortableFields: ResolvedField[];
}

const NAME_FIELDS = ['name', 'title', 'firstName', 'companyName', 'orderNumber', 'trackingNumber', 'sku', 'code', 'label', 'subject', 'headline', 'fullName', 'displayName', 'username'];
const ID_FIELDS = ['id'];
const TIMESTAMP_FIELDS = ['createdAt', 'updatedAt', 'deletedAt', 'created_at', 'updated_at'];
const COMPUTED_PREFIXES = ['Computed:', 'Derived:', 'Calculated:'];

export function resolveEntityFields(entity: PlannedEntity, reasoning: ReasoningResult | null): EntityFieldMap {
  const entitySemantics = reasoning?.fieldSemantics?.get(entity.name) || [];
  const computedFields = reasoning?.computedFields?.filter(cf => cf.entityName === entity.name) || [];
  const computedNames = new Set(computedFields.map(cf => cf.fieldName));

  const allFields: ResolvedField[] = entity.fields.map((f, index) => {
    const semantic = entitySemantics.find(s => s.fieldName === f.name);
    const isId = ID_FIELDS.includes(f.name);
    const isTimestamp = TIMESTAMP_FIELDS.includes(f.name);
    const isForeignKey = f.name.endsWith('Id') && f.name !== 'id';
    const foreignEntity = isForeignKey ? f.name.replace(/Id$/, '') : undefined;
    const isComputed = computedNames.has(f.name) || COMPUTED_PREFIXES.some(p => f.description?.startsWith(p));
    const isStatus = f.name === 'status';
    const isName = NAME_FIELDS.includes(f.name);
    const enumMatch = f.type.match(/enum\(([^)]+)\)/);
    const isEnum = !!enumMatch;
    const enumValues = enumMatch ? enumMatch[1].split(',').map(v => v.trim().replace(/'/g, '')) : undefined;

    return {
      ...f,
      semantic,
      isId,
      isTimestamp,
      isForeignKey,
      foreignEntity,
      isComputed,
      isStatus,
      isName,
      isEnum,
      enumValues,
      displayOrder: isId ? 100 : isName ? 0 : isStatus ? 1 : isTimestamp ? 99 : isForeignKey ? 50 : index + 10,
    };
  });

  const displayFields = allFields
    .filter(f => !f.isId && !f.isTimestamp)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .slice(0, 8);

  const editableFields = allFields
    .filter(f => !f.isId && !f.isTimestamp && !f.isComputed)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const nameField = allFields.find(f => f.isName) || allFields.find(f => !f.isId && !f.isTimestamp && f.type === 'text') || null;
  const statusField = allFields.find(f => f.isStatus) || null;
  const foreignKeyFields = allFields.filter(f => f.isForeignKey);

  const searchableFields = allFields.filter(f =>
    !f.isId && !f.isTimestamp && !f.isForeignKey &&
    (f.type === 'text' || f.type === 'varchar' || f.isName || f.semantic?.inputType === 'email')
  );

  const sortableFields = allFields.filter(f =>
    !f.isId && !f.isTimestamp && !f.isForeignKey &&
    (f.isName || f.isStatus || f.type === 'integer' || f.type === 'number' || f.semantic?.inputType === 'date' || f.semantic?.inputType === 'currency')
  );

  return {
    entityName: entity.name,
    allFields,
    displayFields,
    editableFields,
    nameField,
    statusField,
    foreignKeyFields,
    searchableFields,
    sortableFields,
  };
}

export function generateFormFieldJSX(field: ResolvedField, statePrefix: string = 'form'): string {
  const stateVar = `${statePrefix}${field.name.charAt(0).toUpperCase() + field.name.slice(1)}`;
  const setter = `set${statePrefix.charAt(0).toUpperCase() + statePrefix.slice(1)}${field.name.charAt(0).toUpperCase() + field.name.slice(1)}`;
  const kebab = toKebab(field.name);
  const title = toTitle(field.name);

  if (field.isEnum && field.enumValues) {
    const options = field.enumValues.map(v => `                  <SelectItem value="${v}">${toTitle(v)}</SelectItem>`).join('\n');
    return `              <div className="space-y-2">
                <Label htmlFor="${field.name}">${title}</Label>
                <Select value={${stateVar}} onValueChange={(val) => ${setter}(val)}>
                  <SelectTrigger data-testid="input-${kebab}">
                    <SelectValue placeholder="Select ${title}..." />
                  </SelectTrigger>
                  <SelectContent>
${options}
                  </SelectContent>
                </Select>
              </div>`;
  }

  if (field.type === 'boolean') {
    return `              <div className="flex items-center gap-2">
                <input id="${field.name}" type="checkbox" checked={${stateVar}} onChange={(e) => ${setter}(e.target.checked)} className="rounded border-input" data-testid="input-${kebab}" />
                <Label htmlFor="${field.name}">${title}</Label>
              </div>`;
  }

  const sem = field.semantic?.inputType;

  if (sem === 'currency') {
    return `              <div className="space-y-2">
                <Label htmlFor="${field.name}">${title}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input id="${field.name}" type="number" step="0.01" min="0" placeholder="0.00" className="pl-7" value={${stateVar}} onChange={(e) => ${setter}(Number(e.target.value))} data-testid="input-${kebab}" />
                </div>
              </div>`;
  }

  if (sem === 'percentage') {
    return `              <div className="space-y-2">
                <Label htmlFor="${field.name}">${title}</Label>
                <div className="relative">
                  <Input id="${field.name}" type="number" step="0.1" min="0" max="100" placeholder="0" className="pr-8" value={${stateVar}} onChange={(e) => ${setter}(Number(e.target.value))} data-testid="input-${kebab}" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                </div>
              </div>`;
  }

  if (sem === 'email') {
    return `              <div className="space-y-2">
                <Label htmlFor="${field.name}">${title}</Label>
                <Input id="${field.name}" type="email" placeholder="${field.semantic?.placeholder || 'name@example.com'}" value={${stateVar}} onChange={(e) => ${setter}(e.target.value)} data-testid="input-${kebab}" />
              </div>`;
  }

  if (sem === 'tel') {
    return `              <div className="space-y-2">
                <Label htmlFor="${field.name}">${title}</Label>
                <Input id="${field.name}" type="tel" placeholder="${field.semantic?.placeholder || '+1 (555) 000-0000'}" value={${stateVar}} onChange={(e) => ${setter}(e.target.value)} data-testid="input-${kebab}" />
              </div>`;
  }

  if (sem === 'url') {
    return `              <div className="space-y-2">
                <Label htmlFor="${field.name}">${title}</Label>
                <Input id="${field.name}" type="url" placeholder="${field.semantic?.placeholder || 'https://example.com'}" value={${stateVar}} onChange={(e) => ${setter}(e.target.value)} data-testid="input-${kebab}" />
              </div>`;
  }

  if (sem === 'date') {
    return `              <div className="space-y-2">
                <Label htmlFor="${field.name}">${title}</Label>
                <Input id="${field.name}" type="date" value={${stateVar}} onChange={(e) => ${setter}(e.target.value)} data-testid="input-${kebab}" />
              </div>`;
  }

  if (sem === 'datetime') {
    return `              <div className="space-y-2">
                <Label htmlFor="${field.name}">${title}</Label>
                <Input id="${field.name}" type="datetime-local" value={${stateVar}} onChange={(e) => ${setter}(e.target.value)} data-testid="input-${kebab}" />
              </div>`;
  }

  if (sem === 'textarea') {
    return `              <div className="space-y-2">
                <Label htmlFor="${field.name}">${title}</Label>
                <Textarea id="${field.name}" placeholder="${field.semantic?.placeholder || `Enter ${title.toLowerCase()}...`}" rows={3} value={${stateVar}} onChange={(e) => ${setter}(e.target.value)} data-testid="input-${kebab}" />
              </div>`;
  }

  if (sem === 'color') {
    return `              <div className="space-y-2">
                <Label htmlFor="${field.name}">${title}</Label>
                <Input id="${field.name}" type="color" value={${stateVar}} onChange={(e) => ${setter}(e.target.value)} className="h-9 w-20" data-testid="input-${kebab}" />
              </div>`;
  }

  if (sem === 'rating') {
    return `              <div className="space-y-2">
                <Label htmlFor="${field.name}">${title}</Label>
                <Input id="${field.name}" type="number" min="0" max="5" step="0.5" placeholder="0-5" value={${stateVar}} onChange={(e) => ${setter}(Number(e.target.value))} data-testid="input-${kebab}" />
              </div>`;
  }

  if (isNumericType(field.type)) {
    return `              <div className="space-y-2">
                <Label htmlFor="${field.name}">${title}</Label>
                <Input id="${field.name}" type="number" value={${stateVar}} onChange={(e) => ${setter}(Number(e.target.value))} data-testid="input-${kebab}" />
              </div>`;
  }

  if (sem === 'password') {
    return `              <div className="space-y-2">
                <Label htmlFor="${field.name}">${title}</Label>
                <Input id="${field.name}" type="password" placeholder="Enter password" value={${stateVar}} onChange={(e) => ${setter}(e.target.value)} data-testid="input-${kebab}" />
              </div>`;
  }

  return `              <div className="space-y-2">
                <Label htmlFor="${field.name}">${title}</Label>
                <Input id="${field.name}" placeholder="Enter ${title.toLowerCase()}" value={${stateVar}} onChange={(e) => ${setter}(e.target.value)} data-testid="input-${kebab}" />
              </div>`;
}

export function generateDisplayFieldJSX(field: ResolvedField, accessor: string = 'item'): string {
  const kebab = toKebab(field.name);
  const title = toTitle(field.name);

  if (field.isStatus) {
    return `<StatusBadge status={${accessor}?.${field.name} ?? ""} data-testid="text-${kebab}" />`;
  }

  const sem = field.semantic?.inputType;

  if (sem === 'currency') return `{formatCurrency(${accessor}?.${field.name})}`;
  if (sem === 'percentage') return `{formatPercent(${accessor}?.${field.name})}`;
  if (sem === 'date') return `{formatDate(${accessor}?.${field.name})}`;
  if (sem === 'datetime') return `{formatDateTime(${accessor}?.${field.name})}`;
  if (sem === 'email') return `{${accessor}?.${field.name} ? <a href={\`mailto:\${${accessor}.${field.name}}\`} className="text-primary hover:underline">{${accessor}.${field.name}}</a> : '—'}`;
  if (sem === 'tel') return `{${accessor}?.${field.name} ? <a href={\`tel:\${${accessor}.${field.name}}\`} className="text-primary hover:underline">{${accessor}.${field.name}}</a> : '—'}`;
  if (sem === 'url') return `{${accessor}?.${field.name} ? <a href={${accessor}.${field.name}} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{${accessor}.${field.name}}</a> : '—'}`;
  if (sem === 'checkbox' || field.type === 'boolean') return `{${accessor}?.${field.name} ? 'Yes' : 'No'}`;
  if (sem === 'rating') return `{${accessor}?.${field.name} != null ? \`\${${accessor}.${field.name}} / 5\` : '—'}`;

  return `{safeGet(${accessor}, "${field.name}")}`;
}

export function generateTableCellJSX(field: ResolvedField, accessor: string = 'item'): string {
  const display = generateDisplayFieldJSX(field, accessor);

  if (field.isStatus) {
    return `                  <td className="p-3">${display}</td>`;
  }

  if (field.isName) {
    return `                  <td className="p-3 text-sm font-medium">${display}</td>`;
  }

  return `                  <td className="p-3 text-sm">${display}</td>`;
}

export function getStateInitializer(field: ResolvedField): string {
  if (isNumericType(field.type) || field.semantic?.inputType === 'currency' || field.semantic?.inputType === 'percentage' || field.semantic?.inputType === 'rating') return '0';
  if (field.type === 'boolean') return 'false';
  return '""';
}

export function generateStateDeclarations(fields: ResolvedField[], prefix: string = 'form'): string {
  return fields.map(f => {
    const varName = `${prefix}${f.name.charAt(0).toUpperCase() + f.name.slice(1)}`;
    const setter = `set${prefix.charAt(0).toUpperCase() + prefix.slice(1)}${f.name.charAt(0).toUpperCase() + f.name.slice(1)}`;
    return `  const [${varName}, ${setter}] = useState<${getTypeScriptType(f)}>(${getStateInitializer(f)});`;
  }).join('\n');
}

export function generateResetStatements(fields: ResolvedField[], prefix: string = 'form'): string {
  return fields.map(f => {
    const setter = `set${prefix.charAt(0).toUpperCase() + prefix.slice(1)}${f.name.charAt(0).toUpperCase() + f.name.slice(1)}`;
    return `      ${setter}(${getStateInitializer(f)});`;
  }).join('\n');
}

export function generateFormBody(fields: ResolvedField[], prefix: string = 'form'): string {
  return fields.map(f => {
    const varName = `${prefix}${f.name.charAt(0).toUpperCase() + f.name.slice(1)}`;
    return `      ${f.name}: ${varName},`;
  }).join('\n');
}

export function getImportsNeededForFields(fields: ResolvedField[]): { needsTextarea: boolean; needsSelect: boolean; needsStatusBadge: boolean; needsFormatUtils: boolean } {
  return {
    needsTextarea: fields.some(f => f.semantic?.inputType === 'textarea'),
    needsSelect: fields.some(f => f.isEnum || f.semantic?.inputType === 'select'),
    needsStatusBadge: fields.some(f => f.isStatus),
    needsFormatUtils: fields.some(f => ['currency', 'percentage', 'date', 'datetime'].includes(f.semantic?.inputType || '')),
  };
}

function isNumericType(type: string): boolean {
  return ['integer', 'number', 'real', 'float', 'double', 'decimal'].some(t => type.includes(t));
}

function getTypeScriptType(field: ResolvedField): string {
  if (field.type === 'boolean') return 'boolean';
  if (isNumericType(field.type) || field.semantic?.inputType === 'currency' || field.semantic?.inputType === 'percentage') return 'number';
  return 'string';
}

function toKebab(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '').replace(/[\s_]+/g, '-');
}

function toTitle(str: string): string {
  return str.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
}