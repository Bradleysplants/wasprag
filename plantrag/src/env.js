// src/env.js
import { z } from 'zod';
import { defineEnvValidationSchema } from 'wasp/env';

// Helper schemas
const number = z.coerce.number();
const int = number.int();
const float = number;

export const serverEnvValidationSchema = defineEnvValidationSchema(
  z.object({
    // Language Model
    MODEL_NAME: z.string().default('gpt-3.5-turbo'),
    MODEL_TEMPERATURE: float.min(0).max(2).default(0.7),
    MODEL_MAX_TOKENS: int.positive().default(1024),
    
    // Embeddings
    EMBEDDING_MODEL: z.string().default('BAAI/bge-large-en-v1.5'),
    
    // API Keys
    OPENAI_API_KEY: z.string().optional(),
    HUGGINGFACE_API_KEY: z.string(),
    TREFLE_API_KEY: z.string(),
    
    // Trefle API
    TREFLE_API_BASE_URL: z.string().url().default('https://trefle.io/api/v1'),
    TREFLE_RATE_LIMIT_MAX: int.default(120),
    TREFLE_RATE_LIMIT_WINDOW: int.default(3600), // 1 hour in seconds
    TREFLE_CACHE_TTL: int.default(172800), // 48 hours
    
    // RAG Configuration
    RAG_TOP_K: int.default(5),
    RAG_SIMILARITY_THRESHOLD: float.min(0).max(1).default(0.7),
    RAG_CHUNK_SIZE: int.default(512),
    RAG_CHUNK_OVERLAP: int.default(50)
  })
);

export const clientEnvValidationSchema = defineEnvValidationSchema(
  z.object({})
);