// vectorDatabase.js (ESM Version)
// Path: ./src/db/vectorDatabase.js (adjust path if needed)

// Use import syntax
import { PrismaClient, Prisma } from '@prisma/client';

// Instantiate PrismaClient directly
const prisma = new PrismaClient();

// JSDoc types remain the same
/**
 * Describes the structure for plant information used internally...
 * @typedef {Object} PlantContextItem ...
 */
/**
 * Represents a PlantInfo record from the database augmented with a similarity score...
 * @typedef {import('@prisma/client').PlantInfo & { similarity: number }} PlantQueryResult ...
 */

/**
 * Checks if the pgvector extension is enabled...
 * @returns {Promise<{ success: boolean; message: string }>} ...
 */
// Add export keyword
export const setupPgVectorDatabase = async () => {
  try {
    const extensionExistsResult = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'vector'
      ) as exists;
    `;
    const extensionExists = extensionExistsResult?.[0]?.exists;

    if (!extensionExists) {
      console.log("pgvector extension 'vector' not found. Ensure migrations include 'CREATE EXTENSION IF NOT EXISTS vector;'.");
    } else {
      console.log("pgvector extension 'vector' confirmed.");
    }
    return { success: true, message: 'Vector database extension check complete.' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error checking vector database extension:', errorMessage);
    return { success: false, message: `Error checking vector database: ${errorMessage}` };
  }
};

/**
 * Queries the database for plants with embeddings similar...
 * @param {number[]} embedding - ...
 * @param {number} [limit=5] - ...
 * @param {number} [threshold=0.7] - ...
 * @returns {Promise<PlantQueryResult[]>} ...
 */
// Add export keyword
export const queryVectorDatabase = async (
  embedding,
  limit = 5,
  threshold = 0.7
) => {
  if (!Array.isArray(embedding) || embedding.length === 0) {
    console.error("QueryVectorDatabase error: Invalid or empty embedding provided.");
    return [];
  }
  if (threshold < 0 || threshold > 1) {
      console.warn(`QueryVectorDatabase warning: Similarity threshold ${threshold} is outside the typical [0, 1] range for cosine similarity.`);
  }
  try {
    const vectorString = `[${embedding.join(',')}]`;
    const results = await prisma.$queryRaw`
      SELECT
        id, name, "scientificName", description, "careInfo",
        "soilNeeds", source, "createdAt", "updatedAt", "embedding",
        1 - (embedding <=> ${vectorString}::vector) AS similarity
      FROM "PlantInfo"
      WHERE embedding IS NOT NULL
      AND 1 - (embedding <=> ${vectorString}::vector) > ${threshold}
      ORDER BY similarity DESC
      LIMIT ${limit};
    `;
    return Array.isArray(results) ? results : [];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error querying vector database:', errorMessage, { embeddingSize: embedding.length, limit, threshold });
    throw new Error(`Error querying vector database: ${errorMessage}`);
  }
};

/**
 * Stores or updates plant information along with its vector embedding...
 * @param {PlantContextItem} plantInfo - ...
 * @param {number[]} embedding - ...
 * @returns {Promise<import('@prisma/client').PlantInfo>} ...
 */
// Add export keyword
export const storePlantInfoWithEmbedding = async (
  plantInfo,
  embedding
) => {
  if (!plantInfo || (!plantInfo.name && !plantInfo.scientificName)) {
       throw new Error("Cannot store plant info without at least a name or scientific name.");
  }
   if (!Array.isArray(embedding) || embedding.length === 0) {
       throw new Error(`Cannot store plant info for "${plantInfo.name || plantInfo.scientificName}" without a valid embedding.`);
   }

  try {
    const orConditions = [];
    if (plantInfo.name) {
      orConditions.push({ name: plantInfo.name });
    }
    if (plantInfo.scientificName) {
      orConditions.push({ scientificName: plantInfo.scientificName });
    }
    if (orConditions.length === 0) {
      throw new Error("Internal error: Cannot construct where condition for finding existing plant.");
    }

    const existingPlant = await prisma.plantInfo.findFirst({
      where: { OR: orConditions },
    });

    let savedPlant;

    if (existingPlant) {
      console.log(`Updating existing plant record ID: ${existingPlant.id} (${plantInfo.name || plantInfo.scientificName})`);
      const updateParams = [ /* ... same params ... */ ];
      await prisma.$executeRaw` /* ... same update query ... */ `;
      savedPlant = await prisma.plantInfo.findUniqueOrThrow({
        where: { id: existingPlant.id }
      });
    } else {
      console.log(`Creating new plant record for: ${plantInfo.name || plantInfo.scientificName}`);
      const insertParams = [ /* ... same params ... */ ];
      await prisma.$executeRaw` /* ... same insert query ... */ `;
      savedPlant = await prisma.plantInfo.findFirst({
        where: { OR: orConditions },
        orderBy: { createdAt: 'desc' }
      });
      if (!savedPlant) {
        throw new Error(`Failed to retrieve the newly created plant record for: ${plantInfo.name || plantInfo.scientificName}`);
      }
    }
    return savedPlant;

  } catch (error) {
     const errorMessage = error instanceof Error ? error.message : String(error);
     console.error(`Error storing plant info for "${plantInfo.name || plantInfo.scientificName}":`, errorMessage);
     throw new Error(`Error storing plant info: ${errorMessage}`);
  }
};