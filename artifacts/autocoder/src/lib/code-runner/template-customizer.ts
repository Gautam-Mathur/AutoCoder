// Template Customization Wizard - Configure templates before generation

export interface TemplateOption {
  id: string;
  name: string;
  type: 'boolean' | 'select' | 'text' | 'number' | 'color' | 'multiselect';
  description: string;
  defaultValue: unknown;
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
  placeholder?: string;
  category: string;
}

export interface TemplateConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  categories: string[];
  options: TemplateOption[];
  preview?: string;
}

// Template configurations
export const templateConfigs: TemplateConfig[] = [
  {
    id: 'todo-app',
    name: 'Todo App',
    description: 'Task management application with CRUD operations',
    icon: 'check',
    categories: ['Features', 'Styling', 'Database'],
    options: [
      {
        id: 'enableCategories',
        name: 'Task Categories',
        type: 'boolean',
        description: 'Allow organizing tasks into categories',
        defaultValue: false,
        category: 'Features'
      },
      {
        id: 'enableDueDates',
        name: 'Due Dates',
        type: 'boolean',
        description: 'Add due date support for tasks',
        defaultValue: true,
        category: 'Features'
      },
      {
        id: 'enablePriority',
        name: 'Priority Levels',
        type: 'boolean',
        description: 'Add priority levels (Low, Medium, High)',
        defaultValue: false,
        category: 'Features'
      },
      {
        id: 'enableSearch',
        name: 'Search & Filter',
        type: 'boolean',
        description: 'Add search and filter functionality',
        defaultValue: true,
        category: 'Features'
      },
      {
        id: 'enableDarkMode',
        name: 'Dark Mode',
        type: 'boolean',
        description: 'Include dark mode toggle',
        defaultValue: true,
        category: 'Styling'
      },
      {
        id: 'colorScheme',
        name: 'Color Scheme',
        type: 'select',
        description: 'Primary color theme',
        defaultValue: 'blue',
        options: [
          { label: 'Blue', value: 'blue' },
          { label: 'Green', value: 'green' },
          { label: 'Purple', value: 'purple' },
          { label: 'Orange', value: 'orange' },
          { label: 'Red', value: 'red' }
        ],
        category: 'Styling'
      },
      {
        id: 'database',
        name: 'Storage',
        type: 'select',
        description: 'Where to store data',
        defaultValue: 'localStorage',
        options: [
          { label: 'Local Storage', value: 'localStorage' },
          { label: 'In Memory', value: 'memory' },
          { label: 'API Backend', value: 'api' }
        ],
        category: 'Database'
      }
    ]
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce Store',
    description: 'Online store with products, cart, and checkout',
    icon: 'shopping-cart',
    categories: ['Features', 'Products', 'Payments', 'Styling'],
    options: [
      {
        id: 'enableUserAccounts',
        name: 'User Accounts',
        type: 'boolean',
        description: 'Enable user registration and login',
        defaultValue: true,
        category: 'Features'
      },
      {
        id: 'enableWishlist',
        name: 'Wishlist',
        type: 'boolean',
        description: 'Allow users to save favorite items',
        defaultValue: false,
        category: 'Features'
      },
      {
        id: 'enableReviews',
        name: 'Product Reviews',
        type: 'boolean',
        description: 'Allow customers to review products',
        defaultValue: true,
        category: 'Features'
      },
      {
        id: 'productCount',
        name: 'Sample Products',
        type: 'number',
        description: 'Number of demo products to generate',
        defaultValue: 12,
        min: 3,
        max: 50,
        category: 'Products'
      },
      {
        id: 'productCategories',
        name: 'Product Categories',
        type: 'multiselect',
        description: 'Categories to include',
        defaultValue: ['Electronics', 'Clothing'],
        options: [
          { label: 'Electronics', value: 'Electronics' },
          { label: 'Clothing', value: 'Clothing' },
          { label: 'Books', value: 'Books' },
          { label: 'Home & Garden', value: 'Home' },
          { label: 'Sports', value: 'Sports' },
          { label: 'Beauty', value: 'Beauty' }
        ],
        category: 'Products'
      },
      {
        id: 'paymentProvider',
        name: 'Payment Provider',
        type: 'select',
        description: 'Payment processing integration',
        defaultValue: 'demo',
        options: [
          { label: 'Demo Mode', value: 'demo' },
          { label: 'Stripe', value: 'stripe' },
          { label: 'PayPal', value: 'paypal' }
        ],
        category: 'Payments'
      },
      {
        id: 'currency',
        name: 'Currency',
        type: 'select',
        description: 'Store currency',
        defaultValue: 'USD',
        options: [
          { label: 'USD ($)', value: 'USD' },
          { label: 'EUR (€)', value: 'EUR' },
          { label: 'GBP (£)', value: 'GBP' },
          { label: 'INR (₹)', value: 'INR' }
        ],
        category: 'Payments'
      },
      {
        id: 'theme',
        name: 'Theme Style',
        type: 'select',
        description: 'Visual theme for the store',
        defaultValue: 'modern',
        options: [
          { label: 'Modern', value: 'modern' },
          { label: 'Classic', value: 'classic' },
          { label: 'Minimal', value: 'minimal' },
          { label: 'Bold', value: 'bold' }
        ],
        category: 'Styling'
      }
    ]
  },
  {
    id: 'blog',
    name: 'Blog Platform',
    description: 'Content publishing platform with markdown support',
    icon: 'file-text',
    categories: ['Features', 'Content', 'Styling'],
    options: [
      {
        id: 'enableComments',
        name: 'Comments',
        type: 'boolean',
        description: 'Allow comments on posts',
        defaultValue: true,
        category: 'Features'
      },
      {
        id: 'enableMarkdown',
        name: 'Markdown Editor',
        type: 'boolean',
        description: 'Rich markdown editing with preview',
        defaultValue: true,
        category: 'Features'
      },
      {
        id: 'enableTags',
        name: 'Tags & Categories',
        type: 'boolean',
        description: 'Organize posts with tags and categories',
        defaultValue: true,
        category: 'Features'
      },
      {
        id: 'enableSearch',
        name: 'Search',
        type: 'boolean',
        description: 'Full-text search across posts',
        defaultValue: true,
        category: 'Features'
      },
      {
        id: 'samplePosts',
        name: 'Sample Posts',
        type: 'number',
        description: 'Number of demo blog posts',
        defaultValue: 5,
        min: 1,
        max: 20,
        category: 'Content'
      },
      {
        id: 'authorName',
        name: 'Author Name',
        type: 'text',
        description: 'Default author name for posts',
        defaultValue: 'Admin',
        placeholder: 'Enter author name',
        category: 'Content'
      },
      {
        id: 'layout',
        name: 'Layout Style',
        type: 'select',
        description: 'Blog layout',
        defaultValue: 'cards',
        options: [
          { label: 'Card Grid', value: 'cards' },
          { label: 'List View', value: 'list' },
          { label: 'Magazine', value: 'magazine' }
        ],
        category: 'Styling'
      }
    ]
  },
  {
    id: 'dashboard',
    name: 'Analytics Dashboard',
    description: 'Data visualization and analytics dashboard',
    icon: 'bar-chart',
    categories: ['Data', 'Charts', 'Styling'],
    options: [
      {
        id: 'chartTypes',
        name: 'Chart Types',
        type: 'multiselect',
        description: 'Types of charts to include',
        defaultValue: ['line', 'bar', 'pie'],
        options: [
          { label: 'Line Chart', value: 'line' },
          { label: 'Bar Chart', value: 'bar' },
          { label: 'Pie Chart', value: 'pie' },
          { label: 'Area Chart', value: 'area' },
          { label: 'Donut Chart', value: 'donut' },
          { label: 'Radar Chart', value: 'radar' }
        ],
        category: 'Charts'
      },
      {
        id: 'enableRealTime',
        name: 'Real-time Updates',
        type: 'boolean',
        description: 'Auto-refresh data at intervals',
        defaultValue: false,
        category: 'Data'
      },
      {
        id: 'refreshInterval',
        name: 'Refresh Interval (sec)',
        type: 'number',
        description: 'How often to refresh data',
        defaultValue: 30,
        min: 5,
        max: 300,
        category: 'Data'
      },
      {
        id: 'enableExport',
        name: 'Data Export',
        type: 'boolean',
        description: 'Allow exporting data as CSV/PDF',
        defaultValue: true,
        category: 'Data'
      },
      {
        id: 'colorPalette',
        name: 'Chart Colors',
        type: 'select',
        description: 'Color palette for charts',
        defaultValue: 'default',
        options: [
          { label: 'Default', value: 'default' },
          { label: 'Vibrant', value: 'vibrant' },
          { label: 'Pastel', value: 'pastel' },
          { label: 'Monochrome', value: 'mono' }
        ],
        category: 'Styling'
      }
    ]
  },
  {
    id: 'chat-app',
    name: 'Chat Application',
    description: 'Real-time messaging with rooms and direct messages',
    icon: 'message-circle',
    categories: ['Features', 'Messaging', 'Styling'],
    options: [
      {
        id: 'enableRooms',
        name: 'Chat Rooms',
        type: 'boolean',
        description: 'Group chat rooms',
        defaultValue: true,
        category: 'Features'
      },
      {
        id: 'enableDM',
        name: 'Direct Messages',
        type: 'boolean',
        description: 'Private one-on-one messaging',
        defaultValue: true,
        category: 'Features'
      },
      {
        id: 'enableTypingIndicator',
        name: 'Typing Indicator',
        type: 'boolean',
        description: 'Show when users are typing',
        defaultValue: true,
        category: 'Messaging'
      },
      {
        id: 'enableEmoji',
        name: 'Emoji Picker',
        type: 'boolean',
        description: 'Include emoji selector',
        defaultValue: true,
        category: 'Messaging'
      },
      {
        id: 'enableFileSharing',
        name: 'File Sharing',
        type: 'boolean',
        description: 'Allow sharing files in chat',
        defaultValue: false,
        category: 'Messaging'
      },
      {
        id: 'messageLimit',
        name: 'Message History',
        type: 'number',
        description: 'Messages to load per conversation',
        defaultValue: 50,
        min: 10,
        max: 200,
        category: 'Messaging'
      },
      {
        id: 'theme',
        name: 'Chat Theme',
        type: 'select',
        description: 'Visual style',
        defaultValue: 'modern',
        options: [
          { label: 'Modern', value: 'modern' },
          { label: 'Slack-like', value: 'slack' },
          { label: 'Discord-like', value: 'discord' },
          { label: 'Minimal', value: 'minimal' }
        ],
        category: 'Styling'
      }
    ]
  },
  {
    id: 'kanban',
    name: 'Kanban Board',
    description: 'Project management with drag-and-drop cards',
    icon: 'layout',
    categories: ['Features', 'Board', 'Styling'],
    options: [
      {
        id: 'defaultColumns',
        name: 'Default Columns',
        type: 'multiselect',
        description: 'Initial board columns',
        defaultValue: ['To Do', 'In Progress', 'Done'],
        options: [
          { label: 'Backlog', value: 'Backlog' },
          { label: 'To Do', value: 'To Do' },
          { label: 'In Progress', value: 'In Progress' },
          { label: 'Review', value: 'Review' },
          { label: 'Done', value: 'Done' },
          { label: 'Archived', value: 'Archived' }
        ],
        category: 'Board'
      },
      {
        id: 'enableLabels',
        name: 'Color Labels',
        type: 'boolean',
        description: 'Add color-coded labels to cards',
        defaultValue: true,
        category: 'Features'
      },
      {
        id: 'enableAssignees',
        name: 'Assignees',
        type: 'boolean',
        description: 'Assign cards to team members',
        defaultValue: true,
        category: 'Features'
      },
      {
        id: 'enableDueDates',
        name: 'Due Dates',
        type: 'boolean',
        description: 'Add deadlines to cards',
        defaultValue: true,
        category: 'Features'
      },
      {
        id: 'enableChecklists',
        name: 'Checklists',
        type: 'boolean',
        description: 'Add checklists within cards',
        defaultValue: false,
        category: 'Features'
      },
      {
        id: 'enableAttachments',
        name: 'Attachments',
        type: 'boolean',
        description: 'Allow file attachments on cards',
        defaultValue: false,
        category: 'Features'
      },
      {
        id: 'cardStyle',
        name: 'Card Style',
        type: 'select',
        description: 'Card appearance',
        defaultValue: 'compact',
        options: [
          { label: 'Compact', value: 'compact' },
          { label: 'Detailed', value: 'detailed' },
          { label: 'Minimal', value: 'minimal' }
        ],
        category: 'Styling'
      }
    ]
  }
];

// Apply customization to template code
export function applyCustomization(
  templateId: string,
  code: string,
  values: Record<string, unknown>
): string {
  let result = code;
  const config = templateConfigs.find(t => t.id === templateId);
  if (!config) return result;

  // Apply boolean toggles
  for (const option of config.options) {
    if (option.type === 'boolean') {
      const enabled = values[option.id] ?? option.defaultValue;
      const marker = `// FEATURE: ${option.id}`;
      const endMarker = `// END FEATURE: ${option.id}`;

      if (!enabled) {
        // Remove feature blocks
        const regex = new RegExp(`${marker}[\\s\\S]*?${endMarker}`, 'g');
        result = result.replace(regex, '');
      } else {
        // Remove markers but keep code
        result = result.replace(new RegExp(marker, 'g'), '');
        result = result.replace(new RegExp(endMarker, 'g'), '');
      }
    }

    // Apply select values
    if (option.type === 'select' || option.type === 'color') {
      const value = values[option.id] ?? option.defaultValue;
      const placeholder = `{{${option.id}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    }

    // Apply text values
    if (option.type === 'text') {
      const value = values[option.id] ?? option.defaultValue;
      const placeholder = `{{${option.id}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    }

    // Apply number values
    if (option.type === 'number') {
      const value = values[option.id] ?? option.defaultValue;
      const placeholder = `{{${option.id}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    }
  }

  return result;
}

// Get template config by ID
export function getTemplateConfig(templateId: string): TemplateConfig | undefined {
  return templateConfigs.find(t => t.id === templateId);
}

// Get all template IDs
export function getTemplateIds(): string[] {
  return templateConfigs.map(t => t.id);
}

// Validate customization values
export function validateCustomization(
  templateId: string,
  values: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const config = templateConfigs.find(t => t.id === templateId);
  if (!config) return { valid: false, errors: ['Template not found'] };

  const errors: string[] = [];

  for (const option of config.options) {
    const value = values[option.id];
    if (value === undefined) continue;

    switch (option.type) {
      case 'number':
        if (typeof value !== 'number') {
          errors.push(`${option.name} must be a number`);
        } else {
          if (option.min !== undefined && value < option.min) {
            errors.push(`${option.name} must be at least ${option.min}`);
          }
          if (option.max !== undefined && value > option.max) {
            errors.push(`${option.name} must be at most ${option.max}`);
          }
        }
        break;

      case 'select':
        if (option.options && !option.options.some(o => o.value === value)) {
          errors.push(`Invalid value for ${option.name}`);
        }
        break;

      case 'multiselect':
        if (!Array.isArray(value)) {
          errors.push(`${option.name} must be an array`);
        } else if (option.options) {
          const validValues = option.options.map(o => o.value);
          for (const v of value) {
            if (!validValues.includes(String(v))) {
              errors.push(`Invalid option "${v}" for ${option.name}`);
            }
          }
        }
        break;
    }
  }

  return { valid: errors.length === 0, errors };
}

// Get default values for template
export function getDefaultValues(templateId: string): Record<string, unknown> {
  const config = templateConfigs.find(t => t.id === templateId);
  if (!config) return {};

  const defaults: Record<string, unknown> = {};
  for (const option of config.options) {
    defaults[option.id] = option.defaultValue;
  }
  return defaults;
}