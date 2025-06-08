// src/client/components/LoadingIndicator.jsx
import React from 'react';

export const LoadingIndicator = ({ theme = 'light' }) => {
  const isDark = theme === 'dark';
  
  return (
    <div className="flex items-start justify-start animate-fade-slide-in">
      {/* Assistant avatar with standard colors */}
      <div className="w-8 h-8 rounded-full bg-emerald-600 flex-shrink-0 mr-3 flex items-center justify-center text-white text-sm font-bold shadow-sm" aria-label="Botanical Assistant avatar">
        🌱
      </div>

      {/* Loading bubble with theme-aware styling */}
      <div className={`
        rounded-lg px-4 py-3 shadow-sm rounded-bl-none flex items-center border
        ${isDark 
          ? 'bg-gray-800 border-gray-600 text-gray-300' 
          : 'bg-gray-50 border-gray-200 text-gray-600'
        }
      `}>
        <div className="flex space-x-1.5">
          {/* Plant-themed bouncing dots */}
          <div className="h-2 w-2 bg-green-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="h-2 w-2 bg-teal-500 rounded-full animate-bounce"></div>
        </div>
        <span className="ml-2 text-xs text-gray-400">Thinking...</span>
      </div>
    </div>
  );
};