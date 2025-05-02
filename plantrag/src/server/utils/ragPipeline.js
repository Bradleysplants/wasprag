// src/utils/ragPipeline.js (Refactored Imports + NER Filtering + Trefle Logging - COMPLETE)

// --- Core Dependencies ---
import { trefleApiTools } from './trefleApi.js';
import { queryVectorDatabase, storePlantInfoWithEmbedding } from './vectorDatabase.js';

// --- Specific Utility Modules ---
import { MODEL_CONFIG } from './config.js';
import { generateTextEmbedding } from './embeddings.js';
import { extractEntities } from './ner.js';
import { createLanguageModel } from './llm/index.js';

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
 * @typedef {Object} TreflePlantListItem
 * @property {number} id
 * @property {string} [common_name]
 * @property {string} scientific_name
 * @property {string} [image_url]
 * @property {string} [link]
 * @property {number} [score]
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
  }

  /**
   * Processes a user query through the RAG pipeline.
   * @param {string} query
   * @returns {Promise<PipelineResult>}
   */
  async processQuery(query) {
    console.log(`RAG Pipeline processing query: "${query}"`);
    try {
      // 1. Generate embedding
      const queryEmbedding = await generateTextEmbedding(query);

      // 2. Retrieve initial context
      const retrievedContext = await this.retrieveContext(queryEmbedding);

      let finalContext = retrievedContext;

      // 3. Augment if needed
      if (this.isContextInsufficient(retrievedContext, query)) {
        console.log("Context insufficient, attempting augmentation via API...");
        const apiContext = await this.augmentWithApiCalls(query); // Calls NER internally

        // Combine and deduplicate
        const combined = [...retrievedContext, ...apiContext];
        const uniqueIds = new Set();
        finalContext = combined.filter(item => {
            const itemId = item.id;
            if (itemId !== undefined && itemId !== null) {
                if (uniqueIds.has(itemId)) {
                    // console.log(`[Deduplication] Removing duplicate ID: ${itemId}`); // Less verbose
                    return false;
                }
                uniqueIds.add(itemId);
            }
            return true;
        });
        console.log(`Combined context size after augmentation & deduplication: ${finalContext.length}`);
      } else {
        // console.log("Retrieved context deemed sufficient.");
      }

      // 4. Generate final response
      return await this.generateResponse(query, finalContext);

    } catch (error) {
      console.error('Error in RAG pipeline:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        answer: `I encountered an internal error: ${errorMessage}. Please check server logs.`,
        sources: ['Error State']
      };
    }
  }

  /**
   * Retrieves context from the vector database.
   * @param {number[]} queryEmbedding
   * @returns {Promise<PlantContextItem[]>}
   */
  async retrieveContext(queryEmbedding) {
    try {
      // console.log(`Retrieving context from vector DB...`);
      const results = await queryVectorDatabase(queryEmbedding, this.topK, this.similarityThreshold);
      console.log(`Retrieved ${results.length} context items from vector database.`);
      return results.map(r => ({
        id: r.id,
        name: r.name || 'Unknown Plant',
        scientificName: r.scientificName ?? undefined,
        description: r.description ?? null,
        careInfo: r.careInfo ?? undefined,
        soilNeeds: r.soilNeeds ?? undefined,
        source: r.source ?? 'Database',
      }));
    } catch (error) {
      console.error('Error retrieving context from vector database:', error);
      return [];
    }
  }

  /**
   * Checks if the retrieved context is sufficient based on defined rules.
   * @param {PlantContextItem[]} context
   * @param {string} query
   * @returns {boolean} True if context is insufficient, False otherwise.
   */
  isContextInsufficient(context, query) {
    // Rule 1: Not enough items
    if (!context || context.length < 2) {
        console.log(`Context insufficient: Found ${context?.length ?? 0} items (less than 2). Augmenting.`);
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
            (item.description?.trim().length > 50) // Check description too
        );
        if (!contextHasDetails) {
            console.log("Context insufficient: Query specific, but retrieved context lacks detail. Augmenting.");
            return true;
        }
    }
    // If rules didn't trigger, assume context is sufficient
    return false;
  }

  /**
   * Augments context by calling NER and then external APIs (Trefle).
   * @param {string} query
   * @returns {Promise<PlantContextItem[]>}
   */
  async augmentWithApiCalls(query) {
    const apiResults = [];
    const searchedTerms = new Set();
    const processedPlantIds = new Set();

    console.warn(`\n --- [CONTEXT AUGMENTATION START - WITH NER] Query: "${query}" ---`);
    try {
      // 1. Extract entities
      console.log('[Augment] Calling NER...');
      const rawEntities = await extractEntities(query); // Returns NerEntity[]

      // 2. Apply Pre/Post-processing Rules for NER results
      console.log(`[Augment] Raw NER Entities Count: ${rawEntities?.length ?? 0}`);
      const filteredEntities = (rawEntities || []).filter(entity => {
          if (!entity || !entity.word || !entity.entity_group) return false;
          const word = entity.word.trim();
          const wordLower = word.toLowerCase();
          if (word.length < 2 && !['a', 'i'].includes(wordLower)) {  /*console.log(`[Augment Filter] Removing short: "${word}"`);*/ return false; }
          if (['plant', 'flower', 'tree', 'garden', 'leaf', 'root', 'water', 'care', 'much'].includes(wordLower)) { /*console.log(`[Augment Filter] Removing generic: "${word}"`);*/ return false; }
          if (word.length > 3 && /^[^aeiouyAEIOUY]+$/.test(word)) { /*console.log(`[Augment Filter] Removing all consonants?: "${word}"`);*/ return false; }
          if (entity.entity_group === 'PLANT_SCI') {
              const parts = word.split(' ');
              if (parts.length < 2 || !/^[A-Z]/.test(parts[0])) { /*console.log(`[Augment Filter] Removing malformed sci: "${word}"`);*/ return false; }
          }
          if (entity.entity_group === 'PLANT_COMMON') {
               if (word.length <= 5 && word === word.toUpperCase()) { /*console.log(`[Augment Filter] Removing potential acronym: "${word}"`);*/ return false; }
          }
          return true; // Passed filters
      });
      console.log(`[Augment] Filtered NER Entities Count: ${filteredEntities.length}`);
      // *********************************************************

      // 3. Prepare search terms FROM FILTERED entities
      const extractedNames = filteredEntities.map(entity => entity.word.trim().toLowerCase());
      const uniqueExtractedNames = Array.from(new Set(extractedNames));
      let searchTerms = [];

      // 4. Decide search terms
      console.warn(`[Augment Name Filter] Unique valid names after filtering: [${uniqueExtractedNames.join(', ')}]`);
      if (uniqueExtractedNames.length > 0) {
        searchTerms = uniqueExtractedNames;
        console.warn(`>>> [AUGMENT DECISION] Using FILTERED NER names for API search: [${searchTerms.join(', ')}] <<<`);
      } else {
        searchTerms = [query]; // Fallback to the original query
        console.warn(`>>> [AUGMENT DECISION] NER found no valid names after filtering. Using RAW QUERY for API search: "${query}" <<<`);
      }
      console.log(`[Augment] Preparing Trefle API calls for terms: [${searchTerms.join(', ')}]`);

      // 5. Iterate and call Trefle API
      for (const term of searchTerms) {
        const normalizedTerm = term.toLowerCase().trim();
        if (!normalizedTerm || searchedTerms.has(normalizedTerm)) continue;
        searchedTerms.add(normalizedTerm);

        // *** Add Logging Before Trefle Call ***
        console.log(`[Augment Trefle Query] Looking up term: "${normalizedTerm}"`);
        // ***************************************

        await new Promise(resolve => setTimeout(resolve, 150)); // Small delay
        let plantInfo = null;

        // --- Try getPlantByName ---
        try {
          plantInfo = await trefleApiTools.getPlantByName(normalizedTerm);
        } catch (err) {
           console.error(`[Augment API Error] getPlantByName failed for "${normalizedTerm}":`, err.message);
           // Don't stop, proceed to search
        }

        // --- Process getPlantByName Result ---
        if (plantInfo?.id && !processedPlantIds.has(plantInfo.id)) {
            console.log(`[Augment API Success] Found (ID: ${plantInfo.id}) via getPlantByName for "${normalizedTerm}".`);
            const contextItem = { id: plantInfo.id, name: plantInfo.name, scientificName: plantInfo.scientificName, description: plantInfo.description ?? null, careInfo: plantInfo.careInfo, soilNeeds: plantInfo.soilNeeds, source: plantInfo.source ?? `Trefle API (ID: ${plantInfo.id})` };
            apiResults.push(contextItem);
            processedPlantIds.add(plantInfo.id);
            this.storeFetchedPlantInfo(contextItem).catch(err => console.error(`[Augment Store Bg] Error storing ${contextItem.name}:`, err));
            continue; // Found via name, move to next term
        }

        // --- If getPlantByName failed or skipped, Try Search ---
        // console.log(`[Augment API] getPlantByName failed/skipped for "${normalizedTerm}". Trying search...`);
        try {
            console.log(`[Augment Trefle Query] Searching for term: "${normalizedTerm}"`);
            const searchResults = await trefleApiTools.searchPlants(normalizedTerm);
            if (searchResults?.length > 0) {
                const topResult = searchResults[0];
                if (topResult?.id && !processedPlantIds.has(topResult.id)) {
                     console.log(`[Augment Trefle Query] Getting details for search result ID: ${topResult.id} (from term "${normalizedTerm}")`);
                    const plantDetails = await trefleApiTools.getPlantDetails(topResult.id);
                    if (plantDetails?.id) {
                         console.log(`[Augment API Success] Found details for search result ID ${topResult.id}.`);
                         const contextItem = { id: plantDetails.id, name: plantDetails.name, scientificName: plantDetails.scientificName, description: plantDetails.description ?? null, careInfo: plantDetails.careInfo, soilNeeds: plantDetails.soilNeeds, source: plantDetails.source ?? `Trefle API (ID: ${plantDetails.id})` };
                         apiResults.push(contextItem);
                         processedPlantIds.add(plantDetails.id);
                         this.storeFetchedPlantInfo(contextItem).catch(err => console.error(`[Augment Store Bg] Error storing ${contextItem.name}:`, err));
                    } else {
                         console.log(`[Augment API Warn] Failed to get details for search ID ${topResult.id}.`);
                    }
                } else { /* console.log(`[Augment API Skip] Top search result skipped.`); */ }
            } else { /* console.log(`[Augment API] General search for "${normalizedTerm}" yielded no results.`); */ }
        } catch (searchErr) {
            // Catch specific errors from search/details calls within the loop
            console.error(`[Augment API Error] During search/detail fetch for "${normalizedTerm}":`, searchErr.message);
             // Check for specific status codes if possible (depends on trefleApiTools structure)
             if (searchErr.message?.includes('500')) {
                 console.error(`>>> Trefle returned 500 Internal Server Error for term "${normalizedTerm}" <<<`);
             }
        }
      } // end for loop

      console.warn(`--- [CONTEXT AUGMENTATION END] Added ${apiResults.length} items via API calls. ---`);
      return apiResults;

    } catch (error) {
      // Catch errors in the overall augmentation logic (e.g., initial NER failure)
      console.error('!!!!!!!!!! [AUGMENTATION FAILED] Error during context augmentation:', error);
      return [];
    }
  }

  /**
   * Stores fetched plant info in the background (calls embedding generation).
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
      ].filter(Boolean).join(' | ').trim(); // filter(Boolean) removes null/undefined/empty

      if (!textToEmbed) {
        // console.warn(`[Store Info] Skipping ${plantInfo.name}: No text to embed.`); // Less verbose
        return;
      }
      const embedding = await generateTextEmbedding(textToEmbed);
      // Add dimension check here based on config if needed
      const { MODEL_CONFIG: cfg } = await import('./config.js'); // Dynamic import for latest config
      if (!embedding?.length || embedding.length !== cfg.embeddingDimension) {
        console.error(`[Store Info] Failed or incorrect embedding dim for ${plantInfo.name}. Expected ${cfg.embeddingDimension}, Got ${embedding?.length}.`);
        return;
      }
      const dataForDb = {
        id: plantInfo.id,
        name: plantInfo.name,
        scientificName: plantInfo.scientificName ?? null,
        description: plantInfo.description ?? null,
        careInfo: plantInfo.careInfo ?? null,
        soilNeeds: plantInfo.soilNeeds ?? null,
        source: plantInfo.source ?? 'Trefle API',
      };
      await storePlantInfoWithEmbedding(dataForDb, embedding);
      // console.log(`[Store Info] Stored/Updated ${plantInfo.name}.`); // Less verbose
    } catch (dbError) {
      console.error(`[Store Info] Error storing ${plantInfo.name || 'ID: '+plantInfo.id}:`, dbError.message);
    }
  }

  /**
   * Generates the final LLM response based on query and context.
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
          const hasContent = (item.description?.trim().length > 5) || (item.careInfo?.trim().length > 5) || (item.soilNeeds?.trim().length > 5) || item.scientificName;
          return item.name !== 'Unknown Plant' && hasContent;
        });

      // Handle no context case
      if (contextForLLM.length === 0) {
        console.warn("No valid context items after filtering for LLM.");
        return { answer: "I couldn't find enough relevant information to answer accurately.", sources: ['Context Preparation Failed'] };
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

      const prompt = `You are a helpful botanical assistant. Use the following context to answer the user's query accurately and concisely. Only use information from the provided context. Do not add information not present in the context.\n\nContext:\n${formattedContext}\n\nUser Query: ${query}\n\nAssistant Answer:`;

      // 3. Generate response using the LLM Factory
      const llm = createLanguageModel(); // Uses imported factory
      // Dynamically get LLM provider name for logging
      const { MODEL_CONFIG: cfg } = await import('./config.js');
      console.log(`Generating final response with ${contextForLLM.length} context items using ${cfg.llmProvider}...`);
      const responseText = await llm.invoke(prompt); // Call the appropriate invoke method

      // 4. Format and return
      const sources = contextForLLM.map(item => item.source).filter((v, i, a) => a.indexOf(v) === i); // Unique sources used
      return {
        answer: responseText.trim() || "I received a response, but it was empty.", // Handle empty response
        sources: sources
      };
    } catch (error) {
      console.error('Error generating final response:', error);
      return { answer: "Sorry, I encountered an error while generating the final answer.", sources: ['Error in Response Generation'] };
    }
  }
}

// --- Export Singleton Instance ---
export const ragPipeline = new RagPipeline();