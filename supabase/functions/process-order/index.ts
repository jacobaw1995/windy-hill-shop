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

const LOGO_BASE = 'https://gnjpxtxufklhakobgzqv.supabase.co/storage/v1/object/public/product-photos/logos';
const LOGO_WH  = `${LOGO_BASE}/wh-logo.png`;
const LOGO_TCC = `${LOGO_BASE}/tcc-logo.png`;
const LOGO_ST  = `${LOGO_BASE}/StructTech-Logo.png`;

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

  const navy  = rgb(0.102, 0.176, 0.310);
  const rust  = rgb(0.478, 0.188, 0.125);
  const black = rgb(0, 0, 0);
  const lgray = rgb(0.82, 0.82, 0.82);
  const dgray = rgb(0.40, 0.40, 0.40);
  const white = rgb(1, 1, 1);
  const rowbg = rgb(0.95, 0.95, 0.95);

  // ── Fetch logos (fail silently — layout degrades to text placeholders)
  async function fetchPng(url: string) {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return await pdfDoc.embedPng(new Uint8Array(await res.arrayBuffer()));
    } catch { return null; }
  }
  const [whImg, tccImg, stImg] = await Promise.all([
    fetchPng(LOGO_WH), fetchPng(LOGO_TCC), fetchPng(LOGO_ST),
  ]);

  // ── LOGO ZONE (top ~90pt) — two equal bordered boxes side by side
  const logoBoxY = height - 92;
  const logoBoxH = 78;
  const logoBoxW = 148;
  const logoGap  = 10;

  // Windy Hill — bordered box (left)
  page.drawRectangle({
    x: 36, y: logoBoxY, width: logoBoxW, height: logoBoxH,
    borderColor: lgray, borderWidth: 1, color: white,
  });
  if (whImg) {
    const fit = whImg.scaleToFit(logoBoxW - 14, logoBoxH - 10);
    page.drawImage(whImg, {
      x: 36 + (logoBoxW - fit.width) / 2,
      y: logoBoxY + (logoBoxH - fit.height) / 2,
      width: fit.width, height: fit.height,
    });
  } else {
    page.drawText('WINDY HILL', { x: 54, y: logoBoxY + 48, size: 11, font: fontBold, color: navy });
    page.drawText('METAL SALES', { x: 54, y: logoBoxY + 32, size: 9, font, color: navy });
  }

  // The Contracting Company — same-size bordered box (right of WH)
  const tccBoxX = 36 + logoBoxW + logoGap;
  page.drawRectangle({
    x: tccBoxX, y: logoBoxY, width: logoBoxW, height: logoBoxH,
    borderColor: lgray, borderWidth: 1, color: white,
  });
  if (tccImg) {
    const fit = tccImg.scaleToFit(logoBoxW - 14, logoBoxH - 10);
    page.drawImage(tccImg, {
      x: tccBoxX + (logoBoxW - fit.width) / 2,
      y: logoBoxY + (logoBoxH - fit.height) / 2,
      width: fit.width, height: fit.height,
    });
  } else {
    page.drawText('THE CONTRACTING', { x: tccBoxX + 10, y: logoBoxY + 46, size: 9, font: fontBold, color: dgray });
    page.drawText('COMPANY', { x: tccBoxX + 10, y: logoBoxY + 32, size: 9, font: fontBold, color: dgray });
  }

  // Partnership text — right of both logo boxes, structured label/value pairs
  const partnerX = tccBoxX + logoBoxW + 18;
  const partY1 = logoBoxY + logoBoxH - 14;
  page.drawText('PLACED THROUGH', { x: partnerX, y: partY1,      size: 7, font: fontBold, color: dgray });
  page.drawText('The Contracting Company', { x: partnerX, y: partY1 - 13, size: 10, font: fontBold, color: black });
  page.drawText('SUPPLIED BY',    { x: partnerX, y: partY1 - 34, size: 7, font: fontBold, color: dgray });
  page.drawText('Windy Hill Metal Sales', { x: partnerX, y: partY1 - 47, size: 10, font: fontBold, color: black });

  // ── NAVY BAR: WORK ORDER
  const barH = 40;
  const barY = logoBoxY - 4;
  page.drawRectangle({ x: 0, y: barY - barH, width, height: barH, color: navy });

  page.drawText('WORK ORDER', {
    x: 36, y: barY - barH + 13, size: 17, font: fontBold, color: white,
  });

  const orderNum = String(order.order_number ?? '');
  const dateStr  = order.created_at
    ? new Date(String(order.created_at)).toLocaleDateString('en-US')
    : new Date().toLocaleDateString('en-US');

  page.drawText(orderNum, {
    x: width - 36 - fontBold.widthOfTextAtSize(orderNum, 11),
    y: barY - barH + 22, size: 11, font: fontBold, color: rust,
  });
  page.drawText('Date: ' + dateStr, {
    x: width - 36 - font.widthOfTextAtSize('Date: ' + dateStr, 8),
    y: barY - barH + 9, size: 8, font, color: rgb(0.72, 0.72, 0.72),
  });

  let y = barY - barH - 22;

  // ── CUSTOMER SECTION
  page.drawText('CUSTOMER', { x: 36, y, size: 7.5, font: fontBold, color: dgray });
  y -= 8;
  page.drawLine({ start: { x: 36, y }, end: { x: width - 36, y }, thickness: 0.5, color: lgray });
  y -= 16;

  // 2-column layout helpers
  const lbl = (text: string, x: number, yy: number) =>
    page.drawText(text, { x, y: yy, size: 7, font: fontBold, color: dgray });
  const val = (text: string, x: number, yy: number) =>
    page.drawText(String(text) || '—', { x, y: yy, size: 9, font, color: black });

  const c1L = 36, c1V = 108, c2L = 306, c2V = 378;

  // Row 1: Name | Phone
  lbl('NAME', c1L, y);  val(String(order.customer_name  ?? ''), c1V, y);
  lbl('PHONE', c2L, y); val(String(order.customer_phone ?? ''), c2V, y);
  y -= 16;

  // Row 2: Email | Job
  lbl('EMAIL', c1L, y); val(String(order.customer_email ?? ''), c1V, y);
  if (order.job_name) { lbl('JOB', c2L, y); val(String(order.job_name), c2V, y); }
  y -= 16;

  // Row 3: Fulfillment
  const fulfillRaw = String(order.fulfillment ?? '');
  lbl('FULFILLMENT', c1L, y);
  val(fulfillRaw.charAt(0).toUpperCase() + fulfillRaw.slice(1), c1V, y);
  y -= 24;

  // ── ORDER ITEMS
  page.drawText('ORDER ITEMS', { x: 36, y, size: 7.5, font: fontBold, color: dgray });
  y -= 8;
  page.drawLine({ start: { x: 36, y }, end: { x: width - 36, y }, thickness: 0.5, color: lgray });
  y -= 2;

  // Table header row (gray background)
  const hdrH = 18;
  page.drawRectangle({ x: 36, y: y - hdrH, width: width - 72, height: hdrH, color: rowbg });
  const hdrY = y - hdrH + 5;
  page.drawText('CATEGORY',    { x: 46,           y: hdrY, size: 7, font: fontBold, color: dgray });
  page.drawText('DESCRIPTION', { x: 172,          y: hdrY, size: 7, font: fontBold, color: dgray });
  page.drawText('AMOUNT', {
    x: width - 36 - fontBold.widthOfTextAtSize('AMOUNT', 7),
    y: hdrY, size: 7, font: fontBold, color: dgray,
  });
  y -= hdrH + 8;

  // Line item rows
  for (const item of lineItems) {
    if (y < 110) {
      page.drawText('(additional items on file)', { x: 46, y, size: 8, font, color: dgray });
      y -= 14; break;
    }
    const cat  = String(item.category    ?? '');
    const desc = String(item.description ?? '');
    const amt  = item.amount != null ? '$' + Number(item.amount).toFixed(2) : 'Quote Required';

    page.drawText(cat.length  > 20 ? cat.slice(0, 18)  + '…' : cat,  { x: 46,  y, size: 9, font, color: black });
    page.drawText(desc.length > 52 ? desc.slice(0, 50) + '…' : desc, { x: 172, y, size: 9, font, color: black });
    page.drawText(amt, {
      x: width - 36 - font.widthOfTextAtSize(amt, 9), y, size: 9, font, color: black,
    });
    y -= 13;

    if (item.specs) {
      const s = String(item.specs);
      page.drawText(s.length > 72 ? s.slice(0, 70) + '…' : s, { x: 172, y, size: 8, font, color: dgray });
      y -= 14;
    } else {
      y -= 5;
    }
  }

  y -= 14;

  // ── ORDER TOTAL — rust box, right-aligned
  const totalStr = order.order_total != null
    ? '$' + Number(order.order_total).toFixed(2)
    : 'Quote Required';
  const boxW = 196, boxH = 32;
  const boxX = width - 36 - boxW;
  const boxY = y - boxH;
  page.drawRectangle({ x: boxX, y: boxY, width: boxW, height: boxH, color: rust });
  page.drawText('ORDER TOTAL', {
    x: boxX + 12, y: boxY + boxH / 2 - 3, size: 8.5, font: fontBold, color: white,
  });
  page.drawText(totalStr, {
    x: boxX + boxW - 12 - fontBold.widthOfTextAtSize(totalStr, 13),
    y: boxY + boxH / 2 - 5, size: 13, font: fontBold, color: white,
  });
  y = boxY - 18;

  // ── Notes
  if (order.order_notes) {
    page.drawLine({ start: { x: 36, y }, end: { x: width - 36, y }, thickness: 0.5, color: lgray });
    y -= 14;
    page.drawText('NOTES', { x: 36, y, size: 7.5, font: fontBold, color: dgray });
    y -= 13;
    for (const line of wrapText(String(order.order_notes), 95)) {
      page.drawText(line, { x: 36, y, size: 9, font, color: black });
      y -= 13;
    }
    y -= 6;
  }

  // ── Spec files — note on main page, full drawings on separate pages
  if (specFiles.length > 0) {
    page.drawLine({ start: { x: 36, y }, end: { x: width - 36, y }, thickness: 0.5, color: lgray });
    y -= 14;
    page.drawText('CUSTOM DRAWINGS', { x: 36, y, size: 7.5, font: fontBold, color: dgray });
    y -= 13;
    const dc = specFiles.length;
    page.drawText(
      `${dc} custom drawing${dc > 1 ? 's' : ''} attached — see following page${dc > 1 ? 's' : ''}`,
      { x: 36, y, size: 8, font, color: dgray },
    );
  }

  // ── FOOTER
  page.drawLine({ start: { x: 36, y: 52 }, end: { x: width - 36, y: 52 }, thickness: 0.5, color: lgray });
  page.drawText('Windy Hill Metal Sales — Confidential Work Order', { x: 36, y: 38, size: 7.5, font, color: dgray });
  page.drawText(orderNum, { x: 36, y: 26, size: 7.5, font, color: dgray });

  // "Powered by StructTech" — right side of footer
  const pbLabel = 'Powered by ';
  const stLabel = 'StructTech';
  const pbW = font.widthOfTextAtSize(pbLabel, 8);
  const stW = fontBold.widthOfTextAtSize(stLabel, 9);
  const footerRightX = width - 36;

  if (stImg) {
    const fit = stImg.scaleToFit(18, 18);
    page.drawImage(stImg, {
      x: footerRightX - pbW - stW - fit.width - 5,
      y: 26, width: fit.width, height: fit.height,
    });
  }
  page.drawText(pbLabel, { x: footerRightX - pbW - stW, y: 32, size: 8, font, color: dgray });
  page.drawText(stLabel, { x: footerRightX - stW,       y: 32, size: 9, font: fontBold, color: rust });

  // Pair spec files with their matching Custom Trim line items by position
  const customTrimItems = lineItems.filter(item =>
    String(item.description ?? '').startsWith('Custom Trim')
  );

  // ── Drawing pages — one per spec file
  for (let fi = 0; fi < specFiles.length; fi++) {
    const f = specFiles[fi];
    const url = String(f.storage_url ?? '');
    if (!url) continue;

    let imgBytes: Uint8Array;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      imgBytes = new Uint8Array(await res.arrayBuffer());
    } catch { continue; }

    let img;
    try {
      const fname = String(f.filename ?? '').toLowerCase();
      img = (fname.endsWith('.jpg') || fname.endsWith('.jpeg'))
        ? await pdfDoc.embedJpg(imgBytes)
        : await pdfDoc.embedPng(imgBytes);
    } catch { continue; }

    const dPage = pdfDoc.addPage([612, 792]);
    const dw = dPage.getWidth(), dh = dPage.getHeight();

    // Header bar
    dPage.drawRectangle({ x: 0, y: dh - 48, width: dw, height: 48, color: navy });
    dPage.drawText('CUSTOM TRIM DRAWING', { x: 36, y: dh - 22, size: 10, font: fontBold, color: white });
    dPage.drawText(orderNum, {
      x: dw - 36 - fontBold.widthOfTextAtSize(orderNum, 9),
      y: dh - 22, size: 9, font: fontBold, color: white,
    });
    dPage.drawText(`Drawing ${fi + 1} of ${specFiles.length}`, {
      x: 36, y: dh - 38, size: 8, font, color: rgb(0.7, 0.7, 0.7),
    });

    // Trim spec panel — light gray strip below header
    const trimItem = customTrimItems[fi] ?? null;
    let specPanelH = 0;
    if (trimItem) {
      // Strip "Custom Trim — " prefix to get the profile name + specs
      const rawDesc  = String(trimItem.description ?? '');
      const trimDesc = rawDesc.replace(/^Custom Trim\s*[—\-]\s*/i, '');
      const trimSpecs = String(trimItem.specs ?? '');
      const trimAmt   = trimItem.amount != null
        ? '$' + Number(trimItem.amount).toFixed(2)
        : 'Quote Required';

      specPanelH = 56;
      const panelY = dh - 48 - specPanelH;
      dPage.drawRectangle({ x: 0, y: panelY, width: dw, height: specPanelH, color: rgb(0.96, 0.96, 0.97) });
      dPage.drawLine({ start: { x: 0, y: panelY }, end: { x: dw, y: panelY }, thickness: 0.5, color: lgray });

      // Profile name / description
      const trimDescTrunc = trimDesc.length > 70 ? trimDesc.slice(0, 68) + '…' : trimDesc;
      dPage.drawText(trimDescTrunc, { x: 36, y: panelY + 36, size: 11, font: fontBold, color: navy });

      // Specs (linear footage)
      if (trimSpecs) {
        dPage.drawText(trimSpecs, { x: 36, y: panelY + 18, size: 9, font, color: dgray });
      }

      // Amount right-aligned
      dPage.drawText(trimAmt, {
        x: dw - 36 - fontBold.widthOfTextAtSize(trimAmt, 12),
        y: panelY + 22, size: 12, font: fontBold, color: rust,
      });
    }

    // Image — centered in remaining space
    const margin   = 36;
    const topUsed  = 48 + specPanelH;
    const maxW = dw - margin * 2;
    const maxH = dh - topUsed - margin * 2;
    const scaled = img.scaleToFit(maxW, maxH);
    dPage.drawImage(img, {
      x: margin + (maxW - scaled.width) / 2,
      y: margin + (maxH - scaled.height) / 2,
      width: scaled.width,
      height: scaled.height,
    });
  }

  return pdfDoc.save();
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
