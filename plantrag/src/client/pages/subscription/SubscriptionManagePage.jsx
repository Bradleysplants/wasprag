// src/client/pages/SubscriptionManagePage.jsx
import React, { useState } from 'react';
import { Link } from 'wasp/client/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserSubscription, cancelPayPalSubscription } from 'wasp/client/operations';
import { SubscriptionStatus } from '../../components/subscriptionPaywall.jsx';

// FIXED: Named export to match route expectation
export const SubscriptionManagePage = () => {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const queryClient = useQueryClient();

  // Helper function to safely format dates
  const formatDate = (dateString, fallback = 'Not set') => {
    if (!dateString) return fallback;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return fallback;
      return date.toLocaleDateString();
    } catch (error) {
      return fallback;
    }
  };

  // Calculate the actual reset date based on subscription data
  const getResetDate = (subscription) => {
    if (!subscription) return 'Not available';
    
    // If we have nextBillingTime, that's when questions reset
    if (subscription.nextBillingTime) {
      return formatDate(subscription.nextBillingTime, 'Next billing cycle');
    }
    
    // If we have currentPeriodStart, calculate next month
    if (subscription.currentPeriodStart) {
      try {
        const currentStart = new Date(subscription.currentPeriodStart);
        const nextReset = new Date(currentStart);
        nextReset.setMonth(nextReset.getMonth() + 1);
        return formatDate(nextReset.toISOString(), 'Next month');
      } catch (error) {
        // Fallback calculation
      }
    }
    
    // Fallback: first of next month
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return formatDate(nextMonth.toISOString(), 'Next month');
  };

  const { data: subscription, isLoading, error } = useQuery({
    queryKey: ['subscription'],
    queryFn: getUserSubscription,
  });

  const cancelMutation = useMutation({
    mutationFn: cancelPayPalSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries(['subscription']);
      setShowCancelConfirm(false);
    },
    onError: (error) => {
      console.error('Cancel subscription error:', error);
    }
  });

  const handleCancelSubscription = () => {
    cancelMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-plant-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-accent-berry">Error loading subscription data</p>
        </div>
      </div>
    );
  }

  const hasActiveSubscription = subscription && 
    subscription.plan !== 'FREE' && 
    ['ACTIVE', 'PENDING_CANCELLATION'].includes(subscription.status);

  return (
    <div className="min-h-screen bg-background-primary">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-4">
            🌿 Manage Your Subscription
          </h1>
          <p className="text-text-secondary">
            View your plan details, usage, and manage your subscription settings.
          </p>
        </div>

        {/* Current Subscription */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Subscription Details */}
          <div className="bg-background-secondary border border-border-primary rounded-xl p-6">
            <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center">
              <span className="mr-2">📋</span>
              Subscription Details
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-text-tertiary">Current Plan</label>
                <p className="text-lg font-semibold text-text-primary">
                  {subscription?.planDetails?.name || 'Free Plan'}
                </p>
              </div>
              
              <div>
                <label className="text-sm text-text-tertiary">Status</label>
                <p className={`text-lg font-semibold ${
                  subscription?.status === 'ACTIVE' 
                    ? 'text-plant-primary' 
                    : subscription?.status === 'PENDING_CANCELLATION'
                    ? 'text-yellow-600'
                    : 'text-accent-berry'
                }`}>
                  {subscription?.status === 'PENDING_CANCELLATION' 
                    ? 'Cancellation Pending' 
                    : subscription?.status || 'Unknown'}
                </p>
              </div>
              
              {subscription?.nextBillingTime && (
                <div>
                  <label className="text-sm text-text-tertiary">Next Billing</label>
                  <p className="text-lg text-text-primary">
                    {formatDate(subscription.nextBillingTime, 'To be determined')}
                  </p>
                </div>
              )}
              
              <div>
                <label className="text-sm text-text-tertiary">Monthly Price</label>
                <p className="text-lg font-semibold text-text-primary">
                  ${subscription?.planDetails?.price || '0'}/month
                </p>
              </div>
            </div>
          </div>

          {/* Usage Statistics */}
          <div className="bg-background-secondary border border-border-primary rounded-xl p-6">
            <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center">
              <span className="mr-2">📊</span>
              Usage This Month
            </h2>
            
            <SubscriptionStatus compact={false} />
            
            {subscription && (
              <div className="mt-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Questions Used:</span>
                  <span className="text-text-primary font-semibold">
                    {subscription.monthlyQuestions}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-text-secondary">Questions Included:</span>
                  <span className="text-text-primary font-semibold">
                    {subscription.planDetails.monthlyQuestions === -1 
                      ? 'Unlimited' 
                      : subscription.planDetails.monthlyQuestions}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-text-secondary">Reset Date:</span>
                  <span className="text-text-primary">
                    {getResetDate(subscription)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Plan Features */}
        {subscription?.planDetails && (
          <div className="mt-8 bg-background-secondary border border-border-primary rounded-xl p-6">
            <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center">
              <span className="mr-2">✨</span>
              Your Plan Features
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subscription.planDetails.features.map((feature, index) => (
                <div key={index} className="flex items-center">
                  <span className="text-plant-primary mr-3">✓</span>
                  <span className="text-text-secondary">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          
          {subscription?.plan !== 'PROFESSIONAL' && (
            <Link
              to="/pricing-page"
              className="bg-background-tertiary hover:bg-background-tertiary/80 text-text-primary font-medium py-3 px-6 rounded-lg transition-colors text-center border border-border-primary"
            >
              🚀 Upgrade Plan
            </Link>
          )}

          {hasActiveSubscription && subscription.status !== 'PENDING_CANCELLATION' && (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="bg-red-50 hover:bg-red-100 text-red-700 font-medium py-3 px-6 rounded-lg transition-colors text-center border border-red-200"
            >
              Cancel Subscription
            </button>
          )}
          
          <Link
            to="/"
            className="bg-background-tertiary hover:bg-background-tertiary/80 text-text-primary font-medium py-3 px-6 rounded-lg transition-colors border border-border-primary text-center"
          >
            🌱 Back to App
          </Link>
        </div>

        {/* Cancel Confirmation Modal */}
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center p-4 z-50">
            <div className="bg-background-secondary border border-border-primary rounded-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-bold text-text-primary mb-4">
                Cancel Subscription?
              </h3>
              <p className="text-text-secondary mb-6">
                Are you sure you want to cancel your subscription? You'll continue to have access until your next billing date, after which you'll be downgraded to the free plan.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={handleCancelSubscription}
                  disabled={cancelMutation.isLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  {cancelMutation.isLoading ? 'Cancelling...' : 'Yes, Cancel'}
                </button>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={cancelMutation.isLoading}
                  className="flex-1 bg-background-tertiary hover:bg-background-tertiary/80 text-text-primary font-medium py-2 px-4 rounded-lg transition-colors border border-border-primary"
                >
                  Keep Subscription
                </button>
              </div>

              {cancelMutation.error && (
                <p className="text-red-600 text-sm mt-3">
                  Error: {cancelMutation.error.message}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Support Section */}
        <div className="mt-12 text-center">
          <h3 className="text-lg font-bold text-text-primary mb-2">
            Need Help?
          </h3>
          <p className="text-text-secondary mb-4">
            Have questions about your subscription or need to make changes?
          </p>
          <Link
            to="/contact-us"
            className="text-plant-primary hover:text-plant-primary-dark font-medium"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
};