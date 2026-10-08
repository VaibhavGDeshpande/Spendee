'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import ChartsWidget from '@/components/dashboard/ChartsWidget';
import { Account, TransactionWithDetails } from '@/types';
import { getTransactions } from '@/lib/transactions';
import { getUserAccounts } from '@/lib/accounts';
import { BarChart3, Filter } from 'lucide-react';
import AddTransactionModal from '@/components/transactions/AddTransactionModal';

export default function AnalyticsPage() {
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showConverter, setShowConverter] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [txs, accs] = await Promise.all([getTransactions(), getUserAccounts()]);
    setTransactions(txs);
    setAccounts(accs);
    setLoading(false);
  };

  const filteredTransactions = selectedAccountId 
    ? transactions.filter(t => t.account_id === selectedAccountId || t.transfer_account_id === selectedAccountId)
    : transactions;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 md:pb-8">
      <Sidebar
        onOpenAddModal={() => setIsAddModalOpen(true)}
        showConverter={showConverter}
        onToggleConverter={() => setShowConverter(!showConverter)}
      />

      <div className="md:hidden">
        <Header />
      </div>

      <main className="md:pl-64 max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-indigo-500" />
            Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Deep dive into your spending habits and statistics
          </p>
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

        {loading ? (
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse" />
        ) : filteredTransactions.filter(t => t.type === 'expense').length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center mx-auto">
              <Filter className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200">No Expenses Found</h3>
            <p className="text-xs text-slate-400">
              There are no expenses in this account to analyze.
            </p>
          </div>
        ) : (
          <div className="pt-2">
            <ChartsWidget transactions={filteredTransactions} />
          </div>
        )}
      </main>

      <div className="md:hidden">
        <BottomNav onOpenAddModal={() => setIsAddModalOpen(true)} />
      </div>

      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
}
