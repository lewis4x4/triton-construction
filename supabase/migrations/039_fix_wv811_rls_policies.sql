-- =============================================================================
-- Migration: 039_fix_wv811_rls_policies.sql
-- Purpose: Fix RLS policies that were missing auth.uid() parameter
-- Date: December 6, 2024
-- =============================================================================

-- Fix wv811_tickets policies
DROP POLICY IF EXISTS wv811_tickets_select ON public.wv811_tickets;
CREATE POLICY wv811_tickets_select ON public.wv811_tickets
    FOR SELECT USING (organization_id = public.get_user_organization_id(auth.uid()));

DROP POLICY IF EXISTS wv811_tickets_insert ON public.wv811_tickets;
CREATE POLICY wv811_tickets_insert ON public.wv811_tickets
    FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

DROP POLICY IF EXISTS wv811_tickets_update ON public.wv811_tickets;
CREATE POLICY wv811_tickets_update ON public.wv811_tickets
    FOR UPDATE USING (organization_id = public.get_user_organization_id(auth.uid()));

DROP POLICY IF EXISTS wv811_tickets_delete ON public.wv811_tickets;
CREATE POLICY wv811_tickets_delete ON public.wv811_tickets
    FOR DELETE USING (
        organization_id = public.get_user_organization_id(auth.uid())
        AND public.get_user_role_level(auth.uid()) <= 20
    );

-- Fix wv811_utility_responses policies
DROP POLICY IF EXISTS wv811_responses_select ON public.wv811_utility_responses;
CREATE POLICY wv811_responses_select ON public.wv811_utility_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.wv811_tickets t
            WHERE t.id = ticket_id
            AND t.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

DROP POLICY IF EXISTS wv811_responses_insert ON public.wv811_utility_responses;
CREATE POLICY wv811_responses_insert ON public.wv811_utility_responses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.wv811_tickets t
            WHERE t.id = ticket_id
            AND t.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

DROP POLICY IF EXISTS wv811_responses_update ON public.wv811_utility_responses;
CREATE POLICY wv811_responses_update ON public.wv811_utility_responses
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.wv811_tickets t
            WHERE t.id = ticket_id
            AND t.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Fix wv811_alert_subscriptions policies
DROP POLICY IF EXISTS wv811_subscriptions_select ON public.wv811_alert_subscriptions;
CREATE POLICY wv811_subscriptions_select ON public.wv811_alert_subscriptions
    FOR SELECT USING (
        user_id = auth.uid()
        OR (
            organization_id = public.get_user_organization_id(auth.uid())
            AND public.get_user_role_level(auth.uid()) <= 10
        )
    );

DROP POLICY IF EXISTS wv811_subscriptions_insert ON public.wv811_alert_subscriptions;
CREATE POLICY wv811_subscriptions_insert ON public.wv811_alert_subscriptions
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        OR (
            organization_id = public.get_user_organization_id(auth.uid())
            AND public.get_user_role_level(auth.uid()) <= 10
        )
    );

DROP POLICY IF EXISTS wv811_subscriptions_update ON public.wv811_alert_subscriptions;
CREATE POLICY wv811_subscriptions_update ON public.wv811_alert_subscriptions
    FOR UPDATE USING (
        user_id = auth.uid()
        OR (
            organization_id = public.get_user_organization_id(auth.uid())
            AND public.get_user_role_level(auth.uid()) <= 10
        )
    );

DROP POLICY IF EXISTS wv811_subscriptions_delete ON public.wv811_alert_subscriptions;
CREATE POLICY wv811_subscriptions_delete ON public.wv811_alert_subscriptions
    FOR DELETE USING (
        user_id = auth.uid()
        OR (
            organization_id = public.get_user_organization_id(auth.uid())
            AND public.get_user_role_level(auth.uid()) <= 10
        )
    );

-- Fix wv811_ticket_alerts policies
DROP POLICY IF EXISTS wv811_alerts_select ON public.wv811_ticket_alerts;
CREATE POLICY wv811_alerts_select ON public.wv811_ticket_alerts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.wv811_tickets t
            WHERE t.id = ticket_id
            AND t.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

DROP POLICY IF EXISTS wv811_alerts_update ON public.wv811_ticket_alerts;
CREATE POLICY wv811_alerts_update ON public.wv811_ticket_alerts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.wv811_tickets t
            WHERE t.id = ticket_id
            AND t.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Fix wv811_project_tickets policies
DROP POLICY IF EXISTS wv811_project_tickets_select ON public.wv811_project_tickets;
CREATE POLICY wv811_project_tickets_select ON public.wv811_project_tickets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.wv811_tickets t
            WHERE t.id = ticket_id
            AND t.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

DROP POLICY IF EXISTS wv811_project_tickets_insert ON public.wv811_project_tickets;
CREATE POLICY wv811_project_tickets_insert ON public.wv811_project_tickets
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.wv811_tickets t
            WHERE t.id = ticket_id
            AND t.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

DROP POLICY IF EXISTS wv811_project_tickets_delete ON public.wv811_project_tickets;
CREATE POLICY wv811_project_tickets_delete ON public.wv811_project_tickets
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.wv811_tickets t
            WHERE t.id = ticket_id
            AND t.organization_id = public.get_user_organization_id(auth.uid())
        )
        AND public.get_user_role_level(auth.uid()) <= 30
    );

-- Fix wv811_ticket_notes policies
DROP POLICY IF EXISTS wv811_notes_select ON public.wv811_ticket_notes;
CREATE POLICY wv811_notes_select ON public.wv811_ticket_notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.wv811_tickets t
            WHERE t.id = ticket_id
            AND t.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

DROP POLICY IF EXISTS wv811_notes_insert ON public.wv811_ticket_notes;
CREATE POLICY wv811_notes_insert ON public.wv811_ticket_notes
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.wv811_tickets t
            WHERE t.id = ticket_id
            AND t.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Fix wv811_ticket_attachments policies
DROP POLICY IF EXISTS wv811_attachments_select ON public.wv811_ticket_attachments;
CREATE POLICY wv811_attachments_select ON public.wv811_ticket_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.wv811_tickets t
            WHERE t.id = ticket_id
            AND t.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

DROP POLICY IF EXISTS wv811_attachments_insert ON public.wv811_ticket_attachments;
CREATE POLICY wv811_attachments_insert ON public.wv811_ticket_attachments
    FOR INSERT WITH CHECK (
        uploaded_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.wv811_tickets t
            WHERE t.id = ticket_id
            AND t.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

DROP POLICY IF EXISTS wv811_attachments_delete ON public.wv811_ticket_attachments;
CREATE POLICY wv811_attachments_delete ON public.wv811_ticket_attachments
    FOR DELETE USING (
        uploaded_by = auth.uid()
        OR public.get_user_role_level(auth.uid()) <= 20
    );

-- Fix wv811_digest_preferences policies
DROP POLICY IF EXISTS wv811_digest_select ON public.wv811_digest_preferences;
CREATE POLICY wv811_digest_select ON public.wv811_digest_preferences
    FOR SELECT USING (
        user_id = auth.uid()
        OR (
            organization_id = public.get_user_organization_id(auth.uid())
            AND public.get_user_role_level(auth.uid()) <= 10
        )
    );

DROP POLICY IF EXISTS wv811_digest_insert ON public.wv811_digest_preferences;
CREATE POLICY wv811_digest_insert ON public.wv811_digest_preferences
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND organization_id = public.get_user_organization_id(auth.uid())
    );

DROP POLICY IF EXISTS wv811_digest_update ON public.wv811_digest_preferences;
CREATE POLICY wv811_digest_update ON public.wv811_digest_preferences
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS wv811_digest_delete ON public.wv811_digest_preferences;
CREATE POLICY wv811_digest_delete ON public.wv811_digest_preferences
    FOR DELETE USING (user_id = auth.uid());

-- Done!
COMMENT ON TABLE public.wv811_tickets IS 'WV811 locate tickets with fixed RLS policies (migration 039)';
