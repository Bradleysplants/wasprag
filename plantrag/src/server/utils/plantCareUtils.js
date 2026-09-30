// src/server/utils/plantCareUtils.js
// UPDATED: Now uses centralized PromptManager instead of local prompt building

import { generateText } from './llm/llmService.js';
import { 
  buildCareAdvicePrompt, 
  determineCareType, 
  getLLMOptions,
  validatePrompt 
} from './promptManager.js';

// Context validation helper (unchanged)
function validateContextData(contextData, plantNames) {
  if (!contextData || contextData.length === 0) {
    console.log(`🔍 [CARE CONTEXT] No context data provided for plants: [${plantNames.join(', ')}]`);
    return { isValid: false, reason: 'No context data', careFields: 0 };
  }
  
  let totalCareFields = 0;
  let validItems = 0;
  
  console.log(`🔍 [CARE CONTEXT] Validating ${contextData.length} context items:`);
  
  contextData.forEach((item, index) => {
    const careFields = ['watering', 'light', 'sunlight', 'soil', 'humidity', 'temperature', 'fertilizer', 'careInfo', 'description'];
    const availableFields = careFields.filter(field => 
      item[field] && typeof item[field] === 'string' && item[field].trim().length > 10
    );
    
    totalCareFields += availableFields.length;
    
    if (availableFields.length > 0) {
      validItems++;
      console.log(`   ✓ Item ${index + 1}: ${item.name || 'Unknown'} (${availableFields.length} care fields) from ${item.source || 'Unknown'}`);
    } else {
      console.log(`   ❌ Item ${index + 1}: ${item.name || 'Unknown'} - no useful care data`);
    }
  });
  
  const avgCareFields = totalCareFields / contextData.length;
  const validation = {
    isValid: validItems > 0,
    validItems,
    totalItems: contextData.length,
    careFields: totalCareFields,
    avgCareFields,
    reason: validItems > 0 ? 'Valid context available' : 'No valid care data'
  };
  
  console.log(`📊 [CARE CONTEXT] Validation: ${validItems}/${contextData.length} valid items, ${avgCareFields.toFixed(1)} avg care fields`);
  
  return validation;
}

// Enhanced response validation (unchanged)
function validatePlantCareResponse(response, contextData, plantNames, originalQuery) {
  if (!response || typeof response !== 'string') {
    console.error('❌ [CARE VALIDATION] Invalid response format');
    return { isValid: false, reason: 'Invalid format', score: 0 };
  }
  
  const responseLength = response.trim().length;
  console.log(`🔍 [CARE VALIDATION] Analyzing response (${responseLength} chars)...`);
  
  if (responseLength < 30) {
    console.error('❌ [CARE VALIDATION] Response too short');
    return { isValid: false, reason: 'Too short', score: 0 };
  }
  
  const responseLower = response.toLowerCase();
  let validationScore = 0;
  
  // Check for plant content
  const plantKeywords = ['plant', 'water', 'light', 'soil', 'care', 'grow', 'leaf', 'root', 'humidity'];
  const plantContentCount = plantKeywords.filter(word => responseLower.includes(word)).length;
  validationScore += plantContentCount * 0.5;
  console.log(`🌱 [CARE VALIDATION] Plant keywords: ${plantContentCount}/${plantKeywords.length}`);
  
  // Check if mentions the plant
  const mentionsPlant = plantNames.some(name => responseLower.includes(name.toLowerCase()));
  if (mentionsPlant) {
    validationScore += 2;
    console.log(`✓ [CARE VALIDATION] Mentions target plant`);
  }
  
  // Context usage validation
  let contextUsageScore = 0;
  if (contextData && contextData.length > 0) {
    console.log(`🔍 [CARE VALIDATION] Checking context usage with ${contextData.length} items...`);
    
    // Check for source references
    const sourceIndicators = ['database', 'according to', 'research', 'data shows', 'api'];
    if (sourceIndicators.some(indicator => responseLower.includes(indicator))) {
      contextUsageScore += 3;
      console.log(`   ✓ References data sources`);
    }
    
    // Check for specific context data usage
    contextData.forEach((item, index) => {
      let itemUsageScore = 0;
      
      // Scientific name usage
      if (item.scientificName && responseLower.includes(item.scientificName.toLowerCase())) {
        itemUsageScore += 3;
        console.log(`   ✓ Item ${index + 1}: Uses scientific name`);
      }
      
      // Care information usage
      const careFields = ['watering', 'light', 'sunlight', 'soil', 'humidity', 'temperature', 'fertilizer', 'careInfo'];
      careFields.forEach(field => {
        if (item[field] && typeof item[field] === 'string' && item[field].length > 20) {
          const careTerms = item[field].toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length >= 4)
            .slice(0, 8);
          
          const matchingTerms = careTerms.filter(term => responseLower.includes(term));
          
          if (matchingTerms.length >= 2) {
            itemUsageScore += matchingTerms.length * 0.5;
            console.log(`   ✓ Item ${index + 1}: Uses ${field} terms: [${matchingTerms.slice(0, 3).join(', ')}]`);
          }
        }
      });
      
      contextUsageScore += itemUsageScore;
    });
    
    validationScore += contextUsageScore;
    console.log(`📊 [CARE VALIDATION] Context usage score: ${contextUsageScore.toFixed(1)}`);
  }
  
  // Check for generic responses
  const genericPhrases = [
    'general care guidance',
    'basic plant care',
    'typical houseplant',
    'general advice'
  ];
  
  const isGeneric = genericPhrases.some(phrase => responseLower.includes(phrase));
  if (isGeneric) {
    validationScore -= 2;
    console.log(`⚠️ [CARE VALIDATION] Generic response detected`);
  }
  
  // Determine if valid
  const minScoreRequired = contextData && contextData.length > 0 ? 5 : 3;
  const isValid = validationScore >= minScoreRequired && responseLength >= 50;
  
  console.log(`📊 [CARE VALIDATION] Final score: ${validationScore.toFixed(1)} (required: ${minScoreRequired}) - ${isValid ? 'VALID' : 'INVALID'}`);
  
  return {
    isValid,
    score: validationScore,
    responseLength,
    plantContentCount,
    mentionsPlant,
    contextUsageScore,
    isGeneric,
    reason: isValid ? 'Valid response' : 'Score too low or generic'
  };
}

// Main plant care utilities class
class PlantCareUtils {
  constructor() {
    this.maxRetries = 2;
    this.responseCache = new Map();
  }

  /**
   * UPDATED: Generate expert plant care advice using centralized PromptManager
   */
  async generatePlantCareResponse(query, plantNames, contextData = []) {
    console.log(`\n🌿 [PLANT CARE] Generating expert advice for: [${plantNames.join(', ')}]`);
    console.log(`📊 [PLANT CARE] Context data: ${contextData.length} items`);
    
    // Validate context data
    const contextValidation = validateContextData(contextData, plantNames);
    
    try {
      // Determine care type from query using centralized method
      const careType = determineCareType(query);
      console.log(`🎯 [PLANT CARE] Care type: ${careType}`);
      
      // Build prompt using centralized PromptManager
      const prompt = buildCareAdvicePrompt(query, plantNames, contextData, careType);
      console.log(`📝 [PLANT CARE] Prompt built: ${prompt.length} characters`);
      
      // Validate prompt length
      const validatedPrompt = validatePrompt(prompt, 8000);
      if (validatedPrompt !== prompt) {
        console.warn(`⚠️ [PLANT CARE] Prompt was truncated`);
      }
      
      // Get LLM options from centralized manager
      const llmOptions = getLLMOptions('careAdvice', contextData.length > 0);
      
      console.log(`🤖 [PLANT CARE] Calling LLM with options:`, llmOptions);
      
      const response = await generateText(validatedPrompt, llmOptions);
      const responseText = response?.text || response;
      
      console.log(`📤 [PLANT CARE] LLM response: ${responseText?.length || 0} characters`);
      
      if (responseText && typeof responseText === 'string') {
        // Clean response gently
        const cleaned = this.cleanCareResponse(responseText, query);
        console.log(`🧹 [PLANT CARE] Cleaned response: ${cleaned.length} characters`);
        
        // Validate response quality
        const validation = validatePlantCareResponse(cleaned, contextData, plantNames, query);
        
        if (validation.isValid) {
          console.log(`✅ [PLANT CARE] Generated valid expert advice (score: ${validation.score.toFixed(1)})`);
          return cleaned;
        } else {
          console.warn(`⚠️ [PLANT CARE] Response validation failed: ${validation.reason} (score: ${validation.score.toFixed(1)})`);
          
          // Try fallback if context wasn't used well
          if (contextData.length > 0 && validation.contextUsageScore < 2) {
            console.log(`🔄 [PLANT CARE] Retrying with simplified approach...`);
            return await this.generateSimplifiedResponse(query, plantNames, contextData);
          }
        }
      }
      
      // Fallback to knowledge-based response
      console.log(`🛡️ [PLANT CARE] Using knowledge-based fallback`);
      return this.generateKnowledgeBasedResponse(query, plantNames, contextData);
      
    } catch (error) {
      console.error(`❌ [PLANT CARE] LLM generation failed: ${error.message}`);
      return this.generateKnowledgeBasedResponse(query, plantNames, contextData);
    }
  }

  /**
   * UPDATED: Generate simplified response using basic prompt
   */
  async generateSimplifiedResponse(query, plantNames, contextData) {
    const primaryPlant = plantNames[0] || 'your plant';
    
    console.log(`🔄 [SIMPLIFIED CARE] Trying simplified approach for ${primaryPlant}`);
    
    // Build a more direct prompt without using the full prompt manager
    let prompt = `You are an expert plant care specialist. Answer this question about ${primaryPlant} using the specific information provided below.

PLANT INFORMATION:
`;
    
    if (contextData && contextData.length > 0) {
      contextData.forEach((data, index) => {
        prompt += `Plant ${index + 1}: ${data.name || primaryPlant}\n`;
        if (data.watering) prompt += `Watering: ${data.watering}\n`;
        if (data.light || data.sunlight) prompt += `Light: ${data.light || data.sunlight}\n`;
        if (data.soil) prompt += `Soil: ${data.soil}\n`;
        if (data.careInfo) prompt += `Care: ${data.careInfo}\n`;
        prompt += '\n';
      });
    }
    
    prompt += `QUESTION: ${query}

ANSWER: Based on the plant information above, `;
    
    try {
      const response = await generateText(prompt, {
        temperature: 0.5,
        max_tokens: 400,
        timeout: 30000
      });
      
      const responseText = response?.text || response;
      
      if (responseText && responseText.length > 30) {
        return this.cleanCareResponse(responseText, query);
      }
      
    } catch (error) {
      console.error(`❌ [SIMPLIFIED RESPONSE] Failed: ${error.message}`);
    }
    
    return this.generateKnowledgeBasedResponse(query, plantNames, contextData);
  }

  /**
   * Generate knowledge-based response as ultimate fallback (unchanged)
   */
  generateKnowledgeBasedResponse(query, plantNames, contextData) {
    const primaryPlant = plantNames[0] || 'your plant';
    const queryLower = query.toLowerCase();
    
    console.log(`🧠 [KNOWLEDGE FALLBACK] Generating for ${primaryPlant}`);
    
    // Use context data if available
    let contextInfo = '';
    if (contextData && contextData.length > 0) {
      const firstItem = contextData[0];
      contextInfo = ` According to plant database information, `;
      
      if (firstItem.watering && queryLower.includes('water')) {
        contextInfo += `${firstItem.watering}`;
      } else if ((firstItem.light || firstItem.sunlight) && (queryLower.includes('light') || queryLower.includes('sun'))) {
        contextInfo += `${firstItem.light || firstItem.sunlight}`;
      } else if (firstItem.soil && queryLower.includes('soil')) {
        contextInfo += `${firstItem.soil}`;
      } else if (firstItem.careInfo) {
        contextInfo += `${firstItem.careInfo}`;
      } else {
        contextInfo = ''; // No relevant context found
      }
    }
    
    // Generate specific advice based on query type
    if (queryLower.includes('water')) {
      return `${contextInfo || `For ${primaryPlant}, proper watering is crucial.`} Check the soil moisture by inserting your finger 1-2 inches deep. Water thoroughly when the top inch feels dry, ensuring water drains from the bottom holes. Allow excess water to drain away after 30 minutes. Most plant problems stem from overwatering rather than underwatering, so err on the side of caution.`;
    }
    
    if (queryLower.includes('light') || queryLower.includes('sun')) {
      return `${contextInfo || `${primaryPlant} lighting requirements are important for healthy growth.`} Most houseplants thrive in bright, indirect light - place near an east or north-facing window, or a few feet back from south/west windows. Direct sunlight can scorch leaves, while insufficient light causes stretching and pale growth. Observe your plant's response and adjust placement accordingly.`;
    }
    
    if (queryLower.includes('yellow') || queryLower.includes('brown') || queryLower.includes('dying')) {
      return `${contextInfo || `When ${primaryPlant} shows stress signals, quick diagnosis is key.`} Yellow leaves often indicate watering issues (usually overwatering), natural aging, or nutrient deficiency. Brown crispy edges suggest low humidity or underwatering, while soft brown spots indicate overwatering or disease. Check soil moisture, examine roots if possible, and adjust your care routine. Remove damaged leaves to redirect energy to healthy growth.`;
    }
    
    if (queryLower.includes('fertiliz') || queryLower.includes('feed')) {
      return `${contextInfo || `${primaryPlant} nutrition needs vary by season and growth rate.`} During growing season (spring/summer), feed with balanced liquid fertilizer diluted to half strength every 2-4 weeks. Reduce or stop fertilizing in fall/winter when growth slows. Over-fertilizing causes more problems than under-fertilizing - watch for salt buildup (white crust on soil) and flush periodically with plain water.`;
    }
    
    if (queryLower.includes('repot') || queryLower.includes('pot')) {
      return `${contextInfo || `${primaryPlant} repotting should be done when signs indicate it's needed.`} Repot when you see roots growing from drainage holes, water runs straight through without absorbing, or growth has significantly slowed. Choose a pot 1-2 inches larger in diameter with drainage holes. Spring is typically the best time as plants enter active growing season. Use fresh, well-draining potting mix appropriate for your plant type.`;
    }
    
    // General advice
    return `${contextInfo || `For ${primaryPlant}, successful care involves understanding its specific needs.`} Key factors include appropriate watering based on soil moisture (not calendar schedule), suitable light levels for the species, well-draining soil that retains some moisture, and attention to environmental factors like humidity and temperature. Watch your plant's signals - changes in leaves, growth patterns, and overall appearance guide necessary care adjustments. What specific aspect of care would you like more detail about?`;
  }

  /**
   * Clean care response gently (unchanged)
   */
  cleanCareResponse(response, originalQuery = '') {
    if (!response || typeof response !== 'string') return response;
    
    let cleaned = response.trim();
    console.log(`🧹 [CARE CLEAN] Starting: ${cleaned.length} chars`);
    
    // Remove conversation artifacts
    cleaned = cleaned.replace(/^(assistant|ai|bot|expert|user|human):\s*/i, '');
    cleaned = cleaned.replace(/\s*(assistant|ai|bot|expert|user|human):\s*$/i, '');
    cleaned = cleaned.replace(/^(response|answer|advice):\s*/i, '');
    cleaned = cleaned.replace(/^(based on|according to)\s+(the\s+)?(database|information|data)\s+(above|provided)[,:]?\s*/i, '');
    
    // Remove query echo only if exact match at beginning
    if (originalQuery && originalQuery.length > 10) {
      const exactQueryPattern = new RegExp(`^\\s*${originalQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[.!?]*\\s*`, 'i');
      const beforeLength = cleaned.length;
      cleaned = cleaned.replace(exactQueryPattern, '');
      if (cleaned.length !== beforeLength) {
        console.log(`🧹 [CARE CLEAN] Removed query echo`);
      }
    }
    
    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // Safety check
    if (cleaned.length < response.length * 0.5 && response.length > 50) {
      console.warn(`⚠️ [CARE CLEAN] Too aggressive, reverting`);
      cleaned = response.trim().replace(/\s+/g, ' ');
    }
    
    console.log(`✅ [CARE CLEAN] Done: ${response.length} → ${cleaned.length} chars`);
    return cleaned;
  }

  /**
   * Generate care advice with specific care type (using centralized system)
   */
  async generateCareAdvice(query, plantNames, contextData = [], careType = 'general') {
    console.log(`🎯 [SPECIFIC CARE] Generating ${careType} advice`);
    return await this.generatePlantCareResponse(query, plantNames, contextData);
  }
}

// Create singleton instance
const plantCareUtils = new PlantCareUtils();

// Export main functions
export const generatePlantCareResponse = (query, plantNames, contextData) => 
  plantCareUtils.generatePlantCareResponse(query, plantNames, contextData);

export const generateCareAdvice = (query, plantNames, contextData, careType) => 
  plantCareUtils.generateCareAdvice(query, plantNames, contextData, careType);

// Export validation functions for debugging
export { validateContextData, validatePlantCareResponse };

// Export class and instance
export { PlantCareUtils };
export default plantCareUtils;