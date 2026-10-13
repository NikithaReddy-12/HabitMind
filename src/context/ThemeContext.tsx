import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

export type AuroraMode = 'auto' | 'dawn' | 'day' | 'dusk' | 'night';
export type ActiveAurora = 'dawn' | 'day' | 'dusk' | 'night';

export function getSystemTimeAurora(): ActiveAurora {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) return 'dawn';
  if (hour >= 10 && hour < 17) return 'day';
  if (hour >= 17 && hour < 21) return 'dusk';
  return 'night';
}

interface AuroraThemeContextType {
  mode: AuroraMode;
  activeAurora: ActiveAurora;
  setMode: (mode: AuroraMode) => void;
  // Backward compatibility
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

const AuroraThemeContext = createContext<AuroraThemeContextType>({
  mode: 'auto',
  activeAurora: 'night',
  setMode: () => {},
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<AuroraMode>(() => {
    try {
      const stored = localStorage.getItem('dayline-aurora-mode') as AuroraMode;
      if (['auto', 'dawn', 'day', 'dusk', 'night'].includes(stored)) return stored;
    } catch {
      // fallback
    }
    return 'auto';
  });

  const [systemAurora, setSystemAurora] = useState<ActiveAurora>(getSystemTimeAurora);

  // Periodically check system time (every minute)
  useEffect(() => {
    const timer = setInterval(() => {
      setSystemAurora(getSystemTimeAurora());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const activeAurora = useMemo<ActiveAurora>(() => {
    if (mode === 'auto') return systemAurora;
    return mode;
  }, [mode, systemAurora]);

  const isDark = activeAurora === 'night' || activeAurora === 'dusk';

  useEffect(() => {
    try {
      localStorage.setItem('dayline-aurora-mode', mode);
    } catch {
      // ignore
    }

    const root = document.documentElement;
    root.setAttribute('data-aurora', activeAurora);

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [mode, activeAurora, isDark]);

  const setMode = (newMode: AuroraMode) => {
    setModeState(newMode);
  };

  const setTheme = (t: 'dark' | 'light') => {
    setMode(t === 'dark' ? 'night' : 'day');
  };

  const toggleTheme = () => {
    // Cycles through time of day or switches between day & night
    if (activeAurora === 'night' || activeAurora === 'dusk') {
      setMode('day');
    } else {
      setMode('night');
    }
  };

  return (
    <AuroraThemeContext.Provider
      value={{
        mode,
        activeAurora,
        setMode,
        theme: isDark ? 'dark' : 'light',
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </AuroraThemeContext.Provider>
  );
};

export const useTheme = () => useContext(AuroraThemeContext);
