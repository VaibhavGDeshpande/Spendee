'use client';

import { TransactionWithDetails } from '@/types';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useMemo, useState } from 'react';
import { BarChart3, TrendingUp, PieChart as PieChartIcon } from 'lucide-react';

interface ChartsWidgetProps {
  transactions: TransactionWithDetails[];
}

export default function ChartsWidget({ transactions }: ChartsWidgetProps) {
  const [chartType, setChartType] = useState<'daily' | 'category' | 'pie'>('daily');

  const { dailyData, categoryData } = useMemo(() => {
    // Process expenses only
    const expenses = transactions.filter(t => t.type === 'expense');
    
    // Daily processing for current month
    const now = new Date();
    const currentMonthTxs = expenses.filter(t => {
      const d = new Date(t.transaction_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dailyMap: Record<number, number> = {};
    for (let i = 1; i <= daysInMonth; i++) dailyMap[i] = 0;

    currentMonthTxs.forEach(t => {
      const day = new Date(t.transaction_date).getDate();
      dailyMap[day] += t.amount_in_eur;
    });

    const dailyArr = Object.keys(dailyMap).map(day => ({
      day: parseInt(day),
      amount: parseFloat(dailyMap[parseInt(day)].toFixed(2))
    }));

    // Category processing for all time or current month
    const catMap: Record<string, { name: string, amount: number, color: string }> = {};
    currentMonthTxs.forEach(t => {
      const catName = t.category?.name || 'Other';
      if (!catMap[catName]) {
        catMap[catName] = { name: catName, amount: 0, color: t.category?.color || '#6366f1' };
      }
      catMap[catName].amount += t.amount_in_eur;
    });

    const catArr = Object.values(catMap).sort((a, b) => b.amount - a.amount).map(c => ({
      ...c,
      amount: parseFloat(c.amount.toFixed(2))
    }));

    return { dailyData: dailyArr, categoryData: catArr };
  }, [transactions]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          Spending Analytics
        </h3>
        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          <button
            onClick={() => setChartType('daily')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              chartType === 'daily'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Daily</span>
          </button>
          <button
            onClick={() => setChartType('category')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              chartType === 'category'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Categories</span>
          </button>
          <button
            onClick={() => setChartType('pie')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              chartType === 'pie'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <PieChartIcon className="w-3.5 h-3.5" />
            <span>Pie</span>
          </button>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'daily' ? (
            <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                labelFormatter={(val) => `Day ${val}`}
                formatter={(val: any) => [`€${val}`, 'Spent']}
              />
              <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
            </AreaChart>
          ) : chartType === 'category' ? (
            <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: '#f1f5f9', opacity: 0.1 }}
                formatter={(val: any) => [`€${val}`, 'Spent']}
              />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {
                  categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))
                }
              </Bar>
            </BarChart>
          ) : (
            <PieChart>
              <Pie
                data={categoryData}
                dataKey="amount"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(val: any) => [`€${val}`, 'Spent']}
              />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
