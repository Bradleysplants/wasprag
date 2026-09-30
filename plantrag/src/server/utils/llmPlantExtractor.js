// src/server/utils/llmPlantExtractor.js
// UPDATED: Now uses centralized PromptManager

import { generateText } from './llm/llmService.js';
import { buildPlantExtractionPrompt, getLLMOptions } from './promptManager.js';

/**
 * Extract plant names from user queries using LLM with centralized prompt management
 */
class LLMPlantExtractor {
  constructor() {
    // Only keep very general botanical terms for pattern recognition
    this.botanicalPatterns = [
      'plant', 'tree', 'flower', 'succulent', 'cactus', 'fern', 
      'palm', 'vine', 'herb', 'shrub', 'bush', 'houseplant', 'grass',
      'moss', 'algae', 'orchid', 'lily', 'rose', 'daisy', 'tulip'
    ];
    
    // Common botanical naming patterns
    this.scientificPatterns = [
      /\b[A-Z][a-z]+ [a-z]+\b/g, // Genus species (e.g., "Monstera deliciosa")
      /\b[A-Z][a-z]+\s+x\s+[a-z]+\b/g // Hybrid notation (e.g., "Tradescantia x andersoniana")
    ];
    
    // Words that commonly appear before plant names
    this.plantIndicators = [
      'my', 'the', 'this', 'that', 'a', 'an', 'some',
      'caring for', 'watering', 'repotting', 'pruning'
    ];
  }

  /**
   * Main extraction method with conversation context awareness
   * UPDATED: Uses centralized prompt management
   * FIXED: Always uses LLM result if non-empty, only falls back if LLM returns nothing
   */
  async extractPlantNamesRobust(query, conversationContext = null) {
    console.log(`🔍 [PLANT EXTRACTOR] Processing: "${query}"`);
    
    // First check if this is a follow-up question without plant names
    if (this.isFollowUpQuestion(query) && conversationContext?.lastPlants?.length > 0) {
      console.log(`🔄 [PLANT EXTRACTOR] Follow-up question detected, using context: [${conversationContext.lastPlants.join(', ')}]`);
      return conversationContext.lastPlants;
    }
    
    // Strategy 1: Try LLM extraction first with centralized prompt
    try {
      const llmResult = await this.extractWithLLM(query);
      console.log(`🧪 [PLANT EXTRACTOR] LLM raw result:`, llmResult);
      if (llmResult && llmResult.length > 0) {
        // Optionally filter out only the most egregious invalid results
        const filtered = llmResult.filter(p => this.isValidPlantName(p));
        if (filtered.length > 0) {
          console.log(`✅ [PLANT EXTRACTOR] Using LLM result: [${filtered.join(', ')}]`);
          return filtered;
        } else {
          console.log(`⚠️ [PLANT EXTRACTOR] LLM result present but all filtered out, using raw LLM result: [${llmResult.join(', ')}]`);
          return llmResult; // fallback to raw LLM result if all filtered out
        }
      }
    } catch (error) {
      console.warn(`⚠️ [PLANT EXTRACTOR] LLM failed: ${error.message}`);
    }
    
    // Strategy 2: Pattern matching for known plants (IMPROVED)
    const patternResult = this.extractWithImprovedPatterns(query);
    if (patternResult && patternResult.length > 0) {
      console.log(`✅ [PLANT EXTRACTOR] Pattern matching found: [${patternResult.join(', ')}]`);
      return patternResult;
    }
    
    // Strategy 3: Context-based extraction  
    const contextResult = this.extractFromContext(query);
    if (contextResult && contextResult.length > 0) {
      console.log(`✅ [PLANT EXTRACTOR] Context extraction found: [${contextResult.join(', ')}]`);
      return contextResult;
    }
    
    // Strategy 4: If it's clearly a plant care question but no plants found, try context
    if (this.isPlantCareQuestion(query) && conversationContext?.lastPlants?.length > 0) {
      console.log(`🔄 [PLANT EXTRACTOR] Plant care question with context: [${conversationContext.lastPlants.join(', ')}]`);
      return conversationContext.lastPlants;
    }
    
    // Final fallback
    console.log(`🔧 [PLANT EXTRACTOR] No plants found, returning empty`);
    return [];
  }

  /**
   * UPDATED: Use centralized prompt from PromptManager
   */
  async extractWithLLM(query) {
    console.log(`🤖 [LLM EXTRACT] Using centralized prompt for: "${query}"`);
    
    try {
      // Get prompt from centralized manager
      const prompt = buildPlantExtractionPrompt(query);
      
      // Get LLM options for plant extraction
      const llmOptions = getLLMOptions('plantExtraction');
      
      console.log(`🔧 [LLM EXTRACT] Prompt length: ${prompt.length} chars`);
      console.log(`⚙️ [LLM EXTRACT] Options:`, llmOptions);
      
      const response = await generateText(prompt, llmOptions);
      const responseText = response?.text || response;
      
      if (!responseText || typeof responseText !== 'string') {
        return [];
      }
      
      // Parse the response more carefully
      const lines = responseText
        .toLowerCase()
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .filter(line => line !== 'none')
        .filter(line => !line.includes('no plant') && 
                       !line.includes('none found') &&
                       !line.includes('no plants'))
        .map(line => {
          // Clean up the response
          return line
            .replace(/^\d+\.\s*/, '') // Remove numbered lists
            .replace(/^[-*]\s*/, '')   // Remove bullet points
            .replace(/["""]/g, '')     // Remove quotes
            .replace(/^plant:\s*/i, '') // Remove "plant:" prefix
            .trim();
        })
        .filter(line => line.length > 1 && line.length < 50);
      
      // Validate each extracted name more strictly
      const validPlants = lines
        .filter(plant => this.isValidPlantName(plant))
        .slice(0, 3);
      
      console.log(`🔍 [LLM EXTRACT] Raw response: "${responseText}" → Valid plants: [${validPlants.join(', ')}]`);
      
      return validPlants;
      
    } catch (error) {
      console.warn(`⚠️ [PLANT EXTRACTOR] LLM extraction error: ${error.message}`);
      return [];
    }
  }

extractImprovedCapitalizedSequences(text) {
    // TODO: Implement improved capitalized sequence extraction logic
    // For now, return an empty array or a simple regex-based guess
    if (!text || typeof text !== 'string') return [];
    // Example: Find capitalized word sequences (e.g., "Fiddle Leaf Fig")
    const matches = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/g);
    return matches ? matches.map(s => s.trim()) : [];
}

  /**
   * Check if LLM result is actually valid (not question words)
   */
  isLLMResultValid(results) {
    const invalidWords = ['what', 'how', 'when', 'care', 'help', 'tell', 'you', 'can', 'should', 'would', 'could'];
    
    return results.every(result => {
      const words = result.toLowerCase().split(/\s+/);
      // If any word in the result is a common invalid word, reject it
      const hasInvalidWord = words.some(word => invalidWords.includes(word));
      if (hasInvalidWord) {
        console.log(`❌ [LLM VALIDATION] Rejected "${result}" - contains invalid words`);
        return false;
      }
      return true;
    });
  }

  // ... [Keep all the existing pattern matching methods unchanged] ...
  
  /**
   * IMPROVED: Extract using pattern matching - better handles compound names like "Christmas Cactus"
   */
  extractWithImprovedPatterns(query) {
    console.log(`🔧 [PATTERNS] Analyzing: "${query}"`);
    const foundPlants = [];
    
    // Method 1: Look for plant-type words with modifiers
    const plantWords = this.botanicalPatterns;
    const words = query.split(/\s+/);
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[^a-zA-Z]/g, '').toLowerCase();
      
      if (plantWords.includes(word)) {
        console.log(`🌱 [PATTERNS] Found plant word: "${word}" at position ${i}`);
        
        // Look backwards for modifiers (Christmas, Snake, etc.)
        let plantName = words[i].replace(/[^a-zA-Z]/g, '');
        
        // Check previous words for modifiers
        for (let j = i - 1; j >= 0 && j >= i - 2; j--) {
          const prevWord = words[j].replace(/[^a-zA-Z]/g, '');
          
          if (this.isPlantModifier(prevWord) || this.isCapitalizedNonCommon(prevWord)) {
            plantName = prevWord + ' ' + plantName;
            console.log(`🔧 [PATTERNS] Added modifier: "${prevWord}" → "${plantName}"`);
          } else {
            break; // Stop at first non-modifier
          }
        }
        
        foundPlants.push(plantName);
      }
    }
    
    // Method 2: Improved capitalized sequences
    const capitalizedSequences = this.extractImprovedCapitalizedSequences(query);
    foundPlants.push(...capitalizedSequences);
    
    // Method 3: Scientific names
    this.scientificPatterns.forEach(pattern => {
      const matches = query.match(pattern);
      if (matches) {
        foundPlants.push(...matches.map(match => match.trim()));
      }
    });
    
    // Method 4: Words ending with botanical suffixes
    const botanicalSuffixes = ['ia', 'um', 'us', 'ensis', 'oides', 'antha', 'phyll'];
    words.forEach(word => {
      const cleanWord = word.replace(/[^a-zA-Z]/g, '');
      if (botanicalSuffixes.some(suffix => cleanWord.toLowerCase().endsWith(suffix)) && cleanWord.length > 4) {
        foundPlants.push(cleanWord);
      }
    });
    
    // Remove duplicates and filter valid results
    const uniquePlants = [...new Set(foundPlants)]
      .filter(plant => this.isValidPlantName(plant))
      .slice(0, 5);
    
    console.log(`🔧 [PATTERNS] Final results: [${uniquePlants.join(', ')}]`);
    return uniquePlants;
  }

  // ... [Keep all other existing methods unchanged - they don't involve prompts] ...
  
  isFollowUpQuestion(query) {
    const followUpPatterns = [
      /^(what|how|when|where|which|should i)/i,
      /^(can i|do i|is it)/i,
      /soil|water|light|fertilizer|repot/i
    ];
    
    const hasFollowUpPattern = followUpPatterns.some(pattern => pattern.test(query));
    const hasNoPlantNames = !this.hasCapitalizedWords(query);
    
    return hasFollowUpPattern && hasNoPlantNames;
  }

  isPlantCareQuestion(query) {
    const careTerms = [
      'water', 'light', 'soil', 'fertilize', 'repot', 'prune', 'care',
      'dying', 'wilting', 'yellow', 'brown', 'grow', 'help'
    ];
    
    return careTerms.some(term => query.toLowerCase().includes(term));
  }

  hasCapitalizedWords(query) {
    const words = query.split(/\s+/);
    return words.some(word => /^[A-Z]/.test(word) && word.length > 2 && 
                     !['I', 'Can', 'How', 'What', 'Where', 'When', 'Why', 'Should'].includes(word));
  }

  isValidPlantName(name) {
    if (!name || typeof name !== 'string') return false;
    
    const nameLower = name.toLowerCase().trim();
    
    // Basic validation
    if (nameLower.length < 3 || nameLower.length > 50) return false;
    
    // Don't reject if it just CONTAINS question words, only if it IS a question word
    const questionWords = [
      'what', 'how', 'when', 'where', 'why', 'which', 'who',
      'can', 'should', 'would', 'could', 'do', 'does', 'did',
      'is', 'are', 'was', 'were', 'am', 'be', 'been', 'being',
      'kind', 'type', 'sort', 'way', 'method', 'technique',
      'care', 'water', 'light', 'soil', 'fertilizer', 'help'
    ];
    
    // Reject if the entire name is a question word
    if (questionWords.includes(nameLower)) {
      console.log(`❌ [VALIDATION] "${name}" - is a question word`);
      return false;
    }
    
    // Must contain only letters, spaces, and basic punctuation
    if (!/^[a-zA-Z\s\-']+$/.test(name)) {
      console.log(`❌ [VALIDATION] "${name}" - invalid characters`);
      return false;
    }
    
    // Additional validation logic...
    return true;
  }

  // ... [Include other helper methods as needed] ...

  /**
   * Enhanced entity extraction (keeping for backwards compatibility)
   */
  async extractEntities(query, conversationContext = null) {
    const plants = await this.extractPlantNamesRobust(query, conversationContext);
    
    return {
      plants: plants,
      plantCount: plants.length,
      hasPlants: plants.length > 0,
      query: query,
      usedContext: conversationContext?.hasContext || false
    };
  }
}

// Create singleton instance
const llmPlantExtractor = new LLMPlantExtractor();

// Export methods with updated signatures
export const extractPlantNamesRobust = (query, conversationContext) => llmPlantExtractor.extractPlantNamesRobust(query, conversationContext);
export const extractEntities = (query, conversationContext) => llmPlantExtractor.extractEntities(query, conversationContext);

// Export class and instance
export { LLMPlantExtractor };
export default llmPlantExtractor;