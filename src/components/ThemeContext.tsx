import React, { createContext, useContext, useEffect, useState } from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  resolvedTheme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('pharmaflow_theme');
      if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
    } catch {
      // fallback
    }
    return 'light';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const applyTheme = () => {
      let isDark = false;
      if (theme === 'dark') {
        isDark = true;
      } else if (theme === 'system') {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
        isDark = false;
      }

      const root = document.documentElement;
      if (isDark) {
        root.setAttribute('data-theme', 'dark');
        root.classList.add('dark');
        setResolvedTheme('dark');
      } else {
        root.setAttribute('data-theme', 'light');
        root.classList.remove('dark');
        setResolvedTheme('light');
      }

      try {
        localStorage.setItem('pharmaflow_theme', theme);
      } catch {
        // storage disabled
      }
    };

    applyTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const ThemeToggle: React.FC<{ size?: 'sm' | 'md' }> = ({ size = 'md' }) => {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: 3,
        borderRadius: 99,
        background: resolvedTheme === 'dark' ? '#1E293B' : '#F1F5F9',
        border: `1px solid ${resolvedTheme === 'dark' ? '#334155' : '#E2E8F0'}`,
        gap: 2,
      }}
      title={`Current Theme: ${theme.toUpperCase()}`}
    >
      <button
        onClick={() => setTheme('light')}
        style={{
          width: size === 'sm' ? 24 : 28,
          height: size === 'sm' ? 24 : 28,
          borderRadius: '50%',
          border: 'none',
          background: theme === 'light' ? '#FFFFFF' : 'transparent',
          color: theme === 'light' ? '#0D9488' : '#64748B',
          boxShadow: theme === 'light' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        title="Light Mode"
      >
        <Sun size={size === 'sm' ? 13 : 15} />
      </button>

      <button
        onClick={() => setTheme('dark')}
        style={{
          width: size === 'sm' ? 24 : 28,
          height: size === 'sm' ? 24 : 28,
          borderRadius: '50%',
          border: 'none',
          background: theme === 'dark' ? '#0D9488' : 'transparent',
          color: theme === 'dark' ? '#FFFFFF' : '#64748B',
          boxShadow: theme === 'dark' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        title="Dark Mode"
      >
        <Moon size={size === 'sm' ? 13 : 15} />
      </button>

      <button
        onClick={() => setTheme('system')}
        style={{
          width: size === 'sm' ? 24 : 28,
          height: size === 'sm' ? 24 : 28,
          borderRadius: '50%',
          border: 'none',
          background: theme === 'system' ? (resolvedTheme === 'dark' ? '#334155' : '#FFFFFF') : 'transparent',
          color: theme === 'system' ? (resolvedTheme === 'dark' ? '#FFFFFF' : '#0D9488') : '#64748B',
          boxShadow: theme === 'system' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        title="System Auto Mode"
      >
        <Laptop size={size === 'sm' ? 13 : 15} />
      </button>
    </div>
  );
};
