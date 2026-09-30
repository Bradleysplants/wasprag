// src/server/utils/config.js - UPDATED: Centralized configuration for modular architecture

// Helper functions for environment variable parsing
function parseNumberEnv(envVar, defaultValue) {
    const value = process.env[envVar];
    if (value === undefined || value === '') return defaultValue;
    const parsed = Number(value);
    return isNaN(parsed) ? defaultValue : parsed;
}

function parseBooleanEnv(envVar, defaultValue) {
    const value = process.env[envVar];
    if (value === undefined || value === '') return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
}

function parseArrayEnv(envVar, defaultValue = []) {
    const value = process.env[envVar];
    if (value === undefined || value === '') return defaultValue;
    return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
}

// LLM Configuration
export const LLM_CONFIG = {
    // Main provider selection
    provider: process.env.LLM_PROVIDER || 'ollama',
    
    // Ollama configuration
    ollama: {
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        model: process.env.OLLAMA_MODEL || 'mistral',
        num_predict: parseNumberEnv('OLLAMA_NUM_PREDICT', 4096),
        num_ctx: parseNumberEnv('OLLAMA_NUM_CTX', 8192),
        timeout: parseNumberEnv('OLLAMA_TIMEOUT', 300000), // 5 minutes
        availableModels: parseArrayEnv('OLLAMA_AVAILABLE_MODELS', ['mistral', 'llama2', 'codellama', 'llama3.1'])
    },
    
    // OpenAI configuration
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL_NAME || 'gpt-3.5-turbo',
        baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        timeout: parseNumberEnv('OPENAI_TIMEOUT', 60000),
        availableModels: parseArrayEnv('OPENAI_AVAILABLE_MODELS', ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'])
    },
    
    // Default generation options (applied to all providers)
    defaultOptions: {
        temperature: parseNumberEnv('MODEL_TEMPERATURE', 0.7),
        max_tokens: parseNumberEnv('MODEL_MAX_TOKENS', 1000),
        top_p: parseNumberEnv('MODEL_TOP_P', 0.9),
        top_k: parseNumberEnv('MODEL_TOP_K', 40),
        repeat_penalty: parseNumberEnv('MODEL_REPEAT_PENALTY', 1.1)
    }
};

// Embedding Configuration
export const EMBEDDING_CONFIG = {
    model: process.env.EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2',
    dimension: parseNumberEnv('EMBEDDING_DIMENSION', 384),
    provider: process.env.EMBEDDING_PROVIDER || 'onnx',
    modelPath: process.env.EMBEDDING_MODEL_PATH || '/home/bradley/wasprag/plantrag/models/embedding/model.onnx',
    batchSize: parseNumberEnv('EMBEDDING_BATCH_SIZE', 10),
    timeout: parseNumberEnv('EMBEDDING_TIMEOUT', 30000),
    maxLength: parseNumberEnv('EMBEDDING_MAX_LENGTH', 512),
    vocabSize: parseNumberEnv('EMBEDDING_VOCAB_SIZE', 30522)
};

// RAG Configuration
export const RAG_CONFIG = {
    // Vector database settings
    topK: parseNumberEnv('RAG_TOP_K', 5),
    similarityThreshold: parseNumberEnv('RAG_SIMILARITY_THRESHOLD', 0.7),
    maxContextItems: parseNumberEnv('RAG_MAX_CONTEXT_ITEMS', 10),
    
    // API augmentation settings
    enableAPIAugmentation: parseBooleanEnv('RAG_ENABLE_API_AUGMENTATION', true),
    apiTimeout: parseNumberEnv('RAG_API_TIMEOUT', 8000),
    apiRateLimit: parseNumberEnv('RAG_API_RATE_LIMIT', 300),
    maxPlantsPerQuery: parseNumberEnv('RAG_MAX_PLANTS_PER_QUERY', 3),
    maxResultsPerAPI: parseNumberEnv('RAG_MAX_RESULTS_PER_API', 2),
    
    // Context quality thresholds
    minContextItems: parseNumberEnv('RAG_MIN_CONTEXT_ITEMS', 2),
    minCareInfoLength: parseNumberEnv('RAG_MIN_CARE_INFO_LENGTH', 10),
    minDescriptionLength: parseNumberEnv('RAG_MIN_DESCRIPTION_LENGTH', 50),
    
    // Response generation settings
    maxHistoryMessages: parseNumberEnv('RAG_MAX_HISTORY_MESSAGES', 4),
    enableResponseCleaning: parseBooleanEnv('RAG_ENABLE_RESPONSE_CLEANING', true),
    enableFallbackResponses: parseBooleanEnv('RAG_ENABLE_FALLBACK_RESPONSES', true)
};

// NER Configuration
export const NER_CONFIG = {
    validEntityTypes: parseArrayEnv('NER_VALID_ENTITY_TYPES', ['PLANT_COMMON', 'PLANT_SCI', 'PLANT_NAME']),
    confidenceThreshold: parseNumberEnv('NER_CONFIDENCE_THRESHOLD', 0.6),
    maxEntities: parseNumberEnv('NER_MAX_ENTITIES', 10),
    enableAPIValidation: parseBooleanEnv('NER_ENABLE_API_VALIDATION', false),
    enableCaching: parseBooleanEnv('NER_ENABLE_CACHING', true),
    cacheSize: parseNumberEnv('NER_CACHE_SIZE', 100)
};

// Plant API Configuration
export const PLANT_API_CONFIG = {
    // API timeouts and limits
    timeout: parseNumberEnv('PLANT_API_TIMEOUT', 8000),
    rateLimitDelay: parseNumberEnv('PLANT_API_RATE_LIMIT_DELAY', 300),
    maxRetries: parseNumberEnv('PLANT_API_MAX_RETRIES', 2),
    
    // API Keys (optional)
    perenualApiKey: process.env.PERENUAL_API_KEY,
    
    // Enabled APIs
    enabledAPIs: parseArrayEnv('PLANT_ENABLED_APIS', ['gbif', 'inaturalist', 'usda', 'perenual']),
    
    // Result processing
    maxResultsPerAPI: parseNumberEnv('PLANT_API_MAX_RESULTS_PER_API', 2),
    enableCaching: parseBooleanEnv('PLANT_API_ENABLE_CACHING', true),
    cacheSize: parseNumberEnv('PLANT_API_CACHE_SIZE', 100),
    
    // Background storage
    enableBackgroundStorage: parseBooleanEnv('PLANT_API_ENABLE_BACKGROUND_STORAGE', true)
};

// Response Cleaning Configuration
export const RESPONSE_CLEANING_CONFIG = {
    enableConservativeCleaning: parseBooleanEnv('RESPONSE_CLEANING_CONSERVATIVE', true),
    preserveMinLength: parseNumberEnv('RESPONSE_CLEANING_MIN_LENGTH', 20),
    preserveRatio: parseNumberEnv('RESPONSE_CLEANING_PRESERVE_RATIO', 0.3),
    enableAdvancedCleaning: parseBooleanEnv('RESPONSE_CLEANING_ADVANCED', false),
    qualityThreshold: parseNumberEnv('RESPONSE_CLEANING_QUALITY_THRESHOLD', 70)
};

// Logging and Debug Configuration
export const DEBUG_CONFIG = {
    enableVerboseLogging: parseBooleanEnv('DEBUG_VERBOSE_LOGGING', false),
    enablePerformanceMetrics: parseBooleanEnv('DEBUG_PERFORMANCE_METRICS', true),
    enableCacheStats: parseBooleanEnv('DEBUG_CACHE_STATS', false),
    logLevel: process.env.DEBUG_LOG_LEVEL || 'info'
};

// Health Check Configuration
export const HEALTH_CHECK_CONFIG = {
    timeout: parseNumberEnv('HEALTH_CHECK_TIMEOUT', 10000),
    enableDetailedChecks: parseBooleanEnv('HEALTH_CHECK_DETAILED', true),
    checkInterval: parseNumberEnv('HEALTH_CHECK_INTERVAL', 300000), // 5 minutes
    enableAutoRecovery: parseBooleanEnv('HEALTH_CHECK_AUTO_RECOVERY', false)
};

// Combined MODEL_CONFIG for backward compatibility
export const MODEL_CONFIG = {
    // RAG settings
    ragTopK: RAG_CONFIG.topK,
    ragSimilarityThreshold: RAG_CONFIG.similarityThreshold,
    
    // Embedding settings
    embeddingModel: EMBEDDING_CONFIG.model,
    embeddingDimension: EMBEDDING_CONFIG.dimension,
    
    // NER settings
    nerValidEntityTypes: NER_CONFIG.validEntityTypes,
    nerConfidenceThreshold: NER_CONFIG.confidenceThreshold,
    
    // API settings
    timeout: PLANT_API_CONFIG.timeout,
    rateLimitDelay: PLANT_API_CONFIG.rateLimitDelay,
    maxResultsPerAPI: PLANT_API_CONFIG.maxResultsPerAPI,
    
    // Backward compatibility aliases
    llmProvider: LLM_CONFIG.provider,
    ollamaBaseUrl: LLM_CONFIG.ollama.baseUrl,
    ollamaModel: LLM_CONFIG.ollama.model,
    ollamaTimeout: LLM_CONFIG.ollama.timeout,
    openaiApiKey: LLM_CONFIG.openai.apiKey,
    openaiModel: LLM_CONFIG.openai.model,
    temperature: LLM_CONFIG.defaultOptions.temperature,
    maxNewTokens: LLM_CONFIG.defaultOptions.max_tokens
};

// Validation functions
export function validateConfig() {
    const errors = [];
    
    // Validate LLM configuration
    if (!LLM_CONFIG.provider || !['ollama', 'openai'].includes(LLM_CONFIG.provider)) {
        errors.push('LLM_PROVIDER must be either "ollama" or "openai"');
    }
    
    if (LLM_CONFIG.provider === 'ollama' && !LLM_CONFIG.ollama.baseUrl) {
        errors.push('OLLAMA_BASE_URL is required when using Ollama provider');
    }
    
    if (LLM_CONFIG.provider === 'openai' && !LLM_CONFIG.openai.apiKey) {
        errors.push('OPENAI_API_KEY is required when using OpenAI provider');
    }
    
    // Validate embedding configuration
    if (EMBEDDING_CONFIG.dimension <= 0) {
        errors.push('EMBEDDING_DIMENSION must be a positive number');
    }
    
    // Validate RAG configuration
    if (RAG_CONFIG.topK <= 0) {
        errors.push('RAG_TOP_K must be a positive number');
    }
    
    if (RAG_CONFIG.similarityThreshold < 0 || RAG_CONFIG.similarityThreshold > 1) {
        errors.push('RAG_SIMILARITY_THRESHOLD must be between 0 and 1');
    }
    
    return {
        valid: errors.length === 0,
        errors: errors
    };
}

// Get configuration summary
export function getConfigSummary() {
    return {
        llm: {
            provider: LLM_CONFIG.provider,
            model: LLM_CONFIG[LLM_CONFIG.provider]?.model,
            timeout: LLM_CONFIG[LLM_CONFIG.provider]?.timeout
        },
        embedding: {
            model: EMBEDDING_CONFIG.model,
            dimension: EMBEDDING_CONFIG.dimension,
            provider: EMBEDDING_CONFIG.provider
        },
        rag: {
            topK: RAG_CONFIG.topK,
            similarityThreshold: RAG_CONFIG.similarityThreshold,
            apiAugmentationEnabled: RAG_CONFIG.enableAPIAugmentation
        },
        plantAPI: {
            enabledAPIs: PLANT_API_CONFIG.enabledAPIs,
            timeout: PLANT_API_CONFIG.timeout,
            cachingEnabled: PLANT_API_CONFIG.enableCaching
        },
        debug: {
            verboseLogging: DEBUG_CONFIG.enableVerboseLogging,
            performanceMetrics: DEBUG_CONFIG.enablePerformanceMetrics
        }
    };
}

// Export individual configs for modular imports
export default {
    LLM_CONFIG,
    EMBEDDING_CONFIG,
    RAG_CONFIG,
    NER_CONFIG,
    PLANT_API_CONFIG,
    RESPONSE_CLEANING_CONFIG,
    DEBUG_CONFIG,
    HEALTH_CHECK_CONFIG,
    MODEL_CONFIG,
    validateConfig,
    getConfigSummary
};