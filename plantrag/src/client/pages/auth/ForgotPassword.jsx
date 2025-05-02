// src/client/pages/auth/ForgotPassword.jsx

import React, { useState } from 'react';
// Import Wasp hooks and components
import { useAction } from 'wasp/client/operations';
import { Link } from 'wasp/client/router';
// Import the action hook for requesting the reset email
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
      // Handle errors thrown by the action (e.g., server config issues)
      // Or network errors during the request.
      console.error("Forgot Password Request Error:", err);
      setError(err?.message || 'An error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- JSX Structure (Matches styling of other auth pages) ---
  return (
    <div className="flex flex-col flex-grow items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-plant-subtle via-neutral-light to-white">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
        {/* Header */}
        <div className="text-center">
           <span className="text-4xl mb-4 inline-block text-plant-primary" role="img" aria-label="Seedling emoji">🌱</span>
          <h2 className="text-2xl font-bold text-neutral-dark font-display">Forgot Your Password?</h2>
          <p className="mt-2 text-sm text-neutral-medium">
            Enter your email below, and if an account exists, we'll send instructions to reset your password.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-dark mb-1">
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
              className="w-full px-4 py-2.5 border border-neutral-medium/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-sun focus:border-transparent text-neutral-dark placeholder-neutral-medium text-sm shadow-sm disabled:opacity-60 disabled:bg-neutral-light/50"
              placeholder="you@example.com"
            />
          </div>

          {/* Error Message Display */}
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-100 border border-red-300 rounded-lg" role="alert">
              {error}
            </div>
          )}

          {/* Success Message Display */}
          {successMessage && (
            <div className="p-3 text-sm text-plant-primary-dark bg-green-100 border border-plant-secondary rounded-lg" role="alert">
              {successMessage}
            </div>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-plant-primary hover:bg-plant-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-plant-primary-dark transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" role="status"></div>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </div>
        </form>

        {/* Back to Login Link */}
        <div className="text-center mt-6">
          <p className="text-sm text-neutral-medium">
            Remember your password?{' '}
            <Link to="/login" className="font-medium text-plant-primary-dark hover:text-plant-primary hover:underline">
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;