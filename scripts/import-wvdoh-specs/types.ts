// Types for WVDOH Specification Import

export interface ParseurDocument {
  OriginalDocument: {
    name: string;
    url: string;
    content_type: string;
    size: number;
  };
  Received: string;
  TextDocument: string;
}

export interface Division {
  number: number;
  title: string;
  startPage?: number;
  endPage?: number;
}

export interface Section {
  sectionNumber: string;
  title: string;
  divisionNumber: number;
  fullText: string;
  startPage?: number;
  endPage?: number;
  relatedPayItems: string[];
}

export interface Subsection {
  sectionNumber: string;
  subsectionNumber: string;
  title: string;
  content: string;
  hierarchyLevel: number;
  parentSubsection?: string;
  pageNumber?: number;
  crossReferences: string[];
}

export interface Chunk {
  sectionNumber: string;
  subsectionNumber?: string;
  sectionContext: string;
  content: string;
  chunkType: ChunkType;
  chunkIndex: number;
  tokenCount: number;
  pageNumber?: number;
  payItemCodes: string[];
  keywords: string[];
}

export interface ChunkWithEmbedding extends Chunk {
  embedding: number[];
}

export type ChunkType =
  | 'SECTION_HEADER'
  | 'REQUIREMENT'
  | 'PROCEDURE'
  | 'MATERIAL_SPEC'
  | 'MEASUREMENT'
  | 'PAYMENT'
  | 'TABLE'
  | 'REFERENCE'
  | 'DEFINITION';

export interface PayItem {
  itemNumber: string;
  description: string;
  unit: string;
  sectionNumber: string;
}

export interface ParseResult {
  divisions: Division[];
  sections: Section[];
  subsections: Subsection[];
  payItems: PayItem[];
}

// Database record types
export interface DbSpecDocument {
  id?: string;
  organization_id: string | null;
  document_type: string;
  title: string;
  version_year: number;
  edition?: string;
  effective_date?: string;
  processing_status: string;
  total_pages?: number;
  is_active: boolean;
}

export interface DbSpecDivision {
  id?: string;
  document_id: string;
  division_number: number;
  title: string;
  start_page?: number;
  end_page?: number;
  sort_order: number;
}

export interface DbSpecSection {
  id?: string;
  document_id: string;
  division_id: string;
  section_number: string;
  title: string;
  full_text?: string;
  start_page?: number;
  end_page?: number;
  related_pay_items?: string[];
  sort_order: number;
}

export interface DbSpecSubsection {
  id?: string;
  section_id: string;
  parent_subsection_id?: string;
  subsection_number: string;
  title?: string;
  content: string;
  hierarchy_level: number;
  cross_references?: string[];
  page_number?: number;
  sort_order: number;
}

export interface DbSpecChunk {
  id?: string;
  document_id: string;
  section_id?: string;
  subsection_id?: string;
  chunk_type: string;
  chunk_index: number;
  content: string;
  content_tokens?: number;
  section_context?: string;
  embedding?: string; // pgvector format: "[0.1, 0.2, ...]"
  pay_item_codes?: string[];
  keywords?: string[];
  page_number?: number;
}

export interface DbSpecItemLink {
  id?: string;
  document_id: string;
  item_number: string;
  item_description?: string;
  primary_section_id?: string;
}
