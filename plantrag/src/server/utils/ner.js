// src/server/utils/ner.js - Refactored to use pattern extraction + API validation
// Removes ONNX model complexity, uses plantExtractor.js + plantAPIs.js

import { MODEL_CONFIG } from './config.js';
import { extractPlantNames } from './plantExtractor.js';
import { reliablePlantAPI, validatePlantNames } from './plantAPIs.js';

// Valid entity types from config
const VALID_ENTITY_TYPES = new Set(MODEL_CONFIG?.nerValidEntityTypes || ["PLANT_COMMON", "PLANT_SCI"]);

/**
 * 🌟 MAIN EXTRACTION FUNCTION 🌟
 * Uses pattern-based extraction + API validation (no more ONNX complexity!)
 * Keeps same function signature for compatibility
 */
export async function extractEntities(text) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        console.warn("Received empty or invalid text.");
        return [];
    }

    try {
        console.log(`🌱 Extracting entities from: "${text.substring(0, 100)}..."`);
        
        // Step 1: Use the excellent pattern-based extraction
        console.log('🎯 Step 1: Pattern-based extraction...');
        const patternResults = await extractPlantNames(text);
        
        if (!patternResults || patternResults.length === 0) {
            console.log('No plants found in pattern extraction');
            return [];
        }
        
        console.log(`Pattern extraction found ${patternResults.length} potential plants`);
        
        // Step 2: API validation for higher confidence (optional if APIs are down)
        console.log('🔍 Step 2: API validation...');
        const validatedResults = await validateWithAPI(patternResults);
        
        // If API validation completely failed, use pattern results
        const finalResults = validatedResults.length > 0 ? validatedResults : patternResults.map(result => ({
            ...result,
            apiValidated: false,
            confidence: (result.score || 0.8) * 0.9 // Keep high confidence for pattern matches when APIs are down
        }));
        
        // Step 3: Format results for compatibility 
        const finalEntities = formatEntitiesForCompatibility(finalResults);
        
        console.log(`✅ Final results: ${finalEntities.length} validated plant entities`);
        finalEntities.forEach(entity => 
            console.log(`  - "${entity.word}" (${entity.entity_group}, validated: ${entity.apiValidated || false})`)
        );
        
        return finalEntities;
        
    } catch (error) {
        console.error(`❌ Error in extractEntities: ${error.message}`);
        
        // Emergency fallback - return pattern results without API validation
        try {
            console.log('🚨 Emergency fallback: pattern-only extraction');
            const fallbackResults = await extractPlantNames(text);
            return formatEntitiesForCompatibility(fallbackResults);
        } catch (fallbackError) {
            console.error(`❌ Emergency fallback failed: ${fallbackError.message}`);
            return [];
        }
    }
}

/**
 * Validate pattern results using the unified plant API
 */
async function validateWithAPI(patternResults) {
    if (!patternResults || patternResults.length === 0) {
        return [];
    }
    
    const validatedResults = [];
    
    // Extract unique plant names for validation
    const uniquePlantNames = [...new Set(
        patternResults
            .filter(r => r && r.word && typeof r.word === 'string')
            .map(r => r.word.trim())
            .filter(name => name.length > 0)
    )];
    
    if (uniquePlantNames.length === 0) {
        console.log('No valid plant names to validate');
        return patternResults;
    }
    
    console.log(`Validating ${uniquePlantNames.length} unique plant names with API...`);
    
    try {
        // Use the validatePlantNames function from plantAPIs.js
        const apiValidations = await validatePlantNames(uniquePlantNames.slice(0, 5)); // Limit to prevent API abuse
        
        if (!apiValidations || !Array.isArray(apiValidations)) {
            console.warn('API validation returned invalid response, using pattern results');
            return patternResults.map(result => ({
                ...result,
                apiValidated: false,
                confidence: (result.score || 0.8) * 0.7
            }));
        }
        
        // Create validation lookup map
        const validationMap = new Map();
        apiValidations.forEach(validation => {
            if (validation && validation.plantName && typeof validation.plantName === 'string') {
                validationMap.set(validation.plantName.toLowerCase(), validation);
            }
        });
        
        // Apply validations to original results
        for (const result of patternResults) {
            if (!result || !result.word || typeof result.word !== 'string') {
                console.warn('Skipping invalid result:', result);
                continue;
            }
            
            const plantNameLower = result.word.toLowerCase();
            const validation = validationMap.get(plantNameLower);
            
            if (validation && validation.isValid) {
                // API validated - keep with enhanced info
                validatedResults.push({
                    ...result,
                    apiValidated: true,
                    validatedName: validation.validatedName,
                    scientificName: validation.scientificName,
                    apiSource: validation.source,
                    confidence: validation.confidence
                });
            } else if (!validation) {
                // Not API validated but keep if confidence was high from patterns
                if (result.score >= 0.8) {
                    validatedResults.push({
                        ...result,
                        apiValidated: false,
                        confidence: result.score * 0.8 // Reduce confidence for non-validated
                    });
                }
            }
            // If validation exists but isValid is false, exclude the result
        }
        
        console.log(`API validation: ${validatedResults.filter(r => r.apiValidated).length}/${uniquePlantNames.length} confirmed valid`);
        
    } catch (apiError) {
        console.warn(`⚠️ API validation failed, using pattern results: ${apiError.message}`);
        
        // Fallback: return pattern results with reduced confidence
        return patternResults.map(result => ({
            ...result,
            apiValidated: false,
            confidence: result.score * 0.7
        }));
    }
    
    return validatedResults;
}

/**
 * Format results for compatibility with existing code
 */
function formatEntitiesForCompatibility(results) {
    if (!results || results.length === 0) {
        return [];
    }
    
    return results.map(result => ({
        entity_group: result.entity_group || 'PLANT_COMMON',
        score: result.confidence || result.score || 0.8,
        word: result.validatedName || result.word,
        start: result.start || 0,
        end: result.end || (result.word ? result.word.length : 0),
        source: 'pattern_api_validation',
        
        // Additional metadata (optional)
        originalWord: result.word,
        apiValidated: result.apiValidated || false,
        scientificName: result.scientificName,
        apiSource: result.apiSource,
        methods: result.methods || ['pattern'],
        pattern_name: result.pattern_name
    }));
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
        console.error(`extractPlantNamesOnly failed: ${error.message}`);
        return [];
    }
}

/**
 * Validate a single plant name using API
 */
export async function validateSinglePlant(plantName) {
    if (!plantName || typeof plantName !== 'string') {
        return { isValid: false, plantName };
    }
    
    try {
        console.log(`Validating single plant: "${plantName}"`);
        const result = await reliablePlantAPI.validatePlantName(plantName);
        return result;
    } catch (error) {
        console.error(`Single plant validation failed for "${plantName}": ${error.message}`);
        return {
            isValid: false,
            plantName,
            error: error.message
        };
    }
}

/**
 * Health check for the new NER system
 */
export async function nerHealthCheck() {
    try {
        console.log('[NER] Running health check...');
        
        const testCases = [
            'How do I care for my hibiscus?',
            'My Monstera deliciosa needs repotting',
            'Peace lily watering tips'
        ];
        
        const results = {
            patternExtraction: false,
            apiValidation: false,
            overall: 'unknown'
        };
        
        // Test pattern extraction
        try {
            const patternTest = await extractPlantNames(testCases[0]);
            results.patternExtraction = patternTest && patternTest.length > 0;
            console.log(`[NER] Pattern extraction test: ${results.patternExtraction ? 'PASS' : 'FAIL'}`);
        } catch (error) {
            console.error(`[NER] Pattern extraction test failed: ${error.message}`);
            results.patternExtraction = false;
        }
        
        // Test API validation
        try {
            const apiTest = await validateSinglePlant('hibiscus');
            results.apiValidation = apiTest && apiTest.isValid;
            console.log(`[NER] API validation test: ${results.apiValidation ? 'PASS' : 'FAIL'}`);
        } catch (error) {
            console.error(`[NER] API validation test failed: ${error.message}`);
            results.apiValidation = false;
        }
        
        // Test full pipeline
        try {
            const fullTest = await extractEntities(testCases[0]);
            const hasResults = fullTest && fullTest.length > 0;
            console.log(`[NER] Full pipeline test: ${hasResults ? 'PASS' : 'FAIL'}`);
        } catch (error) {
            console.error(`[NER] Full pipeline test failed: ${error.message}`);
        }
        
        // Determine overall health
        if (results.patternExtraction && results.apiValidation) {
            results.overall = 'healthy';
        } else if (results.patternExtraction) {
            results.overall = 'degraded'; // Pattern works but API doesn't
        } else {
            results.overall = 'unhealthy';
        }
        
        return {
            overall: results.overall,
            components: {
                patternExtraction: results.patternExtraction ? 'healthy' : 'unhealthy',
                apiValidation: results.apiValidation ? 'healthy' : 'unhealthy'
            },
            validEntityTypes: Array.from(VALID_ENTITY_TYPES),
            systemType: 'pattern_api_validation',
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error(`[NER] Health check failed: ${error.message}`);
        return {
            overall: 'unhealthy',
            error: error.message,
            systemType: 'pattern_api_validation',
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Get system information
 */
export function getNERSystemInfo() {
    return {
        systemType: 'pattern_api_validation',
        description: 'Uses pattern-based extraction from plantExtractor.js with API validation from plantAPIs.js',
        validEntityTypes: Array.from(VALID_ENTITY_TYPES),
        features: [
            'Multi-method pattern extraction',
            'API validation with plant databases',
            'Fuzzy matching for typos',
            'Scientific name recognition',
            'Context-aware extraction'
        ],
        advantages: [
            'No BigInt conflicts',
            'Much faster than ONNX models',
            'More reliable pattern matching',
            'API validation increases accuracy',
            'Easier to maintain and debug'
        ]
    };
}