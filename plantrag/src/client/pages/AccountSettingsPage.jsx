import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCurrentUser, updateUserTheme, updateUserProfile } from 'wasp/client/operations';
import { getUsername, getFirstProviderUserId } from 'wasp/auth';

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

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profileMessage, setProfileMessage] = useState('');

  // Password Reset State (UI only)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordResetLoading, setIsPasswordResetLoading] = useState(false);
  const [passwordResetError, setPasswordResetError] = useState(null);
  const [passwordResetSuccessMessage, setPasswordResetSuccessMessage] = useState('');

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
    setProfileMessage(''); // Clear previous messages
    updateUserProfileFn({ firstName, lastName });
  };

  const handlePasswordReset = (e) => {
    e.preventDefault();
    
    // Basic validation
    if (newPassword !== confirmPassword) {
      setPasswordResetError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordResetError('Password must be at least 6 characters long');
      return;
    }

    setIsPasswordResetLoading(true);
    setPasswordResetError(null);
    
    // Simulate password reset (replace with actual implementation)
    setTimeout(() => {
      setIsPasswordResetLoading(false);
      setPasswordResetSuccessMessage('Password change functionality not implemented yet');
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }, 1000);
  };

  // FIXED: Use currentUser.user.theme instead of currentUser.theme
  const currentTheme = currentUser?.user?.theme || 'light';

  // Safely access username and firstProviderId
  const username = currentUser?.user ? getUsername(currentUser.user) : null;
  const firstProviderId = currentUser?.user ? getFirstProviderUserId(currentUser.user) : null;

  if (isUserLoading) return <div className="p-4">Loading...</div>;
  if (userError) return <div className="p-4">Error loading user data: {userError?.message || 'Unknown error'}</div>;
  if (!currentUser) return <div className="p-4">No user data found. This is unexpected.</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Account Settings</h1>

      {/* Authentication Info Section */}
      <div className="mb-6 p-4 border rounded-lg shadow bg-white dark:bg-neutral-800 dark:border-neutral-700">
        <h2 className="text-xl font-semibold mb-2 text-neutral-700 dark:text-neutral-200">
          Authentication Info
        </h2>
        {username && <p className="text-neutral-600 dark:text-neutral-300">Username: {username}</p>}
        {firstProviderId && <p className="text-neutral-600 dark:text-neutral-300">User ID: {firstProviderId}</p>}
        {!username && !firstProviderId && <p className="text-neutral-600 dark:text-neutral-300">No authentication information available.</p>}
        <p className="text-sm text-gray-500 dark:text-gray-400">This information is for your reference.</p>
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
        <h2 className="text-xl font-semibold mb-3 text-neutral-700 dark:text-neutral-200">Change Password</h2>
        <form onSubmit={handlePasswordReset} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Current Password
            </label>
            <input
              type="password"
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isPasswordResetLoading}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 disabled:bg-gray-300 dark:disabled:bg-neutral-600"
          >
            {isPasswordResetLoading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" role="status"></div>
            ) : (
              'Change Password'
            )}
          </button>
          {passwordResetError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{passwordResetError}</p>
          )}
          {passwordResetSuccessMessage && (
            <p className="mt-2 text-sm text-green-600 dark:text-green-400">{passwordResetSuccessMessage}</p>
          )}
        </form>
      </div>
    </div>
  );
};

export default AccountSettingsPage;