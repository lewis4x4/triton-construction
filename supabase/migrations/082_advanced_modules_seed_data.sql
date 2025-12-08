-- =============================================================================
-- Migration 082: Advanced Modules Seed Data
-- =============================================================================
-- PURPOSE: Demo data for Safety, Materials, and Quality advanced modules
-- DEPENDS ON: 079, 080, 081 migrations
-- =============================================================================

-- Key UUIDs (matching 065 seed data):
-- Organization: a0000000-0000-0000-0000-000000000001
-- Project Corridor H: b0000000-0000-0000-0000-000000000001
-- Project US-35 Bridge: b0000000-0000-0000-0000-000000000002
-- Project I-64 Widening: b0000000-0000-0000-0000-000000000003
-- Employees: c0000000-0000-0000-0000-00000000000X

-- =============================================================================
-- PART 1: Suppliers (needed for Materials module)
-- =============================================================================

INSERT INTO public.suppliers (
  id, organization_id, company_name, dba_name, primary_contact_name, primary_contact_email, primary_contact_phone,
  address_line1, city, state, zip_code, is_wvdoh_approved, wvdoh_approval_number,
  buy_america_certified, domestic_content_percentage, approved_materials, material_categories, status
) VALUES
-- Supplier 1: Concrete
(
  'a1000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Mountain Ready Mix',
  'MRM Concrete',
  'Frank Stone',
  'frank@mountainreadymix.com',
  '304-555-3001',
  '1500 Concrete Plant Road',
  'Charleston',
  'WV',
  '25301',
  true,
  'WVDOH-SUP-2024-0101',
  true,
  95,
  '["Concrete Class A", "Concrete Class AA", "Concrete Class K", "Flowable Fill"]',
  ARRAY['Concrete'],
  'ACTIVE'
),
-- Supplier 2: Asphalt
(
  'a1000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'Appalachian Asphalt',
  'AA Paving',
  'Gary Blacktop',
  'gary@appasphalt.com',
  '304-555-3002',
  '2500 Hot Mix Lane',
  'Huntington',
  'WV',
  '25701',
  true,
  'WVDOH-SUP-2024-0102',
  true,
  100,
  '["Base I", "Base II", "Surface Course Type 1", "Surface Course Type 2", "Wearing Course"]',
  ARRAY['Asphalt'],
  'ACTIVE'
),
-- Supplier 3: Aggregate
(
  'a1000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'Valley Stone Quarry',
  'VSQ',
  'Pete Gravel',
  'pete@valleystone.com',
  '304-555-3003',
  '800 Quarry Road',
  'Clarksburg',
  'WV',
  '26301',
  true,
  'WVDOH-SUP-2024-0103',
  true,
  100,
  '["#57 Stone", "#67 Stone", "#8 Stone", "Crusher Run", "Rip Rap", "Channel Lining"]',
  ARRAY['Aggregate'],
  'ACTIVE'
),
-- Supplier 4: Steel/Rebar
(
  'a1000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000001',
  'Steel City Supply',
  'SCS',
  'Mike Iron',
  'mike@steelcitysupply.com',
  '304-555-3004',
  '400 Industrial Boulevard',
  'Wheeling',
  'WV',
  '26003',
  true,
  'WVDOH-SUP-2024-0104',
  true,
  85,
  '["Rebar #4", "Rebar #5", "Rebar #6", "Rebar #8", "Structural Steel", "Guardrail"]',
  ARRAY['Steel', 'Rebar'],
  'ACTIVE'
),
-- Supplier 5: Pipe/Drainage
(
  'a1000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000001',
  'Pipe Masters Inc',
  NULL,
  'Tom Culvert',
  'tom@pipemasters.com',
  '304-555-3005',
  '600 Drainage Drive',
  'Parkersburg',
  'WV',
  '26101',
  true,
  'WVDOH-SUP-2024-0105',
  true,
  90,
  '["15in CMP", "18in CMP", "24in CMP", "36in CMP", "RCP Class III", "RCP Class IV", "RCP Class V"]',
  ARRAY['Pipe', 'Drainage'],
  'ACTIVE'
)
ON CONFLICT (id) DO UPDATE SET company_name = EXCLUDED.company_name;

-- =============================================================================
-- PART 2: Material Tickets (base records for line items)
-- =============================================================================

INSERT INTO public.material_tickets (
  id, organization_id, project_id, ticket_number, delivery_date, supplier_id,
  material_description, quantity, unit_of_measure,
  delivery_location, driver_name, truck_number, status
) VALUES
-- Concrete tickets for Corridor H
(
  'b1000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'MRM-2024-11-0001',
  '2024-11-15',
  'a1000000-0000-0000-0000-000000000001',
  'Concrete Class AA',
  10.5,
  'CY',
  'Station 142+00 Box Culvert',
  'John Driver',
  'T-101',
  'verified'
),
(
  'b1000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'MRM-2024-11-0002',
  '2024-11-15',
  'a1000000-0000-0000-0000-000000000001',
  'Concrete Class AA',
  10.5,
  'CY',
  'Station 142+00 Box Culvert',
  'John Driver',
  'T-101',
  'verified'
),
-- Asphalt tickets for Corridor H
(
  'b1000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'AA-2024-11-0015',
  '2024-11-20',
  'a1000000-0000-0000-0000-000000000002',
  'Base II Asphalt',
  24.5,
  'TON',
  'Station 140+00 to 142+00',
  'Bill Haul',
  'T-205',
  'verified'
),
(
  'b1000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'AA-2024-11-0016',
  '2024-11-20',
  'a1000000-0000-0000-0000-000000000002',
  'Base II Asphalt',
  25.2,
  'TON',
  'Station 140+00 to 142+00',
  'Bill Haul',
  'T-205',
  'verified'
),
-- Aggregate tickets
(
  'b1000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'VSQ-2024-11-0045',
  '2024-11-18',
  'a1000000-0000-0000-0000-000000000003',
  '#57 Stone',
  18.0,
  'TON',
  'Station 145+00 Storm Drain',
  'Earl Stone',
  'T-308',
  'verified'
),
-- Rebar for US-35 Bridge
(
  'b1000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000002',
  'SCS-2024-11-0088',
  '2024-11-22',
  'a1000000-0000-0000-0000-000000000004',
  'Rebar #5',
  5000,
  'LB',
  'East Abutment',
  'Ted Steel',
  'F-15',
  'verified'
),
-- Pipe for Corridor H
(
  'b1000000-0000-0000-0000-000000000007',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'PM-2024-11-0023',
  '2024-11-19',
  'a1000000-0000-0000-0000-000000000005',
  '24in CMP',
  120,
  'LF',
  'Station 143+00 Cross Drain',
  'Rick Pipe',
  'F-22',
  'verified'
)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

-- =============================================================================
-- PART 3: Concrete Batch Details
-- =============================================================================

INSERT INTO public.concrete_batch_details (
  id, material_ticket_id, batch_number, batch_time, mix_design_number,
  plant_name, load_size_cy,
  specified_slump, slump_at_site, air_content, water_added_gal, max_water_cement_ratio,
  admixtures, ambient_temp_f, concrete_temp_f
) VALUES
(
  'c1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000001',
  'BT-2024-11-15-001',
  '2024-11-15 09:45:00',
  'AA-4000-1',
  'Mountain Ready Mix',
  10.5,
  4.0,
  3.75,
  6.2,
  2,
  0.42,
  '["Air Entraining", "Water Reducer"]',
  52,
  58
),
(
  'c1000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000002',
  'BT-2024-11-15-002',
  '2024-11-15 11:00:00',
  'AA-4000-1',
  'Mountain Ready Mix',
  10.5,
  4.0,
  4.25,
  5.8,
  0,
  0.42,
  '["Air Entraining", "Water Reducer"]',
  55,
  60
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- PART 4: Asphalt Delivery Details
-- =============================================================================

INSERT INTO public.asphalt_delivery_details (
  id, material_ticket_id, mix_design_number, mix_type, plant_name,
  plant_temp_f, arrival_temp_f, pggrade,
  gross_weight_tons, tare_weight_tons, net_weight_tons
) VALUES
(
  'd1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000003',
  'BASE2-2024-01',
  'Base II',
  'Appalachian Asphalt Plant #1',
  325,
  310,
  'PG 64-22',
  34.25,
  9.50,
  24.75
),
(
  'd1000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000004',
  'BASE2-2024-01',
  'Base II',
  'Appalachian Asphalt Plant #1',
  320,
  305,
  'PG 64-22',
  34.60,
  9.50,
  25.10
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- PART 5: Material Certifications
-- =============================================================================

INSERT INTO public.material_certifications (
  id, organization_id, project_id, cert_type, cert_number, description,
  supplier_id, cert_date, expiration_date, document_url,
  is_buy_america, domestic_content_pct, status
) VALUES
-- Concrete Mill Cert
(
  'e1000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'MILL_CERT',
  'MC-MRM-2024-001',
  'Concrete Class AA Mill Certification - Mountain Ready Mix',
  'a1000000-0000-0000-0000-000000000001',
  '2024-01-15',
  '2025-01-15',
  '/certs/mrm-concrete-2024.pdf',
  true,
  95,
  'VERIFIED'
),
-- Asphalt Mix Design
(
  'e1000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'MIX_DESIGN',
  'JMF-AA-BASE2-2024',
  'Base II Job Mix Formula - Appalachian Asphalt',
  'a1000000-0000-0000-0000-000000000002',
  '2024-03-01',
  '2025-03-01',
  '/certs/aa-base2-jmf.pdf',
  true,
  100,
  'VERIFIED'
),
-- Steel Mill Cert with Buy America
(
  'e1000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'MILL_CERT',
  'MC-SCS-2024-042',
  'Rebar #5 Mill Certification - Steel City Supply',
  'a1000000-0000-0000-0000-000000000004',
  '2024-06-10',
  '2025-06-10',
  '/certs/scs-rebar5-mill.pdf',
  true,
  100,
  'VERIFIED'
),
-- Buy America Certificate
(
  'e1000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'BUY_AMERICA',
  'BA-SCS-2024-001',
  'Rebar Buy America Certification - Steel City Supply',
  'a1000000-0000-0000-0000-000000000004',
  '2024-01-01',
  '2024-12-31',
  '/certs/scs-buy-america-2024.pdf',
  true,
  100,
  'VERIFIED'
),
-- Aggregate Test Report
(
  'e1000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'TEST_REPORT',
  'QC-VSQ-2024-011',
  '#57 Stone Quality Test Report - Valley Stone Quarry',
  'a1000000-0000-0000-0000-000000000003',
  '2024-04-15',
  '2025-04-15',
  '/certs/vsq-57stone-quality.pdf',
  true,
  100,
  'VERIFIED'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- PART 6: Material Inventory
-- =============================================================================

INSERT INTO public.material_inventory (
  id, organization_id, project_id, material_code, description, unit_of_measure,
  material_category, quantity_on_hand, quantity_reserved, min_stock_level, reorder_point,
  storage_location, primary_supplier_id, last_count_date, last_count_quantity
) VALUES
-- Corridor H Inventory
(
  'f1000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'AGG-57',
  '#57 Stone Aggregate',
  'TON',
  'aggregate',
  150,
  50,
  100,
  120,
  'Staging Area A - Station 140+00',
  'a1000000-0000-0000-0000-000000000003',
  '2024-12-01',
  150
),
(
  'f1000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'PIPE-CMP-24',
  '24in Corrugated Metal Pipe',
  'LF',
  'pipe',
  80,
  40,
  50,
  60,
  'Pipe Yard - Station 138+00',
  'a1000000-0000-0000-0000-000000000005',
  '2024-12-01',
  80
),
(
  'f1000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'EC-SILTF',
  'Silt Fence Erosion Control',
  'LF',
  'other',
  500,
  100,
  200,
  300,
  'BMP Supplies - Staging Area B',
  NULL,
  '2024-12-01',
  500
),
-- US-35 Bridge Inventory
(
  'f1000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000002',
  'REBAR-5',
  'Reinforcing Steel Bar #5',
  'LB',
  'steel',
  12000,
  5000,
  8000,
  10000,
  'Steel Storage - East Side',
  'a1000000-0000-0000-0000-000000000004',
  '2024-12-02',
  12000
),
(
  'f1000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000002',
  'REBAR-8',
  'Reinforcing Steel Bar #8',
  'LB',
  'steel',
  8000,
  3000,
  5000,
  6000,
  'Steel Storage - East Side',
  'a1000000-0000-0000-0000-000000000004',
  '2024-12-02',
  8000
),
(
  'f1000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000002',
  'FORM-OIL',
  'Form Release Oil',
  'GAL',
  'other',
  25,
  10,
  20,
  25,
  'Form Storage Area',
  NULL,
  '2024-12-02',
  25
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- PART 7: Supplier Quality Scores
-- =============================================================================
-- Note: on_time_pct, quality_score, documentation_score, delivery_score, overall_score
-- are GENERATED columns computed automatically from the raw data columns

INSERT INTO public.supplier_quality_scores (
  id, organization_id, supplier_id, score_year, score_quarter,
  on_time_deliveries, total_deliveries, quality_issues, documentation_issues, notes
) VALUES
(
  'a2000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  2024,
  4,
  28,
  30,
  1,
  0,
  'Excellent service. One load arrived 15 min late due to traffic.'
),
(
  'a2000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000002',
  2024,
  4,
  42,
  45,
  2,
  1,
  'Good overall. Two loads had temp issues, corrected next day.'
),
(
  'a2000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000003',
  2024,
  4,
  35,
  35,
  0,
  0,
  'Perfect record this month. Very reliable.'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- PART 8: Toolbox Talk Templates
-- =============================================================================

INSERT INTO public.toolbox_talk_templates (
  id, organization_id, title, category, description, talking_points,
  discussion_questions, ppe_requirements, estimated_duration_minutes, is_active
) VALUES
(
  'b2000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Excavation & Trenching Safety',
  'excavation',
  'OSHA excavation safety requirements and best practices for trenching operations',
  ARRAY['Always classify soil before entering trench', 'Protective systems required for trenches 5ft+', 'Competent person must be on site', 'Ladders within 25ft of all workers', 'Daily inspections and after rain events'],
  ARRAY['What is the soil classification at your current work area?', 'Where is the nearest ladder located?', 'Who is the competent person today?'],
  ARRAY['Hard hat', 'Safety glasses', 'Steel-toe boots', 'High-visibility vest'],
  15,
  true
),
(
  'b2000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'Fall Protection Requirements',
  'fall_protection',
  'Requirements for fall protection at 6ft+ and proper equipment use',
  ARRAY['Required at 6ft or more above lower level', 'Guardrails: 42in top rail, 21in mid rail', 'Personal fall arrest: harness + lanyard + anchor', 'Check equipment for cuts, burns, fraying', 'Verify anchor point rating: 5000 lbs minimum'],
  ARRAY['What fall protection are you using today?', 'When was your harness last inspected?', 'Where is your anchor point?'],
  ARRAY['Full body harness', 'Lanyard', 'Hard hat', 'Safety glasses'],
  15,
  true
),
(
  'b2000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'Concrete Pour Safety',
  'concrete',
  'Hazards and PPE requirements for concrete placement operations',
  ARRAY['Wet concrete causes chemical burns (pH 13)', 'Watch for struck-by from pump boom or bucket', 'Slips/trips on wet surfaces', 'Wash skin immediately if contact', 'Never kneel in fresh concrete'],
  ARRAY['Where is the water station for washing?', 'What PPE are you wearing for the pour?', 'Who is your spotter for the pump truck?'],
  ARRAY['Waterproof rubber boots', 'Long sleeves and pants', 'Alkali-resistant gloves', 'Safety glasses', 'Face shield when chipping'],
  10,
  true
),
(
  'b2000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000001',
  'Hot Weather Work',
  'environmental',
  'Heat illness prevention and recognition for summer work',
  ARRAY['Drink 8oz water every 15-20 minutes', 'Take breaks in shade', 'Know signs: cramps, exhaustion, stroke', 'Watch your coworkers', 'New workers need gradual acclimatization'],
  ARRAY['Where is the nearest shade/cooling station?', 'How much water have you had today?', 'What are signs of heat stroke?'],
  ARRAY['Light loose-fitting clothing', 'Wide-brim hard hat', 'Sunscreen', 'Cooling towel'],
  10,
  true
),
(
  'b2000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000001',
  'Struck-By Hazards',
  'struck_by',
  'Prevention of struck-by injuries from flying, falling, swinging, and rolling objects',
  ARRAY['Flying: nail guns, grinding, chipping', 'Falling: objects dropped from above', 'Swinging: cranes, excavator buckets', 'Rolling: pipes, equipment, materials', 'Never walk under suspended loads'],
  ARRAY['Are toe boards installed?', 'Who is the spotter for backing operations?', 'Is the swing radius marked?'],
  ARRAY['Hard hat', 'Safety glasses', 'High-visibility vest', 'Steel-toe boots'],
  15,
  true
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- PART 9: Job Safety Analysis (JSA)
-- =============================================================================

INSERT INTO public.job_safety_analysis (
  id, organization_id, project_id, jsa_number, job_title, job_description,
  work_location, equipment_required, job_steps, status, prepared_at,
  reviewed_at, approved_at
) VALUES
(
  'c2000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'JSA-2024-001',
  'Box Culvert Installation',
  'Installation of precast box culvert sections including excavation, bedding, placement, and backfill',
  'Station 142+00',
  ARRAY['Excavator', 'Crane', 'Compactor', 'Hand Tools'],
  '[{"step": 1, "task": "Excavation", "hazards": ["Cave-in", "Struck by equipment"], "controls": ["Competent person on site", "Sloping per soil type"]}, {"step": 2, "task": "Bedding placement", "hazards": ["Manual lifting", "Pinch points"], "controls": ["Team lift", "Keep hands clear"]}, {"step": 3, "task": "Culvert setting", "hazards": ["Suspended load", "Pinch points"], "controls": ["Tag lines", "Clear swing radius"]}]'::jsonb,
  'APPROVED',
  '2024-11-01',
  '2024-11-02',
  '2024-11-03'
),
(
  'c2000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000002',
  'JSA-2024-002',
  'Bridge Deck Rebar Installation',
  'Installation of reinforcing steel for bridge deck including tying, chairing, and inspection',
  'East Span - Deck Level',
  ARRAY['Rebar Cutter', 'Rebar Bender', 'Tie Wire Gun', 'Chairs'],
  '[{"step": 1, "task": "Material staging", "hazards": ["Manual lifting", "Sharp edges"], "controls": ["Team lift", "Leather gloves"]}, {"step": 2, "task": "Rebar placement", "hazards": ["Falls", "Tripping"], "controls": ["Fall protection at 6ft", "Clear work area"]}, {"step": 3, "task": "Tying operations", "hazards": ["Repetitive motion", "Sharp wire"], "controls": ["Rotate tasks", "Wire tie gun"]}]'::jsonb,
  'APPROVED',
  '2024-11-10',
  '2024-11-11',
  '2024-11-12'
),
(
  'c2000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'JSA-2024-003',
  'Asphalt Paving Operations',
  'Placement and compaction of asphalt base and wearing courses',
  'Station 140+00 to 145+00',
  ARRAY['Paver', 'Rollers', 'Dump Trucks', 'Material Transfer Vehicle'],
  '[{"step": 1, "task": "Traffic control setup", "hazards": ["Struck by vehicles"], "controls": ["TCP in place", "Spotters"]}, {"step": 2, "task": "Paving operations", "hazards": ["Burns from hot asphalt", "Fumes"], "controls": ["Long sleeves", "Upwind positioning"]}, {"step": 3, "task": "Compaction", "hazards": ["Pinch points", "Noise"], "controls": ["Clear zone around rollers", "Hearing protection"]}]'::jsonb,
  'DRAFT',
  '2024-12-01',
  NULL,
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- PART 10: JSA Hazard Controls
-- =============================================================================

INSERT INTO public.jsa_hazard_controls (
  id, jsa_id, step_number, hazard_description, control_description,
  control_responsible, control_hierarchy
) VALUES
-- Box Culvert JSA Steps
(
  'd2000000-0000-0000-0000-000000000001',
  'c2000000-0000-0000-0000-000000000001',
  1,
  'Cave-in hazard during excavation; struck by excavator; underground utilities',
  'Install trench box before entry; maintain swing radius barricades; verify utility locates complete',
  'Foreman',
  'ENGINEERING'
),
(
  'd2000000-0000-0000-0000-000000000002',
  'c2000000-0000-0000-0000-000000000001',
  2,
  'Cave-in during bedding work; overexertion from manual work; noise exposure from compaction',
  'Competent person inspection before entry; use mechanical compactor; hearing protection required',
  'Competent Person',
  'SUBSTITUTION'
),
(
  'd2000000-0000-0000-0000-000000000003',
  'c2000000-0000-0000-0000-000000000001',
  3,
  'Struck by suspended load; crushing hazard; crane tip-over risk',
  'Tag lines required; clear lift zone; verify ground conditions; signal person required',
  'Crane Operator',
  'ADMINISTRATIVE'
),
(
  'd2000000-0000-0000-0000-000000000004',
  'c2000000-0000-0000-0000-000000000001',
  4,
  'Cave-in during backfill; struck by equipment; dust exposure',
  'Maintain shoring until backfill complete; spotter for equipment; water for dust control',
  'Foreman',
  'ENGINEERING'
),
-- Bridge Deck Rebar JSA Steps
(
  'd2000000-0000-0000-0000-000000000005',
  'c2000000-0000-0000-0000-000000000002',
  1,
  'Falls from height; struck by material during transport; overexertion',
  'Fall protection required; tag lines on loads; use crane for heavy bundles',
  'Foreman',
  'ENGINEERING'
),
(
  'd2000000-0000-0000-0000-000000000006',
  'c2000000-0000-0000-0000-000000000002',
  2,
  'Lacerations from cutting; flying debris; noise exposure',
  'Cut-resistant gloves; face shield; hearing protection',
  'Ironworker',
  'PPE'
),
(
  'd2000000-0000-0000-0000-000000000007',
  'c2000000-0000-0000-0000-000000000002',
  3,
  'Ergonomic strain from repetitive motion; impalement on rebar; trips and falls',
  'Rebar caps on all exposed ends; kneepads; keep walkways clear',
  'Ironworker',
  'PPE'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- PART 11: OSHA 300 Log (Individual Case Entries)
-- =============================================================================

INSERT INTO public.osha_300_logs (
  id, organization_id, establishment_name, establishment_address,
  log_year, case_number, employee_name, job_title, date_of_injury,
  where_occurred, describe_injury, type_injury, is_days_away, days_away_count
) VALUES
(
  'e2000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Triton Construction - Corridor H Project',
  'Corridor H Section 12, Davis, WV 26260',
  2024,
  '2024-001',
  'Michael Rivers',
  'Equipment Operator',
  '2024-06-15',
  'Station 142+00 Excavation',
  'Strained lower back while dismounting excavator. Worker stepped awkwardly on uneven ground.',
  true,
  true,
  5
),
(
  'e2000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'Triton Construction - Corridor H Project',
  'Corridor H Section 12, Davis, WV 26260',
  2024,
  '2024-002',
  'David Stone',
  'Laborer',
  '2024-08-22',
  'Station 145+00 Material Staging',
  'Laceration to left forearm from sheet metal edge. Required 6 stitches.',
  true,
  false,
  0
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- PART 12: Safety Violations (OSHA Citations)
-- =============================================================================

INSERT INTO public.safety_violations (
  id, organization_id, project_id, citation_number, issue_date,
  severity, violation_description, location_description, osha_standard_violated,
  initial_penalty, abatement_due_date, abatement_completed_date, status
) VALUES
(
  'f2000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'CIT-2024-001',
  '2024-10-15',
  'OTHER_THAN_SERIOUS',
  'Worker observed without required eye protection in grinding area',
  'Station 143+00 - Equipment staging',
  '1926.102(a)(1)',
  1500.00,
  '2024-10-30',
  '2024-10-16',
  'CLOSED'
),
(
  'f2000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'CIT-2024-002',
  '2024-11-02',
  'SERIOUS',
  'Excavation deeper than 5 feet without cave-in protection system',
  'Station 145+00 - Storm drain installation',
  '1926.652(a)(1)',
  7500.00,
  '2024-11-15',
  '2024-11-03',
  'CLOSED'
),
(
  'f2000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000002',
  'CIT-2024-003',
  '2024-11-20',
  'DE_MINIMIS',
  'Extension cords creating trip hazard on bridge deck - housekeeping violation',
  'East span - deck level',
  '1926.25(a)',
  0.00,
  '2024-11-25',
  '2024-11-20',
  'CLOSED'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- PART 13: Safety Metrics (Quarterly Organizational)
-- =============================================================================

INSERT INTO public.safety_metrics (
  id, organization_id, metric_year, metric_quarter,
  total_hours_worked, recordable_injuries, dart, trir, ltir,
  near_misses_reported, safety_observations_positive, safety_observations_atrisk,
  toolbox_talks_conducted, first_aid_cases, property_damage_incidents, emr
) VALUES
-- 2024 Q3 Organization Metrics
(
  'a3000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  2024, 3,
  75000, 1, 0.53, 2.67, 0.0,
  8, 45, 12,
  65, 3, 1, 0.85
),
-- 2024 Q4 Organization Metrics
(
  'a3000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  2024, 4,
  82000, 2, 0.98, 4.88, 0.0,
  12, 52, 8,
  72, 4, 0, 0.85
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- PART 14: Labs (for Quality module)
-- =============================================================================

INSERT INTO public.labs (
  id, organization_id, lab_name, lab_type, address_line1, city, state, zip_code,
  phone, email, primary_contact,
  aashto_accredited, aashto_number, aashto_expiration,
  ccrl_accredited, ccrl_number,
  wvdoh_approved, wvdoh_approval_number, wvdoh_approval_expiration,
  test_capabilities, avg_turnaround_days, is_active
) VALUES
(
  'b3000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Mountain State Testing Lab',
  'THIRD_PARTY',
  '200 Lab Drive',
  'Charleston',
  'WV',
  '25301',
  '304-555-4001',
  'testing@mstl.com',
  'Dr. Sarah Test',
  true, 'AASHTO-2024-WV-001', '2025-06-30',
  true, 'CCRL-2024-001',
  true, 'WVDOH-LAB-2024-01', '2025-12-31',
  ARRAY['Concrete Compression', 'Concrete Flexural', 'Aggregate Gradation', 'Asphalt Content', 'Soil Compaction', 'Proctor', 'Nuclear Density'],
  3,
  true
),
(
  'b3000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'Triton Field Lab - Corridor H',
  'FIELD',
  'Corridor H Section 12 Field Office',
  'Davis',
  'WV',
  '26260',
  '304-555-4002',
  'fieldlab@tritonwv.com',
  'Mark Fields',
  false, NULL, NULL,
  false, NULL,
  true, 'WVDOH-FIELD-2024-01', '2025-12-31',
  ARRAY['Concrete Slump', 'Concrete Air', 'Concrete Temperature', 'Nuclear Density', 'Aggregate Moisture'],
  1,
  true
),
(
  'b3000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'Valley Materials Lab',
  'PRODUCER',
  '1500 Concrete Plant Road',
  'Charleston',
  'WV',
  '25301',
  '304-555-4003',
  'qc@mountainreadymix.com',
  'Tom Quality',
  false, NULL, NULL,
  true, 'CCRL-2024-002',
  true, 'WVDOH-LAB-2024-02', '2025-12-31',
  ARRAY['Concrete Mix Design', 'Aggregate Quality', 'Cement Testing'],
  2,
  true
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- PART 15: Specimen Tracking
-- =============================================================================

INSERT INTO public.specimen_tracking (
  id, organization_id, project_id, specimen_type, specimen_id,
  collected_date, collected_time, collection_location, station,
  mix_design, slump, air_content, concrete_temp,
  lab_id, lab_received_date, actual_test_date, test_age_days,
  result_value, result_unit, meets_spec, status,
  curing_location, set_number
) VALUES
-- Corridor H Box Culvert Cylinders
(
  'c3000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'CONCRETE_CYLINDER',
  'CYL-2024-11-15-001',
  '2024-11-15',
  '10:15:00',
  'Box Culvert Base Slab',
  'Station 142+00',
  'AA-4000-1',
  3.75,
  6.2,
  58,
  'b3000000-0000-0000-0000-000000000001',
  '2024-11-16',
  '2024-11-22',
  7,
  3150,
  'psi',
  true,
  'TESTED',
  'MSTL Curing Room',
  'SET-2024-11-15-001'
),
(
  'c3000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'CONCRETE_CYLINDER',
  'CYL-2024-11-15-002',
  '2024-11-15',
  '10:15:00',
  'Box Culvert Base Slab',
  'Station 142+00',
  'AA-4000-1',
  3.75,
  6.2,
  58,
  'b3000000-0000-0000-0000-000000000001',
  '2024-11-16',
  NULL,
  28,
  NULL,
  'psi',
  NULL,
  'CURING',
  'MSTL Curing Room',
  'SET-2024-11-15-001'
),
(
  'c3000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'CONCRETE_CYLINDER',
  'CYL-2024-11-15-003',
  '2024-11-15',
  '11:30:00',
  'Box Culvert Walls',
  'Station 142+00',
  'AA-4000-1',
  4.25,
  5.8,
  60,
  'b3000000-0000-0000-0000-000000000001',
  '2024-11-16',
  '2024-11-22',
  7,
  3280,
  'psi',
  true,
  'TESTED',
  'MSTL Curing Room',
  'SET-2024-11-15-002'
),
-- US-35 Bridge Deck Cylinders
(
  'c3000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000002',
  'CONCRETE_CYLINDER',
  'CYL-2024-11-25-001',
  '2024-11-25',
  '09:00:00',
  'Abutment Stem Wall',
  'East Abutment',
  'AA-4500-1',
  4.0,
  6.0,
  55,
  'b3000000-0000-0000-0000-000000000001',
  '2024-11-26',
  NULL,
  7,
  NULL,
  'psi',
  NULL,
  'IN_TRANSIT',
  NULL,
  'SET-2024-11-25-001'
),
(
  'c3000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000002',
  'CONCRETE_CYLINDER',
  'CYL-2024-11-25-002',
  '2024-11-25',
  '09:00:00',
  'Abutment Stem Wall',
  'East Abutment',
  'AA-4500-1',
  4.0,
  6.0,
  55,
  'b3000000-0000-0000-0000-000000000001',
  '2024-11-26',
  NULL,
  28,
  NULL,
  'psi',
  NULL,
  'CURING',
  'MSTL Curing Room',
  'SET-2024-11-25-001'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- PART 16: ITP Templates
-- =============================================================================

INSERT INTO public.itp_templates (
  id, organization_id, template_code, name, work_type, description, is_active
) VALUES
(
  'd3000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'ITP-CON-001',
  'Concrete Placement ITP',
  'Structural Concrete',
  'Inspection and Test Plan for structural concrete placement including forms, rebar, placement, and curing',
  true
),
(
  'd3000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'ITP-ASP-001',
  'Asphalt Paving ITP',
  'Asphalt Paving',
  'Inspection and Test Plan for asphalt base and wearing course placement',
  true
),
(
  'd3000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'ITP-DRN-001',
  'Storm Drain Installation ITP',
  'Drainage',
  'Inspection and Test Plan for storm drain pipe installation including excavation, bedding, and backfill',
  true
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- PART 17: ITP Template Items
-- =============================================================================

INSERT INTO public.itp_template_items (
  id, template_id, item_number, activity, acceptance_criteria,
  documentation_required, inspection_required, test_required, hold_type, notify_wvdoh
) VALUES
-- Concrete ITP Items
(
  'e3000000-0000-0000-0000-000000000001',
  'd3000000-0000-0000-0000-000000000001',
  1,
  'Formwork Inspection',
  'Forms aligned, secured, clean, oiled. Dimensions per drawings.',
  true,
  true,
  false,
  NULL,
  false
),
(
  'e3000000-0000-0000-0000-000000000002',
  'd3000000-0000-0000-0000-000000000001',
  2,
  'Reinforcement Inspection',
  'Rebar size, spacing, cover per drawings. Tie wire secure. Chairs adequate.',
  true,
  true,
  false,
  'HOLD',
  true
),
(
  'e3000000-0000-0000-0000-000000000003',
  'd3000000-0000-0000-0000-000000000001',
  3,
  'Pre-Pour Conference',
  'All parties present. Pour sequence reviewed. Weather acceptable.',
  true,
  false,
  false,
  'HOLD',
  true
),
(
  'e3000000-0000-0000-0000-000000000004',
  'd3000000-0000-0000-0000-000000000001',
  4,
  'Fresh Concrete Testing',
  'Slump 4" +/- 1". Air 6% +/- 1.5%. Temp per spec.',
  true,
  false,
  true,
  NULL,
  false
),
(
  'e3000000-0000-0000-0000-000000000005',
  'd3000000-0000-0000-0000-000000000001',
  5,
  'Cylinder Fabrication',
  'Minimum 4 cylinders per 50 CY or fraction. Cast per ASTM C31.',
  true,
  false,
  true,
  NULL,
  false
),
(
  'e3000000-0000-0000-0000-000000000006',
  'd3000000-0000-0000-0000-000000000001',
  6,
  'Curing Verification',
  'Curing compound applied or wet cure maintained for 7 days minimum.',
  true,
  true,
  false,
  NULL,
  false
),
-- Asphalt ITP Items
(
  'e3000000-0000-0000-0000-000000000007',
  'd3000000-0000-0000-0000-000000000002',
  1,
  'Subgrade Inspection',
  'Density minimum 95% of Proctor. No soft spots or pumping.',
  true,
  true,
  true,
  'HOLD',
  true
),
(
  'e3000000-0000-0000-0000-000000000008',
  'd3000000-0000-0000-0000-000000000002',
  2,
  'Tack Coat Application',
  'Uniform application rate per specs. Broken before paving.',
  true,
  true,
  false,
  NULL,
  false
),
(
  'e3000000-0000-0000-0000-000000000009',
  'd3000000-0000-0000-0000-000000000002',
  3,
  'Mix Temperature at Laydown',
  'Minimum 290°F for PG 64-22. Maximum 340°F.',
  true,
  true,
  false,
  NULL,
  false
),
(
  'e3000000-0000-0000-0000-000000000010',
  'd3000000-0000-0000-0000-000000000002',
  4,
  'In-Place Density',
  'Minimum 92% of Gmm. Nuclear gauge or core verification.',
  true,
  true,
  true,
  'HOLD',
  true
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- PART 18: Defect Categories
-- =============================================================================

INSERT INTO public.defect_categories (
  id, organization_id, name, code, description,
  severity_default, category_type, is_active
) VALUES
(
  'f3000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Concrete Surface Defect',
  'CON-SUR',
  'Surface imperfections including honeycombing, bug holes, or discoloration',
  'minor',
  'Concrete',
  true
),
(
  'f3000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'Concrete Structural Crack',
  'CON-CRK',
  'Cracks in structural concrete greater than hairline width',
  'major',
  'Concrete',
  true
),
(
  'f3000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'Asphalt Segregation',
  'ASP-SEG',
  'Coarse aggregate concentration indicating placement issue',
  'minor',
  'Asphalt',
  true
),
(
  'f3000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000001',
  'Low Density - Asphalt',
  'ASP-DEN',
  'In-place density below specification minimum',
  'major',
  'Asphalt',
  true
),
(
  'f3000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000001',
  'Rebar Misplacement',
  'RBR-MIS',
  'Reinforcing steel not per drawings or inadequate cover',
  'critical',
  'Reinforcement',
  true
),
(
  'f3000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000001',
  'Pipe Joint Defect',
  'PIP-JNT',
  'Improper pipe joint connection or visible gap',
  'major',
  'Drainage',
  true
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- PART 19: Quality Metrics
-- =============================================================================

INSERT INTO public.quality_metrics (
  id, organization_id, project_id, metric_year, metric_month,
  inspections_total, inspections_passed, inspections_failed, inspection_pass_rate,
  tests_total, tests_passed, tests_failed, test_pass_rate,
  ncrs_opened, ncrs_closed, ncrs_overdue,
  rework_cost, total_coq
) VALUES
(
  'a4000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  2024, 10,
  45, 43, 2, 95.56,
  32, 31, 1, 96.88,
  2, 1, 1,
  1200.00, 1200.00
),
(
  'a4000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  2024, 11,
  52, 50, 2, 96.15,
  38, 37, 1, 97.37,
  1, 2, 0,
  600.00, 600.00
),
(
  'a4000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000002',
  2024, 10,
  28, 28, 0, 100.00,
  18, 18, 0, 100.00,
  0, 0, 0,
  0.00, 0.00
),
(
  'a4000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000002',
  2024, 11,
  35, 34, 1, 97.14,
  22, 22, 0, 100.00,
  1, 0, 1,
  400.00, 400.00
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- PART 20: Corrective Action Requests
-- =============================================================================

INSERT INTO public.corrective_action_requests (
  id, organization_id, project_id, car_number, title,
  issue_category, priority, description,
  root_cause_analysis, corrective_action, preventive_action,
  corrective_action_due, status, closed_at, verified_at
) VALUES
(
  'b4000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'CAR-2024-001',
  'Form Inspection Checklist Completion',
  'Process',
  'MEDIUM',
  'Form inspection checklist incomplete - missing engineer signature on 3 of 8 placements in October. Location: Project-wide.',
  'Rush to begin pour caused checklist to be treated as formality rather than hold point',
  'Retrain all field staff on ITP hold point requirements. PM to verify signatures before approving pour.',
  'Add checklist completion to pre-pour conference agenda. Create digital checklist with mandatory fields.',
  '2024-11-01',
  'CLOSED',
  '2024-10-28',
  '2024-11-05'
),
(
  'b4000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000002',
  'CAR-2024-002',
  'Concrete Surface Honeycombing Defect',
  'Material',
  'MEDIUM',
  'Concrete surface honeycombing on abutment stem wall - 2 SF area. Location: East Abutment - Stem Wall Station 1+25.',
  'Vibration inadequate at formed surface. Crew unfamiliar with SCC flow characteristics.',
  'Repair with approved patching mortar per WVDOH approved repair procedure.',
  'Conduct training on proper vibration techniques. Use SCC mix for better consolidation.',
  '2024-12-06',
  'IN_PROGRESS',
  NULL,
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Complete
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 082: Advanced Modules Seed Data completed successfully';
  RAISE NOTICE 'Created seed data for:';
  RAISE NOTICE '  - 5 Suppliers';
  RAISE NOTICE '  - 7 Material Tickets with batch/asphalt details';
  RAISE NOTICE '  - 5 Material Certifications';
  RAISE NOTICE '  - 6 Inventory Items';
  RAISE NOTICE '  - 3 Supplier Quality Scores';
  RAISE NOTICE '  - 5 Toolbox Talk Templates';
  RAISE NOTICE '  - 3 Job Safety Analyses with controls';
  RAISE NOTICE '  - 2 OSHA 300 Logs';
  RAISE NOTICE '  - 3 Safety Violations';
  RAISE NOTICE '  - 4 Safety Metrics records';
  RAISE NOTICE '  - 3 Labs';
  RAISE NOTICE '  - 5 Specimen Tracking records';
  RAISE NOTICE '  - 3 ITP Templates with items';
  RAISE NOTICE '  - 6 Defect Categories';
  RAISE NOTICE '  - 4 Quality Metrics records';
  RAISE NOTICE '  - 2 Corrective Action Requests';
END $$;
