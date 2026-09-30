// src/client/components/NavBar.jsx

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'wasp/client/router';
import { useAuth } from 'wasp/client/auth'; // Import Wasp's auth hook
import { LogoutButton } from './logoutButton.jsx';
import { SubscriptionManageButton } from './subscriptionManageButton.jsx';
import ThemeToggle from './themeToggle.jsx';

// Define the NavBar component
export const NavBar = ({ userDisplayName, onLogout }) => {
  // State for managing dropdown visibility
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  // Ref to detect clicks outside the dropdown
  const dropdownRef = useRef(null);
  
  // Use Wasp's auth hook to check if user is authenticated
  const { data: user, isLoading } = useAuth();
  
  // Check if user is logged in using Wasp's auth
  const isLoggedIn = Boolean(user && !isLoading);
  
  // Calculate user initial for avatar - use actual user data if available
  const displayName = user?.email || userDisplayName || 'User';
  const userInitial = displayName ? displayName[0].toUpperCase() : 'U';

  // Function to toggle dropdown visibility
  const toggleDropdown = (event) => {
    event.stopPropagation(); // Prevent event bubbling
    setIsDropdownOpen(prev => !prev);
  };

  // Effect for closing dropdown when clicking outside
  useEffect(() => {
    // Handler to check if click is outside the dropdown ref
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    // Add listener only when dropdown is open
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    // Cleanup function to remove listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Handler for after logout action
  const handleLoggedOut = () => {
    setIsDropdownOpen(false); // Close dropdown
    // Call the passed onLogout function if it exists
    if (onLogout && typeof onLogout === 'function') {
      onLogout();
    }
  };

  // Show loading state if auth is still loading
  if (isLoading) {
    return (
      <nav className="sticky top-0 z-20 bg-white dark:bg-gray-800 shadow-subtle transition-colors duration-300">
        <div className="container mx-auto px-4 sm:px-6 py-3">
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center space-x-2 group text-decoration-none">
              <span className="text-2xl transition-transform duration-200 ease-in-out group-hover:rotate-12" role="img" aria-label="Leaf emoji">🌿</span>
              <h1 className="text-lg sm:text-xl font-semibold text-plant-primary-dark dark:text-white font-display">Botani-Buddy</h1>
            </Link>
            <div className="text-sm text-neutral-medium">Loading...</div>
          </div>
        </div>
      </nav>
    );
  }

  // Main component rendering
  return (
    <nav className="sticky top-0 z-20 bg-white dark:bg-gray-800 shadow-subtle transition-colors duration-300">
      <div className="container mx-auto px-2 sm:px-6 py-3">
        <div className="flex justify-between items-center">

          {/* Branding Section (Logo + Title) */}
          <Link
            to="/"
            className="flex items-center space-x-2 group text-decoration-none"
            onClick={() => setIsDropdownOpen(false)}
          >
            <span className="text-2xl transition-transform duration-200 ease-in-out group-hover:rotate-12" role="img" aria-label="Leaf emoji">🌿</span>
            <h1 className="text-lg sm:text-xl font-semibold text-plant-primary-dark dark:text-white font-display">Botani-Buddy</h1>
          </Link>

          {/* Conditional User Menu or Login Links */}
          {isLoggedIn ? (
            /* User Menu Section - Only shown when logged in */
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={toggleDropdown}
                className="flex items-center space-x-2 rounded-lg px-2 py-1 hover:bg-green-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-plant-primary group transition-all duration-200"
                aria-haspopup="true"
                aria-expanded={isDropdownOpen}
                id="user-menu-button"
              >
                <div className={`w-8 h-8 rounded-full bg-earth-brown flex-shrink-0 flex items-center justify-center text-white font-bold text-sm shadow-sm transition-all duration-200 ${isDropdownOpen ? 'ring-2 ring-plant-primary/50 scale-105' : 'group-hover:ring-2 group-hover:ring-plant-primary/50'}`}>
                  {userInitial}
                </div>
                <span className="hidden sm:inline text-gray-700 dark:text-gray-300 text-sm group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                  {displayName}
                </span>
                {/* Animated Dropdown Indicator */}
                <div className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}>
                  <svg 
                    className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Dropdown Menu */}
              <div
                className={`
                  absolute right-0 mt-2 w-52 origin-top-right rounded-xl bg-white dark:bg-gray-800 
                  shadow-lg border border-gray-200 dark:border-gray-600
                  transition-all ease-out duration-150 transform
                  ${isDropdownOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'}
                  z-40
                `}
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="user-menu-button"
                tabIndex="-1"
              >
                {/* Compact User Info */}
                <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700"> 
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">🌱 {displayName}</p> 
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <Link
                    to="/account-settings"
                    role="menuitem"
                    tabIndex="-1"
                    id="user-menu-item-0"
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors duration-150"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <span className="mr-2 text-xs">⚙️</span>
                    Account Settings
                  </Link>

                  <SubscriptionManageButton
                    to="/subscription/manage"
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors duration-150 focus:outline-none focus:ring-0"
                    onClick={() => setIsDropdownOpen(false)}
                    role="menuitem"
                    tabIndex="-1"
                    id="user-menu-item-1"
                  >
                    <span className="mr-2 text-xs">🌿</span>
                    Manage Subscription
                  </SubscriptionManageButton>

                  {/* Theme Toggle Row */}
                  <div className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors duration-150">
                    <div className="flex items-center">
                      <span className="mr-2 text-xs">🎨</span>
                      Theme
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <ThemeToggle 
                        variant="switch" 
                        size="sm"
                        className=""
                      />
                    </div>
                  </div>
                </div>

                {/* Logout Section */}
                <div className="border-t border-gray-100 dark:border-gray-700">
                  <LogoutButton
                    className="flex items-center w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 transition-colors duration-150 border-none shadow-none rounded-none focus:outline-none focus:ring-0"
                    onLoggedOut={handleLoggedOut}
                    role="menuitem"
                    tabIndex="-1"
                    id="user-menu-item-2"
                  >
                    <span className="mr-2 text-xs">👋</span>
                    Logout
                  </LogoutButton>
                </div>
                  {/*Contact us section*/}
                <div className="border-t border-gray-100 dark:border-gray-700">
                  <Link
                    to="/contact-us"
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors duration-150"
                    onClick={() => setIsDropdownOpen(false)}
                    role="menuitem"
                    tabIndex="-1"
                    id="user-menu-item-3"
                  >
                    <span className="mr-2 text-xs">📞</span>
                    Contact Us
                  </Link>
                  </div>
              </div>
            </div>
          ) : (
            /* Login/Signup Links - Only shown when NOT logged in */
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-sm font-medium text-neutral-medium dark:text-gray-300 hover:text-plant-primary-dark dark:hover:text-white transition-colors duration-200"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-plant-primary hover:bg-plant-primary-dark rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-plant-primary"
              >
                Sign Up
              </Link>
            </div>
          )}

        </div>
      </div>
    </nav>
  );
};