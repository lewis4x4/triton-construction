import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  Division,
  Section,
  Subsection,
  PayItem,
  ChunkWithEmbedding,
  DbSpecDocument,
  DbSpecDivision,
  DbSpecSection,
  DbSpecSubsection,
  DbSpecChunk,
  DbSpecItemLink,
} from './types.js';
import { formatEmbeddingForPg } from './generate-embeddings.js';

const BATCH_SIZE = 100;

export interface DbResult {
  documentId: string;
  divisionIds: Map<number, string>;
  sectionIds: Map<string, string>;
  subsectionIds: Map<string, string>;
  chunkCount: number;
  itemLinkCount: number;
}

export async function initSupabase(url: string, serviceKey: string): Promise<SupabaseClient> {
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function getOrganizationId(supabase: SupabaseClient, orgName: string = 'Triton'): Promise<string | null> {
  // Try to find Triton organization
  const { data, error } = await supabase
    .from('organizations')
    .select('id')
    .ilike('name', `%${orgName}%`)
    .limit(1);

  if (error) {
    console.error('Error finding organization:', error);
    return null;
  }

  if (data && data.length > 0) {
    return data[0].id;
  }

  // If no org found, return null (will create global spec)
  console.log(`  Organization "${orgName}" not found, will create org-less document`);
  return null;
}

export async function insertSpecDocument(
  supabase: SupabaseClient,
  organizationId: string | null
): Promise<string> {
  console.log('\nCreating spec document record...');

  const doc: DbSpecDocument = {
    organization_id: organizationId,
    document_type: 'STANDARD_SPECS',
    title: 'WVDOH Standard Specifications Roads and Bridges',
    version_year: 2023,
    edition: '2023 Edition',
    effective_date: '2023-01-01',
    processing_status: 'PARSING',
    total_pages: 1006,
    is_active: true,
  };

  const { data, error } = await supabase
    .from('spec_documents')
    .insert(doc)
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create spec document: ${error.message}`);
  }

  console.log(`  Created document: ${data.id}`);
  return data.id;
}

export async function insertDivisions(
  supabase: SupabaseClient,
  documentId: string,
  divisions: Division[]
): Promise<Map<number, string>> {
  console.log(`\nInserting ${divisions.length} divisions...`);

  const divisionIds = new Map<number, string>();

  const records: DbSpecDivision[] = divisions.map((div, idx) => ({
    document_id: documentId,
    division_number: div.number,
    title: div.title,
    start_page: div.startPage,
    end_page: div.endPage,
    sort_order: idx,
  }));

  const { data, error } = await supabase
    .from('spec_divisions')
    .insert(records)
    .select('id, division_number');

  if (error) {
    throw new Error(`Failed to insert divisions: ${error.message}`);
  }

  for (const row of data || []) {
    divisionIds.set(row.division_number, row.id);
  }

  console.log(`  Inserted ${divisionIds.size} divisions`);
  return divisionIds;
}

export async function insertSections(
  supabase: SupabaseClient,
  documentId: string,
  divisionIds: Map<number, string>,
  sections: Section[]
): Promise<Map<string, string>> {
  console.log(`\nInserting ${sections.length} sections...`);

  const sectionIds = new Map<string, string>();

  // Process in batches
  for (let i = 0; i < sections.length; i += BATCH_SIZE) {
    const batch = sections.slice(i, i + BATCH_SIZE);

    const records: DbSpecSection[] = batch.map((section, idx) => ({
      document_id: documentId,
      division_id: divisionIds.get(section.divisionNumber) || '',
      section_number: section.sectionNumber,
      title: section.title,
      full_text: section.fullText.slice(0, 100000), // Limit text size
      start_page: section.startPage,
      end_page: section.endPage,
      related_pay_items: section.relatedPayItems,
      sort_order: i + idx,
    }));

    const { data, error } = await supabase
      .from('spec_sections')
      .insert(records)
      .select('id, section_number');

    if (error) {
      console.error(`Failed to insert sections batch ${i / BATCH_SIZE + 1}:`, error);
      continue;
    }

    for (const row of data || []) {
      sectionIds.set(row.section_number, row.id);
    }
  }

  console.log(`  Inserted ${sectionIds.size} sections`);
  return sectionIds;
}

export async function insertSubsections(
  supabase: SupabaseClient,
  sectionIds: Map<string, string>,
  subsections: Subsection[]
): Promise<Map<string, string>> {
  console.log(`\nInserting ${subsections.length} subsections...`);

  const subsectionIds = new Map<string, string>();

  // First pass: insert all subsections without parent references
  for (let i = 0; i < subsections.length; i += BATCH_SIZE) {
    const batch = subsections.slice(i, i + BATCH_SIZE);

    const records: DbSpecSubsection[] = batch.map((sub, idx) => ({
      section_id: sectionIds.get(sub.sectionNumber) || '',
      subsection_number: sub.subsectionNumber,
      title: sub.title,
      content: sub.content.slice(0, 50000), // Limit content size
      hierarchy_level: sub.hierarchyLevel,
      cross_references: sub.crossReferences,
      page_number: sub.pageNumber,
      sort_order: i + idx,
    }));

    // Filter out records without valid section_id
    const validRecords = records.filter(r => r.section_id);

    if (validRecords.length === 0) continue;

    const { data, error } = await supabase
      .from('spec_subsections')
      .insert(validRecords)
      .select('id, subsection_number');

    if (error) {
      console.error(`Failed to insert subsections batch ${i / BATCH_SIZE + 1}:`, error);
      continue;
    }

    for (const row of data || []) {
      subsectionIds.set(row.subsection_number, row.id);
    }
  }

  // Second pass: update parent references
  console.log('  Updating parent references...');
  for (const sub of subsections) {
    if (sub.parentSubsection && subsectionIds.has(sub.parentSubsection)) {
      const subId = subsectionIds.get(sub.subsectionNumber);
      const parentId = subsectionIds.get(sub.parentSubsection);

      if (subId && parentId) {
        await supabase
          .from('spec_subsections')
          .update({ parent_subsection_id: parentId })
          .eq('id', subId);
      }
    }
  }

  console.log(`  Inserted ${subsectionIds.size} subsections`);
  return subsectionIds;
}

export async function insertChunks(
  supabase: SupabaseClient,
  documentId: string,
  sectionIds: Map<string, string>,
  subsectionIds: Map<string, string>,
  chunks: ChunkWithEmbedding[]
): Promise<number> {
  console.log(`\nInserting ${chunks.length} chunks...`);

  let insertedCount = 0;

  // Process in batches
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);

    const records: DbSpecChunk[] = batch.map((chunk) => ({
      document_id: documentId,
      section_id: sectionIds.get(chunk.sectionNumber),
      subsection_id: chunk.subsectionNumber ? subsectionIds.get(chunk.subsectionNumber) : undefined,
      chunk_type: chunk.chunkType,
      chunk_index: chunk.chunkIndex,
      content: chunk.content,
      content_tokens: chunk.tokenCount,
      section_context: chunk.sectionContext,
      embedding: formatEmbeddingForPg(chunk.embedding),
      pay_item_codes: chunk.payItemCodes.length > 0 ? chunk.payItemCodes : undefined,
      keywords: chunk.keywords.length > 0 ? chunk.keywords : undefined,
      page_number: chunk.pageNumber,
    }));

    const { error } = await supabase
      .from('spec_chunks')
      .insert(records);

    if (error) {
      console.error(`Failed to insert chunks batch ${i / BATCH_SIZE + 1}:`, error);
      continue;
    }

    insertedCount += batch.length;

    // Progress update
    if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= chunks.length) {
      console.log(`  Inserted ${Math.min(i + BATCH_SIZE, chunks.length)}/${chunks.length} chunks`);
    }
  }

  console.log(`  Total chunks inserted: ${insertedCount}`);
  return insertedCount;
}

export async function insertPayItemLinks(
  supabase: SupabaseClient,
  documentId: string,
  sectionIds: Map<string, string>,
  payItems: PayItem[]
): Promise<number> {
  console.log(`\nInserting ${payItems.length} pay item links...`);

  const records: DbSpecItemLink[] = payItems
    .filter(item => sectionIds.has(item.sectionNumber))
    .map(item => ({
      document_id: documentId,
      item_number: item.itemNumber,
      item_description: item.description,
      primary_section_id: sectionIds.get(item.sectionNumber),
    }));

  if (records.length === 0) {
    console.log('  No pay item links to insert');
    return 0;
  }

  const { error } = await supabase
    .from('spec_item_links')
    .insert(records);

  if (error) {
    console.error('Failed to insert pay item links:', error);
    return 0;
  }

  console.log(`  Inserted ${records.length} pay item links`);
  return records.length;
}

export async function updateDocumentStatus(
  supabase: SupabaseClient,
  documentId: string,
  totalSections: number,
  totalChunks: number
): Promise<void> {
  console.log('\nUpdating document status...');

  const { error } = await supabase
    .from('spec_documents')
    .update({
      processing_status: 'COMPLETED',
      processing_completed_at: new Date().toISOString(),
      total_sections: totalSections,
      total_chunks: totalChunks,
    })
    .eq('id', documentId);

  if (error) {
    console.error('Failed to update document status:', error);
  } else {
    console.log('  Document marked as COMPLETED');
  }
}

export async function cleanExistingData(supabase: SupabaseClient): Promise<void> {
  console.log('\nCleaning existing spec data...');

  // Delete in order due to foreign key constraints
  // Chunks reference sections, subsections reference sections, sections reference divisions, etc.

  const { error: chunksError } = await supabase
    .from('spec_chunks')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (chunksError) {
    console.log('  Note: spec_chunks may be empty or have constraints');
  }

  const { error: itemLinksError } = await supabase
    .from('spec_item_links')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (itemLinksError) {
    console.log('  Note: spec_item_links may be empty');
  }

  const { error: subsectionsError } = await supabase
    .from('spec_subsections')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (subsectionsError) {
    console.log('  Note: spec_subsections may be empty');
  }

  const { error: sectionsError } = await supabase
    .from('spec_sections')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (sectionsError) {
    console.log('  Note: spec_sections may be empty');
  }

  const { error: divisionsError } = await supabase
    .from('spec_divisions')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (divisionsError) {
    console.log('  Note: spec_divisions may be empty');
  }

  const { error: docsError } = await supabase
    .from('spec_documents')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (docsError) {
    console.log('  Note: spec_documents may be empty');
  }

  console.log('  Cleanup complete');
}
