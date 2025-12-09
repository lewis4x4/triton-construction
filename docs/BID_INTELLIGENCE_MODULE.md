# Bid Intelligence Module

## Complete Technical Documentation

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Data Flow Pipeline](#data-flow-pipeline)
4. [Edge Functions](#edge-functions)
5. [Database Schema](#database-schema)
6. [Usage Guide](#usage-guide)
7. [API Reference](#api-reference)
8. [Security Model](#security-model)
9. [UI Components](#ui-components)
10. [Best Practices](#best-practices)
11. [Conventions & Standards](#conventions--standards)
12. [Troubleshooting](#troubleshooting)
13. [Version History](#version-history)

---

## Overview

The **Bid Intelligence Module** is an AI-powered document analysis and risk assessment system designed specifically for WVDOH (West Virginia Department of Highways) construction bid packages. It automatically processes bid documents, extracts structured data, identifies risks, generates pre-bid questions, and creates executive summaries to help estimators make informed bid/no-bid decisions.

### Key Capabilities

| Feature | Description |
|---------|-------------|
| **Document Analysis** | AI-powered extraction of key information from PDFs, Bidx files, environmental reports, and hazmat surveys |
| **Risk Extraction** | Automated identification of project risks with severity ratings and mitigation strategies |
| **Pre-bid Question Generation** | AI-generated questions for clarification based on document ambiguities |
| **Work Package Generation** | Automatic grouping of line items into logical work packages |
| **Executive Snapshots** | Comprehensive AI summaries for leadership decision-making |
| **Line Item Categorization** | Matching bid items to WVDOH master item codes |

### Business Value

- **Time Savings**: Reduces document review time from hours to minutes
- **Risk Mitigation**: Identifies hidden risks that might be missed in manual review
- **Consistency**: Applies the same rigorous analysis to every bid package
- **Decision Support**: Provides data-driven go/no-go recommendations
- **Compliance**: Ensures WVDOH-specific requirements are identified

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ DocumentUpload│  │  BidDetail   │  │ WorkPackages │              │
│  │   Component   │  │    Page      │  │     Tab      │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
└─────────┼─────────────────┼─────────────────┼──────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Supabase Edge Functions                          │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐        │
│  │upload-bid-     │  │process-document│  │analyze-bid-    │        │
│  │document        │──▶│-queue          │──▶│document        │        │
│  └────────────────┘  └────────────────┘  └────────────────┘        │
│                                                                     │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐        │
│  │extract-project │  │generate-prebid │  │categorize-line │        │
│  │-risks          │  │-questions      │  │-items          │        │
│  └────────────────┘  └────────────────┘  └────────────────┘        │
│                                                                     │
│  ┌────────────────┐  ┌────────────────┐                            │
│  │generate-work-  │  │generate-       │                            │
│  │packages        │  │executive-snap  │                            │
│  └────────────────┘  └────────────────┘                            │
└─────────────────────────────────────────────────────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      External Services                              │
│  ┌────────────────┐  ┌────────────────┐                            │
│  │  Claude AI     │  │  Supabase      │                            │
│  │  (Anthropic)   │  │  Storage       │                            │
│  └────────────────┘  └────────────────┘                            │
└─────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Edge Functions | Deno (Supabase Edge Functions) |
| AI Provider | Anthropic Claude (claude-sonnet-4-20250514) |
| Database | PostgreSQL (Supabase) |
| Storage | Supabase Storage (bid-documents bucket) |
| Authentication | Supabase Auth + Row Level Security |

---

## Data Flow Pipeline

### Document Processing Flow

```
1. UPLOAD                2. QUEUE                 3. ANALYZE
┌──────────┐            ┌──────────┐            ┌──────────┐
│  User    │            │ Document │            │  Claude  │
│ uploads  │───────────▶│  Queue   │───────────▶│    AI    │
│  file    │            │ Processor│            │ Analysis │
└──────────┘            └──────────┘            └──────────┘
     │                       │                       │
     ▼                       ▼                       ▼
┌──────────┐            ┌──────────┐            ┌──────────┐
│ Storage  │            │ Status:  │            │ Extract  │
│  Bucket  │            │PROCESSING│            │ Findings │
└──────────┘            └──────────┘            └──────────┘
                                                     │
                                                     ▼
4. ENRICH                5. GENERATE              6. SUMMARIZE
┌──────────┐            ┌──────────┐            ┌──────────┐
│ Extract  │            │ Generate │            │ Executive│
│  Risks   │───────────▶│Questions │───────────▶│ Snapshot │
└──────────┘            └──────────┘            └──────────┘
     │                       │                       │
     ▼                       ▼                       ▼
┌──────────┐            ┌──────────┐            ┌──────────┐
│bid_project│           │bid_prebid│            │bid_exec_ │
│  _risks   │           │_questions│            │snapshots │
└──────────┘            └──────────┘            └──────────┘
```

### Automatic Triggering

When a document is uploaded:

1. **upload-bid-document** stores file and creates database record with `processing_status: 'PENDING'`
2. Automatically triggers **process-document-queue** (fire-and-forget)
3. Queue processor routes to appropriate handler:
   - `.xml` files → **parse-bidx** (extracts line items)
   - `.pdf` files → **analyze-bid-document** (AI analysis)
4. Database trigger sends `pg_notify` for real-time updates

---

## Edge Functions

### 1. upload-bid-document

**Purpose**: Securely upload bid documents to storage and create tracking records.

**Location**: `supabase/functions/upload-bid-document/index.ts`

**Input**:
```typescript
interface UploadRequest {
  bidProjectId: string;      // UUID of the bid project
  documentType: string;      // PROPOSAL, BIDX, PLANS, ENVIRONMENTAL, etc.
  fileName: string;          // Original filename
  fileContent: string;       // Base64 encoded file content
  mimeType: string;          // application/pdf, application/xml, etc.
}
```

**Process**:
1. Validates user authentication via session token
2. Verifies user has access to the bid project (RLS)
3. Validates document type and MIME type compatibility
4. Decodes and uploads file to `bid-documents` storage bucket
5. Creates record in `bid_documents` table
6. **Auto-triggers** `process-document-queue` for immediate processing

**Output**:
```json
{
  "success": true,
  "document": {
    "id": "uuid",
    "fileName": "proposal.pdf",
    "filePath": "project-id/timestamp_proposal.pdf",
    "documentType": "PROPOSAL",
    "processingStatus": "PENDING"
  },
  "processingTriggered": true,
  "message": "Document uploaded successfully. AI processing has been triggered."
}
```

**Supported Document Types**:

| Type | Accepted MIME Types | Description |
|------|---------------------|-------------|
| PROPOSAL | application/pdf | Main bid proposal document |
| BIDX | application/xml, text/xml | Bidx XML with line items |
| PLANS | application/pdf, image/tiff | Construction plans |
| ENVIRONMENTAL | application/pdf | Environmental permits/commitments |
| HAZMAT | application/pdf | Hazardous materials report |
| GEOTECHNICAL | application/pdf | Geotech/boring logs |
| SPECIAL_PROVISIONS | application/pdf | Special provisions document |
| ADDENDUM | application/pdf | Bid addendum |

---

### 2. process-document-queue

**Purpose**: Batch processor that routes documents to appropriate analysis functions.

**Location**: `supabase/functions/process-document-queue/index.ts`

**Input**:
```typescript
interface QueueRequest {
  documentIds?: string[];  // Specific documents to process (optional)
  batchSize?: number;      // Max documents per batch (default: 10)
}
```

**Process**:
1. Fetches documents with `processing_status: 'PENDING'`
2. For each document:
   - Downloads from storage
   - Routes based on type:
     - **BIDX** → Calls `parse-bidx` function
     - **PDF** → Calls `analyze-bid-document` function
   - Updates status to `COMPLETED` or `FAILED`

**Output**:
```json
{
  "message": "Processed 3 documents",
  "success": 3,
  "failed": 0,
  "results": [
    {
      "documentId": "uuid-1",
      "success": true,
      "message": "AI analysis completed: 12 key findings extracted"
    }
  ]
}
```

---

### 3. analyze-bid-document

**Purpose**: AI-powered document analysis using Claude to extract structured data.

**Location**: `supabase/functions/analyze-bid-document/index.ts`

**Input**:
```typescript
interface AnalysisRequest {
  document_id: string;
  analysis_type?: 'FULL_EXTRACTION' | 'QUICK_SCAN' | 'TARGETED';
  target_fields?: string[];  // For TARGETED analysis
}
```

**Process**:
1. Authenticates user OR validates service role (for internal calls)
2. Downloads document from storage
3. Converts to base64 for Claude API
4. Selects appropriate system prompt based on document type:
   - **PROPOSAL**: Extracts project IDs, dates, requirements, DBE goals
   - **ENVIRONMENTAL**: Extracts wetlands, species, timing restrictions
   - **HAZMAT**: Extracts asbestos locations, lead paint, disposal requirements
   - **GEOTECHNICAL**: Extracts soil conditions, groundwater, foundation recommendations
5. Sends to Claude with document content
6. Parses JSON response and stores in database

**Document-Specific Extractions**:

**PROPOSAL Documents**:
```json
{
  "extracted_data": {
    "state_project_number": "S331-79-12.93",
    "federal_aid_number": "BR-0079(123)D",
    "county": "Kanawha",
    "route": "US-79",
    "letting_date": "2024-03-15",
    "working_days": 180,
    "liquidated_damages_per_day": 1500,
    "dbe_goal_percentage": 8.5,
    "is_federal_aid": true,
    "special_provisions": ["Night work required", "Stream crossing restrictions"],
    "required_certifications": ["OSHA 30", "Flagger certification"]
  }
}
```

**ENVIRONMENTAL Documents**:
```json
{
  "extracted_data": {
    "wetland_acres": 2.3,
    "stream_linear_feet": 450,
    "endangered_species": ["Indiana Bat", "Virginia Big-eared Bat"],
    "timing_restrictions": [
      {
        "restriction": "No tree clearing",
        "start_date": "04-01",
        "end_date": "09-30",
        "reason": "Bat roosting season"
      }
    ],
    "permits_required": ["Section 404", "NPDES"],
    "environmental_commitments": [
      "E-1: Install sediment barriers before clearing",
      "E-2: Maintain 50ft buffer from streams"
    ]
  }
}
```

**Output**:
```json
{
  "success": true,
  "document_id": "uuid",
  "analysis": {
    "summary": "Federal-aid bridge replacement project on US-79...",
    "document_category": "BID_PROPOSAL",
    "key_findings": [
      {
        "type": "REQUIREMENT",
        "title": "DBE Goal 8.5%",
        "description": "Project requires 8.5% DBE participation...",
        "severity": "MEDIUM",
        "page_reference": "Page 12"
      }
    ],
    "extracted_data": { ... },
    "confidence_score": 87
  },
  "duration_ms": 4523,
  "usage": { "input_tokens": 12500, "output_tokens": 2100 }
}
```

---

### 4. extract-project-risks

**Purpose**: Analyzes all project documents to identify and categorize risks.

**Location**: `supabase/functions/extract-project-risks/index.ts`

**Input**:
```typescript
interface ExtractRequest {
  bid_project_id: string;
  force_refresh?: boolean;  // Re-extract even if risks exist
}
```

**Process**:
1. Authenticates user and verifies project access
2. Retrieves all analyzed documents for the project
3. Builds context from document summaries and key findings
4. Sends to Claude with comprehensive risk extraction prompt
5. Validates and inserts risks into `bid_project_risks` table

**Risk Categories**:

| Category | Description | Examples |
|----------|-------------|----------|
| SCOPE | Unclear scope, undefined work | Missing specifications, ambiguous quantities |
| QUANTITY | Quantity uncertainties | Unbalanced items, potential overruns |
| SITE_CONDITIONS | Unknown conditions | Geotechnical issues, existing utilities |
| ENVIRONMENTAL | Permits and restrictions | Wetlands, endangered species |
| MOT | Traffic control complexity | Night work, lane closures, phasing |
| SCHEDULE | Timing constraints | Tight deadlines, weather windows |
| REGULATORY | Compliance requirements | Permits, inspections, certifications |
| SUBCONTRACTOR | Specialty work issues | DBE requirements, prequalification |
| MATERIAL | Material concerns | Availability, lead times, price volatility |
| WEATHER | Weather-sensitive work | Seasonal limitations, weather days |
| HAZMAT | Hazardous materials | Asbestos, lead, contamination |
| CONSTRUCTABILITY | Means/methods issues | Access problems, staging complexity |

**Output**:
```json
{
  "success": true,
  "bid_project_id": "uuid",
  "risks_count": 15,
  "risks_by_severity": {
    "critical": 1,
    "high": 4,
    "medium": 6,
    "low": 4
  },
  "risks_by_category": {
    "ENVIRONMENTAL": 3,
    "SCHEDULE": 2,
    "SITE_CONDITIONS": 2,
    ...
  },
  "prebid_questions_recommended": 5,
  "risks": [
    {
      "id": "uuid",
      "risk_number": "R-001",
      "title": "Bat Roosting Season Restriction",
      "category": "ENVIRONMENTAL",
      "overall_severity": "HIGH"
    }
  ]
}
```

**Risk Record Structure**:
```typescript
interface ProjectRisk {
  risk_number: string;           // R-001, R-002, etc.
  title: string;                 // Short descriptive title
  description: string;           // Detailed risk description
  category: RiskCategory;        // From enum above
  probability: Severity;         // LOW, MEDIUM, HIGH, CRITICAL
  cost_impact: Severity;
  schedule_impact: Severity;
  overall_severity: Severity;
  estimated_cost_impact_low?: number;   // Dollar estimate
  estimated_cost_impact_high?: number;
  estimated_schedule_impact_days?: number;
  mitigation_strategy?: string;
  contingency_recommended: boolean;
  contingency_percentage?: number;      // e.g., 5 for 5%
  prebid_question_recommended: boolean;
  suggested_question?: string;
  ai_confidence: number;         // 0-100
  ai_reasoning: string;
}
```

---

### 5. generate-prebid-questions

**Purpose**: Generates professional pre-bid questions based on document ambiguities and risks.

**Location**: `supabase/functions/generate-prebid-questions/index.ts`

**Input**:
```typescript
interface GenerateRequest {
  bid_project_id: string;
  force_refresh?: boolean;
  include_risk_questions?: boolean;  // Include questions from risks
}
```

**Process**:
1. Authenticates user and verifies project access
2. Retrieves:
   - All analyzed documents with summaries
   - Extracted risks (especially those recommending questions)
   - Line items for context
3. Sends to Claude with WVDOH pre-bid question best practices
4. Validates and inserts questions into `bid_prebid_questions` table

**Question Best Practices Applied**:
- Be specific - reference exact plan sheets, spec sections
- Be professional - answerable with yes/no or clarification
- Avoid asking for free engineering
- Focus on bid-impacting items

**Output**:
```json
{
  "success": true,
  "bid_project_id": "uuid",
  "questions_count": 12,
  "questions_by_priority": {
    "high": 3,
    "medium": 6,
    "low": 3
  },
  "questions_by_category": {
    "SCOPE": 2,
    "QUANTITY": 3,
    "ENVIRONMENTAL": 2,
    ...
  },
  "questions": [
    {
      "id": "uuid",
      "question_number": "Q-001",
      "question_text": "Per Special Provision SP-1.2.3, is the contractor responsible for...",
      "category": "SCOPE"
    }
  ],
  "deadline": "2024-02-28"
}
```

**Question Record Structure**:
```typescript
interface PrebidQuestion {
  question_number: string;     // Q-001, Q-002, etc.
  question_text: string;       // Professional question text
  justification: string;       // Why this question is important
  category: RiskCategory;
  status: 'AI_SUGGESTED' | 'PENDING' | 'SUBMITTED' | 'ANSWERED';
  source_page_numbers?: string;
  ai_generated: boolean;
  ai_confidence: number;
  original_ai_text: string;    // Preserved even if manually edited
}
```

---

### 6. categorize-line-items

**Purpose**: Matches bid line items to WVDOH master item codes and assigns work categories.

**Location**: `supabase/functions/categorize-line-items/index.ts`

**Input**:
```typescript
interface CategorizeRequest {
  bid_project_id: string;
  force_recategorize?: boolean;
  batch_size?: number;  // Default: 50
}
```

**Process**:
1. Authenticates user and verifies project access
2. Retrieves uncategorized line items (work_category IS NULL)
3. Retrieves WVDOH master items for matching context
4. Sends batches to Claude for categorization
5. Updates line items with:
   - `work_category` (work type classification)
   - `wvdoh_master_item_id` (matched master item)
   - `ai_suggested_unit_price` (historical pricing estimate)

**Work Categories**:

| Category | Description |
|----------|-------------|
| EARTHWORK | Excavation, embankment, grading |
| DRAINAGE | Culverts, pipes, inlets, ditches |
| PAVING | Asphalt, concrete, base courses |
| STRUCTURES | Bridges, retaining walls, box culverts |
| SIGNING_STRIPING | Signs, pavement markings, delineators |
| TRAFFIC_CONTROL | MOT, flagging, barriers |
| UTILITIES | Relocations, adjustments |
| ENVIRONMENTAL | Erosion control, seeding, restoration |
| CONCRETE | Sidewalks, curbs, flatwork |
| DEMOLITION | Removal, disposal |
| LANDSCAPING | Planting, mulching |
| ELECTRICAL | Lighting, signals |
| MISCELLANEOUS | Mobilization, cleanup, other |

**Output**:
```json
{
  "success": true,
  "bid_project_id": "uuid",
  "items_categorized": 127,
  "items_skipped": 0,
  "categories_assigned": {
    "EARTHWORK": 23,
    "DRAINAGE": 18,
    "PAVING": 34,
    "STRUCTURES": 12,
    ...
  },
  "master_items_matched": 98,
  "duration_ms": 8234
}
```

---

### 7. generate-work-packages

**Purpose**: Groups line items into logical work packages for estimating and scheduling.

**Location**: `supabase/functions/generate-work-packages/index.ts`

**Input**:
```typescript
interface WorkPackageRequest {
  bid_project_id: string;
  regenerate?: boolean;      // Delete existing and regenerate
  use_ai_grouping?: boolean; // Use AI for intelligent grouping
}
```

**Process**:
1. Authenticates user and verifies project access
2. Retrieves all categorized line items
3. Either:
   - **AI Grouping**: Claude analyzes items and suggests logical packages
   - **Simple Grouping**: Groups by work_category
4. Creates work packages and assigns line items

**Output**:
```json
{
  "success": true,
  "bid_project_id": "uuid",
  "packages_created": 8,
  "packages": [
    {
      "id": "uuid",
      "package_number": 1,
      "package_name": "Site Preparation & Earthwork",
      "package_code": "WP-001",
      "work_category": "EARTHWORK",
      "total_items": 23
    }
  ],
  "items_assigned": 127,
  "duration_ms": 3421
}
```

---

### 8. generate-executive-snapshot

**Purpose**: Creates comprehensive AI-generated executive summary for bid decisions.

**Location**: `supabase/functions/generate-executive-snapshot/index.ts`

**Input**:
```typescript
interface SnapshotRequest {
  bid_project_id: string;
  force_regenerate?: boolean;  // Create new version even if current exists
}
```

**Process**:
1. Authenticates user and verifies project access
2. Aggregates all project data in parallel:
   - Project details
   - Document summaries
   - Line items with pricing
   - Risks by severity
   - Pre-bid questions
   - Environmental commitments
   - Hazmat findings
   - Work packages
   - Site conditions
3. Calculates metrics (totals, counts, estimated value)
4. Sends comprehensive context to Claude
5. Parses structured sections
6. Stores as versioned snapshot

**Generated Sections**:

| Section | Content |
|---------|---------|
| `project_overview` | 2-3 paragraph overview of scope, location, key characteristics |
| `key_quantities_summary` | Major quantity items by category, cost drivers |
| `risk_summary` | Analysis of risk profile, critical/high risks first |
| `environmental_summary` | Environmental constraints, permits, seasonal restrictions |
| `schedule_summary` | Contract days, weather windows, critical path |
| `cost_considerations` | Cost drivers, pricing risks, contingency recommendations |
| `recommendations` | Go/no-go factors, management attention items, positioning |

**Output**:
```json
{
  "success": true,
  "bid_project_id": "uuid",
  "snapshot_id": "uuid",
  "version": 1,
  "snapshot_date": "2024-02-15",
  "metrics": {
    "total_line_items": 127,
    "total_estimated_value": 4500000,
    "critical_risks_count": 1,
    "high_risks_count": 4,
    "work_packages_count": 8,
    "environmental_commitments_count": 12,
    "hazmat_findings_count": 3,
    "prebid_questions_count": 15
  },
  "sections": [
    "project_overview",
    "key_quantities_summary",
    "risk_summary",
    "environmental_summary",
    "schedule_summary",
    "cost_considerations",
    "recommendations"
  ],
  "duration_ms": 12543
}
```

---

## Database Schema

### Core Tables

```sql
-- Bid Projects (parent table)
bid_projects
├── id (UUID, PK)
├── organization_id (FK)
├── project_name
├── state_project_number
├── county, route
├── letting_date, bid_due_date
├── status
└── ...

-- Uploaded Documents
bid_documents
├── id (UUID, PK)
├── bid_project_id (FK)
├── file_name, file_path
├── document_type
├── processing_status (PENDING, PROCESSING, COMPLETED, FAILED)
├── ai_summary
├── ai_key_findings (JSONB)
├── ai_analysis_metadata (JSONB)
├── ai_confidence_score
└── uploaded_by (FK to auth.users)

-- Extracted Risks
bid_project_risks
├── id (UUID, PK)
├── bid_project_id (FK)
├── risk_number (R-001, R-002, ...)
├── title, description
├── category, probability, cost_impact, schedule_impact
├── overall_severity
├── estimated_cost_impact_low/high
├── mitigation_strategy
├── prebid_question_recommended
├── suggested_question
├── ai_generated, ai_confidence, ai_reasoning
└── review_status

-- Pre-bid Questions
bid_prebid_questions
├── id (UUID, PK)
├── bid_project_id (FK)
├── question_number (Q-001, Q-002, ...)
├── question_text, justification
├── category
├── status (AI_SUGGESTED, PENDING, SUBMITTED, ANSWERED)
├── source_page_numbers
├── ai_generated, ai_confidence
└── original_ai_text

-- Line Items (from Bidx)
bid_line_items
├── id (UUID, PK)
├── bid_project_id (FK)
├── item_number, description
├── quantity, unit
├── work_category
├── wvdoh_master_item_id (FK)
├── ai_suggested_unit_price
├── work_package_id (FK)
└── ...

-- Work Packages
bid_work_packages
├── id (UUID, PK)
├── bid_project_id (FK)
├── package_number, package_name, package_code
├── work_category
├── status (PENDING, IN_PROGRESS, COMPLETE, REVIEWED)
└── ...

-- Executive Snapshots
bid_executive_snapshots
├── id (UUID, PK)
├── bid_project_id (FK)
├── version_number
├── snapshot_date
├── project_overview, key_quantities_summary
├── risk_summary, environmental_summary
├── schedule_summary, cost_considerations
├── recommendations
├── [metrics columns]
├── ai_model_used, generation_duration_ms
├── is_current, reviewed
└── superseded_by, superseded_at
```

### Views

```sql
-- Dashboard metrics aggregation
v_bid_project_dashboard
├── bid_project_id
├── total_line_items, items_reviewed
├── total_risks, high_critical_risks
├── total_questions, questions_submitted
├── total_documents, documents_processed
└── estimated_completion_pct

-- Pending document processing
v_pending_document_processing
├── id, bid_project_id, project_name
├── file_name, document_type
├── processing_status
└── minutes_waiting
```

---

## Usage Guide

### 1. Creating a New Bid Project

```typescript
// Create project
const { data: project } = await supabase
  .from('bid_projects')
  .insert({
    organization_id: orgId,
    project_name: 'US-79 Bridge Replacement',
    state_project_number: 'S331-79-12.93',
    county: 'Kanawha',
    letting_date: '2024-03-15',
    status: 'ANALYZING'
  })
  .select()
  .single();
```

### 2. Uploading Documents

Documents are uploaded through the `DocumentUpload` component or directly via API:

```typescript
// Get auth token
const { data: { session } } = await supabase.auth.getSession();

// Upload document
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/upload-bid-document`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      bidProjectId: project.id,
      documentType: 'PROPOSAL',
      fileName: 'proposal.pdf',
      fileContent: base64Content,  // Base64 encoded
      mimeType: 'application/pdf',
    }),
  }
);

// Document is automatically queued for AI processing
const result = await response.json();
// { success: true, processingTriggered: true, ... }
```

### 3. Running AI Analysis Pipeline

The AI pipeline can be run from the Overview tab or programmatically:

```typescript
// Extract risks from all documents
await fetch(`${SUPABASE_URL}/functions/v1/extract-project-risks`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({ bid_project_id: projectId }),
});

// Generate pre-bid questions
await fetch(`${SUPABASE_URL}/functions/v1/generate-prebid-questions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({ bid_project_id: projectId }),
});

// Categorize line items
await fetch(`${SUPABASE_URL}/functions/v1/categorize-line-items`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({ bid_project_id: projectId }),
});
```

### 4. Generating Executive Summary

```typescript
// Generate new executive snapshot
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/generate-executive-snapshot`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      bid_project_id: projectId,
      force_regenerate: true,  // Create new version
    }),
  }
);

const result = await response.json();
// {
//   success: true,
//   snapshot_id: "uuid",
//   version: 2,
//   metrics: { ... }
// }
```

### 5. Reading Results

```typescript
// Get project risks
const { data: risks } = await supabase
  .from('bid_project_risks')
  .select('*')
  .eq('bid_project_id', projectId)
  .order('overall_severity', { ascending: false });

// Get pre-bid questions
const { data: questions } = await supabase
  .from('bid_prebid_questions')
  .select('*')
  .eq('bid_project_id', projectId)
  .eq('status', 'AI_SUGGESTED');

// Get current executive snapshot
const { data: snapshot } = await supabase
  .from('bid_executive_snapshots')
  .select('*')
  .eq('bid_project_id', projectId)
  .eq('is_current', true)
  .single();
```

---

## API Reference

### Authentication

All endpoints require authentication via `Authorization: Bearer <token>` header.

**Supported tokens**:
- User session access token (from `supabase.auth.getSession()`)
- Service role key (for internal service-to-service calls only)

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/functions/v1/upload-bid-document` | POST | Upload document |
| `/functions/v1/process-document-queue` | POST | Process pending documents |
| `/functions/v1/analyze-bid-document` | POST | AI analyze single document |
| `/functions/v1/extract-project-risks` | POST | Extract risks from project |
| `/functions/v1/generate-prebid-questions` | POST | Generate pre-bid questions |
| `/functions/v1/categorize-line-items` | POST | Categorize line items |
| `/functions/v1/generate-work-packages` | POST | Generate work packages |
| `/functions/v1/generate-executive-snapshot` | POST | Generate executive summary |

### Error Responses

```json
// 401 Unauthorized
{ "error": "Authorization header required" }
{ "error": "Invalid authentication" }

// 403 Forbidden
{ "error": "Project not found or access denied" }
{ "error": "Document not found or access denied" }

// 400 Bad Request
{ "error": "bid_project_id is required" }
{ "error": "Invalid document type: UNKNOWN" }

// 500 Internal Server Error
{ "error": "Analysis failed", "message": "Claude API error: 429 - Rate limited" }
```

---

## Security Model

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Edge Function Entry                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Has Authorization │
                    │     Header?       │
                    └────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
         ┌────────┐                    ┌────────┐
         │   No   │                    │  Yes   │
         └────┬───┘                    └────┬───┘
              │                             │
              ▼                             ▼
         ┌────────────┐           ┌──────────────────┐
         │ 401 Error  │           │ Is Service Role? │
         └────────────┘           └────────┬─────────┘
                                           │
                            ┌──────────────┴──────────────┐
                            │                             │
                            ▼                             ▼
                       ┌────────┐                    ┌────────┐
                       │  Yes   │                    │   No   │
                       └────┬───┘                    └────┬───┘
                            │                             │
                            ▼                             ▼
                    ┌──────────────┐           ┌──────────────────┐
                    │   Trusted    │           │ Validate User    │
                    │ (internal)   │           │ via getUser()    │
                    └──────────────┘           └────────┬─────────┘
                                                        │
                                                        ▼
                                              ┌──────────────────┐
                                              │ Check Project    │
                                              │ Access via RLS   │
                                              └────────┬─────────┘
                                                        │
                                                        ▼
                                              ┌──────────────────┐
                                              │  Execute with    │
                                              │  Service Role    │
                                              └──────────────────┘
```

### Row Level Security

All tables have RLS enabled. Key policies:

- **Organization Isolation**: Users only see data in their organization
- **Project-Based Access**: Users must be assigned to a project to access its data
- **Role-Based Permissions**: Actions restricted by user role level

---

## UI Components

### BidDetail Page

**Location**: `apps/web/src/pages/bids/BidDetail.tsx`

**Tabs**:
- **Overview**: Project info, AI pipeline controls, metrics dashboard
- **AI Summary**: Executive snapshot display with generate button
- **Documents**: Upload and list documents with processing status
- **Line Items**: Categorized items with filtering
- **Risks**: Risk list with severity indicators
- **Questions**: Pre-bid questions with status management
- **Work Packages**: Expandable packages with assigned items

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| DocumentUpload | `components/DocumentUpload.tsx` | Drag-drop file upload |
| DocumentList | `components/DocumentList.tsx` | Document list with status |
| LineItemsTab | `components/bids/LineItemsTab.tsx` | Line item grid |
| RisksTab | `components/bids/RisksTab.tsx` | Risk list with filters |
| QuestionsTab | `components/bids/QuestionsTab.tsx` | Question management |
| WorkPackagesTab | `components/bids/WorkPackagesTab.tsx` | Work package viewer |

---

## Best Practices

### 1. Document Upload Order

For optimal AI analysis, upload documents in this order:
1. **BIDX** file first (provides line items for context)
2. **PROPOSAL** (main project information)
3. **SPECIAL_PROVISIONS** (specific requirements)
4. **ENVIRONMENTAL** / **HAZMAT** (constraints)
5. **GEOTECHNICAL** (site conditions)
6. **PLANS** (visual reference)

### 2. Running the Pipeline

1. Wait for documents to finish processing (status: COMPLETED)
2. Run "Extract Risks" first (builds risk context)
3. Run "Generate Questions" (uses risks as input)
4. Run "Categorize Items" (matches to WVDOH codes)
5. Generate Work Packages
6. Generate Executive Snapshot (comprehensive view)

### 3. Reviewing AI Output

- **Always review** AI-generated content before use
- Check `ai_confidence` scores (< 70 may need manual review)
- Edit questions to match your company's voice
- Verify risk assessments against your experience
- Adjust contingency percentages based on your risk tolerance

---

## Conventions & Standards

This section documents the standard conventions used throughout the Bid Intelligence Module.

### Numbering Formats

| Entity | Format | Example | Auto-Generated |
|--------|--------|---------|----------------|
| Risk IDs | `R-NNN` | R-001, R-002, R-015 | Yes, sequential |
| Question IDs | `Q-NNN` | Q-001, Q-002, Q-023 | Yes, sequential |
| Work Package Codes | `WP-NNN` | WP-001, WP-002 | Yes, sequential |
| Line Item Numbers | Preserved from Bidx | 201.10.0001 | No, from source |

Numbers are zero-padded to 3 digits and assigned sequentially per project. The numbering resets for each project.

### Document Type Conventions

| Type Code | Full Name | Expected Content | Auto-Process |
|-----------|-----------|------------------|--------------|
| `BIDX` | Bidx XML File | WVDOH XML with line items, quantities | XML parsing |
| `PROPOSAL` | Bid Proposal | Main bid document, project info, requirements | AI analysis |
| `SPECIAL_PROVISIONS` | Special Provisions | Project-specific requirements | AI analysis |
| `ENVIRONMENTAL` | Environmental Document | Permits, wetlands, species, commitments | AI analysis |
| `HAZMAT` | Hazmat Survey | Asbestos, lead paint, contamination | AI analysis |
| `GEOTECHNICAL` | Geotechnical Report | Borings, soil conditions, groundwater | AI analysis |
| `PLANS` | Construction Plans | Drawing sheets (PDF/TIFF) | AI analysis |
| `ADDENDUM` | Bid Addendum | Bid modifications, clarifications | AI analysis |
| `OTHER` | Other Document | Miscellaneous documents | Stored only |

### Processing Status State Machine

```
Document Upload Flow:
┌──────────┐     ┌────────────┐     ┌───────────┐     ┌──────────┐
│  PENDING │────▶│ PROCESSING │────▶│ COMPLETED │     │  FAILED  │
└──────────┘     └────────────┘     └───────────┘     └──────────┘
     │                 │                                    ▲
     │                 │                                    │
     │                 └────────────────────────────────────┘
     │                           (error)
     │
     │           ┌────────────────────┐
     └──────────▶│  FAILED_PERMANENT  │ (after max retries)
                 └────────────────────┘
```

| Status | Description | Next States |
|--------|-------------|-------------|
| `PENDING` | Awaiting processing | PROCESSING |
| `PROCESSING` | Currently being analyzed | COMPLETED, FAILED |
| `COMPLETED` | Successfully processed | - (terminal) |
| `FAILED` | Processing error (retriable) | PENDING (via reset) |
| `FAILED_PERMANENT` | Max retries exceeded | - (terminal, needs manual review) |

### Risk Severity Levels

| Level | Description | Action Required |
|-------|-------------|-----------------|
| `CRITICAL` | Project viability at risk | Immediate management attention |
| `HIGH` | Significant cost/schedule impact | Management review required |
| `MEDIUM` | Moderate impact, manageable | Include in bid strategy |
| `LOW` | Minor impact | Monitor during execution |

### Risk Categories

| Category | Code | Description |
|----------|------|-------------|
| Scope | `SCOPE` | Unclear scope, undefined work |
| Quantity | `QUANTITY` | Quantity uncertainties, unbalanced items |
| Site Conditions | `SITE_CONDITIONS` | Unknown conditions, utilities |
| Environmental | `ENVIRONMENTAL` | Permits, species, wetlands |
| Maintenance of Traffic | `MOT` | Traffic control, night work |
| Schedule | `SCHEDULE` | Tight deadlines, weather windows |
| Regulatory | `REGULATORY` | Permits, inspections, certifications |
| Subcontractor | `SUBCONTRACTOR` | DBE requirements, prequalification |
| Material | `MATERIAL` | Availability, lead times, pricing |
| Weather | `WEATHER` | Seasonal limitations |
| Hazmat | `HAZMAT` | Asbestos, lead, contamination |
| Constructability | `CONSTRUCTABILITY` | Access, staging, means/methods |

### Work Package Categories

| Category | Typical Items |
|----------|---------------|
| `EARTHWORK` | Excavation, embankment, grading |
| `DRAINAGE` | Culverts, pipes, inlets, ditches |
| `PAVING` | Asphalt, concrete, base courses |
| `STRUCTURES` | Bridges, retaining walls, box culverts |
| `SIGNING_STRIPING` | Signs, pavement markings, delineators |
| `TRAFFIC_CONTROL` | MOT, flagging, barriers |
| `UTILITIES` | Relocations, adjustments |
| `ENVIRONMENTAL` | Erosion control, seeding, restoration |
| `CONCRETE` | Sidewalks, curbs, flatwork |
| `DEMOLITION` | Removal, disposal |
| `LANDSCAPING` | Planting, mulching |
| `ELECTRICAL` | Lighting, signals |
| `MISCELLANEOUS` | Mobilization, cleanup |

### Question Status Workflow

```
┌──────────────┐     ┌─────────┐     ┌───────────┐     ┌──────────┐
│ AI_SUGGESTED │────▶│ PENDING │────▶│ SUBMITTED │────▶│ ANSWERED │
└──────────────┘     └─────────┘     └───────────┘     └──────────┘
       │                  │
       │                  ▼
       │             ┌─────────┐
       └────────────▶│ DELETED │ (if rejected)
                     └─────────┘
```

| Status | Description |
|--------|-------------|
| `AI_SUGGESTED` | Generated by AI, awaiting review |
| `PENDING` | Approved for submission, not yet sent |
| `SUBMITTED` | Sent to WVDOH |
| `ANSWERED` | Response received from WVDOH |
| `DELETED` | Rejected/removed (soft delete) |

### Project Member Roles

| Role | Code | Permissions |
|------|------|-------------|
| Estimator | `ESTIMATOR` | Full edit access to project data |
| Project Manager | `PROJECT_MANAGER` | Review and approve, manage team |
| Executive | `EXECUTIVE` | Read-only, generate snapshots |
| Viewer | `VIEWER` | Read-only access |

### Executive Snapshot Versioning

Snapshots are versioned to maintain history:
- `version_number`: Auto-incremented per project
- `is_current`: Only one snapshot marked current per project
- `superseded_by`: Links to newer version
- `superseded_at`: Timestamp when replaced

When a new snapshot is generated:
1. Previous `is_current` snapshot gets `is_current = false`
2. Previous snapshot gets `superseded_by` = new snapshot ID
3. Previous snapshot gets `superseded_at` = current timestamp
4. New snapshot gets `is_current = true`

### AI Confidence Scoring

| Score Range | Interpretation | Recommended Action |
|-------------|----------------|-------------------|
| 90-100 | Very high confidence | Use directly |
| 70-89 | High confidence | Quick review |
| 50-69 | Moderate confidence | Manual verification required |
| Below 50 | Low confidence | Manual creation recommended |

---

## Troubleshooting

### Document Processing Stuck

```sql
-- Check pending documents
SELECT * FROM v_pending_document_processing
WHERE minutes_waiting > 5;

-- Reset stuck documents
UPDATE bid_documents
SET processing_status = 'PENDING',
    processing_started_at = NULL
WHERE processing_status = 'PROCESSING'
  AND processing_started_at < NOW() - INTERVAL '10 minutes';
```

### AI Analysis Failures

Check the `processing_error` field:
```sql
SELECT id, file_name, processing_error
FROM bid_documents
WHERE processing_status = 'FAILED'
  AND bid_project_id = 'your-project-id';
```

Common errors:
- **"ANTHROPIC_API_KEY not configured"**: Check edge function secrets
- **"Claude API error: 429"**: Rate limited, wait and retry
- **"File size exceeds limit"**: Document too large (> 100MB)

### Missing Risks/Questions

Ensure documents are fully analyzed:
```sql
SELECT COUNT(*) as total,
       SUM(CASE WHEN ai_summary IS NOT NULL THEN 1 ELSE 0 END) as analyzed
FROM bid_documents
WHERE bid_project_id = 'your-project-id';
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial release with full AI pipeline |
| 1.1 | Dec 2024 | Added user authentication to all functions |
| 1.2 | Dec 2024 | Auto-trigger document processing on upload |
| 1.3 | Dec 2024 | UI refresh callbacks after AI operations |

---

*Document generated: December 9, 2024*
*Module Status: Production Ready*
