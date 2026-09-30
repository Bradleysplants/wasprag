// src/client/components/subscriptionPaywall.jsx
// FIXED: Added proper cache invalidation and optimistic updates

import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserSubscription } from 'wasp/client/operations';

// Custom hook for subscription logic with cache invalidation support
export const useSubscription = () => {
  const queryClient = useQueryClient();
  
  const {
    data: subscription,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['subscription'],
    queryFn: getUserSubscription,
    retry: 3,
    staleTime: 1 * 60 * 1000, // Reduced to 1 minute from 5 minutes
    cacheTime: 5 * 60 * 1000, // Keep cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  // More robust logic for determining if user can ask questions
  const canAskQuestion = React.useMemo(() => {
    if (!subscription) return false;
    
    const { questionsRemaining } = subscription;
    
    // Handle different cases:
    // -1 = unlimited
    // > 0 = has questions remaining
    // 0 = no questions left
    // null/undefined = treat as no access
    if (questionsRemaining === -1) return true;
    if (typeof questionsRemaining === 'number' && questionsRemaining > 0) return true;
    
    return false;
  }, [subscription]);

  // Function to invalidate and refetch subscription data
  const invalidateSubscription = React.useCallback(() => {
    console.log('[useSubscription] Invalidating subscription cache...');
    queryClient.invalidateQueries({ queryKey: ['subscription'] });
  }, [queryClient]);

  // Function to optimistically update question count
  const optimisticallyDecrementCount = React.useCallback(() => {
    console.log('[useSubscription] Optimistically decrementing question count...');
    
    queryClient.setQueryData(['subscription'], (oldData) => {
      if (!oldData) return oldData;
      
      const newQuestionsRemaining = oldData.questionsRemaining === -1 
        ? -1 // Keep unlimited as unlimited
        : Math.max(0, (oldData.questionsRemaining || 0) - 1);
      
      const newMonthlyQuestions = (oldData.monthlyQuestions || 0) + 1;
      
      console.log('[useSubscription] Optimistic update:', {
        oldRemaining: oldData.questionsRemaining,
        newRemaining: newQuestionsRemaining,
        oldMonthlyQuestions: oldData.monthlyQuestions,
        newMonthlyQuestions: newMonthlyQuestions
      });
      
      return {
        ...oldData,
        questionsRemaining: newQuestionsRemaining,
        monthlyQuestions: newMonthlyQuestions,
        canAskQuestion: newQuestionsRemaining === -1 || newQuestionsRemaining > 0
      };
    });
  }, [queryClient]);

  // Debug logging (remove in production)
  React.useEffect(() => {
    console.log('Subscription Debug:', {
      subscription,
      canAskQuestion,
      isLoading,
      error,
      questionsRemaining: subscription?.questionsRemaining,
      monthlyQuestions: subscription?.monthlyQuestions,
      plan: subscription?.plan
    });
  }, [subscription, canAskQuestion, isLoading, error]);

  return {
    subscription,
    canAskQuestion,
    isLoading,
    error,
    refetch,
    invalidateSubscription,
    optimisticallyDecrementCount,
  };
};

// SubscriptionStatus component that matches SubscriptionManagePage usage
export const SubscriptionStatus = ({ compact = true, subscription }) => {
  const hookData = useSubscription();
  
  // Use passed subscription prop or fall back to hook data
  const subData = subscription || hookData.subscription;
  const isLoading = hookData.isLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!subData) {
    return (
      <div className="text-center p-4 bg-gray-800 rounded-lg border border-gray-600">
        <p className="text-gray-400 mb-2">Unable to load subscription data</p>
        <button 
          onClick={() => {
            console.log('[SubscriptionStatus] Manual refresh triggered');
            hookData.refetch();
          }} 
          className="text-green-500 hover:text-green-400 underline text-sm transition-colors"
        >
          Refresh
        </button>
      </div>
    );
  }

  const { questionsRemaining, monthlyQuestions, plan, planDetails } = subData;
  const isUnlimited = questionsRemaining === -1;
  const isLowQuestions = questionsRemaining <= 3 && questionsRemaining > 0;
  const isOutOfQuestions = questionsRemaining === 0;

  if (compact) {
    return (
      <div className="text-sm text-gray-400 bg-gray-800 rounded-lg p-3 border border-gray-600">
        <div className="flex items-center justify-between">
          <span>Plan: {plan || 'Free'}</span>
          <span className={`font-medium ${
            isOutOfQuestions ? 'text-red-400' : 
            isLowQuestions ? 'text-yellow-400' : 
            'text-green-400'
          }`}>
            {isUnlimited ? 'Unlimited' : `${questionsRemaining || 0} questions left`}
          </span>
          {/* Debug info - remove in production */}
          <span className="text-xs text-gray-500 ml-2">
            ({monthlyQuestions || 0}/{planDetails?.monthlyQuestions === -1 ? '∞' : planDetails?.monthlyQuestions || 0})
          </span>
        </div>
      </div>
    );
  }

  // Non-compact version for SubscriptionManagePage
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-400">Questions Remaining:</span>
          <span className={`font-medium ${
            isOutOfQuestions ? 'text-red-400' : 
            isLowQuestions ? 'text-yellow-400' : 
            'text-green-400'
          }`}>
            {isUnlimited ? 'Unlimited ∞' : (questionsRemaining || 0)}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-400">Questions Used This Month:</span>
          <span className="font-medium text-white">
            {monthlyQuestions || 0} / {planDetails?.monthlyQuestions === -1 ? '∞' : planDetails?.monthlyQuestions || 0}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-400">Current Plan:</span>
          <span className="font-medium text-white">{plan || 'Free'}</span>
        </div>

        {isLowQuestions && !isUnlimited && (
          <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-md">
            <p className="text-yellow-200 text-sm">
              You're running low on questions. Consider upgrading your plan to continue asking questions.
            </p>
            <a 
              href="/pricing-page" 
              className="inline-block mt-2 text-yellow-200 hover:text-yellow-100 underline text-sm font-medium transition-colors"
            >
              View Plans →
            </a>
          </div>
        )}

        {isOutOfQuestions && !isUnlimited && (
          <div className="mt-3 p-3 bg-red-900/20 border border-red-600/30 rounded-md">
            <p className="text-red-200 text-sm">
              You've used all your questions for this month. Upgrade to continue getting plant advice!
            </p>
            <a 
              href="/pricing-page" 
              className="inline-block mt-2 text-red-200 hover:text-red-100 underline text-sm font-medium transition-colors"
            >
              Upgrade Now →
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

// Main SubscriptionPaywall component
export const SubscriptionPaywall = ({ children, showUsage = true }) => {
  const { subscription, canAskQuestion, isLoading, error, refetch } = useSubscription();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        <span className="ml-2 text-gray-400">Loading subscription...</span>
      </div>
    );
  }

  if (error) {
    console.error('Subscription paywall error:', error);
    return (
      <div className="text-center p-8 bg-red-900/20 border border-red-600/30 rounded-lg">
        <div className="text-4xl mb-4">⚠️</div>
        <p className="text-red-200 mb-2">Error loading subscription data</p>
        <p className="text-red-300 text-sm mb-4">{error.message || 'Unknown error occurred'}</p>
        <button 
          onClick={() => {
            console.log('[SubscriptionPaywall] Error recovery: refetching subscription');
            refetch();
          }} 
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  // Handle case where subscription data is null/undefined
  if (!subscription && !isLoading) {
    return (
      <div className="text-center p-8 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
        <div className="text-3xl mb-4">🌱</div>
        <h3 className="text-lg font-bold text-yellow-200 mb-2">
          No subscription found
        </h3>
        <p className="text-yellow-300 mb-4">
          We couldn't find your subscription data. Please sign up for a plan to start asking questions.
        </p>
        <a
          href="/pricing-page"
          className="inline-block bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
        >
          View Plans
        </a>
      </div>
    );
  }

  // If user is out of questions, show paywall
  if (!canAskQuestion) {
    return (
      <div className="text-center p-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-gray-600 shadow-lg">
        <div className="text-4xl mb-4">🌱</div>
        <h3 className="text-xl font-bold text-white mb-3">
          You've reached your question limit
        </h3>
        <p className="text-gray-300 mb-4 max-w-md mx-auto">
          Upgrade your plan to continue asking questions about plants and get expert botanical advice.
        </p>
        
        {/* Current usage display */}
        <div className="mb-6 max-w-sm mx-auto">
          <SubscriptionStatus compact={false} subscription={subscription} />
        </div>

        <div className="space-y-3">
          <a
            href="/pricing-page"
            className="inline-block bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-8 rounded-lg transition-colors shadow-md hover:shadow-lg"
          >
            🚀 Upgrade Plan
          </a>
          <div className="text-sm text-gray-500">
            Or wait until next month when your questions reset
          </div>
        </div>
      </div>
    );
  }

  // If user can ask questions, render children with optional usage
  return (
    <div className="min-h-0">
      {showUsage && subscription && (
        <div className="mb-2 px-4">
          <SubscriptionStatus compact={true} subscription={subscription} />
        </div>
      )}
      {children}
    </div>
  );
};