-- =============================================================================
-- Migration 126: Demo Data for Daily Reports and Time Entries
-- =============================================================================
-- Adds sample daily reports and time entries for Tuesday demo
-- Organization: 63555da4-55d1-462b-aafb-e3ef32f745cc
-- Demo User: a1448b14-4425-41e7-a662-8b220eb284b6
-- =============================================================================

-- =============================================================================
-- PART 0: FIX COMPETENT PERSON TRIGGER (Bug from migration 114)
-- =============================================================================
-- Fixes bug where trigger references employee_id instead of crew_member_id

CREATE OR REPLACE FUNCTION public.validate_daily_report_competent_person()
RETURNS TRIGGER AS $$
DECLARE
    v_org_id UUID;
    v_project_id UUID;
    v_work_type TEXT;
    v_crew_ids UUID[];
    v_validation RECORD;
BEGIN
    -- Get organization and project from the daily report
    SELECT dr.organization_id, dr.project_id
    INTO v_org_id, v_project_id
    FROM public.daily_reports dr
    WHERE dr.id = NEW.daily_report_id;

    -- Detect high-risk work types from description
    v_work_type := CASE
        WHEN LOWER(NEW.description) ~ 'excavation.*(?:ft|foot|feet|'')' AND
             (LOWER(NEW.description) ~ '4|5|6|7|8|9|10|[0-9]{2}') THEN 'EXCAVATION_4FT_PLUS'
        WHEN LOWER(NEW.description) ~ 'trench' THEN 'TRENCHING'
        WHEN LOWER(NEW.description) ~ 'scaffold' THEN 'SCAFFOLD'
        WHEN LOWER(NEW.description) ~ 'confin.*space|manhole|vault|tank entry' THEN 'CONFINED_SPACE'
        WHEN LOWER(NEW.description) ~ 'demolition|demo' THEN 'DEMOLITION'
        WHEN LOWER(NEW.description) ~ 'steel erect|structural steel' THEN 'STEEL_ERECTION'
        WHEN LOWER(NEW.description) ~ 'traffic control|flagging|lane closure' THEN 'TRAFFIC_CONTROL'
        ELSE NULL
    END;

    -- If no high-risk work type detected, allow
    IF v_work_type IS NULL THEN
        RETURN NEW;
    END IF;

    -- Only validate work_performed entries (case insensitive)
    IF LOWER(NEW.entry_type) != 'work_performed' THEN
        RETURN NEW;
    END IF;

    -- Get crew assigned to this daily report (FIXED: use crew_member_id instead of employee_id)
    SELECT ARRAY_AGG(DISTINCT dm.crew_member_id) INTO v_crew_ids
    FROM public.daily_manpower dm
    WHERE dm.daily_report_id = NEW.daily_report_id
      AND dm.crew_member_id IS NOT NULL;

    -- If no crew assigned yet, skip validation (will be validated on submit)
    IF v_crew_ids IS NULL OR array_length(v_crew_ids, 1) IS NULL THEN
        RETURN NEW;
    END IF;

    -- Validate competent person requirements (if function exists)
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validate_competent_person_for_work') THEN
        SELECT * INTO v_validation
        FROM public.validate_competent_person_for_work(v_org_id, v_project_id, v_work_type, v_crew_ids);

        IF NOT v_validation.is_valid THEN
            -- Create compliance violation record if table exists
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'compliance_violations') THEN
                INSERT INTO public.compliance_violations (
                    organization_id,
                    project_id,
                    violation_type,
                    severity,
                    source_type,
                    source_id,
                    details,
                    auto_generated,
                    status
                ) VALUES (
                    v_org_id,
                    v_project_id,
                    'competent_person_missing',
                    'CRITICAL',
                    'daily_report_entry',
                    NEW.id,
                    jsonb_build_object(
                        'work_type', v_work_type,
                        'missing_competent_persons', v_validation.missing_competent_persons,
                        'description', NEW.description,
                        'daily_report_id', NEW.daily_report_id
                    ),
                    true,
                    'open'
                );
            END IF;

            -- Block the work entry with clear error message
            RAISE EXCEPTION 'SAFETY VIOLATION: % work requires competent person(s): %. No valid competent person found in assigned crew.',
                v_work_type,
                array_to_string(v_validation.missing_competent_persons, ', ')
                USING ERRCODE = 'P0001';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PART 1: DAILY REPORTS
-- =============================================================================
-- Create realistic daily reports for the last 2 weeks on demo projects

INSERT INTO public.daily_reports (
    id,
    organization_id,
    project_id,
    report_date,
    report_number,
    weather_condition,
    work_performed_summary,
    status,
    is_working_day,
    shift_type,
    created_by_user_id,
    created_by_name,
    total_workers,
    total_man_hours,
    equipment_count,
    equipment_hours,
    created_at
) VALUES
-- Corridor H Section 12 - Recent reports
('aa000000-0000-0000-0000-000000000001', '63555da4-55d1-462b-aafb-e3ef32f745cc',
 'b0000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '1 day',
 '2025-001-001', NULL,
 'Excavation operations continued on mainline. Structural excavation at STA 125+00 to 128+50. Pipe installation crew set 6 sections of 36" RCP.',
 'APPROVED', true, 'DAY', 'a1448b14-4425-41e7-a662-8b220eb284b6', 'Brian Lewis',
 24, 240.0, 8, 72.5, NOW() - INTERVAL '1 day'),

('aa000000-0000-0000-0000-000000000002', '63555da4-55d1-462b-aafb-e3ef32f745cc',
 'b0000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '2 days',
 '2025-001-002', NULL,
 'Grade checking on previous day excavation. Form work preparation for inlet structure #3. Delivered and stockpiled aggregate base material.',
 'APPROVED', true, 'DAY', 'a1448b14-4425-41e7-a662-8b220eb284b6', 'Brian Lewis',
 22, 198.0, 6, 68.0, NOW() - INTERVAL '2 days'),

('aa000000-0000-0000-0000-000000000003', '63555da4-55d1-462b-aafb-e3ef32f745cc',
 'b0000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '3 days',
 '2025-001-003', NULL,
 'Completed inlet structure #2 concrete pour. Excavation crew relocated to cut section B. Survey staking for next phase.',
 'APPROVED', true, 'DAY', 'a1448b14-4425-41e7-a662-8b220eb284b6', 'Brian Lewis',
 26, 273.0, 9, 85.0, NOW() - INTERVAL '3 days'),

('aa000000-0000-0000-0000-000000000004', '63555da4-55d1-462b-aafb-e3ef32f745cc',
 'b0000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '4 days',
 '2025-001-004', NULL,
 'Morning rain delay - 2 hours. Resumed excavation at 10:00 AM. Pipe bedding stone placement.',
 'APPROVED', true, 'DAY', 'a1448b14-4425-41e7-a662-8b220eb284b6', 'Brian Lewis',
 18, 108.0, 5, 45.0, NOW() - INTERVAL '4 days'),

('aa000000-0000-0000-0000-000000000005', '63555da4-55d1-462b-aafb-e3ef32f745cc',
 'b0000000-0000-0000-0000-000000000001', CURRENT_DATE,
 '2025-001-005', NULL,
 'Full production day. Mainline excavation advancing well. Concrete placement for structure #3 scheduled for tomorrow.',
 'SUBMITTED', true, 'DAY', 'a1448b14-4425-41e7-a662-8b220eb284b6', 'Brian Lewis',
 28, 280.0, 10, 92.0, NOW()),

-- US-35 Bridge Replacement - Recent reports
('aa000000-0000-0000-0000-000000000006', '63555da4-55d1-462b-aafb-e3ef32f745cc',
 'b0000000-0000-0000-0000-000000000002', CURRENT_DATE - INTERVAL '1 day',
 '2025-002-001', NULL,
 'Bridge deck forming continues. Rebar installation on Span 2. Crane operations for beam setting.',
 'APPROVED', true, 'DAY', 'a1448b14-4425-41e7-a662-8b220eb284b6', 'Brian Lewis',
 18, 162.0, 5, 56.0, NOW() - INTERVAL '1 day'),

('aa000000-0000-0000-0000-000000000007', '63555da4-55d1-462b-aafb-e3ef32f745cc',
 'b0000000-0000-0000-0000-000000000002', CURRENT_DATE - INTERVAL '2 days',
 '2025-002-002', NULL,
 'Abutment backfill operations. Approach slab grade preparation. Safety meeting conducted.',
 'APPROVED', true, 'DAY', 'a1448b14-4425-41e7-a662-8b220eb284b6', 'Brian Lewis',
 16, 128.0, 4, 48.0, NOW() - INTERVAL '2 days'),

('aa000000-0000-0000-0000-000000000008', '63555da4-55d1-462b-aafb-e3ef32f745cc',
 'b0000000-0000-0000-0000-000000000002', CURRENT_DATE,
 '2025-002-003', NULL,
 'Deck pour preparation. Pre-pour inspection with DOH. Traffic control setup for overnight operations.',
 'DRAFT', true, 'DAY', 'a1448b14-4425-41e7-a662-8b220eb284b6', 'Brian Lewis',
 20, 180.0, 6, 62.0, NOW()),

-- Coalfield Expressway Section 4 - Recent reports
('aa000000-0000-0000-0000-000000000009', '63555da4-55d1-462b-aafb-e3ef32f745cc',
 'b0000000-0000-0000-0000-000000000005', CURRENT_DATE - INTERVAL '1 day',
 '2025-005-001', NULL,
 'Rock excavation operations. Drilling and blasting in cut section C. Hauling operations to fill area.',
 'APPROVED', true, 'DAY', 'a1448b14-4425-41e7-a662-8b220eb284b6', 'Brian Lewis',
 32, 384.0, 12, 145.0, NOW() - INTERVAL '1 day'),

('aa000000-0000-0000-0000-000000000010', '63555da4-55d1-462b-aafb-e3ef32f745cc',
 'b0000000-0000-0000-0000-000000000005', CURRENT_DATE,
 '2025-005-002', NULL,
 'Earthwork operations on mainline. Subgrade preparation for base course. Erosion control maintenance.',
 'SUBMITTED', true, 'DAY', 'a1448b14-4425-41e7-a662-8b220eb284b6', 'Brian Lewis',
 35, 420.0, 14, 158.0, NOW())

ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    updated_at = NOW();

-- =============================================================================
-- PART 2: DAILY MANPOWER
-- =============================================================================
-- Add manpower records linked to daily reports

INSERT INTO public.daily_manpower (
    id,
    daily_report_id,
    crew_member_id,
    worker_name,
    trade_classification,
    regular_hours,
    overtime_hours,
    created_at
) VALUES
-- Report 1 manpower
('ad000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001',
 'd0000000-0000-0000-0000-000000000001', 'James Morrison', 'OPERATOR', 8.0, 2.0, NOW()),
('ad000000-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-000000000001',
 'd0000000-0000-0000-0000-000000000002', 'Robert Anderson', 'OPERATOR', 8.0, 1.5, NOW()),
('ad000000-0000-0000-0000-000000000003', 'aa000000-0000-0000-0000-000000000001',
 'd0000000-0000-0000-0000-000000000003', 'Joseph Davis', 'PIPEFITTER', 8.0, 2.0, NOW()),
('ad000000-0000-0000-0000-000000000004', 'aa000000-0000-0000-0000-000000000001',
 'd0000000-0000-0000-0000-000000000004', 'David Clark', 'LABORER', 8.0, 0.0, NOW()),

-- Report 5 manpower (today's report)
('ad000000-0000-0000-0000-000000000005', 'aa000000-0000-0000-0000-000000000005',
 'd0000000-0000-0000-0000-000000000001', 'James Morrison', 'OPERATOR', 8.0, 2.0, NOW()),
('ad000000-0000-0000-0000-000000000006', 'aa000000-0000-0000-0000-000000000005',
 'd0000000-0000-0000-0000-000000000002', 'Robert Anderson', 'OPERATOR', 8.0, 2.0, NOW()),
('ad000000-0000-0000-0000-000000000007', 'aa000000-0000-0000-0000-000000000005',
 'd0000000-0000-0000-0000-000000000003', 'Joseph Davis', 'PIPEFITTER', 8.0, 1.5, NOW()),
('ad000000-0000-0000-0000-000000000008', 'aa000000-0000-0000-0000-000000000005',
 'd0000000-0000-0000-0000-000000000004', 'David Clark', 'LABORER', 8.0, 0.0, NOW()),
('ad000000-0000-0000-0000-000000000009', 'aa000000-0000-0000-0000-000000000005',
 'd0000000-0000-0000-0000-000000000005', 'William Taylor', 'OPERATOR', 8.0, 1.0, NOW())

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- PART 3: DAILY EQUIPMENT LOG
-- =============================================================================
-- Add equipment usage records linked to daily reports

INSERT INTO public.daily_equipment_log (
    id,
    daily_report_id,
    equipment_id,
    equipment_name,
    equipment_number,
    hours_operated,
    fuel_gallons,
    start_hours,
    end_hours,
    work_description,
    created_at
) VALUES
-- Report 1 equipment
('ae000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001',
 'e0000000-0000-0000-0000-000000000001', 'CAT 336F Excavator', 'EX-001',
 9.5, 45.0, 12450.5, 12460.0, 'Mainline excavation', NOW()),
('ae000000-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-000000000001',
 'e0000000-0000-0000-0000-000000000004', 'CAT D6T XW Dozer', 'DZ-001',
 8.0, 32.0, 8920.0, 8928.0, 'Material pushing', NOW()),
('ae000000-0000-0000-0000-000000000003', 'aa000000-0000-0000-0000-000000000001',
 'e0000000-0000-0000-0000-000000000005', 'CAT 950M Wheel Loader', 'LD-001',
 7.5, 28.0, 6540.0, 6547.5, 'Loading operations', NOW()),

-- Report 5 equipment (today)
('ae000000-0000-0000-0000-000000000004', 'aa000000-0000-0000-0000-000000000005',
 'e0000000-0000-0000-0000-000000000001', 'CAT 336F Excavator', 'EX-001',
 10.0, 52.0, 12460.0, 12470.0, 'Full production excavation', NOW()),
('ae000000-0000-0000-0000-000000000005', 'aa000000-0000-0000-0000-000000000005',
 'e0000000-0000-0000-0000-000000000002', 'CAT 320 Excavator', 'EX-002',
 9.5, 42.0, 9850.0, 9859.5, 'Structural excavation', NOW()),
('ae000000-0000-0000-0000-000000000006', 'aa000000-0000-0000-0000-000000000005',
 'e0000000-0000-0000-0000-000000000004', 'CAT D6T XW Dozer', 'DZ-001',
 10.0, 38.0, 8928.0, 8938.0, 'Grading operations', NOW()),
('ae000000-0000-0000-0000-000000000007', 'aa000000-0000-0000-0000-000000000005',
 'e0000000-0000-0000-0000-000000000005', 'CAT 950M Wheel Loader', 'LD-001',
 8.5, 30.0, 6547.5, 6556.0, 'Material handling', NOW()),

-- Coalfield Expressway equipment
('ae000000-0000-0000-0000-000000000008', 'aa000000-0000-0000-0000-000000000009',
 'e0000000-0000-0000-0000-000000000001', 'CAT 336F Excavator', 'EX-001',
 12.0, 65.0, 12470.0, 12482.0, 'Heavy rock excavation', NOW()),
('ae000000-0000-0000-0000-000000000009', 'aa000000-0000-0000-0000-000000000009',
 'e0000000-0000-0000-0000-000000000004', 'CAT D6T XW Dozer', 'DZ-001',
 11.5, 48.0, 8938.0, 8949.5, 'Fill material push', NOW())

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- COMPLETION
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Migration 126: Demo Daily Reports completed';
    RAISE NOTICE 'Added:';
    RAISE NOTICE '  - 10 daily reports across 3 projects';
    RAISE NOTICE '  - 9 daily manpower records';
    RAISE NOTICE '  - 9 daily equipment log entries';
END $$;
