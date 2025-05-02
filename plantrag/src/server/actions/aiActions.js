// src/server/aiActions.js

import { HttpError } from 'wasp/server';
import { generateTextEmbedding } from '../utils/embeddings.js'; // Adjust path if needed
import { ragPipeline } from '../utils/ragPipeline.js';       // Adjust path if needed
import { MODEL_CONFIG } from '../utils/config.js';         // Adjust path if needed

// --- JSDoc Type Definitions ---
/** @typedef {import('./types').GenerateEmbeddingArgs} GenerateEmbeddingArgs */
/** @typedef {import('./types').GenerateEmbeddingResult} GenerateEmbeddingResult */
/** @typedef {import('./types').SearchBotanicalArgs} SearchBotanicalArgs */
/** @typedef {import('./types').PipelineResult} PipelineResult */

// --- AI Actions ---

/**
 * Generates text embedding. Requires authentication.
 * @param {GenerateEmbeddingArgs} args - Text to embed.
 * @param {object} context - Wasp context with context.user.
 * @returns {Promise<GenerateEmbeddingResult>} Embedding result.
 */
export const generateEmbedding = async (args, context) => {
    const { text } = args;
    if (!context.user) { throw new HttpError(401, "Authentication required"); }
    if (!text?.trim()) { throw new HttpError(400, "Text argument required."); }

    try {
        const expectedDimension = MODEL_CONFIG.embeddingDimension;
        const embedding = await generateTextEmbedding(text);
        if (!Array.isArray(embedding) || embedding.length !== expectedDimension /*...*/) {
            throw new HttpError(500, `Generated embedding invalid...`);
        }
        return { embedding };
    } catch (error) {
        console.error("Action: generateEmbedding Error:", error);
        if (error instanceof HttpError) { throw error; }
        throw new HttpError(500, "Failed to generate embedding.");
    }
};

/**
 * Searches using RAG pipeline. Requires authentication.
 * @param {SearchBotanicalArgs} args - Search query.
 * @param {object} context - Wasp context with context.user.
 * @returns {Promise<PipelineResult>} RAG pipeline result.
 */
export const searchBotanicalInfo = async (args, context) => {
    if (!context.user) { throw new HttpError(401, "Auth required."); }
    const { query } = args;
    console.log(`Action: searchBotanicalInfo called by user ${context.user.id} with query: "${query}"`);
    if (!query?.trim()) { throw new HttpError(400, "Query cannot be empty."); }

    try {
        const results = await ragPipeline.processQuery(query);
        console.log(`Action: searchBotanicalInfo successful for query "${query}".`);
        return {
            answer: results?.answer || "Could not generate an answer.",
            sources: Array.isArray(results?.sources) ? results.sources : ["Unknown"]
        };
    } catch (error) {
        console.error(`Action: searchBotanicalInfo Error for query "${query}":`, error);
        if (error instanceof HttpError) { throw error; }
        throw new HttpError(500, "Failed to process search query.");
    }
};