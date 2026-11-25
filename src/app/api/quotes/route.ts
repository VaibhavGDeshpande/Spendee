import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchQuote } from '@/lib/yahoo';

// Yahoo Finance public endpoints: keyless, cover XETRA/gettex listings and ISIN lookup
// (what a Scalable Capital depot holds). Pricing lives in lib/yahoo.ts.
const SYMBOL_RE = /^[A-Z0-9.\-^=]{1,20}$/;

// GET /api/quotes?symbols=VWCE.DE,IE00B4L5Y983
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const raw = new URL(request.url).searchParams.get('symbols') ?? '';
  const symbols = [...new Set(raw.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean))];
  if (symbols.length === 0 || symbols.length > 30 || !symbols.every((s) => SYMBOL_RE.test(s))) {
    return NextResponse.json({ error: 'Provide 1-30 valid symbols or ISINs' }, { status: 400 });
  }

  const results = await Promise.all(symbols.map((s) => fetchQuote(s).catch(() => null)));
  const quotes = Object.fromEntries(results.flatMap((q) => (q ? [[q.symbol, q]] : [])));
  const missing = symbols.filter((s) => !quotes[s]);
  return NextResponse.json({ quotes, missing, fetched_at: new Date().toISOString() });
}
