// src/server/utils/ragPipeline.js - REFACTORED TO USE YOUR EXISTING COMPONENTS
// Uses your existing: intentClassifier.js, conversationService.js, ragDebugSuite.js, ner.js, etc.

import { reliablePlantAPI } from './plantAPIs.js';
import { queryVectorDatabase, storePlantInfoWithEmbedding } from './vectorDatabase.js';
import { LLM_CONFIG, MODEL_CONFIG, EMBEDDING_CONFIG, RAG_CONFIG } from './config.js';
import { generateTextEmbedding } from './embeddings.js';
import { extractEntities, extractPlantNamesRobust } from './llmPlantExtractor.js';
import { generateText } from './llm/llmService.js';
import { generatePlantCareResponse } from './plantCareUtils.js';
import { 
  buildConversationPrompt, 
  buildCareAdvicePrompt,
  formatConversationHistory,
  formatContextInfo,
  determineCareType,
  getLLMOptions,
  validatePrompt 
} from './promptManager.js';

// Simple data flow tracker for debugging
class DataFlowTracker {
  constructor() {
    this.steps = [];
    this.enabled = process.env.NODE_ENV !== 'production';
    this.sessionQuery = '';
  }

  startSession(query) {
    this.sessionQuery = query;
    this.steps = [];
    if (this.enabled) {
      console.log(`🔄 [DATA FLOW] Started session for: "${query}"`);
    }
  }

  logStep(step, data, metadata = {}) {
    if (!this.enabled) return;
    
    const entry = {
      timestamp: new Date().toISOString(),
      step,
      dataSize: Array.isArray(data) ? data.length : Object.keys(data || {}).length,
      hasValidData: this.hasValidData(data),
      metadata
    };
    
    this.steps.push(entry);
    console.log(`🔍 [DATA FLOW] ${step}: ${entry.hasValidData ? '✅' : '❌'} (${entry.dataSize} items)`, metadata);
  }

  hasValidData(data) {
    if (Array.isArray(data)) return data.length > 0;
    if (data && typeof data === 'object') return Object.keys(data).length > 0;
    if (data && typeof data === 'string') return data.trim().length > 0;
    return false;
  }

  logError(error) {
    if (this.enabled) {
      console.error(`❌ [DATA FLOW] Error: ${error.message}`);
    }
  }

  getReport() {
    return {
      sessionQuery: this.sessionQuery,
      totalSteps: this.steps.length,
      steps: this.steps,
      hasDataIssues: this.steps.some(step => !step.hasValidData)
    };
  }
}

// USE YOUR EXISTING COMPONENTS
import { intentClassifier } from './llm/intentClassifier.js'; // Your existing intent classifier
import { getConversationHistoryForLLM } from './conversationService.js'; // Your existing conversation functions
import { extractEntities as extractNEREntities } from './ner.js'; // Your existing NER (renamed to avoid conflict)
// NOTE: Not importing RAGDebugSuite here to avoid circular imports since it imports ragPipeline.js

// Enhanced RAG Pipeline Class - REFACTORED TO USE YOUR EXISTING COMPONENTS
class RagPipeline {
  constructor() {
    // Core configuration (unchanged)
    this.topK = RAG_CONFIG.topK || MODEL_CONFIG.ragTopK || 5;
    this.similarityThreshold = RAG_CONFIG.similarityThreshold || MODEL_CONFIG.ragSimilarityThreshold || 0.7;
    this.llmConfig = LLM_CONFIG;
    this.embeddingConfig = EMBEDDING_CONFIG;
    this.debugSuite = new DataFlowTracker();

    console.log(`🚀 [RAG PIPELINE] Initialized using your existing components`);
    console.log(`  - topK: ${this.topK}, similarity threshold: ${this.similarityThreshold}`);
    console.log(`  - Your RAGDebugSuite is available separately for comprehensive testing`);
  }

  async testLLMConnectivity() {
    try {
      const testResult = await generateText(
        "Please respond with 'LLM connectivity test successful'", 
        { max_tokens: 50, temperature: 0.1, timeout: 10000 }
      );
      
      const testResponse = testResult?.text || testResult;
      const isWorking = testResponse && typeof testResponse === 'string' && testResponse.length > 0;
      
      console.log(`🔗 [LLM TEST] ${isWorking ? 'SUCCESS' : 'FAILED'}: ${testResponse?.substring(0, 100) || 'No response'}`);
      return isWorking;
    } catch (error) {
      console.error(`❌ [LLM TEST] Failed: ${error.message}`);
      return false;
    }
  }

  async extractConversationContext(conversationHistoryForLLM) {
      return conversationHistoryForLLM;
  }


  async processQuery(query, conversationHistoryForLLM = []) {
    console.log(`\n🚀 [RAG PIPELINE] Processing: "${query}"`);
    
    // USE YOUR EXISTING DEBUG SUITE
    this.debugSuite.startSession(query);
    
    try {
      // STEP 1: Use YOUR existing conversation service for context
      const conversationContext = await this.extractConversationContext(conversationHistoryForLLM);
      this.debugSuite.logStep('CONVERSATION_CONTEXT', conversationContext);
      
      // STEP 2: Extract plants with YOUR existing LLM extractor
      console.log('\n🌿 [RAG] Step 1: Extract plants with context-aware LLM...');
      const detectedPlants = await extractPlantNamesRobust(query, conversationContext);
      this.debugSuite.logStep('PLANT_EXTRACTION', detectedPlants, { count: detectedPlants.length });
      
      // Use conversation context if no plants detected
      let plantsToUse = detectedPlants;
      if (plantsToUse.length === 0 && conversationContext?.lastPlants?.length > 0) {
        plantsToUse = conversationContext.lastPlants;
        console.log(`🔄 [RAG] Using conversation context plants: [${plantsToUse.join(', ')}]`);
      }

      // STEP 3: Use YOUR existing intent classifier
      const queryIntent = await intentClassifier.classifyIntent(query, { plants: plantsToUse, hasPlants: plantsToUse.length > 0 });
      this.debugSuite.logStep('QUERY_INTENT', queryIntent);
      console.log(`🎯 [RAG] Query intent: ${queryIntent.type}, confidence: ${queryIntent.confidence}`);
      
      // STEP 4: Use YOUR existing NER for additional entity extraction
      const namedEntities = await extractEntities(query);
      this.debugSuite.logStep('NAMED_ENTITIES', namedEntities);
      
      // STEP 5: Fetch enhanced plant data using existing plant APIs
      let enhancedPlantData = [];
      if (plantsToUse.length > 0) {
        console.log('\n🔍 [RAG] Step 2: Fetching enhanced plant data from APIs...');
        enhancedPlantData = await this.getEnhancedPlantData(plantsToUse);
        this.debugSuite.logStep('API_DATA_FETCHED', enhancedPlantData);
      }
      
      // STEP 6: Route to appropriate response generator based on intent
      let response;
      switch (queryIntent.type) {
        case 'plant_care':
        case 'troubleshooting':
          response = await this.generateCareResponse(query, plantsToUse, enhancedPlantData, queryIntent);
          break;
          
        case 'plant_identification':
          response = await this.generateIdentificationResponse(query, enhancedPlantData, conversationHistoryForLLM);
          break;
          
        case 'botanical_info':
          response = await this.generateBotanicalInfoResponse(query, plantsToUse, enhancedPlantData, conversationHistoryForLLM);
          break;
          
        case 'general_conversation':
        default:
          response = await this.generateConversationalResponse(query, plantsToUse, enhancedPlantData, conversationHistoryForLLM);
          break;
      }
      
      this.debugSuite.logStep('ROUTED_RESPONSE', response);
      
      if (response && this.isValidResponse(response.answer)) {
        console.log('✅ [RAG] Routed response successful!');
        response.debug = this.debugSuite.getReport();
        return response;
      }

      // STEP 7: Fallback to full RAG pipeline with database context
      console.log('\n🔍 [RAG] Fallback to full RAG pipeline...');
      return await this.runFullRagPipeline(query, plantsToUse, enhancedPlantData, conversationHistoryForLLM);
      
    } catch (error) {
      console.error(`[RAG PIPELINE] Error in processQuery: ${error.message}`, error);
      this.debugSuite.logError(error);
      return this.getEmergencyResponse(query, []);
    }
  }

  // SIMPLIFIED response generation methods that use YOUR existing components
  async generateCareResponse(query, plantNames, enhancedData, intent) {
    console.log(`🌱 [CARE RESPONSE] Generating for: [${plantNames.join(', ')}]`);
    
    try {
      // Use YOUR existing plant care utils as primary method
      const response = await generatePlantCareResponse(query, plantNames, enhancedData);
      
      if (response && response.length > 30) {
        return {
          answer: response,
          sources: enhancedData.map(item => item.source).filter(Boolean),
          type: 'plant_care',
          entities: [],
          plantCount: plantNames.length,
          reasoning: `Generated using your existing plantCareUtils with ${enhancedData.length} API sources`
        };
      }
      
      // Fallback using YOUR existing prompt manager
      if (enhancedData.length > 0) {
        const careType = determineCareType(query);
        const prompt = buildCareAdvicePrompt(query, plantNames, enhancedData, careType);
        const validatedPrompt = validatePrompt(prompt, 8000);
        const llmOptions = getLLMOptions('careAdvice', true);
        
        const llmResponse = await generateText(validatedPrompt, llmOptions);
        const responseText = llmResponse?.text || llmResponse;
        
        if (responseText && responseText.length > 30) {
          return {
            answer: this.cleanResponse(responseText, query),
            sources: enhancedData.map(item => item.source).filter(Boolean),
            type: 'plant_care_llm',
            entities: [],
            plantCount: plantNames.length,
            reasoning: `Generated using your existing promptManager with ${enhancedData.length} API sources`
          };
        }
      }
      
      return null;
      
    } catch (error) {
      console.error(`❌ [CARE RESPONSE] Failed: ${error.message}`);
      return null;
    }
  }

  async generateIdentificationResponse(query, enhancedData, conversationHistory) {
    console.log(`🔍 [IDENTIFICATION] Generating identification help`);
    
    try {
      // Use YOUR existing prompt manager for identification-focused response
      const contextInfo = formatContextInfo(enhancedData);
      const prompt = buildConversationPrompt(query, conversationHistory, contextInfo);
      
      const identificationPrompt = prompt.replace(
        'PlantPal, an expert botanist',
        'PlantPal, a plant identification specialist. Help the user identify their plant based on the description and any available database information'
      );
      
      const llmOptions = getLLMOptions('conversation', enhancedData.length > 0);
      const response = await generateText(identificationPrompt, llmOptions);
      const responseText = response?.text || response;
      
      if (responseText && responseText.length > 30) {
        return {
          answer: this.cleanResponse(responseText, query),
          sources: this.extractSources(enhancedData),
          type: 'plant_identification',
          entities: [],
          plantCount: 0,
          reasoning: 'Generated using your existing promptManager for identification'
        };
      }
      
    } catch (error) {
      console.error(`❌ [IDENTIFICATION] Failed: ${error.message}`);
    }
    
    // Fallback response
    return {
      answer: "I'd be happy to help identify your plant! Can you describe its appearance? Details like leaf shape, size, color, growth pattern, and any flowers or unique features would be helpful for identification.",
      sources: ['PlantPal Expertise'],
      type: 'plant_identification',
      entities: [],
      plantCount: 0,
      reasoning: 'Fallback identification response'
    };
  }

  async generateBotanicalInfoResponse(query, plantNames, enhancedData, conversationHistory) {
    console.log(`🌱 [BOTANICAL INFO] Generating for: [${plantNames.join(', ')}]`);
    
    try {
      if (enhancedData.length > 0) {
        // Use YOUR existing prompt manager for botanical focus
        const careType = 'general';
        const prompt = buildCareAdvicePrompt(query, plantNames, enhancedData, careType);
        
        const botanicalPrompt = prompt.replace(
          'plant care specialist',
          'botanical expert focusing on scientific information, taxonomy, and plant biology'
        );
        
        const llmOptions = getLLMOptions('careAdvice', true);
        const response = await generateText(botanicalPrompt, llmOptions);
        const responseText = response?.text || response;
        
        if (responseText && responseText.length > 30) {
          return {
            answer: this.cleanResponse(responseText, query),
            sources: this.extractSources(enhancedData),
            type: 'botanical_info',
            entities: [],
            plantCount: plantNames.length,
            reasoning: 'Generated using your existing promptManager for botanical info'
          };
        }
      }
      
      // Fallback to conversational
      return await this.generateConversationalResponse(query, plantNames, enhancedData, conversationHistory);
      
    } catch (error) {
      console.error(`❌ [BOTANICAL INFO] Failed: ${error.message}`);
      return await this.generateConversationalResponse(query, plantNames, enhancedData, conversationHistory);
    }
  }

  async generateConversationalResponse(query, plantNames, enhancedData, conversationHistory) {
    console.log(`💬 [CONVERSATIONAL] Generating conversational response`);
    
    try {
      // Use YOUR existing prompt manager and conversation service
      const contextInfo = formatContextInfo(enhancedData);
      const prompt = buildConversationPrompt(query, conversationHistory, contextInfo);
      const validatedPrompt = validatePrompt(prompt, 8000);
      const llmOptions = getLLMOptions('conversation', enhancedData.length > 0);
      
      const response = await generateText(validatedPrompt, llmOptions);
      const responseText = response?.text || response;
      
      if (responseText && responseText.length > 20) {
        return {
          answer: this.cleanResponse(responseText, query),
          sources: this.extractSources(enhancedData, 'PlantPal Expertise'),
          type: 'general_conversation',
          entities: [],
          plantCount: plantNames.length,
          reasoning: `Generated using your existing promptManager and conversationService`
        };
      }
      
    } catch (error) {
      console.error(`❌ [CONVERSATIONAL] Failed: ${error.message}`);
    }
    
    // Ultimate fallback
    return this.generateFallbackResponse(query, plantNames);
  }

  generateFallbackResponse(query, plantNames) {
    const primaryPlant = plantNames && plantNames.length > 0 ? plantNames[0] : null;
    
    let fallbackMessage = "I'm here to help with your plant questions! ";
    if (primaryPlant) {
      fallbackMessage += `I'd be happy to provide guidance about ${primaryPlant}. `;
    }
    fallbackMessage += "Could you tell me more specifically what you'd like to know?";
    
    return {
      answer: fallbackMessage,
      sources: ['PlantPal'],
      type: 'general_conversation',
      entities: [],
      plantCount: plantNames.length,
      reasoning: 'Fallback response due to processing limitations'
    };
  }

  // KEEP existing plant data enrichment methods (but move API logic to use YOUR existing plantAPIs.js properly)
  async getEnhancedPlantData(plantNames) {
    try {
      console.log(`🔍 [ENHANCED DATA] Fetching data for: [${plantNames.join(', ')}]`);
      
      const enhancedResults = [];
      const maxPlantsToProcess = Math.min(plantNames.length, 3);
      
      for (let i = 0; i < maxPlantsToProcess; i++) {
        const plant = plantNames[i];
        try {
          // Use YOUR existing reliable plant API
          const apiResults = await reliablePlantAPI.searchAllAPIs(plant, 12000);
          
          if (apiResults && apiResults.length > 0) {
            const topResults = apiResults.slice(0, 2);
            for (const result of topResults) {
              const enrichedData = this.enrichApiResult(result, plant);
              if (this.hasUsefulCareData(enrichedData)) {
                enhancedResults.push(enrichedData);
              }
            }
          }
        } catch (error) {
          console.warn(`⚠️ [ENHANCED DATA] Failed for ${plant}:`, error.message);
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      console.log(`✅ [ENHANCED DATA] Retrieved ${enhancedResults.length} enriched items`);
      return this.validateEnhancedData(enhancedResults);
      
    } catch (error) {
      console.error('❌ [ENHANCED DATA] Failed:', error);
      return [];
    }
  }

  // KEEP all existing helper methods that work well
  enrichApiResult(result, originalPlant) {
    return {
      id: `${result.source}_${result.id || Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: result.commonName || result.scientificName || originalPlant,
      scientificName: result.scientificName,
      family: result.family,
      description: result.description,
      careInfo: this.extractCareInfo(result),
      watering: this.standardizeWateringInfo(result),
      light: this.standardizeLightInfo(result),
      sunlight: this.standardizeLightInfo(result),
      soil: this.standardizeSoilInfo(result),
      humidity: this.standardizeHumidityInfo(result),
      temperature: this.standardizeTemperatureInfo(result),
      fertilizer: this.standardizeFertilizerInfo(result),
      repotting: this.standardizeRepottingInfo(result),
      toxicity: this.standardizeToxicityInfo(result),
      commonIssues: this.standardizeIssuesInfo(result),
      growthRate: result.growth_rate || result.growthRate,
      maxSize: result.mature_size || result.size || result.dimensions,
      bloomTime: result.bloom_time || result.flowering_season,
      cycle: result.cycle,
      nativeRegion: result.native || result.origin,
      habitat: result.habitat || result.environment,
      indoor: result.indoor,
      drought_tolerant: result.drought_tolerant,
      botanicalContext: this.buildBotanicalContext(result),
      source: `${result.source.toUpperCase()} API`,
      confidence: result.confidence || 0.8,
      _rawData: result
    };
  }

  // KEEP all existing standardization methods (they work well)
  standardizeWateringInfo(result) {
    const wateringSources = [
      result.watering,
      result.waterRequirements,
      result.water,
      result.watering_general_benchmark
    ].filter(Boolean);
    
    if (wateringSources.length === 0) return null;
    
    const wateringInfo = wateringSources.join(' | ');
    
    if (wateringInfo.length < 20) {
      return `${wateringInfo}. Check soil moisture before watering - most plants prefer to dry out slightly between waterings.`;
    }
    
    return wateringInfo;
  }

  standardizeLightInfo(result) {
    const lightSources = [
      result.sunlight,
      result.light,
      result.lightRequirements,
      result.sunlight_full_requirement
    ].filter(Boolean);
    
    if (lightSources.length === 0) return null;
    
    const lightInfo = lightSources.map(light => 
      Array.isArray(light) ? light.join(', ') : light
    ).join(' | ');
    
    return lightInfo;
  }

  standardizeSoilInfo(result) {
    const soilSources = [
      result.soil,
      result.soilRequirements,
      result.soilType
    ].filter(Boolean);
    
    if (soilSources.length === 0) return null;
    return soilSources.join(' | ');
  }

  standardizeHumidityInfo(result) {
    const humiditySources = [
      result.humidity,
      result.humidityRequirements
    ].filter(Boolean);
    
    if (humiditySources.length === 0) return null;
    return humiditySources.join(' | ');
  }

  standardizeTemperatureInfo(result) {
    const tempSources = [
      result.temperature,
      result.temperatureRequirements,
      result.hardiness,
      result.min_temperature && result.max_temperature ? 
        `${result.min_temperature}°F - ${result.max_temperature}°F` : null
    ].filter(Boolean);
    
    if (tempSources.length === 0) return null;
    return tempSources.join(' | ');
  }

  standardizeFertilizerInfo(result) {
    const fertilizerSources = [
      result.fertilizer,
      result.feeding,
      result.nutrition,
      result.fertilityRequirement
    ].filter(Boolean);
    
    if (fertilizerSources.length === 0) return null;
    return fertilizerSources.join(' | ');
  }

  standardizeRepottingInfo(result) {
    const repottingSources = [
      result.repotting,
      result.potting,
      result.pruning_month ? `Best time for repotting: ${result.pruning_month}` : null
    ].filter(Boolean);
    
    if (repottingSources.length === 0) {
      if (result.growth_rate) {
        return result.growth_rate === 'Fast' ? 
          'Repot annually due to fast growth' : 
          'Repot every 2-3 years or when pot-bound';
      }
      return null;
    }
    
    return repottingSources.join(' | ');
  }

  standardizeToxicityInfo(result) {
    if (result.poisonous_to_humans === true || result.poisonous_to_pets === true) {
      return 'Toxic to pets and/or humans';
    }
    
    if (result.poisonous_to_humans === false && result.poisonous_to_pets === false) {
      return 'Non-toxic to pets and humans';
    }
    
    if (result.edible || result.edible_fruit || result.edible_leaf) {
      return 'Edible, generally safe';
    }
    
    return result.toxicity || null;
  }

  standardizeIssuesInfo(result) {
    const issuesSources = [
      result.commonProblems,
      result.pests,
      result.diseases,
      result.pest_susceptibility
    ].filter(Boolean);
    
    if (issuesSources.length === 0) return null;
    return issuesSources.join(' | ');
  }

  extractCareInfo(result) {
    const careElements = [];
    
    if (result.detailed_care_text) {
      careElements.push(result.detailed_care_text);
    }
    
    if (result.care_guide_sections && Array.isArray(result.care_guide_sections)) {
      result.care_guide_sections.forEach(section => {
        if (section.description) {
          careElements.push(`${section.type}: ${section.description}`);
        }
      });
    }
    
    if (careElements.length === 0) {
      if (result.watering) careElements.push(`Watering: ${result.watering}`);
      if (result.sunlight) {
        const light = Array.isArray(result.sunlight) ? result.sunlight.join(', ') : result.sunlight;
        careElements.push(`Light: ${light}`);
      }
      if (result.soil) careElements.push(`Soil: ${result.soil}`);
      if (result.care_level) careElements.push(`Care Level: ${result.care_level}`);
      if (result.maintenance) careElements.push(`Maintenance: ${result.maintenance}`);
    }
    
    return careElements.length > 0 ? careElements.join(' | ') : null;
  }

  buildBotanicalContext(result) {
    const contextParts = [];
    
    if (result.family) contextParts.push(`Family: ${result.family}`);
    if (result.origin || result.native) contextParts.push(`Origin: ${result.origin || result.native}`);
    if (result.type) contextParts.push(`Type: ${result.type}`);
    if (result.cycle) contextParts.push(`Cycle: ${result.cycle}`);
    if (result.growth_rate) contextParts.push(`Growth Rate: ${result.growth_rate}`);
    if (result.description) contextParts.push(result.description);
    
    return contextParts.join('. ');
  }

  hasUsefulCareData(data) {
    const careFields = [
      'watering', 'light', 'sunlight', 'soil', 'humidity', 
      'temperature', 'fertilizer', 'careInfo', 'description'
    ];
    
    const availableCareFields = careFields.filter(field => 
      data[field] && 
      typeof data[field] === 'string' && 
      data[field].trim().length > 10
    );
    
    return availableCareFields.length >= 1;
  }

  validateEnhancedData(enhancedData) {
    if (!enhancedData || enhancedData.length === 0) return [];
    
    return enhancedData.filter(item => {
      if (!item.name || !item.source) return false;
      if (!this.hasUsefulCareData(item)) return false;
      return true;
    });
  }

  // KEEP all existing helper methods
  cleanResponse(response, originalQuery = '') {
    if (!response || typeof response !== 'string') return response;
    
    let cleaned = response.trim();
    cleaned = cleaned.replace(/^(assistant|ai|bot|expert|user|human):\s*/i, '');
    cleaned = cleaned.replace(/^(response|answer|advice):\s*/i, '');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    if (cleaned.length < response.length * 0.6 && response.length > 50) {
      cleaned = response.trim().replace(/\s+/g, ' ');
    }
    
    return cleaned;
  }

  isValidResponse(response) {
    if (!response || typeof response !== 'string') return false;
    const trimmed = response.trim();
    if (trimmed.length < 50) return false;
    const plantKeywords = ['plant', 'water', 'light', 'soil', 'care', 'grow'];
    return plantKeywords.some(keyword => trimmed.toLowerCase().includes(keyword));
  }

  combineContextSources(databaseContext, apiContext) {
    const combined = [...(databaseContext || []), ...(apiContext || [])];
    const seen = new Set();
    return combined.filter(item => {
      const key = `${item.name}_${item.source}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async retrieveContext(queryEmbedding) {
    try {
      const results = await queryVectorDatabase(queryEmbedding, this.topK, this.similarityThreshold);
      return results.map(r => ({
        id: r.id,
        name: r.name || 'Unknown Plant',
        scientificName: r.scientificName,
        description: r.description,
        careInfo: r.careInfo,
        source: r.source || 'Database',
      }));
    } catch (error) {
      console.error('❌ Error retrieving context:', error);
      return [];
    }
  }

  async runFullRagPipeline(query, plantsToUse, enhancedPlantData, conversationHistory) {
    const llmWorking = await this.testLLMConnectivity();
    
    if (llmWorking) {
      const queryEmbedding = await generateTextEmbedding(query);
      console.log('🔍 [RAG] Generated query embedding');
      
      if (queryEmbedding && Array.isArray(queryEmbedding) && queryEmbedding.length > 0) {
        const retrievedContext = await this.retrieveContext(queryEmbedding);
        console.log(`🔍 [RAG] Retrieved ${retrievedContext.length} context items from database`);
        
        const combinedContext = this.combineContextSources(retrievedContext, enhancedPlantData);
        console.log(`🔍 [RAG] Combined context: ${combinedContext.length} total items`);

        if (combinedContext.length > 0) {
          // Use YOUR existing plant care utils for RAG response
          const response = await generatePlantCareResponse(query, plantsToUse, combinedContext);
          
          if (response && response.length > 50) {
            const ragResponse = {
              answer: response,
              sources: combinedContext.map(item => item.source).filter(Boolean),
              type: 'enhanced_rag_response',
              entities: [],
              plantCount: plantsToUse.length,
              reasoning: `Enhanced RAG response using your existing plantCareUtils with ${combinedContext.length} context sources`
            };
            
            console.log('✅ [RAG] Enhanced RAG response generated successfully');
            ragResponse.debug = { 
              note: 'Full RAG pipeline used',
              contextItems: combinedContext.length,
              plantsUsed: plantsToUse
            };
            return ragResponse;
          }
        }
      }
    }

    // Enhanced fallback using YOUR existing plant care utils
    const fallbackResponse = await generatePlantCareResponse(query, plantsToUse, enhancedPlantData);
    const result = {
      answer: fallbackResponse,
      sources: enhancedPlantData.map(item => item.source).filter(Boolean),
      type: 'enhanced_fallback',
      entities: [],
      plantCount: plantsToUse.length,
      reasoning: `Enhanced fallback using your existing plantCareUtils with ${enhancedPlantData.length} API sources`
    };
    
    result.debug = { 
      note: 'Fallback response used',
      dataItems: enhancedPlantData.length,
      plantsUsed: plantsToUse
    };
    return result;
  }

  getEmergencyResponse(query, detectedPlants) {
    const plantName = detectedPlants.length > 0 ? detectedPlants[0] : 'your plant';
    const queryLower = query.toLowerCase();
    
    let emergencyAdvice;
    if (queryLower.includes('water')) {
      emergencyAdvice = `For ${plantName}, check the soil by inserting your finger about an inch deep. Water thoroughly when the top inch feels dry.`;
    } else if (queryLower.includes('light')) {
      emergencyAdvice = `${plantName} needs appropriate lighting. Most houseplants prefer bright, indirect light.`;
    } else {
      emergencyAdvice = `Here's essential care for ${plantName}: Water when the top inch of soil feels dry, provide bright indirect light, ensure good drainage.`;
    }
    
    return {
      answer: emergencyAdvice,
      sources: ['Emergency Plant Knowledge'],
      type: 'emergency_response',
      entities: [],
      plantCount: detectedPlants.length,
      reasoning: 'Emergency fallback activated'
    };
  }

  extractSources(contextData, defaultSource = 'Plant Database') {
    if (!contextData || contextData.length === 0) return [defaultSource];
    const sources = contextData.map(item => item.source || defaultSource)
      .filter((source, index, array) => array.indexOf(source) === index);
    return sources.length > 0 ? sources : [defaultSource];
  }
}

// Create and export singleton instance (same interface as before)
export const ragPipeline = new RagPipeline();

// NOTE: Your RAGDebugSuite is available separately for comprehensive testing:
// import { RAGDebugSuite } from './ragDebugSuite.js';
// const debugSuite = new RAGDebugSuite();
// await debugSuite.runFullTestSuite();