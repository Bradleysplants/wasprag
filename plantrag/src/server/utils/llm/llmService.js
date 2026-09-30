// src/server/utils/llm/llmService.js - COMPLETE IMPLEMENTATION
// Enhanced LLM service with improved response handling and debugging

import { LLM_CONFIG } from '../config.js';

// Response quality analyzer
class ResponseAnalyzer {
  constructor() {
    this.qualityThresholds = {
      minLength: 20,
      maxLength: 5000,
      minWords: 5,
      plantContentMin: 2
    };
  }

  analyzeResponse(responseText, context = {}) {
    const analysis = {
      length: responseText?.length || 0,
      wordCount: responseText ? responseText.split(/\s+/).length : 0,
      hasConversationMarkers: false,
      hasPlantContent: false,
      hasContextReferences: false,
      qualityScore: 0,
      issues: []
    };

    if (!responseText || typeof responseText !== 'string') {
      analysis.issues.push('Invalid response format');
      return analysis;
    }

    const responseLower = responseText.toLowerCase();

    // Check for conversation markers
    const conversationMarkers = ['user:', 'assistant:', 'human:', 'ai:', 'bot:', 'expert:'];
    analysis.hasConversationMarkers = conversationMarkers.some(marker => 
      responseLower.includes(marker.toLowerCase())
    );

    if (analysis.hasConversationMarkers) {
      analysis.issues.push('Contains conversation markers');
    }

    // Check for plant-related content
    const plantKeywords = ['plant', 'water', 'soil', 'light', 'care', 'grow', 'leaf', 'root', 'humidity'];
    const plantMatches = plantKeywords.filter(keyword => 
      responseLower.includes(keyword)
    );
    analysis.hasPlantContent = plantMatches.length >= this.qualityThresholds.plantContentMin;

    if (!analysis.hasPlantContent) {
      analysis.issues.push('Lacks plant-related content');
    }

    // Check for context references if context provided
    if (context.hasContext) {
      const contextIndicators = ['database', 'according to', 'research', 'api', 'source'];
      analysis.hasContextReferences = contextIndicators.some(indicator => 
        responseLower.includes(indicator)
      );

      if (!analysis.hasContextReferences) {
        analysis.issues.push('May not be using provided context');
      }
    }

    // Calculate quality score (0-100)
    let score = 0;
    
    // Length scoring
    if (analysis.length >= this.qualityThresholds.minLength && analysis.length <= this.qualityThresholds.maxLength) {
      score += 20;
    }
    
    // Word count scoring
    if (analysis.wordCount >= this.qualityThresholds.minWords) {
      score += 15;
    }
    
    // Plant content scoring
    if (analysis.hasPlantContent) {
      score += 30;
    }
    
    // Context usage scoring
    if (context.hasContext && analysis.hasContextReferences) {
      score += 20;
    } else if (!context.hasContext) {
      score += 10; // No context expected
    }
    
    // No conversation markers bonus
    if (!analysis.hasConversationMarkers) {
      score += 15;
    }

    analysis.qualityScore = Math.min(100, Math.max(0, score));
    
    return analysis;
  }

  getQualityReport(analysis) {
    const status = analysis.qualityScore >= 70 ? 'GOOD' : 
                  analysis.qualityScore >= 50 ? 'FAIR' : 'POOR';
    
    return {
      status,
      score: analysis.qualityScore,
      summary: `${status} quality (${analysis.qualityScore}/100)`,
      details: {
        length: `${analysis.length} chars`,
        words: `${analysis.wordCount} words`,
        plantContent: analysis.hasPlantContent ? 'YES' : 'NO',
        contextRefs: analysis.hasContextReferences ? 'YES' : 'NO',
        conversationMarkers: analysis.hasConversationMarkers ? 'YES' : 'NO'
      },
      issues: analysis.issues
    };
  }
}

// Enhanced LLM service with comprehensive error handling and debugging
class LLMService {
  constructor() {
    this.config = LLM_CONFIG;
    this.defaultProvider = this.config.provider;
    this.responseAnalyzer = new ResponseAnalyzer();
    this.requestCounter = 0;
    this.errorStats = new Map();
    
    console.log(`🤖 [LLM Service] Initialized with provider: ${this.defaultProvider}`);
    this.logConfiguration();
  }

  logConfiguration() {
    console.log(`📋 [LLM Config] Provider: ${this.defaultProvider}`);
    
    if (this.config.ollama) {
      console.log(`📋 [LLM Config] Ollama - Model: ${this.config.ollama.model}, URL: ${this.config.ollama.baseUrl}`);
    }
    
    if (this.config.openai) {
      console.log(`📋 [LLM Config] OpenAI - Model: ${this.config.openai.model}, Has Key: ${!!this.config.openai.apiKey}`);
    }
    
    console.log(`📋 [LLM Config] Default Options:`, this.config.defaultOptions);
  }

  // Main text generation method with enhanced error handling
  async generateText(prompt, options = {}) {
    const requestId = ++this.requestCounter;
    const provider = options.provider || this.defaultProvider;
    
    console.log(`🚀 [LLM Service #${requestId}] Starting generation with ${provider}`);
    console.log(`📝 [LLM Service #${requestId}] Prompt: ${prompt.length} chars`);
    
    try {
      let result;
      const startTime = Date.now();
      
      switch (provider.toLowerCase()) {
        case 'ollama':
          result = await this.callOllama(prompt, options, requestId);
          break;
        case 'openai':
          result = await this.callOpenAI(prompt, options, requestId);
          break;
        default:
          throw new Error(`Unsupported LLM provider: ${provider}`);
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ [LLM Service #${requestId}] Completed in ${duration}ms`);
      
      return result;
      
    } catch (error) {
      const errorKey = `${provider}_${error.name || 'unknown'}`;
      this.errorStats.set(errorKey, (this.errorStats.get(errorKey) || 0) + 1);
      
      console.error(`❌ [LLM Service #${requestId}] Error with ${provider}: ${error.message}`);
      throw error;
    }
  }

  // Enhanced generateText with automatic response cleaning and validation
  async generateCleanText(prompt, options = {}, originalQuery = '') {
    try {
      const result = await this.generateText(prompt, options);
      const rawResponse = result?.text || result;
      
      if (!rawResponse || typeof rawResponse !== 'string') {
        throw new Error('Invalid LLM response format');
      }
      
      console.log(`🧹 [LLM Service] Cleaning response: ${rawResponse.length} chars`);
      
      // Analyze raw response quality
      const analysis = this.responseAnalyzer.analyzeResponse(rawResponse, {
        hasContext: prompt.includes('DATABASE') || prompt.includes('CONTEXT')
      });
      
      const qualityReport = this.responseAnalyzer.getQualityReport(analysis);
      console.log(`📊 [LLM Service] Raw response quality: ${qualityReport.summary}`);
      
      if (qualityReport.issues.length > 0) {
        console.warn(`⚠️ [LLM Service] Quality issues:`, qualityReport.issues);
      }
      
      // Clean the response
      const cleanedResponse = this.cleanResponse(rawResponse, originalQuery, {
        preserveContext: true,
        gentle: true
      });
      
      // Analyze cleaned response
      const cleanedAnalysis = this.responseAnalyzer.analyzeResponse(cleanedResponse, {
        hasContext: prompt.includes('DATABASE') || prompt.includes('CONTEXT')
      });
      
      const cleanedQuality = this.responseAnalyzer.getQualityReport(cleanedAnalysis);
      console.log(`📊 [LLM Service] Cleaned response quality: ${cleanedQuality.summary}`);
      
      // Return enhanced result
      if (typeof result === 'object' && result.text) {
        return { 
          ...result, 
          text: cleanedResponse, 
          rawText: rawResponse,
          quality: {
            raw: qualityReport,
            cleaned: cleanedQuality
          }
        };
      } else {
        return cleanedResponse;
      }
      
    } catch (error) {
      console.error(`❌ [LLM Service] generateCleanText failed: ${error.message}`);
      throw error;
    }
  }

  // Enhanced response cleaning with multiple strategies
  cleanResponse(responseText, originalQuery = '', options = {}) {
    if (!responseText || typeof responseText !== 'string') {
      return responseText;
    }

    const {
      preserveContext = true,
      gentle = true,
      preserveMinLength = 20,
      preserveRatio = 0.3
    } = options;

    console.log(`🧹 [LLM Clean] Starting cleaning (${responseText.length} chars, gentle: ${gentle})`);

    if (gentle) {
      return this._gentleClean(responseText, originalQuery, preserveContext);
    } else {
      const aggressiveCleaned = this._aggressiveClean(responseText, originalQuery);
      
      // Validate aggressive cleaning didn't remove too much
      if (this._isValidCleanedResponse(aggressiveCleaned, responseText, preserveRatio, preserveMinLength)) {
        return aggressiveCleaned;
      }
      
      console.warn('🧹 [LLM Clean] Aggressive cleaning too harsh, using gentle approach');
      return this._gentleClean(responseText, originalQuery, preserveContext);
    }
  }

  // Gentle cleaning that preserves context and quality
  _gentleClean(responseText, originalQuery, preserveContext = true) {
    let cleaned = responseText.trim();
    const originalLength = cleaned.length;
    
    console.log(`🧹 [Gentle Clean] Processing ${originalLength} chars`);
    
    // Only remove obvious conversation artifacts at start/end
    const conversationPatterns = [
      /^(user|assistant|human|ai|bot|expert)\s*:\s*/i,
      /\s*(user|assistant|human|ai|bot|expert)\s*:\s*$/i,
      /^(response|answer|advice)\s*:\s*/i
    ];
    
    conversationPatterns.forEach((pattern, index) => {
      if (cleaned.match(pattern)) {
        const before = cleaned.length;
        cleaned = cleaned.replace(pattern, '');
        const removed = before - cleaned.length;
        if (removed > 0) {
          console.log(`🧹 [Gentle Clean] Removed pattern ${index + 1}: ${removed} chars`);
        }
      }
    });
    
    // Remove query echo only if it's an exact match at the beginning
    if (originalQuery && originalQuery.length > 10) {
      const exactQueryPattern = new RegExp(
        `^\\s*${originalQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[.!?]*\\s*`, 
        'i'
      );
      
      if (cleaned.match(exactQueryPattern)) {
        const before = cleaned.length;
        cleaned = cleaned.replace(exactQueryPattern, '');
        console.log(`🧹 [Gentle Clean] Removed query echo: ${before - cleaned.length} chars`);
      }
    }
    
    // Don't remove context references if preserveContext is true
    if (!preserveContext) {
      // Remove leading context phrases that might be artifacts
      const contextPhrases = [
        /^(based on|according to)\s+(the\s+)?(database|information|data)\s+(above|provided)[,:]?\s*/i,
        /^(using|with)\s+(the\s+)?(provided|given)\s+(information|data)[,:]?\s*/i
      ];
      
      contextPhrases.forEach(phrase => {
        if (cleaned.match(phrase)) {
          const before = cleaned.length;
          cleaned = cleaned.replace(phrase, '');
          console.log(`🧹 [Gentle Clean] Removed context phrase: ${before - cleaned.length} chars`);
        }
      });
    }
    
    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // Ensure we haven't removed too much
    const removalRatio = (originalLength - cleaned.length) / originalLength;
    if (removalRatio > 0.3 && originalLength > 100) {
      console.warn(`⚠️ [Gentle Clean] Removed ${(removalRatio * 100).toFixed(1)}% of content, may be too aggressive`);
    }
    
    console.log(`✅ [Gentle Clean] Complete: ${originalLength} → ${cleaned.length} chars (${(removalRatio * 100).toFixed(1)}% removed)`);
    
    return cleaned;
  }

  // More aggressive cleaning for cases where gentle isn't enough
  _aggressiveClean(responseText, originalQuery) {
    let cleaned = responseText.trim();
    const originalLength = cleaned.length;
    
    console.log(`🧹 [Aggressive Clean] Processing ${originalLength} chars`);
    
    // Remove conversation markers anywhere in text
    cleaned = cleaned.replace(/(user|assistant|human|ai|bot)\s*:\s*/gi, '');
    
    // Remove query echoes more broadly
    if (originalQuery && originalQuery.length > 5) {
      const words = originalQuery.split(/\s+/).filter(word => word.length > 3);
      words.forEach(word => {
        const wordPattern = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        cleaned = cleaned.replace(wordPattern, (match, offset) => {
          // Only remove if it's at the beginning of the response
          return offset < 50 ? '' : match;
        });
      });
    }
    
    // Remove meta-commentary
    cleaned = cleaned.replace(/\b(here's|here is|this is|let me)\s+(some\s+)?(advice|information|guidance|help)\s+(for|about|on)\s+/gi, '');
    
    // Extract main content from conversation blocks
    const conversationMatch = cleaned.match(/assistant\s*:\s*(.*?)(?:\nuser\s*:|$)/si);
    if (conversationMatch && conversationMatch[1] && conversationMatch[1].trim().length > 50) {
      cleaned = conversationMatch[1].trim();
      console.log(`🧹 [Aggressive Clean] Extracted from conversation block`);
    }
    
    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    console.log(`✅ [Aggressive Clean] Complete: ${originalLength} → ${cleaned.length} chars`);
    
    return cleaned;
  }

  // Validate that cleaning didn't remove too much useful content
  _isValidCleanedResponse(cleaned, original, preserveRatio = 0.3, preserveMinLength = 20) {
    if (!cleaned || cleaned.length < preserveMinLength) {
      console.warn(`🔍 [Clean Validation] Too short: ${cleaned?.length || 0} chars`);
      return false;
    }
    
    if (cleaned.length < original.length * preserveRatio && original.length > 50) {
      console.warn(`🔍 [Clean Validation] Removed too much: ${cleaned.length}/${original.length} chars`);
      return false;
    }
    
    // Check if we still have meaningful content
    const meaningfulWords = ['plant', 'water', 'soil', 'light', 'care', 'grow', 'humidity', 'fertilizer'];
    const hasContent = meaningfulWords.some(word => 
      cleaned.toLowerCase().includes(word)
    );
    
    if (!hasContent && original.length > 50) {
      const originalHadContent = meaningfulWords.some(word => 
        original.toLowerCase().includes(word)
      );
      
      if (originalHadContent) {
        console.warn(`🔍 [Clean Validation] Lost meaningful content during cleaning`);
        return false;
      }
    }
    
    return true;
  }

  // Ollama implementation with enhanced error handling and timeout management
  async callOllama(prompt, options = {}, requestId = 0) {
    const model = options.model || this.config.ollama?.model;
    const baseUrl = this.config.ollama?.baseUrl;
    
    if (!model || !baseUrl) {
      throw new Error('Ollama configuration missing. Check LLM_CONFIG.ollama settings.');
    }
    
    const formattedPrompt = this.formatPromptForOllama(prompt);
    
    // Define timeout outside try block so it's accessible in catch block
    const timeoutMs = options.timeout || this.config.ollama?.timeout || 300000; // 5 minute default
    
    const requestBody = {
      model: model,
      prompt: formattedPrompt,
      stream: false,
      options: {
        temperature: options.temperature ?? this.config.defaultOptions.temperature,
        max_tokens: options.max_tokens ?? this.config.defaultOptions.max_tokens,
        top_p: options.top_p ?? this.config.defaultOptions.top_p,
        top_k: options.top_k ?? this.config.defaultOptions.top_k,
        repeat_penalty: options.repeat_penalty ?? this.config.defaultOptions.repeat_penalty,
        num_predict: options.max_tokens ?? this.config.ollama?.num_predict ?? this.config.defaultOptions.max_tokens,
        num_ctx: this.config.ollama?.num_ctx || 4096,
        
        // Enhanced stop tokens to prevent conversation continuation
        stop: [
          'user:', 'assistant:', 'User:', 'Assistant:', 
          '\nuser:', '\nassistant:', '\nUser:', '\nAssistant:',
          'human:', 'Human:', '\nhuman:', '\nHuman:',
          'ai:', 'AI:', '\nai:', '\nAI:',
          'USER:', 'ASSISTANT:', 'HUMAN:',
          '\n\n---', '=== END', '---\n'
        ],
        
        ...options.ollamaOptions
      }
    };

    console.log(`🤖 [Ollama #${requestId}] Calling model: ${model}`);
    console.log(`⚙️ [Ollama #${requestId}] Options:`, {
      temperature: requestBody.options.temperature,
      max_tokens: requestBody.options.max_tokens,
      top_p: requestBody.options.top_p
    });

    try {
      const controller = new AbortController();
      
      console.log(`⏱️ [Ollama #${requestId}] Timeout: ${timeoutMs}ms`);
      
      const timeoutId = setTimeout(() => {
        console.warn(`⏱️ [Ollama #${requestId}] Request timed out after ${timeoutMs}ms`);
        controller.abort();
      }, timeoutMs);

      const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'close',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Ollama API error: ${response.status} - ${response.statusText}. Details: ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.response) {
        console.error(`❌ [Ollama #${requestId}] Invalid response structure:`, data);
        throw new Error('Ollama response missing required fields');
      }

      // Log response statistics
      const responseLength = data.response.length;
      const tokensUsed = (data.prompt_eval_count || 0) + (data.eval_count || 0);
      
      console.log(`📊 [Ollama #${requestId}] Response: ${responseLength} chars, ${tokensUsed} tokens`);
      console.log(`📊 [Ollama #${requestId}] Timing: ${data.prompt_eval_duration || 0}ms prompt, ${data.eval_duration || 0}ms generation`);

      // Apply cleaning to Ollama response
      const cleanedResponse = this.cleanOllamaResponse(data.response);
      
      console.log(`✅ [Ollama #${requestId}] Cleaned: ${data.response.length} → ${cleanedResponse.length} chars`);
      
      return {
        text: cleanedResponse,
        rawText: data.response,
        model: model,
        provider: 'ollama',
        usage: {
          prompt_tokens: data.prompt_eval_count || 0,
          completion_tokens: data.eval_count || 0,
          total_tokens: tokensUsed
        },
        timing: {
          prompt_eval_duration: data.prompt_eval_duration || 0,
          eval_duration: data.eval_duration || 0,
          total_duration: data.total_duration || 0
        },
        raw: data
      };

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Ollama request timed out after ${timeoutMs}ms`);
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to Ollama at ${baseUrl}. Is Ollama running?`);
      } else if (error.code === 'ENOTFOUND') {
        throw new Error(`Cannot resolve Ollama host ${baseUrl}. Check your configuration.`);
      } else {
        throw error;
      }
    }
  }

  // Enhanced Ollama response cleaning
  cleanOllamaResponse(response) {
    if (!response || typeof response !== 'string') {
      return response;
    }

    // Use gentle cleaning for Ollama responses to preserve context
    return this.cleanResponse(response, '', { 
      preserveContext: true,
      gentle: true,
      preserveMinLength: 10,
      preserveRatio: 0.2
    });
  }

  // Format prompt for Ollama with better structure
  formatPromptForOllama(prompt) {
    if (typeof prompt === 'string') {
      return prompt;
    }
    
    if (Array.isArray(prompt)) {
      const formattedMessages = prompt.map((msg) => {
        if (typeof msg === 'string') {
          return msg;
        }
        if (msg && typeof msg === 'object') {
          const role = msg.role || 'user';
          const content = msg.content || msg.text || '';
          
          if (role === 'system') {
            return `=== SYSTEM INSTRUCTIONS ===\n${content}\n=== END SYSTEM ===`;
          } else if (role === 'assistant') {
            return `ASSISTANT: ${content}`;
          } else {
            return `USER: ${content}`;
          }
        }
        return String(msg);
      });

      return formattedMessages.join('\n\n') + '\n\nASSISTANT:';
    }
    
    return String(prompt);
  }

  // OpenAI implementation (enhanced with better error handling)
  async callOpenAI(prompt, options = {}, requestId = 0) {
    const model = options.model || this.config.openai?.model;
    const apiKey = this.config.openai?.apiKey;
    const baseUrl = this.config.openai?.baseUrl || 'https://api.openai.com/v1';
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log(`🤖 [OpenAI #${requestId}] Calling model: ${model}`);

    const messages = this.formatPromptForOpenAI(prompt);
    const requestBody = {
      model: model,
      messages: messages,
      temperature: options.temperature ?? this.config.defaultOptions.temperature,
      max_tokens: options.max_tokens ?? this.config.defaultOptions.max_tokens,
      top_p: options.top_p ?? this.config.defaultOptions.top_p,
      stop: options.stop || ['USER:', 'HUMAN:', '\n\n---']
    };

    console.log(`⚙️ [OpenAI #${requestId}] Options:`, {
      temperature: requestBody.temperature,
      max_tokens: requestBody.max_tokens,
      top_p: requestBody.top_p
    });

    try {
      const controller = new AbortController();
      const timeoutMs = options.timeout || 30000; // 30 second default for OpenAI
      
      const timeoutId = setTimeout(() => {
        console.warn(`⏱️ [OpenAI #${requestId}] Request timed out after ${timeoutMs}ms`);
        controller.abort();
      }, timeoutMs);

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
        throw new Error(`OpenAI API error: ${errorMessage}`);
      }

      const data = await response.json();
      
      if (!data.choices?.[0]?.message?.content) {
        throw new Error('OpenAI response missing content');
      }

      const responseText = data.choices[0].message.content;
      console.log(`📊 [OpenAI #${requestId}] Response: ${responseText.length} chars`);
      
      return {
        text: responseText,
        model: model,
        provider: 'openai',
        usage: data.usage,
        raw: data
      };

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`OpenAI request timed out after ${timeoutMs}ms`);
      }
      throw error;
    }
  }

  // Format prompt for OpenAI
  formatPromptForOpenAI(prompt) {
    if (Array.isArray(prompt)) {
      return prompt.map(msg => {
        if (typeof msg === 'string') {
          return { role: 'user', content: msg };
        }
        if (msg && typeof msg === 'object' && msg.role && msg.content) {
          return msg;
        }
        return { role: 'user', content: String(msg) };
      });
    }
    
    if (typeof prompt === 'string') {
      return [{ role: 'user', content: prompt }];
    }
    
    return [{ role: 'user', content: String(prompt) }];
  }

  // Test LLM functionality with detailed reporting
  async testLLM(provider = null) {
    const testProvider = provider || this.defaultProvider;
    const testPrompt = "Hello! Please respond with exactly 'LLM connectivity test successful' and nothing else.";
    
    console.log(`🧪 [LLM Test] Testing ${testProvider} connectivity...`);
    
    try {
      const startTime = Date.now();
      const result = await this.generateText(testPrompt, { 
        provider: testProvider,
        max_tokens: 50,
        temperature: 0.1,
        timeout: 15000
      });
      const duration = Date.now() - startTime;
      
      const responseText = result?.text || result;
      
      if (responseText && typeof responseText === 'string') {
        const isExpectedResponse = responseText.toLowerCase().includes('test successful');
        
        console.log(`✅ [LLM Test] ${testProvider} test completed in ${duration}ms`);
        console.log(`📝 [LLM Test] Response: "${responseText}"`);
        
        return {
          success: true,
          provider: testProvider,
          model: result.model,
          response: responseText,
          duration: duration,
          usage: result.usage,
          expectedResponse: isExpectedResponse
        };
      } else {
        throw new Error('No valid response received');
      }
      
    } catch (error) {
      console.error(`❌ [LLM Test] ${testProvider} failed: ${error.message}`);
      
      return {
        success: false,
        provider: testProvider,
        error: error.message,
        errorType: error.name || 'Unknown'
      };
    }
  }

  // Comprehensive health check
  async healthCheck() {
    const results = {
      service: 'unknown',
      providers: {},
      defaultProvider: this.defaultProvider,
      statistics: {
        totalRequests: this.requestCounter,
        errorCounts: Object.fromEntries(this.errorStats)
      },
      timestamp: new Date().toISOString()
    };

    console.log(`🏥 [Health Check] Running comprehensive health check...`);

    // Test default provider
    console.log(`🏥 [Health Check] Testing default provider: ${this.defaultProvider}`);
    const defaultTest = await this.testLLM();
    results.providers[this.defaultProvider] = defaultTest;

    // Test other configured providers
    const availableProviders = Object.keys(this.config).filter(key => 
      key !== 'provider' && key !== 'defaultOptions' && typeof this.config[key] === 'object'
    );

    for (const provider of availableProviders) {
      if (provider !== this.defaultProvider) {
        console.log(`🏥 [Health Check] Testing ${provider}...`);
        const providerTest = await this.testLLM(provider);
        results.providers[provider] = providerTest;
      }
    }

    // Test response cleaning functionality
    try {
      const testResponse = "user: test question\nassistant: this is a test response about plant care with watering advice.";
      const cleaned = this.cleanResponse(testResponse, "test question");
      const analysis = this.responseAnalyzer.analyzeResponse(cleaned);
      
      results.responseCleaning = {
        working: cleaned.length > 0 && cleaned !== testResponse,
        qualityScore: analysis.qualityScore,
        originalLength: testResponse.length,
        cleanedLength: cleaned.length
      };

      console.log(`🧹 [Health Check] Response cleaning: ${results.responseCleaning.working ? 'WORKING' : 'FAILED'}`);
      
    } catch (error) {
      results.responseCleaning = { working: false, error: error.message };
      console.error(`❌ [Health Check] Response cleaning failed: ${error.message}`);
    }

    // Determine overall health
    const workingProviders = Object.values(results.providers).filter(p => p.success);
    const hasWorkingProvider = workingProviders.length > 0;
    const cleaningWorks = results.responseCleaning?.working || false;
    
    if (hasWorkingProvider && cleaningWorks) {
      results.service = 'healthy';
    } else if (hasWorkingProvider || cleaningWorks) {
      results.service = 'degraded';
    } else {
      results.service = 'unhealthy';
    }

    console.log(`🏥 [Health Check] Overall status: ${results.service.toUpperCase()}`);
    console.log(`📊 [Health Check] Working providers: ${workingProviders.length}/${Object.keys(results.providers).length}`);

    return results;
  }

  // Get service statistics
  getStatistics() {
    return {
      totalRequests: this.requestCounter,
      errorCounts: Object.fromEntries(this.errorStats),
      uptime: process.uptime(),
      configuration: {
        defaultProvider: this.defaultProvider,
        availableProviders: Object.keys(this.config).filter(key => 
          key !== 'provider' && key !== 'defaultOptions'
        )
      }
    };
  }
}

// Create singleton instance
const llmService = new LLMService();

// Export both the instance and the class
export default llmService;
export { LLMService, ResponseAnalyzer };

// Convenience exports for backward compatibility
export const generateText = (prompt, options) => llmService.generateText(prompt, options);
export const generateCleanText = (prompt, options, originalQuery) => llmService.generateCleanText(prompt, options, originalQuery);
export const cleanResponse = (responseText, originalQuery, options) => llmService.cleanResponse(responseText, originalQuery, options);
export const testLLM = (provider) => llmService.testLLM(provider);
export const healthCheck = () => llmService.healthCheck();