'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import AddTransactionModal from '@/components/transactions/AddTransactionModal';
import {
  TrendingUp, ShoppingCart, Store, Lightbulb,
  AlertTriangle, RefreshCw, ChevronDown, ChevronUp, ShoppingBag,
  BarChart2, Calendar, Euro, ArrowRight,
} from 'lucide-react';

interface CategoryData {
  name: string;
  total_eur: number;
  transaction_count: number;
  percentage: number;
  avg_per_transaction: number;
}

interface MerchantData {
  name: string;
  total_eur: number;
  visit_count: number;
  avg_per_visit: number;
}

interface GroceryItem {
  item_name: string;
  total_spent_eur: number;
  purchase_count: number;
  avg_price_eur: number;
  last_seen: string;
}

interface MonthlyTrend {
  month: string;
  total_eur: number;
  transaction_count: number;
}

interface Insight {
  type: 'tip';
  title: string;
  description: string;
  potential_saving_eur?: number;
}

interface InsightsReport {
  executive_summary: string;
  total_analyzed: number;
  total_spent_eur: number;
  current_month_spent_eur: number;
  top_categories: CategoryData[];
  top_merchants: MerchantData[];
  grocery_items: GroceryItem[];
  monthly_trend: MonthlyTrend[];
  insights: Insight[];
  biggest_expense: { merchant: string; amount_eur: number; date: string; category: string } | null;
  most_frequent_purchase: { item_or_merchant: string; count: number; total_eur: number } | null;
}

const CATEGORY_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
];

export default function InsightsPage() {
  const [report, setReport] = useState<InsightsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showConverter, setShowConverter] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('insights');

  const generateReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/insights', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate report');
      }

      if (data.report) {
        setReport(data.report);
        setGeneratedAt(data.generated_at);
      } else {
        setReport(null);
        setError(data.message || 'No data to analyze yet.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const maxMonthly = report?.monthly_trend
    ? Math.max(...report.monthly_trend.map(m => m.total_eur), 1)
    : 1;

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

      <main className="md:pl-64 max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <BarChart2 className="w-5 h-5 text-white" />
              </div>
              Spending Insights
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5">
              Calculated from your recorded transactions and receipt items
            </p>
          </div>

          <button
            onClick={generateReport}
            disabled={loading}
            className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.98] disabled:opacity-60 self-start sm:self-auto"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <BarChart2 className="w-4 h-4" />
                <span>{report ? 'Refresh Analysis' : 'Calculate Insights'}</span>
              </>
            )}
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-10 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center mx-auto">
              <BarChart2 className="w-8 h-8 text-indigo-500 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">
                Calculating your spending insights...
              </h3>
              <p className="text-sm text-slate-400 max-w-sm mx-auto">
                Grouping your expenses, merchants, receipt items, and monthly totals.
              </p>
            </div>
            <div className="flex justify-center space-x-1.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-indigo-500"
                  style={{ animation: `bounce 1.2s ease-in-out ${i * 0.15}s infinite` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-6 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 rounded-3xl">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
              <div>
                <p className="font-semibold text-rose-700 dark:text-rose-300">Analysis Failed</p>
                <p className="text-sm text-rose-600 dark:text-rose-400 mt-0.5">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Empty State (no report yet) */}
        {!loading && !error && !report && (
          <div className="p-10 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-5">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-50 to-indigo-100 dark:from-violet-950/50 dark:to-indigo-950/50 flex items-center justify-center mx-auto">
              <BarChart2 className="w-10 h-10 text-indigo-400" />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xl">
                Ready to analyze your spending
              </h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                Generate a report to calculate spending patterns and practical savings suggestions from your recorded transactions and saved receipt items.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto text-xs text-slate-500 dark:text-slate-400">
              {[
                { icon: ShoppingCart, label: 'Item-level grocery analysis' },
                { icon: Store, label: 'Merchant frequency tracking' },
                { icon: Lightbulb, label: 'Smart savings tips' },
              ].map((item) => (
                <div key={item.label} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl flex flex-col items-center space-y-1.5">
                  <item.icon className="w-5 h-5 text-indigo-500" />
                  <span className="text-center leading-tight">{item.label}</span>
                </div>
              ))}
            </div>
            <button
              onClick={generateReport}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-600/25 transition-all"
            >
              <BarChart2 className="w-4 h-4" />
              <span>Generate My Report</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Report Content */}
        {report && (
          <div className="space-y-5 animate-in fade-in duration-300">
            {/* Meta + Generated At */}
            {generatedAt && (
              <p className="text-xs text-slate-400 text-right">
                Report generated on {new Date(generatedAt).toLocaleString()}
              </p>
            )}

            {/* Executive Summary */}
            <div className="p-6 bg-gradient-to-br from-violet-600 via-indigo-700 to-indigo-900 text-white rounded-3xl shadow-xl shadow-indigo-600/20 space-y-4 relative overflow-hidden">
              <div className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
              <div className="flex items-center space-x-2">
                <BarChart2 className="w-5 h-5 text-violet-300" />
                <span className="text-xs font-bold text-violet-200 uppercase tracking-wider">Spending Summary</span>
              </div>
              <p className="text-base sm:text-lg font-medium leading-relaxed text-white/90">
                {report.executive_summary}
              </p>

              {/* Key Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/15">
                <div className="text-center">
                  <p className="text-indigo-200 text-[10px] uppercase font-semibold">Transactions</p>
                  <p className="text-2xl font-black">{report.total_analyzed}</p>
                </div>
                <div className="text-center border-l border-white/15">
                  <p className="text-indigo-200 text-[10px] uppercase font-semibold">Total Spent</p>
                  <p className="text-2xl font-black">€{Number(report.total_spent_eur).toFixed(0)}</p>
                </div>
                <div className="text-center border-l border-white/15">
                  <p className="text-indigo-200 text-[10px] uppercase font-semibold">This Month</p>
                  <p className="text-2xl font-black">€{Number(report.current_month_spent_eur).toFixed(0)}</p>
                </div>
                <div className="text-center border-l border-white/15">
                  <p className="text-indigo-200 text-[10px] uppercase font-semibold">Biggest Buy</p>
                  <p className="text-2xl font-black">€{Number(report.biggest_expense?.amount_eur || 0).toFixed(0)}</p>
                </div>
              </div>
            </div>

            {/* Quick Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {report.biggest_expense && (
                <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-2">
                  <div className="flex items-center space-x-2 text-rose-500">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Biggest Single Expense</span>
                  </div>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-white">
                    €{Number(report.biggest_expense.amount_eur).toFixed(2)}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {report.biggest_expense.merchant} · {report.biggest_expense.category}
                  </p>
                  <p className="text-xs text-slate-400">{report.biggest_expense.date}</p>
                </div>
              )}
              {report.most_frequent_purchase && (
                <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-2">
                  <div className="flex items-center space-x-2 text-indigo-500">
                    <ShoppingBag className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Most Frequent Purchase</span>
                  </div>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-white capitalize">
                    {report.most_frequent_purchase.item_or_merchant}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {report.most_frequent_purchase.count} times · €{Number(report.most_frequent_purchase.total_eur).toFixed(2)} total
                  </p>
                </div>
              )}
            </div>

            {/* Savings Suggestions */}
            <div className="space-y-2.5">
                <button
                  onClick={() => toggleSection('insights')}
                  className="w-full flex items-center justify-between"
                >
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span>How Can I Save? ({report.insights.length})</span>
                  </h2>
                  {expandedSection === 'insights'
                    ? <ChevronUp className="w-4 h-4 text-slate-400" />
                    : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {expandedSection === 'insights' && (
                  <div className="space-y-2.5 animate-in slide-in-from-top-2 duration-150">
                    {report.insights.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Add more transactions or receipt items to get tailored savings suggestions.
                      </p>
                    ) : report.insights.map((insight, i) => (
                      <div key={i} className="p-4 rounded-2xl border bg-amber-50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/40 space-y-1">
                        <div className="flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-amber-500" />
                          <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{insight.title}</span>
                          {Number(insight.potential_saving_eur) > 0 && (
                            <span className="ml-auto text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                              Potential save €{Number(insight.potential_saving_eur).toFixed(2)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {insight.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
            </div>

            {/* Category Breakdown */}
            {report.top_categories && report.top_categories.length > 0 && (
              <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl space-y-4">
                <button
                  onClick={() => toggleSection('categories')}
                  className="w-full flex items-center justify-between"
                >
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-2">
                    <BarChart2 className="w-4 h-4 text-indigo-500" />
                    <span>Spending by Category</span>
                  </h2>
                  {expandedSection === 'categories'
                    ? <ChevronUp className="w-4 h-4 text-slate-400" />
                    : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {expandedSection === 'categories' && (
                  <div className="space-y-3 animate-in slide-in-from-top-2 duration-150">
                    {/* Stacked bar */}
                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full flex overflow-hidden">
                      {report.top_categories.map((cat, i) => (
                        <div
                          key={cat.name}
                          style={{
                            width: `${Math.min(cat.percentage, 100)}%`,
                            backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                          }}
                          className="h-full transition-all"
                          title={`${cat.name}: ${cat.percentage?.toFixed(1)}%`}
                        />
                      ))}
                    </div>

                    {report.top_categories.map((cat, i) => (
                      <div key={cat.name} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{cat.name}</p>
                            <p className="text-xs text-slate-400">{cat.transaction_count} transactions · avg €{Number(cat.avg_per_transaction).toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="font-bold text-slate-900 dark:text-white text-sm">€{Number(cat.total_eur).toFixed(2)}</p>
                          <p className="text-xs text-slate-400">{Number(cat.percentage).toFixed(1)}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Top Merchants */}
            {report.top_merchants && report.top_merchants.length > 0 && (
              <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl space-y-4">
                <button
                  onClick={() => toggleSection('merchants')}
                  className="w-full flex items-center justify-between"
                >
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-2">
                    <Store className="w-4 h-4 text-violet-500" />
                    <span>Top Merchants / Stores</span>
                  </h2>
                  {expandedSection === 'merchants'
                    ? <ChevronUp className="w-4 h-4 text-slate-400" />
                    : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {expandedSection === 'merchants' && (
                  <div className="space-y-2.5 animate-in slide-in-from-top-2 duration-150">
                    {report.top_merchants.slice(0, 10).map((m, i) => (
                      <div key={m.name} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                        <div className="flex items-center space-x-3">
                          <span className="text-xs font-black text-slate-400 w-5 text-center">#{i + 1}</span>
                          <div>
                            <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{m.name || 'Unknown'}</p>
                            <p className="text-xs text-slate-400">{m.visit_count} visits · avg €{Number(m.avg_per_visit).toFixed(2)}/visit</p>
                          </div>
                        </div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">€{Number(m.total_eur).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Grocery Items (Item-level analysis) */}
            {report.grocery_items && report.grocery_items.length > 0 && (
              <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl space-y-4">
                <button
                  onClick={() => toggleSection('grocery')}
                  className="w-full flex items-center justify-between"
                >
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-2">
                    <ShoppingCart className="w-4 h-4 text-emerald-500" />
                    <span>Grocery & Item Analysis ({report.grocery_items.length} items)</span>
                  </h2>
                  {expandedSection === 'grocery'
                    ? <ChevronUp className="w-4 h-4 text-slate-400" />
                    : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {expandedSection === 'grocery' && (
                  <div className="space-y-2.5 animate-in slide-in-from-top-2 duration-150">
                    <p className="text-xs text-slate-400 italic">
                      Items extracted from scanned receipts and bills
                    </p>
                    {report.grocery_items.map((item) => (
                      <div key={item.item_name} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                        <div>
                          <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 capitalize">{item.item_name}</p>
                          <p className="text-xs text-slate-400">
                            Bought {item.purchase_count}x · avg €{Number(item.avg_price_eur).toFixed(2)} each
                            {item.last_seen && ` · Last: ${item.last_seen}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm text-slate-900 dark:text-white">€{Number(item.total_spent_eur).toFixed(2)}</p>
                          <p className="text-[10px] text-slate-400">total</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Monthly Trend */}
            {report.monthly_trend && report.monthly_trend.length > 0 && (
              <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl space-y-4">
                <button
                  onClick={() => toggleSection('trend')}
                  className="w-full flex items-center justify-between"
                >
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-sky-500" />
                    <span>Monthly Spending Trend</span>
                  </h2>
                  {expandedSection === 'trend'
                    ? <ChevronUp className="w-4 h-4 text-slate-400" />
                    : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {expandedSection === 'trend' && (
                  <div className="space-y-3 animate-in slide-in-from-top-2 duration-150">
                    {report.monthly_trend.slice(-12).reverse().map((m) => {
                      const pct = (m.total_eur / maxMonthly) * 100;
                      return (
                        <div key={m.month} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-700 dark:text-slate-300">{m.month}</span>
                            <div className="flex items-center space-x-3 text-slate-500 dark:text-slate-400">
                              <span>{m.transaction_count} txns</span>
                              <span className="font-bold text-slate-900 dark:text-white">€{Number(m.total_eur).toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Footer note */}
            <div className="p-4 bg-slate-100 dark:bg-slate-800/60 rounded-2xl flex items-center space-x-3">
              <Euro className="w-4 h-4 text-slate-400 shrink-0" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                All amounts in EUR. Analysis based on {report.total_analyzed} expense transactions.
                Savings suggestions are estimates based on recorded transactions; verify important financial decisions.
              </p>
            </div>
          </div>
        )}
      </main>

      <div className="md:hidden">
        <BottomNav onOpenAddModal={() => setIsAddModalOpen(true)} />
      </div>

      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {}}
      />

      <style jsx global>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}
