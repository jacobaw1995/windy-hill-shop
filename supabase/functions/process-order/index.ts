// supabase/functions/process-order/index.ts
// Deno runtime — deploy via Supabase dashboard or: supabase functions deploy process-order
//
// Env vars required (set in Supabase dashboard → Edge Functions → Secrets):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   MAKE_WEBHOOK_URL

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { order_id } = await req.json();
    if (!order_id) return json({ error: 'Missing order_id' }, 400);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderErr || !order) return json({ error: 'Order not found' }, 404);

    // Idempotency — already processed
    if (order.pdf_generated_at) {
      return json({ ok: true, cached: true, pdf_url: order.pdf_url });
    }

    // Fetch line items + spec files
    const [{ data: lineItems }, { data: specFiles }] = await Promise.all([
      supabase.from('order_line_items').select('*').eq('order_id', order_id).order('display_order'),
      supabase.from('spec_files').select('*').eq('order_id', order_id),
    ]);

    // Generate PDF
    const pdfBytes = await generatePDF(order, lineItems ?? [], specFiles ?? []);

    // Upload to pdf-files bucket
    const filePath = `work-orders/${order.order_number}.pdf`;
    const { error: uploadErr } = await supabase.storage
      .from('pdf-files')
      .upload(filePath, pdfBytes, { contentType: 'application/pdf', upsert: true });

    if (uploadErr) throw new Error('Upload failed: ' + uploadErr.message);

    // Signed URL — 72 hours
    const { data: signed } = await supabase.storage
      .from('pdf-files')
      .createSignedUrl(filePath, 259200);

    const pdf_url = signed?.signedUrl ?? '';

    // Save to order record
    await supabase.from('orders').update({
      pdf_url,
      pdf_generated_at: new Date().toISOString(),
      webhook_fired:    true,
    }).eq('id', order_id);

    // Fire Make.com payload — all scalars, no arrays
    const makeUrl = Deno.env.get('MAKE_WEBHOOK_URL');
    if (makeUrl) {
      const orderDate = order.created_at
        ? new Date(String(order.created_at)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      await fetch(makeUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_number:   order.order_number,
          order_date:     orderDate,
          customer_name:  order.customer_name,
          customer_phone: order.customer_phone || '',
          customer_email: order.customer_email,
          job_name:       order.job_name || '',
          fulfillment:    order.fulfillment,
          order_notes:    order.order_notes || '',
          order_total:    order.order_total != null
            ? '$' + Number(order.order_total).toFixed(2)
            : 'Quote Required',
          system:         order.system,
          driver_email:   order.driver_email || '',
          pdf_url,
        }),
      });
    }

    return json({ ok: true, pdf_url });

  } catch (err) {
    console.error(err);
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// ── PDF Generation ─────────────────────────────────────────────

async function generatePDF(
  order: Record<string, unknown>,
  lineItems: Record<string, unknown>[],
  specFiles: Record<string, unknown>[],
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page   = pdfDoc.addPage([612, 792]); // US Letter
  const { width, height } = page.getSize();

  const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const navy  = rgb(0.102, 0.176, 0.310); // #1a2d4f
  const rust  = rgb(0.478, 0.188, 0.125); // #7a3020
  const black = rgb(0, 0, 0);
  const lgray = rgb(0.75, 0.75, 0.75);
  const dgray = rgb(0.35, 0.35, 0.35);
  const white = rgb(1, 1, 1);

  // ── Header bar
  page.drawRectangle({ x: 0, y: height - 72, width, height: 72, color: navy });
  page.drawText('WINDY HILL METAL SALES', {
    x: 36, y: height - 32, size: 16, font: fontBold, color: white,
  });
  page.drawText('Work Order', {
    x: 36, y: height - 50, size: 10, font, color: rgb(0.7, 0.7, 0.7),
  });

  const orderNum = String(order.order_number ?? '');
  const dateStr  = order.created_at
    ? new Date(String(order.created_at)).toLocaleDateString('en-US')
    : new Date().toLocaleDateString('en-US');
  page.drawText(orderNum, {
    x: width - 36 - fontBold.widthOfTextAtSize(orderNum, 13),
    y: height - 32, size: 13, font: fontBold, color: white,
  });
  page.drawText(dateStr, {
    x: width - 36 - font.widthOfTextAtSize(dateStr, 9),
    y: height - 50, size: 9, font, color: rgb(0.7, 0.7, 0.7),
  });

  let y = height - 90;

  // ── Customer block
  const label = (lbl: string, val: string, yPos: number) => {
    page.drawText(lbl + ':', { x: 36, y: yPos, size: 8, font: fontBold, color: dgray });
    page.drawText(val || '—', { x: 130, y: yPos, size: 9, font, color: black });
  };

  page.drawText('CUSTOMER', { x: 36, y, size: 9, font: fontBold, color: rust });
  y -= 16;
  label('Name',        String(order.customer_name  ?? ''), y); y -= 14;
  label('Phone',       String(order.customer_phone ?? ''), y); y -= 14;
  label('Email',       String(order.customer_email ?? ''), y); y -= 14;
  if (order.job_name) { label('Job', String(order.job_name), y); y -= 14; }
  label('Fulfillment', String(order.fulfillment    ?? ''), y); y -= 20;

  divider(page, y, width, lgray); y -= 18;

  // ── Line items
  page.drawText('ORDER ITEMS', { x: 36, y, size: 9, font: fontBold, color: rust });
  y -= 16;

  // Column headers
  page.drawText('CATEGORY',    { x: 36,  y, size: 7, font: fontBold, color: dgray });
  page.drawText('DESCRIPTION', { x: 150, y, size: 7, font: fontBold, color: dgray });
  page.drawText('AMOUNT',      { x: width - 36 - fontBold.widthOfTextAtSize('AMOUNT', 7), y, size: 7, font: fontBold, color: dgray });
  y -= 12;
  divider(page, y, width, lgray); y -= 14;

  for (const item of lineItems) {
    if (y < 120) {
      // Simple overflow guard — truncate for now
      page.drawText('(additional items on file)', { x: 36, y, size: 8, font, color: dgray });
      y -= 14;
      break;
    }

    const cat  = String(item.category    ?? '');
    const desc = String(item.description ?? '');
    const amt  = item.amount != null
      ? '$' + Number(item.amount).toFixed(2)
      : 'Quote Required';

    const catTrunc  = cat.length  > 16 ? cat.slice(0, 14)  + '…' : cat;
    const descTrunc = desc.length > 50 ? desc.slice(0, 48) + '…' : desc;

    page.drawText(catTrunc,  { x: 36,  y, size: 9, font, color: black });
    page.drawText(descTrunc, { x: 150, y, size: 9, font, color: black });
    page.drawText(amt, {
      x: width - 36 - font.widthOfTextAtSize(amt, 9),
      y, size: 9, font, color: black,
    });
    y -= 13;

    if (item.specs) {
      const specs = String(item.specs);
      const specTrunc = specs.length > 72 ? specs.slice(0, 70) + '…' : specs;
      page.drawText(specTrunc, { x: 150, y, size: 8, font, color: dgray });
      y -= 13;
    }
  }

  // ── Total
  y -= 6;
  divider(page, y, width, lgray); y -= 16;
  const totalStr = order.order_total != null
    ? '$' + Number(order.order_total).toFixed(2)
    : 'Quote Required';
  page.drawText('ORDER TOTAL:', { x: width - 200, y, size: 11, font: fontBold, color: navy });
  page.drawText(totalStr, {
    x: width - 36 - fontBold.widthOfTextAtSize(totalStr, 12),
    y, size: 12, font: fontBold, color: rust,
  });
  y -= 28;

  // ── Notes
  if (order.order_notes) {
    divider(page, y, width, lgray); y -= 18;
    page.drawText('NOTES', { x: 36, y, size: 9, font: fontBold, color: rust });
    y -= 14;
    const notes = String(order.order_notes);
    const noteLines = wrapText(notes, 80);
    for (const line of noteLines) {
      page.drawText(line, { x: 36, y, size: 9, font, color: black });
      y -= 13;
    }
    y -= 8;
  }

  // ── Spec files
  if (specFiles.length > 0) {
    divider(page, y, width, lgray); y -= 18;
    page.drawText('SPEC FILES ATTACHED', { x: 36, y, size: 9, font: fontBold, color: rust });
    y -= 14;
    for (const f of specFiles) {
      const label = `• ${String(f.filename ?? '')}${f.description ? ' — ' + String(f.description) : ''}`;
      page.drawText(label, { x: 36, y, size: 8, font, color: dgray });
      y -= 13;
    }
  }

  // ── Footer
  page.drawRectangle({ x: 0, y: 0, width, height: 28, color: navy });
  page.drawText('Windy Hill Metal Sales — Confidential Work Order', {
    x: 36, y: 10, size: 8, font, color: rgb(0.55, 0.55, 0.55),
  });
  page.drawText(orderNum, {
    x: width - 36 - font.widthOfTextAtSize(orderNum, 8),
    y: 10, size: 8, font, color: rgb(0.55, 0.55, 0.55),
  });

  return pdfDoc.save();
}

function divider(
  page: ReturnType<PDFDocument['addPage']>,
  y: number, width: number,
  color: ReturnType<typeof rgb>,
) {
  page.drawLine({ start: { x: 36, y }, end: { x: width - 36, y }, thickness: 0.5, color });
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = (current + ' ' + word).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}
