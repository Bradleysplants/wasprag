// src/client/components/SubscriptionPaywall.jsx

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wasp/client/router';
import { getUserSubscription } from 'wasp/client/operations';

// Usage indicator component
const UsageIndicator = ({ subscription }) => {
  if (!subscription) return null;

  const { monthlyQuestions, questionsRemaining, planDetails } = subscription;
  
  if (planDetails.monthlyQuestions === -1) {
    return (
      <div className="bg-plant-primary/10 border border-plant-primary/20 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-white font-medium">Questions this month:</span>
          <span className="text-plant-primary font-bold">Unlimited ∞</span>
        </div>
      </div>
    );
  }

  const usagePercentage = (monthlyQuestions / planDetails.monthlyQuestions) * 100;
  const isNearLimit = usagePercentage >= 80;
  const isAtLimit = questionsRemaining === 0;

  return (
    <div className={`border rounded-lg p-3 mb-4 ${
      isAtLimit 
        ? 'bg-accent-berry/10 border-accent-berry/20' 
        : isNearLimit 
          ? 'bg-accent-sun/10 border-accent-sun/20'
          : 'bg-plant-primary/10 border-plant-primary/20'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-white font-medium">Questions this month:</span>
        <span className={`font-bold ${
          isAtLimit ? 'text-accent-berry' : isNearLimit ? 'text-accent-sun' : 'text-plant-primary'
        }`}>
          {questionsRemaining} remaining
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-background-tertiary rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${
            isAtLimit 
              ? 'bg-accent-berry' 
              : isNearLimit 
                ? 'bg-accent-sun'
                : 'bg-plant-primary'
          }`}
          style={{ width: `${Math.min(usagePercentage, 100)}%` }}
        ></div>
      </div>
      
      <div className="text-xs text-white mt-1">
        {monthlyQuestions} of {planDetails.monthlyQuestions} questions used
      </div>
    </div>
  );
};

// Upgrade prompt component
const UpgradePrompt = ({ currentPlan, questionsRemaining }) => {
  const isAtLimit = questionsRemaining === 0;
  
  if (!isAtLimit) return null;

  return (
    <div className="bg-background-secondary border border-accent-berry/20 rounded-xl p-6 text-center">
      <div className="text-4xl mb-3">🚫</div>
      <h3 className="text-lg font-bold text-white mb-2">
        Question Limit Reached
      </h3>
      <p className="text-white mb-4">
        You've used all your questions for this month on the {currentPlan} plan.
        Upgrade to get more questions and unlock advanced features!
      </p>
      
      <div className="space-y-3">
        <Link
          to="/pricing-page"
          className="block w-full bg-plant-primary hover:bg-plant-primary-dark text-text-inverse font-medium py-3 px-4 rounded-lg transition-colors"
        >
          🌱 Upgrade Your Plan
        </Link>
        
        <p className="text-xs text-white">
          Your questions will reset next month, or upgrade now for immediate access
        </p>
      </div>
    </div>
  );
};

// Main paywall component
export const SubscriptionPaywall = ({ 
  children, 
  requiredPlan = null, 
  showUsage = true,
  fallbackMessage = "This feature requires a subscription."
}) => {
  const { data: subscription, isLoading, error } = useQuery({
    queryKey: ['subscription'],
    queryFn: getUserSubscription,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-plant-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-accent-berry/10 border border-accent-berry/20 rounded-lg p-4 text-center">
        <p className="text-accent-berry">Error loading subscription status</p>
      </div>
    );
  }

  // Check if user has required plan
  if (requiredPlan) {
    const planOrder = ['FREE', 'BASIC', 'PREMIUM', 'PROFESSIONAL'];
    const userPlanIndex = planOrder.indexOf(subscription?.plan || 'FREE');
    const requiredPlanIndex = planOrder.indexOf(requiredPlan);
    
    if (userPlanIndex < requiredPlanIndex) {
      return (
        <div className="bg-background-secondary border border-plant-primary/20 rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h3 className="text-lg font-bold text-white mb-2">
            Premium Feature
          </h3>
          <p className="text-white mb-4">
            {fallbackMessage} You need the {requiredPlan.toLowerCase()} plan or higher to access this feature.
          </p>
          
          <Link
            to="/pricing-page"
            className="inline-block bg-plant-primary hover:bg-plant-primary-dark text-text-inverse font-medium py-3 px-6 rounded-lg transition-colors"
          >
            🌱 Upgrade Now
          </Link>
        </div>
      );
    }
  }

  // Check question limits
  if (!subscription?.canAskQuestion) {
    return (
      <div>
        {showUsage && <UsageIndicator subscription={subscription} />}
        <UpgradePrompt 
          currentPlan={subscription?.planDetails?.name || 'Free'}
          questionsRemaining={subscription?.questionsRemaining || 0}
        />
      </div>
    );
  }

  // User has access - render children with usage indicator
  return (
    <div>
      {showUsage && <UsageIndicator subscription={subscription} />}
      {children}
    </div>
  );
};

// Hook for checking subscription status
export const useSubscription = () => {
  const { data: subscription, isLoading, error, refetch } = useQuery({
    queryKey: ['subscription'],
    queryFn: getUserSubscription,
    staleTime: 5 * 60 * 1000,           // 5 minutes - subscription data doesn't change often
    refetchOnWindowFocus: false,        // Stop refetching when window gains focus
    refetchOnMount: false,              // Only refetch on mount if data is stale
    refetchInterval: false,             // Explicitly disable automatic refetching
  });

  return {
    subscription,
    isLoading,
    error,
    refetch,
    canAskQuestion: subscription?.canAskQuestion || false,
    questionsRemaining: subscription?.questionsRemaining || 0,
    currentPlan: subscription?.plan || 'FREE',
    planDetails: subscription?.planDetails,
  };
};

// Subscription status component for navbar/header
export const SubscriptionStatus = ({ compact = false }) => {
  const { subscription, isLoading } = useSubscription();

  if (isLoading || !subscription) return null;

  const { plan, questionsRemaining, planDetails } = subscription;
  
  if (compact) {
    return (
      <div className="flex items-center space-x-2 text-sm">
        <span className="text-white">{planDetails.name}</span>
        {questionsRemaining !== -1 && (
          <span className={`px-2 py-1 rounded-full text-xs ${
            questionsRemaining === 0 
              ? 'bg-accent-berry/10 text-accent-berry'
              : questionsRemaining < 5
                ? 'bg-accent-sun/10 text-accent-sun'
                : 'bg-plant-primary/10 text-plant-primary'
          }`}>
            {questionsRemaining} left
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-background-secondary border border-border-primary rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-white">{planDetails.name}</h4>
          <p className="text-sm text-white">
            {questionsRemaining === -1 
              ? 'Unlimited questions' 
              : `${questionsRemaining} questions remaining`}
          </p>
        </div>
        {plan !== 'PROFESSIONAL' && (
          <Link
            to="/pricing-page"
            className="bg-plant-primary hover:bg-plant-primary-dark text-text-inverse px-3 py-1 rounded text-sm transition-colors"
          >
            Upgrade
          </Link>
        )}
      </div>
    </div>
  );
};

export default SubscriptionPaywall;