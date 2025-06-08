// src/client/components/MessageInput.jsx
// Updated for Ollama integration while preserving subscription logic

import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { incrementQuestionCount } from 'wasp/client/operations';
import { SubscriptionPaywall, useSubscription } from './subscriptionPaywall.jsx';
import UsageIndicator from './usageIndicator.jsx';

// Main MessageInput component
export const MessageInput = ({ input, onInputChange, onSubmit, isLoading }) => {
  const queryClient = useQueryClient();
  const { subscription, canAskQuestion } = useSubscription();

  // Mutation to increment question count (KEEP EXISTING LOGIC)
  const incrementCountMutation = useMutation({
    mutationFn: incrementQuestionCount,
    onSuccess: () => {
      queryClient.invalidateQueries(['subscription']);
    },
    onError: (error) => {
      console.error('Failed to increment question count:', error);
      alert('Question limit reached! Please upgrade your subscription to continue.');
    },
  });

  // Enhanced submit handler (PRESERVE SUBSCRIPTION LOGIC)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;

    // Check subscription limits (KEEP THIS)
    if (!canAskQuestion) {
      alert('You have reached your question limit for this month. Please upgrade to continue!');
      return;
    }

    try {
      // Increment question count first (KEEP THIS)
      await incrementCountMutation.mutateAsync();
      
      // Then submit the message (this will now use Ollama backend)
      onSubmit(e);
    } catch (error) {
      console.error('Question submission failed:', error);
    }
  };

  // Handle Enter key press (KEEP EXISTING)
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim()) {
        handleSubmit(e);
      }
    }
  };

  return (
    <SubscriptionPaywall showUsage={false}>
      <div className="bg-gray-700 border-t border-gray-600 p-4">
        
        {/* Usage indicator (KEEP EXISTING) */}
        <div className="max-w-3xl mx-auto mb-3">
          <UsageIndicator />
        </div>

        {/* Input form (KEEP EXISTING STYLING) */}
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              canAskQuestion 
                ? "Ask about plants... e.g., 'How often to water a fiddle leaf fig?'"
                : "Upgrade your plan to ask more questions!"
            }
            className={`
              flex-1 px-4 py-3 
              bg-gray-800 text-gray-100
              border border-gray-600
              rounded-lg 
              focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/20
              placeholder-gray-400
              text-sm
              disabled:opacity-60 disabled:bg-gray-900
              ${!canAskQuestion ? 'cursor-not-allowed' : ''}
            `}
            disabled={isLoading || !canAskQuestion}
            aria-label="Plant question input"
            maxLength={1000} // Add max length for Ollama
          />

          <button
            type="submit"
            disabled={isLoading || !input.trim() || !canAskQuestion || incrementCountMutation.isLoading}
            className={`
              px-6 py-3 rounded-lg 
              font-medium transition-colors
              focus:outline-none focus:ring-2 focus:ring-offset-2
              ${canAskQuestion 
                ? 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500' 
                : 'bg-gray-600 cursor-not-allowed text-gray-300'
              }
              disabled:opacity-50
            `}
          >
            {isLoading || incrementCountMutation.isLoading ? (
              <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Send'
            )}
          </button>
        </form>

        {/* Character count only */}
        <div className="max-w-3xl mx-auto mt-2 flex items-center justify-end text-xs text-gray-400">
          <span className={input.length > 800 ? 'text-yellow-400' : ''}>
            {input.length}/1000
          </span>
        </div>
      </div>
    </SubscriptionPaywall>
  );
};