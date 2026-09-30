// src/server/utils/promptManager.js
// Centralized prompt management for all LLM interactions

import { CONVERSATION_CONFIG } from '../../client/config/conversationConfig.js';

/**
 * Centralized prompt management system
 * Handles all prompt construction for different LLM use cases
 */
class PromptManager {
  constructor() {
    this.systemPrompts = {
      // Main conversation system prompt
      conversation: `You are PlantPal, an expert botanist and plant care specialist with decades of experience helping people care for their plants. You provide accurate, helpful, and encouraging plant care advice.

Core Expertise:
- Plant identification and classification
- Comprehensive care guidance (watering, lighting, soil, fertilizing, repotting)
- Troubleshooting plant health issues
- Species-specific care requirements
- Indoor and outdoor gardening practices

Response Guidelines:
- Be warm, encouraging, and supportive
- Provide specific, actionable advice
- Reference scientific plant names when helpful
- Acknowledge when you need more information
- Always prioritize plant and human safety
- Keep responses focused and helpful

When you have database information about plants, reference it directly and cite the sources. When working from your expertise, make that clear too.`,

      // Plant extraction specialist
      plantExtraction: `You are a plant identification expert specializing in extracting plant names from user queries.

Your task: Extract ONLY actual plant names (common or scientific names) from the user's question.

Rules:
- Return real plant names only - no question words, care terms, or generic words
- Include both common names (Christmas Cactus) and scientific names (Monstera deliciosa)
- If no specific plant is mentioned, return "NONE"
- Maximum 3 plants per response
- One plant name per line`,

      // Care advice specialist by type
      careSpecialist: {
        general: `You are an expert botanist and plant care specialist. Provide comprehensive, species-specific care guidance using database information when available.`,
        watering: `You are a plant hydration expert. Provide precise watering guidance based on species requirements, soil conditions, and environmental factors.`,
        lighting: `You are a plant lighting specialist. Guide users on optimal light conditions, placement, and recognizing light-related issues.`,
        troubleshooting: `You are a plant pathologist. Diagnose plant health issues and provide clear, actionable solutions.`,
        soil: `You are a soil and nutrition expert. Advise on proper soil types, fertilization, and root health.`,
        repotting: `You are a repotting specialist. Guide users through safe repotting practices and timing.`
      }
    };

    this.promptTemplates = {
      // Standard conversation with context
      conversation: {
        system: (contextInfo = '') => `${this.systemPrompts.conversation}

${contextInfo ? `PLANT DATABASE CONTEXT:
${contextInfo}

Use this verified information as your primary source when relevant to the user's question.
` : ''}

Current conversation:`,
        
        userTemplate: (message) => `User: ${message}`,
        assistantTemplate: (message) => `PlantPal: ${message}`
      },

      // Plant name extraction
      plantExtraction: {
        system: () => this.systemPrompts.plantExtraction,
        
        query: (userQuery) => `User question: "${userQuery}"

Plant names found:`
      },

      // Plant care advice with context
      careAdvice: {
        system: (careType = 'general', plantName = '', contextData = []) => {
          let prompt = this.systemPrompts.careSpecialist[careType] || this.systemPrompts.careSpecialist.general;
          
          if (plantName) {
            prompt = prompt.replace(/\bplant\b/gi, plantName);
            prompt += ` Focus specifically on ${plantName}.`;
          }

          if (contextData && contextData.length > 0) {
            prompt += `\n\nVERIFIED PLANT DATABASE INFORMATION:\n`;
            
            contextData.forEach((data, index) => {
              prompt += `\n--- PLANT RECORD ${index + 1} ---\n`;
              prompt += `PLANT: ${data.name || plantName}\n`;
              
              if (data.scientificName) prompt += `SCIENTIFIC NAME: ${data.scientificName}\n`;
              if (data.family) prompt += `FAMILY: ${data.family}\n`;
              if (data.source) prompt += `SOURCE: ${data.source}\n`;
              
              // Add care information
              const careFields = [
                { field: 'description', label: 'DESCRIPTION' },
                { field: 'careInfo', label: 'COMPREHENSIVE CARE' },
                { field: 'watering', label: 'WATERING' },
                { field: 'light', label: 'LIGHT REQUIREMENTS' },
                { field: 'sunlight', label: 'SUNLIGHT NEEDS' },
                { field: 'soil', label: 'SOIL' },
                { field: 'humidity', label: 'HUMIDITY' },
                { field: 'temperature', label: 'TEMPERATURE' },
                { field: 'fertilizer', label: 'FERTILIZER' },
                { field: 'repotting', label: 'REPOTTING' },
                { field: 'toxicity', label: 'SAFETY' },
                { field: 'commonIssues', label: 'COMMON PROBLEMS' }
              ];
              
              careFields.forEach(({ field, label }) => {
                if (data[field] && data[field].trim().length > 0) {
                  prompt += `${label}: ${data[field]}\n`;
                }
              });
            });

            prompt += `\nIMPORTANT: Base your response on this database information. Reference specific details and cite the data source.`;
          }

          return prompt;
        },

        userQuery: (query) => `User question: "${query}"`,
        
        response: (hasContext) => hasContext 
          ? `Expert advice (using database information):`
          : `Expert advice (using botanical expertise):`
      }
    };
  }

  /**
   * Build conversation prompt with history and context
   */
  buildConversationPrompt(userMessage, conversationHistory = [], contextInfo = '') {
    console.log(`🔧 [PROMPT MANAGER] Building conversation prompt`);
    console.log(`   - History messages: ${conversationHistory.length}`);
    console.log(`   - Context info: ${contextInfo ? 'Yes' : 'No'}`);

    const systemPrompt = this.promptTemplates.conversation.system(contextInfo);
    
    let fullPrompt = systemPrompt + '\n\n';
    
    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      const formattedHistory = this.formatConversationHistory(conversationHistory);
      fullPrompt += formattedHistory + '\n\n';
    }
    
    // Add current user message
    fullPrompt += this.promptTemplates.conversation.userTemplate(userMessage) + '\n';
    fullPrompt += 'PlantPal:';
    
    console.log(`✅ [PROMPT MANAGER] Conversation prompt built: ${fullPrompt.length} chars`);
    return fullPrompt;
  }

  /**
   * Build plant extraction prompt
   */
  buildPlantExtractionPrompt(userQuery) {
    console.log(`🔧 [PROMPT MANAGER] Building plant extraction prompt for: "${userQuery}"`);
    
    const systemPrompt = this.promptTemplates.plantExtraction.system();
    const queryPrompt = this.promptTemplates.plantExtraction.query(userQuery);
    
    const fullPrompt = `${systemPrompt}\n\n${queryPrompt}`;
    
    console.log(`✅ [PROMPT MANAGER] Plant extraction prompt built: ${fullPrompt.length} chars`);
    return fullPrompt;
  }

  /**
   * Build plant care advice prompt with context
   */
  buildCareAdvicePrompt(userQuery, plantNames = [], contextData = [], careType = 'general') {
    const primaryPlant = plantNames[0] || 'the plant';
    
    console.log(`🔧 [PROMPT MANAGER] Building care advice prompt`);
    console.log(`   - Plant: ${primaryPlant}`);
    console.log(`   - Care type: ${careType}`);
    console.log(`   - Context items: ${contextData.length}`);
    
    const systemPrompt = this.promptTemplates.careAdvice.system(careType, primaryPlant, contextData);
    const queryPrompt = this.promptTemplates.careAdvice.userQuery(userQuery);
    const responsePrompt = this.promptTemplates.careAdvice.response(contextData.length > 0);
    
    const fullPrompt = `${systemPrompt}\n\n${queryPrompt}\n\n${responsePrompt}`;
    
    console.log(`✅ [PROMPT MANAGER] Care advice prompt built: ${fullPrompt.length} chars`);
    return fullPrompt;
  }

  /**
   * Format conversation history for prompts
   */
  formatConversationHistory(messages) {
    if (!messages || messages.length === 0) return '';
    
    // Limit messages based on configuration
    const limitedMessages = messages.slice(-CONVERSATION_CONFIG.CONTEXT_MESSAGE_LIMIT);
    
    return limitedMessages
      .filter(msg => CONVERSATION_CONFIG.CONTEXT_MESSAGE_TYPES.includes(msg.type))
      .map(msg => {
        if (msg.type === 'user') {
          return this.promptTemplates.conversation.userTemplate(msg.content);
        } else if (msg.type === 'assistant') {
          return this.promptTemplates.conversation.assistantTemplate(msg.content);
        }
        return '';
      })
      .filter(line => line.length > 0)
      .join('\n');
  }

  /**
   * Determine care type from query
   */
  determineCareType(query) {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('water') || queryLower.includes('drink')) return 'watering';
    if (queryLower.includes('light') || queryLower.includes('sun')) return 'lighting';
    if (queryLower.includes('soil') || queryLower.includes('pot') || queryLower.includes('fertiliz')) return 'soil';
    if (queryLower.includes('repot') || queryLower.includes('transplant')) return 'repotting';
    if (queryLower.includes('yellow') || queryLower.includes('brown') || queryLower.includes('dying') || queryLower.includes('problem')) return 'troubleshooting';
    
    return 'general';
  }

  /**
   * Format context information for prompts
   */
  formatContextInfo(contextData) {
    if (!contextData || contextData.length === 0) return '';
    
    let contextInfo = 'Available plant information:\n';
    
    contextData.forEach((item, index) => {
      contextInfo += `\n${index + 1}. ${item.name || 'Unknown Plant'}`;
      if (item.scientificName) contextInfo += ` (${item.scientificName})`;
      if (item.source) contextInfo += ` - Source: ${item.source}`;
      contextInfo += '\n';
      
      // Add key care information
      const keyFields = ['watering', 'light', 'soil', 'careInfo'];
      keyFields.forEach(field => {
        if (item[field] && item[field].length > 20) {
          contextInfo += `   ${field}: ${item[field].substring(0, 100)}...\n`;
        }
      });
    });
    
    return contextInfo;
  }

  /**
   * Get LLM options based on prompt type
   */
  getLLMOptions(promptType, hasContext = false) {
    const baseOptions = {
      temperature: 0.7,
      max_tokens: 500,
      timeout: 30000,
      top_p: 0.9
    };

    switch (promptType) {
      case 'plantExtraction':
        return {
          ...baseOptions,
          temperature: 0.0, // Very precise for extraction
          max_tokens: 50,
          timeout: 10000
        };

      case 'careAdvice':
        return {
          ...baseOptions,
          temperature: hasContext ? 0.6 : 0.8, // Lower temp when using context
          max_tokens: 600,
          timeout: 45000
        };

      case 'conversation':
        return {
          ...baseOptions,
          temperature: 0.7,
          max_tokens: 500,
          timeout: 30000
        };

      default:
        return baseOptions;
    }
  }

  /**
   * Validate prompt before sending to LLM
   */
  validatePrompt(prompt, maxLength = 8000) {
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Invalid prompt: must be a non-empty string');
    }
    
    if (prompt.length > maxLength) {
      console.warn(`⚠️ [PROMPT MANAGER] Prompt length ${prompt.length} exceeds maximum ${maxLength}`);
      // Truncate if too long, keeping the beginning (system prompt) and end (current question)
      const truncatePoint = Math.floor(maxLength * 0.7);
      const endLength = Math.floor(maxLength * 0.3);
      const truncated = prompt.substring(0, truncatePoint) + 
                       '\n\n[... conversation history truncated ...]\n\n' +
                       prompt.substring(prompt.length - endLength);
      return truncated;
    }
    
    return prompt;
  }

  /**
   * Update system prompts (for dynamic customization)
   */
  updateSystemPrompt(type, newPrompt) {
    if (this.systemPrompts[type]) {
      this.systemPrompts[type] = newPrompt;
      console.log(`✅ [PROMPT MANAGER] Updated ${type} system prompt`);
    } else {
      console.warn(`⚠️ [PROMPT MANAGER] Unknown prompt type: ${type}`);
    }
  }

  /**
   * Get available prompt types
   */
  getAvailableTypes() {
    return {
      conversation: 'General conversation with PlantPal',
      plantExtraction: 'Extract plant names from queries',
      careAdvice: 'Generate plant care advice',
      careTypes: Object.keys(this.systemPrompts.careSpecialist)
    };
  }
}

// Create singleton instance
const promptManager = new PromptManager();

// Export main functions
export const buildConversationPrompt = (userMessage, conversationHistory, contextInfo) => 
  promptManager.buildConversationPrompt(userMessage, conversationHistory, contextInfo);

export const buildPlantExtractionPrompt = (userQuery) => 
  promptManager.buildPlantExtractionPrompt(userQuery);

export const buildCareAdvicePrompt = (userQuery, plantNames, contextData, careType) => 
  promptManager.buildCareAdvicePrompt(userQuery, plantNames, contextData, careType);

export const formatConversationHistory = (messages) => 
  promptManager.formatConversationHistory(messages);

export const determineCareType = (query) => 
  promptManager.determineCareType(query);

export const formatContextInfo = (contextData) => 
  promptManager.formatContextInfo(contextData);

export const getLLMOptions = (promptType, hasContext) => 
  promptManager.getLLMOptions(promptType, hasContext);

export const validatePrompt = (prompt, maxLength) => 
  promptManager.validatePrompt(prompt, maxLength);

// Export class and instance
export { PromptManager };
export default promptManager;