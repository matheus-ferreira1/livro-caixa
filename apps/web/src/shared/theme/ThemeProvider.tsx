import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  DARK_CLASS,
  DARK_SCHEME_QUERY,
  DEFAULT_THEME_PREFERENCE,
  isThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type Theme,
  type ThemePreference,
} from './theme';

interface ThemeContextValue {
  preference: ThemePreference;
  /** What is on screen: the preference, with Sistema resolved against the device. */
  theme: Theme;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const parsePreference = (value: string | null): ThemePreference =>
  isThemePreference(value) ? value : DEFAULT_THEME_PREFERENCE;

/** Storage may be blocked (private windows, strict settings); the theme then lasts for the visit. */
function readStoredPreference(): ThemePreference {
  try {
    return parsePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME_PREFERENCE;
  }
}

function storePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Not remembered on this device, which is the best storage allows.
  }
}

const systemPrefersDark = () => window.matchMedia(DARK_SCHEME_QUERY).matches;

/** The theme is chosen per device, unlike language and currency, so each partner keeps their own. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState(readStoredPreference);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);
  const theme = resolveTheme(preference, systemDark);

  useEffect(() => {
    document.documentElement.classList.toggle(DARK_CLASS, theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (preference !== 'system') return;
    const query = window.matchMedia(DARK_SCHEME_QUERY);
    setSystemDark(query.matches);
    const follow = (event: { matches: boolean }) => setSystemDark(event.matches);
    query.addEventListener('change', follow);
    return () => query.removeEventListener('change', follow);
  }, [preference]);

  // A choice made in another tab of the app applies here too, instead of being overwritten later.
  useEffect(() => {
    const followOtherTabs = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) setPreferenceState(parsePreference(event.newValue));
    };
    window.addEventListener('storage', followOtherTabs);
    return () => window.removeEventListener('storage', followOtherTabs);
  }, []);

  const setPreference = (next: ThemePreference) => {
    storePreference(next);
    setPreferenceState(next);
  };

  return (
    <ThemeContext.Provider value={{ preference, theme, setPreference }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
