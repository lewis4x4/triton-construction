-- =============================================================================
-- Migration 083: Subcontractor Management - Placeholder
-- =============================================================================
-- Note: The subcontractors table has schema constraints (primary_trade check)
-- that differ from local migrations. This migration creates minimal test data
-- for the dashboard to work.
--
-- For full subcontractor seed data, run after schema alignment.
-- =============================================================================

-- Ensure demo organization exists
INSERT INTO public.organizations (id, name, slug, legal_name, city, state)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Triton Construction Demo',
  'triton-demo',
  'Triton Construction Inc.',
  'St. Albans',
  'WV'
)
ON CONFLICT (id) DO NOTHING;

-- Ensure demo projects exist
INSERT INTO public.projects (
  id, organization_id, project_number, name,
  project_type, status,
  original_contract_value, current_contract_value,
  notice_to_proceed_date, original_completion_date
) VALUES
(
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '2024-001',
  'Corridor H Section 12',
  'HIGHWAY',
  'ACTIVE',
  15000000.00,
  15000000.00,
  '2024-03-15',
  '2025-11-30'
),
(
  'b0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  '2024-002',
  'US-35 Bridge Replacement',
  'BRIDGE',
  'ACTIVE',
  8500000.00,
  8500000.00,
  '2024-05-01',
  '2025-08-30'
),
(
  'b0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  '2024-003',
  'I-64 Widening Phase 2',
  'HIGHWAY',
  'MOBILIZATION',
  22000000.00,
  22000000.00,
  '2025-01-15',
  '2026-06-30'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Note: Subcontractor seed data requires the dbe_subcontractors and
-- subcontractors tables to exist. These tables are defined in migrations
-- 048_bid_intelligence.sql and 049_workforce_employees.sql but may not
-- be applied to the remote database.
--
-- The SubcontractorDashboard uses subcontract_agreements table from
-- migration 055_subcontractor_management.sql.
--
-- To populate full demo data:
-- 1. Ensure all migrations through 055 are applied to remote
-- 2. Create entries in the subcontractors table
-- 3. Run a follow-up migration for agreements/invoices
-- =============================================================================
