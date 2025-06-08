// src/client/pages/auth/ForgotPassword.jsx

import React, { useState } from 'react';
import { useAction } from 'wasp/client/operations';
import { Link } from 'wasp/client/router';
import { requestPasswordReset } from 'wasp/client/operations';

export function ForgotPasswordPage() {
  // State for the email input, loading, and messages
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Hook into the backend action that sends the email
  const requestPasswordResetAction = useAction(requestPasswordReset);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage('');
    setIsLoading(true);

    // Basic frontend validation
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      setIsLoading(false);
      return;
    }

    try {
      // Call the backend action defined in emailActions.js
      await requestPasswordResetAction({ email });

      // Show generic success message for security (prevents email enumeration)
      setSuccessMessage('If an account exists for this email, a password reset link has been sent.');
      setEmail(''); // Clear input field

    } catch (err) {
      console.error("Forgot Password Request Error:", err);
      setError(err?.message || 'An error occurred. Please try again later.');
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
          <span className="text-4xl mb-4 inline-block text-plant-primary" role="img" aria-label="Seedling emoji">🔑</span>
          
          {/* FIXED: Use theme text colors */}
          <h2 className="text-2xl font-bold text-text-primary font-display">
            Forgot Your Password?
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Enter your email below, and if an account exists, we'll send instructions to reset your password.
          </p>
        </div>

        {/* FIXED: Form with theme styling */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              placeholder="you@example.com"
            />
          </div>

          {/* FIXED: Error Message with berry accent */}
          {error && (
            <div className="p-3 text-sm text-accent-berry bg-accent-berry/10 border border-accent-berry/20 rounded-lg" role="alert">
              {error}
            </div>
          )}

          {/* FIXED: Success Message with plant theme */}
          {successMessage && (
            <div className="p-3 text-sm text-plant-primary-dark bg-plant-primary/10 border border-plant-primary/20 rounded-lg" role="alert">
              <div className="flex items-center gap-2">
                <span className="text-plant-primary">✉️</span>
                <span>{successMessage}</span>
              </div>
            </div>
          )}

          {/* FIXED: Submit Button with plant theme */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
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
                  <span className="mr-2">🔑</span>
                  Send Reset Link
                </>
              )}
            </button>
          </div>
        </form>

        {/* FIXED: Back to Login Link with theme colors */}
        <div className="text-center mt-6">
          <p className="text-sm text-text-secondary">
            Remember your password?{' '}
            <Link 
              to="/login" 
              className="font-medium text-plant-primary hover:text-plant-primary-dark hover:underline transition-colors duration-200"
            >
              Back to Login
            </Link>
          </p>
        </div>
      </div>

      {/* Optional: Add a subtle footer */}
      <div className="mt-8 text-center">
        <p className="text-xs text-text-tertiary">
          🌱 We'll help you get back to your plants
        </p>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;