// src/client/utils/userConversationUtils.js
// Utilities for managing user-specific conversations (client-side only)

export const getUserId = (user) => {
  // Try different ways to get a unique user identifier
  if (!user) return null;
  
  // Wasp auth usually provides user.id
  if (user.id) return user.id;
  
  // Fallback to email
  if (user.email) return user.email;
  
  // Fallback to username
  if (user.username) return user.username;
  
  // Check nested user object (sometimes Wasp nests user data)
  if (user.user?.id) return user.user.id;
  if (user.user?.email) return user.user.email;
  if (user.user?.username) return user.user.username;
  
  // Last resort - generate a stable ID from available data
  const userData = JSON.stringify(user);
  return `user_${btoa(userData).slice(0, 8)}`;
};

export const exportUserConversation = (messages, userId) => {
  const exportData = {
    userId,
    exportDate: new Date().toISOString(),
    messageCount: messages.length - 1, // Exclude greeting
    messages: messages.slice(1) // Exclude greeting
  };
  
  const dataStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `botanical-conversation-${userId}-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const getConversationSummary = (messages) => {
  const userMessages = messages.filter(m => m.type === 'user');
  const assistantMessages = messages.filter(m => m.type === 'assistant' && m.id !== '0');
  
  const plantMentions = messages
    .filter(m => m.entities && m.entities.length > 0)
    .flatMap(m => m.entities.map(e => e.word))
    .filter((plant, index, arr) => arr.indexOf(plant) === index); // Unique plants
  
  return {
    totalMessages: messages.length - 1,
    userQuestions: userMessages.length,
    aiResponses: assistantMessages.length,
    plantsDiscussed: plantMentions,
    firstMessageDate: userMessages[0]?.timestamp,
    lastMessageDate: messages[messages.length - 1]?.timestamp,
    conversationDuration: userMessages[0] && messages[messages.length - 1] 
      ? new Date(messages[messages.length - 1].timestamp) - new Date(userMessages[0].timestamp)
      : 0
  };
};

// Removed the saveMessage and deleteOldMessages functions, as they are now
// server-side operations managed by conversationService.js and exposed via Wasp.
