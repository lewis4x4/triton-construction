-- ============================================================================
-- Migration 099: Bid Module Comprehensive Seed Data
-- ============================================================================
-- PURPOSE: Add demo data for bid intelligence module features
-- INCLUDES: Risks, Questions, Work Packages, Team Members, Executive Snapshots
-- CLEANUP: Delete with other sandbox data before production deployment
-- ============================================================================

-- ============================================================================
-- PART 1: Project Risks for Triplett Project
-- ============================================================================

INSERT INTO bid_project_risks (
  id, bid_project_id, category, type, title, description,
  source_text_excerpt, probability, cost_impact, schedule_impact, overall_severity,
  owner_vs_contractor, mitigation_strategy, estimated_cost_impact_high,
  review_status, review_notes, ai_generated, ai_confidence,
  created_at
) VALUES
-- Critical Risk: Rock Excavation Quantity
(
  'f1000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  'QUANTITY', 'RISK',
  'Rock Excavation Quantity Uncertainty',
  'Geotechnical report indicates variable rock conditions between stations 42+00 and 48+50. Core samples show limestone at depths ranging from 2ft to 12ft below grade. Actual rock quantities could exceed estimate by 30-40%.',
  'Geotechnical Report, Page 24-28',
  'HIGH', 'CRITICAL', 'HIGH', 'CRITICAL',
  'CONTRACTOR',
  'Request clarification on rock definition. Consider drilling additional test holes at critical cut sections. Include higher contingency in rock bid items.',
  125000.00,
  'NEEDS_REVIEW', NULL, true, 87,
  NOW() - INTERVAL '3 days'
),
-- High Risk: Schedule Constraint
(
  'f1000000-0000-0000-0000-000000000002',
  'c0000000-0000-0000-0000-000000000001',
  'SCHEDULE', 'RISK',
  'Paving Window Limitation',
  'WVDOH specs require asphalt placement between April 15 and October 15. With 150 working days and current schedule, paving operations will need to occur during the final season. Weather delays could push paving into restricted period.',
  'Section 401.04, Temperature Requirements',
  'HIGH', 'HIGH', 'HIGH', 'HIGH',
  'CONTRACTOR',
  'Front-load earthwork operations. Plan for overtime during peak paving season. Identify backup paving subcontractor.',
  75000.00,
  'APPROVED', 'Discussed with ops team - mitigation plan is solid', true, 92,
  NOW() - INTERVAL '2 days'
),
-- High Risk: Environmental
(
  'f1000000-0000-0000-0000-000000000003',
  'c0000000-0000-0000-0000-000000000001',
  'ENVIRONMENTAL', 'RISK',
  'Stream Crossing Permit Timing',
  'Project requires USACE Section 404 permit for stream crossing at STA 45+00. Permit approval typically takes 90-120 days. Construction sequence may need modification if permit is delayed.',
  'Environmental Commitment Summary',
  'MEDIUM', 'HIGH', 'HIGH', 'HIGH',
  'OWNER',
  'Verify permit status with WVDOH. Plan alternate work sequencing to allow stream work last. Build relationship with USACE reviewer.',
  25000.00,
  'APPROVED', NULL, true, 78,
  NOW() - INTERVAL '4 days'
),
-- Medium Risk: Utility Relocation
(
  'f1000000-0000-0000-0000-000000000004',
  'c0000000-0000-0000-0000-000000000001',
  'SCOPE', 'RISK',
  'AEP Power Line Relocation Coordination',
  'Existing 12kV distribution line conflicts with proposed roadway alignment at STA 44+50. Plans show relocation by others but no coordination dates provided.',
  'Sheet U-3, Utility Relocation Plan',
  'MEDIUM', 'MEDIUM', 'MEDIUM', 'MEDIUM',
  'SHARED',
  'Submit RFI requesting utility relocation schedule. Include coordination meetings in project schedule. Identify work areas not dependent on utility relocation.',
  15000.00,
  'NEEDS_REVIEW', NULL, true, 85,
  NOW() - INTERVAL '1 day'
),
-- Medium Risk: Material Availability
(
  'f1000000-0000-0000-0000-000000000005',
  'c0000000-0000-0000-0000-000000000001',
  'MATERIAL', 'RISK',
  '36" RCP Pipe Availability',
  'Special provisions require Class III RCP per WVDOH specs. Current market lead times are 8-12 weeks. Early procurement recommended.',
  'Section 601.20, Pipe Requirements',
  'LOW', 'MEDIUM', 'MEDIUM', 'MEDIUM',
  'CONTRACTOR',
  'Contact suppliers immediately upon award. Consider pre-order with cancellation clause contingent on award.',
  5000.00,
  'APPROVED', 'Pre-order strategy approved by estimating manager', true, 90,
  NOW() - INTERVAL '5 days'
),
-- Low Risk: Traffic Control
(
  'f1000000-0000-0000-0000-000000000006',
  'c0000000-0000-0000-0000-000000000001',
  'MOT', 'RISK',
  'High Traffic Volume Impact',
  'US-19 carries 12,500 AADT. Flagging operations and lane closures may cause delays during peak hours. Potential for increased public complaints.',
  'Traffic Study, Table 2',
  'LOW', 'LOW', 'LOW', 'LOW',
  'CONTRACTOR',
  'Plan major operations during off-peak hours (9AM-3PM). Coordinate with WVDOH public information office. Use advanced warning signs.',
  10000.00,
  'APPROVED', NULL, true, 95,
  NOW() - INTERVAL '6 days'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PART 2: Pre-Bid Questions for Triplett Project
-- ============================================================================

INSERT INTO bid_prebid_questions (
  id, bid_project_id, question_number, question_text, justification,
  source_page_numbers, source_text,
  category, status,
  response_text, ai_confidence, ai_generated,
  created_at
) VALUES
-- Question 1: Rock Definition
(
  'a1000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  '1',
  'Please clarify the definition of rock for excavation purposes. The geotechnical report references "weathered limestone" at varying depths. Will material requiring ripping with a D8 dozer be classified as rock, or only material requiring blasting?',
  'The geotechnical report shows limestone at depths from 2-12 feet below existing grade. Classification method will significantly impact pricing.',
  '24',
  'Geotechnical Report - Section 203.02',
  'QUANTITY', 'AI_SUGGESTED',
  'Recommend requesting that WVDOH provide rippability criteria or allow test section to determine classification method.',
  85, true,
  NOW() - INTERVAL '2 days'
),
-- Question 2: Borrow Source
(
  'a1000000-0000-0000-0000-000000000002',
  'c0000000-0000-0000-0000-000000000001',
  '2',
  'Is there an approved borrow source for embankment material, or will the contractor be responsible for locating and obtaining permit approval for off-site borrow?',
  'Project requires approximately 38,000 CY of embankment. No borrow source is identified in the plans.',
  '3',
  'Plans - General Notes - Section 207.01',
  'MATERIAL', 'SUBMITTED',
  'WVDOH typically designates borrow sources on federal-aid projects. Requesting clarification on approved sources.',
  92, true,
  NOW() - INTERVAL '5 days'
),
-- Question 3: Utility Coordination
(
  'a1000000-0000-0000-0000-000000000003',
  'c0000000-0000-0000-0000-000000000001',
  '3',
  'Sheet U-3 indicates AEP power line relocation "by others prior to construction." Please provide the scheduled completion date for utility relocations and identify the responsible party.',
  'Work area adjacent to existing power line cannot be started until relocation is complete.',
  'U-3',
  'Utility Plans',
  'SCHEDULE', 'SUBMITTED',
  NULL,
  78, true,
  NOW() - INTERVAL '4 days'
),
-- Question 4: Drainage Clarification
(
  'a1000000-0000-0000-0000-000000000004',
  'c0000000-0000-0000-0000-000000000001',
  '4',
  'Drawing D-5 shows a Type C drop inlet at STA 43+50 with a 24" outlet, but the drainage profile shows a 36" mainline at this location. Please clarify the correct connection detail.',
  'Inlet outlet size must match mainline size or a reducer fitting is required.',
  'D-5',
  'Drainage Plans - Section 602.01',
  'CONSTRUCTABILITY', 'AI_SUGGESTED',
  'Likely a drafting error. 36" connection is probably correct based on upstream sizing.',
  88, true,
  NOW() - INTERVAL '1 day'
),
-- Question 5: Liquidated Damages
(
  'a1000000-0000-0000-0000-000000000005',
  'c0000000-0000-0000-0000-000000000001',
  '5',
  'Special Provision 108.08 references liquidated damages but does not specify the daily rate. Please confirm the liquidated damages amount per calendar day.',
  'Standard WVDOH rates vary by project value. Need confirmation for bid risk assessment.',
  '15',
  'Special Provisions - Section 108.08',
  'REGULATORY', 'ANSWERED',
  'Standard WVDOH rate for projects $3-5M is $1,500/day.',
  95, true,
  NOW() - INTERVAL '7 days'
),
-- Question 6: DBE Goal
(
  'a1000000-0000-0000-0000-000000000006',
  'c0000000-0000-0000-0000-000000000001',
  '6',
  'The project has an 8.0% DBE goal. Are there specific work categories that must be performed by DBE subcontractors, or is the goal applied to total contract value?',
  'Need to confirm DBE counting methodology for accurate commitment planning.',
  '2',
  'Proposal Form',
  'REGULATORY', 'AI_SUGGESTED',
  'DBE goal typically applies to total contract. Counting limited to commercially useful function.',
  82, true,
  NOW() - INTERVAL '3 days'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PART 3: Work Packages for Triplett Project
-- ============================================================================

INSERT INTO bid_work_packages (
  id, bid_project_id, package_name, package_code, package_number, description,
  work_category, status, sort_order, ai_generated,
  created_at
) VALUES
-- Work Package 1: Earthwork
(
  'b0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  'Earthwork Operations',
  'WP-EARTH',
  1,
  'All earthwork including excavation, rock removal, embankment, and grading operations. Primary self-perform work. Includes mobilization of dozer and excavator fleet.',
  'EARTHWORK',
  'IN_PROGRESS',
  1, true,
  NOW() - INTERVAL '5 days'
),
-- Work Package 2: Drainage
(
  'b0000000-0000-0000-0000-000000000002',
  'c0000000-0000-0000-0000-000000000001',
  'Storm Drainage Systems',
  'WP-DRAIN',
  2,
  'RCP pipe installation, drop inlets, headwalls, and outlet structures. Potential DBE subcontract opportunity.',
  'DRAINAGE',
  'PENDING',
  2, true,
  NOW() - INTERVAL '5 days'
),
-- Work Package 3: Base/Subbase
(
  'b0000000-0000-0000-0000-000000000003',
  'c0000000-0000-0000-0000-000000000001',
  'Aggregate Base Course',
  'WP-BASE',
  3,
  'Aggregate base course placement and compaction. Self-perform with owned equipment.',
  'PAVEMENT',
  'PENDING',
  3, true,
  NOW() - INTERVAL '4 days'
),
-- Work Package 4: Paving
(
  'b0000000-0000-0000-0000-000000000004',
  'c0000000-0000-0000-0000-000000000001',
  'Asphalt Paving',
  'WP-PAVE',
  4,
  'Superpave base and wearing course paving operations. Critical path work.',
  'PAVEMENT',
  'PENDING',
  4, true,
  NOW() - INTERVAL '3 days'
),
-- Work Package 5: Safety/Guardrail
(
  'b0000000-0000-0000-0000-000000000005',
  'c0000000-0000-0000-0000-000000000001',
  'Safety Features',
  'WP-SAFE',
  5,
  'Steel beam guardrail, terminal sections, and delineators. DBE subcontract opportunity.',
  'GUARDRAIL_BARRIER',
  'PENDING',
  5, true,
  NOW() - INTERVAL '4 days'
),
-- Work Package 6: Striping
(
  'b0000000-0000-0000-0000-000000000006',
  'c0000000-0000-0000-0000-000000000001',
  'Pavement Markings',
  'WP-MARK',
  6,
  'Thermoplastic pavement markings and RPMs. DBE subcontract opportunity.',
  'SIGNING_STRIPING',
  'PENDING',
  6, true,
  NOW() - INTERVAL '3 days'
),
-- Work Package 7: Traffic Control
(
  'b0000000-0000-0000-0000-000000000007',
  'c0000000-0000-0000-0000-000000000001',
  'Traffic Control',
  'WP-TRAF',
  7,
  'Temporary traffic control, flagging, and signage. DBE subcontract opportunity.',
  'MOT',
  'PENDING',
  7, true,
  NOW() - INTERVAL '2 days'
),
-- Work Package 8: Mobilization
(
  'b0000000-0000-0000-0000-000000000008',
  'c0000000-0000-0000-0000-000000000001',
  'Mobilization & General Conditions',
  'WP-MOB',
  8,
  'Project mobilization, bonds, insurance, site facilities including office trailer rental, sanitary facilities, and security fencing.',
  'GENERAL_CONDITIONS',
  'IN_PROGRESS',
  8, true,
  NOW() - INTERVAL '6 days'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PART 4: Work Package Item Assignments
-- ============================================================================
-- NOTE: Skipped - requires bid_line_items to be populated first.
-- Work package items link work packages to specific bid line items.
-- These can be added once line items are created from document processing.

-- ============================================================================
-- PART 5: Executive Snapshot for Triplett Project
-- ============================================================================

INSERT INTO bid_executive_snapshots (
  id, bid_project_id, version_number, snapshot_date,
  project_overview, key_quantities_summary, risk_summary,
  environmental_summary, schedule_summary, cost_considerations, recommendations,
  total_line_items, total_estimated_value,
  critical_risks_count, high_risks_count,
  work_packages_count, environmental_commitments_count, hazmat_findings_count,
  prebid_questions_count,
  ai_model_used, is_current, reviewed,
  created_at
) VALUES
(
  'e0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  1,
  NOW(),
  'The US-19 Triplett Curve Safety Improvement project is a federally-funded highway reconstruction project in Braxton County, West Virginia. The 0.8-mile project involves significant horizontal and vertical realignment to improve safety at a historically problematic curve section. Work includes substantial earthwork operations (45,000 CY excavation, 8,500 CY rock, 38,000 CY embankment), new drainage infrastructure, full-depth asphalt paving, and modern safety features including guardrail and proper superelevation design.',

  'MAJOR QUANTITIES:
• Unclassified Excavation: 45,000 CY
• Rock Excavation: 8,500 CY (HIGH RISK - variable rock conditions)
• Embankment-In-Place: 38,000 CY
• Aggregate Base Course: 15,000 TON
• Superpave Base Course 19mm: 12,500 TON
• Superpave Wearing Course 9.5mm: 8,500 TON
• 24" RCP Storm Sewer: 850 LF
• 36" RCP Storm Sewer: 450 LF
• Steel Beam Guardrail: 2,400 LF (includes Addendum 3 increase)
• Thermoplastic Markings: 18,500 LF',

  'IDENTIFIED RISKS (6 Total, 1 Critical, 2 High):

CRITICAL: Rock Excavation Quantity (Risk Score: 20)
- Geotechnical report shows variable limestone depths (2-12 ft)
- Potential 30-40% quantity overrun
- Recommended: Submit RFI on rock definition, increase contingency

HIGH: Paving Window Limitation (Risk Score: 16)
- 150-day project with temperature-restricted paving
- Risk of weather delays pushing into restricted period
- Recommended: Front-load earthwork, plan overtime for paving

HIGH: Stream Crossing Permit (Risk Score: 12)
- Section 404 permit required for STA 45+00
- 90-120 day typical approval timeline
- Recommended: Verify status, plan alternate sequencing',

  'PROJECT ENVIRONMENTAL CONSIDERATIONS:
• Federal-aid project subject to NEPA requirements
• Stream crossing at STA 45+00 requires USACE Section 404 permit
• Project falls within Elk River watershed - erosion control critical
• No known wetland impacts identified
• Tree clearing limited to designated areas per environmental document
• Construction stormwater permit (WV/NPDES) required prior to ground disturbance
• Archaeological survey completed - no sites identified',

  'SCHEDULE ANALYSIS:
• Contract Duration: 150 working days
• Estimated Start: March 2025
• Estimated Completion: October 2025
• Critical Path: Earthwork → Base → Paving
• Key Constraints:
  - Asphalt placement window: April 15 - October 15
  - Utility relocation must precede work at STA 44+50
  - Stream work dependent on Section 404 permit

RECOMMENDED SEQUENCING:
1. Mobilization and erosion control
2. Begin earthwork from both ends toward stream crossing
3. Install drainage as cuts progress
4. Coordinate utility relocation
5. Begin base course upon completion of subgrade
6. Pave in single season if possible',

  'COST ANALYSIS:
• Engineers Estimate: $4,500,000
• Our Current Estimate: $4,250,000
• Variance: -5.6% (competitive position)

PRICING CONSIDERATIONS:
• Rock excavation carries highest uncertainty - bid conservative
• Paving costs locked with WV Paving quote - competitive rate
• DBE goal 8% - committed items total 8.7%
• Traffic control priced for full 150-day duration
• Mobilization at 4.4% of contract - slightly above typical

RECOMMENDED CONTINGENCY:
• Rock excavation: +$125,000 (30% of item)
• Schedule contingency: +$75,000
• General contingency: +$50,000
• Total recommended: $250,000 (5.9% of bid)',

  'AI RECOMMENDATIONS:
1. SUBMIT PRE-BID QUESTIONS on rock excavation definition and utility relocation schedule
2. VERIFY Section 404 permit status before final bid submission
3. LOCK IN paving subcontractor quote before bid day
4. CONFIRM DBE commitments meet 8% goal with signed letters of intent
5. CONSIDER hiring flagging supervisor given high traffic volume
6. PLAN for potential overtime during critical paving window
7. ESTABLISH material sources early - 8-12 week lead time on RCP pipe

COMPETITIVE ASSESSMENT:
Based on current market conditions and local competition, recommend bidding at $4,275,000 (5.0% below engineer estimate). This allows for contingency while remaining competitive.',

  14, -- total_line_items
  4250000.00, -- total_estimated_value
  1, -- critical_risks_count
  2, -- high_risks_count
  8, -- work_packages_count
  5, -- environmental_commitments_count
  0, -- hazmat_findings_count
  6, -- prebid_questions_count
  'claude-3-5-sonnet-20241022',
  true,
  false,
  NOW() - INTERVAL '1 day'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Summary
-- ============================================================================
-- This migration adds comprehensive demo data for the bid module:
-- - 6 project risks for Triplett project (various categories and severities)
-- - 6 pre-bid questions (mix of statuses: AI_SUGGESTED, SUBMITTED, ANSWERED)
-- - 8 work packages organized by work type
-- - 1 executive snapshot with full AI analysis
--
-- NOTE: Work package item assignments skipped (requires bid_line_items)
-- ============================================================================
