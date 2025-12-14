-- =============================================================================
-- Migration 112: Compliance Violations & Notifications
-- Purpose: Track compliance violations and enable notification triggers
-- Date: December 13, 2024
-- =============================================================================

-- ============================================================================
-- PART 1: COMPLIANCE VIOLATION ENUMS (drop and recreate to ensure correct values)
-- ============================================================================

-- Drop existing types if they exist (CASCADE to handle dependencies)
DROP TYPE IF EXISTS public.violation_severity CASCADE;
DROP TYPE IF EXISTS public.violation_type CASCADE;
DROP TYPE IF EXISTS public.violation_status CASCADE;

CREATE TYPE public.violation_severity AS ENUM (
    'info',        -- Informational, no action required
    'warning',     -- Should be addressed soon
    'critical',    -- Must be addressed immediately
    'blocking'     -- Blocks work until resolved
);

CREATE TYPE public.violation_type AS ENUM (
    'wage_rate_below_minimum',      -- Applied rate < prevailing wage
    'wage_rate_expired',            -- Wage determination has expired
    'wage_rate_missing',            -- No wage rate configured for classification
    'certification_expired',        -- Worker certification expired
    'certification_missing',        -- Required certification not on file
    'insurance_expired',            -- Subcontractor insurance expired
    'insurance_insufficient',       -- Insurance coverage below minimums
    'payment_deadline_warning',     -- 7 days until deadline
    'payment_deadline_urgent',      -- 3 days until deadline
    'payment_deadline_violation',   -- Deadline exceeded
    'operator_unqualified',         -- Operator lacks equipment certification
    'site_orientation_missing',     -- No valid site orientation
    'safety_training_expired',      -- Required safety training expired
    'dbe_goal_at_risk',             -- DBE utilization below target
    'overtime_threshold_exceeded',  -- Excessive overtime (fatigue risk)
    'other'                         -- Catch-all for other violations
);

CREATE TYPE public.violation_status AS ENUM (
    'open',            -- Violation detected, not yet addressed
    'acknowledged',    -- User has acknowledged the violation
    'in_progress',     -- Corrective action underway
    'resolved',        -- Issue has been fixed
    'waived',          -- Violation waived with approval
    'escalated'        -- Escalated to higher authority
);

-- ============================================================================
-- PART 2: COMPLIANCE VIOLATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.compliance_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Violation classification
    violation_type public.violation_type NOT NULL,
    severity public.violation_severity NOT NULL DEFAULT 'warning',
    status public.violation_status NOT NULL DEFAULT 'open',

    -- Context: What entity is affected?
    project_id UUID REFERENCES public.projects(id),
    employee_id UUID REFERENCES public.employees(id),
    task_log_id UUID REFERENCES public.task_logs(id),
    pay_period_id UUID REFERENCES public.pay_periods(id),
    subcontractor_id UUID REFERENCES public.subcontractors(id),
    equipment_id UUID REFERENCES public.equipment(id),
    crew_assignment_id UUID REFERENCES public.crew_assignments(id),

    -- Details
    violation_code TEXT NOT NULL,                  -- Machine-readable code (e.g., 'WAGE_001')
    title TEXT NOT NULL,                           -- Short description
    description TEXT NOT NULL,                     -- Full explanation

    -- Financial impact (if applicable)
    expected_value NUMERIC(12, 2),                 -- What rate/value should be
    actual_value NUMERIC(12, 2),                   -- What rate/value actually is
    variance_amount NUMERIC(12, 2),                -- Difference
    variance_percentage NUMERIC(5, 2),             -- Percentage difference

    -- Affected entity details (for reporting)
    affected_entity_type TEXT,                     -- 'employee', 'subcontractor', 'equipment', etc.
    affected_entity_name TEXT,                     -- Name for display
    affected_date DATE,                            -- Date of the violation

    -- Metadata
    detection_method TEXT DEFAULT 'system',        -- 'system', 'manual', 'audit'
    rule_id TEXT,                                  -- Reference to validation rule

    -- Resolution tracking
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    resolution_notes TEXT,

    -- Waiver (if applicable)
    waived_at TIMESTAMPTZ,
    waived_by UUID REFERENCES auth.users(id),
    waiver_reason TEXT,
    waiver_approved_by UUID REFERENCES auth.users(id),

    -- Notification tracking
    notification_sent_at TIMESTAMPTZ,
    notification_recipients TEXT[],               -- Array of user IDs or emails
    escalation_level INTEGER DEFAULT 0,           -- 0=none, 1=PM, 2=Controller, 3=VP, 4=Exec

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_violations_org ON public.compliance_violations(organization_id);
CREATE INDEX IF NOT EXISTS idx_violations_type ON public.compliance_violations(violation_type);
CREATE INDEX IF NOT EXISTS idx_violations_severity ON public.compliance_violations(severity);
CREATE INDEX IF NOT EXISTS idx_violations_status ON public.compliance_violations(status);
CREATE INDEX IF NOT EXISTS idx_violations_project ON public.compliance_violations(project_id);
CREATE INDEX IF NOT EXISTS idx_violations_employee ON public.compliance_violations(employee_id);
CREATE INDEX IF NOT EXISTS idx_violations_date ON public.compliance_violations(affected_date);
CREATE INDEX IF NOT EXISTS idx_violations_open ON public.compliance_violations(status, severity)
    WHERE status IN ('open', 'acknowledged', 'escalated');

-- RLS
ALTER TABLE public.compliance_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "violations_select" ON public.compliance_violations FOR SELECT
    USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "violations_insert" ON public.compliance_violations FOR INSERT
    WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "violations_update" ON public.compliance_violations FOR UPDATE
    USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER violations_updated_at
    BEFORE UPDATE ON public.compliance_violations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- PART 3: WAGE RATE VALIDATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_wage_rate_compliance(
    p_organization_id UUID,
    p_project_id UUID,
    p_employee_id UUID,
    p_work_classification public.work_classification,
    p_work_date DATE,
    p_applied_base_rate NUMERIC(10, 2)
)
RETURNS TABLE (
    is_compliant BOOLEAN,
    violation_type public.violation_type,
    expected_rate NUMERIC(10, 2),
    actual_rate NUMERIC(10, 2),
    variance_amount NUMERIC(10, 2),
    variance_pct NUMERIC(5, 2),
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_wage_rate RECORD;
    v_employee RECORD;
BEGIN
    -- Get the applicable wage rate
    SELECT * INTO v_wage_rate
    FROM public.prevailing_wage_rates pwr
    WHERE pwr.organization_id = p_organization_id
      AND pwr.work_classification = p_work_classification
      AND pwr.is_active = true
      AND pwr.effective_date <= p_work_date
      AND (pwr.expiration_date IS NULL OR pwr.expiration_date > p_work_date)
      AND (pwr.project_id IS NULL OR pwr.project_id = p_project_id)
    ORDER BY
        CASE WHEN pwr.project_id = p_project_id THEN 0 ELSE 1 END,
        pwr.effective_date DESC
    LIMIT 1;

    -- Get employee info for violation record
    SELECT first_name || ' ' || last_name as full_name INTO v_employee
    FROM public.employees WHERE id = p_employee_id;

    -- Check if wage rate exists
    IF v_wage_rate IS NULL THEN
        RETURN QUERY SELECT
            FALSE,
            'wage_rate_missing'::public.violation_type,
            0::NUMERIC(10, 2),
            p_applied_base_rate,
            p_applied_base_rate,
            100.00::NUMERIC(5, 2),
            format('No wage rate found for classification %s on %s', p_work_classification, p_work_date);
        RETURN;
    END IF;

    -- Check if rate has expired (warn but allow)
    IF v_wage_rate.expiration_date IS NOT NULL AND v_wage_rate.expiration_date <= p_work_date THEN
        -- Log warning but don't block
        RETURN QUERY SELECT
            TRUE, -- Allow but warn
            'wage_rate_expired'::public.violation_type,
            v_wage_rate.base_rate,
            p_applied_base_rate,
            0::NUMERIC(10, 2),
            0::NUMERIC(5, 2),
            format('Wage determination %s expired on %s - using last known rate',
                   v_wage_rate.wage_determination_number, v_wage_rate.expiration_date);
        RETURN;
    END IF;

    -- Check if applied rate is below minimum
    IF p_applied_base_rate < v_wage_rate.base_rate THEN
        RETURN QUERY SELECT
            FALSE,
            'wage_rate_below_minimum'::public.violation_type,
            v_wage_rate.base_rate,
            p_applied_base_rate,
            (v_wage_rate.base_rate - p_applied_base_rate)::NUMERIC(10, 2),
            (((v_wage_rate.base_rate - p_applied_base_rate) / v_wage_rate.base_rate) * 100)::NUMERIC(5, 2),
            format('Applied rate $%.2f is below prevailing wage $%.2f for %s (underpayment: $%.2f/hr)',
                   p_applied_base_rate, v_wage_rate.base_rate, p_work_classification,
                   v_wage_rate.base_rate - p_applied_base_rate);
        RETURN;
    END IF;

    -- All checks passed
    RETURN QUERY SELECT
        TRUE,
        NULL::public.violation_type,
        v_wage_rate.base_rate,
        p_applied_base_rate,
        0::NUMERIC(10, 2),
        0::NUMERIC(5, 2),
        'Wage rate compliant'::TEXT;
END;
$$;

-- ============================================================================
-- PART 4: LOG COMPLIANCE VIOLATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_compliance_violation(
    p_organization_id UUID,
    p_violation_type public.violation_type,
    p_severity public.violation_severity,
    p_violation_code TEXT,
    p_title TEXT,
    p_description TEXT,
    p_project_id UUID DEFAULT NULL,
    p_employee_id UUID DEFAULT NULL,
    p_task_log_id UUID DEFAULT NULL,
    p_pay_period_id UUID DEFAULT NULL,
    p_subcontractor_id UUID DEFAULT NULL,
    p_expected_value NUMERIC DEFAULT NULL,
    p_actual_value NUMERIC DEFAULT NULL,
    p_affected_date DATE DEFAULT NULL,
    p_affected_entity_type TEXT DEFAULT NULL,
    p_affected_entity_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_violation_id UUID;
    v_variance NUMERIC;
    v_variance_pct NUMERIC;
BEGIN
    -- Calculate variance if values provided
    IF p_expected_value IS NOT NULL AND p_actual_value IS NOT NULL AND p_expected_value > 0 THEN
        v_variance := p_expected_value - p_actual_value;
        v_variance_pct := (v_variance / p_expected_value) * 100;
    END IF;

    INSERT INTO public.compliance_violations (
        organization_id,
        violation_type,
        severity,
        violation_code,
        title,
        description,
        project_id,
        employee_id,
        task_log_id,
        pay_period_id,
        subcontractor_id,
        expected_value,
        actual_value,
        variance_amount,
        variance_percentage,
        affected_date,
        affected_entity_type,
        affected_entity_name
    ) VALUES (
        p_organization_id,
        p_violation_type,
        p_severity,
        p_violation_code,
        p_title,
        p_description,
        p_project_id,
        p_employee_id,
        p_task_log_id,
        p_pay_period_id,
        p_subcontractor_id,
        p_expected_value,
        p_actual_value,
        v_variance,
        v_variance_pct,
        COALESCE(p_affected_date, CURRENT_DATE),
        p_affected_entity_type,
        p_affected_entity_name
    )
    RETURNING id INTO v_violation_id;

    RETURN v_violation_id;
END;
$$;

-- ============================================================================
-- PART 5: TRIGGER TO LOG VIOLATIONS ON ESCALATION CREATION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.on_escalation_created()
RETURNS TRIGGER AS $$
DECLARE
    v_pay_period RECORD;
BEGIN
    -- Get pay period details
    SELECT pp.*, p.name as project_name, p.project_number
    INTO v_pay_period
    FROM public.pay_periods pp
    JOIN public.projects p ON pp.project_id = p.id
    WHERE pp.id = NEW.pay_period_id;

    -- Log as compliance violation for audit trail
    PERFORM public.log_compliance_violation(
        p_organization_id := NEW.organization_id,
        p_violation_type := CASE NEW.escalation_level
            WHEN 'LEVEL_1_WARNING' THEN 'payment_deadline_warning'
            WHEN 'LEVEL_2_URGENT' THEN 'payment_deadline_urgent'
            ELSE 'payment_deadline_violation'
        END::public.violation_type,
        p_severity := CASE NEW.escalation_level
            WHEN 'LEVEL_1_WARNING' THEN 'warning'
            WHEN 'LEVEL_2_URGENT' THEN 'critical'
            ELSE 'blocking'
        END::public.violation_severity,
        p_violation_code := 'PAY_' || NEW.escalation_level::TEXT,
        p_title := 'Payment Deadline ' || CASE NEW.escalation_level
            WHEN 'LEVEL_1_WARNING' THEN 'Warning (7 days)'
            WHEN 'LEVEL_2_URGENT' THEN 'Urgent (3 days)'
            WHEN 'LEVEL_3_DEADLINE' THEN 'Due Today'
            ELSE 'Violation'
        END,
        p_description := NEW.escalation_reason,
        p_project_id := v_pay_period.project_id,
        p_pay_period_id := NEW.pay_period_id,
        p_affected_date := v_pay_period.payment_deadline_date,
        p_affected_entity_type := 'pay_period',
        p_affected_entity_name := format('Estimate #%s - %s', v_pay_period.estimate_number, v_pay_period.project_name)
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'escalation_creates_violation'
    ) THEN
        CREATE TRIGGER escalation_creates_violation
            AFTER INSERT ON public.compliance_escalations
            FOR EACH ROW EXECUTE FUNCTION public.on_escalation_created();
    END IF;
END $$;

-- ============================================================================
-- PART 6: NOTIFICATION QUEUE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- What to notify about
    notification_type TEXT NOT NULL,              -- 'escalation', 'violation', 'certification_expiring', etc.
    priority INTEGER DEFAULT 5,                   -- 1=highest, 10=lowest

    -- Reference to source
    reference_type TEXT NOT NULL,                 -- 'compliance_escalation', 'compliance_violation', etc.
    reference_id UUID NOT NULL,

    -- Recipients (computed or specified)
    recipient_user_ids UUID[],                    -- Specific users
    recipient_roles TEXT[],                       -- Roles to notify (PM, Controller, etc.)
    recipient_emails TEXT[],                      -- External emails

    -- Delivery channels
    channels TEXT[] DEFAULT ARRAY['in_app'],     -- 'in_app', 'email', 'sms', 'slack'

    -- Content
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',                      -- Additional structured data

    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    last_error TEXT,

    -- Timestamps
    scheduled_for TIMESTAMPTZ DEFAULT NOW(),     -- When to send (for delayed notifications)
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON public.notification_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_queue_org ON public.notification_queue(organization_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_reference ON public.notification_queue(reference_type, reference_id);

-- RLS
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_queue_select" ON public.notification_queue FOR SELECT
    USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "notification_queue_insert" ON public.notification_queue FOR INSERT
    WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

-- ============================================================================
-- PART 7: QUEUE NOTIFICATION ON ESCALATION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.queue_escalation_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_pay_period RECORD;
    v_recipients UUID[];
    v_subject TEXT;
    v_body TEXT;
BEGIN
    -- Get pay period details
    SELECT pp.*, p.name as project_name, p.project_number,
           ph.pm_id, ph.controller_id, up.email as pm_email
    INTO v_pay_period
    FROM public.pay_periods pp
    JOIN public.projects p ON pp.project_id = p.id
    LEFT JOIN public.project_handoffs ph ON ph.project_id = p.id
    LEFT JOIN public.user_profiles up ON up.id = ph.pm_id
    WHERE pp.id = NEW.pay_period_id;

    -- Determine recipients based on escalation level
    v_recipients := CASE NEW.escalation_level
        WHEN 'LEVEL_1_WARNING' THEN ARRAY[v_pay_period.pm_id]::UUID[]
        WHEN 'LEVEL_2_URGENT' THEN ARRAY[v_pay_period.pm_id, v_pay_period.controller_id]::UUID[]
        WHEN 'LEVEL_3_DEADLINE' THEN ARRAY[v_pay_period.pm_id, v_pay_period.controller_id]::UUID[]
        ELSE ARRAY[v_pay_period.pm_id, v_pay_period.controller_id]::UUID[]
    END;

    -- Remove NULLs
    v_recipients := array_remove(v_recipients, NULL);

    -- Build notification content
    v_subject := CASE NEW.escalation_level
        WHEN 'LEVEL_1_WARNING' THEN '⚠️ Payment Deadline in 7 Days'
        WHEN 'LEVEL_2_URGENT' THEN '🔴 URGENT: Payment Deadline in 3 Days'
        WHEN 'LEVEL_3_DEADLINE' THEN '🚨 DEADLINE TODAY: Payments Due'
        ELSE '❌ VIOLATION: Payment Deadline Exceeded'
    END;

    v_body := format(
        E'%s\n\nProject: %s (%s)\nEstimate #%s\nDeadline: %s\nDays Remaining: %s',
        NEW.escalation_reason,
        v_pay_period.project_name,
        v_pay_period.project_number,
        v_pay_period.estimate_number,
        v_pay_period.payment_deadline_date,
        NEW.days_remaining
    );

    -- Queue the notification
    INSERT INTO public.notification_queue (
        organization_id,
        notification_type,
        priority,
        reference_type,
        reference_id,
        recipient_user_ids,
        recipient_roles,
        channels,
        subject,
        body,
        data
    ) VALUES (
        NEW.organization_id,
        'payment_escalation',
        CASE NEW.escalation_level
            WHEN 'LEVEL_4_VIOLATION' THEN 1
            WHEN 'LEVEL_3_DEADLINE' THEN 2
            WHEN 'LEVEL_2_URGENT' THEN 3
            ELSE 5
        END,
        'compliance_escalation',
        NEW.id,
        v_recipients,
        CASE NEW.escalation_level
            WHEN 'LEVEL_4_VIOLATION' THEN ARRAY['PM', 'Controller', 'VP', 'Executive']
            WHEN 'LEVEL_3_DEADLINE' THEN ARRAY['PM', 'Controller', 'VP']
            WHEN 'LEVEL_2_URGENT' THEN ARRAY['PM', 'Controller']
            ELSE ARRAY['PM']
        END,
        CASE NEW.escalation_level
            WHEN 'LEVEL_4_VIOLATION' THEN ARRAY['in_app', 'email', 'sms']
            WHEN 'LEVEL_3_DEADLINE' THEN ARRAY['in_app', 'email']
            ELSE ARRAY['in_app', 'email']
        END,
        v_subject,
        v_body,
        jsonb_build_object(
            'escalation_level', NEW.escalation_level,
            'pay_period_id', NEW.pay_period_id,
            'project_id', v_pay_period.project_id,
            'project_name', v_pay_period.project_name,
            'estimate_number', v_pay_period.estimate_number,
            'deadline_date', v_pay_period.payment_deadline_date,
            'days_remaining', NEW.days_remaining
        )
    );

    -- Mark escalation as notification queued
    UPDATE public.compliance_escalations
    SET pm_notified_at = NOW()
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'escalation_queues_notification'
    ) THEN
        CREATE TRIGGER escalation_queues_notification
            AFTER INSERT ON public.compliance_escalations
            FOR EACH ROW EXECUTE FUNCTION public.queue_escalation_notification();
    END IF;
END $$;

-- ============================================================================
-- PART 8: COMPLIANCE DASHBOARD SUMMARY FUNCTION (Enhanced)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_compliance_violations_summary(p_organization_id UUID)
RETURNS TABLE (
    total_violations INTEGER,
    open_violations INTEGER,
    critical_violations INTEGER,
    blocking_violations INTEGER,
    wage_violations INTEGER,
    certification_violations INTEGER,
    payment_violations INTEGER,
    resolved_this_week INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_violations,
        COUNT(CASE WHEN cv.status = 'open' THEN 1 END)::INTEGER as open_violations,
        COUNT(CASE WHEN cv.severity = 'critical' AND cv.status IN ('open', 'acknowledged') THEN 1 END)::INTEGER as critical_violations,
        COUNT(CASE WHEN cv.severity = 'blocking' AND cv.status IN ('open', 'acknowledged') THEN 1 END)::INTEGER as blocking_violations,
        COUNT(CASE WHEN cv.violation_type IN ('wage_rate_below_minimum', 'wage_rate_expired', 'wage_rate_missing') THEN 1 END)::INTEGER as wage_violations,
        COUNT(CASE WHEN cv.violation_type IN ('certification_expired', 'certification_missing', 'safety_training_expired') THEN 1 END)::INTEGER as certification_violations,
        COUNT(CASE WHEN cv.violation_type IN ('payment_deadline_warning', 'payment_deadline_urgent', 'payment_deadline_violation') THEN 1 END)::INTEGER as payment_violations,
        COUNT(CASE WHEN cv.status = 'resolved' AND cv.resolved_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END)::INTEGER as resolved_this_week
    FROM public.compliance_violations cv
    WHERE cv.organization_id = p_organization_id;
END;
$$;

-- ============================================================================
-- PART 9: VIEW FOR RECENT VIOLATIONS
-- ============================================================================

CREATE OR REPLACE VIEW public.v_recent_compliance_violations AS
SELECT
    cv.id,
    cv.organization_id,
    cv.violation_type,
    cv.severity,
    cv.status,
    cv.violation_code,
    cv.title,
    cv.description,
    cv.expected_value,
    cv.actual_value,
    cv.variance_amount,
    cv.variance_percentage,
    cv.affected_date,
    cv.affected_entity_type,
    cv.affected_entity_name,
    cv.created_at,
    cv.acknowledged_at,
    cv.resolved_at,
    p.name as project_name,
    p.project_number,
    e.first_name || ' ' || e.last_name as employee_name,
    s.company_name as subcontractor_name
FROM public.compliance_violations cv
LEFT JOIN public.projects p ON cv.project_id = p.id
LEFT JOIN public.employees e ON cv.employee_id = e.id
LEFT JOIN public.subcontractors s ON cv.subcontractor_id = s.id
WHERE cv.created_at >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY cv.created_at DESC;

COMMENT ON VIEW public.v_recent_compliance_violations IS 'Compliance violations from the last 30 days with entity details';

-- ============================================================================
-- PART 10: COMMENTS
-- ============================================================================

COMMENT ON TABLE public.compliance_violations IS 'Audit trail of all compliance violations detected by the system';
COMMENT ON TABLE public.notification_queue IS 'Queue for outbound notifications (email, SMS, in-app)';
COMMENT ON FUNCTION public.validate_wage_rate_compliance IS 'Validate that an applied wage rate meets Davis-Bacon prevailing wage requirements';
COMMENT ON FUNCTION public.log_compliance_violation IS 'Helper function to create a compliance violation record';
COMMENT ON FUNCTION public.get_compliance_violations_summary IS 'Dashboard summary of compliance violations by category';

-- ============================================================================
-- Summary
-- ============================================================================

SELECT 'Migration 112: Compliance Violations & Notifications completed successfully' as status;
