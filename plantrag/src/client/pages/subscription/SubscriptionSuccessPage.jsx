// src/client/pages/SubscriptionSuccessPage.jsx
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getUserSubscription, activatePayPalSubscription } from 'wasp/client/operations';

// FIXED: Named export to match route expectation
export const SubscriptionSuccessPage = () => {
  const [status, setStatus] = useState('processing'); // processing, activating, success, error
  const [error, setError] = useState(null);
  const [activationResult, setActivationResult] = useState(null);
  const location = useLocation();

  const { data: subscription, refetch } = useQuery({
    queryKey: ['subscription'],
    queryFn: getUserSubscription,
    enabled: status === 'success', // Only fetch after successful activation
  });

  useEffect(() => {
    const processPayPalReturn = async () => {
      const urlParams = new URLSearchParams(location.search);
      const subscriptionId = urlParams.get('subscription_id');
      const token = urlParams.get('token');
      const ba_token = urlParams.get('ba_token'); // Sometimes PayPal uses this

      console.log('🔄 Processing PayPal return:', { 
        subscriptionId, 
        token, 
        ba_token,
        fullURL: window.location.href 
      });

      // If no PayPal parameters, this might be a direct visit - show success anyway
      if (!subscriptionId && !token && !ba_token) {
        console.log('📄 No PayPal parameters found - showing success page');
        setStatus('success');
        refetch(); // Fetch current subscription
        return;
      }

      try {
        setStatus('activating');
        
        // Use subscription_id if available, otherwise try token or ba_token
        const idToUse = subscriptionId || token || ba_token;
        console.log('📡 Activating subscription with ID:', idToUse);
        
        const result = await activatePayPalSubscription({ 
          subscriptionId: idToUse 
        });

        console.log('✅ Subscription activated:', result);
        setActivationResult(result);
        setStatus('success');
        
        // Refetch subscription data
        refetch();

      } catch (error) {
        console.error('❌ Subscription activation failed:', error);
        setError(error.message || 'Failed to activate subscription');
        setStatus('error');
      }
    };

    processPayPalReturn();
  }, [location, refetch]);

  // Loading state while processing PayPal return
  if (status === 'processing' || status === 'activating') {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-background-secondary border border-border-primary rounded-xl p-8 text-center shadow-lifted">
          
          {/* Loading Animation */}
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-plant-primary mx-auto mb-6"></div>
          
          {/* Loading Message */}
          <h1 className="text-xl font-bold text-text-primary mb-4">
            {status === 'processing' ? 'Processing Payment...' : 'Activating Subscription...'}
          </h1>
          
          <p className="text-text-secondary mb-6">
            Please wait while we confirm your subscription with PayPal.
          </p>

          <div className="text-sm text-text-tertiary">
            This usually takes just a few seconds.
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-background-secondary border border-border-primary rounded-xl p-8 text-center shadow-lifted">
          
          {/* Error Icon */}
          <div className="text-6xl mb-6">❌</div>
          
          {/* Error Message */}
          <h1 className="text-2xl font-bold text-text-primary mb-4">
            Activation Failed
          </h1>
          
          <p className="text-red-600 mb-6 text-sm">
            {error}
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              to="/pricing"
              className="block w-full bg-plant-primary hover:bg-plant-primary-dark text-text-inverse font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Try Again
            </Link>
            
            <Link
              to="/"
              className="block w-full bg-background-tertiary hover:bg-background-tertiary/80 text-text-primary font-medium py-3 px-4 rounded-lg transition-colors border border-border-primary"
            >
              Go to Dashboard
            </Link>
          </div>

          <p className="text-xs text-text-tertiary mt-6">
            If you continue to have issues, please contact support.
          </p>
        </div>
      </div>
    );
  }

  // Success state (your original design with enhancements)
  return (
    <div className="min-h-screen bg-background-primary flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-background-secondary border border-border-primary rounded-xl p-8 text-center shadow-lifted">
        
        {/* Success Icon */}
        <div className="text-6xl mb-6">🎉</div>
        
        {/* Success Message */}
        <h1 className="text-2xl font-bold text-text-primary mb-4">
          Welcome to Your Plant Journey!
        </h1>
        
        <p className="text-text-secondary mb-6">
          Your subscription has been activated successfully. You now have access to all the features of your 
          <span className="font-semibold text-plant-primary">
            {' '}{subscription?.planDetails?.name || activationResult?.planDetails?.name || 'new plan'}
          </span>!
        </p>

        {/* Plan Details */}
        {(subscription?.planDetails || activationResult?.planDetails) && (
          <div className="bg-plant-primary/10 border border-plant-primary/20 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-text-primary mb-2">Your Plan Benefits:</h3>
            <ul className="text-sm text-text-secondary space-y-1">
              {(subscription?.planDetails?.features || activationResult?.planDetails?.features || []).map((feature, index) => (
                <li key={index} className="flex items-center">
                  <span className="text-plant-primary mr-2">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Success notification for new activation */}
        {activationResult && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
            <p className="text-sm text-green-800">
              🎊 Subscription activated! Welcome to the {activationResult.planDetails?.name} plan.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            to="/"
            className="block w-full bg-plant-primary hover:bg-plant-primary-dark text-text-inverse font-medium py-3 px-4 rounded-lg transition-colors"
          >
            🌱 Start Asking Questions
          </Link>
          
          <Link
            to="/subscription/manage"
            className="block w-full bg-background-tertiary hover:bg-background-tertiary/80 text-text-primary font-medium py-3 px-4 rounded-lg transition-colors border border-border-primary"
          >
            Manage Subscription
          </Link>
        </div>

        {/* Footer */}
        <p className="text-xs text-text-tertiary mt-6">
          Need help? Contact our support team anytime.
        </p>
      </div>
    </div>
  );
};