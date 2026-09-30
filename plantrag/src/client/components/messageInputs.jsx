// src/client/components/messageInputs.jsx
// Enhanced with conditional paywall layout - cleaned up footer

import React, { useState, useRef, useEffect } from 'react';

const MessageInput = ({ 
  input, 
  isLoading, 
  onInputChange, 
  onSubmit, 
  theme = 'light',
  isPaywallShowing = false,
  disabled = false
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef(null);
  const isDark = theme === 'dark';

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const maxHeight = isPaywallShowing ? 60 : 120;
      textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
    }
  }, [input, isPaywallShowing]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!disabled) {
      onSubmit(e);
    }
  };

  return (
    <div className={`
      ${isDark ? 'bg-gray-900' : 'bg-gray-100'} 
      ${isPaywallShowing ? 'border-t border-gray-300 dark:border-gray-700' : ''}
      transition-all duration-300
    `}>
      <div className={`
        max-w-4xl mx-auto
        ${isPaywallShowing ? 'p-1' : 'px-4 py-3 my-2'}
        transition-all duration-300
      `}>
        
        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className={`
            relative rounded-xl overflow-hidden
            ${isDark ? 'bg-gray-800' : 'bg-white'}
            ${isFocused ? 'ring-2 ring-emerald-500 dark:ring-emerald-400' : 'ring-1 ring-gray-300 dark:ring-gray-600'}
            ${isPaywallShowing ? 'shadow-sm' : 'shadow-lg'}
            ${disabled ? 'opacity-50' : ''}
            transition-all duration-200
          `}>
            
            {/* Main Input Area */}
            <div className="flex items-end space-x-3 px-2 p-6">
              
              {/* Textarea */}
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => onInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder={
                    disabled ? "Upgrade to continue asking questions..." :
                    isPaywallShowing ? "Ask about plants..." : 
                    "Ask me anything about plant care..."
                  }
                  disabled={isLoading || disabled}
                  className={`
                    w-full resize-none border-0 bg-transparent
                    ${isPaywallShowing ? 'text-sm' : 'text-base'}
                    ${isDark ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'}
                    focus:outline-none focus:ring-0
                    ${isPaywallShowing ? 'min-h-[32px] max-h-[60px]' : 'min-h-[40px] max-h-[120px]'}
                    overflow-y-auto
                    ${disabled ? 'cursor-not-allowed' : ''}
                  `}
                  rows={1}
                />
                
                {/* Character count for paywall mode */}
                {isPaywallShowing && input.length > 50 && (
                  <div className={`
                    absolute bottom-1 right-1 text-xs
                    ${input.length > 100 ? 'text-red-500' : 'text-gray-400'}
                  `}>
                    {input.length}/100
                  </div>
                )}
              </div>

              {/* Send Button */}
              <button
                type="submit"
                disabled={isLoading || !input.trim() || disabled}
                className={`
                  flex-shrink-0 rounded-lg font-medium transition-all duration-200
                  ${isPaywallShowing ? 'px-3 py-2 text-sm' : 'px-4 py-3 text-base'}
                  ${isLoading || !input.trim() || disabled
                    ? `${isDark ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'} cursor-not-allowed`
                    : `${isDark ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'} 
                       hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl`
                  }
                  disabled:hover:scale-100 disabled:hover:shadow-none
                `}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className={`animate-spin rounded-full border-2 border-white/30 border-t-white ${isPaywallShowing ? 'h-3 w-3' : 'h-4 w-4'}`} />
                    {!isPaywallShowing && <span>Thinking...</span>}
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>{isPaywallShowing ? '→' : 'Send'}</span>
                    {!isPaywallShowing && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                      </svg>
                    )}
                  </div>
                )}
              </button>
            </div>

            {/* Input Hints - Only show when not paywall mode and not disabled */}
            {!isPaywallShowing && !isLoading && !disabled && input.length === 0 && (
              <div className={`
                px-3 pb-2 text-xs
                ${isDark ? 'text-gray-500' : 'text-gray-400'}
              `}>
                💡 Try: "How do I care for my snake plant?" or "Why are my leaves yellowing?"
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export { MessageInput };
export default MessageInput;