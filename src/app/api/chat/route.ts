import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { aiConfig } from '@/lib/ai';

const MAX_IMAGE_CHARS = 8 * 1024 * 1024;

// Compact, model-readable snapshot of the user's spending. shortcut: capped at the latest
// 1000 expenses and 300 distinct items; raise the caps (or filter by question) if that is too few.
async function spendingContext(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('amount_in_eur, transaction_date, merchant, notes, category:categories!transactions_category_id_fkey(name), items:transaction_items(item_name, quantity, total_price)')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .order('transaction_date', { ascending: false })
    .limit(1000);
  if (error) throw error;

  const items = new Map<string, { total: number; count: number; last: string }>();
  const merchants = new Map<string, number>();
  const months = new Map<string, number>();
  // Scanned receipts live in notes (item and price lists); newest 40, capped so the prompt stays small.
  const receipts: { date: string; merchant: string | null; text: string }[] = [];
  for (const t of (data ?? []) as any[]) {
    if (t.notes?.trim() && receipts.length < 40) {
      receipts.push({ date: t.transaction_date, merchant: t.merchant, text: String(t.notes).slice(0, 1500) });
    }
    const eur = Number(t.amount_in_eur) || 0;
    const m = t.merchant?.trim() || 'Unknown';
    merchants.set(m, (merchants.get(m) ?? 0) + eur);
    const month = String(t.transaction_date).slice(0, 7);
    months.set(month, (months.get(month) ?? 0) + eur);
    for (const i of t.items ?? []) {
      const key = String(i.item_name).trim().toLowerCase();
      if (!key) continue;
      const it = items.get(key) ?? { total: 0, count: 0, last: t.transaction_date };
      it.total += Number(i.total_price) || 0;
      it.count += Number(i.quantity) || 1;
      if (t.transaction_date > it.last) it.last = t.transaction_date;
      items.set(key, it);
    }
  }
  const r = (n: number) => Math.round(n * 100) / 100;
  return {
    currency: 'EUR',
    items: [...items].sort((a, b) => b[1].total - a[1].total).slice(0, 300)
      .map(([name, v]) => ({ name, total: r(v.total), units: v.count, last_bought: v.last })),
    merchants: [...merchants].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([name, total]) => ({ name, total: r(total) })),
    receipts,
    monthly_totals: [...months].sort().slice(-12).map(([month, total]) => ({ month, total: r(total) })),
  };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ai = aiConfig();
    if (!ai) return NextResponse.json({ error: 'AI is not configured on the server' }, { status: 503 });

    const body = await req.json().catch(() => null);
    const messages: { role: 'user' | 'assistant'; content: string }[] = (Array.isArray(body?.messages) ? body.messages : [])
      .filter((m: any) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string')
      .slice(-12)
      .map((m: any) => ({ role: m.role, content: m.content.slice(0, 1000) }));
    if (messages.at(-1)?.role !== 'user') return NextResponse.json({ error: 'Ask a question first' }, { status: 400 });

    const image = typeof body.image === 'string' && /^data:image\/[a-z+.-]+;base64,/i.test(body.image) && body.image.length <= MAX_IMAGE_CHARS
      ? body.image : null;

    const context = await spendingContext(supabase, user.id);
    const last = messages.length - 1;
    const res = await fetch(`${ai.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ai.apiKey}` },
      body: JSON.stringify({
        model: ai.model,
        messages: [
          {
            role: 'system',
            content: `You are the assistant inside a personal expense tracker. Answer questions about the user's spending using ONLY the data below${image ? ' and the attached receipt image' : ''}. Item names come from German receipts (e.g. "Vollmilch" is milk): match by meaning, and add up every matching item. "receipts" holds the item and price list of each scanned receipt as text: use it for item-level questions too, and do not count the same purchase twice if it also appears in "items". Format every spending answer like this: one plain sentence with the total in **bold** (e.g. "You spent **€4.19** on eggs."), then a short "- " list with one line per matching purchase: "- 9 Nov 2026, Aldi, Eier 10er: €2.29". If several stores or dates match, finish with a one-line count ("3 purchases across 2 stores"). Write dates as "9 Nov 2026". Never say "listed item"; name the product and the store instead. Only **bold** the total. If the data does not contain the answer, say so plainly and name what is missing; never invent numbers. Keep answers short.\n\nSpending data:\n${JSON.stringify(context)}`,
          },
          ...messages.map((m, i) => i === last && image
            ? { role: 'user', content: [{ type: 'text', text: m.content }, { type: 'image_url', image_url: { url: image } }] }
            : m),
        ],
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) {
      console.error('AI chat error:', res.status, await res.text());
      return NextResponse.json({ error: 'The AI service could not answer right now' }, { status: 502 });
    }
    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (typeof reply !== 'string' || !reply.trim()) return NextResponse.json({ error: 'Empty answer from the AI service' }, { status: 502 });
    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
