// src/utils/ragPipeline.js - Refactored from Trefle to Reliable APIs + Global Plant Data

// --- Core Dependencies ---
import { reliablePlantAPI } from './plantAPIs.js'; // CHANGED: From trefleApiTools to reliablePlantAPI
import { queryVectorDatabase, storePlantInfoWithEmbedding } from './vectorDatabase.js';

// --- Specific Utility Modules ---
import { MODEL_CONFIG } from './config.js';
import { generateTextEmbedding } from './embeddings.js';
import { extractEntities } from './ner.js';

// --- Helper Functions ---
function safeParseFloat(value, defaultValue) {
  if (value === undefined) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

function safeParseInt(value, defaultValue) {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

// --- JSDoc Type Definitions ---
/**
 * @typedef {Object} PlantContextItem
 * @property {string|number} [id]
 * @property {string} name
 * @property {string} [scientificName]
 * @property {string} [description]
 * @property {string} [careInfo]
 * @property {string} [soilNeeds]
 * @property {string} [source]
 */
/**
 * @typedef {Object} PipelineResult
 * @property {string} answer
 * @property {string[]} sources
 */
/**
 * @typedef {Object} ReliableAPIPlantItem
 * @property {string|number} id
 * @property {string} [commonName]
 * @property {string} [scientificName]
 * @property {string} [description]
 * @property {string} [family]
 * @property {string} [genus]
 * @property {string} source
 * @property {number} [confidence]
 * @property {number} [relevanceScore]
 */
/**
 * @typedef {Object} ContextItem
 * @property {string} name
 * @property {string} [scientificName]
 * @property {string} [description]
 * @property {string} [careInfo]
 * @property {string} [soilNeeds]
 * @property {string} source
 */

// --- RAG Pipeline Class ---
class RagPipeline {
  constructor() {
    this.topK = safeParseInt(process.env.RAG_TOP_K, 5);
    this.similarityThreshold = safeParseFloat(process.env.RAG_SIMILARITY_THRESHOLD, 0.7);
    console.log(`RAG Pipeline initialized with topK=${this.topK}, threshold=${this.similarityThreshold}`);
    console.log(`🌟 Using Reliable Plant APIs (GBIF, iNaturalist, USDA, Perenual) for global plant knowledge base`);
  }

  /**
   * Processes a user query through the RAG pipeline.
   * @param {string} query
   * @returns {Promise<PipelineResult>}
   */
  async processQuery(query) {
    console.log(`RAG Pipeline processing query: "${query}"`);
    try {
      // 1. Generate embedding with extensive debugging
      console.log('[RAG] Step 1: About to generate embedding...');
      console.log('[RAG] generateTextEmbedding function exists:', typeof generateTextEmbedding);
      console.log('[RAG] Query type:', typeof query, 'Query:', query);
      
      const queryEmbedding = await generateTextEmbedding(query);
      
      // EXTENSIVE DEBUGGING
      console.log('[RAG] Step 2: Embedding generation result:');
      console.log('  - Result exists:', !!queryEmbedding);
      console.log('  - Result type:', typeof queryEmbedding);
      console.log('  - Is array:', Array.isArray(queryEmbedding));
      console.log('  - Length:', Array.isArray(queryEmbedding) ? queryEmbedding.length : 'N/A');
      console.log('  - First 5 values:', Array.isArray(queryEmbedding) ? queryEmbedding.slice(0, 5) : 'N/A');
      
      // CRITICAL FIX: Validate embedding before proceeding
      if (!queryEmbedding) {
        throw new Error('generateTextEmbedding returned null/undefined');
      }
      
      if (!Array.isArray(queryEmbedding)) {
        throw new Error(`generateTextEmbedding returned non-array: ${typeof queryEmbedding}, value: ${JSON.stringify(queryEmbedding)}`);
      }
      
      if (queryEmbedding.length === 0) {
        throw new Error('generateTextEmbedding returned empty array');
      }
      
      console.log(`[RAG] ✅ Embedding validation passed: ${queryEmbedding.length} dimensions`);

      // 2. Retrieve initial context from global plant database
      console.log('[RAG] Step 3: About to call retrieveContext...');
      const retrievedContext = await this.retrieveContext(queryEmbedding);
      console.log('[RAG] Step 4: retrieveContext completed, got', retrievedContext.length, 'items');

      let finalContext = retrievedContext;

      // 3. Augment with reliable APIs if needed
      if (this.isContextInsufficient(retrievedContext, query)) {
        console.log("📊 Context insufficient, calling reliable plant APIs...");
        const apiContext = await this.augmentWithReliableAPIcalls(query); // CHANGED: New method name

        // Combine and deduplicate (your existing logic)
        const combined = [...retrievedContext, ...apiContext];
        const uniqueIds = new Set();
        finalContext = combined.filter(item => {
            const itemId = item.id;
            if (itemId !== undefined && itemId !== null) {
                if (uniqueIds.has(itemId)) {
                    return false;
                }
                uniqueIds.add(itemId);
            }
            return true;
        });
        console.log(`✅ Combined context: ${finalContext.length} items (${retrievedContext.length} local + ${apiContext.length} API)`);
      } else {
        console.log("🎯 Local context sufficient, skipping API calls");
      }

      // 4. Generate final response
      return await this.generateResponse(query, finalContext);

    } catch (error) {
      console.error('❌ RAG Pipeline Error Details:');
      console.error('  - Error message:', error.message);
      console.error('  - Error stack:', error.stack);
      console.error('  - Query that failed:', query);
      
      // Add more specific error details for debugging
      if (error.message.includes('generateTextEmbedding')) {
        console.error('❌ Embedding generation failed - check embeddings.js service');
        console.error('❌ Is Ollama running? Check: curl http://localhost:11434/api/tags');
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        answer: `I encountered an internal error: ${errorMessage}. Please check server logs.`,
        sources: ['Error State']
      };
    }
  }

  /**
   * Retrieves context from the vector database with improved validation.
   * @param {number[]} queryEmbedding
   * @returns {Promise<PlantContextItem[]>}
   */
  async retrieveContext(queryEmbedding) {
    try {
      // CRITICAL FIX: Validate input parameters
      if (!queryEmbedding) {
        throw new Error('queryEmbedding parameter is required');
      }
      
      if (!Array.isArray(queryEmbedding)) {
        throw new Error(`queryEmbedding must be an array, got: ${typeof queryEmbedding}`);
      }
      
      if (queryEmbedding.length === 0) {
        throw new Error('queryEmbedding array cannot be empty');
      }
      
      console.log(`[retrieveContext] Querying with embedding of ${queryEmbedding.length} dimensions`);
      console.log(`[retrieveContext] Using topK=${this.topK}, threshold=${this.similarityThreshold}`);
      
      const results = await queryVectorDatabase(queryEmbedding, this.topK, this.similarityThreshold);
      console.log(`🗄️ Retrieved ${results.length} context items from global plant database`);
      
      return results.map(r => ({
        id: r.id,
        name: r.name || 'Unknown Plant',
        scientificName: r.scientificName ?? undefined,
        description: r.description ?? null,
        careInfo: r.careInfo ?? undefined,
        soilNeeds: r.soilNeeds ?? undefined,
        source: r.source ?? 'Global Database',
      }));
    } catch (error) {
      console.error('❌ Error retrieving from global plant database:', error);
      console.error('❌ Error details:', {
        hasEmbedding: !!queryEmbedding,
        embeddingType: typeof queryEmbedding,
        embeddingLength: Array.isArray(queryEmbedding) ? queryEmbedding.length : 'N/A',
        topK: this.topK,
        threshold: this.similarityThreshold
      });
      return [];
    }
  }

  /**
   * Checks if the retrieved context is sufficient (unchanged logic).
   * @param {PlantContextItem[]} context
   * @param {string} query
   * @returns {boolean} True if context is insufficient, False otherwise.
   */
  isContextInsufficient(context, query) {
    // Rule 1: Not enough items
    if (!context || context.length < 2) {
        console.log(`📊 Context insufficient: Found ${context?.length ?? 0} items (need ≥2). Augmenting.`);
        return true;
    }
    // Rule 2: Query asks for specifics, context lacks detail
    const specificTerms = ['care', 'water', 'sunlight', 'soil', 'fertilize', 'prune', 'disease', 'pest', 'propagate', 'grow', 'plant', 'flower', 'identify', 'toxic', 'edible', 'height', 'bloom time'];
    const queryLower = query.toLowerCase();
    const queryHasSpecificTerm = specificTerms.some(term => queryLower.includes(term));
    if (queryHasSpecificTerm) {
        const contextHasDetails = context.some(item =>
            (item.careInfo?.trim().length > 10) ||
            (item.soilNeeds?.trim().length > 10) ||
            (item.description?.trim().length > 50)
        );
        if (!contextHasDetails) {
            console.log("📋 Context insufficient: Query needs details but local data lacks depth. Augmenting.");
            return true;
        }
    }
    // If rules didn't trigger, assume context is sufficient
    return false;
  }

  /**
   * 🌟 UPDATED: Augments context using Reliable Plant APIs instead of Trefle
   * Includes CRITICAL FIX for NER false positives
   * @param {string} query
   * @returns {Promise<PlantContextItem[]>}
   */
  async augmentWithReliableAPIcalls(query) {
    const apiResults = [];
    const searchedTerms = new Set();
    const processedPlantIds = new Set();

    console.log(`🔍 [RELIABLE API AUGMENTATION] Starting for query: "${query}"`);
    try {
      // 1. Extract entities with NER (your existing logic)
      console.log('[Augment] 🧠 Calling NER...');
      const rawEntities = await extractEntities(query);

      // 2. 🔧 CRITICAL FIX: Apply smart filtering rules for NER false positives
      console.log(`[Augment] Raw NER Entities Count: ${rawEntities?.length ?? 0}`);
      const filteredEntities = (rawEntities || []).filter(entity => {
          if (!entity || !entity.word || !entity.entity_group) return false;
          
          const word = entity.word.trim();
          const wordLower = word.toLowerCase();
          
          // 🔧 CRITICAL: Block question words and phrases
          const questionWords = [
              'how', 'what', 'when', 'where', 'why', 'which', 'who',
              'much', 'many', 'often', 'long', 'should', 'would', 'could',
              'can', 'do', 'does', 'did', 'is', 'are', 'was', 'were'
          ];
          
          const questionPhrases = [
              'how much', 'how many', 'how often', 'what is', 'when should'
          ];
          
          // Block single question words
          if (questionWords.includes(wordLower)) {
              console.log(`[Filter] ❌ Removing question word: "${word}"`);
              return false;
          }
          
          // Block question phrases
          const queryLower = query.toLowerCase();
          for (const phrase of questionPhrases) {
              if (queryLower.includes(phrase) && wordLower === phrase.split(' ')[0]) {
                  console.log(`[Filter] ❌ Removing part of question phrase: "${word}"`);
                  return false;
              }
          }
          
          // Block generic terms
          const genericTerms = ['plant', 'flower', 'water', 'care', 'give', 'giving'];
          if (genericTerms.includes(wordLower)) {
              console.log(`[Filter] ❌ Removing generic term: "${word}"`);
              return false;
          }
          
          // Block too short words
          if (word.length <= 2) {
              console.log(`[Filter] ❌ Removing too short: "${word}"`);
              return false;
          }
          
          return true;
      });
      console.log(`[Augment] Filtered NER Entities Count: ${filteredEntities.length}`);

      // 3. Prepare search terms (your existing logic)
      const extractedNames = filteredEntities.map(entity => entity.word.trim().toLowerCase());
      const uniqueExtractedNames = Array.from(new Set(extractedNames));
      let searchTerms = [];

      // 4. Decide search terms (your existing decision logic)
      console.log(`[Augment] Unique valid names after filtering: [${uniqueExtractedNames.join(', ')}]`);
      if (uniqueExtractedNames.length > 0) {
        searchTerms = uniqueExtractedNames;
        console.log(`>>> [AUGMENT DECISION] Using filtered NER names: [${searchTerms.join(', ')}] <<<`);
      } else {
        searchTerms = [query];
        console.log(`>>> [AUGMENT DECISION] Using raw query: "${query}" <<<`);
      }
      console.log(`[Augment] 📡 Preparing Reliable API calls for terms: [${searchTerms.join(', ')}]`);

      // 5. CHANGED: Call Reliable APIs instead of Trefle
      for (const term of searchTerms) {
        const normalizedTerm = term.toLowerCase().trim();
        if (!normalizedTerm || searchedTerms.has(normalizedTerm)) continue;
        searchedTerms.add(normalizedTerm);

        console.log(`[Augment] 🔍 Looking up term: "${normalizedTerm}" via reliable APIs`);

        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to be respectful
        
        try {
          // CHANGED: Use reliablePlantAPI.searchAllAPIs instead of trefleApiTools
          const searchResults = await reliablePlantAPI.searchAllAPIs(normalizedTerm, 8000); // 8 second timeout
          
          if (searchResults && searchResults.length > 0) {
            console.log(`[Augment] ✅ Found ${searchResults.length} results for "${normalizedTerm}"`);
            
            // Process top results (take top 2 to avoid too much data)
            const topResults = searchResults.slice(0, 2);
            
            for (const result of topResults) {
              const resultId = `${result.source}_${result.id}`;
              
              if (!processedPlantIds.has(resultId)) {
                console.log(`[Augment] 📄 Processing result: ${result.commonName || result.scientificName} (${result.source})`);
                
                // CHANGED: Convert API result to context format
                const contextItem = this.convertReliableAPIResult(result, normalizedTerm);
                
                if (contextItem) {
                  apiResults.push(contextItem);
                  processedPlantIds.add(resultId);
                  
                  // Store for future use (no user association)
                  this.storeFetchedPlantInfo(contextItem).catch(err => 
                    console.error(`⚠️ Background storage failed for ${contextItem.name}:`, err.message)
                  );
                }
              }
            }
          } else {
            console.log(`[Augment] 📭 No results found for "${normalizedTerm}"`);
          }
          
        } catch (apiError) {
          console.error(`[Augment] ❌ API search failed for "${normalizedTerm}":`, apiError.message);
        }
      }

      console.log(`🏁 [RELIABLE API AUGMENTATION] Complete: Added ${apiResults.length} items via API calls`);
      return apiResults;

    } catch (error) {
      console.error('❌ [RELIABLE API AUGMENTATION] Failed:', error);
      return [];
    }
  }

  /**
   * 🌟 NEW: Convert reliable API result to your context format
   * @param {ReliableAPIPlantItem} apiResult
   * @param {string} searchTerm
   * @returns {PlantContextItem|null}
   */
  convertReliableAPIResult(apiResult, searchTerm) {
    if (!apiResult) return null;
    
    // Build comprehensive description
    const descriptionParts = [];
    if (apiResult.description) descriptionParts.push(apiResult.description);
    if (apiResult.family) descriptionParts.push(`Family: ${apiResult.family}`);
    if (apiResult.genus) descriptionParts.push(`Genus: ${apiResult.genus}`);
    if (apiResult.observations) descriptionParts.push(`Community Observations: ${apiResult.observations}`);
    
    // Build care info based on available data and botanical knowledge
    const careInfoParts = [];
    if (apiResult.nativeStatus) careInfoParts.push(`Native Status: ${apiResult.nativeStatus}`);
    if (apiResult.growthHabit) careInfoParts.push(`Growth Habit: ${apiResult.growthHabit}`);
    
    // Add basic care guidance based on family (botanical knowledge)
    if (apiResult.family === 'Cactaceae') {
      careInfoParts.push('Low water requirements, bright light, well-draining soil');
    } else if (apiResult.family === 'Araceae') {
      careInfoParts.push('Moderate water, indirect light, humid conditions preferred');
    } else if (apiResult.family === 'Rosaceae') {
      careInfoParts.push('Regular watering, full sun to partial shade');
    } else if (apiResult.family === 'Ferns' || apiResult.family === 'Pteridaceae') {
      careInfoParts.push('High humidity, indirect light, consistent moisture');
    } else {
      careInfoParts.push('Care requirements vary by species and growing conditions');
    }
    
    // Build soil needs
    const soilParts = [];
    if (apiResult.family === 'Cactaceae') {
      soilParts.push('Sandy, well-draining soil, pH 6.0-7.5');
    } else if (apiResult.family === 'Araceae') {
      soilParts.push('Rich, moisture-retaining soil with good drainage, pH 6.0-7.0');
    } else if (apiResult.family === 'Rosaceae') {
      soilParts.push('Fertile, well-drained soil, pH 6.0-7.0');
    } else {
      soilParts.push('Well-draining soil, adjust pH and nutrients based on specific species needs');
    }
    
    return {
      id: `${apiResult.source}_${apiResult.id}`, // Unique ID across APIs
      name: apiResult.commonName || apiResult.scientificName || searchTerm,
      scientificName: apiResult.scientificName || null,
      description: descriptionParts.length > 0 ? descriptionParts.join('. ') : null,
      careInfo: careInfoParts.join('. '),
      soilNeeds: soilParts.join('. '),
      source: `${apiResult.source.toUpperCase()} API (Global Knowledge Base)`, // CHANGED: Note it's global
      apiData: apiResult // Store original for debugging
    };
  }

  /**
   * 💾 UPDATED: Store plant info globally (no user association)
   * @param {PlantContextItem} plantInfo
   */
  async storeFetchedPlantInfo(plantInfo) {
    if (!plantInfo || plantInfo.id === undefined || plantInfo.id === null) return;
    try {
      const textToEmbed = [
        plantInfo.name,
        plantInfo.scientificName,
        plantInfo.description,
        plantInfo.careInfo,
        plantInfo.soilNeeds
      ].filter(Boolean).join(' | ').trim();

      if (!textToEmbed) {
        console.warn(`⚠️ No embeddable text for ${plantInfo.name}`);
        return;
      }
      
      const embedding = await generateTextEmbedding(textToEmbed);
      
      // Validate embedding dimension
      if (!embedding?.length || embedding.length !== MODEL_CONFIG.embeddingDimension) {
        console.error(`❌ Embedding dimension mismatch for ${plantInfo.name}: expected ${MODEL_CONFIG.embeddingDimension}, got ${embedding?.length}`);
        return;
      }
      
      // CHANGED: Prepare data for global storage (no userId)
      const dataForDb = {
        id: plantInfo.id,
        name: plantInfo.name,
        scientificName: plantInfo.scientificName ?? null,
        description: plantInfo.description ?? null,
        careInfo: plantInfo.careInfo ?? null,
        soilNeeds: plantInfo.soilNeeds ?? null,
        source: plantInfo.source ?? 'Reliable Plant APIs',
      };
      
      // CHANGED: Store globally (no user context needed)
      await storePlantInfoWithEmbedding(dataForDb, embedding);
      console.log(`💾 Stored ${plantInfo.name} in global knowledge base (${embedding.length}D vector)`);
      
    } catch (dbError) {
      console.error(`❌ Global storage failed for ${plantInfo.name || 'ID: '+plantInfo.id}:`, dbError.message);
    }
  }

  /**
   * 🔧 CRITICAL FIX: Generates the final LLM response with robust error handling
   * @param {string} query
   * @param {PlantContextItem[]} context
   * @returns {Promise<PipelineResult>}
   */
  async generateResponse(query, context) {
    try {
      const finalContext = Array.isArray(context) ? context : [];

      // 1. Prepare context for LLM
      const contextForLLM = finalContext
        .map((item) => ({
          name: item.name ?? 'Unknown Plant',
          scientificName: item.scientificName ?? undefined,
          description: item.description ?? undefined,
          careInfo: item.careInfo ?? undefined,
          soilNeeds: item.soilNeeds ?? undefined,
          source: item.source ?? 'Unknown Source'
        }))
        .filter((item) => {
          const hasContent = (item.description?.trim().length > 5) || 
                           (item.careInfo?.trim().length > 5) || 
                           (item.soilNeeds?.trim().length > 5) || 
                           item.scientificName;
          return item.name !== 'Unknown Plant' && hasContent;
        });

      // Handle no context case
      if (contextForLLM.length === 0) {
        console.warn("⚠️ No valid context items after filtering for LLM");
        return { 
          answer: "I couldn't find enough relevant information to answer accurately.", 
          sources: ['Context Preparation Failed'] 
        };
      }

      // 2. Construct the prompt
      const formattedContext = contextForLLM.map(item =>
         `Plant: ${item.name}\n` +
         (item.scientificName ? `Scientific Name: ${item.scientificName}\n` : '') +
         (item.description ? `Description: ${item.description}\n` : '') +
         (item.careInfo ? `Care Info: ${item.careInfo}\n` : '') +
         (item.soilNeeds ? `Soil Needs: ${item.soilNeeds}\n` : '') +
         `Source: ${item.source}`
       ).join('\n\n---\n\n');

const prompt = `You are a warm, friendly, and helpful botanical assistant. Answer the user's plant care question using the provided context as your primary source. If the context doesn't contain specific information about the plant they're asking about, provide helpful tailored plant care advice.

Context:
${formattedContext}

User Query: ${query}

Be helpful and practical. If you don't have specific details in the context, give useful tailored advice for that plant. Always try to help rather than saying "I don't have information."

Answer:`;

// 3. Generate response using Ollama Mistral directly
let responseText;
try {
  console.log(`🤖 Calling Ollama Mistral...`);
  
  const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'mistral',
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 1000
      }
    })
  });
  
  if (!ollamaResponse.ok) {
    throw new Error(`Ollama API error: ${ollamaResponse.status} - ${ollamaResponse.statusText}`);
  }
  
  const result = await ollamaResponse.json();
  responseText = result.response;
  
  if (!responseText) {
    throw new Error('Ollama returned empty response');
  }
  
  console.log(`✅ Ollama Mistral responded (${responseText.length} chars)`);
  
} catch (llmError) {
  console.error('❌ Ollama failed:', llmError.message);
  responseText = `Based on the plant information: ${contextForLLM[0]?.careInfo || contextForLLM[0]?.description || 'Please refer to general plant care guidelines.'}`;
}

      // Handle response format
      let finalResponse;
      if (typeof responseText === 'string') {
          finalResponse = responseText.trim();
      } else if (responseText && typeof responseText === 'object') {
          finalResponse = responseText.text || responseText.response || responseText.content || JSON.stringify(responseText);
      } else {
          finalResponse = "I received a response, but it was in an unexpected format.";
      }

      // 4. Format and return
      const sources = contextForLLM.map(item => item.source).filter((v, i, a) => a.indexOf(v) === i);
      return {
        answer: finalResponse || "I received a response, but it was empty.",
        sources: sources
      };
    } catch (error) {
      console.error('❌ Error generating final response:', error);
      return { 
        answer: "Sorry, I encountered an error while generating the final answer.", 
        sources: ['Error in Response Generation'] 
      };
    }
  }
}

// --- Export Singleton Instance ---
export const ragPipeline = new RagPipeline();