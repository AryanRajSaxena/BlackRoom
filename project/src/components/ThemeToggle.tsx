import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative inline-flex items-center justify-center w-12 h-6 rounded-full transition-all duration-300 ease-in-out
        ${isDarkMode 
          ? 'bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg shadow-purple-500/25' 
          : 'bg-gradient-to-r from-yellow-400 to-orange-500 shadow-lg shadow-yellow-500/25'
        }
        hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 
        ${isDarkMode ? 'focus:ring-purple-500' : 'focus:ring-yellow-500'}
        ${isDarkMode ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'}
      `}
      title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <div
        className={`
          absolute w-5 h-5 bg-white rounded-full shadow-lg transform transition-all duration-300 ease-in-out
          flex items-center justify-center
          ${isDarkMode ? 'translate-x-3' : '-translate-x-3'}
        `}
      >
        {isDarkMode ? (
          <Moon className="w-3 h-3 text-purple-600" />
        ) : (
          <Sun className="w-3 h-3 text-orange-500" />
        )}
      </div>
      
      {/* Background icons */}
      <div className="absolute inset-0 flex items-center justify-between px-1">
        <Sun className={`w-3 h-3 transition-opacity duration-300 ${isDarkMode ? 'opacity-30' : 'opacity-70'} text-white`} />
        <Moon className={`w-3 h-3 transition-opacity duration-300 ${isDarkMode ? 'opacity-70' : 'opacity-30'} text-white`} />
      </div>
    </button>
  );
};