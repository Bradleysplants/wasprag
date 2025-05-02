// src/client/components/MessageList.jsx
import React, { useEffect, useRef } from 'react';
// Correct component import casing (PascalCase)
import { MessageItem } from './messageItem';
import { LoadingIndicator } from './loadingIndicator';

export const MessageList = ({ messages, isLoading, userInitial }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll effect remains the same
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Determine if only the initial bot message is present
  const isChatEmpty = messages.length <= 1;

  return (
    // Main scrolling container
    // - Added role="log" for accessibility
    // - Changed background to a subtle theme color tint
    // - Added 'relative' positioning to help center the empty state message
    <div
      className="relative flex-1 overflow-y-auto p-4 sm:p-6 bg-plant-subtle/40" // Lighter theme bg
      role="log"
      aria-live="polite" // Announce new messages (use with caution, test with screen readers)
    >
      {/* Inner container for max-width and message spacing */}
      <div className="max-w-3xl mx-auto space-y-4 pb-4"> {/* Added padding-bottom */}

        {/* Conditional Rendering: Show prompt or messages */}
        {isChatEmpty && !isLoading ? (
          // Empty State / Initial Prompt
          // Centered using absolute positioning relative to the parent
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <span className="text-4xl mb-4" role="img" aria-label="sprout emoji">🌱</span>
            <p className="text-lg font-medium text-plant-primary-dark">
              Ready when you are!
            </p>
            <p className="text-sm text-neutral-medium mt-1">
              Ask me anything about plants, like "How to care for a Pothos?"
            </p>
          </div>
        ) : (
          // Render Messages and Loading Indicator
          <>
            {messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                userInitial={userInitial}
              />
            ))}
            {/* Keep loading indicator below messages */}
            {isLoading && <LoadingIndicator />}
          </>
        )}

        {/* Scroll target - keep at the very end */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};