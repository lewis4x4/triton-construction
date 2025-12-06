# Specification Knowledge Base Architecture

A complete guide to building a document parsing, embedding, and AI-powered RAG (Retrieval Augmented Generation) query system using Supabase, pgvector, OpenAI, and Claude.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Database Schema](#database-schema)
3. [Document Upload & Storage](#document-upload--storage)
4. [PDF Parsing Pipeline](#pdf-parsing-pipeline)
5. [Embedding Generation](#embedding-generation)
6. [Semantic Search & RAG Query](#semantic-search--rag-query)
7. [Frontend Integration](#frontend-integration)
8. [Environment Variables](#environment-variables)
9. [Complete Code Examples](#complete-code-examples)

---

## System Overview

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                                  │
│   [Upload PDF] ──► [View Status] ──► [Search/Query] ──► [View Results]     │
└───────────────────────────────────────────────────────────────────────────────┘
         │                                       │
         ▼                                       ▼
┌─────────────────────┐              ┌─────────────────────────────────────────┐
│  SUPABASE STORAGE   │              │           EDGE FUNCTION                 │
│   spec-documents/   │              │           spec-query                    │
│   └─ {docId}/      │              │  1. Generate query embedding (OpenAI)   │
│       └─ file.pdf   │              │  2. Vector similarity search (pgvector) │
└─────────────────────┘              │  3. AI synthesis (Claude)               │
         │                           │  4. Return answer + sources             │
         ▼                           └─────────────────────────────────────────┘
┌─────────────────────┐                          ▲
│   EDGE FUNCTION     │                          │
│   parse-spec-pdf    │              ┌───────────┴───────────┐
│  1. Download PDF    │              │   SUPABASE DATABASE   │
│  2. Extract text    │              │                       │
│     (Parseur/Azure) │              │  ┌─────────────────┐  │
│  3. Parse structure │   inserts    │  │ spec_documents  │  │
│  4. Create chunks   │ ──────────►  │  │ spec_divisions  │  │
│  5. Store in DB     │              │  │ spec_sections   │  │
└─────────────────────┘              │  │ spec_subsections│  │
         │                           │  │ spec_chunks     │◄─┼─── Vector Search
         ▼                           │  │   (embedding)   │  │
┌─────────────────────┐              │  └─────────────────┘  │
│   EDGE FUNCTION     │              │                       │
│ generate-embeddings │              └───────────────────────┘
│  1. Fetch chunks    │
│  2. Call OpenAI     │
│  3. Update vectors  │
└─────────────────────┘
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Database | Supabase (PostgreSQL) | Data storage, RLS |
| Vector Storage | pgvector extension | Embedding similarity search |
| File Storage | Supabase Storage | PDF files |
| PDF Extraction | Parseur.com / Azure Document AI | Text extraction from PDFs |
| Embeddings | OpenAI text-embedding-3-small | 1536-dimension vectors |
| AI Synthesis | Claude (claude-3-haiku) | Answer generation |
| Edge Functions | Deno (Supabase Edge Functions) | Serverless processing |

---

## Database Schema

### Enable pgvector Extension

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Core Tables

#### 1. spec_documents (Document Registry)

```sql
CREATE TABLE public.spec_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Document metadata
    document_type TEXT NOT NULL DEFAULT 'STANDARD_SPECS',
    title TEXT NOT NULL,
    version_year INTEGER NOT NULL,
    edition TEXT,

    -- Source tracking
    source_file_path TEXT,           -- Path in Supabase Storage
    file_hash TEXT,                  -- SHA-256 for deduplication

    -- Processing status
    processing_status TEXT NOT NULL DEFAULT 'PENDING',
    -- PENDING → EXTRACTING → PARSING → CHUNKING → EMBEDDING → COMPLETED/FAILED
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
    created_by UUID REFERENCES auth.users(id)
);
```

#### 2. spec_divisions (Top-Level Groupings)

```sql
CREATE TABLE public.spec_divisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.spec_documents(id) ON DELETE CASCADE,

    division_number INTEGER NOT NULL,  -- 100, 200, 300, etc.
    title TEXT NOT NULL,
    description TEXT,

    start_page INTEGER,
    end_page INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_division UNIQUE (document_id, division_number)
);
```

#### 3. spec_sections (Major Sections)

```sql
CREATE TABLE public.spec_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.spec_documents(id) ON DELETE CASCADE,
    division_id UUID NOT NULL REFERENCES public.spec_divisions(id) ON DELETE CASCADE,

    section_number TEXT NOT NULL,      -- "601", "636"
    title TEXT NOT NULL,
    description TEXT,

    full_text TEXT,                    -- Complete section text for full-text search

    start_page INTEGER,
    end_page INTEGER,

    related_pay_items TEXT[],          -- ["601-01", "601-02"]
    sort_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_section UNIQUE (document_id, section_number)
);

-- Full-text search index
CREATE INDEX idx_spec_sections_fulltext ON public.spec_sections
    USING GIN (to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(full_text, '')));
```

#### 4. spec_subsections (Detailed Articles)

```sql
CREATE TABLE public.spec_subsections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES public.spec_sections(id) ON DELETE CASCADE,
    parent_subsection_id UUID REFERENCES public.spec_subsections(id) ON DELETE CASCADE,

    subsection_number TEXT NOT NULL,   -- "601.1", "601.8.4"
    title TEXT,
    content TEXT NOT NULL,

    hierarchy_level INTEGER NOT NULL DEFAULT 1,
    cross_references TEXT[],           -- ["Section 702", "AASHTO M85"]
    page_number INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 5. spec_chunks (AI Retrieval Units with Embeddings)

```sql
CREATE TABLE public.spec_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.spec_documents(id) ON DELETE CASCADE,
    section_id UUID REFERENCES public.spec_sections(id) ON DELETE CASCADE,
    subsection_id UUID REFERENCES public.spec_subsections(id) ON DELETE SET NULL,

    -- Chunk identification
    chunk_type TEXT NOT NULL,          -- SECTION_HEADER, REQUIREMENT, PROCEDURE, etc.
    chunk_index INTEGER NOT NULL,      -- Order within document

    -- Content
    content TEXT NOT NULL,             -- The chunk text (200-500 tokens)
    content_tokens INTEGER,            -- Token count

    -- Context (improves retrieval quality)
    section_context TEXT,              -- "Section 601 - Concrete > 601.8 Measurement"

    -- Vector embedding (OpenAI text-embedding-3-small = 1536 dimensions)
    embedding vector(1536),

    -- Metadata for filtering
    pay_item_codes TEXT[],
    keywords TEXT[],
    page_number INTEGER,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_chunk UNIQUE (document_id, chunk_index)
);

-- Vector similarity index (IVFFlat for larger datasets)
CREATE INDEX idx_spec_chunks_embedding ON public.spec_chunks
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Pay item filter index
CREATE INDEX idx_spec_chunks_pay_items ON public.spec_chunks USING GIN (pay_item_codes);
```

#### 6. spec_query_log (Analytics)

```sql
CREATE TABLE public.spec_query_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id),
    user_id UUID REFERENCES auth.users(id),

    query_text TEXT NOT NULL,
    query_embedding vector(1536),

    result_count INTEGER,
    top_chunk_ids UUID[],
    response_text TEXT,

    was_helpful BOOLEAN,
    feedback_text TEXT,
    query_time_ms INTEGER,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Semantic Search Function

```sql
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
    chunk_type TEXT,
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
        c.chunk_type::TEXT,
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
```

---

## Document Upload & Storage

### Supabase Storage Bucket

Create a storage bucket for specification documents:

```sql
-- Create bucket (run in Supabase dashboard or via API)
INSERT INTO storage.buckets (id, name, public)
VALUES ('spec-documents', 'spec-documents', false);

-- Storage policies
CREATE POLICY "Authenticated users can upload spec docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'spec-documents');

CREATE POLICY "Authenticated users can read spec docs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'spec-documents');
```

### Upload Flow (Frontend)

```typescript
// 1. Create document record in database
const { data: docRecord, error: docError } = await supabase
  .from('spec_documents')
  .insert({
    title: 'WVDOH Standard Specifications 2023',
    document_type: 'STANDARD_SPECS',
    version_year: 2023,
    processing_status: 'PENDING',
    created_by: userId,
  })
  .select()
  .single();

// 2. Upload file to storage
const filePath = `specs/${docRecord.id}/${file.name}`;
const { error: storageError } = await supabase.storage
  .from('spec-documents')
  .upload(filePath, file, {
    contentType: 'application/pdf',
  });

// 3. Update document with file path
await supabase
  .from('spec_documents')
  .update({ source_file_path: filePath })
  .eq('id', docRecord.id);

// 4. Trigger processing
await fetch(`${SUPABASE_URL}/functions/v1/parse-spec-pdf`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  },
  body: JSON.stringify({ documentId: docRecord.id }),
});
```

---

## PDF Parsing Pipeline

### Edge Function: parse-spec-pdf

This function handles the complete parsing pipeline:

1. **Download PDF** from Supabase Storage
2. **Extract text** using Parseur or Azure Document AI
3. **Parse structure** (divisions, sections, subsections)
4. **Create chunks** for semantic search
5. **Store everything** in the database

#### Key Processing Steps

```typescript
// Status progression
// PENDING → EXTRACTING → PARSING → CHUNKING → COMPLETED

// 1. Download PDF from storage
const { data: fileData } = await supabaseAdmin.storage
  .from('spec-documents')
  .download(document.source_file_path);

// 2. Extract text (using Parseur or Azure)
const extractedText = await extractPdfText(fileData);

// 3. Parse document structure
const { divisions, sections, subsections } = parseDocumentStructure(extractedText);

// 4. Insert into database (divisions → sections → subsections → chunks)
for (const div of divisions) {
  const { data: divRecord } = await supabaseAdmin
    .from('spec_divisions')
    .insert({ document_id: documentId, ...div })
    .select()
    .single();
}

// 5. Create chunks for semantic search
for (const section of sections) {
  const chunks = createChunks(section, subsections);

  for (const chunk of chunks) {
    await supabaseAdmin
      .from('spec_chunks')
      .insert({
        document_id: documentId,
        section_id: section.id,
        chunk_type: chunk.chunkType,
        content: chunk.content,
        section_context: chunk.sectionContext,
        pay_item_codes: chunk.payItemCodes,
        keywords: chunk.keywords,
      });
  }
}
```

#### Text Extraction Services

**Option 1: Parseur.com** (Recommended for large PDFs)

```typescript
async function extractWithParseur(pdfArrayBuffer, apiKey, mailboxId) {
  // Upload PDF
  const formData = new FormData();
  formData.append('file', new Blob([pdfArrayBuffer], { type: 'application/pdf' }));

  const uploadResponse = await fetch(
    `https://api.parseur.com/parser/${mailboxId}/upload`,
    {
      method: 'POST',
      headers: { 'Authorization': `Token ${apiKey}` },
      body: formData,
    }
  );

  const { attachments } = await uploadResponse.json();

  // Poll for completion
  for (const attachment of attachments) {
    let status = 'PENDING';
    while (status !== 'PARSEDOK') {
      await sleep(2000);
      const doc = await fetch(`https://api.parseur.com/document/${attachment.DocumentID}`, {
        headers: { 'Authorization': `Token ${apiKey}` },
      }).then(r => r.json());
      status = doc.status;
    }
  }

  return extractedText;
}
```

**Option 2: Azure Document Intelligence**

```typescript
async function extractWithAzure(pdfArrayBuffer, endpoint, apiKey) {
  // Submit for analysis
  const analyzeUrl = `${endpoint}/formrecognizer/documentModels/prebuilt-read:analyze?api-version=2023-07-31`;

  const submitResponse = await fetch(analyzeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/pdf',
      'Ocp-Apim-Subscription-Key': apiKey,
    },
    body: pdfArrayBuffer,
  });

  const operationLocation = submitResponse.headers.get('Operation-Location');

  // Poll for results
  let result;
  while (true) {
    await sleep(1000);
    result = await fetch(operationLocation, {
      headers: { 'Ocp-Apim-Subscription-Key': apiKey },
    }).then(r => r.json());

    if (result.status === 'succeeded') break;
  }

  return result.analyzeResult.content;
}
```

#### Chunking Strategy

```typescript
function createChunks(section, subsections) {
  const chunks = [];
  const MAX_CHUNK_SIZE = 500; // tokens

  // Section header chunk
  chunks.push({
    chunkType: 'SECTION_HEADER',
    content: `Section ${section.sectionNumber} - ${section.title}`,
    sectionContext: `Section ${section.sectionNumber} - ${section.title}`,
  });

  // Subsection chunks
  for (const subsection of subsections) {
    const chunkType = determineChunkType(subsection); // MEASUREMENT, PAYMENT, etc.

    // Split large content into smaller chunks
    if (estimateTokenCount(subsection.content) > MAX_CHUNK_SIZE) {
      const paragraphs = subsection.content.split(/\n\n+/);
      // ... split logic
    } else {
      chunks.push({
        chunkType,
        content: subsection.content,
        sectionContext: `Section ${section.sectionNumber} > ${subsection.subsectionNumber}`,
      });
    }
  }

  return chunks;
}

function determineChunkType(subsection) {
  const title = subsection.title.toLowerCase();
  const content = subsection.content.toLowerCase();

  if (title.includes('measurement')) return 'MEASUREMENT';
  if (title.includes('payment')) return 'PAYMENT';
  if (title.includes('material')) return 'MATERIAL_SPEC';
  if (title.includes('construction')) return 'PROCEDURE';
  return 'REQUIREMENT';
}
```

---

## Embedding Generation

### Edge Function: generate-spec-embeddings

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const BATCH_SIZE = 100;

serve(async (req) => {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  );

  const { documentId, forceRegenerate = false } = await req.json();

  // Fetch chunks needing embeddings
  let query = supabaseAdmin
    .from('spec_chunks')
    .select('id, content, section_context');

  if (documentId) query = query.eq('document_id', documentId);
  if (!forceRegenerate) query = query.is('embedding', null);

  const { data: chunks } = await query;

  // Process in batches
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);

    // Prepare texts (include context for better retrieval)
    const texts = batch.map(chunk =>
      `${chunk.section_context || ''}\n\n${chunk.content}`.trim()
    );

    // Call OpenAI
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        input: texts,
        model: EMBEDDING_MODEL,
        dimensions: 1536,
      }),
    });

    const { data: embeddings } = await response.json();

    // Update chunks with embeddings
    for (const { index, embedding } of embeddings) {
      const embeddingVector = `[${embedding.join(',')}]`;

      await supabaseAdmin
        .from('spec_chunks')
        .update({ embedding: embeddingVector })
        .eq('id', batch[index].id);
    }
  }

  return new Response(JSON.stringify({ success: true }));
});
```

---

## Semantic Search & RAG Query

### Edge Function: spec-query

This is the main query endpoint that:
1. Generates an embedding for the user's question
2. Performs vector similarity search
3. Uses Claude to synthesize an answer from retrieved chunks

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const EMBEDDING_MODEL = 'text-embedding-3-small';

interface QueryRequest {
  query: string;
  payItemCode?: string;
  maxResults?: number;
  includeAISynthesis?: boolean;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

serve(async (req) => {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  );

  const {
    query,
    payItemCode,
    maxResults = 5,
    includeAISynthesis = true,
    conversationHistory = [],
  }: QueryRequest = await req.json();

  // 1. Generate embedding for query
  const embeddingResponse = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      input: query,
      model: EMBEDDING_MODEL,
      dimensions: 1536,
    }),
  });

  const { data: [{ embedding: queryEmbedding }] } = await embeddingResponse.json();
  const queryEmbeddingVector = `[${queryEmbedding.join(',')}]`;

  // 2. Vector similarity search
  const { data: chunks } = await supabaseAdmin.rpc('search_specs', {
    query_embedding: queryEmbeddingVector,
    match_threshold: 0.6,
    match_count: maxResults,
    filter_pay_items: payItemCode ? [payItemCode] : null,
  });

  // 3. AI synthesis with Claude
  let answer;
  if (includeAISynthesis && anthropicApiKey && chunks.length > 0) {
    answer = await generateAISynthesis(
      anthropicApiKey,
      query,
      chunks,
      conversationHistory
    );
  }

  return new Response(JSON.stringify({
    success: true,
    query,
    answer,
    chunks,
    relatedSections: [...new Set(chunks.map(c => c.section_number))],
  }));
});

async function generateAISynthesis(apiKey, query, chunks, conversationHistory) {
  // Prepare context from retrieved chunks
  const contextParts = chunks.map((chunk, i) =>
    `[Source ${i + 1}: ${chunk.section_context}]\n${chunk.content}`
  );

  const systemPrompt = `You are an expert assistant for construction specifications.
Your role is to help engineers understand specification requirements.

When answering questions:
1. Be precise and cite the relevant section numbers
2. Use technical terminology appropriately
3. If measurement or payment methods are mentioned, highlight them
4. If the information is not in the provided context, say so clearly

Keep answers concise but complete.`;

  const userPrompt = `Based on the following specification excerpts, answer this question:

Question: ${query}

Specification Context:
${contextParts.join('\n\n---\n\n')}

Provide a clear, concise answer citing the relevant sections.`;

  // Build messages with conversation history
  const messages = [
    ...conversationHistory.slice(-6).map(msg => ({
      role: msg.role,
      content: msg.content,
    })),
    { role: 'user', content: userPrompt },
  ];

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
  });

  const { content } = await response.json();
  return content[0]?.text || '';
}
```

---

## Frontend Integration

### React Component Example

```typescript
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  chunks?: ChunkResult[];
}

export function SpecSearch() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const performSearch = useCallback(async () => {
    if (!query.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query.trim(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsSearching(true);
    setQuery('');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Build conversation history
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/spec-query`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            query: userMessage.content,
            maxResults: 5,
            includeAISynthesis: true,
            conversationHistory,
          }),
        }
      );

      const data = await response.json();

      // Add assistant response
      setMessages(prev => [...prev, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer || 'No answer available.',
        chunks: data.chunks,
      }]);

    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  }, [query, messages]);

  return (
    <div className="spec-search">
      {/* Messages */}
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="content">{msg.content}</div>
            {msg.chunks && (
              <div className="sources">
                {msg.chunks.map(chunk => (
                  <div key={chunk.chunk_id} className="source">
                    Section {chunk.section_number}: {chunk.section_title}
                    ({Math.round(chunk.similarity * 100)}% match)
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="input-container">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question about specifications..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              performSearch();
            }
          }}
        />
        <button onClick={performSearch} disabled={isSearching}>
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </div>
    </div>
  );
}
```

---

## Environment Variables

### Required Environment Variables

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenAI (for embeddings)
OPENAI_API_KEY=sk-...

# Anthropic (for AI synthesis)
ANTHROPIC_API_KEY=sk-ant-...

# PDF Extraction (choose one or both)
# Option 1: Parseur
PARSEUR_API_KEY=your-parseur-api-key
PARSEUR_MAILBOX_ID=your-mailbox-id

# Option 2: Azure Document Intelligence
AZURE_DOCUMENT_AI_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_DOCUMENT_AI_KEY=your-azure-key
```

### Frontend Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## Complete Code Examples

### Full Edge Function Files

The complete implementations are in:

- **PDF Parsing**: `supabase/functions/parse-spec-pdf/index.ts`
- **Embedding Generation**: `supabase/functions/generate-spec-embeddings/index.ts`
- **Query/Search**: `supabase/functions/spec-query/index.ts`

### Database Migration

The complete database schema is in:
- `supabase/migrations/026_spec_knowledge_base.sql`

### Key Design Decisions

1. **Chunk Size**: 200-500 tokens provides good retrieval without losing context
2. **Embedding Model**: `text-embedding-3-small` (1536 dimensions) balances quality/cost
3. **Similarity Threshold**: 0.6-0.7 works well for technical documents
4. **AI Model**: Claude Haiku for fast, cost-effective responses
5. **Context Inclusion**: Include `section_context` in embeddings for better retrieval
6. **Batch Processing**: Process embeddings in batches of 100 to handle large documents

---

## Summary

This system provides:

1. **Document Ingestion**: Upload PDFs → Extract text → Parse structure → Create chunks
2. **Vector Embeddings**: Generate 1536-dimension embeddings via OpenAI
3. **Semantic Search**: pgvector cosine similarity search with filters
4. **RAG Query**: Combine vector search with Claude for intelligent answers
5. **Conversation Context**: Support for multi-turn conversations

The architecture is designed to be:
- **Scalable**: Handles large documents (1000+ pages)
- **Accurate**: Vector similarity + AI synthesis
- **Cost-effective**: Haiku for responses, batch embeddings
- **Maintainable**: Clear separation of concerns
