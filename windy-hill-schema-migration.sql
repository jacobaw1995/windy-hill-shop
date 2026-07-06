-- =============================================================
-- WINDY HILL — SCHEMA MIGRATION: Flat Catalog Architecture
-- Run this FIRST in Supabase SQL Editor, before the catalog import.
-- =============================================================
-- What this does:
--   1. Drops category_id FK from products (products become system-agnostic)
--   2. Adds product_type, catalog_section, compatible_systems[] to products
--   3. Adds catalog_section to categories (wizard steps filter by this)
--   4. Sets catalog_section on all existing categories
-- =============================================================

BEGIN;

-- ── 1. Update products table ─────────────────────────────────────────────────

-- Drop the category FK (products are now a flat catalog, not nested under categories)
ALTER TABLE products DROP COLUMN IF EXISTS category_id;

-- Add catalog / tagging columns
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS product_type        text,
  ADD COLUMN IF NOT EXISTS catalog_section     text,
  ADD COLUMN IF NOT EXISTS compatible_systems  text[] DEFAULT '{}';

-- Index for fast wizard lookups
CREATE INDEX IF NOT EXISTS idx_products_catalog_section ON products (catalog_section);
CREATE INDEX IF NOT EXISTS idx_products_compatible_systems ON products USING GIN (compatible_systems);

-- ── 2. Update categories table ───────────────────────────────────────────────

-- Wizard steps now declare which catalog_section they display
ALTER TABLE categories ADD COLUMN IF NOT EXISTS catalog_section text;

-- ── 3. Set catalog_section on all existing categories ────────────────────────

-- AG PANEL wizard steps
UPDATE categories SET catalog_section = 'panel'       WHERE slug = 'ag-panels';
UPDATE categories SET catalog_section = 'ridge_cap'   WHERE slug = 'ag-ridge-cap';
UPDATE categories SET catalog_section = 'eave_trim'   WHERE slug = 'ag-eave-trim';
UPDATE categories SET catalog_section = 'rake_trim'   WHERE slug = 'ag-rake-trim';
UPDATE categories SET catalog_section = 'hip_cap'     WHERE slug = 'ag-hip-cap';
UPDATE categories SET catalog_section = 'valley'      WHERE slug = 'ag-valley';
UPDATE categories SET catalog_section = 'closure'     WHERE slug = 'ag-closures';
UPDATE categories SET catalog_section = 'fastener'    WHERE slug = 'ag-fasteners';
UPDATE categories SET catalog_section = 'sealant'     WHERE slug = 'ag-sealant';
UPDATE categories SET catalog_section = 'misc'        WHERE slug = 'ag-custom';

-- STANDING SEAM wizard steps
UPDATE categories SET catalog_section = 'panel'       WHERE slug = 'ss-panels';
UPDATE categories SET catalog_section = 'clip'        WHERE slug = 'ss-clips';
UPDATE categories SET catalog_section = 'ridge_cap'   WHERE slug = 'ss-ridge-cap';
UPDATE categories SET catalog_section = 'z_bar'       WHERE slug = 'ss-z-flashing';
UPDATE categories SET catalog_section = 'eave_trim'   WHERE slug = 'ss-eave-trim';
UPDATE categories SET catalog_section = 'rake_trim'   WHERE slug = 'ss-rake-trim';
UPDATE categories SET catalog_section = 'hip_cap'     WHERE slug = 'ss-hip-cap';
UPDATE categories SET catalog_section = 'valley'      WHERE slug = 'ss-valley';
UPDATE categories SET catalog_section = 'closure'     WHERE slug = 'ss-closures';
UPDATE categories SET catalog_section = 'underlayment' WHERE slug = 'ss-underlayment';
UPDATE categories SET catalog_section = 'fastener'    WHERE slug = 'ss-fasteners';
UPDATE categories SET catalog_section = 'sealant'     WHERE slug = 'ss-sealant';
UPDATE categories SET catalog_section = 'misc'        WHERE slug = 'ss-custom';

-- ── 4. RLS: allow public read on the new columns (policies already cover the table) ──
-- No changes needed — existing SELECT policies cover all columns.

COMMIT;

-- Verify:
-- SELECT slug, catalog_section FROM categories ORDER BY system_id, display_order;
-- SELECT column_name FROM information_schema.columns WHERE table_name='products' ORDER BY ordinal_position;
