'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TransactionWithDetails } from '@/types';
import { Trash2, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, ShoppingBag, Camera } from 'lucide-react';
import { deleteTransaction } from '@/lib/transactions';

interface TransactionCardProps {
  transaction: TransactionWithDetails;
  onDeleted: () => void;
}

export default function TransactionCard({ transaction, onDeleted }: TransactionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    setDeleting(true);
    const success = await deleteTransaction(transaction.id);
    setDeleting(false);

    if (success) {
      onDeleted();
    }
  };

  const isExpense = transaction.type === 'expense';
  const isIncome = transaction.type === 'income';
  const isTransfer = transaction.type === 'transfer';

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      className="p-3.5 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs transition-all active:scale-[0.99] cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Icon */}
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isExpense
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-500'
                : isIncome
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500'
                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500'
            }`}
          >
            {isExpense ? (
              <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
            ) : isIncome ? (
              <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
            ) : (
              <ArrowRightLeft className="w-5 h-5 stroke-[2.5]" />
            )}
          </div>

          <div>
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-1">
              {transaction.merchant || (isTransfer ? 'Account Transfer' : 'Uncategorized Expense')}
            </h4>
            <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span>{transaction.account?.name || 'Account'}</span>
              <span>•</span>
              <span>{new Date(transaction.transaction_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}</span>
              {transaction.category && (
                <>
                  <span>•</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {transaction.category.name}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className="text-right">
          <p
            className={`font-bold text-sm sm:text-base ${
              isExpense
                ? 'text-slate-900 dark:text-white'
                : isIncome
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-indigo-600 dark:text-indigo-400'
            }`}
          >
            {isExpense ? '-' : isIncome ? '+' : ''}
            {transaction.currency === 'EUR' ? '€' : '₹'}
            {transaction.amount.toFixed(2)}
          </p>
          {transaction.currency !== 'EUR' && (
            <p className="text-[11px] text-slate-400 font-medium">
              ≈ €{transaction.amount_in_eur.toFixed(2)}
            </p>
          )}
        </div>
      </div>

      {/* Expanded Detail View */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-2 animate-in fade-in duration-150">
          {transaction.notes && (
            <p className="italic bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl">
              &quot;{transaction.notes}&quot;
            </p>
          )}

          {transaction.currency === 'INR' && (
            <p className="text-slate-500">
              Exchange Rate Used: 1 EUR = ₹{(1 / (transaction.exchange_rate_used || 0.011)).toFixed(2)}
            </p>
          )}

          {/* Line items if available from receipt scan */}
          {transaction.items && transaction.items.length > 0 && (
            <div className="space-y-1 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl">
              <p className="font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1 mb-1">
                <ShoppingBag className="w-3.5 h-3.5 text-indigo-500" />
                <span>Line Items ({transaction.items.length})</span>
              </p>
              {transaction.items.map((item) => (
                <div key={item.id} className="flex justify-between text-slate-500">
                  <span>{item.quantity}x {item.item_name}</span>
                  <span>€{item.total_price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Receipt Photo */}
          {transaction.image_url && (
            <div className="space-y-1 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl">
              <p className="font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1 mb-2">
                <Camera className="w-3.5 h-3.5 text-indigo-500" />
                <span>Receipt Photo</span>
              </p>
              <div className="max-h-48 overflow-hidden rounded-lg flex items-center justify-center bg-black/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={transaction.image_url} 
                  alt="Receipt" 
                  className="object-contain max-h-48 w-full rounded-lg cursor-zoom-in"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowImage(true);
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-400">ID: {transaction.id.slice(0, 8)}</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-semibold flex items-center space-x-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Full Screen Image Preview Modal */}
      {showImage && transaction.image_url && mounted && createPortal(
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={(e) => {
            e.stopPropagation();
            setShowImage(false);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={transaction.image_url} 
            alt="Receipt Fullscreen" 
            className="max-w-full max-h-[90vh] object-contain rounded-md"
            onClick={(e) => e.stopPropagation()}
          />
          <button 
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 p-2 rounded-full text-white backdrop-blur-md"
            onClick={(e) => {
              e.stopPropagation();
              setShowImage(false);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
