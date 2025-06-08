// src/client/components/LogoutSuccessMessage.jsx
import React, { useState, useEffect } from 'react';

export const LogoutSuccessMessage = () => {
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    // Check if we just logged out
    const logoutSuccess = localStorage.getItem('logoutSuccess');
    
    if (logoutSuccess === 'true') {
      // Clear the flag
      localStorage.removeItem('logoutSuccess');
      
      // Show the success message
      setShowMessage(true);
      
      // Hide after 3 seconds
      setTimeout(() => {
        setShowMessage(false);
      }, 3000);
    }
  }, []);

  if (!showMessage) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 transition-all duration-300 ease-out">
      <span>✅</span>
      <span>Logout successful!</span>
    </div>
  );
};