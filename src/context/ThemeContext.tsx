import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const THEME_STORAGE_KEY = 'eduwars_theme';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme] = useState<Theme>('dark');

  useEffect(() => {
    try {
      const root = document.documentElement;
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');

      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', '#0c0d10');
      }
    } catch (e) {
      console.error('Failed to sync theme to DOM/storage:', e);
    }
  }, []);

  const toggleTheme = () => {
    // Dark mode is the only mode
  };

  const setTheme = () => {
    // Dark mode is the only mode
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

