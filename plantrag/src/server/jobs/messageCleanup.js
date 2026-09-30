// src/server/jobs/messageCleanup.js
// Server-side job to clean up old message data

// Configuration
const CLEANUP_CONFIG = {
  // Delete messages older than this (in days)
  MAX_MESSAGE_AGE_DAYS: 7,
  
  // Keep at least this many recent messages per user
  MIN_MESSAGES_TO_KEEP: 5,
  
  // Maximum messages to process in one batch
  BATCH_SIZE: 100,
  
  // Log cleanup operations
  ENABLE_LOGGING: true
};

export const messageCleanup = async (_args, context) => {
  const startTime = new Date();
  let cleanupStats = {
    usersProcessed: 0,
    messagesDeleted: 0,
    errors: 0,
    duration: 0
  };

  try {
    if (CLEANUP_CONFIG.ENABLE_LOGGING) {
      console.log('[MessageCleanup] Starting weekly message cleanup job...');
    }

    // Calculate cutoff date (messages older than this will be deleted)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_CONFIG.MAX_MESSAGE_AGE_DAYS);
    
    // Server-side cleanup for database messages (if you have Message entity)
    try {
      // Find all messages older than cutoff date
      const oldMessages = await context.entities.Message.findMany({
        where: {
          createdAt: {
            lt: cutoffDate
          }
        },
        include: {
          user: true
        },
        orderBy: {
          createdAt: 'asc' // Oldest first
        }
      });

      if (CLEANUP_CONFIG.ENABLE_LOGGING) {
        console.log(`[MessageCleanup] Found ${oldMessages.length} messages older than ${CLEANUP_CONFIG.MAX_MESSAGE_AGE_DAYS} days`);
      }

      // Group messages by user to ensure we keep minimum per user
      const messagesByUser = {};
      oldMessages.forEach(msg => {
        if (!messagesByUser[msg.userId]) {
          messagesByUser[msg.userId] = [];
        }
        messagesByUser[msg.userId].push(msg);
      });

      // Process each user's messages
      for (const [userId, userMessages] of Object.entries(messagesByUser)) {
        try {
          // Get total message count for this user
          const totalMessages = await context.entities.Message.count({
            where: { userId: parseInt(userId) }
          });

          // Calculate how many we can safely delete
          const messagesToKeep = Math.max(CLEANUP_CONFIG.MIN_MESSAGES_TO_KEEP, totalMessages - userMessages.length);
          const canDelete = Math.max(0, totalMessages - messagesToKeep);

          if (canDelete > 0 && userMessages.length > 0) {
            // Sort by creation date and delete oldest first
            const messagesToDelete = userMessages
              .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
              .slice(0, Math.min(canDelete, userMessages.length));

            if (CLEANUP_CONFIG.ENABLE_LOGGING) {
              console.log(`[MessageCleanup] User ${userId}: ${totalMessages} total, deleting ${messagesToDelete.length} oldest messages`);
            }

            // Delete messages in batches
            for (let i = 0; i < messagesToDelete.length; i += CLEANUP_CONFIG.BATCH_SIZE) {
              const batch = messagesToDelete.slice(i, i + CLEANUP_CONFIG.BATCH_SIZE);
              const messageIds = batch.map(msg => msg.id);

              await context.entities.Message.deleteMany({
                where: {
                  id: {
                    in: messageIds
                  }
                }
              });

              cleanupStats.messagesDeleted += batch.length;
            }
          } else {
            if (CLEANUP_CONFIG.ENABLE_LOGGING) {
              console.log(`[MessageCleanup] User ${userId}: Keeping all ${totalMessages} messages (within limits)`);
            }
          }

          cleanupStats.usersProcessed++;
        } catch (userError) {
          console.error(`[MessageCleanup] Error processing user ${userId}:`, userError);
          cleanupStats.errors++;
        }
      }

      // Also clean up orphaned messages (messages without valid users)
      const orphanedMessages = await context.entities.Message.findMany({
        where: {
          user: null
        }
      });

      if (orphanedMessages.length > 0) {
        await context.entities.Message.deleteMany({
          where: {
            user: null
          }
        });
        cleanupStats.messagesDeleted += orphanedMessages.length;
        
        if (CLEANUP_CONFIG.ENABLE_LOGGING) {
          console.log(`[MessageCleanup] Deleted ${orphanedMessages.length} orphaned messages`);
        }
      }

    } catch (dbError) {
      if (dbError.message.includes('Unknown arg `user`') || dbError.message.includes('Unknown arg `Message`')) {
        // Message entity doesn't exist yet - this is normal if using only localStorage
        if (CLEANUP_CONFIG.ENABLE_LOGGING) {
          console.log('[MessageCleanup] No server-side Message entity found. Skipping database cleanup.');
          console.log('[MessageCleanup] Messages are stored in client localStorage only.');
        }
      } else {
        throw dbError; // Re-throw unexpected database errors
      }
    }

    // Create a cleanup notification that clients can check
    try {
      await context.entities.SystemNotification.create({
        data: {
          type: 'MESSAGE_CLEANUP',
          message: 'Weekly message cleanup completed',
          data: JSON.stringify(cleanupStats),
          createdAt: new Date()
        }
      });
    } catch (notificationError) {
      // Notification entity might not exist - that's okay
      if (CLEANUP_CONFIG.ENABLE_LOGGING) {
        console.log('[MessageCleanup] Could not create cleanup notification (entity may not exist)');
      }
    }
    
  } catch (error) {
    console.error('[MessageCleanup] Job failed:', error);
    cleanupStats.errors++;
  } finally {
    cleanupStats.duration = new Date() - startTime;
    
    if (CLEANUP_CONFIG.ENABLE_LOGGING) {
      console.log('[MessageCleanup] Job completed:', {
        ...cleanupStats,
        duration: `${cleanupStats.duration}ms`,
        cutoffDate: cutoffDate.toISOString(),
        summary: `Processed ${cleanupStats.usersProcessed} users, deleted ${cleanupStats.messagesDeleted} messages`
      });
    }
  }

  return cleanupStats;
};