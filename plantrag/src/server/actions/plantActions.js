// src/server/plantActions.js - Corrected to match your existing structure

import { HttpError } from 'wasp/server';
import { Prisma } from '@prisma/client';
import { reliablePlantAPI } from '../utils/plantAPIs.js'; // CHANGED: From trefleApiTools to reliablePlantAPI
import { MODEL_CONFIG } from '../utils/config.js';

// --- JSDoc Type Definitions (keeping your existing ones) ---
/** @typedef {import('./types').FetchTrefleArgs} FetchTrefleArgs */
/** @typedef {import('./types').FetchTrefleResult} FetchTrefleResult */
/** @typedef {import('./types').StorePlantDataArgs} StorePlantDataArgs */

// --- Plant Actions ---

/**
 * 🌟 UPDATED: Fetches plant data from Reliable APIs instead of Trefle
 * Keeps same function signature for compatibility
 * @param {FetchTrefleArgs} args - Operation and parameters.
 * @param {object} context - Wasp context with context.user.
 * @returns {Promise<FetchTrefleResult>} Result object.
 */
export const fetchFromTrefleApi = async (args, context) => {
    const { operation, query, id, soilType, family } = args;
    console.log(`Action: fetchFromTrefleApi called with operation: ${operation} (using reliable APIs now)`);

    if (!context.user) { throw new HttpError(401, "Authentication required"); }

    try {
        let resultData;
        switch (operation) {
            case 'search':
                console.log(`[Plant Actions] 🔍 Searching reliable APIs for: "${query}"`);
                const searchResults = await reliablePlantAPI.searchAllAPIs(query, 10000);
                // Convert to format similar to trefleApiTools.searchPlants
                resultData = searchResults.map(result => ({
                    id: result.id,
                    common_name: result.commonName,
                    scientific_name: result.scientificName,
                    family: result.family,
                    source: result.source,
                    confidence: result.confidence
                }));
                break;
                
            case 'details':
                console.log(`[Plant Actions] 📄 Getting details for ID: ${id}`);
                // For details, we need to search by the plant name since reliable APIs don't use Trefle IDs
                if (!query) {
                    throw new HttpError(400, "Query parameter required for details operation with reliable APIs");
                }
                const detailResults = await reliablePlantAPI.searchAllAPIs(query, 5000);
                resultData = detailResults.length > 0 ? convertToTrefleFormat(detailResults[0]) : null;
                break;
                
            case 'byName':
                console.log(`[Plant Actions] 🎯 Searching by name: "${query}"`);
                const nameResults = await reliablePlantAPI.searchAllAPIs(query, 8000);
                resultData = nameResults.length > 0 ? convertToTrefleFormat(nameResults[0]) : null;
                break;
                
            case 'bySoil':
                console.log(`[Plant Actions] 🌱 Searching by soil type: "${soilType}"`);
                // Reliable APIs don't have direct soil filtering, so we'll search for soil-related terms
                const soilQuery = `${soilType} soil plants`;
                const soilResults = await reliablePlantAPI.searchAllAPIs(soilQuery, 8000);
                resultData = soilResults.slice(0, 5).map(result => convertToTrefleFormat(result));
                break;
                
            case 'byFamily':
                console.log(`[Plant Actions] 👨‍👩‍👧‍👦 Searching by family: "${family}"`);
                const familyQuery = `${family} family plants`;
                const familyResults = await reliablePlantAPI.searchAllAPIs(familyQuery, 8000);
                resultData = familyResults.slice(0, 10).map(result => convertToTrefleFormat(result));
                break;
                
            default: 
                throw new HttpError(400, `Invalid operation: ${operation}`);
        }
        
        console.log(`Action: fetchFromTrefleApi successful for '${operation}' (${Array.isArray(resultData) ? resultData.length : 1} results)`);
        return { success: true, data: resultData, error: undefined };
        
    } catch (error) {
        console.error(`Action: fetchFromTrefleApi Error for ${operation}:`, error);
        if (error instanceof HttpError) { throw error; }
        const message = error instanceof Error ? error.message : "Plant API fetch failed.";
        return { success: false, data: undefined, error: message };
    }
};

/**
 * Helper function to convert reliable API results to Trefle-like format
 */
function convertToTrefleFormat(apiResult) {
    if (!apiResult) return null;
    
    // Build description from available data
    const descriptionParts = [];
    if (apiResult.description) descriptionParts.push(apiResult.description);
    if (apiResult.family) descriptionParts.push(`Family: ${apiResult.family}`);
    if (apiResult.genus) descriptionParts.push(`Genus: ${apiResult.genus}`);
    
    // Build care info based on family knowledge
    const careInfoParts = [];
    if (apiResult.nativeStatus) careInfoParts.push(`Native Status: ${apiResult.nativeStatus}`);
    
    // Add basic care guidance based on family
    if (apiResult.family === 'Cactaceae') {
        careInfoParts.push('Low water requirements, bright light, well-draining soil');
    } else if (apiResult.family === 'Araceae') {
        careInfoParts.push('Moderate water, indirect light, humid conditions');
    } else if (apiResult.family === 'Rosaceae') {
        careInfoParts.push('Regular watering, full sun to partial shade');
    }
    
    // Build soil needs
    const soilParts = [];
    if (apiResult.family === 'Cactaceae') {
        soilParts.push('Sandy, well-draining soil, pH 6.0-7.5');
    } else if (apiResult.family === 'Araceae') {
        soilParts.push('Rich, moisture-retaining soil with good drainage');
    } else {
        soilParts.push('Well-draining soil, adjust based on specific needs');
    }
    
    return {
        id: `${apiResult.source}_${apiResult.id}`,
        name: apiResult.commonName || apiResult.scientificName,
        scientificName: apiResult.scientificName,
        description: descriptionParts.join('. ') || null,
        careInfo: careInfoParts.join('. ') || 'Care requirements vary by species',
        soilNeeds: soilParts.join('. '),
        source: `${apiResult.source.toUpperCase()} API`,
        family: apiResult.family,
        genus: apiResult.genus,
        confidence: apiResult.confidence,
        originalApiData: apiResult
    };
}

/**
 * 🌟 UPDATED: Stores plant data globally (no user association)
 * Keeps same function signature but removes userId requirement
 * @param {StorePlantDataArgs} args - Plant data including embedding.
 * @param {object} context - Wasp context with context.user and context.entities.PlantInfo.
 * @returns {Promise<import('@prisma/client').PlantInfo>} Created/updated record.
 */
export const storePlantData = async (args, context) => {
    if (!context.user) { throw new HttpError(401, "Authentication required."); }
    const PlantInfo = context.entities?.PlantInfo;
    if (!PlantInfo) { throw new HttpError(500, "Server config error: PlantInfo entity missing."); }

    const { embedding, name, scientificName, description, careInfo, soilNeeds, source } = args;
    const expectedDimension = MODEL_CONFIG.embeddingDimension;

    // --- Input Validation ---
    if (!Array.isArray(embedding) || embedding.length !== expectedDimension) { 
        throw new HttpError(400, `Invalid embedding: expected ${expectedDimension} dimensions, got ${embedding?.length}`); 
    }
    if (!name?.trim()) { 
        throw new HttpError(400, "Missing required field: name"); 
    }
    if (!description?.trim()) {
        throw new HttpError(400, "Missing required field: description");
    }

    try {
        const dataToSave = {
            name: name.trim(),
            scientificName: scientificName?.trim() || null,
            description: description.trim(),
            careInfo: careInfo?.trim() || null,
            soilNeeds: soilNeeds?.trim() || null,
            source: source?.trim() || 'Reliable Plant APIs',
            // REMOVED: userId (plant data is now global)
            embedding: embedding,
        };

        // UPDATED: Use global storage (no userId in where clause)
        const result = await PlantInfo.upsert({
            where: {
                name_scientificName: { // Check this constraint name in schema.prisma!
                    name: dataToSave.name,
                    scientificName: dataToSave.scientificName
                }
            },
            create: dataToSave,
            update: { 
                description: dataToSave.description, 
                careInfo: dataToSave.careInfo, 
                soilNeeds: dataToSave.soilNeeds, 
                source: dataToSave.source, 
                embedding: dataToSave.embedding 
            }
        });

        console.log(`Action: storePlantData upserted plant "${dataToSave.name}" globally (ID: ${result.id})`);
        return result;
        
    } catch (error) {
        console.error(`Action: storePlantData Error for plant "${name}":`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new HttpError(409, `Plant "${name}" already exists in global database.`);
        } else if (error instanceof HttpError) {
            throw error;
        }
        throw new HttpError(500, "Failed to store plant data in global database.");
    }
};

/**
 * 🌟 NEW: Direct access to reliable plant APIs
 * @param {Object} args - API arguments
 * @param {object} context - Wasp context
 * @returns {Promise<Object>} API results
 */
export const fetchFromReliableAPIs = async (args, context) => {
    const { operation, query, maxResults = 10 } = args;
    console.log(`[Plant Actions] 📡 fetchFromReliableAPIs called with operation: ${operation}`);

    if (!context.user) {
        throw new HttpError(401, "Authentication required");
    }

    try {
        let resultData;
        let metadata = {};

        switch (operation) {
            case 'search':
                if (!query?.trim()) {
                    throw new HttpError(400, "Query parameter required for search operation");
                }
                console.log(`[Plant Actions] 🔍 Searching all reliable APIs for: "${query}"`);
                resultData = await reliablePlantAPI.searchAllAPIs(query, 10000);
                metadata = {
                    searchTerm: query,
                    totalFound: resultData.length,
                    sources: [...new Set(resultData.map(r => r.source))]
                };
                break;

            case 'health':
                console.log(`[Plant Actions] 🔧 Checking reliable API health`);
                const { reliablePlantAPIHealthCheck } = await import('../utils/plantAPIs.js');
                resultData = await reliablePlantAPIHealthCheck();
                metadata = {
                    timestamp: new Date().toISOString(),
                    workingAPIs: resultData.workingCount,
                    totalAPIs: resultData.totalCount
                };
                break;

            default:
                throw new HttpError(400, `Invalid operation: ${operation}. Valid operations: search, health`);
        }

        console.log(`[Plant Actions] ✅ ${operation} operation successful`);
        return { 
            success: true, 
            data: resultData, 
            metadata: metadata,
            error: undefined 
        };

    } catch (error) {
        console.error(`[Plant Actions] ❌ ${operation} operation failed:`, error);
        
        if (error instanceof HttpError) {
            throw error;
        }
        
        const message = error instanceof Error ? error.message : `API operation ${operation} failed`;
        return { 
            success: false, 
            data: undefined, 
            metadata: { operation, error: message },
            error: message 
        };
    }
};