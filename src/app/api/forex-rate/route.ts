import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const revalidate = 3600; // Cache route for 1 hour

// Returns live EUR → INR rate (same as /api/rates but also returns EUR→USD for Forex Account display)
export async function GET() {
  const supabase = await createClient();
  const ONE_HOUR_MS = 60 * 60 * 1000;

  try {
    // Check Supabase exchange_rates table for recent cache (EUR→EUR is rate=1, so we fetch EUR→USD)
    const { data: cached } = await (supabase.from('exchange_rates') as any)
      .select('*')
      .eq('base_currency', 'EUR')
      .eq('target_currency', 'USD')
      .single();

    if (cached) {
      const fetchedTime = new Date(cached.fetched_at).getTime();
      const isFresh = Date.now() - fetchedTime < ONE_HOUR_MS;

      if (isFresh) {
        return NextResponse.json({
          eur_usd: Number(cached.rate),
          base: 'EUR',
          last_updated: cached.fetched_at,
          from_cache: true,
        });
      }
    }

    // Fetch fresh EUR→USD rate from Frankfurter (ECB official rates)
    const response = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD,GBP,CHF,JPY', {
      next: { revalidate: 3600 },
    });

    if (response.ok) {
      const data = await response.json();
      const eurUsd = data?.rates?.USD;

      if (eurUsd) {
        const nowIso = new Date().toISOString();

        // Upsert EUR→USD into cache
        await (supabase.from('exchange_rates') as any).upsert({
          base_currency: 'EUR',
          target_currency: 'USD',
          rate: eurUsd,
          fetched_at: nowIso,
        });

        return NextResponse.json({
          eur_usd: eurUsd,
          rates: data.rates,
          base: 'EUR',
          date: data.date,
          last_updated: nowIso,
          from_cache: false,
        });
      }
    }

    // Graceful fallback to stale DB cache
    if (cached) {
      return NextResponse.json({
        eur_usd: Number(cached.rate),
        base: 'EUR',
        last_updated: cached.fetched_at,
        from_cache: true,
        stale: true,
      });
    }

    // Default fallback
    return NextResponse.json({
      eur_usd: 1.12,
      base: 'EUR',
      last_updated: new Date().toISOString(),
      from_cache: true,
      fallback: true,
    });
  } catch (error) {
    console.error('Error fetching forex rate:', error);
    return NextResponse.json({
      eur_usd: 1.12,
      base: 'EUR',
      last_updated: new Date().toISOString(),
      from_cache: true,
      fallback: true,
    });
  }
}
