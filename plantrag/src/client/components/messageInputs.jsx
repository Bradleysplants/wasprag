// src/client/components/MessageInput.jsx
import React from 'react';

export const MessageInput = ({ input, onInputChange, onSubmit, isLoading }) => {
  return (
    <div className="bg-white border-t border-neutral-medium/20 p-4 sm:p-6 shadow-lifted-up">
      <form onSubmit={onSubmit} className="max-w-3xl mx-auto flex items-center space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Ask about plants... e.g., 'How often to water a fiddle leaf fig?'"
          className="flex-1 px-4 py-3 border border-neutral-medium/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-sun focus:border-transparent text-neutral-dark placeholder-neutral-medium text-sm shadow-sm"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="bg-plant-primary hover:bg-plant-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-plant-primary-dark text-white font-medium px-5 py-3 rounded-lg transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 ${isLoading ? 'hidden' : 'inline'} mr-1.5 -ml-1`}>
             <path d="M3.105 3.105a1.5 1.5 0 011.995-.498l11.54 5.77a1.5 1.5 0 010 2.746l-11.54 5.77a1.5 1.5 0 01-1.995-.498V3.105z" />
           </svg>
          {isLoading ? (
            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            "Send"
          )}
        </button>
      </form>
    </div>
  );
};