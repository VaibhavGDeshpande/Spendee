import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchStocks } from '@/lib/yahoo';

// GET /api/quotes/search?q=nvidia → tradeable listings for the holding autocomplete
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const q = (new URL(request.url).searchParams.get('q') ?? '').trim();
  if (q.length < 2 || q.length > 50) return NextResponse.json({ results: [] });

  try {
    return NextResponse.json({ results: await searchStocks(q, 15) });
  } catch (err) {
    console.error('[quotes/search]', err);
    return NextResponse.json({ results: [] }, { status: 502 });
  }
}
