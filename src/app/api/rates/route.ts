import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const revalidate = 3600; // Cache route for 1 hour

export async function GET() {
  try {
    const supabase = await createClient();
    const oneHourMs = 60 * 60 * 1000;
    const targets = ['INR', 'USD'] as const;
    type CachedRate = { target_currency: string; rate: number | string; fetched_at: string };
    const { data: cachedRows } = await (supabase.from('exchange_rates') as any)
      .select('target_currency, rate, fetched_at')
      .eq('base_currency', 'EUR')
      .in('target_currency', [...targets]);
    const cachedByCurrency = new Map<string, CachedRate>(
      (cachedRows ?? []).map((row: CachedRate) => [row.target_currency, row]),
    );
    const needsRefresh = targets.filter((target) => {
      const cached = cachedByCurrency.get(target);
      return !cached || Date.now() - new Date(cached.fetched_at).getTime() >= oneHourMs;
    });
    const fetchedRates: Record<string, number> = {};

    if (needsRefresh.length > 0) {
      try {
        const url = `https://api.frankfurter.app/latest?from=EUR&to=${needsRefresh.join(',')}`;
        const response = await fetch(url, {
          next: { revalidate: 3600 },
          signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
          const data = await response.json();
          Object.assign(fetchedRates, data?.rates ?? {});
          const fetchedAt = new Date().toISOString();
          const rows = needsRefresh.flatMap((target) => {
            const rate = Number(fetchedRates[target]);
            return Number.isFinite(rate) && rate > 0
              ? [{ base_currency: 'EUR', target_currency: target, rate, fetched_at: fetchedAt }]
              : [];
          });
          if (rows.length > 0) {
            await (supabase.from('exchange_rates') as any).upsert(rows);
          }
          for (const row of rows) {
            cachedByCurrency.set(row.target_currency, row);
          }
        }
      } catch (error) {
        console.warn('Frankfurter rate refresh failed; using cached rates:', error);
      }
    }

    const rates = Object.fromEntries(targets.map((target) => {
      const freshRate = Number(fetchedRates[target]);
      const cached = cachedByCurrency.get(target);
      const hasFreshRate = Number.isFinite(freshRate) && freshRate > 0;
      const fallbackRate = target === 'INR' ? 91.5 : 1.12;
      return [target, {
        rate: hasFreshRate ? freshRate : cached ? Number(cached.rate) : fallbackRate,
        last_updated: hasFreshRate ? new Date().toISOString() : cached?.fetched_at ?? new Date().toISOString(),
        from_cache: !hasFreshRate,
        stale: !hasFreshRate && Boolean(cached),
        fallback: !hasFreshRate && !cached,
      }];
    }));

    return NextResponse.json({
      rate: rates.INR.rate,
      base: 'EUR',
      target: 'INR',
      last_updated: rates.INR.last_updated,
      from_cache: rates.INR.from_cache,
      stale: rates.INR.stale,
      fallback: rates.INR.fallback,
      eur_usd: rates.USD.rate,
      eur_usd_last_updated: rates.USD.last_updated,
      eur_usd_from_cache: rates.USD.from_cache,
    });
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return NextResponse.json({
      rate: 91.5,
      base: 'EUR',
      target: 'INR',
      last_updated: new Date().toISOString(),
      from_cache: true,
      fallback: true,
      eur_usd: 1.12,
      eur_usd_from_cache: true,
      eur_usd_fallback: true,
    });
  }
}
