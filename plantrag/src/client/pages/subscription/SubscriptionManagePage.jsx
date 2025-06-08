// src/client/pages/SubscriptionManagePage.jsx
import React from 'react';
import { Link } from 'wasp/client/router';
import { useQuery } from '@tanstack/react-query';
import { getUserSubscription } from 'wasp/client/operations';
import { SubscriptionStatus } from '../../components/subscriptionPaywall.jsx';

// FIXED: Named export to match route expectation
export const SubscriptionManagePage = () => {
  const { data: subscription, isLoading, error } = useQuery({
    queryKey: ['subscription'],
    queryFn: getUserSubscription,
  });

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
                    : 'text-accent-berry'
                }`}>
                  {subscription?.status || 'Unknown'}
                </p>
              </div>
              
              {subscription?.nextBillingTime && (
                <div>
                  <label className="text-sm text-text-tertiary">Next Billing</label>
                  <p className="text-lg text-text-primary">
                    {new Date(subscription.nextBillingTime).toLocaleDateString()}
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
                    {new Date(subscription.questionsResetAt).toLocaleDateString()}
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
              to="/pricing"
              className="bg-plant-primary hover:bg-plant-primary-dark text-text-inverse font-medium py-3 px-6 rounded-lg transition-colors text-center"
            >
              🚀 Upgrade Plan
            </Link>
          )}
          
          <Link
            to="/"
            className="bg-background-tertiary hover:bg-background-tertiary/80 text-text-primary font-medium py-3 px-6 rounded-lg transition-colors border border-border-primary text-center"
          >
            🌱 Back to App
          </Link>
        </div>

        {/* Support Section */}
        <div className="mt-12 text-center">
          <h3 className="text-lg font-bold text-text-primary mb-2">
            Need Help?
          </h3>
          <p className="text-text-secondary mb-4">
            Have questions about your subscription or need to make changes?
          </p>
          <a
            href="mailto:support@botanicalassistant.com"
            className="text-plant-primary hover:text-plant-primary-dark font-medium"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
};