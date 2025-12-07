-- ============================================================================
-- Migration 046: Fix WV811 Tickets Updated_by Column
-- ============================================================================
-- Purpose: Add missing updated_by column that a trigger expects
-- Issue: Database update fails with "record 'new' has no field 'updated_by'"
-- ============================================================================

-- Add updated_by column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'wv811_tickets'
        AND column_name = 'updated_by'
    ) THEN
        ALTER TABLE public.wv811_tickets
        ADD COLUMN updated_by UUID REFERENCES auth.users(id);

        COMMENT ON COLUMN public.wv811_tickets.updated_by IS 'User who last updated this ticket';
    END IF;
END
$$;

-- Also check and drop any problematic triggers that might be referencing updated_by
-- First, let's identify what triggers exist
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    FOR trigger_rec IN
        SELECT tgname
        FROM pg_trigger
        WHERE tgrelid = 'public.wv811_tickets'::regclass
        AND tgname LIKE '%audit%'
    LOOP
        RAISE NOTICE 'Found audit trigger: %', trigger_rec.tgname;
    END LOOP;
END
$$;

-- If there's an audit trigger causing issues, recreate it to be more resilient
-- The audit_trigger_function should already handle missing columns gracefully
-- but let's ensure it's the latest version

CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changed_fields TEXT[];
    org_id UUID;
    current_user_id UUID;
    current_user_email TEXT;
    client_ip INET;
BEGIN
    -- Get current user info once (with error handling)
    BEGIN
        current_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
    END;

    BEGIN
        SELECT email INTO current_user_email
        FROM auth.users
        WHERE id = current_user_id;
    EXCEPTION WHEN OTHERS THEN
        current_user_email := NULL;
    END;

    -- Get client IP (may not be available in all contexts)
    BEGIN
        client_ip := inet_client_addr();
    EXCEPTION WHEN OTHERS THEN
        client_ip := NULL;
    END;

    -- Get organization_id if the column exists, otherwise null
    IF TG_OP = 'DELETE' THEN
        old_data := to_jsonb(OLD);
        new_data := NULL;
        -- Check if organization_id column exists
        IF old_data ? 'organization_id' THEN
            org_id := (old_data->>'organization_id')::UUID;
        ELSIF old_data ? 'id' AND TG_TABLE_NAME = 'organizations' THEN
            org_id := (old_data->>'id')::UUID;
        ELSE
            org_id := NULL;
        END IF;
    ELSIF TG_OP = 'INSERT' THEN
        old_data := NULL;
        new_data := to_jsonb(NEW);
        IF new_data ? 'organization_id' THEN
            org_id := (new_data->>'organization_id')::UUID;
        ELSIF new_data ? 'id' AND TG_TABLE_NAME = 'organizations' THEN
            org_id := (new_data->>'id')::UUID;
        ELSE
            org_id := NULL;
        END IF;
    ELSE -- UPDATE
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        IF new_data ? 'organization_id' THEN
            org_id := (new_data->>'organization_id')::UUID;
        ELSIF new_data ? 'id' AND TG_TABLE_NAME = 'organizations' THEN
            org_id := (new_data->>'id')::UUID;
        ELSE
            org_id := NULL;
        END IF;

        -- Calculate changed fields
        SELECT array_agg(key)
        INTO changed_fields
        FROM jsonb_each(new_data) n
        WHERE NOT EXISTS (
            SELECT 1 FROM jsonb_each(old_data) o
            WHERE o.key = n.key AND o.value = n.value
        );
    END IF;

    -- Insert audit log (with error handling so it doesn't block the operation)
    BEGIN
        INSERT INTO public.audit_logs (
            table_name,
            record_id,
            action,
            old_data,
            new_data,
            changed_fields,
            user_id,
            user_email,
            organization_id,
            ip_address
        ) VALUES (
            TG_TABLE_NAME,
            COALESCE(
                (new_data->>'id')::UUID,
                (old_data->>'id')::UUID
            ),
            TG_OP,
            old_data,
            new_data,
            changed_fields,
            current_user_id,
            current_user_email,
            org_id,
            client_ip
        );
    EXCEPTION WHEN OTHERS THEN
        -- Log failed but don't block the operation
        RAISE WARNING 'Audit log insert failed: %', SQLERRM;
    END;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FIX update_updated_at FUNCTION
-- ============================================================================
-- The update_updated_at function was trying to set updated_by on tables that
-- don't have that column. This version only sets updated_at.

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running this migration, verify the column exists:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'wv811_tickets' AND column_name = 'updated_by';
