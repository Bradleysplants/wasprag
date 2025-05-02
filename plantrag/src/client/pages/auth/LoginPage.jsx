// src/client/pages/auth/LoginPage.jsx
// (Adjust path if needed)

import React from 'react';
// --- Use Wasp's Link component ---
import { Link } from 'wasp/client/router';
// --- Use Wasp's LoginForm ---
import { LoginForm } from 'wasp/client/auth';

// Assuming Wasp automatically handles the layout wrapping
export const LoginPage = () => {
  return (
    // --- Centering Container with Tailwind ---
    // Use flexbox to center vertically and horizontally within the main layout area
    // Apply theme background gradient (optional, adjust as desired)
    <div className="flex flex-col flex-grow items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-plant-subtle via-neutral-light to-white">
      {/* --- Login Card Styling --- */}
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
        {/* Header */}
        <div className="text-center">
           <span className="text-4xl mb-4 inline-block text-plant-primary" role="img" aria-label="Leaf emoji">🌿</span>
          <h2 className="text-2xl font-bold text-neutral-dark font-display">
            Welcome Back!
          </h2>
          <p className="mt-2 text-sm text-neutral-medium">
            Sign in to continue to your Botanical Assistant.
          </p>
        </div>

        {/* Wasp's LoginForm Component - It should inherit the font */}
        <LoginForm />

        {/* Links Section */}
        <div className="mt-6 text-center text-sm space-y-2"> {/* Added space-y-2 */}
          {/* --- Forgot Password Link --- */}
          <p className="text-neutral-medium">
            <Link
              to="/forgot-password" // Route defined in main.wasp.ts
              className="font-medium text-plant-primary-dark hover:text-plant-primary hover:underline"
            >
              Forgot your password?
            </Link>
          </p>
          {/* --- End Forgot Password Link --- */}

          {/* Signup Link */}
          <p className="text-neutral-medium">
            {"Don't have an account yet? "}
            <Link
              to="/signup"
              className="font-medium text-plant-primary-dark hover:text-plant-primary hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

// Default export might be expected by Wasp's page system
export default LoginPage;