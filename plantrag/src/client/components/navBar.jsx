// src/client/components/NavBar.jsx

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'wasp/client/router';
import { useAuth } from 'wasp/client/auth'; // Import Wasp's auth hook
import { LogoutButton } from './logoutButton.jsx';
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
      <div className="container mx-auto px-4 sm:px-6 py-3">
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
                className="flex items-center space-x-2 rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-plant-primary group"
                aria-haspopup="true"
                aria-expanded={isDropdownOpen}
                id="user-menu-button"
              >
                <div className={`w-8 h-8 rounded-full bg-earth-brown flex-shrink-0 flex items-center justify-center text-white font-bold text-sm shadow-sm transition-all ${isDropdownOpen ? 'ring-2 ring-plant-primary/50' : 'group-hover:ring-2 group-hover:ring-plant-primary/50'}`}>
                  {userInitial}
                </div>
                <span className="hidden sm:inline text-neutral-medium dark:text-gray-300 text-sm group-hover:text-neutral-dark dark:group-hover:text-white transition-colors">
                  {displayName}
                </span>
              </button>

              {/* Dropdown Menu */}
              <div
                className={`
                  absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-white dark:bg-gray-800 py-2 px-2 
                  shadow-lg ring-1 ring-black dark:ring-gray-600 ring-opacity-5 focus:outline-none
                  transition ease-out duration-100 transform
                  ${isDropdownOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'}
                  z-30
                `}
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="user-menu-button"
                tabIndex="-1"
              >
                <div className="px-2 py-2 text-sm text-neutral-dark dark:text-gray-200 border-b border-neutral-light dark:border-gray-600 mb-1"> 
                  Signed in as <br/>
                  <span className="font-medium break-words block">{displayName}</span> 
                </div>

                <Link
                  to="/account-settings"
                  role="menuitem"
                  tabIndex="-1"
                  id="user-menu-item-0"
                  className="block w-full text-left px-3 py-2 text-sm text-neutral-medium dark:text-gray-300 hover:bg-neutral-light dark:hover:bg-gray-700 hover:text-neutral-dark dark:hover:text-white rounded-md transition-colors duration-150"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  Account Settings
                </Link>

                <div className="px-3 py-2 flex items-center justify-between text-sm text-neutral-medium dark:text-gray-300 hover:bg-neutral-light dark:hover:bg-gray-700 hover:text-neutral-dark dark:hover:text-white rounded-md transition-colors duration-150">
                  <span>Theme</span>
                  <div onClick={(e) => e.stopPropagation()}>
                    <ThemeToggle 
                      variant="switch" 
                      size="sm"
                      className="ml-2"
                    />
                  </div>
                </div>

                <div className="border-t border-neutral-light dark:border-gray-600 my-1"></div>

                <LogoutButton
                  className={`
                    w-full text-left block px-3 py-1 text-sm font-medium rounded-md
                    bg-plant-primary text-green-700
                    hover:bg-plant-primary-dark
                    focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-plant-primary-dark
                    transition-colors duration-150
                    border-none shadow-none
                  `}
                  onLoggedOut={handleLoggedOut}
                  role="menuitem"
                  tabIndex="-1"
                  id="user-menu-item-2"
                >
                  Logout
                </LogoutButton>

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