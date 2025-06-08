// src/client/components/LogoutButton.jsx (Fallback - No Router Hooks)
import React, { useState } from 'react';
import { logout } from 'wasp/client/auth'; // Import Wasp's logout function
import PropTypes from 'prop-types';

// Base styles - can be overridden or extended via className prop
const BASE_CLASSES = "font-medium text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1";
// Default visual styles (can be overridden)
const DEFAULT_VISUAL_CLASSES = "px-4 py-2 bg-white border border-plant-primary text-plant-primary-dark rounded-lg hover:bg-plant-subtle focus:ring-plant-primary";

export const LogoutButton = ({
  onLoggedOut, // Optional callback after successful logout
  className = '', // Allow passing extra classes
  children = 'Logout', // Default button text
  ...props // Pass any other button props like aria-label, etc.
}) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout(); // Call Wasp's logout function
      console.log('Logout successful');
      
      // Call the optional callback if provided
      if (onLoggedOut && typeof onLoggedOut === 'function') {
        onLoggedOut();
      }
      
      // Set flag for success message on login page
      localStorage.setItem('logoutSuccess', 'true');
      
      // Immediate redirect - no delay
      window.location.href = '/login';
      
    } catch (err) {
      console.error('Error logging out:', err);
      setIsLoggingOut(false);
      // Fallback: redirect even if logout failed
      window.location.href = '/login';
    }
  };

  // Combine base classes, default visual styles, and any passed className
  // If className is passed, it will likely override the DEFAULT_VISUAL_CLASSES if they conflict
  const combinedClassName = `${BASE_CLASSES} ${className || DEFAULT_VISUAL_CLASSES}`;

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className={combinedClassName}
      {...props} // Spread remaining props onto the button
    >
      {isLoggingOut ? (
        <>
          <div className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
          Logging out...
        </>
      ) : (
        children // Render button text or custom content
      )}
    </button>
  );
};

// Optional: PropTypes definition
LogoutButton.propTypes = {
  onLoggedOut: PropTypes.func,
  className: PropTypes.string,
  children: PropTypes.node,
};