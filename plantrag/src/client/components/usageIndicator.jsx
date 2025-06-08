// src/client/components/UsageIndicator.jsx

import React from 'react';
import { useSubscription } from './subscriptionPaywall.jsx';

const UsageIndicator = ({ className = "" }) => {
  const { subscription } = useSubscription();

  if (!subscription) return null;

  const { plan, questionsRemaining } = subscription;
  
  // Plant-themed plan data using standard Tailwind colors
  const planData = {
    FREE: { 
      name: 'Free', 
      icon: '🌱', 
      color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' 
    },
    BASIC: { 
      name: 'Plant Enthusiast', 
      icon: '🌿', 
      color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
    },
    PREMIUM: { 
      name: 'Green Thumb Pro', 
      icon: '🌳', 
      color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300' 
    },
    PROFESSIONAL: { 
      name: 'Botanical Expert', 
      icon: '🏛️', 
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' 
    },
  };

  const currentPlan = planData[plan] || planData.FREE;
  const isUnlimited = questionsRemaining === -1;
  const isLowQuestions = questionsRemaining <= 3 && questionsRemaining > 0;
  const isOutOfQuestions = questionsRemaining === 0;

  return (
    <div className={`flex items-center justify-between text-xs ${className}`}>
      {/* Plan indicator with plant theme */}
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${currentPlan.color} border-current/20`}>
        <span className="text-sm">{currentPlan.icon}</span>
        <span className="font-medium">{currentPlan.name}</span>
      </div>

      {/* Usage indicator with standard Tailwind colors */}
      {!isUnlimited && (
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
          isOutOfQuestions 
            ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' 
            : isLowQuestions 
              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
              : 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${
            isOutOfQuestions 
              ? 'bg-red-500' 
              : isLowQuestions 
                ? 'bg-amber-500'
                : 'bg-green-500'
          }`}></div>
          <span className="font-medium">
            {questionsRemaining} question{questionsRemaining !== 1 ? 's' : ''} left
          </span>
          {isLowQuestions && (
            <a 
              href="/pricing-page" 
              className="text-amber-800 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300 underline ml-1 transition-colors"
            >
              Upgrade
            </a>
          )}
        </div>
      )}

      {isUnlimited && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
          <span className="font-medium">Unlimited ∞</span>
        </div>
      )}
    </div>
  );
};

// Compact version for header/nav usage with plant theme
export const CompactUsageIndicator = () => {
  const { subscription } = useSubscription();

  if (!subscription) return null;

  const { questionsRemaining } = subscription;
  const isUnlimited = questionsRemaining === -1;
  const isLowQuestions = questionsRemaining <= 3 && questionsRemaining > 0;
  const isOutOfQuestions = questionsRemaining === 0;

  if (isUnlimited) return null; // Don't show anything for unlimited plans

  return (
    <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${
      isOutOfQuestions 
        ? 'text-red-700 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' 
        : isLowQuestions 
          ? 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800'
          : 'text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800'
    }`}>
      <div className={`w-1.5 h-1.5 rounded-full ${
        isOutOfQuestions 
          ? 'bg-red-500' 
          : isLowQuestions 
            ? 'bg-amber-500'
            : 'bg-green-500'
      }`}></div>
      <span className="font-medium">{questionsRemaining} left</span>
    </div>
  );
};

export default UsageIndicator;