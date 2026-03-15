// Pro Generator - Comprehensive Smart Code Generation Engine
// Produces proper multi-file React+Vite projects with Tailwind CSS

import { synthesizeContent, type SynthesizedContent } from './content-synthesizer';

// =============================================================================
// TYPES
// =============================================================================

export interface DataModel {
  name: string;
  fields: { name: string; type: string }[];
}

export interface ProjectRequirements {
  appType: string;
  appName: string;
  pages: string[];
  features: string[];
  dataModels: DataModel[];
  uiStyle: 'modern' | 'minimal' | 'bold' | 'corporate' | 'playful';
  hasBackend: boolean;
  hasAuth: boolean;
  hasDatabase: boolean;
  complexity: 'simple' | 'medium' | 'complex';
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

export interface GeneratedProject {
  name: string;
  description: string;
  files: GeneratedFile[];
}

export interface ThinkingStep {
  phase: 'understanding' | 'analyzing' | 'planning' | 'generating' | 'validating';
  label: string;
  detail: string;
  timestamp?: number;
}

export type ThinkingCallback = (step: ThinkingStep) => void;

// =============================================================================
// UTILITY HELPERS
// =============================================================================

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function camelCase(s: string): string {
  return s
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^[A-Z]/, (c) => c.toLowerCase());
}

function kebabCase(s: string): string {
  return s
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function pluralize(s: string): string {
  if (s.endsWith('s')) return s;
  if (s.endsWith('y')) return s.slice(0, -1) + 'ies';
  return s + 's';
}

function singularize(s: string): string {
  if (s.endsWith('ies')) return s.slice(0, -3) + 'y';
  if (s.endsWith('s') && !s.endsWith('ss')) return s.slice(0, -1);
  return s;
}

// =============================================================================
// 1. analyzePrompt — Deep prompt analysis
// =============================================================================

// --- Contextual Understanding Layer ---
// Expands vague, conversational language into concrete app concepts
// so non-technical users don't need to know the "right words"

const INTENT_PHRASES: [RegExp, string][] = [
  [/\b(keep\s*track\s*(of)?|track(ing)?|log(ging)?|monitor(ing)?|record(ing)?)\b/i, 'dashboard'],
  [/\b(show\s*me|display|view|see|look\s*at|check\s*on)\b/i, 'dashboard'],
  [/\b(organize|manage|maintain|handle|oversee|run)\b/i, 'admin'],
  [/\b(share|sharing|connect|post|upload|contribute|collaborate)\b/i, 'social'],
  [/\b(sell|selling|buy|buying|order|ordering|pay|payment|price|pricing|purchase)\b/i, 'ecommerce'],
  [/\b(book|booking|appoint|schedule|reserve|reservation|slot)\b/i, 'booking'],
  [/\b(talk|talking|chat|message|discuss|communicate|dm)\b/i, 'chat'],
  [/\b(learn|course|lesson|class|study|tutorial|education|student|teacher|quiz)\b/i, 'landing'],
  [/\b(write|blog|story|publish|draft|editorial|newsletter)\b/i, 'blog'],
  [/\b(sign\s*up|register|member|join|membership|account)\b/i, 'saas'],
  [/\b(vote|poll|survey|feedback|rating|review|rate)\b/i, 'form'],
  [/\b(compare|versus|vs|rank|tier|benchmark)\b/i, 'analytics'],
];

const DOMAIN_ENRICHMENT: Record<string, { appType: string; features: string[]; dataModels: DataModel[]; pages: string[]; uiStyle: ProjectRequirements['uiStyle'] }> = {
  fitness: {
    appType: 'dashboard',
    features: ['crud', 'charts', 'responsive'],
    dataModels: [
      { name: 'Workout', fields: [{ name: 'id', type: 'number' }, { name: 'name', type: 'string' }, { name: 'date', type: 'string' }, { name: 'duration', type: 'number' }, { name: 'calories', type: 'number' }, { name: 'type', type: 'string' }, { name: 'notes', type: 'string' }] },
      { name: 'Exercise', fields: [{ name: 'id', type: 'number' }, { name: 'name', type: 'string' }, { name: 'sets', type: 'number' }, { name: 'reps', type: 'number' }, { name: 'weight', type: 'number' }, { name: 'workoutId', type: 'number' }] },
    ],
    pages: ['Dashboard', 'Workouts', 'AddWorkout', 'Progress', 'Settings'],
    uiStyle: 'bold',
  },
  restaurant: {
    appType: 'ecommerce',
    features: ['crud', 'search', 'responsive'],
    dataModels: [
      { name: 'MenuItem', fields: [{ name: 'id', type: 'number' }, { name: 'name', type: 'string' }, { name: 'description', type: 'string' }, { name: 'price', type: 'number' }, { name: 'category', type: 'string' }, { name: 'image', type: 'string' }, { name: 'available', type: 'boolean' }] },
      { name: 'Order', fields: [{ name: 'id', type: 'number' }, { name: 'items', type: 'string[]' }, { name: 'total', type: 'number' }, { name: 'status', type: 'string' }, { name: 'customerName', type: 'string' }, { name: 'tableNumber', type: 'number' }] },
    ],
    pages: ['Home', 'Menu', 'Order', 'About', 'Contact'],
    uiStyle: 'modern',
  },
  recipe: {
    appType: 'social',
    features: ['crud', 'search', 'filtering', 'file-upload', 'responsive'],
    dataModels: [
      { name: 'Recipe', fields: [{ name: 'id', type: 'number' }, { name: 'title', type: 'string' }, { name: 'description', type: 'string' }, { name: 'ingredients', type: 'string[]' }, { name: 'instructions', type: 'string' }, { name: 'cookTime', type: 'number' }, { name: 'servings', type: 'number' }, { name: 'category', type: 'string' }, { name: 'image', type: 'string' }, { name: 'rating', type: 'number' }] },
    ],
    pages: ['Home', 'Recipes', 'RecipeDetail', 'AddRecipe', 'Favorites'],
    uiStyle: 'playful',
  },
  finance: {
    appType: 'dashboard',
    features: ['crud', 'charts', 'filtering', 'export', 'responsive'],
    dataModels: [
      { name: 'Transaction', fields: [{ name: 'id', type: 'number' }, { name: 'description', type: 'string' }, { name: 'amount', type: 'number' }, { name: 'type', type: 'string' }, { name: 'category', type: 'string' }, { name: 'date', type: 'string' }] },
      { name: 'Budget', fields: [{ name: 'id', type: 'number' }, { name: 'category', type: 'string' }, { name: 'limit', type: 'number' }, { name: 'spent', type: 'number' }, { name: 'month', type: 'string' }] },
    ],
    pages: ['Dashboard', 'Transactions', 'Budgets', 'Reports', 'Settings'],
    uiStyle: 'corporate',
  },
  realestate: {
    appType: 'marketplace',
    features: ['search', 'filtering', 'crud', 'responsive'],
    dataModels: [
      { name: 'Property', fields: [{ name: 'id', type: 'number' }, { name: 'title', type: 'string' }, { name: 'address', type: 'string' }, { name: 'price', type: 'number' }, { name: 'bedrooms', type: 'number' }, { name: 'bathrooms', type: 'number' }, { name: 'sqft', type: 'number' }, { name: 'image', type: 'string' }, { name: 'type', type: 'string' }, { name: 'status', type: 'string' }] },
    ],
    pages: ['Home', 'Listings', 'PropertyDetail', 'Search', 'Contact'],
    uiStyle: 'corporate',
  },
  education: {
    appType: 'landing',
    features: ['crud', 'search', 'responsive'],
    dataModels: [
      { name: 'Course', fields: [{ name: 'id', type: 'number' }, { name: 'title', type: 'string' }, { name: 'description', type: 'string' }, { name: 'instructor', type: 'string' }, { name: 'duration', type: 'string' }, { name: 'level', type: 'string' }, { name: 'price', type: 'number' }, { name: 'image', type: 'string' }, { name: 'enrolled', type: 'number' }] },
      { name: 'Lesson', fields: [{ name: 'id', type: 'number' }, { name: 'courseId', type: 'number' }, { name: 'title', type: 'string' }, { name: 'content', type: 'string' }, { name: 'order', type: 'number' }, { name: 'duration', type: 'string' }] },
    ],
    pages: ['Home', 'Courses', 'CourseDetail', 'Dashboard', 'Profile'],
    uiStyle: 'modern',
  },
  healthcare: {
    appType: 'booking',
    features: ['crud', 'search', 'auth', 'responsive'],
    dataModels: [
      { name: 'Doctor', fields: [{ name: 'id', type: 'number' }, { name: 'name', type: 'string' }, { name: 'specialty', type: 'string' }, { name: 'image', type: 'string' }, { name: 'rating', type: 'number' }, { name: 'available', type: 'boolean' }] },
      { name: 'Appointment', fields: [{ name: 'id', type: 'number' }, { name: 'doctorId', type: 'number' }, { name: 'patientName', type: 'string' }, { name: 'date', type: 'string' }, { name: 'time', type: 'string' }, { name: 'reason', type: 'string' }, { name: 'status', type: 'string' }] },
    ],
    pages: ['Home', 'Doctors', 'BookAppointment', 'MyAppointments', 'Profile'],
    uiStyle: 'minimal',
  },
  travel: {
    appType: 'booking',
    features: ['search', 'filtering', 'crud', 'responsive'],
    dataModels: [
      { name: 'Destination', fields: [{ name: 'id', type: 'number' }, { name: 'name', type: 'string' }, { name: 'country', type: 'string' }, { name: 'description', type: 'string' }, { name: 'image', type: 'string' }, { name: 'price', type: 'number' }, { name: 'rating', type: 'number' }, { name: 'category', type: 'string' }] },
      { name: 'Trip', fields: [{ name: 'id', type: 'number' }, { name: 'destinationId', type: 'number' }, { name: 'startDate', type: 'string' }, { name: 'endDate', type: 'string' }, { name: 'travelers', type: 'number' }, { name: 'status', type: 'string' }] },
    ],
    pages: ['Home', 'Explore', 'DestinationDetail', 'MyTrips', 'BookTrip'],
    uiStyle: 'bold',
  },
  petcare: {
    appType: 'dashboard',
    features: ['crud', 'search', 'responsive'],
    dataModels: [
      { name: 'Pet', fields: [{ name: 'id', type: 'number' }, { name: 'name', type: 'string' }, { name: 'species', type: 'string' }, { name: 'breed', type: 'string' }, { name: 'age', type: 'number' }, { name: 'image', type: 'string' }, { name: 'weight', type: 'number' }] },
      { name: 'Appointment', fields: [{ name: 'id', type: 'number' }, { name: 'petId', type: 'number' }, { name: 'type', type: 'string' }, { name: 'date', type: 'string' }, { name: 'vet', type: 'string' }, { name: 'notes', type: 'string' }] },
    ],
    pages: ['Home', 'MyPets', 'PetDetail', 'Appointments', 'AddPet'],
    uiStyle: 'playful',
  },
  inventory: {
    appType: 'admin',
    features: ['crud', 'search', 'filtering', 'charts', 'export', 'responsive'],
    dataModels: [
      { name: 'Item', fields: [{ name: 'id', type: 'number' }, { name: 'name', type: 'string' }, { name: 'sku', type: 'string' }, { name: 'quantity', type: 'number' }, { name: 'price', type: 'number' }, { name: 'category', type: 'string' }, { name: 'supplier', type: 'string' }, { name: 'reorderLevel', type: 'number' }] },
    ],
    pages: ['Dashboard', 'Items', 'AddItem', 'Reports', 'Settings'],
    uiStyle: 'corporate',
  },
  music: {
    appType: 'social',
    features: ['search', 'filtering', 'crud', 'responsive'],
    dataModels: [
      { name: 'Song', fields: [{ name: 'id', type: 'number' }, { name: 'title', type: 'string' }, { name: 'artist', type: 'string' }, { name: 'album', type: 'string' }, { name: 'duration', type: 'string' }, { name: 'genre', type: 'string' }, { name: 'cover', type: 'string' }] },
      { name: 'Playlist', fields: [{ name: 'id', type: 'number' }, { name: 'name', type: 'string' }, { name: 'description', type: 'string' }, { name: 'songCount', type: 'number' }, { name: 'image', type: 'string' }] },
    ],
    pages: ['Home', 'Browse', 'Playlists', 'NowPlaying', 'Library'],
    uiStyle: 'bold',
  },
  hr: {
    appType: 'admin',
    features: ['crud', 'search', 'filtering', 'charts', 'responsive'],
    dataModels: [
      { name: 'Employee', fields: [{ name: 'id', type: 'number' }, { name: 'name', type: 'string' }, { name: 'email', type: 'string' }, { name: 'department', type: 'string' }, { name: 'position', type: 'string' }, { name: 'startDate', type: 'string' }, { name: 'salary', type: 'number' }, { name: 'status', type: 'string' }] },
      { name: 'LeaveRequest', fields: [{ name: 'id', type: 'number' }, { name: 'employeeId', type: 'number' }, { name: 'type', type: 'string' }, { name: 'startDate', type: 'string' }, { name: 'endDate', type: 'string' }, { name: 'status', type: 'string' }, { name: 'reason', type: 'string' }] },
    ],
    pages: ['Dashboard', 'Employees', 'EmployeeDetail', 'LeaveRequests', 'Reports'],
    uiStyle: 'corporate',
  },
};

const DOMAIN_KEYWORDS: [RegExp, string][] = [
  // More specific domains first to avoid false matches
  [/\b(pets?|dogs?|cats?|animals?|vets?|veterinar(y|ian)?|grooming|adoption|shelters?|kennels?)\b/i, 'petcare'],
  [/\b(recipes?|cooking|ingredients?|baking|dishes?|cuisine)\b/i, 'recipe'],
  [/\b(gym|workouts?|exercises?|fitness|training|muscles?|cardio|yoga|crossfit|weight.?lift)\b/i, 'fitness'],
  [/\b(restaurants?|foods?|menus?|dine|dining|cafes?|baker(y|ies)|pizza|burgers?|sushi|kitchen|chefs?|cook(ing|s)?|meals?|catering)\b/i, 'restaurant'],
  [/\b(money|expenses?|budgets?|finance|financial|bank(ing)?|invest(ments?|ing)?|savings?|income|spending|accounting|wallets?|payments?|invoices?|bills?)\b/i, 'finance'],
  [/\b(real\s*estate|propert(y|ies)|houses?|apartments?|rent(al|ing)?|leas(e|ing)|tenants?|landlords?|listings?|home\s*for|bedrooms?|condos?)\b/i, 'realestate'],
  [/\b(employees?|hr|human\s*resources?|staff|team\s*members?|departments?|payroll|hir(e|ing)|recruit|onboard|leave\s*requests?|workers?)\b/i, 'hr'],
  [/\b(schools?|education|courses?|learn(ing)?|students?|teachers?|class(es)?|lessons?|tutors?|universit(y|ies)|colleges?|academ(y|ies)|training)\b/i, 'education'],
  [/\b(health|medical|doctors?|patients?|clinics?|hospitals?|diagnos(is|es)|medicine|therapy|wellness|dental)\b/i, 'healthcare'],
  [/\b(travel(ing)?|trips?|hotels?|flights?|vacations?|destinations?|tours?|resorts?|airbnb|itinerar(y|ies))\b/i, 'travel'],
  [/\b(inventor(y|ies)|warehouses?|stocks?|suppl(y|ies|ier)|reorder|shipments?|logistics|procurement)\b/i, 'inventory'],
  [/\b(music|songs?|playlists?|albums?|artists?|genres?|podcasts?|audio|stream(ing)?|radio|spotify|bands?)\b/i, 'music'],
];

const TYPO_CORRECTIONS: Record<string, string> = {
  resturant: 'restaurant', restraunt: 'restaurant', restarant: 'restaurant', resteraunt: 'restaurant',
  restaraunt: 'restaurant', restaurnt: 'restaurant', restrant: 'restaurant', reastaurant: 'restaurant',
  recipie: 'recipe', recipies: 'recipes', recepie: 'recipe', recepies: 'recipes',
  reciepe: 'recipe', reciepes: 'recipes', receipe: 'recipe', receipes: 'recipes',
  exersise: 'exercise', exersize: 'exercise', excercise: 'exercise', exercize: 'exercise',
  exerscise: 'exercise', exercse: 'exercise', exericse: 'exercise',
  fitnes: 'fitness', fittness: 'fitness', fitnees: 'fitness', fittnes: 'fitness',
  workou: 'workout', workuot: 'workout', wrokout: 'workout', worckout: 'workout',
  buisness: 'business', bussiness: 'business', busines: 'business', buisines: 'business',
  bussines: 'business', biusiness: 'business', busniess: 'business',
  calender: 'calendar', calandar: 'calendar', calander: 'calendar', calendr: 'calendar',
  employes: 'employees', emploees: 'employees', emplyees: 'employees', employess: 'employees',
  employies: 'employees', employe: 'employee', emploee: 'employee', emplyee: 'employee',
  managment: 'management', managemnt: 'management', mangement: 'management', manegement: 'management',
  budgit: 'budget', buget: 'budget', budjet: 'budget', bugdet: 'budget',
  expence: 'expense', expences: 'expenses', expens: 'expense', exspense: 'expense',
  finanse: 'finance', finacial: 'financial', financal: 'financial', finanical: 'financial',
  inventry: 'inventory', inventroy: 'inventory', invetory: 'inventory', inventary: 'inventory',
  warehaus: 'warehouse', warehous: 'warehouse', warhouse: 'warehouse',
  shedulle: 'schedule', schedul: 'schedule', scedule: 'schedule', shedule: 'schedule',
  schedual: 'schedule', schedle: 'schedule',
  appointmnt: 'appointment', apointment: 'appointment', appointement: 'appointment',
  appoitment: 'appointment', appoinment: 'appointment',
  educaton: 'education', educaiton: 'education', educashion: 'education',
  univeristy: 'university', unversity: 'university', univesity: 'university',
  colege: 'college', colledge: 'college', collage: 'college',
  helthcare: 'healthcare', healtcare: 'healthcare', helthcar: 'healthcare',
  hosptial: 'hospital', hospitl: 'hospital', hopsital: 'hospital',
  patiant: 'patient', pateint: 'patient', patinet: 'patient',
  medcine: 'medicine', medicne: 'medicine', medecine: 'medicine',
  vetenary: 'veterinary', veternary: 'veterinary', vetinary: 'veterinary',
  realestate: 'real estate', relastate: 'real estate',
  proprety: 'property', properyt: 'property', propety: 'property', proparty: 'property',
  appartment: 'apartment', aparment: 'apartment', apartmnet: 'apartment',
  dashbord: 'dashboard', dahsboard: 'dashboard', dashbaord: 'dashboard',
  ecomerce: 'ecommerce', ecommerece: 'ecommerce', ecommmerce: 'ecommerce', ecomers: 'ecommerce',
  websit: 'website', webiste: 'website', wesbite: 'website', webstie: 'website',
  applicaton: 'application', aplication: 'application', aplicaiton: 'application',
  shoping: 'shopping', shoppin: 'shopping', shpping: 'shopping',
  portfolo: 'portfolio', porfolio: 'portfolio', portflio: 'portfolio',
  analitics: 'analytics', analytcs: 'analytics', anayltics: 'analytics',
  subcription: 'subscription', subscrption: 'subscription', subscribtion: 'subscription',
  notificaton: 'notification', notifcation: 'notification', notificaiton: 'notification',
  authetication: 'authentication', authentcation: 'authentication', athentication: 'authentication',
  registation: 'registration', registraton: 'registration', regsitration: 'registration',
  catergory: 'category', categroy: 'category', catagory: 'category',
  favorit: 'favorite', favourit: 'favourite', favroite: 'favorite',
  playist: 'playlist', playlst: 'playlist', playslit: 'playlist',
  podast: 'podcast', podcst: 'podcast', podacast: 'podcast',
  bakrey: 'bakery', bakary: 'bakery', bakey: 'bakery',
  cusotmer: 'customer', custmer: 'customer', cutomer: 'customer', costumer: 'customer',
  payrol: 'payroll', payrole: 'payroll', payrool: 'payroll',
  recrut: 'recruit', recuit: 'recruit', recriut: 'recruit',
  travle: 'travel', traval: 'travel', traveel: 'travel',
  vacaton: 'vacation', vaccation: 'vacation', vacaiton: 'vacation',
  bookins: 'bookings', bokings: 'bookings', boooking: 'booking',
  grosery: 'grocery', grocrey: 'grocery', groccery: 'grocery', grocary: 'grocery',
  adress: 'address', adres: 'address', addres: 'address',
  mesage: 'message', messsage: 'message', massege: 'message',
  proflie: 'profile', profiel: 'profile', porfile: 'profile',
  setings: 'settings', settigns: 'settings', seting: 'setting',
  accout: 'account', acount: 'account', acconut: 'account',
};

function correctTypos(text: string): string {
  return text.replace(/\b\w+\b/g, (word) => {
    const lower = word.toLowerCase();
    if (TYPO_CORRECTIONS[lower]) {
      return TYPO_CORRECTIONS[lower];
    }
    return word;
  });
}

function normalizePrompt(input: string): string {
  let text = correctTypos(input);

  const conversationalStrips: RegExp[] = [
    /^(hey|hi|hello|yo|sup)\s*[,!.]?\s*/i,
    /^(can you|could you|would you|will you|please|pls|plz)\s*/i,
    /^(i\s+want|i\s+need|i'd\s+like|i\s+wanna|i\s+would\s+like)\s+(to\s+)?(have\s+|get\s+)?/i,
    /^(help\s+me\s+)(to\s+)?(build|create|make|design|develop|set\s*up)?\s*/i,
    /^(make\s+me|build\s+me|create\s+me|give\s+me|get\s+me)\s+(a\s+|an\s+)?/i,
  ];
  for (const pat of conversationalStrips) {
    text = text.replace(pat, '');
  }

  const synonymMap: [RegExp, string][] = [
    [/\bkeep\s*track\s*(of)?/gi, 'track manage dashboard'],
    [/\bplace\s+(where|for)\s+(people|users|everyone)\s+(can|to)\s+/gi, 'platform app where users can '],
    [/\bsomething\s+(to|for|that)\s+/gi, 'app to '],
    [/\bspot\s+(to|for|where)\s+/gi, 'platform to '],
    [/\bway\s+to\s+/gi, 'tool to '],
    [/\bthing\s+(to|for|that)\s+/gi, 'app to '],
    [/\bstuff\s+(for|about|like)\s+/gi, 'content for '],
    [/\bshow\s*(off)?\s+my\b/gi, 'portfolio showcase my'],
    [/\bput\s+online\b/gi, 'website publish'],
    [/\bfor\s+my\s+(small\s+)?business\b/gi, 'for my business website management'],
    [/\bfor\s+my\s+(small\s+)?company\b/gi, 'for my company website management'],
    [/\blist\s+of\b/gi, 'manage collection of'],
    [/\bnotes?\s+(about|on|for)\b/gi, 'notes app for'],
    [/\bremind(er)?s?\s+(for|about|to)\b/gi, 'todo reminder notifications for'],
    [/\bwhere\s+people\s+can\s+/gi, 'where users can '],
    [/\bpeople\s+can\s+(see|view|browse|look)\b/gi, 'users can browse view'],
    [/\brun\s+my\s+/gi, 'manage my '],
  ];
  for (const [pat, replacement] of synonymMap) {
    text = text.replace(pat, replacement);
  }

  return text.trim() || input;
}

function detectDomain(input: string): string | null {
  const lower = input.toLowerCase();
  for (const [pat, domain] of DOMAIN_KEYWORDS) {
    if (pat.test(lower)) return domain;
  }
  return null;
}

function inferFromIntentPhrases(input: string): string | null {
  const lower = input.toLowerCase();
  for (const [pat, appType] of INTENT_PHRASES) {
    if (pat.test(lower)) return appType;
  }
  return null;
}

const APP_TYPE_PATTERNS: Record<string, RegExp> = {
  dashboard: /dashboard|admin panel|analytics view|overview|metrics|kpi/i,
  ecommerce: /e-?commerce|shop(?!ping\s*list)|store(?!d)|product(?!ion)|cart|checkout|buy|sell|marketplace|retail/i,
  blog: /blog|article|post(?!gres)|news(?!letter)|magazine|journal|writing|publication/i,
  portfolio: /portfolio|resume|cv|personal site|showcase|gallery/i,
  social: /social\b|feed\b|timeline|profile|follow|friend|community|network(?!ing\s*error)/i,
  saas: /\bsaas\b|subscription|pricing\s*(page|plan|tier)|billing|(?<!plat)form\s+builder/i,
  todo: /todo|task(?!\s*bar)|kanban|checklist|planner|organizer|to-?do/i,
  chat: /\bchat\b|messag|conversation|inbox|dm\b|real-?time|websocket/i,
  crm: /crm|customer\s*(management|relation)|lead\s*(management|track)|pipeline|deal\s*(track|manag)|sales\s*(track|manag|crm)/i,
  analytics: /analytics|report(?!er)|chart(?!er)|graph|data viz|visualization|insight/i,
  booking: /booking|appointment|schedule|calendar|reservation|event\s*(book|manag)/i,
  marketplace: /marketplace|listing|seller|buyer|auction|classified/i,
  cms: /cms|content management|editor|publish|page builder/i,
  game: /\bgame\b|quiz|puzzle|trivia|score|leaderboard|\bplay\b(?!list|er)/i,
  calculator: /calculator|converter|compute|math|formula|unit\s*convert/i,
  form: /\bform\b(?!\s*(at|ul))|survey|questionnaire|poll\b|feedback\s*(form|collect)|registration\s*form/i,
  landing: /landing\s*page|hero\s*section|marketing\s*page|launch|coming soon|waitlist/i,
  admin: /admin(?!ist)|management\s*(panel|system|dashboard)|back-?office|control panel/i,
  api: /\bapi\b|endpoint|rest\s*(ful|api)|graphql|backend\s*(api|server)/i,
};

const FEATURE_PATTERNS: Record<string, RegExp> = {
  auth: /auth|login|signup|sign.?in|sign.?up|register|password|session|oauth/i,
  search: /search|find|lookup|query|filter by|discover/i,
  filtering: /filter|sort|category|tag|refine|facet/i,
  crud: /crud|create|read|update|delete|add|edit|remove|manage/i,
  'dark-mode': /dark.?mode|theme|light.?mode|dark.?theme|toggle theme/i,
  responsive: /responsive|mobile|tablet|adaptive|breakpoint/i,
  notifications: /notif|alert|toast|badge|bell|push/i,
  'real-time': /real.?time|live|websocket|socket|streaming|instant/i,
  'file-upload': /upload|file|image|photo|media|attachment|drag.?drop/i,
  charts: /chart|graph|plot|pie|bar|line|area|donut|visualization/i,
  export: /export|download|csv|pdf|print|report/i,
  pagination: /pagination|paginate|page|infinite.?scroll|load.?more/i,
  sorting: /sort|order|asc|desc|ranking/i,
};

const UI_STYLE_PATTERNS: Record<string, RegExp> = {
  minimal: /minimal|clean|simple|flat|whitespace|sparse/i,
  bold: /bold|vibrant|colorful|bright|loud|neon|gradient/i,
  corporate: /corporate|professional|business|formal|enterprise/i,
  playful: /playful|fun|cartoon|whimsical|creative|quirky/i,
};

const PAGE_SUGGESTIONS: Record<string, string[]> = {
  dashboard: ['Dashboard', 'Analytics', 'Settings', 'Profile'],
  ecommerce: ['Home', 'Products', 'ProductDetail', 'Cart', 'Checkout'],
  blog: ['Home', 'Articles', 'ArticleDetail', 'About'],
  portfolio: ['Home', 'Projects', 'About', 'Contact'],
  social: ['Feed', 'Profile', 'Messages', 'Explore'],
  saas: ['Landing', 'Dashboard', 'Pricing', 'Settings'],
  todo: ['Dashboard', 'TaskDetail', 'Settings'],
  chat: ['Conversations', 'ChatRoom', 'Profile'],
  crm: ['Dashboard', 'Contacts', 'Deals', 'Settings'],
  analytics: ['Overview', 'Reports', 'Explore', 'Settings'],
  booking: ['Home', 'BookingForm', 'MyBookings', 'Calendar'],
  marketplace: ['Home', 'Listings', 'ListingDetail', 'Sell', 'Profile'],
  cms: ['Dashboard', 'Pages', 'Editor', 'Media', 'Settings'],
  game: ['Home', 'Play', 'Leaderboard', 'Settings'],
  calculator: ['Calculator'],
  form: ['Form', 'Success'],
  landing: ['Home'],
  admin: ['Dashboard', 'Users', 'Content', 'Settings'],
  api: ['Dashboard', 'Docs', 'Keys', 'Logs'],
  custom: ['Home', 'About'],
};

const DATA_MODEL_SUGGESTIONS: Record<string, DataModel[]> = {
  ecommerce: [
    { name: 'Product', fields: [{ name: 'id', type: 'number' }, { name: 'name', type: 'string' }, { name: 'price', type: 'number' }, { name: 'image', type: 'string' }, { name: 'category', type: 'string' }, { name: 'description', type: 'string' }, { name: 'rating', type: 'number' }, { name: 'inStock', type: 'boolean' }] },
    { name: 'CartItem', fields: [{ name: 'productId', type: 'number' }, { name: 'quantity', type: 'number' }] },
    { name: 'Order', fields: [{ name: 'id', type: 'number' }, { name: 'items', type: 'CartItem[]' }, { name: 'total', type: 'number' }, { name: 'status', type: 'string' }] },
  ],
  blog: [
    { name: 'Post', fields: [{ name: 'id', type: 'number' }, { name: 'title', type: 'string' }, { name: 'content', type: 'string' }, { name: 'author', type: 'string' }, { name: 'date', type: 'string' }, { name: 'category', type: 'string' }, { name: 'image', type: 'string' }] },
    { name: 'Comment', fields: [{ name: 'id', type: 'number' }, { name: 'postId', type: 'number' }, { name: 'author', type: 'string' }, { name: 'text', type: 'string' }, { name: 'date', type: 'string' }] },
  ],
  todo: [
    { name: 'Task', fields: [{ name: 'id', type: 'number' }, { name: 'title', type: 'string' }, { name: 'description', type: 'string' }, { name: 'status', type: 'string' }, { name: 'priority', type: 'string' }, { name: 'dueDate', type: 'string' }, { name: 'assignee', type: 'string' }] },
  ],
  crm: [
    { name: 'Contact', fields: [{ name: 'id', type: 'number' }, { name: 'name', type: 'string' }, { name: 'email', type: 'string' }, { name: 'phone', type: 'string' }, { name: 'company', type: 'string' }, { name: 'status', type: 'string' }] },
    { name: 'Deal', fields: [{ name: 'id', type: 'number' }, { name: 'title', type: 'string' }, { name: 'value', type: 'number' }, { name: 'stage', type: 'string' }, { name: 'contactId', type: 'number' }] },
  ],
  dashboard: [
    { name: 'Metric', fields: [{ name: 'label', type: 'string' }, { name: 'value', type: 'number' }, { name: 'change', type: 'number' }, { name: 'icon', type: 'string' }] },
    { name: 'Activity', fields: [{ name: 'id', type: 'number' }, { name: 'user', type: 'string' }, { name: 'action', type: 'string' }, { name: 'timestamp', type: 'string' }] },
  ],
  social: [
    { name: 'User', fields: [{ name: 'id', type: 'number' }, { name: 'username', type: 'string' }, { name: 'avatar', type: 'string' }, { name: 'bio', type: 'string' }, { name: 'followers', type: 'number' }] },
    { name: 'Post', fields: [{ name: 'id', type: 'number' }, { name: 'userId', type: 'number' }, { name: 'content', type: 'string' }, { name: 'image', type: 'string' }, { name: 'likes', type: 'number' }, { name: 'comments', type: 'number' }, { name: 'date', type: 'string' }] },
  ],
  booking: [
    { name: 'Service', fields: [{ name: 'id', type: 'number' }, { name: 'name', type: 'string' }, { name: 'duration', type: 'number' }, { name: 'price', type: 'number' }, { name: 'description', type: 'string' }] },
    { name: 'Booking', fields: [{ name: 'id', type: 'number' }, { name: 'serviceId', type: 'number' }, { name: 'date', type: 'string' }, { name: 'time', type: 'string' }, { name: 'customerName', type: 'string' }, { name: 'status', type: 'string' }] },
  ],
  chat: [
    { name: 'Conversation', fields: [{ name: 'id', type: 'number' }, { name: 'name', type: 'string' }, { name: 'lastMessage', type: 'string' }, { name: 'timestamp', type: 'string' }, { name: 'avatar', type: 'string' }] },
    { name: 'Message', fields: [{ name: 'id', type: 'number' }, { name: 'conversationId', type: 'number' }, { name: 'sender', type: 'string' }, { name: 'text', type: 'string' }, { name: 'timestamp', type: 'string' }] },
  ],
  analytics: [
    { name: 'DataPoint', fields: [{ name: 'date', type: 'string' }, { name: 'value', type: 'number' }, { name: 'category', type: 'string' }] },
    { name: 'Report', fields: [{ name: 'id', type: 'number' }, { name: 'title', type: 'string' }, { name: 'type', type: 'string' }, { name: 'data', type: 'DataPoint[]' }] },
  ],
  marketplace: [
    { name: 'Listing', fields: [{ name: 'id', type: 'number' }, { name: 'title', type: 'string' }, { name: 'description', type: 'string' }, { name: 'price', type: 'number' }, { name: 'image', type: 'string' }, { name: 'seller', type: 'string' }, { name: 'category', type: 'string' }, { name: 'condition', type: 'string' }] },
  ],
  portfolio: [
    { name: 'Project', fields: [{ name: 'id', type: 'number' }, { name: 'title', type: 'string' }, { name: 'description', type: 'string' }, { name: 'image', type: 'string' }, { name: 'tags', type: 'string[]' }, { name: 'link', type: 'string' }] },
  ],
  saas: [
    { name: 'Plan', fields: [{ name: 'id', type: 'number' }, { name: 'name', type: 'string' }, { name: 'price', type: 'number' }, { name: 'features', type: 'string[]' }, { name: 'popular', type: 'boolean' }] },
  ],
};

function inferAppName(input: string): string {
  const namePatterns = [
    /(?:build|create|make|develop)\s+(?:me\s+)?(?:a\s+)?(?:an?\s+)?["']([^"']+)["']/i,
    /(?:called|named)\s+["']?([A-Za-z][A-Za-z0-9\s]+?)["']?(?:\s|$|\.)/i,
    /["']([A-Z][A-Za-z0-9]+)["']/,
  ];
  for (const pat of namePatterns) {
    const m = input.match(pat);
    if (m && m[1]) return m[1].trim();
  }

  const domain = detectDomain(input);
  const DOMAIN_NAMES: Record<string, string> = {
    fitness: 'FitTracker',
    restaurant: 'FoodSpot',
    recipe: 'RecipeHub',
    finance: 'FinanceFlow',
    realestate: 'PropertyFinder',
    education: 'LearnHub',
    healthcare: 'HealthConnect',
    travel: 'TripPlanner',
    petcare: 'PetPal',
    inventory: 'StockManager',
    music: 'MusicBox',
    hr: 'TeamHub',
  };
  if (domain && DOMAIN_NAMES[domain]) return DOMAIN_NAMES[domain];

  const lower = input.toLowerCase();
  for (const [type] of Object.entries(APP_TYPE_PATTERNS)) {
    if (APP_TYPE_PATTERNS[type].test(lower)) {
      return capitalize(type) + ' App';
    }
  }

  const subjectMatch = input.match(/\b(?:for|about|of)\s+(?:my\s+)?(\w+(?:\s+\w+)?)/i);
  if (subjectMatch && subjectMatch[1]) {
    const subject = subjectMatch[1].replace(/\b\w/g, c => c.toUpperCase());
    return subject + ' App';
  }

  return 'My App';
}

function detectPages(input: string, appType: string): string[] {
  const lower = input.toLowerCase();
  const mentioned: string[] = [];
  const pageKeywords: Record<string, string> = {
    home: 'Home', dashboard: 'Dashboard', about: 'About', contact: 'Contact',
    settings: 'Settings', profile: 'Profile', products: 'Products', cart: 'Cart',
    checkout: 'Checkout', login: 'Login', signup: 'Signup', pricing: 'Pricing',
    blog: 'Blog', articles: 'Articles', messages: 'Messages', analytics: 'Analytics',
    calendar: 'Calendar', bookings: 'MyBookings', users: 'Users', orders: 'Orders',
    explore: 'Explore', feed: 'Feed', search: 'Search', notifications: 'Notifications',
    editor: 'Editor', media: 'Media', reports: 'Reports', leaderboard: 'Leaderboard',
  };
  for (const [kw, page] of Object.entries(pageKeywords)) {
    if (lower.includes(kw) && !mentioned.includes(page)) {
      mentioned.push(page);
    }
  }
  if (mentioned.length > 0) return mentioned;
  return PAGE_SUGGESTIONS[appType] || PAGE_SUGGESTIONS.custom;
}

function detectDataModels(input: string, appType: string): DataModel[] {
  return DATA_MODEL_SUGGESTIONS[appType] || [];
}

function detectComplexity(input: string, pages: string[], features: string[]): 'simple' | 'medium' | 'complex' {
  const score = pages.length + features.length;
  if (score <= 3) return 'simple';
  if (score <= 8) return 'medium';
  return 'complex';
}

export function analyzePrompt(input: string): ProjectRequirements {
  const normalized = normalizePrompt(input);
  const lower = normalized.toLowerCase();
  const originalLower = input.toLowerCase();

  const domain = detectDomain(input) || detectDomain(normalized);
  const domainData = domain ? DOMAIN_ENRICHMENT[domain] : null;

  let appType = 'custom';
  for (const [type, pattern] of Object.entries(APP_TYPE_PATTERNS)) {
    if (pattern.test(lower) || pattern.test(originalLower)) {
      appType = type;
      break;
    }
  }

  if (appType === 'custom' && domainData) {
    appType = domainData.appType;
  }

  if (appType === 'custom') {
    const intentType = inferFromIntentPhrases(input) || inferFromIntentPhrases(normalized);
    if (intentType) appType = intentType;
  }

  if (appType === 'custom') {
    const hasNouns = /\b(app|site|page|tool|system|platform|website|webapp)\b/i.test(originalLower);
    if (!hasNouns) {
      appType = 'landing';
    }
  }

  const features: string[] = [];
  for (const [feat, pattern] of Object.entries(FEATURE_PATTERNS)) {
    if (pattern.test(lower) || pattern.test(originalLower)) features.push(feat);
  }

  if (domainData) {
    for (const feat of domainData.features) {
      if (!features.includes(feat)) features.push(feat);
    }
  }

  if (features.length === 0) {
    features.push('responsive');
    if (appType !== 'landing' && appType !== 'calculator' && appType !== 'form') {
      features.push('crud');
    }
  }

  if (!features.includes('responsive')) features.push('responsive');

  let uiStyle: ProjectRequirements['uiStyle'] = domainData?.uiStyle || 'modern';
  for (const [style, pattern] of Object.entries(UI_STYLE_PATTERNS)) {
    if (pattern.test(lower) || pattern.test(originalLower)) {
      uiStyle = style as ProjectRequirements['uiStyle'];
      break;
    }
  }

  const appName = inferAppName(input);

  let pages: string[];
  if (domainData && domainData.pages.length > 0) {
    pages = domainData.pages;
    const extraPages = detectPages(input, appType);
    for (const p of extraPages) {
      if (!pages.includes(p)) pages.push(p);
    }
  } else {
    pages = detectPages(input, appType);
  }

  let dataModels: DataModel[];
  if (domainData && domainData.dataModels.length > 0) {
    dataModels = domainData.dataModels;
  } else {
    dataModels = detectDataModels(input, appType);
  }

  const hasAuth = features.includes('auth') || /auth|login|signup|register|sign.?in|account/i.test(originalLower);
  const hasBackend = hasAuth || /api|backend|server|database|endpoint/i.test(originalLower);
  const hasDatabase = hasBackend || /database|db|storage|persist|save/i.test(originalLower);
  const complexity = detectComplexity(input, pages, features);

  return {
    appType,
    appName,
    pages,
    features,
    dataModels,
    uiStyle,
    hasBackend,
    hasAuth,
    hasDatabase,
    complexity,
  };
}

// =============================================================================
// 2. generateProject — Full multi-file React+Vite project generation
// =============================================================================

function genPackageJson(req: ProjectRequirements): string {
  const deps: Record<string, string> = {
    react: '^18.3.1',
    'react-dom': '^18.3.1',
    'lucide-react': '^0.344.0',
  };
  const devDeps: Record<string, string> = {
    vite: '^5.1.0',
    tailwindcss: '^3.4.1',
    postcss: '^8.4.35',
    autoprefixer: '^10.4.17',
  };

  if (req.pages.length > 1) {
    deps['react-router-dom'] = '^6.22.0';
  }
  if (req.features.includes('charts')) {
    deps['recharts'] = '^2.12.0';
  }
  if (req.features.some(f => ['booking', 'calendar'].includes(f)) || req.appType === 'booking') {
    deps['date-fns'] = '^3.3.1';
  }

  return JSON.stringify(
    {
      name: slugify(req.appName),
      private: true,
      version: '1.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
      },
      dependencies: deps,
      devDependencies: devDeps,
    },
    null,
    2,
  );
}

function genViteConfig(): string {
  return `import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  server: {
    host: '0.0.0.0',
    port: 5200,
  },
});
`;
}

function genTailwindConfig(): string {
  return `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
    },
  },
  plugins: [],
};
`;
}

function genPostcssConfig(): string {
  return `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;
}

function genIndexHtml(req: ProjectRequirements): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="${req.appName} - Built with React and Tailwind CSS" />
  <title>${req.appName}</title>
  <link rel="icon" type="image/svg+xml" href="/vite.svg" />
</head>
<body class="bg-gray-950 text-gray-100 antialiased">
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
`;
}

function genMainJsx(): string {
  return `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`;
}

function genIndexCss(req: ProjectRequirements): string {
  const accent = req.uiStyle === 'bold'
    ? '139 92 246'
    : req.uiStyle === 'playful'
      ? '236 72 153'
      : req.uiStyle === 'corporate'
        ? '59 130 246'
        : '99 102 241';

  return `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-accent: ${accent};
  --color-bg: 3 7 18;
  --color-surface: 17 24 39;
  --color-surface-elevated: 31 41 55;
  --color-text: 243 244 246;
  --color-text-muted: 156 163 175;
  --color-border: 55 65 81;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: rgb(var(--color-bg));
  color: rgb(var(--color-text));
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

@layer components {
  .btn-primary {
    @apply inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 active:scale-[0.98];
  }

  .btn-secondary {
    @apply inline-flex items-center justify-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm font-semibold text-gray-200 transition-all hover:bg-gray-700 hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900 active:scale-[0.98];
  }

  .btn-ghost {
    @apply inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-gray-400 transition-all hover:bg-gray-800 hover:text-gray-200 focus:outline-none active:scale-[0.98];
  }

  .card {
    @apply rounded-xl border border-gray-800 bg-gray-900 p-6 transition-all;
  }

  .card-hover {
    @apply card hover:border-gray-700 hover:shadow-lg hover:shadow-indigo-500/5;
  }

  .input-field {
    @apply w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500;
  }

  .badge {
    @apply inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium;
  }
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: rgb(var(--color-bg));
}

::-webkit-scrollbar-thumb {
  background: rgb(var(--color-border));
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgb(var(--color-text-muted));
}
`;
}

// =============================================================================
// APP-TYPE SPECIFIC GENERATORS
// =============================================================================

function generateEcommerceProject(req: ProjectRequirements, content: SynthesizedContent): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  files.push({
    path: 'src/data/products.js',
    language: 'javascript',
    content: `const products = ${JSON.stringify(content.products, null, 2)};

export const categories = ${JSON.stringify(['All', ...content.productCategories])};

export default products;
`,
  });

  files.push({
    path: 'src/hooks/useCart.jsx',
    language: 'jsx',
    content: `import { createContext, useContext, useReducer, useCallback } from 'react';

const CartContext = createContext(null);

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find(i => i.id === action.payload.id);
      if (existing) {
        return {
          ...state,
          items: state.items.map(i =>
            i.id === action.payload.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return { ...state, items: [...state.items, { ...action.payload, quantity: 1 }] };
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(i => i.id !== action.payload) };
    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items.map(i =>
          i.id === action.payload.id ? { ...i, quantity: Math.max(0, action.payload.quantity) } : i
        ).filter(i => i.quantity > 0),
      };
    case 'CLEAR_CART':
      return { ...state, items: [] };
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  const addItem = useCallback((product) => {
    dispatch({ type: 'ADD_ITEM', payload: product });
  }, []);

  const removeItem = useCallback((id) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id });
  }, []);

  const updateQuantity = useCallback((id, quantity) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' });
  }, []);

  const cartTotal = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = state.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items: state.items, addItem, removeItem, updateQuantity, clearCart, cartTotal, cartCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}

export default useCart;
`,
  });

  files.push({
    path: 'src/hooks/useSearch.jsx',
    language: 'jsx',
    content: `import { useState, useMemo } from 'react';

export function useSearch(items, searchFields = ['name', 'description']) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('default');

  const filtered = useMemo(() => {
    let result = [...items];

    if (query.trim()) {
      const lower = query.toLowerCase();
      result = result.filter(item =>
        searchFields.some(field => {
          const val = item[field];
          return typeof val === 'string' && val.toLowerCase().includes(lower);
        })
      );
    }

    if (selectedCategory && selectedCategory !== 'All') {
      result = result.filter(item => item.category === selectedCategory);
    }

    switch (sortBy) {
      case 'price-asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }

    return result;
  }, [items, query, selectedCategory, sortBy, searchFields]);

  return {
    query,
    setQuery,
    selectedCategory,
    setSelectedCategory,
    sortBy,
    setSortBy,
    filtered,
    resultCount: filtered.length,
  };
}

export default useSearch;
`,
  });

  files.push({
    path: 'src/components/Navbar.jsx',
    language: 'jsx',
    content: `import { ShoppingCart, Search, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../hooks/useCart';

export default function Navbar() {
  const { cartCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/80 backdrop-blur-xl" role="navigation" aria-label="Main navigation">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2" aria-label="Home">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <span className="text-sm font-bold text-white">S</span>
          </div>
          <span className="text-lg font-bold text-white">${req.appName}</span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          <Link to="/" className="text-sm font-medium text-gray-300 transition-colors hover:text-white">Home</Link>
          <Link to="/products" className="text-sm font-medium text-gray-300 transition-colors hover:text-white">Products</Link>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/cart" className="relative rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white" aria-label={\`Shopping cart with \${cartCount} items\`}>
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>

          <button
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-gray-800 bg-gray-950 px-4 py-3 md:hidden">
          <Link to="/" className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white" onClick={() => setMobileMenuOpen(false)}>Home</Link>
          <Link to="/products" className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white" onClick={() => setMobileMenuOpen(false)}>Products</Link>
        </div>
      )}
    </nav>
  );
}
`,
  });

  files.push({
    path: 'src/components/ProductCard.jsx',
    language: 'jsx',
    content: `import { ShoppingCart, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../hooks/useCart';

export default function ProductCard({ product }) {
  const { addItem } = useCart();

  return (
    <div className="group card-hover flex flex-col overflow-hidden">
      <Link to={\`/products/\${product.id}\`} className="relative aspect-square overflow-hidden rounded-lg bg-gray-800">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {!product.inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/70">
            <span className="badge bg-red-500/20 text-red-400">Out of Stock</span>
          </div>
        )}
      </Link>

      <div className="mt-4 flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <Link to={\`/products/\${product.id}\`} className="text-sm font-semibold text-gray-100 transition-colors hover:text-indigo-400">
            {product.name}
          </Link>
        </div>

        <span className="badge w-fit bg-gray-800 text-gray-400">{product.category}</span>

        <div className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span className="text-sm font-medium text-gray-300">{product.rating}</span>
          <span className="text-xs text-gray-500">({product.reviews})</span>
        </div>

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-lg font-bold text-white">{"$"}{product.price.toFixed(2)}</span>
          <button
            onClick={(e) => { e.preventDefault(); addItem(product); }}
            disabled={!product.inStock}
            className="btn-primary flex items-center gap-1.5 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={\`Add \${product.name} to cart\`}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
`,
  });

  files.push({
    path: 'src/components/SearchBar.jsx',
    language: 'jsx',
    content: `import { Search, X } from 'lucide-react';

export default function SearchBar({ value, onChange, placeholder = 'Search products...' }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-field pl-10 pr-10"
        aria-label="Search"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
`,
  });

  files.push({
    path: 'src/components/FilterPanel.jsx',
    language: 'jsx',
    content: `import { SlidersHorizontal } from 'lucide-react';

export default function FilterPanel({ categories, selectedCategory, onCategoryChange, sortBy, onSortChange }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-gray-500" />
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            className={\`badge transition-colors \${selectedCategory === cat ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'}\`}
            aria-pressed={selectedCategory === cat}
          >
            {cat}
          </button>
        ))}
      </div>

      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value)}
        className="input-field w-auto"
        aria-label="Sort products"
      >
        <option value="default">Sort by: Default</option>
        <option value="price-asc">Price: Low to High</option>
        <option value="price-desc">Price: High to Low</option>
        <option value="rating">Highest Rated</option>
        <option value="name">Name A-Z</option>
      </select>
    </div>
  );
}
`,
  });

  files.push({
    path: 'src/components/Footer.jsx',
    language: 'jsx',
    content: `export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-800 bg-gray-950" role="contentinfo">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-gray-500">${req.appName}. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#privacy" className="text-sm text-gray-500 transition-colors hover:text-gray-300">Privacy</a>
            <a href="#terms" className="text-sm text-gray-500 transition-colors hover:text-gray-300">Terms</a>
            <a href="#contact" className="text-sm text-gray-500 transition-colors hover:text-gray-300">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
`,
  });

  files.push({
    path: 'src/pages/HomePage.jsx',
    language: 'jsx',
    content: `import { ArrowRight, Sparkles, Truck, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import products from '../data/products';
import ProductCard from '../components/ProductCard';

export default function HomePage() {
  const featured = products.filter(p => p.inStock).slice(0, 4);

  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600/20 via-gray-950 to-purple-600/20 px-4 py-20 sm:py-32">
        <div className="mx-auto max-w-7xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
            Discover Products You&apos;ll <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Love</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400">
            Curated collection of premium products with fast shipping and hassle-free returns.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link to="/products" className="btn-primary px-6 py-3 text-base">
              Shop Now <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="card flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600/20">
              <Truck className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Free Shipping</h3>
              <p className="text-xs text-gray-500">On orders over $50</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600/20">
              <Shield className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Secure Payment</h3>
              <p className="text-xs text-gray-500">256-bit SSL encryption</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-600/20">
              <Sparkles className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Premium Quality</h3>
              <p className="text-xs text-gray-500">Hand-picked products</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Featured Products</h2>
          <Link to="/products" className="btn-ghost text-indigo-400 hover:text-indigo-300">
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
`,
  });

  files.push({
    path: 'src/pages/ProductsPage.jsx',
    language: 'jsx',
    content: `import products, { categories } from '../data/products';
import ProductCard from '../components/ProductCard';
import SearchBar from '../components/SearchBar';
import FilterPanel from '../components/FilterPanel';
import { useSearch } from '../hooks/useSearch';

export default function ProductsPage() {
  const { query, setQuery, selectedCategory, setSelectedCategory, sortBy, setSortBy, filtered, resultCount } = useSearch(products);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">All Products</h1>
        <p className="mt-1 text-sm text-gray-500">{resultCount} products found</p>
      </div>

      <div className="mb-6 flex flex-col gap-4">
        <SearchBar value={query} onChange={setQuery} />
        <FilterPanel
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg font-medium text-gray-400">No products found</p>
          <p className="mt-1 text-sm text-gray-600">Try adjusting your search or filter criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
`,
  });

  files.push({
    path: 'src/pages/CartPage.jsx',
    language: 'jsx',
    content: `import { Minus, Plus, Trash2, ArrowLeft, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../hooks/useCart';

export default function CartPage() {
  const { items, updateQuantity, removeItem, clearCart, cartTotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-20 text-center">
        <ShoppingBag className="mb-4 h-16 w-16 text-gray-700" />
        <h2 className="text-2xl font-bold text-white">Your cart is empty</h2>
        <p className="mt-2 text-gray-500">Looks like you haven&apos;t added anything yet.</p>
        <Link to="/products" className="btn-primary mt-6">
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Shopping Cart</h1>
        <button onClick={clearCart} className="btn-ghost text-red-400 hover:text-red-300">
          Clear Cart
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {items.map((item) => (
          <div key={item.id} className="card flex items-center gap-4">
            <img src={item.image} alt={item.name} className="h-20 w-20 rounded-lg object-cover" />
            <div className="flex-1">
              <h3 className="font-semibold text-white">{item.name}</h3>
              <p className="text-sm text-gray-500">{"$"}{item.price.toFixed(2)} each</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-700 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
                aria-label="Decrease quantity"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-8 text-center font-medium text-white">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-700 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
                aria-label="Increase quantity"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <span className="w-24 text-right font-bold text-white">{"$"}{(item.price * item.quantity).toFixed(2)}</span>
            <button
              onClick={() => removeItem(item.id)}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
              aria-label={\`Remove \${item.name} from cart\`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 card">
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <span className="text-gray-400">Subtotal</span>
          <span className="text-lg font-bold text-white">{"$"}{cartTotal.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between pt-4">
          <Link to="/products" className="btn-ghost">
            <ArrowLeft className="h-4 w-4" /> Continue Shopping
          </Link>
          <Link to="/checkout" className="btn-primary px-8">Checkout</Link>
        </div>
      </div>
    </div>
  );
}
`,
  });

  files.push({
    path: 'src/pages/CheckoutPage.jsx',
    language: 'jsx',
    content: `import { useState } from 'react';
import { CreditCard, Lock, Check } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { Link } from 'react-router-dom';

export default function CheckoutPage() {
  const { items, cartTotal, clearCart } = useCart();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', address: '', city: '', zip: '' });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    clearCart();
  };

  if (submitted) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600/20">
          <Check className="h-8 w-8 text-emerald-400" />
        </div>
        <h2 className="mt-6 text-2xl font-bold text-white">Order Confirmed</h2>
        <p className="mt-2 text-gray-400">Thank you for your purchase. Your order is being processed.</p>
        <Link to="/" className="btn-primary mt-8">Back to Home</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-8 text-3xl font-bold text-white">Checkout</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-white">Shipping Information</h2>
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-400">Full Name</label>
              <input id="name" name="name" value={form.name} onChange={handleChange} required className="input-field" placeholder="John Doe" />
            </div>
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-400">Email</label>
              <input id="email" name="email" type="email" value={form.email} onChange={handleChange} required className="input-field" placeholder="john@example.com" />
            </div>
            <div>
              <label htmlFor="address" className="mb-1 block text-sm font-medium text-gray-400">Address</label>
              <input id="address" name="address" value={form.address} onChange={handleChange} required className="input-field" placeholder="123 Main St" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="city" className="mb-1 block text-sm font-medium text-gray-400">City</label>
                <input id="city" name="city" value={form.city} onChange={handleChange} required className="input-field" placeholder="New York" />
              </div>
              <div>
                <label htmlFor="zip" className="mb-1 block text-sm font-medium text-gray-400">ZIP Code</label>
                <input id="zip" name="zip" value={form.zip} onChange={handleChange} required className="input-field" placeholder="10001" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-white">Order Summary</h2>
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{item.name} x{item.quantity}</span>
                <span className="text-gray-400">{"$"}{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-gray-800 pt-4">
            <span className="font-semibold text-white">Total</span>
            <span className="text-xl font-bold text-indigo-400">{"$"}{cartTotal.toFixed(2)}</span>
          </div>
        </div>

        <button type="submit" className="btn-primary flex w-full items-center justify-center gap-2 py-3 text-base">
          <Lock className="h-4 w-4" /> Place Order
        </button>
      </form>
    </div>
  );
}
`,
  });

  files.push({
    path: 'src/App.jsx',
    language: 'jsx',
    content: `import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './hooks/useCart';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <div className="flex min-h-screen flex-col bg-gray-950">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </CartProvider>
    </BrowserRouter>
  );
}
`,
  });

  return files;
}

// =============================================================================
// DASHBOARD GENERATOR
// =============================================================================

function generateDashboardProject(req: ProjectRequirements, content: SynthesizedContent): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  files.push({
    path: 'src/data/dashboard.js',
    language: 'javascript',
    content: `export const metrics = ${JSON.stringify(content.metrics, null, 2)};

export const recentActivity = ${JSON.stringify(content.recentActivity, null, 2)};

export const chartData = ${JSON.stringify(content.chartData, null, 2)};

export const topItems = ${JSON.stringify(content.topItems, null, 2)};
`,
  });

  files.push({
    path: 'src/components/Sidebar.jsx',
    language: 'jsx',
    content: `import { LayoutDashboard, BarChart3, Settings, Users, ShoppingBag, Bell, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: Users, label: 'Customers', path: '/customers' },
  { icon: ShoppingBag, label: 'Products', path: '/products' },
  { icon: Bell, label: 'Notifications', path: '/notifications' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside className={\`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-gray-800 bg-gray-950 transition-all duration-300 \${collapsed ? 'w-16' : 'w-60'}\`} role="navigation" aria-label="Sidebar navigation">
      <div className="flex h-16 items-center justify-between border-b border-gray-800 px-4">
        {!collapsed && <span className="text-lg font-bold text-white">${req.appName}</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={\`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors \${active ? 'bg-indigo-600/20 text-indigo-400' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'}\`}
                  aria-current={active ? 'page' : undefined}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-gray-800 p-2">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-800/50 hover:text-gray-300" aria-label="Log out">
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </aside>
  );
}
`,
  });

  files.push({
    path: 'src/components/MetricCard.jsx',
    language: 'jsx',
    content: `import { DollarSign, Users, TrendingUp, TrendingDown, ShoppingCart } from 'lucide-react';

const iconMap = {
  DollarSign,
  Users,
  TrendingUp,
  ShoppingCart,
};

export default function MetricCard({ metric }) {
  const Icon = iconMap[metric.icon] || DollarSign;
  const isPositive = metric.change >= 0;

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-400">{metric.label}</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600/10">
          <Icon className="h-4 w-4 text-indigo-400" />
        </div>
      </div>
      <div className="mt-3">
        <span className="text-2xl font-bold text-white">
          {metric.prefix || ''}{typeof metric.value === 'number' && metric.value >= 1000 ? metric.value.toLocaleString() : metric.value}{metric.suffix || ''}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-1">
        {isPositive ? <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> : <TrendingDown className="h-3.5 w-3.5 text-red-400" />}
        <span className={\`text-xs font-medium \${isPositive ? 'text-emerald-400' : 'text-red-400'}\`}>
          {isPositive ? '+' : ''}{metric.change}%
        </span>
        <span className="text-xs text-gray-600">vs last month</span>
      </div>
    </div>
  );
}
`,
  });

  files.push({
    path: 'src/components/ActivityFeed.jsx',
    language: 'jsx',
    content: `export default function ActivityFeed({ activities }) {
  return (
    <div className="card">
      <h3 className="mb-4 text-lg font-semibold text-white">Recent Activity</h3>
      <div className="flex flex-col gap-3">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-800/50">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600/20 text-xs font-semibold text-indigo-400">
              {activity.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-gray-200">{activity.user}</p>
              <p className="truncate text-xs text-gray-500">{activity.action}</p>
            </div>
            <div className="text-right shrink-0">
              {activity.amount && <p className="text-sm font-semibold text-white">{"$"}{activity.amount.toFixed(2)}</p>}
              <p className="text-xs text-gray-600">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
`,
  });

  files.push({
    path: 'src/components/StatsChart.jsx',
    language: 'jsx',
    content: `import { useState } from 'react';

export default function StatsChart({ data }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const maxRevenue = Math.max(...data.map(d => d.revenue));

  return (
    <div className="card">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Revenue Overview</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-indigo-500"></div>
            <span className="text-xs text-gray-500">Revenue</span>
          </div>
        </div>
      </div>
      <div className="flex h-48 items-end gap-1" role="img" aria-label="Revenue chart">
        {data.map((item, index) => {
          const height = (item.revenue / maxRevenue) * 100;
          return (
            <div
              key={item.name}
              className="group relative flex flex-1 flex-col items-center"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {hoveredIndex === index && (
                <div className="absolute -top-10 rounded-lg bg-gray-800 px-2 py-1 text-xs font-medium text-white shadow-lg">
                  {"$"}{item.revenue.toLocaleString()}
                </div>
              )}
              <div
                className="w-full rounded-t-sm bg-indigo-600/80 transition-all duration-300 hover:bg-indigo-500"
                style={{ height: \`\${height}%\` }}
              />
              <span className="mt-2 text-xs text-gray-600">{item.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
`,
  });

  files.push({
    path: 'src/components/TopProducts.jsx',
    language: 'jsx',
    content: `import { TrendingUp, TrendingDown } from 'lucide-react';

export default function TopProducts({ products }) {
  return (
    <div className="card">
      <h3 className="mb-4 text-lg font-semibold text-white">Top Products</h3>
      <div className="overflow-x-auto">
        <table className="w-full" role="table">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Product</th>
              <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Sales</th>
              <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Revenue</th>
              <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Trend</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, i) => (
              <tr key={i} className="border-b border-gray-800/50 last:border-0">
                <td className="py-3 text-sm font-medium text-gray-200">{product.name}</td>
                <td className="py-3 text-right text-sm text-gray-400">{product.sales.toLocaleString()}</td>
                <td className="py-3 text-right text-sm font-medium text-white">{"$"}{product.revenue.toLocaleString()}</td>
                <td className="py-3 text-right">
                  {product.trend === 'up'
                    ? <TrendingUp className="ml-auto h-4 w-4 text-emerald-400" />
                    : <TrendingDown className="ml-auto h-4 w-4 text-red-400" />
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
`,
  });

  files.push({
    path: 'src/pages/DashboardPage.jsx',
    language: 'jsx',
    content: `import { metrics, recentActivity, chartData, topItems } from '../data/dashboard';
import MetricCard from '../components/MetricCard';
import ActivityFeed from '../components/ActivityFeed';
import StatsChart from '../components/StatsChart';
import TopProducts from '../components/TopProducts';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-gray-500">Welcome back. Here&apos;s what&apos;s happening today.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <StatsChart data={chartData} />
        </div>
        <div>
          <ActivityFeed activities={recentActivity} />
        </div>
      </div>

      <TopProducts products={topItems} />
    </div>
  );
}
`,
  });

  files.push({
    path: 'src/pages/SettingsPage.jsx',
    language: 'jsx',
    content: `import { useState } from 'react';
import { Save, Bell, Shield, Palette } from 'lucide-react';

export default function SettingsPage() {
  const [profile, setProfile] = useState({ name: 'John Doe', email: 'john@example.com', role: 'Admin' });
  const [notifications, setNotifications] = useState({ email: true, push: false, weekly: true });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      <div className="card">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">Profile</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="settings-name" className="mb-1 block text-sm font-medium text-gray-400">Name</label>
            <input id="settings-name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="input-field" />
          </div>
          <div>
            <label htmlFor="settings-email" className="mb-1 block text-sm font-medium text-gray-400">Email</label>
            <input id="settings-email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className="input-field" />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">Notifications</h2>
        </div>
        <div className="flex flex-col gap-3">
          {Object.entries(notifications).map(([key, val]) => (
            <label key={key} className="flex cursor-pointer items-center justify-between rounded-lg p-3 transition-colors hover:bg-gray-800/50">
              <span className="text-sm font-medium capitalize text-gray-300">{key} notifications</span>
              <button
                type="button"
                role="switch"
                aria-checked={val}
                onClick={() => setNotifications({ ...notifications, [key]: !val })}
                className={\`relative h-6 w-11 rounded-full transition-colors \${val ? 'bg-indigo-600' : 'bg-gray-700'}\`}
              >
                <span className={\`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform \${val ? 'translate-x-5' : 'translate-x-0'}\`} />
              </button>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} className="btn-primary">
          <Save className="h-4 w-4" /> Save Changes
        </button>
        {saved && <span className="text-sm font-medium text-emerald-400">Settings saved successfully</span>}
      </div>
    </div>
  );
}
`,
  });

  files.push({
    path: 'src/App.jsx',
    language: 'jsx',
    content: `import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-gray-950">
        <Sidebar />
        <main className="flex-1 ml-60 overflow-auto">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/analytics" element={<DashboardPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<DashboardPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
`,
  });

  return files;
}

// =============================================================================
// TODO / TASK MANAGER GENERATOR
// =============================================================================

function generateTodoProject(req: ProjectRequirements, content: SynthesizedContent): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  files.push({
    path: 'src/data/tasks.js',
    language: 'javascript',
    content: `const initialTasks = ${JSON.stringify(content.tasks, null, 2)};

export const statusOptions = ['todo', 'in-progress', 'done'];
export const priorityOptions = ['low', 'medium', 'high'];

export default initialTasks;
`,
  });

  files.push({
    path: 'src/hooks/useTasks.jsx',
    language: 'jsx',
    content: `import { createContext, useContext, useReducer, useCallback } from 'react';
import initialTasks from '../data/tasks';

const TasksContext = createContext(null);

function tasksReducer(state, action) {
  switch (action.type) {
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, { ...action.payload, id: Date.now() }] };
    case 'UPDATE_TASK':
      return { ...state, tasks: state.tasks.map(t => t.id === action.payload.id ? { ...t, ...action.payload } : t) };
    case 'DELETE_TASK':
      return { ...state, tasks: state.tasks.filter(t => t.id !== action.payload) };
    case 'SET_FILTER':
      return { ...state, filter: { ...state.filter, ...action.payload } };
    default:
      return state;
  }
}

export function TasksProvider({ children }) {
  const [state, dispatch] = useReducer(tasksReducer, {
    tasks: initialTasks,
    filter: { status: 'all', priority: 'all', search: '' },
  });

  const addTask = useCallback((task) => dispatch({ type: 'ADD_TASK', payload: task }), []);
  const updateTask = useCallback((task) => dispatch({ type: 'UPDATE_TASK', payload: task }), []);
  const deleteTask = useCallback((id) => dispatch({ type: 'DELETE_TASK', payload: id }), []);
  const setFilter = useCallback((filter) => dispatch({ type: 'SET_FILTER', payload: filter }), []);

  const filteredTasks = state.tasks.filter(task => {
    if (state.filter.status !== 'all' && task.status !== state.filter.status) return false;
    if (state.filter.priority !== 'all' && task.priority !== state.filter.priority) return false;
    if (state.filter.search) {
      const q = state.filter.search.toLowerCase();
      return task.title.toLowerCase().includes(q) || task.description.toLowerCase().includes(q);
    }
    return true;
  });

  const stats = {
    total: state.tasks.length,
    todo: state.tasks.filter(t => t.status === 'todo').length,
    inProgress: state.tasks.filter(t => t.status === 'in-progress').length,
    done: state.tasks.filter(t => t.status === 'done').length,
  };

  return (
    <TasksContext.Provider value={{ tasks: state.tasks, filteredTasks, filter: state.filter, stats, addTask, updateTask, deleteTask, setFilter }}>
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used within a TasksProvider');
  return ctx;
}

export default useTasks;
`,
  });

  files.push({
    path: 'src/components/TaskCard.jsx',
    language: 'jsx',
    content: `import { Calendar, Trash2, GripVertical } from 'lucide-react';
import { useTasks } from '../hooks/useTasks';

const priorityColors = {
  low: 'bg-blue-500/20 text-blue-400',
  medium: 'bg-amber-500/20 text-amber-400',
  high: 'bg-red-500/20 text-red-400',
};

const statusColors = {
  todo: 'bg-gray-700 text-gray-300',
  'in-progress': 'bg-indigo-500/20 text-indigo-400',
  done: 'bg-emerald-500/20 text-emerald-400',
};

export default function TaskCard({ task }) {
  const { updateTask, deleteTask } = useTasks();

  const cycleStatus = () => {
    const order = ['todo', 'in-progress', 'done'];
    const next = order[(order.indexOf(task.status) + 1) % order.length];
    updateTask({ id: task.id, status: next });
  };

  return (
    <div className="card-hover group flex items-start gap-3">
      <button onClick={cycleStatus} className="mt-1 shrink-0" aria-label={\`Change status of \${task.title}\`}>
        <div className={\`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors \${task.status === 'done' ? 'border-emerald-500 bg-emerald-500' : task.status === 'in-progress' ? 'border-indigo-500' : 'border-gray-600'}\`}>
          {task.status === 'done' && (
            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </button>

      <div className="flex-1 min-w-0">
        <h3 className={\`text-sm font-semibold \${task.status === 'done' ? 'text-gray-500 line-through' : 'text-white'}\`}>{task.title}</h3>
        <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{task.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={\`badge \${priorityColors[task.priority]}\`}>{task.priority}</span>
          <span className={\`badge \${statusColors[task.status]}\`}>{task.status.replace('-', ' ')}</span>
          {task.dueDate && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="h-3 w-3" /> {task.dueDate}
            </span>
          )}
          {task.assignee && (
            <span className="text-xs text-gray-600">{task.assignee}</span>
          )}
        </div>
      </div>

      <button
        onClick={() => deleteTask(task.id)}
        className="shrink-0 rounded-lg p-1.5 text-gray-600 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400"
        aria-label={\`Delete task \${task.title}\`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
`,
  });

  files.push({
    path: 'src/components/TaskForm.jsx',
    language: 'jsx',
    content: `import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useTasks } from '../hooks/useTasks';
import { statusOptions, priorityOptions } from '../data/tasks';

export default function TaskForm() {
  const { addTask } = useTasks();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', status: 'todo', priority: 'medium', dueDate: '', assignee: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    addTask(form);
    setForm({ title: '', description: '', status: 'todo', priority: 'medium', dueDate: '', assignee: '' });
    setOpen(false);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary w-full" aria-label="Add new task">
        <Plus className="h-4 w-4" /> Add Task
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">New Task</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-300" aria-label="Cancel">
          <X className="h-4 w-4" />
        </button>
      </div>
      <input name="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Task title" required className="input-field" />
      <textarea name="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description (optional)" rows={2} className="input-field resize-none" />
      <div className="grid grid-cols-2 gap-3">
        <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="input-field" aria-label="Priority">
          {priorityOptions.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
        <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="input-field" aria-label="Due date" />
      </div>
      <input name="assignee" value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} placeholder="Assignee (optional)" className="input-field" />
      <button type="submit" className="btn-primary">
        <Plus className="h-4 w-4" /> Create Task
      </button>
    </form>
  );
}
`,
  });

  files.push({
    path: 'src/components/StatsOverview.jsx',
    language: 'jsx',
    content: `import { CheckCircle2, Clock, ListTodo, Layers } from 'lucide-react';
import { useTasks } from '../hooks/useTasks';

export default function StatsOverview() {
  const { stats } = useTasks();

  const cards = [
    { label: 'Total', value: stats.total, icon: Layers, color: 'text-gray-400 bg-gray-800' },
    { label: 'To Do', value: stats.todo, icon: ListTodo, color: 'text-blue-400 bg-blue-500/10' },
    { label: 'In Progress', value: stats.inProgress, icon: Clock, color: 'text-amber-400 bg-amber-500/10' },
    { label: 'Done', value: stats.done, icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/10' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="card flex items-center gap-3">
          <div className={\`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg \${card.color}\`}>
            <card.icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{card.value}</p>
            <p className="text-xs text-gray-500">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
`,
  });

  files.push({
    path: 'src/components/StatusFilter.jsx',
    language: 'jsx',
    content: `import { Search } from 'lucide-react';
import { useTasks } from '../hooks/useTasks';
import { statusOptions, priorityOptions } from '../data/tasks';

export default function StatusFilter() {
  const { filter, setFilter } = useTasks();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="search"
          value={filter.search}
          onChange={(e) => setFilter({ search: e.target.value })}
          placeholder="Search tasks..."
          className="input-field pl-10"
          aria-label="Search tasks"
        />
      </div>
      <div className="flex gap-2">
        <select value={filter.status} onChange={(e) => setFilter({ status: e.target.value })} className="input-field w-auto" aria-label="Filter by status">
          <option value="all">All Status</option>
          {statusOptions.map(s => <option key={s} value={s}>{s.replace('-', ' ').replace(/\\b\\w/g, c => c.toUpperCase())}</option>)}
        </select>
        <select value={filter.priority} onChange={(e) => setFilter({ priority: e.target.value })} className="input-field w-auto" aria-label="Filter by priority">
          <option value="all">All Priority</option>
          {priorityOptions.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
      </div>
    </div>
  );
}
`,
  });

  files.push({
    path: 'src/pages/DashboardPage.jsx',
    language: 'jsx',
    content: `import StatsOverview from '../components/StatsOverview';
import StatusFilter from '../components/StatusFilter';
import TaskCard from '../components/TaskCard';
import TaskForm from '../components/TaskForm';
import { useTasks } from '../hooks/useTasks';

export default function DashboardPage() {
  const { filteredTasks } = useTasks();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-white">${req.appName}</h1>
        <p className="text-sm text-gray-500">Organize and track your tasks efficiently.</p>
      </div>

      <StatsOverview />
      <TaskForm />
      <StatusFilter />

      <div className="flex flex-col gap-3">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <p className="text-gray-500">No tasks match your filters.</p>
          </div>
        ) : (
          filteredTasks.map((task) => <TaskCard key={task.id} task={task} />)
        )}
      </div>
    </div>
  );
}
`,
  });

  files.push({
    path: 'src/App.jsx',
    language: 'jsx',
    content: `import { TasksProvider } from './hooks/useTasks';
import DashboardPage from './pages/DashboardPage';

export default function App() {
  return (
    <TasksProvider>
      <div className="min-h-screen bg-gray-950">
        <DashboardPage />
      </div>
    </TasksProvider>
  );
}
`,
  });

  return files;
}

// =============================================================================
// BLOG GENERATOR
// =============================================================================

function generateBlogProject(req: ProjectRequirements, content: SynthesizedContent): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  files.push({
    path: 'src/data/posts.js',
    language: 'javascript',
    content: `const posts = ${JSON.stringify(content.posts, null, 2)};

export const blogCategories = ${JSON.stringify(['All', ...content.blogCategories])};

export default posts;
`,
  });

  files.push({
    path: 'src/components/Navbar.jsx',
    language: 'jsx',
    content: `import { BookOpen, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/80 backdrop-blur-xl" role="navigation" aria-label="Main navigation">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-indigo-400" />
          <span className="text-lg font-bold text-white">${req.appName}</span>
        </Link>
        <div className="hidden items-center gap-6 sm:flex">
          <Link to="/" className="text-sm text-gray-400 transition-colors hover:text-white">Home</Link>
          <Link to="/articles" className="text-sm text-gray-400 transition-colors hover:text-white">Articles</Link>
          <Link to="/about" className="text-sm text-gray-400 transition-colors hover:text-white">About</Link>
        </div>
        <button onClick={() => setOpen(!open)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 sm:hidden" aria-label="Toggle menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-gray-800 px-4 py-3 sm:hidden">
          <Link to="/" className="block py-2 text-sm text-gray-400 hover:text-white" onClick={() => setOpen(false)}>Home</Link>
          <Link to="/articles" className="block py-2 text-sm text-gray-400 hover:text-white" onClick={() => setOpen(false)}>Articles</Link>
          <Link to="/about" className="block py-2 text-sm text-gray-400 hover:text-white" onClick={() => setOpen(false)}>About</Link>
        </div>
      )}
    </nav>
  );
}
`,
  });

  files.push({
    path: 'src/components/PostCard.jsx',
    language: 'jsx',
    content: `import { Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PostCard({ post, featured = false }) {
  return (
    <article className={\`card-hover group \${featured ? 'sm:col-span-2 sm:flex sm:gap-6' : 'flex flex-col'}\`}>
      <Link to={\`/articles/\${post.id}\`} className={\`block overflow-hidden rounded-lg \${featured ? 'sm:w-1/2' : 'aspect-video w-full'}\`}>
        <img src={post.image} alt={post.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
      </Link>
      <div className={\`flex flex-1 flex-col \${featured ? 'justify-center' : 'mt-4'}\`}>
        <div className="flex items-center gap-2">
          <span className="badge bg-indigo-500/20 text-indigo-400">{post.category}</span>
          <span className="flex items-center gap-1 text-xs text-gray-500"><Clock className="h-3 w-3" /> {post.readTime}</span>
        </div>
        <Link to={\`/articles/\${post.id}\`}>
          <h2 className={\`mt-2 font-bold text-white transition-colors group-hover:text-indigo-400 \${featured ? 'text-2xl' : 'text-lg'}\`}>{post.title}</h2>
        </Link>
        <p className="mt-2 text-sm text-gray-400 line-clamp-2">{post.excerpt}</p>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600/20 text-xs font-semibold text-indigo-400">{post.authorAvatar}</div>
            <div>
              <span className="text-xs font-medium text-gray-300">{post.author}</span>
              <span className="mx-1 text-xs text-gray-600">-</span>
              <span className="text-xs text-gray-500">{post.date}</span>
            </div>
          </div>
          <Link to={\`/articles/\${post.id}\`} className="text-xs font-medium text-indigo-400 transition-colors hover:text-indigo-300">
            Read more <ArrowRight className="inline h-3 w-3" />
          </Link>
        </div>
      </div>
    </article>
  );
}
`,
  });

  files.push({
    path: 'src/pages/HomePage.jsx',
    language: 'jsx',
    content: `import posts from '../data/posts';
import PostCard from '../components/PostCard';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <section className="mb-16 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Insights & <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Ideas</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-gray-400">Thoughts on engineering, design, and building great software.</p>
      </section>

      <section>
        <div className="grid gap-6 sm:grid-cols-2">
          {posts.slice(0, 1).map(p => <PostCard key={p.id} post={p} featured />)}
          {posts.slice(1, 5).map(p => <PostCard key={p.id} post={p} />)}
        </div>
        <div className="mt-10 text-center">
          <Link to="/articles" className="btn-primary">View All Articles <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>
    </div>
  );
}
`,
  });

  files.push({
    path: 'src/pages/ArticlesPage.jsx',
    language: 'jsx',
    content: `import { useState } from 'react';
import posts, { blogCategories } from '../data/posts';
import PostCard from '../components/PostCard';

export default function ArticlesPage() {
  const [category, setCategory] = useState('All');
  const filtered = category === 'All' ? posts : posts.filter(p => p.category === category);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-white">All Articles</h1>
      <div className="mt-6 flex flex-wrap gap-2">
        {blogCategories.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)} className={\`badge transition-colors \${category === cat ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}\`} aria-pressed={category === cat}>{cat}</button>
        ))}
      </div>
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {filtered.map(p => <PostCard key={p.id} post={p} />)}
      </div>
    </div>
  );
}
`,
  });

  files.push({
    path: 'src/pages/ArticleDetailPage.jsx',
    language: 'jsx',
    content: `import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar } from 'lucide-react';
import posts from '../data/posts';

export default function ArticleDetailPage() {
  const { id } = useParams();
  const post = posts.find(p => p.id === Number(id));

  if (!post) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-white">Article not found</h2>
        <Link to="/articles" className="btn-primary mt-4">Back to Articles</Link>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link to="/articles" className="btn-ghost mb-6 inline-flex text-gray-400">
        <ArrowLeft className="h-4 w-4" /> Back to Articles
      </Link>

      <header>
        <div className="flex flex-wrap items-center gap-3">
          <span className="badge bg-indigo-500/20 text-indigo-400">{post.category}</span>
          <span className="flex items-center gap-1 text-sm text-gray-500"><Clock className="h-3.5 w-3.5" /> {post.readTime}</span>
          <span className="flex items-center gap-1 text-sm text-gray-500"><Calendar className="h-3.5 w-3.5" /> {post.date}</span>
        </div>
        <h1 className="mt-4 text-3xl font-extrabold text-white sm:text-4xl">{post.title}</h1>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600/20 font-semibold text-indigo-400">{post.authorAvatar}</div>
          <span className="text-sm font-medium text-gray-300">{post.author}</span>
        </div>
      </header>

      <img src={post.image} alt={post.title} className="mt-8 aspect-video w-full rounded-xl object-cover" />

      <div className="prose prose-invert mt-8 max-w-none text-gray-300 leading-relaxed">
        <p className="text-lg">{post.excerpt}</p>
        <p className="mt-4">{post.content}</p>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {post.tags.map(tag => <span key={tag} className="badge bg-gray-800 text-gray-400">{tag}</span>)}
      </div>
    </article>
  );
}
`,
  });

  files.push({
    path: 'src/pages/AboutPage.jsx',
    language: 'jsx',
    content: `export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-white">About</h1>
      <div className="mt-6 space-y-4 text-gray-400 leading-relaxed">
        <p>${req.appName} is a platform for sharing insights on software engineering, design, and technology. Our mission is to help developers build better software through practical, actionable content.</p>
        <p>We cover topics ranging from frontend architecture to DevOps practices, with a focus on real-world applications and best practices that you can apply to your own projects.</p>
      </div>
    </div>
  );
}
`,
  });

  files.push({
    path: 'src/components/Footer.jsx',
    language: 'jsx',
    content: `export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-800" role="contentinfo">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <p className="text-center text-sm text-gray-600">${req.appName}. Built with React.</p>
      </div>
    </footer>
  );
}
`,
  });

  files.push({
    path: 'src/App.jsx',
    language: 'jsx',
    content: `import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ArticlesPage from './pages/ArticlesPage';
import ArticleDetailPage from './pages/ArticleDetailPage';
import AboutPage from './pages/AboutPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col bg-gray-950">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/articles" element={<ArticlesPage />} />
            <Route path="/articles/:id" element={<ArticleDetailPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
`,
  });

  return files;
}

// =============================================================================
// PORTFOLIO GENERATOR
// =============================================================================

function generatePortfolioProject(req: ProjectRequirements, content: SynthesizedContent): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  files.push({
    path: 'src/data/projects.js',
    language: 'javascript',
    content: `const projects = ${JSON.stringify(content.portfolioProjects, null, 2)};

export default projects;
`,
  });

  files.push({
    path: 'src/App.jsx',
    language: 'jsx',
    content: `import { useState } from 'react';
import { Github, Linkedin, Mail, ExternalLink, ChevronDown, Code2, Palette, Server } from 'lucide-react';
import projects from './data/projects';

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <span className="text-lg font-bold text-white">${req.appName}</span>
        <div className="flex items-center gap-4">
          <a href="#projects" className="text-sm text-gray-400 hover:text-white transition-colors">Projects</a>
          <a href="#about" className="text-sm text-gray-400 hover:text-white transition-colors">About</a>
          <a href="#contact" className="text-sm text-gray-400 hover:text-white transition-colors">Contact</a>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-2xl font-bold text-white mb-6">
        JD
      </div>
      <h1 className="text-4xl font-extrabold text-white sm:text-6xl">
        Creative <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Developer</span>
      </h1>
      <p className="mt-4 max-w-lg text-lg text-gray-400">
        I build exceptional digital experiences with modern technologies. Focused on clean code, great design, and performance.
      </p>
      <div className="mt-8 flex gap-3">
        <a href="#projects" className="btn-primary px-6 py-3">View My Work</a>
        <a href="#contact" className="btn-secondary px-6 py-3">Get In Touch</a>
      </div>
      <a href="#about" className="mt-16 animate-bounce text-gray-600" aria-label="Scroll down">
        <ChevronDown className="h-6 w-6" />
      </a>
    </section>
  );
}

function Skills() {
  const skills = [
    { icon: Code2, title: 'Frontend', items: ['React', 'TypeScript', 'Tailwind CSS', 'Next.js'] },
    { icon: Server, title: 'Backend', items: ['Node.js', 'Python', 'PostgreSQL', 'GraphQL'] },
    { icon: Palette, title: 'Design', items: ['Figma', 'UI/UX', 'Responsive Design', 'Motion'] },
  ];

  return (
    <section id="about" className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
      <h2 className="text-center text-3xl font-bold text-white">What I Do</h2>
      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {skills.map((skill) => (
          <div key={skill.title} className="card text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/10">
              <skill.icon className="h-6 w-6 text-indigo-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">{skill.title}</h3>
            <ul className="mt-3 space-y-1">
              {skill.items.map(item => <li key={item} className="text-sm text-gray-500">{item}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function Projects() {
  return (
    <section id="projects" className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
      <h2 className="text-center text-3xl font-bold text-white">Featured Projects</h2>
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {projects.map((project) => (
          <div key={project.id} className="card-hover group overflow-hidden">
            <div className="aspect-video overflow-hidden rounded-lg">
              <img src={project.image} alt={project.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-white">{project.title}</h3>
            <p className="mt-1 text-sm text-gray-400 line-clamp-2">{project.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {project.tags.map(tag => <span key={tag} className="badge bg-gray-800 text-gray-400">{tag}</span>)}
            </div>
            <div className="mt-4 flex gap-3">
              <a href={project.link} className="btn-ghost text-xs text-indigo-400" aria-label={\`View \${project.title} live\`}>
                <ExternalLink className="h-3.5 w-3.5" /> Live Demo
              </a>
              <a href={project.github} className="btn-ghost text-xs text-gray-400" aria-label={\`View \${project.title} source\`}>
                <Github className="h-3.5 w-3.5" /> Source
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section id="contact" className="mx-auto max-w-xl px-4 py-20 sm:px-6 text-center">
      <h2 className="text-3xl font-bold text-white">Get In Touch</h2>
      <p className="mt-4 text-gray-400">Have a project in mind? I would love to hear from you.</p>
      <div className="mt-8 flex justify-center gap-4">
        <a href="mailto:hello@example.com" className="btn-primary px-6 py-3" aria-label="Send email"><Mail className="h-4 w-4" /> Email Me</a>
        <a href="#" className="btn-secondary px-6 py-3" aria-label="GitHub profile"><Github className="h-4 w-4" /> GitHub</a>
        <a href="#" className="btn-secondary px-6 py-3" aria-label="LinkedIn profile"><Linkedin className="h-4 w-4" /> LinkedIn</a>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <main>
        <Hero />
        <Skills />
        <Projects />
        <Contact />
      </main>
      <footer className="border-t border-gray-800 py-8 text-center text-sm text-gray-600">
        Built with React & Tailwind CSS
      </footer>
    </div>
  );
}
`,
  });

  return files;
}

// =============================================================================
// LANDING PAGE GENERATOR
// =============================================================================

function generateLandingProject(req: ProjectRequirements, content: SynthesizedContent): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  files.push({
    path: 'src/App.jsx',
    language: 'jsx',
    content: `import { useState } from 'react';
import { ArrowRight, Check, Star, Zap, Shield, Globe, ChevronDown, ChevronUp, Menu, X } from 'lucide-react';

function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-xl" role="navigation">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <span className="text-lg font-bold text-white">${req.appName}</span>
        <div className="hidden items-center gap-6 md:flex">
          <a href="#features" className="text-sm text-gray-400 hover:text-white">Features</a>
          <a href="#pricing" className="text-sm text-gray-400 hover:text-white">Pricing</a>
          <a href="#faq" className="text-sm text-gray-400 hover:text-white">FAQ</a>
          <button className="btn-primary text-sm">Get Started</button>
        </div>
        <button onClick={() => setOpen(!open)} className="md:hidden p-2 text-gray-400" aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-gray-800 px-4 py-3 md:hidden">
          <a href="#features" className="block py-2 text-sm text-gray-400" onClick={() => setOpen(false)}>Features</a>
          <a href="#pricing" className="block py-2 text-sm text-gray-400" onClick={() => setOpen(false)}>Pricing</a>
          <a href="#faq" className="block py-2 text-sm text-gray-400" onClick={() => setOpen(false)}>FAQ</a>
        </div>
      )}
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 px-4 text-center">
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-600/10 via-transparent to-transparent" />
      <div className="relative mx-auto max-w-4xl">
        <span className="badge mb-4 bg-indigo-500/20 text-indigo-400">Now in Public Beta</span>
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
          ${content.heroTitle.replace(/'/g, "\\'")}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400">
          ${content.heroSubtitle.replace(/'/g, "\\'")}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <button className="btn-primary px-8 py-3 text-base">${content.heroCta.replace(/'/g, "\\'")} <ArrowRight className="h-4 w-4" /></button>
          <button className="btn-secondary px-8 py-3 text-base">Watch Demo</button>
        </div>
        <p className="mt-4 text-sm text-gray-600">No credit card required. 14-day free trial.</p>
      </div>
    </section>
  );
}

function Features() {
  const features = [
${content.landingFeatures.map(f => `    { icon: ${f.icon}, title: '${f.title.replace(/'/g, "\\'")}', description: '${f.description.replace(/'/g, "\\'")}' },`).join('\n')}
  ];

  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <h2 className="text-center text-3xl font-bold text-white">Everything You Need</h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-gray-500">Powerful features to help you build, deploy, and scale your applications with confidence.</p>
      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="card text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/10">
              <f.icon className="h-6 w-6 text-indigo-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">{f.title}</h3>
            <p className="mt-2 text-sm text-gray-500">{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
${content.pricingPlans.map(p => `    { name: '${p.name.replace(/'/g, "\\'")}', price: ${p.price}, period: '${p.period.replace(/'/g, "\\'")}', features: [${p.features.map(f => `'${f.replace(/'/g, "\\'")}'`).join(', ')}], cta: '${p.cta.replace(/'/g, "\\'")}', popular: ${p.popular} },`).join('\n')}
  ];

  return (
    <section id="pricing" className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
      <h2 className="text-center text-3xl font-bold text-white">Simple Pricing</h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-gray-500">Start free and scale as you grow. No hidden fees.</p>
      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.name} className={\`card flex flex-col \${plan.popular ? 'border-indigo-600 ring-1 ring-indigo-600' : ''}\`}>
            {plan.popular && <span className="badge mb-3 w-fit bg-indigo-600 text-white">Most Popular</span>}
            <h3 className="text-lg font-bold text-white">{plan.name}</h3>
            <div className="mt-2">
              <span className="text-4xl font-extrabold text-white">{plan.price === 0 ? 'Free' : \`$\${plan.price}\`}</span>
              {plan.price > 0 && <span className="text-gray-500">{plan.period}</span>}
            </div>
            <ul className="mt-6 flex-1 space-y-3">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-400">
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" /> {f}
                </li>
              ))}
            </ul>
            <button className={\`mt-6 w-full \${plan.popular ? 'btn-primary' : 'btn-secondary'}\`}>{plan.cta}</button>
          </div>
        ))}
      </div>
    </section>
  );
}

function FAQ() {
  const [openIdx, setOpenIdx] = useState(null);
  const faqs = [
${content.faqs.map(faq => `    { q: '${faq.q.replace(/'/g, "\\'")}', a: '${faq.a.replace(/'/g, "\\'")}' },`).join('\n')}
  ];

  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <h2 className="text-center text-3xl font-bold text-white">Frequently Asked Questions</h2>
      <div className="mt-10 space-y-3">
        {faqs.map((faq, i) => (
          <div key={i} className="card cursor-pointer" onClick={() => setOpenIdx(openIdx === i ? null : i)} role="button" aria-expanded={openIdx === i}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">{faq.q}</h3>
              {openIdx === i ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
            </div>
            {openIdx === i && <p className="mt-3 text-sm text-gray-400">{faq.a}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Pricing />
        <FAQ />
      </main>
      <footer className="border-t border-gray-800 py-8 text-center text-sm text-gray-600">
        ${req.appName}. All rights reserved.
      </footer>
    </div>
  );
}
`,
  });

  return files;
}

// =============================================================================
// CHAT APP GENERATOR
// =============================================================================

function generateChatProject(req: ProjectRequirements, content: SynthesizedContent): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  files.push({
    path: 'src/data/conversations.js',
    language: 'javascript',
    content: `export const conversations = ${JSON.stringify(content.chatContacts, null, 2)};

export const messages = ${JSON.stringify(content.chatMessages, null, 2)};
`,
  });

  files.push({
    path: 'src/App.jsx',
    language: 'jsx',
    content: `import { useState } from 'react';
import { Send, Search, Phone, Video, MoreVertical, Smile, Paperclip } from 'lucide-react';
import { conversations, messages as initialMessages } from './data/conversations';

function ConversationList({ selected, onSelect, searchQuery, onSearchChange }) {
  const filtered = conversations.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r border-gray-800 bg-gray-950" role="navigation" aria-label="Conversations">
      <div className="border-b border-gray-800 p-4">
        <h1 className="text-lg font-bold text-white">${req.appName}</h1>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input type="search" value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search conversations..." className="input-field pl-10 text-sm" aria-label="Search conversations" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={\`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors \${selected === conv.id ? 'bg-gray-800/50' : 'hover:bg-gray-900'}\`}
            aria-current={selected === conv.id ? 'true' : undefined}
          >
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600/20 text-sm font-semibold text-indigo-400">{conv.avatar}</div>
              {conv.online && <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-gray-950 bg-emerald-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white truncate">{conv.name}</span>
                <span className="text-xs text-gray-600 shrink-0">{conv.timestamp}</span>
              </div>
              <p className="truncate text-xs text-gray-500">{conv.lastMessage}</p>
            </div>
            {conv.unread > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">{conv.unread}</span>
            )}
          </button>
        ))}
      </div>
    </aside>
  );
}

function ChatArea({ conversationId }) {
  const [allMessages, setAllMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const conv = conversations.find(c => c.id === conversationId);
  const msgs = allMessages[conversationId] || [];

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const newMsg = { id: Date.now(), sender: 'You', text: input, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isMe: true };
    setAllMessages({ ...allMessages, [conversationId]: [...msgs, newMsg] });
    setInput('');
  };

  if (!conv) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-600">
        <p>Select a conversation to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-gray-800 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600/20 text-sm font-semibold text-indigo-400">{conv.avatar}</div>
          <div>
            <h2 className="text-sm font-semibold text-white">{conv.name}</h2>
            <p className="text-xs text-gray-500">{conv.online ? 'Online' : 'Offline'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white" aria-label="Voice call"><Phone className="h-4 w-4" /></button>
          <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white" aria-label="Video call"><Video className="h-4 w-4" /></button>
          <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white" aria-label="More options"><MoreVertical className="h-4 w-4" /></button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {msgs.map((msg) => (
            <div key={msg.id} className={\`flex \${msg.isMe ? 'justify-end' : 'justify-start'}\`}>
              <div className={\`max-w-[70%] rounded-2xl px-4 py-2.5 \${msg.isMe ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-200'}\`}>
                <p className="text-sm">{msg.text}</p>
                <p className={\`mt-1 text-right text-xs \${msg.isMe ? 'text-indigo-200' : 'text-gray-500'}\`}>{msg.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSend} className="border-t border-gray-800 p-4">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <button type="button" className="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-800 hover:text-gray-300" aria-label="Attach file"><Paperclip className="h-4 w-4" /></button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="input-field flex-1"
            aria-label="Message input"
          />
          <button type="button" className="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-800 hover:text-gray-300" aria-label="Emoji"><Smile className="h-4 w-4" /></button>
          <button type="submit" disabled={!input.trim()} className="btn-primary shrink-0 px-4 disabled:opacity-50" aria-label="Send message">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

export default function App() {
  const [selected, setSelected] = useState(1);
  const [search, setSearch] = useState('');

  return (
    <div className="flex h-screen bg-gray-950">
      <ConversationList selected={selected} onSelect={setSelected} searchQuery={search} onSearchChange={setSearch} />
      <ChatArea conversationId={selected} />
    </div>
  );
}
`,
  });

  return files;
}

// =============================================================================
// GENERIC / CUSTOM GENERATOR (fallback)
// =============================================================================

function generateGenericProject(req: ProjectRequirements): GeneratedFile[] {
  const hasMultiplePages = req.pages.length > 1;
  const files: GeneratedFile[] = [];

  if (hasMultiplePages) {
    req.pages.forEach((page) => {
      const pageName = page.replace(/\s+/g, '');
      files.push({
        path: `src/pages/${pageName}Page.jsx`,
        language: 'jsx',
        content: `export default function ${pageName}Page() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-white">${page}</h1>
      <p className="mt-2 text-gray-400">Welcome to the ${page} page.</p>
    </div>
  );
}
`,
      });
    });

    files.push({
      path: 'src/components/Navbar.jsx',
      language: 'jsx',
      content: `import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

const links = [
${req.pages.map(p => `  { label: '${p}', to: '${p === req.pages[0] ? '/' : '/' + kebabCase(p)}' },`).join('\n')}
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/80 backdrop-blur-xl" role="navigation" aria-label="Main">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <span className="text-lg font-bold text-white">${req.appName}</span>
        <div className="hidden md:flex items-center gap-4">
          {links.map((link) => (
            <Link key={link.to} to={link.to} className={\`text-sm font-medium transition-colors \${location.pathname === link.to ? 'text-indigo-400' : 'text-gray-400 hover:text-white'}\`}>
              {link.label}
            </Link>
          ))}
        </div>
        <button onClick={() => setOpen(!open)} className="md:hidden p-2 text-gray-400 hover:text-white" aria-label="Toggle menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-gray-800 px-4 py-3 md:hidden">
          {links.map((link) => (
            <Link key={link.to} to={link.to} className="block py-2 text-sm text-gray-400 hover:text-white" onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
`,
    });

    const routeImports = req.pages.map(p => {
      const name = p.replace(/\s+/g, '');
      return `import ${name}Page from './pages/${name}Page';`;
    }).join('\n');

    const routes = req.pages.map((p, i) => {
      const name = p.replace(/\s+/g, '');
      const path = i === 0 ? '/' : '/' + kebabCase(p);
      return `            <Route path="${path}" element={<${name}Page />} />`;
    }).join('\n');

    files.push({
      path: 'src/App.jsx',
      language: 'jsx',
      content: `import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
${routeImports}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col bg-gray-950">
        <Navbar />
        <main className="flex-1">
          <Routes>
${routes}
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
`,
    });
  } else {
    files.push({
      path: 'src/App.jsx',
      language: 'jsx',
      content: `import { useState } from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-white sm:text-5xl">
          ${req.appName}
        </h1>
        <p className="mt-4 text-lg text-gray-400">Your application is ready. Start building something amazing.</p>
        <button className="btn-primary mt-8 px-8 py-3 text-base">Get Started</button>
      </div>
    </div>
  );
}
`,
    });
  }

  return files;
}

// =============================================================================
// MAIN PROJECT GENERATOR
// =============================================================================

export function generateProject(requirements: ProjectRequirements, userPrompt?: string): GeneratedProject {
  const content = synthesizeContent(requirements, userPrompt);

  const baseFiles: GeneratedFile[] = [
    { path: 'package.json', content: genPackageJson(requirements), language: 'json' },
    { path: 'vite.config.js', content: genViteConfig(), language: 'javascript' },
    { path: 'tailwind.config.js', content: genTailwindConfig(), language: 'javascript' },
    { path: 'postcss.config.js', content: genPostcssConfig(), language: 'javascript' },
    { path: 'index.html', content: genIndexHtml(requirements), language: 'html' },
    { path: 'src/main.jsx', content: genMainJsx(), language: 'jsx' },
    { path: 'src/index.css', content: genIndexCss(requirements), language: 'css' },
  ];

  let appFiles: GeneratedFile[];

  switch (requirements.appType) {
    case 'ecommerce':
    case 'marketplace':
      appFiles = generateEcommerceProject(requirements, content);
      break;
    case 'dashboard':
    case 'admin':
    case 'analytics':
      appFiles = generateDashboardProject(requirements, content);
      break;
    case 'todo':
    case 'crm':
      appFiles = generateTodoProject(requirements, content);
      break;
    case 'blog':
    case 'cms':
      appFiles = generateBlogProject(requirements, content);
      break;
    case 'portfolio':
      appFiles = generatePortfolioProject(requirements, content);
      break;
    case 'landing':
    case 'saas':
      appFiles = generateLandingProject(requirements, content);
      break;
    case 'chat':
    case 'social':
      appFiles = generateChatProject(requirements, content);
      break;
    default:
      appFiles = generateGenericProject(requirements);
      break;
  }

  const appFileOverrides = new Set(appFiles.map(f => f.path));
  const merged = [
    ...baseFiles.filter(f => !appFileOverrides.has(f.path)),
    ...appFiles,
  ];

  const description = buildDescription(requirements);

  return {
    name: requirements.appName,
    description,
    files: merged,
  };
}

function buildDescription(req: ProjectRequirements): string {
  const parts = [`A ${req.complexity} ${req.appType} application`];
  if (req.pages.length > 1) parts.push(`with ${req.pages.length} pages (${req.pages.join(', ')})`);
  if (req.features.length > 0) parts.push(`featuring ${req.features.join(', ')}`);
  parts.push('built with React, Vite, and Tailwind CSS');
  return parts.join(' ') + '.';
}

// =============================================================================
// 3. formatProjectResponse — Format as markdown with --- FILE: path --- markers
// =============================================================================

export function formatProjectResponse(project: GeneratedProject): string {
  const lines: string[] = [];

  lines.push(`# ${project.name}\n`);
  lines.push(`${project.description}\n`);
  lines.push(`Here is the complete project with **${project.files.length} files**:\n`);

  for (const file of project.files) {
    lines.push(`--- FILE: ${file.path} ---`);
    lines.push(file.content);
    lines.push('');
  }

  lines.push(`\n**To run this project:**`);
  lines.push(`1. Install dependencies: \`npm install\``);
  lines.push(`2. Start development server: \`npm run dev\``);
  lines.push(`3. Open your browser to the local URL shown in the terminal`);

  return lines.join('\n');
}

// =============================================================================
// 4. shouldUseProGenerator — Returns true for any non-trivial coding request
// =============================================================================

const TRIVIAL_PATTERNS = [
  /^(hi|hello|hey|yo|sup|what'?s up)\s*[!?.]*$/i,
  /^(thanks|thank you|thx|ty)\s*[!?.]*$/i,
  /^(yes|no|ok|okay|sure|yep|nope|cool|nice|great)\s*[!?.]*$/i,
  /^(how are you|what is your name|who are you)\s*[?!.]*$/i,
  /^(help|menu|commands)\s*[?!.]*$/i,
];

export function shouldUseProGenerator(input: string): boolean {
  const trimmed = input.trim();
  if (trimmed.length < 3) return false;
  for (const pattern of TRIVIAL_PATTERNS) {
    if (pattern.test(trimmed)) return false;
  }
  const lower = trimmed.toLowerCase();
  const codingSignals = [
    'build', 'create', 'make', 'develop', 'design', 'generate', 'code',
    'app', 'website', 'page', 'dashboard', 'store', 'blog', 'portfolio',
    'component', 'feature', 'form', 'todo', 'task', 'chat', 'e-commerce',
    'ecommerce', 'landing', 'admin', 'calculator', 'game', 'social',
    'react', 'frontend', 'fullstack', 'full-stack', 'web', 'site',
    'project', 'template', 'clone', 'like', 'similar to', 'platform',
    'tool', 'system', 'tracker', 'manager', 'booking', 'marketplace',
    'saas', 'crm', 'cms', 'analytics', 'api',
  ];
  return codingSignals.some(signal => lower.includes(signal));
}

// =============================================================================
// 5. Instrumented versions with thinking step callbacks
// =============================================================================

export function analyzePromptWithThinking(
  input: string,
  onStep: ThinkingCallback
): ProjectRequirements {
  onStep({
    phase: 'understanding',
    label: 'Reading your request',
    detail: `Processing: "${input.length > 80 ? input.slice(0, 80) + '...' : input}"`,
  });

  const normalized = normalizePrompt(input);
  const originalLower = input.toLowerCase();

  if (normalized !== input.trim()) {
    onStep({
      phase: 'understanding',
      label: 'Interpreting natural language',
      detail: 'Correcting typos and understanding conversational phrasing',
    });
  }

  const domain = detectDomain(input) || detectDomain(normalized);
  const domainData = domain ? DOMAIN_ENRICHMENT[domain] : null;

  if (domain) {
    onStep({
      phase: 'analyzing',
      label: `Detected domain: ${domain}`,
      detail: `Recognized this as a ${domain} application with specialized knowledge`,
    });
  }

  const lower = normalized.toLowerCase();
  let appType = 'custom';
  for (const [type, pattern] of Object.entries(APP_TYPE_PATTERNS)) {
    if (pattern.test(lower) || pattern.test(originalLower)) {
      appType = type;
      break;
    }
  }
  if (appType === 'custom' && domainData) appType = domainData.appType;
  if (appType === 'custom') {
    const intentType = inferFromIntentPhrases(input) || inferFromIntentPhrases(normalized);
    if (intentType) appType = intentType;
  }
  if (appType === 'custom') {
    const hasNouns = /\b(app|site|page|tool|system|platform|website|webapp)\b/i.test(originalLower);
    if (!hasNouns) appType = 'landing';
  }

  const appTypeLabels: Record<string, string> = {
    dashboard: 'Dashboard / Analytics App',
    ecommerce: 'E-Commerce Store',
    blog: 'Blog / Content Platform',
    portfolio: 'Portfolio / Showcase',
    social: 'Social / Community App',
    saas: 'SaaS Product',
    todo: 'Task Manager',
    chat: 'Chat / Messaging App',
    crm: 'CRM / Sales Platform',
    analytics: 'Data Analytics App',
    booking: 'Booking / Scheduling App',
    marketplace: 'Marketplace',
    cms: 'Content Management System',
    game: 'Interactive Game',
    calculator: 'Calculator / Tool',
    form: 'Form / Survey',
    landing: 'Landing Page',
    admin: 'Admin Panel',
    api: 'API Dashboard',
    custom: 'Custom Application',
  };

  onStep({
    phase: 'analyzing',
    label: `App type: ${appTypeLabels[appType] || appType}`,
    detail: `Choosing the best architecture for a ${appType} application`,
  });

  const features: string[] = [];
  for (const [feat, pattern] of Object.entries(FEATURE_PATTERNS)) {
    if (pattern.test(lower) || pattern.test(originalLower)) features.push(feat);
  }
  if (domainData) {
    for (const feat of domainData.features) {
      if (!features.includes(feat)) features.push(feat);
    }
  }
  if (features.length === 0) {
    features.push('responsive');
    if (appType !== 'landing' && appType !== 'calculator' && appType !== 'form') {
      features.push('crud');
    }
  }
  if (!features.includes('responsive')) features.push('responsive');

  const featureLabels: Record<string, string> = {
    auth: 'User Authentication',
    search: 'Search',
    filtering: 'Filtering & Sorting',
    crud: 'Create/Read/Update/Delete',
    'dark-mode': 'Dark Mode',
    responsive: 'Responsive Layout',
    notifications: 'Notifications',
    'real-time': 'Real-Time Updates',
    'file-upload': 'File Upload',
    charts: 'Charts & Graphs',
    export: 'Data Export',
    pagination: 'Pagination',
    sorting: 'Sorting',
  };

  onStep({
    phase: 'analyzing',
    label: `Features: ${features.map(f => featureLabels[f] || f).join(', ')}`,
    detail: `Identified ${features.length} features to implement`,
  });

  let uiStyle: ProjectRequirements['uiStyle'] = domainData?.uiStyle || 'modern';
  for (const [style, pattern] of Object.entries(UI_STYLE_PATTERNS)) {
    if (pattern.test(lower) || pattern.test(originalLower)) {
      uiStyle = style as ProjectRequirements['uiStyle'];
      break;
    }
  }

  const appName = inferAppName(input);

  let pages: string[];
  if (domainData && domainData.pages.length > 0) {
    pages = domainData.pages;
    const extraPages = detectPages(input, appType);
    for (const p of extraPages) {
      if (!pages.includes(p)) pages.push(p);
    }
  } else {
    pages = detectPages(input, appType);
  }

  onStep({
    phase: 'planning',
    label: `Planning ${pages.length} pages`,
    detail: pages.join(', '),
  });

  let dataModels: DataModel[];
  if (domainData && domainData.dataModels.length > 0) {
    dataModels = domainData.dataModels;
  } else {
    dataModels = detectDataModels(input, appType);
  }

  if (dataModels.length > 0) {
    onStep({
      phase: 'planning',
      label: `Designing ${dataModels.length} data models`,
      detail: dataModels.map(m => `${m.name} (${m.fields.length} fields)`).join(', '),
    });
  }

  onStep({
    phase: 'planning',
    label: `UI style: ${uiStyle}`,
    detail: `Applying ${uiStyle} design system with Tailwind CSS`,
  });

  const hasAuth = features.includes('auth') || /auth|login|signup|register|sign.?in|account/i.test(originalLower);
  const hasBackend = hasAuth || /api|backend|server|database|endpoint/i.test(originalLower);
  const hasDatabase = hasBackend || /database|db|storage|persist|save/i.test(originalLower);
  const complexity = detectComplexity(input, pages, features);

  return {
    appType, appName, pages, features, dataModels,
    uiStyle, hasBackend, hasAuth, hasDatabase, complexity,
  };
}

export function generateProjectWithThinking(
  requirements: ProjectRequirements,
  onStep: ThinkingCallback,
  userPrompt?: string
): GeneratedProject {
  onStep({
    phase: 'generating',
    label: 'Setting up project scaffold',
    detail: 'Creating package.json, Vite config, Tailwind config, and entry files',
  });

  const content = synthesizeContent(requirements, userPrompt);

  const baseFiles: GeneratedFile[] = [
    { path: 'package.json', content: genPackageJson(requirements), language: 'json' },
    { path: 'vite.config.js', content: genViteConfig(), language: 'javascript' },
    { path: 'tailwind.config.js', content: genTailwindConfig(), language: 'javascript' },
    { path: 'postcss.config.js', content: genPostcssConfig(), language: 'javascript' },
    { path: 'index.html', content: genIndexHtml(requirements), language: 'html' },
    { path: 'src/main.jsx', content: genMainJsx(), language: 'jsx' },
    { path: 'src/index.css', content: genIndexCss(requirements), language: 'css' },
  ];

  onStep({
    phase: 'generating',
    label: `Building ${requirements.appType} components`,
    detail: `Generating React components for ${requirements.pages.join(', ')}`,
  });

  let appFiles: GeneratedFile[];
  switch (requirements.appType) {
    case 'ecommerce':
    case 'marketplace':
      appFiles = generateEcommerceProject(requirements, content);
      break;
    case 'dashboard':
    case 'admin':
    case 'analytics':
      appFiles = generateDashboardProject(requirements, content);
      break;
    case 'todo':
    case 'crm':
      appFiles = generateTodoProject(requirements, content);
      break;
    case 'blog':
    case 'cms':
      appFiles = generateBlogProject(requirements, content);
      break;
    case 'portfolio':
      appFiles = generatePortfolioProject(requirements, content);
      break;
    case 'landing':
    case 'saas':
      appFiles = generateLandingProject(requirements, content);
      break;
    case 'chat':
    case 'social':
      appFiles = generateChatProject(requirements, content);
      break;
    default:
      appFiles = generateGenericProject(requirements);
      break;
  }

  const appFileOverrides = new Set(appFiles.map(f => f.path));
  const merged = [
    ...baseFiles.filter(f => !appFileOverrides.has(f.path)),
    ...appFiles,
  ];

  onStep({
    phase: 'generating',
    label: `Created ${merged.length} files`,
    detail: merged.filter(f => f.path.endsWith('.jsx')).map(f => f.path.split('/').pop()).join(', '),
  });

  const description = buildDescription(requirements);

  return {
    name: requirements.appName,
    description,
    files: merged,
  };
}