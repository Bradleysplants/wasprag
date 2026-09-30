// src/server/utils/conversationService.js
// This service handles storage, retrieval, and formatting of conversation history
// for the LLM context. It uses Prisma Client (via Wasp's context.entities.Message)
// for persistent storage in PostgreSQL.

import { CONVERSATION_CONFIG, formatConversationForAI } from '../../client/config/conversationConfig.js';

/**
 * Saves a message (user or assistant) to the database.
 * @param {Object} messageData - The message object to save.
 * @param {string} messageData.content - The message content.
 * @param {'user'|'assistant'} messageData.type - The type of message.
 * @param {Object} [messageData.metadata] - Optional metadata (sources, responseType, etc.).
 * @param {Object} context - Wasp context, containing `entities` and `user`.
 * @returns {Promise<Object>} The created message record.
 */
export async function saveMessage(messageData, context) {
  if (!context.user?.id) {
    throw new Error('User not authenticated for saving message.');
  }

  const { content, type, metadata } = messageData;

  const data = {
    content,
    type,
    userId: context.user.id,
    sources: metadata?.sources || null,
    responseType: metadata?.responseType || null,
    entities: metadata?.entities || null,
    plantCount: metadata?.plantCount || null,
    reasoning: metadata?.reasoning || null,
  };

  try {
    const createdMessage = await context.entities.Message.create({ data });
    console.log(`[ConversationService] Saved ${type} message (ID: ${createdMessage.id}) for user ${context.user.id}`);
    return createdMessage;
  } catch (error) {
    console.error(`[ConversationService] Error saving message for user ${context.user.id}:`, error);
    throw new Error('Failed to save message to database.');
  }
}

/**
 * Retrieves the most recent conversation history for a user, formatted for the LLM.
 * Applies CONTEXT_MESSAGE_LIMIT.
 *
 * @param {number} userId - The ID of the user.
 * @param {Object} context - Wasp context, containing `entities`.
 * @returns {Promise<Array<Object>>} A formatted array of messages suitable for LLM context.
 */
export async function getConversationHistoryForLLM(userId, context) {
  if (!userId) {
    throw new Error('User ID is required to fetch conversation history.');
  }

  try {
    // Fetch messages, ordered by createdAt, taking the latest ones
    const messages = await context.entities.Message.findMany({
      where: {
        userId: userId,
        // Optional: Filter for message types relevant to LLM context if not all message types should be included
        // type: { in: CONVERSATION_CONFIG.CONTEXT_MESSAGE_TYPES }, 
      },
      orderBy: {
        createdAt: 'desc', // Get most recent first
      },
      take: CONVERSATION_CONFIG.CONTEXT_MESSAGE_LIMIT,
    });

    // Reverse to get oldest first, then format for AI
    const orderedMessages = messages.reverse(); 
    const formattedHistory = formatConversationForAI(orderedMessages, CONVERSATION_CONFIG.CONTEXT_MESSAGE_LIMIT);

    if (CONVERSATION_CONFIG.DEBUG.LOG_CONTEXT_MESSAGES) {
      console.log(`[ConversationService] Retrieved ${formattedHistory.length} messages for LLM context for user ${userId}`);
      console.log('[ConversationService] LLM Context messages:', formattedHistory.map(m => `${m.role}: ${m.content.slice(0, 50)}...`));
    }

    return formattedHistory;
  } catch (error) {
    console.error(`[ConversationService] Error fetching LLM conversation history for user ${userId}:`, error);
    return []; // Return empty array on error to allow RAG to proceed with less context
  }
}

/**
 * Retrieves ALL messages for a user, primarily for populating client-side UI.
 *
 * @param {number} userId - The ID of the user.
 * @param {Object} context - Wasp context, containing `entities`.
 * @returns {Promise<Array<Object>>} An array of raw message objects.
 */
export async function getAllMessagesForUser(userId, context) {
  if (!userId) {
    throw new Error('User ID is required to fetch all messages.');
  }

  try {
    const messages = await context.entities.Message.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: 'asc', // Order oldest to newest for chronological display
      },
      take: CONVERSATION_CONFIG.MAX_STORED_MESSAGES, // Limit for client display if desired
    });
    console.log(`[ConversationService] Retrieved ${messages.length} messages for client display for user ${userId}`);
    return messages;
  } catch (error) {
    console.error(`[ConversationService] Error fetching all messages for user ${userId}:`, error);
    return []; // Return empty array on error
  }
}

/**
 * Deletes old messages for a user.
 * @param {number} userId - The ID of the user.
 * @param {number} olderThanDays - Messages older than this many days will be deleted.
 * @param {Object} context - Wasp context, containing `entities`.
 * @returns {Promise<Object>} The count of deleted messages.
 */
export async function deleteOldMessages(userId, olderThanDays, context) {
  if (!userId) {
    throw new Error('User ID is required for deleting old messages.');
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  try {
    const deleted = await context.entities.Message.deleteMany({
      where: {
        userId: userId,
        createdAt: {
          lt: cutoffDate, // Less than cutoff date
        },
      },
    });
    console.log(`[ConversationService] Deleted ${deleted.count} old messages for user ${userId}`);
    return { deletedCount: deleted.count };
  } catch (error) {
    console.error(`[ConversationService] Error deleting old messages for user ${userId}:`, error);
    throw new Error('Failed to delete old messages.');
  }
}