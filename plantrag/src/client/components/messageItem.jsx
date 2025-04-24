// src/client/components/MessageItem.jsx
import React from 'react';

export const MessageItem = ({ message, userInitial }) => {
  const isUser = message.type === 'user';

  return (
    <div className={`flex items-start ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-earth-brown flex-shrink-0 mr-3 flex items-center justify-center text-white text-sm font-bold shadow-sm" aria-label="Botanical Assistant avatar">
          🌱
        </div>
      )}

      <div
        className={`max-w-md md:max-w-lg rounded-lg px-4 py-3 shadow-subtle break-words ${
          isUser
            ? 'bg-plant-primary text-white rounded-br-none'
            : 'bg-neutral-light text-neutral-dark border border-neutral-medium/20 rounded-bl-none'
        }`}
      >
        <div className="text-sm whitespace-pre-wrap">{message.content}</div>

        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 pt-2 border-t border-neutral-medium/30 text-xs">
            <details className="cursor-pointer group">
              <summary className={`font-medium list-none select-none ${
                isUser ? 'text-plant-subtle group-hover:text-white' : 'text-plant-primary-dark group-hover:text-plant-primary'
              }`}>
                <span className="inline-block transition-transform duration-200 group-open:rotate-90 mr-1.5">▶</span>
                Sources
              </summary>
              <ul className={`mt-1.5 pl-5 list-disc space-y-1 ${
                 isUser ? 'text-plant-subtle/90' : 'text-neutral-medium'
              }`}>
                {message.sources.map((source, idx) => (
                  <li key={idx}>{source}</li>
                ))}
              </ul>
            </details>
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-earth-brown flex-shrink-0 ml-3 flex items-center justify-center text-white font-bold text-sm shadow-sm" aria-label={`User ${userInitial} avatar`}>
          {userInitial}
        </div>
      )}
    </div>
  );
};