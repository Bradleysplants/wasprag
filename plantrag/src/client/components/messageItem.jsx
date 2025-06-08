// src/client/components/MessageItem.jsx
import React, { useState } from 'react';

// Helper to check if a string is a valid URL
const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

export const MessageItem = ({ message, userInitial, theme = 'light' }) => {
  const [isCopied, setIsCopied] = useState(false);
  const isUser = message.type === 'user';
  const isDark = theme === 'dark';

  // Detect potential errors & URLs
  const isError = !isUser && message.content.toLowerCase().includes('sorry,');
  const sourcesAreLinks = message.sources?.every(isValidUrl) ?? false;

  // Function to copy text to clipboard
  const handleCopy = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className={`flex items-start ${isUser ? 'justify-end' : 'justify-start'} animate-fade-slide-in`}>
      
      {/* Assistant Avatar */}
      {!isUser && (
        <div 
          className={`
            w-8 h-8 rounded-full flex-shrink-0 mr-3 flex items-center justify-center
            text-sm font-bold shadow-sm
            ${isError 
              ? 'bg-red-500 text-white' 
              : 'bg-emerald-600 text-white'
            }
          `}
          aria-label={isError ? "Error message avatar" : "Botanical Assistant avatar"}
        >
          {isError ? '⚠️' : '🌱'}
        </div>
      )}

      {/* Message Bubble */}
      <div className={`
        relative group max-w-md md:max-w-lg rounded-lg px-4 py-3 shadow-sm break-words 
        transition-all duration-200 hover:shadow-md
        ${isUser 
          ? 'bg-green-600 text-white rounded-br-none' 
          : isError 
            ? 'bg-red-50 border border-red-200 text-red-800 rounded-bl-none dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
            : 'bg-gray-50 border border-gray-200 text-gray-900 rounded-bl-none dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100'
        }
      `}>

        {/* Copy Button (for Assistant messages only) */}
        {!isUser && !isError && message.content && (
          <button
            onClick={handleCopy}
            className={`
              absolute top-1 right-1 p-1 rounded opacity-0 group-hover:opacity-100 
              focus:opacity-100 transition-opacity duration-150
              ${isDark 
                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'
              }
              ${isCopied ? 'text-green-600' : ''}
            `}
            aria-label={isCopied ? "Copied!" : "Copy message"}
            title={isCopied ? "Copied!" : "Copy message"}
          >
            {isCopied ? '✓' : '📋'}
          </button>
        )}

        {/* Message Content */}
        <div className={`
          text-sm whitespace-pre-wrap
          ${!isUser && !isError ? 'pr-6' : ''}
          ${isUser 
            ? 'text-white' 
            : isError 
              ? 'text-red-800 dark:text-red-400'
              : 'text-gray-900 dark:text-gray-100'
          }
        `}>
          {message.content}
        </div>

        {/* Sources Section */}
        {message.sources && message.sources.length > 0 && (
          <div className={`
            mt-2 pt-2 text-xs border-t
            ${isError 
              ? 'border-red-200 dark:border-red-800' 
              : isUser 
                ? 'border-green-400/30' 
                : 'border-gray-200 dark:border-gray-600'
            }
          `}>
            <details className="cursor-pointer group/details">
              <summary className={`
                font-medium list-none select-none transition-colors
                ${isUser 
                  ? 'text-green-100 group-hover/details:text-white' 
                  : isError 
                    ? 'text-red-700 group-hover/details:text-red-800 dark:text-red-400 dark:group-hover/details:text-red-300'
                    : 'text-green-700 group-hover/details:text-green-800 dark:text-green-400 dark:group-hover/details:text-green-300'
                }
              `}>
                <span className="inline-block transition-transform duration-200 group-open/details:rotate-90 mr-1.5">▶</span>
                Sources
              </summary>
              
              <ul className={`
                mt-1.5 pl-5 list-disc space-y-1
                ${isUser 
                  ? 'text-green-100/90' 
                  : isError 
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-600 dark:text-gray-400'
                }
              `}>
                {message.sources.map((source, idx) => (
                  <li key={idx}>
                    {sourcesAreLinks ? (
                      <a
                        href={source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline text-inherit transition-all duration-150 hover:text-green-800 dark:hover:text-green-300"
                      >
                        {source}
                      </a>
                    ) : (
                      source
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
        <div className="w-8 h-8 rounded-full bg-amber-700 flex-shrink-0 ml-3 flex items-center justify-center text-white font-bold text-sm shadow-sm" aria-label={`User ${userInitial} avatar`}>
          {userInitial}
        </div>
      )}
    </div>
  );
};