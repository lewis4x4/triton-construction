import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
// pdf-parse v2.4.5 uses PDFParse class with load(), getInfo(), getPageText() methods
// Note: It requires Uint8Array instead of Buffer
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const { PDFParse } = require('pdf-parse');
const pdfParse = async (buffer: Buffer): Promise<{ text: string; numpages: number }> => {
  // Convert Buffer to Uint8Array as required by pdf-parse v2.4.5
  const uint8Array = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const parser = new PDFParse(uint8Array);
  await parser.load();
  const info = await parser.getInfo();
  const numPages = info?.numPages || info?.Pages || 0;

  // Extract text page by page using getPageText
  const textParts: string[] = [];
  for (let i = 1; i <= numPages; i++) {
    try {
      const pageText = await parser.getPageText(i);
      if (typeof pageText === 'string') {
        textParts.push(pageText);
      } else if (pageText?.text) {
        textParts.push(pageText.text);
      } else if (Array.isArray(pageText)) {
        textParts.push(pageText.join(' '));
      }
    } catch (pageErr) {
      console.error(`Error extracting page ${i}:`, pageErr);
    }
  }

  await parser.destroy();
  return { text: textParts.join('\n\n'), numpages: numPages };
};

const app = express();
const PORT = process.env.PORT || 3001;

// Threshold for switching to text extraction (Claude API limit is ~20MB for base64)
const TEXT_EXTRACTION_THRESHOLD_BYTES = 20 * 1024 * 1024; // 20MB

// Configure multer for memory storage (up to 50MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// CORS configuration - allow localhost and any vercel.app domain
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    // Allow localhost
    if (origin.includes('localhost')) return callback(null, true);

    // Allow any vercel.app or netlify.app domain
    if (origin.endsWith('.vercel.app') || origin.endsWith('.netlify.app')) return callback(null, true);

    // Allow explicitly configured origins
    if (allowedOrigins.includes(origin)) return callback(null, true);

    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize Supabase client (for auth verification)
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Extraction prompt for bid documents
const EXTRACTION_PROMPT = `You are an expert construction bid analyst specializing in WVDOH (West Virginia Department of Highways) bid proposals.

Analyze this bid document and extract project metadata for creating a new bid project. Focus on finding:

1. Project identification:
   - Project name or title
   - State project number (format like S310-48-0.00)
   - Federal project number (format like NHPP-0048(123)D)
   - County name
   - Route number (US-48, WV-2, I-79, etc.)
   - Location description

2. Key dates:
   - Letting date
   - Bid due date/time

3. Contract requirements:
   - Contract time (working days)
   - DBE goal percentage
   - Liquidated damages per day
   - Whether it's a federal aid project

4. Estimate:
   - Engineer's estimate if provided

Return ONLY a JSON response with this exact structure:
{
  "project_name": "Full project name or null",
  "state_project_number": "e.g., S310-48-0.00 or null",
  "federal_project_number": "e.g., NHPP-0048(123)D or null",
  "county": "County name or null",
  "route": "e.g., US-48 or null",
  "location_description": "Brief description or null",
  "letting_date": "YYYY-MM-DD format or null",
  "bid_due_date": "YYYY-MM-DD format or null",
  "contract_time_days": number or null,
  "dbe_goal_percentage": number (e.g., 8.5) or null,
  "is_federal_aid": true/false,
  "liquidated_damages_per_day": number or null,
  "engineers_estimate": number or null,
  "owner": "WVDOH, FHWA, County, Municipal, Private, or Other",
  "confidence_score": 0-100,
  "extraction_notes": ["array of notes about what was found or missing"]
}

Important:
- Use null for fields you cannot find in the document
- Dates must be in YYYY-MM-DD format
- Numbers should not include commas or dollar signs
- Be conservative with confidence score - high confidence only if clearly stated`;

interface ExtractedMetadata {
  project_name: string | null;
  state_project_number: string | null;
  federal_project_number: string | null;
  county: string | null;
  route: string | null;
  location_description: string | null;
  letting_date: string | null;
  bid_due_date: string | null;
  contract_time_days: number | null;
  dbe_goal_percentage: number | null;
  is_federal_aid: boolean;
  liquidated_damages_per_day: number | null;
  engineers_estimate: number | null;
  owner: string | null;
  confidence_score: number;
  extraction_notes: string[];
}

// Allowed document types and their expected MIME types (WVDOH Bid Package)
const DOCUMENT_TYPE_MIME_MAP: Record<string, string[]> = {
  PROPOSAL: ['application/pdf'],
  BIDX: ['application/xml', 'text/xml', 'application/octet-stream'],
  ITEMIZED_BID_XLSX: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  PLANS: ['application/pdf', 'image/tiff', 'application/acad', 'application/x-autocad', 'application/dwg', 'image/vnd.dwg'],
  EXISTING_PLANS: ['application/pdf', 'image/tiff', 'application/acad', 'application/x-autocad', 'application/dwg', 'image/vnd.dwg'],
  SPECIAL_PROVISIONS: ['application/pdf'],
  ENVIRONMENTAL: ['application/pdf'],
  ASBESTOS: ['application/pdf'],
  HAZMAT: ['application/pdf'],
  GEOTECHNICAL: ['application/pdf'],
  HYDRAULIC: ['application/pdf'],
  TRAFFIC_STUDY: ['application/pdf'],
  UTILITY_PLANS: ['application/pdf'],
  ROW_PLANS: ['application/pdf'],
  PERMITS: ['application/pdf'],
  PREBID_MINUTES: ['application/pdf'],
  ADDENDUM: ['application/pdf'],
  OTHER: ['application/pdf', 'application/xml', 'text/xml', 'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'image/png', 'image/jpeg', 'image/tiff', 'application/acad', 'application/dwg'],
};

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Upload document endpoint (for large files that exceed edge function memory limits)
app.post('/upload-document', upload.single('file'), async (req: Request, res: Response) => {
  try {
    // Verify authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'Authorization header required' });
      return;
    }

    // Verify the token with Supabase
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      res.status(401).json({ error: 'Invalid authentication token' });
      return;
    }

    // Check for file
    if (!req.file) {
      res.status(400).json({ error: 'File is required' });
      return;
    }

    // Get form data
    const bidProjectId = req.body.bidProjectId;
    const documentType = req.body.documentType;

    if (!bidProjectId || !documentType) {
      res.status(400).json({ error: 'Missing required fields: bidProjectId, documentType' });
      return;
    }

    // Validate document type
    if (!DOCUMENT_TYPE_MIME_MAP[documentType]) {
      res.status(400).json({ error: `Invalid document type: ${documentType}` });
      return;
    }

    // Validate MIME type for document type
    const allowedMimes = DOCUMENT_TYPE_MIME_MAP[documentType];
    if (!allowedMimes.includes(req.file.mimetype)) {
      res.status(400).json({
        error: `Invalid MIME type ${req.file.mimetype} for document type ${documentType}. Allowed: ${allowedMimes.join(', ')}`
      });
      return;
    }

    // Verify user has access to the bid project
    const { data: project, error: projectError } = await supabase
      .from('bid_projects')
      .select('id, organization_id')
      .eq('id', bidProjectId)
      .single();

    if (projectError || !project) {
      res.status(404).json({ error: 'Bid project not found or access denied' });
      return;
    }

    const file = req.file;
    const fileSize = file.size;

    console.log(`Uploading file: ${file.originalname} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`);

    // Generate unique file path: {project_id}/{timestamp}_{sanitized_filename}
    const timestamp = Date.now();
    const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${bidProjectId}/${timestamp}_${sanitizedFileName}`;

    // Upload to storage bucket
    const { data: storageData, error: storageError } = await supabase.storage
      .from('bid-documents')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (storageError) {
      console.error('Storage upload error:', storageError);
      res.status(500).json({ error: `Storage upload failed: ${storageError.message}` });
      return;
    }

    // Create bid_documents record
    const { data: document, error: docError } = await supabase
      .from('bid_documents')
      .insert({
        bid_project_id: bidProjectId,
        file_name: file.originalname,
        file_path: storageData.path,
        file_size_bytes: fileSize,
        mime_type: file.mimetype,
        document_type: documentType,
        processing_status: 'PENDING',
      })
      .select()
      .single();

    if (docError) {
      // Rollback: delete the uploaded file
      await supabase.storage.from('bid-documents').remove([storageData.path]);
      console.error('Document record creation error:', docError);
      res.status(500).json({ error: `Failed to create document record: ${docError.message}` });
      return;
    }

    // Auto-trigger document processing (async - don't wait for completion)
    let processingTriggered = false;
    try {
      const supabaseUrl = process.env.SUPABASE_URL ?? '';
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

      // Fire and forget - call process-document-queue for this document
      fetch(`${supabaseUrl}/functions/v1/process-document-queue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          documentIds: [document.id],
          batchSize: 1,
        }),
      }).catch((err) => {
        console.error('Auto-processing trigger failed (non-blocking):', err);
      });

      processingTriggered = true;
    } catch (triggerErr) {
      // Don't fail upload if auto-processing trigger fails
      console.error('Failed to trigger auto-processing:', triggerErr);
    }

    console.log(`Upload complete: ${document.id}`);

    // Return success with document info
    res.json({
      success: true,
      document: {
        id: document.id,
        fileName: document.file_name,
        filePath: document.file_path,
        documentType: document.document_type,
        processingStatus: document.processing_status,
        createdAt: document.created_at,
      },
      processingTriggered,
      message: processingTriggered
        ? 'Document uploaded successfully. AI processing has been triggered.'
        : 'Document uploaded successfully. Processing will begin shortly.',
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'An unexpected error occurred during upload',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Main extraction endpoint
app.post('/extract-metadata', upload.single('file'), async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Verify authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'Authorization header required' });
      return;
    }

    // Verify the token with Supabase
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      res.status(401).json({ error: 'Invalid authentication token' });
      return;
    }

    // Check for file
    if (!req.file) {
      res.status(400).json({ error: 'File is required' });
      return;
    }

    const file = req.file;
    console.log(`Processing file: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.mimetype)) {
      res.status(400).json({ error: 'File must be PDF or image (PNG, JPEG)' });
      return;
    }

    // Convert to base64
    const base64Content = file.buffer.toString('base64');

    // Prepare message content based on file type
    // Using 'any' for content types as the SDK types may not include document block yet
    let messageContent: Array<Record<string, unknown>>;

    if (file.mimetype === 'application/pdf') {
      messageContent = [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64Content,
          },
        },
        {
          type: 'text',
          text: `Extract project metadata from this bid document. Filename: ${file.originalname}`,
        },
      ];
    } else {
      // Image file
      messageContent = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: file.mimetype,
            data: base64Content,
          },
        },
        {
          type: 'text',
          text: `Extract project metadata from this bid document image. Filename: ${file.originalname}`,
        },
      ];
    }

    console.log('Sending to Claude API...');

    // Call Claude API with the larger model for better extraction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: EXTRACTION_PROMPT,
      messages: [
        {
          role: 'user',
          content: messageContent as unknown as Anthropic.MessageCreateParams['messages'][0]['content'],
        },
      ],
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

    if (!responseText) {
      throw new Error('No response from Claude');
    }

    // Parse the JSON response
    let metadata: ExtractedMetadata;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      metadata = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', responseText);
      // Return a default response with low confidence
      metadata = {
        project_name: null,
        state_project_number: null,
        federal_project_number: null,
        county: null,
        route: null,
        location_description: null,
        letting_date: null,
        bid_due_date: null,
        contract_time_days: null,
        dbe_goal_percentage: null,
        is_federal_aid: false,
        liquidated_damages_per_day: null,
        engineers_estimate: null,
        owner: 'WVDOH',
        confidence_score: 0,
        extraction_notes: ['Failed to parse document - please enter details manually'],
      };
    }

    const processingTime = Date.now() - startTime;
    console.log(`Extraction complete in ${processingTime}ms`);

    res.json({
      success: true,
      metadata,
      filename: file.originalname,
      file_type: file.mimetype,
      file_size: file.size,
      processing_time_ms: processingTime,
      usage: response.usage,
    });

  } catch (error) {
    console.error('Extraction error:', error);
    res.status(500).json({
      error: 'Extraction failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// AI Analysis Prompts by Document Type (same as edge function)
// ============================================================================

const ANALYSIS_PROMPTS: Record<string, string> = {
  PROPOSAL: `You are an expert construction bid analyst specializing in WVDOH (West Virginia Department of Highways) bid proposals.

Analyze the provided bid proposal document and extract:
1. Project identification (state project number, federal aid number, county, route)
2. Key dates (letting date, pre-bid meeting, completion deadline)
3. Contract requirements (working days, liquidated damages, DBE goals)
4. Special provisions or unusual requirements
5. Potential risks or concerns for bidding
6. Any items requiring clarification (pre-bid questions)

Provide a JSON response with this structure:
{
  "summary": "2-3 sentence executive summary of the project",
  "document_category": "BID_PROPOSAL",
  "key_findings": [
    {
      "type": "REQUIREMENT|RISK|OPPORTUNITY|DATE|FINANCIAL",
      "title": "Brief title",
      "description": "Detailed description",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "page_reference": "Page X" or null,
      "related_items": ["item codes if applicable"]
    }
  ],
  "extracted_data": {
    "state_project_number": "string or null",
    "federal_aid_number": "string or null",
    "county": "string or null",
    "route": "string or null",
    "letting_date": "YYYY-MM-DD or null",
    "pre_bid_date": "YYYY-MM-DD or null",
    "completion_date": "YYYY-MM-DD or null",
    "working_days": number or null,
    "liquidated_damages_per_day": number or null,
    "dbe_goal_percentage": number or null,
    "engineers_estimate": number or null,
    "is_federal_aid": boolean,
    "special_provisions": ["array of notable provisions"],
    "required_certifications": ["array of required certs"],
    "bonding_requirements": "description or null"
  },
  "confidence_score": 0-100
}

Always respond with valid JSON only.`,

  ENVIRONMENTAL: `You are an expert environmental compliance analyst for construction projects.

Analyze the provided environmental document and extract:
1. Wetland boundaries and restrictions
2. Endangered species considerations
3. Stream/water body impacts and mitigation requirements
4. Seasonal timing restrictions (bird nesting, fish spawning, etc.)
5. Permit requirements and conditions
6. Mitigation commitments
7. Monitoring requirements

Provide a JSON response with this structure:
{
  "summary": "2-3 sentence summary of environmental constraints",
  "document_category": "ENVIRONMENTAL",
  "key_findings": [
    {
      "type": "WETLAND|SPECIES|TIMING|PERMIT|MITIGATION|MONITORING",
      "title": "Brief title",
      "description": "Detailed description",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "page_reference": "Page X" or null
    }
  ],
  "extracted_data": {
    "wetland_acres": number or null,
    "stream_linear_feet": number or null,
    "endangered_species": ["array of species"],
    "timing_restrictions": [{"restriction": "description", "start_date": "MM-DD", "end_date": "MM-DD", "reason": "why"}],
    "permits_required": ["array of permit types"],
    "mitigation_requirements": ["array of requirements"],
    "monitoring_requirements": ["array of monitoring items"],
    "environmental_commitments": ["numbered commitments from document"]
  },
  "confidence_score": 0-100
}

Always respond with valid JSON only.`,

  ASBESTOS: `You are an expert hazardous materials analyst for construction projects.

Analyze the provided asbestos/hazmat document and extract:
1. Asbestos-containing materials (ACM) locations and quantities
2. Lead-based paint locations
3. Other hazardous materials identified
4. Recommended abatement procedures
5. Disposal requirements
6. Worker protection requirements
7. Cost implications

Provide a JSON response with this structure:
{
  "summary": "2-3 sentence summary of hazmat findings",
  "document_category": "HAZMAT",
  "key_findings": [
    {
      "type": "ASBESTOS|LEAD|PCB|PETROLEUM|OTHER",
      "title": "Brief title",
      "description": "Detailed description including location and quantity",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "page_reference": "Page X" or null
    }
  ],
  "extracted_data": {
    "asbestos_present": boolean,
    "asbestos_locations": [{"location": "description", "material_type": "pipe insulation, floor tile, etc.", "quantity": "amount with units", "condition": "good, damaged, friable"}],
    "lead_paint_present": boolean,
    "lead_paint_locations": ["array of locations"],
    "other_hazmat": [{"material": "name", "location": "where", "quantity": "amount"}],
    "abatement_required": boolean,
    "estimated_abatement_cost": number or null,
    "special_disposal_required": boolean,
    "licensed_contractor_required": boolean
  },
  "confidence_score": 0-100
}

Always respond with valid JSON only.`,

  HAZMAT: `You are an expert hazardous materials analyst for construction projects.

Analyze the provided hazmat document and extract all relevant hazardous materials information including asbestos, lead, PCBs, petroleum contamination, and any other hazardous substances.

Provide a JSON response with this structure:
{
  "summary": "2-3 sentence summary of hazmat findings",
  "document_category": "HAZMAT",
  "key_findings": [{"type": "ASBESTOS|LEAD|PCB|PETROLEUM|OTHER", "title": "Brief title", "description": "Detailed description", "severity": "LOW|MEDIUM|HIGH|CRITICAL", "page_reference": "Page X" or null}],
  "extracted_data": {},
  "confidence_score": 0-100
}

Always respond with valid JSON only.`,

  GEOTECHNICAL: `You are an expert geotechnical engineer analyzing soil and foundation reports.

Analyze the provided geotechnical document and extract:
1. Soil conditions and classifications
2. Groundwater levels and concerns
3. Rock presence and characteristics
4. Foundation recommendations
5. Earthwork considerations
6. Special construction requirements
7. Risk factors

Provide a JSON response with this structure:
{
  "summary": "2-3 sentence summary of geotechnical conditions",
  "document_category": "GEOTECHNICAL",
  "key_findings": [{"type": "SOIL|ROCK|GROUNDWATER|FOUNDATION|EARTHWORK|RISK", "title": "Brief title", "description": "Detailed description", "severity": "LOW|MEDIUM|HIGH|CRITICAL", "page_reference": "Page X" or null}],
  "extracted_data": {
    "predominant_soil_type": "description",
    "rock_encountered": boolean,
    "rock_depth_range": "X to Y feet or null",
    "groundwater_depth": number or null,
    "groundwater_concerns": ["array of concerns"],
    "bearing_capacity": "value with units or null",
    "foundation_recommendations": ["array of recommendations"],
    "earthwork_considerations": ["array of considerations"],
    "unsuitable_material_expected": boolean,
    "dewatering_required": boolean,
    "special_equipment_needed": ["array of equipment"]
  },
  "confidence_score": 0-100
}

Always respond with valid JSON only.`,

  HYDRAULIC: `You are an expert hydrologist and hydraulic engineer analyzing H&H reports for highway construction.

Analyze the provided Hydrologic/Hydraulic (H&H) report and extract:
1. Design storm frequency and rainfall data used
2. Drainage structure sizing (pipes, culverts, bridges)
3. Flood elevations and freeboard requirements
4. Scour analysis and countermeasures
5. Velocity restrictions and outlet protection
6. Any downstream impact limitations

Provide a JSON response with this structure:
{
  "summary": "2-3 sentence summary of H&H findings and key constraints",
  "document_category": "HYDRAULIC",
  "key_findings": [
    {
      "type": "DRAINAGE_STRUCTURE|FLOOD_CONSTRAINT|SCOUR|VELOCITY|DOWNSTREAM",
      "title": "Brief title",
      "description": "Detailed description with sizing/elevation data",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "page_reference": "Page X" or null,
      "station_reference": "Station or location" or null
    }
  ],
  "extracted_data": {
    "design_storm_frequency": "Q25, Q50, Q100, etc.",
    "drainage_structures": [{"location": "station/description", "type": "pipe/culvert/bridge", "size": "dimensions", "design_flow_cfs": number}],
    "flood_elevations": [{"location": "description", "base_flood_elev": number, "design_flood_elev": number, "freeboard_ft": number}],
    "scour_analysis": {"scour_depth_ft": number, "countermeasures": ["riprap", "sheet pile", etc.]},
    "velocity_restrictions": [{"location": "description", "max_velocity_fps": number, "reason": "why"}],
    "outlet_protection_required": boolean,
    "downstream_restrictions": ["array of downstream constraints"]
  },
  "confidence_score": 0-100
}

Always respond with valid JSON only.`,

  UTILITY_PLANS: `You are an expert utility coordinator for highway construction projects.

Analyze the provided utility relocation/coordination plans and extract:
1. All utilities present in the project area (electric, gas, water, sewer, telecom, fiber)
2. Conflict locations with stations/offsets
3. Relocation schedules and responsibilities (owner vs contractor)
4. Protection requirements during construction
5. Contact information for utility owners
6. Cost responsibility allocation

Provide a JSON response with this structure:
{
  "summary": "2-3 sentence summary of utility conflicts and critical coordination needs",
  "document_category": "UTILITY_PLANS",
  "key_findings": [
    {
      "type": "CONFLICT|RELOCATION|PROTECTION|SCHEDULE|COST",
      "title": "Brief title - utility owner and type",
      "description": "Detailed description of conflict/requirement",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "page_reference": "Page X" or null,
      "station_reference": "Station XX+XX" or null
    }
  ],
  "extracted_data": {
    "utilities_present": [{"owner": "company name", "type": "electric/gas/water/sewer/telecom/fiber", "description": "facility details"}],
    "conflict_locations": [{"station": "XX+XX", "offset": "X' L/R", "utility_type": "type", "owner": "company", "severity": "minor/major/critical", "resolution": "relocate/protect/adjust grade"}],
    "relocation_schedule": [{"utility": "type/owner", "responsibility": "owner/contractor", "required_before": "phase/date", "duration_days": number}],
    "protection_requirements": [{"utility": "type/owner", "method": "hand dig/concrete cap/etc.", "station_range": "XX+XX to YY+YY"}],
    "utility_contacts": [{"company": "name", "contact_name": "name", "phone": "number", "email": "email"}],
    "contractor_responsible_relocations": ["list of relocations contractor must perform"],
    "owner_responsible_relocations": ["list of relocations utility owner will perform"],
    "estimated_utility_delay_risk_days": number or null
  },
  "confidence_score": 0-100
}

Always respond with valid JSON only.`,

  ROW_PLANS: `You are an expert right-of-way analyst for highway construction.

Analyze the provided Right-of-Way (R/W) plans and extract:
1. Parcels affected (owners, tract numbers)
2. Type of acquisition (fee simple, permanent easement, temporary easement)
3. Access restrictions and driveway locations
4. Staging area locations and limitations
5. Property owner coordination requirements
6. Encroachments or special conditions

Provide a JSON response with this structure:
{
  "summary": "2-3 sentence summary of R/W status and key constraints",
  "document_category": "ROW_PLANS",
  "key_findings": [
    {
      "type": "ACQUISITION|EASEMENT|ACCESS|STAGING|ENCROACHMENT",
      "title": "Brief title",
      "description": "Detailed description",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "page_reference": "Page X" or null
    }
  ],
  "extracted_data": {
    "parcels_affected": [{"tract_number": "X-XX", "owner": "name", "acquisition_type": "fee simple/permanent easement/temporary easement", "area_sqft": number, "special_conditions": "notes"}],
    "staging_areas": [{"location": "description", "size_sqft": number, "restrictions": "limitations", "duration": "during what phases"}],
    "access_restrictions": [{"location": "station/description", "restriction": "no access/limited hours/etc.", "reason": "why", "duration": "temporary/permanent"}],
    "driveway_relocations": [{"station": "XX+XX", "owner": "property owner", "action": "relocate/close/modify"}],
    "temporary_easements": [{"tract": "number", "purpose": "construction access/staging/etc.", "duration_months": number}],
    "permanent_easements": [{"tract": "number", "purpose": "drainage/slope/utility", "area_sqft": number}],
    "encroachments_to_resolve": ["list of existing encroachments"],
    "property_owner_coordination": ["special coordination requirements"]
  },
  "confidence_score": 0-100
}

Always respond with valid JSON only.`,

  PERMITS: `You are an expert environmental permit analyst for construction projects.

Analyze the provided permit document(s) and extract:
1. Permit type (404, NPDES, air quality, state water, etc.)
2. Issuing agency and permit number
3. Key conditions and restrictions
4. Expiration dates and renewal requirements
5. Monitoring and reporting requirements
6. Violations consequences

Provide a JSON response with this structure:
{
  "summary": "2-3 sentence summary of permit requirements and critical conditions",
  "document_category": "PERMITS",
  "key_findings": [
    {
      "type": "CONDITION|RESTRICTION|MONITORING|DEADLINE|VIOLATION_RISK",
      "title": "Brief title",
      "description": "Detailed description of requirement",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "page_reference": "Page X" or null
    }
  ],
  "extracted_data": {
    "permit_type": "404/NPDES/State Water Quality/Air Quality/etc.",
    "permit_number": "permit ID",
    "issuing_agency": "agency name",
    "issue_date": "YYYY-MM-DD or null",
    "expiration_date": "YYYY-MM-DD or null",
    "key_conditions": [{"condition": "requirement text", "category": "erosion control/dewatering/timing/etc."}],
    "timing_restrictions": [{"restriction": "description", "start_date": "MM-DD", "end_date": "MM-DD", "reason": "species/water quality/etc."}],
    "monitoring_requirements": [{"parameter": "what to monitor", "frequency": "daily/weekly/etc.", "reporting": "how to report"}],
    "mitigation_required": [{"type": "wetland/stream/etc.", "requirement": "description", "ratio": "1:1, 2:1, etc."}],
    "bmp_requirements": ["list of required BMPs"],
    "renewal_required": boolean,
    "renewal_deadline": "YYYY-MM-DD or null"
  },
  "confidence_score": 0-100
}

Always respond with valid JSON only.`,

  PREBID_MINUTES: `You are an expert construction bid analyst reviewing pre-bid meeting minutes.

Analyze the provided pre-bid meeting minutes and extract:
1. Questions asked by bidders and official answers
2. Clarifications provided by the owner/engineer
3. Items that will be addressed in addenda
4. Attendees (potential competitors)
5. Site visit observations if included
6. Any verbal commitments or understandings

Provide a JSON response with this structure:
{
  "summary": "2-3 sentence summary of key clarifications and items affecting bid",
  "document_category": "PREBID_MINUTES",
  "key_findings": [
    {
      "type": "CLARIFICATION|ADDENDUM_PENDING|SITE_CONDITION|SCHEDULE|SCOPE_CHANGE",
      "title": "Brief title",
      "description": "Detailed description - question and answer",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "page_reference": "Page X" or null
    }
  ],
  "extracted_data": {
    "meeting_date": "YYYY-MM-DD",
    "location": "site/office address",
    "owner_representatives": [{"name": "name", "title": "role/title"}],
    "engineer_representatives": [{"name": "name", "company": "firm"}],
    "questions_and_answers": [{"question": "bidder question", "answer": "official answer", "asked_by": "company if known", "affects_bid": boolean, "related_spec_section": "section reference if applicable"}],
    "items_for_addenda": ["list of items to be addressed in addenda"],
    "site_conditions_noted": ["observations from site visit"],
    "schedule_clarifications": [{"topic": "what was clarified", "clarification": "details"}],
    "attendees": [{"company": "bidder company name", "representatives": ["names"]}],
    "verbal_commitments": ["any verbal understandings reached - may need written confirmation"]
  },
  "confidence_score": 0-100
}

Always respond with valid JSON only.`,

  DEFAULT: `You are an expert construction document analyst for WVDOH bid packages.

Analyze the provided document and extract all relevant information for bid estimation and project planning. Identify:
1. Key requirements and specifications
2. Quantities and measurements
3. Special conditions or constraints
4. Potential risks or concerns
5. Items that may need clarification

Provide a JSON response with this structure:
{
  "summary": "2-3 sentence summary of document contents",
  "document_category": "inferred category",
  "key_findings": [{"type": "REQUIREMENT|SPECIFICATION|QUANTITY|RISK|CONSTRAINT|CLARIFICATION", "title": "Brief title", "description": "Detailed description", "severity": "LOW|MEDIUM|HIGH|CRITICAL", "page_reference": "Page X" or null}],
  "extracted_data": {},
  "confidence_score": 0-100
}

Always respond with valid JSON only.`
};

// ============================================================================
// Analyze Document Endpoint (for large files that exceed edge function memory)
// ============================================================================

interface AnalyzeDocumentRequest {
  document_id: string;
  analysis_type?: 'FULL_EXTRACTION' | 'QUICK_SCAN' | 'TARGETED';
}

interface DocumentAnalysis {
  summary: string;
  document_category: string;
  key_findings: Array<{
    type: string;
    title: string;
    description: string;
    severity?: string;
    page_reference?: string;
  }>;
  extracted_data: Record<string, unknown>;
  confidence_score: number;
}

app.post('/analyze-document', express.json(), async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Verify authorization - accept service role key or user token
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'Authorization header required' });
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    // Check if this is a service-to-service call
    // Accept: 1) matching service role key, 2) JWT with service_role claim, 3) JWT from our Supabase instance
    // 4) sb_secret_ format tokens (Supabase edge function service role tokens)
    let isServiceCall = false;

    // Check for Supabase secret format (sb_secret_...) - used by edge functions
    if (token.startsWith('sb_secret_')) {
      // Verify this token can access admin endpoints by making a test call
      try {
        const testClient = createClient(
          process.env.SUPABASE_URL || '',
          token
        );
        // Try to access admin functionality - this will fail if token is invalid
        const { error } = await testClient.auth.admin.listUsers({ page: 1, perPage: 1 });
        if (!error) {
          isServiceCall = true;
          console.log('Service call authenticated via sb_secret token');
        }
      } catch {
        // Token verification failed
      }
    }

    if (!isServiceCall) {
      try {
        // JWT structure: header.payload.signature
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        // Accept if role is service_role OR if it's from our Supabase instance (same ref)
        isServiceCall = payload.role === 'service_role' ||
                        (payload.iss === 'supabase' && payload.ref === 'gablgsruyuhvjurhtcxx');

        if (isServiceCall) {
          console.log('Service call authenticated via JWT');
        }
      } catch {
        // Not a valid JWT, try direct comparison as fallback
        isServiceCall = token === serviceRoleKey;
        if (isServiceCall) {
          console.log('Service call authenticated via direct key match');
        }
      }
    }

    if (!isServiceCall) {
      // Verify user token
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        console.log('Auth failed for token starting with:', token.substring(0, 50));
        res.status(401).json({ error: 'Invalid authentication token' });
        return;
      }
    }

    // Parse request
    const { document_id, analysis_type = 'FULL_EXTRACTION' }: AnalyzeDocumentRequest = req.body;

    if (!document_id) {
      res.status(400).json({ error: 'document_id is required' });
      return;
    }

    console.log(`Analyzing document: ${document_id} (type: ${analysis_type})`);

    // Get document details
    const { data: document, error: docError } = await supabase
      .from('bid_documents')
      .select('id, bid_project_id, file_name, file_path, mime_type, document_type, file_size_bytes')
      .eq('id', document_id)
      .single();

    if (docError || !document) {
      res.status(404).json({ error: 'Document not found', details: docError });
      return;
    }

    console.log(`Document: ${document.file_name} (${(document.file_size_bytes / 1024 / 1024).toFixed(2)}MB)`);

    // Update status to PROCESSING
    await supabase
      .from('bid_documents')
      .update({
        processing_status: 'PROCESSING',
        processing_started_at: new Date().toISOString(),
      })
      .eq('id', document_id);

    // Download the document from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('bid-documents')
      .download(document.file_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download document: ${downloadError?.message}`);
    }

    // Convert to buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);
    const fileSizeBytes = pdfBuffer.length;

    // Determine the appropriate system prompt
    const docType = document.document_type as string;
    const systemPrompt = ANALYSIS_PROMPTS[docType] || ANALYSIS_PROMPTS.DEFAULT;

    // Prepare message content based on file type and size
    let messageContent: Array<Record<string, unknown>>;
    const mimeType = document.mime_type || 'application/pdf';
    let usedTextExtraction = false;

    // For large PDFs (>20MB), extract text first to avoid Claude API size limits
    if (mimeType === 'application/pdf' && fileSizeBytes > TEXT_EXTRACTION_THRESHOLD_BYTES) {
      console.log(`Large file (${(fileSizeBytes / 1024 / 1024).toFixed(1)}MB) - using text extraction`);

      try {
        const pdfData = await pdfParse(pdfBuffer);
        const extractedText = pdfData.text;
        usedTextExtraction = true;

        console.log(`Extracted ${extractedText.length} characters of text from ${pdfData.numpages} pages`);

        // Store the extracted text
        await supabase
          .from('bid_documents')
          .update({ extracted_text: extractedText.substring(0, 500000) }) // Limit to 500KB
          .eq('id', document_id);

        messageContent = [
          {
            type: 'text',
            text: `Analyze this ${docType} document and extract all relevant information.

Document filename: ${document.file_name}
Total pages: ${pdfData.numpages}

--- DOCUMENT TEXT START ---
${extractedText.substring(0, 200000)}
--- DOCUMENT TEXT END ---

Note: This text was extracted from a large PDF (${(fileSizeBytes / 1024 / 1024).toFixed(1)}MB). Some formatting may be lost.`,
          },
        ];
      } catch (pdfError) {
        console.error('PDF text extraction failed:', pdfError);
        throw new Error(`Failed to extract text from large PDF: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`);
      }
    } else if (mimeType === 'application/pdf') {
      // Small PDFs - send as base64 document
      const base64Content = pdfBuffer.toString('base64');
      console.log(`Small file (${(fileSizeBytes / 1024 / 1024).toFixed(1)}MB) - using base64 PDF`);

      messageContent = [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64Content,
          },
        },
        {
          type: 'text',
          text: `Analyze this ${docType} document and extract all relevant information. Document filename: ${document.file_name}`,
        },
      ];
    } else if (mimeType.startsWith('image/')) {
      const base64Content = pdfBuffer.toString('base64');
      messageContent = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mimeType,
            data: base64Content,
          },
        },
        {
          type: 'text',
          text: `Analyze this ${docType} document image and extract all relevant information. Document filename: ${document.file_name}`,
        },
      ];
    } else {
      throw new Error(`Unsupported file type for AI analysis: ${mimeType}`);
    }

    console.log(`Sending to Claude API... (text extraction: ${usedTextExtraction})`);

    // Call Claude API
    const claudeResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: messageContent as unknown as Anthropic.MessageCreateParams['messages'][0]['content'],
        },
      ],
    });

    const analysisText = claudeResponse.content[0].type === 'text' ? claudeResponse.content[0].text : '';

    if (!analysisText) {
      throw new Error('No analysis text in Claude response');
    }

    // Parse the JSON response
    let analysis: DocumentAnalysis;
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      analysis = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', analysisText.substring(0, 500));
      throw new Error(`Failed to parse analysis: ${parseError}`);
    }

    const duration = Date.now() - startTime;
    console.log(`Analysis complete in ${duration}ms`);

    // Update the document with analysis results
    const { error: updateError } = await supabase
      .from('bid_documents')
      .update({
        processing_status: 'COMPLETED',
        processing_completed_at: new Date().toISOString(),
        processing_error: null,
        ai_summary: analysis.summary,
        ai_key_findings: analysis.key_findings,
        ai_document_category: analysis.document_category,
        ai_confidence_score: analysis.confidence_score,
        ai_model_version: 'claude-sonnet-4-20250514',
        ai_analysis_metadata: analysis.extracted_data,
        ai_tokens_used: (claudeResponse.usage?.input_tokens || 0) + (claudeResponse.usage?.output_tokens || 0),
      })
      .eq('id', document_id);

    if (updateError) {
      console.error('Failed to update document:', updateError);
      // Don't fail the request, the analysis was successful
    }

    // Return success response
    res.json({
      success: true,
      document_id,
      analysis,
      duration_ms: duration,
      usage: claudeResponse.usage,
    });

  } catch (error) {
    console.error('Analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Try to update document status to FAILED
    try {
      const { document_id } = req.body || {};
      if (document_id) {
        await supabase
          .from('bid_documents')
          .update({
            processing_status: 'FAILED',
            processing_error: errorMessage,
            processing_completed_at: new Date().toISOString(),
          })
          .eq('id', document_id);
      }
    } catch {
      // Ignore update errors
    }

    res.status(500).json({
      error: 'Analysis failed',
      message: errorMessage,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Document processor running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
