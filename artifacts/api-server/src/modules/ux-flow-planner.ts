import type {
  ProjectPlan,
  PlannedEntity,
  PlannedPage,
  PlannedWorkflow,
  PlannedRole,
  UXFlow,
  UXFlowStep,
  ErrorHandlingPlan,
  PageErrorState,
} from './plan-generator.js';

export interface UXFlowPlanResult {
  uxFlows: UXFlow[];
  errorHandling: ErrorHandlingPlan;
}

export function planUXFlows(plan: ProjectPlan): UXFlowPlanResult {
  const flows: UXFlow[] = [];

  const onboardingFlows = detectOnboardingFlows(plan);
  flows.push(...onboardingFlows);

  const crudFlows = generateCRUDFlows(plan.dataModel, plan.pages);
  flows.push(...crudFlows);

  const statusFlows = generateStatusTransitionFlows(plan.dataModel, plan.workflows);
  flows.push(...statusFlows);

  const searchFilterFlows = generateSearchFilterFlows(plan.dataModel, plan.pages);
  flows.push(...searchFilterFlows);

  const settingsFlows = generateSettingsFlows(plan.roles, plan.pages);
  flows.push(...settingsFlows);

  const errorHandling = generateErrorHandlingPlan(plan);

  return { uxFlows: flows, errorHandling };
}

function detectOnboardingFlows(plan: ProjectPlan): UXFlow[] {
  const flows: UXFlow[] = [];

  const hasAuth = plan.roles.length > 0 ||
    plan.dataModel.some(e => e.name.toLowerCase() === 'user' || e.fields.some(f => f.name === 'password' || f.name === 'email'));
  const hasRoles = plan.roles.length > 1;

  if (hasAuth) {
    const registrationSteps: UXFlowStep[] = [
      {
        order: 1,
        label: 'Create Account',
        description: 'User provides email and password to register',
        fields: ['email', 'password', 'confirmPassword'],
        validation: 'Email format, password strength (min 8 chars, mixed case)',
        uiComponent: 'RegistrationForm',
      },
    ];

    if (hasRoles) {
      registrationSteps.push({
        order: 2,
        label: 'Select Role',
        description: 'User selects their role or organization type',
        fields: ['role'],
        validation: 'Must select a valid role',
        uiComponent: 'RoleSelector',
      });
    }

    const profileEntity = plan.dataModel.find(e =>
      /^(user|profile|account|member)$/i.test(e.name)
    );
    const profileFields = profileEntity
      ? profileEntity.fields.filter(f => !['id', 'password', 'email', 'createdAt', 'updatedAt'].includes(f.name)).map(f => f.name)
      : ['firstName', 'lastName'];

    if (profileFields.length > 0) {
      registrationSteps.push({
        order: registrationSteps.length + 1,
        label: 'Complete Profile',
        description: 'User fills in their profile information',
        fields: profileFields.slice(0, 6),
        validation: 'Required fields must be filled',
        uiComponent: 'ProfileSetupForm',
      });
    }

    registrationSteps.push({
      order: registrationSteps.length + 1,
      label: 'Welcome & Get Started',
      description: 'Show welcome message with quick-start guide and key actions',
      uiComponent: 'WelcomeScreen',
    });

    flows.push({
      name: 'User Onboarding',
      type: 'onboarding',
      steps: registrationSteps,
      triggerAction: 'User clicks "Sign Up" or "Get Started"',
      completionAction: 'Redirect to dashboard with first-time tooltip tour',
    });

    flows.push({
      name: 'User Login',
      type: 'onboarding',
      steps: [
        {
          order: 1,
          label: 'Sign In',
          description: 'User enters credentials to access their account',
          fields: ['email', 'password'],
          validation: 'Valid email format, non-empty password',
          uiComponent: 'LoginForm',
        },
      ],
      triggerAction: 'User navigates to login page',
      completionAction: 'Redirect to dashboard or last visited page',
    });
  }

  const primaryEntities = plan.dataModel.filter(e =>
    !(/^(user|role|permission|session|setting|config)$/i.test(e.name))
  );

  if (primaryEntities.length > 0) {
    const firstEntity = primaryEntities[0];
    flows.push({
      name: 'First-Time Setup',
      type: 'onboarding',
      entity: firstEntity.name,
      steps: [
        {
          order: 1,
          label: `Create Your First ${firstEntity.name}`,
          description: `Empty state prompts user to create their first ${firstEntity.name.toLowerCase()} record`,
          uiComponent: 'EmptyStateWithCTA',
        },
        {
          order: 2,
          label: 'Quick Create',
          description: `Simplified form to quickly add a ${firstEntity.name.toLowerCase()} with minimal required fields`,
          fields: firstEntity.fields.filter(f => f.required && f.name !== 'id').map(f => f.name).slice(0, 4),
          validation: 'Required fields only for quick start',
          uiComponent: `${firstEntity.name}QuickCreateForm`,
        },
        {
          order: 3,
          label: 'Success & Next Steps',
          description: 'Confirmation with suggestions for next actions',
          uiComponent: 'SuccessWithNextSteps',
        },
      ],
      triggerAction: 'User lands on empty list page for the first time',
      completionAction: 'Show newly created record with edit option',
    });
  }

  return flows;
}

function generateCRUDFlows(entities: PlannedEntity[], pages: PlannedPage[]): UXFlow[] {
  const flows: UXFlow[] = [];
  const COMPLEX_FIELD_THRESHOLD = 5;

  for (const entity of entities) {
    if (/^(user|role|permission|session|setting|config)$/i.test(entity.name)) continue;

    const editableFields = entity.fields.filter(f => f.name !== 'id' && f.name !== 'createdAt' && f.name !== 'updatedAt');
    const isComplex = editableFields.length >= COMPLEX_FIELD_THRESHOLD;

    if (isComplex) {
      const fieldGroups = groupFieldsForWizard(editableFields);
      const steps: UXFlowStep[] = fieldGroups.map((group, idx) => ({
        order: idx + 1,
        label: group.label,
        description: group.description,
        fields: group.fields,
        validation: group.validation,
        uiComponent: idx === fieldGroups.length - 1 ? 'ReviewAndSubmitStep' : 'WizardFormStep',
      }));

      steps.push({
        order: steps.length + 1,
        label: 'Review & Submit',
        description: `Review all ${entity.name.toLowerCase()} details before saving`,
        uiComponent: 'ReviewAndSubmitStep',
      });

      flows.push({
        name: `Create ${entity.name}`,
        type: 'wizard',
        entity: entity.name,
        steps,
        triggerAction: `User clicks "New ${entity.name}" button`,
        completionAction: `${entity.name} is created, user is redirected to detail view`,
      });
    } else {
      flows.push({
        name: `Create ${entity.name}`,
        type: 'crud-create',
        entity: entity.name,
        steps: [
          {
            order: 1,
            label: `New ${entity.name}`,
            description: `Fill in ${entity.name.toLowerCase()} details in a modal or inline form`,
            fields: editableFields.map(f => f.name),
            validation: editableFields.filter(f => f.required).map(f => `${f.name} is required`).join('; ') || 'No required fields',
            uiComponent: 'InlineCreateForm',
          },
        ],
        triggerAction: `User clicks "Add ${entity.name}" button`,
        completionAction: `${entity.name} is added to the list, toast confirmation shown`,
      });
    }

    flows.push({
      name: `Edit ${entity.name}`,
      type: 'crud-edit',
      entity: entity.name,
      steps: [
        {
          order: 1,
          label: `Edit ${entity.name}`,
          description: `Modify ${entity.name.toLowerCase()} details with pre-filled form`,
          fields: editableFields.map(f => f.name),
          validation: editableFields.filter(f => f.required).map(f => `${f.name} is required`).join('; ') || 'No required fields',
          uiComponent: isComplex ? 'FullPageEditForm' : 'InlineEditForm',
        },
      ],
      triggerAction: `User clicks edit on a ${entity.name.toLowerCase()} record`,
      completionAction: `${entity.name} is updated, changes confirmed with toast`,
    });
  }

  return flows;
}

function generateStatusTransitionFlows(entities: PlannedEntity[], workflows: PlannedWorkflow[]): UXFlow[] {
  const flows: UXFlow[] = [];

  for (const workflow of workflows) {
    if (!workflow.states || workflow.states.length < 2) continue;

    const steps: UXFlowStep[] = workflow.transitions.map((transition, idx) => ({
      order: idx + 1,
      label: `${capitalize(transition.from)} → ${capitalize(transition.to)}`,
      description: `${transition.action}${transition.role ? ` (requires ${transition.role} role)` : ''}`,
      validation: transition.role ? `User must have ${transition.role} role` : undefined,
      uiComponent: 'StatusTransitionButton',
    }));

    flows.push({
      name: `${workflow.entity} Workflow`,
      type: 'status-transition',
      entity: workflow.entity,
      steps,
      triggerAction: `User initiates a status change on a ${workflow.entity.toLowerCase()}`,
      completionAction: `Status is updated, relevant parties are notified`,
    });
  }

  for (const entity of entities) {
    const statusField = entity.fields.find(f =>
      f.name === 'status' && f.type.startsWith('enum')
    );
    if (!statusField) continue;

    const alreadyHasWorkflow = workflows.some(w => w.entity === entity.name);
    if (alreadyHasWorkflow) continue;

    const enumMatch = statusField.type.match(/enum\(([^)]+)\)/i) || statusField.type.match(/enum:([^)]+)/i);
    if (!enumMatch) continue;

    const statuses = enumMatch[1].split(',').map(s => s.trim());
    if (statuses.length < 2) continue;

    const transitions: UXFlowStep[] = [];
    for (let i = 0; i < statuses.length - 1; i++) {
      transitions.push({
        order: i + 1,
        label: `${capitalize(statuses[i])} → ${capitalize(statuses[i + 1])}`,
        description: `Move ${entity.name.toLowerCase()} from ${statuses[i]} to ${statuses[i + 1]}`,
        uiComponent: 'StatusTransitionButton',
      });
    }

    flows.push({
      name: `${entity.name} Status Flow`,
      type: 'status-transition',
      entity: entity.name,
      steps: transitions,
      triggerAction: `User changes ${entity.name.toLowerCase()} status`,
      completionAction: `Status updated with visual confirmation`,
    });
  }

  return flows;
}

function generateSearchFilterFlows(entities: PlannedEntity[], pages: PlannedPage[]): UXFlow[] {
  const flows: UXFlow[] = [];

  for (const entity of entities) {
    if (/^(user|role|permission|session|setting|config)$/i.test(entity.name)) continue;

    const textFields = entity.fields.filter(f =>
      f.type === 'text' || f.type === 'string' || f.name === 'name' || f.name === 'title' || f.name === 'description'
    );
    const enumFields = entity.fields.filter(f => f.type.startsWith('enum'));
    const dateFields = entity.fields.filter(f => f.type === 'date' || f.type === 'timestamp' || f.type === 'datetime');

    if (textFields.length === 0 && enumFields.length === 0 && dateFields.length === 0) continue;

    const steps: UXFlowStep[] = [];
    let stepOrder = 1;

    if (textFields.length > 0) {
      steps.push({
        order: stepOrder++,
        label: 'Text Search',
        description: `Search ${entity.name.toLowerCase()} records by ${textFields.map(f => f.name).join(', ')}`,
        fields: textFields.map(f => f.name),
        uiComponent: 'SearchInput',
      });
    }

    if (enumFields.length > 0) {
      steps.push({
        order: stepOrder++,
        label: 'Filter by Status',
        description: `Filter ${entity.name.toLowerCase()} records by ${enumFields.map(f => f.name).join(', ')}`,
        fields: enumFields.map(f => f.name),
        uiComponent: 'FilterChips',
      });
    }

    if (dateFields.length > 0) {
      steps.push({
        order: stepOrder++,
        label: 'Date Range Filter',
        description: `Filter ${entity.name.toLowerCase()} records by date range`,
        fields: dateFields.map(f => f.name),
        uiComponent: 'DateRangePicker',
      });
    }

    flows.push({
      name: `Search & Filter ${entity.name}`,
      type: 'search-filter',
      entity: entity.name,
      steps,
      triggerAction: `User interacts with search or filter controls on ${entity.name.toLowerCase()} list`,
      completionAction: `List updates in real-time to show matching results`,
    });
  }

  return flows;
}

function generateSettingsFlows(roles: PlannedRole[], pages: PlannedPage[]): UXFlow[] {
  const flows: UXFlow[] = [];

  const hasSettings = pages.some(p =>
    p.name.toLowerCase().includes('setting') || p.path.includes('settings')
  );

  if (hasSettings || roles.length > 0) {
    const steps: UXFlowStep[] = [
      {
        order: 1,
        label: 'Profile Settings',
        description: 'Update personal information and preferences',
        fields: ['name', 'email', 'avatar', 'timezone', 'language'],
        uiComponent: 'ProfileSettingsForm',
      },
    ];

    if (roles.length > 0) {
      steps.push({
        order: 2,
        label: 'Notification Preferences',
        description: 'Configure email and in-app notification preferences',
        fields: ['emailNotifications', 'pushNotifications', 'digestFrequency'],
        uiComponent: 'NotificationSettingsForm',
      });
    }

    const adminRole = roles.find(r => r.name.toLowerCase() === 'admin' || r.name.toLowerCase() === 'administrator');
    if (adminRole) {
      steps.push({
        order: steps.length + 1,
        label: 'Admin Settings',
        description: 'System-wide configuration (admin only)',
        fields: ['siteName', 'defaultRole', 'registrationEnabled'],
        validation: 'Requires admin role',
        uiComponent: 'AdminSettingsForm',
      });
    }

    flows.push({
      name: 'User Settings',
      type: 'settings',
      steps,
      triggerAction: 'User navigates to settings page',
      completionAction: 'Settings saved with confirmation toast',
    });
  }

  return flows;
}

function generateErrorHandlingPlan(plan: ProjectPlan): ErrorHandlingPlan {
  const pageStates: PageErrorState[] = [];

  for (const page of plan.pages) {
    const primaryEntity = page.dataNeeded?.[0] || '';
    const isDashboard = page.path === '/' || page.name.toLowerCase().includes('dashboard');
    const isDetail = page.path.includes(':id');
    const isList = !isDashboard && !isDetail;

    let emptyState: PageErrorState['emptyState'];
    let errorState: PageErrorState['errorState'];
    let loadingPattern: PageErrorState['loadingPattern'];

    if (isDashboard) {
      emptyState = {
        message: `Welcome to ${plan.projectName}! Your dashboard will populate as you add data.`,
        actionLabel: 'Get Started',
        actionTarget: plan.pages.find(p => p.path !== '/' && !p.path.includes(':id'))?.path || '/',
      };
      errorState = {
        message: 'Unable to load dashboard data. Please try refreshing the page.',
        retryable: true,
      };
      loadingPattern = 'skeleton';
    } else if (isDetail) {
      const entityName = primaryEntity || 'record';
      emptyState = {
        message: `This ${entityName.toLowerCase()} could not be found. It may have been deleted or you may not have permission to view it.`,
        actionLabel: `Back to ${entityName} List`,
        actionTarget: page.path.replace(/\/:id.*$/, ''),
      };
      errorState = {
        message: `Failed to load ${entityName.toLowerCase()} details. Please try again.`,
        retryable: true,
      };
      loadingPattern = 'skeleton';
    } else if (isList) {
      const entityName = primaryEntity || 'items';
      emptyState = {
        message: `No ${entityName.toLowerCase()} found. Create your first ${entityName.toLowerCase()} to get started.`,
        actionLabel: `Create ${capitalize(entityName)}`,
        actionTarget: `${page.path}/new`,
      };
      errorState = {
        message: `Unable to load ${entityName.toLowerCase()} list. Please check your connection and try again.`,
        retryable: true,
      };
      loadingPattern = 'shimmer';
    } else {
      emptyState = {
        message: 'No data available yet.',
        actionLabel: 'Go to Dashboard',
        actionTarget: '/',
      };
      errorState = {
        message: 'Something went wrong. Please try again.',
        retryable: true,
      };
      loadingPattern = 'spinner';
    }

    pageStates.push({
      page: page.name,
      emptyState,
      errorState,
      loadingPattern,
    });
  }

  return {
    pageStates,
    globalErrorStrategy: 'Toast notifications for non-critical errors, full-page error boundary for critical failures, inline validation for form errors',
    retryPolicy: {
      operations: ['GET list', 'GET detail', 'GET dashboard'],
      maxRetries: 3,
      backoffMs: 1000,
    },
  };
}

interface FieldGroup {
  label: string;
  description: string;
  fields: string[];
  validation: string;
}

function groupFieldsForWizard(fields: { name: string; type: string; required: boolean }[]): FieldGroup[] {
  const groups: FieldGroup[] = [];

  const basicInfoFields: string[] = [];
  const detailFields: string[] = [];
  const dateFields: string[] = [];
  const statusFields: string[] = [];
  const relationFields: string[] = [];
  const otherFields: string[] = [];

  for (const field of fields) {
    const name = field.name.toLowerCase();

    if (/^(name|title|first_?name|last_?name|label|subject|heading)$/i.test(name)) {
      basicInfoFields.push(field.name);
    } else if (/^(email|phone|address|city|state|zip|country|website|url)$/i.test(name)) {
      basicInfoFields.push(field.name);
    } else if (/^(description|content|body|summary|notes|bio|about|details|message)$/i.test(name)) {
      detailFields.push(field.name);
    } else if (/date|time|deadline|due|start|end|created|updated|scheduled/i.test(name)) {
      dateFields.push(field.name);
    } else if (/status|state|stage|phase|type|category|priority|level/i.test(name)) {
      statusFields.push(field.name);
    } else if (/id$/i.test(name) && name !== 'id') {
      relationFields.push(field.name);
    } else {
      otherFields.push(field.name);
    }
  }

  if (basicInfoFields.length > 0) {
    groups.push({
      label: 'Basic Information',
      description: 'Enter the essential details',
      fields: basicInfoFields,
      validation: 'Name/title is required',
    });
  }

  if (detailFields.length > 0) {
    groups.push({
      label: 'Details',
      description: 'Add a description and additional details',
      fields: detailFields,
      validation: 'Optional but recommended',
    });
  }

  if (dateFields.length > 0 || statusFields.length > 0) {
    groups.push({
      label: 'Schedule & Status',
      description: 'Set dates, status, and priority',
      fields: [...dateFields, ...statusFields],
      validation: 'Dates must be valid, status must be selected',
    });
  }

  if (relationFields.length > 0) {
    groups.push({
      label: 'Associations',
      description: 'Link to related records',
      fields: relationFields,
      validation: 'Select valid related records',
    });
  }

  if (otherFields.length > 0) {
    if (groups.length === 0) {
      groups.push({
        label: 'Details',
        description: 'Fill in the required information',
        fields: otherFields,
        validation: 'Required fields must be completed',
      });
    } else {
      groups.push({
        label: 'Additional Information',
        description: 'Optional extra details',
        fields: otherFields,
        validation: 'All fields optional',
      });
    }
  }

  if (groups.length === 0) {
    groups.push({
      label: 'Details',
      description: 'Fill in the information',
      fields: fields.map(f => f.name),
      validation: 'Required fields must be completed',
    });
  }

  return groups;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}