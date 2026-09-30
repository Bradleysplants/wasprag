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