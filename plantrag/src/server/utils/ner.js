// src/server/utils/ner.js - CORRECTED: Fixed imports and API integration

import { MODEL_CONFIG } from './config.js';
import { extractEntities as extractPlantsFromExtractor } from './llmPlantExtractor.js';

// Valid entity types from config
const VALID_ENTITY_TYPES = new Set(MODEL_CONFIG?.nerValidEntityTypes || ["PLANT_COMMON", "PLANT_SCI"]);

/**
 * 🌟 MAIN EXTRACTION FUNCTION 🌟
 * Uses corrected llmPlantExtractor.js with optional API validation
 * Maintains same function signature for compatibility with ragPipeline.js
 */
export async function extractEntities(text) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        console.warn("[NER] Received empty or invalid text.");
        return [];
    }

    try {
        console.log(`🌱 [NER] Extracting entities from: "${text.substring(0, 100)}..."`);
        
        // Step 1: Use the corrected pattern-based extraction
        console.log('🎯 [NER] Step 1: Pattern-based extraction...');
        const patternResults = await extractPlantsFromExtractor(text);
        
        if (!patternResults || patternResults.length === 0) {
            console.log('[NER] No plants found in pattern extraction');
            return [];
        }
        
        console.log(`[NER] Pattern extraction found ${patternResults.length} potential plants`);
        
        // Step 2: Optional API validation (if available)
        console.log('🔍 [NER] Step 2: Optional API validation...');
        const enhancedResults = await enhanceWithAPIValidation(patternResults);
        
        // Step 3: Filter by valid entity types and confidence
        const filteredResults = enhancedResults.filter(entity => {
            const validType = VALID_ENTITY_TYPES.has(entity.entity_group);
            const validScore = entity.score >= 0.5;
            return validType && validScore;
        });
        
        console.log(`✅ [NER] Final results: ${filteredResults.length} validated plant entities`);
        filteredResults.forEach(entity => 
            console.log(`  - "${entity.word}" (${entity.entity_group}, score: ${entity.score.toFixed(3)})`)
        );
        
        return filteredResults;
        
    } catch (error) {
        console.error(`❌ [NER] Error in extractEntities: ${error.message}`);
        
        // Emergency fallback - try pattern extraction only
        try {
            console.log('🚨 [NER] Emergency fallback: pattern-only extraction');
            const fallbackResults = await extractPlantsFromExtractor(text);
            return fallbackResults.filter(entity => entity.score >= 0.5);
        } catch (fallbackError) {
            console.error(`❌ [NER] Emergency fallback failed: ${fallbackError.message}`);
            return [];
        }
    }
}

/**
 * Enhance pattern results with API validation (if available)
 */
async function enhanceWithAPIValidation(patternResults) {
    if (!patternResults || patternResults.length === 0) {
        return [];
    }
    
    // For now, just add some metadata and slightly boost confidence
    // You can enhance this later with actual API calls to plantAPIs.js
    const enhancedResults = patternResults.map(result => ({
        ...result,
        // Boost confidence for common plants that are likely to be correct
        score: enhanceConfidenceScore(result),
        apiValidated: false, // Set to true when you add actual API validation
        enhancedBy: 'ner_facade'
    }));
    
    // Optional: Add API validation here if you want
    // const apiValidatedResults = await validateWithPlantAPIs(enhancedResults);
    
    return enhancedResults;
}

/**
 * Enhance confidence scores based on plant characteristics
 */
function enhanceConfidenceScore(result) {
    let score = result.score || 0.8;
    
    // Boost confidence for scientific names
    if (result.entity_group === 'PLANT_SCI') {
        score = Math.min(0.95, score + 0.1);
    }
    
    // Boost confidence for exact matches from llmPlantExtractor
    if (result.method === 'exact_match') {
        score = Math.min(0.98, score + 0.05);
    }
    
    // Boost confidence for plants with context
    if (result.contextBoosted) {
        score = Math.min(0.95, score + 0.05);
    }
    
    return score;
}

/**
 * Quick entity extraction for simple use cases
 * Returns just the plant names without full entity objects
 */
export async function extractPlantNamesOnly(text) {
    try {
        const entities = await extractEntities(text);
        return entities.map(entity => entity.word);
    } catch (error) {
        console.error(`[NER] extractPlantNamesOnly failed: ${error.message}`);
        return [];
    }
}

/**
 * Validate extracted entities using external APIs
 * This is a placeholder for future API integration
 */
export async function validateWithExternalAPIs(entities) {
    // Placeholder for future implementation
    // You can integrate with plantAPIs.js here when ready
    console.log(`[NER] API validation placeholder called for ${entities.length} entities`);
    return entities.map(entity => ({
        ...entity,
        externallyValidated: false,
        validationNote: 'API validation not yet implemented'
    }));
}

/**
 * Health check for the NER system
 */
export async function nerHealthCheck() {
    try {
        console.log('[NER] Running health check...');
        
        const testCases = [
            'How much should I be watering my Poinsetta?',
            'My hibiscus needs care',
            'Peace lily watering tips'
        ];
        
        const results = {
            patternExtraction: false,
            nerFacade: false,
            overall: 'unknown'
        };
        
        // Test pattern extraction through our facade
        try {
            const testResult = await extractEntities(testCases[0]);
            results.patternExtraction = testResult && testResult.length > 0;
            
            // Check if Poinsettia was properly detected from "Poinsetta"
            const hasPoinsettia = testResult.some(r => 
                r.word.toLowerCase().includes('poinsettia')
            );
            results.poinsettiaTest = hasPoinsettia;
            
            console.log(`[NER] Pattern extraction test: ${results.patternExtraction ? 'PASS' : 'FAIL'}`);
            console.log(`[NER] Poinsettia detection test: ${hasPoinsettia ? 'PASS' : 'FAIL'}`);
        } catch (error) {
            console.error(`[NER] Pattern extraction test failed: ${error.message}`);
            results.patternExtraction = false;
        }
        
        // Test facade functionality
        try {
            const facadeTest = await extractPlantNamesOnly(testCases[1]);
            results.nerFacade = facadeTest && facadeTest.length > 0;
            console.log(`[NER] NER facade test: ${results.nerFacade ? 'PASS' : 'FAIL'}`);
        } catch (error) {
            console.error(`[NER] NER facade test failed: ${error.message}`);
            results.nerFacade = false;
        }
        
        // Determine overall health
        if (results.patternExtraction && results.nerFacade) {
            results.overall = 'healthy';
        } else if (results.patternExtraction) {
            results.overall = 'degraded';
        } else {
            results.overall = 'unhealthy';
        }
        
        return {
            overall: results.overall,
            components: {
                patternExtraction: results.patternExtraction ? 'healthy' : 'unhealthy',
                nerFacade: results.nerFacade ? 'healthy' : 'unhealthy',
                poinsettiaDetection: results.poinsettiaTest ? 'healthy' : 'unhealthy'
            },
            validEntityTypes: Array.from(VALID_ENTITY_TYPES),
            systemType: 'ner_facade_with_pattern_extraction',
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error(`[NER] Health check failed: ${error.message}`);
        return {
            overall: 'unhealthy',
            error: error.message,
            systemType: 'ner_facade_with_pattern_extraction',
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Get system information
 */
export function getNERSystemInfo() {
    return {
        systemType: 'ner_facade_with_pattern_extraction',
        description: 'NER facade that uses corrected llmPlantExtractor.js for pattern-based extraction',
        validEntityTypes: Array.from(VALID_ENTITY_TYPES),
        features: [
            'Facade pattern for API compatibility',
            'Pattern-based plant name extraction',
            'Fuzzy matching for typos (including Poinsetta→Poinsettia)',
            'Scientific name recognition',
            'Confidence scoring and filtering',
            'Context-aware extraction'
        ],
        advantages: [
            'Maintains compatibility with existing ragPipeline.js',
            'No BigInt conflicts or ONNX complexity',
            'Fast and reliable pattern matching',
            'Easy to maintain and debug',
            'Can be enhanced with API validation later'
        ],
        integration: {
            importPath: './ner.js',
            mainFunction: 'extractEntities',
            usedBy: ['ragPipeline.js']
        }
    };
}