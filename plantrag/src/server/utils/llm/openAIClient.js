// src/utils/llm/openAIClient.js
import { ChatOpenAI } from '@langchain/openai';
import { MODEL_CONFIG } from '../config.js';

let openAIInstance = null;
let loadedOpenAIConfig = null; // To track if config changed

function getOpenAIInstance() {
    const currentConfig = {
        model: MODEL_CONFIG.openaiModel,
        temperature: MODEL_CONFIG.temperature,
        apiKey: MODEL_CONFIG.openaiApiKey,
        maxTokens: MODEL_CONFIG.maxNewTokens,
    };

    // Check if config relevant to OpenAI has changed
    if (openAIInstance && JSON.stringify(loadedOpenAIConfig) === JSON.stringify(currentConfig)) {
        return openAIInstance;
    }

    if (!currentConfig.apiKey) {
        throw new Error("[OpenAI Client] API key is missing. Cannot create OpenAI instance.");
    }
    if (!currentConfig.model) {
        throw new Error("[OpenAI Client] Model name is missing. Cannot create OpenAI instance.");
    }

    console.log(`[OpenAI Client] Initializing Langchain ChatOpenAI with model: ${currentConfig.model}`);
    try {
        openAIInstance = new ChatOpenAI({
            model: currentConfig.model,
            temperature: currentConfig.temperature,
            openAIApiKey: currentConfig.apiKey,
            maxTokens: currentConfig.maxTokens,
        });
        loadedOpenAIConfig = currentConfig; // Cache the config used
        console.log('[OpenAI Client] Instance created successfully.');
        return openAIInstance;
    } catch (error) {
        console.error('[OpenAI Client] Failed to create ChatOpenAI instance:', error);
        openAIInstance = null; // Clear cache on error
        loadedOpenAIConfig = null;
        throw error;
    }
}


/** Invokes the configured OpenAI model. */
export async function invoke(prompt) {
    // console.log(`[OpenAI Client] Invoking prompt (start): "${prompt.substring(0, 50)}..."`); // Less verbose
    try {
        const llm = getOpenAIInstance(); // Get or create the instance
        const response = await llm.invoke(prompt);

        // Process response
        let responseText = '';
        if (typeof response === 'string') {
            responseText = response;
        } else if (response && typeof response.content === 'string') { // Handle AIMessage structure
            responseText = response.content;
        } else {
            console.warn('[OpenAI Client] Unexpected LLM response structure:', response);
            responseText = JSON.stringify(response); // Fallback
        }
        // console.log('[OpenAI Client] Response received.'); // Less verbose
        return responseText.trim();
    } catch (error) {
        console.error("[OpenAI Client] Error during LLM invocation:", error);
        throw error;
    }
}