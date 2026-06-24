# Windy Hill Metal Sales — Claude Code Build Spec (FINAL)
**StructTech LLC** | Updated June 16, 2026 | Hand this to Claude Code at the start of each session.

> **Pre-dev review completed June 15, 2026. All blockers resolved.**
> **Updated June 15, 2026: Customer account portal (Tier 2) added — Session 9. Tier 3 (reports, cancel/modify) scoped as Phase 2.**
> **Updated June 16, 2026: Hover Report Import Wizard added — Session 10. Edits `windy-hill-configurator.html` only. No schema changes.**

---

## Project Overview

Building an online ordering system for Windy Hill Metal Sales — an Amish-owned metal roofing supply company with no online presence. The platform lives at `shop.thecontractingcompany.com` and lets customers configure and purchase roofing material packages for two systems: **Ag Panel** and **Standing Seam**.

**Three-way partnership:** Windy Hill (product supplier) · The Contracting Company (host/distribution) · StructTech LLC (builder/maintainer)

**Business model:** 20% gross margin between wholesale and retail, split 50/50 between StructTech and The Contracting Company. Monthly retainer ~$275–300.

---

## What's Already Done

✅ **Supabase database is live and seeded.**
- Project ID: `gnjpxtxufklhakobgzqv`
- Anon key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduanB4dHh1ZmtsaGFrb2JnenF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NTk2MTgsImV4cCI6MjA5NzEzNTYxOH0.Z_kveDZp4Zi7SV4pl_6UJ3yx1vpsbDv75KP0HkW3cDU`
- All 12 tables created with RLS policies
- Storage buckets: `product-photos` (public) and `spec-files` (private — admin read only)
- Seeded: 2 systems · 23 checklist categories · 38 products (null prices) · 12 colors · 7 length options · 1 driver record · app_settings

✅ **Architecture decided:** Two self-contained HTML files, no build process, deploy via Netlify drag-and-drop.

✅ **Order flow decided:** Option 3 — Visual Checklist with Live Cart (two-panel layout).

✅ **Storage decided:** Supabase Storage (not Cloudflare R2, not Netlify Blobs).

---

## ⚠ Jacob Action Items (do these before the relevant sessions)

| When | Action |
|------|--------|
| **Now** | Run this SQL in Supabase SQL Editor (adds driver_email setting + customer_id column + customer RLS policies — see Customer Portal SQL below) |
| **Before Session 5** | Supabase dashboard → Authentication → Users → Invite user → `jacob@structtek.com` → set a password. Admin panel login fails without this. |
| **Before Session 4** | Create Stripe account at stripe.com under jacob@structtek.com. Add Windy Hill bank as payout destination (Settings → Bank accounts). Enter live publishable key in admin panel → Settings after Session 5 ships. |
| **Before Session 9** | Supabase dashboard → Authentication → Settings → Enable "Email confirmations" and set Site URL to `shop.thecontractingcompany.com`. Customers get a confirmation email on sign-up. |

---

## Three Files to Build

```
windy-hill-configurator.html   ← Customer-facing ordering app   (shop.thecontractingcompany.com)
windy-hill-account.html        ← Customer account portal        (shop.thecontractingcompany.com/account)
windy-hill-admin.html          ← Admin panel                    (admin.structtek.com)
```

**Deployment note:** Configurator and account portal deploy to the same Netlify site (same domain). Admin deploys as a separate Netlify site. Rename configurator to `index.html` at deploy time and place `windy-hill-account.html` alongside it, or use a `_redirects` file. Without an index, root domain returns 404.

All three are single self-contained HTML/CSS/JS files. No frameworks, no build step, no node_modules.

---

## Tech Stack (CDN imports only)

```html
<!-- Supabase JS -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- Stripe.js (loaded on demand before checkout) -->
<script src="https://js.stripe.com/v3/"></script>

<!-- Fabric.js (custom trim draw canvas) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js"></script>

<!-- Tailwind CSS -->
<script src="https://cdn.tailwindcss.com"></script>
```

---

## Supabase Connection (always at top of script)

```javascript
const SUPABASE_URL = 'https://gnjpxtxufklhakobgzqv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduanB4dHh1ZmtsaGFrb2JnenF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NTk2MTgsImV4cCI6MjA5NzEzNTYxOH0.Z_kveDZp4Zi7SV4pl_6UJ3yx1vpsbDv75KP0HkW3cDU';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

---

## Visual Design Reference — Entry Screen

**Match this layout for the configurator's landing/entry screen:**

**Header/Nav:**
- Top bar: Windy Hill Metal Sales logo (left), nav links — Home · About · Shop · Contact (center), "View Cart" button (top right)
- Nav background: white with subtle bottom border
- "View Cart" button: dark navy background (`#1a2d4f`), white text

**Hero Banner:**
- Full-width dark overlay on a rustic barn metal roof photo
- Large bold white heading: `PREMIUM ROOF MATERIALS`
- Subtitle text: "Shop our complete selection of metal panels, trim pieces, fasteners, and sealants for your home and farm."
- Banner height ~240px, text left-aligned with padding

**Product Selection Section:**
- Section heading: `OUR PRODUCTS` — centered, rust/brown color (`#7a3020`), letter-spaced, bold
- Two cards side by side (equal width, ~48% each, gap between)
- Each card:
  - Product photo at top (landscape, ~300px tall)
  - Card title: bold dark text
  - 2–3 line description in gray body text
  - CTA button: rust/brown background (`#7a3020`), white text, rounded
  - Left card: **Standing Seam Roof System** — button: "Shop Materials"
  - Right card: **Ag Panel Roof System** — button: "Browse Full Selection"
- Page background: off-white/cream (`#f5f0eb`)
- Cards: white background, subtle box shadow, slightly rounded corners

**Footer:**
- Dark navy background (`#1a2d4f`)
- Left: `© ${new Date().getFullYear()} Windy Hill Metals` (auto-generated year, white text)
- Right: StructTech logo

**Colors to use throughout the app:**
- Primary action / headings: `#7a3020` (rust/barn red)
- Navy (header CTA, footer): `#1a2d4f`
- Background: `#f5f0eb` (off-white)
- Card background: `#ffffff`
- Body text: `#374151` (Tailwind gray-700)
- Muted text: `#6b7280` (Tailwind gray-500)
- Success green: `#16a34a`
- Warning amber: `#d97706`

When a system button is clicked, the entry screen slides away (or fades) and the two-panel configurator takes over — same shell (header/footer stay), but the hero is replaced by the checklist + cart layout.

---

## Database Schema (Reference)

All tables already exist. Here's the structure Claude Code needs to know to query correctly:

**`systems`** — 2 rows (Ag Panel, Standing Seam)
- `id`, `name`, `slug`, `hero_image_url`, `tagline`, `description`, `display_order`, `active`

**`categories`** — 23 rows (10 Ag Panel + 13 Standing Seam)
- `id`, `system_id` (FK), `name`, `slug`, `microcopy`, `image_url`, `required`, `badge` (REQUIRED/RECOMMENDED/OPTIONAL), `skip_label`, `display_order`, `active`

**`products`** — 38 rows
- `id`, `category_id` (FK), `name`, `sku`, `description`, `gauge`, `image_url`, `unit_type` (linear_foot/each/bag/roll/square), `base_price` (nullable — null until pricing entered), `active`, `display_order`

**`colors`** — 12 rows
- `id`, `name`, `hex_code`, `swatch_image_url`, `active`, `display_order`

**`product_colors`** — junction: `product_id`, `color_id`, `price_modifier`

**`length_options`** — 7 rows (10' through 21')
- `id`, `label`, `value_ft`, `active`, `display_order`

**`product_lengths`** — junction: `product_id`, `length_option_id`

**`orders`** — `id`, `order_number`, `order_date`, `system`, `customer_name`, `customer_phone`, `customer_email`, `job_name`, `fulfillment`, `order_notes`, `order_total`, `status`, `webhook_fired`, `webhook_payload`, `created_at`

**`order_line_items`** — `id`, `order_id` (FK), `category`, `description`, `specs`, `amount`, `display_order`

**`spec_files`** — `id`, `order_id` (FK), `filename`, `storage_url`, `description`, `created_at`

**`app_settings`** — key/value store: `key`, `value`
- Keys: `business_name`, `business_phone`, `make_webhook_url`, `docupilot_template_id`, `stripe_publishable_key`, `maintenance_mode`, `driver_email`

**`drivers`** — `id`, `name`, `email`, `phone`, `active`, `created_at`

**`customers`** — view only (Supabase Auth manages the actual user records in `auth.users`)
- Customer accounts are created via Supabase Auth (`supabase.auth.signUp`)
- Orders are linked to customers via `orders.customer_id` (UUID FK to `auth.users.id`)
- No separate `customers` table needed — Auth provides `id`, `email`, `created_at`

### Customer Portal SQL — Run Now in Supabase SQL Editor

```sql
-- 1. Add driver_email to app_settings
insert into app_settings (key, value)
values ('driver_email', 'jacob@structtek.com')
on conflict (key) do nothing;

-- 2. Add customer_id to orders (links authenticated customers to their orders)
alter table orders
  add column if not exists customer_id uuid references auth.users(id);

-- 3. RLS: customers can read their own orders (matched by user ID or email fallback)
create policy "Customers can read own orders"
  on orders for select
  using (
    auth.uid() = customer_id
    or customer_email = (select email from auth.users where id = auth.uid())
  );

-- 4. RLS: customers can read line items for their own orders
create policy "Customers can read own line items"
  on order_line_items for select
  using (
    order_id in (
      select id from orders
      where customer_id = auth.uid()
         or customer_email = (select email from auth.users where id = auth.uid())
    )
  );

-- 5. RLS: customers can read spec files for their own orders
create policy "Customers can read own spec files"
  on spec_files for select
  using (
    order_id in (
      select id from orders
      where customer_id = auth.uid()
         or customer_email = (select email from auth.users where id = auth.uid())
    )
  );
```

### The one-shot catalog load query

**Important:** Sort nested relations client-side after load — Supabase nested selects do not respect `order()` on joined tables.

```javascript
async function loadCatalog() {
  const { data: systems, error } = await supabase
    .from('systems')
    .select(`
      *,
      categories (
        *,
        products (
          *,
          product_colors ( colors(*) ),
          product_lengths ( length_options(*) )
        )
      )
    `)
    .eq('active', true)
    .order('display_order');

  if (error) { showError(error); return; }

  // Sort nested relations by display_order client-side
  systems.forEach(sys => {
    sys.categories = (sys.categories || [])
      .filter(c => c.active)
      .sort((a, b) => a.display_order - b.display_order);
    sys.categories.forEach(cat => {
      cat.products = (cat.products || [])
        .filter(p => p.active)
        .sort((a, b) => a.display_order - b.display_order);
    });
  });

  buildEntryScreen(systems);
}
```

Also load app settings at startup:
```javascript
async function loadSettings() {
  const { data } = await supabase.from('app_settings').select('*');
  return Object.fromEntries(data.map(r => [r.key, r.value]));
}
```

---

## Core State Object

Initialize fresh on system selection:

```javascript
let state = {
  system: null,           // 'ag-panel' | 'standing-seam'
  systemData: null,       // full system record from Supabase
  catalog: null,          // full nested catalog from loadCatalog()
  settings: null,         // app_settings key/value object
  checklist: {},          // keyed by category.id
  cart: [],               // flat array of line items for display/webhook
  order_total: 0,
  specFiles: [],          // custom trim uploads
  customer: {}            // filled at checkout
};

// Checklist entry per category:
// state.checklist[categoryId] = {
//   status: 'pending' | 'complete' | 'skipped',
//   items: []   ← array of line item objects
// }
```

---

## Order Flow — Option 3 (Visual Checklist + Live Cart)

### Two-panel layout
```
┌──────────────────────────────────────────────────────────────────┐
│ [Windy Hill Logo]   Home · About · Shop · Contact   [View Cart]  │
├──────────────────────────────────────────────────────────────────┤
│ AG PANEL ROOFING SYSTEM                    ← Back to Start       │
├──────────────────────────┬───────────────────────────────────────┤
│  COMPONENT CHECKLIST     │  YOUR ORDER                           │
│                          │                                        │
│  ✅ Panels    REQUIRED   │  Ag Panel 29ga — Barn Red             │
│  ✅ Ridge Cap REQUIRED   │    16ft × 8 panels       $236.80      │
│  ○ Eave Trim  REQUIRED   │  Ridge Cap — Barn Red                 │
│  ○ Rake Trim  RECOMMENDED│    40 linear ft           $96.00      │
│  ○ Valley     OPTIONAL   │  ─────────────────────────────────    │
│  ○ Closures   REQUIRED   │  Subtotal                 $332.80     │
│  ○ Fasteners  REQUIRED   │                                        │
│  ○ Custom     OPTIONAL   │  ⚠ 3 required items pending           │
│                          │                                        │
│                          │  [PROCEED TO CHECKOUT →]              │
└──────────────────────────┴───────────────────────────────────────┘
```

**Card states:**
- `pending` — gray, not started, shows [Add +] button
- `complete` — green checkmark, collapsed, shows summary line (e.g. "40 lf — $96.00"), click to re-edit
- `skipped` — gray with strikethrough, shows skip label, click to undo

**Card expand/collapse:**
- Click card header to expand (also keyboard: Enter/Space on focused card)
- Expanded card shows: product photo, description, form fields
- Fields vary by category (see Category Field Types below)
- "Add to Order" button commits the entry and collapses
- "I do not need this ☐" checkbox skips (requires checkbox be checked to confirm)

### Category Field Types

**Panels (ag-panels, ss-panels):**
- Gauge selector (radio or dropdown — pulled from products in this category)
- Color picker (color swatches from product_colors join — each swatch needs `aria-label="[Color Name]"` for accessibility)
- Runs table: multi-row entry, each row = [Length dropdown] × [Qty input]
- [+ Add Run] button adds rows

**Linear footage items (trim, ridge, eave, valley, z-flashing, underlayment):**
- Color picker (if product has colors)
- Linear footage input (number, ft)
- Live price preview: "X ft × $Y.YY/ft = $Z.ZZ"

**Closure strips:**
- Inside closure linear footage
- Outside closure linear footage

**Clips (ss-clips):**
- Fixed clip qty
- Floating clip qty

**Fasteners:**
- Screw size (dropdown: 1", 1.5", 2.5")
- Bags of roofing screws (number)
- Bags of trim screws (number)
- Rolls of butyl tape (number)

**Custom trims (bottom of checklist):**
- Draw tool button → opens Fabric.js canvas modal
- Upload button → file input (PNG, JPG, PDF)
- Description text area
- Linear footage estimate

### Null Price Handling

If `base_price` is null on a product:
- Show the product, but price column shows "—"
- Running total in cart shows "Pricing Pending" for those items
- Checkout button shows: "Some items are missing pricing — call (765) 847-1480 to order by phone."
- Do not hard-block checkout — let customer proceed if they want, just warn.

### Stripe Key Empty Handling

If `state.settings.stripe_publishable_key` is empty or null:
- Do not attempt to load Stripe Elements (it will throw a cryptic error)
- Instead show: "Online payment is not yet configured. Please call (765) 847-1480 to place your order."
- This allows the app to be live and reviewed before Stripe is set up.

### Checkout Gate

```javascript
function validateCheckout() {
  const warnings = [];
  const categories = state.systemData.categories;

  categories.filter(c => c.required).forEach(cat => {
    const status = state.checklist[cat.id]?.status;
    if (!status || status === 'pending') {
      warnings.push(`${cat.name} has not been added or skipped.`);
    }
  });

  if (state.cart.length === 0) warnings.push('Your order is empty.');
  return { valid: warnings.length === 0, warnings };
}
// Warnings show in cart panel but don't hard-block.
// Customer can click "I know what I'm doing →" to override.
```

---

## Checkout + Payment Flow

1. Customer clicks "Proceed to Checkout"
2. **Customer info modal** slides up:
   - First/Last name
   - Phone number
   - Email address
   - Job name (optional)
   - Pickup or Delivery (radio)
   - Order notes (textarea)
   - All form fields: `aria-describedby` pointing to their error message element
   - [Continue to Payment →]
3. **Stripe payment** (Stripe Elements card field):
   - Load Stripe publishable key from `app_settings` (fetched at startup)
   - If key is empty → show "call to order" message (do not load Stripe)
   - Amount = order_total in cents
   - On success → proceed to processing
4. **Processing animation** — **order of operations matters for data integrity:**
   - Step 1: "Uploading your specifications..." → `uploadSpecFiles()` (if spec files exist)
   - Step 2: "Preparing your work order..." → `buildWebhookPayload()` + **write order to Supabase first** (get the DB order ID before webhook fires)
   - Step 3: "Notifying your driver..." → `POST` webhook payload (including Supabase order ID) to Make.com
   - Step 4: "Sending your confirmation..." → update order `webhook_fired = true` in Supabase
   - Each step shows checkmark when complete
5. **Success modal:**
   - "Order Confirmed! #WH-XXXXX"
   - Work order summary (all line items)
   - "A confirmation email is on its way to [email]"

---

## Webhook Payload Builder

```javascript
function buildWebhookPayload(customerInfo, supabaseOrderId) {
  return {
    order_number:   `WH-${Date.now()}`,          // full timestamp = zero collision risk
    order_id:       supabaseOrderId,              // Supabase UUID for admin cross-reference
    order_date:     new Date().toLocaleDateString('en-US'),
    customer_name:  `${customerInfo.fname} ${customerInfo.lname}`,
    customer_phone: customerInfo.phone,
    customer_email: customerInfo.email,
    job_name:       customerInfo.jobName || '',
    fulfillment:    customerInfo.fulfillment,
    order_notes:    customerInfo.notes || '',
    order_total:    state.order_total.toFixed(2),
    system:         state.system,
    driver_email:   state.settings.driver_email,  // Make.com uses this for Module 3 Gmail routing
    line_items: state.cart.map(item => ({
      description: item.description,
      specs:       item.specs,
      category:    item.category,
      amount:      `$${item.line_total.toFixed(2)}`
    })),
    spec_files: state.specFiles.map(f => ({
      filename:    f.filename,
      url:         f.storageUrl,   // public URL from product-photos bucket, specs/ prefix
      description: f.description
    }))
  };
}
```

**Webhook URL:** loaded from `app_settings.make_webhook_url` (currently `https://hook.us2.make.com/74e864u9l3ru1mpgri5ux18dl6vqh9bi`)

---

## Write Order to Supabase (happens BEFORE webhook fires)

```javascript
async function writeOrderToSupabase(payload) {
  // 1. Insert order — get ID back
  const { data: order, error } = await supabase.from('orders').insert({
    order_number:    payload.order_number,
    system:          state.system,
    customer_name:   payload.customer_name,
    customer_phone:  payload.customer_phone,
    customer_email:  payload.customer_email,
    job_name:        payload.job_name,
    fulfillment:     payload.fulfillment,
    order_notes:     payload.order_notes,
    order_total:     state.order_total,
    status:          'pending',
    webhook_fired:   false,          // set to true after webhook succeeds
    webhook_payload: payload
  }).select().single();

  if (error) throw error;  // surface to caller — do not fire webhook if DB write fails

  // 2. Insert line items
  await supabase.from('order_line_items').insert(
    state.cart.map((item, i) => ({
      order_id:      order.id,
      category:      item.category,
      description:   item.description,
      specs:         item.specs,
      amount:        item.line_total,
      display_order: i
    }))
  );

  // 3. Insert spec file records
  if (state.specFiles.length > 0) {
    await supabase.from('spec_files').insert(
      state.specFiles.map(f => ({
        order_id:    order.id,
        filename:    f.filename,
        storage_url: f.storageUrl,
        description: f.description
      }))
    );
  }

  return order.id;  // return to caller for webhook payload
}
```

**Error recovery:**
- If Supabase write fails: show error, let customer retry. Do NOT fire webhook — no orphaned orders.
- If webhook POST fails after Supabase write succeeds: update `webhook_fired = false`, show success to customer (order is saved). Admin sees "⚠ Not Fired" badge and can manually re-trigger.
- If Stripe fails: surface Stripe error, stay on payment modal. Nothing else has been touched.

---

## Make.com Automation (Downstream — do not build)

Already configured. For reference only:
1. Webhook receives order JSON (including `driver_email` field)
2. Docupilot (Template ID 105011) → generates PDF work order
3. Gmail → emails PDF to `driver_email` from payload
4. Gmail → emails order confirmation to customer
5. Webhook response → 200 OK to app

---

## Custom Trim Canvas (Fabric.js)

Opens as a full-screen modal when customer clicks "Draw Custom Trim":

```javascript
// Canvas setup:
const canvas = new fabric.Canvas('trim-canvas', {
  width: 800,
  height: 500,
  backgroundColor: '#ffffff'
});
// Canvas element should have: aria-label="Custom trim drawing tool" role="img"
// The description textarea below serves as the accessible alternative

// Grid overlay:
function drawGrid(canvas, spacing = 20) {
  // Draw light gray grid lines at `spacing` pixel intervals
}

// Scale options: 1" = 1px (default), 1" = 2px, 1" = 4px
// Tools: Line, Arc, Dimension label, Text note
// Export: canvas.toDataURL('image/png') → file for upload
```

Modal controls: grid toggle, scale selector, undo, clear, "Save Drawing" (exports PNG and adds to specFiles), "Cancel"

---

## Spec File Upload (Session 3)

**Important:** Upload spec files to the **`product-photos`** bucket under a `specs/` path prefix — NOT the `spec-files` bucket. The `spec-files` bucket is private (admin read only) and `getPublicUrl()` will fail on it. Docupilot requires a public URL to render images in the PDF work order.

```javascript
async function uploadSpecFiles() {
  for (const spec of state.specFiles) {
    const path = `specs/${Date.now()}-${spec.filename}`;
    const { error } = await supabase.storage
      .from('product-photos')       // ← public bucket
      .upload(path, spec.file);

    if (error) throw error;

    spec.storageUrl = supabase.storage
      .from('product-photos')
      .getPublicUrl(path).data.publicUrl;
  }
}
```

---

## Session-by-Session Build Plan

### ✅ PRE-BUILD: Database Setup — COMPLETE
Supabase project created, schema applied, seed data loaded.

---

### Track A: Customer Configurator (`windy-hill-configurator.html`)

---

#### SESSION 1 — Shell + Entry Screen + Data Loading

**Goal:** Working entry screen that matches the visual reference, loads live data from Supabase, and transitions to the configurator view on system selection.

**Tasks:**
1. Full page shell: header (Windy Hill logo placeholder, nav links, View Cart button), footer (`© ${new Date().getFullYear()} Windy Hill Metals` + StructTech logo)
2. Entry screen layout (matches visual reference above):
   - Hero banner with background image, "PREMIUM ROOF MATERIALS" heading and subtitle
   - "OUR PRODUCTS" section with two system cards (photo, title, description, CTA button)
   - Off-white page background, rust/brown accents
3. `loadCatalog()` — single nested Supabase query with client-side sort (see query above), populates both system cards with live `name`, `tagline`, `description`, `hero_image_url`
4. `loadSettings()` — loads `app_settings`, stores in `state.settings`
5. System card click:
   - Sets `state.system` and `state.systemData`
   - Initializes `state.checklist` with one entry per category (status: 'pending', items: [])
   - Hides entry screen, shows configurator two-panel layout
6. Configurator shell (no card content yet — just the two-column layout):
   - Left: "COMPONENT CHECKLIST" header, scrollable category list area
   - Right: "YOUR ORDER" cart panel with placeholder "Your cart is empty" — add `aria-live="polite"` to cart panel so screen readers announce updates
   - "← Back to Start" link above left panel
7. Graceful loading states (spinner while Supabase loads) and error state (if Supabase fails to load)
8. Maintenance mode check: if `app_settings.maintenance_mode === 'true'`, show "We'll be right back" full-screen instead of app

**Placeholder images (until Supabase Storage has real photos):**
- Hero: `https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400`
- Ag Panel card: `https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800`
- Standing Seam card: `https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800`
- If `hero_image_url` is not null in Supabase, use that instead

---

#### SESSION 2 — Checklist Cards + Cart

**Goal:** Fully interactive checklist with all card types, live cart sidebar, required-item warnings.

**Tasks:**
1. Render checklist from `state.systemData.categories` (already sorted by `display_order` from client-side sort in `loadCatalog`)
2. ChecklistCard component per category:
   - Card header: category image (or placeholder), badge (REQUIRED/RECOMMENDED/OPTIONAL), category name, status icon (○ pending / ✅ complete / — skipped)
   - Card header keyboard support: `tabindex="0"`, `role="button"`, responds to Enter/Space to expand/collapse
   - Pending state: [Add +] button on right side
   - Complete state: summary line (e.g. "40 lf — $96.00"), click anywhere to re-edit
3. Expanded card body — field types by category slug:
   - `ag-panels` / `ss-panels`: gauge radio/dropdown, color picker, runs table
   - All trim categories: color picker + linear footage input + live price preview
   - `ag-closures` / `ss-closures`: inside footage + outside footage
   - `ss-clips`: fixed qty + floating qty
   - `ag-fasteners` / `ss-fasteners`: screw size, screw bag qty, trim screw bags, butyl roll qty
   - `ag-custom` / `ss-custom`: draw button + upload button + description + footage
4. Color picker: grid of swatches — each swatch must have `aria-label="[Color Name]"` and keyboard selection support
5. Runs table (panels only):
   - Row: [Length dropdown from product_lengths] × [Qty number input] = [subtotal]
   - [+ Add Run] adds row · [-] removes row
6. "Add to Order" commits items, updates cart, collapses card with summary
7. "I do not need this" checkbox skip: checkbox must be checked before skip activates; sets status 'skipped'
8. Cart panel:
   - `aria-live="polite"` on the cart panel div
   - Line items, subtotal, required items warning (⚠ badge count), "Proceed to Checkout →" button
9. Null price: show "—", "Pricing Pending" in cart total
10. Mobile: left panel full-width, cart becomes bottom slide-up drawer

---

#### SESSION 3 — Custom Trim Canvas + Spec File Uploads

**Goal:** Fabric.js drawing tool + file upload. Spec files upload to `product-photos` bucket under `specs/` prefix (public, Docupilot-accessible).

**Tasks:**
1. Custom trim card body: draw button, upload button (PNG/JPG/PDF max 10MB), description textarea, footage input
2. Fabric.js canvas modal:
   - 800×500 canvas, white background
   - `aria-label="Custom trim drawing tool"` on canvas element
   - Grid overlay (20px, toggleable), scale selector, tool buttons (Select · Line · Arc · Text), Undo, Clear
   - "Save Drawing" → `canvas.toDataURL('image/png')` → File object → added to `state.specFiles`
3. Spec file state:
   ```javascript
   state.specFiles.push({
     file: File,
     filename: string,
     previewUrl: string,   // object URL for thumbnail
     storageUrl: null,     // filled by uploadSpecFiles()
     description: string,
     footage: number
   });
   ```
4. Preview thumbnails with remove button
5. `uploadSpecFiles()` — uploads to `product-photos` bucket, `specs/` prefix (see code above)

---

#### SESSION 4 — Checkout + Payment + Order Logging

**Goal:** Full checkout from customer info → Stripe payment → Supabase order write → webhook → success.

**Order of operations (critical — do not reverse steps 2 and 3):**

**Tasks:**
1. Customer info modal: first/last name, phone, email, job name (optional), pickup/delivery radio, notes. All fields: `aria-describedby` to error element. Validate name + phone + email before proceeding.
2. Payment modal (Stripe Elements):
   - If `state.settings.stripe_publishable_key` is empty → show "call to order" message, skip Stripe
   - Otherwise load Stripe with key, render card element, "Pay $XXX.XX" button
3. On Stripe payment success → processing animation:
   - Step 1: Upload spec files (`uploadSpecFiles()` → `product-photos` bucket)
   - Step 2: Build webhook payload (`buildWebhookPayload()`)
   - Step 3: **Write order to Supabase** (`writeOrderToSupabase()`) → get `orderId`
   - Step 4: Fire webhook (`POST` to Make.com with payload + `orderId`)
   - Step 5: On webhook success, update `orders.webhook_fired = true`
4. Success modal: order number, line item summary, confirmation email note, "Start a New Order" button
5. **Account prompt on success modal:**
   - If customer is already logged in: show "View this order in your account →" link to `windy-hill-account.html`
   - If customer is not logged in: show "Create a free account to track all your orders" with email pre-filled from checkout and a password field. On sign-up: `supabase.auth.signUp({ email, password })` → then update the just-created order: `update orders set customer_id = auth.uid() where order_number = payload.order_number`
   - Skip button: "No thanks" dismisses without creating account
   - For contractors especially, this is the onramp to the account portal
6. If customer was already logged in when they started checkout: link `customer_id` at order write time (include `customer_id: (await supabase.auth.getUser()).data.user?.id` in the orders insert)
7. Error recovery (see Error Recovery section above)

---

### Track B: Admin Panel (`windy-hill-admin.html`)

---

#### SESSION 5 — Auth + Dashboard

**Goal:** Secure login + order dashboard.

**Tasks:**
1. Login screen: email + password, Supabase Auth `signInWithPassword`, session check on load, forgot password link
2. Admin shell sidebar nav: **Dashboard · Products · Colors · Options · Photos · Drivers · Settings · [Log Out]**
   - Note: Drivers tab is included in the nav now — built in Session 7
3. Dashboard tab:
   - KPI row: Today's orders · Today's revenue · Orders this week · Total orders
   - Orders table: order number, customer name, job, total, system, status dropdown, date
   - Click row → slide-out: full line items, customer info, spec file thumbnails, webhook payload JSON toggle
   - Status dropdown per row: Pending → Sent to Driver → Fulfilled (updates Supabase on change)
   - Webhook status badge: "✅ Fired" or "⚠ Not Fired"

---

#### SESSION 6 — Products Management

**Goal:** Full CRUD for systems, categories, and products.

**Tasks:**
1. Systems: edit name/tagline/description, upload hero image, active toggle, reorder
2. Categories: filter by system, add/edit/delete all fields, image upload, active toggle
3. Products: filter by system → category, add/edit/delete, all fields including `base_price` (this is the pricing backdoor — amber highlight on null prices), image upload, active toggle

---

#### SESSION 7 — Colors + Options + Photos + Drivers

**Goal:** Color palette, length options, media library, driver management.

**Tasks:**
1. Colors tab: grid of swatches, add (name + hex picker + swatch photo), edit/delete/reorder, per-product assignment modal
2. Options tab: length options list (add/edit/remove), per-product length assignment
3. Photos tab: grid of `product-photos` bucket, multi-file upload, "Assign to..." dropdown per image, delete with in-use warning
4. **Drivers tab (required — not optional):**
   - List of drivers (name, email, phone, active toggle)
   - Add / Edit / Delete driver
   - When a driver is set to active, update `app_settings` key `driver_email` to that driver's email — this is what flows into the webhook payload for Make.com routing
   - Only one driver should be active at a time (enforce in UI)

---

#### SESSION 8 — Settings + Polish + End-to-End Test

**Goal:** Settings tab, responsive polish, full test run.

**Tasks:**
1. Settings tab: business name, business phone, driver email (read-only — managed via Drivers tab), Stripe publishable key input, Make.com webhook URL, Docupilot template ID, maintenance mode toggle
2. Responsive polish: mobile configurator (single-column, bottom cart drawer), mobile admin (hamburger nav)
3. Error handling sweep: all Supabase calls wrapped, upload failures have retry, Stripe errors surfaced
4. End-to-end test:
   - Place test order (Ag Panel, 3+ categories, one custom trim drawing)
   - Verify Supabase order row created before webhook fires
   - Verify webhook fires, Make.com receives payload with `driver_email`
   - Verify order appears in admin dashboard with correct status
   - Verify null-price items show "—"
   - Verify "call to order" message shows when Stripe key is empty

---

### Track C: Customer Account Portal (`windy-hill-account.html`)

---

#### SESSION 9 — Customer Account Portal

**Goal:** A clean, mobile-friendly account portal where customers (especially contractors) can log in, see all their orders, check status, and view order details. Lives at `shop.thecontractingcompany.com/account`.

**Same visual shell** as the configurator — same header, footer, colors. Consistent brand experience.

**Auth flow:**
```javascript
// On page load — check for existing session
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  showAuthScreen();   // show login/signup
} else {
  showPortal(session.user);
}

// Listen for auth state changes (handles magic links, confirmations)
supabase.auth.onAuthStateChange((event, session) => {
  if (session) showPortal(session.user);
  else showAuthScreen();
});
```

**Auth screen (login/signup toggle):**
- Two tabs: "Log In" and "Create Account"
- Log In: email + password → `supabase.auth.signInWithPassword()`
- Create Account: email + password + confirm password → `supabase.auth.signUp()` → show "Check your email to confirm your account"
- Forgot password: email input → `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://shop.thecontractingcompany.com/account' })`
- No username. Email is the identity.

**Portal — logged in view:**

```
┌─────────────────────────────────────────────────────────┐
│ [Windy Hill Logo]   Home · About · Shop   [My Account ▾]│
├─────────────────────────────────────────────────────────┤
│  Welcome back, [First Name]                [Log Out]    │
│                                                         │
│  YOUR ORDERS                                            │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ #WH-1234567   Ag Panel   Jun 12, 2026   $847.20  │  │
│  │ Job: Smith Farm Re-Roof               ● Fulfilled │  │
│  │                                   [View Details] │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ #WH-1234432   Standing Seam  Jun 8, 2026  $1,240 │  │
│  │ Job: Riverside Barn                   ● Pending  │  │
│  │                                   [View Details] │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  [+ Place New Order]                                    │
└─────────────────────────────────────────────────────────┘
```

**Order list query:**
```javascript
async function loadMyOrders(user) {
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      *,
      order_line_items (*)
    `)
    .or(`customer_id.eq.${user.id},customer_email.eq.${user.email}`)
    .order('created_at', { ascending: false });

  renderOrderList(orders);
}
```

**Order list features:**
- Status badge per order: `pending` (amber) · `sent_to_driver` (blue) · `fulfilled` (green)
- Job name displayed if provided
- Total per order
- Date placed
- "View Details" button → expands inline or navigates to detail view

**Order detail view (slide-in panel or expanded row):**
- Order number, date, system, fulfillment method, job name, notes
- Full line items table: description · specs · amount
- Order total
- Status timeline: Placed → Driver Notified → Fulfilled (visual step indicator)
- Spec file thumbnails (if any custom trims were uploaded)
- "Call to modify or cancel: (765) 847-1480" — Phase 2 will add self-serve cancel; for now, direct to phone

**"+ Place New Order" button:**
- Links to `shop.thecontractingcompany.com` (configurator)
- If user is already logged in, the configurator checks `supabase.auth.getSession()` and pre-fills their email in the checkout form

**Nav "My Account" dropdown (add to configurator header in Session 9):**
- If logged in: "My Account" → dropdown: View Orders · Log Out
- If not logged in: "Sign In / Register" → links to account portal

**Account settings (bottom of portal — keep simple for Tier 2):**
- Display: logged-in email address
- Change password button → `supabase.auth.updateUser({ password: newPassword })`
- That's it. No name, no address, no preferences for now.

**Accessibility:**
- Order list rows are keyboard navigable (tabindex, Enter to expand detail)
- Status badges use both color AND text label (not color only)
- `aria-live="polite"` on the order list container (updates when orders load)
- Auth error messages linked to their fields via `aria-describedby`

---

---

### Track D: Hover Report Import (`windy-hill-configurator.html`)

---

#### SESSION 10 — Hover Report Import Wizard

**Goal:** Contractors can upload a Hover roof measurement PDF and have the app automatically extract all measurements, walk them through any remaining inputs (panel run lengths for Ag Panel), and pre-populate the full material checklist. Contractor then selects color/gauge per item before checkout.

**File to edit:** `windy-hill-configurator.html` only. No schema changes, no new Supabase tables.

---

**Add PDF.js to CDN imports (top of file, with existing scripts):**
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
```
Set the worker immediately after:
```javascript
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
```

---

**Add to state object:**
```javascript
state.hoverImport = {
  active: false,
  property: '',          // address string from PDF (informational)
  totalAreaFt: 0,        // raw area at 0% waste
  wasteTable: {},        // { 0: 3738, 5: 3925, 10: 4112, 15: 4299, 20: 4486 }
  facets: [],            // [{ id: 'RF-1', areaFt: 202, pitch: '4/12', runInches: null }]
  ridgesLF: 0,
  valleysLF: 0,
  rakesLF: 0,
  eavesLF: 0,
  hipsLF: 0,
  stepFlashingLF: 0,
  wastePct: 10           // default waste factor
};
```

---

**Tasks:**

**1. Entry screen — add Hover import path below the two system cards**

Below the "OUR PRODUCTS" card row, add a contractor-focused section:
```
─────────── for contractors ───────────
[📄 Import Hover Report →]
Upload your Hover PDF and we'll build your material list automatically.
```
Button style: outlined (navy border, white background, navy text) so it reads as secondary vs. the primary system cards. On click → opens the Hover upload modal (step 1 of wizard).

---

**2. Hover wizard — 4-step modal**

Full-screen overlay modal, progress indicator at top (Step 1 of 4, Step 2 of 4, etc.), Back/Next controls. Steps:

---

**Step 1 — Upload PDF**

```
┌───────────────────────────────────────────────────────────┐
│  IMPORT HOVER REPORT                           Step 1 of 4 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                                                     │  │
│  │          📄  Drop your Hover PDF here               │  │
│  │              or click to browse                     │  │
│  │                                                     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  [parsing spinner]  Reading measurements...                 │
└───────────────────────────────────────────────────────────┘
```

- File input accepts `.pdf` only
- On file select → call `parseHoverPDF(file)` immediately (no separate "upload" button)
- Show spinner with "Reading measurements..." while parsing
- On success → auto-advance to Step 2
- On failure → show: "Couldn't read this PDF automatically. Try a different Hover report, or build your order manually." with a "Build Manually →" button that closes wizard and returns to entry screen

**`parseHoverPDF(file)` function:**

```javascript
async function parseHoverPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map(item => item.str).join(' ') + '\n';
  }

  return extractHoverData(fullText);
}
```

**`extractHoverData(text)` — regex extraction:**

```javascript
function extractHoverData(text) {
  // Helper: parse "146' 8"" or "113'" or "-" → decimal feet
  function parseFtIn(str) {
    if (!str || str.trim() === '-') return 0;
    const m = str.match(/(\d+)'\s*(\d+)?/);
    if (!m) return parseFloat(str) || 0;
    return parseInt(m[1]) + (parseInt(m[2] || 0) / 12);
  }

  // Total area (e.g. "3,738 ft²" or "3738 ft²")
  const areaMatch = text.match(/([\d,]+)\s*ft²/);
  const totalAreaFt = areaMatch ? parseInt(areaMatch[1].replace(/,/g, '')) : 0;

  // Roof measurements — match each measurement line
  const ridgesMatch  = text.match(/Ridges?\s*\(RI\)[^\d]*([\d'"\s]+)/i);
  const hipsMatch    = text.match(/Hips?\s*\(H\)\s*([\d'\s"-]+)/i);
  const valleysMatch = text.match(/Valleys?\s*\(V\)[^\d]*([\d'"\s]+)/i);
  const rakesMatch   = text.match(/Rakes?\s*\(RA\)[^\d]*([\d'"\s]+)/i);
  const eavesMatch   = text.match(/Eaves?\s*\(E\)[^\d]*([\d'"\s]+)/i);
  const sfMatch      = text.match(/Step\s+Flashing\s*\(SF\)[^\d]*([\d'"\s]+)/i);

  // Individual facets — "RF-1  202  4/12" pattern
  const facetMatches = [...text.matchAll(/RF-(\d+)\s+([\d,]+)\s+([\d]+\/[\d]+)/g)];
  const facets = facetMatches.map(m => ({
    id: `RF-${m[1]}`,
    areaFt: parseInt(m[2].replace(/,/g, '')),
    pitch: m[3],
    runInches: null   // filled in Step 3 for Ag Panel
  }));

  // Waste table — extract if present
  const wasteTable = {};
  const wasteMatches = [...text.matchAll(/\+(\d+)%.*?([\d,]+)\s*ft/g)];
  wasteMatches.forEach(m => {
    wasteTable[parseInt(m[1])] = parseInt(m[2].replace(/,/g, ''));
  });
  wasteTable[0] = totalAreaFt;  // always anchor 0%

  // Validation — require at minimum: area + at least one linear measurement
  const ridgesLF = parseFtIn(ridgesMatch?.[1]);
  const eavesLF  = parseFtIn(eavesMatch?.[1]);
  if (!totalAreaFt || (!ridgesLF && !eavesLF)) {
    throw new Error('Required measurements not found — may not be a Hover report.');
  }

  return {
    totalAreaFt,
    ridgesLF,
    hipsLF:         parseFtIn(hipsMatch?.[1]),
    valleysLF:      parseFtIn(valleysMatch?.[1]),
    rakesLF:        parseFtIn(rakesMatch?.[1]),
    eavesLF,
    stepFlashingLF: parseFtIn(sfMatch?.[1]),
    facets,
    wasteTable
  };
}
```

---

**Step 2 — Confirm extracted measurements + select system**

```
┌───────────────────────────────────────────────────────────┐
│  IMPORT HOVER REPORT                           Step 2 of 4 │
│                                                             │
│  ✅  Measurements found                                     │
│                                                             │
│  Total Roof Area    3,738 ft²     Pitch: 4/12              │
│  Ridge              146' 8"       Eave:  138'              │
│  Valley             113'          Rake:  179' 5"           │
│  Hips               None detected                          │
│                                                             │
│  Facets detected: 9  (RF-1 through RF-9)                   │
│                                                             │
│  ─────────────────────────────────────────────────────     │
│  Which roofing system?                                      │
│  ○ Ag Panel    ○ Standing Seam                             │
│                                                             │
│                            [← Back]   [Next →]             │
└───────────────────────────────────────────────────────────┘
```

- All extracted values displayed — contractor can verify before proceeding
- If a value is 0/missing, show "—" (not an error — some roofs have no valleys, no hips, etc.)
- System selection required before Next is enabled
- Step flashing shown as an informational note only ("Step flashing detected: 17' 10" — not auto-ordered, flagged for your review")

---

**Step 3 — Panel run lengths (Ag Panel only) OR waste factor (Standing Seam)**

**If Ag Panel selected:**

```
┌───────────────────────────────────────────────────────────┐
│  IMPORT HOVER REPORT                           Step 3 of 4 │
│                                                             │
│  Enter the panel run length for each roof section.         │
│  (Check your Hover diagram for slope measurements.)        │
│                                                             │
│  Facet     Area         Run Length (inches)                 │
│  ──────────────────────────────────────────────────────    │
│  RF-1      202 ft²      [        ] in                      │
│  RF-2      202 ft²      [        ] in                      │
│  RF-3      909 ft²      [        ] in                      │
│  RF-4      383 ft²      [        ] in                      │
│  RF-5    1,156 ft²      [        ] in                      │
│  RF-6      273 ft²      [        ] in                      │
│  RF-7      273 ft²      [        ] in                      │
│  RF-8      170 ft²      [        ] in                      │
│  RF-9      170 ft²      [        ] in                      │
│                                                             │
│  💡 Same length for multiple facets? Enter it once — we'll │
│     group matching lengths automatically.                   │
│                                                             │
│                            [← Back]   [Next →]             │
└───────────────────────────────────────────────────────────┘
```

Validation: all run length fields must be filled with a number > 0 before Next enables.

For each facet, calculate and show a preview as the contractor types:
```javascript
// Live preview per facet row as user types
const runFt       = enteredInches / 12;
const eaveWidthFt = facet.areaFt / runFt;
const panelCount  = Math.ceil(eaveWidthFt / 3);   // 36" = 3ft coverage
// Show: "~14 panels" next to the input field
```

**If Standing Seam selected:**

Skip the facets table — go straight to waste factor (Step 3 is just the waste selector for SS, then Next goes to Step 4).

---

**Step 4 — Waste factor + order preview**

```
┌───────────────────────────────────────────────────────────┐
│  IMPORT HOVER REPORT                           Step 4 of 4 │
│                                                             │
│  Waste factor for panels:                                   │
│  ○ 0%   ○ +5%   ● +10%   ○ +15%   ○ +20%                 │
│                                                             │
│  YOUR ORDER PREVIEW                                         │
│  ──────────────────────────────────────────────────────    │
│  ✅ Panels (Ag Panel)                                       │
│     144"  ×  14 panels                                      │
│     132"  ×  8 panels                                       │
│     108"  ×  12 panels  [+ adjust for 10% waste]            │
│                                                             │
│  ✅ Ridge Cap           147 lf                              │
│  ✅ Eave Trim           138 lf                              │
│  ✅ Rake/Gable Trim     180 lf                              │
│  ✅ Valley Flashing     113 lf                              │
│  ⏭ Hip Cap             skipped — no hips detected          │
│                                                             │
│  ⚠  Color and gauge required on all items before checkout. │
│                                                             │
│  [← Back]              [Build My Order →]                  │
└───────────────────────────────────────────────────────────┘
```

Waste factor applies to panels only (trim quantities come directly from Hover measurements, no waste factor applied to trim — contractors cut trim to exact fit).

For Ag Panel, waste is applied by scaling panel counts proportionally:
```javascript
const wasteFactor = 1 + (state.hoverImport.wastePct / 100);
// Scale each facet's panel count by waste factor
facet.panelCountWithWaste = Math.ceil(facet.panelCount * wasteFactor);
```

For Standing Seam, total coil LF with waste:
```javascript
const areaWithWaste = state.hoverImport.totalAreaFt * wasteFactor;
// Show total ft² — the SS panel card handles LF conversion from product's coverage width
```

---

**3. Apply Hover data to checklist on "Build My Order →"**

On confirm, the wizard closes and transitions to the two-panel configurator (same as clicking a system card from the entry screen), but with checklist items pre-populated:

```javascript
function applyHoverToChecklist(system) {
  const h = state.hoverImport;
  const categories = state.systemData.categories;

  categories.forEach(cat => {
    let prefillData = null;

    if (cat.slug.includes('panels')) {
      if (system === 'ag-panel') {
        // Group facets by run length, sum panel counts
        const groups = {};
        h.facets.forEach(f => {
          const key = f.runInches;
          const runFt = f.runInches / 12;
          const panelCount = Math.ceil((f.areaFt / runFt / 3) * (1 + h.wastePct / 100));
          groups[key] = (groups[key] || 0) + panelCount;
        });
        prefillData = { type: 'panel-runs', runs: groups };  // { "144": 14, "132": 8, ... }
      } else {
        // Standing seam — total area
        const areaWithWaste = Math.ceil(h.totalAreaFt * (1 + h.wastePct / 100));
        prefillData = { type: 'panel-area', areaFt: areaWithWaste };
      }
    }
    else if (cat.slug.includes('ridge')) {
      if (h.ridgesLF > 0) prefillData = { type: 'linear', lf: Math.ceil(h.ridgesLF) };
    }
    else if (cat.slug.includes('valley')) {
      if (h.valleysLF > 0) prefillData = { type: 'linear', lf: Math.ceil(h.valleysLF) };
      else { state.checklist[cat.id].status = 'hover-skip-suggested'; return; }
    }
    else if (cat.slug.includes('rake') || cat.slug.includes('gable')) {
      if (h.rakesLF > 0) prefillData = { type: 'linear', lf: Math.ceil(h.rakesLF) };
    }
    else if (cat.slug.includes('eave')) {
      if (h.eavesLF > 0) prefillData = { type: 'linear', lf: Math.ceil(h.eavesLF) };
    }
    else if (cat.slug.includes('hip')) {
      if (h.hipsLF > 0) prefillData = { type: 'linear', lf: Math.ceil(h.hipsLF) };
      else { state.checklist[cat.id].status = 'hover-skip-suggested'; return; }
    }

    if (prefillData) {
      state.checklist[cat.id].status = 'hover-populated';
      state.checklist[cat.id].hoverData = prefillData;
    }
  });
}
```

---

**4. Checklist card states — add `hover-populated` and `hover-skip-suggested`**

**`hover-populated` card (quantity known, options needed):**
- Amber ⚠ icon instead of green ✅
- Summary line: "Hover: 147 lf — select color to complete"
- Card body pre-fills the relevant quantity field(s) when expanded
- For Ag Panel panels: pre-fills the runs table with the grouped panel lengths and counts
- For linear items: pre-fills the footage input
- Contractor must select color (and gauge for panels) then click "Add to Order" — that transitions to 'complete' (green ✅)

**`hover-skip-suggested` card (Hover detected none):**
- Shows: "No [hips/valleys] detected in your Hover report — skip?"
- [Confirm Skip] button marks 'skipped' · [Add Manually] opens card for manual entry

**Checkout gate addition:**
If any item is still `hover-populated` (quantity loaded but options not selected), add to warnings:
```
⚠ Color/options not selected on: Ridge Cap, Eave Trim
```
Same soft-block behavior as existing required-item warnings (contractor can override).

---

**5. "Hover Imported" badge in the checklist header**

When `state.hoverImport.active === true`, show a small banner at the top of the left checklist panel:

```
📄 Hover report imported — select color/gauge on each item below to complete your order.
```

Amber background, dismissable with an × button.

---

**6. No new Supabase columns needed.** Hover data exists in client state only during the session. The order that gets written to Supabase is the same format as any other order — the webhook payload and line items are identical regardless of whether they came from Hover import or manual entry. Windy Hill and the driver see no difference.

---

**7. Error handling**

- PDF parse fails → friendly message + "Build Manually →" button. Never throw a raw error to the user.
- A single facet's run length is missing when "Next →" is clicked → highlight the empty field in red, focus it.
- Hover reports the same facet area as 0 → exclude that facet from the panel calculation and show a note: "RF-X skipped (area 0)".
- If `pdfjsLib` fails to load from CDN → gracefully hide the "Import Hover Report" button entirely (do not show a broken feature).

---

**8. Mobile behavior**

The wizard modal is full-screen on mobile. Step 3 (facet table) on mobile: each facet row stacks vertically — facet ID, area, then the inches input full-width below. No horizontal scrolling.

---

## Phase 2 Scope (Tier 3 — after beta)

These features are explicitly out of scope for the current build. Do not implement during Sessions 1–9.

**Self-serve order cancellation:**
- Cancel button visible only when `status = 'pending'`
- Confirmation modal: "Are you sure? This cannot be undone."
- On confirm: update `orders.status = 'cancelled'`, fire a Make.com cancellation webhook → notifies driver and jacob@structtek.com
- Cancelled orders still visible in history with "Cancelled" badge

**Self-serve order modification:**
- "Edit Order" button visible only when `status = 'pending'`
- Re-opens the configurator pre-populated with existing line items
- On re-submit: replaces order in DB, fires "MODIFIED ORDER" webhook to Make.com
- Complex — implement only after understanding how often contractors actually need it

**Contractor reporting dashboard:**
- Date range picker (custom or presets: This Month, Last 30 Days, Year to Date)
- Job name filter / search
- Summary cards: total orders · total spent · most common system
- Line item breakdown table with totals
- Export to CSV (`Blob` + `URL.createObjectURL`) and PDF (Docupilot or jsPDF)

---

## Deployment

**Platform:** Netlify (drag-and-drop deploy)

**⚠ Important:** Each file must be named `index.html` when deployed, OR include a `_redirects` file:
```
/ /windy-hill-configurator.html 200
```
Without this, `shop.thecontractingcompany.com` returns a 404.

**Two separate Netlify sites:**
- Site 1: Customer configurator + account portal (`index.html` + `windy-hill-account.html`) → connected to `shop.thecontractingcompany.com` CNAME
- Site 2: Admin panel → connected to `admin.structtek.com` CNAME

**No environment variables needed** — all credentials baked into HTML (anon key, Stripe publishable key — both safe to expose) or loaded from `app_settings` at runtime.

**Service role key** (admin only): If needed for admin operations that bypass RLS, store as a `const` in `windy-hill-admin.html` only. Never in `windy-hill-configurator.html`.

---

## Key Business Details

| Field | Value |
|-------|-------|
| Business | Windy Hill Metal Sales |
| Phone | (765) 847-1480 |
| StructTech contact | Jacob Walker |
| StructTech email | jacob@structtek.com |
| StructTech phone | (937) 467-2660 |
| Make.com webhook | https://hook.us2.make.com/74e864u9l3ru1mpgri5ux18dl6vqh9bi |
| Docupilot template | 105011 |
| Supabase project | gnjpxtxufklhakobgzqv |
| Driver email (default) | jacob@structtek.com |

---

## Things That Will Arrive Later (Don't Block Build)

| Item | Notes |
|------|-------|
| Real product pricing | Enter via admin panel → Products tab when price sheet arrives |
| Real Windy Hill color names | Update via admin panel → Colors tab |
| Real product photos | Upload via admin panel → Photos tab |
| Stripe live publishable key | Enter via admin panel → Settings after Stripe account created |
| Final DNS setup | shop.thecontractingcompany.com CNAME to Netlify Site 1 |

---

*StructTech LLC | Internal use only | Do not share*
