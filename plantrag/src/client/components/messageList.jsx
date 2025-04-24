// src/client/components/MessageList.jsx
import React, { useEffect, useRef } from 'react';
import { MessageItem } from './messageItem';
import { LoadingIndicator } from './loadingIndicator';

export const MessageList = ({ messages, isLoading, userInitial }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white">
      <div className="max-w-3xl mx-auto space-y-4">
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            userInitial={userInitial}
          />
        ))}
        {isLoading && <LoadingIndicator />}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};