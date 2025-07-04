import React, { createContext, useContext, useState, useEffect } from 'react';
import { getLocalStorageItem, setLocalStorageItem } from '../utils/safeLocalStorage';


interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage first, then system preference
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

let savedTheme: string | null = null;
try {
  if (typeof localStorage !== 'undefined') {
    savedTheme = getLocalStorageItem('theme');
  }
} catch (e) {
  console.warn('Failed to access localStorage for theme:', e);
}

return savedTheme === 'dark' ? true : savedTheme === 'light' ? false : prefersDark;

  });

  useEffect(() => {
    // Save to localStorage
    setLocalStorageItem('theme', isDarkMode ? 'dark' : 'light');
    
    // Apply theme to document
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};