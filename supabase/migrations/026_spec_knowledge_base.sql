-- ============================================================================
-- Migration 026: WVDOH Specification Knowledge Base
-- ============================================================================
-- Purpose: Create schema for parsing, storing, and querying WVDOH construction
--          specifications with AI-powered semantic search capabilities.
-- Dependencies: Requires pgvector extension for embedding storage
-- ============================================================================

-- Enable pgvector extension for vector embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Document types for specifications
DO $$ BEGIN
    CREATE TYPE spec_document_type AS ENUM (
        'STANDARD_SPECS',      -- Main WVDOH Standard Specifications
        'SUPPLEMENTAL_SPECS',  -- Supplemental specifications
        'SPECIAL_PROVISIONS',  -- Project-specific special provisions
        'TECHNICAL_BULLETIN',  -- Technical bulletins and updates
        'DESIGN_DIRECTIVE'     -- Design directives
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Processing status for documents
DO $$ BEGIN
    CREATE TYPE spec_processing_status AS ENUM (
        'PENDING',             -- Awaiting processing
        'EXTRACTING',          -- Extracting text from PDF
        'PARSING',             -- Parsing structure
        'CHUNKING',            -- Creating retrieval chunks
        'EMBEDDING',           -- Generating vector embeddings
        'COMPLETED',           -- Fully processed
        'FAILED'               -- Processing failed
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Chunk types for semantic search
DO $$ BEGIN
    CREATE TYPE spec_chunk_type AS ENUM (
        'SECTION_HEADER',      -- Section title and description
        'REQUIREMENT',         -- Specific requirement text
        'PROCEDURE',           -- Construction procedure
        'MATERIAL_SPEC',       -- Material specification
        'MEASUREMENT',         -- Measurement method
        'PAYMENT',             -- Payment terms
        'TABLE',               -- Tabular data
        'REFERENCE',           -- Cross-reference
        'DEFINITION'           -- Term definition
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- -----------------------------------------------------------------------------
-- spec_documents: Track specification document versions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.spec_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Document metadata
    document_type spec_document_type NOT NULL DEFAULT 'STANDARD_SPECS',
    title TEXT NOT NULL,
    version_year INTEGER NOT NULL,          -- e.g., 2022
    edition TEXT,                            -- e.g., "Metric", "English"
    effective_date DATE,
    expiration_date DATE,

    -- Source tracking
    source_url TEXT,
    source_file_path TEXT,
    file_hash TEXT,                          -- SHA-256 for deduplication

    -- Processing status
    processing_status spec_processing_status NOT NULL DEFAULT 'PENDING',
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    processing_error TEXT,

    -- Statistics
    total_pages INTEGER,
    total_sections INTEGER DEFAULT 0,
    total_chunks INTEGER DEFAULT 0,

    -- Metadata
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),

    CONSTRAINT unique_doc_version UNIQUE (organization_id, document_type, version_year, edition)
);

-- -----------------------------------------------------------------------------
-- spec_divisions: Top-level specification groupings (100, 200, 300, etc.)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.spec_divisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.spec_documents(id) ON DELETE CASCADE,

    -- Division identification
    division_number INTEGER NOT NULL,        -- 100, 200, 300, etc.
    title TEXT NOT NULL,                     -- "General Provisions", "Earthwork", etc.
    description TEXT,

    -- Page references
    start_page INTEGER,
    end_page INTEGER,

    -- Ordering
    sort_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_division UNIQUE (document_id, division_number)
);

-- -----------------------------------------------------------------------------
-- spec_sections: Major sections within divisions (601, 602, 636, etc.)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.spec_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.spec_documents(id) ON DELETE CASCADE,
    division_id UUID NOT NULL REFERENCES public.spec_divisions(id) ON DELETE CASCADE,

    -- Section identification
    section_number TEXT NOT NULL,            -- "601", "636", "680"
    title TEXT NOT NULL,                     -- "Structural Concrete", "Prestressed Concrete"
    description TEXT,

    -- Content
    full_text TEXT,                          -- Complete section text for full-text search

    -- Page references
    start_page INTEGER,
    end_page INTEGER,

    -- Related pay items (stored as array for quick lookup)
    related_pay_items TEXT[],                -- ["601-01", "601-02"]

    -- Metadata
    sort_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_section UNIQUE (document_id, section_number)
);

-- Create GIN index for full-text search on sections
CREATE INDEX IF NOT EXISTS idx_spec_sections_fulltext ON public.spec_sections
    USING GIN (to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(full_text, '')));

-- -----------------------------------------------------------------------------
-- spec_subsections: Detailed articles and subsections (601.1, 601.8.4, etc.)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.spec_subsections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES public.spec_sections(id) ON DELETE CASCADE,
    parent_subsection_id UUID REFERENCES public.spec_subsections(id) ON DELETE CASCADE,

    -- Subsection identification
    subsection_number TEXT NOT NULL,         -- "601.1", "601.8.4"
    title TEXT,                              -- "Description", "Measurement and Payment"

    -- Content
    content TEXT NOT NULL,                   -- The actual specification text

    -- Hierarchy level (1 = 601.1, 2 = 601.1.1, 3 = 601.1.1.1)
    hierarchy_level INTEGER NOT NULL DEFAULT 1,

    -- Cross-references found in this subsection
    cross_references TEXT[],                 -- ["Section 702", "AASHTO M85"]

    -- Page reference
    page_number INTEGER,

    -- Ordering
    sort_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for hierarchical queries
CREATE INDEX IF NOT EXISTS idx_spec_subsections_parent ON public.spec_subsections(parent_subsection_id);
CREATE INDEX IF NOT EXISTS idx_spec_subsections_section ON public.spec_subsections(section_id);

-- -----------------------------------------------------------------------------
-- spec_chunks: AI retrieval units with vector embeddings
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.spec_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.spec_documents(id) ON DELETE CASCADE,
    section_id UUID REFERENCES public.spec_sections(id) ON DELETE CASCADE,
    subsection_id UUID REFERENCES public.spec_subsections(id) ON DELETE SET NULL,

    -- Chunk identification
    chunk_type spec_chunk_type NOT NULL,
    chunk_index INTEGER NOT NULL,            -- Order within document

    -- Content
    content TEXT NOT NULL,                   -- The chunk text (typically 200-500 tokens)
    content_tokens INTEGER,                  -- Token count for this chunk

    -- Context (for better retrieval)
    section_context TEXT,                    -- "Section 601 - Structural Concrete > 601.8 Measurement"

    -- Vector embedding (OpenAI text-embedding-3-small = 1536 dimensions)
    embedding vector(1536),

    -- Metadata for filtering
    pay_item_codes TEXT[],                   -- Related pay item codes
    material_types TEXT[],                   -- Related materials
    keywords TEXT[],                         -- Extracted keywords

    -- Page reference
    page_number INTEGER,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_chunk UNIQUE (document_id, chunk_index)
);

-- Create vector similarity index (IVFFlat for larger datasets)
CREATE INDEX IF NOT EXISTS idx_spec_chunks_embedding ON public.spec_chunks
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Create index for pay item lookups
CREATE INDEX IF NOT EXISTS idx_spec_chunks_pay_items ON public.spec_chunks USING GIN (pay_item_codes);

-- -----------------------------------------------------------------------------
-- spec_tables: Structured table data extracted from specifications
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.spec_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES public.spec_sections(id) ON DELETE CASCADE,
    subsection_id UUID REFERENCES public.spec_subsections(id) ON DELETE SET NULL,

    -- Table identification
    table_number TEXT,                       -- "Table 601-1"
    title TEXT,                              -- "Concrete Mix Design Requirements"

    -- Table data stored as JSONB for flexibility
    -- Format: { "headers": [...], "rows": [[...], [...]], "notes": [...] }
    table_data JSONB NOT NULL,

    -- Raw text representation for search
    raw_text TEXT,

    -- Page reference
    page_number INTEGER,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_spec_tables_data ON public.spec_tables USING GIN (table_data);

-- -----------------------------------------------------------------------------
-- spec_item_links: Map WVDOH pay item codes to specification sections
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.spec_item_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.spec_documents(id) ON DELETE CASCADE,

    -- Pay item identification
    item_number TEXT NOT NULL,               -- "601-01", "636-05"
    item_description TEXT,                   -- "Class B Concrete"

    -- Linked specification sections
    primary_section_id UUID REFERENCES public.spec_sections(id) ON DELETE SET NULL,
    related_section_ids UUID[],              -- Additional related sections

    -- Direct references
    measurement_subsection_id UUID REFERENCES public.spec_subsections(id),
    payment_subsection_id UUID REFERENCES public.spec_subsections(id),

    -- Quick reference content
    measurement_summary TEXT,                -- Key measurement requirements
    payment_summary TEXT,                    -- Key payment terms

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_item_link UNIQUE (document_id, item_number)
);

-- Create index for item number lookups
CREATE INDEX IF NOT EXISTS idx_spec_item_links_item ON public.spec_item_links(item_number);

-- -----------------------------------------------------------------------------
-- spec_query_log: Track queries for analytics and improvement
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.spec_query_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Query details
    query_text TEXT NOT NULL,
    query_embedding vector(1536),

    -- Context
    bid_project_id UUID,                     -- If query was from a bid context
    line_item_id UUID,                       -- If query was for a specific line item

    -- Results
    result_count INTEGER,
    top_chunk_ids UUID[],
    response_text TEXT,                      -- AI-generated response

    -- Feedback
    was_helpful BOOLEAN,
    feedback_text TEXT,

    -- Performance
    query_time_ms INTEGER,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partition query logs by month for performance
-- (Implement partitioning if query volume becomes significant)

-- ============================================================================
-- VIEWS
-- ============================================================================

-- -----------------------------------------------------------------------------
-- v_section_summary: Section overview with statistics
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_section_summary AS
SELECT
    s.id,
    s.document_id,
    s.section_number,
    s.title,
    d.division_number,
    d.title AS division_title,
    doc.version_year,
    doc.document_type,
    s.start_page,
    s.end_page,
    COALESCE(array_length(s.related_pay_items, 1), 0) AS pay_item_count,
    (SELECT COUNT(*) FROM public.spec_subsections ss WHERE ss.section_id = s.id) AS subsection_count,
    (SELECT COUNT(*) FROM public.spec_chunks c WHERE c.section_id = s.id) AS chunk_count,
    (SELECT COUNT(*) FROM public.spec_tables t WHERE t.section_id = s.id) AS table_count
FROM public.spec_sections s
JOIN public.spec_divisions d ON d.id = s.division_id
JOIN public.spec_documents doc ON doc.id = s.document_id
WHERE doc.is_active = TRUE;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- -----------------------------------------------------------------------------
-- search_specs: Semantic search across specification chunks
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_specs(
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INTEGER DEFAULT 10,
    filter_document_id UUID DEFAULT NULL,
    filter_section_ids UUID[] DEFAULT NULL,
    filter_pay_items TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    chunk_id UUID,
    section_id UUID,
    section_number TEXT,
    section_title TEXT,
    chunk_type spec_chunk_type,
    content TEXT,
    section_context TEXT,
    similarity FLOAT,
    page_number INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id AS chunk_id,
        c.section_id,
        s.section_number,
        s.title AS section_title,
        c.chunk_type,
        c.content,
        c.section_context,
        1 - (c.embedding <=> query_embedding) AS similarity,
        c.page_number
    FROM public.spec_chunks c
    LEFT JOIN public.spec_sections s ON s.id = c.section_id
    LEFT JOIN public.spec_documents d ON d.id = c.document_id
    WHERE
        d.is_active = TRUE
        AND c.embedding IS NOT NULL
        AND (filter_document_id IS NULL OR c.document_id = filter_document_id)
        AND (filter_section_ids IS NULL OR c.section_id = ANY(filter_section_ids))
        AND (filter_pay_items IS NULL OR c.pay_item_codes && filter_pay_items)
        AND 1 - (c.embedding <=> query_embedding) > match_threshold
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- -----------------------------------------------------------------------------
-- get_item_specs: Get all specification content for a pay item
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_item_specs(
    p_item_number TEXT,
    p_document_id UUID DEFAULT NULL
)
RETURNS TABLE (
    section_id UUID,
    section_number TEXT,
    section_title TEXT,
    subsection_number TEXT,
    subsection_title TEXT,
    content TEXT,
    is_measurement BOOLEAN,
    is_payment BOOLEAN,
    page_number INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id AS section_id,
        s.section_number,
        s.title AS section_title,
        ss.subsection_number,
        ss.title AS subsection_title,
        ss.content,
        (il.measurement_subsection_id = ss.id) AS is_measurement,
        (il.payment_subsection_id = ss.id) AS is_payment,
        ss.page_number
    FROM public.spec_item_links il
    JOIN public.spec_sections s ON s.id = il.primary_section_id
    JOIN public.spec_subsections ss ON ss.section_id = s.id
    JOIN public.spec_documents d ON d.id = il.document_id
    WHERE
        il.item_number = p_item_number
        AND d.is_active = TRUE
        AND (p_document_id IS NULL OR il.document_id = p_document_id)
    ORDER BY ss.sort_order;
END;
$$;

-- -----------------------------------------------------------------------------
-- get_related_sections: Find sections related to a given section
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_related_sections(
    p_section_id UUID
)
RETURNS TABLE (
    related_section_id UUID,
    section_number TEXT,
    section_title TEXT,
    relationship_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    -- Find sections referenced in cross-references
    SELECT DISTINCT
        s2.id AS related_section_id,
        s2.section_number,
        s2.title AS section_title,
        'cross_reference' AS relationship_type
    FROM public.spec_subsections ss
    JOIN public.spec_sections s ON s.id = ss.section_id
    JOIN public.spec_sections s2 ON
        ss.cross_references IS NOT NULL
        AND s2.section_number = ANY(
            ARRAY(SELECT unnest(ss.cross_references)
                  WHERE unnest ~ '^[0-9]+$')
        )
    WHERE ss.section_id = p_section_id
    AND s2.document_id = s.document_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- update_section_statistics: Update statistics after processing
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_document_statistics(
    p_document_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.spec_documents
    SET
        total_sections = (
            SELECT COUNT(*) FROM public.spec_sections
            WHERE document_id = p_document_id
        ),
        total_chunks = (
            SELECT COUNT(*) FROM public.spec_chunks
            WHERE document_id = p_document_id
        ),
        updated_at = NOW()
    WHERE id = p_document_id;
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamps (use DROP + CREATE for idempotency)
DROP TRIGGER IF EXISTS spec_documents_updated_at ON public.spec_documents;
CREATE TRIGGER spec_documents_updated_at
    BEFORE UPDATE ON public.spec_documents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS spec_divisions_updated_at ON public.spec_divisions;
CREATE TRIGGER spec_divisions_updated_at
    BEFORE UPDATE ON public.spec_divisions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS spec_sections_updated_at ON public.spec_sections;
CREATE TRIGGER spec_sections_updated_at
    BEFORE UPDATE ON public.spec_sections
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS spec_subsections_updated_at ON public.spec_subsections;
CREATE TRIGGER spec_subsections_updated_at
    BEFORE UPDATE ON public.spec_subsections
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS spec_tables_updated_at ON public.spec_tables;
CREATE TRIGGER spec_tables_updated_at
    BEFORE UPDATE ON public.spec_tables
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS spec_item_links_updated_at ON public.spec_item_links;
CREATE TRIGGER spec_item_links_updated_at
    BEFORE UPDATE ON public.spec_item_links
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.spec_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spec_divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spec_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spec_subsections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spec_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spec_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spec_item_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spec_query_log ENABLE ROW LEVEL SECURITY;

-- Spec documents: Organization members can read, admins can write
DROP POLICY IF EXISTS spec_documents_select ON public.spec_documents;
CREATE POLICY spec_documents_select ON public.spec_documents
    FOR SELECT USING (
        organization_id IS NULL  -- Global specs readable by all
        OR organization_id = public.get_user_organization_id()
    );

DROP POLICY IF EXISTS spec_documents_insert ON public.spec_documents;
CREATE POLICY spec_documents_insert ON public.spec_documents
    FOR INSERT WITH CHECK (
        public.get_user_role_level() <= 20  -- PM or higher
    );

DROP POLICY IF EXISTS spec_documents_update ON public.spec_documents;
CREATE POLICY spec_documents_update ON public.spec_documents
    FOR UPDATE USING (
        public.get_user_role_level() <= 20
    );

DROP POLICY IF EXISTS spec_documents_delete ON public.spec_documents;
CREATE POLICY spec_documents_delete ON public.spec_documents
    FOR DELETE USING (
        public.get_user_role_level() <= 10  -- Admin/Executive only
    );

-- Divisions, sections, subsections, chunks, tables: Inherit from document
DROP POLICY IF EXISTS spec_divisions_select ON public.spec_divisions;
CREATE POLICY spec_divisions_select ON public.spec_divisions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.spec_documents d
            WHERE d.id = document_id
            AND (d.organization_id IS NULL OR d.organization_id = public.get_user_organization_id())
        )
    );

DROP POLICY IF EXISTS spec_sections_select ON public.spec_sections;
CREATE POLICY spec_sections_select ON public.spec_sections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.spec_documents d
            WHERE d.id = document_id
            AND (d.organization_id IS NULL OR d.organization_id = public.get_user_organization_id())
        )
    );

DROP POLICY IF EXISTS spec_subsections_select ON public.spec_subsections;
CREATE POLICY spec_subsections_select ON public.spec_subsections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.spec_sections s
            JOIN public.spec_documents d ON d.id = s.document_id
            WHERE s.id = section_id
            AND (d.organization_id IS NULL OR d.organization_id = public.get_user_organization_id())
        )
    );

DROP POLICY IF EXISTS spec_chunks_select ON public.spec_chunks;
CREATE POLICY spec_chunks_select ON public.spec_chunks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.spec_documents d
            WHERE d.id = document_id
            AND (d.organization_id IS NULL OR d.organization_id = public.get_user_organization_id())
        )
    );

DROP POLICY IF EXISTS spec_tables_select ON public.spec_tables;
CREATE POLICY spec_tables_select ON public.spec_tables
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.spec_sections s
            JOIN public.spec_documents d ON d.id = s.document_id
            WHERE s.id = section_id
            AND (d.organization_id IS NULL OR d.organization_id = public.get_user_organization_id())
        )
    );

DROP POLICY IF EXISTS spec_item_links_select ON public.spec_item_links;
CREATE POLICY spec_item_links_select ON public.spec_item_links
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.spec_documents d
            WHERE d.id = document_id
            AND (d.organization_id IS NULL OR d.organization_id = public.get_user_organization_id())
        )
    );

-- Query logs: Users can see their own logs
DROP POLICY IF EXISTS spec_query_log_select ON public.spec_query_log;
CREATE POLICY spec_query_log_select ON public.spec_query_log
    FOR SELECT USING (
        user_id = auth.uid()
        OR public.get_user_role_level() <= 10  -- Admins see all
    );

DROP POLICY IF EXISTS spec_query_log_insert ON public.spec_query_log;
CREATE POLICY spec_query_log_insert ON public.spec_query_log
    FOR INSERT WITH CHECK (true);  -- Anyone can log queries

-- Service role policies for backend processing
DROP POLICY IF EXISTS spec_divisions_service ON public.spec_divisions;
CREATE POLICY spec_divisions_service ON public.spec_divisions
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS spec_sections_service ON public.spec_sections;
CREATE POLICY spec_sections_service ON public.spec_sections
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS spec_subsections_service ON public.spec_subsections;
CREATE POLICY spec_subsections_service ON public.spec_subsections
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS spec_chunks_service ON public.spec_chunks;
CREATE POLICY spec_chunks_service ON public.spec_chunks
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS spec_tables_service ON public.spec_tables;
CREATE POLICY spec_tables_service ON public.spec_tables
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS spec_item_links_service ON public.spec_item_links;
CREATE POLICY spec_item_links_service ON public.spec_item_links
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.spec_documents IS 'Track WVDOH specification document versions and processing status';
COMMENT ON TABLE public.spec_divisions IS 'Top-level specification groupings (100, 200, 300, etc.)';
COMMENT ON TABLE public.spec_sections IS 'Major sections within divisions (601, 602, 636)';
COMMENT ON TABLE public.spec_subsections IS 'Detailed articles within sections (601.1, 601.8.4)';
COMMENT ON TABLE public.spec_chunks IS 'AI retrieval units with vector embeddings for semantic search';
COMMENT ON TABLE public.spec_tables IS 'Structured table data extracted from specifications';
COMMENT ON TABLE public.spec_item_links IS 'Map WVDOH pay item codes to specification sections';
COMMENT ON TABLE public.spec_query_log IS 'Track specification queries for analytics';

COMMENT ON FUNCTION public.search_specs IS 'Semantic search across specification chunks using vector similarity';
COMMENT ON FUNCTION public.get_item_specs IS 'Get all specification content for a WVDOH pay item number';
COMMENT ON FUNCTION public.get_related_sections IS 'Find sections related to a given section via cross-references';
