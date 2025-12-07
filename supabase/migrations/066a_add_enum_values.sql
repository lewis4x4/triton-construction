-- =============================================================================
-- Migration 066a: Add Missing Enum Values to bid_status_enum
-- =============================================================================
-- RUN THIS FIRST, then run 066b_insert_sandbox_data.sql
-- PostgreSQL requires enum values to be committed before they can be used
-- =============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bid_status_enum') THEN
        BEGIN
            ALTER TYPE bid_status_enum ADD VALUE IF NOT EXISTS 'IDENTIFIED';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;

        BEGIN
            ALTER TYPE bid_status_enum ADD VALUE IF NOT EXISTS 'REVIEWING';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;

        BEGIN
            ALTER TYPE bid_status_enum ADD VALUE IF NOT EXISTS 'ANALYZING';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;

        BEGIN
            ALTER TYPE bid_status_enum ADD VALUE IF NOT EXISTS 'READY_FOR_REVIEW';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;

        BEGIN
            ALTER TYPE bid_status_enum ADD VALUE IF NOT EXISTS 'IN_REVIEW';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;

        BEGIN
            ALTER TYPE bid_status_enum ADD VALUE IF NOT EXISTS 'APPROVED';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;

        BEGIN
            ALTER TYPE bid_status_enum ADD VALUE IF NOT EXISTS 'ESTIMATING';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;

        BEGIN
            ALTER TYPE bid_status_enum ADD VALUE IF NOT EXISTS 'SUBMITTED';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;

        BEGIN
            ALTER TYPE bid_status_enum ADD VALUE IF NOT EXISTS 'WON';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;

        BEGIN
            ALTER TYPE bid_status_enum ADD VALUE IF NOT EXISTS 'LOST';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;

        BEGIN
            ALTER TYPE bid_status_enum ADD VALUE IF NOT EXISTS 'NO_BID';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;

        BEGIN
            ALTER TYPE bid_status_enum ADD VALUE IF NOT EXISTS 'CANCELLED';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    ELSE
        CREATE TYPE bid_status_enum AS ENUM (
            'IDENTIFIED', 'REVIEWING', 'ANALYZING', 'READY_FOR_REVIEW',
            'IN_REVIEW', 'APPROVED', 'ESTIMATING', 'SUBMITTED',
            'WON', 'LOST', 'NO_BID', 'CANCELLED'
        );
    END IF;
END $$;

-- Verify enum values
SELECT 'Enum values after migration:' as info;
SELECT enumlabel FROM pg_enum
WHERE enumtypid = 'bid_status_enum'::regtype
ORDER BY enumsortorder;
