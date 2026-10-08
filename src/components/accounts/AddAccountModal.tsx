'use client';

import { useState, useEffect } from 'react';
import { X, PlusCircle, Sparkles, AlertCircle } from 'lucide-react';
import { createAccount } from '@/lib/accounts';
import { ACCOUNT_ICON_OPTIONS } from '@/lib/utils/accountIcons';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PRESET_SOURCES = [
  { name: 'Wise Account', icon: 'globe', currency: 'EUR' },
  { name: 'N26 Bank', icon: 'building', currency: 'EUR' },
  { name: 'Parents Allowance', icon: 'piggy-bank', currency: 'EUR' },
  { name: 'Student Loan / BAföG', icon: 'graduation-cap', currency: 'EUR' },
  { name: 'PayPal', icon: 'credit-card', currency: 'EUR' },
  { name: 'Part-time Job Account', icon: 'briefcase', currency: 'EUR' },
  { name: 'Scholarship', icon: 'graduation-cap', currency: 'EUR' },
  { name: 'Secondary Savings', icon: 'piggy-bank', currency: 'EUR' },
];

export default function AddAccountModal({ isOpen, onClose, onSuccess }: AddAccountModalProps) {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [balance, setBalance] = useState('');
  const [icon, setIcon] = useState('wallet');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eurToInrRate, setEurToInrRate] = useState(91.5);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/rates')
        .then(res => res.json())
        .then(data => {
          if (data.rate) {
            setEurToInrRate(data.rate);
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a source or account name');
      return;
    }

    setLoading(true);
    setError(null);

    const initialBalanceNum = parseFloat(balance.replace(',', '.')) || 0.0;
    const res = await createAccount({
      name,
      currency,
      balance: initialBalanceNum,
      icon,
      eurToInrRate,
    });

    setLoading(false);

    if (res.success) {
      setName('');
      setBalance('');
      setIcon('wallet');
      setCurrency('EUR');
      onSuccess();
      onClose();
    } else {
      setError(res.error || 'Failed to create account');
    }
  };

  const handleApplyPreset = (preset: typeof PRESET_SOURCES[0]) => {
    setName(preset.name);
    setIcon(preset.icon);
    setCurrency(preset.currency);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Add Funding Source
              </h2>
              <p className="text-xs text-slate-400">Add custom bank, wallet, or income source</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 touch-target"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset quick buttons */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Popular Source Templates</span>
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {PRESET_SOURCES.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-400 text-slate-700 dark:text-slate-300 rounded-xl transition-all border border-slate-200/60 dark:border-slate-700"
              >
                + {preset.name}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 text-xs font-medium border border-red-200 dark:border-red-900/50 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Source / Account Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Source Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Wise Account, Parents Support, N26"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Currency & Initial Balance */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="EUR">EUR (€)</option>
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Starting Balance
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={balance}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^\d*[.,]?\d*$/.test(val)) {
                    setBalance(val);
                  }
                }}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Icon Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Choose Icon
            </label>
            <div className="grid grid-cols-5 gap-2">
              {ACCOUNT_ICON_OPTIONS.map((opt) => {
                const IconComponent = opt.icon;
                const isSelected = icon === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setIcon(opt.id)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                    }`}
                    title={opt.label}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="text-[10px] font-medium truncate max-w-full">{opt.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.99] disabled:opacity-50 touch-target"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            ) : (
              'Add Source'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
