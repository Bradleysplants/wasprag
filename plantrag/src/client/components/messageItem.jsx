// src/client/components/MessageItem.jsx
import React, { useState } from 'react';
// Optional: Import icons if you have them
// import { ClipboardDocumentIcon, CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/20/solid';

// Helper to check if a string is a valid URL
const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

export const MessageItem = ({ message, userInitial }) => {
  const [isCopied, setIsCopied] = useState(false);
  const isUser = message.type === 'user';

  // --- Detect potential errors & URLs ---
  // Simple error check based on common phrasing (adjust if needed)
  const isError = !isUser && message.content.toLowerCase().startsWith('sorry,');
  // Check if sources are URLs
  const sourcesAreLinks = message.sources?.every(isValidUrl) ?? false;
  // --- End detection ---

  // Function to copy text to clipboard
  const handleCopy = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500); // Show "Copied!" for 1.5s
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // Optionally show an error message to the user
    }
  };

  // --- Dynamic Styling ---
  const bubbleBaseClasses = "relative group max-w-md md:max-w-lg rounded-lg px-4 py-3 shadow-subtle break-words transition-shadow duration-150 hover:shadow-md"; // Added relative, group, hover
  const userBubbleClasses = "bg-plant-primary text-white rounded-br-none";
  // Assistant styling with conditional error state
  const assistantBubbleClasses = `
    ${isError ? 'bg-red-50 border border-red-300 text-red-800' : 'bg-neutral-light text-neutral-dark border border-neutral-medium/20'}
    rounded-bl-none
  `;
  // --- End Dynamic Styling ---


  return (
    // Added `group` class here as well for potential future styling needs
    <div className={`group flex items-start ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Assistant Avatar (Conditional Error Icon) */}
      {!isUser && (
        <div className={`
          w-8 h-8 rounded-full flex-shrink-0 mr-3 flex items-center justify-center
          text-sm font-bold shadow-sm
          ${isError ? 'bg-red-200 text-red-700' : 'bg-plant-secondary text-white'}
        `}
          aria-label={isError ? "Error message avatar" : "Botanical Assistant avatar"}
        >
          {isError ? (
            // <ExclamationTriangleIcon className="h-5 w-5" /> // Icon example
            '⚠️' // Emoji fallback
          ) : (
            '🌱'
          )}
        </div>
      )}

      {/* Message Bubble Container */}
      <div className={`${bubbleBaseClasses} ${isUser ? userBubbleClasses : assistantBubbleClasses}`}>

        {/* --- Copy Button (for Assistant messages only) --- */}
        {!isUser && !isError && message.content && (
          <button
            onClick={handleCopy}
            className={`
              absolute top-1 right-1 p-1 rounded
              text-neutral-400 hover:text-neutral-600 hover:bg-neutral-light/50
              opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-150
              ${isCopied ? 'text-plant-primary' : ''}
            `}
            aria-label={isCopied ? "Copied!" : "Copy message"}
            title={isCopied ? "Copied!" : "Copy message"} // Tooltip
          >
            {isCopied ? (
              // <CheckIcon className="h-3.5 w-3.5" /> // Icon Example
              '✓' // Simple checkmark
            ) : (
              // <ClipboardDocumentIcon className="h-3.5 w-3.5" /> // Icon Example
              '📋' // Emoji fallback
            )}
          </button>
        )}
        {/* --- End Copy Button --- */}


        {/* Message Content */}
        {/* Padding adjusted slightly if copy button is present */}
        <div className={`text-sm whitespace-pre-wrap ${!isUser && !isError ? 'pr-6' : ''}`}>
          {message.content}
        </div>


        {/* Sources Section */}
        {message.sources && message.sources.length > 0 && (
          <div className={`mt-2 pt-2 text-xs ${isError ? 'border-red-300/50' : 'border-neutral-medium/30'} border-t`}>
             {/* Use details/summary for accessible dropdown */}
            <details className="cursor-pointer group/details"> {/* Different group name for details */}
              <summary className={`font-medium list-none select-none ${
                isUser ? 'text-plant-subtle group-hover/details:text-white' : isError ? 'text-red-700 group-hover/details:text-red-900' : 'text-plant-primary-dark group-hover/details:text-plant-primary'
              }`}>
                <span className="inline-block transition-transform duration-200 group-open/details:rotate-90 mr-1.5">▶</span>
                Sources
              </summary>
              {/* List of sources */}
              <ul className={`mt-1.5 pl-5 list-disc space-y-1 ${
                 isUser ? 'text-plant-subtle/90' : isError ? 'text-red-600' : 'text-neutral-medium'
              }`}>
                {message.sources.map((source, idx) => (
                  <li key={idx}>
                    {sourcesAreLinks ? (
                      <a
                        href={source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline text-inherit" // Inherit color, underline on hover
                      >
                        {source}
                      </a>
                    ) : (
                      source // Render as plain text if not a link
                    )}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-earth-brown flex-shrink-0 ml-3 flex items-center justify-center text-white font-bold text-sm shadow-sm" aria-label={`User ${userInitial} avatar`}>
          {userInitial}
        </div>
      )}
    </div>
  );
};