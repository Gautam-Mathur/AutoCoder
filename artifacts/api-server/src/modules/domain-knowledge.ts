export interface DomainEntity {
  name: string;
  fields: { name: string; type: string; required?: boolean; description?: string }[];
  relationships?: { entity: string; type: 'one-to-many' | 'many-to-one' | 'many-to-many'; field?: string }[];
}

export interface DomainWorkflow {
  name: string;
  entity: string;
  states: string[];
  transitions: { from: string; to: string; action: string; role?: string }[];
}

export interface DomainModule {
  name: string;
  description: string;
  entities: string[];
  pages: { name: string; path: string; description: string; features: string[] }[];
  kpis?: string[];
}

export interface UserRole {
  name: string;
  permissions: string[];
  description: string;
}

export interface IndustryDomain {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  modules: DomainModule[];
  entities: DomainEntity[];
  workflows: DomainWorkflow[];
  roles: UserRole[];
  defaultKPIs: string[];
  commonIntegrations: string[];
}

const INDUSTRY_DOMAINS: Record<string, IndustryDomain> = {
  'consulting': {
    id: 'consulting',
    name: 'Consulting / Professional Services',
    description: 'Project-based service delivery with time tracking and client billing',
    keywords: ['consulting', 'professional services', 'advisory', 'consultant', 'agency', 'freelance', 'contractor'],
    modules: [
      {
        name: 'Project Management',
        description: 'Track projects, milestones, tasks, and deliverables',
        entities: ['Project', 'Milestone', 'Task'],
        pages: [
          { name: 'Projects List', path: '/projects', description: 'All projects with status, client, budget', features: ['search', 'filter-by-status', 'filter-by-client', 'sort'] },
          { name: 'Project Detail', path: '/projects/:id', description: 'Project overview, milestones, team, budget tracking', features: ['timeline-view', 'budget-tracker', 'team-assignment', 'file-attachments'] },
          { name: 'Kanban Board', path: '/projects/:id/board', description: 'Task board with drag-and-drop', features: ['drag-drop', 'assignee-filter', 'priority-labels'] },
        ],
        kpis: ['Active Projects', 'On-Time Delivery Rate', 'Budget Utilization'],
      },
      {
        name: 'Time & Attendance',
        description: 'Weekly timesheets with project allocation and approval workflow',
        entities: ['Timesheet', 'TimeEntry'],
        pages: [
          { name: 'My Timesheet', path: '/timesheets', description: 'Weekly timesheet entry with project allocation', features: ['week-picker', 'project-hours-grid', 'submit-for-approval'] },
          { name: 'Timesheet Approvals', path: '/timesheets/approvals', description: 'Manager view to approve/reject timesheets', features: ['pending-list', 'approve-reject', 'comment'] },
          { name: 'Time Reports', path: '/timesheets/reports', description: 'Utilization and hours reports', features: ['date-range', 'by-employee', 'by-project', 'export'] },
        ],
        kpis: ['Utilization Rate', 'Billable Hours %', 'Hours This Week'],
      },
      {
        name: 'Client Management',
        description: 'Client profiles, contracts, and relationship tracking',
        entities: ['Client', 'Contract'],
        pages: [
          { name: 'Clients List', path: '/clients', description: 'All clients with active projects and revenue', features: ['search', 'filter-by-status', 'revenue-column'] },
          { name: 'Client Detail', path: '/clients/:id', description: 'Client profile, projects, contracts, billing history', features: ['contact-info', 'project-list', 'billing-history', 'notes'] },
        ],
        kpis: ['Total Clients', 'Client Retention Rate', 'Revenue per Client'],
      },
      {
        name: 'Billing & Invoicing',
        description: 'Generate invoices from timesheets, track payments',
        entities: ['Invoice', 'Payment'],
        pages: [
          { name: 'Invoices', path: '/invoices', description: 'All invoices with status and amounts', features: ['search', 'filter-by-status', 'filter-by-client', 'create-invoice'] },
          { name: 'Invoice Detail', path: '/invoices/:id', description: 'Invoice line items, PDF preview, send to client', features: ['line-items', 'pdf-preview', 'send-email', 'record-payment'] },
        ],
        kpis: ['Outstanding Invoices', 'Revenue This Month', 'Average Days to Pay'],
      },
      {
        name: 'Employee Management',
        description: 'Employee profiles, skills, departments',
        entities: ['Employee', 'Department'],
        pages: [
          { name: 'Team Directory', path: '/employees', description: 'Employee list with roles, departments, skills', features: ['search', 'filter-by-department', 'filter-by-skill', 'avatar'] },
          { name: 'Employee Profile', path: '/employees/:id', description: 'Employee details, projects, timesheets, skills', features: ['profile-info', 'current-projects', 'skill-tags', 'availability'] },
        ],
        kpis: ['Team Size', 'Avg Utilization', 'Skills Coverage'],
      },
      {
        name: 'Dashboard',
        description: 'Executive overview with key metrics',
        entities: [],
        pages: [
          { name: 'Dashboard', path: '/', description: 'KPI cards, revenue chart, utilization chart, active projects', features: ['kpi-cards', 'revenue-chart', 'utilization-chart', 'recent-activity'] },
        ],
        kpis: ['Revenue', 'Utilization Rate', 'Active Projects', 'Outstanding Invoices'],
      },
    ],
    entities: [
      {
        name: 'Employee',
        fields: [
          { name: 'id', type: 'serial', required: true },
          { name: 'name', type: 'string', required: true },
          { name: 'email', type: 'string', required: true },
          { name: 'role', type: 'string', required: true, description: 'Job title' },
          { name: 'departmentId', type: 'number', required: true },
          { name: 'hourlyRate', type: 'number', description: 'Billing rate per hour' },
          { name: 'skills', type: 'string[]' },
          { name: 'avatar', type: 'string' },
          { name: 'status', type: 'enum:active,inactive', required: true },
        ],
        relationships: [
          { entity: 'Department', type: 'many-to-one', field: 'departmentId' },
          { entity: 'Timesheet', type: 'one-to-many' },
          { entity: 'Task', type: 'one-to-many' },
        ],
      },
      {
        name: 'Department',
        fields: [
          { name: 'id', type: 'serial', required: true },
          { name: 'name', type: 'string', required: true },
          { name: 'managerId', type: 'number' },
        ],
        relationships: [{ entity: 'Employee', type: 'one-to-many' }],
      },
      {
        name: 'Client',
        fields: [
          { name: 'id', type: 'serial', required: true },
          { name: 'companyName', type: 'string', required: true },
          { name: 'contactName', type: 'string', required: true },
          { name: 'email', type: 'string', required: true },
          { name: 'phone', type: 'string' },
          { name: 'address', type: 'string' },
          { name: 'status', type: 'enum:active,inactive', required: true },
        ],
        relationships: [
          { entity: 'Project', type: 'one-to-many' },
          { entity: 'Invoice', type: 'one-to-many' },
        ],
      },
      {
        name: 'Project',
        fields: [
          { name: 'id', type: 'serial', required: true },
          { name: 'name', type: 'string', required: true },
          { name: 'clientId', type: 'number', required: true },
          { name: 'description', type: 'string' },
          { name: 'status', type: 'enum:planning,active,on-hold,completed,cancelled', required: true },
          { name: 'startDate', type: 'date', required: true },
          { name: 'endDate', type: 'date' },
          { name: 'budget', type: 'number' },
          { name: 'managerId', type: 'number' },
        ],
        relationships: [
          { entity: 'Client', type: 'many-to-one', field: 'clientId' },
          { entity: 'Milestone', type: 'one-to-many' },
          { entity: 'Task', type: 'one-to-many' },
          { entity: 'Timesheet', type: 'one-to-many' },
        ],
      },
      {
        name: 'Milestone',
        fields: [
          { name: 'id', type: 'serial', required: true },
          { name: 'projectId', type: 'number', required: true },
          { name: 'name', type: 'string', required: true },
          { name: 'dueDate', type: 'date', required: true },
          { name: 'status', type: 'enum:pending,in-progress,completed', required: true },
        ],
      },
      {
        name: 'Task',
        fields: [
          { name: 'id', type: 'serial', required: true },
          { name: 'projectId', type: 'number', required: true },
          { name: 'assigneeId', type: 'number' },
          { name: 'title', type: 'string', required: true },
          { name: 'description', type: 'string' },
          { name: 'status', type: 'enum:todo,in-progress,review,done', required: true },
          { name: 'priority', type: 'enum:low,medium,high,urgent', required: true },
          { name: 'dueDate', type: 'date' },
        ],
      },
      {
        name: 'Timesheet',
        fields: [
          { name: 'id', type: 'serial', required: true },
          { name: 'employeeId', type: 'number', required: true },
          { name: 'projectId', type: 'number', required: true },
          { name: 'weekStart', type: 'date', required: true },
          { name: 'monday', type: 'number' },
          { name: 'tuesday', type: 'number' },
          { name: 'wednesday', type: 'number' },
          { name: 'thursday', type: 'number' },
          { name: 'friday', type: 'number' },
          { name: 'totalHours', type: 'number', required: true },
          { name: 'status', type: 'enum:draft,submitted,approved,rejected', required: true },
          { name: 'notes', type: 'string' },
        ],
      },
      {
        name: 'Invoice',
        fields: [
          { name: 'id', type: 'serial', required: true },
          { name: 'clientId', type: 'number', required: true },
          { name: 'projectId', type: 'number' },
          { name: 'invoiceNumber', type: 'string', required: true },
          { name: 'amount', type: 'number', required: true },
          { name: 'status', type: 'enum:draft,sent,paid,overdue,cancelled', required: true },
          { name: 'issueDate', type: 'date', required: true },
          { name: 'dueDate', type: 'date', required: true },
          { name: 'paidDate', type: 'date' },
        ],
      },
      {
        name: 'Contract',
        fields: [
          { name: 'id', type: 'serial', required: true },
          { name: 'clientId', type: 'number', required: true },
          { name: 'title', type: 'string', required: true },
          { name: 'value', type: 'number' },
          { name: 'startDate', type: 'date', required: true },
          { name: 'endDate', type: 'date' },
          { name: 'status', type: 'enum:draft,active,expired,terminated', required: true },
        ],
      },
      {
        name: 'Payment',
        fields: [
          { name: 'id', type: 'serial', required: true },
          { name: 'invoiceId', type: 'number', required: true },
          { name: 'amount', type: 'number', required: true },
          { name: 'paymentDate', type: 'date', required: true },
          { name: 'method', type: 'enum:bank-transfer,credit-card,check,cash', required: true },
        ],
      },
    ],
    workflows: [
      {
        name: 'Timesheet Approval',
        entity: 'Timesheet',
        states: ['draft', 'submitted', 'approved', 'rejected'],
        transitions: [
          { from: 'draft', to: 'submitted', action: 'Submit', role: 'employee' },
          { from: 'submitted', to: 'approved', action: 'Approve', role: 'manager' },
          { from: 'submitted', to: 'rejected', action: 'Reject', role: 'manager' },
          { from: 'rejected', to: 'draft', action: 'Revise', role: 'employee' },
        ],
      },
      {
        name: 'Invoice Lifecycle',
        entity: 'Invoice',
        states: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
        transitions: [
          { from: 'draft', to: 'sent', action: 'Send to Client', role: 'admin' },
          { from: 'sent', to: 'paid', action: 'Record Payment', role: 'admin' },
          { from: 'sent', to: 'overdue', action: 'Mark Overdue', role: 'system' },
          { from: 'sent', to: 'cancelled', action: 'Cancel', role: 'admin' },
        ],
      },
      {
        name: 'Project Lifecycle',
        entity: 'Project',
        states: ['planning', 'active', 'on-hold', 'completed', 'cancelled'],
        transitions: [
          { from: 'planning', to: 'active', action: 'Start Project', role: 'manager' },
          { from: 'active', to: 'on-hold', action: 'Pause', role: 'manager' },
          { from: 'on-hold', to: 'active', action: 'Resume', role: 'manager' },
          { from: 'active', to: 'completed', action: 'Complete', role: 'manager' },
          { from: 'planning', to: 'cancelled', action: 'Cancel', role: 'admin' },
        ],
      },
    ],
    roles: [
      { name: 'Admin', permissions: ['all'], description: 'Full system access' },
      { name: 'Manager', permissions: ['view-all-projects', 'approve-timesheets', 'manage-team', 'create-invoices', 'view-reports'], description: 'Project and team management' },
      { name: 'Employee', permissions: ['view-own-projects', 'submit-timesheets', 'view-own-profile', 'log-time'], description: 'Standard team member' },
    ],
    defaultKPIs: ['Revenue', 'Utilization Rate', 'Active Projects', 'Outstanding Invoices', 'Billable Hours', 'Client Count'],
    commonIntegrations: ['Slack', 'Google Calendar', 'QuickBooks', 'Stripe'],
  },

  'manufacturing': {
    id: 'manufacturing',
    name: 'Manufacturing / Production',
    description: 'Production planning, inventory, quality control, and supply chain management',
    keywords: ['manufacturing', 'production', 'factory', 'assembly', 'fabrication', 'plant', 'industrial', 'bom', 'bill of materials'],
    modules: [
      {
        name: 'Production Planning',
        description: 'Work orders, production schedules, and capacity planning',
        entities: ['WorkOrder', 'ProductionSchedule'],
        pages: [
          { name: 'Work Orders', path: '/work-orders', description: 'All work orders with status and progress', features: ['search', 'filter-by-status', 'priority-sort', 'create-order'] },
          { name: 'Work Order Detail', path: '/work-orders/:id', description: 'Order details, BOM, progress tracking', features: ['bom-list', 'progress-bar', 'quality-checks', 'status-update'] },
          { name: 'Production Schedule', path: '/schedule', description: 'Calendar/Gantt view of production schedule', features: ['gantt-chart', 'capacity-view', 'drag-reschedule'] },
        ],
        kpis: ['Active Work Orders', 'On-Time Completion Rate', 'Production Capacity'],
      },
      {
        name: 'Bill of Materials',
        description: 'Product structure, components, and assembly instructions',
        entities: ['Product', 'BOMItem'],
        pages: [
          { name: 'Products', path: '/products', description: 'Product catalog with BOM', features: ['search', 'category-filter', 'cost-column'] },
          { name: 'Product Detail', path: '/products/:id', description: 'Product info, BOM tree, cost breakdown', features: ['bom-tree', 'cost-calculation', 'revision-history'] },
        ],
        kpis: ['Total Products', 'Avg Components per Product', 'BOM Accuracy'],
      },
      {
        name: 'Inventory Management',
        description: 'Raw materials, work-in-progress, and finished goods tracking',
        entities: ['InventoryItem', 'StockMovement'],
        pages: [
          { name: 'Inventory', path: '/inventory', description: 'Stock levels with low-stock alerts', features: ['search', 'category-filter', 'low-stock-alert', 'reorder-point'] },
          { name: 'Stock Movements', path: '/inventory/movements', description: 'Inbound, outbound, and transfer log', features: ['date-filter', 'type-filter', 'record-movement'] },
        ],
        kpis: ['Total Stock Value', 'Low Stock Items', 'Inventory Turnover'],
      },
      {
        name: 'Quality Control',
        description: 'Inspection checklists, defect tracking, and compliance',
        entities: ['QualityCheck', 'Defect'],
        pages: [
          { name: 'Quality Checks', path: '/quality', description: 'Inspection results and compliance status', features: ['search', 'pass-fail-filter', 'create-check'] },
          { name: 'Defect Tracker', path: '/quality/defects', description: 'Defect log with root cause analysis', features: ['severity-filter', 'trend-chart', 'resolution-tracking'] },
        ],
        kpis: ['Defect Rate', 'First Pass Yield', 'Quality Score'],
      },
      {
        name: 'Supplier Management',
        description: 'Supplier profiles, purchase orders, and receiving',
        entities: ['Supplier', 'PurchaseOrder'],
        pages: [
          { name: 'Suppliers', path: '/suppliers', description: 'Supplier directory with performance ratings', features: ['search', 'rating-filter', 'order-history'] },
          { name: 'Purchase Orders', path: '/purchase-orders', description: 'PO list with status tracking', features: ['search', 'status-filter', 'create-po', 'receive-goods'] },
        ],
        kpis: ['Active Suppliers', 'Avg Lead Time', 'On-Time Delivery %'],
      },
      {
        name: 'Dashboard',
        description: 'Production overview with key metrics',
        entities: [],
        pages: [
          { name: 'Dashboard', path: '/', description: 'Production KPIs, work order status, inventory alerts', features: ['kpi-cards', 'production-chart', 'inventory-alerts', 'quality-trend'] },
        ],
      },
    ],
    entities: [
      {
        name: 'Product',
        fields: [
          { name: 'id', type: 'serial', required: true },
          { name: 'sku', type: 'string', required: true },
          { name: 'name', type: 'string', required: true },
          { name: 'category', type: 'string' },
          { name: 'unitCost', type: 'number' },
          { name: 'sellingPrice', type: 'number' },
          { name: 'status', type: 'enum:active,discontinued', required: true },
        ],
        relationships: [{ entity: 'BOMItem', type: 'one-to-many' }, { entity: 'WorkOrder', type: 'one-to-many' }],
      },
      {
        name: 'BOMItem',
        fields: [
          { name: 'id', type: 'serial', required: true },
          { name: 'productId', type: 'number', required: true },
          { name: 'componentId', type: 'number', required: true },
          { name: 'quantity', type: 'number', required: true },
          { name: 'unit', type: 'string', required: true },
        ],
      },
      {
        name: 'WorkOrder',
        fields: [
          { name: 'id', type: 'serial', required: true },
          { name: 'orderNumber', type: 'string', required: true },
          { name: 'productId', type: 'number', required: true },
          { name: 'quantity', type: 'number', required: true },
          { name: 'status', type: 'enum:planned,in-progress,completed,cancelled', required: true },
          { name: 'priority', type: 'enum:low,normal,high,urgent', required: true },
          { name: 'startDate', type: 'date' },
          { name: 'dueDate', type: 'date', required: true },
          { name: 'completedDate', type: 'date' },
          { name: 'assignedTo', type: 'string' },
        ],
      },
      {
        name: 'InventoryItem',
        fields: [
          { name: 'id', type: 'serial', required: true },
          { name: 'name', type: 'string', required: true },
          { name: 'sku', type: 'string', required: true },
          { name: 'category', type: 'enum:raw-material,work-in-progress,finished-good', required: true },
          { name: 'quantity', type: 'number', required: true },
          { name: 'unit', type: 'string', required: true },
          { name: 'reorderPoint', type: 'number' },
          { name: 'location', type: 'string' },
          { name: 'unitCost', type: 'number' },
        ],
      },
      {
        name: 'StockMovement',
        fields: [
          { name: 'id', type: 'serial', required: true },
          { name: 'inventoryItemId', type: 'number', required: true },
          { name: 'type', type: 'enum:inbound,outbound,transfer,adjustment', required: true },
          { name: 'quantity', type: 'number', required: true },
          { name: 'reference', type: 'string' },
          { name: 'date', type: 'date', required: true },
        ],
      },
      {
        name: 'Supplier',
        fields: [
          { name: 'id', type: 'serial', required: true },
          { name: 'name', type: 'string', required: true },
          { name: 'contactName', type: 'string' },
          { name: 'email', type: 'string' },
          { name: 'phone', type: 'string' },
          { name: 'rating', type: 'number' },
          { name: 'status', type: 'enum:active,inactive', required: true },
        ],
      },
      {
        name: 'PurchaseOrder',
        fields: [
          { name: 'id', type: 'serial', required: true },
          { name: 'poNumber', type: 'string', required: true },
          { name: 'supplierId', type: 'number', required: true },
          { name: 'status', type: 'enum:draft,submitted,confirmed,shipped,received,cancelled', required: true },
          { name: 'totalAmount', type: 'number', required: true },
          { name: 'orderDate', type: 'date', required: true },
          { name: 'expectedDate', type: 'date' },
        ],
      },
      {
        name: 'QualityCheck',
        fields: [
          { name: 'id', type: 'serial', required: true },
          { name: 'workOrderId', type: 'number', required: true },
          { name: 'inspector', type: 'string', required: true },
          { name: 'result', type: 'enum:pass,fail,conditional', required: true },
          { name: 'notes', type: 'string' },
          { name: 'checkDate', type: 'date', required: true },
        ],
      },
      {
        name: 'Defect',
        fields: [
          { name: 'id', type: 'serial', required: true },
          { name: 'workOrderId', type: 'number' },
          { name: 'productId', type: 'number' },
          { name: 'description', type: 'string', required: true },
          { name: 'severity', type: 'enum:minor,major,critical', required: true },
          { name: 'rootCause', type: 'string' },
          { name: 'status', type: 'enum:open,investigating,resolved', required: true },
          { name: 'reportedDate', type: 'date', required: true },
        ],
      },
    ],
    workflows: [
      {
        name: 'Work Order Lifecycle',
        entity: 'WorkOrder',
        states: ['planned', 'in-progress', 'completed', 'cancelled'],
        transitions: [
          { from: 'planned', to: 'in-progress', action: 'Start Production', role: 'supervisor' },
          { from: 'in-progress', to: 'completed', action: 'Mark Complete', role: 'supervisor' },
          { from: 'planned', to: 'cancelled', action: 'Cancel', role: 'manager' },
        ],
      },
      {
        name: 'Purchase Order Flow',
        entity: 'PurchaseOrder',
        states: ['draft', 'submitted', 'confirmed', 'shipped', 'received', 'cancelled'],
        transitions: [
          { from: 'draft', to: 'submitted', action: 'Submit for Approval', role: 'buyer' },
          { from: 'submitted', to: 'confirmed', action: 'Approve', role: 'manager' },
          { from: 'confirmed', to: 'shipped', action: 'Mark Shipped', role: 'supplier' },
          { from: 'shipped', to: 'received', action: 'Receive Goods', role: 'warehouse' },
          { from: 'draft', to: 'cancelled', action: 'Cancel', role: 'buyer' },
        ],
      },
    ],
    roles: [
      { name: 'Admin', permissions: ['all'], description: 'Full system access' },
      { name: 'Production Manager', permissions: ['manage-work-orders', 'view-inventory', 'view-quality', 'manage-schedule'], description: 'Oversees production' },
      { name: 'Warehouse Staff', permissions: ['manage-inventory', 'receive-goods', 'stock-movements'], description: 'Inventory management' },
      { name: 'Quality Inspector', permissions: ['perform-checks', 'log-defects', 'view-work-orders'], description: 'Quality control' },
    ],
    defaultKPIs: ['Production Output', 'Defect Rate', 'Inventory Value', 'On-Time Delivery', 'Equipment Utilization'],
    commonIntegrations: ['ERP Systems', 'Barcode Scanners', 'IoT Sensors'],
  },

  'healthcare': {
    id: 'healthcare',
    name: 'Healthcare / Medical Practice',
    description: 'Patient management, appointments, medical records, and billing',
    keywords: ['healthcare', 'hospital', 'clinic', 'medical', 'doctor', 'patient', 'dental', 'pharmacy', 'health'],
    modules: [
      {
        name: 'Patient Management', description: 'Patient registration, profiles, and medical history', entities: ['Patient', 'MedicalRecord'],
        pages: [
          { name: 'Patients', path: '/patients', description: 'Patient directory with search', features: ['search', 'filter-by-status', 'quick-register'] },
          { name: 'Patient Detail', path: '/patients/:id', description: 'Patient profile, medical history, appointments', features: ['demographics', 'medical-history', 'appointment-list', 'notes'] },
        ],
        kpis: ['Total Patients', 'New Patients This Month', 'Active Patients'],
      },
      {
        name: 'Appointments', description: 'Scheduling, calendar management, and reminders', entities: ['Appointment'],
        pages: [
          { name: 'Calendar', path: '/appointments', description: 'Appointment calendar with day/week/month views', features: ['calendar-view', 'create-appointment', 'drag-reschedule', 'doctor-filter'] },
          { name: 'Appointment List', path: '/appointments/list', description: 'Upcoming and past appointments', features: ['date-filter', 'status-filter', 'check-in'] },
        ],
        kpis: ['Appointments Today', 'No-Show Rate', 'Avg Wait Time'],
      },
      {
        name: 'Billing', description: 'Insurance, payments, and invoicing', entities: ['Bill', 'InsuranceClaim'],
        pages: [
          { name: 'Billing', path: '/billing', description: 'Patient bills and payment tracking', features: ['search', 'status-filter', 'create-bill', 'payment-record'] },
        ],
        kpis: ['Revenue This Month', 'Outstanding Bills', 'Insurance Claims Pending'],
      },
      {
        name: 'Dashboard', description: 'Practice overview', entities: [],
        pages: [{ name: 'Dashboard', path: '/', description: 'Today\'s appointments, patient stats, revenue', features: ['kpi-cards', 'today-schedule', 'revenue-chart'] }],
      },
    ],
    entities: [
      { name: 'Patient', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'firstName', type: 'string', required: true }, { name: 'lastName', type: 'string', required: true },
        { name: 'dateOfBirth', type: 'date', required: true }, { name: 'gender', type: 'string' }, { name: 'phone', type: 'string', required: true },
        { name: 'email', type: 'string' }, { name: 'address', type: 'string' }, { name: 'insuranceProvider', type: 'string' }, { name: 'insuranceNumber', type: 'string' },
        { name: 'status', type: 'enum:active,inactive', required: true },
      ]},
      { name: 'Appointment', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'patientId', type: 'number', required: true }, { name: 'doctorName', type: 'string', required: true },
        { name: 'dateTime', type: 'datetime', required: true }, { name: 'duration', type: 'number', required: true },
        { name: 'type', type: 'enum:consultation,follow-up,procedure,emergency', required: true },
        { name: 'status', type: 'enum:scheduled,checked-in,in-progress,completed,cancelled,no-show', required: true }, { name: 'notes', type: 'string' },
      ]},
      { name: 'MedicalRecord', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'patientId', type: 'number', required: true },
        { name: 'diagnosis', type: 'string' }, { name: 'treatment', type: 'string' }, { name: 'prescription', type: 'string' },
        { name: 'doctorName', type: 'string', required: true }, { name: 'visitDate', type: 'date', required: true }, { name: 'notes', type: 'string' },
      ]},
      { name: 'Bill', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'patientId', type: 'number', required: true },
        { name: 'appointmentId', type: 'number' }, { name: 'amount', type: 'number', required: true },
        { name: 'status', type: 'enum:pending,paid,insurance-submitted,partially-paid', required: true },
        { name: 'issueDate', type: 'date', required: true }, { name: 'description', type: 'string' },
      ]},
    ],
    workflows: [
      { name: 'Appointment Flow', entity: 'Appointment', states: ['scheduled', 'checked-in', 'in-progress', 'completed', 'cancelled', 'no-show'], transitions: [
        { from: 'scheduled', to: 'checked-in', action: 'Check In', role: 'receptionist' },
        { from: 'checked-in', to: 'in-progress', action: 'Start Visit', role: 'doctor' },
        { from: 'in-progress', to: 'completed', action: 'Complete Visit', role: 'doctor' },
        { from: 'scheduled', to: 'cancelled', action: 'Cancel', role: 'receptionist' },
        { from: 'scheduled', to: 'no-show', action: 'Mark No-Show', role: 'receptionist' },
      ]},
    ],
    roles: [
      { name: 'Admin', permissions: ['all'], description: 'Full system access' },
      { name: 'Doctor', permissions: ['view-patients', 'edit-records', 'manage-appointments', 'view-reports'], description: 'Medical professional' },
      { name: 'Receptionist', permissions: ['manage-appointments', 'check-in-patients', 'basic-billing', 'register-patients'], description: 'Front desk staff' },
    ],
    defaultKPIs: ['Patients Today', 'Revenue', 'Appointment Fill Rate', 'Patient Satisfaction'],
    commonIntegrations: ['Insurance APIs', 'Lab Systems', 'Pharmacy Systems'],
  },

  'retail': {
    id: 'retail',
    name: 'Retail / E-Commerce',
    description: 'Product management, sales, inventory, and customer relations',
    keywords: ['retail', 'ecommerce', 'e-commerce', 'store', 'shop', 'marketplace', 'pos', 'point of sale', 'shopping', 'cart', 'checkout'],
    modules: [
      { name: 'Product Catalog', description: 'Product listing, categories, pricing', entities: ['Product', 'Category'], pages: [
        { name: 'Products', path: '/products', description: 'Product grid/list with categories', features: ['search', 'category-filter', 'price-sort', 'add-product'] },
        { name: 'Product Detail', path: '/products/:id', description: 'Product info, variants, pricing, images', features: ['image-gallery', 'variant-management', 'pricing-tiers', 'inventory-status'] },
      ], kpis: ['Total Products', 'Avg Price', 'Out of Stock Items'] },
      { name: 'Order Management', description: 'Orders, fulfillment, and returns', entities: ['Order', 'OrderItem'], pages: [
        { name: 'Orders', path: '/orders', description: 'Order list with status tracking', features: ['search', 'status-filter', 'date-filter', 'export'] },
        { name: 'Order Detail', path: '/orders/:id', description: 'Order items, shipping, payment status', features: ['line-items', 'shipping-tracker', 'payment-status', 'refund'] },
      ], kpis: ['Orders Today', 'Revenue', 'Avg Order Value'] },
      { name: 'Inventory', description: 'Stock tracking across locations', entities: ['InventoryItem'], pages: [
        { name: 'Inventory', path: '/inventory', description: 'Stock levels with alerts', features: ['search', 'low-stock-alert', 'location-filter', 'adjust-stock'] },
      ], kpis: ['Total Stock Value', 'Low Stock Items', 'Inventory Turnover'] },
      { name: 'Customers', description: 'Customer profiles and purchase history', entities: ['Customer'], pages: [
        { name: 'Customers', path: '/customers', description: 'Customer directory with purchase stats', features: ['search', 'segment-filter', 'lifetime-value'] },
        { name: 'Customer Detail', path: '/customers/:id', description: 'Profile, order history, notes', features: ['profile-info', 'order-history', 'notes', 'loyalty-points'] },
      ], kpis: ['Total Customers', 'Repeat Rate', 'Avg Lifetime Value'] },
      { name: 'Dashboard', description: 'Sales overview', entities: [], pages: [
        { name: 'Dashboard', path: '/', description: 'Sales KPIs, revenue chart, top products, recent orders', features: ['kpi-cards', 'revenue-chart', 'top-products', 'recent-orders'] },
      ] },
    ],
    entities: [
      { name: 'Product', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true }, { name: 'sku', type: 'string', required: true },
        { name: 'description', type: 'string' }, { name: 'price', type: 'number', required: true }, { name: 'compareAtPrice', type: 'number' },
        { name: 'categoryId', type: 'number' }, { name: 'imageUrl', type: 'string' }, { name: 'stock', type: 'number', required: true },
        { name: 'status', type: 'enum:active,draft,archived', required: true },
      ]},
      { name: 'Category', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true }, { name: 'parentId', type: 'number' },
      ]},
      { name: 'Order', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'orderNumber', type: 'string', required: true }, { name: 'customerId', type: 'number', required: true },
        { name: 'status', type: 'enum:pending,confirmed,processing,shipped,delivered,cancelled,refunded', required: true },
        { name: 'totalAmount', type: 'number', required: true }, { name: 'shippingAddress', type: 'string' },
        { name: 'paymentMethod', type: 'string' }, { name: 'orderDate', type: 'date', required: true },
      ]},
      { name: 'OrderItem', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'orderId', type: 'number', required: true }, { name: 'productId', type: 'number', required: true },
        { name: 'quantity', type: 'number', required: true }, { name: 'unitPrice', type: 'number', required: true },
      ]},
      { name: 'Customer', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true }, { name: 'email', type: 'string', required: true },
        { name: 'phone', type: 'string' }, { name: 'address', type: 'string' }, { name: 'totalOrders', type: 'number' }, { name: 'totalSpent', type: 'number' },
        { name: 'status', type: 'enum:active,inactive', required: true },
      ]},
      { name: 'InventoryItem', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'productId', type: 'number', required: true }, { name: 'location', type: 'string' },
        { name: 'quantity', type: 'number', required: true }, { name: 'reorderPoint', type: 'number' },
      ]},
    ],
    workflows: [
      { name: 'Order Fulfillment', entity: 'Order', states: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'], transitions: [
        { from: 'pending', to: 'confirmed', action: 'Confirm Order', role: 'staff' },
        { from: 'confirmed', to: 'processing', action: 'Process', role: 'warehouse' },
        { from: 'processing', to: 'shipped', action: 'Ship', role: 'warehouse' },
        { from: 'shipped', to: 'delivered', action: 'Mark Delivered', role: 'system' },
        { from: 'pending', to: 'cancelled', action: 'Cancel', role: 'staff' },
        { from: 'delivered', to: 'refunded', action: 'Refund', role: 'admin' },
      ]},
    ],
    roles: [
      { name: 'Admin', permissions: ['all'], description: 'Full system access' },
      { name: 'Store Manager', permissions: ['manage-products', 'view-orders', 'manage-inventory', 'view-reports', 'manage-customers'], description: 'Store operations' },
      { name: 'Staff', permissions: ['view-products', 'process-orders', 'view-customers'], description: 'Sales and support' },
    ],
    defaultKPIs: ['Revenue Today', 'Orders', 'Avg Order Value', 'Conversion Rate', 'Top Products'],
    commonIntegrations: ['Stripe', 'Shipping APIs', 'Analytics'],
  },

  'education': {
    id: 'education',
    name: 'Education / Learning Management',
    description: 'Student management, courses, grades, and attendance tracking',
    keywords: ['education', 'school', 'university', 'college', 'lms', 'learning', 'student', 'teacher', 'course', 'classroom', 'training', 'academy'],
    modules: [
      { name: 'Student Management', description: 'Student enrollment, profiles, and records', entities: ['Student'], pages: [
        { name: 'Students', path: '/students', description: 'Student directory', features: ['search', 'grade-filter', 'enrollment-status'] },
        { name: 'Student Profile', path: '/students/:id', description: 'Student info, grades, attendance', features: ['demographics', 'grade-history', 'attendance-record', 'notes'] },
      ], kpis: ['Total Students', 'New Enrollments', 'Retention Rate'] },
      { name: 'Course Management', description: 'Courses, curriculum, and scheduling', entities: ['Course', 'Enrollment'], pages: [
        { name: 'Courses', path: '/courses', description: 'Course catalog', features: ['search', 'department-filter', 'semester-filter', 'create-course'] },
        { name: 'Course Detail', path: '/courses/:id', description: 'Course info, enrolled students, assignments', features: ['syllabus', 'student-list', 'assignment-list', 'grades'] },
      ], kpis: ['Active Courses', 'Avg Class Size', 'Course Completion Rate'] },
      { name: 'Grades & Assignments', description: 'Grade tracking and assignment management', entities: ['Assignment', 'Grade'], pages: [
        { name: 'Gradebook', path: '/gradebook', description: 'Grade entry and reporting', features: ['course-selector', 'grade-entry', 'gpa-calculation', 'export'] },
      ], kpis: ['Average GPA', 'Pass Rate', 'Assignments Due'] },
      { name: 'Attendance', description: 'Daily attendance tracking', entities: ['AttendanceRecord'], pages: [
        { name: 'Attendance', path: '/attendance', description: 'Mark and view attendance', features: ['date-picker', 'course-selector', 'bulk-mark', 'absence-report'] },
      ], kpis: ['Attendance Rate', 'Absent Today', 'Chronic Absentees'] },
      { name: 'Dashboard', description: 'Academic overview', entities: [], pages: [
        { name: 'Dashboard', path: '/', description: 'Student stats, attendance, upcoming schedule', features: ['kpi-cards', 'attendance-chart', 'upcoming-classes', 'recent-grades'] },
      ] },
    ],
    entities: [
      { name: 'Student', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'firstName', type: 'string', required: true }, { name: 'lastName', type: 'string', required: true },
        { name: 'email', type: 'string', required: true }, { name: 'grade', type: 'string' }, { name: 'enrollmentDate', type: 'date', required: true },
        { name: 'status', type: 'enum:active,graduated,withdrawn,suspended', required: true },
      ]},
      { name: 'Course', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'code', type: 'string', required: true }, { name: 'name', type: 'string', required: true },
        { name: 'instructor', type: 'string', required: true }, { name: 'department', type: 'string' }, { name: 'semester', type: 'string' },
        { name: 'capacity', type: 'number' }, { name: 'schedule', type: 'string' }, { name: 'status', type: 'enum:active,completed,upcoming', required: true },
      ]},
      { name: 'Enrollment', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'studentId', type: 'number', required: true }, { name: 'courseId', type: 'number', required: true },
        { name: 'enrolledDate', type: 'date', required: true }, { name: 'grade', type: 'string' },
      ]},
      { name: 'Assignment', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'courseId', type: 'number', required: true }, { name: 'title', type: 'string', required: true },
        { name: 'description', type: 'string' }, { name: 'dueDate', type: 'date', required: true }, { name: 'maxScore', type: 'number', required: true },
      ]},
      { name: 'Grade', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'studentId', type: 'number', required: true }, { name: 'assignmentId', type: 'number', required: true },
        { name: 'score', type: 'number', required: true }, { name: 'feedback', type: 'string' }, { name: 'gradedDate', type: 'date', required: true },
      ]},
      { name: 'AttendanceRecord', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'studentId', type: 'number', required: true }, { name: 'courseId', type: 'number', required: true },
        { name: 'date', type: 'date', required: true }, { name: 'status', type: 'enum:present,absent,late,excused', required: true },
      ]},
    ],
    workflows: [],
    roles: [
      { name: 'Admin', permissions: ['all'], description: 'Full system access' },
      { name: 'Teacher', permissions: ['manage-courses', 'grade-students', 'take-attendance', 'view-students'], description: 'Instructor' },
      { name: 'Student', permissions: ['view-courses', 'view-grades', 'view-assignments', 'view-attendance'], description: 'Enrolled student' },
    ],
    defaultKPIs: ['Total Students', 'Active Courses', 'Average GPA', 'Attendance Rate'],
    commonIntegrations: ['Google Classroom', 'Zoom', 'Canvas'],
  },

  'realestate': {
    id: 'realestate',
    name: 'Real Estate / Property Management',
    description: 'Property listings, tenant management, leases, and maintenance',
    keywords: ['real estate', 'property', 'rental', 'tenant', 'lease', 'landlord', 'apartment', 'housing', 'realtor', 'listing', 'mortgage'],
    modules: [
      { name: 'Properties', description: 'Property listings and details', entities: ['Property'], pages: [
        { name: 'Properties', path: '/properties', description: 'Property list with filters', features: ['search', 'type-filter', 'status-filter', 'map-view', 'add-property'] },
        { name: 'Property Detail', path: '/properties/:id', description: 'Property info, units, tenants, maintenance', features: ['gallery', 'unit-list', 'tenant-info', 'maintenance-log', 'financials'] },
      ], kpis: ['Total Properties', 'Occupancy Rate', 'Avg Rent'] },
      { name: 'Tenants', description: 'Tenant profiles and lease management', entities: ['Tenant', 'Lease'], pages: [
        { name: 'Tenants', path: '/tenants', description: 'Tenant directory', features: ['search', 'property-filter', 'lease-status-filter'] },
        { name: 'Lease Management', path: '/leases', description: 'Active and expiring leases', features: ['expiry-alerts', 'renewal-tracking', 'create-lease'] },
      ], kpis: ['Total Tenants', 'Lease Expiring Soon', 'Avg Lease Term'] },
      { name: 'Maintenance', description: 'Work order and repair tracking', entities: ['MaintenanceRequest'], pages: [
        { name: 'Maintenance', path: '/maintenance', description: 'Work orders and requests', features: ['search', 'priority-filter', 'status-filter', 'create-request', 'assign'] },
      ], kpis: ['Open Requests', 'Avg Resolution Time', 'Costs This Month'] },
      { name: 'Financials', description: 'Rent collection, expenses, and reporting', entities: ['RentPayment', 'Expense'], pages: [
        { name: 'Rent Collection', path: '/rent', description: 'Rent payment tracking', features: ['property-filter', 'overdue-highlight', 'record-payment'] },
        { name: 'Expenses', path: '/expenses', description: 'Property expenses and P&L', features: ['category-filter', 'property-filter', 'add-expense', 'summary-report'] },
      ], kpis: ['Rent Collected', 'Outstanding Rent', 'Net Operating Income'] },
      { name: 'Dashboard', description: 'Portfolio overview', entities: [], pages: [
        { name: 'Dashboard', path: '/', description: 'Portfolio KPIs, occupancy, revenue, maintenance', features: ['kpi-cards', 'occupancy-chart', 'revenue-chart', 'maintenance-queue'] },
      ] },
    ],
    entities: [
      { name: 'Property', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true }, { name: 'address', type: 'string', required: true },
        { name: 'type', type: 'enum:apartment,house,commercial,condo,townhouse', required: true }, { name: 'units', type: 'number' },
        { name: 'status', type: 'enum:available,occupied,maintenance,sold', required: true }, { name: 'monthlyRent', type: 'number' }, { name: 'purchasePrice', type: 'number' },
      ]},
      { name: 'Tenant', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true }, { name: 'email', type: 'string', required: true },
        { name: 'phone', type: 'string', required: true }, { name: 'propertyId', type: 'number', required: true },
        { name: 'leaseStart', type: 'date', required: true }, { name: 'leaseEnd', type: 'date', required: true },
        { name: 'monthlyRent', type: 'number', required: true }, { name: 'status', type: 'enum:active,past,pending', required: true },
      ]},
      { name: 'Lease', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'tenantId', type: 'number', required: true }, { name: 'propertyId', type: 'number', required: true },
        { name: 'startDate', type: 'date', required: true }, { name: 'endDate', type: 'date', required: true },
        { name: 'monthlyRent', type: 'number', required: true }, { name: 'securityDeposit', type: 'number' },
        { name: 'status', type: 'enum:active,expired,terminated,pending-renewal', required: true },
      ]},
      { name: 'MaintenanceRequest', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'propertyId', type: 'number', required: true }, { name: 'tenantId', type: 'number' },
        { name: 'title', type: 'string', required: true }, { name: 'description', type: 'string' },
        { name: 'priority', type: 'enum:low,medium,high,emergency', required: true },
        { name: 'status', type: 'enum:open,assigned,in-progress,completed', required: true },
        { name: 'assignedTo', type: 'string' }, { name: 'cost', type: 'number' }, { name: 'reportedDate', type: 'date', required: true },
      ]},
      { name: 'RentPayment', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'tenantId', type: 'number', required: true }, { name: 'amount', type: 'number', required: true },
        { name: 'paymentDate', type: 'date', required: true }, { name: 'forMonth', type: 'string', required: true },
        { name: 'status', type: 'enum:paid,partial,overdue', required: true },
      ]},
      { name: 'Expense', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'propertyId', type: 'number', required: true },
        { name: 'category', type: 'enum:maintenance,insurance,tax,utility,mortgage,other', required: true },
        { name: 'amount', type: 'number', required: true }, { name: 'date', type: 'date', required: true }, { name: 'description', type: 'string' },
      ]},
    ],
    workflows: [
      { name: 'Maintenance Flow', entity: 'MaintenanceRequest', states: ['open', 'assigned', 'in-progress', 'completed'], transitions: [
        { from: 'open', to: 'assigned', action: 'Assign', role: 'manager' },
        { from: 'assigned', to: 'in-progress', action: 'Start Work', role: 'maintenance' },
        { from: 'in-progress', to: 'completed', action: 'Complete', role: 'maintenance' },
      ]},
    ],
    roles: [
      { name: 'Admin', permissions: ['all'], description: 'Full system access' },
      { name: 'Property Manager', permissions: ['manage-properties', 'manage-tenants', 'manage-leases', 'view-financials', 'manage-maintenance'], description: 'Property management' },
      { name: 'Tenant', permissions: ['view-lease', 'submit-maintenance', 'view-payments'], description: 'Tenant portal access' },
    ],
    defaultKPIs: ['Occupancy Rate', 'Monthly Revenue', 'Outstanding Rent', 'Open Maintenance Requests'],
    commonIntegrations: ['Stripe', 'Zillow API', 'Google Maps'],
  },

  'hr': {
    id: 'hr',
    name: 'Human Resources / People Management',
    description: 'Employee lifecycle, payroll, leave management, and recruitment',
    keywords: ['hr', 'human resources', 'people', 'payroll', 'leave', 'recruitment', 'hiring', 'onboarding', 'employee management', 'workforce'],
    modules: [
      { name: 'Employee Directory', description: 'Employee profiles and org structure', entities: ['Employee', 'Department'], pages: [
        { name: 'Employees', path: '/employees', description: 'Employee directory with org chart', features: ['search', 'department-filter', 'role-filter', 'org-chart-view'] },
        { name: 'Employee Detail', path: '/employees/:id', description: 'Full employee profile', features: ['personal-info', 'employment-details', 'documents', 'leave-balance', 'performance'] },
      ], kpis: ['Total Employees', 'New Hires This Month', 'Turnover Rate'] },
      { name: 'Leave Management', description: 'Leave requests, approvals, and balances', entities: ['LeaveRequest', 'LeaveBalance'], pages: [
        { name: 'Leave Calendar', path: '/leave', description: 'Team leave calendar and requests', features: ['calendar-view', 'request-leave', 'team-view', 'balance-display'] },
        { name: 'Leave Approvals', path: '/leave/approvals', description: 'Pending leave requests', features: ['pending-list', 'approve-reject', 'comment'] },
      ], kpis: ['Pending Requests', 'On Leave Today', 'Avg Leave Balance'] },
      { name: 'Payroll', description: 'Salary processing and pay slip generation', entities: ['PayrollRun', 'PaySlip'], pages: [
        { name: 'Payroll', path: '/payroll', description: 'Monthly payroll processing', features: ['month-selector', 'run-payroll', 'review-adjustments', 'generate-payslips'] },
        { name: 'Pay Slips', path: '/payroll/slips', description: 'Employee pay slip history', features: ['employee-search', 'month-filter', 'download-pdf'] },
      ], kpis: ['Total Payroll Cost', 'Avg Salary', 'Payroll Processed'] },
      { name: 'Recruitment', description: 'Job postings, applicants, and hiring pipeline', entities: ['JobPosting', 'Applicant'], pages: [
        { name: 'Job Postings', path: '/recruitment', description: 'Open positions and pipeline', features: ['create-posting', 'status-filter', 'applicant-count'] },
        { name: 'Applicant Tracker', path: '/recruitment/:id/applicants', description: 'Kanban pipeline for applicants', features: ['kanban-board', 'schedule-interview', 'notes', 'status-update'] },
      ], kpis: ['Open Positions', 'Applicants This Week', 'Avg Time to Hire'] },
      { name: 'Dashboard', description: 'HR overview', entities: [], pages: [
        { name: 'Dashboard', path: '/', description: 'Workforce metrics and alerts', features: ['kpi-cards', 'headcount-chart', 'leave-calendar-mini', 'upcoming-birthdays', 'recent-hires'] },
      ] },
    ],
    entities: [
      { name: 'Employee', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'firstName', type: 'string', required: true }, { name: 'lastName', type: 'string', required: true },
        { name: 'email', type: 'string', required: true }, { name: 'phone', type: 'string' }, { name: 'departmentId', type: 'number', required: true },
        { name: 'position', type: 'string', required: true }, { name: 'salary', type: 'number' }, { name: 'hireDate', type: 'date', required: true },
        { name: 'managerId', type: 'number' }, { name: 'status', type: 'enum:active,on-leave,terminated,probation', required: true },
      ]},
      { name: 'Department', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true }, { name: 'headId', type: 'number' }, { name: 'budget', type: 'number' },
      ]},
      { name: 'LeaveRequest', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'employeeId', type: 'number', required: true },
        { name: 'type', type: 'enum:vacation,sick,personal,maternity,paternity,unpaid', required: true },
        { name: 'startDate', type: 'date', required: true }, { name: 'endDate', type: 'date', required: true }, { name: 'days', type: 'number', required: true },
        { name: 'reason', type: 'string' }, { name: 'status', type: 'enum:pending,approved,rejected,cancelled', required: true },
      ]},
      { name: 'LeaveBalance', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'employeeId', type: 'number', required: true },
        { name: 'type', type: 'string', required: true }, { name: 'total', type: 'number', required: true },
        { name: 'used', type: 'number', required: true }, { name: 'remaining', type: 'number', required: true },
      ]},
      { name: 'PayrollRun', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'month', type: 'string', required: true }, { name: 'year', type: 'number', required: true },
        { name: 'totalAmount', type: 'number', required: true }, { name: 'employeeCount', type: 'number', required: true },
        { name: 'status', type: 'enum:draft,processing,completed', required: true }, { name: 'processedDate', type: 'date' },
      ]},
      { name: 'PaySlip', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'payrollRunId', type: 'number', required: true }, { name: 'employeeId', type: 'number', required: true },
        { name: 'baseSalary', type: 'number', required: true }, { name: 'deductions', type: 'number' }, { name: 'bonuses', type: 'number' },
        { name: 'netPay', type: 'number', required: true },
      ]},
      { name: 'JobPosting', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'title', type: 'string', required: true }, { name: 'departmentId', type: 'number' },
        { name: 'description', type: 'string', required: true }, { name: 'requirements', type: 'string' },
        { name: 'salaryRange', type: 'string' }, { name: 'status', type: 'enum:open,closed,on-hold', required: true },
      ]},
      { name: 'Applicant', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'jobPostingId', type: 'number', required: true }, { name: 'name', type: 'string', required: true },
        { name: 'email', type: 'string', required: true }, { name: 'phone', type: 'string' }, { name: 'resumeUrl', type: 'string' },
        { name: 'stage', type: 'enum:applied,screening,interview,offer,hired,rejected', required: true }, { name: 'notes', type: 'string' },
      ]},
    ],
    workflows: [
      { name: 'Leave Approval', entity: 'LeaveRequest', states: ['pending', 'approved', 'rejected', 'cancelled'], transitions: [
        { from: 'pending', to: 'approved', action: 'Approve', role: 'manager' },
        { from: 'pending', to: 'rejected', action: 'Reject', role: 'manager' },
        { from: 'pending', to: 'cancelled', action: 'Cancel', role: 'employee' },
      ]},
      { name: 'Hiring Pipeline', entity: 'Applicant', states: ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'], transitions: [
        { from: 'applied', to: 'screening', action: 'Screen', role: 'hr' },
        { from: 'screening', to: 'interview', action: 'Schedule Interview', role: 'hr' },
        { from: 'interview', to: 'offer', action: 'Extend Offer', role: 'hr' },
        { from: 'offer', to: 'hired', action: 'Accept Offer', role: 'candidate' },
        { from: 'screening', to: 'rejected', action: 'Reject', role: 'hr' },
        { from: 'interview', to: 'rejected', action: 'Reject', role: 'hr' },
      ]},
    ],
    roles: [
      { name: 'Admin', permissions: ['all'], description: 'Full system access' },
      { name: 'HR Manager', permissions: ['manage-employees', 'manage-leave', 'run-payroll', 'manage-recruitment', 'view-reports'], description: 'HR operations' },
      { name: 'Manager', permissions: ['view-team', 'approve-leave', 'view-attendance'], description: 'Team manager' },
      { name: 'Employee', permissions: ['view-profile', 'request-leave', 'view-payslips', 'view-attendance'], description: 'Self-service' },
    ],
    defaultKPIs: ['Headcount', 'Turnover Rate', 'Pending Leave Requests', 'Open Positions', 'Payroll Cost'],
    commonIntegrations: ['Slack', 'Google Workspace', 'LinkedIn'],
  },

  'restaurant': {
    id: 'restaurant',
    name: 'Restaurant / Food Service',
    description: 'Menu management, orders, table reservations, and kitchen operations',
    keywords: ['restaurant', 'food', 'cafe', 'bakery', 'catering', 'kitchen', 'menu', 'reservation', 'table', 'dining', 'bar', 'takeaway', 'delivery'],
    modules: [
      { name: 'Menu Management', description: 'Menu items, categories, and pricing', entities: ['MenuItem', 'MenuCategory'], pages: [
        { name: 'Menu', path: '/menu', description: 'Menu items organized by category', features: ['search', 'category-filter', 'add-item', 'toggle-availability', 'price-edit'] },
      ], kpis: ['Total Items', 'Avg Price', 'Items Unavailable'] },
      { name: 'Orders', description: 'Order management for dine-in, takeaway, delivery', entities: ['Order', 'OrderItem'], pages: [
        { name: 'Active Orders', path: '/orders', description: 'Live order queue with kitchen status', features: ['order-queue', 'status-update', 'order-type-filter', 'timer'] },
        { name: 'Order History', path: '/orders/history', description: 'Past orders with analytics', features: ['date-filter', 'type-filter', 'export'] },
      ], kpis: ['Orders Today', 'Revenue Today', 'Avg Order Time'] },
      { name: 'Reservations', description: 'Table booking and floor management', entities: ['Reservation', 'Table'], pages: [
        { name: 'Reservations', path: '/reservations', description: 'Reservation calendar and floor plan', features: ['calendar-view', 'create-reservation', 'floor-plan', 'waitlist'] },
      ], kpis: ['Reservations Today', 'Table Occupancy', 'No-Shows'] },
      { name: 'Dashboard', description: 'Restaurant overview', entities: [], pages: [
        { name: 'Dashboard', path: '/', description: 'Daily sales, active orders, popular items', features: ['kpi-cards', 'sales-chart', 'popular-items', 'active-orders-count'] },
      ] },
    ],
    entities: [
      { name: 'MenuItem', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true }, { name: 'description', type: 'string' },
        { name: 'price', type: 'number', required: true }, { name: 'categoryId', type: 'number', required: true },
        { name: 'imageUrl', type: 'string' }, { name: 'available', type: 'boolean', required: true },
        { name: 'allergens', type: 'string[]' }, { name: 'prepTime', type: 'number' },
      ]},
      { name: 'MenuCategory', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true }, { name: 'sortOrder', type: 'number' },
      ]},
      { name: 'Order', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'orderNumber', type: 'string', required: true },
        { name: 'type', type: 'enum:dine-in,takeaway,delivery', required: true }, { name: 'tableId', type: 'number' },
        { name: 'status', type: 'enum:received,preparing,ready,served,completed,cancelled', required: true },
        { name: 'totalAmount', type: 'number', required: true }, { name: 'customerName', type: 'string' },
      ]},
      { name: 'OrderItem', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'orderId', type: 'number', required: true }, { name: 'menuItemId', type: 'number', required: true },
        { name: 'quantity', type: 'number', required: true }, { name: 'specialNotes', type: 'string' }, { name: 'unitPrice', type: 'number', required: true },
      ]},
      { name: 'Reservation', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'customerName', type: 'string', required: true }, { name: 'phone', type: 'string', required: true },
        { name: 'date', type: 'date', required: true }, { name: 'time', type: 'string', required: true }, { name: 'partySize', type: 'number', required: true },
        { name: 'tableId', type: 'number' }, { name: 'status', type: 'enum:confirmed,seated,completed,cancelled,no-show', required: true }, { name: 'notes', type: 'string' },
      ]},
      { name: 'Table', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'number', type: 'number', required: true }, { name: 'capacity', type: 'number', required: true },
        { name: 'status', type: 'enum:available,occupied,reserved,cleaning', required: true }, { name: 'section', type: 'string' },
      ]},
    ],
    workflows: [
      { name: 'Order Flow', entity: 'Order', states: ['received', 'preparing', 'ready', 'served', 'completed', 'cancelled'], transitions: [
        { from: 'received', to: 'preparing', action: 'Start Preparing', role: 'kitchen' },
        { from: 'preparing', to: 'ready', action: 'Mark Ready', role: 'kitchen' },
        { from: 'ready', to: 'served', action: 'Serve', role: 'server' },
        { from: 'served', to: 'completed', action: 'Complete', role: 'server' },
        { from: 'received', to: 'cancelled', action: 'Cancel', role: 'manager' },
      ]},
    ],
    roles: [
      { name: 'Admin', permissions: ['all'], description: 'Full system access' },
      { name: 'Manager', permissions: ['manage-menu', 'view-orders', 'manage-reservations', 'view-reports'], description: 'Restaurant manager' },
      { name: 'Server', permissions: ['create-orders', 'update-orders', 'view-reservations'], description: 'Wait staff' },
      { name: 'Kitchen', permissions: ['view-orders', 'update-order-status'], description: 'Kitchen staff' },
    ],
    defaultKPIs: ['Revenue Today', 'Orders Today', 'Table Occupancy', 'Avg Order Value', 'Popular Items'],
    commonIntegrations: ['POS Systems', 'Delivery Platforms', 'Payment Gateways'],
  },

  'fitness': {
    id: 'fitness',
    name: 'Fitness / Gym Management',
    description: 'Member management, class scheduling, workout tracking, and billing',
    keywords: ['gym', 'fitness', 'workout', 'exercise', 'training', 'yoga', 'crossfit', 'personal trainer', 'membership', 'health club'],
    modules: [
      { name: 'Members', description: 'Member profiles and subscriptions', entities: ['Member', 'Membership'], pages: [
        { name: 'Members', path: '/members', description: 'Member directory', features: ['search', 'membership-filter', 'status-filter', 'check-in'] },
        { name: 'Member Detail', path: '/members/:id', description: 'Profile, membership, attendance history', features: ['profile-info', 'membership-status', 'attendance-log', 'payment-history'] },
      ], kpis: ['Total Members', 'Active Members', 'New This Month'] },
      { name: 'Classes', description: 'Group class scheduling and booking', entities: ['Class', 'ClassBooking'], pages: [
        { name: 'Schedule', path: '/classes', description: 'Weekly class schedule', features: ['week-view', 'instructor-filter', 'class-type-filter', 'book-spot'] },
      ], kpis: ['Classes This Week', 'Avg Attendance', 'Most Popular Class'] },
      { name: 'Workouts', description: 'Workout plans and tracking', entities: ['WorkoutPlan', 'WorkoutLog'], pages: [
        { name: 'Workout Plans', path: '/workouts', description: 'Workout plan library', features: ['search', 'difficulty-filter', 'create-plan'] },
        { name: 'Workout Tracker', path: '/workouts/log', description: 'Log workout sessions', features: ['exercise-entry', 'sets-reps-weight', 'timer', 'history'] },
      ], kpis: ['Workouts This Week', 'Avg Session Duration', 'Most Active Members'] },
      { name: 'Dashboard', description: 'Gym overview', entities: [], pages: [
        { name: 'Dashboard', path: '/', description: 'Membership stats, check-ins today, upcoming classes', features: ['kpi-cards', 'check-in-chart', 'upcoming-classes', 'revenue-chart'] },
      ] },
    ],
    entities: [
      { name: 'Member', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'firstName', type: 'string', required: true }, { name: 'lastName', type: 'string', required: true },
        { name: 'email', type: 'string', required: true }, { name: 'phone', type: 'string' }, { name: 'dateOfBirth', type: 'date' },
        { name: 'membershipId', type: 'number' }, { name: 'joinDate', type: 'date', required: true },
        { name: 'status', type: 'enum:active,expired,frozen,cancelled', required: true },
      ]},
      { name: 'Membership', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true }, { name: 'price', type: 'number', required: true },
        { name: 'duration', type: 'string', required: true }, { name: 'features', type: 'string[]' },
      ]},
      { name: 'Class', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true }, { name: 'instructor', type: 'string', required: true },
        { name: 'dayOfWeek', type: 'string', required: true }, { name: 'time', type: 'string', required: true },
        { name: 'duration', type: 'number', required: true }, { name: 'capacity', type: 'number', required: true }, { name: 'type', type: 'string' },
      ]},
      { name: 'ClassBooking', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'classId', type: 'number', required: true }, { name: 'memberId', type: 'number', required: true },
        { name: 'date', type: 'date', required: true }, { name: 'status', type: 'enum:booked,attended,cancelled,no-show', required: true },
      ]},
      { name: 'WorkoutPlan', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true }, { name: 'description', type: 'string' },
        { name: 'difficulty', type: 'enum:beginner,intermediate,advanced', required: true }, { name: 'exercises', type: 'string[]' },
      ]},
      { name: 'WorkoutLog', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'memberId', type: 'number', required: true },
        { name: 'exercise', type: 'string', required: true }, { name: 'sets', type: 'number' }, { name: 'reps', type: 'number' },
        { name: 'weight', type: 'number' }, { name: 'duration', type: 'number' }, { name: 'date', type: 'date', required: true },
      ]},
    ],
    workflows: [],
    roles: [
      { name: 'Admin', permissions: ['all'], description: 'Full system access' },
      { name: 'Trainer', permissions: ['view-members', 'manage-classes', 'create-workout-plans', 'view-schedules'], description: 'Personal trainer or instructor' },
      { name: 'Member', permissions: ['view-profile', 'book-classes', 'log-workouts', 'view-plans'], description: 'Gym member' },
    ],
    defaultKPIs: ['Active Members', 'Check-ins Today', 'Revenue', 'Class Attendance Rate'],
    commonIntegrations: ['Stripe', 'Mindbody', 'Google Calendar'],
  },

  'logistics': {
    id: 'logistics',
    name: 'Logistics / Supply Chain',
    description: 'Shipment tracking, warehouse management, fleet operations, and delivery',
    keywords: ['logistics', 'supply chain', 'shipping', 'freight', 'warehouse', 'delivery', 'fleet', 'transport', 'distribution', 'courier', 'trucking'],
    modules: [
      { name: 'Shipments', description: 'Shipment tracking and management', entities: ['Shipment'], pages: [
        { name: 'Shipments', path: '/shipments', description: 'All shipments with tracking', features: ['search', 'status-filter', 'origin-destination-filter', 'create-shipment'] },
        { name: 'Shipment Detail', path: '/shipments/:id', description: 'Tracking timeline, documents, updates', features: ['tracking-timeline', 'status-updates', 'documents', 'cost-breakdown'] },
      ], kpis: ['Active Shipments', 'On-Time Rate', 'Avg Transit Time'] },
      { name: 'Warehouse', description: 'Inventory and warehouse operations', entities: ['WarehouseItem', 'Location'], pages: [
        { name: 'Warehouse', path: '/warehouse', description: 'Inventory by location', features: ['search', 'location-filter', 'stock-alerts', 'receive-dispatch'] },
      ], kpis: ['Total Items', 'Warehouse Utilization', 'Items to Ship'] },
      { name: 'Fleet', description: 'Vehicle and driver management', entities: ['Vehicle', 'Driver'], pages: [
        { name: 'Fleet', path: '/fleet', description: 'Vehicle list with status and assignment', features: ['search', 'status-filter', 'maintenance-alerts', 'assign-driver'] },
      ], kpis: ['Active Vehicles', 'Avg Mileage', 'Maintenance Due'] },
      { name: 'Dashboard', description: 'Operations overview', entities: [], pages: [
        { name: 'Dashboard', path: '/', description: 'Shipment status, fleet status, delivery performance', features: ['kpi-cards', 'shipment-map', 'delivery-chart', 'alerts'] },
      ] },
    ],
    entities: [
      { name: 'Shipment', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'trackingNumber', type: 'string', required: true },
        { name: 'origin', type: 'string', required: true }, { name: 'destination', type: 'string', required: true },
        { name: 'status', type: 'enum:booked,picked-up,in-transit,out-for-delivery,delivered,exception', required: true },
        { name: 'weight', type: 'number' }, { name: 'cost', type: 'number' }, { name: 'estimatedDelivery', type: 'date' },
        { name: 'actualDelivery', type: 'date' }, { name: 'vehicleId', type: 'number' }, { name: 'driverId', type: 'number' },
      ]},
      { name: 'Vehicle', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'plateNumber', type: 'string', required: true }, { name: 'type', type: 'string', required: true },
        { name: 'capacity', type: 'number' }, { name: 'status', type: 'enum:available,on-route,maintenance,retired', required: true },
        { name: 'mileage', type: 'number' }, { name: 'lastService', type: 'date' },
      ]},
      { name: 'Driver', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true }, { name: 'phone', type: 'string', required: true },
        { name: 'licenseNumber', type: 'string', required: true }, { name: 'vehicleId', type: 'number' },
        { name: 'status', type: 'enum:available,on-route,off-duty', required: true },
      ]},
      { name: 'WarehouseItem', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true }, { name: 'sku', type: 'string', required: true },
        { name: 'quantity', type: 'number', required: true }, { name: 'location', type: 'string' }, { name: 'weight', type: 'number' },
      ]},
    ],
    workflows: [
      { name: 'Shipment Tracking', entity: 'Shipment', states: ['booked', 'picked-up', 'in-transit', 'out-for-delivery', 'delivered', 'exception'], transitions: [
        { from: 'booked', to: 'picked-up', action: 'Pick Up', role: 'driver' },
        { from: 'picked-up', to: 'in-transit', action: 'In Transit', role: 'system' },
        { from: 'in-transit', to: 'out-for-delivery', action: 'Out for Delivery', role: 'driver' },
        { from: 'out-for-delivery', to: 'delivered', action: 'Deliver', role: 'driver' },
        { from: 'in-transit', to: 'exception', action: 'Report Issue', role: 'driver' },
      ]},
    ],
    roles: [
      { name: 'Admin', permissions: ['all'], description: 'Full system access' },
      { name: 'Dispatcher', permissions: ['manage-shipments', 'assign-drivers', 'view-fleet', 'view-warehouse'], description: 'Operations coordinator' },
      { name: 'Driver', permissions: ['view-assigned-shipments', 'update-status', 'view-route'], description: 'Delivery driver' },
      { name: 'Warehouse Staff', permissions: ['manage-warehouse', 'receive-dispatch', 'view-shipments'], description: 'Warehouse operations' },
    ],
    defaultKPIs: ['Active Shipments', 'On-Time Delivery %', 'Fleet Utilization', 'Warehouse Capacity'],
    commonIntegrations: ['Google Maps', 'GPS Tracking', 'Shipping APIs'],
  },

  'finance': {
    id: 'finance',
    name: 'Finance / Accounting',
    description: 'Budgeting, expense tracking, invoicing, and financial reporting',
    keywords: ['finance', 'accounting', 'budget', 'expense', 'invoice', 'bookkeeping', 'ledger', 'tax', 'financial', 'money', 'accounts'],
    modules: [
      { name: 'Accounts', description: 'Chart of accounts and general ledger', entities: ['Account', 'JournalEntry'], pages: [
        { name: 'Chart of Accounts', path: '/accounts', description: 'Account tree with balances', features: ['tree-view', 'type-filter', 'add-account', 'balance-display'] },
        { name: 'Journal Entries', path: '/journal', description: 'General ledger entries', features: ['date-filter', 'account-filter', 'create-entry', 'debit-credit'] },
      ], kpis: ['Total Assets', 'Total Liabilities', 'Net Worth'] },
      { name: 'Invoicing', description: 'Create and track invoices', entities: ['Invoice', 'InvoiceItem'], pages: [
        { name: 'Invoices', path: '/invoices', description: 'Invoice list with status', features: ['search', 'status-filter', 'create-invoice', 'send-invoice'] },
      ], kpis: ['Outstanding Invoices', 'Revenue This Month', 'Overdue Amount'] },
      { name: 'Expenses', description: 'Expense tracking and categorization', entities: ['Expense'], pages: [
        { name: 'Expenses', path: '/expenses', description: 'Expense log with categories', features: ['search', 'category-filter', 'date-filter', 'add-expense', 'receipt-upload'] },
      ], kpis: ['Expenses This Month', 'Top Category', 'Budget Remaining'] },
      { name: 'Budgets', description: 'Budget planning and tracking', entities: ['Budget'], pages: [
        { name: 'Budgets', path: '/budgets', description: 'Budget vs actual comparison', features: ['period-selector', 'category-breakdown', 'create-budget', 'variance-highlight'] },
      ], kpis: ['Total Budget', 'Spent', 'Remaining %'] },
      { name: 'Reports', description: 'Financial statements and reports', entities: [], pages: [
        { name: 'Reports', path: '/reports', description: 'P&L, balance sheet, cash flow', features: ['report-selector', 'date-range', 'export-pdf', 'comparison'] },
      ] },
      { name: 'Dashboard', description: 'Financial overview', entities: [], pages: [
        { name: 'Dashboard', path: '/', description: 'Revenue, expenses, cash flow, budget status', features: ['kpi-cards', 'revenue-expense-chart', 'cash-flow-chart', 'budget-progress'] },
      ] },
    ],
    entities: [
      { name: 'Account', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'code', type: 'string', required: true }, { name: 'name', type: 'string', required: true },
        { name: 'type', type: 'enum:asset,liability,equity,revenue,expense', required: true }, { name: 'balance', type: 'number', required: true },
        { name: 'parentId', type: 'number' },
      ]},
      { name: 'JournalEntry', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'date', type: 'date', required: true }, { name: 'description', type: 'string', required: true },
        { name: 'debitAccountId', type: 'number', required: true }, { name: 'creditAccountId', type: 'number', required: true },
        { name: 'amount', type: 'number', required: true }, { name: 'reference', type: 'string' },
      ]},
      { name: 'Invoice', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'invoiceNumber', type: 'string', required: true }, { name: 'clientName', type: 'string', required: true },
        { name: 'clientEmail', type: 'string' }, { name: 'totalAmount', type: 'number', required: true },
        { name: 'status', type: 'enum:draft,sent,paid,overdue,cancelled', required: true },
        { name: 'issueDate', type: 'date', required: true }, { name: 'dueDate', type: 'date', required: true },
      ]},
      { name: 'InvoiceItem', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'invoiceId', type: 'number', required: true },
        { name: 'description', type: 'string', required: true }, { name: 'quantity', type: 'number', required: true },
        { name: 'unitPrice', type: 'number', required: true }, { name: 'amount', type: 'number', required: true },
      ]},
      { name: 'Expense', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'description', type: 'string', required: true },
        { name: 'amount', type: 'number', required: true }, { name: 'category', type: 'string', required: true },
        { name: 'date', type: 'date', required: true }, { name: 'vendor', type: 'string' },
        { name: 'status', type: 'enum:pending,approved,reimbursed', required: true },
      ]},
      { name: 'Budget', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true },
        { name: 'category', type: 'string', required: true }, { name: 'allocatedAmount', type: 'number', required: true },
        { name: 'spentAmount', type: 'number', required: true }, { name: 'period', type: 'string', required: true },
      ]},
    ],
    workflows: [],
    roles: [
      { name: 'Admin', permissions: ['all'], description: 'Full system access' },
      { name: 'Accountant', permissions: ['manage-accounts', 'create-entries', 'manage-invoices', 'view-reports'], description: 'Accounting professional' },
      { name: 'Manager', permissions: ['approve-expenses', 'view-reports', 'manage-budgets'], description: 'Budget approver' },
      { name: 'Employee', permissions: ['submit-expenses', 'view-own-expenses'], description: 'Expense submitter' },
    ],
    defaultKPIs: ['Revenue', 'Expenses', 'Net Income', 'Cash Flow', 'Outstanding Invoices'],
    commonIntegrations: ['QuickBooks', 'Stripe', 'Banking APIs'],
  },

  'project-management': {
    id: 'project-management',
    name: 'Project Management',
    description: 'Project tracking, task management, team collaboration, and reporting',
    keywords: ['project management', 'task manager', 'task management', 'task tracker', 'task app', 'task board', 'task', 'kanban', 'agile', 'scrum', 'sprint', 'jira', 'trello', 'asana', 'todo app', 'todo list', 'todo tracker', 'todo', 'planner', 'backlog', 'issue tracker', 'project tracker'],
    modules: [
      { name: 'Projects', description: 'Project portfolio management', entities: ['Project'], pages: [
        { name: 'Projects', path: '/projects', description: 'All projects with progress', features: ['search', 'status-filter', 'owner-filter', 'create-project', 'progress-bar'] },
        { name: 'Project Detail', path: '/projects/:id', description: 'Project overview, tasks, team', features: ['overview', 'task-board', 'timeline', 'team-members', 'files'] },
      ], kpis: ['Active Projects', 'On-Track %', 'Overdue Tasks'] },
      { name: 'Tasks', description: 'Task management with Kanban board', entities: ['Task', 'Comment'], pages: [
        { name: 'Tasks', path: '/tasks', description: 'All tasks with filtering and sorting', features: ['search', 'status-filter', 'priority-filter', 'assignee-filter', 'sort', 'create-task'] },
        { name: 'Task Detail', path: '/tasks/:id', description: 'Task details with comments and activity', features: ['edit-task', 'status-update', 'comments', 'assignee', 'due-date', 'priority', 'labels'] },
        { name: 'Board View', path: '/board', description: 'Kanban task board', features: ['drag-drop-columns', 'assignee-filter', 'priority-filter', 'create-task', 'labels'] },
        { name: 'My Tasks', path: '/my-tasks', description: 'Personal task dashboard', features: ['grouped-by-project', 'due-today', 'overdue', 'quick-status-update'] },
      ], kpis: ['Tasks Due Today', 'Completed This Week', 'In Progress'] },
      { name: 'Team', description: 'Team members and workload', entities: ['TeamMember'], pages: [
        { name: 'Team', path: '/team', description: 'Team members with workload', features: ['member-list', 'workload-bar', 'role-filter', 'invite-member'] },
      ], kpis: ['Team Size', 'Avg Workload', 'Available Capacity'] },
      { name: 'Dashboard', description: 'Project portfolio overview', entities: [], pages: [
        { name: 'Dashboard', path: '/', description: 'Active projects, task stats, upcoming deadlines', features: ['kpi-cards', 'project-status-chart', 'my-tasks-summary', 'upcoming-deadlines'] },
      ] },
    ],
    entities: [
      { name: 'Project', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true }, { name: 'description', type: 'string' },
        { name: 'status', type: 'enum:planning,active,on-hold,completed,archived', required: true },
        { name: 'ownerId', type: 'number' }, { name: 'startDate', type: 'date' }, { name: 'endDate', type: 'date' },
        { name: 'progress', type: 'number' },
      ]},
      { name: 'Task', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'projectId', type: 'number', required: true }, { name: 'title', type: 'string', required: true },
        { name: 'description', type: 'string' }, { name: 'assigneeId', type: 'number' },
        { name: 'status', type: 'enum:backlog,todo,in-progress,review,done', required: true },
        { name: 'priority', type: 'enum:low,medium,high,urgent', required: true },
        { name: 'dueDate', type: 'date' }, { name: 'labels', type: 'string[]' }, { name: 'estimatedHours', type: 'number' },
      ]},
      { name: 'Comment', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'taskId', type: 'number', required: true }, { name: 'authorId', type: 'number', required: true },
        { name: 'content', type: 'string', required: true },
      ]},
      { name: 'TeamMember', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true }, { name: 'email', type: 'string', required: true },
        { name: 'role', type: 'enum:owner,admin,member,viewer', required: true }, { name: 'avatar', type: 'string' },
      ]},
    ],
    workflows: [
      { name: 'Task Lifecycle', entity: 'Task', states: ['backlog', 'todo', 'in-progress', 'review', 'done'], transitions: [
        { from: 'backlog', to: 'todo', action: 'Move to Todo', role: 'member' },
        { from: 'todo', to: 'in-progress', action: 'Start Work', role: 'member' },
        { from: 'in-progress', to: 'review', action: 'Submit for Review', role: 'member' },
        { from: 'review', to: 'done', action: 'Approve & Complete', role: 'manager' },
        { from: 'review', to: 'in-progress', action: 'Request Changes', role: 'manager' },
        { from: 'todo', to: 'backlog', action: 'Move to Backlog', role: 'member' },
      ]},
      { name: 'Project Lifecycle', entity: 'Project', states: ['planning', 'active', 'on-hold', 'completed', 'archived'], transitions: [
        { from: 'planning', to: 'active', action: 'Start Project', role: 'manager' },
        { from: 'active', to: 'on-hold', action: 'Pause Project', role: 'manager' },
        { from: 'on-hold', to: 'active', action: 'Resume Project', role: 'manager' },
        { from: 'active', to: 'completed', action: 'Complete Project', role: 'manager' },
        { from: 'completed', to: 'archived', action: 'Archive', role: 'admin' },
      ]},
    ],
    roles: [
      { name: 'Admin', permissions: ['all'], description: 'Full system access' },
      { name: 'Project Manager', permissions: ['manage-projects', 'assign-tasks', 'view-reports', 'manage-team'], description: 'Project lead' },
      { name: 'Member', permissions: ['view-projects', 'manage-own-tasks', 'comment'], description: 'Team member' },
      { name: 'Viewer', permissions: ['view-projects', 'view-tasks'], description: 'Read-only access' },
    ],
    defaultKPIs: ['Active Projects', 'Tasks Due Today', 'Completion Rate', 'Team Velocity'],
    commonIntegrations: ['Slack', 'GitHub', 'Google Calendar', 'Figma'],
  },

  'crm': {
    id: 'crm',
    name: 'CRM / Sales Management',
    description: 'Contact management, sales pipeline, deals, and customer relationships',
    keywords: ['crm', 'sales', 'lead', 'pipeline', 'deal', 'contact', 'prospect', 'opportunity', 'customer relationship', 'salesforce'],
    modules: [
      { name: 'Contacts', description: 'Contact and company management', entities: ['Contact', 'Company'], pages: [
        { name: 'Contacts', path: '/contacts', description: 'Contact directory', features: ['search', 'company-filter', 'tag-filter', 'add-contact', 'import'] },
        { name: 'Contact Detail', path: '/contacts/:id', description: 'Contact profile, activity, deals', features: ['profile-info', 'activity-timeline', 'deals-list', 'notes', 'emails'] },
        { name: 'Companies', path: '/companies', description: 'Company directory', features: ['search', 'industry-filter', 'size-filter', 'add-company'] },
      ], kpis: ['Total Contacts', 'New This Week', 'Companies'] },
      { name: 'Sales Pipeline', description: 'Deal tracking and pipeline management', entities: ['Deal', 'Activity'], pages: [
        { name: 'Pipeline', path: '/pipeline', description: 'Visual deal pipeline with stages', features: ['kanban-stages', 'drag-drop', 'deal-value', 'probability', 'create-deal'] },
        { name: 'Deals', path: '/deals', description: 'Deal list view with filters', features: ['search', 'stage-filter', 'value-filter', 'owner-filter', 'sort'] },
        { name: 'Deal Detail', path: '/deals/:id', description: 'Deal info, activities, contacts, notes', features: ['deal-summary', 'activity-log', 'contacts', 'value-history', 'close-probability'] },
      ], kpis: ['Pipeline Value', 'Deals Won This Month', 'Win Rate', 'Avg Deal Size'] },
      { name: 'Activities', description: 'Task and activity tracking', entities: ['Activity'], pages: [
        { name: 'Activities', path: '/activities', description: 'Scheduled and completed activities', features: ['calendar-view', 'type-filter', 'create-activity', 'log-call', 'log-email'] },
      ], kpis: ['Activities Today', 'Overdue Tasks', 'Calls Made'] },
      { name: 'Dashboard', description: 'Sales overview', entities: [], pages: [
        { name: 'Dashboard', path: '/', description: 'Pipeline summary, revenue forecast, activity stats', features: ['kpi-cards', 'pipeline-chart', 'forecast-chart', 'top-deals', 'activity-feed'] },
      ] },
    ],
    entities: [
      { name: 'Contact', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'firstName', type: 'string', required: true }, { name: 'lastName', type: 'string', required: true },
        { name: 'email', type: 'string', required: true }, { name: 'phone', type: 'string' }, { name: 'companyId', type: 'number' },
        { name: 'title', type: 'string' }, { name: 'tags', type: 'string[]' }, { name: 'source', type: 'string' },
        { name: 'status', type: 'enum:lead,prospect,customer,churned', required: true },
      ]},
      { name: 'Company', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true }, { name: 'industry', type: 'string' },
        { name: 'size', type: 'string' }, { name: 'website', type: 'string' }, { name: 'address', type: 'string' },
      ]},
      { name: 'Deal', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'title', type: 'string', required: true }, { name: 'contactId', type: 'number', required: true },
        { name: 'companyId', type: 'number' }, { name: 'value', type: 'number', required: true },
        { name: 'stage', type: 'enum:prospecting,qualification,proposal,negotiation,closed-won,closed-lost', required: true },
        { name: 'probability', type: 'number' }, { name: 'expectedCloseDate', type: 'date' }, { name: 'ownerId', type: 'number' },
      ]},
      { name: 'Activity', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'type', type: 'enum:call,email,meeting,task,note', required: true },
        { name: 'subject', type: 'string', required: true }, { name: 'description', type: 'string' },
        { name: 'contactId', type: 'number' }, { name: 'dealId', type: 'number' },
        { name: 'dueDate', type: 'date' }, { name: 'completed', type: 'boolean', required: true },
      ]},
    ],
    workflows: [
      { name: 'Sales Pipeline', entity: 'Deal', states: ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed-won', 'closed-lost'], transitions: [
        { from: 'prospecting', to: 'qualification', action: 'Qualify', role: 'sales' },
        { from: 'qualification', to: 'proposal', action: 'Send Proposal', role: 'sales' },
        { from: 'proposal', to: 'negotiation', action: 'Negotiate', role: 'sales' },
        { from: 'negotiation', to: 'closed-won', action: 'Close Won', role: 'sales' },
        { from: 'negotiation', to: 'closed-lost', action: 'Close Lost', role: 'sales' },
      ]},
    ],
    roles: [
      { name: 'Admin', permissions: ['all'], description: 'Full system access' },
      { name: 'Sales Manager', permissions: ['manage-pipeline', 'view-all-deals', 'manage-team', 'view-reports'], description: 'Sales team lead' },
      { name: 'Sales Rep', permissions: ['manage-own-deals', 'manage-contacts', 'log-activities'], description: 'Individual contributor' },
    ],
    defaultKPIs: ['Pipeline Value', 'Deals Won', 'Win Rate', 'Revenue This Month', 'New Leads'],
    commonIntegrations: ['Email', 'LinkedIn', 'Slack', 'Calendly'],
  },

  'inventory': {
    id: 'inventory',
    name: 'Inventory / Warehouse Management',
    description: 'Stock tracking, purchase orders, and warehouse operations',
    keywords: ['inventory', 'stock', 'warehouse', 'stockroom', 'goods', 'supplies', 'asset tracking', 'barcode'],
    modules: [
      { name: 'Inventory', description: 'Stock levels and item management', entities: ['Item', 'StockMovement'], pages: [
        { name: 'Items', path: '/items', description: 'Item catalog with stock levels', features: ['search', 'category-filter', 'low-stock-alert', 'add-item', 'barcode-scan'] },
        { name: 'Item Detail', path: '/items/:id', description: 'Item info, stock history, suppliers', features: ['stock-chart', 'movement-history', 'supplier-info', 'reorder-settings'] },
        { name: 'Stock Movements', path: '/movements', description: 'Inbound/outbound movement log', features: ['date-filter', 'type-filter', 'record-movement'] },
      ], kpis: ['Total Items', 'Stock Value', 'Low Stock Alerts', 'Items to Reorder'] },
      { name: 'Purchase Orders', description: 'Ordering from suppliers', entities: ['PurchaseOrder', 'Supplier'], pages: [
        { name: 'Purchase Orders', path: '/purchase-orders', description: 'PO list with status', features: ['search', 'status-filter', 'supplier-filter', 'create-po'] },
        { name: 'Suppliers', path: '/suppliers', description: 'Supplier directory', features: ['search', 'add-supplier', 'order-history'] },
      ], kpis: ['Open POs', 'Pending Deliveries', 'Total Spend'] },
      { name: 'Dashboard', description: 'Inventory overview', entities: [], pages: [
        { name: 'Dashboard', path: '/', description: 'Stock summary, alerts, recent movements', features: ['kpi-cards', 'stock-chart', 'low-stock-list', 'recent-movements'] },
      ] },
    ],
    entities: [
      { name: 'Item', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true }, { name: 'sku', type: 'string', required: true },
        { name: 'category', type: 'string' }, { name: 'quantity', type: 'number', required: true }, { name: 'unit', type: 'string', required: true },
        { name: 'minStock', type: 'number' }, { name: 'maxStock', type: 'number' }, { name: 'unitCost', type: 'number' },
        { name: 'location', type: 'string' }, { name: 'supplierId', type: 'number' },
      ]},
      { name: 'StockMovement', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'itemId', type: 'number', required: true },
        { name: 'type', type: 'enum:inbound,outbound,transfer,adjustment', required: true },
        { name: 'quantity', type: 'number', required: true }, { name: 'reference', type: 'string' }, { name: 'date', type: 'date', required: true }, { name: 'notes', type: 'string' },
      ]},
      { name: 'PurchaseOrder', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'poNumber', type: 'string', required: true }, { name: 'supplierId', type: 'number', required: true },
        { name: 'status', type: 'enum:draft,ordered,shipped,received,cancelled', required: true },
        { name: 'totalAmount', type: 'number' }, { name: 'orderDate', type: 'date', required: true }, { name: 'expectedDate', type: 'date' },
      ]},
      { name: 'Supplier', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true }, { name: 'contactName', type: 'string' },
        { name: 'email', type: 'string' }, { name: 'phone', type: 'string' }, { name: 'address', type: 'string' },
        { name: 'status', type: 'enum:active,inactive', required: true },
      ]},
    ],
    workflows: [],
    roles: [
      { name: 'Admin', permissions: ['all'], description: 'Full system access' },
      { name: 'Warehouse Manager', permissions: ['manage-items', 'manage-movements', 'manage-pos', 'view-reports'], description: 'Warehouse operations' },
      { name: 'Staff', permissions: ['view-items', 'record-movements', 'view-pos'], description: 'Warehouse staff' },
    ],
    defaultKPIs: ['Total Stock Value', 'Low Stock Items', 'Pending Orders', 'Items Moved Today'],
    commonIntegrations: ['Barcode Scanners', 'Shipping APIs', 'Accounting Software'],
  },

  'portfolio': {
    id: 'portfolio',
    name: 'Portfolio / Personal Site',
    description: 'Personal portfolio website to showcase projects, skills, experience, and contact information',
    keywords: ['portfolio', 'personal website', 'personal site', 'personal page', 'showcase', 'resume', 'cv', 'developer portfolio', 'freelancer', 'about me', 'my work', 'creative portfolio'],
    modules: [
      { name: 'Projects Showcase', description: 'Display portfolio projects with images and descriptions', entities: ['Project'], pages: [
        { name: 'Projects', path: '/projects', description: 'Project gallery grid', features: ['image-gallery', 'category-filter', 'tech-stack-tags', 'live-demo-link'] },
        { name: 'Project Detail', path: '/projects/:slug', description: 'Full project case study', features: ['image-carousel', 'description', 'tech-stack', 'github-link', 'live-link'] },
      ], kpis: ['Total Projects', 'Featured Projects'] },
      { name: 'About & Skills', description: 'Personal bio, skills, and experience', entities: ['Skill', 'Experience'], pages: [
        { name: 'About', path: '/about', description: 'Bio, skills, and timeline', features: ['bio-section', 'skills-grid', 'experience-timeline', 'education'] },
      ], kpis: ['Skills Listed', 'Years Experience'] },
      { name: 'Contact', description: 'Contact form and social links', entities: ['ContactMessage'], pages: [
        { name: 'Contact', path: '/contact', description: 'Contact form with social links', features: ['contact-form', 'social-links', 'email-link', 'location-map'] },
      ], kpis: ['Messages Received'] },
      { name: 'Blog', description: 'Optional blog section', entities: ['BlogPost'], pages: [
        { name: 'Blog', path: '/blog', description: 'Articles and thoughts', features: ['post-list', 'category-filter', 'search', 'read-time'] },
      ], kpis: ['Posts Published'] },
      { name: 'Home', description: 'Landing hero section', entities: [], pages: [
        { name: 'Home', path: '/', description: 'Hero with intro, featured projects, and CTA', features: ['hero-section', 'featured-projects', 'skills-preview', 'cta-button'] },
      ] },
    ],
    entities: [
      { name: 'Project', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'title', type: 'string', required: true }, { name: 'slug', type: 'string', required: true },
        { name: 'description', type: 'string', required: true }, { name: 'longDescription', type: 'string' },
        { name: 'imageUrl', type: 'string' }, { name: 'liveUrl', type: 'string' }, { name: 'githubUrl', type: 'string' },
        { name: 'techStack', type: 'string[]' }, { name: 'category', type: 'string' },
        { name: 'featured', type: 'boolean' }, { name: 'sortOrder', type: 'number' },
        { name: 'status', type: 'enum:published,draft', required: true },
      ]},
      { name: 'Skill', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true },
        { name: 'category', type: 'enum:frontend,backend,database,devops,design,other', required: true },
        { name: 'proficiency', type: 'number' }, { name: 'iconUrl', type: 'string' }, { name: 'sortOrder', type: 'number' },
      ]},
      { name: 'Experience', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'company', type: 'string', required: true },
        { name: 'role', type: 'string', required: true }, { name: 'description', type: 'string' },
        { name: 'startDate', type: 'date', required: true }, { name: 'endDate', type: 'date' },
        { name: 'current', type: 'boolean' }, { name: 'location', type: 'string' },
      ]},
      { name: 'ContactMessage', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true },
        { name: 'email', type: 'string', required: true }, { name: 'subject', type: 'string' },
        { name: 'message', type: 'string', required: true }, { name: 'read', type: 'boolean' },
      ]},
    ],
    workflows: [],
    roles: [
      { name: 'Owner', permissions: ['all'], description: 'Portfolio owner — manages all content' },
    ],
    defaultKPIs: ['Projects Showcased', 'Contact Messages', 'Page Views'],
    commonIntegrations: ['GitHub API', 'Email Service', 'Analytics'],
  },

  'blog': {
    id: 'blog',
    name: 'Blog / Content Platform',
    description: 'Content publishing platform with posts, categories, comments, and newsletters',
    keywords: ['blog', 'blogging', 'content', 'articles', 'writing', 'publishing', 'cms', 'content management', 'posts', 'author', 'editorial', 'magazine', 'journal'],
    modules: [
      { name: 'Posts', description: 'Create, edit, and publish blog posts', entities: ['Post', 'Tag', 'Category'], pages: [
        { name: 'All Posts', path: '/posts', description: 'Post listing with filters', features: ['search', 'category-filter', 'tag-filter', 'status-filter', 'sort'] },
        { name: 'Post Editor', path: '/posts/:id/edit', description: 'Rich text editor with preview', features: ['rich-editor', 'markdown-support', 'image-upload', 'preview', 'seo-fields', 'publish-schedule'] },
        { name: 'Post View', path: '/posts/:slug', description: 'Published post with comments', features: ['content-display', 'author-bio', 'related-posts', 'social-share', 'comments'] },
      ], kpis: ['Total Posts', 'Published This Month', 'Avg Read Time'] },
      { name: 'Comments', description: 'Reader comments and moderation', entities: ['Comment'], pages: [
        { name: 'Comment Moderation', path: '/comments', description: 'Comment queue for moderation', features: ['pending-queue', 'approve-reject', 'spam-filter', 'reply'] },
      ], kpis: ['Total Comments', 'Pending Moderation'] },
      { name: 'Newsletter', description: 'Email subscriber management', entities: ['Subscriber'], pages: [
        { name: 'Subscribers', path: '/subscribers', description: 'Email subscriber list', features: ['search', 'export', 'subscribe-form', 'unsubscribe'] },
      ], kpis: ['Total Subscribers', 'New This Week'] },
      { name: 'Home', description: 'Blog home page', entities: [], pages: [
        { name: 'Blog Home', path: '/', description: 'Latest posts, featured articles, categories', features: ['latest-posts', 'featured-post', 'category-list', 'newsletter-signup'] },
      ] },
    ],
    entities: [
      { name: 'Post', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'title', type: 'string', required: true }, { name: 'slug', type: 'string', required: true },
        { name: 'content', type: 'string', required: true }, { name: 'excerpt', type: 'string' },
        { name: 'coverImageUrl', type: 'string' }, { name: 'authorId', type: 'number', required: true },
        { name: 'categoryId', type: 'number' }, { name: 'tags', type: 'string[]' },
        { name: 'status', type: 'enum:draft,published,archived', required: true },
        { name: 'publishedAt', type: 'datetime' }, { name: 'readTime', type: 'number' },
        { name: 'metaTitle', type: 'string' }, { name: 'metaDescription', type: 'string' },
      ]},
      { name: 'Category', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true },
        { name: 'slug', type: 'string', required: true }, { name: 'description', type: 'string' },
      ]},
      { name: 'Tag', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true },
        { name: 'slug', type: 'string', required: true },
      ]},
      { name: 'Comment', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'postId', type: 'number', required: true },
        { name: 'authorName', type: 'string', required: true }, { name: 'authorEmail', type: 'string', required: true },
        { name: 'content', type: 'string', required: true }, { name: 'parentId', type: 'number' },
        { name: 'status', type: 'enum:pending,approved,spam,rejected', required: true },
      ]},
      { name: 'Subscriber', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'email', type: 'string', required: true },
        { name: 'name', type: 'string' }, { name: 'status', type: 'enum:active,unsubscribed', required: true },
        { name: 'subscribedAt', type: 'datetime', required: true },
      ]},
    ],
    workflows: [
      { name: 'Post Publishing', entity: 'Post', states: ['draft', 'published', 'archived'], transitions: [
        { from: 'draft', to: 'published', action: 'Publish', role: 'author' },
        { from: 'published', to: 'draft', action: 'Unpublish', role: 'author' },
        { from: 'published', to: 'archived', action: 'Archive', role: 'admin' },
      ]},
      { name: 'Comment Moderation', entity: 'Comment', states: ['pending', 'approved', 'spam', 'rejected'], transitions: [
        { from: 'pending', to: 'approved', action: 'Approve', role: 'admin' },
        { from: 'pending', to: 'spam', action: 'Mark Spam', role: 'admin' },
        { from: 'pending', to: 'rejected', action: 'Reject', role: 'admin' },
      ]},
    ],
    roles: [
      { name: 'Admin', permissions: ['all'], description: 'Full system access' },
      { name: 'Author', permissions: ['create-posts', 'edit-own-posts', 'publish-posts', 'moderate-comments'], description: 'Content creator' },
      { name: 'Reader', permissions: ['view-posts', 'comment'], description: 'Blog reader' },
    ],
    defaultKPIs: ['Total Posts', 'Page Views', 'Comments', 'Subscribers'],
    commonIntegrations: ['Email Service', 'Analytics', 'Social Media APIs'],
  },

  'landing-page': {
    id: 'landing-page',
    name: 'Landing Page / Marketing Site',
    description: 'Promotional landing page with hero, features, pricing, testimonials, and lead capture',
    keywords: ['landing page', 'landing', 'marketing site', 'marketing', 'promotional', 'product page', 'launch page', 'coming soon', 'waitlist', 'lead capture', 'squeeze page', 'conversion'],
    modules: [
      { name: 'Page Sections', description: 'Hero, features, pricing, testimonials, FAQ, CTA', entities: ['Testimonial', 'PricingPlan', 'FAQ'], pages: [
        { name: 'Landing Page', path: '/', description: 'Single-page marketing layout', features: ['hero-section', 'feature-grid', 'pricing-table', 'testimonial-carousel', 'faq-accordion', 'cta-buttons', 'newsletter-signup'] },
      ], kpis: ['Page Views', 'Conversion Rate', 'Signups'] },
      { name: 'Lead Capture', description: 'Collect leads and signups', entities: ['Lead'], pages: [
        { name: 'Leads', path: '/admin/leads', description: 'Lead management dashboard', features: ['search', 'export-csv', 'date-filter', 'source-filter'] },
      ], kpis: ['Total Leads', 'Leads This Week', 'Conversion Rate'] },
    ],
    entities: [
      { name: 'Lead', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'email', type: 'string', required: true },
        { name: 'name', type: 'string' }, { name: 'company', type: 'string' },
        { name: 'source', type: 'string' }, { name: 'status', type: 'enum:new,contacted,converted', required: true },
      ]},
      { name: 'Testimonial', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'authorName', type: 'string', required: true },
        { name: 'authorTitle', type: 'string' }, { name: 'authorAvatar', type: 'string' },
        { name: 'quote', type: 'string', required: true }, { name: 'rating', type: 'number' },
        { name: 'featured', type: 'boolean' }, { name: 'sortOrder', type: 'number' },
      ]},
      { name: 'PricingPlan', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true },
        { name: 'price', type: 'number', required: true }, { name: 'billingPeriod', type: 'enum:monthly,yearly', required: true },
        { name: 'features', type: 'string[]' }, { name: 'highlighted', type: 'boolean' },
        { name: 'ctaLabel', type: 'string' }, { name: 'sortOrder', type: 'number' },
      ]},
      { name: 'FAQ', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'question', type: 'string', required: true },
        { name: 'answer', type: 'string', required: true }, { name: 'category', type: 'string' }, { name: 'sortOrder', type: 'number' },
      ]},
    ],
    workflows: [],
    roles: [
      { name: 'Admin', permissions: ['all'], description: 'Manages landing page content' },
    ],
    defaultKPIs: ['Page Views', 'Signups', 'Conversion Rate', 'Bounce Rate'],
    commonIntegrations: ['Email Service', 'Analytics', 'Stripe', 'CRM'],
  },

  'social-network': {
    id: 'social-network',
    name: 'Social Network / Community',
    description: 'Social platform with user profiles, posts, follows, likes, and real-time feed',
    keywords: ['social network', 'social media', 'social platform', 'social app', 'community platform', 'feed', 'timeline', 'followers', 'following', 'like', 'share', 'post feed', 'news feed'],
    modules: [
      { name: 'User Profiles', description: 'User profiles with bio and avatar', entities: ['UserProfile'], pages: [
        { name: 'Profile', path: '/profile/:username', description: 'User profile with posts and stats', features: ['avatar', 'bio', 'follower-count', 'following-count', 'user-posts', 'follow-button'] },
        { name: 'Edit Profile', path: '/settings/profile', description: 'Edit profile settings', features: ['avatar-upload', 'bio-edit', 'display-name', 'privacy-settings'] },
      ], kpis: ['Total Users', 'Active Users'] },
      { name: 'Feed', description: 'Post feed with likes and comments', entities: ['Post', 'Like', 'Comment'], pages: [
        { name: 'Home Feed', path: '/', description: 'Chronological feed of followed users\' posts', features: ['infinite-scroll', 'post-composer', 'like-button', 'comment', 'share', 'bookmark'] },
        { name: 'Explore', path: '/explore', description: 'Discover trending content', features: ['trending-posts', 'suggested-users', 'hashtag-search', 'category-browse'] },
      ], kpis: ['Posts Today', 'Engagement Rate'] },
      { name: 'Follow System', description: 'Follow/unfollow and follower management', entities: ['Follow'], pages: [
        { name: 'Followers', path: '/profile/:username/followers', description: 'Follower list', features: ['follower-list', 'follow-back-button'] },
        { name: 'Following', path: '/profile/:username/following', description: 'Following list', features: ['following-list', 'unfollow-button'] },
      ], kpis: ['Avg Followers', 'Follow Rate'] },
      { name: 'Notifications', description: 'Activity notifications', entities: ['Notification'], pages: [
        { name: 'Notifications', path: '/notifications', description: 'Activity notifications feed', features: ['notification-list', 'mark-read', 'filter-by-type'] },
      ], kpis: ['Unread Count'] },
    ],
    entities: [
      { name: 'UserProfile', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'username', type: 'string', required: true },
        { name: 'displayName', type: 'string', required: true }, { name: 'bio', type: 'string' },
        { name: 'avatarUrl', type: 'string' }, { name: 'coverImageUrl', type: 'string' },
        { name: 'followerCount', type: 'number' }, { name: 'followingCount', type: 'number' },
        { name: 'isVerified', type: 'boolean' },
      ]},
      { name: 'Post', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'authorId', type: 'number', required: true },
        { name: 'content', type: 'string', required: true }, { name: 'imageUrl', type: 'string' },
        { name: 'likeCount', type: 'number' }, { name: 'commentCount', type: 'number' },
        { name: 'shareCount', type: 'number' }, { name: 'hashtags', type: 'string[]' },
        { name: 'visibility', type: 'enum:public,followers,private', required: true },
      ]},
      { name: 'Like', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'userId', type: 'number', required: true },
        { name: 'postId', type: 'number', required: true },
      ]},
      { name: 'Comment', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'postId', type: 'number', required: true },
        { name: 'authorId', type: 'number', required: true }, { name: 'content', type: 'string', required: true },
        { name: 'parentId', type: 'number' }, { name: 'likeCount', type: 'number' },
      ]},
      { name: 'Follow', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'followerId', type: 'number', required: true },
        { name: 'followingId', type: 'number', required: true },
      ]},
      { name: 'Notification', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'userId', type: 'number', required: true },
        { name: 'type', type: 'enum:like,comment,follow,mention', required: true },
        { name: 'actorId', type: 'number', required: true }, { name: 'targetId', type: 'number' },
        { name: 'content', type: 'string' }, { name: 'read', type: 'boolean' },
      ]},
    ],
    workflows: [],
    roles: [
      { name: 'Admin', permissions: ['all'], description: 'Full system access' },
      { name: 'Moderator', permissions: ['remove-posts', 'ban-users', 'view-reports'], description: 'Content moderator' },
      { name: 'User', permissions: ['create-posts', 'comment', 'like', 'follow', 'edit-profile'], description: 'Standard user' },
    ],
    defaultKPIs: ['Active Users', 'Posts Per Day', 'Engagement Rate', 'New Users'],
    commonIntegrations: ['Image CDN', 'Push Notifications', 'Analytics'],
  },

  'chat-messaging': {
    id: 'chat-messaging',
    name: 'Chat / Messaging Platform',
    description: 'Real-time messaging with conversations, channels, presence, and read receipts',
    keywords: ['chat', 'messaging', 'instant messaging', 'messenger', 'real-time chat', 'chatroom', 'direct message', 'conversations', 'chat app', 'chat platform', 'slack', 'discord'],
    modules: [
      { name: 'Conversations', description: 'Direct messages and group chats', entities: ['Conversation', 'Message', 'Participant'], pages: [
        { name: 'Chat', path: '/', description: 'Main chat interface with conversation list and messages', features: ['conversation-list', 'message-thread', 'send-message', 'typing-indicator', 'read-receipts', 'search'] },
        { name: 'New Chat', path: '/new', description: 'Start new conversation', features: ['user-search', 'group-creation', 'channel-creation'] },
      ], kpis: ['Active Conversations', 'Messages Today'] },
      { name: 'Channels', description: 'Public or private channels', entities: ['Channel'], pages: [
        { name: 'Channels', path: '/channels', description: 'Browse and join channels', features: ['channel-list', 'join-channel', 'create-channel', 'search'] },
      ], kpis: ['Total Channels', 'Active Channels'] },
      { name: 'User Presence', description: 'Online/offline status', entities: ['UserPresence'], pages: [], kpis: ['Online Users'] },
    ],
    entities: [
      { name: 'Conversation', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string' },
        { name: 'type', type: 'enum:direct,group,channel', required: true },
        { name: 'lastMessageAt', type: 'datetime' }, { name: 'lastMessagePreview', type: 'string' },
        { name: 'avatarUrl', type: 'string' },
      ]},
      { name: 'Message', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'conversationId', type: 'number', required: true },
        { name: 'senderId', type: 'number', required: true }, { name: 'content', type: 'string', required: true },
        { name: 'type', type: 'enum:text,image,file,system', required: true },
        { name: 'replyToId', type: 'number' }, { name: 'edited', type: 'boolean' },
      ]},
      { name: 'Participant', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'conversationId', type: 'number', required: true },
        { name: 'userId', type: 'number', required: true }, { name: 'role', type: 'enum:owner,admin,member', required: true },
        { name: 'lastReadAt', type: 'datetime' }, { name: 'muted', type: 'boolean' },
      ]},
      { name: 'Channel', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true },
        { name: 'description', type: 'string' }, { name: 'isPrivate', type: 'boolean' },
        { name: 'memberCount', type: 'number' }, { name: 'createdBy', type: 'number', required: true },
      ]},
      { name: 'UserPresence', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'userId', type: 'number', required: true },
        { name: 'status', type: 'enum:online,away,busy,offline', required: true },
        { name: 'lastSeenAt', type: 'datetime' },
      ]},
    ],
    workflows: [],
    roles: [
      { name: 'Admin', permissions: ['all'], description: 'Full system access' },
      { name: 'User', permissions: ['send-messages', 'create-conversations', 'join-channels'], description: 'Chat user' },
    ],
    defaultKPIs: ['Online Users', 'Messages Today', 'Active Conversations'],
    commonIntegrations: ['WebSockets', 'Push Notifications', 'File Storage'],
  },

  'booking': {
    id: 'booking',
    name: 'Booking / Scheduling Platform',
    description: 'Appointment booking with availability management, services, staff, and reminders',
    keywords: ['booking', 'scheduling', 'appointment', 'reservation', 'calendar booking', 'slot booking', 'service booking', 'book appointment', 'schedule appointment', 'calendly'],
    modules: [
      { name: 'Services', description: 'Service catalog with pricing and duration', entities: ['Service', 'ServiceCategory'], pages: [
        { name: 'Services', path: '/services', description: 'Service list with booking', features: ['service-cards', 'category-filter', 'price-display', 'duration-display', 'book-now'] },
      ], kpis: ['Total Services', 'Most Booked Service'] },
      { name: 'Appointments', description: 'Booking and appointment management', entities: ['Appointment'], pages: [
        { name: 'Book Appointment', path: '/book', description: 'Multi-step booking flow', features: ['service-select', 'staff-select', 'date-picker', 'time-slot-picker', 'confirm-booking'] },
        { name: 'My Appointments', path: '/appointments', description: 'User\'s upcoming and past bookings', features: ['upcoming-list', 'past-list', 'cancel-reschedule'] },
        { name: 'Admin Calendar', path: '/admin/calendar', description: 'Staff calendar with all bookings', features: ['calendar-view', 'staff-filter', 'create-appointment', 'drag-reschedule'] },
      ], kpis: ['Appointments Today', 'Bookings This Week', 'Cancellation Rate'] },
      { name: 'Staff', description: 'Staff profiles and availability', entities: ['Staff', 'Availability'], pages: [
        { name: 'Staff', path: '/admin/staff', description: 'Staff list with schedules', features: ['staff-list', 'set-availability', 'assign-services', 'view-schedule'] },
      ], kpis: ['Total Staff', 'Utilization Rate'] },
      { name: 'Dashboard', description: 'Booking overview', entities: [], pages: [
        { name: 'Dashboard', path: '/', description: 'Today\'s bookings, revenue, upcoming', features: ['kpi-cards', 'today-schedule', 'revenue-chart', 'upcoming-bookings'] },
      ] },
    ],
    entities: [
      { name: 'Service', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true },
        { name: 'description', type: 'string' }, { name: 'duration', type: 'number', required: true, description: 'Duration in minutes' },
        { name: 'price', type: 'number', required: true }, { name: 'categoryId', type: 'number' },
        { name: 'imageUrl', type: 'string' }, { name: 'status', type: 'enum:active,inactive', required: true },
      ]},
      { name: 'Appointment', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'serviceId', type: 'number', required: true },
        { name: 'staffId', type: 'number', required: true }, { name: 'customerName', type: 'string', required: true },
        { name: 'customerEmail', type: 'string', required: true }, { name: 'customerPhone', type: 'string' },
        { name: 'dateTime', type: 'datetime', required: true }, { name: 'duration', type: 'number', required: true },
        { name: 'status', type: 'enum:booked,confirmed,in-progress,completed,cancelled,no-show', required: true },
        { name: 'notes', type: 'string' },
      ]},
      { name: 'Staff', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true },
        { name: 'email', type: 'string', required: true }, { name: 'phone', type: 'string' },
        { name: 'avatarUrl', type: 'string' }, { name: 'specialties', type: 'string[]' },
        { name: 'status', type: 'enum:active,inactive', required: true },
      ]},
      { name: 'Availability', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'staffId', type: 'number', required: true },
        { name: 'dayOfWeek', type: 'number', required: true }, { name: 'startTime', type: 'string', required: true },
        { name: 'endTime', type: 'string', required: true },
      ]},
    ],
    workflows: [
      { name: 'Appointment Flow', entity: 'Appointment', states: ['booked', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'], transitions: [
        { from: 'booked', to: 'confirmed', action: 'Confirm', role: 'staff' },
        { from: 'confirmed', to: 'in-progress', action: 'Start', role: 'staff' },
        { from: 'in-progress', to: 'completed', action: 'Complete', role: 'staff' },
        { from: 'booked', to: 'cancelled', action: 'Cancel', role: 'customer' },
      ]},
    ],
    roles: [
      { name: 'Admin', permissions: ['all'], description: 'Full system access' },
      { name: 'Staff', permissions: ['view-appointments', 'update-status', 'manage-availability'], description: 'Service provider' },
      { name: 'Customer', permissions: ['book-appointment', 'view-own-appointments', 'cancel-own'], description: 'Booking customer' },
    ],
    defaultKPIs: ['Bookings Today', 'Revenue', 'Staff Utilization', 'Cancellation Rate'],
    commonIntegrations: ['Google Calendar', 'Stripe', 'Twilio SMS', 'Email Service'],
  },

  'event-management': {
    id: 'event-management',
    name: 'Event Management Platform',
    description: 'Event creation, ticketing, RSVP management, and attendee tracking',
    keywords: ['event', 'events', 'conference', 'meetup', 'ticket', 'ticketing', 'rsvp', 'event planning', 'venue', 'concert', 'workshop', 'webinar', 'registration', 'attendee'],
    modules: [
      { name: 'Events', description: 'Event creation and management', entities: ['Event', 'Venue'], pages: [
        { name: 'Events', path: '/events', description: 'Event listing with categories', features: ['event-cards', 'date-filter', 'category-filter', 'search', 'map-view'] },
        { name: 'Event Detail', path: '/events/:slug', description: 'Event info with registration', features: ['event-info', 'schedule', 'speakers', 'venue-map', 'register-button', 'ticket-select'] },
        { name: 'Create Event', path: '/events/new', description: 'Event creation wizard', features: ['multi-step-form', 'date-time-picker', 'venue-select', 'ticket-tiers', 'cover-image'] },
      ], kpis: ['Total Events', 'Upcoming Events'] },
      { name: 'Tickets', description: 'Ticket types and sales', entities: ['TicketType', 'Ticket'], pages: [
        { name: 'Ticket Sales', path: '/admin/tickets', description: 'Ticket sales dashboard', features: ['sales-summary', 'ticket-type-breakdown', 'revenue-chart', 'refund'] },
      ], kpis: ['Tickets Sold', 'Revenue', 'Sell-Through Rate'] },
      { name: 'Attendees', description: 'Registration and check-in', entities: ['Attendee'], pages: [
        { name: 'Attendees', path: '/admin/events/:id/attendees', description: 'Attendee list with check-in', features: ['attendee-list', 'check-in-button', 'qr-scan', 'export-csv', 'email-attendees'] },
      ], kpis: ['Registered', 'Checked In', 'No-Show Rate'] },
      { name: 'Dashboard', description: 'Event overview', entities: [], pages: [
        { name: 'Dashboard', path: '/', description: 'Upcoming events, ticket sales, attendee stats', features: ['kpi-cards', 'upcoming-events', 'sales-chart', 'recent-registrations'] },
      ] },
    ],
    entities: [
      { name: 'Event', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'title', type: 'string', required: true },
        { name: 'slug', type: 'string', required: true }, { name: 'description', type: 'string', required: true },
        { name: 'startDate', type: 'datetime', required: true }, { name: 'endDate', type: 'datetime', required: true },
        { name: 'venueId', type: 'number' }, { name: 'coverImageUrl', type: 'string' },
        { name: 'category', type: 'string' }, { name: 'capacity', type: 'number' },
        { name: 'status', type: 'enum:draft,published,cancelled,completed', required: true },
        { name: 'organizerId', type: 'number', required: true },
      ]},
      { name: 'TicketType', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'eventId', type: 'number', required: true },
        { name: 'name', type: 'string', required: true }, { name: 'price', type: 'number', required: true },
        { name: 'quantity', type: 'number', required: true }, { name: 'sold', type: 'number' },
        { name: 'description', type: 'string' },
      ]},
      { name: 'Ticket', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'ticketTypeId', type: 'number', required: true },
        { name: 'attendeeId', type: 'number', required: true }, { name: 'ticketNumber', type: 'string', required: true },
        { name: 'status', type: 'enum:valid,used,cancelled,refunded', required: true },
      ]},
      { name: 'Attendee', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'eventId', type: 'number', required: true },
        { name: 'name', type: 'string', required: true }, { name: 'email', type: 'string', required: true },
        { name: 'phone', type: 'string' }, { name: 'checkedIn', type: 'boolean' },
        { name: 'checkedInAt', type: 'datetime' },
      ]},
      { name: 'Venue', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true },
        { name: 'address', type: 'string', required: true }, { name: 'capacity', type: 'number' },
        { name: 'contactPhone', type: 'string' },
      ]},
    ],
    workflows: [
      { name: 'Event Lifecycle', entity: 'Event', states: ['draft', 'published', 'cancelled', 'completed'], transitions: [
        { from: 'draft', to: 'published', action: 'Publish', role: 'organizer' },
        { from: 'published', to: 'cancelled', action: 'Cancel', role: 'organizer' },
        { from: 'published', to: 'completed', action: 'Complete', role: 'system' },
      ]},
    ],
    roles: [
      { name: 'Admin', permissions: ['all'], description: 'Full system access' },
      { name: 'Organizer', permissions: ['create-events', 'manage-events', 'view-attendees', 'manage-tickets'], description: 'Event organizer' },
      { name: 'Attendee', permissions: ['view-events', 'register', 'view-tickets'], description: 'Event attendee' },
    ],
    defaultKPIs: ['Upcoming Events', 'Tickets Sold', 'Revenue', 'Attendee Satisfaction'],
    commonIntegrations: ['Stripe', 'Google Calendar', 'Email Service', 'QR Code'],
  },

  'saas-dashboard': {
    id: 'saas-dashboard',
    name: 'SaaS / Dashboard Platform',
    description: 'Multi-tenant SaaS application with subscription management, user analytics, and admin dashboard',
    keywords: ['saas', 'subscription', 'multi-tenant', 'admin panel', 'analytics dashboard', 'control panel', 'reporting tool', 'business intelligence', 'dashboard platform', 'admin dashboard'],
    modules: [
      { name: 'Subscription Management', description: 'Plans, billing, and subscription lifecycle', entities: ['Plan', 'Subscription', 'Invoice'], pages: [
        { name: 'Plans', path: '/admin/plans', description: 'Manage subscription plans', features: ['plan-list', 'create-plan', 'edit-pricing', 'feature-toggles'] },
        { name: 'Subscriptions', path: '/admin/subscriptions', description: 'Active subscriptions', features: ['search', 'status-filter', 'plan-filter', 'revenue-summary'] },
        { name: 'Billing', path: '/billing', description: 'Customer billing portal', features: ['current-plan', 'usage-summary', 'invoice-history', 'update-payment', 'upgrade-downgrade'] },
      ], kpis: ['MRR', 'Active Subscriptions', 'Churn Rate'] },
      { name: 'User Management', description: 'Users, teams, and permissions', entities: ['User', 'Team'], pages: [
        { name: 'Users', path: '/admin/users', description: 'User management', features: ['search', 'role-filter', 'status-filter', 'invite-user', 'impersonate'] },
        { name: 'Teams', path: '/admin/teams', description: 'Team and organization management', features: ['team-list', 'member-management', 'plan-assignment'] },
      ], kpis: ['Total Users', 'Active Users', 'Teams'] },
      { name: 'Analytics', description: 'Usage analytics and reporting', entities: ['UsageEvent'], pages: [
        { name: 'Analytics Dashboard', path: '/admin/analytics', description: 'Product usage analytics', features: ['user-growth-chart', 'active-users-chart', 'feature-usage', 'retention-chart', 'date-range-picker'] },
      ], kpis: ['DAU', 'MAU', 'Feature Adoption'] },
      { name: 'Dashboard', description: 'Admin overview', entities: [], pages: [
        { name: 'Dashboard', path: '/', description: 'SaaS metrics overview', features: ['kpi-cards', 'mrr-chart', 'user-growth', 'churn-chart', 'recent-signups'] },
      ] },
    ],
    entities: [
      { name: 'Plan', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true },
        { name: 'price', type: 'number', required: true }, { name: 'billingPeriod', type: 'enum:monthly,yearly', required: true },
        { name: 'features', type: 'string[]' }, { name: 'limits', type: 'string' },
        { name: 'isPopular', type: 'boolean' }, { name: 'status', type: 'enum:active,archived', required: true },
      ]},
      { name: 'Subscription', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'userId', type: 'number', required: true },
        { name: 'planId', type: 'number', required: true },
        { name: 'status', type: 'enum:active,past-due,cancelled,trialing', required: true },
        { name: 'startDate', type: 'date', required: true }, { name: 'endDate', type: 'date' },
        { name: 'cancelledAt', type: 'datetime' }, { name: 'stripeSubscriptionId', type: 'string' },
      ]},
      { name: 'Invoice', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'subscriptionId', type: 'number', required: true },
        { name: 'amount', type: 'number', required: true },
        { name: 'status', type: 'enum:draft,sent,paid,overdue,void', required: true },
        { name: 'issueDate', type: 'date', required: true }, { name: 'dueDate', type: 'date', required: true },
      ]},
    ],
    workflows: [],
    roles: [
      { name: 'Super Admin', permissions: ['all'], description: 'Platform administrator' },
      { name: 'Team Admin', permissions: ['manage-team', 'view-billing', 'manage-members'], description: 'Team admin' },
      { name: 'Member', permissions: ['use-app', 'view-profile'], description: 'Team member' },
    ],
    defaultKPIs: ['MRR', 'Active Users', 'Churn Rate', 'LTV', 'New Signups'],
    commonIntegrations: ['Stripe', 'Intercom', 'Analytics', 'Email Service'],
  },

  'documentation': {
    id: 'documentation',
    name: 'Documentation / Wiki Site',
    description: 'Knowledge base and documentation platform with search, versioning, and navigation',
    keywords: ['documentation', 'docs', 'wiki', 'knowledge base', 'help center', 'faq', 'reference', 'manual', 'guide', 'gitbook', 'docusaurus'],
    modules: [
      { name: 'Pages', description: 'Documentation pages and sections', entities: ['DocPage', 'DocSection'], pages: [
        { name: 'Doc Page', path: '/docs/:slug', description: 'Documentation page with sidebar navigation', features: ['markdown-content', 'table-of-contents', 'sidebar-nav', 'breadcrumbs', 'edit-button', 'last-updated'] },
        { name: 'Editor', path: '/admin/docs/:id/edit', description: 'Page editor with preview', features: ['markdown-editor', 'live-preview', 'image-upload', 'section-ordering'] },
      ], kpis: ['Total Pages', 'Updated This Month'] },
      { name: 'Search', description: 'Full-text search across docs', entities: [], pages: [
        { name: 'Search', path: '/search', description: 'Search results page', features: ['full-text-search', 'highlighted-results', 'category-filter'] },
      ], kpis: ['Searches Per Day', 'Zero-Result Rate'] },
      { name: 'Home', description: 'Documentation home', entities: [], pages: [
        { name: 'Docs Home', path: '/', description: 'Documentation landing with sections', features: ['section-cards', 'quick-search', 'popular-pages', 'getting-started'] },
      ] },
    ],
    entities: [
      { name: 'DocPage', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'title', type: 'string', required: true },
        { name: 'slug', type: 'string', required: true }, { name: 'content', type: 'string', required: true },
        { name: 'sectionId', type: 'number' }, { name: 'parentId', type: 'number' },
        { name: 'sortOrder', type: 'number' }, { name: 'status', type: 'enum:published,draft', required: true },
        { name: 'version', type: 'string' }, { name: 'lastEditedBy', type: 'string' },
      ]},
      { name: 'DocSection', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true },
        { name: 'slug', type: 'string', required: true }, { name: 'description', type: 'string' },
        { name: 'iconUrl', type: 'string' }, { name: 'sortOrder', type: 'number' },
      ]},
    ],
    workflows: [],
    roles: [
      { name: 'Admin', permissions: ['all'], description: 'Full system access' },
      { name: 'Editor', permissions: ['create-pages', 'edit-pages', 'publish'], description: 'Documentation writer' },
      { name: 'Viewer', permissions: ['view-docs', 'search'], description: 'Reader' },
    ],
    defaultKPIs: ['Total Pages', 'Page Views', 'Search Queries', 'Helpful Rating'],
    commonIntegrations: ['GitHub', 'Search Engine', 'Analytics'],
  },

  'news-media': {
    id: 'news-media',
    name: 'News / Media Platform',
    description: 'News publishing platform with articles, categories, editorial workflow, and breaking news',
    keywords: ['news', 'media', 'newspaper', 'press', 'editorial', 'journalism', 'article', 'breaking news', 'headline', 'reporter'],
    modules: [
      { name: 'Articles', description: 'Article management and publishing', entities: ['Article', 'Category', 'Author'], pages: [
        { name: 'Articles', path: '/admin/articles', description: 'Article management', features: ['search', 'status-filter', 'category-filter', 'author-filter', 'create-article'] },
        { name: 'Article View', path: '/articles/:slug', description: 'Published article', features: ['content', 'author-bio', 'related-articles', 'social-share', 'comments'] },
        { name: 'Home', path: '/', description: 'News home page', features: ['hero-article', 'category-sections', 'trending', 'breaking-news-banner', 'latest-articles'] },
      ], kpis: ['Articles Published', 'Page Views Today'] },
    ],
    entities: [
      { name: 'Article', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'title', type: 'string', required: true },
        { name: 'slug', type: 'string', required: true }, { name: 'content', type: 'string', required: true },
        { name: 'excerpt', type: 'string' }, { name: 'coverImageUrl', type: 'string' },
        { name: 'authorId', type: 'number', required: true }, { name: 'categoryId', type: 'number' },
        { name: 'status', type: 'enum:draft,review,published,archived', required: true },
        { name: 'isBreaking', type: 'boolean' }, { name: 'publishedAt', type: 'datetime' },
        { name: 'tags', type: 'string[]' },
      ]},
      { name: 'Category', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true },
        { name: 'slug', type: 'string', required: true }, { name: 'color', type: 'string' },
      ]},
      { name: 'Author', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true },
        { name: 'bio', type: 'string' }, { name: 'avatarUrl', type: 'string' },
        { name: 'role', type: 'enum:reporter,editor,contributor', required: true },
      ]},
    ],
    workflows: [
      { name: 'Editorial Flow', entity: 'Article', states: ['draft', 'review', 'published', 'archived'], transitions: [
        { from: 'draft', to: 'review', action: 'Submit for Review', role: 'reporter' },
        { from: 'review', to: 'published', action: 'Publish', role: 'editor' },
        { from: 'review', to: 'draft', action: 'Request Changes', role: 'editor' },
        { from: 'published', to: 'archived', action: 'Archive', role: 'editor' },
      ]},
    ],
    roles: [
      { name: 'Admin', permissions: ['all'], description: 'Full system access' },
      { name: 'Editor', permissions: ['manage-articles', 'publish', 'manage-categories'], description: 'Editorial staff' },
      { name: 'Reporter', permissions: ['create-articles', 'edit-own-articles'], description: 'Journalist' },
    ],
    defaultKPIs: ['Articles Published Today', 'Page Views', 'Active Readers', 'Breaking News Count'],
    commonIntegrations: ['Social Media', 'Analytics', 'Push Notifications'],
  },

  'gaming': {
    id: 'gaming',
    name: 'Gaming / Entertainment',
    description: 'Gaming platform with leaderboards, player profiles, achievements, and match tracking',
    keywords: ['game', 'gaming', 'quiz', 'trivia', 'leaderboard', 'scoreboard', 'puzzle', 'arcade', 'multiplayer', 'player', 'high score', 'achievement'],
    modules: [
      { name: 'Players', description: 'Player profiles and stats', entities: ['Player'], pages: [
        { name: 'Profile', path: '/players/:id', description: 'Player profile with stats', features: ['avatar', 'stats-grid', 'achievement-badges', 'match-history', 'rank'] },
      ], kpis: ['Total Players', 'Active Players'] },
      { name: 'Leaderboards', description: 'Score rankings and competitions', entities: ['Score'], pages: [
        { name: 'Leaderboard', path: '/leaderboard', description: 'Global and category rankings', features: ['rank-list', 'time-filter', 'category-filter', 'search-player'] },
      ], kpis: ['High Score', 'Games Played Today'] },
      { name: 'Achievements', description: 'Achievement and badge system', entities: ['Achievement', 'PlayerAchievement'], pages: [
        { name: 'Achievements', path: '/achievements', description: 'All achievements', features: ['achievement-grid', 'category-filter', 'progress-bar'] },
      ], kpis: ['Achievements Unlocked', 'Completion Rate'] },
      { name: 'Game', description: 'Main game interface', entities: [], pages: [
        { name: 'Play', path: '/', description: 'Main game screen', features: ['game-canvas', 'score-display', 'timer', 'pause-menu', 'game-over-screen'] },
      ] },
    ],
    entities: [
      { name: 'Player', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'username', type: 'string', required: true },
        { name: 'displayName', type: 'string' }, { name: 'avatarUrl', type: 'string' },
        { name: 'level', type: 'number' }, { name: 'experience', type: 'number' },
        { name: 'totalScore', type: 'number' }, { name: 'gamesPlayed', type: 'number' },
      ]},
      { name: 'Score', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'playerId', type: 'number', required: true },
        { name: 'score', type: 'number', required: true }, { name: 'category', type: 'string' },
        { name: 'duration', type: 'number' },
      ]},
      { name: 'Achievement', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true },
        { name: 'description', type: 'string' }, { name: 'iconUrl', type: 'string' },
        { name: 'points', type: 'number' }, { name: 'category', type: 'string' },
      ]},
      { name: 'PlayerAchievement', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'playerId', type: 'number', required: true },
        { name: 'achievementId', type: 'number', required: true }, { name: 'unlockedAt', type: 'datetime', required: true },
      ]},
    ],
    workflows: [],
    roles: [
      { name: 'Admin', permissions: ['all'], description: 'Full system access' },
      { name: 'Player', permissions: ['play-game', 'view-leaderboard', 'view-profile', 'view-achievements'], description: 'Game player' },
    ],
    defaultKPIs: ['Active Players', 'Games Played', 'High Score', 'Avg Session Time'],
    commonIntegrations: ['WebSockets', 'Analytics', 'Push Notifications'],
  },

  'forum': {
    id: 'forum',
    name: 'Forum / Discussion Board',
    description: 'Community discussion forum with threads, categories, voting, and moderation',
    keywords: ['forum', 'discussion', 'discussion board', 'community forum', 'threads', 'topic', 'bulletin board', 'q&a', 'question answer', 'reddit', 'discourse'],
    modules: [
      { name: 'Discussions', description: 'Threads and replies', entities: ['Thread', 'Reply', 'Category'], pages: [
        { name: 'Forum Home', path: '/', description: 'Category list with latest threads', features: ['category-list', 'latest-threads', 'trending', 'search'] },
        { name: 'Category', path: '/c/:slug', description: 'Threads in category', features: ['thread-list', 'sort-by-latest-popular', 'create-thread', 'pinned-threads'] },
        { name: 'Thread', path: '/t/:id', description: 'Thread with replies', features: ['original-post', 'reply-list', 'reply-editor', 'upvote-downvote', 'mark-solution', 'report'] },
      ], kpis: ['Total Threads', 'Replies Today', 'Active Users'] },
      { name: 'User Profiles', description: 'User reputation and activity', entities: ['ForumUser'], pages: [
        { name: 'Profile', path: '/u/:username', description: 'User profile with activity', features: ['bio', 'reputation-score', 'recent-posts', 'badges'] },
      ], kpis: ['Total Users', 'Avg Reputation'] },
    ],
    entities: [
      { name: 'Thread', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'title', type: 'string', required: true },
        { name: 'content', type: 'string', required: true }, { name: 'authorId', type: 'number', required: true },
        { name: 'categoryId', type: 'number', required: true }, { name: 'upvotes', type: 'number' },
        { name: 'replyCount', type: 'number' }, { name: 'viewCount', type: 'number' },
        { name: 'isPinned', type: 'boolean' }, { name: 'isLocked', type: 'boolean' },
        { name: 'status', type: 'enum:open,closed,deleted', required: true },
      ]},
      { name: 'Reply', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'threadId', type: 'number', required: true },
        { name: 'authorId', type: 'number', required: true }, { name: 'content', type: 'string', required: true },
        { name: 'parentId', type: 'number' }, { name: 'upvotes', type: 'number' },
        { name: 'isSolution', type: 'boolean' },
      ]},
      { name: 'Category', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true },
        { name: 'slug', type: 'string', required: true }, { name: 'description', type: 'string' },
        { name: 'color', type: 'string' }, { name: 'sortOrder', type: 'number' },
        { name: 'threadCount', type: 'number' },
      ]},
    ],
    workflows: [],
    roles: [
      { name: 'Admin', permissions: ['all'], description: 'Full system access' },
      { name: 'Moderator', permissions: ['pin-threads', 'lock-threads', 'delete-posts', 'ban-users'], description: 'Community moderator' },
      { name: 'Member', permissions: ['create-threads', 'reply', 'upvote', 'edit-own'], description: 'Forum member' },
    ],
    defaultKPIs: ['Active Threads', 'Posts Today', 'Active Users', 'Answered Questions'],
    commonIntegrations: ['Email Notifications', 'Markdown Parser', 'Analytics'],
  },

  'analytics': {
    id: 'analytics',
    name: 'Analytics / Reporting Tool',
    description: 'Data analytics dashboard with charts, reports, KPIs, and data visualization',
    keywords: ['analytics', 'reporting', 'metrics', 'data visualization', 'chart', 'statistics', 'insights', 'kpi', 'business intelligence', 'bi', 'data dashboard'],
    modules: [
      { name: 'Dashboards', description: 'Customizable dashboards with widgets', entities: ['Dashboard', 'Widget'], pages: [
        { name: 'Dashboard', path: '/', description: 'Main analytics dashboard', features: ['kpi-cards', 'line-charts', 'bar-charts', 'pie-charts', 'date-range-picker', 'comparison-toggle'] },
        { name: 'Custom Dashboard', path: '/dashboards/:id', description: 'Custom dashboard builder', features: ['widget-grid', 'add-widget', 'drag-resize', 'save-layout'] },
      ], kpis: ['Total Dashboards', 'Active Users'] },
      { name: 'Reports', description: 'Generate and export reports', entities: ['Report'], pages: [
        { name: 'Reports', path: '/reports', description: 'Report library', features: ['report-list', 'create-report', 'schedule-report', 'export-pdf-csv'] },
      ], kpis: ['Reports Generated', 'Scheduled Reports'] },
      { name: 'Data Sources', description: 'Connect and manage data sources', entities: ['DataSource'], pages: [
        { name: 'Data Sources', path: '/admin/sources', description: 'Manage data connections', features: ['source-list', 'add-source', 'test-connection', 'sync-status'] },
      ], kpis: ['Connected Sources', 'Last Sync'] },
    ],
    entities: [
      { name: 'Dashboard', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true },
        { name: 'description', type: 'string' }, { name: 'ownerId', type: 'number', required: true },
        { name: 'isPublic', type: 'boolean' }, { name: 'layout', type: 'string' },
      ]},
      { name: 'Widget', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'dashboardId', type: 'number', required: true },
        { name: 'type', type: 'enum:kpi-card,line-chart,bar-chart,pie-chart,table,text', required: true },
        { name: 'title', type: 'string', required: true }, { name: 'config', type: 'string' },
        { name: 'position', type: 'string' }, { name: 'size', type: 'string' },
      ]},
      { name: 'Report', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true },
        { name: 'type', type: 'string' }, { name: 'config', type: 'string' },
        { name: 'schedule', type: 'string' }, { name: 'lastRunAt', type: 'datetime' },
      ]},
      { name: 'DataSource', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true },
        { name: 'type', type: 'enum:database,api,csv,spreadsheet', required: true },
        { name: 'connectionString', type: 'string' },
        { name: 'status', type: 'enum:connected,disconnected,error', required: true },
        { name: 'lastSyncAt', type: 'datetime' },
      ]},
    ],
    workflows: [],
    roles: [
      { name: 'Admin', permissions: ['all'], description: 'Full system access' },
      { name: 'Analyst', permissions: ['create-dashboards', 'create-reports', 'view-data'], description: 'Data analyst' },
      { name: 'Viewer', permissions: ['view-dashboards', 'view-reports'], description: 'Report viewer' },
    ],
    defaultKPIs: ['Active Users', 'Reports Generated', 'Data Sources', 'Dashboard Views'],
    commonIntegrations: ['Database Connectors', 'Google Sheets', 'Export APIs'],
  },

  'recipe': {
    id: 'recipe',
    name: 'Recipe / Food Platform',
    description: 'Recipe sharing platform with ingredients, instructions, meal planning, and nutritional info',
    keywords: ['recipe', 'recipes', 'cookbook', 'meal plan', 'food', 'cooking', 'ingredients', 'nutrition', 'meal prep', 'diet', 'food blog'],
    modules: [
      { name: 'Recipes', description: 'Recipe collection and browsing', entities: ['Recipe', 'Ingredient', 'Category'], pages: [
        { name: 'Recipes', path: '/', description: 'Recipe gallery with filters', features: ['recipe-cards', 'category-filter', 'cuisine-filter', 'difficulty-filter', 'search', 'cook-time-filter'] },
        { name: 'Recipe Detail', path: '/recipes/:slug', description: 'Full recipe with instructions', features: ['ingredient-list', 'step-instructions', 'cooking-time', 'servings-adjuster', 'nutrition-info', 'rating', 'print', 'save'] },
        { name: 'Add Recipe', path: '/recipes/new', description: 'Create new recipe', features: ['title-description', 'ingredient-builder', 'step-editor', 'image-upload', 'tags', 'nutrition-calculator'] },
      ], kpis: ['Total Recipes', 'Most Popular Recipe'] },
      { name: 'Meal Planning', description: 'Weekly meal planner', entities: ['MealPlan'], pages: [
        { name: 'Meal Planner', path: '/planner', description: 'Weekly meal planning calendar', features: ['week-view', 'drag-drop-recipes', 'shopping-list-generator', 'nutrition-summary'] },
      ], kpis: ['Plans Created', 'Recipes in Plans'] },
      { name: 'Shopping List', description: 'Generate shopping lists from recipes', entities: ['ShoppingItem'], pages: [
        { name: 'Shopping List', path: '/shopping-list', description: 'Aggregated shopping list', features: ['item-list', 'check-off', 'add-custom-item', 'share'] },
      ] },
    ],
    entities: [
      { name: 'Recipe', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'title', type: 'string', required: true },
        { name: 'slug', type: 'string', required: true }, { name: 'description', type: 'string' },
        { name: 'instructions', type: 'string', required: true }, { name: 'prepTime', type: 'number' },
        { name: 'cookTime', type: 'number' }, { name: 'servings', type: 'number', required: true },
        { name: 'difficulty', type: 'enum:easy,medium,hard', required: true },
        { name: 'cuisine', type: 'string' }, { name: 'imageUrl', type: 'string' },
        { name: 'calories', type: 'number' }, { name: 'authorId', type: 'number' },
        { name: 'rating', type: 'number' }, { name: 'tags', type: 'string[]' },
      ]},
      { name: 'Ingredient', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'recipeId', type: 'number', required: true },
        { name: 'name', type: 'string', required: true }, { name: 'quantity', type: 'string', required: true },
        { name: 'unit', type: 'string' }, { name: 'notes', type: 'string' }, { name: 'sortOrder', type: 'number' },
      ]},
      { name: 'MealPlan', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'userId', type: 'number', required: true },
        { name: 'date', type: 'date', required: true },
        { name: 'mealType', type: 'enum:breakfast,lunch,dinner,snack', required: true },
        { name: 'recipeId', type: 'number', required: true },
      ]},
    ],
    workflows: [],
    roles: [
      { name: 'Admin', permissions: ['all'], description: 'Full system access' },
      { name: 'Chef', permissions: ['create-recipes', 'edit-own', 'manage-categories'], description: 'Recipe creator' },
      { name: 'User', permissions: ['view-recipes', 'save-recipes', 'create-meal-plans', 'rate'], description: 'Home cook' },
    ],
    defaultKPIs: ['Total Recipes', 'Most Popular', 'Active Users', 'Recipes Added This Week'],
    commonIntegrations: ['Nutrition API', 'Image CDN', 'Social Share'],
  },

  'job-board': {
    id: 'job-board',
    name: 'Job Board / Recruitment',
    description: 'Job listing platform with applications, company profiles, and candidate management',
    keywords: ['job board', 'job listing', 'careers', 'recruitment', 'hiring', 'job portal', 'applicant', 'candidate', 'job search', 'job post', 'career page', 'employment'],
    modules: [
      { name: 'Job Listings', description: 'Post and browse job openings', entities: ['Job', 'Company'], pages: [
        { name: 'Job Board', path: '/', description: 'Job listing with search and filters', features: ['search', 'location-filter', 'type-filter', 'salary-filter', 'remote-filter', 'category-filter'] },
        { name: 'Job Detail', path: '/jobs/:slug', description: 'Full job posting with apply button', features: ['job-description', 'requirements', 'salary-range', 'company-info', 'apply-button', 'share'] },
        { name: 'Post Job', path: '/post-job', description: 'Create job listing', features: ['job-form', 'rich-editor', 'salary-range', 'tags', 'preview'] },
      ], kpis: ['Active Jobs', 'New This Week'] },
      { name: 'Applications', description: 'Application tracking', entities: ['Application'], pages: [
        { name: 'Applications', path: '/admin/applications', description: 'Application management', features: ['search', 'status-filter', 'job-filter', 'resume-download', 'status-update'] },
      ], kpis: ['Total Applications', 'Pending Review'] },
      { name: 'Companies', description: 'Company profiles', entities: ['Company'], pages: [
        { name: 'Companies', path: '/companies', description: 'Company directory', features: ['company-cards', 'industry-filter', 'search'] },
        { name: 'Company Profile', path: '/companies/:slug', description: 'Company page with open positions', features: ['company-info', 'open-positions', 'about', 'benefits'] },
      ], kpis: ['Total Companies'] },
    ],
    entities: [
      { name: 'Job', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'title', type: 'string', required: true },
        { name: 'slug', type: 'string', required: true }, { name: 'description', type: 'string', required: true },
        { name: 'requirements', type: 'string' }, { name: 'companyId', type: 'number', required: true },
        { name: 'location', type: 'string' }, { name: 'type', type: 'enum:full-time,part-time,contract,internship,remote', required: true },
        { name: 'salaryMin', type: 'number' }, { name: 'salaryMax', type: 'number' },
        { name: 'category', type: 'string' }, { name: 'status', type: 'enum:active,closed,draft', required: true },
      ]},
      { name: 'Application', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'jobId', type: 'number', required: true },
        { name: 'applicantName', type: 'string', required: true }, { name: 'applicantEmail', type: 'string', required: true },
        { name: 'resumeUrl', type: 'string' }, { name: 'coverLetter', type: 'string' },
        { name: 'status', type: 'enum:submitted,reviewing,shortlisted,interview,offered,rejected', required: true },
      ]},
      { name: 'Company', fields: [
        { name: 'id', type: 'serial', required: true }, { name: 'name', type: 'string', required: true },
        { name: 'slug', type: 'string', required: true }, { name: 'description', type: 'string' },
        { name: 'logoUrl', type: 'string' }, { name: 'website', type: 'string' },
        { name: 'industry', type: 'string' }, { name: 'size', type: 'string' }, { name: 'location', type: 'string' },
      ]},
    ],
    workflows: [
      { name: 'Application Pipeline', entity: 'Application', states: ['submitted', 'reviewing', 'shortlisted', 'interview', 'offered', 'rejected'], transitions: [
        { from: 'submitted', to: 'reviewing', action: 'Review', role: 'recruiter' },
        { from: 'reviewing', to: 'shortlisted', action: 'Shortlist', role: 'recruiter' },
        { from: 'shortlisted', to: 'interview', action: 'Schedule Interview', role: 'recruiter' },
        { from: 'interview', to: 'offered', action: 'Make Offer', role: 'recruiter' },
        { from: 'reviewing', to: 'rejected', action: 'Reject', role: 'recruiter' },
      ]},
    ],
    roles: [
      { name: 'Admin', permissions: ['all'], description: 'Full system access' },
      { name: 'Recruiter', permissions: ['post-jobs', 'manage-applications', 'manage-company'], description: 'Hiring manager' },
      { name: 'Applicant', permissions: ['view-jobs', 'apply', 'view-applications'], description: 'Job seeker' },
    ],
    defaultKPIs: ['Active Jobs', 'Applications This Week', 'Companies', 'Hired This Month'],
    commonIntegrations: ['LinkedIn', 'Email Service', 'Calendar'],
  },

  'marketplace': {
    id: 'marketplace',
    name: 'Marketplace / Multi-Vendor Platform',
    description: 'Multi-vendor marketplace for buying and selling goods or services',
    keywords: ['marketplace', 'multi-vendor', 'sellers', 'buyers', 'listings', 'marketplace platform', 'peer-to-peer', 'p2p'],
    modules: [
      {
        name: 'Listings Management',
        description: 'Create, browse, and manage product or service listings',
        entities: ['Listing', 'Category', 'User'],
        pages: [
          { name: 'Browse Listings', path: '/listings', description: 'Searchable listing catalog with filters', features: ['search', 'filter', 'card-grid'] },
          { name: 'Listing Detail', path: '/listings/:id', description: 'Individual listing with gallery and seller info', features: ['image-gallery', 'contact-seller', 'add-to-cart'] },
          { name: 'Create Listing', path: '/listings/new', description: 'Multi-step listing creation form', features: ['image-upload', 'category-select', 'pricing'] },
        ],
      },
      {
        name: 'Orders & Transactions',
        description: 'Manage purchases, sales, and payment processing',
        entities: ['Order', 'OrderItem', 'Payment'],
        pages: [
          { name: 'My Orders', path: '/orders', description: 'View and manage purchase/sale orders', features: ['order-list', 'status-filter', 'order-tracking'] },
          { name: 'Order Detail', path: '/orders/:id', description: 'Single order details with status timeline', features: ['status-timeline', 'shipping-info', 'invoice'] },
        ],
      },
      {
        name: 'Reviews & Ratings',
        description: 'Buyer reviews and seller ratings system',
        entities: ['Review', 'User'],
        pages: [
          { name: 'Reviews', path: '/reviews', description: 'View and submit product reviews', features: ['star-rating', 'review-form', 'review-list'] },
        ],
      },
      {
        name: 'Dashboard',
        description: 'Seller analytics and marketplace overview',
        entities: ['User', 'Listing', 'Order'],
        pages: [
          { name: 'Seller Dashboard', path: '/dashboard', description: 'Sales analytics and listing performance', features: ['revenue-chart', 'order-stats', 'top-listings'] },
        ],
      },
    ],
    entities: [
      {
        name: 'Listing',
        fields: [
          { name: 'id', type: 'serial', required: true },
          { name: 'title', type: 'string', required: true },
          { name: 'description', type: 'string', required: true },
          { name: 'price', type: 'number', required: true },
          { name: 'sellerId', type: 'number', required: true, description: 'References User' },
          { name: 'categoryId', type: 'number', description: 'References Category' },
          { name: 'images', type: 'string[]' },
          { name: 'status', type: 'enum:draft,active,sold,archived', required: true },
          { name: 'createdAt', type: 'date', required: true },
        ],
        relationships: [
          { entity: 'User', type: 'many-to-one', field: 'sellerId' },
          { entity: 'Category', type: 'many-to-one', field: 'categoryId' },
          { entity: 'Review', type: 'one-to-many' },
        ],
      },
      {
        name: 'Category',
        fields: [
          { name: 'id', type: 'serial', required: true },
          { name: 'name', type: 'string', required: true },
          { name: 'slug', type: 'string', required: true },
          { name: 'parentId', type: 'number', description: 'Self-referencing parent category' },
        ],
      },
      {
        name: 'Order',
        fields: [
          { name: 'id', type: 'serial', required: true },
          { name: 'buyerId', type: 'number', required: true, description: 'References User' },
          { name: 'sellerId', type: 'number', required: true, description: 'References User' },
          { name: 'listingId', type: 'number', required: true, description: 'References Listing' },
          { name: 'amount', type: 'number', required: true },
          { name: 'status', type: 'enum:pending,confirmed,shipped,delivered,cancelled,refunded', required: true },
          { name: 'createdAt', type: 'date', required: true },
        ],
        relationships: [
          { entity: 'User', type: 'many-to-one', field: 'buyerId' },
          { entity: 'User', type: 'many-to-one', field: 'sellerId' },
          { entity: 'Listing', type: 'many-to-one', field: 'listingId' },
        ],
      },
      {
        name: 'Review',
        fields: [
          { name: 'id', type: 'serial', required: true },
          { name: 'reviewerId', type: 'number', required: true, description: 'References User' },
          { name: 'listingId', type: 'number', required: true, description: 'References Listing' },
          { name: 'rating', type: 'number', required: true },
          { name: 'comment', type: 'string' },
          { name: 'createdAt', type: 'date', required: true },
        ],
        relationships: [
          { entity: 'User', type: 'many-to-one', field: 'reviewerId' },
          { entity: 'Listing', type: 'many-to-one', field: 'listingId' },
        ],
      },
    ],
    workflows: [
      { entity: 'Order', name: 'Order Lifecycle', states: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'], transitions: [
        { from: 'pending', to: 'confirmed', action: 'Confirm', role: 'seller' },
        { from: 'confirmed', to: 'shipped', action: 'Ship', role: 'seller' },
        { from: 'shipped', to: 'delivered', action: 'Mark Delivered', role: 'buyer' },
        { from: 'pending', to: 'cancelled', action: 'Cancel', role: 'buyer' },
        { from: 'delivered', to: 'refunded', action: 'Refund', role: 'admin' },
      ]},
      { entity: 'Listing', name: 'Listing Lifecycle', states: ['draft', 'active', 'sold', 'archived'], transitions: [
        { from: 'draft', to: 'active', action: 'Publish', role: 'seller' },
        { from: 'active', to: 'sold', action: 'Mark Sold', role: 'seller' },
        { from: 'active', to: 'archived', action: 'Archive', role: 'seller' },
      ]},
    ],
    roles: [
      { name: 'Admin', permissions: ['all'], description: 'Full system access' },
      { name: 'Seller', permissions: ['create-listing', 'manage-listings', 'view-orders', 'manage-orders'], description: 'Sells items' },
      { name: 'Buyer', permissions: ['browse', 'purchase', 'review', 'view-orders'], description: 'Purchases items' },
    ],
    defaultKPIs: ['Active Listings', 'Orders This Month', 'Revenue', 'Active Sellers'],
    commonIntegrations: ['Stripe', 'S3/Object Storage', 'Email Service'],
  },
};

export function getAllDomains(): IndustryDomain[] {
  return Object.values(INDUSTRY_DOMAINS);
}

export function getDomain(id: string): IndustryDomain | undefined {
  return INDUSTRY_DOMAINS[id];
}

export function detectDomainFromText(text: string): { domain: IndustryDomain; confidence: number; matchedKeywords: string[] }[] {
  const lower = text.toLowerCase();
  const results: { domain: IndustryDomain; confidence: number; matchedKeywords: string[] }[] = [];

  for (const domain of Object.values(INDUSTRY_DOMAINS)) {
    const matchedKeywords = domain.keywords.filter(kw => lower.includes(kw));
    if (matchedKeywords.length > 0) {
      const confidence = Math.min(matchedKeywords.length / Math.max(domain.keywords.length * 0.3, 1), 1);
      results.push({ domain, confidence, matchedKeywords });
    }
  }

  results.sort((a, b) => b.confidence - a.confidence);
  return results;
}

export function getAvailableDomainNames(): string[] {
  return Object.values(INDUSTRY_DOMAINS).map(d => d.name);
}

export function buildEntitiesForModules(domain: IndustryDomain, selectedModuleNames: string[]): DomainEntity[] {
  const neededEntityNames = new Set<string>();
  for (const modName of selectedModuleNames) {
    const mod = domain.modules.find(m => m.name === modName);
    if (mod) {
      mod.entities.forEach(e => neededEntityNames.add(e));
    }
  }

  return domain.entities.filter(e => neededEntityNames.has(e.name));
}

export function buildPagesForModules(domain: IndustryDomain, selectedModuleNames: string[]): { module: string; pages: DomainModule['pages'] }[] {
  const result: { module: string; pages: DomainModule['pages'] }[] = [];
  for (const modName of selectedModuleNames) {
    const mod = domain.modules.find(m => m.name === modName);
    if (mod) {
      result.push({ module: mod.name, pages: mod.pages });
    }
  }
  return result;
}

export function buildWorkflowsForEntities(domain: IndustryDomain, entityNames: string[]): DomainWorkflow[] {
  return domain.workflows.filter(w => entityNames.includes(w.entity));
}