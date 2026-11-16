import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { aiConfig } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > 6 * 1024 * 1024) {
      return NextResponse.json({ error: 'Receipt upload must be 6MB or smaller' }, { status: 413 });
    }

    const formData = await req.formData();
    const fileEntry = formData.get('file');
    const base64Entry = formData.get('base64');
    const file = fileEntry instanceof File ? fileEntry : null;
    const base64Image = typeof base64Entry === 'string' ? base64Entry : null;

    if (!file && !base64Image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (file && (file.size > 5 * 1024 * 1024 || !file.type.startsWith('image/'))) {
      return NextResponse.json({ error: 'Upload a supported receipt image up to 5MB' }, { status: 400 });
    }
    if (base64Image) {
      const dataUrl = base64Image.match(/^data:image\/[a-z+.-]+;base64,([A-Za-z0-9+/=\r\n]+)$/i);
      if (!dataUrl) return NextResponse.json({ error: 'Invalid receipt image data' }, { status: 400 });
      const decodedSize = Math.floor(dataUrl[1].length * 3 / 4) - (dataUrl[1].endsWith('==') ? 2 : dataUrl[1].endsWith('=') ? 1 : 0);
      if (decodedSize > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'Receipt upload must be 5MB or smaller' }, { status: 413 });
      }
    }

    const ai = aiConfig();
    if (!ai) return NextResponse.json({ error: 'AI is not configured on the server' }, { status: 503 });

    const imageUrl = base64Image
      ?? `data:${file!.type};base64,${Buffer.from(await file!.arrayBuffer()).toString('base64')}`;

    const res = await fetch(`${ai.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ai.apiKey}` },
      body: JSON.stringify({
        model: ai.model,
        messages: [
          {
            role: 'system',
            content: `You are an expert OCR parser for receipts, especially German ones (Aldi, Lidl, Rewe, dm, Edeka, Rossmann).
Read the receipt image and return: merchant, transaction_date (YYYY-MM-DD), total_amount, currency (default "EUR") and every purchased line as line_items { item_name, unit_price, quantity, total_price }.
Parse German decimal commas (3,49 -> 3.49). Look for keywords like "SUMME", "GESAMT", "MwSt". Use null for anything you cannot read; never guess a price.`,
          },
          { role: 'user', content: [{ type: 'text', text: 'Parse this receipt.' }, { type: 'image_url', image_url: { url: imageUrl } }] },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'receipt',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                merchant: { type: ['string', 'null'] },
                transaction_date: { type: ['string', 'null'] },
                total_amount: { type: ['number', 'null'] },
                currency: { type: 'string' },
                line_items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      item_name: { type: 'string' },
                      unit_price: { type: ['number', 'null'] },
                      quantity: { type: 'number' },
                      total_price: { type: 'number' },
                    },
                    required: ['item_name', 'unit_price', 'quantity', 'total_price'],
                  },
                },
              },
              required: ['merchant', 'transaction_date', 'total_amount', 'currency', 'line_items'],
            },
          },
        },
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      console.error('AI receipt scan error:', res.status, await res.text());
      return NextResponse.json({ error: 'The AI service could not read this receipt right now' }, { status: 502 });
    }
    const data = await res.json();
    const ocr = JSON.parse(data?.choices?.[0]?.message?.content ?? '');
    return NextResponse.json({ success: true, ocr, provider: ai.model });
  } catch (err: unknown) {
    console.error('OCR Endpoint Error:', err);
    return NextResponse.json({ error: 'Failed to process receipt OCR' }, { status: 500 });
  }
}
