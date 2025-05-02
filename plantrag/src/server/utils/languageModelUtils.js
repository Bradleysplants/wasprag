// src/utils/languageModelUtils.js

// --- JSDoc Type Definitions (Optional - Can be defined here or where used) ---
/**
 * Represents context information passed to the LLM.
 * @typedef {Object} ContextItem
 * @property {string} name - Common name of the plant.
 * @property {string} [scientificName] - Scientific name.
 * @property {string} [description] - General description.
 * @property {string} [careInfo] - Information about plant care.
 * @property {string} [soilNeeds] - Information about soil requirements.
 * @property {string} source - Where the information came from.
 */
/**
 * Represents the result of a Chain of Thought response generation.
 * @typedef {Object} ChainOfThoughtResult
 * @property {string} answer - The generated answer text.
 * @property {string[]} sources - List of sources used.
 */
/**
 * Represents an entity extracted by the NER model after processing.
 * @typedef {Object} NerEntity
 * @property {string} entity_group - The type of the entity (e.g., 'PLANT_SCI', 'PLANT_COMMON').
 * @property {number} score - A representative confidence score for the entity (e.g., min score of its tokens).
 * @property {string} word - The aggregated text of the entity.
 * @property {null} start - Character start offset (unavailable in this implementation).
 * @property {null} end - Character end offset (unavailable in this implementation).
 */

// --- Utility Functions ---

/**
 * Splits a B-I-O label into prefix (B, I, O) and type (PLANT_COMMON, etc.).
 * Used by ner.js.
 * @param {string} label - The B-I-O label string.
 * @returns {{prefix: 'B'|'I'|'O', type: string}}
 */
export function getLabelParts(label) {
    if (!label || label === 'O') {
        return { prefix: 'O', type: 'O' };
    }
    const parts = label.split('-', 2); // Split only on the first hyphen
    if (parts.length === 2 && (parts[0] === 'B' || parts[0] === 'I')) {
        // You might add normalization here if needed (e.g., .toUpperCase())
        return { prefix: parts[0], type: parts[1] };
    }
    // Handle unexpected format gracefully, treat as O
    // console.warn(`[Utils] Unexpected label format encountered: ${label}`); // Can be noisy
    return { prefix: 'O', type: 'O' };
}

// --- Add any other shared utility functions below ---
// For example, if you had complex context formatting logic used in multiple places,
// you could potentially move it here. Currently, it seems simple enough to keep
// within the function that uses it (like generateFinalResponse example).

// Example utility (if needed later):
// export function normalizeWhitespace(text) {
//     return text.replace(/\s+/g, ' ').trim();
// }