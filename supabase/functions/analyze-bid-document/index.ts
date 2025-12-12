// Supabase Edge Function: analyze-bid-document
// Analyzes bid package documents using Claude AI to extract structured data
// Supports: PDF proposals, environmental reports, hazmat surveys, geotechnical reports, traffic studies, plans

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRequest {
  document_id: string;
  analysis_type?: 'FULL_EXTRACTION' | 'QUICK_SCAN' | 'TARGETED';
  target_fields?: string[]; // For TARGETED analysis
}

interface DocumentAnalysis {
  summary: string;
  document_category: string;
  key_findings: KeyFinding[];
  extracted_data: Record<string, unknown>;
  confidence_score: number;
}

interface KeyFinding {
  type: string;
  title: string;
  description: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  page_reference?: string;
  related_items?: string[];
}

// System prompts by document type
const SYSTEM_PROMPTS: Record<string, string> = {
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
    "timing_restrictions": [
      {
        "restriction": "description",
        "start_date": "MM-DD",
        "end_date": "MM-DD",
        "reason": "why"
      }
    ],
    "permits_required": ["array of permit types"],
    "mitigation_requirements": ["array of requirements"],
    "monitoring_requirements": ["array of monitoring items"],
    "environmental_commitments": ["numbered commitments from document"]
  },
  "confidence_score": 0-100
}

Always respond with valid JSON only.`,

  HAZMAT: `You are an expert hazardous materials analyst for construction projects.

Analyze the provided hazmat/asbestos document and extract:
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
    "asbestos_locations": [
      {
        "location": "description",
        "material_type": "pipe insulation, floor tile, etc.",
        "quantity": "amount with units",
        "condition": "good, damaged, friable"
      }
    ],
    "lead_paint_present": boolean,
    "lead_paint_locations": ["array of locations"],
    "other_hazmat": [
      {
        "material": "name",
        "location": "where",
        "quantity": "amount"
      }
    ],
    "abatement_required": boolean,
    "estimated_abatement_cost": number or null,
    "special_disposal_required": boolean,
    "licensed_contractor_required": boolean
  },
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
  "key_findings": [
    {
      "type": "SOIL|ROCK|GROUNDWATER|FOUNDATION|EARTHWORK|RISK",
      "title": "Brief title",
      "description": "Detailed description",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "page_reference": "Page X" or null
    }
  ],
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

  TRAFFIC_STUDY: `You are an expert traffic engineer analyzing traffic studies for WVDOH highway construction projects.

Analyze the provided traffic study document and extract:
1. Current traffic volumes (AADT, ADT, peak hour volumes)
2. Level of Service (LOS) analysis for intersections and road segments
3. Work zone requirements and traffic control recommendations
4. Detour requirements and routes if applicable
5. Speed limits and any speed reduction requirements
6. Crash/accident history data
7. Pedestrian and bicycle considerations
8. Special event or seasonal traffic considerations
9. Recommended construction phasing from traffic perspective

Provide a JSON response with this structure:
{
  "summary": "2-3 sentence summary of traffic conditions and key requirements",
  "document_category": "TRAFFIC_STUDY",
  "key_findings": [
    {
      "type": "VOLUME|LOS|WORK_ZONE|DETOUR|SAFETY|TIMING|PHASING",
      "title": "Brief title",
      "description": "Detailed description",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "page_reference": "Page X" or null
    }
  ],
  "extracted_data": {
    "aadt": number or null,
    "adt": number or null,
    "peak_hour_am_volume": number or null,
    "peak_hour_pm_volume": number or null,
    "peak_hour_am_time": "HH:MM-HH:MM" or null,
    "peak_hour_pm_time": "HH:MM-HH:MM" or null,
    "current_los": "A|B|C|D|E|F" or null,
    "projected_los_during_construction": "A|B|C|D|E|F" or null,
    "truck_percentage": number or null,
    "speed_limit_existing": number or null,
    "speed_limit_work_zone": number or null,
    "road_closure_allowed": boolean,
    "full_closure_hours": "description of allowed closure times" or null,
    "lane_closure_restrictions": ["array of restrictions"],
    "detour_required": boolean,
    "detour_routes": [
      {
        "description": "route description",
        "length_miles": number,
        "added_travel_time_minutes": number
      }
    ],
    "crash_history": {
      "period_years": number,
      "total_crashes": number,
      "fatal_crashes": number,
      "injury_crashes": number,
      "crash_rate": number or null
    },
    "work_zone_requirements": {
      "flaggers_required": boolean,
      "pilot_car_required": boolean,
      "temporary_signals_required": boolean,
      "night_work_required": boolean,
      "night_work_reason": "string or null",
      "police_officer_required": boolean,
      "rumble_strips_required": boolean,
      "portable_changeable_message_signs": number or null
    },
    "timing_restrictions": [
      {
        "restriction": "description",
        "reason": "why",
        "dates_or_times": "when"
      }
    ],
    "pedestrian_accommodations_required": boolean,
    "bicycle_accommodations_required": boolean,
    "school_zone_impacts": boolean,
    "special_events_considerations": ["array of events/dates to avoid"],
    "recommended_construction_phases": ["array of phasing recommendations"],
    "mot_plan_requirements": ["array of MOT requirements"]
  },
  "confidence_score": 0-100
}

Always respond with valid JSON only.`,

  HYDRAULIC: `You are an expert hydrologist/hydraulic engineer analyzing H&H reports for highway construction projects.

Analyze the provided hydrologic/hydraulic report and extract:
1. Design storm frequencies and flow calculations
2. Drainage structure sizing (pipes, culverts, bridges)
3. Flood elevations and restrictions
4. Scour analysis and protection requirements
5. Detention/retention requirements
6. Downstream drainage impacts
7. Water quality/stormwater management requirements

Provide a JSON response with this structure:
{
  "summary": "2-3 sentence summary of hydraulic conditions and requirements",
  "document_category": "HYDRAULIC",
  "key_findings": [
    {
      "type": "DESIGN_FLOW|STRUCTURE_SIZING|FLOOD|SCOUR|DETENTION|DOWNSTREAM|WATER_QUALITY",
      "title": "Brief title",
      "description": "Detailed description including calculations or requirements",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "page_reference": "Page X" or null,
      "related_items": ["pipe sizes, culvert numbers, etc."]
    }
  ],
  "extracted_data": {
    "design_storm_frequency": "Q25, Q50, Q100, etc.",
    "drainage_area_acres": number or null,
    "peak_flow_cfs": number or null,
    "structures": [
      {
        "type": "PIPE|CULVERT|BRIDGE|BOX|INLET",
        "location": "station or description",
        "size": "dimensions",
        "material": "RCP, CMP, etc.",
        "length_feet": number,
        "design_capacity_cfs": number or null
      }
    ],
    "flood_elevation_constraints": [
      {
        "location": "description",
        "base_flood_elevation": number,
        "design_elevation": number,
        "freeboard_required": number
      }
    ],
    "scour_analysis": {
      "scour_critical_structures": ["array of structures"],
      "scour_countermeasures": ["riprap, sheet pile, etc."]
    },
    "detention_required": boolean,
    "detention_volume_acre_feet": number or null,
    "water_quality_bmp_required": boolean,
    "downstream_restrictions": ["array of restrictions"],
    "timing_restrictions": [
      {
        "restriction": "description",
        "reason": "fish passage, flooding, etc.",
        "dates": "when"
      }
    ]
  },
  "confidence_score": 0-100
}

Always respond with valid JSON only.`,

  UTILITY_PLANS: `You are an expert utility coordinator analyzing utility relocation plans for highway construction projects.

Analyze the provided utility relocation document and extract:
1. All utilities present and their owners
2. Relocation responsibilities (owner vs contractor)
3. Relocation schedules and coordination requirements
4. Conflict locations and potential impacts
5. Cost responsibility allocation
6. Protection requirements during construction
7. Temporary service requirements

Provide a JSON response with this structure:
{
  "summary": "2-3 sentence summary of utility conflicts and coordination requirements",
  "document_category": "UTILITY_PLANS",
  "key_findings": [
    {
      "type": "CONFLICT|RELOCATION|TIMING|PROTECTION|COST|COORDINATION",
      "title": "Brief title",
      "description": "Detailed description including location and impact",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "page_reference": "Page X" or null,
      "related_items": ["affected bid items if identifiable"]
    }
  ],
  "extracted_data": {
    "utilities_present": [
      {
        "utility_type": "ELECTRIC|GAS|WATER|SEWER|TELECOM|FIBER|CABLE",
        "owner_name": "company name",
        "owner_contact": "name and phone if available",
        "relocation_required": boolean,
        "relocation_responsibility": "OWNER|CONTRACTOR|SHARED",
        "estimated_completion_date": "date or null",
        "cost_responsibility": "OWNER|CONTRACTOR|PROJECT"
      }
    ],
    "conflict_locations": [
      {
        "station": "station or offset",
        "description": "nature of conflict",
        "utility_type": "type",
        "severity": "MINOR|MODERATE|MAJOR",
        "resolution": "relocation, protection, etc."
      }
    ],
    "relocation_schedule": [
      {
        "utility_type": "type",
        "owner": "company",
        "start_date": "date or null",
        "end_date": "date or null",
        "must_complete_before": "description of dependent work"
      }
    ],
    "contractor_responsibilities": ["array of contractor obligations"],
    "owner_responsibilities": ["array of utility owner obligations"],
    "protection_requirements": [
      {
        "utility_type": "type",
        "location": "where",
        "protection_method": "hand dig, steel plates, etc.",
        "clearance_required": "distance"
      }
    ],
    "temporary_services_required": ["array of temp service needs"],
    "utility_permits_required": ["array of required permits"],
    "pre_construction_meetings_required": boolean,
    "joint_use_agreements": ["any JUA requirements"],
    "estimated_utility_delays_days": number or null
  },
  "confidence_score": 0-100
}

Always respond with valid JSON only.`,

  ROW_PLANS: `You are an expert right-of-way analyst reviewing R/W plans for highway construction projects.

Analyze the provided right-of-way document and extract:
1. Property boundaries and parcels affected
2. Easement types and limitations
3. Temporary vs permanent R/W acquisitions
4. Access restrictions and staging areas
5. Property owner coordination requirements
6. Special conditions or encumbrances

Provide a JSON response with this structure:
{
  "summary": "2-3 sentence summary of R/W conditions and constraints",
  "document_category": "ROW_PLANS",
  "key_findings": [
    {
      "type": "EASEMENT|ACCESS|STAGING|PROPERTY|RESTRICTION|COORDINATION",
      "title": "Brief title",
      "description": "Detailed description",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "page_reference": "Page X" or null
    }
  ],
  "extracted_data": {
    "parcels_affected": [
      {
        "parcel_id": "identifier",
        "owner_name": "name if available",
        "acquisition_type": "FEE_SIMPLE|PERMANENT_EASEMENT|TEMPORARY_EASEMENT",
        "area_acres": number or null,
        "special_conditions": ["array of conditions"]
      }
    ],
    "easement_types": [
      {
        "type": "CONSTRUCTION|DRAINAGE|UTILITY|SLOPE|ACCESS",
        "location": "description",
        "duration": "PERMANENT|TEMPORARY",
        "restrictions": ["what cannot be done"]
      }
    ],
    "staging_areas": [
      {
        "location": "description",
        "area_acres": number or null,
        "access_route": "description",
        "restoration_required": boolean
      }
    ],
    "access_restrictions": ["array of access limitations"],
    "property_owner_coordination": [
      {
        "owner": "name",
        "issue": "access, crops, business, etc.",
        "requirement": "notification, scheduling, etc."
      }
    ],
    "existing_encumbrances": ["utilities, existing easements, etc."],
    "r/w_acquisition_complete": boolean,
    "outstanding_parcels": number or null,
    "condemnation_proceedings": boolean
  },
  "confidence_score": 0-100
}

Always respond with valid JSON only.`,

  PERMITS: `You are an expert regulatory compliance analyst reviewing permits and approvals for construction projects.

Analyze the provided permit/approval document and extract:
1. Permit type and issuing agency
2. Permit conditions and restrictions
3. Expiration dates and renewal requirements
4. Compliance monitoring requirements
5. Reporting obligations
6. Financial assurance requirements

Provide a JSON response with this structure:
{
  "summary": "2-3 sentence summary of permit requirements and conditions",
  "document_category": "PERMITS",
  "key_findings": [
    {
      "type": "CONDITION|RESTRICTION|DEADLINE|MONITORING|REPORTING|FINANCIAL",
      "title": "Brief title",
      "description": "Detailed description of requirement",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "page_reference": "Page X" or null
    }
  ],
  "extracted_data": {
    "permit_type": "404|NPDES|AIR_QUALITY|EROSION_SEDIMENT|STORMWATER|ENCROACHMENT|OTHER",
    "permit_number": "string",
    "issuing_agency": "agency name",
    "issue_date": "YYYY-MM-DD or null",
    "expiration_date": "YYYY-MM-DD or null",
    "project_reference": "project name/number in permit",
    "authorized_activities": ["what the permit allows"],
    "conditions": [
      {
        "condition_number": "number or id",
        "description": "full condition text",
        "compliance_method": "how to comply",
        "timing": "when compliance required"
      }
    ],
    "timing_restrictions": [
      {
        "restriction": "description",
        "start_date": "MM-DD",
        "end_date": "MM-DD",
        "reason": "species, water quality, etc."
      }
    ],
    "monitoring_requirements": [
      {
        "parameter": "what to monitor",
        "frequency": "how often",
        "method": "how to measure",
        "reporting": "where to report"
      }
    ],
    "reporting_requirements": [
      {
        "report_type": "type",
        "frequency": "timing",
        "due_date": "when",
        "submit_to": "agency/contact"
      }
    ],
    "financial_assurance": {
      "required": boolean,
      "type": "BOND|LETTER_OF_CREDIT|ESCROW",
      "amount": number or null
    },
    "penalties_for_violation": "description or null",
    "amendment_required_for": ["conditions requiring permit amendment"]
  },
  "confidence_score": 0-100
}

Always respond with valid JSON only.`,

  PREBID_MINUTES: `You are an expert construction bid analyst reviewing pre-bid meeting minutes.

Analyze the provided pre-bid meeting minutes and extract:
1. Questions asked by bidders and official answers
2. Clarifications on scope, schedule, or requirements
3. Site visit observations if included
4. Attendee information (for competitive intelligence)
5. Items to be addressed in future addenda
6. Owner expectations and preferences expressed

Provide a JSON response with this structure:
{
  "summary": "2-3 sentence summary of key meeting outcomes",
  "document_category": "PREBID_MINUTES",
  "key_findings": [
    {
      "type": "CLARIFICATION|SCOPE_CHANGE|SCHEDULE|SITE_CONDITION|SPECIFICATION|WARNING",
      "title": "Brief title",
      "description": "Detailed description",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "related_items": ["affected bid items if identifiable"]
    }
  ],
  "extracted_data": {
    "meeting_date": "YYYY-MM-DD",
    "meeting_location": "description",
    "owner_representatives": ["names and titles"],
    "attendees": [
      {
        "company_name": "name",
        "representative_name": "name if available",
        "contact_info": "phone/email if available"
      }
    ],
    "questions_and_answers": [
      {
        "question_number": number,
        "asked_by": "company or anonymous",
        "question": "full question text",
        "answer": "official answer",
        "affects_bid_items": ["item numbers if applicable"],
        "addendum_required": boolean
      }
    ],
    "site_visit_observations": [
      {
        "location": "where",
        "observation": "what was noted",
        "impact": "how it affects construction"
      }
    ],
    "clarifications": [
      {
        "topic": "subject",
        "clarification": "official clarification",
        "source": "who provided"
      }
    ],
    "pending_addendum_items": ["items to be addressed in addenda"],
    "owner_preferences": ["expressed preferences for means/methods"],
    "schedule_discussions": {
      "completion_emphasis": boolean,
      "phasing_requirements": ["discussed phases"],
      "milestone_dates": ["key dates discussed"]
    },
    "competitive_intelligence": {
      "number_of_attendees": number,
      "known_competitors": ["company names"],
      "subcontractor_attendees": ["sub names if present"]
    }
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
  "key_findings": [
    {
      "type": "REQUIREMENT|SPECIFICATION|QUANTITY|RISK|CONSTRAINT|CLARIFICATION",
      "title": "Brief title",
      "description": "Detailed description",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "page_reference": "Page X" or null
    }
  ],
  "extracted_data": {
    // Relevant structured data based on document content
  },
  "confidence_score": 0-100
}

Always respond with valid JSON only.`
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  let parsedRequest: AnalysisRequest | null = null;

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request (store for error handler)
    parsedRequest = await req.json();
    const { document_id, analysis_type = 'FULL_EXTRACTION' } = parsedRequest;

    if (!document_id) {
      return new Response(
        JSON.stringify({ error: 'document_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')!;

    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    // Check if this is a service-to-service call (service role key in auth header)
    const token = authHeader.replace('Bearer ', '');

    // Check for service role authentication in multiple ways:
    // 1. Direct key match
    // 2. JWT with service_role claim
    let isServiceRoleCall = token === supabaseServiceKey;

    if (!isServiceRoleCall) {
      try {
        // Try to decode JWT and check for service_role
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          // Accept if role is service_role from our Supabase instance
          if (payload.role === 'service_role' && payload.ref === 'gablgsruyuhvjurhtcxx') {
            isServiceRoleCall = true;
          }
        }
      } catch {
        // Not a valid JWT, continue with user auth
      }
    }

    if (!isServiceRoleCall) {
      // User authentication flow
      const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Verify user is authenticated
      const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid authentication' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify user has access to this document through its project (RLS will enforce this)
      const { data: docAccess, error: accessError } = await supabaseUser
        .from('bid_documents')
        .select('id, bid_project_id')
        .eq('id', document_id)
        .single();

      if (accessError || !docAccess) {
        return new Response(
          JSON.stringify({ error: 'Document not found or access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    // Service role calls are trusted (used by internal queue processor)

    // Create service role client for actual operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get document details
    const { data: document, error: docError } = await supabase
      .from('bid_documents')
      .select('id, bid_project_id, file_name, file_path, mime_type, document_type, processing_status')
      .eq('id', document_id)
      .single();

    if (docError || !document) {
      return new Response(
        JSON.stringify({ error: 'Document not found', details: docError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to PROCESSING
    await supabase
      .from('bid_documents')
      .update({
        processing_status: 'PROCESSING',
        processing_started_at: new Date().toISOString(),
      })
      .eq('id', document_id);

    // Create analysis log entry
    const { data: logEntry } = await supabase
      .from('bid_document_analysis_log')
      .insert({
        document_id: document.id,
        bid_project_id: document.bid_project_id,
        analysis_type,
        status: 'PROCESSING',
        ai_provider: 'anthropic',
        ai_model: 'claude-sonnet-4-20250514',
      })
      .select()
      .single();

    // Download the document from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('bid-documents')
      .download(document.file_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download document: ${downloadError?.message}`);
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64Content = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    // Determine the appropriate system prompt
    const docType = document.document_type as string;
    const systemPrompt = SYSTEM_PROMPTS[docType] || SYSTEM_PROMPTS.DEFAULT;

    // Prepare the message content based on file type
    let messageContent: Array<{ type: string; source?: { type: string; media_type: string; data: string }; text?: string }>;
    const mimeType = document.mime_type || 'application/pdf';

    if (mimeType === 'application/pdf') {
      // Use Claude's native PDF support
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
      // Handle images directly
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
    } else if (mimeType.includes('xml')) {
      // For XML (like Bidx), just send as text - this should be handled by parse-bidx instead
      const textContent = new TextDecoder().decode(new Uint8Array(arrayBuffer));
      messageContent = [
        {
          type: 'text',
          text: `Analyze this ${docType} XML document:\n\n${textContent.substring(0, 100000)}\n\nDocument filename: ${document.file_name}`,
        },
      ];
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    // Call Claude API
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: messageContent,
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      throw new Error(`Claude API error: ${claudeResponse.status} - ${errorText}`);
    }

    const claudeResult = await claudeResponse.json();
    const analysisText = claudeResult.content[0]?.text;

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
      console.error('Failed to parse Claude response:', analysisText);
      throw new Error(`Failed to parse analysis: ${parseError}`);
    }

    // Calculate duration
    const duration = Date.now() - startTime;

    // Update the document with analysis results
    const { error: updateError } = await supabase
      .from('bid_documents')
      .update({
        processing_status: 'COMPLETED',
        processing_completed_at: new Date().toISOString(),
        ai_summary: analysis.summary,
        ai_key_findings: analysis.key_findings,
        ai_document_category: analysis.document_category,
        ai_confidence_score: analysis.confidence_score,
        ai_model_version: 'claude-sonnet-4-20250514',
        ai_analysis_metadata: analysis.extracted_data,
        ai_tokens_used: (claudeResult.usage?.input_tokens || 0) + (claudeResult.usage?.output_tokens || 0),
      })
      .eq('id', document_id);

    if (updateError) {
      throw new Error(`Failed to update document: ${updateError.message}`);
    }

    // Update the log entry
    if (logEntry) {
      await supabase
        .from('bid_document_analysis_log')
        .update({
          status: 'COMPLETED',
          completed_at: new Date().toISOString(),
          duration_ms: duration,
          input_tokens: claudeResult.usage?.input_tokens,
          output_tokens: claudeResult.usage?.output_tokens,
          success: true,
          response_payload: { analysis },
        })
        .eq('id', logEntry.id);
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        document_id,
        analysis,
        duration_ms: duration,
        usage: claudeResult.usage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Try to update document status to FAILED (use stored parsedRequest to avoid double req.json())
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      if (parsedRequest?.document_id) {
        await supabase
          .from('bid_documents')
          .update({
            processing_status: 'FAILED',
            processing_error: errorMessage,
            processing_completed_at: new Date().toISOString(),
          })
          .eq('id', parsedRequest.document_id);
      }
    } catch {
      // Ignore update errors
    }

    return new Response(
      JSON.stringify({
        error: 'Analysis failed',
        message: errorMessage,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
