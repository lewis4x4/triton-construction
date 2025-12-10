import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.PORT || 3001;

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

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
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

// Start server
app.listen(PORT, () => {
  console.log(`Document processor running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
