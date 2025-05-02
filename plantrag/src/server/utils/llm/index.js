// src/utils/llm/index.js
import { MODEL_CONFIG } from '../config.js'; // Import from the new config file location
import * as llamaNodeClient from './llamaNodeClient.js';
import * as openAIClient from './openAIClient.js';

// Simple cache for the final language model client object
let languageModelClient = null;
let lastProvider = null;

/**
 * Creates or returns the appropriate language model client based on config.
 * Provides a consistent interface ({ invoke: function }).
 */
export function createLanguageModel() {
    const provider = MODEL_CONFIG.llmProvider;

    // Return cached instance if provider hasn't changed
    // NOTE: This simple cache doesn't handle cases where underlying config
    // (like model path or API key) changes without the provider changing.
    // More robust caching could check specific config values if needed.
    if (languageModelClient && lastProvider === provider) {
        return languageModelClient;
    }

    console.log(`[LLM Factory] Creating language model for provider: ${provider}`);
    lastProvider = provider; // Update cache key

    if (provider === 'local:llama.cpp') {
        languageModelClient = {
            invoke: llamaNodeClient.invoke, // Point to the llama-node invoke function
            _isLocal: true, // Keep internal flag
        };
        return languageModelClient;
    }

    if (provider === 'openai') {
         // Basic check if API key seems configured
        if (!MODEL_CONFIG.openaiApiKey) {
             console.error("[LLM Factory] OpenAI provider selected but OPENAI_API_KEY is missing!");
             throw new Error("OpenAI provider selected but API key is missing.");
        }
        languageModelClient = {
            invoke: openAIClient.invoke, // Point to the OpenAI invoke function
            _isLocal: false,
        };
        return languageModelClient;
    }

    // --- Add other providers here if needed ---
    // else if (provider === 'some-other-api') { ... }

    // Default: Throw error if provider is unknown or misconfigured
    languageModelClient = null; // Clear cache
    throw new Error(`Unsupported or misconfigured LLM_PROVIDER: '${provider}'. Check configuration.`);
}