// src/utils/config.js
import path from 'path';

// Load environment variables (ensure dotenv is configured in your main server entry point if needed)
import 'dotenv/config'; // Or your preferred way to load .env

export const MODEL_CONFIG = {
    // LLM related
    llmProvider: process.env.LLM_PROVIDER || 'local:llama.cpp', // 'local:llama.cpp' or 'openai'

    // --- Option 1: Load LOCAL GGUF ---
    // Set GGUF_MODEL_PATH if you have a specific local file path (e.g., /kaggle/working/models/...)
    // Leave blank or unset if loading from Hugging Face Hub.
    ggufModelPath: process.env.GGUF_MODEL_PATH || '/home/bradley/wasprag/plantrag/models/gguf/Meta-Llama-3.1-8B-Instruct-Q8_0.gguf',

    // --- Option 2: Load from HUGGING FACE HUB ---
    // Set MODEL_NAME to the HF Repo ID if loading from Hub (and ggufModelPath is empty)
    mainLlmModel: process.env.MODEL_NAME || 'TheBloke/Mistral-7B-Instruct-v0.2-GGUF', // *** HF REPO ID ***
    // Set GGUF_MODEL_FILE_NAME to the specific file within the repo
    ggufModelFileName: process.env.GGUF_MODEL_FILE_NAME || 'mistral-7b-instruct-v0.2.Q4_K_M.gguf', // *** EXACT .gguf FILENAME ***

    // --- llama-node options ---
    llamaNodeOptions: {
        nCtx: parseInt(process.env.LLAMA_CTX_SIZE || "2048"),
        nThreads: parseInt(process.env.LLAMA_THREADS || "4"), // Adjust based on Kaggle CPU cores
        nGpuLayers: parseInt(process.env.LLAMA_GPU_LAYERS || "0"), // Keep 0 for Kaggle CPU llama.cpp
        // Add other llama.cpp options here if needed (e.g., embedding: false)
    },
    // --- Generation Params ---
    temperature: parseFloat(process.env.MODEL_TEMPERATURE || "0.7"),
    maxNewTokens: parseInt(process.env.MODEL_MAX_TOKENS || "512"),
    llamaTopK: parseInt(process.env.LLAMA_TOP_K || "40"),
    llamaTopP: parseFloat(process.env.LLAMA_TOP_P || "0.9"),
    llamaRepeatPenalty: parseFloat(process.env.LLAMA_REPEAT_PENALTY || "1.1"),

    // --- Embeddings & NER (Unchanged) ---
    embeddingModel: process.env.EMBEDDING_MODEL || 'Xenova/bge-large-en-v1.5',
    embeddingDimension: 1024,
    nerModel: process.env.NER_MODEL_NAME || '/home/bradley/wasprag/plantrag/models',    nerValidEntityTypes: ['PLANT_SCI', 'PLANT_COMMON'],
    nerScoreThreshold: parseFloat(process.env.NER_SCORE_THRESHOLD || "0.70"),

    // --- OpenAI Fallback ---
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL_NAME || 'gpt-3.5-turbo',
};

// --- Validate Configuration ---
if (MODEL_CONFIG.llmProvider === 'local:llama.cpp') {
    const useLocalPath = MODEL_CONFIG.ggufModelPath && MODEL_CONFIG.ggufModelPath.trim() !== '';

    if (useLocalPath) {
         console.log(`[Config] LLM configured to use LOCAL GGUF path: ${MODEL_CONFIG.ggufModelPath}`);
         // Optional: Check if path is absolute (recommended for local paths)
         if (!path.isAbsolute(MODEL_CONFIG.ggufModelPath)) {
             console.warn(`[Config Warning] Local GGUF_MODEL_PATH (${MODEL_CONFIG.ggufModelPath}) is not absolute. Ensure it's correct relative to server execution dir.`);
         }
         // Optional: Check file existence dynamically (can add overhead)
         // import('fs').then(fs => { if (!fs.existsSync(MODEL_CONFIG.ggufModelPath)) console.error(`[Config Error] Local GGUF file not found: ${MODEL_CONFIG.ggufModelPath}`); })
         //    .catch(err => console.warn("Could not check local GGUF path existence."));
    } else {
         // Using Hugging Face Hub ID
         if (!MODEL_CONFIG.mainLlmModel || !MODEL_CONFIG.ggufModelFileName) {
             throw new Error("Configuration Error: For llama.cpp via HF Hub, set 'MODEL_NAME' (HF Repo ID) and 'GGUF_MODEL_FILE_NAME' environment variables (or ensure GGUF_MODEL_PATH is set for local files).");
         }
         console.log(`[Config] LLM configured to load GGUF '${MODEL_CONFIG.ggufModelFileName}' from HF Repo '${MODEL_CONFIG.mainLlmModel}'.`);
    }
} else if (MODEL_CONFIG.llmProvider === 'openai') {
    if (!MODEL_CONFIG.openaiApiKey) { console.warn("[Config Warning] OpenAI provider selected but OPENAI_API_KEY is missing!"); }
    if (!MODEL_CONFIG.openaiModel) { console.warn("[Config Warning] OPENAI_MODEL_NAME not set, using default."); }
} else if (MODEL_CONFIG.llmProvider) {
     console.warn(`[Config Warning] Unknown LLM_PROVIDER specified: '${MODEL_CONFIG.llmProvider}'. Check configuration.`);
}

console.log(`[Config] Initialized configuration.`);

// Optional: Export a function to get config if you want more control later
// export function getConfig() { return MODEL_CONFIG; }