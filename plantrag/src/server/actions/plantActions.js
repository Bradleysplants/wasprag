// src/server/plantActions.js

import { HttpError } from 'wasp/server';
import { Prisma } from '@prisma/client';
import { trefleApiTools } from '../utils/trefleApi.js'; // Adjust path if needed
import { MODEL_CONFIG } from '../utils/config.js'; // Adjust path if needed
// If storePlantData needs db directly and not via context: import { db } from 'wasp/server';

// --- JSDoc Type Definitions ---
/** @typedef {import('./types').FetchTrefleArgs} FetchTrefleArgs */
/** @typedef {import('./types').FetchTrefleResult} FetchTrefleResult */
/** @typedef {import('./types').StorePlantDataArgs} StorePlantDataArgs */

// --- Plant Actions ---

/**
 * Fetches plant data from Trefle API. Requires authentication.
 * @param {FetchTrefleArgs} args - Operation and parameters.
 * @param {object} context - Wasp context with context.user.
 * @returns {Promise<FetchTrefleResult>} Result object.
 */
export const fetchFromTrefleApi = async (args, context) => {
    const { operation, query, id, soilType, family } = args;
    console.log(`Action: fetchFromTrefleApi called with operation: ${operation}`);

    if (!context.user) { throw new HttpError(401, "Authentication required"); }

    try {
        let resultData;
        switch (operation) {
            case 'search': /* ... */ resultData = await trefleApiTools.searchPlants(query); break;
            case 'details': /* ... */ resultData = await trefleApiTools.getPlantDetails(Number(id)); break;
            case 'byName': /* ... */ resultData = await trefleApiTools.getPlantByName(query); break;
            case 'bySoil': /* ... */ resultData = await trefleApiTools.getPlantsBySoil(soilType); break;
            case 'byFamily': /* ... */ resultData = await trefleApiTools.getPlantsByFamily(family); break;
            default: throw new HttpError(400, `Invalid operation: ${operation}`);
        }
        console.log(`Action: fetchFromTrefleApi successful for '${operation}'.`);
        return { success: true, data: resultData, error: undefined };
    } catch (error) {
        console.error(`Action: fetchFromTrefleApi Error for ${operation}:`, error);
        if (error instanceof HttpError) { throw error; }
        const message = error instanceof Error ? error.message : "Trefle API fetch failed.";
        return { success: false, data: undefined, error: message };
    }
};

/**
 * Stores or updates plant data in the database. Requires authentication.
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
    if (!embedding /*...*/) { throw new HttpError(400, `Invalid embedding...`); }
    if (!name?.trim() /*...*/) { throw new HttpError(400, "Missing required fields..."); }
    // ... more validation ...

    try {
        const dataToSave = {
             name: name.trim(),
             scientificName: scientificName?.trim() || null,
             description: description.trim(),
             careInfo: careInfo?.trim() || null,
             soilNeeds: soilNeeds?.trim() || null,
             source: source.trim(),
             userId: context.user.id,
             embedding: embedding,
        };

        // Verify unique constraint in where clause matches schema.prisma
        const result = await PlantInfo.upsert({
            where: {
                 name_scientificName: { // Check this constraint name in schema.prisma!
                     name: dataToSave.name,
                     scientificName: dataToSave.scientificName
                 }
            },
            create: dataToSave,
            update: { description, careInfo, soilNeeds, source, embedding }
        });

        console.log(`Action: storePlantData upserted plant ID ${result.id} ...`);
        return result;
    } catch (error) {
        console.error(`Action: storePlantData Error for plant "${name}":`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new HttpError(409, `Conflict: Plant already exists.`);
        } else if (error instanceof HttpError) {
            throw error;
        }
        throw new HttpError(500, "Failed to store plant data.");
    }
};