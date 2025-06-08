// src/server/aiActions.js
// CLEANED UP - No duplicates, no extra complexity

import { HttpError } from 'wasp/server';
import { generateTextEmbedding } from '../utils/embeddings.js';
import { ragPipeline } from '../utils/ragPipeline.js';
import { MODEL_CONFIG } from '../utils/config.js';
import { extractEntities } from '../utils/ner.js';

// === CONFIG DIAGNOSTIC ===
console.log('[AI Actions] 🔧 CONFIG DIAGNOSTIC:');
console.log('  MODEL_CONFIG loaded:', !!MODEL_CONFIG);
console.log('  llmProvider:', MODEL_CONFIG?.llmProvider);
console.log('  embeddingModel:', MODEL_CONFIG?.embeddingModel);

if (!MODEL_CONFIG) {
    console.error('[AI Actions] ❌ MODEL_CONFIG failed to load!');
    throw new Error('CONFIG IMPORT FAILED - check file paths');
}

// ===========================================
// CORE AI ACTIONS
// ===========================================

/**
 * Generates text embedding. Requires authentication.
 */
export const generateEmbedding = async (args, context) => {
    if (!context.user) {
        throw new HttpError(401, "Authentication required");
    }
    
    const { text } = args;
    if (!text?.trim()) {
        throw new HttpError(400, "Text argument required and cannot be empty");
    }

    try {
        console.log(`[AI Actions] Generating embedding for user ${context.user.id}, text length: ${text.length}`);
        
        const expectedDimension = MODEL_CONFIG.embeddingDimension || 384;
        const embedding = await generateTextEmbedding(text);
        
        // Validate embedding
        if (!Array.isArray(embedding)) {
            throw new HttpError(500, "Generated embedding is not an array");
        }
        
        if (embedding.length !== expectedDimension) {
            throw new HttpError(500, `Expected embedding dimension ${expectedDimension}, got ${embedding.length}`);
        }
        
        if (embedding.some(val => typeof val !== 'number' || isNaN(val))) {
            throw new HttpError(500, "Generated embedding contains invalid values");
        }
        
        console.log(`[AI Actions] Embedding generated successfully, dimension: ${embedding.length}`);
        return { 
            embedding,
            dimension: embedding.length,
            textLength: text.length
        };
        
    } catch (error) {
        console.error("[AI Actions] generateEmbedding Error:", error);
        
        if (error instanceof HttpError) {
            throw error;
        }
        
        if (error.message?.includes('API')) {
            throw new HttpError(500, "External embedding service unavailable");
        }
        
        throw new HttpError(500, "Failed to generate embedding");
    }
};

/**
 * Basic botanical search using RAG pipeline. Requires authentication.
 */
export const searchBotanicalInfo = async (args, context) => {
    if (!context.user) {
        throw new HttpError(401, "Authentication required");
    }
    
    const { query } = args;
    if (!query?.trim()) {
        throw new HttpError(400, "Query cannot be empty");
    }

    console.log(`[AI Actions] searchBotanicalInfo called by user ${context.user.id} with query: "${query}"`);

    try {
        const startTime = Date.now();
        const results = await ragPipeline.processQuery(query);
        const processingTime = Date.now() - startTime;
        
        console.log(`[AI Actions] searchBotanicalInfo completed in ${processingTime}ms for query: "${query}"`);
        
        if (!results) {
            throw new HttpError(500, "RAG pipeline returned null results");
        }
        
        return {
            answer: results?.answer || "I couldn't find specific information about that topic.",
            sources: Array.isArray(results?.sources) ? results.sources : [],
            metadata: {
                processingTimeMs: processingTime,
                sourceCount: results?.sources?.length || 0,
                queryLength: query.length
            }
        };
        
    } catch (error) {
        console.error(`[AI Actions] searchBotanicalInfo Error for query "${query}":`, error);
        
        if (error instanceof HttpError) {
            throw error;
        }
        
        if (error.message?.includes('embedding')) {
            throw new HttpError(500, "Failed to process query - embedding service error");
        }
        
        if (error.message?.includes('database')) {
            throw new HttpError(500, "Failed to process query - database error");
        }
        
        throw new HttpError(500, "Failed to process search query");
    }
};

/**
 * SIMPLE CHAT - Just uses ragPipeline, no complexity
 */
export const enhancedChat = async (args, context) => {
    if (!context.user) {
        throw new HttpError(401, "Authentication required");
    }
    
    const { message, conversationHistory = [] } = args;
    
    if (!message?.trim()) {
        throw new HttpError(400, "Message cannot be empty");
    }

    console.log(`[AI Actions] enhancedChat called by user ${context.user.id} with message: "${message.substring(0, 100)}..."`);

    try {
        const startTime = Date.now();
        
        // Extract entities for metadata
        const entities = await extractEntities(message);
        const plantEntities = entities.filter(e => 
            e.entity_group === 'PLANT' || 
            e.entity_group === 'PLANT_SCI' || 
            e.entity_group === 'PLANT_COMMON'
        );
        
        // Simple keyword detection for intent
        const messageLower = message.toLowerCase();
        const botanicalKeywords = [
            'plant', 'flower', 'leaf', 'water', 'soil', 'root', 'seed', 'garden',
            'fertilizer', 'prune', 'bloom', 'pest', 'disease', 'sunlight', 'shade',
            'repot', 'transplant', 'care', 'grow', 'botanical', 'species',
            'hibiscus', 'succulent', 'cactus', 'fern', 'orchid', 'tree', 'herb'
        ];
        
        const isBotanicalQuery = botanicalKeywords.some(keyword => 
            messageLower.includes(keyword)
        ) || plantEntities.length > 0;
        
        let result;
        let responseType = 'conversation';
        
        if (isBotanicalQuery) {
            console.log('[AI Actions] Detected botanical query, using RAG pipeline');
            try {
                result = await ragPipeline.processQuery(message);
                responseType = 'botanical';
            } catch (ragError) {
                console.warn('[AI Actions] RAG pipeline failed:', ragError);
                // Fallback response
                result = {
                    answer: "I'd be happy to help with your plant question! Could you provide a bit more detail about what you'd like to know?",
                    sources: []
                };
                responseType = 'botanical_fallback';
            }
        } else {
            // Simple conversational responses
            const conversationalResponses = [
                "Hello! I'm your botanical assistant. I can help with plant questions and chat with you! 🌱",
                "Hi there! What plant topic would you like to explore today?",
                "I'm here to help with all things plant-related. What's on your mind?",
                "That's interesting! Is there anything plant-related I can help you with?"
            ];
            
            if (messageLower.match(/\b(hi|hello|hey|good morning|good afternoon)\b/)) {
                result = { answer: conversationalResponses[0], sources: [] };
            } else if (messageLower.match(/\b(thanks|thank you|appreciate|grateful)\b/)) {
                result = { answer: "You're very welcome! I love helping with plant care. Any other questions?", sources: [] };
            } else {
                result = { answer: conversationalResponses[Math.floor(Math.random() * conversationalResponses.length)], sources: [] };
            }
        }
        
        const processingTime = Date.now() - startTime;
        
        console.log(`[AI Actions] enhancedChat completed in ${processingTime}ms, response type: ${responseType}`);
        
        return {
            content: result.answer || "I'm here to help with your plant questions!",
            type: responseType,
            sources: result.sources || [],
            reasoning: `Detected as ${responseType} query`,
            entities: entities,
            plantCount: plantEntities.length,
            metadata: {
                processingTimeMs: processingTime,
                messageLength: message.length,
                historyLength: conversationHistory.length,
                timestamp: new Date().toISOString(),
                llmProvider: 'ollama'
            }
        };
        
    } catch (error) {
        console.error('[AI Actions] enhancedChat Error:', error);
        
        return {
            content: "I'm having some technical difficulties right now. Could you try asking again in a moment?",
            type: 'error',
            sources: [],
            reasoning: `Error: ${error.message}`,
            entities: [],
            plantCount: 0,
            metadata: {
                processingTimeMs: 0,
                messageLength: message.length,
                historyLength: conversationHistory?.length || 0,
                timestamp: new Date().toISOString(),
                llmProvider: 'ollama'
            }
        };
    }
};

/**
 * Health check for AI services
 */
export const healthCheck = async (args, context) => {
    try {
        const checks = {
            ragPipeline: false,
            embeddings: false,
            ner: false
        };
        
        // Test RAG pipeline
        try {
            await ragPipeline.processQuery("test");
            checks.ragPipeline = true;
        } catch (e) {
            console.warn('[AI Actions] RAG pipeline health check failed:', e);
        }
        
        // Test embeddings
        try {
            await generateTextEmbedding("test");
            checks.embeddings = true;
        } catch (e) {
            console.warn('[AI Actions] Embeddings health check failed:', e);
        }
        
        // Test NER
        try {
            const testEntities = await extractEntities("test plant");
            checks.ner = Array.isArray(testEntities);
        } catch (e) {
            console.warn('[AI Actions] NER health check failed:', e);
        }
        
        const allHealthy = Object.values(checks).every(check => check === true);
        
        return {
            healthy: allHealthy,
            services: checks,
            timestamp: new Date().toISOString(),
            config: {
                llmProvider: MODEL_CONFIG?.llmProvider || 'ollama',
                llmModel: MODEL_CONFIG?.mainLlmModel || 'mistral',
                embeddingModel: MODEL_CONFIG?.embeddingModel || 'unknown', 
                embeddingDimension: MODEL_CONFIG?.embeddingDimension || 384,
                nerModel: MODEL_CONFIG?.nerModel || 'unknown'
            }
        };
        
    } catch (error) {
        console.error('[AI Actions] Health check error:', error);
        return {
            healthy: false,
            error: error.message,
            timestamp: new Date().toISOString(),
            config: {
                llmProvider: MODEL_CONFIG?.llmProvider || 'ollama',
                configLoaded: MODEL_CONFIG ? 'yes' : 'no',
                errorLocation: 'healthCheck function'
            }
        };
    }
};