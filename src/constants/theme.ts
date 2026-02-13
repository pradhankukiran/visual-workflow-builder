/**
 * CSS variable names and their values for theming.
 * These map to CSS custom properties used throughout the application.
 */
export interface ThemeTokens {
  bg: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  success: string;
  error: string;
  warning: string;
}

/**
 * Light theme color values.
 */
export const LIGHT_THEME: ThemeTokens = {
  bg: '#FFFFFF',
  surface: '#F9FAFB',
  border: '#E5E7EB',
  text: '#111827',
  textMuted: '#6B7280',
  accent: '#3B82F6',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
};

/**
 * Dark theme color values.
 */
export const DARK_THEME: ThemeTokens = {
  bg: '#0F172A',
  surface: '#1E293B',
  border: '#334155',
  text: '#F1F5F9',
  textMuted: '#94A3B8',
  accent: '#60A5FA',
  success: '#34D399',
  error: '#F87171',
  warning: '#FBBF24',
};

/**
 * Mapping from token name to CSS custom property name.
 */
export const CSS_VAR_MAP: Record<keyof ThemeTokens, string> = {
  bg: '--color-bg',
  surface: '--color-surface',
  border: '--color-border',
  text: '--color-text',
  textMuted: '--color-text-muted',
  accent: '--color-accent',
  success: '--color-success',
  error: '--color-error',
  warning: '--color-warning',
};

/**
 * Apply a theme's tokens as CSS custom properties on a target element.
 */
export function applyTheme(
  tokens: ThemeTokens,
  target: HTMLElement = document.documentElement,
): void {
  const entries = Object.entries(tokens) as [keyof ThemeTokens, string][];
  for (const [key, value] of entries) {
    target.style.setProperty(CSS_VAR_MAP[key], value);
  }
}
