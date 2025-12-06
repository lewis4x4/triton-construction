import OpenAI from 'openai';
import type { Chunk, ChunkWithEmbedding } from './types.js';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const BATCH_SIZE = 100; // OpenAI batch limit
const RETRY_DELAY_MS = 1000;
const MAX_RETRIES = 3;

export async function generateEmbeddings(
  chunks: Chunk[],
  apiKey: string
): Promise<ChunkWithEmbedding[]> {
  console.log('\nGenerating embeddings...');
  console.log(`  Model: ${EMBEDDING_MODEL}`);
  console.log(`  Chunks to process: ${chunks.length}`);
  console.log(`  Estimated batches: ${Math.ceil(chunks.length / BATCH_SIZE)}`);

  const openai = new OpenAI({ apiKey });
  const results: ChunkWithEmbedding[] = [];
  const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const batch = chunks.slice(i, i + BATCH_SIZE);

    console.log(`  Processing batch ${batchNum}/${totalBatches} (${batch.length} chunks)...`);

    // Prepare texts for embedding
    const texts = batch.map(chunk => {
      // Include context in the embedding for better retrieval
      const contextPrefix = chunk.sectionContext ? `${chunk.sectionContext}\n\n` : '';
      return contextPrefix + chunk.content;
    });

    // Generate embeddings with retry logic
    const embeddings = await generateBatchWithRetry(openai, texts);

    // Combine chunks with embeddings
    for (let j = 0; j < batch.length; j++) {
      results.push({
        ...batch[j],
        embedding: embeddings[j],
      });
    }

    // Rate limiting - pause between batches
    if (i + BATCH_SIZE < chunks.length) {
      await sleep(200);
    }
  }

  console.log(`  Generated ${results.length} embeddings`);

  // Calculate estimated cost
  const totalTokens = chunks.reduce((sum, c) => sum + c.tokenCount, 0);
  const estimatedCost = (totalTokens / 1_000_000) * 0.02; // $0.02 per 1M tokens
  console.log(`  Estimated cost: $${estimatedCost.toFixed(4)}`);

  return results;
}

async function generateBatchWithRetry(
  openai: OpenAI,
  texts: string[],
  retryCount = 0
): Promise<number[][]> {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    return response.data.map(d => d.embedding);
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
      console.log(`    Retry ${retryCount + 1}/${MAX_RETRIES} after ${delay}ms...`);
      await sleep(delay);
      return generateBatchWithRetry(openai, texts, retryCount + 1);
    }
    throw error;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Utility to format embedding for pgvector
export function formatEmbeddingForPg(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}
