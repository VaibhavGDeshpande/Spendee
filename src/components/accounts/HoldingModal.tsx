'use client';

import { useRef, useState } from 'react';
import { X, TrendingUp, AlertCircle, Search, Check } from 'lucide-react';
import { Holding } from '@/types';
import { createHolding, updateHolding } from '@/lib/holdings';
import type { StockMatch } from '@/lib/yahoo';

interface HoldingModalProps {
  accountId: string;
  /** Holding to edit; omit to add a new one */
  holding?: Holding;
  onClose: () => void;
  onSaved: () => void;
}

const eur = (n: number) => `€${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const DECIMAL_RE = /^\d*[.,]?\d*$/;
const fieldClass =
  'w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500';
const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5';

export default function HoldingModal({ accountId, holding, onClose, onSaved }: HoldingModalProps) {
  const [query, setQuery] = useState(holding?.symbol ?? '');
  const [selected, setSelected] = useState<{ symbol: string; name?: string } | null>(
    holding ? { symbol: holding.symbol } : null,
  );
  const [results, setResults] = useState<StockMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState(-1);
  const [price, setPrice] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(holding ? String(holding.quantity) : '');
  const [avgPrice, setAvgPrice] = useState(holding ? String(holding.avg_buy_price_eur) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef('');

  const search = (q: string) => {
    setQuery(q);
    setSelected(null);
    setPrice(null);
    setActive(-1);
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      latest.current = q;
      setSearching(true);
      try {
        const res = await fetch(`/api/quotes/search?q=${encodeURIComponent(q.trim())}`);
        const data = await res.json();
        if (latest.current === q) setResults(data.results ?? []); // ignore out-of-order responses
      } catch {
        if (latest.current === q) setResults([]);
      } finally {
        if (latest.current === q) setSearching(false);
      }
    }, 300);
  };

  const pick = async (m: StockMatch) => {
    setSelected({ symbol: m.symbol, name: m.name });
    setQuery(m.symbol);
    setResults([]);
    setActive(-1);
    try {
      const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(m.symbol)}`);
      const q = (await res.json())?.quotes?.[m.symbol];
      setPrice(q ? q.price_eur : null);
    } catch {
      setPrice(null);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      pick(results[active]);
    } else if (e.key === 'Escape') {
      setResults([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // A typed ticker/ISIN without picking a suggestion is still allowed.
    const symbol = selected?.symbol ?? query;
    const params = {
      symbol,
      quantity: parseFloat(quantity.replace(',', '.')),
      avg_buy_price_eur: parseFloat(avgPrice.replace(',', '.')),
    };
    setSaving(true);
    setError(null);
    const res = holding
      ? await updateHolding(holding.id, params)
      : await createHolding({ ...params, account_id: accountId });
    setSaving(false);
    if (!res.success) {
      setError(res.error || 'Could not save holding');
      return;
    }
    onSaved();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="holding-modal-title"
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 id="holding-modal-title" className="text-lg font-bold text-slate-900 dark:text-white">
                {holding ? 'Edit Holding' : 'Add Holding'}
              </h2>
              <p className="text-xs text-slate-400">Search a stock, ETF or fund by name, ticker or ISIN</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 touch-target"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 text-xs font-medium border border-red-200 dark:border-red-900/50 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label htmlFor="holding-search" className={labelClass}>Stock / ETF *</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="holding-search"
                type="text"
                required
                autoFocus
                autoComplete="off"
                role="combobox"
                aria-expanded={results.length > 0}
                aria-controls="holding-results"
                aria-activedescendant={active >= 0 ? `holding-opt-${active}` : undefined}
                placeholder="e.g. NVIDIA, VWCE, IE00BK5BQT80"
                value={query}
                onChange={(e) => search(e.target.value)}
                onKeyDown={onKeyDown}
                className={`${fieldClass} pl-9`}
              />
              {searching && (
                <div className="w-4 h-4 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
              )}
            </div>

            {results.length > 0 && (
              <ul
                id="holding-results"
                role="listbox"
                className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl"
              >
                {results.map((m, i) => (
                  <li
                    key={m.symbol}
                    id={`holding-opt-${i}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => {
                      e.preventDefault(); // keep input focus
                      pick(m);
                    }}
                    onMouseEnter={() => setActive(i)}
                    className={`px-3 py-2 cursor-pointer flex items-center justify-between gap-3 ${
                      i === active ? 'bg-indigo-50 dark:bg-indigo-950/50' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{m.name}</p>
                      <p className="text-[11px] text-slate-400">{m.symbol}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{m.exchange}</p>
                      <p className="text-[10px] text-slate-400 uppercase">{m.type}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {selected?.name && (
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                {selected.name}
                {price !== null && <span className="font-semibold"> · now {eur(price)}</span>}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="holding-qty" className={labelClass}>Quantity *</label>
              <input
                id="holding-qty"
                type="text"
                inputMode="decimal"
                required
                placeholder="0"
                value={quantity}
                onChange={(e) => DECIMAL_RE.test(e.target.value) && setQuantity(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="holding-avg" className={labelClass}>Avg. buy price (€) *</label>
              <input
                id="holding-avg"
                type="text"
                inputMode="decimal"
                required
                placeholder={price !== null ? price.toFixed(2) : '0.00'}
                value={avgPrice}
                onChange={(e) => DECIMAL_RE.test(e.target.value) && setAvgPrice(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.99] disabled:opacity-50 touch-target"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            ) : holding ? 'Save Changes' : 'Add Holding'}
          </button>
        </form>
      </div>
    </div>
  );
}
