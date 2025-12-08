-- =============================================================================
-- Migration 086: Platform Core Foundation
-- =============================================================================
-- PURPOSE: Implement core platform infrastructure from PLATFORM_CORE_SPEC
-- INCLUDES: Geofences, Platform Alerts, KPI Snapshots, Executive Dashboard
-- DEPENDS ON: All previous migrations (001-085)
-- =============================================================================

-- =============================================================================
-- PART 1: NEW ENUM TYPES (with unique names to avoid conflicts)
-- =============================================================================

-- Alert System Enums
CREATE TYPE platform_alert_severity AS ENUM (
    'CRITICAL',      -- Immediate action required, safety/compliance risk
    'HIGH',          -- Action required within 24 hours
    'MEDIUM',        -- Action required within 7 days
    'LOW',           -- Informational, action at convenience
    'INFO'           -- No action required, FYI only
);

CREATE TYPE platform_alert_status AS ENUM (
    'ACTIVE',        -- Awaiting action
    'ACKNOWLEDGED',  -- Seen but not resolved
    'SNOOZED',       -- Temporarily dismissed
    'DELEGATED',     -- Assigned to another user
    'RESOLVED',      -- Action completed
    'AUTO_RESOLVED', -- System detected resolution
    'EXPIRED'        -- No longer relevant
);

CREATE TYPE platform_alert_category AS ENUM (
    'SAFETY',        -- Safety certifications, incidents
    'COMPLIANCE',    -- DOT, Davis-Bacon, OSHA requirements
    'MAINTENANCE',   -- Equipment/vehicle service due
    'OPERATIONAL',   -- Utilization, assignments, logistics
    'FINANCIAL',     -- Cost overruns, budget alerts
    'ADMINISTRATIVE' -- Document expiry, administrative tasks
);

CREATE TYPE platform_alert_delivery AS ENUM (
    'IN_APP',
    'EMAIL',
    'SMS',
    'PUSH'
);

-- Location & GPS Enums
CREATE TYPE location_source AS ENUM (
    'TELEMATICS',       -- OEM telematics (highest priority)
    'GPS_TRACKER',      -- Aftermarket GPS device
    'MOBILE_CHECKIN',   -- Operator mobile app checkin
    'DAILY_LOG',        -- Foreman daily log entry
    'MANUAL_ENTRY',     -- Admin manual entry
    'GEOFENCE_EVENT'    -- Automatic geofence detection
);

-- Geofence Enums
CREATE TYPE geofence_type AS ENUM (
    'PROJECT_SITE',
    'COMPANY_YARD',
    'FUEL_STATION',
    'SUPPLIER',
    'CUSTOMER',
    'RESTRICTED_AREA',
    'PARKING',
    'MAINTENANCE_SHOP'
);

CREATE TYPE geofence_event_type AS ENUM (
    'ENTER',
    'EXIT',
    'SPEEDING',
    'DWELL_START',
    'DWELL_END'
);

-- Sync & Offline Enums
CREATE TYPE sync_status AS ENUM (
    'SYNCED',
    'PENDING',
    'CONFLICT',
    'FAILED'
);

CREATE TYPE conflict_resolution AS ENUM (
    'SERVER_WINS',
    'CLIENT_WINS',
    'MANUAL_MERGE',
    'NEWEST_WINS'
);

-- Document Management Enums
CREATE TYPE document_retention_class AS ENUM (
    'STANDARD',          -- 7 years
    'FINANCIAL',         -- 10 years
    'SAFETY',            -- 30 years (OSHA)
    'MEDICAL',           -- 30 years post-employment
    'LEGAL_HOLD',        -- Indefinite
    'PERMANENT'          -- Never delete
);

-- =============================================================================
-- PART 2: GEOFENCE SYSTEM TABLES
-- =============================================================================

CREATE TABLE geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    description TEXT,
    geofence_type geofence_type NOT NULL,

    -- Linked Entity
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

    -- Geometry (Circle)
    center_latitude NUMERIC(10,6) NOT NULL,
    center_longitude NUMERIC(10,6) NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 500,

    -- Polygon (GeoJSON for complex shapes)
    polygon_geojson JSONB,

    -- Alert Configuration
    alert_on_enter BOOLEAN DEFAULT TRUE,
    alert_on_exit BOOLEAN DEFAULT TRUE,
    alert_on_speeding BOOLEAN DEFAULT FALSE,
    speed_limit_mph INTEGER,

    -- Dwell Time Alerts
    alert_on_dwell BOOLEAN DEFAULT FALSE,
    dwell_threshold_minutes INTEGER DEFAULT 30,

    -- Time Restrictions (when geofence is active)
    active_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5],  -- 1=Mon, 7=Sun
    active_start_time TIME DEFAULT '06:00',
    active_end_time TIME DEFAULT '18:00',
    is_always_active BOOLEAN DEFAULT FALSE,

    -- Notification Recipients
    notify_user_ids UUID[],
    notify_on_first_entry_only BOOLEAN DEFAULT FALSE,

    -- Color for map display
    color TEXT DEFAULT '#3B82F6',

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_geofences_org ON geofences(organization_id);
CREATE INDEX idx_geofences_project ON geofences(project_id);
CREATE INDEX idx_geofences_type ON geofences(geofence_type);
CREATE INDEX idx_geofences_location ON geofences(center_latitude, center_longitude);
CREATE INDEX idx_geofences_active ON geofences(organization_id, is_active) WHERE is_active = TRUE;

-- Geofence Events (equipment/vehicle entering/exiting)
CREATE TABLE geofence_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    geofence_id UUID NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,

    -- What triggered the event
    entity_type TEXT NOT NULL,          -- 'EQUIPMENT', 'VEHICLE', 'CREW'
    entity_id UUID NOT NULL,
    entity_identifier TEXT,             -- 'EXC-001', 'T-105', 'John Smith'

    event_type geofence_event_type NOT NULL,

    -- Location at event
    latitude NUMERIC(10,6) NOT NULL,
    longitude NUMERIC(10,6) NOT NULL,
    speed_mph NUMERIC(6,2),
    heading NUMERIC(5,2),               -- Degrees 0-360

    -- Source of location data
    location_source location_source DEFAULT 'GPS_TRACKER',

    -- Timing
    event_at TIMESTAMPTZ NOT NULL,
    dwell_duration_minutes INTEGER,     -- For dwell events

    -- Paired event (for enter/exit pairs)
    paired_event_id UUID REFERENCES geofence_events(id),

    -- Alert tracking
    alert_sent BOOLEAN DEFAULT FALSE,
    alert_id UUID,                      -- References platform_alerts if alert was created

    -- Additional context
    metadata JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_geofence_events_geofence ON geofence_events(geofence_id);
CREATE INDEX idx_geofence_events_entity ON geofence_events(entity_type, entity_id);
CREATE INDEX idx_geofence_events_time ON geofence_events(event_at DESC);
CREATE INDEX idx_geofence_events_org_time ON geofence_events(organization_id, event_at DESC);

-- =============================================================================
-- PART 3: PLATFORM ALERT SYSTEM TABLES
-- =============================================================================

CREATE TABLE platform_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Classification
    alert_type TEXT NOT NULL,           -- 'CERT_EXPIRING', 'MAINTENANCE_DUE', 'GEOFENCE_BREACH', etc.
    severity platform_alert_severity NOT NULL,
    category platform_alert_category NOT NULL,

    -- Target Entity
    entity_type TEXT NOT NULL,          -- 'EQUIPMENT', 'VEHICLE', 'CREW', 'PROJECT', 'GEOFENCE'
    entity_id UUID NOT NULL,
    entity_identifier TEXT,             -- 'EXC-001', 'John Smith', etc.

    -- Related entities
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

    -- Content
    title TEXT NOT NULL,
    description TEXT,
    action_required TEXT,
    action_url TEXT,                    -- Deep link to relevant page

    -- Dates
    trigger_date DATE,                  -- When condition was detected
    due_date DATE,                      -- When action is due
    expiry_date DATE,                   -- When alert becomes irrelevant

    -- Status
    status platform_alert_status NOT NULL DEFAULT 'ACTIVE',

    -- Assignment
    assigned_to UUID REFERENCES auth.users(id),

    -- Acknowledgment
    acknowledged_by UUID REFERENCES auth.users(id),
    acknowledged_at TIMESTAMPTZ,
    acknowledgment_notes TEXT,

    -- Snooze
    snoozed_until TIMESTAMPTZ,
    snooze_count INTEGER DEFAULT 0,
    max_snooze_count INTEGER DEFAULT 3,
    snoozed_by UUID REFERENCES auth.users(id),
    snooze_reason TEXT,

    -- Delegation
    delegated_to UUID REFERENCES auth.users(id),
    delegated_by UUID REFERENCES auth.users(id),
    delegated_at TIMESTAMPTZ,
    delegation_notes TEXT,

    -- Resolution
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    resolution_notes TEXT,
    auto_resolved BOOLEAN DEFAULT FALSE,

    -- Recurrence
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule TEXT,               -- iCal RRULE format
    parent_alert_id UUID REFERENCES platform_alerts(id),

    -- Priority Score (calculated)
    priority_score INTEGER DEFAULT 0,

    -- Metadata
    source TEXT DEFAULT 'SYSTEM',       -- 'SYSTEM', 'USER', 'INTEGRATION', 'TELEMATICS'
    source_reference TEXT,              -- External reference ID if from integration
    metadata JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_platform_alerts_org ON platform_alerts(organization_id);
CREATE INDEX idx_platform_alerts_status ON platform_alerts(status);
CREATE INDEX idx_platform_alerts_severity ON platform_alerts(severity);
CREATE INDEX idx_platform_alerts_category ON platform_alerts(category);
CREATE INDEX idx_platform_alerts_entity ON platform_alerts(entity_type, entity_id);
CREATE INDEX idx_platform_alerts_assigned ON platform_alerts(assigned_to);
CREATE INDEX idx_platform_alerts_project ON platform_alerts(project_id);
CREATE INDEX idx_platform_alerts_due ON platform_alerts(due_date);
CREATE INDEX idx_platform_alerts_active ON platform_alerts(organization_id, status)
    WHERE status IN ('ACTIVE', 'ACKNOWLEDGED', 'SNOOZED');
CREATE INDEX idx_platform_alerts_priority ON platform_alerts(organization_id, priority_score DESC)
    WHERE status = 'ACTIVE';

-- Alert Notification Log
CREATE TABLE platform_alert_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    alert_id UUID NOT NULL REFERENCES platform_alerts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    delivery_method platform_alert_delivery NOT NULL,

    -- Delivery details
    recipient_address TEXT,             -- Email address, phone number, etc.

    -- Status tracking
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,

    -- External tracking
    external_id TEXT,                   -- Resend/Twilio message ID

    -- Retry
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alert_notifications_alert ON platform_alert_notifications(alert_id);
CREATE INDEX idx_alert_notifications_user ON platform_alert_notifications(user_id);
CREATE INDEX idx_alert_notifications_pending ON platform_alert_notifications(next_retry_at)
    WHERE sent_at IS NULL AND failed_at IS NULL;

-- User Alert Preferences
CREATE TABLE platform_user_alert_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Delivery by Severity
    critical_in_app BOOLEAN DEFAULT TRUE,
    critical_email BOOLEAN DEFAULT TRUE,
    critical_sms BOOLEAN DEFAULT TRUE,
    critical_push BOOLEAN DEFAULT TRUE,

    high_in_app BOOLEAN DEFAULT TRUE,
    high_email BOOLEAN DEFAULT TRUE,
    high_sms BOOLEAN DEFAULT FALSE,
    high_push BOOLEAN DEFAULT TRUE,

    medium_in_app BOOLEAN DEFAULT TRUE,
    medium_email BOOLEAN DEFAULT FALSE,
    medium_sms BOOLEAN DEFAULT FALSE,
    medium_push BOOLEAN DEFAULT FALSE,

    low_in_app BOOLEAN DEFAULT TRUE,
    low_email BOOLEAN DEFAULT FALSE,
    low_sms BOOLEAN DEFAULT FALSE,
    low_push BOOLEAN DEFAULT FALSE,

    info_in_app BOOLEAN DEFAULT TRUE,
    info_email BOOLEAN DEFAULT FALSE,
    info_sms BOOLEAN DEFAULT FALSE,
    info_push BOOLEAN DEFAULT FALSE,

    -- Categories Subscribed (empty = all)
    categories_subscribed platform_alert_category[] DEFAULT ARRAY['SAFETY', 'COMPLIANCE']::platform_alert_category[],

    -- Digest Settings
    daily_digest_enabled BOOLEAN DEFAULT TRUE,
    daily_digest_time TIME DEFAULT '07:00',
    weekly_digest_enabled BOOLEAN DEFAULT FALSE,
    weekly_digest_day INTEGER DEFAULT 1,  -- 1=Monday

    -- Quiet Hours
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '06:00',
    quiet_hours_allow_critical BOOLEAN DEFAULT TRUE,

    -- Vacation Mode
    vacation_mode BOOLEAN DEFAULT FALSE,
    vacation_delegate_to UUID REFERENCES auth.users(id),
    vacation_start DATE,
    vacation_end DATE,

    -- Contact Info Override
    email_override TEXT,
    phone_override TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_alert_prefs_user ON platform_user_alert_preferences(user_id);
CREATE INDEX idx_user_alert_prefs_org ON platform_user_alert_preferences(organization_id);

-- =============================================================================
-- PART 4: EXECUTIVE DASHBOARD & KPI TABLES
-- =============================================================================

-- KPI Snapshots (Daily/Weekly/Monthly aggregations)
CREATE TABLE kpi_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    snapshot_date DATE NOT NULL,
    period_type TEXT NOT NULL CHECK (period_type IN ('DAILY', 'WEEKLY', 'MONTHLY')),

    -- Equipment KPIs
    equipment_total INTEGER,
    equipment_active INTEGER,
    equipment_utilization_percent NUMERIC(5,2),
    equipment_maintenance_overdue INTEGER,
    equipment_maintenance_due_7d INTEGER,
    equipment_avg_age_years NUMERIC(4,1),
    equipment_hours_mtd INTEGER,

    -- Vehicle KPIs
    vehicles_total INTEGER,
    vehicles_active INTEGER,
    vehicles_dot_compliant INTEGER,
    vehicles_dot_expiring_30d INTEGER,
    vehicles_mpg_avg NUMERIC(4,1),
    vehicles_miles_mtd INTEGER,

    -- Crew KPIs
    crew_total INTEGER,
    crew_active INTEGER,
    crew_certs_compliant_percent NUMERIC(5,2),
    crew_certs_expiring_30d INTEGER,
    crew_certs_expired INTEGER,
    crew_training_hours_mtd INTEGER,

    -- Project KPIs
    projects_active INTEGER,
    projects_behind_schedule INTEGER,
    projects_over_budget INTEGER,
    projects_avg_health_score NUMERIC(5,2),

    -- Financial KPIs (optional - may not be populated)
    fleet_revenue_mtd NUMERIC(14,2),
    fleet_cost_mtd NUMERIC(14,2),
    fuel_cost_mtd NUMERIC(12,2),
    fuel_gallons_mtd NUMERIC(10,2),
    maintenance_cost_mtd NUMERIC(12,2),
    labor_cost_mtd NUMERIC(14,2),

    -- Safety KPIs
    safety_incidents_mtd INTEGER,
    safety_near_misses_mtd INTEGER,
    safety_observations_mtd INTEGER,
    days_since_recordable INTEGER,
    trir NUMERIC(6,3),
    dart_rate NUMERIC(6,3),

    -- Alert KPIs
    alerts_critical_open INTEGER,
    alerts_high_open INTEGER,
    alerts_medium_open INTEGER,
    alerts_resolved_today INTEGER,
    alerts_avg_resolution_hours NUMERIC(8,2),

    -- Compliance KPIs
    compliance_score_percent NUMERIC(5,2),
    documents_expired INTEGER,
    documents_expiring_30d INTEGER,

    -- Notes
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, snapshot_date, period_type)
);

CREATE INDEX idx_kpi_snapshots_org_date ON kpi_snapshots(organization_id, snapshot_date DESC);
CREATE INDEX idx_kpi_snapshots_period ON kpi_snapshots(period_type, snapshot_date DESC);

-- Dashboard Configurations (user-customizable dashboards)
CREATE TABLE dashboard_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    dashboard_name TEXT NOT NULL DEFAULT 'Default',
    dashboard_type TEXT NOT NULL DEFAULT 'EXECUTIVE',  -- 'EXECUTIVE', 'OPERATIONS', 'FLEET', 'SAFETY'
    is_default BOOLEAN DEFAULT FALSE,

    -- Widget Configuration (grid layout)
    widgets JSONB NOT NULL DEFAULT '[]',
    -- Example:
    -- [
    --   {"id": "1", "type": "kpi_card", "config": {"metric": "equipment_utilization"}, "position": {"x": 0, "y": 0, "w": 2, "h": 1}},
    --   {"id": "2", "type": "alert_summary", "config": {}, "position": {"x": 2, "y": 0, "w": 1, "h": 1}},
    --   {"id": "3", "type": "trend_chart", "config": {"metrics": ["crew_certs_compliant_percent"]}, "position": {"x": 0, "y": 1, "w": 3, "h": 2}}
    -- ]

    -- Default Filters
    default_date_range TEXT DEFAULT '30d',  -- '7d', '30d', '90d', 'ytd', 'custom'
    default_project_ids UUID[],
    default_equipment_categories TEXT[],

    -- Auto-refresh
    auto_refresh_enabled BOOLEAN DEFAULT TRUE,
    auto_refresh_seconds INTEGER DEFAULT 300,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, dashboard_name)
);

CREATE INDEX idx_dashboard_configs_user ON dashboard_configs(user_id);
CREATE INDEX idx_dashboard_configs_org ON dashboard_configs(organization_id);

-- =============================================================================
-- PART 5: SENSITIVE DATA ACCESS LOG (HIPAA/Compliance)
-- =============================================================================

CREATE TABLE sensitive_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    user_id UUID NOT NULL REFERENCES auth.users(id),
    user_email TEXT NOT NULL,
    user_role TEXT,

    -- What was accessed
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    record_identifier TEXT,             -- Employee name, etc.

    -- How it was accessed
    access_type TEXT NOT NULL,          -- 'VIEW', 'EXPORT', 'PRINT', 'DOWNLOAD'
    access_reason TEXT,

    -- Fields accessed (for sensitive field-level tracking)
    fields_accessed TEXT[],

    -- Context
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,

    -- Compliance flags
    is_authorized BOOLEAN DEFAULT TRUE,
    authorization_type TEXT,            -- 'ROLE_BASED', 'EXPLICIT_GRANT', 'EMERGENCY'

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sensitive_access_user ON sensitive_access_logs(user_id);
CREATE INDEX idx_sensitive_access_record ON sensitive_access_logs(table_name, record_id);
CREATE INDEX idx_sensitive_access_time ON sensitive_access_logs(created_at DESC);
CREATE INDEX idx_sensitive_access_org ON sensitive_access_logs(organization_id, created_at DESC);

-- =============================================================================
-- PART 6: EXTEND EXISTING TABLES
-- =============================================================================

-- Add columns to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'en-US';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS date_format TEXT DEFAULT 'MM/DD/YYYY';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_dashboard_config_id UUID;

-- Add columns to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS geofence_radius_meters INTEGER DEFAULT 500;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS default_geofence_id UUID;

-- Add foreign key after geofences table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'projects_default_geofence_id_fkey'
    ) THEN
        ALTER TABLE projects
        ADD CONSTRAINT projects_default_geofence_id_fkey
        FOREIGN KEY (default_geofence_id) REFERENCES geofences(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add columns to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS fiscal_year_start_month INTEGER DEFAULT 1;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'PROFESSIONAL';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_expires DATE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_timezone TEXT DEFAULT 'America/New_York';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS kpi_snapshot_enabled BOOLEAN DEFAULT TRUE;

-- =============================================================================
-- PART 7: HELPER FUNCTIONS
-- =============================================================================

-- Calculate Alert Priority Score
CREATE OR REPLACE FUNCTION calculate_alert_priority_score(p_alert_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_alert RECORD;
    v_score INTEGER := 0;
BEGIN
    SELECT * INTO v_alert FROM platform_alerts WHERE id = p_alert_id;

    IF NOT FOUND THEN RETURN 0; END IF;

    -- Base score by severity
    v_score := CASE v_alert.severity
        WHEN 'CRITICAL' THEN 100
        WHEN 'HIGH' THEN 75
        WHEN 'MEDIUM' THEN 50
        WHEN 'LOW' THEN 25
        WHEN 'INFO' THEN 10
    END;

    -- Category multiplier
    v_score := ROUND(v_score * CASE v_alert.category
        WHEN 'SAFETY' THEN 1.5
        WHEN 'COMPLIANCE' THEN 1.3
        WHEN 'MAINTENANCE' THEN 1.0
        WHEN 'OPERATIONAL' THEN 0.8
        WHEN 'FINANCIAL' THEN 0.9
        WHEN 'ADMINISTRATIVE' THEN 0.7
    END);

    -- Due date urgency
    IF v_alert.due_date IS NOT NULL THEN
        IF v_alert.due_date < CURRENT_DATE THEN
            v_score := v_score * 2;  -- Overdue doubles score
        ELSIF v_alert.due_date <= CURRENT_DATE + 1 THEN
            v_score := ROUND(v_score * 1.5);
        ELSIF v_alert.due_date <= CURRENT_DATE + 7 THEN
            v_score := ROUND(v_score * 1.2);
        END IF;
    END IF;

    -- Snooze penalty (lower priority if snoozed multiple times)
    IF v_alert.snooze_count > 0 THEN
        v_score := ROUND(v_score * (1 - (v_alert.snooze_count * 0.1)));
    END IF;

    -- Ensure minimum score of 1
    IF v_score < 1 THEN v_score := 1; END IF;

    RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Update priority score trigger
CREATE OR REPLACE FUNCTION update_alert_priority_score()
RETURNS TRIGGER AS $$
BEGIN
    NEW.priority_score := calculate_alert_priority_score(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Trigger will be created after table exists
DROP TRIGGER IF EXISTS platform_alerts_priority_trigger ON platform_alerts;
CREATE TRIGGER platform_alerts_priority_trigger
    BEFORE INSERT OR UPDATE ON platform_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_alert_priority_score();

-- Generate Daily KPI Snapshot
CREATE OR REPLACE FUNCTION generate_daily_kpi_snapshot(p_org_id UUID)
RETURNS UUID AS $$
DECLARE
    v_snapshot_id UUID;
    v_equip RECORD;
    v_vehicles RECORD;
    v_crew RECORD;
    v_projects RECORD;
    v_alerts RECORD;
    v_safety RECORD;
BEGIN
    -- Equipment metrics (if equipment table exists)
    BEGIN
        SELECT
            COUNT(*) FILTER (WHERE status NOT IN ('SOLD_DISPOSED', 'sold_disposed')) AS total,
            COUNT(*) FILTER (WHERE status IN ('ACTIVE', 'active', 'AVAILABLE', 'available')) AS active,
            COUNT(*) FILTER (WHERE next_service_due_date < CURRENT_DATE) AS maint_overdue,
            COUNT(*) FILTER (WHERE next_service_due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7) AS maint_due_7d,
            ROUND(AVG(EXTRACT(YEAR FROM CURRENT_DATE) - year), 1) AS avg_age
        INTO v_equip
        FROM equipment
        WHERE organization_id = p_org_id AND deleted_at IS NULL;
    EXCEPTION WHEN undefined_table THEN
        v_equip := ROW(0, 0, 0, 0, 0);
    END;

    -- Crew metrics (from employees table)
    BEGIN
        SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE employment_status = 'active') AS active,
            COUNT(*) FILTER (WHERE compliance_status = 'compliant') AS compliant,
            COUNT(*) FILTER (WHERE compliance_status = 'expired') AS expired
        INTO v_crew
        FROM employees
        WHERE organization_id = p_org_id AND deleted_at IS NULL;
    EXCEPTION WHEN undefined_table THEN
        v_crew := ROW(0, 0, 0, 0);
    END;

    -- Project metrics
    BEGIN
        SELECT
            COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active,
            COUNT(*) FILTER (WHERE percent_complete <
                (EXTRACT(EPOCH FROM (CURRENT_DATE - notice_to_proceed_date)) /
                 NULLIF(EXTRACT(EPOCH FROM (current_completion_date - notice_to_proceed_date)), 0) * 100)) AS behind
        INTO v_projects
        FROM projects
        WHERE organization_id = p_org_id;
    EXCEPTION WHEN undefined_table THEN
        v_projects := ROW(0, 0);
    END;

    -- Platform Alert metrics
    SELECT
        COUNT(*) FILTER (WHERE severity = 'CRITICAL' AND status = 'ACTIVE') AS critical,
        COUNT(*) FILTER (WHERE severity = 'HIGH' AND status = 'ACTIVE') AS high,
        COUNT(*) FILTER (WHERE severity = 'MEDIUM' AND status = 'ACTIVE') AS medium,
        COUNT(*) FILTER (WHERE resolved_at::DATE = CURRENT_DATE) AS resolved_today
    INTO v_alerts
    FROM platform_alerts
    WHERE organization_id = p_org_id;

    -- Safety metrics (from safety_metrics if exists)
    BEGIN
        SELECT
            COALESCE(SUM(recordable_injuries), 0) AS incidents,
            COALESCE(SUM(near_misses_reported), 0) AS near_misses
        INTO v_safety
        FROM safety_metrics
        WHERE organization_id = p_org_id
          AND metric_year = EXTRACT(YEAR FROM CURRENT_DATE)
          AND metric_month = EXTRACT(MONTH FROM CURRENT_DATE);
    EXCEPTION WHEN undefined_table THEN
        v_safety := ROW(0, 0);
    END;

    -- Insert or update snapshot
    INSERT INTO kpi_snapshots (
        organization_id, snapshot_date, period_type,
        equipment_total, equipment_active, equipment_maintenance_overdue,
        equipment_maintenance_due_7d, equipment_avg_age_years,
        crew_total, crew_active, crew_certs_expired,
        projects_active, projects_behind_schedule,
        alerts_critical_open, alerts_high_open, alerts_medium_open, alerts_resolved_today,
        safety_incidents_mtd, safety_near_misses_mtd
    ) VALUES (
        p_org_id, CURRENT_DATE, 'DAILY',
        COALESCE(v_equip.total, 0), COALESCE(v_equip.active, 0),
        COALESCE(v_equip.maint_overdue, 0), COALESCE(v_equip.maint_due_7d, 0),
        v_equip.avg_age,
        COALESCE(v_crew.total, 0), COALESCE(v_crew.active, 0), COALESCE(v_crew.expired, 0),
        COALESCE(v_projects.active, 0), COALESCE(v_projects.behind, 0),
        COALESCE(v_alerts.critical, 0), COALESCE(v_alerts.high, 0),
        COALESCE(v_alerts.medium, 0), COALESCE(v_alerts.resolved_today, 0),
        COALESCE(v_safety.incidents, 0), COALESCE(v_safety.near_misses, 0)
    )
    ON CONFLICT (organization_id, snapshot_date, period_type)
    DO UPDATE SET
        equipment_total = EXCLUDED.equipment_total,
        equipment_active = EXCLUDED.equipment_active,
        equipment_maintenance_overdue = EXCLUDED.equipment_maintenance_overdue,
        equipment_maintenance_due_7d = EXCLUDED.equipment_maintenance_due_7d,
        equipment_avg_age_years = EXCLUDED.equipment_avg_age_years,
        crew_total = EXCLUDED.crew_total,
        crew_active = EXCLUDED.crew_active,
        crew_certs_expired = EXCLUDED.crew_certs_expired,
        projects_active = EXCLUDED.projects_active,
        projects_behind_schedule = EXCLUDED.projects_behind_schedule,
        alerts_critical_open = EXCLUDED.alerts_critical_open,
        alerts_high_open = EXCLUDED.alerts_high_open,
        alerts_medium_open = EXCLUDED.alerts_medium_open,
        alerts_resolved_today = EXCLUDED.alerts_resolved_today,
        safety_incidents_mtd = EXCLUDED.safety_incidents_mtd,
        safety_near_misses_mtd = EXCLUDED.safety_near_misses_mtd
    RETURNING id INTO v_snapshot_id;

    RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql;

-- Check if user should receive alert based on preferences
CREATE OR REPLACE FUNCTION should_user_receive_platform_alert(
    p_user_id UUID,
    p_alert_id UUID,
    p_delivery_method platform_alert_delivery
)
RETURNS BOOLEAN AS $$
DECLARE
    v_alert RECORD;
    v_prefs RECORD;
    v_should_receive BOOLEAN := FALSE;
    v_current_time TIME := CURRENT_TIME;
BEGIN
    -- Get alert details
    SELECT * INTO v_alert FROM platform_alerts WHERE id = p_alert_id;
    IF NOT FOUND THEN RETURN FALSE; END IF;

    -- Get user preferences (or defaults)
    SELECT * INTO v_prefs
    FROM platform_user_alert_preferences
    WHERE user_id = p_user_id;

    -- If no preferences, use defaults (receive critical/high in-app and email)
    IF NOT FOUND THEN
        RETURN (v_alert.severity IN ('CRITICAL', 'HIGH') AND p_delivery_method IN ('IN_APP', 'EMAIL'));
    END IF;

    -- Check vacation mode
    IF v_prefs.vacation_mode AND CURRENT_DATE BETWEEN v_prefs.vacation_start AND v_prefs.vacation_end THEN
        RETURN FALSE;
    END IF;

    -- Check quiet hours (except for critical if allowed)
    IF v_prefs.quiet_hours_enabled THEN
        IF v_prefs.quiet_hours_start < v_prefs.quiet_hours_end THEN
            -- Same day quiet hours (e.g., 22:00 to 23:00)
            IF v_current_time BETWEEN v_prefs.quiet_hours_start AND v_prefs.quiet_hours_end THEN
                IF v_alert.severity != 'CRITICAL' OR NOT v_prefs.quiet_hours_allow_critical THEN
                    RETURN FALSE;
                END IF;
            END IF;
        ELSE
            -- Overnight quiet hours (e.g., 22:00 to 06:00)
            IF v_current_time >= v_prefs.quiet_hours_start OR v_current_time <= v_prefs.quiet_hours_end THEN
                IF v_alert.severity != 'CRITICAL' OR NOT v_prefs.quiet_hours_allow_critical THEN
                    RETURN FALSE;
                END IF;
            END IF;
        END IF;
    END IF;

    -- Check category subscription
    IF v_prefs.categories_subscribed IS NOT NULL AND array_length(v_prefs.categories_subscribed, 1) > 0 THEN
        IF NOT (v_alert.category = ANY(v_prefs.categories_subscribed)) THEN
            RETURN FALSE;
        END IF;
    END IF;

    -- Check severity + delivery method preference
    v_should_receive := CASE v_alert.severity
        WHEN 'CRITICAL' THEN
            CASE p_delivery_method
                WHEN 'IN_APP' THEN v_prefs.critical_in_app
                WHEN 'EMAIL' THEN v_prefs.critical_email
                WHEN 'SMS' THEN v_prefs.critical_sms
                WHEN 'PUSH' THEN v_prefs.critical_push
            END
        WHEN 'HIGH' THEN
            CASE p_delivery_method
                WHEN 'IN_APP' THEN v_prefs.high_in_app
                WHEN 'EMAIL' THEN v_prefs.high_email
                WHEN 'SMS' THEN v_prefs.high_sms
                WHEN 'PUSH' THEN v_prefs.high_push
            END
        WHEN 'MEDIUM' THEN
            CASE p_delivery_method
                WHEN 'IN_APP' THEN v_prefs.medium_in_app
                WHEN 'EMAIL' THEN v_prefs.medium_email
                WHEN 'SMS' THEN v_prefs.medium_sms
                WHEN 'PUSH' THEN v_prefs.medium_push
            END
        WHEN 'LOW' THEN
            CASE p_delivery_method
                WHEN 'IN_APP' THEN v_prefs.low_in_app
                WHEN 'EMAIL' THEN v_prefs.low_email
                WHEN 'SMS' THEN v_prefs.low_sms
                WHEN 'PUSH' THEN v_prefs.low_push
            END
        WHEN 'INFO' THEN
            CASE p_delivery_method
                WHEN 'IN_APP' THEN v_prefs.info_in_app
                WHEN 'EMAIL' THEN v_prefs.info_email
                WHEN 'SMS' THEN v_prefs.info_sms
                WHEN 'PUSH' THEN v_prefs.info_push
            END
        ELSE FALSE
    END;

    RETURN COALESCE(v_should_receive, FALSE);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PART 8: VIEWS
-- =============================================================================

-- Platform Alert Dashboard View
CREATE OR REPLACE VIEW v_platform_alert_dashboard AS
SELECT
    pa.*,
    up.email AS assigned_to_email,
    up.first_name || ' ' || up.last_name AS assigned_to_name,
    p.project_number,
    p.name AS project_name,
    CASE
        WHEN pa.due_date < CURRENT_DATE THEN 'OVERDUE'
        WHEN pa.due_date = CURRENT_DATE THEN 'DUE_TODAY'
        WHEN pa.due_date <= CURRENT_DATE + 7 THEN 'DUE_THIS_WEEK'
        WHEN pa.due_date <= CURRENT_DATE + 30 THEN 'DUE_THIS_MONTH'
        ELSE 'UPCOMING'
    END AS urgency,
    (pa.due_date - CURRENT_DATE) AS days_until_due,
    (SELECT COUNT(*) FROM platform_alert_notifications pan
     WHERE pan.alert_id = pa.id AND pan.read_at IS NOT NULL) AS notification_read_count,
    (SELECT COUNT(*) FROM platform_alert_notifications pan
     WHERE pan.alert_id = pa.id) AS notification_total_count
FROM platform_alerts pa
LEFT JOIN user_profiles up ON pa.assigned_to = up.id
LEFT JOIN projects p ON pa.project_id = p.id
WHERE pa.status IN ('ACTIVE', 'ACKNOWLEDGED', 'SNOOZED')
ORDER BY pa.priority_score DESC, pa.due_date ASC NULLS LAST;

-- User Alert Inbox View
CREATE OR REPLACE VIEW v_user_alert_inbox AS
SELECT
    pa.id AS alert_id,
    pa.organization_id,
    pa.alert_type,
    pa.severity,
    pa.category,
    pa.title,
    pa.description,
    pa.action_required,
    pa.action_url,
    pa.due_date,
    pa.status,
    pa.priority_score,
    pa.entity_type,
    pa.entity_identifier,
    pan.user_id,
    pan.delivery_method,
    pan.sent_at,
    pan.delivered_at,
    pan.read_at,
    CASE
        WHEN pan.read_at IS NOT NULL THEN 'READ'
        WHEN pan.delivered_at IS NOT NULL THEN 'DELIVERED'
        WHEN pan.sent_at IS NOT NULL THEN 'SENT'
        ELSE 'PENDING'
    END AS notification_status
FROM platform_alerts pa
JOIN platform_alert_notifications pan ON pa.id = pan.alert_id
WHERE pa.status IN ('ACTIVE', 'ACKNOWLEDGED')
ORDER BY pa.priority_score DESC, pan.sent_at DESC;

-- KPI Trends View (last 30 days)
CREATE OR REPLACE VIEW v_kpi_trends AS
SELECT
    organization_id,
    snapshot_date,
    equipment_utilization_percent,
    crew_certs_compliant_percent,
    alerts_critical_open,
    alerts_high_open,
    safety_incidents_mtd,
    projects_active,
    projects_behind_schedule,
    LAG(equipment_utilization_percent) OVER (PARTITION BY organization_id ORDER BY snapshot_date) AS prev_equipment_util,
    LAG(crew_certs_compliant_percent) OVER (PARTITION BY organization_id ORDER BY snapshot_date) AS prev_crew_compliance,
    LAG(alerts_critical_open) OVER (PARTITION BY organization_id ORDER BY snapshot_date) AS prev_critical_alerts
FROM kpi_snapshots
WHERE period_type = 'DAILY'
  AND snapshot_date >= CURRENT_DATE - 30
ORDER BY organization_id, snapshot_date DESC;

-- Geofence Activity View
CREATE OR REPLACE VIEW v_geofence_activity AS
SELECT
    ge.id AS event_id,
    ge.organization_id,
    g.name AS geofence_name,
    g.geofence_type,
    g.project_id,
    p.project_number,
    p.name AS project_name,
    ge.entity_type,
    ge.entity_id,
    ge.entity_identifier,
    ge.event_type,
    ge.latitude,
    ge.longitude,
    ge.speed_mph,
    ge.event_at,
    ge.dwell_duration_minutes,
    ge.alert_sent,
    CASE
        WHEN ge.event_at >= NOW() - INTERVAL '1 hour' THEN 'RECENT'
        WHEN ge.event_at >= NOW() - INTERVAL '24 hours' THEN 'TODAY'
        WHEN ge.event_at >= NOW() - INTERVAL '7 days' THEN 'THIS_WEEK'
        ELSE 'OLDER'
    END AS recency
FROM geofence_events ge
JOIN geofences g ON ge.geofence_id = g.id
LEFT JOIN projects p ON g.project_id = p.id
ORDER BY ge.event_at DESC;

-- =============================================================================
-- PART 9: ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all new tables
ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_alert_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_user_alert_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensitive_access_logs ENABLE ROW LEVEL SECURITY;

-- Geofences policies
CREATE POLICY "geofences_org_isolation" ON geofences
    FOR ALL USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Geofence events policies
CREATE POLICY "geofence_events_org_isolation" ON geofence_events
    FOR ALL USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Platform alerts policies
CREATE POLICY "platform_alerts_org_isolation" ON platform_alerts
    FOR ALL USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Alert notifications policies (users see their own notifications)
CREATE POLICY "alert_notifications_own" ON platform_alert_notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "alert_notifications_org_insert" ON platform_alert_notifications
    FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

-- User alert preferences (users manage their own)
CREATE POLICY "user_alert_prefs_own" ON platform_user_alert_preferences
    FOR ALL USING (user_id = auth.uid());

-- KPI snapshots policies
CREATE POLICY "kpi_snapshots_org_isolation" ON kpi_snapshots
    FOR ALL USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Dashboard configs (users manage their own)
CREATE POLICY "dashboard_configs_own" ON dashboard_configs
    FOR ALL USING (user_id = auth.uid());

-- Sensitive access logs (admin only for viewing, insert for tracking)
CREATE POLICY "sensitive_access_logs_admin_view" ON sensitive_access_logs
    FOR SELECT USING (
        organization_id = public.get_user_organization_id(auth.uid())
        AND EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.level <= 10
        )
    );

CREATE POLICY "sensitive_access_logs_insert" ON sensitive_access_logs
    FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

-- =============================================================================
-- PART 10: TRIGGERS
-- =============================================================================

-- Updated_at trigger for all new tables
CREATE TRIGGER geofences_updated_at
    BEFORE UPDATE ON geofences
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER platform_alerts_updated_at
    BEFORE UPDATE ON platform_alerts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER platform_user_alert_preferences_updated_at
    BEFORE UPDATE ON platform_user_alert_preferences
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER dashboard_configs_updated_at
    BEFORE UPDATE ON dashboard_configs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Audit triggers for key tables
CREATE TRIGGER geofences_audit
    AFTER INSERT OR UPDATE OR DELETE ON geofences
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER platform_alerts_audit
    AFTER INSERT OR UPDATE OR DELETE ON platform_alerts
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- =============================================================================
-- COMPLETE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 086: Platform Core Foundation completed successfully';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '  - 10 new enum types';
  RAISE NOTICE '  - 8 new tables (geofences, geofence_events, platform_alerts, etc.)';
  RAISE NOTICE '  - Extended user_profiles, projects, organizations with new columns';
  RAISE NOTICE '  - 3 helper functions';
  RAISE NOTICE '  - 4 views';
  RAISE NOTICE '  - RLS policies on all new tables';
  RAISE NOTICE '  - Audit triggers on key tables';
END $$;
