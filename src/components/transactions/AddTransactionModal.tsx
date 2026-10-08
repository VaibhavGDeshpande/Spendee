'use client';

import { useState, useEffect } from 'react';
import { X, ArrowRightLeft, PlusCircle, Check, Camera } from 'lucide-react';
import { Account, Category, OCRResult } from '@/types';
import { createTransaction } from '@/lib/transactions';
import { getUserAccounts } from '@/lib/accounts';
import { getCategories } from '@/lib/transactions';
import ReceiptScannerModal from '../ocr/ReceiptScannerModal';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialAccountName?: string;
  inrToEurRate?: number;
}

export default function AddTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  initialAccountName,
  inrToEurRate = 0.011,
}: AddTransactionModalProps) {
  const [type, setType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedTransferAccountId, setSelectedTransferAccountId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<'EUR' | 'INR'>('EUR');
  const [merchant, setMerchant] = useState<string>('');
  const [transactionDate, setTransactionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    const [accs, cats] = await Promise.all([getUserAccounts(), getCategories()]);
    setAccounts(accs);
    setCategories(cats);

    if (accs.length > 0) {
      if (initialAccountName) {
        const target = accs.find((a) => a.name.toLowerCase() === initialAccountName.toLowerCase());
        setSelectedAccountId(target ? target.id : accs[0].id);
      } else {
        setSelectedAccountId(accs[0].id);
      }

      if (accs.length > 1) {
        setSelectedTransferAccountId(accs[1].id);
      }
    }

    if (cats.length > 0) {
      setSelectedCategoryId(cats[0].id);
    }
  };

  if (!isOpen) return null;

  // Calculate EUR amount automatically
  const numAmount = parseFloat(amount) || 0;
  const eurAmount = currency === 'INR' ? numAmount * inrToEurRate : numAmount;

  const handleReceiptParsed = (result: OCRResult) => {
    if (result.merchant) setMerchant(result.merchant);
    if (result.total_amount) setAmount(result.total_amount.toString());
    if (result.transaction_date) setTransactionDate(result.transaction_date);
    if (result.line_items) setLineItems(result.line_items);
    if (result.image_data) setImageUrl(result.image_data);

    // Auto-select Groceries if German supermarket
    const groceriesCat = categories.find((c) => c.name.toLowerCase().includes('groceries'));
    if (groceriesCat) setSelectedCategoryId(groceriesCat.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!selectedAccountId) {
      setError('Please select an account');
      return;
    }
    if (type === 'transfer' && selectedAccountId === selectedTransferAccountId) {
      setError('Source and Destination accounts must be different');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await createTransaction({
        account_id: selectedAccountId,
        category_id: type === 'transfer' ? null : selectedCategoryId || null,
        type,
        amount: numAmount,
        currency,
        amount_in_eur: parseFloat(eurAmount.toFixed(2)),
        exchange_rate_used: currency === 'INR' ? inrToEurRate : 1.0,
        merchant: merchant || (type === 'transfer' ? 'Transfer' : undefined),
        transaction_date: transactionDate,
        notes: notes || undefined,
        image_url: imageUrl || undefined,
        transfer_account_id: type === 'transfer' ? selectedTransferAccountId : undefined,
        line_items: lineItems.length > 0 ? lineItems : undefined,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to record transaction');
      }

      // Reset form & close
      setAmount('');
      setMerchant('');
      setNotes('');
      setLineItems([]);
      setImageUrl(null);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating transaction';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div 
          className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-4 sm:p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] border-t border-slate-200 dark:border-slate-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Drag Handle */}
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4" />

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <PlusCircle className="w-5 h-5 text-indigo-600" />
              <span>Add Transaction</span>
            </h2>

            <div className="flex items-center space-x-2">
              {type === 'expense' && (
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-center space-x-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Attach Photo</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 touch-target"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 text-xs font-medium border border-red-200 dark:border-red-900/50">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Segmented Type Selector */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              {(['expense', 'income', 'transfer'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`py-2 text-xs font-semibold rounded-lg capitalize transition-all ${
                    type === t
                      ? t === 'expense'
                        ? 'bg-rose-500 text-white shadow-xs'
                        : t === 'income'
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Amount & Currency Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Amount
              </label>
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-2xl font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                    {currency === 'EUR' ? '€' : '₹'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrency(currency === 'EUR' ? 'INR' : 'EUR')}
                  className="px-4 py-3 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 font-bold rounded-2xl flex items-center space-x-1 hover:bg-indigo-100 transition-colors"
                >
                  <span>{currency}</span>
                  <ArrowRightLeft className="w-4 h-4" />
                </button>
              </div>

              {currency === 'INR' && amount && (
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1.5 font-medium">
                  ≈ €{eurAmount.toFixed(2)} (Rate: 1 EUR = ₹{(1 / inrToEurRate).toFixed(2)})
                </p>
              )}
            </div>

            {/* Account Selector Chips */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                {type === 'transfer' ? 'From Account' : 'Account'}
              </label>
              <div className="flex flex-wrap gap-2">
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center space-x-1.5 ${
                      selectedAccountId === acc.id
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <span>{acc.name}</span>
                    {selectedAccountId === acc.id && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Transfer Destination Account */}
            {type === 'transfer' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  To Account
                </label>
                <div className="flex flex-wrap gap-2">
                  {accounts.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setSelectedTransferAccountId(acc.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center space-x-1.5 ${
                        selectedTransferAccountId === acc.id
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                      }`}
                    >
                      <span>{acc.name}</span>
                      {selectedTransferAccountId === acc.id && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Category Selector Chips */}
            {type !== 'transfer' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Category
                </label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center space-x-1.5 ${
                        selectedCategoryId === cat.id
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Merchant & Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Merchant / Payee
                </label>
                <input
                  type="text"
                  placeholder="Aldi, Rewe, Rent..."
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Line items indicator if parsed from OCR */}
            {lineItems.length > 0 && (
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                ✓ {lineItems.length} receipt line items attached to transaction
              </div>
            )}
            
            {/* Image attachment indicator */}
            {imageUrl && lineItems.length === 0 && (
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium">
                ✓ Receipt photo attached manually
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.99] disabled:opacity-50 touch-target"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
              ) : (
                'Save Transaction'
              )}
            </button>
          </form>
        </div>
      </div>

      <ReceiptScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onReceiptParsed={handleReceiptParsed}
      />
    </>
  );
}
