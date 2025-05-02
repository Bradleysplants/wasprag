// src/client/components/MessageInput.jsx

import React from 'react';
// Optional: Import icons if you have them
// import { PaperAirplaneIcon } from '@heroicons/react/20/solid';

// Define the expected properties for the component
// Using PropTypes for JS or interfaces for TS (this is JS syntax)
// import PropTypes from 'prop-types'; // npm install prop-types

export const MessageInput = ({ input, onInputChange, onSubmit, isLoading }) => {

  // Handle Enter key press for submission (optional but good UX)
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { // Check for Enter without Shift
      e.preventDefault(); // Prevent default newline behavior
      if (!isLoading && input.trim()) { // Ensure not loading and input is not empty
        onSubmit(e); // Trigger the submit handler
      }
    }
  };

  return (
    // Container for the input area
    // Adds background, top border, padding, and a subtle shadow
    <div className="bg-white border-t border-neutral-medium/20 p-4 sm:p-6 shadow-lifted-up">
      {/* Form element wrapping input and button */}
      <form
        onSubmit={onSubmit}
        // Use flexbox to align input and button horizontally
        className="max-w-3xl mx-auto flex items-center space-x-2"
      >
        {/* Text Input Field */}
        <input
          type="text"
          value={input}
          // Use the callback prop to update state in the parent component
          onChange={(e) => onInputChange(e.target.value)}
          onKeyPress={handleKeyPress} // Add key press handler
          placeholder="Ask about plants... e.g., 'How often to water a fiddle leaf fig?'"
          // Styling: flex-grow, padding, border, rounded corners, focus ring, text/placeholder colors
          className="flex-1 px-4 py-3 border border-neutral-medium/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-sun focus:border-transparent text-neutral-dark placeholder-neutral-medium text-sm shadow-sm disabled:opacity-60 disabled:bg-neutral-light/50"
          // Disable input when isLoading is true
          disabled={isLoading}
          aria-label="Plant question input" // Accessibility label
        />

        {/* Submit Button */}
        <button
          type="submit"
          // Disable button when isLoading is true or input is just whitespace
          disabled={isLoading || !input.trim()}
          // Styling: background/hover colors, focus ring, text style, padding, rounded corners, transitions, disabled state
          className="bg-plant-primary hover:bg-plant-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-plant-primary-dark text-white font-medium px-5 py-3 rounded-lg transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          aria-label={isLoading ? "Sending message" : "Send message"} // Dynamic accessibility label
        >
          {/* Conditionally render Icon or Loading Spinner */}
          {isLoading ? (
            // Simple spinner animation
            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" role="status" aria-live="polite"></div>
          ) : (
            // Send Icon (Optional) - Replace with actual icon component if available
            // <PaperAirplaneIcon className="w-5 h-5 mr-1.5 -ml-1" /> // Example Icon
            <span className="mr-1.5 -ml-1" role="img" aria-label="send icon">➤</span> // Simple arrow fallback
          )}
          {/* Button Text */}
          {isLoading ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

// Optional: Add PropTypes for JavaScript projects for better type checking
// MessageInput.propTypes = {
//   input: PropTypes.string.isRequired,
//   onInputChange: PropTypes.func.isRequired,
//   onSubmit: PropTypes.func.isRequired,
//   isLoading: PropTypes.bool.isRequired,
// };