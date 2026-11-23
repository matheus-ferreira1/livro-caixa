export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type Theme = Exclude<ThemePreference, 'system'>;

export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system';

/** Shared with public/theme-init.js, which applies the theme before the app loads. */
export const THEME_STORAGE_KEY = 'lc-theme';
export const DARK_CLASS = 'dark';
export const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

export const isThemePreference = (value: unknown): value is ThemePreference =>
  (THEME_PREFERENCES as readonly unknown[]).includes(value);

export const resolveTheme = (preference: ThemePreference, systemPrefersDark: boolean): Theme =>
  preference === 'system' ? (systemPrefersDark ? 'dark' : 'light') : preference;
