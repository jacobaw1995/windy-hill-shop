# Windy Hill — Session 11: Stripe Payment + PDF Work Order Integration
**StructTech LLC** | June 24, 2026 | Hand this to Claude Code at the start of this session.

> Builds on top of all prior sessions. Do not modify `windy-hill-schema.sql` (schema is live).
> Do not touch `windy-hill-account.html` or admin portal auth logic.

---

## Goal for This Session

Add Stripe payment processing and automated PDF work order delivery to the existing Windy Hill ordering app.

**What the customer experiences after this session:**
1. Customer completes their cart and hits "Checkout"
2. Stripe Checkout opens — customer pays
3. Stripe fires a webhook to a Supabase Edge Function
4. Edge Function generates a PDF work order and uploads it to Supabase Storage
5. Make.com receives a slim webhook → sends the customer a confirmation email with order summary + sends the driver a work order email with a live PDF download link
6. Admin panel shows `payment_status: paid` and `pdf_url` on the order record

---

## What Already Exists (Do Not Rebuild)

- `windy-hill-configurator.html` + `windy-hill-configurator.js` — full working configurator with cart, spec file uploads, `writeOrderToSupabase()`, and `fireWebhook()`. The existing `fireWebhook()` fires the Make.com webhook directly from the browser. **This will be replaced by the Edge Function pattern described below.**
- `windy-hill-admin.html` — admin panel with order list, `webhook_fired` badge display
- Supabase project `gnjpxtxufklhakobgzqv` — all tables live, RLS active
- Make.com scenario 4496216 ("Windy Hill — Order Processing") — already sends driver + customer emails

---

## Architecture Decision

The current app is vanilla HTML with no server. There is no Next.js layer. PDF generation and Stripe webhook verification **must run server-side**. The correct solution is a **Supabase Edge Function** (Deno runtime).

```
[Customer Cart] → Stripe Checkout (client JS)
                         ↓
              checkout.session.completed
                         ↓
         [Supabase Edge Function: stripe-webhook]
              ├── Verify Stripe signature
              ├── Look up order in Supabase (by client_reference_id)
              ├── Idempotency check (skip if pdf_generated_at already set)
              ├── Mark order paid (payment_status = 'paid')
              ├── Generate PDF work order (jsPDF in Deno)
              ├── Upload PDF to Supabase Storage bucket: pdf-files
              ├── Generate signed URL (72-hour expiry)
              ├── Save pdf_url + pdf_generated_at on order record
              └── POST to Make.com with slim payload
                         ↓
         [Make.com Scenario 4496216 — unchanged]
              ├── Customer confirmation email (to: customer_email)
              └── Driver work order email (to: driver_email, PDF link in body)
```

**Why Supabase Edge Function over Next.js:**
- No migration required — existing configurator HTML stays intact
- Fastest path to "working today"
- If Next.js migration happens later, this same logic moves to `/api/webhooks/stripe` verbatim

---

## Step 1 — Schema Migration

Run this SQL in Supabase SQL Editor before coding:

```sql
-- Stripe payment fields on orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS stripe_session_id   TEXT,
  ADD COLUMN IF NOT EXISTS payment_status      TEXT DEFAULT 'pending',  -- pending / paid / failed
  ADD COLUMN IF NOT EXISTS pdf_url             TEXT,
  ADD COLUMN IF NOT EXISTS pdf_generated_at    TIMESTAMPTZ;

-- Add stripe_session_id to app_settings (populated by admin panel)
INSERT INTO app_settings (key, value)
VALUES
  ('stripe_secret_key', ''),
  ('stripe_webhook_secret', '')
ON CONFLICT (key) DO NOTHING;

-- Storage bucket for generated PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdf-files', 'pdf-files', false)
ON CONFLICT (id) DO NOTHING;

-- Service role (Edge Function) can upload PDFs
CREATE POLICY "Service role can manage pdf-files"
  ON storage.objects
  FOR ALL
  USING (bucket_id = 'pdf-files');

-- Admin can read PDFs
CREATE POLICY "Admin can read pdf-files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pdf-files' AND auth.role() = 'authenticated');
```

---

## Step 2 — Supabase Edge Function: `stripe-webhook`

Create at: `supabase/functions/stripe-webhook/index.ts`

### Full function spec:

```typescript
// supabase/functions/stripe-webhook/index.ts
// Deno runtime. Deploy with: supabase functions deploy stripe-webhook

import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' });
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!  // Service role — needed for Storage upload + order write
);

const MAKE_WEBHOOK_URL = Deno.env.get('MAKE_WEBHOOK_URL')!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
```

### Handler logic (pseudocode — implement fully):

```
1. Read raw body as text (required for Stripe signature verification)
2. stripe.webhooks.constructEvent(body, signature_header, STRIPE_WEBHOOK_SECRET)
   - If verification fails → return 400
3. If event.type !== 'checkout.session.completed' → return 200 (ignore other events)
4. Extract session = event.data.object
5. order_id = session.client_reference_id   ← set this when creating the Checkout Session
6. Fetch order from Supabase:
   SELECT orders.*, order_line_items.* FROM orders
   LEFT JOIN order_line_items ON order_line_items.order_id = orders.id
   WHERE orders.id = order_id
7. IDEMPOTENCY CHECK: if order.pdf_generated_at IS NOT NULL → return 200 (already processed)
8. Mark order paid:
   UPDATE orders SET payment_status = 'paid', stripe_session_id = session.id WHERE id = order_id
9. Generate PDF (see PDF spec below)
10. Upload to Supabase Storage bucket 'pdf-files':
    Path: `work-orders/${order.order_number}.pdf`
11. Create signed URL with 259200 second expiry (72 hours):
    supabase.storage.from('pdf-files').createSignedUrl(path, 259200)
12. Save pdf_url + pdf_generated_at on order:
    UPDATE orders SET pdf_url = signed_url, pdf_generated_at = NOW() WHERE id = order_id
13. POST to Make.com slim webhook (see payload below)
14. Return 200
```

---

## Step 3 — PDF Work Order (jsPDF in Deno)

Generate a clean, professional PDF work order. No fonts to load — use jsPDF built-in (Helvetica).

### PDF layout spec:

```
┌─────────────────────────────────────────────────┐
│  [LOGO SPACE — text: "Windy Hill Metal Sales"]  │
│  Work Order #WH-XXXXXX          Date: MM/DD/YY  │
├─────────────────────────────────────────────────┤
│  CUSTOMER                                        │
│  Name: [customer_name]                           │
│  Phone: [customer_phone]                         │
│  Email: [customer_email]                         │
│  Job Name: [job_name]                            │
│  Fulfillment: [Pickup / Delivery]                │
├─────────────────────────────────────────────────┤
│  ORDER ITEMS                                     │
│  [category]      [description]      [amount]     │
│  ...                                             │
│  ─────────────────────────────────────────────  │
│  ORDER TOTAL:                      $XX,XXX.XX    │
├─────────────────────────────────────────────────┤
│  NOTES                                           │
│  [order_notes if present]                        │
├─────────────────────────────────────────────────┤
│  SPEC FILES ATTACHED                             │
│  [filename] — [description]  (list if any)       │
└─────────────────────────────────────────────────┘
```

### jsPDF implementation notes:
- Page size: letter (8.5" × 11")
- Colors: header bar `#1a2d4f` (navy), accent `#7a3020` (rust)
- If line items list is long, add page break before footer
- Amount column: right-align all amounts
- "Quote Required" where amount is null (custom trim items)
- Return the PDF as `Uint8Array`: `pdf.output('arraybuffer')` → `new Uint8Array(...)`

---

## Step 4 — Make.com Slim Payload

After PDF is uploaded and signed URL is generated, fire the Make.com webhook with only what it needs:

```javascript
await fetch(MAKE_WEBHOOK_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customer_name:   order.customer_name,
    customer_email:  order.customer_email,
    driver_email:    order.driver_email || 'jacob@structtek.com',  // from app_settings
    order_number:    order.order_number,
    order_total:     order.order_total ? `$${Number(order.order_total).toFixed(2)}` : 'Quote Required',
    fulfillment:     order.fulfillment,
    pdf_url:         signedUrl,   // Supabase Storage signed URL — 72hr expiry
    system:          order.system
  })
});
```

**Do NOT send:** `line_items`, `spec_files`, `order_notes`, or any large payload fields. The PDF contains all that detail. Make.com only needs to address and link the emails.

### Make.com scenario changes needed (update scenario 4496216):

The existing scenario already sends both emails. The only change: **replace the Docupilot module (Module 2)** with a pass-through. The PDF URL now arrives directly in the webhook payload as `{{1.pdf_url}}`.

Update the driver email module:
- PDF button `href`: change from `{{2.data.file_url}}` → `{{1.pdf_url}}`

Update the customer email module:
- No change needed if it already uses `{{1.customer_email}}`, `{{1.customer_name}}`, `{{1.order_number}}`

Remove Module 2 (Docupilot HTTP call) entirely — it's no longer needed.

---

## Step 5 — Stripe Checkout Session Creation

The configurator's checkout flow currently calls `writeOrderToSupabase()` then `fireWebhook()` directly. Replace `fireWebhook()` with a call that creates a Stripe Checkout Session instead.

In `windy-hill-configurator.js`, the checkout flow (around line 1562–1596) should become:

```javascript
// Step 3 (replace fireWebhook): Create Stripe Checkout Session
async function createStripeCheckoutSession(orderId, orderTotal, orderNumber, customerEmail) {
  const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);  // loaded from app_settings

  // Call a small Supabase Edge Function or direct Stripe.js
  // Option A: Stripe Payment Links (simplest — no server call needed for session creation)
  // Option B: Edge Function to create session (required for dynamic amounts)
  
  // RECOMMENDED: Use Stripe's client-side checkout with a separate
  // 'create-checkout-session' Edge Function:
  const res = await fetch('https://gnjpxtxufklhakobgzqv.supabase.co/functions/v1/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
    body: JSON.stringify({
      order_id:      orderId,
      order_number:  orderNumber,
      amount_cents:  Math.round(orderTotal * 100),
      customer_email: customerEmail
    })
  });
  const { url } = await res.json();
  window.location.href = url;  // redirect to Stripe Checkout
}
```

### Second Edge Function needed: `create-checkout-session`

```typescript
// supabase/functions/create-checkout-session/index.ts
// Creates a Stripe Checkout Session with the order details

// Key fields:
// - client_reference_id: order_id (UUID) — used by stripe-webhook to look up the order
// - customer_email: pre-fill checkout
// - line_items: single line item "Windy Hill Metal Order #WH-XXXXX" with the total amount
//   (itemized detail is already in Supabase — Stripe just needs the total for payment)
// - success_url: 'https://shop.thecontractingcompany.com/?order=success&ref={order_number}'
// - cancel_url: 'https://shop.thecontractingcompany.com/?order=cancelled'
// - mode: 'payment'
```

### Success redirect handling in configurator:

On page load, check `?order=success` in URL and show a success screen:

```javascript
const params = new URLSearchParams(window.location.search);
if (params.get('order') === 'success') {
  showOrderSuccessScreen(params.get('ref'));  // show "Order confirmed" UI
}
```

---

## Step 6 — Environment Variables (Supabase Edge Function Secrets)

Set these via Supabase dashboard → Edge Functions → Secrets, or via `supabase secrets set`:

```
STRIPE_SECRET_KEY          sk_live_...   (from Stripe dashboard)
STRIPE_WEBHOOK_SECRET      whsec_...     (from Stripe webhook endpoint settings)
MAKE_WEBHOOK_URL           https://hook.us2.make.com/74e864u9l3ru1mpgri5ux18dl6vqh9bi
SUPABASE_URL               https://gnjpxtxufklhakobgzqv.supabase.co
SUPABASE_SERVICE_ROLE_KEY  (from Supabase → Settings → API → service_role key)
```

**Do not hardcode secrets.** Read all via `Deno.env.get()`.

---

## Step 7 — Admin Panel Updates

In `windy-hill-admin.html`, update the order detail view to show:

- `payment_status` badge: "✅ Paid" (green) / "⏳ Pending" (amber) / "❌ Failed" (red)
- `pdf_url` link: "📄 View Work Order PDF" button (opens signed URL in new tab)
- Stripe session ID (small, gray, for reference)

In Admin Settings, add two new fields:
- Stripe Secret Key (masked input, saved to `app_settings.stripe_secret_key`)
- Stripe Webhook Secret (masked input, saved to `app_settings.stripe_webhook_secret`)

---

## Step 8 — Stripe Webhook Endpoint Registration

After deploying the Edge Function, register the webhook endpoint in Stripe:

```
URL: https://gnjpxtxufklhakobgzqv.supabase.co/functions/v1/stripe-webhook
Events to listen for: checkout.session.completed
```

Copy the signing secret (`whsec_...`) and set it as the `STRIPE_WEBHOOK_SECRET` env var.

---

## Session Build Order

Build in this sequence — each step is independently testable:

1. **Schema migration** — run the SQL above, verify columns exist
2. **`create-checkout-session` Edge Function** — test that it returns a Stripe URL
3. **Update configurator checkout flow** — replace `fireWebhook()` with session creation + redirect
4. **Add success/cancel URL handling** in configurator
5. **`stripe-webhook` Edge Function** — implement and test with Stripe CLI:
   ```
   stripe listen --forward-to https://gnjpxtxufklhakobgzqv.supabase.co/functions/v1/stripe-webhook
   stripe trigger checkout.session.completed
   ```
6. **PDF generation** — test that PDF uploads to `pdf-files` bucket and signed URL is accessible
7. **Make.com slim webhook** — verify Make.com receives payload and sends both emails with working PDF link
8. **Admin panel updates** — add payment_status badge + PDF link button
9. **End-to-end test** — full order flow from cart → payment → email delivery

---

## Key Constraints

- **Do not modify the Make.com scenario modules that send emails.** Only remove Module 2 (Docupilot) and update the PDF href field in the driver email module from `{{2.data.file_url}}` to `{{1.pdf_url}}`. Make.com scenario ID is 4496216.
- **Do not touch scenario 4589058** (Audit Intake Form Automation) under any circumstances.
- **Idempotency is required.** The Stripe webhook can fire multiple times. Check `pdf_generated_at IS NOT NULL` before processing. If already set, return 200 immediately.
- **Stripe signature verification is mandatory.** Never process a webhook without calling `stripe.webhooks.constructEvent()` first.
- **Use service role key only in Edge Functions**, never in client-side code. The configurator uses only the anon key.
- **PDF signed URLs expire in 72 hours.** This is intentional — long enough for the driver to access it. Admin can view PDFs anytime via Supabase Storage.
- **Orders with `order_total = null`** (all-quote orders) should still go through Stripe at $0 or be skipped to a "Request Quote" flow. For now: if total is null, skip Stripe and fire Make.com directly (keep existing `fireWebhook()` behavior for quote-only orders).

---

## Supabase Project Reference

```
Project ID: gnjpxtxufklhakobgzqv
URL: https://gnjpxtxufklhakobgzqv.supabase.co
Anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduanB4dHh1ZmtsaGFrb2JnenF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NTk2MTgsImV4cCI6MjA5NzEzNTYxOH0.Z_kveDZp4Zi7SV4pl_6UJ3yx1vpsbDv75KP0HkW3cDU
```

---

## Files to Create or Modify

| File | Action |
|------|--------|
| `supabase/functions/stripe-webhook/index.ts` | CREATE — main webhook handler |
| `supabase/functions/create-checkout-session/index.ts` | CREATE — session creation |
| `windy-hill-configurator.js` | MODIFY — replace `fireWebhook()` with Stripe redirect; add success screen handler |
| `windy-hill-admin.html` | MODIFY — add payment_status badge, PDF link, settings fields |

Do not create any other files. Do not create a package.json, Next.js config, or any build tooling.
