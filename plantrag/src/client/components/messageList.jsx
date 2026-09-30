// src/client/components/messageList.jsx
// Back to working version with just padding adjustment

import React, { useEffect, useRef } from 'react';
import { MessageItem } from './messageItem.jsx';
import { LoadingIndicator } from './loadingIndicator.jsx';
import { EmptyChatGreeting } from './emptyChatGreeting.jsx';

export const MessageList = ({ 
  messages, 
  isLoading, 
  userInitial, 
  theme = 'light',
  isPaywallShowing = false
}) => {
  const messagesEndRef = useRef(null);
  const isDark = theme === 'dark';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Only scroll to bottom if there are messages, not for the empty state
    if (!isChatEmpty) { 
      scrollToBottom();
    }
  }, [messages, isLoading]);

  // Determine if only the initial bot message is present
  const isChatEmpty = messages.length <= 1; // Assuming initial greeting is messages[0]

  return (
    <div 
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      className={`overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-gray-300'}`}
      role="log"
      aria-live="polite"
    >
      {/* Back to flex layout */}
      <div style={{ flex: 1, height: '100%', paddingLeft: '8px', paddingRight: '8px', paddingTop: '10px', paddingBottom: '6px', alignContent: 'center', overflow: 'hidden' }}>
        {/* Main content area - much smaller */}
        <div style={{
          height: '350px', // Fixed height instead of percentage
          borderRadius: '12px',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          ...(isChatEmpty && !isLoading ? { alignItems: 'center', justifyContent: 'center' } : {})
        }} className={`${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          {/* Conditional Rendering: Show EmptyChatGreeting or messages */}
          {isChatEmpty && !isLoading ? (
            // Render the full EmptyChatGreeting component with paywall prop
            <EmptyChatGreeting theme={theme} isPaywallShowing={isPaywallShowing} />
          ) : (
            // Render Messages in a scrollable container
            <div className="flex-1 overflow-y-auto">
              <div className={`max-w-2xl mx-auto rounded-xl shadow-lg ${isDark ? 'bg-gray-700 shadow-black/25' : 'bg-gray-50 shadow-gray-400/25'} my-14 p-8 space-y-1.5  mb-10 w-full`}>
                {messages.map((message) => (
                  <MessageItem
                    key={message.id}
                    message={message}
                    userInitial={userInitial}
                    theme={theme}
                  />
                ))}
                {/* Loading indicator with theme */}
                {isLoading && <LoadingIndicator theme={theme} />}

                {/* Scroll target - keep at the very end */}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

