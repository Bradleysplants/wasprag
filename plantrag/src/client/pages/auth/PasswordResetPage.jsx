// src/client/pages/auth/PasswordResetPage.jsx

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Link } from 'wasp/client/router';
import { useAction } from 'wasp/client/operations';
import { resetPassword } from 'wasp/client/operations';

export function PasswordResetPage() {
  const location = useLocation();

  const [token, setToken] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Hook into custom Wasp Action for resetting the password
  const resetPasswordAction = useAction(resetPassword);

  // Effect to extract the token from the URL query parameter
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const urlToken = queryParams.get('token');
    if (urlToken) {
      setToken(urlToken);
    } else {
      setError("Password reset token is missing or invalid. Please request a new reset link.");
    }
  }, [location.search]);

  // Handler for submitting the form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage('');

    // Frontend Validation
    if (!token) { 
      setError("Password reset token is missing. Cannot proceed."); 
      return; 
    }
    if (!password || !confirmPassword) { 
      setError('Please enter and confirm your new password.'); 
      return; 
    }
    if (password !== confirmPassword) { 
      setError('Passwords do not match.'); 
      return; 
    }
    if (password.length < 8) { 
      setError('Password must be at least 8 characters long.'); 
      return; 
    }

    setIsLoading(true);
    try {
      // Call custom backend action
      const result = await resetPasswordAction({ token, newPassword: password });

      if (result.success) {
        setSuccessMessage(result.message + " Redirecting to login...");
        setTimeout(() => {
          window.location.href = '/login';
        }, 3000);
      } else {
        setError(result.message || "An unknown error occurred during reset.");
      }
    } catch (err) {
      console.error("Password Reset Error:", err);
      setError(err?.message || 'An error occurred while resetting your password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // FIXED: Use theme variables for background gradient
    <div className="flex flex-col flex-grow items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-plant-subtle via-background-secondary to-background-primary min-h-screen">
      
      {/* FIXED: Card with proper theme support */}
      <div className="w-full max-w-md p-8 space-y-6 bg-background-primary border border-border-primary rounded-xl shadow-lifted backdrop-blur-sm">
        
        {/* Header */}
        <div className="text-center">
          <span className="text-4xl mb-4 inline-block text-plant-primary" role="img" aria-label="Key emoji">🔑</span>
          
          {/* FIXED: Use theme text colors */}
          <h2 className="text-2xl font-bold text-text-primary font-display">
            Reset Your Password
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Enter your new password below.
          </p>
        </div>

        {/* FIXED: Custom Form with theme styling */}
        {token && !successMessage && (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* New Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-1">
                New Password
              </label>
              <input 
                id="password" 
                name="password" 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                disabled={isLoading}
                className="
                  w-full px-4 py-2.5 
                  bg-background-secondary 
                  border border-border-primary 
                  rounded-lg 
                  focus:outline-none focus:ring-2 focus:ring-plant-primary focus:border-plant-primary
                  text-text-primary 
                  placeholder-text-tertiary 
                  text-sm shadow-sm 
                  disabled:opacity-60 disabled:bg-background-tertiary
                  transition-colors duration-200
                "
                placeholder="Enter new password (min. 8 characters)" 
              />
            </div>

            {/* Confirm Password Input */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-primary mb-1">
                Confirm New Password
              </label>
              <input 
                id="confirmPassword" 
                name="confirmPassword" 
                type="password" 
                required 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                disabled={isLoading}
                className="
                  w-full px-4 py-2.5 
                  bg-background-secondary 
                  border border-border-primary 
                  rounded-lg 
                  focus:outline-none focus:ring-2 focus:ring-plant-primary focus:border-plant-primary
                  text-text-primary 
                  placeholder-text-tertiary 
                  text-sm shadow-sm 
                  disabled:opacity-60 disabled:bg-background-tertiary
                  transition-colors duration-200
                "
                placeholder="Re-enter new password" 
              />
            </div>

            {/* FIXED: Error Message with berry accent */}
            {error && ( 
              <div className="p-3 text-sm text-accent-berry bg-accent-berry/10 border border-accent-berry/20 rounded-lg" role="alert">
                {error}
              </div> 
            )}

            {/* FIXED: Submit Button with plant theme */}
            <div>
              <button 
                type="submit" 
                disabled={isLoading || !token}
                className="
                  w-full flex justify-center py-3 px-4 
                  border border-transparent rounded-lg shadow-sm 
                  text-sm font-medium 
                  text-text-inverse 
                  bg-plant-primary hover:bg-plant-primary-dark 
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-plant-primary 
                  transition-colors duration-200 
                  disabled:opacity-50 disabled:cursor-not-allowed
                  hover:shadow-subtle
                "
              >
                {isLoading ? ( 
                  <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" role="status"></div> 
                ) : ( 
                  <>
                    <span className="mr-2">🛡️</span>
                    Set New Password
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* FIXED: Success Message with plant theme */}
        {successMessage && ( 
          <div className="p-3 text-sm text-plant-primary-dark bg-plant-primary/10 border border-plant-primary/20 rounded-lg text-center" role="alert">
            <div className="flex items-center justify-center gap-2">
              <span className="text-plant-primary">✅</span>
              <span>{successMessage}</span>
            </div>
          </div> 
        )}

        {/* FIXED: Error Message for missing token with theme colors */}
        {!token && error && (
          <div className="p-3 text-sm text-accent-berry bg-accent-berry/10 border border-accent-berry/20 rounded-lg text-center" role="alert">
            {error} <br/>
            <Link 
              to="/forgot-password" 
              className="font-medium text-plant-primary hover:text-plant-primary-dark hover:underline transition-colors duration-200"
            >
              Request a new link?
            </Link>
          </div>
        )}

        {/* FIXED: Link back to Login with theme colors */}
        {token && !successMessage && (
          <div className="text-center mt-6">
            <p className="text-sm text-text-secondary">
              Remembered your password?{' '}
              <Link 
                to="/login" 
                className="font-medium text-plant-primary hover:text-plant-primary-dark hover:underline transition-colors duration-200"
              >
                Back to Login
              </Link>
            </p>
          </div>
        )}

      </div>

      {/* Optional: Add a subtle footer */}
      <div className="mt-8 text-center">
        <p className="text-xs text-text-tertiary">
          🔒 Your account security is our priority
        </p>
      </div>
    </div>
  );
}

export default PasswordResetPage;