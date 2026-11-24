'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Edit2, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { Holding } from '@/types';
import { createHolding, updateHolding, deleteHolding, valuePortfolio, Quote } from '@/lib/holdings';

const REFRESH_MS = 5 * 60 * 1000; // matches /api/quotes upstream cache

const eur = (n: number) => `€${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (s: string) => parseFloat(s.replace(',', '.'));

interface Props {
  accountId: string;
  holdings: Holding[];
  onChange: () => void;
}

export default function HoldingsPanel({ accountId, holdings, onChange }: Props) {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [missing, setMissing] = useState<string[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // null = closed, 'new' = adding, otherwise holding id being edited
  const [formId, setFormId] = useState<string | null>(null);
  const [form, setForm] = useState({ symbol: '', quantity: '', price: '' });
  const [error, setError] = useState<string | null>(null);

  const symbolsKey = [...new Set(holdings.map((h) => h.symbol))].sort().join(',');

  const loadQuotes = useCallback(async () => {
    if (!symbolsKey) return;
    try {
      const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(symbolsKey)}`);
      if (res.ok) {
        const data = await res.json();
        setQuotes(data.quotes ?? {});
        setMissing(data.missing ?? []);
        setUpdatedAt(data.fetched_at ?? null);
      }
    } catch (err) {
      console.warn('[HoldingsPanel] quote refresh failed', err);
    } finally {
      setRefreshing(false);
    }
  }, [symbolsKey]);

  useEffect(() => {
    const first = setTimeout(loadQuotes, 0);
    const t = setInterval(loadQuotes, REFRESH_MS);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [loadQuotes]);

  const openForm = (h?: Holding) => {
    setError(null);
    setFormId(h ? h.id : 'new');
    setForm(h
      ? { symbol: h.symbol, quantity: String(h.quantity), price: String(h.avg_buy_price_eur) }
      : { symbol: '', quantity: '', price: '' });
  };

  const save = async () => {
    const params = { symbol: form.symbol, quantity: num(form.quantity), avg_buy_price_eur: num(form.price) };
    const res = formId === 'new'
      ? await createHolding({ ...params, account_id: accountId })
      : await updateHolding(formId!, params);
    if (!res.success) {
      setError(res.error || 'Could not save');
      return;
    }
    setFormId(null);
    onChange();
  };

  const remove = async (h: Holding) => {
    if (!confirm(`Remove ${h.symbol} from this account?`)) return;
    if (await deleteHolding(h.id)) onChange();
  };

  const { marketValue, costBasis, gain, gainPct } = valuePortfolio(holdings, quotes);
  const gainClass = gain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
  const inputClass = 'w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-950 border rounded-lg text-xs font-semibold text-slate-900 dark:text-white';

  return (
    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
      {holdings.length > 0 && (
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">Portfolio Value</span>
            <button
              onClick={() => {
                setRefreshing(true);
                loadQuotes();
              }}
              disabled={refreshing}
              className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg"
              title={updatedAt ? `Prices fetched ${new Date(updatedAt).toLocaleTimeString()}` : 'Refresh prices'}
              aria-label="Refresh prices"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <p className="font-extrabold text-2xl text-slate-900 dark:text-white">{eur(marketValue)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cost {eur(costBasis)} ·{' '}
            <span className={`font-semibold ${gainClass}`}>
              {gain >= 0 ? '+' : ''}{eur(gain)} ({gainPct >= 0 ? '+' : ''}{gainPct.toFixed(2)}%)
            </span>
          </p>
          {missing.length > 0 && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
              No price for: {missing.join(', ')}. Use a ticker (e.g. NVD.DE) or ISIN; private companies can&apos;t be priced.
            </p>
          )}
        </div>
      )}

      <ul className="space-y-1.5">
        {holdings.map((h) => {
          const q = quotes[h.symbol];
          const value = q ? h.quantity * q.price_eur : null;
          const pl = value !== null ? value - h.quantity * h.avg_buy_price_eur : null;
          return (
            <li key={h.id} className="flex items-center justify-between text-xs gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 dark:text-white truncate" title={q?.name}>{h.symbol}</p>
                <p className="text-slate-400">
                  {h.quantity} × {q ? eur(q.price_eur) : '—'}
                  {q?.resolved_symbol && q.resolved_symbol !== h.symbol && ` · ${q.resolved_symbol}`}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <div className="text-right">
                  <p className="font-semibold text-slate-900 dark:text-white">{value !== null ? eur(value) : '—'}</p>
                  {pl !== null && (
                    <p className={pl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                      {pl >= 0 ? '+' : ''}{eur(pl)}
                    </p>
                  )}
                </div>
                <button onClick={() => openForm(h)} className="p-1 text-slate-400 hover:text-indigo-600" aria-label={`Edit ${h.symbol}`}>
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => remove(h)} className="p-1 text-slate-400 hover:text-rose-600" aria-label={`Remove ${h.symbol}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {formId ? (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <input
              className={inputClass}
              placeholder="Ticker / ISIN"
              aria-label="Ticker or ISIN"
              value={form.symbol}
              onChange={(e) => setForm({ ...form, symbol: e.target.value })}
            />
            <input
              className={inputClass}
              placeholder="Qty"
              aria-label="Quantity"
              inputMode="decimal"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
            <input
              className={inputClass}
              placeholder="Avg € price"
              aria-label="Average buy price in EUR"
              inputMode="decimal"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
          {error && <p className="text-[11px] text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={save} className="px-3 py-1.5 bg-indigo-600 text-white font-semibold rounded-lg text-xs flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Save
            </button>
            <button onClick={() => setFormId(null)} className="px-3 py-1.5 text-slate-500 rounded-lg text-xs flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => openForm()} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Add holding
        </button>
      )}
    </div>
  );
}
