import type { PlannedEntity } from './plan-generator.js';
import type { FieldSemantics, ReasoningResult } from './contextual-reasoning-engine.js';

export interface ComponentDependency {
  imports: string[];
  npmPackages: string[];
  components: string[];
  hooks: string[];
  lucideIcons: string[];
}

export interface ComponentTemplate {
  id: string;
  path: string;
  content: string;
  language: string;
  deps: ComponentDependency;
}

function emptyDeps(): ComponentDependency {
  return { imports: [], npmPackages: [], components: [], hooks: [], lucideIcons: [] };
}

export function getUtilsComponent(): ComponentTemplate {
  return {
    id: 'lib-utils',
    path: 'src/lib/utils.ts',
    language: 'typescript',
    deps: { ...emptyDeps(), npmPackages: ['clsx', 'tailwind-merge'] },
    content: `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | null | undefined, currency = 'USD'): string {
  if (value == null || isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—';
  return \`\${value}%\`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function safeGet(obj: any, key: string, fallback: string = '—'): any {
  const val = obj?.[key];
  if (val == null || val === '') return fallback;
  return val;
}

export function toTitleCase(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/\\b\\w/g, c => c.toUpperCase())
    .trim();
}

export function toKebabCase(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '').replace(/[\\s_]+/g, '-');
}
`,
  };
}

export function getQueryClientComponent(): ComponentTemplate {
  return {
    id: 'lib-queryClient',
    path: 'src/lib/queryClient.ts',
    language: 'typescript',
    deps: { ...emptyDeps(), npmPackages: ['@tanstack/react-query'] },
    content: `import { QueryClient, type MutationMeta } from "@tanstack/react-query";

export async function apiRequest(method: string, url: string, body?: any) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    let message: string;
    try {
      const parsed = JSON.parse(text);
      message = parsed.message || parsed.error || text;
    } catch {
      message = text || res.statusText;
    }
    throw new Error(message);
  }
  return res;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const [url, params] = queryKey as [string, Record<string, any>?];
        let fullUrl = url;
        if (params && typeof params === 'object') {
          const searchParams = new URLSearchParams();
          for (const [k, v] of Object.entries(params)) {
            if (v != null) searchParams.set(k, String(v));
          }
          const qs = searchParams.toString();
          if (qs) fullUrl += \`?\${qs}\`;
        }
        const res = await fetch(fullUrl);
        if (!res.ok) {
          throw new Error(\`\${res.status}: \${res.statusText}\`);
        }
        return res.json();
      },
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30000,
      retry: false,
    },
  },
});
`,
  };
}

export function getUseToastHook(): ComponentTemplate {
  return {
    id: 'hook-useToast',
    path: 'src/hooks/use-toast.ts',
    language: 'typescript',
    deps: emptyDeps(),
    content: `// @generated
import { useState, useCallback } from "react";

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

let toastCount = 0;
let globalToasts: Toast[] = [];
let listeners: Array<() => void> = [];

function notify() { listeners.forEach(l => l()); }

export function toast({ title, description, variant = "default" }: Omit<Toast, "id">) {
  const id = String(++toastCount);
  globalToasts = [...globalToasts, { id, title, description, variant }];
  notify();
  setTimeout(() => {
    globalToasts = globalToasts.filter(t => t.id !== id);
    notify();
  }, 5000);
  return { id, dismiss: () => { globalToasts = globalToasts.filter(t => t.id !== id); notify(); } };
}

export function useToast() {
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick(t => t + 1), []);

  useState(() => { listeners.push(rerender); });

  return {
    toasts: globalToasts,
    toast,
    dismiss: (id: string) => { globalToasts = globalToasts.filter(t => t.id !== id); notify(); },
  };
}
`,
  };
}

export function getButtonComponent(): ComponentTemplate {
  return {
    id: 'ui-button',
    path: 'src/components/ui/button.tsx',
    language: 'tsx',
    deps: { ...emptyDeps(), components: ['lib-utils'] },
    content: `import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", loading, disabled, children, ...props }, ref) => {
    const variants: Record<string, string> = {
      default: "bg-primary text-primary-foreground hover:bg-primary/90 border border-primary/20",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 border border-destructive/20",
      outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-secondary/20",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      link: "text-primary underline-offset-4 hover:underline",
    };
    const sizes: Record<string, string> = {
      default: "min-h-9 px-4 py-2",
      sm: "min-h-8 px-3 text-sm",
      lg: "min-h-10 px-6",
      icon: "h-9 w-9",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
export type { ButtonProps };
`,
  };
}

export function getCardComponent(): ComponentTemplate {
  return {
    id: 'ui-card',
    path: 'src/components/ui/card.tsx',
    language: 'tsx',
    deps: { ...emptyDeps(), components: ['lib-utils'] },
    content: `import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-md border bg-card text-card-foreground shadow-sm", className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />;
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-semibold leading-none tracking-tight", className)} {...props} />;
}

function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center p-6 pt-0 gap-2 flex-wrap", className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
`,
  };
}

export function getInputComponent(): ComponentTemplate {
  return {
    id: 'ui-input',
    path: 'src/components/ui/input.tsx',
    language: 'tsx',
    deps: { ...emptyDeps(), components: ['lib-utils'] },
    content: `import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
`,
  };
}

export function getTextareaComponent(): ComponentTemplate {
  return {
    id: 'ui-textarea',
    path: 'src/components/ui/textarea.tsx',
    language: 'tsx',
    deps: { ...emptyDeps(), components: ['lib-utils'] },
    content: `import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
`,
  };
}

export function getBadgeComponent(): ComponentTemplate {
  return {
    id: 'ui-badge',
    path: 'src/components/ui/badge.tsx',
    language: 'tsx',
    deps: { ...emptyDeps(), components: ['lib-utils'] },
    content: `import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants: Record<string, string> = {
    default: "bg-primary/10 text-primary border-primary/20",
    secondary: "bg-secondary text-secondary-foreground border-secondary/20",
    destructive: "bg-destructive/10 text-destructive border-destructive/20",
    outline: "border-input text-foreground",
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/10 text-warning border-warning/20",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
export type { BadgeProps };
`,
  };
}

export function getLabelComponent(): ComponentTemplate {
  return {
    id: 'ui-label',
    path: 'src/components/ui/label.tsx',
    language: 'tsx',
    deps: { ...emptyDeps(), components: ['lib-utils'] },
    content: `import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const Label = forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}
      {...props}
    />
  )
);
Label.displayName = "Label";

export { Label };
`,
  };
}

export function getDialogComponent(): ComponentTemplate {
  return {
    id: 'ui-dialog',
    path: 'src/components/ui/dialog.tsx',
    language: 'tsx',
    deps: { ...emptyDeps(), npmPackages: ['@radix-ui/react-dialog'], components: ['lib-utils'], lucideIcons: ['X'] },
    content: `import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
`,
  };
}

export function getSelectComponent(): ComponentTemplate {
  return {
    id: 'ui-select',
    path: 'src/components/ui/select.tsx',
    language: 'tsx',
    deps: { ...emptyDeps(), components: ['lib-utils'] },
    content: `import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

function SelectOption({ className, ...props }: React.OptionHTMLAttributes<HTMLOptionElement>) {
  return <option className={className} {...props} />;
}

export { Select, SelectOption };
`,
  };
}

export function getToasterComponent(): ComponentTemplate {
  return {
    id: 'ui-toaster',
    path: 'src/components/ui/toaster.tsx',
    language: 'tsx',
    deps: { ...emptyDeps(), hooks: ['hook-useToast'], lucideIcons: ['X'] },
    content: `// @generated
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={
            "relative rounded-lg border p-4 shadow-lg transition-all " +
            (toast.variant === "destructive"
              ? "bg-destructive text-destructive-foreground border-destructive/20"
              : "bg-background text-foreground border-border")
          }
          role="alert"
        >
          {toast.title && <div className="font-semibold text-sm">{toast.title}</div>}
          {toast.description && <div className="text-sm mt-1 opacity-90">{toast.description}</div>}
          <button
            onClick={() => dismiss(toast.id)}
            className="absolute top-2 right-2 p-1 rounded-md opacity-50 hover:opacity-100 hover:bg-accent"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
`,
  };
}

export function getTabsComponent(): ComponentTemplate {
  return {
    id: 'ui-tabs',
    path: 'src/components/ui/tabs.tsx',
    language: 'tsx',
    deps: { ...emptyDeps(), npmPackages: ['@radix-ui/react-tabs'], components: ['lib-utils'] },
    content: `import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
`,
  };
}

export function getStatusBadgeComponent(plan: { dataModel: PlannedEntity[] }): ComponentTemplate {
  const allStatuses = new Set<string>();
  for (const entity of plan.dataModel) {
    for (const field of entity.fields) {
      if (field.name === 'status') {
        const enumMatch = field.type.match(/enum\(([^)]+)\)/);
        if (enumMatch) {
          enumMatch[1].split(',').map(s => s.trim().replace(/'/g, '')).forEach(s => allStatuses.add(s));
        }
      }
    }
  }
  if (allStatuses.size === 0) {
    ['active', 'inactive', 'pending', 'completed', 'cancelled', 'draft', 'in-progress', 'approved', 'rejected'].forEach(s => allStatuses.add(s));
  }

  const statusMapEntries = Array.from(allStatuses).map(s => {
    const lower = s.toLowerCase();
    if (/complet|done|success|approv|paid|deliver|resolved|closed/i.test(lower)) return `    "${s}": "success"`;
    if (/cancel|reject|fail|error|expired|deleted|overdue/i.test(lower)) return `    "${s}": "destructive"`;
    if (/pending|review|waiting|hold|processing|in.?progress|open/i.test(lower)) return `    "${s}": "warning"`;
    if (/draft|inactive|archived/i.test(lower)) return `    "${s}": "secondary"`;
    return `    "${s}": "default"`;
  }).join(',\n');

  return {
    id: 'comp-status-badge',
    path: 'src/components/status-badge.tsx',
    language: 'tsx',
    deps: { ...emptyDeps(), components: ['ui-badge', 'lib-utils'] },
    content: `import { Badge } from "@/components/ui/badge";
import { toTitleCase } from "@/lib/utils";

const statusVariantMap: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
${statusMapEntries}
  };

interface StatusBadgeProps {
  status: string;
  className?: string;
  "data-testid"?: string;
}

export default function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const variant = statusVariantMap[status] || statusVariantMap[status?.toLowerCase()] || "secondary";
  return (
    <Badge variant={variant} className={className} {...props}>
      {toTitleCase(status || "Unknown")}
    </Badge>
  );
}
`,
  };
}

export function getEmptyStateComponent(): ComponentTemplate {
  return {
    id: 'comp-empty-state',
    path: 'src/components/empty-state.tsx',
    language: 'tsx',
    deps: { ...emptyDeps(), components: ['ui-button', 'lib-utils'] },
    content: `import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
  "data-testid"?: string;
}

export default function EmptyState({ icon, title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)} {...props}>
      {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}
      {action && (
        <Button className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
`,
  };
}

export function getConfirmDialogComponent(): ComponentTemplate {
  return {
    id: 'comp-confirm-dialog',
    path: 'src/components/confirm-dialog.tsx',
    language: 'tsx',
    deps: { ...emptyDeps(), components: ['ui-dialog', 'ui-button'] },
    content: `import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  variant?: "default" | "destructive";
  loading?: boolean;
  onConfirm: () => void;
}

export default function ConfirmDialog({
  open, onOpenChange, title, description,
  confirmLabel = "Confirm", variant = "default",
  loading, onConfirm
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
`,
  };
}

export function getKpiCardComponent(): ComponentTemplate {
  return {
    id: 'comp-kpi-card',
    path: 'src/components/kpi-card.tsx',
    language: 'tsx',
    deps: { ...emptyDeps(), components: ['ui-card', 'lib-utils'] },
    content: `import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon?: React.ReactNode;
  className?: string;
  "data-testid"?: string;
}

export default function KpiCard({ title, value, change, icon, className, ...props }: KpiCardProps) {
  const isPositive = change?.startsWith("+");
  const isNegative = change?.startsWith("-");

  return (
    <Card className={cn("", className)} {...props}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
        <div className="mt-2">
          <p className="text-2xl font-bold">{value}</p>
          {change && (
            <p className={cn("text-xs mt-1", isPositive && "text-green-600 dark:text-green-400", isNegative && "text-red-600 dark:text-red-400", !isPositive && !isNegative && "text-muted-foreground")}>
              {change} from last period
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
`,
  };
}

export function getLoadingSkeletonComponent(): ComponentTemplate {
  return {
    id: 'comp-loading-skeleton',
    path: 'src/components/loading-skeleton.tsx',
    language: 'tsx',
    deps: { ...emptyDeps(), components: ['lib-utils'] },
    content: `import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3 p-4">
      <div className="flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-md border p-6 space-y-4">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export function KpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-md border p-4 space-y-3">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export { Skeleton };
`,
  };
}

export function getThemeProviderComponent(): ComponentTemplate {
  return {
    id: 'comp-theme-provider',
    path: 'src/components/theme-provider.tsx',
    language: 'tsx',
    deps: emptyDeps(),
    content: `import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: "dark", setTheme: () => {} });

export function ThemeProvider({ children, defaultTheme = "dark" }: { children: React.ReactNode; defaultTheme?: Theme }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem("theme") as Theme) || defaultTheme;
    }
    return defaultTheme;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const sys = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(sys);
    } else {
      root.classList.add(theme);
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
`,
  };
}

export function getCheckboxComponent(): ComponentTemplate {
  return {
    id: 'ui-checkbox',
    path: 'src/components/ui/checkbox.tsx',
    language: 'tsx',
    deps: { ...emptyDeps(), components: ['lib-utils'] },
    content: `import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

const Checkbox = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label?: string }>(
  ({ className, label, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    return (
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          ref={ref}
          id={inputId}
          className={cn(
            "h-4 w-4 rounded border border-input accent-primary cursor-pointer",
            className
          )}
          {...props}
        />
        {label && <label htmlFor={inputId} className="text-sm cursor-pointer select-none">{label}</label>}
      </div>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
`,
  };
}

export function getSwitchComponent(): ComponentTemplate {
  return {
    id: 'ui-switch',
    path: 'src/components/ui/switch.tsx',
    language: 'tsx',
    deps: { ...emptyDeps(), components: ['lib-utils'] },
    content: `import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const Switch = forwardRef<HTMLButtonElement, { checked?: boolean; onCheckedChange?: (checked: boolean) => void; disabled?: boolean; className?: string }>(
  ({ checked = false, onCheckedChange, disabled, className }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          "inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
          checked ? "bg-primary" : "bg-input",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <span className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
          checked ? "translate-x-4" : "translate-x-0"
        )} />
      </button>
    );
  }
);
Switch.displayName = "Switch";

export { Switch };
`,
  };
}

export function getSeparatorComponent(): ComponentTemplate {
  return {
    id: 'ui-separator',
    path: 'src/components/ui/separator.tsx',
    language: 'tsx',
    deps: { ...emptyDeps(), components: ['lib-utils'] },
    content: `import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const Separator = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { orientation?: "horizontal" | "vertical" }>(
  ({ className, orientation = "horizontal", ...props }, ref) => (
    <div
      ref={ref}
      role="separator"
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className
      )}
      {...props}
    />
  )
);
Separator.displayName = "Separator";

export { Separator };
`,
  };
}

export function getProgressComponent(): ComponentTemplate {
  return {
    id: 'ui-progress',
    path: 'src/components/ui/progress.tsx',
    language: 'tsx',
    deps: { ...emptyDeps(), components: ['lib-utils'] },
    content: `import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const Progress = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value?: number; max?: number }>(
  ({ className, value = 0, max = 100, ...props }, ref) => {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));
    return (
      <div ref={ref} className={cn("relative h-2 w-full overflow-hidden rounded-full bg-secondary", className)} {...props}>
        <div className="h-full bg-primary transition-all duration-300" style={{ width: \`\${pct}%\` }} />
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };
`,
  };
}

export function getAvatarComponent(): ComponentTemplate {
  return {
    id: 'ui-avatar',
    path: 'src/components/ui/avatar.tsx',
    language: 'tsx',
    deps: { ...emptyDeps(), components: ['lib-utils'] },
    content: `import { useState } from "react";
import { cn } from "@/lib/utils";

function Avatar({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)} {...props}>
      {children}
    </div>
  );
}

function AvatarImage({ src, alt, className }: { src?: string; alt?: string; className?: string }) {
  const [error, setError] = useState(false);
  if (!src || error) return null;
  return <img src={src} alt={alt || ""} onError={() => setError(true)} className={cn("aspect-square h-full w-full object-cover", className)} />;
}

function AvatarFallback({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium", className)} {...props}>
      {children}
    </div>
  );
}

export { Avatar, AvatarImage, AvatarFallback };
`,
  };
}

export function getDropdownMenuComponent(): ComponentTemplate {
  return {
    id: 'ui-dropdown-menu',
    path: 'src/components/ui/dropdown-menu.tsx',
    language: 'tsx',
    deps: { ...emptyDeps(), components: ['lib-utils'] },
    content: `import { useState, useRef, useEffect, createContext, useContext } from "react";
import { cn } from "@/lib/utils";

const DropdownCtx = createContext<{ open: boolean; setOpen: (v: boolean) => void }>({ open: false, setOpen: () => {} });

function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <DropdownCtx.Provider value={{ open, setOpen }}>
      <div ref={ref} className="relative inline-block">{children}</div>
    </DropdownCtx.Provider>
  );
}

function DropdownMenuTrigger({ children, asChild, ...props }: React.HTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { open, setOpen } = useContext(DropdownCtx);
  return <button type="button" onClick={() => setOpen(!open)} {...props}>{children}</button>;
}

function DropdownMenuContent({ className, children, align = "start", ...props }: React.HTMLAttributes<HTMLDivElement> & { align?: "start" | "end" | "center" }) {
  const { open } = useContext(DropdownCtx);
  if (!open) return null;
  return (
    <div className={cn(
      "absolute z-50 mt-1 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95",
      align === "end" && "right-0",
      align === "center" && "left-1/2 -translate-x-1/2",
      className
    )} {...props}>
      {children}
    </div>
  );
}

function DropdownMenuItem({ className, children, onClick, disabled, ...props }: React.HTMLAttributes<HTMLDivElement> & { disabled?: boolean }) {
  const { setOpen } = useContext(DropdownCtx);
  return (
    <div
      role="menuitem"
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : (e) => { onClick?.(e); setOpen(false); }}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
        disabled && "pointer-events-none opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn("-mx-1 my-1 h-px bg-muted", className)} />;
}

function DropdownMenuLabel({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-2 py-1.5 text-sm font-semibold", className)}>{children}</div>;
}

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel };
`,
  };
}

export function getTooltipComponent(): ComponentTemplate {
  return {
    id: 'ui-tooltip',
    path: 'src/components/ui/tooltip.tsx',
    language: 'tsx',
    deps: { ...emptyDeps(), components: ['lib-utils'] },
    content: `import { useState, useRef } from "react";
import { cn } from "@/lib/utils";

function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function Tooltip({ children, content, side = "top", delayMs = 200, className }: { children: React.ReactNode; content: React.ReactNode; side?: "top" | "bottom" | "left" | "right"; delayMs?: number; className?: string }) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const positions: Record<string, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };
  const show = () => { timerRef.current = setTimeout(() => setOpen(true), delayMs); };
  const hide = () => { clearTimeout(timerRef.current); setOpen(false); };
  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {open && (
        <div role="tooltip" className={cn("absolute z-50 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-md animate-in fade-in-0 whitespace-nowrap pointer-events-none", positions[side], className)}>
          {content}
        </div>
      )}
    </div>
  );
}

export { TooltipProvider, Tooltip };
`,
  };
}

export function getScrollAreaComponent(): ComponentTemplate {
  return {
    id: 'ui-scroll-area',
    path: 'src/components/ui/scroll-area.tsx',
    language: 'tsx',
    deps: { ...emptyDeps(), components: ['lib-utils'] },
    content: `import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const ScrollArea = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { maxHeight?: string }>(
  ({ className, maxHeight = "400px", children, ...props }, ref) => (
    <div ref={ref} className={cn("relative overflow-auto", className)} style={{ maxHeight }} {...props}>
      {children}
    </div>
  )
);
ScrollArea.displayName = "ScrollArea";

export { ScrollArea };
`,
  };
}

export function getTableComponent(): ComponentTemplate {
  return {
    id: 'ui-table',
    path: 'src/components/ui/table.tsx',
    language: 'tsx',
    deps: { ...emptyDeps(), components: ['lib-utils'] },
    content: `import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const Table = forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
  </div>
));
Table.displayName = "Table";

const TableHeader = forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
));
TableBody.displayName = "TableBody";

const TableRow = forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(({ className, ...props }, ref) => (
  <tr ref={ref} className={cn("border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted", className)} {...props} />
));
TableRow.displayName = "TableRow";

const TableHead = forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(({ className, ...props }, ref) => (
  <th ref={ref} className={cn("h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0", className)} {...props} />
));
TableHead.displayName = "TableHead";

const TableCell = forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(({ className, ...props }, ref) => (
  <td ref={ref} className={cn("p-2 align-middle [&:has([role=checkbox])]:pr-0", className)} {...props} />
));
TableCell.displayName = "TableCell";

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
`,
  };
}

export function getPopoverComponent(): ComponentTemplate {
  return {
    id: 'ui-popover',
    path: 'src/components/ui/popover.tsx',
    language: 'tsx',
    deps: { ...emptyDeps(), components: ['lib-utils'] },
    content: `import { useState, useRef, useEffect, createContext, useContext } from "react";
import { cn } from "@/lib/utils";

const PopoverCtx = createContext<{ open: boolean; setOpen: (v: boolean) => void }>({ open: false, setOpen: () => {} });

function Popover({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <PopoverCtx.Provider value={{ open, setOpen }}>
      <div ref={ref} className="relative inline-block">{children}</div>
    </PopoverCtx.Provider>
  );
}

function PopoverTrigger({ children, asChild, ...props }: React.HTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { open, setOpen } = useContext(PopoverCtx);
  return <button type="button" onClick={() => setOpen(!open)} {...props}>{children}</button>;
}

function PopoverContent({ className, children, align = "center", ...props }: React.HTMLAttributes<HTMLDivElement> & { align?: "start" | "end" | "center" }) {
  const { open } = useContext(PopoverCtx);
  if (!open) return null;
  return (
    <div className={cn(
      "absolute z-50 mt-2 w-72 rounded-md border bg-popover p-4 shadow-md outline-none animate-in fade-in-0 zoom-in-95",
      align === "end" && "right-0",
      align === "start" && "left-0",
      align === "center" && "left-1/2 -translate-x-1/2",
      className
    )} {...props}>
      {children}
    </div>
  );
}

export { Popover, PopoverTrigger, PopoverContent };
`,
  };
}

export function getAlertDialogComponent(): ComponentTemplate {
  return {
    id: 'ui-alert-dialog',
    path: 'src/components/ui/alert-dialog.tsx',
    language: 'tsx',
    deps: { ...emptyDeps(), components: ['lib-utils', 'ui-button'] },
    content: `import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: "default" | "destructive";
}

function AlertDialog({ open, onOpenChange, title, description, confirmLabel = "Continue", cancelLabel = "Cancel", onConfirm, variant = "default" }: AlertDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false); };
    if (open) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center" onClick={(e) => { if (e.target === overlayRef.current) onOpenChange(false); }}>
      <div className="fixed inset-0 bg-black/50" />
      <div className="relative z-50 w-full max-w-md mx-4 bg-background rounded-lg border shadow-lg p-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-2">{description}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{cancelLabel}</Button>
          <Button variant={variant === "destructive" ? "destructive" : "default"} onClick={() => { onConfirm(); onOpenChange(false); }}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

export { AlertDialog };
`,
  };
}

export function getAccordionComponent(): ComponentTemplate {
  return {
    id: 'ui-accordion',
    path: 'src/components/ui/accordion.tsx',
    language: 'tsx',
    deps: { ...emptyDeps(), components: ['lib-utils'], lucideIcons: ['ChevronDown'] },
    content: `import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

function Accordion({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("divide-y", className)}>{children}</div>;
}

function AccordionItem({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("border-b", className)} data-state={open ? "open" : "closed"} data-value={value}>
      {typeof children === "function" ? (children as any)({ open, toggle: () => setOpen(!open) }) : children}
    </div>
  );
}

function AccordionTrigger({ children, className, open, onClick }: { children: React.ReactNode; className?: string; open?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex w-full items-center justify-between py-4 text-sm font-medium transition-all hover:underline", className)}>
      {children}
      <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
    </button>
  );
}

function AccordionContent({ children, className, open }: { children: React.ReactNode; className?: string; open?: boolean }) {
  if (!open) return null;
  return <div className={cn("pb-4 text-sm animate-in fade-in-0", className)}>{children}</div>;
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
`,
  };
}

export function getRadioGroupComponent(): ComponentTemplate {
  return {
    id: 'ui-radio-group',
    path: 'src/components/ui/radio-group.tsx',
    language: 'tsx',
    deps: { ...emptyDeps(), components: ['lib-utils'] },
    content: `import { cn } from "@/lib/utils";

function RadioGroup({ value, onValueChange, className, children }: { value?: string; onValueChange?: (value: string) => void; className?: string; children: React.ReactNode }) {
  return <div role="radiogroup" className={cn("grid gap-2", className)}>{children}</div>;
}

function RadioGroupItem({ value, id, className, label, checked, onChange }: { value: string; id?: string; className?: string; label?: string; checked?: boolean; onChange?: (value: string) => void }) {
  const inputId = id || \`radio-\${value}\`;
  return (
    <div className="flex items-center gap-2">
      <input type="radio" id={inputId} value={value} checked={checked} onChange={() => onChange?.(value)} className={cn("h-4 w-4 accent-primary", className)} />
      {label && <label htmlFor={inputId} className="text-sm cursor-pointer">{label}</label>}
    </div>
  );
}

export { RadioGroup, RadioGroupItem };
`,
  };
}

export function getSliderComponent(): ComponentTemplate {
  return {
    id: 'ui-slider',
    path: 'src/components/ui/slider.tsx',
    language: 'tsx',
    deps: { ...emptyDeps(), components: ['lib-utils'] },
    content: `import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const Slider = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label?: string }>(
  ({ className, label, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="text-sm font-medium mb-1 block">{label}</label>}
      <input
        type="range"
        ref={ref}
        className={cn("w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary", className)}
        {...props}
      />
    </div>
  )
);
Slider.displayName = "Slider";

export { Slider };
`,
  };
}

export function getDataTableComponent(): ComponentTemplate {
  return {
    id: 'comp-data-table',
    path: 'src/components/data-table.tsx',
    language: 'tsx',
    deps: { ...emptyDeps(), components: ['lib-utils', 'ui-card'] },
    content: `import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export interface ColumnDef<T = any> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T = any> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  rowTestId?: (item: T) => string;
  actions?: (item: T) => ReactNode;
  className?: string;
}

export default function DataTable<T extends { id: number | string }>({
  data,
  columns,
  isLoading,
  emptyMessage = "No items found.",
  onRowClick,
  rowTestId,
  actions,
  className,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-0">
          <div className="p-8 text-center text-muted-foreground" data-testid="text-loading">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-0">
          <div className="p-8 text-center text-muted-foreground" data-testid="text-empty">{emptyMessage}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className={cn("text-left p-3 text-sm font-medium text-muted-foreground", col.className)}>
                    {col.header}
                  </th>
                ))}
                {actions && (
                  <th className="text-right p-3 text-sm font-medium text-muted-foreground">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((item) => (
                <tr
                  key={item.id}
                  className={cn("hover:bg-muted/50 transition-colors", onRowClick && "cursor-pointer")}
                  onClick={() => onRowClick?.(item)}
                  data-testid={rowTestId?.(item)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn("p-3 text-sm", col.className)}>
                      {col.render ? col.render(item) : (item as any)[col.key]}
                    </td>
                  ))}
                  {actions && (
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {actions(item)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
`,
  };
}

export function getSearchBarComponent(): ComponentTemplate {
  return {
    id: 'comp-search-bar',
    path: 'src/components/search-bar.tsx',
    language: 'tsx',
    deps: { ...emptyDeps(), components: ['ui-input'], lucideIcons: ['Search'] },
    content: `import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
}

export default function SearchBar({ value, onChange, placeholder = "Search...", className, ...props }: SearchBarProps) {
  return (
    <div className={\`relative flex-1 max-w-sm \${className || ""}\`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9"
        data-testid={props["data-testid"] || "input-search"}
      />
    </div>
  );
}
`,
  };
}

export function getAllBaseComponents(plan: { dataModel: PlannedEntity[] }): ComponentTemplate[] {
  return [
    getUtilsComponent(),
    getQueryClientComponent(),
    getUseToastHook(),
    getButtonComponent(),
    getCardComponent(),
    getInputComponent(),
    getTextareaComponent(),
    getBadgeComponent(),
    getLabelComponent(),
    getDialogComponent(),
    getSelectComponent(),
    getToasterComponent(),
    getTabsComponent(),
    getCheckboxComponent(),
    getSwitchComponent(),
    getSeparatorComponent(),
    getProgressComponent(),
    getAvatarComponent(),
    getDropdownMenuComponent(),
    getTooltipComponent(),
    getScrollAreaComponent(),
    getTableComponent(),
    getPopoverComponent(),
    getAlertDialogComponent(),
    getAccordionComponent(),
    getRadioGroupComponent(),
    getSliderComponent(),
    getStatusBadgeComponent(plan),
    getEmptyStateComponent(),
    getConfirmDialogComponent(),
    getKpiCardComponent(),
    getLoadingSkeletonComponent(),
    getThemeProviderComponent(),
    getDataTableComponent(),
    getSearchBarComponent(),
  ];
}

export function resolveComponentDependencies(requestedIds: string[], allComponents: ComponentTemplate[]): ComponentTemplate[] {
  const componentMap = new Map(allComponents.map(c => [c.id, c]));
  const resolved = new Set<string>();
  const result: ComponentTemplate[] = [];

  function resolve(id: string) {
    if (resolved.has(id)) return;
    resolved.add(id);
    const comp = componentMap.get(id);
    if (!comp) return;
    for (const depId of [...comp.deps.components, ...comp.deps.hooks]) {
      resolve(depId);
    }
    result.push(comp);
  }

  for (const id of requestedIds) {
    resolve(id);
  }

  return result;
}

export function collectNpmPackages(components: ComponentTemplate[]): Set<string> {
  const packages = new Set<string>();
  for (const comp of components) {
    for (const pkg of comp.deps.npmPackages) {
      packages.add(pkg);
    }
  }
  return packages;
}