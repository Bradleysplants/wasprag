// src/client/components/ThemeToggle.jsx (Final Fixed Version)
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCurrentUser, updateUserTheme } from 'wasp/client/operations';

const ThemeToggle = ({ 
  className = '', 
  size = 'md',
  variant = 'switch',
  showText = false 
}) => {
  const queryClient = useQueryClient();

  // Get current user theme
  const { data: currentUser, isLoading: isUserLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Theme mutation
  const { mutate: updateUserThemeFn, isLoading: isUpdatingTheme } = useMutation({
    mutationFn: updateUserTheme,
    onSuccess: () => {
      queryClient.invalidateQueries(['currentUser']);
    },
    onError: (error) => {
      console.error('Failed to toggle theme:', error);
    },
  });

  // FIXED: Use currentUser.user.theme instead of currentUser.theme
  const currentTheme = currentUser?.user?.theme || 'light';
  const isLoading = isUserLoading || isUpdatingTheme;

  const toggleTheme = () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    updateUserThemeFn({ theme: newTheme });
  };

  // Size configurations
  const sizeConfig = {
    sm: {
      button: 'p-1.5 text-sm',
      icon: 'w-4 h-4',
      text: 'text-xs'
    },
    md: {
      button: 'p-2',
      icon: 'w-5 h-5',
      text: 'text-sm'
    },
    lg: {
      button: 'p-3 text-lg',
      icon: 'w-6 h-6',
      text: 'text-base'
    }
  };

  const config = sizeConfig[size];

  // Switch variant (for dropdown)
  if (variant === 'switch') {
    return (
      <button
        onClick={toggleTheme}
        disabled={isLoading}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full
          ${currentTheme === 'dark' ? 'bg-blue-600' : 'bg-gray-200'}
          transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        title={`Switch to ${currentTheme === 'light' ? 'dark' : 'light'} mode`}
        aria-label={`Switch to ${currentTheme === 'light' ? 'dark' : 'light'} mode`}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition
            ${currentTheme === 'dark' ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
    );
  }

  // Button variant
  if (variant === 'button') {
    return (
      <button
        onClick={toggleTheme}
        disabled={isLoading}
        className={`
          ${config.button}
          bg-gray-100 dark:bg-gray-800 
          hover:bg-gray-200 dark:hover:bg-gray-700
          border border-gray-300 dark:border-gray-600
          text-gray-700 dark:text-gray-300
          rounded-lg transition-all duration-200 
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center gap-2
          ${className}
        `}
        title={`Switch to ${currentTheme === 'light' ? 'dark' : 'light'} mode`}
        aria-label={`Switch to ${currentTheme === 'light' ? 'dark' : 'light'} mode`}
      >
        {isLoading ? (
          <div className={`${config.icon} border-2 border-current border-t-transparent rounded-full animate-spin`} />
        ) : currentTheme === 'light' ? (
          <MoonIcon className={config.icon} />
        ) : (
          <SunIcon className={config.icon} />
        )}
        
        {showText && (
          <span className={config.text}>
            {isLoading ? 'Updating...' : currentTheme === 'light' ? 'Dark' : 'Light'}
          </span>
        )}
      </button>
    );
  }

  // Default icon variant
  return (
    <button
      onClick={toggleTheme}
      disabled={isLoading}
      className={`
        ${config.button}
        rounded-lg transition-all duration-200 
        bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800
        text-gray-600 dark:text-gray-400
        hover:text-gray-900 dark:hover:text-gray-100
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center gap-2
        ${className}
      `}
      title={`Switch to ${currentTheme === 'light' ? 'dark' : 'light'} mode`}
      aria-label={`Switch to ${currentTheme === 'light' ? 'dark' : 'light'} mode`}
    >
      {isLoading ? (
        <div className={`${config.icon} border-2 border-current border-t-transparent rounded-full animate-spin`} />
      ) : currentTheme === 'light' ? (
        <MoonIcon className={config.icon} />
      ) : (
        <SunIcon className={config.icon} />
      )}
      
      {showText && (
        <span className={config.text}>
          {isLoading ? 'Updating...' : currentTheme === 'light' ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
};

// Icon components
const SunIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
      clipRule="evenodd"
    />
  </svg>
);

const MoonIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
  </svg>
);

export default ThemeToggle;