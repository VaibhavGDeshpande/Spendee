'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ReceiptText, Plus, WalletCards, FileSpreadsheet, BarChart3, Sparkles } from 'lucide-react';

interface BottomNavProps {
  onOpenAddModal: () => void;
}

export default function BottomNav({ onOpenAddModal }: BottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Home', href: '/', icon: LayoutDashboard },
    { label: 'Activity', href: '/transactions', icon: ReceiptText },
    { label: 'Add', href: '#add', icon: Plus, isAction: true },
    { label: 'Insights', href: '/insights', icon: Sparkles },
    { label: 'Accounts', href: '/accounts', icon: WalletCards },
  ];

  return (
    <nav aria-label="Primary mobile navigation" className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom,0px)]">
      <div className="max-w-md mx-auto grid grid-cols-5 items-center h-16 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          if (item.isAction) {
            return (
              <button
                key={item.label}
                onClick={onOpenAddModal}
                className="relative -top-4 flex flex-col items-center justify-center"
                aria-label="Add Transaction"
              >
                <div className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 transition-transform active:scale-95 touch-target">
                  <Plus className="w-6 h-6 stroke-[2.5]" />
                </div>
                <span className="text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 mt-1 whitespace-nowrap">
                  Add
                </span>
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-w-0 flex-col items-center justify-center h-12 rounded-xl transition-colors touch-target ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[9px] mt-1 whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
