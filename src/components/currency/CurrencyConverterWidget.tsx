'use client';

import { useState, useEffect } from 'react';
import { ArrowLeftRight, Clock, RefreshCw, X } from 'lucide-react';

interface CurrencyConverterWidgetProps {
  onClose?: () => void;
  onRateFetched?: (rate: number) => void;
}

export default function CurrencyConverterWidget({ onClose, onRateFetched }: CurrencyConverterWidgetProps) {
  const [eur, setEur] = useState<string>('100');
  const [inr, setInr] = useState<string>('');
  const [rate, setRate] = useState<number>(91.5);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isStale, setIsStale] = useState<boolean>(false);

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    setLoading(true);
    try {
      // Check localStorage cache first
      const cachedData = localStorage.getItem('spendee_eur_inr_rate');
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        if (Date.now() - parsed.timestamp < 3600 * 1000) {
          setRate(parsed.rate);
          setLastUpdated(parsed.last_updated);
          if (onRateFetched) onRateFetched(1 / parsed.rate);
          calculateInr(100, parsed.rate);
          setLoading(false);
          return;
        }
      }

      const res = await fetch('/api/rates');
      if (res.ok) {
        const data = await res.json();
        setRate(data.rate);
        setLastUpdated(data.last_updated);
        setIsStale(!!data.stale);
        if (onRateFetched) onRateFetched(1 / data.rate);
        calculateInr(parseFloat(eur) || 100, data.rate);

        // Cache in localStorage
        localStorage.setItem(
          'spendee_eur_inr_rate',
          JSON.stringify({
            rate: data.rate,
            last_updated: data.last_updated,
            timestamp: Date.now(),
          })
        );
      }
    } catch (e) {
      console.error('Failed to fetch converter rate:', e);
    } finally {
      setLoading(false);
    }
  };

  const calculateInr = (eurVal: number, currentRate: number) => {
    if (isNaN(eurVal)) {
      setInr('');
      return;
    }
    setInr((eurVal * currentRate).toFixed(2));
  };

  const handleEurChange = (val: string) => {
    setEur(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setInr((num * rate).toFixed(2));
    } else {
      setInr('');
    }
  };

  const handleInrChange = (val: string) => {
    setInr(val);
    const num = parseFloat(val);
    if (!isNaN(num) && rate > 0) {
      setEur((num / rate).toFixed(2));
    } else {
      setEur('');
    }
  };

  const formatLastUpdatedTime = () => {
    if (!lastUpdated) return 'Recently';
    const date = new Date(lastUpdated);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-4 bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-950/60 rounded-3xl shadow-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <ArrowLeftRight className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-slate-900 dark:text-white">
            Live Currency Converter
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchRates}
            disabled={loading}
            title="Refresh Rate"
            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg touch-target"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg touch-target"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Dual Inputs */}
      <div className="grid grid-cols-2 gap-3">
        {/* EUR Input */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Euros (€)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={eur}
              onChange={(e) => handleEurChange(e.target.value)}
              placeholder="0"
              className="w-full pl-3 pr-8 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-base font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400">
              EUR
            </span>
          </div>
        </div>

        {/* INR Input */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Rupees (₹)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={inr}
              onChange={(e) => handleInrChange(e.target.value)}
              placeholder="0"
              className="w-full pl-3 pr-8 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-base font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400">
              INR
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pt-1">
        <span>1 EUR = ₹{rate.toFixed(2)}</span>
        <span className="flex items-center space-x-1">
          <Clock className="w-3 h-3" />
          <span>
            {isStale ? 'Cached rate' : `Updated ${formatLastUpdatedTime()}`}
          </span>
        </span>
      </div>
    </div>
  );
}
