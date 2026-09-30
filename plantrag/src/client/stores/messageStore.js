// src/client/stores/messageStore.js
// Zustand store for client-side message display (no persistence here)

import { create } from 'zustand';

const INITIAL_GREETING = {
  id: '0',
  content: `Hello! I'm your Botanical Assistant 🌱. I'm powered by advanced NER + Ollama AI. I can answer plant questions and chat with you!`,
  type: 'assistant',
  timestamp: new Date().toISOString()
};

export const useMessageStore = create((set, get) => ({
  // State
  messages: [INITIAL_GREETING],
  currentUserId: null,
  isLoading: false,
  systemHealth: { healthy: true },

  // Actions
  setCurrentUser: (userId) => {
    const { currentUserId } = get();
    
    // If user changed, reset messages to greeting only (this will be immediately overwritten by server messages)
    if (currentUserId !== userId) {
      set({ 
        currentUserId: userId,
        messages: [INITIAL_GREETING] // Reset client-side messages
      });
      console.log(`[MessageStore] Switched to user: ${userId}, messages reset client-side.`);
    }
  },

  addMessage: (message) => {
    const newMessage = {
      ...message,
      id: message.id || Date.now().toString(), // Ensure client-side ID if server-ID is number
      timestamp: message.timestamp || new Date().toISOString()
    };
    
    set((state) => ({
      messages: [...state.messages, newMessage]
    }));
  },

  addUserMessage: (content) => {
    const userMessage = {
      id: Date.now().toString(), // Client-side ID for immediate display
      content: content.trim(),
      type: 'user',
      timestamp: new Date().toISOString()
    };
    
    set((state) => ({
      messages: [...state.messages, userMessage]
    }));
    
    return userMessage;
  },

  addAssistantMessage: (content, metadata = {}) => {
    const assistantMessage = {
      id: (Date.now() + 1).toString(), // Client-side ID for immediate display
      content,
      type: 'assistant',
      timestamp: new Date().toISOString(),
      ...metadata // sources, responseType, entities, etc.
    };
    
    set((state) => ({
      messages: [...state.messages, assistantMessage]
    }));
    
    return assistantMessage;
  },

  updateLastMessage: (updates) => {
    set((state) => ({
      messages: state.messages.map((msg, index) => 
        index === state.messages.length - 1 
          ? { ...msg, ...updates }
          : msg
      )
    }));
  },

  setLoading: (loading) => set({ isLoading: loading }),

  setSystemHealth: (health) => set({ systemHealth: health }),

  // This is crucial: allows MainPage to set messages from server
  setMessages: (messages) => set({ messages }), 

  clearMessages: () => {
    set({ messages: [INITIAL_GREETING] });
  },

  clearUserData: () => {
    set({ 
      messages: [INITIAL_GREETING],
      currentUserId: null,
      isLoading: false,
      systemHealth: { healthy: true }
    });
  },

  // Getters (now primarily for UI, not LLM context)
  getConversationHistory: (messageLimit = 5) => {
    const { messages } = get();
    // Exclude greeting, return only the last N messages for UI context
    return messages.slice(1).slice(-messageLimit); 
  },

  getFullConversationHistory: () => {
    const { messages } = get();
    return messages.slice(1); // Exclude greeting, return all messages
  },

  getLastMessage: () => {
    const { messages } = get();
    return messages[messages.length - 1];
  },

  getMessageCount: () => {
    const { messages } = get();
    return messages.length - 1; // Exclude greeting
  },

  getUserSpecificStats: () => {
    const { messages, currentUserId } = get();
    const userMessages = messages.filter(m => m.type === 'user');
    const assistantMessages = messages.filter(m => m.type === 'assistant' && m.id !== '0');
    
    return {
      userId: currentUserId,
      totalMessages: messages.length - 1, // Exclude greeting
      userMessages: userMessages.length,
      assistantMessages: assistantMessages.length,
      firstMessage: userMessages[0]?.timestamp,
      lastMessage: messages[messages.length - 1]?.timestamp
    };
  }
}));

// Convenience hooks for common operations
export const useMessages = () => useMessageStore((state) => state.messages);
export const useIsLoading = () => useMessageStore((state) => state.isLoading);
export const useSystemHealth = () => useMessageStore((state) => state.systemHealth);
export const useCurrentUserId = () => useMessageStore((state) => state.currentUserId);
