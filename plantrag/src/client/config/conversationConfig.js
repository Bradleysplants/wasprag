// src/client/config/conversationConfig.js
// Configuration for conversation context management

export const CONVERSATION_CONFIG = {
  // Number of recent messages to send to AI for context
  // This limit will now be applied server-side when fetching from DB
  CONTEXT_MESSAGE_LIMIT: 5,
  
  // Maximum messages to store per user in the database
  MAX_STORED_MESSAGES: 100, // This limit will be enforced by server-side cleanup or fetches
  
  // Debounce delay for saving messages (ms) - NO LONGER USED CLIENT-SIDE for persistence
  SAVE_DEBOUNCE_DELAY: 1000, 
  
  // AI model context settings
  AI_CONTEXT: {
    // These now guide the server-side prompt construction in ragPipeline
    // Include system messages in context
    INCLUDE_SYSTEM_MESSAGES: true, // System message will be added directly in ragPipeline
    
    // Include assistant messages in context
    INCLUDE_ASSISTANT_MESSAGES: true,
    
    // Include user messages in context
    INCLUDE_USER_MESSAGES: true,
    
    // Maximum tokens to send (approximate) - now used server-side
    MAX_CONTEXT_TOKENS: 2000
  },
  
  // Message types that count towards context limit (used server-side)
  CONTEXT_MESSAGE_TYPES: ['user', 'assistant'], // System message is handled separately
  
  // Debug logging
  DEBUG: {
    LOG_CONTEXT_MESSAGES: true, // Now primarily server-side logs
    LOG_SAVE_OPERATIONS: true,   // Now primarily server-side logs
    LOG_USER_SWITCHES: true
  }
};

// Helper function to get formatted conversation history for AI
// This function will now be used on the server side (in conversationService.js)
export const formatConversationForAI = (messages, limit = CONVERSATION_CONFIG.CONTEXT_MESSAGE_LIMIT) => {
  return messages
    .filter(msg => CONVERSATION_CONFIG.CONTEXT_MESSAGE_TYPES.includes(msg.type))
    .slice(-limit) // Ensure we take the last 'limit' messages
    .map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content,
      // For server-side, `createdAt` from Prisma is probably better than `timestamp`
      timestamp: msg.createdAt || msg.timestamp // Use createdAt if available (from DB)
    }));
};

// Helper to estimate token count (rough approximation) - now used server-side
export const estimateTokenCount = (messages) => {
  return messages.reduce((total, msg) => {
    // Rough estimation: ~4 chars per token
    return total + Math.ceil(msg.content.length / 4);
  }, 0);
};