// src/client/pages/auth/LoginPage.jsx

import React from 'react';
import { Link } from 'wasp/client/router';
import { LoginForm } from 'wasp/client/auth';
import { LogoutSuccessMessage } from '../../components/logoutSuccessMessage';

export const LoginPage = () => {
  return (
    // FIXED: Use theme variables for background gradient
    <div className="flex flex-col flex-grow items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-plant-subtle via-background-secondary to-background-primary min-h-screen">
      
      {/* Logout Success Message - Only shows conditionally after logout */}
      <LogoutSuccessMessage />
      
      {/* FIXED: Login Card with proper theme support */}
      <div className="w-full max-w-md p-8 space-y-6 bg-background-primary border border-border-primary rounded-xl shadow-lifted backdrop-blur-sm">
        
        {/* Header */}
        <div className="text-center">
          <span className="text-4xl mb-4 inline-block text-plant-primary" role="img" aria-label="Leaf emoji">🌿</span>
          
          {/* FIXED: Use theme text colors */}
          <h2 className="text-2xl font-bold text-text-primary font-display">
            Welcome Back!
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Sign in to continue to your Botani-Buddy experience.
          </p>
        </div>

        {/* Wasp's LoginForm Component with theme styling */}
        <div className="login-form-container">
          <LoginForm />
        </div>

        {/* FIXED: Links Section with theme colors */}
        <div className="mt-6 text-center text-sm space-y-2">
          
          {/* Forgot Password Link */}
          <p className="text-text-secondary">
            <Link
              to="/forgot-password"
              className="font-medium text-plant-primary hover:text-plant-primary-dark hover:underline transition-colors duration-200"
            >
              Forgot your password?
            </Link>
          </p>

          {/* Signup Link */}
          <p className="text-text-secondary">
            {"Don't have an account yet? "}
            <Link
              to="/signup"
              className="font-medium text-plant-primary hover:text-plant-primary-dark hover:underline transition-colors duration-200"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* Optional: Add a subtle footer */}
      <div className="mt-8 text-center">
        <p className="text-xs text-text-tertiary">
          🌱 Grow your plant knowledge with AI
        </p>
      </div>
    </div>
  );
};

export default LoginPage;