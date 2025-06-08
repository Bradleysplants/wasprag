// src/server/utils/embeddings.js
// Embedding generation using onnxruntime-node with local ONNX model

import * as ort from 'onnxruntime-node';
import { MODEL_CONFIG } from './config.js';

let session = null;

/**
 * Initialize the ONNX embedding model from local file
 */
async function initializeEmbeddingModel() {
  if (session) {
    return; // Already initialized
  }
  
  try {
    console.log('[Embeddings] Initializing ONNX model from local file:', MODEL_CONFIG.embeddingModel);
    
    // Load ONNX model from local models directory
    const modelPath = `/home/bradley/wasprag/plantrag/models/embedding/model.onnx`;
    
    console.log('[Embeddings] Loading ONNX session from:', modelPath);
    session = await ort.InferenceSession.create(modelPath);
    
    console.log('[Embeddings] ✅ ONNX session created successfully from local file');
    console.log('[Embeddings] Model inputs:', session.inputNames);
    console.log('[Embeddings] Model outputs:', session.outputNames);
    
  } catch (error) {
    console.error('[Embeddings] ❌ Failed to initialize ONNX model from local file:', error);
    throw new Error(`ONNX model initialization failed: ${error.message}`);
  }
}

/**
 * Simple tokenizer for sentence-transformers models (BERT-like)
 * This is basic - for production you might want @huggingface/tokenizers
 */
function tokenizeText(text) {
  const words = text.toLowerCase().split(/\s+/);
  const tokens = [];
  const maxLength = 512;
  
  // Use the exact vocabulary size from your ONNX model
  const VOCAB_SIZE = 30522; // Based on error: must be within [-30522,30521]
  
  // Add [CLS] token
  tokens.push(101);
  
  for (const word of words.slice(0, maxLength - 2)) {
    // Create a simple hash
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) - hash + word.charCodeAt(i)) & 0x7fffffff;
    }
    
    // Map to safe range: 1000 to 29000 (well within vocabulary)
    const tokenId = 1000 + (hash % 28000);
    
    // Double-check bounds (paranoid safety)
    if (tokenId >= 0 && tokenId < VOCAB_SIZE) {
      tokens.push(tokenId);
    } else {
      console.warn(`[Tokenizer] Token ID ${tokenId} out of bounds, using fallback`);
      tokens.push(1000); // Safe fallback
    }
  }
  
  // Add [SEP] token
  tokens.push(102);
  
  // Pad to fixed length
  while (tokens.length < maxLength) {
    tokens.push(0); // [PAD] token
  }
  
  return tokens.slice(0, maxLength);
}

/**
 * Generate text embedding using ONNX runtime
 * @param {string} text - Text to generate embedding for
 * @returns {Promise<number[]>} Embedding vector
 */
export async function generateTextEmbedding(text) {
  try {
    // Input validation
    if (!text) {
      throw new Error('Text parameter is required');
    }
    
    if (typeof text !== 'string') {
      throw new Error(`Text must be a string, got: ${typeof text}`);
    }
    
    const cleanText = text.trim();
    if (cleanText.length === 0) {
      throw new Error('Text cannot be empty after trimming');
    }
    
    console.log('[Embeddings] Generating embedding for text:', cleanText.substring(0, 100) + '...');
    console.log('[Embeddings] Text length:', cleanText.length);
    
    // Initialize model if needed
    await initializeEmbeddingModel();
    
    const startTime = Date.now();
    
    // Tokenize text
    console.log('[Embeddings] Tokenizing text...');
    const inputIds = tokenizeText(cleanText);
    const attentionMask = inputIds.map(id => id === 0 ? 0 : 1); // Mask padding tokens
    
    // Create input tensors
    const inputIdsTensor = new ort.Tensor('int64', BigInt64Array.from(inputIds.map(id => BigInt(id))), [1, inputIds.length]);
    const attentionMaskTensor = new ort.Tensor('int64', BigInt64Array.from(attentionMask.map(mask => BigInt(mask))), [1, attentionMask.length]);
    
    // Create token_type_ids (all zeros for single sentence)
    const tokenTypeIds = new Array(inputIds.length).fill(0);
    const tokenTypeIdsTensor = new ort.Tensor('int64', BigInt64Array.from(tokenTypeIds.map(id => BigInt(id))), [1, tokenTypeIds.length]);
    
    // Run inference
    console.log('[Embeddings] Running ONNX inference...');
    const inputs = {
      input_ids: inputIdsTensor,
      attention_mask: attentionMaskTensor,
      token_type_ids: tokenTypeIdsTensor
    };
    
    const results = await session.run(inputs);
    
    // Extract embeddings - check for sentence_embedding output first (sentence-transformers)
    let embedding;
    let outputName;
    
    if (results['sentence_embedding']) {
      // Sentence transformers often have this direct output
      outputName = 'sentence_embedding';
      embedding = Array.from(results[outputName].data);
      console.log('[Embeddings] Using sentence_embedding output');
    } else if (results['last_hidden_state'] || results['token_embeddings']) {
      // Fall back to pooling hidden states
      outputName = results['last_hidden_state'] ? 'last_hidden_state' : 'token_embeddings';
      const output = results[outputName];
      
      console.log('[Embeddings] ONNX output shape:', output.dims);
      
      if (output.dims.length === 3) {
        // [batch_size, sequence_length, hidden_size] - need to pool
        const hiddenSize = output.dims[2];
        const sequenceLength = output.dims[1];
        
        // Mean pooling over sequence length (ignoring padding tokens)
        embedding = new Array(hiddenSize).fill(0);
        let validTokenCount = 0;
        
        for (let i = 0; i < sequenceLength; i++) {
          if (attentionMask[i] === 1) { // Only consider non-padding tokens
            for (let j = 0; j < hiddenSize; j++) {
              embedding[j] += output.data[i * hiddenSize + j];
            }
            validTokenCount++;
          }
        }
        
        // Average the embeddings
        embedding = embedding.map(val => val / validTokenCount);
        
      } else if (output.dims.length === 2) {
        // [batch_size, hidden_size] - already pooled
        embedding = Array.from(output.data);
      } else {
        throw new Error(`Unexpected output shape: ${output.dims}`);
      }
    } else {
      // Use first available output
      outputName = session.outputNames[0];
      const output = results[outputName];
      console.log('[Embeddings] Using first available output:', outputName);
      console.log('[Embeddings] Output shape:', output.dims);
      
      if (output.dims.length === 2) {
        embedding = Array.from(output.data);
      } else {
        throw new Error(`Unsupported output format for ${outputName}: ${output.dims}`);
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`[Embeddings] ONNX inference took ${duration}ms`);
    
    // Validate embedding array
    if (!Array.isArray(embedding)) {
      throw new Error(`ONNX returned non-array embedding: ${typeof embedding}`);
    }
    
    if (embedding.length === 0) {
      throw new Error('ONNX returned empty embedding array');
    }
    
    // Validate embedding values
    const hasInvalidNumbers = embedding.some(val => 
      typeof val !== 'number' || isNaN(val) || !isFinite(val)
    );
    
    if (hasInvalidNumbers) {
      throw new Error('Embedding contains invalid numbers (NaN or Infinity)');
    }
    
    // Log embedding statistics
    const embeddingStats = {
      length: embedding.length,
      min: Math.min(...embedding),
      max: Math.max(...embedding),
      mean: embedding.reduce((a, b) => a + b, 0) / embedding.length
    };
    
    console.log('[Embeddings] ✅ Generated embedding:', embeddingStats);
    console.log(`[Embeddings] Total time: ${duration}ms`);
    
    return embedding;
    
  } catch (error) {
    console.error('[Embeddings] ❌ Error generating embedding:', error);
    throw new Error(`Embedding generation failed: ${error.message}`);
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * @param {string[]} texts - Array of texts to generate embeddings for
 * @param {number} batchSize - Number of texts to process at once
 * @returns {Promise<number[][]>} Array of embedding vectors
 */
export async function generateBatchEmbeddings(texts, batchSize = 2) {
  try {
    if (!Array.isArray(texts)) {
      throw new Error('Texts must be an array');
    }
    
    if (texts.length === 0) {
      return [];
    }
    
    console.log(`[Embeddings] Generating batch embeddings for ${texts.length} texts (batch size: ${batchSize})`);
    
    await initializeEmbeddingModel();
    
    const results = [];
    const errors = [];
    
    // Process in smaller batches to avoid memory issues with ONNX
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      console.log(`[Embeddings] Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(texts.length/batchSize)}`);
      
      const batchPromises = batch.map(async (text, index) => {
        try {
          const embedding = await generateTextEmbedding(text);
          return { index: i + index, embedding, success: true };
        } catch (error) {
          console.error(`[Embeddings] Failed to generate embedding for text ${i + index}:`, error.message);
          errors.push({ index: i + index, error: error.message });
          return { index: i + index, embedding: null, success: false };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add delay between batches
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    // Extract successful embeddings in order
    const embeddings = new Array(texts.length);
    let successCount = 0;
    
    for (const result of results) {
      if (result.success) {
        embeddings[result.index] = result.embedding;
        successCount++;
      } else {
        embeddings[result.index] = null;
      }
    }
    
    console.log(`[Embeddings] Batch completed: ${successCount}/${texts.length} successful, ${errors.length} errors`);
    
    if (errors.length > 0) {
      console.warn('[Embeddings] Batch errors:', errors);
    }
    
    return embeddings;
    
  } catch (error) {
    console.error('[Embeddings] Batch embedding generation failed:', error);
    throw new Error(`Batch embedding generation failed: ${error.message}`);
  }
}

/**
 * Test embedding generation with a sample text
 * @returns {Promise<Object>} Test result
 */
export async function testEmbeddingGeneration() {
  try {
    console.log('[Embeddings] Running ONNX embedding generation test...');
    
    const testText = "This is a test plant: Monstera deliciosa, also known as Swiss cheese plant.";
    const startTime = Date.now();
    
    const embedding = await generateTextEmbedding(testText);
    const duration = Date.now() - startTime;
    
    return {
      success: true,
      testText,
      embeddingLength: embedding.length,
      duration,
      model: MODEL_CONFIG.embeddingModel,
      runtime: 'onnxruntime-node (local)',
      embeddingStats: {
        min: Math.min(...embedding),
        max: Math.max(...embedding),
        mean: embedding.reduce((a, b) => a + b, 0) / embedding.length
      }
    };
    
  } catch (error) {
    console.error('[Embeddings] ONNX embedding test failed:', error);
    return {
      success: false,
      error: error.message,
      model: MODEL_CONFIG.embeddingModel,
      runtime: 'onnxruntime-node (local)'
    };
  }
}

/**
 * Calculate cosine similarity between two embeddings
 * @param {number[]} embedding1 - First embedding vector
 * @param {number[]} embedding2 - Second embedding vector
 * @returns {number} Cosine similarity score (-1 to 1)
 */
export function calculateCosineSimilarity(embedding1, embedding2) {
  if (!Array.isArray(embedding1) || !Array.isArray(embedding2)) {
    throw new Error('Both embeddings must be arrays');
  }
  
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have the same length');
  }
  
  if (embedding1.length === 0) {
    throw new Error('Embeddings cannot be empty');
  }
  
  // Calculate dot product
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }
  
  // Calculate norms
  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);
  
  // Avoid division by zero
  if (norm1 === 0 || norm2 === 0) {
    return 0;
  }
  
  // Return cosine similarity
  return dotProduct / (norm1 * norm2);
}

/**
 * Check ONNX model health
 * @returns {Promise<Object>} Health check result
 */
export async function checkEmbeddingModelHealth() {
  try {
    console.log('[Embeddings] Checking ONNX model health...');
    
    await initializeEmbeddingModel();
    
    // Test with a simple sentence
    const testResult = await testEmbeddingGeneration();
    
    return {
      healthy: testResult.success,
      model: MODEL_CONFIG.embeddingModel,
      runtime: 'onnxruntime-node (local)',
      embeddingDimension: testResult.embeddingLength,
      testDuration: testResult.duration,
      sessionInputs: session.inputNames,
      sessionOutputs: session.outputNames,
      error: testResult.error
    };
    
  } catch (error) {
    console.error('[Embeddings] ONNX model health check failed:', error);
    return {
      healthy: false,
      model: MODEL_CONFIG.embeddingModel,
      runtime: 'onnxruntime-node (local)',
      error: error.message
    };
  }
}