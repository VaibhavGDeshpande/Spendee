'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import CurrencyConverterWidget from '@/components/currency/CurrencyConverterWidget';
import TransactionCard from '@/components/transactions/TransactionCard';
import AddTransactionModal from '@/components/transactions/AddTransactionModal';
import AddAccountModal from '@/components/accounts/AddAccountModal';
import { Account, TransactionWithDetails } from '@/types';
import { getUserAccounts } from '@/lib/accounts';
import { getTransactions } from '@/lib/transactions';
import { getAccountIconComponent } from '@/lib/utils/accountIcons';
import { ArrowUpRight, ArrowDownLeft, Plus, ChevronRight, PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<TransactionWithDetails[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);
  const [monthlyExpense, setMonthlyExpense] = useState<number>(0);
  const [categoryBreakdown, setCategoryBreakdown] = useState<{ name: string; amount: number; color: string }[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [showConverter, setShowConverter] = useState<boolean>(false);
  const [inrToEurRate, setInrToEurRate] = useState<number>(0.011);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isAddSourceModalOpen, setIsAddSourceModalOpen] = useState<boolean>(false);
  const [quickAddAccount, setQuickAddAccount] = useState<string | undefined>();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    const [accs, txs] = await Promise.all([
      getUserAccounts(),
      getTransactions({ limit: 50 }),
    ]);

    setAccounts(accs);
    setRecentTransactions(txs.slice(0, 10));

    // Compute current month statistics
    const now = new Date();
    const currentMonthTxs = txs.filter((t) => {
      const d = new Date(t.transaction_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    let inc = 0;
    let exp = 0;
    const catMap: Record<string, { amount: number; color: string }> = {};

    currentMonthTxs.forEach((t) => {
      if (t.type === 'income') {
        inc += t.amount_in_eur;
      } else if (t.type === 'expense') {
        exp += t.amount_in_eur;
        const catName = t.category?.name || 'Other';
        const color = t.category?.color || '#6366f1';
        if (!catMap[catName]) catMap[catName] = { amount: 0, color };
        catMap[catName].amount += t.amount_in_eur;
      }
    });

    setMonthlyIncome(inc);
    setMonthlyExpense(exp);

    const sortedCats = Object.entries(catMap)
      .map(([name, data]) => ({ name, amount: data.amount, color: data.color }))
      .sort((a, b) => b.amount - a.amount);

    setCategoryBreakdown(sortedCats);
    setLoading(false);
  };

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 md:pb-8">
      {/* Desktop Sidebar */}
      <Sidebar
        onOpenAddModal={() => setIsAddModalOpen(true)}
        showConverter={showConverter}
        onToggleConverter={() => setShowConverter(!showConverter)}
      />

      {/* Mobile Top Header (Hidden on Desktop) */}
      <div className="md:hidden">
        <Header
          onToggleConverter={() => setShowConverter(!showConverter)}
          showConverterButton={true}
        />
      </div>

      {/* Main Responsive Layout (Pl-64 on desktop for sidebar) */}
      <main className="md:pl-64 max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Mobile Live Converter Card */}
        {showConverter && (
          <div className="md:hidden animate-in slide-in-from-top-4 duration-200">
            <CurrencyConverterWidget
              onClose={() => setShowConverter(false)}
              onRateFetched={(invRate) => setInrToEurRate(invRate)}
            />
          </div>
        )}

        {/* Dashboard Grid Header Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Total Combined Balance Card */}
          <div className="md:col-span-2 p-6 sm:p-8 rounded-3xl bg-linear-to-br from-indigo-600 via-indigo-700 to-indigo-900 text-white shadow-xl shadow-indigo-600/20 space-y-4 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute -right-6 -bottom-6 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-semibold text-indigo-200 uppercase tracking-wider">
                Total Combined Balance
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-white/15 text-white font-semibold">
                {accounts.length} Active Accounts
              </span>
            </div>

            <div>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
                €{totalBalance.toFixed(2)}
              </h2>
            </div>

            {/* Quick Monthly Summary */}
            <div className="pt-4 border-t border-white/15 grid grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                  <ArrowDownLeft className="w-4 h-4 stroke-[3]" />
                </div>
                <div>
                  <p className="text-indigo-200 text-xs">Income (This Month)</p>
                  <p className="font-extrabold text-emerald-300 text-base">€{monthlyIncome.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center shrink-0">
                  <ArrowUpRight className="w-4 h-4 stroke-[3]" />
                </div>
                <div>
                  <p className="text-indigo-200 text-xs">Expenses (This Month)</p>
                  <p className="font-extrabold text-rose-300 text-base">€{monthlyExpense.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Category Spending Breakdown Summary Card */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl space-y-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Monthly Spending Breakdown
              </h3>
            </div>

            {categoryBreakdown.length > 0 ? (
              <>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full flex overflow-hidden">
                  {categoryBreakdown.map((cat) => {
                    const pct = (cat.amount / (monthlyExpense || 1)) * 100;
                    return (
                      <div
                        key={cat.name}
                        style={{ width: `${pct}%`, backgroundColor: cat.color }}
                        className="h-full transition-all"
                        title={`${cat.name}: €${cat.amount.toFixed(2)} (${pct.toFixed(0)}%)`}
                      />
                    );
                  })}
                </div>

                <div className="space-y-2 pt-1 flex-1">
                  {categoryBreakdown.slice(0, 4).map((cat) => (
                    <div key={cat.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{cat.name}</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">€{cat.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400 italic">No expenses recorded yet this month</p>
            )}
          </div>
        </div>

        {/* Account Cards Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Accounts Overview ({accounts.length})
            </h3>
            <Link href="/accounts" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center">
              <span>Manage Accounts</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
              ))
            ) : (
              <>
                {accounts.map((acc) => {
                  const Icon = getAccountIconComponent(acc);
                  return (
                    <div
                      key={acc.id}
                      onClick={() => {
                        setQuickAddAccount(acc.name);
                        setIsAddModalOpen(true);
                      }}
                      className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex flex-col justify-between shadow-xs hover:border-indigo-500 transition-all cursor-pointer active:scale-95 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Icon className="w-5 h-5 stroke-[2]" />
                        </div>
                        <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                          <Plus className="w-3 h-3 mr-0.5" /> Add
                        </span>
                      </div>

                      <div className="mt-3">
                        <p className="text-xs font-medium text-slate-400 flex items-center space-x-1">
                          <span>{acc.name}</span>
                          {!acc.is_system && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold uppercase">
                              Custom
                            </span>
                          )}
                        </p>
                        <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                          {acc.currency === 'EUR' ? '€' : acc.currency === 'INR' ? '₹' : acc.currency === 'USD' ? '$' : '£'}
                          {acc.balance.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {/* Add Source Tile */}
                <div
                  onClick={() => setIsAddSourceModalOpen(true)}
                  className="p-4 bg-slate-50/70 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl flex flex-col justify-center items-center text-center shadow-xs transition-all cursor-pointer group space-y-2 min-h-28"
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      Add Funding Source
                    </p>
                    <p className="text-[10px] text-slate-400">Wise, N26, Student Loan...</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 10 Recent Transactions Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Recent Transactions
            </h3>
            <Link href="/transactions" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center">
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
              ))
            ) : recentTransactions.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                <p className="text-base font-semibold text-slate-700 dark:text-slate-300">No transactions recorded yet</p>
                <p className="text-xs text-slate-400">
                  Click the New Transaction button to record an expense, income, or transfer!
                </p>
              </div>
            ) : (
              recentTransactions.map((tx) => (
                <TransactionCard
                  key={tx.id}
                  transaction={tx}
                  onDeleted={loadDashboardData}
                />
              ))
            )}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar (Hidden on Desktop) */}
      <div className="md:hidden">
        <BottomNav onOpenAddModal={() => setIsAddModalOpen(true)} />
      </div>

      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadDashboardData}
        initialAccountName={quickAddAccount}
        inrToEurRate={inrToEurRate}
      />

      <AddAccountModal
        isOpen={isAddSourceModalOpen}
        onClose={() => setIsAddSourceModalOpen(false)}
        onSuccess={loadDashboardData}
      />
    </div>
  );
}

