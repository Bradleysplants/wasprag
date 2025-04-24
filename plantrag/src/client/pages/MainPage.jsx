// src/client/pages/MainPage.jsx (Corrected for Direct Action Import)
import React, { useState, useCallback } from 'react';

// --- Import the action directly ---
import { searchBotanicalInfo } from 'wasp/client/operations';
// --- Remove useAction import ---
// import { useAction } from 'wasp/client/operations';

import { getUserDisplayNameFromUser } from '../utils/authUtils';
import { MessageList } from '../components/messageList.jsx';
import { MessageInput } from '../components/messageInputs';
// Remove React Query import
// import { useQuery, useMutation } from '@tanstack/react-query';

export const MainPage = ({ user }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { id: '0', content: `Hello! I'm your Botanical Assistant 🌱. Ask me anything about plants!`, type: 'assistant' }
  ]);
  // --- isLoading state is still useful ---
  const [isLoading, setIsLoading] = useState(false);
  // ----------------------------------------

  // --- No useAction hook needed ---
  // const searchBotanicalInfoAction = useAction('searchBotanicalInfo'); // REMOVE THIS
  // --------------------------------

  const getUserInitial = useCallback(() => {
    const displayName = getUserDisplayNameFromUser(user);
    return displayName ? displayName[0].toUpperCase() : 'U';
  }, [user]);

  const handleSubmit = useCallback(async (e) => {
    if (e) e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    const userMessage = { id: Date.now().toString(), content: trimmedInput, type: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true); // Set loading before the call

    try {
      // --- Call the imported action function directly ---
      // Pass the arguments object { query: ... }
      console.log(`Calling searchBotanicalInfo with: { query: "${trimmedInput}" }`);
      const response = await searchBotanicalInfo({ query: trimmedInput });
      console.log("Received response from searchBotanicalInfo:", response);
      // -------------------------------------------------

      // Process the response
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        content: response?.answer || "Hmm, I couldn't find a specific answer for that.", // Add safe navigation
        type: 'assistant',
        sources: response?.sources // Add safe navigation
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      // Wasp actions throw errors directly (often HttpError instances)
      console.error('Error fetching botanical info:', err);
      // Extract message more robustly from potential HttpError
      const errorMsgFromServer = err?.data?.message // Check HttpError structure
                              || err?.message       // Check standard Error structure
                              || 'Failed to fetch information. Please try again.';
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        content: `😥 Sorry, an error occurred: ${errorMsgFromServer}`,
        type: 'assistant'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false); // Reset loading state
    }
  // Dependency array only needs `input` now, as `searchBotanicalInfo` is a stable import
  }, [input]); // Removed searchBotanicalInfoAction

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <MessageList
        messages={messages}
        isLoading={isLoading}
        userInitial={getUserInitial()}
      />
      <MessageInput
        input={input}
        isLoading={isLoading}
        onInputChange={setInput}
        onSubmit={handleSubmit}
      />
    </div>
  );
};