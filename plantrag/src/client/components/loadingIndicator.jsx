// src/client/components/LoadingIndicator.jsx
import React from 'react';

export const LoadingIndicator = () => {
  return (
    <div className="flex items-start justify-start">
      <div className="w-8 h-8 rounded-full bg-earth-brown flex-shrink-0 mr-3 flex items-center justify-center text-white text-sm font-bold shadow-sm" aria-label="Botanical Assistant avatar">
        🌱
      </div>

      <div className="bg-neutral-light text-neutral-medium rounded-lg px-4 py-3 shadow-subtle rounded-bl-none flex items-center border border-neutral-medium/20">
        <div className="flex space-x-1.5">
          <div className="h-2 w-2 bg-earth-brown rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="h-2 w-2 bg-earth-brown rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="h-2 w-2 bg-earth-brown rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  );
};