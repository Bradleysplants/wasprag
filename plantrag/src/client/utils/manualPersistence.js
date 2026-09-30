// src/client/utils/manualPersistence.js
// Manual localStorage persistence to avoid hydration issues

const STORAGE_PREFIX = 'botanical-assistant';

export const manualPersistence = {
  // Save messages for a specific user
  saveUserMessages: (userId, messages) => {
    if (!userId || typeof window === 'undefined') return;
    
    try {
      const key = `${STORAGE_PREFIX}-${userId}`;
      const dataToSave = {
        messages: messages.slice(-100), // Keep last 100
        savedAt: new Date().toISOString(),
        userId
      };
      
      localStorage.setItem(key, JSON.stringify(dataToSave));
      console.log(`[Persistence] Saved ${messages.length} messages for user ${userId}`);
    } catch (error) {
      console.error('[Persistence] Failed to save messages:', error);
    }
  },

  // Load messages for a specific user
  loadUserMessages: (userId) => {
    if (!userId || typeof window === 'undefined') return [];
    
    try {
      const key = `${STORAGE_PREFIX}-${userId}`;
      const stored = localStorage.getItem(key);
      
      if (!stored) return [];
      
      const data = JSON.parse(stored);
      
      // Validate the data
      if (data.userId === userId && Array.isArray(data.messages)) {
        console.log(`[Persistence] Loaded ${data.messages.length} messages for user ${userId}`);
        return data.messages;
      }
      
      return [];
    } catch (error) {
      console.error('[Persistence] Failed to load messages:', error);
      return [];
    }
  },

  // Clear messages for a specific user
  clearUserMessages: (userId) => {
    if (!userId || typeof window === 'undefined') return;
    
    try {
      const key = `${STORAGE_PREFIX}-${userId}`;
      localStorage.removeItem(key);
      console.log(`[Persistence] Cleared messages for user ${userId}`);
    } catch (error) {
      console.error('[Persistence] Failed to clear messages:', error);
    }
  },

  // List all stored user IDs
  getAllStoredUserIds: () => {
    if (typeof window === 'undefined') return [];
    
    try {
      const userIds = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          const userId = key.replace(`${STORAGE_PREFIX}-`, '');
          userIds.push(userId);
        }
      }
      return userIds;
    } catch (error) {
      console.error('[Persistence] Failed to get stored user IDs:', error);
      return [];
    }
  }
};