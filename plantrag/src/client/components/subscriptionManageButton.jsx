// src/client/components/SubscriptionManageButton.jsx
import React from 'react';
import { Link } from 'wasp/client/router';
import PropTypes from 'prop-types';

// Base styles - can be overridden or extended via className prop
const BASE_CLASSES = "font-medium text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1";
// Default visual styles (can be overridden)
const DEFAULT_VISUAL_CLASSES = "px-4 py-2 bg-white border border-plant-primary text-neutral-medium dark:text-gray-300 rounded-lg hover:bg-plant-subtle focus:ring-plant-primary";

export const SubscriptionManageButton = ({
  to = '/subscription/manage', // Default route - adjust to match your routing
  className = '', // Allow passing extra classes
  children = '🌿 Manage Subscription', // Default button text with plant emoji
  ...props // Pass any other Link props like aria-label, etc.
}) => {
  
  // Combine base classes, default visual styles, and any passed className
  // If className is passed, it will likely override the DEFAULT_VISUAL_CLASSES if they conflict
  const combinedClassName = `${BASE_CLASSES} ${className || DEFAULT_VISUAL_CLASSES}`;

  return (
    <Link
      to={to}
      className={combinedClassName}
      {...props} // Spread remaining props onto the Link
    >
      {children} {/* Render button text or custom content */}
    </Link>
  );
};

// Optional: PropTypes definition
SubscriptionManageButton.propTypes = {
  to: PropTypes.string,
  className: PropTypes.string,
  children: PropTypes.node,
};