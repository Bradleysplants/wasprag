// src/queries.js
import { HttpError } from 'wasp/server';
import { Prisma } from '@prisma/client'; // Import Prisma namespace for error types

// --- JSDoc Type Definitions ---

/**
 * Arguments for the findSimilarPlants query.
 * @typedef {Object} FindSimilarPlantsArgs
 * @property {number[]} queryEmbedding - The vector embedding to search against.
 * @property {number} [limit=5] - The maximum number of similar plants to return. Defaults to 5.
 * @property {number} [threshold=0.7] - The minimum similarity score (1 - cosine distance) required. Defaults to 0.7.
 */

/**
 * Represents a PlantInfo record from the database, augmented with a similarity score.
 * Inherits properties from Prisma's generated PlantInfo type.
 * @typedef {import('@prisma/client').PlantInfo & { similarity: number }} PlantWithSimilarity
 */

// --- Query Implementations ---

/**
 * Fetches all PlantInfo records associated only with the logged-in user.
 *
 * @param {Record<string, never>} args - Query arguments (currently unused in this implementation).
 * @param {object} context - Wasp query context. Expects `context.user` and `context.prisma`.
 * @returns {Promise<import('@prisma/client').PlantInfo[]>} A promise resolving to an array of PlantInfo objects belonging to the user.
 * @throws {HttpError} If the user is not logged in (401).
 */
export const getPlantInfo = async (args, context) => { // <-- Added export
  // Authentication check
  if (!context.user) {
    throw new HttpError(401, "You must be logged in to view plant info.");
  }

  // Fetch all PlantInfo records where the userId matches the logged-in user's ID
  try {
      const plants = await context.prisma.plantInfo.findMany({
        where: {
          userId: context.user.id // Assumes context.user has an 'id' property
        }
      });
      return plants;
  } catch(error) {
      console.error(`Query: getPlantInfo Error for user ${context.user.id}:`, error);
      const message = error instanceof Error ? error.message : "Failed to fetch plant info.";
       // Handle potential Prisma errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
          throw new HttpError(500, `Database error fetching plants (Code: ${error.code}).`);
      }
      throw new HttpError(500, message);
  }
};

/**
 * Finds plants similar to a given query embedding *for the logged-in user*.
 * Uses pgvector cosine distance (<=>) via a raw SQL query.
 *
 * @param {FindSimilarPlantsArgs} args - Query arguments containing queryEmbedding, optional limit, and optional threshold.
 * @param {object} context - Wasp query context. Expects `context.user` and `context.prisma`.
 * @returns {Promise<PlantWithSimilarity[]>} A promise resolving to an array of plant objects matching the similarity criteria, ordered by similarity DESC.
 * @throws {HttpError} If the user is not logged in (401), if input arguments are invalid (400), or if a database/server error occurs (500).
 */
export const findSimilarPlants = async (args, context) => { // <-- Added export
  // Authentication check
  if (!context.user) {
    throw new HttpError(401, "You must be logged in to find similar plants.");
  }

  // Destructure arguments with defaults
  const { queryEmbedding, limit = 5, threshold = 0.7 } = args;
  const expectedDimension = 1536; // Should match the vector dimension in your Prisma schema

  // --- Input Validation ---
  if (
    !queryEmbedding ||
    !Array.isArray(queryEmbedding) ||
    queryEmbedding.length !== expectedDimension ||
    queryEmbedding.some(v => typeof v !== 'number' || isNaN(v))
  ) {
    throw new HttpError(
      400,
      `Invalid or missing query embedding (must be a valid number array of ${expectedDimension} dimensions).`
    );
  }

  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit <= 0) {
    throw new HttpError(400, "Invalid limit parameter (must be a positive integer).");
  }

  if (typeof threshold !== 'number' || threshold < 0 || threshold > 1) {
    throw new HttpError(400, "Invalid threshold parameter (must be between 0 and 1 inclusive).");
  }

  console.log(`Query: findSimilarPlants called by user ${context.user.id} with limit=${limit}, threshold=${threshold}`);

  const vectorQueryString = `[${queryEmbedding.join(',')}]`;
  const distanceThreshold = 1.0 - threshold;

  try {
    const results = await context.prisma.$queryRawUnsafe(
      `
      SELECT
        "id", "name", "scientificName", "description", "careInfo", "soilNeeds", "source", "createdAt", "updatedAt", "userId",
        1 - (embedding <=> CAST($1 AS vector)) AS similarity
      FROM "PlantInfo"
      WHERE
        embedding IS NOT NULL
        AND "userId" = $2
        AND (embedding <=> CAST($1 AS vector)) <= $3::double precision
      ORDER BY similarity DESC
      LIMIT $4;
      `,
      vectorQueryString,
      context.user.id,
      distanceThreshold,
      limit
    );

    const safeResults = Array.isArray(results) ? results : [];
    console.log(`Query: findSimilarPlants found ${safeResults.length} similar plants for user ${context.user.id}.`);
    return safeResults;

  } catch (error) {
    console.error(`Query: findSimilarPlants Error for user ${context.user.id}:`, error);
    let message = "Failed to perform similarity search.";
    let statusCode = 500;

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      message = `Database error during similarity search (Code: ${error.code}).`;
      if (error.message.includes("vector") || error.code === 'P2010') {
        console.error("Vector Search DB Error Details:", error.message);
        message += " Check pgvector setup and query syntax.";
      }
    } else if (error instanceof Error) {
      message = error.message;
    } else {
      message = "An unexpected error occurred during similarity search.";
    }
    throw new HttpError(statusCode, message);
  }
};

export const getCurrentUser = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }
  const user = await context.entities.User.findUnique({
    where: { id: context.user.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      // THEME PROPERTY IS ALREADY HERE!
      theme: true,
    },
  });
  if (!user) {
    throw new HttpError(404, 'User not found');
  }
    console.log("getCurrentUser returning:", { user }); // <--- Your log
  return { user };
};
