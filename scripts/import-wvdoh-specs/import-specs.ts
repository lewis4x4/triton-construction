#!/usr/bin/env tsx
/**
 * WVDOH Specification Import Script
 *
 * This script imports parsed WVDOH Standard Specifications from parseur.com JSON files
 * into Supabase for AI-powered search.
 *
 * Usage:
 *   pnpm exec tsx import-specs.ts \
 *     --json1 "/path/to/pages-0001-0500.json" \
 *     --json2 "/path/to/pages-0501-1000.json"
 */

import 'dotenv/config';
import { loadJsonFiles, parseSpecifications } from './parse-structure.js';
import { createChunks } from './chunk-content.js';
import { generateEmbeddings } from './generate-embeddings.js';
import {
  initSupabase,
  getOrganizationId,
  cleanExistingData,
  insertSpecDocument,
  insertDivisions,
  insertSections,
  insertSubsections,
  insertChunks,
  insertPayItemLinks,
  updateDocumentStatus,
} from './db-operations.js';

// Parse command line arguments
function parseArgs(): { json1: string; json2: string } {
  const args = process.argv.slice(2);
  let json1 = '';
  let json2 = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json1' && args[i + 1]) {
      json1 = args[i + 1];
      i++;
    } else if (args[i] === '--json2' && args[i + 1]) {
      json2 = args[i + 1];
      i++;
    }
  }

  // Default paths if not provided
  if (!json1) {
    json1 = '/Users/brianlewis/Downloads/documentpages0001-0500of1006.pdf.json';
  }
  if (!json2) {
    json2 = '/Users/brianlewis/Downloads/documentpages0501-1000of1006.pdf.json';
  }

  return { json1, json2 };
}

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('WVDOH Specification Import Script');
  console.log('='.repeat(60));

  const startTime = Date.now();

  // Validate environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    process.exit(1);
  }

  if (!openaiKey) {
    console.error('Error: OPENAI_API_KEY must be set');
    process.exit(1);
  }

  // Parse arguments
  const { json1, json2 } = parseArgs();
  console.log(`\nJSON file 1: ${json1}`);
  console.log(`JSON file 2: ${json2}`);

  try {
    // Initialize Supabase client
    console.log('\nInitializing Supabase client...');
    const supabase = await initSupabase(supabaseUrl, supabaseKey);

    // Get organization ID
    const orgId = await getOrganizationId(supabase, 'Triton');
    console.log(`  Organization ID: ${orgId || '(global)'}`);

    // Clean existing data (clean start)
    await cleanExistingData(supabase);

    // Step 1: Load and combine JSON files
    const combinedText = loadJsonFiles(json1, json2);

    // Step 2: Parse specification structure
    const { divisions, sections, subsections, payItems } = parseSpecifications(combinedText);

    // Step 3: Create chunks for AI retrieval
    const chunks = createChunks(sections, subsections);

    // Step 4: Generate embeddings
    const chunksWithEmbeddings = await generateEmbeddings(chunks, openaiKey);

    // Step 5: Insert into database
    console.log('\n' + '='.repeat(60));
    console.log('DATABASE INSERTION');
    console.log('='.repeat(60));

    // Create document record
    const documentId = await insertSpecDocument(supabase, orgId);

    // Insert divisions
    const divisionIds = await insertDivisions(supabase, documentId, divisions);

    // Insert sections
    const sectionIds = await insertSections(supabase, documentId, divisionIds, sections);

    // Insert subsections
    const subsectionIds = await insertSubsections(supabase, sectionIds, subsections);

    // Insert chunks with embeddings
    const chunkCount = await insertChunks(
      supabase,
      documentId,
      sectionIds,
      subsectionIds,
      chunksWithEmbeddings
    );

    // Insert pay item links
    const itemLinkCount = await insertPayItemLinks(supabase, documentId, sectionIds, payItems);

    // Update document status
    await updateDocumentStatus(supabase, documentId, sectionIds.size, chunkCount);

    // Summary
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n' + '='.repeat(60));
    console.log('IMPORT COMPLETE');
    console.log('='.repeat(60));
    console.log(`  Document ID: ${documentId}`);
    console.log(`  Divisions: ${divisionIds.size}`);
    console.log(`  Sections: ${sectionIds.size}`);
    console.log(`  Subsections: ${subsectionIds.size}`);
    console.log(`  Chunks: ${chunkCount}`);
    console.log(`  Pay Item Links: ${itemLinkCount}`);
    console.log(`  Time elapsed: ${elapsed}s`);
    console.log('\nYou can now search specifications at http://localhost:3000/specs');

  } catch (error) {
    console.error('\nImport failed:', error);
    process.exit(1);
  }
}

// Run the import
main();
