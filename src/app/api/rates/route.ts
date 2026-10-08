import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const revalidate = 3600; // Cache route for 1 hour

export async function GET() {
  const supabase = await createClient();
  const ONE_HOUR_MS = 60 * 60 * 1000;

  try {
    // 1. Check Supabase exchange_rates table for recent cache
    const { data: cached } = await (supabase.from('exchange_rates') as any)
      .select('*')
      .eq('base_currency', 'EUR')
      .eq('target_currency', 'INR')
      .single();

    if (cached) {
      const fetchedTime = new Date(cached.fetched_at).getTime();
      const isFresh = Date.now() - fetchedTime < ONE_HOUR_MS;

      if (isFresh) {
        return NextResponse.json({
          rate: Number(cached.rate),
          base: 'EUR',
          target: 'INR',
          last_updated: cached.fetched_at,
          from_cache: true,
        });
      }
    }

    // 2. Fetch fresh rate from Frankfurter API
    const response = await fetch('https://api.frankfurter.app/latest?from=EUR&to=INR', {
      next: { revalidate: 3600 },
    });

    if (response.ok) {
      const data = await response.json();
      const freshRate = data?.rates?.INR;

      if (freshRate) {
        const nowIso = new Date().toISOString();

        // Upsert into Supabase exchange_rates cache table
        await (supabase.from('exchange_rates') as any).upsert({
          base_currency: 'EUR',
          target_currency: 'INR',
          rate: freshRate,
          fetched_at: nowIso,
        });

        return NextResponse.json({
          rate: freshRate,
          base: 'EUR',
          target: 'INR',
          last_updated: nowIso,
          from_cache: false,
        });
      }
    }

    // 3. Graceful Fallback to stale DB cache if external API failed
    if (cached) {
      return NextResponse.json({
        rate: Number(cached.rate),
        base: 'EUR',
        target: 'INR',
        last_updated: cached.fetched_at,
        from_cache: true,
        stale: true,
      });
    }

    // Default fallback rate (~91.5 INR = 1 EUR)
    return NextResponse.json({
      rate: 91.5,
      base: 'EUR',
      target: 'INR',
      last_updated: new Date().toISOString(),
      from_cache: true,
      fallback: true,
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
    });
  }
}
