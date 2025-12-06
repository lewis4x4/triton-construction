-- ============================================================================
-- MIGRATION 015: V4.1 ADDENDUM - ESTIMATION ENUMS
-- Triton AI Bid Package Engine - New enums for pricing and estimation
-- ============================================================================

-- ============================================================================
-- ENUM: estimation_method_enum
-- Purpose: How an item's price is determined
-- ============================================================================
CREATE TYPE estimation_method_enum AS ENUM (
    'ASSEMBLY_BASED',           -- Derived from assembly template
    'SUBQUOTE',                 -- Based on subcontractor quote
    'HISTORICAL_ANALOG',        -- Based on similar past item
    'OWNER_SPECIFIED',          -- Owner-provided unit price
    'MANUAL_ESTIMATOR_JUDGMENT' -- Estimator direct entry
);

COMMENT ON TYPE estimation_method_enum IS 'Method used to determine item pricing';

-- ============================================================================
-- ENUM: risk_ownership_enum
-- Purpose: Who carries the risk contractually
-- ============================================================================
CREATE TYPE risk_ownership_enum AS ENUM (
    'OWNER',
    'CONTRACTOR',
    'SHARED',
    'UNCLEAR'
);

COMMENT ON TYPE risk_ownership_enum IS 'Party responsible for bearing a risk';

-- ============================================================================
-- ENUM: risk_type_enum
-- Purpose: Distinguish risks from opportunities in single table
-- ============================================================================
CREATE TYPE risk_type_enum AS ENUM (
    'RISK',
    'OPPORTUNITY'
);

COMMENT ON TYPE risk_type_enum IS 'Classifies entry as risk (negative) or opportunity (positive)';

-- ============================================================================
-- ENUM: assembly_resource_type_enum
-- Purpose: Type of resource in assembly line
-- ============================================================================
CREATE TYPE assembly_resource_type_enum AS ENUM (
    'LABOR',
    'EQUIPMENT',
    'MATERIAL',
    'SUBCONTRACT',
    'SMALL_TOOLS',
    'OTHER'
);

COMMENT ON TYPE assembly_resource_type_enum IS 'Type of resource in an assembly template line';

-- ============================================================================
-- ENUM: price_source_enum (if not exists from V4.0)
-- Purpose: Where the unit price came from
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'price_source_enum') THEN
        CREATE TYPE price_source_enum AS ENUM (
            'AI_SUGGESTED',
            'HISTORICAL_DATA',
            'SUBCONTRACTOR_QUOTE',
            'MANUAL_ENTRY',
            'ASSEMBLY_CALCULATED',
            'OWNER_PROVIDED',
            'IMPORTED'
        );
    END IF;
END$$;

COMMENT ON TYPE price_source_enum IS 'Source of unit price for a line item';
