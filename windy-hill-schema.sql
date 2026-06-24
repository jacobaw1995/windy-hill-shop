-- =============================================================
-- WINDY HILL METAL SALES — SUPABASE SCHEMA
-- Paste this entire file into Supabase SQL Editor and click Run
-- Project: gnjpxtxufklhakobgzqv
-- Prepared by StructTech LLC
-- =============================================================

-- ============================================================
-- SECTION 1: CORE TABLES
-- ============================================================

create extension if not exists "uuid-ossp";

-- Roof systems (Ag Panel, Standing Seam)
create table systems (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  slug          text not null unique,
  hero_image_url text,
  tagline       text,
  description   text,
  display_order int default 0,
  active        boolean default true,
  created_at    timestamptz default now()
);

-- Checklist categories within each system
create table categories (
  id            uuid primary key default uuid_generate_v4(),
  system_id     uuid references systems(id) on delete cascade,
  name          text not null,
  slug          text not null,
  microcopy     text,
  image_url     text,
  required      boolean default false,
  badge         text default 'OPTIONAL',  -- REQUIRED / RECOMMENDED / OPTIONAL
  skip_label    text,
  display_order int default 0,
  active        boolean default true,
  created_at    timestamptz default now()
);

-- Individual products within each category
create table products (
  id            uuid primary key default uuid_generate_v4(),
  category_id   uuid references categories(id) on delete cascade,
  name          text not null,
  sku           text,
  description   text,
  gauge         text,
  image_url     text,
  unit_type     text default 'linear_foot',  -- linear_foot / each / bag / roll / square
  base_price    numeric(10,2),               -- NULL until price sheet entered
  active        boolean default true,
  display_order int default 0,
  created_at    timestamptz default now()
);

-- Windy Hill color palette
create table colors (
  id               uuid primary key default uuid_generate_v4(),
  name             text not null,
  hex_code         text,
  swatch_image_url text,
  active           boolean default true,
  display_order    int default 0,
  created_at       timestamptz default now()
);

-- Which products are available in which colors
create table product_colors (
  product_id     uuid references products(id) on delete cascade,
  color_id       uuid references colors(id) on delete cascade,
  price_modifier numeric(10,2) default 0,
  primary key (product_id, color_id)
);

-- Standard panel/trim length options
create table length_options (
  id            uuid primary key default uuid_generate_v4(),
  label         text not null,
  value_ft      numeric(5,2) not null,
  active        boolean default true,
  display_order int default 0
);

-- Which products support which lengths
create table product_lengths (
  product_id       uuid references products(id) on delete cascade,
  length_option_id uuid references length_options(id) on delete cascade,
  primary key (product_id, length_option_id)
);

-- ============================================================
-- SECTION 2: DRIVERS
-- ============================================================

create table drivers (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  email      text not null,
  phone      text,
  active     boolean default true,
  created_at timestamptz default now()
);

-- ============================================================
-- SECTION 3: APP SETTINGS (key-value store)
-- ============================================================

create table app_settings (
  key        text primary key,
  value      text,
  updated_at timestamptz default now()
);

-- ============================================================
-- SECTION 4: ORDERS
-- ============================================================

create table orders (
  id              uuid primary key default uuid_generate_v4(),
  order_number    text not null unique,
  order_date      timestamptz default now(),
  system          text,
  customer_name   text,
  customer_phone  text,
  customer_email  text,
  job_name        text,
  fulfillment     text,
  order_notes     text,
  order_total     numeric(10,2),
  status          text default 'pending',    -- pending / sent_to_driver / fulfilled
  webhook_fired   boolean default false,
  webhook_payload jsonb,
  created_at      timestamptz default now()
);

create table order_line_items (
  id            uuid primary key default uuid_generate_v4(),
  order_id      uuid references orders(id) on delete cascade,
  category      text,
  description   text,
  specs         text,
  amount        numeric(10,2),
  display_order int default 0
);

create table spec_files (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid references orders(id) on delete cascade,
  filename    text,
  storage_url text,
  description text,
  created_at  timestamptz default now()
);

-- ============================================================
-- SECTION 5: ROW LEVEL SECURITY
-- ============================================================

alter table systems          enable row level security;
alter table categories       enable row level security;
alter table products         enable row level security;
alter table colors           enable row level security;
alter table product_colors   enable row level security;
alter table length_options   enable row level security;
alter table product_lengths  enable row level security;
alter table drivers          enable row level security;
alter table app_settings     enable row level security;
alter table orders           enable row level security;
alter table order_line_items enable row level security;
alter table spec_files       enable row level security;

-- PUBLIC READ: catalog tables (customer app reads these)
create policy "Public can read systems"         on systems         for select using (true);
create policy "Public can read categories"      on categories      for select using (true);
create policy "Public can read products"        on products        for select using (true);
create policy "Public can read colors"          on colors          for select using (true);
create policy "Public can read product_colors"  on product_colors  for select using (true);
create policy "Public can read length_options"  on length_options  for select using (true);
create policy "Public can read product_lengths" on product_lengths for select using (true);

-- PUBLIC READ: limited settings (customer app needs webhook URL and Stripe key)
create policy "Public can read app_settings" on app_settings for select using (true);

-- CUSTOMER APP: can insert orders (no auth required — payment already verified by Stripe)
create policy "Anyone can insert orders"      on orders           for insert with check (true);
create policy "Anyone can insert line items"  on order_line_items for insert with check (true);
create policy "Anyone can insert spec files"  on spec_files       for insert with check (true);

-- ADMIN ONLY: full access for authenticated users (Jacob's admin panel)
create policy "Admin full access to systems"         on systems         for all using (auth.role() = 'authenticated');
create policy "Admin full access to categories"      on categories      for all using (auth.role() = 'authenticated');
create policy "Admin full access to products"        on products        for all using (auth.role() = 'authenticated');
create policy "Admin full access to colors"          on colors          for all using (auth.role() = 'authenticated');
create policy "Admin full access to product_colors"  on product_colors  for all using (auth.role() = 'authenticated');
create policy "Admin full access to length_options"  on length_options  for all using (auth.role() = 'authenticated');
create policy "Admin full access to product_lengths" on product_lengths for all using (auth.role() = 'authenticated');
create policy "Admin full access to drivers"         on drivers         for all using (auth.role() = 'authenticated');
create policy "Admin full access to app_settings"    on app_settings    for all using (auth.role() = 'authenticated');
create policy "Admin can read orders"                on orders          for select using (auth.role() = 'authenticated');
create policy "Admin can update orders"              on orders          for update using (auth.role() = 'authenticated');
create policy "Admin can read line items"            on order_line_items for select using (auth.role() = 'authenticated');
create policy "Admin can read spec files"            on spec_files      for select using (auth.role() = 'authenticated');

-- ============================================================
-- SECTION 6: SEED DATA
-- ============================================================

-- Systems
insert into systems (name, slug, tagline, description, display_order) values
  (
    'Ag Panel',
    'ag-panel',
    'Exposed fastener · Agricultural & residential · Most economical',
    'The workhorse of metal roofing. Ideal for barns, post-frame buildings, and residential applications. Durable, economical, and available in a full range of colors.',
    1
  ),
  (
    'Standing Seam',
    'standing-seam',
    'Hidden fastener · Premium appearance · Commercial & residential',
    'A concealed fastener system with a clean, architectural look. No exposed screws through panels. Ideal for residential, commercial, and high-end applications.',
    2
  );

-- Length options
insert into length_options (label, value_ft, display_order) values
  ('10''', 10,  1),
  ('12''', 12,  2),
  ('14''', 14,  3),
  ('16''', 16,  4),
  ('18''', 18,  5),
  ('20''', 20,  6),
  ('21''', 21,  7);

-- Colors (placeholder names — update with real Windy Hill names next week)
insert into colors (name, hex_code, display_order) values
  ('Galvalume',      '#c8c8c8', 1),
  ('Polar White',    '#f5f5f0', 2),
  ('Burnished Slate','#6b7280', 3),
  ('Charcoal Gray',  '#3f3f46', 4),
  ('Patina Green',   '#4a7c59', 5),
  ('Barn Red',       '#8b2020', 6),
  ('Rustic Red',     '#a0522d', 7),
  ('Ocean Blue',     '#1e4d8c', 8),
  ('Copper Penny',   '#b87333', 9),
  ('Aged Bronze',    '#6b4c2a', 10),
  ('Forest Green',   '#2d4a1e', 11),
  ('Musket Brown',   '#5c4a32', 12);

-- App settings
insert into app_settings (key, value) values
  ('business_name',           'Windy Hill Metal Sales'),
  ('business_phone',          '(765) 847-1480'),
  ('make_webhook_url',        'https://hook.us2.make.com/74e864u9l3ru1mpgri5ux18dl6vqh9bi'),
  ('docupilot_template_id',   '105011'),
  ('stripe_publishable_key',  ''),
  ('maintenance_mode',        'false');

-- Initial driver
insert into drivers (name, email, phone, active) values
  ('Jacob Walker', 'jacob@structtek.com', '(937) 467-2660', true);

-- ============================================================
-- SECTION 7: SEED CATEGORIES — AG PANEL SYSTEM
-- ============================================================

do $$
declare
  ag_id uuid;
  ss_id uuid;
begin

  select id into ag_id from systems where slug = 'ag-panel';
  select id into ss_id from systems where slug = 'standing-seam';

  -- AG PANEL CATEGORIES
  insert into categories (system_id, name, slug, microcopy, required, badge, skip_label, display_order) values

  (ag_id, 'Roofing Panels', 'ag-panels',
   'The main panel that covers your roof. Select gauge, color, and enter your run lengths.',
   true, 'REQUIRED', null, 1),

  (ag_id, 'Ridge Cap', 'ag-ridge-cap',
   'Seals the peak of your roof where both slopes meet. Required on any gable or hip roof.',
   true, 'REQUIRED', 'My roof has no ridge (shed roof)', 2),

  (ag_id, 'Eave Trim', 'ag-eave-trim',
   'Runs along the bottom edge of each roof slope. Directs water away from your fascia and into gutters.',
   true, 'REQUIRED', null, 3),

  (ag_id, 'Rake / Gable Trim', 'ag-rake-trim',
   'Runs up the sloped edge at each gable end. Seals panel edges from wind and moisture.',
   false, 'RECOMMENDED', 'Hip roof — I need Hip Cap instead', 4),

  (ag_id, 'Hip Cap', 'ag-hip-cap',
   'Covers the angled ridge where two roof planes meet on a hip roof. Only needed on hip-style roofs.',
   false, 'OPTIONAL', 'My roof is not a hip roof', 5),

  (ag_id, 'Valley Flashing', 'ag-valley',
   'Installed where two roof slopes meet at an inward angle. Critical for preventing leaks at the valley.',
   false, 'OPTIONAL', 'My roof has no valleys', 6),

  (ag_id, 'Closure Strips', 'ag-closures',
   'Foam strips that fill the gap between panel corrugations and trim pieces. Keeps out insects, weather, and debris.',
   true, 'REQUIRED', null, 7),

  (ag_id, 'Fasteners', 'ag-fasteners',
   'Color-matched hex-head screws with EPDM rubber washers. One screw per rib per purlin.',
   true, 'REQUIRED', null, 8),

  (ag_id, 'Sealant & Tape', 'ag-sealant',
   'Butyl tape runs under your ridge cap and trim overlaps. Essential for a watertight seal.',
   false, 'RECOMMENDED', null, 9),

  (ag_id, 'Custom Trims', 'ag-custom',
   'Need a trim piece we haven''t listed? Draw your profile or upload a spec drawing — our brake press will fabricate it.',
   false, 'OPTIONAL', null, 10);

  -- STANDING SEAM CATEGORIES
  insert into categories (system_id, name, slug, microcopy, required, badge, skip_label, display_order) values

  (ss_id, 'Standing Seam Panels', 'ss-panels',
   'The main panel with concealed fastener seams. Select gauge, panel width, color, and enter your run lengths.',
   true, 'REQUIRED', null, 1),

  (ss_id, 'Panel Clips', 'ss-clips',
   'Hidden fasteners that hold panels to your roof deck without exposed screws. Fixed clips at eave, floating clips throughout.',
   true, 'REQUIRED', null, 2),

  (ss_id, 'Ridge Cap', 'ss-ridge-cap',
   'Specially profiled to clear the raised seam legs. Seals the peak of your roof.',
   true, 'REQUIRED', 'My roof has no ridge (shed roof)', 3),

  (ss_id, 'Z-Flashing / Z-Closure', 'ss-z-flashing',
   'Required at the ridge for standing seam — allows the ridge cap to attach without exposed screws through the panel seams.',
   true, 'REQUIRED', null, 4),

  (ss_id, 'Eave Trim', 'ss-eave-trim',
   'Runs along the bottom edge. Interfaces with gutters and directs water away from the fascia.',
   true, 'REQUIRED', null, 5),

  (ss_id, 'Rake / Gable Trim', 'ss-rake-trim',
   'Finishes the sloped edge at each gable end. Engineered to work with the standing seam profile.',
   false, 'RECOMMENDED', 'Hip roof — I need Hip Cap instead', 6),

  (ss_id, 'Hip Cap', 'ss-hip-cap',
   'Covers the angled ridge on a hip roof. Profiled for standing seam panel legs.',
   false, 'OPTIONAL', 'My roof is not a hip roof', 7),

  (ss_id, 'Valley Flashing', 'ss-valley',
   'Where two roof slopes meet at an inward angle. Engineered for standing seam compatibility.',
   false, 'OPTIONAL', 'My roof has no valleys', 8),

  (ss_id, 'Closure Strips', 'ss-closures',
   'Foam closures fill the gap between panel legs and trim at the eave and ridge.',
   true, 'REQUIRED', null, 9),

  (ss_id, 'Underlayment', 'ss-underlayment',
   'Synthetic roofing underlayment installed under panels on solid deck applications. Recommended for all residential installs.',
   false, 'RECOMMENDED', 'Purlin mount — no solid deck', 10),

  (ss_id, 'Fasteners', 'ss-fasteners',
   'Clip screws (gimlet/pancake head) for attaching clips to the roof deck. Panel end-lap screws where panels overlap.',
   true, 'REQUIRED', null, 11),

  (ss_id, 'Sealant & Tape', 'ss-sealant',
   'Butyl tape for trim overlaps and end laps. EPDM sealant tape for exposed fastener points.',
   false, 'RECOMMENDED', null, 12),

  (ss_id, 'Custom Trims', 'ss-custom',
   'Non-standard profiles, specialty flashings, or any trim not listed. Draw or upload your spec.',
   false, 'OPTIONAL', null, 13);

end $$;

-- ============================================================
-- SECTION 8: SEED PRODUCTS (prices NULL until price sheet received)
-- ============================================================

do $$
declare
  -- Ag Panel category IDs
  cat_ag_panels    uuid;
  cat_ag_ridge     uuid;
  cat_ag_eave      uuid;
  cat_ag_rake      uuid;
  cat_ag_hip       uuid;
  cat_ag_valley    uuid;
  cat_ag_closures  uuid;
  cat_ag_fasteners uuid;
  cat_ag_sealant   uuid;
  cat_ag_custom    uuid;
  -- Standing Seam category IDs
  cat_ss_panels    uuid;
  cat_ss_clips     uuid;
  cat_ss_ridge     uuid;
  cat_ss_zflash    uuid;
  cat_ss_eave      uuid;
  cat_ss_rake      uuid;
  cat_ss_hip       uuid;
  cat_ss_valley    uuid;
  cat_ss_closures  uuid;
  cat_ss_underlay  uuid;
  cat_ss_fasteners uuid;
  cat_ss_sealant   uuid;
  cat_ss_custom    uuid;
begin

  -- Get Ag Panel category IDs
  select id into cat_ag_panels    from categories where slug = 'ag-panels';
  select id into cat_ag_ridge     from categories where slug = 'ag-ridge-cap';
  select id into cat_ag_eave      from categories where slug = 'ag-eave-trim';
  select id into cat_ag_rake      from categories where slug = 'ag-rake-trim';
  select id into cat_ag_hip       from categories where slug = 'ag-hip-cap';
  select id into cat_ag_valley    from categories where slug = 'ag-valley';
  select id into cat_ag_closures  from categories where slug = 'ag-closures';
  select id into cat_ag_fasteners from categories where slug = 'ag-fasteners';
  select id into cat_ag_sealant   from categories where slug = 'ag-sealant';
  select id into cat_ag_custom    from categories where slug = 'ag-custom';

  -- Get Standing Seam category IDs
  select id into cat_ss_panels    from categories where slug = 'ss-panels';
  select id into cat_ss_clips     from categories where slug = 'ss-clips';
  select id into cat_ss_ridge     from categories where slug = 'ss-ridge-cap';
  select id into cat_ss_zflash    from categories where slug = 'ss-z-flashing';
  select id into cat_ss_eave      from categories where slug = 'ss-eave-trim';
  select id into cat_ss_rake      from categories where slug = 'ss-rake-trim';
  select id into cat_ss_hip       from categories where slug = 'ss-hip-cap';
  select id into cat_ss_valley    from categories where slug = 'ss-valley';
  select id into cat_ss_closures  from categories where slug = 'ss-closures';
  select id into cat_ss_underlay  from categories where slug = 'ss-underlayment';
  select id into cat_ss_fasteners from categories where slug = 'ss-fasteners';
  select id into cat_ss_sealant   from categories where slug = 'ss-sealant';
  select id into cat_ss_custom    from categories where slug = 'ss-custom';

  -- ---- AG PANEL PRODUCTS ----

  insert into products (category_id, name, sku, gauge, unit_type, base_price, display_order) values
    (cat_ag_panels, 'Ag Panel 29ga',       'AGP-29', '29ga', 'linear_foot', null, 1),
    (cat_ag_panels, 'Ag Panel 26ga',       'AGP-26', '26ga', 'linear_foot', null, 2);

  insert into products (category_id, name, sku, unit_type, base_price, display_order) values
    (cat_ag_ridge,     'Ridge Cap',                    'RC-AG',    'linear_foot', null, 1),
    (cat_ag_eave,      'Eave Trim',                    'ET-AG',    'linear_foot', null, 1),
    (cat_ag_rake,      'Rake / Gable Trim',            'RT-AG',    'linear_foot', null, 1),
    (cat_ag_hip,       'Hip Cap',                      'HC-AG',    'linear_foot', null, 1),
    (cat_ag_valley,    'Valley Flashing',              'VF-AG',    'linear_foot', null, 1),
    (cat_ag_closures,  'Inside Closure Strips',        'CS-IN',    'linear_foot', null, 1),
    (cat_ag_closures,  'Outside Closure Strips',       'CS-OUT',   'linear_foot', null, 2),
    (cat_ag_fasteners, '1" Roofing Screws (250/bag)',  'FS-1-250', 'bag',         null, 1),
    (cat_ag_fasteners, '1.5" Roofing Screws (250/bag)','FS-15-250','bag',         null, 2),
    (cat_ag_fasteners, '2.5" Roofing Screws (250/bag)','FS-25-250','bag',         null, 3),
    (cat_ag_fasteners, 'Trim Screws (250/bag)',        'FS-TR-250','bag',         null, 4),
    (cat_ag_sealant,   'Butyl Tape (roll)',            'BT-ROLL',  'roll',        null, 1),
    (cat_ag_sealant,   'Caulk / Sealant (tube)',       'CK-TUBE',  'each',        null, 2),
    (cat_ag_custom,    'Custom Brake-Formed Trim',     'CB-CUSTOM','linear_foot', null, 1);

  -- ---- STANDING SEAM PRODUCTS ----

  insert into products (category_id, name, sku, gauge, unit_type, base_price, display_order) values
    (cat_ss_panels, 'Standing Seam 26ga — 12" panel', 'SSP-26-12', '26ga', 'linear_foot', null, 1),
    (cat_ss_panels, 'Standing Seam 26ga — 16" panel', 'SSP-26-16', '26ga', 'linear_foot', null, 2),
    (cat_ss_panels, 'Standing Seam 24ga — 12" panel', 'SSP-24-12', '24ga', 'linear_foot', null, 3),
    (cat_ss_panels, 'Standing Seam 24ga — 16" panel', 'SSP-24-16', '24ga', 'linear_foot', null, 4);

  insert into products (category_id, name, sku, unit_type, base_price, display_order) values
    (cat_ss_clips,     'Fixed Clip',                       'CL-FIX',   'each',        null, 1),
    (cat_ss_clips,     'Floating / Expansion Clip',        'CL-FLT',   'each',        null, 2),
    (cat_ss_clips,     'Clip Screws — Gimlet Head (100pk)','CL-SCR',   'each',        null, 3),
    (cat_ss_ridge,     'Standing Seam Ridge Cap',          'RC-SS',    'linear_foot', null, 1),
    (cat_ss_zflash,    'Z-Flashing / Z-Closure',          'ZF-SS',    'linear_foot', null, 1),
    (cat_ss_eave,      'Eave Trim',                        'ET-SS',    'linear_foot', null, 1),
    (cat_ss_rake,      'Rake / Gable Trim',                'RT-SS',    'linear_foot', null, 1),
    (cat_ss_hip,       'Hip Cap',                          'HC-SS',    'linear_foot', null, 1),
    (cat_ss_valley,    'Valley Flashing',                  'VF-SS',    'linear_foot', null, 1),
    (cat_ss_closures,  'Inside Foam Closures',             'CS-SS-IN', 'linear_foot', null, 1),
    (cat_ss_closures,  'Outside Foam Closures',            'CS-SS-OUT','linear_foot', null, 2),
    (cat_ss_underlay,  'Synthetic Underlayment (square)',  'UL-SYN',   'square',      null, 1),
    (cat_ss_underlay,  'Ice & Water Shield (linear ft)',   'UL-ICE',   'linear_foot', null, 2),
    (cat_ss_fasteners, 'Gimlet Head Clip Screws (100pk)', 'FS-GH-100','each',        null, 1),
    (cat_ss_fasteners, 'End-Lap Screws (100pk)',          'FS-EL-100','each',        null, 2),
    (cat_ss_sealant,   'Butyl Tape (roll)',               'BT-ROLL',  'roll',        null, 1),
    (cat_ss_sealant,   'EPDM Sealant Tape (roll)',        'ST-EPDM',  'roll',        null, 2),
    (cat_ss_custom,    'Custom Brake-Formed Trim',        'CB-CUSTOM','linear_foot', null, 1);

end $$;

-- ============================================================
-- SECTION 9: STORAGE BUCKETS
-- (Run these separately in Supabase Storage tab if SQL fails)
-- ============================================================

insert into storage.buckets (id, name, public) values
  ('product-photos', 'product-photos', true),
  ('spec-files',     'spec-files',     false)
on conflict (id) do nothing;

-- Public read on product photos
create policy "Public can view product photos"
  on storage.objects for select
  using (bucket_id = 'product-photos');

-- Admin can upload product photos
create policy "Admin can upload product photos"
  on storage.objects for insert
  with check (bucket_id = 'product-photos' and auth.role() = 'authenticated');

-- Admin can delete product photos
create policy "Admin can delete product photos"
  on storage.objects for delete
  using (bucket_id = 'product-photos' and auth.role() = 'authenticated');

-- Customer app can upload spec files (no auth needed — happens at checkout)
create policy "Anyone can upload spec files"
  on storage.objects for insert
  with check (bucket_id = 'spec-files');

-- Admin can read spec files
create policy "Admin can read spec files"
  on storage.objects for select
  using (bucket_id = 'spec-files' and auth.role() = 'authenticated');

-- ============================================================
-- DONE — Verify with:
-- select count(*) from systems;          -- should be 2
-- select count(*) from categories;       -- should be 23 (10 ag + 13 ss)
-- select count(*) from products;         -- should be 33
-- select count(*) from colors;           -- should be 12
-- select count(*) from length_options;   -- should be 7
-- select * from drivers;                 -- should show jacob@structtek.com
-- select key, value from app_settings;   -- should show 6 rows
-- ============================================================
