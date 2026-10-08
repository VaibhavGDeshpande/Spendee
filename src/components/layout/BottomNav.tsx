'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ReceiptText, Plus, WalletCards, FileSpreadsheet, BarChart3 } from 'lucide-react';

interface BottomNavProps {
  onOpenAddModal: () => void;
}

export default function BottomNav({ onOpenAddModal }: BottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dash', href: '/', icon: LayoutDashboard },
    { label: 'Txs', href: '/transactions', icon: ReceiptText },
    { label: 'Add', href: '#add', icon: Plus, isAction: true },
    { label: 'Charts', href: '/analytics', icon: BarChart3 },
    { label: 'Accs', href: '/accounts', icon: WalletCards },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom,0px)]">
      <div className="max-w-md mx-auto flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          if (item.isAction) {
            return (
              <button
                key={item.label}
                onClick={onOpenAddModal}
                className="relative -top-5 flex flex-col items-center justify-center"
                aria-label="Add Transaction"
              >
                <div className="w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 transition-transform active:scale-95 touch-target">
                  <Plus className="w-7 h-7 stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 mt-1">
                  Add
                </span>
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all touch-target ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[10px] mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
