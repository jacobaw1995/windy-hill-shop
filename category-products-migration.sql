-- Run in Supabase SQL Editor
-- Creates the category_products join table for system-specific product availability

CREATE TABLE IF NOT EXISTS category_products (
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES products(id)   ON DELETE CASCADE,
  PRIMARY KEY (category_id, product_id)
);

-- Allow authenticated users (admin) to read/write
ALTER TABLE category_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read"  ON category_products FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert" ON category_products FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete" ON category_products FOR DELETE USING (auth.role() = 'authenticated');

-- Allow anon read so the shop configurator can filter products
CREATE POLICY "Allow anon read" ON category_products FOR SELECT TO anon USING (true);
