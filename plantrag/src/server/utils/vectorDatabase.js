// src/server/utils/vectorDatabase.js
// Fixed vector database utilities for PlantInfo model

import { prisma } from 'wasp/server';

/**
 * Query the vector database for similar plant embeddings
 * @param {number[]} queryEmbedding - The query embedding vector
 * @param {number} limit - Maximum number of results to return  
 * @param {number} threshold - Similarity threshold (0-1, higher is more similar)
 * @returns {Promise<Array>} Array of similar plant records
 */
export async function queryVectorDatabase(queryEmbedding, limit = 5, threshold = 0.7) {
  try {
    // Validate all parameters
    if (!queryEmbedding) {
      throw new Error('queryEmbedding parameter is required');
    }
    
    if (!Array.isArray(queryEmbedding)) {
      throw new Error(`queryEmbedding must be an array, got: ${typeof queryEmbedding}`);
    }
    
    if (queryEmbedding.length === 0) {
      throw new Error('queryEmbedding array cannot be empty');
    }
    
    if (queryEmbedding.length !== 384) {
      console.warn(`[VectorDB] Expected 384 dimensions, got ${queryEmbedding.length}`);
    }
    
    // Validate numeric values in embedding
    const hasInvalidNumbers = queryEmbedding.some(val => 
      typeof val !== 'number' || isNaN(val) || !isFinite(val)
    );
    
    if (hasInvalidNumbers) {
      throw new Error('queryEmbedding contains invalid numbers (NaN or Infinity)');
    }
    
    console.log('[VectorDB] Input validation passed:', {
      embeddingLength: queryEmbedding.length,
      limit,
      threshold
    });
    
    // Get plants with embeddings using raw SQL since embedding is Unsupported type
    const allPlants = await prisma.$queryRaw`
      SELECT 
        id, name, "scientificName", description, "careInfo", "soilNeeds", source, 
        "createdAt", "updatedAt", embedding
      FROM "PlantInfo" 
      WHERE embedding IS NOT NULL
    `;

    if (allPlants.length === 0) {
      console.log('[VectorDB] No plants with embeddings found');
      return [];
    }

    console.log(`[VectorDB] Found ${allPlants.length} plants with embeddings, calculating similarities...`);

    // Calculate cosine similarity in JavaScript
    const similarities = allPlants.map(plant => {
      const similarity = calculateCosineSimilarity(queryEmbedding, plant.embedding);
      return {
        id: plant.id,
        name: plant.name,
        scientificName: plant.scientificName,
        description: plant.description,
        careInfo: plant.careInfo,
        soilNeeds: plant.soilNeeds,
        source: plant.source,
        similarity,
        createdAt: plant.createdAt,
        updatedAt: plant.updatedAt
      };
    });

    // Filter and sort by similarity (higher is better)
    const filtered = similarities
      .filter(item => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    console.log(`[VectorDB] Found ${filtered.length} similar plants above threshold ${threshold}`);
    
    if (filtered.length > 0) {
      console.log(`[VectorDB] Top result: ${filtered[0].name} (similarity: ${filtered[0].similarity.toFixed(3)})`);
    }
    
    return filtered;
    
  } catch (error) {
    console.error('[VectorDB] Query failed:', error);
    console.error('[VectorDB] Debug info:', {
      hasEmbedding: !!queryEmbedding,
      embeddingType: typeof queryEmbedding,
      embeddingLength: Array.isArray(queryEmbedding) ? queryEmbedding.length : 'N/A',
      limit,
      threshold,
      errorMessage: error.message
    });
    
    // Return empty array instead of throwing to allow graceful degradation
    return [];
  }
}

/**
 * Store plant information with its embedding in the vector database
 * @param {Object} plantData - Plant information to store
 * @param {number[]} embedding - The embedding vector (384 dimensions)
 * @returns {Promise<Object>} The stored record
 */
export async function storePlantInfoWithEmbedding(plantData, embedding) {
  try {
    // Validate inputs
    if (!plantData || typeof plantData !== 'object') {
      throw new Error('plantData must be a valid object');
    }
    
    if (!plantData.name || typeof plantData.name !== 'string') {
      throw new Error('plantData.name is required and must be a string');
    }
    
    if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
      throw new Error('embedding must be a non-empty array');
    }
    
    if (embedding.length !== 384) {
      throw new Error(`Expected 384-dimensional embedding, got ${embedding.length}`);
    }
    
    // Validate embedding numbers
    const hasInvalidNumbers = embedding.some(val => 
      typeof val !== 'number' || isNaN(val) || !isFinite(val)
    );
    
    if (hasInvalidNumbers) {
      throw new Error('embedding contains invalid numbers');
    }
    
    console.log('[VectorDB] Storing plant info:', {
      name: plantData.name,
      embeddingLength: embedding.length,
      hasScientificName: !!plantData.scientificName,
      hasDescription: !!plantData.description
    });
    
    // Handle embedding storage with raw SQL since it's Unsupported type
    const existingRecord = await prisma.plantInfo.findFirst({
      where: {
        name: plantData.name,
        scientificName: plantData.scientificName || null
      }
    });

    let result;
    
    if (existingRecord) {
      // Update existing record with raw SQL for embedding
      console.log(`[VectorDB] Updating existing record for: ${plantData.name}`);
      
      // First update the regular fields
      await prisma.plantInfo.update({
        where: { id: existingRecord.id },
        data: {
          description: plantData.description || '',
          careInfo: plantData.careInfo || null,
          soilNeeds: plantData.soilNeeds || null,
          source: plantData.source || 'Unknown',
          updatedAt: new Date()
        }
      });
      
      // Then update the embedding with raw SQL
      await prisma.$executeRaw`
        UPDATE "PlantInfo" 
        SET embedding = ${embedding}::vector
        WHERE id = ${existingRecord.id}
      `;
      
      result = { id: existingRecord.id, name: plantData.name };
      
    } else {
      // Create new record with raw SQL for embedding
      console.log(`[VectorDB] Creating new record for: ${plantData.name}`);
      
      // First create without embedding
      const newRecord = await prisma.plantInfo.create({
        data: {
          name: plantData.name,
          scientificName: plantData.scientificName || null,
          description: plantData.description || '',
          careInfo: plantData.careInfo || null,
          soilNeeds: plantData.soilNeeds || null,
          source: plantData.source || 'Unknown'
        }
      });
      
      // Then add the embedding with raw SQL
      await prisma.$executeRaw`
        UPDATE "PlantInfo" 
        SET embedding = ${embedding}::vector
        WHERE id = ${newRecord.id}
      `;
      
      result = newRecord;
    }
    
    console.log(`[VectorDB] ✅ Successfully stored plant: ${plantData.name} (ID: ${result.id})`);
    return result;
    
  } catch (error) {
    console.error('[VectorDB] Error storing plant info:', error);
    console.error('[VectorDB] Storage debug info:', {
      plantName: plantData?.name,
      hasEmbedding: !!embedding,
      embeddingLength: Array.isArray(embedding) ? embedding.length : 'N/A',
      errorMessage: error.message
    });
    throw new Error(`Error storing plant information: ${error.message}`);
  }
}

/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} a - First vector
 * @param {number[]} b - Second vector  
 * @returns {number} Similarity score (0-1, higher is more similar)
 */
function calculateCosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) {
    console.warn('[VectorDB] Invalid vectors for similarity calculation');
    return 0;
  }
  
  if (a.length !== b.length) {
    console.warn(`[VectorDB] Vector length mismatch: ${a.length} vs ${b.length}`);
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (normA * normB);
}

/**
 * Get database statistics for monitoring
 * @returns {Promise<Object>} Database statistics
 */
export async function getVectorDatabaseStats() {
  try {
    console.log('[VectorDB] Fetching database statistics...');
    
    const totalCount = await prisma.plantInfo.count();
    
    // Use raw SQL to count records with embeddings since embedding is Unsupported type
    const withEmbeddingsResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "PlantInfo" WHERE embedding IS NOT NULL
    `;
    const withEmbeddings = Number(withEmbeddingsResult[0].count);
    
    const sourceCounts = await prisma.plantInfo.groupBy({
      by: ['source'],
      _count: { source: true },
      orderBy: { _count: { source: 'desc' } },
      take: 10
    });
    
    const recentPlants = await prisma.plantInfo.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { name: true, createdAt: true, source: true }
    });
    
    return {
      totalRecords: totalCount,
      recordsWithEmbeddings: withEmbeddings,
      recordsWithoutEmbeddings: totalCount - withEmbeddings,
      topSources: sourceCounts.map(s => ({
        source: s.source,
        count: s._count.source
      })),
      recentPlants: recentPlants,
      lastUpdated: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('[VectorDB] Error fetching stats:', error);
    return {
      error: error.message,
      totalRecords: 0,
      recordsWithEmbeddings: 0
    };
  }
}

/**
 * Test vector database connection and functionality
 * @returns {Promise<Object>} Test results
 */
export async function testVectorDatabase() {
  try {
    console.log('[VectorDB] Testing database connection...');
    
    // Test 1: Basic connection and table access
    const totalCount = await prisma.plantInfo.count();
    
    // Test 2: Check for records with embeddings using raw SQL
    const embeddingCountResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "PlantInfo" WHERE embedding IS NOT NULL
    `;
    const embeddingCount = Number(embeddingCountResult[0].count);
    
    // Test 3: Sample a record if any exist
    const sampleRecords = await prisma.$queryRaw`
      SELECT id, name, embedding FROM "PlantInfo" 
      WHERE embedding IS NOT NULL 
      LIMIT 1
    `;
    const sampleRecord = sampleRecords.length > 0 ? sampleRecords[0] : null;
    
    return {
      success: true,
      connection: true,
      tableExists: true,
      totalRecords: totalCount,
      recordsWithEmbeddings: embeddingCount,
      embeddingDimension: sampleRecord?.embedding?.length || null,
      samplePlant: sampleRecord ? {
        name: sampleRecord.name,
        hasEmbedding: !!sampleRecord.embedding
      } : null,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('[VectorDB] Database test failed:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Search plants by name (non-vector search)
 * @param {string} searchTerm - Term to search for
 * @param {number} limit - Maximum results to return
 * @returns {Promise<Array>} Matching plants
 */
export async function searchPlantsByName(searchTerm, limit = 10) {
  try {
    if (!searchTerm || typeof searchTerm !== 'string') {
      return [];
    }
    
    const results = await prisma.plantInfo.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { scientificName: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    
    console.log(`[VectorDB] Name search for "${searchTerm}" found ${results.length} results`);
    return results;
    
  } catch (error) {
    console.error('[VectorDB] Name search failed:', error);
    return [];
  }
}