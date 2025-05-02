// src/utils/embeddings.js
import { pipeline as xenovaPipeline } from '@xenova/transformers';
import { MODEL_CONFIG } from './config.js'; // Import shared config

let embeddingPipelineInstance = null;
let embeddingModelNameLoaded = null;

/** Gets or creates the feature-extraction (embedding) pipeline instance. */
async function getEmbeddingPipeline() {
    const modelId = MODEL_CONFIG.embeddingModel;
    if (embeddingPipelineInstance && embeddingModelNameLoaded === modelId) {
        return embeddingPipelineInstance;
    }
    console.log(`[Embedding Pipeline] Initializing local feature-extraction model: ${modelId}`);
    try {
        embeddingPipelineInstance = await xenovaPipeline('feature-extraction', modelId);
        embeddingModelNameLoaded = modelId;
        console.log('[Embedding Pipeline] Local model loaded successfully.');
        return embeddingPipelineInstance;
    } catch (error) {
        console.error(`[Embedding Pipeline] Failed to load local model ${modelId}:`, error);
        embeddingPipelineInstance = null; // Clear cache on error
        embeddingModelNameLoaded = null;
        throw error;
    }
}

/**
 * Generates a vector embedding for the given text.
 * @param {string} text - The text to embed.
 * @returns {Promise<number[]>} A promise resolving to the embedding vector.
 */
export async function generateTextEmbedding(text) {
    const modelId = MODEL_CONFIG.embeddingModel;
    // console.log(`[Embedding] Requesting embedding for text: "${text ? text.substring(0, 30):''}..."`); // Less verbose log
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        throw new Error("Cannot generate embedding for empty or invalid text.");
    }
    try {
        const extractor = await getEmbeddingPipeline();
        const output = await extractor(text, { pooling: 'mean', normalize: true });
        // console.log("[Embedding] Embedding created successfully.");
        const result = Array.from(output.data);

        if (!Array.isArray(result) || result.length === 0) {
            throw new Error('Invalid embedding result: Not an array or empty.');
        }
        if (result.length !== MODEL_CONFIG.embeddingDimension) {
            console.warn(`Embedding dimension mismatch: Generated ${result.length}, expected ${MODEL_CONFIG.embeddingDimension} for model ${modelId}.`);
        }
        if (result.some(v => typeof v !== 'number' || isNaN(v))) {
            throw new Error("Invalid embedding result: Contains non-numeric values.");
        }
        return result;
    } catch (error) {
        console.error('[Embedding] Error generating text embedding:', error);
        throw error;
    }
}