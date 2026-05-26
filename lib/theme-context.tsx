/**
 * ThemeContext - Theme provider for dark/light mode switching
 *
 * Reads initial theme from server (via layout), applies it to <html>,
 * and provides a context for runtime toggling.
 */

'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

export type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

function applyThemeToDOM(t: Theme) {
  const html = document.documentElement;
  html.setAttribute('data-theme', t);
  if (t === 'light') {
    html.classList.remove('dark');
  } else {
    html.classList.add('dark');
  }
}

export function ThemeProvider({
  children,
  initialTheme = 'dark',
}: {
  children: ReactNode;
  initialTheme?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  // Hydrate: apply the correct theme after SSR
  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyThemeToDOM(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      applyThemeToDOM(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
