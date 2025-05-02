// src/client/components/NavBar.jsx

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'wasp/client/router'; // Assuming Link comes from wasp/client/router
import { LogoutButton } from './logoutButton'; // Assuming LogoutButton component exists in the same folder

// Optional: Import icons if desired
// import { ChevronDownIcon } from '@heroicons/react/20/solid'; // Example

// Define the NavBar component
export const NavBar = ({ userDisplayName, onLogout }) => {
  // State for managing dropdown visibility
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  // Calculate user initial for avatar
  const userInitial = userDisplayName ? userDisplayName[0].toUpperCase() : 'U';
  // Ref to detect clicks outside the dropdown
  const dropdownRef = useRef(null);

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
  }, [isDropdownOpen]); // Dependency array ensures effect runs when isDropdownOpen changes

  // Handler for after logout action
  const handleLoggedOut = () => {
    setIsDropdownOpen(false); // Close dropdown
    // Call the passed onLogout function if it exists
    if (onLogout && typeof onLogout === 'function') {
      onLogout();
    }
  };

  // Main component rendering
  return (
    // Sticky navigation bar with theme styles
    <nav className="sticky top-0 z-20 bg-white shadow-subtle">
      {/* Container for padding and max-width */}
      <div className="container mx-auto px-4 sm:px-6 py-3">
        {/* Flex container to space out branding and user menu */}
        <div className="flex justify-between items-center">

          {/* Branding Section (Logo + Title) */}
          <Link
            to="/" // Link to the homepage
            className="flex items-center space-x-2 group text-decoration-none"
            onClick={() => setIsDropdownOpen(false)} // Close dropdown when clicking brand
          >
            {/* Leaf Emoji with hover effect */}
            <span className="text-2xl transition-transform duration-200 ease-in-out group-hover:rotate-12" role="img" aria-label="Leaf emoji">🌿</span>
            {/* App Title with theme styles */}
            <h1 className="text-lg sm:text-xl font-semibold text-plant-primary-dark font-display">Botanical Assistant</h1>
          </Link>

          {/* User Menu Section (Right Side) */}
          {/* Relative container for positioning the absolute dropdown */}
          <div className="relative" ref={dropdownRef}>
            {/* Avatar Button Trigger */}
            <button
              type="button"
              onClick={toggleDropdown}
              // Styling for the button: flex layout, rounded, focus ring, group for hover effects
              className="flex items-center space-x-2 rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-plant-primary group"
              aria-haspopup="true"
              aria-expanded={isDropdownOpen}
              id="user-menu-button"
            >
              {/* User Avatar with theme styles and hover/open indicator */}
              <div className={`w-8 h-8 rounded-full bg-earth-brown flex-shrink-0 flex items-center justify-center text-white font-bold text-sm shadow-sm transition-all ${isDropdownOpen ? 'ring-2 ring-plant-primary/50' : 'group-hover:ring-2 group-hover:ring-plant-primary/50'}`}>
                {userInitial}
              </div>
              {/* User Display Name (hidden on small screens) with hover effect */}
              <span className="hidden sm:inline text-neutral-medium text-sm group-hover:text-neutral-dark">
                {userDisplayName}
              </span>
              {/* Optional: Dropdown Icon */}
              {/* <ChevronDownIcon className={`hidden sm:inline h-4 w-4 text-neutral-medium transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} /> */}
            </button>

            {/* --- Dropdown Menu --- */}
            <div
              // Styling for the dropdown panel: positioning, appearance, transition
              // ADDED HORIZONTAL PADDING (px-2) to this container
              className={`
                absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-white py-2 px-2 /* <-- ADDED px-2 */
                shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none
                transition ease-out duration-100 transform
                ${isDropdownOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'}
                z-30 /* Ensure dropdown is above other content */
              `}
              role="menu"
              aria-orientation="vertical"
              aria-labelledby="user-menu-button"
              tabIndex="-1" // Allows focus management
            >
              {/* User Info Header within Dropdown */}
              {/* Use container padding, remove specific px if needed */}
              <div className="px-2 py-2 text-sm text-neutral-dark border-b border-neutral-light mb-1"> {/* Adjusted padding slightly */}
                Signed in as <br/> {/* Line break for better display */}
                <span className="font-medium break-words block">{userDisplayName}</span> {/* Allow long names to wrap */}
              </div>

              {/* --- LogoutButton uses w-full but within padded container --- */}
              <LogoutButton
                // Styling specific to the button within the dropdown context
                // Kept w-full, adjusted padding slightly to px-3 py-1
                className={`
                  w-full text-left block px-3 py-1 text-sm font-medium rounded-md /* Kept w-full */
                  bg-plant-primary text-white
                  hover:bg-plant-primary-dark
                  focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-plant-primary-dark
                  transition-colors duration-150
                  border-none shadow-none /* Ensure no default borders/shadows interfere */
                `}
                onLoggedOut={handleLoggedOut} // Pass the logout handler
                role="menuitem" // ARIA role
                tabIndex="-1"
                id="user-menu-item-1"
              >
                Logout
              </LogoutButton>
              {/* --- End LogoutButton --- */}

            </div> {/* End Dropdown Menu Div */}
          </div> {/* End User Menu Relative Div */}

        </div> {/* End Main Flex Container */}
      </div> {/* End Container Div */}
    </nav>
  );
};