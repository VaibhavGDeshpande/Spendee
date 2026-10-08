'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import AddTransactionModal from '@/components/transactions/AddTransactionModal';
import { getTransactions } from '@/lib/transactions';
import { getUserAccounts } from '@/lib/accounts';
import { FileSpreadsheet, Download, Calendar, Filter, CheckCircle2 } from 'lucide-react';
import ExcelJS from 'exceljs';

export default function ExportPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [exporting, setExporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showConverter, setShowConverter] = useState(false);

  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    getUserAccounts().then(setAccounts);
  }, []);

  const handleExportExcel = async () => {
    setExporting(true);
    setSuccessMsg(null);

    try {
      const [allTxs, fetchedAccounts] = await Promise.all([
        getTransactions({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          accountId: selectedAccount || undefined,
        }),
        getUserAccounts(),
      ]);

      // Create Excel Workbook using ExcelJS
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Spendee App';
      workbook.created = new Date();

      // Style Helpers
      const headerFill: ExcelJS.Fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F46E5' }, // Indigo-600
      };
      const headerFont: Partial<ExcelJS.Font> = {
        name: 'Arial',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };

      // 1. ALL TRANSACTIONS SHEET
      const sheetAll = workbook.addWorksheet('All Transactions');
      sheetAll.columns = [
        { header: 'Date', key: 'date', width: 14 },
        { header: 'Account', key: 'account', width: 16 },
        { header: 'Type', key: 'type', width: 12 },
        { header: 'Category', key: 'category', width: 18 },
        { header: 'Merchant', key: 'merchant', width: 22 },
        { header: 'Amount (€)', key: 'amount_eur', width: 14, style: { numFmt: '€#,##0.00' } },
        { header: 'Original Amount', key: 'amount_orig', width: 16 },
        { header: 'Currency', key: 'currency', width: 10 },
        { header: 'Rate Used', key: 'rate', width: 12 },
        { header: 'Notes', key: 'notes', width: 30 },
      ];

      // Format header row
      sheetAll.getRow(1).fill = headerFill;
      sheetAll.getRow(1).font = headerFont;

      allTxs.forEach((t) => {
        sheetAll.addRow({
          date: t.transaction_date,
          account: t.account?.name || 'Account',
          type: t.type.toUpperCase(),
          category: t.category?.name || 'Uncategorized',
          merchant: t.merchant || '-',
          amount_eur: t.amount_in_eur,
          amount_orig: t.amount,
          currency: t.currency,
          rate: t.exchange_rate_used || 1.0,
          notes: t.notes || '',
        });
      });

      // 2. PER-ACCOUNT SHEETS
      for (const acc of fetchedAccounts) {
        const accTxs = allTxs.filter((t) => t.account_id === acc.id || t.transfer_account_id === acc.id);
        const sheetAcc = workbook.addWorksheet(acc.name);

        sheetAcc.columns = [
          { header: 'Date', key: 'date', width: 14 },
          { header: 'Type', key: 'type', width: 12 },
          { header: 'Merchant / Description', key: 'merchant', width: 25 },
          { header: 'Category', key: 'category', width: 18 },
          { header: 'Amount (€)', key: 'amount', width: 14, style: { numFmt: '€#,##0.00' } },
          { header: 'Notes', key: 'notes', width: 30 },
        ];

        sheetAcc.getRow(1).fill = headerFill;
        sheetAcc.getRow(1).font = headerFont;

        accTxs.forEach((t) => {
          sheetAcc.addRow({
            date: t.transaction_date,
            type: t.type.toUpperCase(),
            merchant: t.merchant || '-',
            category: t.category?.name || '-',
            amount: t.amount_in_eur,
            notes: t.notes || '',
          });
        });
      }

      // 3. MONTHLY SUMMARY SHEET
      const sheetSummary = workbook.addWorksheet('Monthly Summary');
      sheetSummary.columns = [
        { header: 'Month', key: 'month', width: 16 },
        { header: 'Total Income (€)', key: 'income', width: 18, style: { numFmt: '€#,##0.00' } },
        { header: 'Total Expenses (€)', key: 'expense', width: 18, style: { numFmt: '€#,##0.00' } },
        { header: 'Net Savings (€)', key: 'savings', width: 18, style: { numFmt: '€#,##0.00' } },
      ];

      sheetSummary.getRow(1).fill = headerFill;
      sheetSummary.getRow(1).font = headerFont;

      const monthlyGroup: Record<string, { income: number; expense: number }> = {};
      allTxs.forEach((t) => {
        const mKey = t.transaction_date.slice(0, 7); // YYYY-MM
        if (!monthlyGroup[mKey]) monthlyGroup[mKey] = { income: 0, expense: 0 };
        if (t.type === 'income') monthlyGroup[mKey].income += t.amount_in_eur;
        if (t.type === 'expense') monthlyGroup[mKey].expense += t.amount_in_eur;
      });

      Object.entries(monthlyGroup).forEach(([month, data]) => {
        sheetSummary.addRow({
          month,
          income: data.income,
          expense: data.expense,
          savings: data.income - data.expense,
        });
      });

      // 4. LINE ITEMS SHEET (OCR Scanned items)
      const sheetItems = workbook.addWorksheet('Line Items');
      sheetItems.columns = [
        { header: 'Transaction Date', key: 'date', width: 14 },
        { header: 'Merchant', key: 'merchant', width: 20 },
        { header: 'Item Name', key: 'item', width: 25 },
        { header: 'Qty', key: 'qty', width: 8 },
        { header: 'Unit Price (€)', key: 'price', width: 14, style: { numFmt: '€#,##0.00' } },
        { header: 'Total Price (€)', key: 'total', width: 14, style: { numFmt: '€#,##0.00' } },
      ];

      sheetItems.getRow(1).fill = headerFill;
      sheetItems.getRow(1).font = headerFont;

      allTxs.forEach((t) => {
        if (t.items && t.items.length > 0) {
          t.items.forEach((item) => {
            sheetItems.addRow({
              date: t.transaction_date,
              merchant: t.merchant || 'Supermarket',
              item: item.item_name,
              qty: item.quantity,
              price: item.unit_price || 0,
              total: item.total_price,
            });
          });
        }
      });

      // Generate Buffer and Trigger Browser Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Spendee_Expenses_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);

      setSuccessMsg('Successfully exported multi-sheet Excel file!');
    } catch (err: unknown) {
      console.error('Export Error:', err);
    } finally {
      setExporting(false);
    }
  };

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
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Export to Excel (.xlsx)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Download your full transactions, per-account sheets, and line items in a formatted workbook
          </p>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm space-y-5">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                Multi-Sheet Excel Generator
              </h3>
              <p className="text-xs text-slate-400">
                Includes All Transactions, per-account worksheets, Monthly Summary & Line Items
              </p>
            </div>
          </div>

          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Export Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Start Date</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>End Date</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 flex items-center space-x-1">
                <Filter className="w-3.5 h-3.5" />
                <span>Account Filter</span>
              </label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
              >
                <option value="">All Accounts ({accounts.length})</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2 transition-all active:scale-[0.99] disabled:opacity-50 touch-target"
          >
            {exporting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>Download .xlsx File</span>
              </>
            )}
          </button>
        </div>
      </main>

      <div className="md:hidden">
        <BottomNav onOpenAddModal={() => setIsAddModalOpen(true)} />
      </div>

      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}
