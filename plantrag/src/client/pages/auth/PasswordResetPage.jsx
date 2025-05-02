// src/client/pages/auth/PasswordResetPage.jsx

import React, { useState, useEffect } from 'react';
// Import hooks correctly
import { useLocation } from 'react-router-dom';
import { Link } from 'wasp/client/router';
import { useAction } from 'wasp/client/operations';
// Import your custom action hook
import { resetPassword } from 'wasp/client/operations';

export function PasswordResetPage() {
  const location = useLocation();

  const [token, setToken] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Hook into YOUR custom Wasp Action for resetting the password
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

  // Handler for submitting the custom form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage('');

    // Frontend Validation
    if (!token) { setError("Password reset token is missing. Cannot proceed."); return; }
    if (!password || !confirmPassword) { setError('Please enter and confirm your new password.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters long.'); return; }

    setIsLoading(true);
    try {
      // Call YOUR custom backend action
      const result = await resetPasswordAction({ token, newPassword: password });

      if (result.success) {
        setSuccessMessage(result.message + " Redirecting to login...");
        setTimeout(() => {
          window.location.href = '/login'; // Redirect using window.location
        }, 3000);
      } else {
        // This case might not be reached if action throws HttpError on failure
        setError(result.message || "An unknown error occurred during reset.");
      }
    } catch (err) {
      console.error("Password Reset Error:", err);
      // Display errors thrown by the action (HttpError)
      setError(err?.message || 'An error occurred while resetting your password.');
    } finally {
      setIsLoading(false);
    }
  };

  // JSX using the custom form structure
  return (
    <div className="flex flex-col flex-grow items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-plant-subtle via-neutral-light to-white">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
        {/* Header */}
        <div className="text-center">
           <span className="text-4xl mb-4 inline-block text-plant-primary" role="img" aria-label="Key emoji">🔑</span>
          <h2 className="text-2xl font-bold text-neutral-dark font-display">Reset Your Password</h2>
          <p className="mt-2 text-sm text-neutral-medium">
            Enter your new password below.
          </p>
        </div>

        {/* --- CUSTOM FORM SECTION --- */}
        {token && !successMessage && (
            <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password Input */}
            <div>
                <label htmlFor="password" className="block text-sm font-medium text-neutral-dark mb-1">New Password</label>
                <input id="password" name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading}
                  className="w-full px-4 py-2.5 border border-neutral-medium/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-sun focus:border-transparent text-neutral-dark placeholder-neutral-medium text-sm shadow-sm disabled:opacity-60"
                  placeholder="Enter new password (min. 8 characters)" />
            </div>
            {/* Confirm Password Input */}
            <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-dark mb-1">Confirm New Password</label>
                <input id="confirmPassword" name="confirmPassword" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isLoading}
                  className="w-full px-4 py-2.5 border border-neutral-medium/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-sun focus:border-transparent text-neutral-dark placeholder-neutral-medium text-sm shadow-sm disabled:opacity-60"
                  placeholder="Re-enter new password" />
            </div>
            {/* Error Message Display */}
            {error && ( <div className="p-3 text-sm text-red-700 bg-red-100 border border-red-300 rounded-lg" role="alert">{error}</div> )}
            {/* Submit Button */}
            <div>
                <button type="submit" disabled={isLoading || !token}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-plant-primary hover:bg-plant-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-plant-primary-dark transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isLoading ? ( <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" role="status"></div> ) : ( 'Set New Password' )}
                </button>
            </div>
            </form>
        )}
        {/* --- END CUSTOM FORM SECTION --- */}

        {/* Success Message Display */}
        {successMessage && ( <div className="p-3 text-sm text-plant-primary-dark bg-green-100 border border-plant-secondary rounded-lg text-center" role="alert">{successMessage}</div> )}

        {/* Error Message Display (for token missing case) */}
        {!token && error && (
             <div className="p-3 text-sm text-red-700 bg-red-100 border border-red-300 rounded-lg text-center" role="alert">
                {error} <br/>
                 <Link to="/forgot-password" className="font-medium text-plant-primary-dark hover:text-plant-primary hover:underline">Request a new link?</Link>
             </div>
        )}

         {/* Link back to Login if showing form */}
         {token && !successMessage && (
            <div className="text-center mt-6">
             <p className="text-sm text-neutral-medium">Remembered your password?{' '} <Link to="/login" className="font-medium text-plant-primary-dark hover:text-plant-primary hover:underline">Back to Login</Link></p>
            </div>
        )}

      </div>
    </div>
  );
}

export default PasswordResetPage;