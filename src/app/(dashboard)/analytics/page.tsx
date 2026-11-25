'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import ChartsWidget from '@/components/dashboard/ChartsWidget';
import AddTransactionModal from '@/components/transactions/AddTransactionModal';
import { useAppData } from '@/context/AppDataContext';
import './analytics.css';

export default function AnalyticsPage() {
  const { accounts, transactions, loading, refresh } = useAppData();
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showConverter, setShowConverter] = useState(false);

  const filteredTransactions = selectedAccountId
    ? transactions.filter(t => t.account_id === selectedAccountId || t.transfer_account_id === selectedAccountId)
    : transactions;

  const accountName = accounts.find((a) => a.id === selectedAccountId)?.name;
  const hasExpenses = filteredTransactions.some((t) => t.type === 'expense');

  return (
    <div className="hm">
      {/* React 19 hoists this into the head; the fallback stack covers it failing to load */}
      <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600&display=swap" precedence="default" />

      <Sidebar
        onOpenAddModal={() => setIsAddModalOpen(true)}
        showConverter={showConverter}
        onToggleConverter={() => setShowConverter(!showConverter)}
      />

      <div className="md:hidden">
        <Header />
      </div>

      <main className="hm-main md:pl-64">
        <div className="hm-wrap">
          <header>
            <h1>Analytics</h1>
            <p className="hm-sub">
              {accountName ? `Spending from ${accountName} this month.` : 'Spending across all your accounts this month.'}
            </p>
          </header>

          <div className="hm-chips" role="group" aria-label="Account">
            <button type="button" className="hm-chip" aria-pressed={selectedAccountId === ''} onClick={() => setSelectedAccountId('')}>
              All accounts
            </button>
            {accounts.map((acc) => (
              <button
                key={acc.id}
                type="button"
                className="hm-chip"
                aria-pressed={selectedAccountId === acc.id}
                onClick={() => setSelectedAccountId(acc.id)}
              >
                {acc.name}
              </button>
            ))}
          </div>

          {loading ? (
            <div role="status" aria-label="Loading analytics" style={{ display: 'grid', gap: 'var(--space-xl)' }}>
              <div className="hm-skel" style={{ height: '8rem' }} />
              <div className="hm-skel" style={{ height: '17.5rem' }} />
              <div className="hm-skel" style={{ height: '12rem' }} />
            </div>
          ) : !hasExpenses ? (
            <section className="hm-empty">
              <h2>No expenses to analyze yet</h2>
              <p>
                {accountName
                  ? `${accountName} has no expenses. Record one and the month's spending appears here.`
                  : 'Record an expense and the month’s spending, categories and merchants appear here.'}
              </p>
              <button type="button" className="hm-btn" onClick={() => setIsAddModalOpen(true)}>
                Add an expense
              </button>
            </section>
          ) : (
            <ChartsWidget transactions={filteredTransactions} />
          )}
        </div>
      </main>

      <div className="md:hidden">
        <BottomNav onOpenAddModal={() => setIsAddModalOpen(true)} />
      </div>

      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={refresh}
      />
    </div>
  );
}
