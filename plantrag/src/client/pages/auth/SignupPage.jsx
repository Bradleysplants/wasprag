// src/client/pages/auth/SignupPage.jsx

import React, { useState } from 'react';
import { Link } from 'wasp/client/router'; // Wasp's Link for its routes
import { useNavigate } from 'react-router-dom'; // Import directly from react-router-dom
import { signup, login } from 'wasp/client/auth';
import { useAction } from 'wasp/client/operations';
import { sendWelcomeEmail, createFreeSubscription } from 'wasp/client/operations'; // Assuming these are correct paths

export const SignupPage = () => {
  const [identityInput, setIdentityInput] = useState(''); 
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate(); // Get the navigate function from react-router-dom

  // Hook into the sendWelcomeEmail action
  const sendWelcomeEmailAction = useAction(sendWelcomeEmail, {
    onSuccess: (data) => {
      console.log("Welcome email sent successfully!", data?.messageId);
    },
    onError: (error) => {
      console.error("Failed to send welcome email (non-critical):", error);
    }
  });

  // Hook into the createFreeSubscription action
  const createFreeSubscriptionAction = useAction(createFreeSubscription, {
    onSuccess: (data) => {
      console.log("Free subscription created successfully!", {
        plan: data?.subscription?.plan,
        status: data?.subscription?.status,
        alreadyExists: data?.alreadyExists
      });
    },
    onError: (error) => {
      console.error("Failed to create free subscription (non-critical):", error);
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const cleanIdentity = identityInput.trim(); 

    // Basic client-side validation
    if (!cleanIdentity || !password) {
      setError("Please provide both email and password.");
      setIsLoading(false);
      return;
    }
    if (!cleanIdentity.includes('@') || cleanIdentity.length < 5) { 
      setError("Please enter a valid email address.");
      setIsLoading(false);
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      setIsLoading(false);
      return;
    }

    console.log('🔍 Starting signup process...');
    
    const signupPayload = {
      username: cleanIdentity, // Using email as username for Wasp's usernameAndPassword
      password: password,
    };

    try {
      console.log('📝 Attempting to create account with payload:', JSON.stringify(signupPayload, null, 2));
      await signup(signupPayload); 
      console.log('✅ Account created successfully!');

      console.log(`🔐 Attempting to auto-login with username: ${cleanIdentity}`);
      await login(cleanIdentity, password); // Corrected login call: pass as two separate arguments
      console.log('✅ User logged in successfully after signup!');

      // Non-critical post-login actions
      try {
        console.log('🆓 Creating free subscription...');
        await createFreeSubscriptionAction({});
        console.log('✅ Free subscription action dispatched!');
      } catch (subError) {
        console.warn("⚠️ Free subscription creation failed (non-critical):", subError);
      }

      try {
        console.log('📧 Sending welcome email...');
        await sendWelcomeEmailAction({ 
          toEmail: cleanIdentity, 
          userName: cleanIdentity.split('@')[0] 
        });
        console.log('✅ Welcome email action dispatched!');
      } catch (emailError) {
        console.warn("⚠️ Welcome email sending failed (non-critical):", emailError);
      }
      
      console.log('🚀 Signup and auto-login complete! Manually redirecting to / using useNavigate...');
      navigate('/'); // <--- REDIRECT USING useNavigate from react-router-dom

    } catch (err) {
      console.error("❌ Signup or Auto-Login Error:", err);
      const errorDetails = {
        message: err.message, 
        name: err.name,
        statusCode: err.statusCode, 
        data: err.data,
      };
      console.error("Error details (full object):", errorDetails);
      
      if (err.data) {
          console.error("🕵️‍♀️ Error.data contents:", JSON.stringify(err.data, null, 2));
      }

      let displayErrorMessage = "An unexpected error occurred. Please try again.";
      if (err.statusCode === 422) {
          if (typeof err.data?.message === 'string') {
            displayErrorMessage = err.data.message;
          } else if (typeof err.data?.data?.message === 'string') { 
            displayErrorMessage = err.data.data.message;
          } else if (typeof err.data === 'string' && err.data.length > 0) {
            displayErrorMessage = err.data;
          } else {
            displayErrorMessage = err.message || "Validation failed. Please check your details.";
          }
      } else if (err.message?.toLowerCase().includes('invalid credentials') || err.statusCode === 401) {
        displayErrorMessage = 'Auto-login failed. Please try logging in manually.';
      } else if (err.message?.toLowerCase().includes('duplicate') || err.message?.toLowerCase().includes('unique') || err.statusCode === 409) {
        displayErrorMessage = 'This email is already taken. Please try logging in.';
      }
      setError(displayErrorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-grow items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-plant-subtle via-background-secondary to-background-primary min-h-screen">
      <div className="w-full max-w-md p-8 space-y-6 bg-background-primary border border-border-primary rounded-xl shadow-lifted backdrop-blur-sm">
        <div className="text-center">
          <span className="text-4xl mb-4 inline-block text-plant-primary" role="img" aria-label="Leaf sprout emoji">🌱</span>
          <h2 className="text-2xl font-bold text-text-primary font-display">
            Create Your Account
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Join Botani-Buddy to get plant advice!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="identityInput" className="block text-sm font-medium text-text-primary mb-1">
              Email Address 
            </label>
            <input
              id="identityInput"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={identityInput}
              onChange={(e) => setIdentityInput(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-background-secondary border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-plant-primary focus:border-plant-primary text-text-primary placeholder-text-tertiary text-sm shadow-sm disabled:opacity-60 disabled:bg-background-tertiary transition-colors duration-200"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-background-secondary border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-plant-primary focus:border-plant-primary text-text-primary placeholder-text-tertiary text-sm shadow-sm disabled:opacity-60 disabled:bg-background-tertiary transition-colors duration-200"
              placeholder="Choose a password (min. 8 characters)"
            />
          </div>

          {error && (
            <div className="p-3 text-sm text-accent-berry bg-accent-berry/10 border border-accent-berry/20 rounded-lg" role="alert">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-text-inverse bg-plant-primary hover:bg-plant-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-plant-primary transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-subtle"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" role="status"></div>
                  Creating Account...
                </div>
              ) : (
                'Sign Up & Log In 🌱'
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm">
          <p className="text-text-secondary">
            {'Already have an account? '}
            <Link
              to="/login"
              className="font-medium text-plant-primary hover:text-plant-primary-dark hover:underline transition-colors duration-200"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-xs text-text-tertiary">
          🌿 Start growing your plant knowledge today
        </p>
      </div>
    </div>
  );
};

export default SignupPage;