// src/client/components/MessageCleanupButton.jsx
// Component for triggering message cleanup

import React, { useState, useEffect } from 'react';
// Import the server-side action for deleting all user messages
import { deleteAllUserMessages } from 'wasp/client/operations'; 
// Assuming clientMessageCleanup is for local preview/logging, not actual deletion persistence
import { clientMessageCleanup } from '../utils/clientMessageCleanup.js';
import { useMessageStore } from '../stores/messageStore.js'; // Import useMessageStore to clear client messages

// Initial greeting constant
const INITIAL_GREETING = {
  id: '0',
  content: `Hello! I'm your Botanical Assistant 🌱. I'm powered by advanced NER + Ollama AI. I can answer plant questions and chat with you!`,
  type: 'assistant',
  timestamp: new Date().toISOString(),
};

export const MessageCleanupButton = ({ currentUserId, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [lastCleanup, setLastCleanup] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState(null);

  // Get actions from Zustand store
  const clearClientMessages = useMessageStore((state) => state.clearMessages);
  const setMessages = useMessageStore((state) => state.setMessages);

  // Load preview and last cleanup date when modal opens
  useEffect(() => {
    if (isOpen && clientMessageCleanup) {
      try {
        setPreview(clientMessageCleanup.getCleanupPreview()); 
        setLastCleanup(clientMessageCleanup.getLastCleanupDate());
      } catch (error) {
        console.warn('[MessageCleanupButton] Error loading preview:', error);
      }
    }
  }, [isOpen]);

  const handleCleanup = async () => {
    setIsLoading(true);
    setCleanupResult(null);

    try {
      if (!currentUserId) {
        throw new Error('User not authenticated. Cannot perform cleanup.');
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete ALL your conversation history? This action cannot be undone.`
      );

      if (!confirmed) {
        setIsLoading(false);
        return;
      }

      console.log('[MessageCleanupButton] Starting message cleanup...');

      // Call the server-side deleteAllUserMessages action
      const result = await deleteAllUserMessages(); // No args needed, userId from context.user.id
      
      console.log('[MessageCleanupButton] Server cleanup result:', result);

      setCleanupResult({
        success: true,
        users: 1, // Always 1 user for this action
        totalDeleted: result.count, // Use count returned from the server operation
        totalKept: 0, // All messages deleted for this user
        errors: 0,
        details: [{ userId: currentUserId, deleted: result.count, kept: 0 }]
      });

      // After successful server-side deletion, clear client-side messages
      clearClientMessages(); 
      
      // Reset with initial greeting
      setMessages([INITIAL_GREETING]);

      // Update preview state if clientMessageCleanup is available
      if (clientMessageCleanup) {
        try {
          setPreview(clientMessageCleanup.getCleanupPreview());
          setLastCleanup(new Date()); // Update last cleanup date to now
        } catch (error) {
          console.warn('[MessageCleanupButton] Error updating preview after cleanup:', error);
        }
      }
      
    } catch (error) {
      console.error('[MessageCleanupButton] Cleanup failed:', error);
      setCleanupResult({ 
        success: false,
        error: error.message || 'An unexpected error occurred during cleanup'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <>
      {/* Cleanup Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`
          flex items-center space-x-2 px-3 py-2 rounded-lg
          bg-gray-600 hover:bg-gray-500 text-gray-200
          transition-colors text-sm
          ${className}
        `}
        title="Manage message storage"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span className="hidden sm:inline">Cleanup</span>
      </button>

      {/* Cleanup Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                🧹 Message Cleanup
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Cleanup Info */}
            <div className="space-y-4">
              {/* Last Cleanup */}
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <strong>Last cleanup:</strong> {formatDate(lastCleanup)}
              </div>

              {/* Preview Stats */}
              {preview && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Current Storage:</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-300">Users:</span>
                      <span className="ml-2 font-medium">{preview.users || '1'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-300">Total Messages:</span>
                      <span className="ml-2 font-medium">{preview.totalMessages || '0'}</span>
                    </div>
                    <div>
                      <span className="text-red-600 dark:text-red-400">Would Delete:</span>
                      <span className="ml-2 font-medium">{preview.totalWouldDelete || preview.totalMessages || '0'}</span>
                    </div>
                    <div>
                      <span className="text-green-600 dark:text-green-400">Would Keep:</span>
                      <span className="ml-2 font-medium">0</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Cleanup Result */}
              {cleanupResult && (
                <div className={`rounded-lg p-4 ${
                  cleanupResult.error || !cleanupResult.success
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200' 
                    : 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                }`}>
                  {cleanupResult.error || !cleanupResult.success ? (
                    <p>❌ Cleanup failed: {cleanupResult.error}</p>
                  ) : (
                    <div>
                      <p>✅ Cleanup completed!</p>
                      <div className="text-sm mt-2">
                        <p>• Deleted {cleanupResult.totalDeleted} messages</p>
                        <p>• Kept {cleanupResult.totalKept} recent messages</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col space-y-2">
                {/* Clean All My Messages */}
                {currentUserId && (
                  <button
                    onClick={handleCleanup}
                    disabled={isLoading}
                    className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Delete All My Messages</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Info */}
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                <p>• This action deletes ALL messages for your account.</p>
                <p>• This cannot be undone.</p>
                <p>• Your subscription usage count is preserved.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};