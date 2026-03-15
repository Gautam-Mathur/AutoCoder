import type { ProjectPlan, PlannedPage, PlannedEntity, PlannedEndpoint } from './plan-generator.js';
import type { ReasoningResult, UIPattern, FieldSemantics } from './contextual-reasoning-engine.js';
import {
  resolveEntityFields,
  generateFormFieldJSX,
  generateDisplayFieldJSX,
  generateTableCellJSX,
  generateStateDeclarations,
  generateResetStatements,
  generateFormBody,
  getImportsNeededForFields,
  type EntityFieldMap,
  type ResolvedField,
} from './codegen-field-resolver.js';

interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

interface PageImports {
  react: string[];
  tanstackQuery: string[];
  components: string[];
  lucideIcons: string[];
  hooks: string[];
  lib: string[];
  custom: string[];
}

function toKebab(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '').replace(/[\s_]+/g, '-');
}

function toTitle(str: string): string {
  return str.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
}

function toCamel(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function dedupe(arr: string[]): string[] {
  return arr.filter((v, i, a) => a.indexOf(v) === i);
}

function buildImportBlock(imports: PageImports): string {
  const lines: string[] = [];
  const reactItems = dedupe(imports.react);
  if (reactItems.length > 0) {
    lines.push(`import { ${reactItems.join(', ')} } from "react";`);
  }
  const tqItems = dedupe(imports.tanstackQuery);
  if (tqItems.length > 0) {
    lines.push(`import { ${tqItems.join(', ')} } from "@tanstack/react-query";`);
  }
  if (imports.lib.length > 0) {
    const qcImports = dedupe(imports.lib.filter(l => ['queryClient', 'apiRequest'].includes(l)));
    const utilImports = dedupe(imports.lib.filter(l => !['queryClient', 'apiRequest'].includes(l)));
    if (qcImports.length > 0) {
      lines.push(`import { ${qcImports.join(', ')} } from "@/lib/queryClient";`);
    }
    if (utilImports.length > 0) {
      lines.push(`import { ${utilImports.join(', ')} } from "@/lib/utils";`);
    }
  }
  for (const comp of dedupe(imports.components)) {
    lines.push(comp);
  }
  const icons = dedupe(imports.lucideIcons);
  if (icons.length > 0) {
    lines.push(`import { ${icons.join(', ')} } from "lucide-react";`);
  }
  for (const hook of dedupe(imports.hooks)) {
    lines.push(hook);
  }
  for (const custom of dedupe(imports.custom)) {
    lines.push(custom);
  }
  return lines.join('\n');
}

function makeImports(): PageImports {
  return { react: [], tanstackQuery: [], components: [], lucideIcons: [], hooks: [], lib: [], custom: [] };
}

function ensureWouterImport(imports: PageImports) {
  if (!imports.custom.some(c => c.includes('wouter'))) {
    imports.custom.push('import { useLocation } from "wouter";');
  }
}

export function generateListPage(
  page: PlannedPage,
  plan: ProjectPlan,
  reasoning: ReasoningResult | null,
  uiPattern: UIPattern | undefined
): string {
  const entityName = page.dataNeeded[0] || plan.dataModel[0]?.name || 'Item';
  const entity = plan.dataModel.find(e => e.name === entityName);
  if (!entity) return generateFallbackPage(page);

  const fieldMap = resolveEntityFields(entity, reasoning);
  const endpoint = `/api/${toKebab(entityName)}s`;
  const detailPath = `/${toKebab(entityName)}s`;
  const imports = makeImports();

  imports.react.push('useState', 'useMemo');
  imports.tanstackQuery.push('useQuery', 'useMutation');
  imports.lib.push('queryClient', 'apiRequest');
  imports.components.push('import { Button } from "@/components/ui/button";');
  imports.components.push('import { Input } from "@/components/ui/input";');
  imports.components.push('import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";');
  imports.components.push('import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";');
  imports.components.push('import { Label } from "@/components/ui/label";');
  imports.hooks.push('import { useToast } from "@/hooks/use-toast";');
  imports.custom.push('import DataTable, { type ColumnDef } from "@/components/data-table";');
  imports.custom.push('import SearchBar from "@/components/search-bar";');
  imports.lucideIcons.push('Plus', 'Trash2', 'AlertCircle', 'RefreshCcw');
  imports.lib.push('safeGet');

  const fieldImports = getImportsNeededForFields(fieldMap.editableFields.concat(fieldMap.displayFields));
  if (fieldImports.needsTextarea) imports.components.push('import { Textarea } from "@/components/ui/textarea";');
  if (fieldImports.needsSelect || fieldMap.statusField) imports.components.push('import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from "@/components/ui/select";');
  if (fieldImports.needsStatusBadge || fieldMap.displayFields.some(f => f.name === 'status')) {
    imports.custom.push('import StatusBadge from "@/components/status-badge";');
    if (!imports.components.some(c => c.includes('ui/badge'))) {
      imports.components.push('import { Badge } from "@/components/ui/badge";');
    }
  }
  if (fieldImports.needsFormatUtils) {
    imports.lib.push('formatCurrency', 'formatPercent', 'formatDate', 'formatDateTime');
  }

  const isKanban = uiPattern?.pattern === 'kanban';
  const isCalendar = uiPattern?.pattern === 'calendar';
  const isCardGrid = uiPattern?.pattern === 'card-grid';
  const hasPatternView = isKanban || isCalendar || isCardGrid;

  if (hasPatternView) imports.lucideIcons.push('List');
  if (isKanban) {
    imports.custom.push('import { Badge } from "@/components/ui/badge";');
    imports.lucideIcons.push('Columns3');
  }
  if (isCalendar) {
    imports.lucideIcons.push('ChevronLeft', 'ChevronRight', 'CalendarDays');
  }
  if (isCardGrid) {
    imports.lucideIcons.push('LayoutGrid');
  }

  const columnDefs = fieldMap.displayFields.map(f => {
    const renderExpr = generateColumnRenderExpr(f);
    if (renderExpr) {
      return `    { key: "${f.name}", header: "${toTitle(f.name)}", render: (item: any) => ${renderExpr} }`;
    }
    return `    { key: "${f.name}", header: "${toTitle(f.name)}" }`;
  }).join(',\n');

  const formStates = generateStateDeclarations(fieldMap.editableFields, 'form');
  const resetFormFields = generateResetStatements(fieldMap.editableFields, 'form');
  const formBody = generateFormBody(fieldMap.editableFields, 'form');
  const dialogFields = fieldMap.editableFields.map(f => generateFormFieldJSX(f, 'form')).join('\n');

  const statusFilterBlock = fieldMap.statusField ? generateStatusFilter(fieldMap.statusField) : '';
  const filterLogicBlock = generateFilterLogic(fieldMap);

  let patternState = '';
  let patternViewJSX = '';
  let viewToggleJSX = '';

  if (hasPatternView) {
    patternState = `  const [viewMode, setViewMode] = useState<'pattern' | 'table'>('pattern');\n`;
    imports.react.push('useState');
    if (isCalendar) {
      const dateField = (uiPattern?.config?.dateField as string) || 'date';
      const titleField = (uiPattern?.config?.titleField as string) || fieldMap.nameField?.name || 'name';
      patternState += generateCalendarState(dateField);
      patternViewJSX = generateCalendarView(dateField, titleField, detailPath);
    } else if (isKanban) {
      const columns = (uiPattern?.config?.columns as string[]) || ['To Do', 'In Progress', 'Done'];
      const cardTitle = (uiPattern?.config?.cardTitle as string) || fieldMap.nameField?.name || 'name';
      const cardSubtitle = (uiPattern?.config?.cardSubtitle as string) || '';
      patternViewJSX = generateKanbanView(columns, cardTitle, cardSubtitle, detailPath);
    } else if (isCardGrid) {
      const imageField = (uiPattern?.config?.imageField as string) || '';
      const titleField = (uiPattern?.config?.titleField as string) || fieldMap.nameField?.name || 'name';
      const subtitleField = (uiPattern?.config?.subtitleField as string) || '';
      patternViewJSX = generateCardGridView(imageField, titleField, subtitleField, !!fieldMap.statusField, detailPath, entityName);
    }

    const patternIconMap: Record<string, [string, string]> = {
      kanban: ['<Columns3 className="h-4 w-4 mr-1" />', 'Board'],
      calendar: ['<CalendarDays className="h-4 w-4 mr-1" />', 'Calendar'],
      'card-grid': ['<LayoutGrid className="h-4 w-4 mr-1" />', 'Grid'],
    };
    const [pIcon, pLabel] = patternIconMap[uiPattern!.pattern] || ['', 'View'];
    viewToggleJSX = `
        <div className="flex gap-1">
          <Button variant={viewMode === 'pattern' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('pattern')} data-testid="button-view-pattern">
            ${pIcon} ${pLabel}
          </Button>
          <Button variant={viewMode === 'table' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('table')} data-testid="button-view-table">
            <List className="h-4 w-4 mr-1" /> Table
          </Button>
        </div>`;
  }

  const tableViewJSX = `      <DataTable
        data={filtered}
        columns={tableColumns}
        isLoading={isLoading}
        emptyMessage={search ? "No results found." : "No ${entityName.toLowerCase()}s yet. Click 'Add ${entityName}' to create one."}
        onRowClick={(item: any) => navigate(\`${detailPath}/\${item.id}\`)}
        rowTestId={(item: any) => \`row-${toKebab(entityName)}-\${item.id}\`}
        actions={(item: any) => (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteId(item.id)}
            data-testid={\`button-delete-\${item.id}\`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      />`;

  if (!imports.custom.some(c => c.includes('wouter'))) {
    imports.custom.push('import { useLocation } from "wouter";');
  }

  imports.custom.push('import ConfirmDialog from "@/components/confirm-dialog";');

  let viewContentJSX: string;
  if (hasPatternView) {
    viewContentJSX = `      {viewMode === 'pattern' ? (
        <>
${patternViewJSX}
        </>
      ) : (
        <>
${tableViewJSX}
        </>
      )}`;
  } else {
    viewContentJSX = tableViewJSX;
  }

  return `${buildImportBlock(imports)}

export default function ${page.componentName}() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  ${fieldMap.statusField ? `  const [statusFilter, setStatusFilter] = useState("all");\n  ` : ''}const { toast } = useToast();
  const [, navigate] = useLocation();
${patternState}${formStates}

  const { data: items = [], isLoading, isError, refetch } = useQuery<any[]>({ queryKey: ["${endpoint}"] });

  const tableColumns: ColumnDef[] = useMemo(() => [
${columnDefs}
  ], []);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "${endpoint}", data);
      return res.json();
    },
    onMutate: async (newData: any) => {
      await queryClient.cancelQueries({ queryKey: ["${endpoint}"] });
      const previous = queryClient.getQueryData<any[]>(["${endpoint}"]);
      queryClient.setQueryData<any[]>(["${endpoint}"], (old) => [
        ...(old ?? []),
        { id: Date.now(), ...newData },
      ]);
      return { previous };
    },
    onError: (_err: Error, _vars: any, context: any) => {
      if (context?.previous) queryClient.setQueryData(["${endpoint}"], context.previous);
      toast({ title: "Error", description: _err.message, variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["${endpoint}"] });
      setShowCreate(false);
${resetFormFields}
      toast({ title: "${entityName} created", description: "The ${entityName.toLowerCase()} has been created successfully." });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", \`${endpoint}/\${id}\`);
    },
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ["${endpoint}"] });
      const previous = queryClient.getQueryData<any[]>(["${endpoint}"]);
      queryClient.setQueryData<any[]>(["${endpoint}"], (old) =>
        (old ?? []).filter((item: any) => item.id !== id)
      );
      return { previous };
    },
    onError: (_err: Error, _id: number, context: any) => {
      if (context?.previous) queryClient.setQueryData(["${endpoint}"], context.previous);
      toast({ title: "Error", description: _err.message, variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["${endpoint}"] });
      setDeleteId(null);
      toast({ title: "${entityName} deleted" });
    },
  });

${filterLogicBlock}

  const handleCreate = () => {
    createMutation.mutate({
${formBody}
    });
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">Failed to load ${entityName.toLowerCase()}s</h3>
          <p className="text-sm text-muted-foreground">There was an error fetching the data. Please try again.</p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCcw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-4" data-testid="page-${toKebab(entityName)}-list">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">${page.name}</h1>
          <p className="text-sm text-muted-foreground">${page.description}</p>
        </div>
        <div className="flex items-center gap-2">${viewToggleJSX}
          <Button onClick={() => setShowCreate(true)} data-testid="button-add-${toKebab(entityName)}">
            <Plus className="h-4 w-4 mr-2" />
            Add ${entityName}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search ${entityName.toLowerCase()}s..."
          data-testid="input-search"
        />${statusFilterBlock}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-40 animate-pulse bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 border-2 border-dashed rounded-lg bg-muted/30">
          <div className="rounded-full bg-muted p-6">
            <Plus className="h-12 w-12 text-muted-foreground" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">No ${entityName.toLowerCase()}s found</h3>
            <p className="text-sm text-muted-foreground">
              {search ? "Try adjusting your search or filters." : "Get started by creating your first ${entityName.toLowerCase()}."}
            </p>
          </div>
          {!search && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add ${entityName}
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
${viewContentJSX}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create ${entityName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
${dialogFields}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} data-testid="button-cancel-create">Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-submit-create">
              {createMutation.isPending ? "Creating..." : "Create ${entityName}"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete ${entityName}?"
        description="This action cannot be undone. This will permanently delete this ${entityName.toLowerCase()}."
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId); }}
      />
    </div>
  );
}
`;
}

export function generateDetailPage(
  page: PlannedPage,
  plan: ProjectPlan,
  reasoning: ReasoningResult | null
): string {
  const entityName = page.dataNeeded[0] || plan.dataModel[0]?.name || 'Item';
  const entity = plan.dataModel.find(e => e.name === entityName);
  if (!entity) return generateFallbackPage(page);

  const fieldMap = resolveEntityFields(entity, reasoning);
  const endpoint = `/api/${toKebab(entityName)}s`;
  const listPath = page.path.split('/:')[0];

  const imports = makeImports();
  ensureWouterImport(imports);
  imports.react.push('useState');
  imports.tanstackQuery.push('useQuery', 'useMutation');
  imports.lib.push('queryClient', 'apiRequest', 'safeGet');
  imports.components.push('import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";');
  imports.components.push('import { Button } from "@/components/ui/button";');
  imports.lucideIcons.push('ArrowLeft', 'Trash2', 'Edit', 'AlertCircle', 'RefreshCcw', 'Plus');
  imports.hooks.push('import { useToast } from "@/hooks/use-toast";');
  imports.custom.push('import { useRoute, Link, useLocation } from "wouter";');
  imports.custom.push('import ConfirmDialog from "@/components/confirm-dialog";');

  const fieldImports = getImportsNeededForFields(fieldMap.displayFields);
  if (fieldImports.needsStatusBadge || fieldMap.displayFields.some(f => f.name === 'status')) {
    imports.custom.push('import StatusBadge from "@/components/status-badge";');
    if (!imports.components.some(c => c.includes('ui/badge'))) {
      imports.components.push('import { Badge } from "@/components/ui/badge";');
    }
  }
  if (fieldImports.needsFormatUtils) imports.lib.push('formatCurrency', 'formatPercent', 'formatDate', 'formatDateTime');

  const childRelationships = reasoning?.relationships?.filter(r =>
    r.to === entityName && (r.cardinality === '1:N' || r.cardinality === 'N:1')
  ) || [];

  const relatedSections = childRelationships.map(rel => {
    const childEntity = plan.dataModel.find(e => e.name === rel.from);
    if (!childEntity) return null;
    return generateRelatedSection(rel, childEntity, entityName, reasoning, imports);
  }).filter(Boolean);

  const parentRelationships = reasoning?.relationships?.filter(r =>
    r.from === entityName && (r.cardinality === 'N:1' || r.cardinality === '1:1')
  ) || [];

  const parentLinks = parentRelationships.map(rel => {
    const parentPage = plan.pages.find(p => p.dataNeeded?.includes(rel.to));
    const parentPath = parentPage?.path?.split('/:')[0] || `/${toKebab(rel.to)}s`;
    const foreignKey = rel.fromField || `${toCamel(rel.to)}Id`;
    return `            {item?.${foreignKey} && <Link href={\`${parentPath}/\${item.${foreignKey}}\`}><Button variant="ghost" size="sm"><ArrowLeft className="h-3 w-3 mr-1" /> View ${toTitle(rel.to)}</Button></Link>}`;
  }).filter(Boolean);

  const fieldRows = fieldMap.displayFields.map(f => {
    const display = generateDisplayFieldJSX(f, 'item');
    return `              <div>
                <dt className="text-sm text-muted-foreground">${toTitle(f.name)}</dt>
                <dd className="text-sm font-medium mt-1" data-testid="text-${toKebab(f.name)}">${display}</dd>
              </div>`;
  }).join('\n');

  const computedFields = reasoning?.computedFields?.filter(cf => cf.entityName === entityName && cf.displayInDetail) || [];
  const computedFieldRows = computedFields.map(cf => {
    return `              <div>
                <dt className="text-sm text-muted-foreground">${toTitle(cf.fieldName)} <span className="text-xs text-primary">(computed)</span></dt>
                <dd className="text-sm font-medium mt-1" data-testid="text-${toKebab(cf.fieldName)}">{${cf.expression.replace(/\bthis\./g, 'item?.')}}</dd>
              </div>`;
  }).join('\n');

  if (relatedSections.length > 0) imports.lucideIcons.push('Plus');

  const additionalQueries = relatedSections.map((s: any) => s.queryDecl).join('\n');
  const relatedContent = relatedSections.map((s: any) => s.section).join('\n');

  return `${buildImportBlock(imports)}

export default function ${page.componentName}() {
  const [, params] = useRoute("${page.path}");
  const id = params?.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: item, isLoading, isError, refetch } = useQuery<any>({
    queryKey: ["${endpoint}", id],
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", \`${endpoint}/\${id}\`);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["${endpoint}"] });
      const previous = queryClient.getQueryData<any[]>(["${endpoint}"]);
      queryClient.setQueryData<any[]>(["${endpoint}"], (old) =>
        (old ?? []).filter((item: any) => item.id !== Number(id))
      );
      return { previous };
    },
    onError: (_err: Error, _vars: any, context: any) => {
      if (context?.previous) queryClient.setQueryData(["${endpoint}"], context.previous);
      toast({ title: "Error", description: _err.message, variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["${endpoint}"] });
      toast({ title: "${entityName} deleted" });
      navigate("${listPath}");
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-md bg-muted animate-pulse" />
          <div className="h-8 w-64 bg-muted animate-pulse rounded-md" />
        </div>
        <Card>
          <CardHeader>
            <div className="h-6 w-32 bg-muted animate-pulse rounded-md" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded-md" />
                  <div className="h-5 w-full bg-muted animate-pulse rounded-md" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">Failed to load ${entityName.toLowerCase()}</h3>
          <p className="text-sm text-muted-foreground">There was an error fetching the details. Please try again.</p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCcw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-4" data-testid="text-not-found">
        <Link href="${listPath}">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to list
          </Button>
        </Link>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 border-2 border-dashed rounded-lg bg-muted/30">
          <div className="rounded-full bg-muted p-6">
            <Plus className="h-12 w-12 text-muted-foreground" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">${entityName} not found</h3>
            <p className="text-sm text-muted-foreground">The ${entityName.toLowerCase()} you are looking for does not exist or has been deleted.</p>
          </div>
          <Link href="${listPath}">
            <Button variant="outline">Back to list</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6" data-testid="page-${toKebab(entityName)}-detail">
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="${listPath}">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold flex-1" data-testid="text-page-title">
          {item?.${fieldMap.nameField?.name || 'id'} || "${entityName} Details"}
        </h1>
        <div className="flex items-center gap-2">
${parentLinks.length > 0 ? parentLinks.join('\n') + '\n' : ''}          <Button
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
            data-testid="button-delete-${toKebab(entityName)}"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
${fieldRows}
${computedFieldRows ? computedFieldRows + '\n' : ''}          </dl>
        </CardContent>
      </Card>
${relatedContent}

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete ${entityName}?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
`;
}

export function generateDashboardPage(
  page: PlannedPage,
  plan: ProjectPlan,
  reasoning: ReasoningResult | null
): string {
  const imports = makeImports();
  ensureWouterImport(imports);
  imports.tanstackQuery.push('useQuery');
  imports.components.push('import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";');
  imports.custom.push('import KpiCard from "@/components/kpi-card";');
  imports.custom.push('import { KpiSkeleton } from "@/components/loading-skeleton";');
  imports.lib.push('formatNumber', 'formatCurrency', 'safeGet');

  const kpiEntities = plan.dataModel.slice(0, 4);
  const kpiIcons = ['Package', 'Users', 'Activity', 'TrendingUp'];
  imports.lucideIcons.push(...kpiIcons.slice(0, kpiEntities.length));

  const entityQueries = kpiEntities.map((e, i) => {
    const endpoint = `/api/${toKebab(e.name)}s`;
    const varName = `${toCamel(e.name)}s`;
    return `  const { data: ${varName} = [], isLoading: loading${e.name} } = useQuery<any[]>({ queryKey: ["${endpoint}"] });`;
  }).join('\n');

  const isLoadingCheck = kpiEntities.map(e => `loading${e.name}`).join(' || ');

  const kpiCards = kpiEntities.map((e, i) => {
    const varName = `${toCamel(e.name)}s`;
    const hasStatus = e.fields.some(f => f.name === 'status');
    const hasCurrency = e.fields.some(f => {
      const sem = reasoning?.fieldSemantics?.get(e.name)?.find(s => s.fieldName === f.name);
      return sem?.inputType === 'currency';
    });
    const currencyField = hasCurrency ? e.fields.find(f => {
      const sem = reasoning?.fieldSemantics?.get(e.name)?.find(s => s.fieldName === f.name);
      return sem?.inputType === 'currency';
    }) : null;

    let valueExpr: string;
    let kpiTitle: string;
    if (currencyField) {
      valueExpr = `formatCurrency(${varName}.reduce((sum: number, item: any) => sum + (Number(item.${currencyField.name}) || 0), 0))`;
      kpiTitle = `Total ${toTitle(currencyField.name)}`;
    } else if (hasStatus) {
      valueExpr = `formatNumber(${varName}.filter((item: any) => item.status === "active" || item.status === "in_progress" || item.status === "open").length) + " / " + formatNumber(${varName}.length)`;
      kpiTitle = `Active ${toTitle(e.name)}s`;
    } else {
      valueExpr = `formatNumber(${varName}.length)`;
      kpiTitle = `Total ${toTitle(e.name)}s`;
    }

    return `          <KpiCard
            title="${kpiTitle}"
            value={${valueExpr}}
            icon={<${kpiIcons[i]} className="h-5 w-5" />}
            data-testid="kpi-${toKebab(e.name)}"
          />`;
  }).join('\n');

  const recentEntityName = plan.dataModel[0]?.name || 'Item';
  const recentEntity = plan.dataModel[0];
  const recentVarName = `${toCamel(recentEntityName)}s`;
  const recentNameField = recentEntity?.fields.find(f =>
    ['name', 'title', 'firstName', 'companyName', 'subject', 'headline'].includes(f.name)
  )?.name || 'id';

  const statusEntity = plan.dataModel.find(e => e.fields.some(f => f.name === 'status'));
  const statusVarName = statusEntity ? `${toCamel(statusEntity.name)}s` : null;
  const statusEnumValues = statusEntity?.fields.find(f => f.name === 'status');
  const defaultStatuses = statusEnumValues?.type?.includes('enum')
    ? (reasoning?.fieldSemantics?.get(statusEntity!.name)?.find(s => s.fieldName === 'status')?.enumValues || ['active', 'pending', 'completed'])
    : ['active', 'pending', 'completed'];

  const secondEntity = plan.dataModel.length > 1 ? plan.dataModel[1] : null;
  const secondVarName = secondEntity ? `${toCamel(secondEntity.name)}s` : null;
  const secondNameField = secondEntity?.fields.find(f =>
    ['name', 'title', 'firstName', 'companyName', 'subject', 'headline'].includes(f.name)
  )?.name || 'id';

  const statusBreakdownJSX = statusEntity && statusVarName ? `
      <Card>
        <CardHeader>
          <CardTitle>${toTitle(statusEntity.name)} Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-${Math.min(defaultStatuses.length, 4)} gap-3">
            {[${defaultStatuses.map(s => `"${s}"`).join(', ')}].map((status) => {
              const count = ${statusVarName}.filter((item: any) => item.status === status).length;
              return (
                <div key={status} className="p-3 rounded-lg border text-center" data-testid={\`status-count-\${status}\`}>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground capitalize">{status.replace(/_/g, ' ')}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>` : '';

  const secondRecentJSX = secondEntity && secondVarName ? `
      <Card>
        <CardHeader>
          <CardTitle>Recent ${toTitle(secondEntity.name)}s</CardTitle>
        </CardHeader>
        <CardContent>
          {${secondVarName}.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ${secondEntity.name.toLowerCase()}s yet.</p>
          ) : (
            <div className="space-y-2">
              {${secondVarName}.slice(0, 5).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-md border" data-testid={\`recent-${toKebab(secondEntity.name)}-\${item.id}\`}>
                  <div>
                    <p className="text-sm font-medium">{safeGet(item, "${secondNameField}")}</p>
                    ${secondEntity.fields.some(f => f.name === 'status') ? `<p className="text-xs text-muted-foreground">{safeGet(item, "status")}</p>` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>` : '';

  return `${buildImportBlock(imports)}

export default function ${page.componentName}() {
${entityQueries}

  const isLoading = ${isLoadingCheck || 'false'};

  return (
    <div className="p-6 space-y-6" data-testid="page-dashboard">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">${page.name}</h1>
        <p className="text-sm text-muted-foreground">${page.description}</p>
      </div>

      {isLoading ? (
        <KpiSkeleton count={${kpiEntities.length}} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(kpiEntities.length, 4)} gap-4">
${kpiCards}
        </div>
      )}
${statusBreakdownJSX}

      <div className="grid grid-cols-1 ${secondEntity ? 'lg:grid-cols-2' : ''} gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent ${toTitle(recentEntityName)}s</CardTitle>
          </CardHeader>
          <CardContent>
            {${recentVarName}.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="text-no-recent">No ${recentEntityName.toLowerCase()}s yet.</p>
            ) : (
              <div className="space-y-2">
                {${recentVarName}.slice(0, 5).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-md border" data-testid={\`recent-${toKebab(recentEntityName)}-\${item.id}\`}>
                    <div>
                      <p className="text-sm font-medium">{safeGet(item, "${recentNameField}")}</p>
                      ${recentEntity?.fields.some(f => f.name === 'status') ? `<p className="text-xs text-muted-foreground">{safeGet(item, "status")}</p>` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
${secondRecentJSX}
      </div>
    </div>
  );
}
`;
}

export function generateGenericPage(page: PlannedPage): string {
  return `import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ${page.componentName}() {
  return (
    <div className="p-6 space-y-6" data-testid="page-${toKebab(page.componentName)}">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">${page.name}</h1>
        <p className="text-sm text-muted-foreground">${page.description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>${page.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground" data-testid="text-content">
            Content for ${page.name} will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
`;
}

export function generateKanbanPage(
  page: PlannedPage,
  plan: ProjectPlan,
  reasoning: ReasoningResult | null
): string {
  const entityName = page.dataNeeded[0] || plan.dataModel[0]?.name || 'Item';
  const entity = plan.dataModel.find(e => e.name === entityName);
  if (!entity) return generateFallbackPage(page);

  const fieldMap = resolveEntityFields(entity, reasoning);
  const endpoint = `/api/${toKebab(entityName)}s`;
  const detailPath = `/${toKebab(entityName)}s`;

  const statusField = fieldMap.statusField;
  const columns = statusField?.enumValues || ['To Do', 'In Progress', 'Done'];
  const cardTitle = fieldMap.nameField?.name || 'name';
  const cardSubtitle = fieldMap.displayFields.find(f => !f.isName && !f.isStatus && !f.isId)?.name || '';

  const imports = makeImports();
  imports.react.push('useState', 'useCallback');
  imports.tanstackQuery.push('useQuery', 'useMutation');
  imports.lib.push('queryClient', 'apiRequest');
  imports.components.push('import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";');
  imports.components.push('import { Button } from "@/components/ui/button";');
  imports.components.push('import { Badge } from "@/components/ui/badge";');
  imports.components.push('import { Input } from "@/components/ui/input";');
  imports.components.push('import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";');
  imports.components.push('import { Label } from "@/components/ui/label";');
  imports.hooks.push('import { useToast } from "@/hooks/use-toast";');
  imports.custom.push('import { useLocation } from "wouter";');
  imports.lucideIcons.push('Plus', 'Search', 'GripVertical');

  const fieldImports = getImportsNeededForFields(fieldMap.editableFields);
  if (fieldImports.needsTextarea) imports.components.push('import { Textarea } from "@/components/ui/textarea";');
  if (fieldImports.needsSelect) imports.components.push('import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from "@/components/ui/select";');

  const formStates = generateStateDeclarations(fieldMap.editableFields, 'form');
  const resetFormFields = generateResetStatements(fieldMap.editableFields, 'form');
  const formBody = generateFormBody(fieldMap.editableFields, 'form');
  const dialogFields = fieldMap.editableFields.map(f => generateFormFieldJSX(f, 'form')).join('\n');
  const columnsLiteral = JSON.stringify(columns);

  return `${buildImportBlock(imports)}

export default function ${page.componentName}() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [dragItem, setDragItem] = useState<any>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();
${formStates}

  const { data: items = [], isLoading } = useQuery<any[]>({ queryKey: ["${endpoint}"] });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "${endpoint}", data);
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["${endpoint}"] });
      setShowCreate(false);
${resetFormFields}
      toast({ title: "${entityName} created" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      await apiRequest("PATCH", \`${endpoint}/\${id}\`, data);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["${endpoint}"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filtered = items.filter((item: any) =>
    JSON.stringify(item).toLowerCase().includes(search.toLowerCase())
  );

  const columns: string[] = ${columnsLiteral};

  const handleDragStart = useCallback((item: any) => {
    setDragItem(item);
  }, []);

  const handleDrop = useCallback((column: string) => {
    if (dragItem && dragItem.status !== column) {
      updateMutation.mutate({ id: dragItem.id, data: { status: column } });
    }
    setDragItem(null);
  }, [dragItem, updateMutation]);

  const handleCreate = () => {
    createMutation.mutate({
${formBody}
    });
  };

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground" data-testid="text-loading">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-4" data-testid="page-${toKebab(entityName)}-kanban">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">${page.name}</h1>
          <p className="text-sm text-muted-foreground">${page.description}</p>
        </div>
        <Button onClick={() => setShowCreate(true)} data-testid="button-add-${toKebab(entityName)}">
          <Plus className="h-4 w-4 mr-2" />
          Add ${entityName}
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search ${entityName.toLowerCase()}s..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-testid="input-search"
        />
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => {
          const columnItems = filtered.filter((i: any) => i.status === column);
          return (
            <div
              key={column}
              className="flex-shrink-0 w-80 bg-muted/30 rounded-md p-3"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(column)}
              data-testid={\`kanban-column-\${column}\`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="font-semibold text-sm">{column}</h3>
                <Badge variant="secondary">{columnItems.length}</Badge>
              </div>
              <div className="space-y-2 min-h-[100px]">
                {columnItems.map((item: any) => (
                  <Card
                    key={item.id}
                    draggable
                    onDragStart={() => handleDragStart(item)}
                    className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                    onClick={() => navigate(\`${detailPath}/\${item.id}\`)}
                    data-testid={\`kanban-card-\${item.id}\`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{item.${cardTitle}}</p>${cardSubtitle ? `
                          <p className="text-xs text-muted-foreground mt-1 truncate">{item.${cardSubtitle}}</p>` : ''}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create ${entityName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
${dialogFields}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} data-testid="button-cancel-create">Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-submit-create">
              {createMutation.isPending ? "Creating..." : "Create ${entityName}"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
`;
}

export function generateCalendarPage(
  page: PlannedPage,
  plan: ProjectPlan,
  reasoning: ReasoningResult | null
): string {
  const entityName = page.dataNeeded[0] || plan.dataModel[0]?.name || 'Item';
  const entity = plan.dataModel.find(e => e.name === entityName);
  if (!entity) return generateFallbackPage(page);

  const fieldMap = resolveEntityFields(entity, reasoning);
  const endpoint = `/api/${toKebab(entityName)}s`;
  const detailPath = `/${toKebab(entityName)}s`;

  const dateField = fieldMap.allFields.find(f =>
    f.semantic?.inputType === 'date' || f.semantic?.inputType === 'datetime' ||
    f.name === 'date' || f.name === 'startDate' || f.name === 'scheduledAt' || f.name === 'eventDate' || f.name === 'dueDate'
  )?.name || 'date';
  const titleField = fieldMap.nameField?.name || 'name';

  const imports = makeImports();
  imports.react.push('useState', 'useMemo');
  imports.tanstackQuery.push('useQuery', 'useMutation');
  imports.lib.push('queryClient', 'apiRequest');
  imports.components.push('import { Card, CardContent } from "@/components/ui/card";');
  imports.components.push('import { Button } from "@/components/ui/button";');
  imports.components.push('import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";');
  imports.components.push('import { Label } from "@/components/ui/label";');
  imports.components.push('import { Input } from "@/components/ui/input";');
  imports.hooks.push('import { useToast } from "@/hooks/use-toast";');
  imports.custom.push('import { useLocation } from "wouter";');
  imports.lucideIcons.push('Plus', 'ChevronLeft', 'ChevronRight');

  const fieldImports = getImportsNeededForFields(fieldMap.editableFields);
  if (fieldImports.needsTextarea) imports.components.push('import { Textarea } from "@/components/ui/textarea";');
  if (fieldImports.needsSelect) imports.components.push('import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from "@/components/ui/select";');

  const formStates = generateStateDeclarations(fieldMap.editableFields, 'form');
  const resetFormFields = generateResetStatements(fieldMap.editableFields, 'form');
  const formBody = generateFormBody(fieldMap.editableFields, 'form');
  const dialogFields = fieldMap.editableFields.map(f => generateFormFieldJSX(f, 'form')).join('\n');

  return `${buildImportBlock(imports)}

export default function ${page.componentName}() {
  const [showCreate, setShowCreate] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();
${formStates}

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const { data: items = [], isLoading } = useQuery<any[]>({ queryKey: ["${endpoint}"] });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "${endpoint}", data);
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["${endpoint}"] });
      setShowCreate(false);
${resetFormFields}
      toast({ title: "${entityName} created" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const itemsByDate = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    for (const item of items) {
      const d = new Date(item.${dateField});
      if (isNaN(d.getTime())) continue;
      const key = \`\${d.getFullYear()}-\${d.getMonth()}-\${d.getDate()}\`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    }
    return grouped;
  }, [items]);

  const handleCreate = () => {
    createMutation.mutate({
${formBody}
    });
  };

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else { setCurrentMonth(currentMonth - 1); }
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else { setCurrentMonth(currentMonth + 1); }
  };

  return (
    <div className="p-6 space-y-4" data-testid="page-${toKebab(entityName)}-calendar">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">${page.name}</h1>
          <p className="text-sm text-muted-foreground">${page.description}</p>
        </div>
        <Button onClick={() => setShowCreate(true)} data-testid="button-add-${toKebab(entityName)}">
          <Plus className="h-4 w-4 mr-2" />
          Add ${entityName}
        </Button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground" data-testid="text-loading">Loading...</div>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Button variant="outline" size="icon" onClick={prevMonth} data-testid="button-prev-month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="font-semibold text-lg" data-testid="text-current-month">{monthNames[currentMonth]} {currentYear}</h3>
              <Button variant="outline" size="icon" onClick={nextMonth} data-testid="button-next-month">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-px bg-muted rounded-md overflow-hidden">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="bg-background p-2 text-center text-xs font-medium text-muted-foreground">{day}</div>
              ))}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={\`empty-\${i}\`} className="bg-background p-2 min-h-[100px]" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateKey = \`\${currentYear}-\${currentMonth}-\${day}\`;
                const dayItems = itemsByDate[dateKey] || [];
                const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                return (
                  <div key={day} className={\`bg-background p-2 min-h-[100px] border-t \${isToday ? "ring-2 ring-primary ring-inset" : ""}\`} data-testid={\`calendar-day-\${day}\`}>
                    <div className={\`text-xs font-medium mb-1 \${isToday ? "text-primary font-bold" : ""}\`}>{day}</div>
                    <div className="space-y-1">
                      {dayItems.slice(0, 3).map((item: any) => (
                        <div
                          key={item.id}
                          className="text-xs bg-primary/10 text-primary rounded px-1 py-0.5 truncate cursor-pointer hover:bg-primary/20"
                          onClick={() => navigate(\`${detailPath}/\${item.id}\`)}
                          data-testid={\`calendar-event-\${item.id}\`}
                        >
                          {item.${titleField}}
                        </div>
                      ))}
                      {dayItems.length > 3 && <div className="text-xs text-muted-foreground">+{dayItems.length - 3} more</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create ${entityName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
${dialogFields}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} data-testid="button-cancel-create">Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-submit-create">
              {createMutation.isPending ? "Creating..." : "Create ${entityName}"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
`;
}

export function generateSettingsPage(
  page: PlannedPage,
  plan: ProjectPlan,
  _reasoning: ReasoningResult | null
): string {
  const imports = makeImports();
  imports.react.push('useState');
  imports.components.push('import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";');
  imports.components.push('import { Button } from "@/components/ui/button";');
  imports.components.push('import { Input } from "@/components/ui/input";');
  imports.components.push('import { Label } from "@/components/ui/label";');
  imports.hooks.push('import { useToast } from "@/hooks/use-toast";');
  imports.lucideIcons.push('User', 'Settings', 'Shield', 'Bell');

  return `${buildImportBlock(imports)}

export default function ${page.componentName}() {
  const [activeTab, setActiveTab] = useState("profile");
  const { toast } = useToast();
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "preferences", label: "Preferences", icon: Settings },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
  ];

  const handleSave = () => {
    toast({ title: "Settings saved", description: "Your changes have been saved successfully." });
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-settings">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">${page.name}</h1>
        <p className="text-sm text-muted-foreground">${page.description}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <nav className="md:w-56 flex-shrink-0">
          <div className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={\`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md transition-colors \${activeTab === tab.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"}\`}
                  data-testid={\`button-tab-\${tab.id}\`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="flex-1 min-w-0">
          {activeTab === "profile" && (
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Manage your personal information and how others see you.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="profileName">Display Name</Label>
                  <Input id="profileName" placeholder="Your name" value={profileName} onChange={(e) => setProfileName(e.target.value)} data-testid="input-profile-name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profileEmail">Email</Label>
                  <Input id="profileEmail" type="email" placeholder="you@example.com" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} data-testid="input-profile-email" />
                </div>
                <Button onClick={handleSave} data-testid="button-save-profile">Save Changes</Button>
              </CardContent>
            </Card>
          )}

          {activeTab === "preferences" && (
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>Customize your application experience.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Compact Mode</p>
                    <p className="text-xs text-muted-foreground">Use a more condensed layout throughout the app.</p>
                  </div>
                  <input type="checkbox" className="rounded border-input" data-testid="input-compact-mode" />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Show Tooltips</p>
                    <p className="text-xs text-muted-foreground">Display helpful hints when hovering over elements.</p>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded border-input" data-testid="input-show-tooltips" />
                </div>
                <Button onClick={handleSave} data-testid="button-save-preferences">Save Preferences</Button>
              </CardContent>
            </Card>
          )}

          {activeTab === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Choose what notifications you receive.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Email Notifications</p>
                    <p className="text-xs text-muted-foreground">Receive updates and alerts via email.</p>
                  </div>
                  <input type="checkbox" checked={notificationsEnabled} onChange={(e) => setNotificationsEnabled(e.target.checked)} className="rounded border-input" data-testid="input-email-notifications" />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">In-App Notifications</p>
                    <p className="text-xs text-muted-foreground">Show notification badges within the application.</p>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded border-input" data-testid="input-app-notifications" />
                </div>
                <Button onClick={handleSave} data-testid="button-save-notifications">Save Notifications</Button>
              </CardContent>
            </Card>
          )}

          {activeTab === "security" && (
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>Manage your password and account security.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input id="currentPassword" type="password" placeholder="Enter current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} data-testid="input-current-password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input id="newPassword" type="password" placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} data-testid="input-new-password" />
                </div>
                <Button onClick={handleSave} data-testid="button-update-password">Update Password</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
`;
}

export function generateTimelinePage(
  page: PlannedPage,
  plan: ProjectPlan,
  reasoning: ReasoningResult | null
): string {
  const entityName = page.dataNeeded[0] || plan.dataModel[0]?.name || 'Activity';
  const entity = plan.dataModel.find(e => e.name === entityName);
  if (!entity) return generateFallbackPage(page);

  const fieldMap = resolveEntityFields(entity, reasoning);
  const endpoint = `/api/${toKebab(entityName)}s`;

  const titleField = fieldMap.nameField?.name || 'name';
  const descField = fieldMap.allFields.find(f =>
    f.name === 'description' || f.name === 'content' || f.name === 'message' || f.name === 'body' || f.name === 'notes'
  )?.name || '';
  const dateField = fieldMap.allFields.find(f =>
    f.semantic?.inputType === 'date' || f.semantic?.inputType === 'datetime' ||
    f.name === 'date' || f.name === 'createdAt' || f.name === 'timestamp' || f.name === 'occurredAt'
  )?.name || 'createdAt';
  const userField = fieldMap.allFields.find(f =>
    f.name === 'user' || f.name === 'author' || f.name === 'actor' || f.name === 'assignee' || f.name === 'userName'
  )?.name || '';

  const imports = makeImports();
  imports.react.push('useState');
  imports.tanstackQuery.push('useQuery');
  imports.lib.push('formatDateTime');
  imports.components.push('import { Card, CardContent } from "@/components/ui/card";');
  imports.components.push('import { Input } from "@/components/ui/input";');
  imports.components.push('import { Badge } from "@/components/ui/badge";');
  imports.lucideIcons.push('Search', 'Clock', 'Circle');
  if (fieldMap.statusField) {
    imports.custom.push('import StatusBadge from "@/components/status-badge";');
  }

  return `${buildImportBlock(imports)}

export default function ${page.componentName}() {
  const [search, setSearch] = useState("");

  const { data: items = [], isLoading } = useQuery<any[]>({ queryKey: ["${endpoint}"] });

  const filtered = items
    .filter((item: any) => JSON.stringify(item).toLowerCase().includes(search.toLowerCase()))
    .sort((a: any, b: any) => {
      const da = new Date(a.${dateField} || 0).getTime();
      const db = new Date(b.${dateField} || 0).getTime();
      return db - da;
    });

  return (
    <div className="p-6 space-y-4" data-testid="page-${toKebab(entityName)}-timeline">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">${page.name}</h1>
        <p className="text-sm text-muted-foreground">${page.description}</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-testid="input-search"
        />
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground" data-testid="text-loading">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground" data-testid="text-empty">No activity yet.</div>
      ) : (
        <div className="relative ml-4">
          <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />
          <div className="space-y-6">
            {filtered.map((item: any, index: number) => (
              <div key={item.id || index} className="relative pl-8" data-testid={\`timeline-item-\${item.id || index}\`}>
                <div className="absolute left-[-4px] top-1 w-2 h-2 rounded-full bg-primary ring-4 ring-background" />
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm" data-testid={\`text-title-\${item.id || index}\`}>{item.${titleField}}</p>${descField ? `
                        {item.${descField} && <p className="text-sm text-muted-foreground mt-1">{item.${descField}}</p>}` : ''}${userField ? `
                        {item.${userField} && <p className="text-xs text-muted-foreground mt-1">{item.${userField}}</p>}` : ''}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        ${fieldMap.statusField ? `{item.status && <StatusBadge status={item.status} />}` : ''}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatDateTime(item.${dateField})}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
`;
}

export function generateGalleryPage(
  page: PlannedPage,
  plan: ProjectPlan,
  reasoning: ReasoningResult | null
): string {
  const entityName = page.dataNeeded[0] || plan.dataModel[0]?.name || 'Item';
  const entity = plan.dataModel.find(e => e.name === entityName);
  if (!entity) return generateFallbackPage(page);

  const fieldMap = resolveEntityFields(entity, reasoning);
  const endpoint = `/api/${toKebab(entityName)}s`;
  const detailPath = `/${toKebab(entityName)}s`;

  const titleField = fieldMap.nameField?.name || 'name';
  const imageField = fieldMap.allFields.find(f =>
    f.name === 'image' || f.name === 'imageUrl' || f.name === 'photo' || f.name === 'thumbnail' || f.name === 'cover' || f.name === 'avatar'
  )?.name || '';
  const subtitleField = fieldMap.displayFields.find(f => !f.isName && !f.isStatus && !f.isId && f.type === 'text')?.name || '';

  const imports = makeImports();
  ensureWouterImport(imports);
  imports.react.push('useState');
  imports.tanstackQuery.push('useQuery', 'useMutation');
  imports.lib.push('queryClient', 'apiRequest');
  imports.components.push('import { Card, CardContent } from "@/components/ui/card";');
  imports.components.push('import { Button } from "@/components/ui/button";');
  imports.components.push('import { Input } from "@/components/ui/input";');
  imports.components.push('import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";');
  imports.components.push('import { Label } from "@/components/ui/label";');
  imports.hooks.push('import { useToast } from "@/hooks/use-toast";');
  imports.custom.push('import { useLocation } from "wouter";');
  imports.lucideIcons.push('Plus', 'Search', 'Image');
  if (fieldMap.statusField) {
    imports.custom.push('import StatusBadge from "@/components/status-badge";');
  }

  const fieldImports = getImportsNeededForFields(fieldMap.editableFields);
  if (fieldImports.needsTextarea) imports.components.push('import { Textarea } from "@/components/ui/textarea";');
  if (fieldImports.needsSelect || fieldMap.statusField) imports.components.push('import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from "@/components/ui/select";');

  const formStates = generateStateDeclarations(fieldMap.editableFields, 'form');
  const resetFormFields = generateResetStatements(fieldMap.editableFields, 'form');
  const formBody = generateFormBody(fieldMap.editableFields, 'form');
  const dialogFields = fieldMap.editableFields.map(f => generateFormFieldJSX(f, 'form')).join('\n');

  const statusFilterBlock = fieldMap.statusField ? `
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="select-status-filter">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            ${(fieldMap.statusField.enumValues || ['active', 'inactive']).map(v => `<SelectItem value="${v}">${toTitle(v)}</SelectItem>`).join('\n            ')}
          </SelectContent>
        </Select>` : '';

  return `${buildImportBlock(imports)}

export default function ${page.componentName}() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);${fieldMap.statusField ? '\n  const [statusFilter, setStatusFilter] = useState("all");' : ''}
  const { toast } = useToast();
  const [, navigate] = useLocation();
${formStates}

  const { data: items = [], isLoading } = useQuery<any[]>({ queryKey: ["${endpoint}"] });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "${endpoint}", data);
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["${endpoint}"] });
      setShowCreate(false);
${resetFormFields}
      toast({ title: "${entityName} created" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filtered = items.filter((item: any) => {
    const matchesSearch = JSON.stringify(item).toLowerCase().includes(search.toLowerCase());${fieldMap.statusField ? `
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;` : `
    return matchesSearch;`}
  });

  const handleCreate = () => {
    createMutation.mutate({
${formBody}
    });
  };

  return (
    <div className="p-6 space-y-4" data-testid="page-${toKebab(entityName)}-gallery">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">${page.name}</h1>
          <p className="text-sm text-muted-foreground">${page.description}</p>
        </div>
        <Button onClick={() => setShowCreate(true)} data-testid="button-add-${toKebab(entityName)}">
          <Plus className="h-4 w-4 mr-2" />
          Add ${entityName}
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ${entityName.toLowerCase()}s..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>${statusFilterBlock}
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground" data-testid="text-loading">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground" data-testid="text-empty">
          {search ? "No results found." : "No ${entityName.toLowerCase()}s yet. Click 'Add ${entityName}' to create one."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((item: any) => (
            <Card
              key={item.id}
              className="cursor-pointer hover:shadow-md transition-shadow overflow-visible"
              onClick={() => navigate(\`${detailPath}/\${item.id}\`)}
              data-testid={\`card-${toKebab(entityName)}-\${item.id}\`}
            >
              ${imageField ? `{item.${imageField} ? (
                <div className="h-48 bg-muted overflow-hidden rounded-t-md">
                  <img src={item.${imageField}} alt={item.${titleField}} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="h-48 bg-muted flex items-center justify-center rounded-t-md">
                  <Image className="h-12 w-12 text-muted-foreground/30" />
                </div>
              )}` : `<div className="h-48 bg-muted flex items-center justify-center rounded-t-md">
                <Image className="h-12 w-12 text-muted-foreground/30" />
              </div>`}
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm truncate" data-testid={\`text-title-\${item.id}\`}>{item.${titleField}}</h3>${subtitleField ? `
                <p className="text-xs text-muted-foreground mt-1 truncate">{item.${subtitleField}}</p>` : ''}${fieldMap.statusField ? `
                <div className="mt-2"><StatusBadge status={item.status} /></div>` : ''}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create ${entityName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
${dialogFields}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} data-testid="button-cancel-create">Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-submit-create">
              {createMutation.isPending ? "Creating..." : "Create ${entityName}"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
`;
}

function generateFallbackPage(page: PlannedPage): string {
  return generateGenericPage(page);
}

function generateColumnRenderExpr(field: ResolvedField): string | null {
  if (field.isStatus) {
    return `<StatusBadge status={item?.${field.name} ?? ""} />`;
  }

  const sem = field.semantic?.inputType;

  if (sem === 'currency') return `formatCurrency(item?.${field.name})`;
  if (sem === 'percentage') return `formatPercent(item?.${field.name})`;
  if (sem === 'date') return `formatDate(item?.${field.name})`;
  if (sem === 'datetime') return `formatDateTime(item?.${field.name})`;
  if (sem === 'email') return `item?.${field.name} ? <a href={\`mailto:\${item.${field.name}}\`} className="text-primary hover:underline">{item.${field.name}}</a> : '—'`;
  if (sem === 'tel') return `item?.${field.name} ? <a href={\`tel:\${item.${field.name}}\`} className="text-primary hover:underline">{item.${field.name}}</a> : '—'`;
  if (sem === 'url') return `item?.${field.name} ? <a href={item.${field.name}} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{item.${field.name}}</a> : '—'`;
  if (sem === 'checkbox' || field.type === 'boolean') return `item?.${field.name} ? 'Yes' : 'No'`;
  if (sem === 'rating') return `item?.${field.name} != null ? \`\${item.${field.name}} / 5\` : '—'`;

  if (field.isName) return `<span className="font-medium">{safeGet(item, "${field.name}")}</span>`;

  return null;
}

function generateStatusFilter(statusField: ResolvedField): string {
  if (statusField.enumValues) {
    const options = statusField.enumValues.map(v =>
      `            <SelectItem value="${v}">${toTitle(v)}</SelectItem>`
    ).join('\n');
    return `
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="select-status-filter">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
${options}
          </SelectContent>
        </Select>`;
  }
  return `
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="select-status-filter">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>`;
}

function generateFilterLogic(fieldMap: EntityFieldMap): string {
  if (fieldMap.statusField) {
    return `  const filtered = items.filter((item: any) => {
    const matchesSearch = JSON.stringify(item).toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.${fieldMap.statusField!.name} === statusFilter;
    return matchesSearch && matchesStatus;
  });`;
  }
  return `  const filtered = items.filter((item: any) =>
    JSON.stringify(item).toLowerCase().includes(search.toLowerCase())
  );`;
}

function generateCalendarState(dateField: string): string {
  return `  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const itemsByDate = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    for (const item of filtered) {
      const d = new Date(item.${dateField});
      if (isNaN(d.getTime())) continue;
      const key = \`\${d.getFullYear()}-\${d.getMonth()}-\${d.getDate()}\`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    }
    return grouped;
  }, [filtered]);\n`;
}

function generateCalendarView(dateField: string, titleField: string, detailPath: string): string {
  return `        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <Button variant="outline" size="sm" onClick={() => {
                if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
                else { setCurrentMonth(currentMonth - 1); }
              }}><ChevronLeft className="h-4 w-4" /></Button>
              <h3 className="font-semibold">{monthNames[currentMonth]} {currentYear}</h3>
              <Button variant="outline" size="sm" onClick={() => {
                if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
                else { setCurrentMonth(currentMonth + 1); }
              }}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-7 gap-px bg-muted rounded-md overflow-hidden">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="bg-background p-2 text-center text-xs font-medium text-muted-foreground">{day}</div>
              ))}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={\`empty-\${i}\`} className="bg-background p-2 min-h-[80px]" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateKey = \`\${currentYear}-\${currentMonth}-\${day}\`;
                const dayItems = itemsByDate[dateKey] || [];
                return (
                  <div key={day} className="bg-background p-2 min-h-[80px] border-t">
                    <div className="text-xs font-medium mb-1">{day}</div>
                    <div className="space-y-1">
                      {dayItems.slice(0, 2).map((item: any) => (
                        <div key={item.id} className="text-xs bg-primary/10 text-primary rounded px-1 py-0.5 truncate cursor-pointer hover:bg-primary/20" onClick={() => navigate(\`${detailPath}/\${item.id}\`)}>
                          {item.${titleField}}
                        </div>
                      ))}
                      {dayItems.length > 2 && <div className="text-xs text-muted-foreground">+{dayItems.length - 2} more</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}`;
}

function generateKanbanView(columns: string[], cardTitle: string, cardSubtitle: string, detailPath: string): string {
  const columnsLiteral = JSON.stringify(columns);
  return `        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {${columnsLiteral}.map((column: string) => (
              <div key={column} className="flex-shrink-0 w-80 bg-muted/30 rounded-md p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">{column}</h3>
                  <Badge variant="secondary">{filtered.filter((i: any) => i.status === column).length}</Badge>
                </div>
                <div className="space-y-2">
                  {filtered.filter((i: any) => i.status === column).map((item: any) => (
                    <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(\`${detailPath}/\${item.id}\`)} data-testid={\`card-kanban-\${item.id}\`}>
                      <CardContent className="p-3">
                        <p className="font-medium text-sm">{item.${cardTitle}}</p>${cardSubtitle ? `
                        <p className="text-xs text-muted-foreground mt-1">{item.${cardSubtitle}}</p>` : ''}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}`;
}

function generateCardGridView(imageField: string, titleField: string, subtitleField: string, hasStatus: boolean, detailPath: string, entityName: string): string {
  const imageJSX = imageField ? `
                {item.${imageField} && (
                  <div className="h-48 bg-muted rounded-t-md overflow-hidden">
                    <img src={item.${imageField}} alt={item.${titleField}} className="w-full h-full object-cover" />
                  </div>
                )}` : '';
  const subtitleJSX = subtitleField ? `
                  <p className="text-sm text-muted-foreground mt-1">{item.${subtitleField}}</p>` : '';
  const statusJSX = hasStatus ? `
                  <div className="mt-2"><StatusBadge status={item.status} /></div>` : '';

  return `        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {search ? "No results found." : "No ${entityName.toLowerCase()}s yet."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item: any) => (
              <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(\`${detailPath}/\${item.id}\`)} data-testid={\`card-${toKebab(entityName)}-\${item.id}\`}>
                ${imageJSX}
                <CardContent className="p-4">
                  <h3 className="font-semibold">{item.${titleField}}</h3>${subtitleJSX}${statusJSX}
                </CardContent>
              </Card>
            ))}
          </div>
        )}`;
}

function generateRelatedSection(
  rel: any,
  childEntity: PlannedEntity,
  parentEntityName: string,
  reasoning: ReasoningResult | null,
  imports: PageImports
): { queryDecl: string; section: string } | null {
  const childFieldMap = resolveEntityFields(childEntity, reasoning);
  const childEndpoint = `/api/${toKebab(rel.from)}s`;
  const childVarName = toCamel(rel.from);
  const foreignKey = rel.fromField || `${toCamel(parentEntityName)}Id`;

  const childDisplayFields = childFieldMap.displayFields
    .filter(f => f.name !== foreignKey)
    .slice(0, 5);

  const childEditableFields = childFieldMap.editableFields
    .filter(f => f.name !== foreignKey)
    .slice(0, 6);

  const childFieldImports = getImportsNeededForFields(childEditableFields.concat(childDisplayFields));
  if (childFieldImports.needsTextarea) imports.components.push('import { Textarea } from "@/components/ui/textarea";');
  if (childFieldImports.needsSelect) imports.components.push('import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from "@/components/ui/select";');
  if (childFieldImports.needsStatusBadge) imports.custom.push('import StatusBadge from "@/components/status-badge";');
  if (childFieldImports.needsFormatUtils) imports.lib.push('formatCurrency', 'formatPercent', 'formatDate', 'formatDateTime');
  imports.components.push('import { Input } from "@/components/ui/input";');
  imports.components.push('import { Label } from "@/components/ui/label";');

  const formStates = generateStateDeclarations(childEditableFields, `child${rel.from}`);
  const formBody = generateFormBody(childEditableFields, `child${rel.from}`);
  const resetFields = generateResetStatements(childEditableFields, `child${rel.from}`);
  const formInputs = childEditableFields.map(f => generateFormFieldJSX(f, `child${rel.from}`)).join('\n');

  const childTableHeaders = childDisplayFields.map(f =>
    `                  <th className="text-left py-2 font-medium text-sm">${toTitle(f.name)}</th>`
  ).join('\n');

  const childTableRows = childDisplayFields.map(f => {
    const display = generateDisplayFieldJSX(f, 'child');
    return `                    <td className="py-2 text-sm">${display}</td>`;
  }).join('\n');

  const showFormVar = `showAdd${rel.from}`;
  const mutationVar = `create${rel.from}Mutation`;

  const queryDecl = `  const { data: ${childVarName}s = [] } = useQuery<any[]>({
    queryKey: ["${childEndpoint}", { ${foreignKey}: id }],
    enabled: !!id,
  });
  const [${showFormVar}, setShow${rel.from}Form] = useState(false);
${formStates}
  const ${mutationVar} = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "${childEndpoint}", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["${childEndpoint}"] });
      setShow${rel.from}Form(false);
${resetFields}
      toast({ title: "${toTitle(rel.from)} added" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });`;

  const section = `
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">${toTitle(rel.from)}s</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShow${rel.from}Form(!${showFormVar})} data-testid="button-add-${toKebab(rel.from)}">
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent>
          {${showFormVar} && (
            <div className="mb-4 p-3 border rounded-md space-y-2 bg-muted/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
${formInputs}
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setShow${rel.from}Form(false)}>Cancel</Button>
                <Button size="sm" onClick={() => ${mutationVar}.mutate({
${formBody}
      ${foreignKey}: Number(id),
    })} loading={${mutationVar}.isPending} data-testid="button-submit-${toKebab(rel.from)}">
                  {${mutationVar}.isPending ? "Adding..." : "Add ${toTitle(rel.from)}"}
                </Button>
              </div>
            </div>
          )}
          {${childVarName}s.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
${childTableHeaders}
                  </tr>
                </thead>
                <tbody>
                  {${childVarName}s.map((child: any) => (
                    <tr key={child.id} className="border-b last:border-0">
${childTableRows}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No ${rel.from.toLowerCase()}s yet.</p>
          )}
        </CardContent>
      </Card>`;

  return { queryDecl, section };
}