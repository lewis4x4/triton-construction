-- Fix audit trigger to handle tables without organization_id (like organizations table itself)
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changed_fields TEXT[];
    org_id UUID;
BEGIN
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
        auth.uid(),
        (SELECT email FROM auth.users WHERE id = auth.uid()),
        org_id,
        inet_client_addr()
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
