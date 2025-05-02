import { defineConfig } from 'vite';
//import inject from '@rollup/plugin-inject';
//import path from 'path';

export default defineConfig({
    server: {
      open: true,
    },
  
    define: {
      'process.env': {
        // Important: Use exactly 'development' or 'production' for NODE_ENV
        NODE_ENV: JSON.stringify('development'),
        // These values are required by Wasp's internal validation:
        WASP_SERVER_URL: JSON.stringify('http://localhost:3001'),
        WASP_WEB_CLIENT_URL: JSON.stringify('http://localhost:3000/'),
        JWT_SECRET: JSON.stringify('DEVJWTSECRET'),
        DATABASE_URL: JSON.stringify('postgresql://postgres:Anya4635!!@localhost:5432/botanical_assistant'),
        
        // Add your custom environment variables
        MODEL_NAME: JSON.stringify('meta-llama/Llama-3.2-3B-Instruct'),
        MODEL_TEMPERATURE: JSON.stringify('0.7'),
        MODEL_MAX_TOKENS: JSON.stringify('1024'),
        EMBEDDING_MODEL: JSON.stringify('BAAI/bge-large-en-v1.5'),
        HUGGINGFACE_API_KEY: JSON.stringify('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'),
        TREFLE_API_KEY: JSON.stringify('yKznQbWYxwFbFPG5PspKyIorAuRhagWlyxTGEobF9aY'),
        TREFLE_API_BASE_URL: JSON.stringify('https://trefle.io/api/v1'),
        TREFLE_RATE_LIMIT_MAX: JSON.stringify('120'),
        TREFLE_RATE_LIMIT_WINDOW: JSON.stringify('3600'),
        TREFLE_CACHE_TTL: JSON.stringify('172800'),
        RAG_TOP_K: JSON.stringify('5'),
        RAG_SIMILARITY_THRESHOLD: JSON.stringify('0.7'),
        RAG_CHUNK_SIZE: JSON.stringify('512'),
        RAG_CHUNK_OVERLAP: JSON.stringify('50'),
        SKIP_EMAIL_VERIFICATION_IN_DEV: JSON.stringify('true'),
      },
    },
  });
  