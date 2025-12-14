-- =============================================================================
-- Migration: 118_offline_sync_infrastructure.sql
-- Purpose: Complete offline-first architecture for field operations
-- Date: December 14, 2025
-- =============================================================================
-- This migration enables:
-- 1. Device registration and sync state tracking
-- 2. Generic offline sync queue for all data types
-- 3. Conflict detection and resolution infrastructure
-- 4. Batch sync support for efficient mobile operations
-- =============================================================================

-- =============================================================================
-- PART 1: Device Registration
-- Track user devices and their sync state
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.device_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Device identification
    device_id TEXT NOT NULL, -- Unique device identifier (from expo-device or browser fingerprint)
    device_name TEXT, -- User-friendly name (e.g., "John's iPhone")
    device_type TEXT NOT NULL CHECK (device_type IN ('ios', 'android', 'web', 'pwa')),
    device_model TEXT, -- e.g., "iPhone 15 Pro", "SM-G998U"
    os_version TEXT,
    app_version TEXT,

    -- Push notifications
    push_token TEXT, -- FCM/APNs token
    push_enabled BOOLEAN DEFAULT true,

    -- Sync state
    last_sync_at TIMESTAMPTZ,
    last_sync_version BIGINT DEFAULT 0, -- Incrementing version for delta sync
    sync_enabled BOOLEAN DEFAULT true,

    -- Status
    is_active BOOLEAN DEFAULT true,
    last_active_at TIMESTAMPTZ DEFAULT NOW(),

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint: one registration per device per user
    CONSTRAINT unique_device_user UNIQUE (user_id, device_id)
);

-- Indexes
CREATE INDEX idx_device_registrations_user ON public.device_registrations(user_id);
CREATE INDEX idx_device_registrations_org ON public.device_registrations(organization_id);
CREATE INDEX idx_device_registrations_active ON public.device_registrations(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.device_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own devices" ON public.device_registrations FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage own devices" ON public.device_registrations FOR ALL
    USING (user_id = auth.uid());

-- Trigger
CREATE TRIGGER device_registrations_updated_at
    BEFORE UPDATE ON public.device_registrations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- PART 2: Offline Sync Queue
-- Generic queue for all offline data submissions
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.offline_sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL, -- Links to device_registrations.device_id

    -- Operation details
    operation_type TEXT NOT NULL CHECK (operation_type IN (
        'INSERT', 'UPDATE', 'DELETE'
    )),
    entity_type TEXT NOT NULL CHECK (entity_type IN (
        'time_entry', 'daily_report', 'daily_report_entry',
        'equipment_log', 'safety_observation', 'photo',
        'utility_verification', 'utility_conflict', 'voice_recording'
    )),
    entity_id UUID, -- NULL for INSERT (will be assigned server-side)
    offline_id TEXT NOT NULL, -- Client-generated UUID for deduplication

    -- Payload
    payload JSONB NOT NULL, -- The actual data to sync

    -- Sync state
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'completed', 'failed', 'conflict'
    )),
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,

    -- Timestamps
    client_created_at TIMESTAMPTZ NOT NULL, -- When created on device
    queued_at TIMESTAMPTZ DEFAULT NOW(), -- When received by server
    processed_at TIMESTAMPTZ,

    -- Error handling
    error_message TEXT,
    error_details JSONB,

    -- Conflict info
    conflict_type TEXT, -- 'version', 'deleted', 'validation'
    server_version JSONB, -- Current server state if conflict

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint: prevent duplicate submissions
    CONSTRAINT unique_offline_operation UNIQUE (device_id, offline_id)
);

-- Indexes
CREATE INDEX idx_sync_queue_user ON public.offline_sync_queue(user_id);
CREATE INDEX idx_sync_queue_org ON public.offline_sync_queue(organization_id);
CREATE INDEX idx_sync_queue_status ON public.offline_sync_queue(status) WHERE status IN ('pending', 'processing', 'conflict');
CREATE INDEX idx_sync_queue_entity ON public.offline_sync_queue(entity_type, entity_id);
CREATE INDEX idx_sync_queue_queued ON public.offline_sync_queue(queued_at);

-- RLS
ALTER TABLE public.offline_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own queue items" ON public.offline_sync_queue FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert to queue" ON public.offline_sync_queue FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Service role can manage all (for processing)
CREATE POLICY "Service can manage all queue items" ON public.offline_sync_queue FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Trigger
CREATE TRIGGER sync_queue_updated_at
    BEFORE UPDATE ON public.offline_sync_queue
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- PART 3: Sync Conflicts
-- Persisted conflicts for manual resolution
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sync_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    queue_item_id UUID REFERENCES public.offline_sync_queue(id) ON DELETE SET NULL,

    -- Entity info
    entity_type TEXT NOT NULL,
    entity_id UUID,

    -- Conflict details
    conflict_type TEXT NOT NULL CHECK (conflict_type IN (
        'version_mismatch', -- Server was updated while offline
        'deleted_on_server', -- Entity was deleted on server
        'validation_error', -- Data doesn't pass validation
        'duplicate', -- Record already exists
        'constraint_violation' -- FK or unique constraint
    )),

    -- Data comparison
    client_data JSONB NOT NULL, -- What the device sent
    server_data JSONB, -- Current server state (NULL if deleted)

    -- Resolution
    status TEXT NOT NULL DEFAULT 'unresolved' CHECK (status IN (
        'unresolved', 'accepted_client', 'accepted_server', 'merged', 'dismissed'
    )),
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    merged_data JSONB, -- If status = 'merged', the final merged result

    -- Context
    device_id TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id),

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sync_conflicts_org ON public.sync_conflicts(organization_id);
CREATE INDEX idx_sync_conflicts_user ON public.sync_conflicts(user_id);
CREATE INDEX idx_sync_conflicts_status ON public.sync_conflicts(status) WHERE status = 'unresolved';
CREATE INDEX idx_sync_conflicts_entity ON public.sync_conflicts(entity_type, entity_id);

-- RLS
ALTER TABLE public.sync_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org conflicts" ON public.sync_conflicts FOR SELECT
    USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Users can resolve conflicts" ON public.sync_conflicts FOR UPDATE
    USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Trigger
CREATE TRIGGER sync_conflicts_updated_at
    BEFORE UPDATE ON public.sync_conflicts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- PART 4: Add offline tracking columns to key tables
-- =============================================================================

-- Time entries - add offline tracking
ALTER TABLE public.time_entries
    ADD COLUMN IF NOT EXISTS offline_id TEXT,
    ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS sync_version BIGINT DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_time_entries_offline_id ON public.time_entries(offline_id) WHERE offline_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_time_entries_sync_version ON public.time_entries(sync_version);

-- Daily reports - add offline tracking
ALTER TABLE public.daily_reports
    ADD COLUMN IF NOT EXISTS offline_id TEXT,
    ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS sync_version BIGINT DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_daily_reports_offline_id ON public.daily_reports(offline_id) WHERE offline_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_daily_reports_sync_version ON public.daily_reports(sync_version);

-- Daily report entries - add offline tracking
ALTER TABLE public.daily_report_entries
    ADD COLUMN IF NOT EXISTS offline_id TEXT,
    ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_daily_report_entries_offline_id ON public.daily_report_entries(offline_id) WHERE offline_id IS NOT NULL;

-- Daily equipment log - add offline tracking
ALTER TABLE public.daily_equipment_log
    ADD COLUMN IF NOT EXISTS offline_id TEXT,
    ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS sync_version BIGINT DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_daily_equipment_log_offline_id ON public.daily_equipment_log(offline_id) WHERE offline_id IS NOT NULL;

-- =============================================================================
-- PART 5: Sync metadata tracking
-- Track what data each user/device has synced
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sync_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,

    -- Checkpoint per entity type
    entity_type TEXT NOT NULL,
    last_sync_at TIMESTAMPTZ NOT NULL,
    last_sync_version BIGINT NOT NULL,
    record_count INTEGER DEFAULT 0,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_sync_checkpoint UNIQUE (user_id, device_id, entity_type)
);

-- RLS
ALTER TABLE public.sync_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own checkpoints" ON public.sync_checkpoints FOR ALL
    USING (user_id = auth.uid());

-- Trigger
CREATE TRIGGER sync_checkpoints_updated_at
    BEFORE UPDATE ON public.sync_checkpoints
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- PART 6: Helper functions for sync operations
-- =============================================================================

-- Function to get data modified since last sync for a user
CREATE OR REPLACE FUNCTION public.get_sync_delta(
    p_user_id UUID,
    p_entity_type TEXT,
    p_since_version BIGINT DEFAULT 0
)
RETURNS TABLE (
    entity_id UUID,
    data JSONB,
    sync_version BIGINT,
    operation TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    CASE p_entity_type
        WHEN 'time_entry' THEN
            RETURN QUERY
            SELECT
                te.id,
                to_jsonb(te) - 'sync_version',
                te.sync_version,
                'upsert'::TEXT
            FROM public.time_entries te
            WHERE te.crew_member_id IN (
                SELECT e.id FROM public.employees e
                WHERE e.organization_id = public.get_user_organization_id(p_user_id)
            )
            AND te.sync_version > p_since_version
            ORDER BY te.sync_version;

        WHEN 'daily_report' THEN
            RETURN QUERY
            SELECT
                dr.id,
                to_jsonb(dr) - 'sync_version',
                dr.sync_version,
                'upsert'::TEXT
            FROM public.daily_reports dr
            WHERE dr.organization_id = public.get_user_organization_id(p_user_id)
            AND dr.sync_version > p_since_version
            ORDER BY dr.sync_version;

        WHEN 'equipment_log' THEN
            RETURN QUERY
            SELECT
                del.id,
                to_jsonb(del) - 'sync_version',
                del.sync_version,
                'upsert'::TEXT
            FROM public.daily_equipment_log del
            JOIN public.daily_reports dr ON del.daily_report_id = dr.id
            WHERE dr.organization_id = public.get_user_organization_id(p_user_id)
            AND del.sync_version > p_since_version
            ORDER BY del.sync_version;

        ELSE
            RAISE EXCEPTION 'Unknown entity type: %', p_entity_type;
    END CASE;
END;
$$;

-- Function to process a sync queue item
CREATE OR REPLACE FUNCTION public.process_sync_queue_item(p_queue_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item RECORD;
    v_result JSONB;
    v_new_id UUID;
    v_conflict_id UUID;
BEGIN
    -- Get and lock the queue item
    SELECT * INTO v_item
    FROM public.offline_sync_queue
    WHERE id = p_queue_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Queue item not found');
    END IF;

    IF v_item.status NOT IN ('pending', 'failed') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Item already processed');
    END IF;

    -- Mark as processing
    UPDATE public.offline_sync_queue
    SET status = 'processing', updated_at = NOW()
    WHERE id = p_queue_id;

    BEGIN
        CASE v_item.entity_type
            WHEN 'time_entry' THEN
                IF v_item.operation_type = 'INSERT' THEN
                    INSERT INTO public.time_entries (
                        crew_member_id, project_id, work_date, cost_code_id,
                        regular_hours, overtime_hours, double_time_hours,
                        work_description, status, offline_id, synced_at
                    )
                    SELECT
                        (v_item.payload->>'crew_member_id')::UUID,
                        (v_item.payload->>'project_id')::UUID,
                        (v_item.payload->>'work_date')::DATE,
                        (v_item.payload->>'cost_code_id')::UUID,
                        COALESCE((v_item.payload->>'regular_hours')::DECIMAL, 0),
                        COALESCE((v_item.payload->>'overtime_hours')::DECIMAL, 0),
                        COALESCE((v_item.payload->>'double_time_hours')::DECIMAL, 0),
                        v_item.payload->>'work_description',
                        COALESCE(v_item.payload->>'status', 'PENDING'),
                        v_item.offline_id,
                        NOW()
                    RETURNING id INTO v_new_id;

                    v_result := jsonb_build_object(
                        'success', true,
                        'entity_id', v_new_id,
                        'offline_id', v_item.offline_id
                    );
                ELSIF v_item.operation_type = 'UPDATE' THEN
                    UPDATE public.time_entries
                    SET
                        regular_hours = COALESCE((v_item.payload->>'regular_hours')::DECIMAL, regular_hours),
                        overtime_hours = COALESCE((v_item.payload->>'overtime_hours')::DECIMAL, overtime_hours),
                        work_description = COALESCE(v_item.payload->>'work_description', work_description),
                        synced_at = NOW(),
                        sync_version = sync_version + 1
                    WHERE id = v_item.entity_id
                    RETURNING id INTO v_new_id;

                    IF NOT FOUND THEN
                        -- Record was deleted on server - create conflict
                        INSERT INTO public.sync_conflicts (
                            organization_id, queue_item_id, entity_type, entity_id,
                            conflict_type, client_data, server_data, device_id, user_id
                        ) VALUES (
                            v_item.organization_id, p_queue_id, v_item.entity_type, v_item.entity_id,
                            'deleted_on_server', v_item.payload, NULL, v_item.device_id, v_item.user_id
                        ) RETURNING id INTO v_conflict_id;

                        v_result := jsonb_build_object(
                            'success', false,
                            'conflict', true,
                            'conflict_id', v_conflict_id,
                            'conflict_type', 'deleted_on_server'
                        );
                    ELSE
                        v_result := jsonb_build_object('success', true, 'entity_id', v_new_id);
                    END IF;
                END IF;

            -- Add more entity types as needed
            ELSE
                RAISE EXCEPTION 'Unsupported entity type: %', v_item.entity_type;
        END CASE;

        -- Mark as completed
        UPDATE public.offline_sync_queue
        SET
            status = CASE WHEN v_result->>'conflict' = 'true' THEN 'conflict' ELSE 'completed' END,
            processed_at = NOW(),
            updated_at = NOW()
        WHERE id = p_queue_id;

        RETURN v_result;

    EXCEPTION WHEN OTHERS THEN
        -- Mark as failed
        UPDATE public.offline_sync_queue
        SET
            status = 'failed',
            retry_count = retry_count + 1,
            error_message = SQLERRM,
            updated_at = NOW()
        WHERE id = p_queue_id;

        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
    END;
END;
$$;

-- Function to get pending sync items for a device
CREATE OR REPLACE FUNCTION public.get_pending_sync_results(p_device_id TEXT)
RETURNS TABLE (
    offline_id TEXT,
    entity_type TEXT,
    status TEXT,
    entity_id UUID,
    error_message TEXT,
    conflict_id UUID
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT
        sq.offline_id,
        sq.entity_type,
        sq.status,
        sq.entity_id,
        sq.error_message,
        sc.id as conflict_id
    FROM public.offline_sync_queue sq
    LEFT JOIN public.sync_conflicts sc ON sc.queue_item_id = sq.id
    WHERE sq.device_id = p_device_id
    AND sq.status IN ('completed', 'failed', 'conflict')
    AND sq.processed_at > NOW() - INTERVAL '24 hours'
    ORDER BY sq.processed_at DESC;
$$;

-- =============================================================================
-- PART 7: Views for sync status
-- =============================================================================

CREATE OR REPLACE VIEW public.v_device_sync_status AS
SELECT
    dr.id,
    dr.user_id,
    dr.device_name,
    dr.device_type,
    dr.last_sync_at,
    dr.is_active,
    up.first_name || ' ' || up.last_name as user_name,
    (SELECT COUNT(*) FROM public.offline_sync_queue sq
     WHERE sq.device_id = dr.device_id AND sq.status = 'pending') as pending_uploads,
    (SELECT COUNT(*) FROM public.sync_conflicts sc
     WHERE sc.device_id = dr.device_id AND sc.status = 'unresolved') as unresolved_conflicts
FROM public.device_registrations dr
JOIN public.user_profiles up ON dr.user_id = up.id
WHERE dr.is_active = true;

CREATE OR REPLACE VIEW public.v_sync_queue_summary AS
SELECT
    organization_id,
    entity_type,
    status,
    COUNT(*) as count,
    MIN(queued_at) as oldest_item,
    MAX(queued_at) as newest_item
FROM public.offline_sync_queue
WHERE queued_at > NOW() - INTERVAL '7 days'
GROUP BY organization_id, entity_type, status
ORDER BY organization_id, entity_type, status;

-- =============================================================================
-- PART 8: Comments
-- =============================================================================

COMMENT ON TABLE public.device_registrations IS
    'Tracks user devices for offline sync and push notifications';

COMMENT ON TABLE public.offline_sync_queue IS
    'Queue for offline data submissions with deduplication and retry logic';

COMMENT ON TABLE public.sync_conflicts IS
    'Persisted sync conflicts requiring manual resolution';

COMMENT ON TABLE public.sync_checkpoints IS
    'Tracks sync progress per device per entity type for delta sync';

COMMENT ON FUNCTION public.get_sync_delta IS
    'Returns all records modified since a given sync version for delta downloads';

COMMENT ON FUNCTION public.process_sync_queue_item IS
    'Processes a single offline sync queue item with conflict detection';

-- =============================================================================
-- Summary
-- =============================================================================
-- This migration provides:
-- 1. Device registration for multi-device sync
-- 2. Generic offline queue with deduplication (offline_id)
-- 3. Conflict detection and resolution workflow
-- 4. Delta sync support via sync_version columns
-- 5. Helper functions for sync operations
-- 6. Views for monitoring sync health
-- =============================================================================
