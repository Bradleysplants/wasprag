// src/actions.js (ESM Version - COMPLETE with FULL JSDoc Typedefs)

import { HttpError } from 'wasp/server';
import { Prisma } from '@prisma/client'; // Import Prisma namespace for error types

// --- Utilities Imports ---
import { generateTextEmbedding } from './utils/languageModel.js';
import { ragPipeline } from './utils/ragPipeline.js';
import { trefleApiTools } from './utils/trefleApi.js';

// --- JSDoc Type Definitions ---

// -- Types imported from other modules for clarity --
/** @typedef {import('./utils/languageModel.js').ChainOfThoughtResult} ChainOfThoughtResult */
/** @typedef {import('./utils/trefleApi.js').FormattedPlantData} FormattedPlantData */
/** @typedef {import('./utils/trefleApi.js').TreflePlantListItem} TreflePlantListItem */
// Assume PlantInfo type is available via Prisma client, used in @returns

// -- Types for Arguments passed to Actions --

/**
 * Structure for arguments passed to fetchFromTrefleApi action.
 * @typedef {Object} FetchTrefleArgs
 * @property {'search' | 'details' | 'byName' | 'bySoil' | 'byFamily'} operation - The Trefle API operation to perform.
 * @property {string} [query] - Search term or name query (required for 'search', 'byName').
 * @property {number} [id] - Plant ID (required for 'details').
 * @property {string} [soilType] - Soil type keyword (required for 'bySoil').
 * @property {string} [family] - Plant family name (required for 'byFamily').
 */

/**
 * Structure for the successful return value of fetchFromTrefleApi action.
 * @typedef {Object} FetchTrefleSuccessResult
 * @property {true} success - Indicates the operation succeeded.
 * @property {FormattedPlantData | TreflePlantListItem[] | null | undefined} data - The data payload from the Trefle API tool. Can be null if no details found.
 * @property {undefined} error - Error is undefined on success.
 */

/**
 * Structure for the error return value of fetchFromTrefleApi action (for non-HttpError cases).
 * @typedef {Object} FetchTrefleErrorResult
 * @property {false} success - Indicates the operation failed.
 * @property {undefined} data - Data is undefined on error.
 * @property {string} error - The error message.
 */

/**
 * Union type representing the possible return values of the fetchFromTrefleApi action.
 * Note: HttpErrors thrown directly are not covered by this type but handled by Wasp.
 * @typedef {FetchTrefleSuccessResult | FetchTrefleErrorResult} FetchTrefleResult
 */

/**
 * Structure for arguments passed to generateEmbedding action.
 * @typedef {Object} GenerateEmbeddingArgs
 * @property {string} text - The text content to generate an embedding for.
 */

/**
 * Structure for the successful return value of generateEmbedding action.
 * @typedef {Object} GenerateEmbeddingResult
 * @property {number[]} embedding - The generated vector embedding.
 */

/**
 * Structure for arguments passed to searchBotanicalInfo action.
 * @typedef {Object} SearchBotanicalArgs
 * @property {string} query - The user's search query string.
 */

// No specific typedef needed for storePlantData return if it's just the Prisma PlantInfo type.

/**
 * Structure for arguments passed to the storePlantData action.
 * Contains the embedding vector and the core plant details to be saved.
 * Based on the usage in the function and the Prisma schema.
 * @typedef {object} StorePlantDataArgs
 * @property {number[]} embedding - The vector embedding (expected length 1536 based on schema).
 * @property {string} name - Common name (required by function validation).
 * @property {string} [scientificName] - Scientific name (optional in schema).
 * @property {string} description - Description text (required by function validation).
 * @property {string} [careInfo] - Care info text (optional in schema).
 * @property {string} [soilNeeds] - Soil needs text (optional in schema).
 * @property {string} source - Data source (required by function validation).
 * // Does not include id, createdAt, updatedAt, userId as these are handled by Prisma/backend logic.
 */


// --- Wasp Actions ---

/**
 * Fetches plant data from the Trefle API based on the specified operation.
 * Requires authentication.
 * @param {FetchTrefleArgs} args - Arguments specifying the operation and necessary parameters.
 * @param {object} context - Wasp action context. Requires `context.user`.
 * @returns {Promise<FetchTrefleResult>} Object indicating success/failure and containing data or error message.
 * @throws {HttpError} If authentication fails or required arguments are missing/invalid.
 */
export const fetchFromTrefleApi = async (args, context) => {
  const { operation, query, id, soilType, family } = args;
  console.log(`Action: fetchFromTrefleApi called with operation: ${operation}`);

  if (!context.user) {
    throw new HttpError(401, "Authentication required");
  }

  try {
    let resultData; // Holds result: FormattedPlantData | TreflePlantListItem[] | null

    switch (operation) {
      case 'search':
        if (!query || typeof query !== 'string') throw new HttpError(400, "Missing or invalid 'query' (string) for search.");
        resultData = await trefleApiTools.searchPlants(query);
        break;
      case 'details':
        // Ensure ID is provided and is a valid number
        const numericId = (id !== null && id !== undefined) ? Number(id) : NaN;
        if (isNaN(numericId)) throw new HttpError(400, "Invalid or missing 'id' (number) for details.");
        resultData = await trefleApiTools.getPlantDetails(numericId);
        break;
      case 'byName':
        if (!query || typeof query !== 'string') throw new HttpError(400, "Missing or invalid 'query' (string) for byName.");
        resultData = await trefleApiTools.getPlantByName(query);
        break;
      case 'bySoil':
        if (!soilType || typeof soilType !== 'string') throw new HttpError(400, "Missing or invalid 'soilType' (string) for bySoil.");
        resultData = await trefleApiTools.getPlantsBySoil(soilType);
        break;
      case 'byFamily':
        if (!family || typeof family !== 'string') throw new HttpError(400, "Missing or invalid 'family' (string) for byFamily.");
        resultData = await trefleApiTools.getPlantsByFamily(family);
        break;
      default:
        throw new HttpError(400, `Invalid operation specified: ${operation}`);
    }

    console.log(`Action: fetchFromTrefleApi successful for operation '${operation}'.`);
    return {
      success: true,
      data: resultData, // This can be null if e.g., getPlantDetails finds nothing
      error: undefined
    };
  } catch (error) {
    console.error(`Action: fetchFromTrefleApi Error for operation ${operation}:`, error);
    // Re-throw HttpErrors to preserve status codes
    if (error instanceof HttpError) {
        throw error;
    }
    // Return structured error for unexpected failures
    const message = error instanceof Error ? error.message : "Failed to fetch from Trefle API due to an unknown error.";
    return {
      success: false,
      data: undefined,
      error: message
    };
  }
};

/**
 * Generates a vector embedding for the given text.
 * @param {GenerateEmbeddingArgs} args - Object containing the 'text' property.
 * @param {object} context - Wasp action context (not used).
 * @returns {Promise<GenerateEmbeddingResult>} Object containing the 'embedding' array.
 * @throws {HttpError} If text is invalid (400) or embedding generation/validation fails (500).
 */
export const generateEmbedding = async (args, context) => {
  const { text } = args;
  console.log("Action: generateEmbedding called for text:", text ? `"${text.substring(0, 50)}..."` : "[No text provided]");

  if (!context.user) {
    throw new HttpError(401, "Authentication required");
  }

  // Validate input text
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new HttpError(400, "Text argument is required and cannot be empty.");
  }

  try {
    // Generate embedding using the function from languagemodel.js
    const embedding = await generateTextEmbedding(text);

    // Validate the embedding structure and dimension based on schema.prisma
    // NOTE: Mismatch Alert! Schema says vector(1536), but BGE model in languagemodel.js is 1024.
    // Using schema dimension for validation here, but one needs to be corrected.
    const expectedDimension = 1536; // <<<--- Based on schema.prisma provided
    if (!Array.isArray(embedding)) {
         throw new HttpError(500, "Embedding generation failed: Result was not an array.");
    }
     if (embedding.length === 0) {
         throw new HttpError(500, "Embedding generation failed: Result array was empty.");
     }
    if (embedding.length !== expectedDimension) {
      console.error(`Generated embedding dimension (${embedding.length}) MISMATCHES schema dimension (${expectedDimension}). Model: ${process.env.EMBEDDING_MODEL || 'BAAI/bge-large-en-v1.5'}`);
      // Decide how to handle: Throw error (strict) or allow with warning (flexible)?
      throw new HttpError(500, `Generated embedding is invalid or has incorrect dimensions (expected ${expectedDimension}, got ${embedding.length}). Check embedding model and schema.prisma.`);
    }
     if (embedding.some(v => typeof v !== 'number' || isNaN(v))) {
         console.error("Generated embedding contains non-numeric or NaN values.");
         throw new HttpError(500, "Generated embedding contains invalid values.");
     }

    console.log(`Action: generateEmbedding successful. Dimension: ${embedding.length}`);
    return { embedding }; // Return the validated embedding

  } catch (error) {
    console.error("Action: generateEmbedding Error:", error);
    // Re-throw HttpErrors from validation or generation steps
    if (error instanceof HttpError) { throw error; }
    // Wrap other unexpected errors
    const message = error instanceof Error ? error.message : "Failed to generate embedding due to an unknown error.";
    throw new HttpError(500, message);
  }
};

/**
 * Searches for botanical information using the RAG pipeline. Requires authentication.
 * @param {SearchBotanicalArgs} args - Object containing the 'query' string.
 * @param {object} context - Wasp action context. Requires `context.user`.
 * @returns {Promise<ChainOfThoughtResult>} The result from the RAG pipeline { answer: string, sources: string[] }.
 * @throws {HttpError} If authentication fails (401), query is invalid (400), or RAG process fails (500).
 */
export const searchBotanicalInfo = async (args, context) => {
    console.log('Action searchBotanicalInfo loaded');
    if (!context.user) {
      throw new HttpError(401, "Authentication required to search botanical info.");
    }

    const { query } = args;
    console.log(`Action: searchBotanicalInfo called by user ${context.user.id} with query: "${query}"`);

    // Validate the query input
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new HttpError(400, "Search query cannot be empty.");
    }

    try {
      // Execute the RAG pipeline
      const results = await ragPipeline.processQuery(query);
      console.log(`Action: searchBotanicalInfo successful for query "${query}".`);
      // Ensure results have expected shape, or provide defaults
      return {
          answer: results?.answer || "Sorry, I could not generate an answer.",
          sources: Array.isArray(results?.sources) ? results.sources : ["Unknown Source"]
      };
    } catch (error) {
      // Handle errors from the RAG pipeline
      console.error(`Action: searchBotanicalInfo Error for query "${query}":`, error);
      // Re-throw HttpErrors that might originate from within the pipeline
      if (error instanceof HttpError) { throw error; }
      // Wrap unexpected errors
      const message = error instanceof Error ? error.message : "Failed to process search query due to an internal error.";
      throw new HttpError(500, message);
    }
};


/**
 * Stores or updates plant data (including embedding) in the database for the logged-in user.
 * Requires authentication. Uses `context.entities.PlantInfo`.
 * @param {StorePlantDataArgs} args - Object containing 'embedding' array and required plant details (name, description, source).
 * @param {object} context - Wasp action context. Requires `context.user` and `context.entities.PlantInfo`.
 * @returns {Promise<import('@prisma/client').PlantInfo>} The created or updated PlantInfo record.
 * @throws {HttpError} If auth fails (401), input is invalid (400), conflict occurs (409), or DB error (500).
 */
export const storePlantData = async (args, context) => {
    if (!context.user) {
      throw new HttpError(401, "You must be logged in to store plant data.");
    }
    if (!context.entities?.PlantInfo) {
        console.error("Action: storePlantData - PlantInfo entity not found on context.");
        throw new HttpError(500, "Server configuration error: PlantInfo entity not available.");
    }
    const PlantInfo = context.entities.PlantInfo; // Alias

    // Destructure expected fields from args based on StorePlantDataArgs typedef
    const { embedding, name, scientificName, description, careInfo, soilNeeds, source } = args;

    // --- Input Validation ---
    // Validate Embedding
    const expectedDimension = 1536; // <<<--- Based on schema.prisma provided
    if (!embedding || !Array.isArray(embedding)) {
        throw new HttpError(400, `Embedding data is missing or not an array.`);
    }
     if (embedding.length !== expectedDimension) {
       throw new HttpError(400, `Embedding data has incorrect dimensions (expected ${expectedDimension}, got ${embedding.length}).`);
     }
     if (embedding.some(v => typeof v !== 'number' || isNaN(v))) {
       throw new HttpError(400, `Embedding data contains invalid non-numeric values.`);
     }

    // Validate Required String Fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new HttpError(400, "Missing or invalid required plant detail: name (string).");
    }
     if (!description || typeof description !== 'string' || description.trim().length === 0) {
        throw new HttpError(400, "Missing or invalid required plant detail: description (string).");
    }
     if (!source || typeof source !== 'string' || source.trim().length === 0) {
        throw new HttpError(400, "Missing or invalid required plant detail: source (string).");
    }
     // Validate Optional String Fields (ensure they are strings if present)
     if (scientificName && typeof scientificName !== 'string') throw new HttpError(400, "Invalid scientificName: must be a string if provided.");
     if (careInfo && typeof careInfo !== 'string') throw new HttpError(400, "Invalid careInfo: must be a string if provided.");
     if (soilNeeds && typeof soilNeeds !== 'string') throw new HttpError(400, "Invalid soilNeeds: must be a string if provided.");


    console.log(`Action: storePlantData called by user ${context.user.id} for plant: ${name.trim()}`);

    try {
        // Prepare data payload for Prisma, explicitly mapping validated & cleaned fields
        const dataToSave = {
            name: name.trim(),
            scientificName: (scientificName && scientificName.trim()) || null, // Use null if empty/missing
            description: description.trim(),
            careInfo: (careInfo && careInfo.trim()) || null,
            soilNeeds: (soilNeeds && soilNeeds.trim()) || null,
            source: source.trim(),
            userId: context.user.id, // Associate with the logged-in user
        };

        // Find existing plant based on unique constraint for THIS user
        const existingPlant = await PlantInfo.findUnique({ // Use findUnique on the @@unique constraint
            where: {
                 name_scientificName: { // Use the compound key name from @@unique
                    name: dataToSave.name,
                    scientificName: dataToSave.scientificName // Handles null correctly
                 }
                 // If you added trefleId @unique and used it, use that instead:
                 // trefleId: args.trefleId // Assuming trefleId was passed in args
            }
            // We don't need userId in the where clause if name_scientificName is globally unique
            // If name_scientificName is NOT globally unique, you need a different unique constraint
            // or add userId to the @@unique constraint in schema.prisma (e.g., @@unique([name, scientificName, userId]))
            // For now, assuming name_scientificName is the intended global unique key based on schema
        });

        let result;
        if (existingPlant) {
            // Ensure the found plant belongs to the current user before updating
             if (existingPlant.userId !== context.user.id) {
                  throw new HttpError(403, "Conflict: A plant with this name/scientific name already exists but belongs to another user.");
             }

            // --- Update Existing Plant ---
            console.log(`Updating plant ID ${existingPlant.id} ('${dataToSave.name}') for user ${context.user.id}`);
            result = await PlantInfo.update({
                where: {
                    // Use the primary key (id) for the update after finding the record
                    id: existingPlant.id
                },
                data: {
                    // Update specific fields that might change
                    description: dataToSave.description,
                    careInfo: dataToSave.careInfo,
                    soilNeeds: dataToSave.soilNeeds,
                    source: dataToSave.source,
                    embedding: embedding, // Always update embedding
                    // Let Prisma handle updatedAt automatically via @updatedAt
                },
            });
        } else {
            // --- Create New Plant ---
            console.log(`Creating new plant '${dataToSave.name}' for user ${context.user.id}`);
            result = await PlantInfo.create({
                data: {
                    ...dataToSave, // Includes name, scientificName, desc, care, soil, source, userId
                    embedding: embedding // Add the embedding
                    // Prisma handles id, createdAt, updatedAt automatically
                }
            });
        }
        // Return the created or updated record
        return result;

    } catch (error) {
        console.error(`Action: storePlantData Error for plant "${name}", user ${context.user.id}:`, error);
        let statusCode = 500;
        let message = "An unknown error occurred while storing plant data.";

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            message = `Database error storing plant data (Code: ${error.code})`;
            if (error.code === 'P2002') { // Unique constraint violation
                statusCode = 409; // Conflict
                const target = Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : 'unique constraint';
                message = `Conflict: A plant with this ${target} already exists.`; // Adjusted message
            }
            // Add more specific Prisma error handling if needed
        } else if (error instanceof HttpError) {
            // Re-throw HttpErrors from validation etc.
            throw error;
        } else if (error instanceof Error) {
            // Use message from generic errors
            message = error.message;
        }

        // Throw HttpError to communicate failure status and message to client
        throw new HttpError(statusCode, message);
    }
};

// --- No module.exports needed with ESM exports ---