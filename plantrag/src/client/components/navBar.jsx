// src/client/components/NavBar.jsx
import React from 'react';

export const NavBar = ({ userDisplayName, onLogout }) => {
  return (
    <nav className="sticky top-0 z-10 bg-white shadow-subtle">
      <div className="container mx-auto px-4 sm:px-6 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-2xl" role="img" aria-label="Leaf emoji">🌿</span>
            <h1 className="text-lg sm:text-xl font-semibold text-plant-primary-dark font-display">
              Botanical Assistant
            </h1>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4">
            <span className="hidden sm:inline text-neutral-medium text-sm">
              Hello, <span className="font-medium text-neutral-dark">{userDisplayName}</span>
            </span>

            <button
              onClick={onLogout}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-plant-primary text-plant-primary-dark rounded-lg text-sm font-medium hover:bg-plant-subtle transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-plant-primary"
              aria-label="Logout"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};