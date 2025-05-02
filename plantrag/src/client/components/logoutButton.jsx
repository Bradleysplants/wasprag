// src/client/components/LogoutButton.jsx
import React from 'react';
import { logout } from 'wasp/client/auth'; // Import Wasp's logout function
import PropTypes from 'prop-types';

// Optional: Add PropTypes for JS projects
// import PropTypes from 'prop-types';

// Base styles - can be overridden or extended via className prop
const BASE_CLASSES = "font-medium text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1";
// Default visual styles (can be overridden)
const DEFAULT_VISUAL_CLASSES = "px-4 py-2 bg-white border border-plant-primary text-plant-primary-dark rounded-lg hover:bg-plant-subtle focus:ring-plant-primary";
// Dropdown specific styles (example of what might be passed)
// const DROPDOWN_CLASSES = "w-full text-left block px-4 py-2 text-neutral-medium hover:bg-plant-subtle/60 hover:text-plant-primary-dark rounded-none border-none shadow-none";

export const LogoutButton = ({
  onLoggedOut, // Optional callback after successful logout
  className = '', // Allow passing extra classes
  children = 'Logout', // Default button text
  ...props // Pass any other button props like aria-label, etc.
}) => {

  const handleLogout = async () => {
    try {
      await logout(); // Call Wasp's logout function
      console.log('Logout successful');
      // Call the optional callback if provided
      if (onLoggedOut && typeof onLoggedOut === 'function') {
        onLoggedOut();
      }
      // Note: Wasp's default behavior usually handles redirection after logout
      // based on main.wasp config or internal logic.
      // You generally don't need to navigate manually here.
    } catch (err) {
      console.error('Error logging out:', err);
      // Optionally display an error to the user using a toast/notification
    }
  };

  // Combine base classes, default visual styles, and any passed className
  // If className is passed, it will likely override the DEFAULT_VISUAL_CLASSES if they conflict
  const combinedClassName = `${BASE_CLASSES} ${className || DEFAULT_VISUAL_CLASSES}`;

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={combinedClassName}
      {...props} // Spread remaining props onto the button
    >
      {children} {/* Render button text or custom content */}
    </button>
  );
};

// Optional: PropTypes definition
 LogoutButton.propTypes = {
   onLoggedOut: PropTypes.func,
   className: PropTypes.string,
   children: PropTypes.node,
 };

// Optional: Default export if preferred
// export default LogoutButton;