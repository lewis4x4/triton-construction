-- =============================================================================
-- Migration 130: Comprehensive Safety Seed Data
-- =============================================================================
-- Populates all safety tables with realistic sample data for 2025
-- Uses CORRECT column names matching ACTUAL PRODUCTION schema
-- =============================================================================

-- First add project_id to safety_metrics if it doesn't exist (for project-level filtering)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'safety_metrics' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE public.safety_metrics ADD COLUMN project_id UUID REFERENCES public.projects(id);
        CREATE INDEX IF NOT EXISTS idx_safety_metrics_project ON public.safety_metrics(project_id);
    END IF;
END $$;

-- Add metric_month column if it doesn't exist (for monthly granularity)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'safety_metrics' AND column_name = 'metric_month'
    ) THEN
        ALTER TABLE public.safety_metrics ADD COLUMN metric_month INTEGER CHECK (metric_month BETWEEN 1 AND 12);
    END IF;
END $$;

-- =============================================================================
-- SAFETY METRICS - Monthly data for 2025
-- =============================================================================

-- Delete existing 2025 metrics to avoid conflicts
DELETE FROM public.safety_metrics WHERE metric_year = 2025;

-- Drop the problematic unique constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'safety_metrics_organization_id_metric_year_metric_quarter_key'
    ) THEN
        ALTER TABLE public.safety_metrics
        DROP CONSTRAINT safety_metrics_organization_id_metric_year_metric_quarter_key;
    END IF;
END $$;

-- Insert 2025 monthly metrics for Coalfield Expressway Section 4
INSERT INTO public.safety_metrics (
    id, organization_id, project_id, metric_year, metric_month, metric_quarter,
    total_hours_worked, recordable_injuries, days_away_from_work, days_restricted_duty,
    near_misses_reported, safety_observations_positive, safety_observations_atrisk,
    toolbox_talks_conducted, emr
) VALUES
-- Coalfield Expressway Section 4 (b0000000-0000-0000-0000-000000000005)
('a3100000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 2025, 1, 1, 12500, 0, 0, 0, 3, 15, 2, 8, 0.85),
('a3100000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 2025, 2, 1, 14200, 1, 2, 0, 4, 18, 3, 9, 0.85),
('a3100000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 2025, 3, 1, 15800, 0, 0, 0, 5, 22, 2, 10, 0.85),
('a3100000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 2025, 4, 2, 16500, 0, 0, 0, 2, 20, 1, 11, 0.85),
('a3100000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 2025, 5, 2, 18200, 1, 3, 2, 6, 25, 4, 12, 0.85),
('a3100000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 2025, 6, 2, 19500, 0, 0, 0, 4, 28, 2, 13, 0.85),
('a3100000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 2025, 7, 3, 21000, 0, 0, 0, 3, 30, 1, 14, 0.85),
('a3100000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 2025, 8, 3, 22500, 1, 1, 3, 5, 32, 3, 15, 0.85),
('a3100000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 2025, 9, 3, 20800, 0, 0, 0, 4, 28, 2, 14, 0.85),
('a3100000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 2025, 10, 4, 19200, 0, 0, 0, 2, 25, 1, 13, 0.85),
('a3100000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 2025, 11, 4, 17500, 0, 0, 0, 3, 22, 2, 12, 0.85),
('a3100000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 2025, 12, 4, 15000, 0, 0, 0, 2, 18, 1, 10, 0.85),

-- Corridor H Section 12 (b0000000-0000-0000-0000-000000000001)
('a3100000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 2025, 1, 1, 18000, 0, 0, 0, 4, 20, 3, 12, 0.82),
('a3100000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 2025, 2, 1, 19500, 1, 1, 0, 5, 22, 2, 13, 0.82),
('a3100000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 2025, 3, 1, 21000, 0, 0, 0, 3, 25, 2, 14, 0.82),
('a3100000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 2025, 4, 2, 22500, 0, 0, 0, 4, 28, 3, 15, 0.82),
('a3100000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 2025, 5, 2, 24000, 1, 2, 1, 6, 30, 2, 16, 0.82),
('a3100000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 2025, 6, 2, 25500, 0, 0, 0, 5, 32, 1, 17, 0.82),
('a3100000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 2025, 7, 3, 27000, 0, 0, 0, 4, 35, 2, 18, 0.82),
('a3100000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 2025, 8, 3, 28000, 2, 4, 2, 7, 38, 4, 19, 0.82),
('a3100000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 2025, 9, 3, 26500, 0, 0, 0, 5, 35, 2, 18, 0.82),
('a3100000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 2025, 10, 4, 24000, 0, 0, 0, 3, 30, 1, 16, 0.82),
('a3100000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 2025, 11, 4, 22000, 0, 0, 0, 4, 28, 2, 15, 0.82),
('a3100000-0000-0000-0000-000000000024', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 2025, 12, 4, 20000, 0, 0, 0, 3, 25, 1, 14, 0.82)
ON CONFLICT (id) DO UPDATE SET
    total_hours_worked = EXCLUDED.total_hours_worked,
    recordable_injuries = EXCLUDED.recordable_injuries;

-- =============================================================================
-- SAFETY VIOLATIONS - Using ACTUAL column names (NO severity column!)
-- =============================================================================

-- Update existing violations to be OPEN
UPDATE public.safety_violations
SET status = 'OPEN', abatement_due_date = CURRENT_DATE + interval '14 days'
WHERE id = 'f2000000-0000-0000-0000-000000000001';

UPDATE public.safety_violations
SET status = 'CONTESTED', abatement_due_date = CURRENT_DATE + interval '7 days'
WHERE id = 'f2000000-0000-0000-0000-000000000002';

-- Add violations for Coalfield Expressway using ACTUAL columns:
-- citation_number, issue_date, violation_description, location_description, abatement_due_date
-- NOTE: NO severity column in safety_violations table!
INSERT INTO public.safety_violations (
    id, organization_id, project_id, citation_number, issue_date,
    violation_description, osha_standard_violated, location_description, status,
    abatement_due_date, abatement_required, issuing_agency, initial_penalty
) VALUES
('f2000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005',
 'CIT-2025-001', CURRENT_DATE - interval '5 days',
 'Worker observed on elevated platform without fall protection harness', '29 CFR 1926.501(b)(1)', 'Station 145+00, Pier 3',
 'OPEN', CURRENT_DATE + interval '7 days', true, 'OSHA', 15000.00),
('f2000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005',
 'CIT-2025-002', CURRENT_DATE - interval '3 days',
 'Debris and materials blocking emergency exit route', '29 CFR 1926.151(a)(1)', 'Laydown Area B',
 'OPEN', CURRENT_DATE + interval '3 days', true, 'OSHA', 7500.00),
('f2000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005',
 'CIT-2025-003', CURRENT_DATE - interval '1 day',
 'Temporary power cables running through standing water', '29 CFR 1926.405(a)(2)(ii)(J)', 'Equipment Staging Area',
 'OPEN', CURRENT_DATE + interval '1 day', true, 'OSHA', 25000.00)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- TOOLBOX TALKS - Using ACTUAL column names
-- Actual columns: conducted_date, topic, topic_code, presenter_name, presenter_id,
-- total_attendees, acknowledged_count, duration_minutes, content, hazards_discussed, safety_measures
-- =============================================================================

INSERT INTO public.toolbox_talks (
    id, organization_id, project_id, conducted_date, conducted_time, topic, topic_code,
    duration_minutes, content, hazards_discussed, safety_measures,
    presenter_name, presenter_id, total_attendees, acknowledged_count
) VALUES
('e0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005',
 CURRENT_DATE - interval '1 day', '07:00:00', 'Fall Protection Requirements', 'TBT-FALL-001',
 15, 'Reviewed harness inspection procedures and tie-off points for bridge work. Discussed 100% tie-off requirements.',
 'Falls from height, improper harness use, inadequate anchor points',
 'Use full body harness, inspect equipment daily, maintain 100% tie-off', 'Mike Johnson', NULL, 12, 12),
('e0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005',
 CURRENT_DATE - interval '3 days', '06:30:00', 'Heat Stress Prevention', 'TBT-HEAT-001',
 20, 'Summer heat safety protocols, hydration requirements, and break schedules. Signs of heat exhaustion.',
 'Heat exhaustion, heat stroke, dehydration',
 'Drink water every 15 minutes, take breaks in shade, wear light clothing', 'Sarah Davis', NULL, 15, 15),
('e0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005',
 CURRENT_DATE - interval '5 days', '07:00:00', 'Excavation Safety', 'TBT-EXCA-001',
 25, 'Trench safety, shoring requirements, and competent person duties. Cave-in protection systems.',
 'Cave-ins, falling loads, hazardous atmospheres, water accumulation',
 'Use trench boxes, slope at proper angle, daily inspections, keep heavy equipment away from edges', 'Tom Wilson', NULL, 10, 10),
('e0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005',
 CURRENT_DATE - interval '7 days', '06:45:00', 'Silica Dust Exposure', 'TBT-SILI-001',
 20, 'Concrete cutting safety, respiratory protection, and exposure limits. Wet cutting methods.',
 'Silica dust inhalation, respiratory disease, eye irritation',
 'Use wet cutting methods, wear N95 or better respirator, use dust collection', 'Mike Johnson', NULL, 14, 14),
('e0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005',
 CURRENT_DATE - interval '10 days', '07:00:00', 'Struck-By Hazards', 'TBT-STRK-001',
 15, 'Heavy equipment awareness, spotters, and high-visibility requirements. Swing radius dangers.',
 'Struck by equipment, flying objects, falling materials',
 'Wear high-vis vest, use spotters, stay out of swing radius, secure loads', 'Sarah Davis', NULL, 18, 18)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- JOB SAFETY ANALYSES (JSAs) - Using ACTUAL column names
-- job_steps is REQUIRED (NOT NULL) - must include JSON array
-- =============================================================================

INSERT INTO public.job_safety_analysis (
    id, organization_id, project_id, jsa_number, job_title, job_description,
    work_location, job_steps, status, prepared_at, reviewed_at, approved_at
) VALUES
('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005',
 'JSA-2025-0001', 'Bridge Deck Concrete Pour', 'Placement of concrete on bridge deck sections using pump truck',
 'Bridge Span 2, Stations 142+00 to 148+00',
 '[{"step": 1, "task": "Setup pump truck and chute", "hazards": ["Pinch points", "Struck by hose"], "controls": ["Keep clear during setup", "Use tag lines"]}, {"step": 2, "task": "Pour concrete into forms", "hazards": ["Slips on wet concrete", "Eye contact"], "controls": ["Non-slip boots", "Safety glasses"]}, {"step": 3, "task": "Finish and cure", "hazards": ["Knee strain", "Skin irritation"], "controls": ["Knee pads", "Gloves"]}]'::jsonb,
 'APPROVED', CURRENT_DATE - interval '14 days',
 CURRENT_DATE - interval '13 days', CURRENT_DATE - interval '13 days'),
('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005',
 'JSA-2025-0002', 'Structural Steel Erection', 'Installation of steel girders using crane operations',
 'Bridge Span 3, Pier 4 to Pier 5',
 '[{"step": 1, "task": "Pre-lift meeting", "hazards": ["Communication failure"], "controls": ["Review lift plan", "Confirm signals"]}, {"step": 2, "task": "Rig and lift girder", "hazards": ["Suspended load", "Crush hazard"], "controls": ["Stay clear of load", "Tag lines"]}, {"step": 3, "task": "Set and bolt connection", "hazards": ["Falls", "Pinch points"], "controls": ["100% tie-off", "Proper gloves"]}]'::jsonb,
 'APPROVED', CURRENT_DATE - interval '10 days',
 CURRENT_DATE - interval '9 days', CURRENT_DATE - interval '9 days'),
('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005',
 'JSA-2025-0003', 'Deep Excavation for Abutment', 'Excavation below 4 feet for abutment foundation',
 'Abutment A, Station 135+00',
 '[{"step": 1, "task": "Mark utilities", "hazards": ["Utility strike"], "controls": ["811 locate", "Hand dig near marks"]}, {"step": 2, "task": "Excavate to depth", "hazards": ["Cave-in", "Struck by"], "controls": ["Trench box", "Spotter"]}, {"step": 3, "task": "Install shoring", "hazards": ["Collapse", "Pinch"], "controls": ["Competent person inspection"]}]'::jsonb,
 'PENDING_REVIEW', CURRENT_DATE - interval '2 days',
 NULL, NULL),
('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005',
 'JSA-2025-0004', 'Overhead Power Line Work', 'Installation of temporary power for site lighting',
 'Main Staging Area',
 '[{"step": 1, "task": "De-energize source", "hazards": ["Electrocution"], "controls": ["LOTO procedures", "Verify zero energy"]}, {"step": 2, "task": "Install conduit", "hazards": ["Falls from ladder"], "controls": ["3-point contact", "Proper ladder angle"]}, {"step": 3, "task": "Pull wire and connect", "hazards": ["Shock", "Cuts"], "controls": ["Test circuits", "Insulated tools"]}]'::jsonb,
 'DRAFT', CURRENT_DATE - interval '1 day',
 NULL, NULL),
('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005',
 'JSA-2025-0005', 'Concrete Cutting Operations', 'Sawcutting existing pavement for removal',
 'Approach Slab, Station 132+00',
 '[{"step": 1, "task": "Setup work zone", "hazards": ["Traffic", "Noise"], "controls": ["Barriers and signs", "Hearing protection"]}, {"step": 2, "task": "Cut concrete", "hazards": ["Silica dust", "Blade kick"], "controls": ["Wet cutting", "Firm grip"]}, {"step": 3, "task": "Remove cut sections", "hazards": ["Heavy lifting", "Sharp edges"], "controls": ["Team lift", "Cut-resistant gloves"]}]'::jsonb,
 'APPROVED', CURRENT_DATE - interval '21 days',
 CURRENT_DATE - interval '20 days', CURRENT_DATE - interval '20 days')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- INCIDENTS - Using ACTUAL column names
-- Actual columns: immediate_actions (not immediate_actions_taken), reported_by_id (not reported_by)
-- =============================================================================

INSERT INTO public.incidents (
    id, organization_id, project_id, incident_date, incident_time,
    classification, severity, description, location_description, immediate_actions,
    root_cause, status
) VALUES
('11000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005',
 CURRENT_DATE - interval '30 days', '10:30:00',
 'near_miss', 'minor', 'Excavator swing radius near worker - no contact made',
 'Station 140+00, Excavation Area', 'Work stopped, safety meeting conducted, exclusion zone marked',
 'Spotter moved out of position during operation', 'closed'),
('11000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005',
 CURRENT_DATE - interval '15 days', '14:15:00',
 'first_aid_only', 'minor', 'Minor laceration to hand from handling rebar',
 'Rebar Staging Area', 'First aid administered, worker returned to work with cut-resistant gloves',
 'Worker not wearing appropriate cut-resistant gloves', 'closed'),
('11000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005',
 CURRENT_DATE - interval '5 days', '08:45:00',
 'near_miss', 'moderate', 'Unsecured load shifted during crane lift',
 'Bridge Span 2, Pier 3', 'Operation suspended, rigging inspected, load secured properly',
 'Rigging configuration inadequate for load geometry', 'investigating')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- NOTE: safety_observations table does NOT exist in production
-- The database has safety_orientations instead - skipping observations insert
-- =============================================================================

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
    v_metrics_count INT;
    v_violations_count INT;
    v_talks_count INT;
    v_incidents_count INT;
    v_jsas_count INT;
BEGIN
    SELECT COUNT(*) INTO v_metrics_count FROM safety_metrics WHERE metric_year = 2025;
    SELECT COUNT(*) INTO v_violations_count FROM safety_violations WHERE status IN ('OPEN', 'CONTESTED');
    SELECT COUNT(*) INTO v_talks_count FROM toolbox_talks WHERE conducted_date > CURRENT_DATE - interval '30 days';
    SELECT COUNT(*) INTO v_incidents_count FROM incidents WHERE incident_date > CURRENT_DATE - interval '60 days';
    SELECT COUNT(*) INTO v_jsas_count FROM job_safety_analysis WHERE status IN ('APPROVED', 'PENDING_REVIEW', 'DRAFT');

    RAISE NOTICE 'Migration 130: Safety Seed Data Complete';
    RAISE NOTICE '  - Safety Metrics (2025): %', v_metrics_count;
    RAISE NOTICE '  - Open Violations: %', v_violations_count;
    RAISE NOTICE '  - Recent Toolbox Talks: %', v_talks_count;
    RAISE NOTICE '  - Recent Incidents: %', v_incidents_count;
    RAISE NOTICE '  - Active JSAs: %', v_jsas_count;
END $$;
