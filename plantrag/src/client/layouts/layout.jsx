// src/client/Layout.jsx
import React from 'react';
import { useAuth, logout } from 'wasp/client/auth';
import { Outlet } from 'react-router-dom';
import { getUserDisplayNameFromUser } from '../utils/authUtils';
import '../../Main.css';
import { NavBar } from '../components/navBar';
import { Footer } from '../components/footer';
import '../pages/Root';

export const Layout = () => {
  const { data: user, isLoading } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout Error:', err);
    }
  };

  const displayName = getUserDisplayNameFromUser(user);

  return (
    <div className="flex flex-col min-h-screen bg-plant-subtle font-sans text-neutral-dark">
      {!isLoading && <NavBar userDisplayName={displayName} onLogout={handleLogout} />}

      <main className="flex-1 w-full max-w-full flex flex-col">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};

export default Layout;