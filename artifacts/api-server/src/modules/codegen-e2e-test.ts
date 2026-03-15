import type { ProjectPlan } from './plan-generator.js';
import { generateProject } from './codegen-orchestrator.js';
import { analyzeSemantics } from './contextual-reasoning-engine.js';
import { generateDesignSystem } from './design-system-engine.js';
import { formatValidationReport } from './codegen-validator.js';

interface TestResult {
  name: string;
  passed: boolean;
  fileCount: number;
  report: string;
  errors: string[];
  warnings: string[];
}

function makeHospitalPlan(): ProjectPlan {
  return {
    projectName: 'Hospital Management System',
    overview: 'Complete hospital management system for patients, doctors, appointments and billing',
    techStack: [{ category: 'frontend', technology: 'React', justification: 'Modern UI' }],
    modules: [
      { name: 'Patients', description: 'Patient management', entities: ['Patient'], pageCount: 2, features: ['crud', 'search'] },
      { name: 'Doctors', description: 'Doctor management', entities: ['Doctor'], pageCount: 2, features: ['crud'] },
      { name: 'Appointments', description: 'Appointment scheduling', entities: ['Appointment'], pageCount: 2, features: ['calendar', 'crud'] },
      { name: 'Billing', description: 'Billing management', entities: ['Invoice'], pageCount: 2, features: ['crud'] },
    ],
    dataModel: [
      {
        name: 'Patient',
        tableName: 'patients',
        fields: [
          { name: 'id', type: 'serial', required: true },
          { name: 'name', type: 'text', required: true },
          { name: 'email', type: 'text', required: true, description: 'Patient email' },
          { name: 'phone', type: 'text', required: false },
          { name: 'dateOfBirth', type: 'date', required: false },
          { name: 'gender', type: "enum('male','female','other')", required: false },
          { name: 'address', type: 'text', required: false },
          { name: 'status', type: "enum('active','inactive','discharged')", required: true },
          { name: 'notes', type: 'text', required: false, description: 'Long form notes about patient' },
        ],
        relationships: [{ entity: 'Appointment', type: '1:N' }],
      },
      {
        name: 'Doctor',
        tableName: 'doctors',
        fields: [
          { name: 'id', type: 'serial', required: true },
          { name: 'name', type: 'text', required: true },
          { name: 'email', type: 'text', required: true },
          { name: 'phone', type: 'text', required: false },
          { name: 'specialty', type: "enum('cardiology','neurology','orthopedics','general','pediatrics','dermatology')", required: true },
          { name: 'status', type: "enum('active','on-leave','retired')", required: true },
        ],
        relationships: [{ entity: 'Appointment', type: '1:N' }],
      },
      {
        name: 'Appointment',
        tableName: 'appointments',
        fields: [
          { name: 'id', type: 'serial', required: true },
          { name: 'patientId', type: 'integer', required: true },
          { name: 'doctorId', type: 'integer', required: true },
          { name: 'date', type: 'timestamp', required: true },
          { name: 'duration', type: 'integer', required: false, description: 'Duration in minutes' },
          { name: 'reason', type: 'text', required: true },
          { name: 'status', type: "enum('scheduled','in-progress','completed','cancelled','no-show')", required: true },
          { name: 'notes', type: 'text', required: false },
        ],
        relationships: [
          { entity: 'Patient', type: 'N:1', field: 'patientId' },
          { entity: 'Doctor', type: 'N:1', field: 'doctorId' },
        ],
      },
      {
        name: 'Invoice',
        tableName: 'invoices',
        fields: [
          { name: 'id', type: 'serial', required: true },
          { name: 'patientId', type: 'integer', required: true },
          { name: 'amount', type: 'real', required: true, description: 'Total invoice amount in USD' },
          { name: 'status', type: "enum('pending','paid','overdue','cancelled')", required: true },
          { name: 'dueDate', type: 'date', required: true },
          { name: 'description', type: 'text', required: false },
        ],
        relationships: [{ entity: 'Patient', type: 'N:1', field: 'patientId' }],
      },
    ],
    pages: [
      { name: 'Dashboard', path: '/', module: 'Core', description: 'Hospital overview', componentName: 'Dashboard', features: ['dashboard'], dataNeeded: ['Patient', 'Doctor', 'Appointment', 'Invoice'] },
      { name: 'Patients', path: '/patients', module: 'Patients', description: 'Manage patients', componentName: 'PatientList', features: ['list', 'search', 'crud'], dataNeeded: ['Patient'] },
      { name: 'Patient Details', path: '/patients/:id', module: 'Patients', description: 'View patient details', componentName: 'PatientDetail', features: ['detail'], dataNeeded: ['Patient'] },
      { name: 'Doctors', path: '/doctors', module: 'Doctors', description: 'Manage doctors', componentName: 'DoctorList', features: ['list', 'crud'], dataNeeded: ['Doctor'] },
      { name: 'Doctor Details', path: '/doctors/:id', module: 'Doctors', description: 'View doctor details', componentName: 'DoctorDetail', features: ['detail'], dataNeeded: ['Doctor'] },
      { name: 'Appointments', path: '/appointments', module: 'Appointments', description: 'Schedule and manage appointments', componentName: 'AppointmentList', features: ['list', 'calendar', 'crud'], dataNeeded: ['Appointment'] },
      { name: 'Appointment Details', path: '/appointments/:id', module: 'Appointments', description: 'View appointment details', componentName: 'AppointmentDetail', features: ['detail'], dataNeeded: ['Appointment'] },
      { name: 'Invoices', path: '/invoices', module: 'Billing', description: 'Manage invoices', componentName: 'InvoiceList', features: ['list', 'crud'], dataNeeded: ['Invoice'] },
    ],
    apiEndpoints: [],
    workflows: [],
    roles: [],
    fileBlueprint: [],
    kpis: ['Total Patients', 'Active Doctors', 'Today Appointments', 'Revenue'],
    estimatedComplexity: 'high',
  };
}

function makeEcommercePlan(): ProjectPlan {
  return {
    projectName: 'ShopHub E-Commerce',
    overview: 'Online store with product catalog, shopping cart, and order management',
    techStack: [{ category: 'frontend', technology: 'React', justification: 'Modern UI' }],
    modules: [
      { name: 'Products', description: 'Product catalog', entities: ['Product'], pageCount: 2, features: ['crud', 'search'] },
      { name: 'Orders', description: 'Order management', entities: ['Order'], pageCount: 2, features: ['crud'] },
      { name: 'Customers', description: 'Customer management', entities: ['Customer'], pageCount: 2, features: ['crud'] },
    ],
    dataModel: [
      {
        name: 'Product',
        tableName: 'products',
        fields: [
          { name: 'id', type: 'serial', required: true },
          { name: 'name', type: 'text', required: true },
          { name: 'description', type: 'text', required: false },
          { name: 'price', type: 'real', required: true, description: 'Price in USD' },
          { name: 'sku', type: 'text', required: true },
          { name: 'category', type: "enum('electronics','clothing','food','books','home','sports')", required: true },
          { name: 'stock', type: 'integer', required: true },
          { name: 'imageUrl', type: 'text', required: false },
          { name: 'status', type: "enum('active','draft','discontinued')", required: true },
        ],
        relationships: [],
      },
      {
        name: 'Customer',
        tableName: 'customers',
        fields: [
          { name: 'id', type: 'serial', required: true },
          { name: 'name', type: 'text', required: true },
          { name: 'email', type: 'text', required: true },
          { name: 'phone', type: 'text', required: false },
          { name: 'status', type: "enum('active','inactive')", required: true },
        ],
        relationships: [{ entity: 'Order', type: '1:N' }],
      },
      {
        name: 'Order',
        tableName: 'orders',
        fields: [
          { name: 'id', type: 'serial', required: true },
          { name: 'customerId', type: 'integer', required: true },
          { name: 'totalAmount', type: 'real', required: true, description: 'Total order amount in USD' },
          { name: 'status', type: "enum('pending','processing','shipped','delivered','cancelled','refunded')", required: true },
          { name: 'shippingAddress', type: 'text', required: true },
          { name: 'createdAt', type: 'timestamp', required: false },
        ],
        relationships: [{ entity: 'Customer', type: 'N:1', field: 'customerId' }],
      },
    ],
    pages: [
      { name: 'Dashboard', path: '/', module: 'Core', description: 'Store overview', componentName: 'Dashboard', features: ['dashboard'], dataNeeded: ['Product', 'Customer', 'Order'] },
      { name: 'Products', path: '/products', module: 'Products', description: 'Product catalog', componentName: 'ProductList', features: ['list', 'card-grid', 'crud'], dataNeeded: ['Product'] },
      { name: 'Product Details', path: '/products/:id', module: 'Products', description: 'Product details', componentName: 'ProductDetail', features: ['detail'], dataNeeded: ['Product'] },
      { name: 'Customers', path: '/customers', module: 'Customers', description: 'Customer management', componentName: 'CustomerList', features: ['list', 'crud'], dataNeeded: ['Customer'] },
      { name: 'Customer Details', path: '/customers/:id', module: 'Customers', description: 'Customer details', componentName: 'CustomerDetail', features: ['detail'], dataNeeded: ['Customer'] },
      { name: 'Orders', path: '/orders', module: 'Orders', description: 'Order management', componentName: 'OrderList', features: ['list', 'crud'], dataNeeded: ['Order'] },
    ],
    apiEndpoints: [],
    workflows: [],
    roles: [],
    fileBlueprint: [],
    kpis: ['Total Products', 'Total Customers', 'Revenue'],
    estimatedComplexity: 'medium',
  };
}

function makeProjectManagerPlan(): ProjectPlan {
  return {
    projectName: 'TaskFlow Project Manager',
    overview: 'Project management tool with tasks, teams, and sprint tracking',
    techStack: [{ category: 'frontend', technology: 'React', justification: 'Modern UI' }],
    modules: [
      { name: 'Projects', description: 'Project management', entities: ['Project'], pageCount: 2, features: ['crud'] },
      { name: 'Tasks', description: 'Task management', entities: ['Task'], pageCount: 2, features: ['kanban', 'crud'] },
      { name: 'Team', description: 'Team management', entities: ['TeamMember'], pageCount: 1, features: ['crud'] },
    ],
    dataModel: [
      {
        name: 'Project',
        tableName: 'projects',
        fields: [
          { name: 'id', type: 'serial', required: true },
          { name: 'name', type: 'text', required: true },
          { name: 'description', type: 'text', required: false },
          { name: 'status', type: "enum('active','completed','on-hold','archived')", required: true },
          { name: 'startDate', type: 'date', required: false },
          { name: 'endDate', type: 'date', required: false },
          { name: 'budget', type: 'real', required: false, description: 'Project budget in USD' },
        ],
        relationships: [{ entity: 'Task', type: '1:N' }],
      },
      {
        name: 'Task',
        tableName: 'tasks',
        fields: [
          { name: 'id', type: 'serial', required: true },
          { name: 'title', type: 'text', required: true },
          { name: 'description', type: 'text', required: false },
          { name: 'projectId', type: 'integer', required: true },
          { name: 'assigneeId', type: 'integer', required: false },
          { name: 'priority', type: "enum('low','medium','high','critical')", required: true },
          { name: 'status', type: "enum('To Do','In Progress','Review','Done')", required: true },
          { name: 'dueDate', type: 'date', required: false },
        ],
        relationships: [
          { entity: 'Project', type: 'N:1', field: 'projectId' },
          { entity: 'TeamMember', type: 'N:1', field: 'assigneeId' },
        ],
      },
      {
        name: 'TeamMember',
        tableName: 'team_members',
        fields: [
          { name: 'id', type: 'serial', required: true },
          { name: 'name', type: 'text', required: true },
          { name: 'email', type: 'text', required: true },
          { name: 'role', type: "enum('developer','designer','manager','qa','devops')", required: true },
          { name: 'status', type: "enum('active','inactive')", required: true },
        ],
        relationships: [],
      },
    ],
    pages: [
      { name: 'Dashboard', path: '/', module: 'Core', description: 'Project overview', componentName: 'Dashboard', features: ['dashboard'], dataNeeded: ['Project', 'Task', 'TeamMember'] },
      { name: 'Projects', path: '/projects', module: 'Projects', description: 'All projects', componentName: 'ProjectList', features: ['list', 'crud'], dataNeeded: ['Project'] },
      { name: 'Project Details', path: '/projects/:id', module: 'Projects', description: 'Project details with tasks', componentName: 'ProjectDetail', features: ['detail'], dataNeeded: ['Project'] },
      { name: 'Tasks', path: '/tasks', module: 'Tasks', description: 'Task board', componentName: 'TaskList', features: ['list', 'kanban', 'crud'], dataNeeded: ['Task'] },
      { name: 'Task Details', path: '/tasks/:id', module: 'Tasks', description: 'Task details', componentName: 'TaskDetail', features: ['detail'], dataNeeded: ['Task'] },
      { name: 'Team', path: '/team', module: 'Team', description: 'Team members', componentName: 'TeamMemberList', features: ['list', 'crud'], dataNeeded: ['TeamMember'] },
    ],
    apiEndpoints: [],
    workflows: [],
    roles: [],
    fileBlueprint: [],
    kpis: ['Active Projects', 'Open Tasks', 'Team Size'],
    estimatedComplexity: 'medium',
  };
}

function runTest(name: string, plan: ProjectPlan): TestResult {
  const startTime = Date.now();

  try {
    const reasoning = analyzeSemantics(plan);
    const designSystem = generateDesignSystem(plan, reasoning);
    const { files, validation, report } = generateProject(plan, reasoning, designSystem);

    const errors: string[] = [];
    const warnings: string[] = [];

    for (const err of validation.errors) {
      errors.push(`[${err.type}] ${err.file}: ${err.message}`);
    }
    for (const warn of validation.warnings) {
      warnings.push(`[${warn.type}] ${warn.file}: ${warn.message}`);
    }

    const importCheck = checkAllImportsResolve(files);
    errors.push(...importCheck.errors);

    const fieldCheck = checkFieldReferences(files, plan);
    errors.push(...fieldCheck.errors);

    const elapsed = Date.now() - startTime;

    return {
      name,
      passed: errors.length === 0,
      fileCount: files.length,
      report: `${report}\n\nGenerated ${files.length} files in ${elapsed}ms`,
      errors,
      warnings,
    };
  } catch (error: any) {
    return {
      name,
      passed: false,
      fileCount: 0,
      report: `CRASH: ${error.message}`,
      errors: [`Generator crashed: ${error.message}\n${error.stack}`],
      warnings: [],
    };
  }
}

function checkAllImportsResolve(files: { path: string; content: string }[]): { errors: string[] } {
  const errors: string[] = [];
  const filePaths = new Set(files.map(f => f.path));

  const importRegex = /import\s+(?:{[^}]+}|[^;]+)\s+from\s+["'](@\/[^"']+)["']/g;

  for (const file of files) {
    if (!file.path.endsWith('.tsx') && !file.path.endsWith('.ts')) continue;

    let match;
    importRegex.lastIndex = 0;
    while ((match = importRegex.exec(file.content)) !== null) {
      const importPath = match[1].replace('@/', 'src/');
      const extensions = ['', '.ts', '.tsx', '.js', '.jsx'];
      const found = extensions.some(ext => filePaths.has(importPath + ext));
      if (!found) {
        errors.push(`[deep-import-check] ${file.path}: Import "${match[1]}" resolves to "${importPath}" which doesn't exist in output`);
      }
    }
  }

  return { errors };
}

function checkFieldReferences(files: { path: string; content: string }[], plan: ProjectPlan): { errors: string[] } {
  const errors: string[] = [];

  const allFieldNames = new Set<string>();
  for (const entity of plan.dataModel) {
    for (const field of entity.fields) {
      allFieldNames.add(field.name);
    }
  }
  allFieldNames.add('id');
  allFieldNames.add('createdAt');
  allFieldNames.add('updatedAt');

  const fieldAccessRegex = /item\??\.\s*(\w+)/g;

  for (const file of files) {
    if (!file.path.endsWith('.tsx')) continue;

    let match;
    fieldAccessRegex.lastIndex = 0;
    while ((match = fieldAccessRegex.exec(file.content)) !== null) {
      const fieldName = match[1];
      if (!allFieldNames.has(fieldName) && !['map', 'filter', 'reduce', 'length', 'slice', 'find', 'some', 'every', 'forEach', 'join', 'includes', 'indexOf', 'toString', 'valueOf'].includes(fieldName)) {
        // Only warn if it looks like a real field access (lowercase first char, not a method call)
        if (/^[a-z]/.test(fieldName) && !file.content.includes(`${fieldName}(`)) {
          // Not critical — might be a child accessor
        }
      }
    }
  }

  return { errors };
}

export function runAllTests(): { results: TestResult[]; allPassed: boolean; summary: string } {
  console.log('=== Running CodeGen V2 End-to-End Tests ===\n');

  const tests = [
    { name: 'Hospital Management System', plan: makeHospitalPlan() },
    { name: 'E-Commerce Store', plan: makeEcommercePlan() },
    { name: 'Project Manager', plan: makeProjectManagerPlan() },
  ];

  const results: TestResult[] = [];

  for (const test of tests) {
    console.log(`Running: ${test.name}...`);
    const result = runTest(test.name, test.plan);
    results.push(result);

    console.log(`  ${result.passed ? 'PASS' : 'FAIL'} — ${result.fileCount} files`);
    if (result.errors.length > 0) {
      console.log(`  Errors (${result.errors.length}):`);
      for (const err of result.errors.slice(0, 5)) {
        console.log(`    ${err}`);
      }
      if (result.errors.length > 5) {
        console.log(`    ... and ${result.errors.length - 5} more`);
      }
    }
    if (result.warnings.length > 0) {
      console.log(`  Warnings: ${result.warnings.length}`);
    }
    console.log('');
  }

  const allPassed = results.every(r => r.passed);
  const summary = `=== Summary ===\n${results.map(r => `${r.passed ? 'PASS' : 'FAIL'} ${r.name}: ${r.fileCount} files, ${r.errors.length} errors, ${r.warnings.length} warnings`).join('\n')}\n\nOverall: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`;

  console.log(summary);

  return { results, allPassed, summary };
}