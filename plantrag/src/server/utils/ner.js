// src/utils/ner.js (Refactored with RAW OUTPUT DEBUG LOGGING)
import { AutoTokenizer, pipeline as xenovaPipeline } from '@xenova/transformers';
import { MODEL_CONFIG } from './config.js'; // Assuming config.js exists and exports MODEL_CONFIG
import { getLabelParts } from './languageModelUtils.js'; // Assuming this exists

// --- Cache ---
let nerPipelineInstance = null;
let nerModelNameLoaded = null;
let nerTokenizerInstance = null;

// --- Label Mapping & Config ---
// Make sure ID2LABEL matches your specific model's config.json (id2label field)
// Example:
const ID2LABEL = {
     0: "O",
     1: "B-PLANT_COMMON",
     2: "I-PLANT_COMMON",
     3: "B-PLANT_SCI",
     4: "I-PLANT_SCI",
     // Add other labels if your model has them
};
// Get valid entity types and threshold from config
const VALID_ENTITY_TYPES = new Set(MODEL_CONFIG.nerValidEntityTypes ?? ["PLANT_COMMON", "PLANT_SCI"]);
// --->>> Ensure MODEL_CONFIG.nerScoreThreshold is defined in config.js, or adjust default <<<---
const MIN_NER_SCORE_THRESHOLD = MODEL_CONFIG.nerScoreThreshold ?? 0.70; // Use the value from your log!
// --- END Label Mapping & Config ---


/** Gets or creates the token-classification (NER) pipeline instance. */
async function getNerPipeline() {
    const modelId = MODEL_CONFIG.nerModel;
    if (nerPipelineInstance && nerModelNameLoaded === modelId) {
        return nerPipelineInstance;
    }
    console.log(`[NER Pipeline] Initializing Xenova pipeline for model: ${modelId}`);
    try {
        // Load WITHOUT aggregation to get raw token outputs
        nerPipelineInstance = await xenovaPipeline('token-classification', modelId);
        nerModelNameLoaded = modelId;
        console.log(`[NER Pipeline] Xenova pipeline for '${modelId}' loaded successfully.`);
        return nerPipelineInstance;
    } catch (error) {
        console.error(`[NER Pipeline] Failed to load Xenova pipeline for ${modelId}:`, error);
        nerPipelineInstance = null; // Clear cache on error
        nerModelNameLoaded = null;
        throw error; // Re-throw error
    }
}

/** Ensures the NER tokenizer is loaded (kept for potential future use/debugging). */
async function ensureNerTokenizer() {
    if (nerTokenizerInstance && nerModelNameLoaded === MODEL_CONFIG.nerModel) {
        return nerTokenizerInstance;
    }
     // Try getting from pipeline first (might be included)
    if (nerPipelineInstance?.tokenizer) {
         console.log("[NER Tokenizer] Using tokenizer from loaded pipeline object.");
         nerTokenizerInstance = nerPipelineInstance.tokenizer;
         nerModelNameLoaded = MODEL_CONFIG.nerModel;
         return nerTokenizerInstance;
     }

    // Fallback to loading separately
    console.log(`[NER Tokenizer] Loading tokenizer separately from: ${MODEL_CONFIG.nerModel}`);
    try {
        const tokenizer = await AutoTokenizer.from_pretrained(MODEL_CONFIG.nerModel, {});
        nerTokenizerInstance = tokenizer;
        nerModelNameLoaded = MODEL_CONFIG.nerModel;
        console.log("[NER Tokenizer] Separate tokenizer loaded successfully.");
        return nerTokenizerInstance;
    } catch (e) {
        console.error("[NER Tokenizer] Failed to load NER tokenizer separately:", e);
        nerTokenizerInstance = null;
        nerModelNameLoaded = null;
        return null; // Allow proceeding without separate tokenizer if possible
    }
}

/**
 * Extracts plant entities using the Xenova pipeline, applying confidence thresholds.
 * @param {string} text - The input text.
 * @returns {Promise<import('./languageModelUtils.js').NerEntity[]>} - Returns aggregated entities.
 */
export async function extractEntities(text) {
    // console.log(`[NER] Requesting NER for text: "${text}"`);
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        console.warn("[NER] Received empty or invalid text for extraction.");
        return [];
    }

    let nerPipeline;
    let nerTokenizer;

    try {
        nerPipeline = await getNerPipeline();
        nerTokenizer = await ensureNerTokenizer(); // Load tokenizer

        // --- Get Raw Token Predictions ---
        let raw_token_outputs;
         if (typeof nerPipeline === 'function') {
             raw_token_outputs = await nerPipeline(text);
         } else {
             console.error("[NER FATAL] Loaded nerPipeline is not callable:", nerPipeline);
             throw new Error("NER Pipeline cannot be called.");
         }

        // --- >>> ADDED DEBUG LOGGING BLOCK <<< ---
        console.log("[NER] --- RAW PIPELINE OUTPUT START ---");
        // Log the full structure prettily to understand what the pipeline returns
        console.log(JSON.stringify(raw_token_outputs, null, 2));
        console.log("[NER] --- RAW PIPELINE OUTPUT END ---");
        // --- >>> END DEBUG LOGGING BLOCK <<< ---


        if (!Array.isArray(raw_token_outputs) || raw_token_outputs.length === 0) {
            console.warn('[NER] Raw token output from pipeline is invalid or empty after call.');
            return [];
        }

        // --- B-I-O Correction with SCORE THRESHOLDING ---
        console.log(`[NER] Applying B-I-O Correction (Threshold: ${MIN_NER_SCORE_THRESHOLD})...`);
        let corrected_labels = [];
        for (let i = 0; i < raw_token_outputs.length; i++) {
            const token_pred = raw_token_outputs[i]; // e.g., { entity: 'LABEL_1', score: 0.9, word: 'Petunias' }
            let current_tag = 'O'; // Default to 'O'

            // --- CHECK STRUCTURE and APPLY THRESHOLD ---
            // Make sure prediction object has score and entity before thresholding
            if (token_pred && typeof token_pred.score === 'number' && typeof token_pred.entity === 'string') {
                 if (token_pred.score >= MIN_NER_SCORE_THRESHOLD) {
                     current_tag = token_pred.entity; // Use the predicted entity label
                 } else {
                      // Score too low, treat as 'O'
                      // Log the discarded token and its score
                      console.log(`[NER Correction Debug] Low score for token '${token_pred.word ?? '??'}': ${token_pred.score.toFixed(4)} < ${MIN_NER_SCORE_THRESHOLD}. Treating as O.`);
                      current_tag = 'O';
                 }
            } else {
                 // Prediction object has unexpected structure, treat as 'O'
                 console.warn(`[NER Correction Debug] Invalid token prediction structure at index ${i}:`, token_pred);
                 current_tag = 'O';
            }
            // --- END THRESHOLD ---


            // --- Apply B-I-O rules based on the potentially thresholded current_tag ---
            const { prefix: current_prefix, type: current_type } = getLabelParts(current_tag);

            // Ignore if 'O' or not a valid type *after* thresholding
            if (current_type === 'O' || !VALID_ENTITY_TYPES.has(current_type)) {
                corrected_labels.push('O');
                continue;
            }

            // Logic for I- tag
            if (current_prefix === 'I') {
                if (i === 0) { corrected_labels.push(`B-${current_type}`); }
                else {
                    const { prefix: prev_prefix_corrected, type: prev_type_corrected } = getLabelParts(corrected_labels[i - 1]);
                    if ((prev_prefix_corrected === 'B' || prev_prefix_corrected === 'I') && prev_type_corrected === current_type) {
                        corrected_labels.push(`I-${current_type}`);
                    } else { corrected_labels.push(`B-${current_type}`); }
                }
            }
            // Logic for B- tag
            else if (current_prefix === 'B') { corrected_labels.push(`B-${current_type}`); }
            // Default to O
            else { corrected_labels.push('O'); }
        } // --- End B-I-O Correction Loop ---


        // --- Aggregation ---
        console.log("[NER] Aggregating corrected labels into entities...");
        const entities = [];
        let current_entity_tokens = [];
        let current_entity_tag_type = null;
        let current_entity_scores = []; // Store scores of tokens in the current entity

        const finalize_entity = () => {
             if (current_entity_tokens.length > 0 && current_entity_tag_type) {
                 let entity_word = '';
                 try { // Simple join and cleanup
                      entity_word = current_entity_tokens.join('').replace(/##/g, '').trim();
                 } catch (e) {
                      console.warn("[NER Aggregation] Error joining tokens, falling back.", e);
                      entity_word = current_entity_tokens.join(' ').trim();
                 }

                 if (entity_word) {
                     const score = current_entity_scores.length > 0 ? Math.min(...current_entity_scores) : 0.0;
                     // Keep the aggregated entity regardless of the aggregated score here,
                     // as the threshold was applied at the token level.
                     // If you want to threshold again on the aggregated score (e.g., min score), add check here:
                     // if (score >= MIN_NER_SCORE_THRESHOLD) { ... }
                     entities.push({
                         entity_group: current_entity_tag_type,
                         score: score, // Report the calculated aggregate score
                         word: entity_word,
                         start: null, end: null // Offsets are tricky without more info
                     });
                     // Log the entity that was finalized
                     console.log(`[NER Aggregation Debug] Finalized entity: "${entity_word}", Score: ${score.toFixed(4)}, Type: ${current_entity_tag_type}`);

                 } else { console.warn("[NER Aggregation] Discarding entity with empty reconstructed word."); }
             }
             // Reset
             current_entity_tokens = []; current_entity_tag_type = null; current_entity_scores = [];
         }; // --- End finalize_entity ---

        // --- Aggregation Loop ---
         for (let i = 0; i < raw_token_outputs.length; i++) {
             const token_pred = raw_token_outputs[i]; // Contains original word and score
             const corrected_tag = corrected_labels[i]; // Use the thresholded/corrected tag
             const { prefix: corrected_prefix, type: corrected_type } = getLabelParts(corrected_tag);

             // Start new entity
             if (corrected_prefix === 'B') {
                 finalize_entity();
                 current_entity_tokens = [token_pred.word];
                 current_entity_tag_type = corrected_type;
                 // Only include score if it passed threshold (implicit from corrected_tag)
                 if (token_pred.score >= MIN_NER_SCORE_THRESHOLD) { current_entity_scores = [token_pred.score]; } else { current_entity_scores = []; /* Should not happen if B-*/ }
             }
             // Continue entity
             else if (corrected_prefix === 'I' && current_entity_tag_type === corrected_type) {
                 current_entity_tokens.push(token_pred.word);
                 if (token_pred.score >= MIN_NER_SCORE_THRESHOLD) { current_entity_scores.push(token_pred.score); } // Add score if valid
             }
             // End entity
             else { finalize_entity(); }
         }
         finalize_entity(); // Finalize last one
         // --- End Aggregation Loop ---


        console.log(`[NER] Aggregated ${entities.length} final entities.`);
        // console.log('[NER Final Entities]:', JSON.stringify(entities, null, 2)); // Optional: log final list
        return entities;

    } catch (error) {
        console.error(`[NER] Error during entity extraction:`, error);
        if (error instanceof Error && error.stack) { console.error(error.stack); }
        return []; // Return empty array on critical error
    }
}