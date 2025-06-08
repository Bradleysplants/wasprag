// src/client/components/MessageList.jsx
import React, { useEffect, useRef } from 'react';
import { MessageItem } from './messageItem.jsx';
import { LoadingIndicator } from './loadingIndicator.jsx';

export const MessageList = ({ messages, isLoading, userInitial, theme = 'light' }) => {
  const messagesEndRef = useRef(null);
  const isDark = theme === 'dark';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Determine if only the initial bot message is present
  const isChatEmpty = messages.length <= 1;

  return (
    <div
      className={`relative flex-1 overflow-y-auto p-4 sm:p-6 ${isDark ? 'bg-gray-900' : 'bg-gray-300'}`}
      role="log"
      aria-live="polite"
    >
      {/* Subtle plant pattern background */}
      <div className="absolute inset-0 opacity-5 dark:opacity-3 pointer-events-none">
        <div className="absolute top-20 left-10 text-6xl text-green-300 transform rotate-12">🍃</div>
        <div className="absolute top-40 right-16 text-4xl text-emerald-300 transform -rotate-12">🌿</div>
        <div className="absolute bottom-32 left-20 text-5xl text-green-400/50 transform rotate-45">🌱</div>
        <div className="absolute bottom-60 right-8 text-3xl text-yellow-400/50 transform -rotate-45">🌻</div>
      </div>

      {/* Inner container with contrasting chatbox background */}
      <div className="max-w-4xl mx-auto relative z-10">
        <div className={`min-h-96 rounded-xl border space-y-4 p-6 relative ${isDark ? 'bg-gray-800 border-gray-600 shadow-lg' : 'bg-white border-gray-300 shadow-xl'}`}>

        {/* Conditional Rendering: Show prompt or messages */}
        {isChatEmpty && !isLoading ? (
          // Empty State / Initial Prompt with plant theme
          <div className={`absolute inset-0 flex flex-col items-center justify-center text-center px-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="relative">
              {/* Decorative plant elements around the main emoji */}
              <div className="absolute -top-2 -left-2 text-lg text-plant-secondary animate-pulse" style={{ animationDelay: '1s' }}>🌿</div>
              <div className="absolute -top-2 -right-2 text-lg text-accent-sun animate-pulse" style={{ animationDelay: '2s' }}>🌻</div>
              <div className="absolute -bottom-2 -left-2 text-lg text-plant-subtle animate-pulse" style={{ animationDelay: '0.5s' }}>🍃</div>
              
              <span className="text-6xl block animate-pulse" role="img" aria-label="sprout emoji">🌱</span>
            </div>
            
            <p className={`
              text-xl font-medium mt-6 mb-2
              ${isDark ? 'text-white' : 'text-plant-primary-dark'}
            `}>
              Ready to help you grow! 🌿
            </p>
            
            <p className={`
              text-sm max-w-md leading-relaxed
              ${isDark ? 'text-gray-300' : 'text-text-secondary'}
            `}>
              Ask me anything about plants, like "How to care for a Pothos?" or "What's wrong with my fiddle leaf fig?"
            </p>

            {/* Subtle plant care tips */}
            <div className={`
              mt-4 p-3 rounded-lg border
              ${isDark 
                ? 'bg-plant-primary/5 border-plant-primary/20 text-white' 
                : 'bg-plant-subtle/10 border-plant-subtle/30 text-plant-primary-dark'
              }
            `}>
              <span className="text-xs font-medium">💡 Try asking about watering, light requirements, or plant identification!</span>
            </div>
          </div>
        ) : (
          // Render Messages and Loading Indicator
          <>
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
          </>
        )}

        {/* Scroll target - keep at the very end */}
        <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
};