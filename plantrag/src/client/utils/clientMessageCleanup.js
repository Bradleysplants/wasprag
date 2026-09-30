// src/client/utils/clientMessageCleanup.js
// Client-side message cleanup for localStorage

import { manualPersistence } from './manualPersistence.js';
import { CONVERSATION_CONFIG } from '../config/conversationConfig.js';

const CLEANUP_CONFIG = {
  // Delete messages older than this (in days)
  MAX_MESSAGE_AGE_DAYS: 7,
  
  // Keep at least this many recent messages per user
  MIN_MESSAGES_TO_KEEP: 5,
  
  // Auto-cleanup on app start if last cleanup was more than this many days ago
  AUTO_CLEANUP_INTERVAL_DAYS: 7,
  
  // localStorage key to track last cleanup
  LAST_CLEANUP_KEY: 'botanical-assistant-last-cleanup'
};

export const clientMessageCleanup = {
  // Perform cleanup for a specific user
  cleanupUserMessages: (userId) => {
    if (!userId || typeof window === 'undefined') return { deleted: 0, kept: 0 };

    try {
      const messages = manualPersistence.loadUserMessages(userId);
      if (messages.length === 0) return { deleted: 0, kept: 0 };

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_CONFIG.MAX_MESSAGE_AGE_DAYS);

      // Filter messages by age
      const recentMessages = messages.filter(msg => {
        const messageDate = new Date(msg.timestamp);
        return messageDate > cutoffDate;
      });

      // Ensure we keep at least the minimum number of messages
      const messagesToKeep = recentMessages.length >= CLEANUP_CONFIG.MIN_MESSAGES_TO_KEEP 
        ? recentMessages 
        : messages.slice(-CLEANUP_CONFIG.MIN_MESSAGES_TO_KEEP);

      const deletedCount = messages.length - messagesToKeep.length;

      if (deletedCount > 0) {
        // Save the cleaned up messages
        manualPersistence.saveUserMessages(userId, messagesToKeep);
        console.log(`[ClientCleanup] User ${userId}: Deleted ${deletedCount} old messages, kept ${messagesToKeep.length}`);
      }

      return {
        deleted: deletedCount,
        kept: messagesToKeep.length,
        totalOriginal: messages.length
      };
    } catch (error) {
      console.error(`[ClientCleanup] Error cleaning up messages for user ${userId}:`, error);
      return { deleted: 0, kept: 0, error: error.message };
    }
  },

  // Cleanup all users' messages
  cleanupAllUsers: () => {
    if (typeof window === 'undefined') return { users: 0, totalDeleted: 0, errors: 0 };

    const stats = {
      users: 0,
      totalDeleted: 0,
      totalKept: 0,
      errors: 0,
      details: []
    };

    try {
      const userIds = manualPersistence.getAllStoredUserIds();
      console.log(`[ClientCleanup] Starting cleanup for ${userIds.length} users`);

      userIds.forEach(userId => {
        try {
          const result = clientMessageCleanup.cleanupUserMessages(userId);
          stats.users++;
          stats.totalDeleted += result.deleted;
          stats.totalKept += result.kept;
          stats.details.push({
            userId,
            deleted: result.deleted,
            kept: result.kept,
            totalOriginal: result.totalOriginal
          });
        } catch (error) {
          stats.errors++;
          console.error(`[ClientCleanup] Error processing user ${userId}:`, error);
        }
      });

      // Record cleanup timestamp
      localStorage.setItem(CLEANUP_CONFIG.LAST_CLEANUP_KEY, new Date().toISOString());

      console.log('[ClientCleanup] Cleanup completed:', stats);
      return stats;
    } catch (error) {
      console.error('[ClientCleanup] Cleanup failed:', error);
      stats.errors++;
      return stats;
    }
  },

  // Check if auto-cleanup should run
  shouldAutoCleanup: () => {
    if (typeof window === 'undefined') return false;

    try {
      const lastCleanup = localStorage.getItem(CLEANUP_CONFIG.LAST_CLEANUP_KEY);
      if (!lastCleanup) return true; // Never cleaned up before

      const lastCleanupDate = new Date(lastCleanup);
      const daysSinceCleanup = (new Date() - lastCleanupDate) / (1000 * 60 * 60 * 24);

      return daysSinceCleanup >= CLEANUP_CONFIG.AUTO_CLEANUP_INTERVAL_DAYS;
    } catch (error) {
      console.error('[ClientCleanup] Error checking auto-cleanup status:', error);
      return false;
    }
  },

  // Get cleanup statistics without performing cleanup
  getCleanupPreview: (userId = null) => {
    if (typeof window === 'undefined') return null;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_CONFIG.MAX_MESSAGE_AGE_DAYS);

      if (userId) {
        // Preview for specific user
        const messages = manualPersistence.loadUserMessages(userId);
        const oldMessages = messages.filter(msg => new Date(msg.timestamp) <= cutoffDate);
        const wouldDelete = Math.max(0, messages.length - CLEANUP_CONFIG.MIN_MESSAGES_TO_KEEP);
        
        return {
          totalMessages: messages.length,
          oldMessages: oldMessages.length,
          wouldDelete: Math.min(wouldDelete, oldMessages.length),
          wouldKeep: messages.length - Math.min(wouldDelete, oldMessages.length)
        };
      } else {
        // Preview for all users
        const userIds = manualPersistence.getAllStoredUserIds();
        let totalMessages = 0;
        let totalOldMessages = 0;
        let totalWouldDelete = 0;

        userIds.forEach(uid => {
          const preview = clientMessageCleanup.getCleanupPreview(uid);
          if (preview) {
            totalMessages += preview.totalMessages;
            totalOldMessages += preview.oldMessages;
            totalWouldDelete += preview.wouldDelete;
          }
        });

        return {
          users: userIds.length,
          totalMessages,
          totalOldMessages,
          totalWouldDelete,
          totalWouldKeep: totalMessages - totalWouldDelete
        };
      }
    } catch (error) {
      console.error('[ClientCleanup] Error generating cleanup preview:', error);
      return null;
    }
  },

  // Get last cleanup date
  getLastCleanupDate: () => {
    if (typeof window === 'undefined') return null;
    
    try {
      const lastCleanup = localStorage.getItem(CLEANUP_CONFIG.LAST_CLEANUP_KEY);
      return lastCleanup ? new Date(lastCleanup) : null;
    } catch (error) {
      return null;
    }
  }
};

// Auto-cleanup on module load (runs when app starts)
if (typeof window !== 'undefined') {
  // Run auto-cleanup after a short delay to not block app startup
  setTimeout(() => {
    if (clientMessageCleanup.shouldAutoCleanup()) {
      console.log('[ClientCleanup] Auto-cleanup triggered');
      clientMessageCleanup.cleanupAllUsers();
    }
  }, 5000); // 5 second delay
}