'use client';

import { useState, useEffect, useCallback } from 'react';
import { HiddenTransaction } from '@/types';
import {
  getHiddenTransactions,
  createHiddenTransaction,
  deleteHiddenTransaction,
  updateHiddenTransaction,
  CreateHiddenTransactionParams,
} from '@/lib/hiddenTransactions';
import { useAppData } from '@/context/AppDataContext';
import {
  EyeOff,
  Plus,
  Trash2,
  Edit2,
  Lock,
  Unlock,
  ShieldCheck,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  KeyRound,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Wallet,
} from 'lucide-react';

const VAULT_PIN_KEY = 'spendee_vault_pin';
const VAULT_SESSION_KEY = 'spendee_vault_unlocked';
// ─── PIN Gate ────────────────────────────────────────────────────────────────

function PinGate({ onUnlocked }: { onUnlocked: () => void }) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [storedPin, setStoredPin] = useState<string | null>(null);
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [confirmDigits, setConfirmDigits] = useState<string[]>(['', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    const pin = localStorage.getItem(VAULT_PIN_KEY);
    setStoredPin(pin);
    setIsSettingPin(!pin);
  }, []);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const handleDigit = (value: string, idx: number, isConfirm = false) => {
    if (!/^\d?$/.test(value)) return;
    const arr = isConfirm ? [...confirmDigits] : [...digits];
    arr[idx] = value;
    if (isConfirm) setConfirmDigits(arr);
    else setDigits(arr);
    setError(null);

    // Auto-focus next
    if (value && idx < 3) {
      const nextId = isConfirm ? `confirm-pin-${idx + 1}` : `pin-${idx + 1}`;
      document.getElementById(nextId)?.focus();
    }

    // Auto-submit when last digit filled
    if (value && idx === 3) {
      const fullPin = [...arr].join('');
      if (isConfirm) {
        handleConfirmPin([...digits].join(''), fullPin);
      } else if (!isSettingPin) {
        handleCheckPin(fullPin);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, idx: number, isConfirm = false) => {
    if (e.key === 'Backspace') {
      const arr = isConfirm ? [...confirmDigits] : [...digits];
      if (!arr[idx] && idx > 0) {
        const prevId = isConfirm ? `confirm-pin-${idx - 1}` : `pin-${idx - 1}`;
        document.getElementById(prevId)?.focus();
      }
    }
  };

  const handleCheckPin = (pin: string) => {
    if (pin === storedPin) {
      sessionStorage.setItem(VAULT_SESSION_KEY, '1');
      onUnlocked();
    } else {
      setError('Incorrect PIN. Try again.');
      setDigits(['', '', '', '']);
      triggerShake();
      document.getElementById('pin-0')?.focus();
    }
  };

  const handleConfirmPin = (pin: string, confirm: string) => {
    if (pin.length < 4) {
      setError('Enter all 4 digits first.');
      return;
    }
    if (pin !== confirm) {
      setError("PINs don't match. Try again.");
      setConfirmDigits(['', '', '', '']);
      triggerShake();
      document.getElementById('confirm-pin-0')?.focus();
      return;
    }
    localStorage.setItem(VAULT_PIN_KEY, pin);
    sessionStorage.setItem(VAULT_SESSION_KEY, '1');
    onUnlocked();
  };

  const renderInputs = (arr: string[], isConfirm: boolean) => (
    <div className={`flex gap-3 justify-center ${shake ? 'animate-shake' : ''}`}>
      {arr.map((d, i) => (
        <input
          key={i}
          id={isConfirm ? `confirm-pin-${i}` : `pin-${i}`}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={d}
          autoFocus={i === 0}
          onChange={(e) => handleDigit(e.target.value, i, isConfirm)}
          onKeyDown={(e) => handleKeyDown(e, i, isConfirm)}
          className="w-14 h-14 text-center text-2xl font-bold rounded-2xl border-2 bg-slate-900/50 text-white border-slate-700 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 outline-none transition-all"
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950/30 to-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-2xl shadow-violet-900/50">
              <Lock className="w-12 h-12 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-slate-950 border-2 border-violet-500 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-violet-400" />
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-white text-center tracking-tight mb-1">
          Hidden Vault
        </h1>
        <p className="text-slate-400 text-center text-sm mb-8">
          {isSettingPin
            ? 'Set a 4-digit PIN to secure your vault'
            : 'Enter your 4-digit PIN to continue'}
        </p>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 space-y-6 shadow-2xl">
          {isSettingPin ? (
            <>
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 text-center">
                  Choose PIN
                </label>
                {renderInputs(digits, false)}
              </div>
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 text-center">
                  Confirm PIN
                </label>
                {renderInputs(confirmDigits, true)}
              </div>
              {error && (
                <p className="text-rose-400 text-xs text-center flex items-center justify-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> {error}
                </p>
              )}
              <button
                onClick={() => handleConfirmPin(digits.join(''), confirmDigits.join(''))}
                className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-violet-900/40 active:scale-[0.98]"
              >
                Create Vault
              </button>
            </>
          ) : (
            <>
              {renderInputs(digits, false)}
              {error && (
                <p className="text-rose-400 text-xs text-center flex items-center justify-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> {error}
                </p>
              )}
              <button
                onClick={() => handleCheckPin(digits.join(''))}
                disabled={digits.some((d) => !d)}
                className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-bold rounded-2xl transition-all shadow-lg shadow-violet-900/40 active:scale-[0.98]"
              >
                Unlock Vault
              </button>
            </>
          )}
        </div>

        <p className="text-slate-600 text-xs text-center mt-6">
          PIN is stored locally on your device only
        </p>
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
          20%, 40%, 60%, 80% { transform: translateX(6px); }
        }
        .animate-shake { animation: shake 0.6s ease-in-out; }
      `}</style>
    </div>
  );
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

interface TxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  eurToInrRate: number;
  txToEdit?: HiddenTransaction;
}

function AddHiddenTxModal({ isOpen, onClose, onSuccess, eurToInrRate, txToEdit }: TxModalProps) {
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'EUR' | 'INR'>('EUR');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (txToEdit) {
        setType(txToEdit.type);
        setAmount(txToEdit.amount.toString());
        setCurrency(txToEdit.currency as 'EUR' | 'INR');
        setMerchant(txToEdit.merchant || '');
        setCategory(txToEdit.category || '');
        setDate(txToEdit.transaction_date);
        setNotes(txToEdit.notes || '');
      } else {
        setType('expense');
        setAmount('');
        setCurrency('EUR');
        setMerchant('');
        setCategory('');
        setDate(new Date().toISOString().split('T')[0]);
        setNotes('');
      }
      setError(null);
    }
  }, [isOpen, txToEdit]);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount.replace(',', '.')) || 0;
  const eurAmount = currency === 'INR' ? numAmount / eurToInrRate : numAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    setLoading(true);
    setError(null);

    const payload: CreateHiddenTransactionParams = {
      type,
      amount: numAmount,
      currency,
      amount_in_eur: parseFloat(eurAmount.toFixed(2)),
      exchange_rate_used: currency === 'INR' ? 1 / eurToInrRate : 1.0,
      merchant: merchant || undefined,
      category: category || undefined,
      transaction_date: date,
      notes: notes || undefined,
    };

    try {
      if (txToEdit) {
        const res = await updateHiddenTransaction(txToEdit.id, payload);
        if (!res.success) throw new Error(res.error);
      } else {
        const res = await createHiddenTransaction(payload);
        if (!res.success) throw new Error(res.error);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
      <div
        className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-t-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-5" />

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <EyeOff className="w-5 h-5 text-violet-400" />
            {txToEdit ? 'Edit Hidden Transaction' : 'Add Hidden Transaction'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 text-rose-400 text-xs font-medium border border-rose-500/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type selector */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-800 rounded-xl">
            {(['expense', 'income'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`py-2.5 text-xs font-bold rounded-lg capitalize transition-all ${
                  type === t
                    ? t === 'expense'
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Amount
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '' || /^\d*[.,]?\d*$/.test(v)) setAmount(v);
                  }}
                  className="w-full pl-4 pr-10 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-2xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                  {currency === 'EUR' ? '€' : '₹'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCurrency(currency === 'EUR' ? 'INR' : 'EUR')}
                className="px-4 py-3 bg-violet-600/20 border border-violet-500/30 text-violet-400 font-bold rounded-2xl flex items-center gap-1 hover:bg-violet-600/30 transition-colors"
              >
                <span>{currency}</span>
                <ArrowRightLeft className="w-4 h-4" />
              </button>
            </div>
            {currency === 'INR' && amount && (
              <p className="text-xs text-violet-400 mt-1.5 font-medium">
                ≈ €{eurAmount.toFixed(2)} (Rate: 1 EUR = ₹{eurToInrRate.toFixed(2)})
              </p>
            )}
          </div>

          {/* Merchant & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Merchant / Payee
              </label>
              <input
                type="text"
                placeholder="e.g. Cash transfer"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Category (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Personal"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Date
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Notes (optional)
            </label>
            <textarea
              placeholder="Private notes..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-2xl shadow-lg shadow-violet-900/30 transition-all active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            ) : txToEdit ? (
              'Save Changes'
            ) : (
              'Save to Vault'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Hidden Transaction Card ──────────────────────────────────────────────────

function HiddenTxCard({
  tx,
  eurToInrRate,
  onDelete,
  onEdit,
}: {
  tx: HiddenTransaction;
  eurToInrRate: number;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isExpense = tx.type === 'expense';

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this hidden transaction?')) return;
    setDeleting(true);
    await deleteHiddenTransaction(tx.id);
    setDeleting(false);
    onDelete();
  };

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      className="p-4 bg-slate-900/70 border border-white/8 rounded-2xl cursor-pointer transition-all hover:border-violet-500/30 hover:bg-slate-800/60 active:scale-[0.995]"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isExpense
                ? 'bg-rose-500/15 text-rose-400'
                : 'bg-emerald-500/15 text-emerald-400'
            }`}
          >
            {isExpense ? (
              <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
            ) : (
              <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
            )}
          </div>

          <div>
            <h4 className="font-semibold text-sm text-white line-clamp-1">
              {tx.merchant || (isExpense ? 'Hidden Expense' : 'Hidden Income')}
            </h4>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              {tx.category && <span className="text-violet-400 font-medium">{tx.category}</span>}
              {tx.category && <span>•</span>}
              <span>
                {new Date(tx.transaction_date).toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className={`font-bold text-sm ${isExpense ? 'text-rose-400' : 'text-emerald-400'}`}>
              {isExpense ? '-' : '+'}
              {tx.currency === 'EUR' ? '€' : '₹'}
              {tx.amount.toFixed(2)}
            </p>
            {tx.currency !== 'EUR' ? (
              <p className="text-[11px] text-slate-500">≈ €{tx.amount_in_eur.toFixed(2)}</p>
            ) : (
              <p className="text-[11px] text-slate-500">
                ≈ ₹{(tx.amount * eurToInrRate).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            )}
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-white/8 text-xs text-slate-400 space-y-2 animate-in fade-in duration-150">
          {tx.notes && (
            <p className="italic bg-slate-800/50 p-2.5 rounded-xl text-slate-300">
              &ldquo;{tx.notes}&rdquo;
            </p>
          )}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-600">ID: {tx.id.slice(0, 8)}</span>
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="px-3 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 font-semibold flex items-center gap-1 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Vault Page ──────────────────────────────────────────────────────────

export default function VaultPage() {
  const { accounts, eurToInrRate } = useAppData();
  const [unlocked, setUnlocked] = useState(false);
  const [transactions, setTransactions] = useState<HiddenTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [txToEdit, setTxToEdit] = useState<HiddenTransaction | undefined>();
  const [showResetPinConfirm, setShowResetPinConfirm] = useState(false);

  // Check if already unlocked in this session
  useEffect(() => {
    const isUnlocked = sessionStorage.getItem(VAULT_SESSION_KEY) === '1';
    setUnlocked(isUnlocked);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const txs = await getHiddenTransactions();
    setTransactions(txs);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (unlocked) loadData();
  }, [unlocked, loadData]);

  const handleLock = () => {
    sessionStorage.removeItem(VAULT_SESSION_KEY);
    setUnlocked(false);
  };

  const handleResetPin = () => {
    localStorage.removeItem(VAULT_PIN_KEY);
    sessionStorage.removeItem(VAULT_SESSION_KEY);
    setUnlocked(false);
    setShowResetPinConfirm(false);
  };

  if (!unlocked) {
    return <PinGate onUnlocked={() => setUnlocked(true)} />;
  }

  // ── Compute balance summary ──────────────────────────────────────────────
  const hiddenIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((a, t) => a + t.amount_in_eur, 0);
  const hiddenExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((a, t) => a + t.amount_in_eur, 0);
  const hiddenNet = hiddenIncome - hiddenExpense;

  // Real account balances from Supabase
  const realTotalEur = accounts.reduce((a, acc) => a + acc.balance, 0);

  // Combined = real balances + hidden net
  const combinedTotal = realTotalEur + hiddenNet;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950/20 pb-24 md:pb-12">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-lg border-b border-white/8 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-md shadow-violet-900/40">
            <EyeOff className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Hidden Vault</h1>
            <p className="text-xs text-slate-500">Private transactions · Not shown on main screen</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowResetPinConfirm(true)}
            className="p-2 text-slate-500 hover:text-slate-300 rounded-xl hover:bg-white/5 transition-colors"
            title="Reset PIN"
          >
            <KeyRound className="w-4 h-4" />
          </button>
          <button
            onClick={handleLock}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 rounded-xl transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            Lock
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Balance Summary Cards */}
        <div className="grid grid-cols-1 gap-4">
          {/* Combined Real Balance */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 to-purple-800 p-6 shadow-2xl shadow-violet-900/40">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.1),transparent_60%)]" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-4 h-4 text-violet-200" />
                <span className="text-xs font-semibold uppercase tracking-wider text-violet-200">
                  True Total Balance (Real + Hidden)
                </span>
              </div>
              <p className="text-4xl font-black text-white tracking-tight">
                {combinedTotal >= 0 ? '' : '-'}€{Math.abs(combinedTotal).toFixed(2)}
              </p>
              <p className="text-violet-300 text-sm mt-2">
                ≈ ₹{(Math.abs(combinedTotal) * eurToInrRate).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>

              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/15">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">Real (Supabase)</p>
                  <p className="text-white font-bold">€{realTotalEur.toFixed(2)}</p>
                </div>
                <div className="text-violet-400 font-bold">+</div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">Hidden Net</p>
                  <p className={`font-bold ${hiddenNet >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {hiddenNet >= 0 ? '+' : '-'}€{Math.abs(hiddenNet).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Hidden Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-900/80 border border-white/8 rounded-2xl p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Hidden Income</span>
              </div>
              <p className="text-lg font-bold text-emerald-400">+€{hiddenIncome.toFixed(2)}</p>
            </div>
            <div className="bg-slate-900/80 border border-white/8 rounded-2xl p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-rose-400">
                <TrendingDown className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Hidden Expense</span>
              </div>
              <p className="text-lg font-bold text-rose-400">-€{hiddenExpense.toFixed(2)}</p>
            </div>
            <div className="bg-slate-900/80 border border-white/8 rounded-2xl p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Wallet className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Real Accounts</span>
              </div>
              <p className="text-lg font-bold text-slate-300">€{realTotalEur.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Account Breakdown (Real) */}
        {accounts.length > 0 && (
          <div className="bg-slate-900/50 border border-white/8 rounded-2xl p-4 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5" /> Real Account Balances
            </h3>
            {accounts.map((acc) => {
              const accHiddenNet = transactions
                .filter((t) => t.notes?.includes(`acc:${acc.id}`))
                .reduce((a, t) => (t.type === 'income' ? a + t.amount_in_eur : a - t.amount_in_eur), 0);

              return (
                <div key={acc.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{acc.name}</p>
                    <p className="text-xs text-slate-500">{acc.currency}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-200">€{acc.balance.toFixed(2)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Hidden Transactions List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-violet-400" />
              Hidden Transactions
              {transactions.length > 0 && (
                <span className="text-xs font-semibold text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                  {transactions.length}
                </span>
              )}
            </h2>
            <button
              onClick={() => {
                setTxToEdit(undefined);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-violet-900/30 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-800/50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-14 bg-slate-900/40 border border-white/8 rounded-3xl space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-violet-500/10 text-violet-400 flex items-center justify-center mx-auto">
                <EyeOff className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-bold text-slate-300">No hidden transactions yet</h3>
                <p className="text-xs text-slate-500 mt-1">
                  These transactions stay invisible on the main screen
                </p>
              </div>
              <button
                onClick={() => {
                  setTxToEdit(undefined);
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-violet-900/30"
              >
                <Plus className="w-4 h-4" /> Add first transaction
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {transactions.map((tx) => (
                <HiddenTxCard
                  key={tx.id}
                  tx={tx}
                  eurToInrRate={eurToInrRate}
                  onDelete={loadData}
                  onEdit={() => {
                    setTxToEdit(tx);
                    setIsModalOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Modal */}
      <AddHiddenTxModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setTxToEdit(undefined);
        }}
        onSuccess={loadData}
        eurToInrRate={eurToInrRate}
        txToEdit={txToEdit}
      />

      {/* Reset PIN Confirmation */}
      {showResetPinConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-xs text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/15 text-orange-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white">Reset PIN?</h3>
              <p className="text-xs text-slate-400 mt-1">
                You&apos;ll be asked to set a new PIN. Your vault data will not be deleted.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetPinConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPin}
                className="flex-1 py-2.5 rounded-xl bg-orange-500/80 hover:bg-orange-500 text-white text-sm font-bold transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
