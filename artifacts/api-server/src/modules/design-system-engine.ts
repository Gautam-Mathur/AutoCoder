import type { ProjectPlan } from './plan-generator.js';
import type { ReasoningResult } from './contextual-reasoning-engine.js';

export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

export interface DesignTokens {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  radius: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  info: string;
  infoForeground: string;
}

export interface GradientDef {
  name: string;
  value: string;
  usage: string;
}

export interface AnimationDef {
  name: string;
  keyframes: string;
  utility: string;
}

export interface ShadowScale {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  glow: string;
  inner: string;
}

export interface TypographyScale {
  fontFamily: string;
  headingFamily: string;
  monoFamily: string;
  scale: {
    xs: { size: string; lineHeight: string; letterSpacing: string };
    sm: { size: string; lineHeight: string; letterSpacing: string };
    base: { size: string; lineHeight: string; letterSpacing: string };
    lg: { size: string; lineHeight: string; letterSpacing: string };
    xl: { size: string; lineHeight: string; letterSpacing: string };
    '2xl': { size: string; lineHeight: string; letterSpacing: string };
    '3xl': { size: string; lineHeight: string; letterSpacing: string };
    '4xl': { size: string; lineHeight: string; letterSpacing: string };
  };
}

export interface ComponentStyles {
  cardShadow: string;
  cardBorderRadius: string;
  cardHoverTransform: string;
  buttonBorderRadius: string;
  inputBorderRadius: string;
  tableBorderStyle: string;
  badgeBorderRadius: string;
  sidebarWidth: string;
  sidebarBackground: string;
  headerHeight: string;
  transitionSpeed: string;
  transitionEasing: string;
}

export interface DesignSystem {
  name: string;
  description: string;
  defaultMode: 'dark' | 'light';
  lightTokens: DesignTokens;
  darkTokens: DesignTokens;
  primaryColor: ColorScale;
  accentColor: ColorScale;
  gradients: GradientDef[];
  shadows: ShadowScale;
  typography: TypographyScale;
  animations: AnimationDef[];
  componentStyles: ComponentStyles;
  spacingBase: number;
}

interface DomainPalette {
  primary: { hue: number; saturation: number };
  accent: { hue: number; saturation: number };
  mood: string;
  fontStack: string;
  headingStack: string;
}

const DOMAIN_PALETTES: Record<string, DomainPalette> = {
  'project-management': {
    primary: { hue: 250, saturation: 85 },
    accent: { hue: 170, saturation: 75 },
    mood: 'productive',
    fontStack: '"Inter", "SF Pro Display", system-ui, sans-serif',
    headingStack: '"Inter", "SF Pro Display", system-ui, sans-serif',
  },
  'crm': {
    primary: { hue: 220, saturation: 80 },
    accent: { hue: 38, saturation: 92 },
    mood: 'trustworthy',
    fontStack: '"Inter", "SF Pro Display", system-ui, sans-serif',
    headingStack: '"Inter", "SF Pro Display", system-ui, sans-serif',
  },
  'healthcare': {
    primary: { hue: 186, saturation: 70 },
    accent: { hue: 152, saturation: 65 },
    mood: 'calming',
    fontStack: '"Inter", "Nunito Sans", system-ui, sans-serif',
    headingStack: '"Inter", "Nunito Sans", system-ui, sans-serif',
  },
  'finance': {
    primary: { hue: 215, saturation: 75 },
    accent: { hue: 45, saturation: 85 },
    mood: 'professional',
    fontStack: '"Inter", "IBM Plex Sans", system-ui, sans-serif',
    headingStack: '"Inter", "IBM Plex Sans", system-ui, sans-serif',
  },
  'education': {
    primary: { hue: 262, saturation: 72 },
    accent: { hue: 25, saturation: 90 },
    mood: 'inspiring',
    fontStack: '"Inter", "Nunito", system-ui, sans-serif',
    headingStack: '"Inter", "Nunito", system-ui, sans-serif',
  },
  'retail': {
    primary: { hue: 340, saturation: 75 },
    accent: { hue: 30, saturation: 90 },
    mood: 'vibrant',
    fontStack: '"Inter", "DM Sans", system-ui, sans-serif',
    headingStack: '"Inter", "DM Sans", system-ui, sans-serif',
  },
  'fitness': {
    primary: { hue: 145, saturation: 80 },
    accent: { hue: 280, saturation: 75 },
    mood: 'energetic',
    fontStack: '"Inter", "Outfit", system-ui, sans-serif',
    headingStack: '"Inter", "Outfit", system-ui, sans-serif',
  },
  'restaurant': {
    primary: { hue: 15, saturation: 80 },
    accent: { hue: 45, saturation: 85 },
    mood: 'warm',
    fontStack: '"Inter", "DM Sans", system-ui, sans-serif',
    headingStack: '"Playfair Display", "DM Serif Display", serif',
  },
  'realestate': {
    primary: { hue: 200, saturation: 65 },
    accent: { hue: 35, saturation: 80 },
    mood: 'premium',
    fontStack: '"Inter", "Outfit", system-ui, sans-serif',
    headingStack: '"Inter", "Outfit", system-ui, sans-serif',
  },
  'hr': {
    primary: { hue: 230, saturation: 70 },
    accent: { hue: 160, saturation: 65 },
    mood: 'approachable',
    fontStack: '"Inter", "Nunito Sans", system-ui, sans-serif',
    headingStack: '"Inter", "Nunito Sans", system-ui, sans-serif',
  },
  'manufacturing': {
    primary: { hue: 210, saturation: 60 },
    accent: { hue: 45, saturation: 80 },
    mood: 'industrial',
    fontStack: '"Inter", "IBM Plex Sans", system-ui, sans-serif',
    headingStack: '"Inter", "IBM Plex Sans", system-ui, sans-serif',
  },
  'consulting': {
    primary: { hue: 225, saturation: 75 },
    accent: { hue: 170, saturation: 60 },
    mood: 'sophisticated',
    fontStack: '"Inter", "DM Sans", system-ui, sans-serif',
    headingStack: '"Inter", "DM Sans", system-ui, sans-serif',
  },
  'logistics': {
    primary: { hue: 205, saturation: 70 },
    accent: { hue: 120, saturation: 60 },
    mood: 'efficient',
    fontStack: '"Inter", "Source Sans 3", system-ui, sans-serif',
    headingStack: '"Inter", "Source Sans 3", system-ui, sans-serif',
  },
  'inventory': {
    primary: { hue: 195, saturation: 68 },
    accent: { hue: 30, saturation: 75 },
    mood: 'organized',
    fontStack: '"Inter", "IBM Plex Sans", system-ui, sans-serif',
    headingStack: '"Inter", "IBM Plex Sans", system-ui, sans-serif',
  },
  'pet': {
    primary: { hue: 25, saturation: 75 },
    accent: { hue: 145, saturation: 60 },
    mood: 'warm',
    fontStack: '"Inter", "Nunito", system-ui, sans-serif',
    headingStack: '"Inter", "Nunito", system-ui, sans-serif',
  },
  'recipe': {
    primary: { hue: 18, saturation: 82 },
    accent: { hue: 50, saturation: 88 },
    mood: 'warm',
    fontStack: '"Inter", "DM Sans", system-ui, sans-serif',
    headingStack: '"Playfair Display", "DM Serif Display", serif',
  },
  'social': {
    primary: { hue: 210, saturation: 78 },
    accent: { hue: 330, saturation: 70 },
    mood: 'vibrant',
    fontStack: '"Inter", "DM Sans", system-ui, sans-serif',
    headingStack: '"Inter", "DM Sans", system-ui, sans-serif',
  },
  'blog': {
    primary: { hue: 220, saturation: 60 },
    accent: { hue: 160, saturation: 55 },
    mood: 'sophisticated',
    fontStack: '"Inter", "Source Sans 3", system-ui, sans-serif',
    headingStack: '"Playfair Display", "DM Serif Display", serif',
  },
  'event': {
    primary: { hue: 280, saturation: 72 },
    accent: { hue: 340, saturation: 78 },
    mood: 'vibrant',
    fontStack: '"Inter", "Outfit", system-ui, sans-serif',
    headingStack: '"Inter", "Outfit", system-ui, sans-serif',
  },
  'travel': {
    primary: { hue: 195, saturation: 78 },
    accent: { hue: 35, saturation: 85 },
    mood: 'inspiring',
    fontStack: '"Inter", "Outfit", system-ui, sans-serif',
    headingStack: '"Inter", "Outfit", system-ui, sans-serif',
  },
};

const DEFAULT_PALETTE: DomainPalette = {
  primary: { hue: 220, saturation: 45 },
  accent: { hue: 160, saturation: 40 },
  mood: 'modern',
  fontStack: '"Inter", system-ui, sans-serif',
  headingStack: '"Inter", system-ui, sans-serif',
};

function buildColorScale(hue: number, saturation: number): ColorScale {
  return {
    50: `${hue} ${Math.min(saturation, 30)}% 97%`,
    100: `${hue} ${Math.min(saturation, 40)}% 94%`,
    200: `${hue} ${Math.min(saturation, 50)}% 86%`,
    300: `${hue} ${Math.min(saturation, 60)}% 74%`,
    400: `${hue} ${Math.round(saturation * 0.85)}% 60%`,
    500: `${hue} ${saturation}% 50%`,
    600: `${hue} ${saturation}% 42%`,
    700: `${hue} ${Math.round(saturation * 0.9)}% 34%`,
    800: `${hue} ${Math.round(saturation * 0.85)}% 26%`,
    900: `${hue} ${Math.round(saturation * 0.8)}% 18%`,
    950: `${hue} ${Math.round(saturation * 0.75)}% 10%`,
  };
}

function buildLightTokens(palette: DomainPalette): DesignTokens {
  const { primary, accent } = palette;
  return {
    background: '0 0% 100%',
    foreground: `${primary.hue} 60% 5%`,
    card: '0 0% 100%',
    cardForeground: `${primary.hue} 60% 5%`,
    popover: '0 0% 100%',
    popoverForeground: `${primary.hue} 60% 5%`,
    primary: `${primary.hue} ${primary.saturation}% 50%`,
    primaryForeground: `${primary.hue} 20% 98%`,
    secondary: `${primary.hue} 20% 96%`,
    secondaryForeground: `${primary.hue} 40% 12%`,
    muted: `${primary.hue} 15% 95%`,
    mutedForeground: `${primary.hue} 15% 45%`,
    accent: `${accent.hue} ${Math.round(accent.saturation * 0.4)}% 95%`,
    accentForeground: `${accent.hue} 40% 12%`,
    destructive: '0 84% 60%',
    destructiveForeground: '0 0% 98%',
    border: `${primary.hue} 20% 90%`,
    input: `${primary.hue} 20% 90%`,
    ring: `${primary.hue} ${primary.saturation}% 50%`,
    radius: '0.625rem',
    success: '142 72% 42%',
    successForeground: '0 0% 98%',
    warning: '38 92% 50%',
    warningForeground: '0 0% 5%',
    info: '199 89% 48%',
    infoForeground: '0 0% 98%',
  };
}

function buildDarkTokens(palette: DomainPalette): DesignTokens {
  const { primary, accent } = palette;
  return {
    background: `${primary.hue} 25% 7%`,
    foreground: `${primary.hue} 10% 95%`,
    card: `${primary.hue} 22% 9%`,
    cardForeground: `${primary.hue} 10% 95%`,
    popover: `${primary.hue} 22% 9%`,
    popoverForeground: `${primary.hue} 10% 95%`,
    primary: `${primary.hue} ${Math.round(primary.saturation * 0.95)}% 62%`,
    primaryForeground: `${primary.hue} 50% 8%`,
    secondary: `${primary.hue} 25% 14%`,
    secondaryForeground: `${primary.hue} 10% 92%`,
    muted: `${primary.hue} 20% 14%`,
    mutedForeground: `${primary.hue} 12% 60%`,
    accent: `${accent.hue} ${Math.round(accent.saturation * 0.5)}% 16%`,
    accentForeground: `${accent.hue} 30% 90%`,
    destructive: '0 63% 35%',
    destructiveForeground: '0 0% 95%',
    border: `${primary.hue} 18% 16%`,
    input: `${primary.hue} 18% 16%`,
    ring: `${primary.hue} ${Math.round(primary.saturation * 0.8)}% 55%`,
    radius: '0.625rem',
    success: '142 60% 35%',
    successForeground: '0 0% 95%',
    warning: '38 75% 45%',
    warningForeground: '0 0% 5%',
    info: '199 75% 42%',
    infoForeground: '0 0% 95%',
  };
}

function buildGradients(palette: DomainPalette): GradientDef[] {
  const { primary, accent } = palette;
  return [
    {
      name: 'gradient-primary',
      value: `linear-gradient(135deg, hsl(${primary.hue} ${primary.saturation}% 50%) 0%, hsl(${primary.hue + 20} ${Math.round(primary.saturation * 0.9)}% 45%) 100%)`,
      usage: 'Hero sections, CTAs, primary buttons',
    },
    {
      name: 'gradient-accent',
      value: `linear-gradient(135deg, hsl(${accent.hue} ${accent.saturation}% 50%) 0%, hsl(${accent.hue + 15} ${Math.round(accent.saturation * 0.85)}% 45%) 100%)`,
      usage: 'Highlights, badges, accent elements',
    },
    {
      name: 'gradient-surface',
      value: `linear-gradient(180deg, hsl(${primary.hue} 20% 10%) 0%, hsl(${primary.hue} 25% 7%) 100%)`,
      usage: 'Card backgrounds, sidebar in dark mode',
    },
    {
      name: 'gradient-glow',
      value: `radial-gradient(ellipse at 50% 0%, hsl(${primary.hue} ${primary.saturation}% 50% / 0.15) 0%, transparent 60%)`,
      usage: 'Subtle background glow effects',
    },
    {
      name: 'gradient-mesh',
      value: `radial-gradient(at 40% 20%, hsl(${primary.hue} ${Math.round(primary.saturation * 0.8)}% 50% / 0.08) 0%, transparent 50%), radial-gradient(at 80% 80%, hsl(${accent.hue} ${Math.round(accent.saturation * 0.6)}% 50% / 0.06) 0%, transparent 50%)`,
      usage: 'Page backgrounds, hero overlays',
    },
  ];
}

function buildShadows(palette: DomainPalette): ShadowScale {
  const h = palette.primary.hue;
  return {
    sm: `0 1px 2px 0 hsl(${h} 20% 5% / 0.05)`,
    md: `0 4px 6px -1px hsl(${h} 20% 5% / 0.08), 0 2px 4px -2px hsl(${h} 20% 5% / 0.05)`,
    lg: `0 10px 15px -3px hsl(${h} 20% 5% / 0.08), 0 4px 6px -4px hsl(${h} 20% 5% / 0.04)`,
    xl: `0 20px 25px -5px hsl(${h} 20% 5% / 0.1), 0 8px 10px -6px hsl(${h} 20% 5% / 0.05)`,
    glow: `0 0 20px hsl(${h} ${palette.primary.saturation}% 50% / 0.2), 0 0 40px hsl(${h} ${palette.primary.saturation}% 50% / 0.1)`,
    inner: `inset 0 2px 4px 0 hsl(${h} 20% 5% / 0.06)`,
  };
}

function buildAnimations(_palette: DomainPalette): AnimationDef[] {
  return [
    {
      name: 'fade-in',
      keyframes: `@keyframes fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`,
      utility: 'animate-fade-in',
    },
    {
      name: 'slide-in-right',
      keyframes: `@keyframes slide-in-right { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }`,
      utility: 'animate-slide-in-right',
    },
    {
      name: 'scale-in',
      keyframes: `@keyframes scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`,
      utility: 'animate-scale-in',
    },
    {
      name: 'pulse-soft',
      keyframes: `@keyframes pulse-soft { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }`,
      utility: 'animate-pulse-soft',
    },
    {
      name: 'shimmer',
      keyframes: `@keyframes shimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }`,
      utility: 'animate-shimmer',
    },
  ];
}

function buildComponentStyles(palette: DomainPalette): ComponentStyles {
  const moodMap: Record<string, Partial<ComponentStyles>> = {
    'productive': { cardBorderRadius: '0.75rem', buttonBorderRadius: '0.5rem', transitionSpeed: '150ms' },
    'trustworthy': { cardBorderRadius: '0.625rem', buttonBorderRadius: '0.5rem', transitionSpeed: '200ms' },
    'calming': { cardBorderRadius: '1rem', buttonBorderRadius: '0.75rem', transitionSpeed: '250ms' },
    'professional': { cardBorderRadius: '0.5rem', buttonBorderRadius: '0.375rem', transitionSpeed: '150ms' },
    'inspiring': { cardBorderRadius: '1rem', buttonBorderRadius: '0.75rem', transitionSpeed: '200ms' },
    'vibrant': { cardBorderRadius: '0.875rem', buttonBorderRadius: '0.625rem', transitionSpeed: '150ms' },
    'energetic': { cardBorderRadius: '0.875rem', buttonBorderRadius: '9999px', transitionSpeed: '120ms' },
    'warm': { cardBorderRadius: '0.75rem', buttonBorderRadius: '0.5rem', transitionSpeed: '200ms' },
    'premium': { cardBorderRadius: '0.625rem', buttonBorderRadius: '0.375rem', transitionSpeed: '200ms' },
    'sophisticated': { cardBorderRadius: '0.5rem', buttonBorderRadius: '0.375rem', transitionSpeed: '180ms' },
    'modern': { cardBorderRadius: '0.625rem', buttonBorderRadius: '0.5rem', transitionSpeed: '150ms' },
  };

  const mood = moodMap[palette.mood] || moodMap['productive']!;
  const h = palette.primary.hue;

  return {
    cardShadow: `0 1px 3px hsl(${h} 20% 5% / 0.06), 0 1px 2px hsl(${h} 20% 5% / 0.04)`,
    cardBorderRadius: mood.cardBorderRadius || '0.75rem',
    cardHoverTransform: 'translateY(-2px)',
    buttonBorderRadius: mood.buttonBorderRadius || '0.5rem',
    inputBorderRadius: mood.buttonBorderRadius || '0.5rem',
    tableBorderStyle: 'border-separate border-spacing-0',
    badgeBorderRadius: '9999px',
    sidebarWidth: '16rem',
    sidebarBackground: `hsl(${h} 22% 8%)`,
    headerHeight: '3.5rem',
    transitionSpeed: mood.transitionSpeed || '150ms',
    transitionEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  };
}

export function generateDesignSystem(plan: ProjectPlan, _reasoning?: ReasoningResult): DesignSystem {
  const domainId = detectDomainFromPlan(plan);
  const combined = `${plan.projectName.toLowerCase()} ${plan.overview.toLowerCase()}`;
  const palette = (domainId && DOMAIN_PALETTES[domainId]) || synthesizePalette(combined) || DEFAULT_PALETTE;

  const primaryScale = buildColorScale(palette.primary.hue, palette.primary.saturation);
  const accentScale = buildColorScale(palette.accent.hue, palette.accent.saturation);

  return {
    name: `${plan.projectName} Design System`,
    description: `Domain-aware design system for ${plan.projectName} (${palette.mood} mood)`,
    defaultMode: 'dark',
    lightTokens: buildLightTokens(palette),
    darkTokens: buildDarkTokens(palette),
    primaryColor: primaryScale,
    accentColor: accentScale,
    gradients: buildGradients(palette),
    shadows: buildShadows(palette),
    typography: {
      fontFamily: palette.fontStack,
      headingFamily: palette.headingStack,
      monoFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
      scale: {
        xs: { size: '0.75rem', lineHeight: '1rem', letterSpacing: '0.01em' },
        sm: { size: '0.875rem', lineHeight: '1.25rem', letterSpacing: '0' },
        base: { size: '1rem', lineHeight: '1.5rem', letterSpacing: '0' },
        lg: { size: '1.125rem', lineHeight: '1.75rem', letterSpacing: '-0.01em' },
        xl: { size: '1.25rem', lineHeight: '1.75rem', letterSpacing: '-0.01em' },
        '2xl': { size: '1.5rem', lineHeight: '2rem', letterSpacing: '-0.02em' },
        '3xl': { size: '1.875rem', lineHeight: '2.25rem', letterSpacing: '-0.02em' },
        '4xl': { size: '2.25rem', lineHeight: '2.5rem', letterSpacing: '-0.03em' },
      },
    },
    animations: buildAnimations(palette),
    componentStyles: buildComponentStyles(palette),
    spacingBase: 4,
  };
}

interface MoodKeyword {
  keywords: string[];
  hue: number;
  saturation: number;
  mood: string;
}

const MOOD_KEYWORDS: MoodKeyword[] = [
  { keywords: ['warm', 'cozy', 'comfort', 'home', 'family', 'care'], hue: 25, saturation: 70, mood: 'warm' },
  { keywords: ['cool', 'calm', 'relax', 'zen', 'peace', 'meditation', 'mindful'], hue: 190, saturation: 55, mood: 'calming' },
  { keywords: ['fun', 'play', 'game', 'entertain', 'party', 'music'], hue: 300, saturation: 70, mood: 'vibrant' },
  { keywords: ['nature', 'green', 'eco', 'garden', 'plant', 'organic', 'sustain'], hue: 140, saturation: 60, mood: 'calming' },
  { keywords: ['tech', 'ai', 'data', 'analytics', 'dashboard', 'monitor', 'cyber'], hue: 210, saturation: 65, mood: 'productive' },
  { keywords: ['luxury', 'premium', 'elegant', 'boutique', 'exclusive'], hue: 35, saturation: 55, mood: 'premium' },
  { keywords: ['creative', 'art', 'design', 'portfolio', 'gallery', 'photo'], hue: 280, saturation: 60, mood: 'inspiring' },
  { keywords: ['speed', 'fast', 'quick', 'rapid', 'auto', 'race'], hue: 0, saturation: 75, mood: 'energetic' },
  { keywords: ['clean', 'minimal', 'simple', 'basic', 'lite'], hue: 210, saturation: 35, mood: 'modern' },
  { keywords: ['kids', 'child', 'kindergarten', 'toddler', 'baby', 'nursery'], hue: 45, saturation: 80, mood: 'inspiring' },
];

function synthesizePalette(combined: string): DomainPalette | null {
  let bestScore = 0;
  let bestMood: MoodKeyword | null = null;

  for (const entry of MOOD_KEYWORDS) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (combined.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMood = entry;
    }
  }

  if (!bestMood || bestScore === 0) return null;

  const accentHue = (bestMood.hue + 150) % 360;
  return {
    primary: { hue: bestMood.hue, saturation: bestMood.saturation },
    accent: { hue: accentHue, saturation: Math.max(bestMood.saturation - 15, 40) },
    mood: bestMood.mood,
    fontStack: '"Inter", system-ui, sans-serif',
    headingStack: '"Inter", system-ui, sans-serif',
  };
}

function detectDomainFromPlan(plan: ProjectPlan): string {
  const name = plan.projectName.toLowerCase();
  const overview = plan.overview.toLowerCase();
  const combined = `${name} ${overview}`;

  const domainKeywords: Record<string, string[]> = {
    'project-management': ['project', 'task', 'kanban', 'sprint', 'agile', 'todo', 'projectflow'],
    'crm': ['crm', 'sales', 'pipeline', 'lead', 'deal', 'contact', 'salespipe'],
    'healthcare': ['health', 'medical', 'patient', 'clinic', 'hospital', 'medicare'],
    'finance': ['finance', 'banking', 'payment', 'invoice', 'accounting', 'financehub'],
    'education': ['education', 'course', 'student', 'learning', 'school', 'edutrack', 'teach'],
    'retail': ['retail', 'shop', 'ecommerce', 'product', 'cart', 'retailedge', 'store', 'marketplace'],
    'fitness': ['fitness', 'gym', 'workout', 'exercise', 'fitmanager'],
    'restaurant': ['restaurant', 'dine', 'dineops', 'cafe', 'bistro'],
    'realestate': ['property', 'real estate', 'listing', 'tenant', 'propertyhub', 'rental', 'apartment'],
    'hr': ['hr', 'employee', 'recruitment', 'payroll', 'peopleforce', 'hiring', 'onboarding'],
    'manufacturing': ['manufacturing', 'production', 'factory', 'assembly', 'factoryflow'],
    'consulting': ['consulting', 'client', 'engagement', 'consultinghub'],
    'logistics': ['logistics', 'shipping', 'tracking', 'delivery', 'logitrack', 'freight', 'courier'],
    'inventory': ['inventory', 'stock', 'warehouse', 'supply', 'stocksense'],
    'pet': ['pet', 'adoption', 'animal', 'dog', 'cat', 'shelter', 'veterinary', 'vet', 'puppy', 'kitten'],
    'recipe': ['recipe', 'cooking', 'meal', 'ingredient', 'kitchen', 'chef', 'baking', 'cookbook', 'food', 'menu'],
    'social': ['social', 'community', 'forum', 'chat', 'messaging', 'network', 'friend', 'post', 'feed'],
    'blog': ['blog', 'article', 'content', 'writing', 'publish', 'editorial', 'journalist', 'news', 'magazine'],
    'event': ['event', 'booking', 'ticket', 'reservation', 'conference', 'meetup', 'rsvp', 'venue', 'schedule'],
    'travel': ['travel', 'trip', 'tourism', 'flight', 'hotel', 'vacation', 'destination', 'itinerary', 'journey', 'adventure'],
  };

  let bestMatch = '';
  let bestScore = 0;

  for (const [domain, keywords] of Object.entries(domainKeywords)) {
    let score = 0;
    for (const kw of keywords) {
      if (combined.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = domain;
    }
  }

  return bestMatch || '';
}

export function generateDesignedTailwindConfig(ds: DesignSystem): string {
  return `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [${ds.typography.fontFamily.split(',').map(f => f.trim()).map(f => f.startsWith('"') ? f : `"${f}"`).join(', ')}],
        heading: [${ds.typography.headingFamily.split(',').map(f => f.trim()).map(f => f.startsWith('"') ? f : `"${f}"`).join(', ')}],
        mono: [${ds.typography.monoFamily.split(',').map(f => f.trim()).map(f => f.startsWith('"') ? f : `"${f}"`).join(', ')}],
      },
      borderColor: {
        border: "hsl(var(--border))",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        'glow': '${ds.shadows.glow}',
        'inner-soft': '${ds.shadows.inner}',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'shimmer': {
          from: { backgroundPosition: '-200% 0' },
          to: { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
};
`;
}

function tokensToCssVars(tokens: DesignTokens): string {
  return `    --background: ${tokens.background};
    --foreground: ${tokens.foreground};
    --card: ${tokens.card};
    --card-foreground: ${tokens.cardForeground};
    --popover: ${tokens.popover};
    --popover-foreground: ${tokens.popoverForeground};
    --primary: ${tokens.primary};
    --primary-foreground: ${tokens.primaryForeground};
    --secondary: ${tokens.secondary};
    --secondary-foreground: ${tokens.secondaryForeground};
    --muted: ${tokens.muted};
    --muted-foreground: ${tokens.mutedForeground};
    --accent: ${tokens.accent};
    --accent-foreground: ${tokens.accentForeground};
    --destructive: ${tokens.destructive};
    --destructive-foreground: ${tokens.destructiveForeground};
    --border: ${tokens.border};
    --input: ${tokens.input};
    --ring: ${tokens.ring};
    --radius: ${tokens.radius};
    --success: ${tokens.success};
    --success-foreground: ${tokens.successForeground};
    --warning: ${tokens.warning};
    --warning-foreground: ${tokens.warningForeground};
    --info: ${tokens.info};
    --info-foreground: ${tokens.infoForeground};`;
}

export function generateDesignedIndexCss(ds: DesignSystem): string {
  const lightVars = tokensToCssVars(ds.lightTokens);
  const darkVars = tokensToCssVars(ds.darkTokens);

  const gradientUtilities = ds.gradients.map(g =>
    `  .${g.name} { background: ${g.value}; }`
  ).join('\n');

  return `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
${lightVars}
  }

  .dark {
${darkVars}
  }
}

@layer base {
  * {
    border-color: hsl(var(--border));
  }
  body {
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
    font-feature-settings: "rlig" 1, "calt" 1;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  h1, h2, h3, h4, h5, h6 {
    letter-spacing: -0.02em;
    font-weight: 600;
  }
}

@layer utilities {
${gradientUtilities}
  .text-gradient-primary {
    background: ${ds.gradients[0]?.value || 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))'};
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .glass-effect {
    backdrop-filter: blur(12px) saturate(180%);
    -webkit-backdrop-filter: blur(12px) saturate(180%);
    background: hsl(var(--card) / 0.75);
    border: 1px solid hsl(var(--border) / 0.5);
  }
  .hover-lift {
    transition: transform ${ds.componentStyles.transitionSpeed} ${ds.componentStyles.transitionEasing}, box-shadow ${ds.componentStyles.transitionSpeed} ${ds.componentStyles.transitionEasing};
  }
  .hover-lift:hover {
    transform: ${ds.componentStyles.cardHoverTransform};
    box-shadow: ${ds.shadows.lg};
  }
  .loading-shimmer {
    background: linear-gradient(90deg, hsl(var(--muted)) 0%, hsl(var(--muted-foreground) / 0.1) 50%, hsl(var(--muted)) 100%);
    background-size: 200% 100%;
    animation: shimmer 2s linear infinite;
  }
}
`;
}