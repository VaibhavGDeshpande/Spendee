'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TransactionCard from '@/components/transactions/TransactionCard';
import AddTransactionModal from '@/components/transactions/AddTransactionModal';
import { Account, Category, TransactionWithDetails } from '@/types';
import { getTransactions, getCategories } from '@/lib/transactions';
import { getUserAccounts } from '@/lib/accounts';
import { Search, Filter } from 'lucide-react';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'expense' | 'income' | 'transfer' | ''>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showConverter, setShowConverter] = useState(false);
  const [eurToInrRate, setEurToInrRate] = useState(91.5);
  const [transactionToEdit, setTransactionToEdit] = useState<TransactionWithDetails | undefined>();

  useEffect(() => {
    loadFilterData();
  }, []);

  useEffect(() => {
    fetchFilteredTransactions();
  }, [selectedAccountId, selectedCategoryId, selectedType, searchQuery]);

  const loadFilterData = async () => {
    const [accs, cats] = await Promise.all([getUserAccounts(), getCategories()]);
    setAccounts(accs);
    setCategories(cats);

    try {
      const res = await fetch('/api/rates');
      if (res.ok) {
        const data = await res.json();
        if (data.rate) setEurToInrRate(data.rate);
      }
    } catch (e) {
      console.error('Failed to fetch live rate automatically', e);
    }
  };

  const fetchFilteredTransactions = async () => {
    setLoading(true);
    
    // Fetch directly from local store (which was just synced from Supabase)
    let baseData: TransactionWithDetails[] = await getTransactions();

    // Apply filters client-side
    let list = [...baseData];

    if (selectedAccountId) {
      list = list.filter(
        (t) => t.account_id === selectedAccountId || t.transfer_account_id === selectedAccountId
      );
    }

    if (selectedCategoryId) {
      list = list.filter((t) => t.category_id === selectedCategoryId);
    }

    if (selectedType) {
      list = list.filter((t) => t.type === selectedType);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.merchant?.toLowerCase().includes(q) ||
          t.notes?.toLowerCase().includes(q) ||
          t.category?.name?.toLowerCase().includes(q)
      );
    }
    
    // Sort transactions
    list.sort(
      (a, b) =>
        new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime() ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setTransactions(list);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 md:pb-8">
      <Sidebar
        onOpenAddModal={() => {
          setTransactionToEdit(undefined);
          setIsAddModalOpen(true);
        }}
        showConverter={showConverter}
        onToggleConverter={() => setShowConverter(!showConverter)}
      />

      <div className="md:hidden">
        <Header />
      </div>

      <main className="md:pl-64 max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Transactions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Search, filter, and review all your account expenses
          </p>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Bar */}
          <div className="relative sm:col-span-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search merchant, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="py-2.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="">All Types (Expenses, Income, Transfers)</option>
            <option value="expense">Expenses Only</option>
            <option value="income">Income Only</option>
            <option value="transfer">Transfers Only</option>
          </select>

          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="py-2.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Account Filter Chips */}
        <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedAccountId('')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
              selectedAccountId === ''
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            All Accounts
          </button>
          {accounts.map((acc) => (
            <button
              key={acc.id}
              onClick={() => setSelectedAccountId(acc.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                selectedAccountId === acc.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {acc.name}
            </button>
          ))}
        </div>

        {/* Summation of Selected State */}
        {!loading && transactions.length > 0 && (
          <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
            <div className="flex flex-col">
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Net Total</span>
              <span className={`text-lg sm:text-xl font-bold ${
                transactions.reduce((a, t) => t.type === 'income' ? a + t.amount_in_eur : t.type === 'expense' ? a - t.amount_in_eur : a, 0) > 0 
                  ? 'text-emerald-500' 
                  : transactions.reduce((a, t) => t.type === 'income' ? a + t.amount_in_eur : t.type === 'expense' ? a - t.amount_in_eur : a, 0) < 0 
                    ? 'text-rose-500' 
                    : 'text-slate-900 dark:text-white'
              }`}>
                {(() => {
                  const net = transactions.reduce((a, t) => t.type === 'income' ? a + t.amount_in_eur : t.type === 'expense' ? a - t.amount_in_eur : a, 0);
                  return net > 0 ? `+€${net.toFixed(2)}` : net < 0 ? `-€${Math.abs(net).toFixed(2)}` : '€0.00';
                })()}
              </span>
            </div>
            <div className="flex space-x-6 text-right">
              <div>
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Income</span>
                <p className="text-sm sm:text-base font-bold text-emerald-500">
                  €{transactions.reduce((acc, t) => t.type === 'income' ? acc + t.amount_in_eur : acc, 0).toFixed(2)}
                </p>
              </div>
              <div>
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Expenses</span>
                <p className="text-sm sm:text-base font-bold text-rose-500">
                  €{transactions.reduce((acc, t) => t.type === 'expense' ? acc + t.amount_in_eur : acc, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Cards List */}
        <div className="space-y-2.5 pt-2">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center mx-auto">
                <Filter className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">No Transactions Found</h3>
              <p className="text-xs text-slate-400">
                Try clearing search filters or add a new transaction using the button on the left.
              </p>
            </div>
          ) : (
            transactions.map((tx) => (
              <TransactionCard
                key={tx.id}
                transaction={tx}
                eurToInrRate={eurToInrRate}
                onDeleted={fetchFilteredTransactions}
                onEdit={(t) => {
                  setTransactionToEdit(t);
                  setIsAddModalOpen(true);
                }}
              />
            ))
          )}
        </div>
      </main>

      <div className="md:hidden">
        <BottomNav onOpenAddModal={() => {
          setTransactionToEdit(undefined);
          setIsAddModalOpen(true);
        }} />
      </div>

      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setTransactionToEdit(undefined);
        }}
        onSuccess={fetchFilteredTransactions}
        transactionToEdit={transactionToEdit}
        eurToInrRate={eurToInrRate}
      />
    </div>
  );
}
