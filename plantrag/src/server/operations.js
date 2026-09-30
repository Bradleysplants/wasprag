// src/server/operations.js
// COMPLETE: Added automatic question counting for every user message

import { ragPipeline } from './utils/ragPipeline.js';
import { saveMessage, getConversationHistoryForLLM, getAllMessagesForUser, deleteOldMessages } from './utils/conversationService.js';
import { incrementQuestionCount } from './actions/subscriptionActions.js';
import { HttpError } from 'wasp/server';

/**
 * Wasp operation to handle enhanced chatbot interaction.
 * COMPLETE: Now automatically counts questions and enforces limits.
 *
 * @param {Object} args
 * @param {string} args.message - The new user message.
 * @param {Object} context - Wasp context (contains user, entities, etc.).
 * @returns {Promise<Object>} The assistant's response including sources and metadata.
 */
export const processUserChat = async (args, context) => { 
  if (!context.user?.id) {
    throw new HttpError(401, 'User not authenticated for chat.');
  }

  const userId = context.user.id;
  const userMessageContent = args.message;

  console.log(`[processUserChat Operation] Processing message from user ${userId}: "${userMessageContent.slice(0, 50)}..."`);

  // STEP 1: Check and increment question count FIRST
  try {
    console.log(`[processUserChat Operation] Checking question limit for user ${userId}...`);
    
    const questionResult = await incrementQuestionCount({}, context);
    
    console.log(`[processUserChat Operation] Question count result:`, {
      questionCount: questionResult.questionCount,
      questionsRemaining: questionResult.questionsRemaining,
      canAskQuestion: questionResult.canAskQuestion,
      plan: questionResult.planDetails?.name
    });
    
    // If we got here, the user is within their limit
    console.log(`[processUserChat Operation] ✅ User ${userId} can ask questions. Proceeding with RAG pipeline.`);
    
  } catch (error) {
    console.error(`[processUserChat Operation] ❌ Question limit check failed for user ${userId}:`, error.message);
    
    // If it's a limit exceeded error, throw it back to client
    if (error.message.includes('Question limit reached')) {
      throw new HttpError(400, error.message);
    }
    
    // For other errors, also throw them
    throw new HttpError(500, `Failed to verify question limit: ${error.message}`);
  }

  // STEP 2: Save the new user message to the database
  try {
    await saveMessage({ content: userMessageContent, type: 'user' }, context);
    console.log('[processUserChat Operation] User message saved to DB.');
  } catch (error) {
    console.error('[processUserChat Operation] Failed to save user message:', error);
    // Proceed, but log the error. The RAG pipeline might still work without the latest message in history.
  }

  // STEP 3: Retrieve conversation history for LLM context from the database
  // The 'getConversationHistoryForLLM' function already applies CONTEXT_MESSAGE_LIMIT
  const conversationHistoryForLLM = await getConversationHistoryForLLM(userId, context);

  // STEP 4: Call the RAG pipeline with the new user message and the retrieved history
  // The ragPipeline will now format the prompt using this history
  let assistantResponse;
  try {
    assistantResponse = await ragPipeline.processQuery(userMessageContent, conversationHistoryForLLM);
    console.log('[processUserChat Operation] RAG pipeline processed query.');
  } catch (error) {
    console.error('[processUserChat Operation] RAG pipeline failed:', error);
    assistantResponse = {
      answer: "I'm sorry, I encountered an internal error processing your request.",
      sources: ['Internal Error'],
      type: 'error',
    };
  }

  // STEP 5: Save the assistant's response to the database
  try {
    await saveMessage(
      {
        content: assistantResponse.answer,
        type: 'assistant',
        metadata: {
          sources: assistantResponse.sources,
          responseType: assistantResponse.type,
          entities: assistantResponse.entities, 
          plantCount: assistantResponse.plantCount, 
          reasoning: assistantResponse.reasoning, 
        },
      },
      context
    );
    console.log('[processUserChat Operation] Assistant message saved to DB.');
  } catch (error) {
    console.error('[processUserChat Operation] Failed to save assistant message:', error);
  }

  return assistantResponse;
};

/**
 * Wasp operation to get all messages for a user (for client-side display).
 * @param {Object} args
 * @param {Object} context - Wasp context (contains user, entities).
 * @returns {Promise<Array<Object>>} All messages for the authenticated user.
 */
export const getUserMessagesForDisplay = async (args, context) => {
  if (!context.user?.id) {
    throw new HttpError(401, 'User not authenticated.');
  }
  return await getAllMessagesForUser(context.user.id, context);
};

/**
 * Wasp operation to delete all messages for a specific user.
 * This is intended for the "Clear Chat" functionality.
 *
 * @param {Object} args - Empty, as userId comes from context.
 * @param {Object} context - Wasp context (contains user, entities).
 * @returns {Promise<Object>} The count of deleted messages.
 */
export const deleteAllUserMessages = async (args, context) => {
  if (!context.user?.id) {
    throw new HttpError(401, 'User not authenticated for deleting messages.');
  }
  
  // Passing 0 for olderThanDays means delete all messages.
  const farFutureDate = new Date();
  farFutureDate.setFullYear(farFutureDate.getFullYear() + 100); // Set to 100 years in future
  
  // Directly calling the service function; conversationService.js already contains this logic
  // This will delete ALL messages for the user, as olderThanDays logic in service will evaluate to everything being older.
  return await deleteOldMessages(context.user.id, 0, context); // 0 days means anything created before now
};

/**
 * Wasp operation for botanical search functionality
 */
export const searchBotanicalInfo = async (args, context) => {
  if (!context.user?.id) {
    throw new HttpError(401, 'User not authenticated for botanical search.');
  }

  const { query } = args;
  
  console.log(`[searchBotanicalInfo Operation] Search query from user ${context.user.id}: "${query}"`);

  try {
    // Use the RAG pipeline for search
    const searchResult = await ragPipeline.processQuery(query, []);
    
    console.log('[searchBotanicalInfo Operation] Search completed.');
    
    return {
      success: true,
      results: searchResult,
      query: query
    };
    
  } catch (error) {
    console.error('[searchBotanicalInfo Operation] Search failed:', error);
    
    return {
      success: false,
      error: error.message,
      results: {
        answer: "I'm sorry, I couldn't complete your botanical search at this time.",
        sources: ['Search Error'],
        type: 'error'
      },
      query: query
    };
  }
};