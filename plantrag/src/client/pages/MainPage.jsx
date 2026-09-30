// src/client/pages/MainPage.jsx
// Fixed version with better race condition handling

import React, { useState, useCallback, useEffect } from 'react'
import {
  searchBotanicalInfo,
  processUserChat,
  getUserMessagesForDisplay,
  deleteAllUserMessages,
} from 'wasp/client/operations'
import { useQuery } from '@tanstack/react-query'
import { getUserDisplayNameFromUser } from '../utils/authUtils'
import { MessageList } from '../components/messageList.jsx'
import { MessageInput } from '../components/messageInputs.jsx'
import {
  getUserId,
  exportUserConversation,
  getConversationSummary,
} from '../utils/userConversationUtils.js'
import { CONVERSATION_CONFIG } from '../config/conversationConfig.js'
import {
  useSubscription,
} from '../components/subscriptionPaywall.jsx'
import {
  useMessageStore,
  useMessages,
  useIsLoading,
  useSystemHealth,
  useCurrentUserId,
} from '../stores/messageStore.js'

const INITIAL_GREETING = {
  id: '0',
  content: `Hello! I'm your Botanical Assistant 🌱. I'm powered by advanced NER + Ollama AI. I can answer plant questions and chat with you!`,
  type: 'assistant',
  timestamp: new Date().toISOString(),
}

export const MainPage = ({ user }) => {
  const [input, setInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false) // NEW: Track if currently submitting

  // Subscription hook
  const { canAskQuestion, subscription, isLoading: isSubscriptionLoading, refetch: refetchSubscription, optimisticallyDecrementCount } = useSubscription()

  // Zustand store
  const messages = useMessages()
  const isLoading = useIsLoading()
  const systemHealth = useSystemHealth()
  const currentUserId = useCurrentUserId()

  const {
    setCurrentUser,
    addUserMessage,
    addAssistantMessage,
    setLoading,
    setSystemHealth,
    clearMessages,
    clearUserData,
    setMessages,
  } = useMessageStore()

  // Fetch messages from server
  const {
    data: serverMessages,
    isLoading: isServerMessagesLoading,
    error: serverMessagesError,
  } = useQuery({
    queryKey: ['userMessages', currentUserId],
    queryFn: () => {
      if (currentUserId) {
        return getUserMessagesForDisplay()
      }
      return Promise.resolve([])
    },
    enabled: !!currentUserId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

  // Populate store with server messages
  useEffect(() => {
    if (serverMessages && !isServerMessagesLoading && currentUserId) {
      const clientMessages = [INITIAL_GREETING]
      serverMessages.forEach((msg) => {
        const clientMsg = {
          ...msg,
          id: msg.id.toString(),
          timestamp: msg.createdAt,
        }
        clientMessages.push(clientMsg)
      })
      setMessages(clientMessages)
      
      if (CONVERSATION_CONFIG.DEBUG.LOG_USER_SWITCHES) {
        console.log(
          `[MainPage] Restored ${serverMessages.length} messages from server for user ${currentUserId}`
        )
      }
    } else if (!currentUserId) {
      clearUserData()
    }
  }, [serverMessages, isServerMessagesLoading, currentUserId, setMessages, clearUserData])

  // Set current user
  useEffect(() => {
    if (user) {
      const userId = getUserId(user)
      setCurrentUser(userId)
    } else {
      clearUserData()
    }
  }, [user, setCurrentUser, clearUserData])

  // Initialize system health
  useEffect(() => {
    setSystemHealth({ healthy: true })
  }, [setSystemHealth])

  // Log user stats
  useEffect(() => {
    if (currentUserId && messages.length > 1) {
      const stats = getConversationSummary(messages)
      console.log('[MainPage] User conversation stats:', stats)
    }
  }, [currentUserId, messages.length])

  // Theme helper
  const getTheme = () => {
    const root = window.document.documentElement
    return root.classList.contains('dark') ? 'dark' : 'light'
  }

  const getUserInitial = useCallback(() => {
    const displayName = getUserDisplayNameFromUser(user)
    return displayName ? displayName[0].toUpperCase() : 'U'
  }, [user])

  // Export conversation
  const handleExportConversation = useCallback(() => {
    if (currentUserId && messages.length > 1) {
      exportUserConversation(messages, currentUserId)
    }
  }, [messages, currentUserId])

  // Clear chat
  const handleClearChat = useCallback(async () => {
    if (messages.length > 1) {
      const confirmed = window.confirm(
        'Are you sure you want to clear your conversation history? This cannot be undone.'
      )
      if (confirmed) {
        setLoading(true)
        
        try {
          // Clear messages from database first
          console.log('[MainPage] Clearing messages from database...')
          const result = await deleteAllUserMessages()
          
          console.log(`[MainPage] Successfully deleted ${result.count} messages from database`)
          
          // Clear messages from client-side store
          clearMessages()
          
          // Refresh subscription data after clearing
          refetchSubscription()
          
          // Show success message
          console.log('[MainPage] Conversation history cleared successfully')
          
        } catch (error) {
          console.error('[MainPage] Error clearing conversation history:', error)
          alert('Failed to clear conversation history. Please try again.')
        } finally {
          setLoading(false)
        }
      }
    }
  }, [messages.length, clearMessages, setLoading, refetchSubscription])

  // Handle message submit - FIXED for race conditions
  const handleSubmit = useCallback(
    async (e) => {
      if (e) e.preventDefault()
      const trimmedInput = input.trim()
      if (!trimmedInput) return

      // PREVENT MULTIPLE SIMULTANEOUS SUBMISSIONS
      if (isSubmitting || isLoading) {
        console.log('[MainPage] Already submitting or loading, ignoring duplicate request')
        return
      }

      // RELAXED CLIENT-SIDE CHECK: Only check if obviously out of questions
      // Let the server do the authoritative check
      if (subscription && subscription.questionsRemaining === 0) {
        console.log('[MainPage] User clearly out of questions based on cached data')
        return
      }

      // IMMEDIATELY mark as submitting to prevent race conditions
      setIsSubmitting(true)
      addUserMessage(trimmedInput)
      setInput('')
      setLoading(true)

      // OPTIMISTICALLY update question count for immediate UI feedback
      if (subscription && subscription.questionsRemaining !== -1) {
        optimisticallyDecrementCount()
      }

      try {
        console.log(`[MainPage] Sending message to server: "${trimmedInput}"`)
        
        const response = await processUserChat({
          message: trimmedInput,
        })

        console.log('[MainPage] Received response from server:', response)

        // REFRESH SUBSCRIPTION DATA IMMEDIATELY after successful message
        console.log('[MainPage] Refreshing subscription data after message...')
        refetchSubscription()

        let assistantContent = response?.answer || "I'm having trouble responding right now."

        // Enhanced context indicators
        if (response?.type === 'botanical' && response?.sources?.length > 0) {
          assistantContent += '\n\n📚 *Information from botanical database*'
        } else if (response?.type === 'botanical_llm') {
          assistantContent += '\n\n🤖 *AI-generated plant advice*'
        } else if (response?.type === 'plant_care') {
          assistantContent += '\n\n🌱 *Personalized plant care advice*'
        } else if (response?.type === 'mixed') {
          assistantContent += '\n\n🌱 *Combined database and AI response*'
        }

        if (response?.plantCount > 0) {
          assistantContent += `\n\n🔍 *Detected ${response.plantCount} plant${response.plantCount !== 1 ? 's' : ''} in your message*`
        }

        addAssistantMessage(assistantContent, {
          sources: response?.sources,
          responseType: response?.type,
          entities: response?.entities,
          plantCount: response?.plantCount,
          reasoning: response?.reasoning,
        })

        if (response?.entities?.length > 0) {
          console.log(
            '[MainPage] Plant entities detected:',
            response.entities.map((e) => e.word)
          )
        }
      } catch (err) {
        console.error('[MainPage] Chatbot error:', err)
        
        // CHECK IF IT'S A QUESTION LIMIT ERROR
        if (err.message && err.message.includes('Question limit reached')) {
          console.log('[MainPage] Question limit reached, refreshing subscription data')
          refetchSubscription() // Refresh to show updated limits
          
          // Show a user-friendly error
          const errorContent = `🚫 You've reached your question limit for this month. ${err.message.split('.')[1] || 'Upgrade your plan to continue asking questions!'}`
          
          addAssistantMessage(errorContent, {
            responseType: 'limit_error',
          })
        } else {
          // Handle other errors
          setSystemHealth({ healthy: false })

          const errorContent = `😥 I'm experiencing technical difficulties. This might be due to:

• Ollama service not running
• Network connectivity issues  
• Model loading problems

Please try again in a moment. If the problem persists, ensure your Ollama service is running.`

          addAssistantMessage(errorContent, {
            responseType: 'error',
          })
        }
      } finally {
        setLoading(false)
        setIsSubmitting(false) // ALWAYS clear the submitting flag
      }
    },
    [input, addUserMessage, addAssistantMessage, setLoading, setSystemHealth, subscription, isSubmitting, isLoading, refetchSubscription, optimisticallyDecrementCount]
  )

  // System status indicator
  const getSystemStatusIndicator = () => {
    if (isServerMessagesLoading) {
      return <span className="text-xs text-gray-500 dark:text-gray-400">🔄</span>
    }
    if (serverMessagesError) {
      return <span className="text-xs text-red-500 dark:text-red-400">🔴</span>
    }

    const isHealthy = systemHealth.healthy
    const isDarkTheme = getTheme() === 'dark'
    const statusColor = isHealthy
      ? isDarkTheme ? 'text-green-400' : 'text-green-600'
      : isDarkTheme ? 'text-yellow-400' : 'text-orange-600'
    const statusIcon = isHealthy ? '🟢' : '🟡'

    return <span className={`text-xs ${statusColor}`}>{statusIcon}</span>
  }

  // Get subscription status info
  const getSubscriptionStatusInfo = () => {
    if (!subscription) return null

    const { questionsRemaining, plan } = subscription
    const isUnlimited = questionsRemaining === -1
    const isLowQuestions = questionsRemaining <= 3 && questionsRemaining > 0
    const isOutOfQuestions = questionsRemaining === 0

    return {
      plan: plan || 'Free',
      questionsText: isUnlimited ? 'Unlimited' : `${questionsRemaining || 0} left`,
      questionsColor: isOutOfQuestions ? 'text-red-400' : 
                     isLowQuestions ? 'text-yellow-400' : 
                     'text-green-400'
    }
  }

  // UPDATED: More permissive input disabling logic
  const shouldDisableInput = () => {
    return isSubmitting || isLoading || (subscription && subscription.questionsRemaining === 0)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      
      {/* Messages area - ALWAYS VISIBLE */}
      <div className="flex-1 overflow-hidden">
        {/* Optional header when paywall is active */}
        {!canAskQuestion && (
          <div className={`px-4 py-2 text-center text-sm border-b ${
            getTheme() === 'dark' 
              ? 'bg-yellow-900/20 border-yellow-600/30 text-yellow-200' 
              : 'bg-yellow-50 border-yellow-200 text-yellow-800'
          }`}>
            ⚠️ You've reached your question limit, but you can still view your conversation history
          </div>
        )}
        
        <MessageList
          messages={messages}
          isLoading={isLoading || isServerMessagesLoading}
          userInitial={getUserInitial()}
          theme={getTheme()}
          isPaywallShowing={!canAskQuestion}
        />
      </div>

      {/* Input area with conditional paywall */}
      {canAskQuestion ? (
        // Normal input when user can ask questions
        <div className="flex-shrink-0">
          <MessageInput
            input={input}
            isLoading={isLoading || isSubmitting}
            onInputChange={setInput}
            onSubmit={handleSubmit}
            theme={getTheme()}
            disabled={shouldDisableInput()}
          />
        </div>
      ) : (
        // Compact paywall when user is out of questions
        <div className="flex-shrink-0">
          <div className={`border-t ${getTheme() === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-100'}`}>
            <div className="p-4 text-center">
              <div className="flex items-center justify-center space-x-3 mb-3">
                <span className="text-2xl">🌱</span>
                <div>
                  <h3 className={`font-semibold ${getTheme() === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Question limit reached
                  </h3>
                  <p className={`text-sm ${getTheme() === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {subscription?.questionsRemaining === 0 
                      ? `You've used all ${subscription?.planDetails?.monthlyQuestions || 0} questions this month`
                      : 'Upgrade to continue asking questions'
                    }
                  </p>
                </div>
              </div>
              
              {/* Current usage display - compact */}
              {subscription && (
                <div className={`text-xs mb-3 p-2 rounded ${getTheme() === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                  <div className="flex items-center justify-between">
                    <span>Plan: {subscription.plan || 'Free'}</span>
                    <span className={`font-medium ${
                      subscription.questionsRemaining === 0 ? 'text-red-400' : 
                      subscription.questionsRemaining <= 3 ? 'text-yellow-400' : 
                      'text-green-400'
                    }`}>
                      {subscription.questionsRemaining === -1 ? 'Unlimited' : `${subscription.questionsRemaining || 0} left`}
                    </span>
                    <span className="text-xs opacity-75">
                      {subscription.monthlyQuestions || 0}/{subscription.planDetails?.monthlyQuestions === -1 ? '∞' : subscription.planDetails?.monthlyQuestions || 0}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-center space-x-3">
                <a
                  href="/pricing-page"
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    getTheme() === 'dark'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  🚀 Upgrade Plan
                </a>
                <button
                  onClick={() => refetchSubscription()}
                  disabled={isSubscriptionLoading}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    getTheme() === 'dark'
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  } ${isSubscriptionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSubscriptionLoading ? '🔄' : '↻'} Refresh
                </button>
              </div>
              
              <p className={`text-xs mt-2 ${getTheme() === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                Questions reset monthly • Your conversation history is preserved
              </p>
            </div>
          </div>
        </div>
      )}

      {/* COMBINED STATUS BAR - ONLY WHEN USER CAN ASK QUESTIONS */}
      {canAskQuestion && currentUserId && (
        <div className={`flex-shrink-0 mt-3 ${getTheme() === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} border-t ${getTheme() === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
          <div className="flex items-center justify-between text-sm px-4 py-3">
            
            {/* Left side - System info, subscription, message count */}
            <div className="flex items-center space-x-4">
              
              {/* System status */}
              <div className="flex items-center  space-x-2">
                <span className={`${getTheme() === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  🧠 NER + Ollama
                </span>
                {getSystemStatusIndicator()}
              </div>
              
              {/* Subscription info */}
              {subscription && (() => {
                const statusInfo = getSubscriptionStatusInfo()
                return statusInfo && (
                  <>
                    <span className="text-gray-500">•</span>
                    <span className={`${getTheme() === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Plan: {statusInfo.plan}
                    </span>
                    <span className={`font-medium ${statusInfo.questionsColor}`}>
                      {statusInfo.questionsText}
                    </span>
                    {/* SHOW SUBMITTING STATE */}
                    {isSubmitting && (
                      <span className="text-yellow-400 text-xs">
                        (Processing...)
                      </span>
                    )}
                  </>
                )
              })()}

              {/* Message count */}
              {currentUserId && messages.length > 1 && (
                <>
                  <span className="text-gray-500">•</span>
                  <span className={`${getTheme() === 'dark' ? 'text-gray-300' : 'text-gray-700'} font-medium`}>
                    {messages.length - 1} messages
                  </span>
                </>
              )}
            </div>

            {/* Right side - Action buttons */}
            {currentUserId && messages.length > 1 && (
              <div className="flex items-center space-x-3">
                
                {/* Clear Chat Button */}
                <button
                  onClick={handleClearChat}
                  disabled={isLoading || isSubmitting}
                  className={`
                    flex items-center space-x-1 rounded-lg font-medium transition-all duration-200 px-3 py-1.5 text-sm
                    ${getTheme() === 'dark' 
                      ? 'text-red-400 hover:bg-red-900/20 hover:text-red-300' 
                      : 'text-red-600 hover:bg-red-50 hover:text-red-700'
                    }
                    ${isLoading || isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
                  `}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                  <span>Clear</span>
                </button>

                {/* Export Button */}
                <button
                  onClick={handleExportConversation}
                  disabled={isLoading || isSubmitting}
                  className={`
                    flex items-center space-x-1 rounded-lg font-medium transition-all duration-200 px-3 py-1.5 text-sm
                    ${getTheme() === 'dark' 
                      ? 'text-blue-400 hover:bg-blue-900/20 hover:text-blue-300' 
                      : 'text-blue-600 hover:bg-blue-50 hover:text-blue-700'
                    }
                    ${isLoading || isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
                  `}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  <span>Export</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}