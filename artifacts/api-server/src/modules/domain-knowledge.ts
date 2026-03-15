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