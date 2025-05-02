// src/utils/llm/llamaNodeClient.js
import { LLama } from 'llama-node';
import { LLamaCpp } from 'llama-node/dist/llm/llama-cpp.js'; // Import specific backend
import { MODEL_CONFIG } from '../config.js'; // Get config
import path from 'path';
import os from 'os'; // To get home directory for potential cache path

// --- Cache ---
let llamaNodeInstance = null;
let loadedModelIdentifier = null; // Tracks either path OR HF ID

// --- Function to get a potential local cache path ---
// This is a suggestion; llama-node might use its own internal caching path.
function getModelCachePath(repoId, filename) {
    const safeRepoName = repoId.replace(/\//g, '_'); // Replace slashes for dir name
    // Try common cache locations or fallback to project dir/kaggle working
    const baseCacheDir = process.env.LLAMA_NODE_CACHE_DIR || // Allow overriding cache
                        (os.homedir ? path.join(os.homedir(), '.cache', 'llama-node-models') : null) ||
                        path.resolve(process.cwd(), '.cache', 'llama-node-models');

    // Ensure cache directory exists
    try {
        const fs = require('fs'); // Use require inside function for optionality
        if (!fs.existsSync(baseCacheDir)) {
            fs.mkdirSync(baseCacheDir, { recursive: true });
            console.log(`[Llama Node Cache] Created cache directory: ${baseCacheDir}`);
        }
    } catch (e) { console.warn("Could not check/create default cache directory."); }

    return path.join(baseCacheDir, safeRepoName, filename); // Place in subfolder per repo
}

/** Gets or creates the llama-node LLama instance, attempting HF download if needed. */
async function getLlamaNodeInstance() {
    const useLocalPath = MODEL_CONFIG.ggufModelPath && MODEL_CONFIG.ggufModelPath.trim() !== '';
    const modelIdentifier = useLocalPath ? MODEL_CONFIG.ggufModelPath : MODEL_CONFIG.mainLlmModel; // Path or Repo ID
    const ggufFileName = MODEL_CONFIG.ggufModelFileName; // Specific GGUF filename

    if (!modelIdentifier) {
        throw new Error("LLM configuration error: Identifier (GGUF_MODEL_PATH or MODEL_NAME) is missing.");
    }

    // Return cached instance if identifier hasn't changed
    if (llamaNodeInstance && loadedModelIdentifier === modelIdentifier) {
        // console.log('[Llama Node] Returning cached LLM instance.');
        return llamaNodeInstance;
    }

    console.log(`[Llama Node] Initializing LLM using identifier: ${modelIdentifier}`);

    const llama = new LLama(LLamaCpp); // Select the C++ backend
    let configForLoad = {
        // Core llama.cpp options will be spread later
    };

    if (useLocalPath) {
        // --- Case 1: Loading from a pre-defined local GGUF file path ---
        console.log(`[Llama Node] Attempting to load from local path: ${modelIdentifier}`);
        configForLoad.path = modelIdentifier; // Path to the existing GGUF file

        // Optional: Check file existence
        try {
            await import('fs').then(fs => { if (!fs.existsSync(configForLoad.path)) throw new Error(`Local GGUF file not found: ${configForLoad.path}`); });
            console.log(`[Llama Node] Local file found: ${configForLoad.path}`);
        } catch (fsError) {
             console.error(`[Llama Node] Error checking local GGUF file: ${fsError.message}. Load will likely fail.`);
             // Throw error here if file must exist beforehand
             throw fsError;
        }
    } else {
        // --- Case 2: Loading from Hugging Face Hub ID ---
        console.log(`[Llama Node] Attempting to load from Hugging Face repo: ${modelIdentifier}`);
        if (!ggufFileName) {
             throw new Error(`LLM configuration error: 'GGUF_MODEL_FILE_NAME' must be set when loading from Hugging Face repo ('${modelIdentifier}')`);
        }

        // Define keys potentially used by llama-node for HF download
        // Consult specific llama-node version docs if these don't work
        configForLoad.hfRepo = modelIdentifier; // The HF repo ID (e.g., TheBloke/...)
        configForLoad.hfFile = ggufFileName;    // The specific .gguf file (e.g., model.Q4_K_M.gguf)
        // `llama-node` *might* use the 'path' key as the download/cache destination.
        // Let's provide a suggested cache path.
        configForLoad.path = getModelCachePath(modelIdentifier, ggufFileName);

        console.log(`[Llama Node] Expecting GGUF file '${ggufFileName}' from repo '${modelIdentifier}'.`);
        console.log(`[Llama Node] Will check/download to path: ${configForLoad.path}`);
    }

    // Add the core llama options from config
    configForLoad = {
        ...configForLoad,
        ...MODEL_CONFIG.llamaNodeOptions // Spread options like nCtx, nGpuLayers etc.
    };


    try {
        console.log('[Llama Node] Calling llama.load with config:', configForLoad);
        await llama.load(configForLoad); // Load the model (downloads if path doesn't exist and hfRepo/hfFile are valid)

        llamaNodeInstance = llama; // Cache the loaded instance
        loadedModelIdentifier = modelIdentifier; // Cache based on original identifier (path or repo ID)
        console.log('[Llama Node] Model loaded successfully.');
        return llamaNodeInstance;
    } catch (error) {
        console.error(`[Llama Node] Failed to load model using identifier ${modelIdentifier}:`, error);
        llamaNodeInstance = null; // Clear cache on error
        loadedModelIdentifier = null;
        throw error; // Re-throw to indicate failure
    }
}

/** Invokes the configured local LLM using llama-node. */
export async function invoke(prompt) {
    // console.log(`[Llama Node] Invoking prompt (start): "${prompt.substring(0, 50)}..."`);
    try {
        const llama = await getLlamaNodeInstance(); // Get the loaded instance
        const params = {
            prompt: prompt,
            temp: MODEL_CONFIG.temperature,
            topK: MODEL_CONFIG.llamaTopK,
            topP: MODEL_CONFIG.llamaTopP,
            repeatPenalty: MODEL_CONFIG.llamaRepeatPenalty,
            nPredict: MODEL_CONFIG.maxNewTokens,
            // stop: ["\nHuman:"] // Optional stop sequences
        };
        // console.log(`[Llama Node] Generation parameters: ${JSON.stringify(params)}`);
        const result = await llama.createCompletion(params);
        // console.log('[Llama Node] Completion generated.');
        return result?.completion?.trim() || '';
    } catch (error) {
        console.error("[Llama Node] Error during LLM invocation:", error);
        throw error;
    }
}