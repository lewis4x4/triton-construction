-- Migration 034: Fix Organizations UPDATE performance
-- The subquery in the UPDATE policy may cause issues with audit triggers.
-- Use a SECURITY DEFINER function to avoid RLS recursion during update checks.

-- ============================================================================
-- STEP 1: Create a helper function to check organization membership
-- ============================================================================

-- This function checks if the current user belongs to the given organization
CREATE OR REPLACE FUNCTION public.user_belongs_to_org(org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_profiles
        WHERE id = auth.uid()
        AND organization_id = org_id
    );
$$;

-- ============================================================================
-- STEP 2: Drop and recreate the UPDATE policy using the helper function
-- ============================================================================

DROP POLICY IF EXISTS "organizations_update_members" ON public.organizations;
DROP POLICY IF EXISTS "organizations_update_own" ON public.organizations;

-- Simpler update policy using the helper function
CREATE POLICY "organizations_update_own"
ON public.organizations
FOR UPDATE
USING (public.user_belongs_to_org(id))
WITH CHECK (public.user_belongs_to_org(id));

-- ============================================================================
-- STEP 3: Fix audit trigger to handle edge cases gracefully
-- ============================================================================

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
-- STEP 4: Grant execute on the helper function
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.user_belongs_to_org(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_org(UUID) TO anon;
