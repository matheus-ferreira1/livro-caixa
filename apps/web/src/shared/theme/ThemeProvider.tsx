import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  DARK_CLASS,
  DARK_SCHEME_QUERY,
  DEFAULT_THEME_PREFERENCE,
  isThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from './theme';

interface ThemeContextValue {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Storage may be blocked (private windows, strict settings); the theme then lasts for the visit. */
function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : DEFAULT_THEME_PREFERENCE;
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

function applyTheme(preference: ThemePreference, systemPrefersDark: boolean) {
  const dark = resolveTheme(preference, systemPrefersDark) === 'dark';
  document.documentElement.classList.toggle(DARK_CLASS, dark);
}

/** The theme is chosen per device, unlike language and currency, so each partner keeps their own. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState(readStoredPreference);

  useEffect(() => {
    const query = window.matchMedia(DARK_SCHEME_QUERY);
    applyTheme(preference, query.matches);
    if (preference !== 'system') return;
    const follow = (event: { matches: boolean }) => applyTheme(preference, event.matches);
    query.addEventListener('change', follow);
    return () => query.removeEventListener('change', follow);
  }, [preference]);

  const setPreference = (next: ThemePreference) => {
    storePreference(next);
    setPreferenceState(next);
  };

  return <ThemeContext.Provider value={{ preference, setPreference }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
