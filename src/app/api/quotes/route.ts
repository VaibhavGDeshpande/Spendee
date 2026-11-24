import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ISIN_RE, YAHOO_UA, searchSymbol } from '@/lib/yahoo';

// Yahoo Finance public endpoints: keyless, cover XETRA/gettex listings and ISIN lookup
// (what a Scalable Capital depot holds). Upstream fetches are cached 5 min per symbol.
const QUOTE_TTL = 300;
const SYMBOL_RE = /^[A-Z0-9.\-^=]{1,20}$/;

async function fetchChart(symbol: string) {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`,
    { headers: YAHOO_UA, next: { revalidate: QUOTE_TTL } },
  );
  if (!res.ok) return null;
  return (await res.json())?.chart?.result?.[0]?.meta ?? null;
}

async function eurPerUnit(currency: string): Promise<number | null> {
  if (currency === 'EUR') return 1;
  const res = await fetch(`https://api.frankfurter.app/latest?from=EUR&to=${encodeURIComponent(currency)}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  const rate = Number((await res.json())?.rates?.[currency]);
  return rate > 0 ? 1 / rate : null;
}

async function fetchQuote(input: string) {
  // Try as a ticker first; fall back to ISIN / name search.
  let symbol: string | null = ISIN_RE.test(input) ? null : input;
  let meta = symbol ? await fetchChart(symbol) : null;
  if (!meta) {
    symbol = await searchSymbol(input);
    meta = symbol ? await fetchChart(symbol) : null;
  }
  if (!meta || !symbol) return null;
  let price = Number(meta?.regularMarketPrice);
  let currency = String(meta?.currency ?? '');
  if (!(price > 0) || !currency) return null;
  // London quotes in pence
  if (currency === 'GBp' || currency === 'GBX') {
    price /= 100;
    currency = 'GBP';
  }
  const fx = await eurPerUnit(currency.toUpperCase());
  if (!fx) return null;
  return {
    symbol: input,
    resolved_symbol: symbol,
    name: meta.longName ?? meta.shortName ?? symbol,
    price,
    currency,
    price_eur: price * fx,
    market_time: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : null,
  };
}

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
