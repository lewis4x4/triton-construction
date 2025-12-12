-- ============================================================================
-- MIGRATION 104: WVDOH Document Types Enhancement
-- Adds new document types to support full WVDOH bid package inventory
-- ============================================================================

-- Add new document types to document_type_enum
-- Using ALTER TYPE ... ADD VALUE (requires PostgreSQL 9.1+)
-- Note: ADD VALUE cannot be run inside a transaction block in some cases

-- ITEMIZED_BID_XLSX - Excel spreadsheet itemized bids (alternative to BIDX/EBSX)
DO $$
BEGIN
    ALTER TYPE document_type_enum ADD VALUE IF NOT EXISTS 'ITEMIZED_BID_XLSX' AFTER 'BIDX';
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN OTHERS THEN RAISE NOTICE 'Could not add ITEMIZED_BID_XLSX: %', SQLERRM;
END $$;

-- HYDRAULIC - Hydrologic/Hydraulic reports (H&H analysis)
DO $$
BEGIN
    ALTER TYPE document_type_enum ADD VALUE IF NOT EXISTS 'HYDRAULIC' AFTER 'GEOTECHNICAL';
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN OTHERS THEN RAISE NOTICE 'Could not add HYDRAULIC: %', SQLERRM;
END $$;

-- UTILITY_PLANS - Utility relocation and coordination plans (critical for change order prevention)
DO $$
BEGIN
    ALTER TYPE document_type_enum ADD VALUE IF NOT EXISTS 'UTILITY_PLANS' AFTER 'TRAFFIC_STUDY';
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN OTHERS THEN RAISE NOTICE 'Could not add UTILITY_PLANS: %', SQLERRM;
END $$;

-- ROW_PLANS - Right-of-Way plans, easements, property limits
DO $$
BEGIN
    ALTER TYPE document_type_enum ADD VALUE IF NOT EXISTS 'ROW_PLANS' AFTER 'UTILITY_PLANS';
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN OTHERS THEN RAISE NOTICE 'Could not add ROW_PLANS: %', SQLERRM;
END $$;

-- PERMITS - Environmental permits, 404, NPDES, air quality permits
DO $$
BEGIN
    ALTER TYPE document_type_enum ADD VALUE IF NOT EXISTS 'PERMITS' AFTER 'ROW_PLANS';
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN OTHERS THEN RAISE NOTICE 'Could not add PERMITS: %', SQLERRM;
END $$;

-- PREBID_MINUTES - Pre-bid meeting minutes and Q&A
DO $$
BEGIN
    ALTER TYPE document_type_enum ADD VALUE IF NOT EXISTS 'PREBID_MINUTES' AFTER 'PERMITS';
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN OTHERS THEN RAISE NOTICE 'Could not add PREBID_MINUTES: %', SQLERRM;
END $$;

-- Add comment documenting all document types
COMMENT ON TYPE document_type_enum IS
'WVDOH Bid Package document types:
  PROPOSAL - Main bid proposal document
  BIDX - BidX/EBSX XML file with line items (WVDOH AASHTOWare)
  ITEMIZED_BID_XLSX - Excel spreadsheet itemized bid (alternative to BIDX)
  PLANS - Project construction plans (PDF, TIFF, DWG)
  EXISTING_PLANS - As-built or existing conditions
  SPECIAL_PROVISIONS - Special provisions document
  ENVIRONMENTAL - Environmental permits/commitments
  ASBESTOS - Asbestos survey report
  HAZMAT - Hazardous materials report
  GEOTECHNICAL - Geotechnical/boring logs report
  HYDRAULIC - Hydrologic/Hydraulic analysis (H&H report)
  TRAFFIC_STUDY - Traffic analysis
  UTILITY_PLANS - Utility relocation and coordination plans
  ROW_PLANS - Right-of-Way plans, easements
  PERMITS - Environmental permits (404, NPDES, etc.)
  PREBID_MINUTES - Pre-bid meeting minutes and Q&A
  ADDENDUM - Bid addendum
  OTHER - Other supporting documents';

-- Log the migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 104: Added 6 new document types for WVDOH bid package support';
    RAISE NOTICE '  - ITEMIZED_BID_XLSX: Excel bid spreadsheets';
    RAISE NOTICE '  - HYDRAULIC: H&H reports';
    RAISE NOTICE '  - UTILITY_PLANS: Utility coordination (critical)';
    RAISE NOTICE '  - ROW_PLANS: Right-of-way plans';
    RAISE NOTICE '  - PERMITS: Environmental permits';
    RAISE NOTICE '  - PREBID_MINUTES: Pre-bid meeting minutes';
END $$;
