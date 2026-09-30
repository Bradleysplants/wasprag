// src/client/Layout.jsx (Fixed Version)
import React, { useEffect } from 'react';
import { useAuth, logout } from 'wasp/client/auth';
import { Outlet } from 'react-router-dom';
import { getUserDisplayNameFromUser } from '../utils/authUtils.js';
import '../../Main.css';
import { NavBar } from '../components/navBar.jsx';
import { Footer } from '../components/footer.jsx';
import '../../../src/client/pages/Root.jsx';

// IMPORTANT: Use @tanstack/react-query, NOT wasp's useQuery
import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from 'wasp/client/operations';

export const Layout = () => {
  const { data: user, isLoading: isAuthLoading } = useAuth();
    
  // Use @tanstack/react-query to match ThemeToggle and AccountSettingsPage
  const { data: currentUser, isLoading: isUserLoading, error: userError } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    staleTime: 5 * 60 * 1000,
  });

  // Apply theme whenever currentUser changes
  useEffect(() => {
    if (isUserLoading) {
      console.log("Layout: User data still loading...");
      return;
    }

    // Debug: Full object inspection
    console.log("=== LAYOUT DEBUG ===");
    console.log("Layout: currentUser (full):", JSON.stringify(currentUser, null, 2));
    console.log("Layout: currentUser?.theme:", currentUser?.theme);
    console.log("Layout: currentUser?.user?.theme:", currentUser?.user?.theme);
    console.log("Layout: userError:", userError);

    // Try multiple ways to get the theme
    let themeToApply = 'light'; // default
        
    if (currentUser?.theme) {
      themeToApply = currentUser.theme;
    } else if (currentUser?.user?.theme) {
      themeToApply = currentUser.user.theme;
    }

    const root = window.document.documentElement;

    console.log("Layout: Determined theme to apply:", themeToApply);

    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    // Add new theme class
    root.classList.add(themeToApply);
        
    console.log("Layout: Applied theme to document:", themeToApply);
    console.log("Layout: Document classes after update:", root.className);
  }, [currentUser, isUserLoading, userError]); // Watch entire currentUser object

  const handleLogout = async () => {
    try {
      await logout();
      const root = window.document.documentElement;
      root.classList.remove('dark', 'light');
      root.classList.add('light');
    } catch (err) {
      console.error('Logout Error:', err);
    }
  };

  const displayName = getUserDisplayNameFromUser(user);

  return (
    <div className="min-h-screen m-0 p-0 flex flex-col overflow-x-hidden bg-plant-subtle dark:bg-gray-900 font-sans text-neutral-dark dark:text-gray-100 transition-colors duration-300">
      {!isAuthLoading && (
        <div className="flex-shrink-0">
          <NavBar userDisplayName={displayName} onLogout={handleLogout} />
        </div>
      )}
      
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <Outlet />
      </main>
      
      <div className="flex-shrink-0">
        <Footer />
      </div>
    </div>
  );
};

export default Layout;