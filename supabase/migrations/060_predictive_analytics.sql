-- =============================================================================
-- Migration 060: Predictive Analytics
-- Per CLAUDE.md Roadmap Phase 3: Migration 015
-- Predictive models for schedule, cost, and safety
-- =============================================================================

-- =============================================================================
-- Prediction Types
-- =============================================================================
DO $$ BEGIN
    CREATE TYPE public.prediction_type AS ENUM (
        'SCHEDULE_COMPLETION',
        'COST_AT_COMPLETION',
        'SAFETY_INCIDENT',
        'EQUIPMENT_FAILURE',
        'WEATHER_DELAY',
        'SUBCONTRACTOR_RISK',
        'CASH_FLOW',
        'RESOURCE_SHORTAGE'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.alert_severity AS ENUM (
        'INFO',
        'WARNING',
        'CRITICAL',
        'EMERGENCY'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- Project Predictions (AI-generated forecasts)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.project_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Prediction Details
    prediction_type prediction_type NOT NULL,
    prediction_date DATE NOT NULL,
    target_date DATE, -- What date is being predicted for

    -- The Prediction
    predicted_value DECIMAL(15, 2),
    predicted_date DATE,
    confidence_level DECIMAL(5, 4), -- 0.0 to 1.0
    prediction_range_low DECIMAL(15, 2),
    prediction_range_high DECIMAL(15, 2),

    -- Context
    input_factors JSONB, -- What data points were considered
    model_version TEXT,
    explanation TEXT, -- Natural language explanation

    -- Actual (filled in later for model training)
    actual_value DECIMAL(15, 2),
    actual_date DATE,
    prediction_accuracy DECIMAL(5, 4),

    -- Status
    is_current BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Risk Indicators (Leading indicators for problems)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.risk_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id),

    -- Indicator Details
    indicator_type TEXT NOT NULL, -- 'SCHEDULE', 'COST', 'SAFETY', 'QUALITY', 'RESOURCE'
    indicator_name TEXT NOT NULL,
    description TEXT,

    -- Current Value
    current_value DECIMAL(15, 4) NOT NULL,
    previous_value DECIMAL(15, 4),
    change_percentage DECIMAL(8, 4),

    -- Thresholds
    warning_threshold DECIMAL(15, 4),
    critical_threshold DECIMAL(15, 4),
    target_value DECIMAL(15, 4),

    -- Trend
    trend_direction TEXT, -- 'UP', 'DOWN', 'STABLE'
    trend_days INTEGER DEFAULT 7,

    -- Risk Assessment
    risk_score DECIMAL(5, 2), -- 0-100
    severity alert_severity,

    -- Timestamp
    measured_at TIMESTAMPTZ DEFAULT NOW(),
    next_update_at TIMESTAMPTZ,

    -- Active
    is_active BOOLEAN DEFAULT TRUE
);

-- =============================================================================
-- Predictive Alerts
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.predictive_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id),

    -- Alert Details
    alert_type TEXT NOT NULL, -- Maps to prediction_type or indicator_type
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity alert_severity NOT NULL,

    -- Source
    prediction_id UUID REFERENCES public.project_predictions(id),
    risk_indicator_id UUID REFERENCES public.risk_indicators(id),

    -- Recommended Actions
    recommended_actions JSONB DEFAULT '[]',

    -- Status
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED'
    acknowledged_by UUID REFERENCES public.user_profiles(id),
    acknowledged_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.user_profiles(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,

    -- Notifications
    notified_users UUID[],
    notification_sent_at TIMESTAMPTZ,

    -- Validity
    expires_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Equipment Health Predictions
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.equipment_health_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,

    -- Prediction
    prediction_date DATE NOT NULL,
    predicted_failure_date DATE,
    failure_probability DECIMAL(5, 4), -- 0.0 to 1.0
    remaining_useful_life_hours INTEGER,

    -- Component Level
    component_predictions JSONB DEFAULT '[]', -- [{component, health_score, risk_factors}]

    -- Maintenance Recommendation
    recommended_maintenance TEXT,
    recommended_date DATE,
    estimated_downtime_hours INTEGER,
    estimated_cost DECIMAL(10, 2),

    -- Factors
    input_metrics JSONB, -- Engine hours, fuel consumption, error codes, etc.
    model_version TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Weather Impact Predictions
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.weather_impact_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Forecast Period
    forecast_date DATE NOT NULL,
    forecast_for_date DATE NOT NULL,

    -- Weather Data
    weather_forecast JSONB NOT NULL,

    -- Impact Prediction
    work_impact_score DECIMAL(5, 2), -- 0 = no impact, 100 = no work possible
    predicted_working_day BOOLEAN,
    impacted_activities TEXT[],

    -- Recommendations
    schedule_adjustments JSONB DEFAULT '[]',
    resource_recommendations TEXT,

    -- Confidence
    confidence_level DECIMAL(5, 4),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Cash Flow Projections
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.cash_flow_projections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id),

    -- Projection Period
    projection_date DATE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type TEXT NOT NULL, -- 'WEEKLY', 'MONTHLY', 'QUARTERLY'

    -- Inflows
    projected_billings DECIMAL(15, 2) DEFAULT 0,
    projected_collections DECIMAL(15, 2) DEFAULT 0,

    -- Outflows
    projected_labor DECIMAL(15, 2) DEFAULT 0,
    projected_materials DECIMAL(15, 2) DEFAULT 0,
    projected_equipment DECIMAL(15, 2) DEFAULT 0,
    projected_subcontracts DECIMAL(15, 2) DEFAULT 0,
    projected_overhead DECIMAL(15, 2) DEFAULT 0,
    total_projected_outflows DECIMAL(15, 2) DEFAULT 0,

    -- Net
    projected_net_cash_flow DECIMAL(15, 2) DEFAULT 0,
    projected_ending_balance DECIMAL(15, 2),

    -- Actuals (filled in later)
    actual_collections DECIMAL(15, 2),
    actual_outflows DECIMAL(15, 2),
    actual_net DECIMAL(15, 2),

    -- Variance
    variance_amount DECIMAL(15, 2),
    variance_percentage DECIMAL(8, 4),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Historical Metrics (For training models)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.project_metrics_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Snapshot Date
    metric_date DATE NOT NULL,

    -- Schedule Metrics
    planned_percent_complete DECIMAL(5, 2),
    actual_percent_complete DECIMAL(5, 2),
    schedule_variance_days INTEGER,
    spi DECIMAL(6, 4), -- Schedule Performance Index

    -- Cost Metrics
    planned_cost DECIMAL(15, 2),
    actual_cost DECIMAL(15, 2),
    earned_value DECIMAL(15, 2),
    cost_variance DECIMAL(15, 2),
    cpi DECIMAL(6, 4), -- Cost Performance Index
    eac DECIMAL(15, 2), -- Estimate at Completion

    -- Productivity Metrics
    labor_hours DECIMAL(10, 2),
    productivity_factor DECIMAL(6, 4),

    -- Quality Metrics
    open_ncrs INTEGER DEFAULT 0,
    failed_tests INTEGER DEFAULT 0,
    rework_hours DECIMAL(10, 2) DEFAULT 0,

    -- Safety Metrics
    near_misses INTEGER DEFAULT 0,
    recordable_incidents INTEGER DEFAULT 0,
    first_aid_cases INTEGER DEFAULT 0,
    trir DECIMAL(6, 4), -- Total Recordable Incident Rate

    -- Weather
    weather_delay_days INTEGER DEFAULT 0,

    -- Change Orders
    pending_co_value DECIMAL(15, 2) DEFAULT 0,
    approved_co_value DECIMAL(15, 2) DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_project_metric_date UNIQUE (project_id, metric_date)
);

-- =============================================================================
-- Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_project_predictions_project ON public.project_predictions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_predictions_type ON public.project_predictions(prediction_type);
CREATE INDEX IF NOT EXISTS idx_project_predictions_current ON public.project_predictions(is_current) WHERE is_current = TRUE;
CREATE INDEX IF NOT EXISTS idx_risk_indicators_project ON public.risk_indicators(project_id);
CREATE INDEX IF NOT EXISTS idx_risk_indicators_severity ON public.risk_indicators(severity);
CREATE INDEX IF NOT EXISTS idx_predictive_alerts_status ON public.predictive_alerts(status);
CREATE INDEX IF NOT EXISTS idx_predictive_alerts_severity ON public.predictive_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_equipment_health_equipment ON public.equipment_health_predictions(equipment_id);
CREATE INDEX IF NOT EXISTS idx_project_metrics_history_project ON public.project_metrics_history(project_id);
CREATE INDEX IF NOT EXISTS idx_project_metrics_history_date ON public.project_metrics_history(metric_date);

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE public.project_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictive_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_health_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_impact_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_flow_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_metrics_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "project_predictions_org_access" ON public.project_predictions
    FOR ALL USING (organization_id = public.get_user_organization_id());

CREATE POLICY "risk_indicators_org_access" ON public.risk_indicators
    FOR ALL USING (organization_id = public.get_user_organization_id());

CREATE POLICY "predictive_alerts_org_access" ON public.predictive_alerts
    FOR ALL USING (organization_id = public.get_user_organization_id());

CREATE POLICY "equipment_health_predictions_org_access" ON public.equipment_health_predictions
    FOR ALL USING (organization_id = public.get_user_organization_id());

CREATE POLICY "weather_impact_predictions_org_access" ON public.weather_impact_predictions
    FOR ALL USING (organization_id = public.get_user_organization_id());

CREATE POLICY "cash_flow_projections_org_access" ON public.cash_flow_projections
    FOR ALL USING (organization_id = public.get_user_organization_id());

CREATE POLICY "project_metrics_history_access" ON public.project_metrics_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_id
            AND p.organization_id = public.get_user_organization_id()
        )
    );

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Calculate project health score
CREATE OR REPLACE FUNCTION public.calculate_project_health_score(p_project_id UUID)
RETURNS DECIMAL(5, 2)
LANGUAGE plpgsql
AS $$
DECLARE
    v_schedule_score DECIMAL(5, 2);
    v_cost_score DECIMAL(5, 2);
    v_safety_score DECIMAL(5, 2);
    v_quality_score DECIMAL(5, 2);
    v_total_score DECIMAL(5, 2);
BEGIN
    -- Get latest metrics
    SELECT
        -- Schedule: SPI based score
        CASE
            WHEN spi >= 1.0 THEN 100
            WHEN spi >= 0.9 THEN 80
            WHEN spi >= 0.8 THEN 60
            WHEN spi >= 0.7 THEN 40
            ELSE 20
        END,
        -- Cost: CPI based score
        CASE
            WHEN cpi >= 1.0 THEN 100
            WHEN cpi >= 0.95 THEN 80
            WHEN cpi >= 0.9 THEN 60
            WHEN cpi >= 0.85 THEN 40
            ELSE 20
        END,
        -- Safety: Based on incidents
        CASE
            WHEN recordable_incidents = 0 AND near_misses <= 1 THEN 100
            WHEN recordable_incidents = 0 AND near_misses <= 3 THEN 80
            WHEN recordable_incidents <= 1 THEN 60
            ELSE 40
        END,
        -- Quality: Based on NCRs
        CASE
            WHEN open_ncrs = 0 THEN 100
            WHEN open_ncrs <= 2 THEN 80
            WHEN open_ncrs <= 5 THEN 60
            ELSE 40
        END
    INTO v_schedule_score, v_cost_score, v_safety_score, v_quality_score
    FROM public.project_metrics_history
    WHERE project_id = p_project_id
    ORDER BY metric_date DESC
    LIMIT 1;

    -- Weighted average (Schedule 30%, Cost 30%, Safety 25%, Quality 15%)
    v_total_score := COALESCE(
        (v_schedule_score * 0.30) +
        (v_cost_score * 0.30) +
        (v_safety_score * 0.25) +
        (v_quality_score * 0.15),
        50 -- Default if no data
    );

    RETURN v_total_score;
END;
$$;

-- Create predictive alert
CREATE OR REPLACE FUNCTION public.create_predictive_alert(
    p_org_id UUID,
    p_project_id UUID,
    p_alert_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_severity alert_severity,
    p_prediction_id UUID DEFAULT NULL,
    p_indicator_id UUID DEFAULT NULL,
    p_actions JSONB DEFAULT '[]'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_alert_id UUID;
BEGIN
    INSERT INTO public.predictive_alerts (
        organization_id, project_id, alert_type,
        title, message, severity,
        prediction_id, risk_indicator_id, recommended_actions
    ) VALUES (
        p_org_id, p_project_id, p_alert_type,
        p_title, p_message, p_severity,
        p_prediction_id, p_indicator_id, p_actions
    )
    RETURNING id INTO v_alert_id;

    RETURN v_alert_id;
END;
$$;

-- =============================================================================
-- Views
-- =============================================================================

-- Project Health Dashboard
CREATE OR REPLACE VIEW public.v_project_health_dashboard AS
SELECT
    p.id AS project_id,
    p.project_number,
    p.name AS project_name,
    p.status,
    public.calculate_project_health_score(p.id) AS health_score,
    m.spi,
    m.cpi,
    m.actual_percent_complete,
    m.open_ncrs,
    m.recordable_incidents,
    (SELECT COUNT(*) FROM public.predictive_alerts pa
     WHERE pa.project_id = p.id AND pa.status = 'ACTIVE') AS active_alerts,
    (SELECT COUNT(*) FROM public.predictive_alerts pa
     WHERE pa.project_id = p.id AND pa.status = 'ACTIVE' AND pa.severity = 'CRITICAL') AS critical_alerts
FROM public.projects p
LEFT JOIN LATERAL (
    SELECT * FROM public.project_metrics_history
    WHERE project_id = p.id
    ORDER BY metric_date DESC
    LIMIT 1
) m ON TRUE
WHERE p.status = 'ACTIVE';

-- Active Predictive Alerts
CREATE OR REPLACE VIEW public.v_active_predictive_alerts AS
SELECT
    pa.id,
    pa.alert_type,
    pa.title,
    pa.message,
    pa.severity,
    pa.status,
    pa.created_at,
    p.project_number,
    p.name AS project_name,
    EXTRACT(EPOCH FROM (NOW() - pa.created_at)) / 3600 AS hours_since_created
FROM public.predictive_alerts pa
LEFT JOIN public.projects p ON pa.project_id = p.id
WHERE pa.status = 'ACTIVE'
ORDER BY
    CASE pa.severity
        WHEN 'EMERGENCY' THEN 1
        WHEN 'CRITICAL' THEN 2
        WHEN 'WARNING' THEN 3
        ELSE 4
    END,
    pa.created_at DESC;

-- Equipment Health Overview
CREATE OR REPLACE VIEW public.v_equipment_health_overview AS
SELECT
    e.id AS equipment_id,
    e.name AS equipment_name,
    e.equipment_type,
    p.name AS project_name,
    ehp.failure_probability,
    ehp.remaining_useful_life_hours,
    ehp.recommended_maintenance,
    ehp.recommended_date,
    CASE
        WHEN ehp.failure_probability >= 0.8 THEN 'CRITICAL'
        WHEN ehp.failure_probability >= 0.5 THEN 'WARNING'
        WHEN ehp.failure_probability >= 0.3 THEN 'WATCH'
        ELSE 'HEALTHY'
    END AS health_status
FROM public.equipment e
LEFT JOIN LATERAL (
    SELECT * FROM public.equipment_health_predictions
    WHERE equipment_id = e.id
    ORDER BY prediction_date DESC
    LIMIT 1
) ehp ON TRUE
LEFT JOIN public.projects p ON e.current_project_id = p.id
WHERE e.status = 'ACTIVE';

-- =============================================================================
-- Triggers
-- =============================================================================

-- Archive old predictions when new one is created
CREATE OR REPLACE FUNCTION public.archive_old_predictions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.project_predictions
    SET is_current = FALSE
    WHERE project_id = NEW.project_id
    AND prediction_type = NEW.prediction_type
    AND id != NEW.id
    AND is_current = TRUE;

    RETURN NEW;
END;
$$;

CREATE TRIGGER project_predictions_archive_old
    AFTER INSERT ON public.project_predictions
    FOR EACH ROW EXECUTE FUNCTION public.archive_old_predictions();

COMMENT ON TABLE public.project_predictions IS 'AI-generated predictions for project outcomes';
COMMENT ON TABLE public.risk_indicators IS 'Leading indicators for potential problems';
COMMENT ON TABLE public.predictive_alerts IS 'Alerts generated from predictions and risk indicators';
COMMENT ON TABLE public.equipment_health_predictions IS 'Predictive maintenance for equipment';
COMMENT ON TABLE public.cash_flow_projections IS 'Cash flow forecasts';
COMMENT ON TABLE public.project_metrics_history IS 'Historical metrics for model training';
