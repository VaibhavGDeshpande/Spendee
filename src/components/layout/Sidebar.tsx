'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ReceiptText,
  Plus,
  WalletCards,
  FileSpreadsheet,
  Wallet,
  HardDrive,
  ArrowLeftRight,
} from 'lucide-react';
import CurrencyConverterWidget from '../currency/CurrencyConverterWidget';

interface SidebarProps {
  onOpenAddModal: () => void;
  showConverter: boolean;
  onToggleConverter: () => void;
}

export default function Sidebar({ onOpenAddModal, showConverter, onToggleConverter }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Transactions', href: '/transactions', icon: ReceiptText },
    { label: 'Accounts', href: '/accounts', icon: WalletCards },
    { label: 'Excel Export', href: '/export', icon: FileSpreadsheet },
  ];

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 p-4 space-y-6">
      {/* Brand Header */}
      <Link href="/" className="flex items-center space-x-3 px-2">
        <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/20">
          <Wallet className="w-5 h-5" />
        </div>
        <div>
          <span className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight block">
            Spendee
          </span>
          <span className="text-xs text-slate-400 font-medium flex items-center space-x-1">
            <HardDrive className="w-3 h-3 text-emerald-500 inline" />
            <span>Local Manager</span>
          </span>
        </div>
      </Link>

      {/* Quick Add Button */}
      <button
        onClick={onOpenAddModal}
        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2 transition-all active:scale-[0.98] touch-target"
      >
        <Plus className="w-5 h-5 stroke-[2.5]" />
        <span>New Transaction</span>
      </button>

      {/* Desktop Navigation Links */}
      <nav className="space-y-1.5 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center space-x-3 px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Live Converter Sidebar Card / Toggle */}
      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={onToggleConverter}
          className="w-full py-2.5 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-semibold border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-between hover:bg-indigo-100 transition-colors"
        >
          <span className="flex items-center space-x-2">
            <ArrowLeftRight className="w-4 h-4" />
            <span>Currency Converter</span>
          </span>
          <span className="text-[10px] font-bold">INR ⇄ EUR</span>
        </button>

        {showConverter && (
          <div className="animate-in fade-in duration-150">
            <CurrencyConverterWidget onClose={onToggleConverter} />
          </div>
        )}
      </div>
    </aside>
  );
}
