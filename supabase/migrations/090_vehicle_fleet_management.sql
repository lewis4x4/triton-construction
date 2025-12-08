-- =============================================================================
-- Migration 090: Vehicle Fleet Management Module
-- =============================================================================
-- PURPOSE: Implement vehicle fleet management, fuel tracking, DOT compliance,
--          IFTA reporting, and driver qualification file management
-- DEPENDS ON: 051 (fleet driver qualification), 086 (platform core),
--             087 (equipment crew management)
-- SPEC: VEHICLE_FLEET_SPEC_V2.md
-- Date: December 7, 2024
-- =============================================================================

-- =============================================================================
-- PART 1: VEHICLE ENUMS
-- =============================================================================

-- Vehicle operational status (different from equipment_status)
CREATE TYPE public.vehicle_status AS ENUM (
    'ACTIVE',
    'AVAILABLE',
    'IN_MAINTENANCE',
    'DOWN',
    'IN_TRANSIT',
    'OUT_OF_SERVICE',
    'SOLD_DISPOSED'
);

-- Vehicle type classification
CREATE TYPE public.vehicle_type AS ENUM (
    'DUMP_TRUCK_TANDEM',
    'DUMP_TRUCK_TRI_AXLE',
    'DUMP_TRUCK_QUAD_AXLE',
    'TRACTOR_TRUCK',
    'PICKUP_TRUCK',
    'SERVICE_TRUCK',
    'WATER_TRUCK',
    'FUEL_TRUCK',
    'FLATBED_TRUCK',
    'LOWBOY_TRUCK',
    'SIGN_TRUCK',
    'CRANE_TRUCK',
    'VAN',
    'SUV',
    'SEDAN',
    'OTHER'
);

-- Trailer type classification
CREATE TYPE public.trailer_type AS ENUM (
    'LOWBOY',
    'STEP_DECK',
    'FLATBED',
    'EQUIPMENT_TRAILER',
    'UTILITY_TRAILER',
    'DUMP_TRAILER',
    'WATER_TANK',
    'FUEL_TANK',
    'OTHER'
);

-- DOT compliance status
CREATE TYPE public.dot_status AS ENUM (
    'COMPLIANT',
    'WARNING',
    'NON_COMPLIANT',
    'OUT_OF_SERVICE'
);

-- Driver Qualification File status
CREATE TYPE public.dqf_status AS ENUM (
    'COMPLETE',
    'INCOMPLETE',
    'EXPIRED',
    'DISQUALIFIED'
);

-- Vehicle inspection type (separate from QC inspection_type)
CREATE TYPE public.vehicle_inspection_type AS ENUM (
    'DOT_ANNUAL',
    'STATE_SAFETY',
    'EMISSIONS',
    'PRE_TRIP',
    'POST_TRIP',
    'ROADSIDE',
    'COMPANY_SAFETY',
    'OTHER'
);

-- Vehicle inspection result
CREATE TYPE public.vehicle_inspection_result AS ENUM (
    'PASS',
    'PASS_WITH_DEFECTS',
    'FAIL',
    'OUT_OF_SERVICE'
);

-- Fuel transaction status
CREATE TYPE public.fuel_transaction_status AS ENUM (
    'PENDING',
    'APPROVED',
    'FLAGGED',
    'DISPUTED',
    'RECONCILED'
);

-- GPS/Telematics provider for vehicles
CREATE TYPE public.vehicle_gps_provider AS ENUM (
    'GEOTAB',
    'SAMSARA',
    'VERIZON_CONNECT',
    'GPS_TRACKIT',
    'MOTIVE',
    'MANUAL'
);

-- Fuel card provider
CREATE TYPE public.fuel_card_provider AS ENUM (
    'WEX',
    'FUELMAN',
    'COMDATA',
    'EFS',
    'FLEET_ONE',
    'OTHER'
);

-- =============================================================================
-- PART 2: VEHICLES MASTER TABLE
-- =============================================================================

CREATE TABLE public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Identification
    vehicle_number TEXT NOT NULL,
    description TEXT NOT NULL,
    vehicle_type public.vehicle_type NOT NULL,

    -- Vehicle Details
    year INTEGER NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    vin TEXT NOT NULL,

    -- Registration
    license_plate TEXT,
    license_plate_state TEXT,
    registration_expiry DATE,
    title_number TEXT,
    title_state TEXT,

    -- Specifications
    gvwr_lbs INTEGER,
    gcwr_lbs INTEGER,
    axle_count INTEGER,
    fuel_type TEXT DEFAULT 'DIESEL',
    fuel_tank_capacity_gallons NUMERIC(8,2),

    -- DOT/CDL Requirements
    requires_cdl BOOLEAN DEFAULT FALSE,
    cdl_class_required TEXT,
    dot_number TEXT,
    mc_number TEXT,

    -- IRP (International Registration Plan)
    irp_account_number TEXT,
    irp_cab_card_expiry DATE,
    irp_base_state TEXT,

    -- IFTA (International Fuel Tax Agreement)
    ifta_account_number TEXT,
    ifta_license_expiry DATE,
    ifta_decal_number TEXT,

    -- Insurance
    insurance_policy_number TEXT,
    insurance_expiry DATE,
    insured_value NUMERIC(14,2),

    -- Status
    status public.vehicle_status NOT NULL DEFAULT 'AVAILABLE',
    dot_status public.dot_status NOT NULL DEFAULT 'COMPLIANT',

    -- Current Assignment
    current_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    current_driver_id UUID REFERENCES public.crew_members(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ,

    -- Current Location
    home_location TEXT,
    current_latitude NUMERIC(10,6),
    current_longitude NUMERIC(10,6),
    last_location_update TIMESTAMPTZ,

    -- Odometer
    current_odometer INTEGER,
    odometer_updated_at TIMESTAMPTZ,

    -- GPS Tracking
    gps_provider public.vehicle_gps_provider,
    gps_device_id TEXT,
    gps_device_serial TEXT,
    last_gps_update TIMESTAMPTZ,

    -- Fuel Card
    fuel_card_number TEXT,
    fuel_card_provider public.fuel_card_provider,

    -- Maintenance
    last_service_date DATE,
    last_service_odometer INTEGER,
    next_service_due_date DATE,
    next_service_due_odometer INTEGER,
    service_interval_miles INTEGER DEFAULT 15000,

    -- DOT Inspection
    last_dot_inspection_date DATE,
    next_dot_inspection_date DATE,
    dot_inspection_sticker TEXT,

    -- Ownership
    ownership_type TEXT DEFAULT 'OWNED',
    acquisition_date DATE,
    acquisition_cost NUMERIC(14,2),
    current_book_value NUMERIC(14,2),

    -- Performance
    target_mpg NUMERIC(4,1),

    -- Photos
    primary_photo_url TEXT,

    notes TEXT,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),

    UNIQUE(organization_id, vehicle_number),
    UNIQUE(organization_id, vin)
);

CREATE INDEX idx_vehicles_org ON public.vehicles(organization_id);
CREATE INDEX idx_vehicles_status ON public.vehicles(status);
CREATE INDEX idx_vehicles_dot_status ON public.vehicles(dot_status);
CREATE INDEX idx_vehicles_type ON public.vehicles(vehicle_type);
CREATE INDEX idx_vehicles_project ON public.vehicles(current_project_id);
CREATE INDEX idx_vehicles_driver ON public.vehicles(current_driver_id);
CREATE INDEX idx_vehicles_vin ON public.vehicles(vin);
CREATE INDEX idx_vehicles_location ON public.vehicles(current_latitude, current_longitude);
CREATE INDEX idx_vehicles_deleted ON public.vehicles(deleted_at) WHERE deleted_at IS NULL;

-- =============================================================================
-- PART 3: VEHICLE LOCATIONS (GPS Breadcrumbs)
-- =============================================================================

CREATE TABLE public.vehicle_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,

    latitude NUMERIC(10,6) NOT NULL,
    longitude NUMERIC(10,6) NOT NULL,
    altitude_ft NUMERIC(10,2),
    heading_degrees INTEGER,
    speed_mph NUMERIC(6,2),

    odometer INTEGER,

    address TEXT,
    city TEXT,
    state TEXT,

    -- For IFTA jurisdiction tracking
    jurisdiction_state TEXT,

    geofence_id UUID REFERENCES public.geofences(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,

    source public.vehicle_gps_provider NOT NULL,
    source_device_id TEXT,

    engine_running BOOLEAN,

    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vehicle_loc_vehicle ON public.vehicle_locations(vehicle_id);
CREATE INDEX idx_vehicle_loc_time ON public.vehicle_locations(recorded_at DESC);
CREATE INDEX idx_vehicle_loc_state ON public.vehicle_locations(jurisdiction_state);
CREATE INDEX idx_vehicle_loc_project ON public.vehicle_locations(project_id);

-- =============================================================================
-- PART 4: VEHICLE ODOMETER READINGS
-- =============================================================================

CREATE TABLE public.vehicle_odometer_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,

    reading_date DATE NOT NULL,
    odometer INTEGER NOT NULL,

    source TEXT NOT NULL,  -- 'GPS', 'FUEL_CARD', 'MANUAL', 'INSPECTION'
    source_reference TEXT,

    -- For variance detection
    expected_odometer INTEGER,
    variance INTEGER,
    variance_flagged BOOLEAN DEFAULT FALSE,

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_odometer_vehicle ON public.vehicle_odometer_readings(vehicle_id);
CREATE INDEX idx_odometer_date ON public.vehicle_odometer_readings(reading_date DESC);

-- Trigger to update vehicle current odometer
CREATE OR REPLACE FUNCTION public.update_vehicle_odometer()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.vehicles
    SET current_odometer = NEW.odometer,
        odometer_updated_at = NOW()
    WHERE id = NEW.vehicle_id
      AND (current_odometer IS NULL OR NEW.odometer > current_odometer);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_vehicle_odometer
    AFTER INSERT ON public.vehicle_odometer_readings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_vehicle_odometer();

-- =============================================================================
-- PART 5: TRAILERS
-- =============================================================================

CREATE TABLE public.trailers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    trailer_number TEXT NOT NULL,
    description TEXT NOT NULL,
    trailer_type public.trailer_type NOT NULL,

    year INTEGER,
    make TEXT,
    model TEXT,
    vin TEXT,

    license_plate TEXT,
    license_plate_state TEXT,
    registration_expiry DATE,

    gvwr_lbs INTEGER,
    length_ft NUMERIC(6,2),
    deck_height_inches INTEGER,

    last_inspection_date DATE,
    next_inspection_date DATE,

    status public.vehicle_status NOT NULL DEFAULT 'AVAILABLE',

    current_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    current_location TEXT,
    current_latitude NUMERIC(10,6),
    current_longitude NUMERIC(10,6),

    gps_device_id TEXT,

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    UNIQUE(organization_id, trailer_number)
);

CREATE INDEX idx_trailers_org ON public.trailers(organization_id);
CREATE INDEX idx_trailers_status ON public.trailers(status);
CREATE INDEX idx_trailers_type ON public.trailers(trailer_type);

-- =============================================================================
-- PART 6: FUEL CARDS
-- =============================================================================

CREATE TABLE public.fuel_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    card_number TEXT NOT NULL,
    card_provider public.fuel_card_provider NOT NULL,

    -- Assignment
    assigned_to_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    assigned_to_driver_id UUID REFERENCES public.crew_members(id) ON DELETE SET NULL,

    -- Limits
    daily_limit NUMERIC(10,2),
    weekly_limit NUMERIC(10,2),
    monthly_limit NUMERIC(10,2),
    per_transaction_limit NUMERIC(10,2),

    -- Restrictions
    fuel_only BOOLEAN DEFAULT TRUE,
    allowed_fuel_types TEXT[],

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    activated_date DATE,
    deactivated_date DATE,
    deactivation_reason TEXT,

    -- PIN
    pin_last_four TEXT,

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fuel_cards_org ON public.fuel_cards(organization_id);
CREATE INDEX idx_fuel_cards_vehicle ON public.fuel_cards(assigned_to_vehicle_id);
CREATE INDEX idx_fuel_cards_driver ON public.fuel_cards(assigned_to_driver_id);
CREATE INDEX idx_fuel_cards_number ON public.fuel_cards(card_number);

-- =============================================================================
-- PART 7: FUEL ANOMALY CONFIGURATION
-- =============================================================================

CREATE TABLE public.fuel_anomaly_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,

    -- Odometer variance threshold (miles)
    odometer_variance_threshold INTEGER DEFAULT 500,

    -- Tank capacity overfill percentage
    tank_overfill_percent INTEGER DEFAULT 110,

    -- Distance from GPS location (miles)
    location_variance_threshold INTEGER DEFAULT 100,

    -- Time since last fill (hours) - too frequent
    min_hours_between_fills INTEGER DEFAULT 4,

    -- MPG thresholds (flag if outside range)
    min_acceptable_mpg NUMERIC(4,1) DEFAULT 3.0,
    max_acceptable_mpg NUMERIC(4,1) DEFAULT 15.0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PART 8: FUEL TRANSACTIONS
-- =============================================================================

CREATE TABLE public.fuel_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Card/Vehicle
    fuel_card_id UUID REFERENCES public.fuel_cards(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES public.crew_members(id) ON DELETE SET NULL,

    -- Transaction Details
    transaction_date DATE NOT NULL,
    transaction_time TIME,
    transaction_id TEXT,

    -- Location
    merchant_name TEXT,
    merchant_address TEXT,
    merchant_city TEXT,
    merchant_state TEXT,
    merchant_zip TEXT,
    latitude NUMERIC(10,6),
    longitude NUMERIC(10,6),

    -- Fuel
    fuel_type TEXT NOT NULL,
    gallons NUMERIC(10,3) NOT NULL,
    price_per_gallon NUMERIC(8,4),
    total_amount NUMERIC(12,2) NOT NULL,

    -- Odometer
    odometer_reported INTEGER,
    odometer_expected INTEGER,
    odometer_variance INTEGER,

    -- Anomaly Detection
    status public.fuel_transaction_status NOT NULL DEFAULT 'PENDING',
    anomaly_flags TEXT[],
    anomaly_score INTEGER DEFAULT 0,

    -- Review
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,

    -- Cost Allocation
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    cost_code_id UUID REFERENCES public.cost_codes(id) ON DELETE SET NULL,

    -- Reconciliation
    reconciled BOOLEAN DEFAULT FALSE,
    reconciled_at TIMESTAMPTZ,

    -- Import
    import_batch_id TEXT,
    raw_data JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fuel_trans_org ON public.fuel_transactions(organization_id);
CREATE INDEX idx_fuel_trans_vehicle ON public.fuel_transactions(vehicle_id);
CREATE INDEX idx_fuel_trans_date ON public.fuel_transactions(transaction_date DESC);
CREATE INDEX idx_fuel_trans_status ON public.fuel_transactions(status);
CREATE INDEX idx_fuel_trans_project ON public.fuel_transactions(project_id);
CREATE INDEX idx_fuel_trans_flagged ON public.fuel_transactions(status) WHERE status = 'FLAGGED';

-- =============================================================================
-- PART 9: FUEL ANOMALY DETECTION TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_fuel_anomalies()
RETURNS TRIGGER AS $$
DECLARE
    v_config RECORD;
    v_vehicle RECORD;
    v_last_fill RECORD;
    v_gps_location RECORD;
    v_anomalies TEXT[] := ARRAY[]::TEXT[];
    v_score INTEGER := 0;
    v_distance_from_gps NUMERIC;
    v_calculated_mpg NUMERIC;
    v_hours_since_last NUMERIC;
BEGIN
    -- Get config (use defaults if not found)
    SELECT * INTO v_config FROM public.fuel_anomaly_config WHERE organization_id = NEW.organization_id;
    IF NOT FOUND THEN
        -- Use default values
        v_config := ROW(
            gen_random_uuid(),
            NEW.organization_id,
            500,   -- odometer_variance_threshold
            110,   -- tank_overfill_percent
            100,   -- location_variance_threshold
            4,     -- min_hours_between_fills
            3.0,   -- min_acceptable_mpg
            15.0,  -- max_acceptable_mpg
            NOW(),
            NOW()
        );
    END IF;

    -- Get vehicle
    SELECT * INTO v_vehicle FROM public.vehicles WHERE id = NEW.vehicle_id;

    IF v_vehicle.id IS NOT NULL THEN
        -- Check 1: Odometer variance
        IF NEW.odometer_reported IS NOT NULL AND v_vehicle.current_odometer IS NOT NULL THEN
            NEW.odometer_expected := v_vehicle.current_odometer;
            NEW.odometer_variance := abs(NEW.odometer_reported - v_vehicle.current_odometer);

            IF NEW.odometer_variance > v_config.odometer_variance_threshold THEN
                v_anomalies := array_append(v_anomalies, 'ODOMETER_VARIANCE');
                v_score := v_score + 30;
            END IF;
        END IF;

        -- Check 2: Tank capacity exceeded
        IF v_vehicle.fuel_tank_capacity_gallons IS NOT NULL THEN
            IF NEW.gallons > (v_vehicle.fuel_tank_capacity_gallons * v_config.tank_overfill_percent / 100) THEN
                v_anomalies := array_append(v_anomalies, 'EXCEEDS_TANK_CAPACITY');
                v_score := v_score + 40;
            END IF;
        END IF;

        -- Check 3: Location variance from GPS
        SELECT * INTO v_gps_location
        FROM public.vehicle_locations
        WHERE vehicle_id = NEW.vehicle_id
          AND recorded_at >= NOW() - INTERVAL '2 hours'
        ORDER BY recorded_at DESC
        LIMIT 1;

        IF v_gps_location.id IS NOT NULL AND NEW.latitude IS NOT NULL THEN
            v_distance_from_gps := 3959 * acos(
                LEAST(1, GREATEST(-1,
                    cos(radians(v_gps_location.latitude)) * cos(radians(NEW.latitude)) *
                    cos(radians(NEW.longitude) - radians(v_gps_location.longitude)) +
                    sin(radians(v_gps_location.latitude)) * sin(radians(NEW.latitude))
                ))
            );

            IF v_distance_from_gps > v_config.location_variance_threshold THEN
                v_anomalies := array_append(v_anomalies, 'LOCATION_MISMATCH');
                v_score := v_score + 35;
            END IF;
        END IF;

        -- Check 4: Time since last fill
        SELECT * INTO v_last_fill
        FROM public.fuel_transactions
        WHERE vehicle_id = NEW.vehicle_id
          AND id != NEW.id
        ORDER BY transaction_date DESC, transaction_time DESC
        LIMIT 1;

        IF v_last_fill.id IS NOT NULL THEN
            v_hours_since_last := EXTRACT(EPOCH FROM (
                (NEW.transaction_date + COALESCE(NEW.transaction_time, '12:00'::TIME)) -
                (v_last_fill.transaction_date + COALESCE(v_last_fill.transaction_time, '12:00'::TIME))
            )) / 3600;

            IF v_hours_since_last < v_config.min_hours_between_fills THEN
                v_anomalies := array_append(v_anomalies, 'FREQUENT_FILLS');
                v_score := v_score + 25;
            END IF;

            -- Check 5: MPG calculation
            IF NEW.odometer_reported IS NOT NULL AND v_last_fill.odometer_reported IS NOT NULL THEN
                v_calculated_mpg := (NEW.odometer_reported - v_last_fill.odometer_reported) / NULLIF(NEW.gallons, 0);

                IF v_calculated_mpg < v_config.min_acceptable_mpg OR v_calculated_mpg > v_config.max_acceptable_mpg THEN
                    v_anomalies := array_append(v_anomalies, 'ABNORMAL_MPG');
                    v_score := v_score + 20;
                END IF;
            END IF;
        END IF;
    END IF;

    -- Set anomaly data
    NEW.anomaly_flags := v_anomalies;
    NEW.anomaly_score := v_score;

    -- Auto-flag if score exceeds threshold
    IF v_score >= 30 THEN
        NEW.status := 'FLAGGED';

        -- Create platform alert
        INSERT INTO public.platform_alerts (
            organization_id, alert_type, severity, category,
            entity_type, entity_id, entity_identifier,
            title, description, metadata
        )
        SELECT
            NEW.organization_id,
            'FUEL_ANOMALY',
            CASE WHEN v_score >= 60 THEN 'HIGH' WHEN v_score >= 40 THEN 'MEDIUM' ELSE 'LOW' END::platform_alert_severity,
            'FINANCIAL'::platform_alert_category,
            'VEHICLE',
            NEW.vehicle_id,
            v_vehicle.vehicle_number,
            'Fuel Anomaly: ' || v_vehicle.vehicle_number,
            format('Anomalies detected: %s (Score: %s)', array_to_string(v_anomalies, ', '), v_score),
            jsonb_build_object(
                'transaction_id', NEW.transaction_id,
                'anomalies', v_anomalies,
                'score', v_score,
                'gallons', NEW.gallons,
                'total_amount', NEW.total_amount
            );
    ELSE
        NEW.status := 'APPROVED';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_fuel_anomalies
    BEFORE INSERT ON public.fuel_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.check_fuel_anomalies();

-- =============================================================================
-- PART 10: FUEL RECONCILIATION
-- =============================================================================

CREATE TABLE public.fuel_reconciliation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,

    reconciliation_month DATE NOT NULL,

    -- Summary
    total_gallons NUMERIC(12,2),
    total_cost NUMERIC(14,2),
    total_miles INTEGER,

    -- Calculated
    mpg NUMERIC(6,2),
    cost_per_mile NUMERIC(8,4),

    -- Targets
    target_mpg NUMERIC(4,1),
    mpg_variance NUMERIC(6,2),

    -- Anomalies
    flagged_transactions INTEGER DEFAULT 0,
    disputed_amount NUMERIC(12,2) DEFAULT 0,

    -- Status
    reconciled BOOLEAN DEFAULT FALSE,
    reconciled_by UUID REFERENCES auth.users(id),
    reconciled_at TIMESTAMPTZ,

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(vehicle_id, reconciliation_month)
);

CREATE INDEX idx_fuel_recon_org ON public.fuel_reconciliation(organization_id);
CREATE INDEX idx_fuel_recon_vehicle ON public.fuel_reconciliation(vehicle_id);
CREATE INDEX idx_fuel_recon_month ON public.fuel_reconciliation(reconciliation_month DESC);

-- =============================================================================
-- PART 11: VEHICLE INSPECTIONS
-- =============================================================================

CREATE TABLE public.vehicle_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,

    inspection_type public.vehicle_inspection_type NOT NULL,
    inspection_date DATE NOT NULL,

    -- Inspector
    inspector_name TEXT,
    inspector_company TEXT,
    inspector_certification TEXT,

    -- Result
    result public.vehicle_inspection_result NOT NULL,

    -- Odometer
    odometer_reading INTEGER,

    -- Defects Found
    defects JSONB,  -- [{defect, severity, corrected, correction_date}]
    defect_count INTEGER DEFAULT 0,
    critical_defects INTEGER DEFAULT 0,

    -- Sticker/Certificate
    sticker_number TEXT,
    expiration_date DATE,

    -- For roadside inspections
    location TEXT,
    dot_report_number TEXT,

    -- Documentation
    inspection_report_url TEXT,
    photos TEXT[],

    -- Cost
    inspection_cost NUMERIC(10,2),
    repair_cost NUMERIC(12,2),

    -- Next Due
    next_inspection_due DATE,

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_inspections_vehicle ON public.vehicle_inspections(vehicle_id);
CREATE INDEX idx_inspections_type ON public.vehicle_inspections(inspection_type);
CREATE INDEX idx_inspections_date ON public.vehicle_inspections(inspection_date DESC);
CREATE INDEX idx_inspections_result ON public.vehicle_inspections(result);
CREATE INDEX idx_inspections_expiry ON public.vehicle_inspections(expiration_date);

-- Trigger to update vehicle DOT status
CREATE OR REPLACE FUNCTION public.update_vehicle_dot_status()
RETURNS TRIGGER AS $$
DECLARE
    v_vehicle RECORD;
    v_status public.dot_status := 'COMPLIANT';
BEGIN
    SELECT * INTO v_vehicle FROM public.vehicles WHERE id = NEW.vehicle_id;

    -- Check multiple compliance factors
    IF NEW.inspection_type = 'DOT_ANNUAL' THEN
        UPDATE public.vehicles
        SET last_dot_inspection_date = NEW.inspection_date,
            next_dot_inspection_date = NEW.expiration_date,
            dot_inspection_sticker = NEW.sticker_number
        WHERE id = NEW.vehicle_id;
    END IF;

    -- Calculate overall DOT status
    SELECT
        CASE
            WHEN next_dot_inspection_date < CURRENT_DATE THEN 'OUT_OF_SERVICE'
            WHEN registration_expiry < CURRENT_DATE THEN 'OUT_OF_SERVICE'
            WHEN irp_cab_card_expiry < CURRENT_DATE AND irp_cab_card_expiry IS NOT NULL THEN 'NON_COMPLIANT'
            WHEN ifta_license_expiry < CURRENT_DATE AND ifta_license_expiry IS NOT NULL THEN 'NON_COMPLIANT'
            WHEN next_dot_inspection_date < CURRENT_DATE + INTERVAL '30 days' THEN 'WARNING'
            WHEN registration_expiry < CURRENT_DATE + INTERVAL '30 days' THEN 'WARNING'
            ELSE 'COMPLIANT'
        END INTO v_status
    FROM public.vehicles WHERE id = NEW.vehicle_id;

    UPDATE public.vehicles SET dot_status = v_status WHERE id = NEW.vehicle_id;

    -- Create alert if non-compliant
    IF v_status IN ('OUT_OF_SERVICE', 'NON_COMPLIANT') THEN
        INSERT INTO public.platform_alerts (
            organization_id, alert_type, severity, category,
            entity_type, entity_id, entity_identifier,
            title, description
        )
        SELECT
            v_vehicle.organization_id,
            'DOT_NON_COMPLIANT',
            CASE WHEN v_status = 'OUT_OF_SERVICE' THEN 'CRITICAL' ELSE 'HIGH' END::platform_alert_severity,
            'COMPLIANCE'::platform_alert_category,
            'VEHICLE',
            v_vehicle.id,
            v_vehicle.vehicle_number,
            'DOT Non-Compliant: ' || v_vehicle.vehicle_number,
            format('Vehicle %s status: %s', v_vehicle.vehicle_number, v_status)
        WHERE NOT EXISTS (
            SELECT 1 FROM public.platform_alerts
            WHERE entity_id = v_vehicle.id
              AND alert_type = 'DOT_NON_COMPLIANT'
              AND status = 'ACTIVE'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_dot_status
    AFTER INSERT ON public.vehicle_inspections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_vehicle_dot_status();

-- =============================================================================
-- PART 12: DRIVER QUALIFICATION FILES (DQF)
-- =============================================================================

CREATE TABLE public.driver_qualification_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES public.crew_members(id) ON DELETE CASCADE UNIQUE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- CDL Info (references existing driver_licenses data if needed)
    cdl_number TEXT NOT NULL,
    cdl_state TEXT NOT NULL,
    cdl_class TEXT NOT NULL,
    cdl_endorsements TEXT[],
    cdl_restrictions TEXT[],
    cdl_expiry DATE NOT NULL,
    cdl_verified BOOLEAN DEFAULT FALSE,
    cdl_verified_date DATE,

    -- DOT Medical
    medical_card_expiry DATE NOT NULL,
    medical_examiner_name TEXT,
    medical_examiner_npi TEXT,
    medical_certificate_url TEXT,

    -- MVR (Motor Vehicle Record)
    last_mvr_date DATE,
    mvr_result TEXT,  -- 'CLEAR', 'VIOLATIONS', 'DISQUALIFYING'
    mvr_violations_count INTEGER DEFAULT 0,
    mvr_accidents_count INTEGER DEFAULT 0,
    next_mvr_due DATE,

    -- Drug & Alcohol Clearinghouse
    clearinghouse_query_date DATE,
    clearinghouse_status TEXT,  -- 'CLEAR', 'PROHIBITED'
    clearinghouse_consent_on_file BOOLEAN DEFAULT FALSE,

    -- Pre-Employment Screening Program (PSP)
    psp_report_date DATE,
    psp_inspection_count INTEGER,
    psp_violation_count INTEGER,
    psp_crash_count INTEGER,

    -- Overall Status (auto-calculated)
    dqf_status public.dqf_status NOT NULL DEFAULT 'INCOMPLETE',
    status_updated_at TIMESTAMPTZ,

    -- Dates for tracking
    hire_date DATE,
    application_date DATE,
    road_test_date DATE,

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dqf_driver ON public.driver_qualification_files(driver_id);
CREATE INDEX idx_dqf_org ON public.driver_qualification_files(organization_id);
CREATE INDEX idx_dqf_status ON public.driver_qualification_files(dqf_status);
CREATE INDEX idx_dqf_cdl_expiry ON public.driver_qualification_files(cdl_expiry);
CREATE INDEX idx_dqf_medical_expiry ON public.driver_qualification_files(medical_card_expiry);

-- =============================================================================
-- PART 13: DQF DOCUMENTS
-- =============================================================================

CREATE TABLE public.dqf_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dqf_id UUID NOT NULL REFERENCES public.driver_qualification_files(id) ON DELETE CASCADE,

    document_type TEXT NOT NULL,  -- 'APPLICATION', 'MVR', 'MEDICAL_CARD', 'CDL_COPY', etc.
    is_required BOOLEAN DEFAULT TRUE,

    document_url TEXT,
    document_date DATE,
    expiry_date DATE,

    verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMPTZ,

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dqf_docs_dqf ON public.dqf_documents(dqf_id);
CREATE INDEX idx_dqf_docs_type ON public.dqf_documents(document_type);
CREATE INDEX idx_dqf_docs_expiry ON public.dqf_documents(expiry_date);

-- =============================================================================
-- PART 14: DQF STATUS UPDATE TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_dqf_status()
RETURNS TRIGGER AS $$
DECLARE
    v_status public.dqf_status := 'COMPLETE';
    v_required_docs INTEGER := 0;
    v_complete_docs INTEGER := 0;
BEGIN
    -- Check required documents exist
    SELECT COUNT(*) INTO v_required_docs FROM public.dqf_documents
    WHERE dqf_id = NEW.id AND is_required = TRUE;

    SELECT COUNT(*) INTO v_complete_docs FROM public.dqf_documents
    WHERE dqf_id = NEW.id AND is_required = TRUE AND document_url IS NOT NULL;

    -- Check for expired/disqualifying items
    IF NEW.clearinghouse_status = 'PROHIBITED' THEN
        v_status := 'DISQUALIFIED';
    ELSIF NEW.mvr_result = 'DISQUALIFYING' THEN
        v_status := 'DISQUALIFIED';
    ELSIF NEW.cdl_expiry < CURRENT_DATE THEN
        v_status := 'EXPIRED';
    ELSIF NEW.medical_card_expiry < CURRENT_DATE THEN
        v_status := 'EXPIRED';
    ELSIF v_required_docs > 0 AND v_complete_docs < v_required_docs THEN
        v_status := 'INCOMPLETE';
    ELSIF NEW.cdl_expiry < CURRENT_DATE + INTERVAL '30 days' THEN
        v_status := 'EXPIRED';  -- Treat expiring soon as needing attention
    ELSIF NEW.medical_card_expiry < CURRENT_DATE + INTERVAL '30 days' THEN
        v_status := 'EXPIRED';
    END IF;

    NEW.dqf_status := v_status;
    NEW.status_updated_at := NOW();

    -- Create alert if status is problematic
    IF v_status IN ('EXPIRED', 'DISQUALIFIED', 'INCOMPLETE') THEN
        INSERT INTO public.platform_alerts (
            organization_id, alert_type, severity, category,
            entity_type, entity_id, entity_identifier,
            title, description
        )
        SELECT
            NEW.organization_id,
            'DQF_' || v_status,
            CASE v_status WHEN 'DISQUALIFIED' THEN 'CRITICAL' WHEN 'EXPIRED' THEN 'HIGH' ELSE 'MEDIUM' END::platform_alert_severity,
            'COMPLIANCE'::platform_alert_category,
            'CREW',
            NEW.driver_id,
            cm.employee_id || ' - ' || cm.first_name || ' ' || cm.last_name,
            'DQF ' || v_status || ': ' || cm.first_name || ' ' || cm.last_name,
            format('Driver qualification file status: %s', v_status)
        FROM public.crew_members cm WHERE cm.id = NEW.driver_id
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_dqf_status
    BEFORE INSERT OR UPDATE ON public.driver_qualification_files
    FOR EACH ROW
    EXECUTE FUNCTION public.update_dqf_status();

-- =============================================================================
-- PART 15: DRUG & ALCOHOL TESTING (extends existing drug_tests if needed)
-- Note: drug_tests table already exists in 051, so we create a linking view
-- =============================================================================

-- Create a view that links DQF to existing drug_tests
-- Note: Uses columns that actually exist in the current drug_tests table
CREATE OR REPLACE VIEW public.v_dqf_drug_tests AS
SELECT
    dt.id,
    dqf.id AS dqf_id,
    dqf.driver_id,
    dt.employee_id,
    dt.test_type,
    dt.test_date,
    dt.result,
    dt.result_date,
    dt.is_dot_test,
    dt.chain_of_custody_number,
    dt.lab_name,
    dt.mro_name,
    dt.collection_site,
    dt.document_url,
    dt.notes,
    dt.created_at
FROM public.drug_tests dt
JOIN public.employees e ON dt.employee_id = e.id
JOIN public.crew_members cm ON cm.employee_id = e.id::TEXT
JOIN public.driver_qualification_files dqf ON dqf.driver_id = cm.id;

-- =============================================================================
-- PART 16: IFTA REPORTING
-- =============================================================================

CREATE TABLE public.ifta_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Quarter
    report_year INTEGER NOT NULL,
    report_quarter INTEGER NOT NULL CHECK (report_quarter BETWEEN 1 AND 4),

    -- Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Summary
    total_miles INTEGER NOT NULL,
    total_gallons NUMERIC(12,2) NOT NULL,
    avg_mpg NUMERIC(6,2),

    -- By Jurisdiction
    jurisdiction_details JSONB NOT NULL,  -- [{state, miles, gallons, tax_rate, tax_due}]

    -- Calculation
    net_tax_due NUMERIC(12,2),
    tax_credits NUMERIC(12,2),
    tax_owed NUMERIC(12,2),

    -- Filing
    filed BOOLEAN DEFAULT FALSE,
    filed_date DATE,
    confirmation_number TEXT,

    -- Payment
    paid BOOLEAN DEFAULT FALSE,
    paid_date DATE,
    paid_amount NUMERIC(12,2),
    payment_reference TEXT,

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, report_year, report_quarter)
);

CREATE INDEX idx_ifta_org ON public.ifta_reports(organization_id);
CREATE INDEX idx_ifta_period ON public.ifta_reports(report_year, report_quarter);

-- =============================================================================
-- PART 17: IFTA MILES CALCULATION FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.calculate_ifta_miles(
    p_org_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    jurisdiction_state TEXT,
    total_miles INTEGER,
    fuel_gallons NUMERIC,
    calculated_mpg NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH vehicle_miles AS (
        SELECT
            vl.jurisdiction_state,
            vl.vehicle_id,
            -- Calculate miles from sequential GPS points
            SUM(
                3959 * acos(
                    LEAST(1, GREATEST(-1,
                        cos(radians(vl.latitude)) * cos(radians(next_loc.latitude)) *
                        cos(radians(next_loc.longitude) - radians(vl.longitude)) +
                        sin(radians(vl.latitude)) * sin(radians(next_loc.latitude))
                    ))
                )
            ) AS miles
        FROM public.vehicle_locations vl
        JOIN public.vehicles v ON vl.vehicle_id = v.id
        LEFT JOIN LATERAL (
            SELECT latitude, longitude
            FROM public.vehicle_locations vl2
            WHERE vl2.vehicle_id = vl.vehicle_id
              AND vl2.recorded_at > vl.recorded_at
            ORDER BY vl2.recorded_at
            LIMIT 1
        ) next_loc ON TRUE
        WHERE v.organization_id = p_org_id
          AND vl.recorded_at >= p_start_date
          AND vl.recorded_at < p_end_date + INTERVAL '1 day'
          AND vl.jurisdiction_state IS NOT NULL
          AND next_loc.latitude IS NOT NULL
        GROUP BY vl.jurisdiction_state, vl.vehicle_id
    ),
    jurisdiction_fuel AS (
        SELECT
            ft.merchant_state AS jurisdiction_state,
            SUM(ft.gallons) AS gallons
        FROM public.fuel_transactions ft
        JOIN public.vehicles v ON ft.vehicle_id = v.id
        WHERE v.organization_id = p_org_id
          AND ft.transaction_date >= p_start_date
          AND ft.transaction_date <= p_end_date
          AND ft.status IN ('APPROVED', 'RECONCILED')
        GROUP BY ft.merchant_state
    )
    SELECT
        vm.jurisdiction_state,
        ROUND(SUM(vm.miles))::INTEGER AS total_miles,
        COALESCE(jf.gallons, 0) AS fuel_gallons,
        ROUND(SUM(vm.miles) / NULLIF(COALESCE(jf.gallons, 0), 0), 2) AS calculated_mpg
    FROM vehicle_miles vm
    LEFT JOIN jurisdiction_fuel jf ON vm.jurisdiction_state = jf.jurisdiction_state
    GROUP BY vm.jurisdiction_state, jf.gallons
    ORDER BY total_miles DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PART 18: DOT AUDIT PACKET GENERATOR
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_dot_audit_packet(
    p_org_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'generated_at', NOW(),
        'period', jsonb_build_object(
            'start_date', p_start_date,
            'end_date', p_end_date
        ),

        -- Fleet Summary
        'fleet_summary', (
            SELECT jsonb_build_object(
                'total_vehicles', COUNT(*),
                'compliant', COUNT(*) FILTER (WHERE dot_status = 'COMPLIANT'),
                'warning', COUNT(*) FILTER (WHERE dot_status = 'WARNING'),
                'non_compliant', COUNT(*) FILTER (WHERE dot_status = 'NON_COMPLIANT'),
                'out_of_service', COUNT(*) FILTER (WHERE dot_status = 'OUT_OF_SERVICE')
            )
            FROM public.vehicles WHERE organization_id = p_org_id AND deleted_at IS NULL
        ),

        -- Vehicle List with Inspection Status
        'vehicles', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'vehicle_number', v.vehicle_number,
                'vin', v.vin,
                'year_make_model', v.year || ' ' || v.make || ' ' || v.model,
                'dot_status', v.dot_status,
                'last_dot_inspection', v.last_dot_inspection_date,
                'next_dot_inspection', v.next_dot_inspection_date,
                'registration_expiry', v.registration_expiry,
                'irp_expiry', v.irp_cab_card_expiry,
                'ifta_expiry', v.ifta_license_expiry
            )), '[]'::jsonb)
            FROM public.vehicles v WHERE v.organization_id = p_org_id AND v.deleted_at IS NULL
        ),

        -- Driver List with DQF Status
        'drivers', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'employee_id', cm.employee_id,
                'name', cm.first_name || ' ' || cm.last_name,
                'cdl_number', dqf.cdl_number,
                'cdl_state', dqf.cdl_state,
                'cdl_expiry', dqf.cdl_expiry,
                'medical_card_expiry', dqf.medical_card_expiry,
                'clearinghouse_status', dqf.clearinghouse_status,
                'dqf_status', dqf.dqf_status
            )), '[]'::jsonb)
            FROM public.driver_qualification_files dqf
            JOIN public.crew_members cm ON dqf.driver_id = cm.id
            WHERE dqf.organization_id = p_org_id
        ),

        -- Inspections During Period
        'inspections', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'vehicle_number', v.vehicle_number,
                'inspection_type', vi.inspection_type,
                'inspection_date', vi.inspection_date,
                'result', vi.result,
                'inspector', vi.inspector_name,
                'defects_found', vi.defect_count
            )), '[]'::jsonb)
            FROM public.vehicle_inspections vi
            JOIN public.vehicles v ON vi.vehicle_id = v.id
            WHERE v.organization_id = p_org_id
              AND vi.inspection_date >= p_start_date
              AND vi.inspection_date <= p_end_date
        ),

        -- Drug Tests During Period (via existing drug_tests table)
        'drug_tests', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'employee_id', e.employee_number,
                'name', e.first_name || ' ' || e.last_name,
                'test_type', dt.test_type,
                'test_date', dt.test_date,
                'result', dt.result
            )), '[]'::jsonb)
            FROM public.drug_tests dt
            JOIN public.employees e ON dt.employee_id = e.id
            WHERE e.organization_id = p_org_id
              AND dt.test_date >= p_start_date
              AND dt.test_date <= p_end_date
        )

    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PART 19: VEHICLE MAINTENANCE
-- =============================================================================

CREATE TABLE public.vehicle_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,

    maintenance_type public.maintenance_type NOT NULL,
    priority public.maintenance_priority NOT NULL DEFAULT 'normal',

    title TEXT NOT NULL,
    description TEXT,
    work_performed TEXT,

    status TEXT NOT NULL DEFAULT 'SCHEDULED',

    scheduled_date DATE,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    odometer_at_service INTEGER,

    service_location TEXT,
    vendor_name TEXT,
    work_order_number TEXT,
    invoice_number TEXT,

    labor_hours NUMERIC(8,2),
    labor_cost NUMERIC(12,2),
    parts_cost NUMERIC(12,2),
    total_cost NUMERIC(12,2),

    parts_used JSONB,

    next_service_odometer INTEGER,
    next_service_date DATE,

    document_urls TEXT[],
    photo_urls TEXT[],

    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    cost_code_id UUID REFERENCES public.cost_codes(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vehicle_maint_vehicle ON public.vehicle_maintenance(vehicle_id);
CREATE INDEX idx_vehicle_maint_status ON public.vehicle_maintenance(status);
CREATE INDEX idx_vehicle_maint_scheduled ON public.vehicle_maintenance(scheduled_date) WHERE status = 'SCHEDULED';

-- =============================================================================
-- PART 20: VIEWS
-- =============================================================================

-- Vehicle Fleet Overview View
CREATE OR REPLACE VIEW public.v_vehicle_fleet_overview AS
SELECT
    v.id,
    v.vehicle_number,
    v.description,
    v.vehicle_type,
    v.year,
    v.make,
    v.model,
    v.vin,
    v.status,
    v.dot_status,
    v.license_plate,
    v.license_plate_state,
    v.registration_expiry,
    v.current_odometer,
    v.current_project_id,
    p.project_number,
    p.name AS project_name,
    v.current_driver_id,
    cm.first_name || ' ' || cm.last_name AS driver_name,
    v.current_latitude,
    v.current_longitude,
    v.last_location_update,
    v.next_dot_inspection_date,
    v.irp_cab_card_expiry,
    v.ifta_license_expiry,
    v.target_mpg,

    -- Compliance Alerts
    CASE
        WHEN v.next_dot_inspection_date < CURRENT_DATE THEN 'OVERDUE'
        WHEN v.next_dot_inspection_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'DUE_SOON'
        ELSE 'OK'
    END AS inspection_status,

    CASE
        WHEN v.registration_expiry < CURRENT_DATE THEN 'EXPIRED'
        WHEN v.registration_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN 'EXPIRING'
        ELSE 'OK'
    END AS registration_status,

    CASE
        WHEN v.irp_cab_card_expiry < CURRENT_DATE THEN 'EXPIRED'
        WHEN v.irp_cab_card_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN 'EXPIRING'
        ELSE 'OK'
    END AS irp_status

FROM public.vehicles v
LEFT JOIN public.projects p ON v.current_project_id = p.id
LEFT JOIN public.crew_members cm ON v.current_driver_id = cm.id
WHERE v.deleted_at IS NULL
  AND v.status != 'SOLD_DISPOSED';

-- DQF Compliance View
CREATE OR REPLACE VIEW public.v_dqf_compliance AS
SELECT
    cm.id AS driver_id,
    cm.employee_id,
    cm.first_name || ' ' || cm.last_name AS driver_name,
    dqf.cdl_number,
    dqf.cdl_state,
    dqf.cdl_class,
    dqf.cdl_expiry,
    dqf.medical_card_expiry,
    dqf.last_mvr_date,
    dqf.next_mvr_due,
    dqf.clearinghouse_query_date,
    dqf.clearinghouse_status,
    dqf.dqf_status,

    -- Days until expiry
    (dqf.cdl_expiry - CURRENT_DATE) AS days_until_cdl_expiry,
    (dqf.medical_card_expiry - CURRENT_DATE) AS days_until_medical_expiry,

    -- Alert level
    CASE
        WHEN dqf.dqf_status = 'DISQUALIFIED' THEN 'CRITICAL'
        WHEN dqf.dqf_status = 'EXPIRED' THEN 'HIGH'
        WHEN dqf.dqf_status = 'INCOMPLETE' THEN 'MEDIUM'
        WHEN dqf.cdl_expiry < CURRENT_DATE + INTERVAL '30 days' THEN 'MEDIUM'
        WHEN dqf.medical_card_expiry < CURRENT_DATE + INTERVAL '30 days' THEN 'MEDIUM'
        ELSE 'OK'
    END AS alert_level

FROM public.crew_members cm
JOIN public.driver_qualification_files dqf ON cm.id = dqf.driver_id
WHERE cm.deleted_at IS NULL
  AND cm.is_active = TRUE
  AND cm.is_cdl_driver = TRUE
ORDER BY
    CASE dqf.dqf_status
        WHEN 'DISQUALIFIED' THEN 1
        WHEN 'EXPIRED' THEN 2
        WHEN 'INCOMPLETE' THEN 3
        ELSE 4
    END,
    LEAST(dqf.cdl_expiry, dqf.medical_card_expiry);

-- =============================================================================
-- PART 21: ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_odometer_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trailers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_anomaly_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_reconciliation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_qualification_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dqf_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ifta_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_maintenance ENABLE ROW LEVEL SECURITY;

-- Vehicles policies
CREATE POLICY "vehicles_org_isolation" ON public.vehicles
    FOR SELECT USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "vehicles_insert" ON public.vehicles
    FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "vehicles_update" ON public.vehicles
    FOR UPDATE USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Vehicle locations policies
CREATE POLICY "vehicle_locations_select" ON public.vehicle_locations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.vehicles v
            WHERE v.id = vehicle_locations.vehicle_id
              AND v.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

CREATE POLICY "vehicle_locations_insert" ON public.vehicle_locations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.vehicles v
            WHERE v.id = vehicle_locations.vehicle_id
              AND v.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Vehicle odometer readings policies
CREATE POLICY "vehicle_odometer_select" ON public.vehicle_odometer_readings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.vehicles v
            WHERE v.id = vehicle_odometer_readings.vehicle_id
              AND v.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

CREATE POLICY "vehicle_odometer_insert" ON public.vehicle_odometer_readings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.vehicles v
            WHERE v.id = vehicle_odometer_readings.vehicle_id
              AND v.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Trailers policies
CREATE POLICY "trailers_org_isolation" ON public.trailers
    FOR ALL USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Fuel cards policies
CREATE POLICY "fuel_cards_org_isolation" ON public.fuel_cards
    FOR ALL USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Fuel anomaly config policies
CREATE POLICY "fuel_anomaly_config_org_isolation" ON public.fuel_anomaly_config
    FOR ALL USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Fuel transactions policies
CREATE POLICY "fuel_transactions_org_isolation" ON public.fuel_transactions
    FOR ALL USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Fuel reconciliation policies
CREATE POLICY "fuel_reconciliation_org_isolation" ON public.fuel_reconciliation
    FOR ALL USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Vehicle inspections policies
CREATE POLICY "vehicle_inspections_select" ON public.vehicle_inspections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.vehicles v
            WHERE v.id = vehicle_inspections.vehicle_id
              AND v.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

CREATE POLICY "vehicle_inspections_insert" ON public.vehicle_inspections
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.vehicles v
            WHERE v.id = vehicle_inspections.vehicle_id
              AND v.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Driver qualification files policies
CREATE POLICY "dqf_org_isolation" ON public.driver_qualification_files
    FOR ALL USING (organization_id = public.get_user_organization_id(auth.uid()));

-- DQF documents policies
CREATE POLICY "dqf_documents_select" ON public.dqf_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.driver_qualification_files dqf
            WHERE dqf.id = dqf_documents.dqf_id
              AND dqf.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

CREATE POLICY "dqf_documents_insert" ON public.dqf_documents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.driver_qualification_files dqf
            WHERE dqf.id = dqf_documents.dqf_id
              AND dqf.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

CREATE POLICY "dqf_documents_update" ON public.dqf_documents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.driver_qualification_files dqf
            WHERE dqf.id = dqf_documents.dqf_id
              AND dqf.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- IFTA reports policies
CREATE POLICY "ifta_reports_org_isolation" ON public.ifta_reports
    FOR ALL USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Vehicle maintenance policies
CREATE POLICY "vehicle_maintenance_select" ON public.vehicle_maintenance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.vehicles v
            WHERE v.id = vehicle_maintenance.vehicle_id
              AND v.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

CREATE POLICY "vehicle_maintenance_insert" ON public.vehicle_maintenance
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.vehicles v
            WHERE v.id = vehicle_maintenance.vehicle_id
              AND v.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

CREATE POLICY "vehicle_maintenance_update" ON public.vehicle_maintenance
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.vehicles v
            WHERE v.id = vehicle_maintenance.vehicle_id
              AND v.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- =============================================================================
-- PART 22: TRIGGERS
-- =============================================================================

-- Updated_at triggers
CREATE TRIGGER trg_vehicles_updated_at
    BEFORE UPDATE ON public.vehicles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_trailers_updated_at
    BEFORE UPDATE ON public.trailers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_fuel_cards_updated_at
    BEFORE UPDATE ON public.fuel_cards
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_fuel_anomaly_config_updated_at
    BEFORE UPDATE ON public.fuel_anomaly_config
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_fuel_reconciliation_updated_at
    BEFORE UPDATE ON public.fuel_reconciliation
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_dqf_updated_at
    BEFORE UPDATE ON public.driver_qualification_files
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_dqf_documents_updated_at
    BEFORE UPDATE ON public.dqf_documents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_ifta_reports_updated_at
    BEFORE UPDATE ON public.ifta_reports
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_vehicle_maintenance_updated_at
    BEFORE UPDATE ON public.vehicle_maintenance
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Audit triggers (if audit_trigger_function exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'audit_trigger_function') THEN
        DROP TRIGGER IF EXISTS trg_audit_vehicles ON public.vehicles;
        CREATE TRIGGER trg_audit_vehicles
            AFTER INSERT OR UPDATE OR DELETE ON public.vehicles
            FOR EACH ROW
            EXECUTE FUNCTION public.audit_trigger_function();

        DROP TRIGGER IF EXISTS trg_audit_fuel_transactions ON public.fuel_transactions;
        CREATE TRIGGER trg_audit_fuel_transactions
            AFTER INSERT OR UPDATE OR DELETE ON public.fuel_transactions
            FOR EACH ROW
            EXECUTE FUNCTION public.audit_trigger_function();

        DROP TRIGGER IF EXISTS trg_audit_vehicle_inspections ON public.vehicle_inspections;
        CREATE TRIGGER trg_audit_vehicle_inspections
            AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_inspections
            FOR EACH ROW
            EXECUTE FUNCTION public.audit_trigger_function();

        DROP TRIGGER IF EXISTS trg_audit_dqf ON public.driver_qualification_files;
        CREATE TRIGGER trg_audit_dqf
            AFTER INSERT OR UPDATE OR DELETE ON public.driver_qualification_files
            FOR EACH ROW
            EXECUTE FUNCTION public.audit_trigger_function();
    END IF;
END $$;

-- =============================================================================
-- COMPLETE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration 090: Vehicle Fleet Management Module completed successfully';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '  - 10 Vehicle enums (vehicle_status, vehicle_type, trailer_type, dot_status, dqf_status, etc.)';
    RAISE NOTICE '  - vehicles table';
    RAISE NOTICE '  - vehicle_locations table (GPS breadcrumbs)';
    RAISE NOTICE '  - vehicle_odometer_readings table';
    RAISE NOTICE '  - trailers table';
    RAISE NOTICE '  - fuel_cards table';
    RAISE NOTICE '  - fuel_anomaly_config table';
    RAISE NOTICE '  - fuel_transactions table with anomaly detection trigger';
    RAISE NOTICE '  - fuel_reconciliation table';
    RAISE NOTICE '  - vehicle_inspections table with DOT status trigger';
    RAISE NOTICE '  - driver_qualification_files table with auto-status trigger';
    RAISE NOTICE '  - dqf_documents table';
    RAISE NOTICE '  - ifta_reports table';
    RAISE NOTICE '  - vehicle_maintenance table';
    RAISE NOTICE '  - 6 functions (odometer update, fuel anomaly, DOT status, DQF status, IFTA calc, audit packet)';
    RAISE NOTICE '  - 2 views (v_vehicle_fleet_overview, v_dqf_compliance)';
    RAISE NOTICE '  - RLS policies on all tables';
    RAISE NOTICE '  - Audit triggers on key tables';
END $$;
