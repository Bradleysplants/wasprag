// src/server/actions/messageActions.js
// This file now delegates message persistence actions to the conversationService.

import { 
  saveMessage as saveMessageService, 
  deleteOldMessages as deleteOldMessagesService 
} from '../utils/conversationService.js';
import { HttpError } from 'wasp/server';

/**
 * Wasp action to save a message. Delegates to conversationService.
 * This function matches the signature expected by Wasp's `action saveMessage`.
 *
 * @param {Object} args - The message data (content, type, metadata).
 * @param {Object} context - Wasp context.
 * @returns {Promise<Object>} The created message record.
 */
export const saveMessage = async (args, context) => {
  console.log('[messageActions] saveMessage action called. Delegating to conversationService.');
  // The saveMessageService expects the message data directly as the first argument.
  return saveMessageService(args, context);
};

/**
 * Wasp action to delete old messages for the authenticated user.
 * Delegates to conversationService.
 * This function matches the signature expected by Wasp's `action deleteOldMessages`.
 *
 * @param {Object} args - Contains `olderThanDays`.
 * @param {number} args.olderThanDays - Messages older than this will be deleted.
 * @param {Object} context - Wasp context.
 * @returns {Promise<Object>} The count of deleted messages.
 */
export const deleteOldMessages = async (args, context) => {
  console.log('[messageActions] deleteOldMessages action called. Delegating to conversationService.');
  if (!context.user?.id) {
    throw new Error('User not authenticated for deleting old messages.');
  }
  // The deleteOldMessagesService expects userId, olderThanDays, context.
  return deleteOldMessagesService(context.user.id, args.olderThanDays, context);
};

/**
 * Wasp action to delete ALL messages for the authenticated user.
 * This clears the entire conversation history but preserves subscription usage count.
 *
 * @param {Object} args - No args needed, uses context.user.id
 * @param {Object} context - Wasp context with user and entities
 * @returns {Promise<Object>} The count of deleted messages
 */
export const deleteAllUserMessages = async (args, context) => {
  console.log('[messageActions] deleteAllUserMessages action called.');
  
  // Check authentication
  if (!context.user?.id) {
    throw new HttpError(401, 'User not authenticated for deleting messages.');
  }

  try {
    const userId = context.user.id;
    console.log(`[messageActions] Deleting ALL messages for user: ${userId}`);

    // Option 1: Hard delete (if subscription count is tracked separately)
    const deleteResult = await context.entities.Message.deleteMany({
      where: {
        userId: userId
      }
    });

    console.log(`[messageActions] Successfully deleted ${deleteResult.count} messages for user ${userId}`);
    
    return {
      success: true,
      count: deleteResult.count,
      userId: userId
    };

    // Option 2: Soft delete (uncomment if you need to preserve records for subscription count)
    /*
    const updateResult = await context.entities.Message.updateMany({
      where: {
        userId: userId,
        isDeleted: { not: true } // Only update non-deleted messages
      },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });

    console.log(`[messageActions] Successfully soft-deleted ${updateResult.count} messages for user ${userId}`);
    
    return {
      success: true,
      count: updateResult.count,
      userId: userId
    };
    */

  } catch (error) {
    console.error('[messageActions] Error deleting all user messages:', error);
    throw new HttpError(500, `Failed to delete messages: ${error.message}`);
  }
};