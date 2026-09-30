// 2. UPDATED FRONTEND COMPONENT - Modified to handle HttpError exceptions
// Replace your AccountSettingsPage with this version that handles your auth patterns

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAction } from 'wasp/client/operations';
import { 
  getCurrentUser, 
  updateUserTheme, 
  updateUserProfile,
  resetPassword // Using your existing action
} from 'wasp/client/operations';
import { getUsername, getFirstProviderUserId } from 'wasp/auth';
import { SubscriptionManageButton } from '../components/subscriptionManageButton.jsx';

const AccountSettingsPage = () => {
  const queryClient = useQueryClient();

  const {
    data: currentUser,
    isLoading: isUserLoading,
    error: userError,
  } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
  });

  // Theme mutation
  const { mutate: updateUserThemeFn, isLoading: isUpdatingTheme } = useMutation({
    mutationFn: updateUserTheme,
    onSuccess: () => {
      console.log("Theme update successful");
      queryClient.invalidateQueries(['currentUser']);
    },
    onError: (error) => {
      console.error('Failed to update theme:', error);
      alert('Failed to update theme: ' + (error?.message || 'Unknown error'));
    },
  });

  // Profile update mutation
  const { mutate: updateUserProfileFn, isLoading: isUpdatingProfile } = useMutation({
    mutationFn: updateUserProfile,
    onSuccess: () => {
      setProfileMessage('Profile updated successfully!');
      queryClient.invalidateQueries(['currentUser']);
    },
    onError: (error) => {
      console.error('Failed to update profile:', error);
      setProfileMessage(`Error: ${error?.message || 'Unknown error'}`);
    },
  });

  // Password reset/change - Using your existing resetPassword action
  const resetPasswordAction = useAction(resetPassword);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profileMessage, setProfileMessage] = useState('');

  // Password Reset State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (currentUser?.user) {
      setFirstName(currentUser.user.firstName || '');
      setLastName(currentUser.user.lastName || '');
    }
  }, [currentUser]);

  const handleThemeChange = (newTheme) => {
    console.log("Attempting to set theme to:", newTheme);
    updateUserThemeFn({ theme: newTheme });
  };

  const handleProfileUpdate = (e) => {
    e.preventDefault();
    setProfileMessage('');
    updateUserProfileFn({ firstName, lastName });
  };

  // Password reset handler - Modified to handle HttpError exceptions from your backend
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage('');

    // Frontend Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from current password.');
      return;
    }

    setIsLoading(true);
    try {
      // Call your resetPassword action with currentPassword
      const result = await resetPasswordAction({ 
        currentPassword, 
        newPassword 
      });

      // Handle success (your action returns success object even when throwing HttpErrors)
      if (result && result.success) {
        setSuccessMessage(result.message);
        // Clear form on success
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      // Handle HttpError exceptions from your backend
      console.error("Password Change Error:", err);
      
      // Extract error message from HttpError or use fallback
      let errorMessage = 'An error occurred while changing your password.';
      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.data?.message) {
        errorMessage = err.data.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const currentTheme = currentUser?.user?.theme || 'light';
  const username = currentUser?.user ? getUsername(currentUser.user) : null;
  const firstProviderId = currentUser?.user ? getFirstProviderUserId(currentUser.user) : null;

  if (isUserLoading) return <div className="p-4">Loading...</div>;
  if (userError) return <div className="p-4">Error loading user data: {userError?.message || 'Unknown error'}</div>;
  if (!currentUser) return <div className="p-4">No user data found. This is unexpected.</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Account Settings</h1>

      {/* Subscription Management Section */}
      <div className="mb-6 p-4 border rounded-lg shadow bg-white dark:bg-neutral-800 dark:border-neutral-700">
        <h2 className="text-xl font-semibold mb-3 text-neutral-700 dark:text-neutral-200">
          Subscription Management
        </h2>
        <p className="text-neutral-600 dark:text-neutral-300 mb-4">
          Manage your subscription plan, view usage, and update billing information.
        </p>
        <SubscriptionManageButton 
          to="/subscription/manage"
          className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-500"
        />
      </div>

      {/* Theme Settings */}
      <div className="mb-6 p-4 border rounded-lg shadow bg-white dark:bg-neutral-800 dark:border-neutral-700">
        <h2 className="text-xl font-semibold mb-2 text-neutral-700 dark:text-neutral-200">Theme Settings</h2>
        <p className="mb-2 text-neutral-600 dark:text-neutral-300">
          Current theme: <span className="font-semibold">{currentTheme}</span>
        </p>
        <div className="flex space-x-2">
          <button
            onClick={() => handleThemeChange('light')}
            disabled={currentTheme === 'light' || isUpdatingTheme}
            className={`px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-colors ${
              currentTheme === 'light'
                ? 'bg-blue-600 text-white cursor-default'
                : 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500'
            } ${
              isUpdatingTheme 
                ? 'opacity-50 cursor-not-allowed' 
                : ''
            }`}
          >
            {isUpdatingTheme ? 'Updating...' : 'Light Theme'}
          </button>
          <button
            onClick={() => handleThemeChange('dark')}
            disabled={currentTheme === 'dark' || isUpdatingTheme}
            className={`px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-colors ${
              currentTheme === 'dark'
                ? 'bg-gray-800 text-white cursor-default'
                : 'bg-gray-700 text-white hover:bg-gray-800 focus:ring-gray-700'
            } ${
              isUpdatingTheme 
                ? 'opacity-50 cursor-not-allowed' 
                : ''
            }`}
          >
            {isUpdatingTheme ? 'Updating...' : 'Dark Theme'}
          </button>
        </div>
      </div>

      {/* Profile Information Section */}
      <div className="mb-6 p-4 border rounded-lg shadow bg-white dark:bg-neutral-800 dark:border-neutral-700">
        <h2 className="text-xl font-semibold mb-3 text-neutral-700 dark:text-neutral-200">
          Profile Information
        </h2>
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={isUpdatingProfile}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:bg-gray-300 dark:disabled:bg-neutral-600"
          >
            {isUpdatingProfile ? 'Updating...' : 'Update Profile'}
          </button>
          {profileMessage && (
            <p
              className={`mt-2 text-sm ${
                profileMessage.startsWith('Error') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
              }`}
            >
              {profileMessage}
            </p>
          )}
        </form>
      </div>

      {/* Change Password Section */}
      <div className="mb-6 p-4 border rounded-lg shadow bg-white dark:bg-neutral-800 dark:border-neutral-700">
        <h2 className="text-xl font-semibold mb-3 text-neutral-700 dark:text-neutral-200">
          <span className="mr-2">🔑</span>
          Change Password
        </h2>
        
        <form onSubmit={handlePasswordReset} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Current Password
            </label>
            <input
              type="password"
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm shadow-sm disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-gray-800 transition-colors duration-200"
              placeholder="Enter current password"
              required
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm shadow-sm disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-gray-800 transition-colors duration-200"
              placeholder="Enter new password (min. 8 characters)"
              required
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm shadow-sm disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-gray-800 transition-colors duration-200"
              placeholder="Re-enter new password"
              required
            />
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg" role="alert">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="p-3 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center" role="alert">
              <div className="flex items-center justify-center gap-2">
                <span className="text-green-600 dark:text-green-400">✅</span>
                <span>{successMessage}</span>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-sm"
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" role="status"></div>
              ) : (
                <>
                  <span className="mr-2">🛡️</span>
                  Change Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountSettingsPage;