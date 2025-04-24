// src/utils/languageModel.js (Refactored for Hybrid Approach)

import { ChatOpenAI } from '@langchain/openai'; // Keep for potential OpenAI fallback
import { AutoTokenizer, pipeline as xenovaPipeline } from '@xenova/transformers'; // Specific import for clarity
import path from 'path'; // Needed for resolving local paths
import { LLama } from 'llama-node'; // Import llama-node
import { LLamaCpp, LoadConfig } from 'llama-node/dist/llm/llama-cpp.js'; // Import specific backend

// --- Model Configuration ---
// ADD GGUF path and potentially llama-node options
const MODEL_CONFIG = {
    // LLM related (llama-node specific) - MODEL_NAME might become irrelevant if always using local GGUF
    llmProvider: process.env.LLM_PROVIDER || 'local:llama.cpp', // Indicate local provider type
    ggufModelPath: process.env.GGUF_MODEL_PATH, // *** REQUIRED: Set this env var to the FULL PATH of your .gguf file ***
    llamaNodeOptions: { // Options passed to llama-node LLamaCpp constructor
        nCtx: parseInt(process.env.LLAMA_CTX_SIZE || "2048"), // Context size
        nThreads: parseInt(process.env.LLAMA_THREADS || "4"), // CPU threads - adjust based on your Kaggle instance cores
        nGpuLayers: parseInt(process.env.LLAMA_GPU_LAYERS || "0"), // *** Set > 0 ONLY if you have CUDA/Metal setup FOR llama.cpp (unlikely/complex on Kaggle) ***
        // Add other llama.cpp options if needed: embedding: true, etc.
    },
    // LLM Generation Parameters (llama-node specific)
    temperature: parseFloat(process.env.MODEL_TEMPERATURE || "0.7"), // Slightly higher default often good for llama.cpp
    maxNewTokens: parseInt(process.env.MODEL_MAX_TOKENS || "512"), // Max tokens for llama-node completion
    topK: parseInt(process.env.LLAMA_TOP_K || "40"),
    topP: parseFloat(process.env.LLAMA_TOP_P || "0.9"),
    repeatPenalty: parseFloat(process.env.LLAMA_REPEAT_PENALTY || "1.1"),

    // Embedding Model (Keep using Xenova/ONNX)
    embeddingModel: process.env.EMBEDDING_MODEL || 'Xenova/bge-large-en-v1.5',
    embeddingDimension: 1024, // Dimension for bge-large-en-v1.5

    // NER Model (Keep using Xenova/ONNX)
    nerModel: process.env.NER_MODEL_NAME || 'Dudeman523/NER-Bert-Based-Cased-PlantNames-Onnx',

    // OpenAI Fallback (Optional)
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL_NAME || 'gpt-3.5-turbo', // Specify OpenAI model if using fallback
};

// --- Validate Configuration ---
if (MODEL_CONFIG.llmProvider === 'local:llama.cpp' && !MODEL_CONFIG.ggufModelPath) {
    throw new Error("Configuration Error: 'GGUF_MODEL_PATH' environment variable must be set when using 'local:llama.cpp' provider.");
}
if (MODEL_CONFIG.llmProvider === 'local:llama.cpp' && !path.isAbsolute(MODEL_CONFIG.ggufModelPath)) {
     // llama-node usually needs an absolute path or one relative to where it's run
     console.warn(`[Config Warning] GGUF_MODEL_PATH (${MODEL_CONFIG.ggufModelPath}) is not absolute. Ensure it's correct relative to the server's execution directory.`);
}


// --- JSDoc Type Definitions ---
// (Keep JSDoc definitions as before)
/** ... ContextItem ... */
/** ... ChainOfThoughtResult ... */
/** ... NerEntity ... */
/** ... AppModelConfig (might need update if used directly) ... */


// --- Singleton Caching ---
// LLM instance now specifically for llama-node
let llamaNodeInstance = null;
let loadedGgufPath = null;
// Keep caches for Xenova pipelines
let embeddingPipelineInstance = null;
let nerPipelineInstance = null;
let embeddingModelNameLoaded = null;
let nerModelNameLoaded = null;

// --- Factory/Getter Functions ---

/** Gets or creates the llama-node LLama instance. */
async function getLlamaNodeInstance() {
    const ggufPath = MODEL_CONFIG.ggufModelPath;
    // Return cached instance if path hasn't changed
    if (llamaNodeInstance && loadedGgufPath === ggufPath) {
        // console.log('[Llama Node] Returning cached LLM instance.');
        return llamaNodeInstance;
    }
    if (!ggufPath) throw new Error("GGUF model path is not configured.");

    console.log(`[Llama Node] Initializing LLM from GGUF: ${ggufPath}`);
    console.log(`[Llama Node] Options: ${JSON.stringify(MODEL_CONFIG.llamaNodeOptions)}`);

    // Ensure the path exists (basic check)
    // NOTE: Requires 'fs' module, might not work in all envs, optional check
    try {
        const fs = await import('fs');
        if (!fs.existsSync(ggufPath)) {
             throw new Error(`GGUF file not found at path: ${ggufPath}`);
        }
    } catch (fsError) {
        console.warn(`[Llama Node] Could not check GGUF file existence: ${fsError.message}. Proceeding with load attempt.`);
    }

    try {
        const llama = new LLama(LLamaCpp); // Select the C++ backend
        const config = {
            path: ggufPath, // Set the model path
            ...MODEL_CONFIG.llamaNodeOptions // Spread the configured options
        };

        await llama.load(config); // Load the model

        llamaNodeInstance = llama; // Cache the loaded instance
        loadedGgufPath = ggufPath; // Cache the path it was loaded from
        console.log('[Llama Node] GGUF model loaded successfully.');
        return llamaNodeInstance;
    } catch (error) {
        console.error(`[Llama Node] Failed to load GGUF model ${ggufPath}:`, error);
        llamaNodeInstance = null; // Clear cache on error
        loadedGgufPath = null;
        throw error; // Re-throw to indicate failure
    }
}

/** Gets or creates the feature-extraction (embedding) pipeline instance (Unchanged). */
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
        throw error;
    }
}

/** Gets or creates the token-classification (NER) pipeline instance (Unchanged). */
async function getNerPipeline() {
    const modelId = MODEL_CONFIG.nerModel;
    if (nerPipelineInstance && nerModelNameLoaded === modelId) {
        return nerPipelineInstance;
    }
    console.log(`[NER Pipeline] Initializing local ONNX token-classification model: ${modelId}`);
    try {
        nerPipelineInstance = await xenovaPipeline('token-classification', modelId); // No aggregation needed
        nerModelNameLoaded = modelId;
        console.log(`[NER Pipeline] Local ONNX model '${modelId}' loaded successfully.`);
        return nerPipelineInstance;
    } catch (error) {
        console.error(`[NER Pipeline] Failed to load local ONNX model ${modelId}:`, error);
        throw error;
    }
}


// --- Abstraction Layer for Language Model Invocation ---

/** Invokes the configured local LLM using llama-node. */
async function invokeLocalLlamaNode(prompt) {
    console.log(`[Llama Node] Invoking LLM with prompt (first 100 chars): "${prompt.substring(0, 100)}..."`);
    try {
        const llama = await getLlamaNodeInstance(); // Get the loaded llama-node instance

        // Use createCompletion for generating text based on a prompt
        // Consult llama-node docs for the most up-to-date API
        const params = {
            prompt: prompt,
            temp: MODEL_CONFIG.temperature,
            topK: MODEL_CONFIG.topK,
            topP: MODEL_CONFIG.topP,
            repeatPenalty: MODEL_CONFIG.repeatPenalty,
            nPredict: MODEL_CONFIG.maxNewTokens, // Max tokens to generate
            // Add other parameters like 'stop' sequences if needed
            // stop: ["\nUser:", "---"]
        };

        console.log(`[Llama Node] Generation parameters: ${JSON.stringify(params)}`);
        const result = await llama.createCompletion(params);
        console.log('[Llama Node] Completion generated.');

        // Extract the generated text from the result object
        const generatedText = result?.completion?.trim() || ''; // Adjust based on actual llama-node response structure

        // Note: llama-node completion usually doesn't include the prompt, so no need to strip it.
        return generatedText;

    } catch (error) {
        console.error("[Llama Node] Error during LLM invocation:", error);
        throw error; // Re-throw for higher-level handling
    }
}

/** Creates a language model instance (local via llama-node OR OpenAI). */
function createLanguageModel() {
     // Decision based on configuration
     if (MODEL_CONFIG.llmProvider === 'local:llama.cpp') {
         console.log(`Configured to use Local LLM via llama-node: ${MODEL_CONFIG.ggufModelPath}`);
         // Return object matching Langchain interface, pointing to our llama-node invoker
         return { invoke: invokeLocalLlamaNode, _isLocal: true };
     }

     // Fallback to OpenAI if configured
     if (MODEL_CONFIG.llmProvider === 'openai' && MODEL_CONFIG.openaiApiKey && MODEL_CONFIG.openaiModel) {
         console.warn(`Configured to use OpenAI API via Langchain: ${MODEL_CONFIG.openaiModel}`);
         return new ChatOpenAI({
             model: MODEL_CONFIG.openaiModel,
             temperature: MODEL_CONFIG.temperature,
             openAIApiKey: MODEL_CONFIG.openaiApiKey,
             maxTokens: MODEL_CONFIG.maxNewTokens,
         });
     }

     // If neither condition is met, configuration is invalid or points to unsupported provider
     throw new Error(`Could not create language model. Check LLM_PROVIDER, GGUF_MODEL_PATH / OpenAI settings. Current provider: ${MODEL_CONFIG.llmProvider}`);
}

// --- Tokenizer Loader Helper (Unchanged) ---
/** Ensures the NER tokenizer is loaded for decoding purposes. */
async function ensureNerTokenizer() {
    // ... (code remains exactly the same) ...
    console.log("[extractEntities] Explicitly loading NER tokenizer for decoding...");
     try {
        const tokenizer = await AutoTokenizer.from_pretrained(MODEL_CONFIG.nerModel, {});
        console.log("[extractEntities] NER Tokenizer loaded for decoding.");
        return tokenizer;
     } catch (e) {
        console.error("[extractEntities] Failed to load NER tokenizer:", e);
        throw new Error("NER Tokenizer failed to load for decoding.");
     }
}


// --- Helper to parse B-I-O tags (Unchanged) ---
/** ... getLabelParts ... */
function getLabelParts(label) {
    // ... (code remains exactly the same) ...
    if (!label || label === 'O') { return { prefix: 'O', type: 'O' }; }
    const parts = label.split('-', 2);
    if (parts.length === 2 && (parts[0] === 'B' || parts[0] === 'I')) { return { prefix: parts[0], type: parts[1] }; }
    return { prefix: 'O', type: 'O' };
}


// --- NER Function using Standard B-I-O (Unchanged) ---
/** ... extractEntities ... */
export async function extractEntities(text) {
    // ... (code remains exactly the same - uses getNerPipeline and ensureNerTokenizer) ...
    const MIN_NER_SCORE_THRESHOLD = 0.75;
    const VALID_ENTITY_TYPES = new Set(['PLANT_SCI', 'PLANT_COMMON']); // *** ADJUST THIS based on your NER model's labels ***
    console.log(`[extractEntities] Requesting NER (Standard B-I-O) using ONNX model: ${MODEL_CONFIG.nerModel}`);
    if (!text || typeof text !== 'string' || text.trim().length === 0) { return []; }
    let nerTokenizer;
    try {
        const ner = await getNerPipeline();
        nerTokenizer = await ensureNerTokenizer();
        console.log("[extractEntities] Running NER pipeline on input text...");
        const raw_token_outputs = await ner(text);
        console.log(`[extractEntities] Raw token output count: ${raw_token_outputs?.length ?? 0}`);
        if (!Array.isArray(raw_token_outputs) || raw_token_outputs.length === 0) { return []; }
        let corrected_labels = [];
        for (let i = 0; i < raw_token_outputs.length; i++) {
            const token_pred = raw_token_outputs[i];
            let current_tag = 'O';
            if (token_pred.score >= MIN_NER_SCORE_THRESHOLD) { current_tag = token_pred.entity; }
            const { prefix: current_prefix, type: current_type } = getLabelParts(current_tag);
            if (current_type === 'O' || !VALID_ENTITY_TYPES.has(current_type)) { corrected_labels.push('O'); continue; }
            if (current_prefix === 'I') {
                if (i === 0) { corrected_labels.push(`B-${current_type}`); }
                else {
                    const { prefix: prev_prefix_corrected, type: prev_type_corrected } = getLabelParts(corrected_labels[i - 1]);
                    if ((prev_prefix_corrected === 'B' || prev_prefix_corrected === 'I') && prev_type_corrected === current_type) {
                        corrected_labels.push(`I-${current_type}`);
                    } else { corrected_labels.push(`B-${current_type}`); }
                }
            } else if (current_prefix === 'B') { corrected_labels.push(`B-${current_type}`); }
            else { corrected_labels.push('O'); }
        }
        const entities = [];
        let current_entity_tokens = [];
        let current_entity_tag_type = null;
        let current_entity_scores = [];
        const finalize_entity = () => { /* ... (Your working finalize_entity logic using simple join) ... */
            if (current_entity_tokens.length > 0 && current_entity_tag_type) {
                let entity_word = '';
                try {
                    const joined_tokens = current_entity_tokens.join('').replace(/##/g, '');
                    if (joined_tokens) {
                         entity_word = joined_tokens.trim();
                         // console.log(`[finalize_entity] Used simple join/replace for tokens: ${JSON.stringify(current_entity_tokens)} -> "${entity_word}"`); // Can make less verbose
                    } else { console.warn(`[finalize_entity] Simple join/replace resulted in empty string for tokens: ${JSON.stringify(current_entity_tokens)}`);}
                } catch (decodeError) {
                    console.error(`[finalize_entity] Error during token reconstruction for ${JSON.stringify(current_entity_tokens)}:`, decodeError);
                    entity_word = current_entity_tokens.join('').replace(/##/g, '').trim(); // Fallback join
                    console.warn(`[finalize_entity] Using basic fallback join due to error: "${entity_word}"`);
                }
                if (entity_word) {
                    const score = current_entity_scores.length > 0 ? Math.min(...current_entity_scores) : 0.0;
                    entities.push({ entity_group: current_entity_tag_type, score: score, word: entity_word, start: null, end: null });
                } else { console.warn("[extractEntities Aggregation] Discarding entity with empty reconstructed word. Tokens were:", current_entity_tokens); }
            }
            current_entity_tokens = []; current_entity_tag_type = null; current_entity_scores = [];
        };
        for (let i = 0; i < raw_token_outputs.length; i++) {
            const token_pred = raw_token_outputs[i];
            const corrected_tag = corrected_labels[i];
            const { prefix: corrected_prefix, type: corrected_type } = getLabelParts(corrected_tag);
            if (corrected_prefix === 'B') { finalize_entity(); current_entity_tokens = [token_pred.word]; current_entity_tag_type = corrected_type; current_entity_scores = [token_pred.score]; }
            else if (corrected_prefix === 'I' && current_entity_tag_type === corrected_type) { current_entity_tokens.push(token_pred.word); current_entity_scores.push(token_pred.score); }
            else { finalize_entity(); }
        }
        finalize_entity();
        console.log(`[extractEntities] Aggregated ${entities.length} entities based on corrected Standard B-I-O tags.`);
        return entities;
    } catch (error) {
        console.error(`[extractEntities] Error during Standard B-I-O processing:`, error);
        if (error instanceof Error && error.stack) { console.error(error.stack); }
        return [];
    }
}

// --- Chain of Thought Response Generation (Unchanged) ---
// This function now calls createLanguageModel(), which will return either
// the llama-node invoker or the OpenAI invoker based on config.
/** ... generateChainOfThoughtResponse ... */
export async function generateChainOfThoughtResponse(query, context) {
    // ... (code remains exactly the same - it uses createLanguageModel) ...
    const llm = createLanguageModel();
    const formattedContext = context.map(item => `Plant: ${item.name}\n`+ (item.scientificName ? `Scientific Name: ${item.scientificName}\n` : '')+(item.description ? `Description: ${item.description}\n` : '')+(item.careInfo ? `Care Info: ${item.careInfo}\n` : '')+(item.soilNeeds ? `Soil Needs: ${item.soilNeeds}\n` : '')+`Source: ${item.source || 'Unknown'}`).join('\n\n---\n\n');
    const prompt = `You are a helpful botanical assistant. Use the following context to answer the user's query accurately and concisely. Only use information from the provided context. Do not add information not present in the context.\n\nContext:\n${formattedContext}\n\nUser Query: ${query}\n\nAssistant Answer:`;
    console.log(`[generateChainOfThoughtResponse] Sending prompt to LLM (${llm._isLocal ? 'Local/llama-node' : 'API'})...`); // Updated log
    try {
        const response = await llm.invoke(prompt); // Calls either invokeLocalLlamaNode or ChatOpenAI
        let responseText;
        if (typeof response === 'string') { responseText = response; }
        else if (response && typeof response.content === 'string') { responseText = response.content; }
        else { console.warn('Unexpected LLM response structure:', response); responseText = JSON.stringify(response); }
        console.log(`[generateChainOfThoughtResponse] Received response from LLM.`);
        const sources = context.map(item => item.source ?? 'Unknown Source').filter((v, i, a) => a.indexOf(v) === i);
        return { answer: responseText.trim(), sources: sources, };
    } catch (error) { console.error('Error generating Chain of Thought response:', error); throw error; }
}


// --- Text Embedding Generation (Unchanged) ---
/** ... generateTextEmbedding ... */
export async function generateTextEmbedding(text) {
    // ... (code remains exactly the same - uses getEmbeddingPipeline) ...
    const modelId = MODEL_CONFIG.embeddingModel;
    console.log(`[generateTextEmbedding] Requesting local embedding for text: "${text ? text.substring(0, 50):''}..." using model: ${modelId}`);
    if (!text || typeof text !== 'string' || text.trim().length === 0) { throw new Error("Cannot generate embedding for empty or invalid text."); }
    try {
        const extractor = await getEmbeddingPipeline();
        const output = await extractor(text, { pooling: 'mean', normalize: true });
        console.log("[generateTextEmbedding] Local embedding created successfully.");
        const result = Array.from(output.data);
        if (!Array.isArray(result) || result.length === 0) { throw new Error('Invalid embedding result: Not an array or empty.'); }
        if (result.length !== MODEL_CONFIG.embeddingDimension) { console.warn(`Embedding dimension mismatch: Generated ${result.length}, expected ${MODEL_CONFIG.embeddingDimension} for model ${modelId}.`); }
        if (result.some(v => typeof v !== 'number' || isNaN(v))) { throw new Error("Invalid embedding result: Contains non-numeric values."); }
        return result;
    } catch (error) { console.error('Error generating local text embedding:', error); throw error; }
}