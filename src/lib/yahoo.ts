// Server-side Yahoo Finance helpers (used by /api/quotes and /api/quotes/search).
// shortcut: unofficial API with no SLA, swap for a keyed provider (server-only env var) if it starts rate-limiting.

export const YAHOO_UA = { 'User-Agent': 'Mozilla/5.0 (compatible; Spendee/1.0)' };
export const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}\d$/;

export interface StockMatch {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

const TRADEABLE = ['EQUITY', 'ETF', 'MUTUALFUND'];
// XETRA first, then other German venues (gettex = Munich), which is where Scalable Capital trades.
const rank = (s: string) => (s.endsWith('.DE') ? 0 : /\.(F|SG|MU|BE|DU|HM)$/.test(s) ? 1 : 2);

export async function searchStocks(query: string, limit = 10): Promise<StockMatch[]> {
  const res = await fetch(
    `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=${limit}&newsCount=0`,
    { headers: YAHOO_UA, next: { revalidate: 86400 } },
  );
  if (!res.ok) return [];
  type Hit = { symbol?: string; quoteType?: string; shortname?: string; longname?: string; exchDisp?: string; typeDisp?: string };
  const hits: Hit[] = (await res.json())?.quotes ?? [];
  return hits
    .filter((q) => q.symbol && TRADEABLE.includes(q.quoteType ?? ''))
    .map((q) => ({
      symbol: q.symbol!,
      name: q.longname ?? q.shortname ?? q.symbol!,
      exchange: q.exchDisp ?? '',
      type: q.typeDisp ?? q.quoteType ?? '',
    }))
    .sort((a, b) => rank(a.symbol) - rank(b.symbol));
}

// Pick one listing for an ISIN or company name (e.g. "NVIDIA").
export async function searchSymbol(input: string): Promise<string | null> {
  const isIsin = ISIN_RE.test(input);
  const matches = await searchStocks(input);
  // Name searches are fuzzy: require the name to contain the query so we never misprice.
  const ok = matches.filter((m) => isIsin || m.name.toUpperCase().includes(input.toUpperCase()));
  return ok[0]?.symbol ?? null;
}

// Upstream quote fetches are cached 5 min per symbol.
const QUOTE_TTL = 300;

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

export async function fetchQuote(input: string) {
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
