// src/server/utils/config.js - BigInt-safe configuration without Xenova references
import path from 'path';

// Load environment variables
import 'dotenv/config';

// Helper functions (moved to top before MODEL_CONFIG)
function parseBooleanEnv(envVar, defaultValue = false) {
    const value = process.env[envVar];
    if (value === undefined || value === null) return defaultValue;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        return value.toLowerCase() === 'true' || value === '1';
    }
    return Boolean(value);
}

function parseNumberEnv(envVar, defaultValue) {
    const value = process.env[envVar];
    if (value === undefined || value === null) return defaultValue;
    const parsed = Number(value);
    return isNaN(parsed) ? defaultValue : parsed;
}

// Function to get embedding model (no Xenova prefix)
function getEmbeddingModel() {
    const envModel = process.env.EMBEDDING_MODEL;
    
    // Remove Xenova/ prefix if it exists (legacy cleanup)
    if (envModel && envModel.startsWith('Xenova/')) {
        const cleanModel = envModel.replace('Xenova/', 'sentence-transformers/');
        console.log(`[Config] Converted embedding model: ${envModel} → ${cleanModel}`);
        return cleanModel;
    }
    
    // Use environment or sensible default
    return envModel || 'sentence-transformers/bge-large-en-v1.5';
}

// Main configuration object
export const MODEL_CONFIG = {
    // LLM Configuration
    llmProvider: process.env.LLM_PROVIDER || 'ollama', // Changed default to ollama
    ggufModelPath: process.env.GGUF_MODEL_PATH || '/home/bradley/wasprag/plantrag/models/gguf/Meta-Llama-3.1-8B-Instruct-Q8_0.gguf',
    mainLlmModel: process.env.MODEL_NAME || 'TheBloke/Mistral-7B-Instruct-v0.2-GGUF',
    ggufModelFileName: process.env.GGUF_MODEL_FILE_NAME || 'mistral-7b-instruct-v0.2.Q4_K_M.gguf',
    
    // Llama.cpp options (only used if llmProvider is 'local:llama.cpp')
    llamaNodeOptions: {
        nCtx: parseNumberEnv('LLAMA_CTX_SIZE', 2048),
        nThreads: parseNumberEnv('LLAMA_THREADS', 4),
        nGpuLayers: parseNumberEnv('LLAMA_GPU_LAYERS', 0),
        verbose: parseBooleanEnv('LLAMA_VERBOSE', false),
        useMlock: parseBooleanEnv('LLAMA_USE_MLOCK', false),
        useMmap: parseBooleanEnv('LLAMA_USE_MMAP', true),
    },
    
    // Model generation parameters
    temperature: parseNumberEnv('MODEL_TEMPERATURE', 0.7),
    maxNewTokens: parseNumberEnv('MODEL_MAX_TOKENS', 512),
    llamaTopK: parseNumberEnv('LLAMA_TOP_K', 40),
    llamaTopP: parseNumberEnv('LLAMA_TOP_P', 0.9),
    llamaRepeatPenalty: parseNumberEnv('LLAMA_REPEAT_PENALTY', 1.1),
    
    // Embeddings Configuration (BigInt-safe, API-based)
    embeddingModel: getEmbeddingModel(),
    embeddingDimension: parseNumberEnv('EMBEDDING_DIMENSION', 384),

    // API Tokens
    hfToken: process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY,
    
    // OpenAI Fallback
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL_NAME || 'gpt-3.5-turbo',
    
    // Ollama Configuration
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_MODEL || 'mistral',
    ollamaTimeout: parseNumberEnv('OLLAMA_TIMEOUT', 600000), // 10 minutes in ms

};

// Debug logging for environment variables
console.log('[Config] Environment variable validation:');
console.log(`  LLM_PROVIDER: ${MODEL_CONFIG.llmProvider}`);
console.log(`  EMBEDDING_MODEL: ${MODEL_CONFIG.embeddingModel}`);
console.log(`  HF_TOKEN: ${MODEL_CONFIG.hfToken ? 'SET' : 'MISSING'}`);

// Llama.cpp specific debug (only if relevant)
if (MODEL_CONFIG.llmProvider === 'local:llama.cpp') {
    console.log('[Config] Llama.cpp environment variables:');
    [
        'LLAMA_CTX_SIZE', 'LLAMA_THREADS', 'LLAMA_GPU_LAYERS',
        'LLAMA_VERBOSE', 'LLAMA_USE_MLOCK', 'LLAMA_USE_MMAP'
    ].forEach(envVar => {
        const value = process.env[envVar];
        console.log(`  ${envVar}: ${typeof value} = "${value}"`);
    });
}

function validateEmbeddingConfig() {
    const embeddingModel = MODEL_CONFIG.embeddingModel;
    
    if (embeddingModel.startsWith('Xenova/')) {
        console.error(`[Config Error] Embedding model still has Xenova prefix: ${embeddingModel}`);
        console.error(`[Config Error] Please update EMBEDDING_MODEL to remove 'Xenova/' prefix`);
        return false;
    }
    
    console.log(`[Config] ✅ Using embedding model: ${embeddingModel}`);
    return true;
}

function validateApiTokens() {
    if (!MODEL_CONFIG.hfToken) {
        console.warn('[Config Warning] No HuggingFace token found (HF_TOKEN)');
        console.warn('[Config Warning] API-based models may not work without authentication');
        return false;
    }
    
    console.log('[Config] ✅ HuggingFace token configured');
    return true;
}

// Run all validations
const isEmbeddingValid = validateEmbeddingConfig();
const hasTokens = validateApiTokens();

if (!isEmbeddingValid) {
    console.warn('[Config] Embedding model validation failed - remove Xenova prefix');
}

if (!hasTokens) {
    console.warn('[Config] API tokens missing - some features may not work');
}

// LLM provider validation
if (MODEL_CONFIG.llmProvider === 'local:llama.cpp') {
    const useLocalPath = MODEL_CONFIG.ggufModelPath && MODEL_CONFIG.ggufModelPath.trim() !== '';
    if (useLocalPath) {
        console.log(`[Config] LLM configured to use LOCAL GGUF path: ${MODEL_CONFIG.ggufModelPath}`);
        if (!path.isAbsolute(MODEL_CONFIG.ggufModelPath)) {
            console.warn(`[Config Warning] Local GGUF_MODEL_PATH (${MODEL_CONFIG.ggufModelPath}) is not absolute.`);
        }
    } else {
        if (!MODEL_CONFIG.mainLlmModel || !MODEL_CONFIG.ggufModelFileName) {
            throw new Error("Configuration Error: For llama.cpp via HF Hub, set 'MODEL_NAME' and 'GGUF_MODEL_FILE_NAME'");
        }
        console.log(`[Config] LLM configured to load GGUF '${MODEL_CONFIG.ggufModelFileName}' from HF Repo '${MODEL_CONFIG.mainLlmModel}'.`);
    }
} else if (MODEL_CONFIG.llmProvider === 'ollama') {
    console.log(`[Config] LLM configured to use Ollama at ${MODEL_CONFIG.ollamaBaseUrl} with model '${MODEL_CONFIG.ollamaModel}'`);
} else if (MODEL_CONFIG.llmProvider === 'openai') {
    if (!MODEL_CONFIG.openaiApiKey) { 
        console.warn("[Config Warning] OpenAI provider selected but OPENAI_API_KEY is missing!"); 
    } else {
        console.log(`[Config] LLM configured to use OpenAI with model '${MODEL_CONFIG.openaiModel}'`);
    }
}

// Final summary
console.log(`[Config] ✅ Configuration initialized successfully`);
console.log(`[Config] LLM Provider: ${MODEL_CONFIG.llmProvider}`);
console.log(`[Config] Embedding Model: ${MODEL_CONFIG.embeddingModel}`);


export function getEmbeddingModelInfo() {
    return {
        id: MODEL_CONFIG.embeddingModel,
        dimension: MODEL_CONFIG.embeddingDimension,
        hasXenovaPrefix: MODEL_CONFIG.embeddingModel.startsWith('Xenova/'),
        isApiReady: !MODEL_CONFIG.embeddingModel.startsWith('Xenova/')
    };
}