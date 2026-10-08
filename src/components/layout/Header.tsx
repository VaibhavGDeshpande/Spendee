'use client';

import { Wallet, ArrowLeftRight, HardDrive } from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
  onToggleConverter?: () => void;
  showConverterButton?: boolean;
}

export default function Header({ onToggleConverter, showConverterButton = true }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 pt-[env(safe-area-inset-top,0px)]">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-base text-slate-900 dark:text-white tracking-tight leading-tight block">
              Spendee
            </span>
            <span className="text-[10px] text-slate-400 font-medium block flex items-center space-x-1">
              <HardDrive className="w-2.5 h-2.5 inline text-emerald-500" />
              <span>Local Storage</span>
            </span>
          </div>
        </Link>

        <div className="flex items-center space-x-2">
          {showConverterButton && onToggleConverter && (
            <button
              onClick={onToggleConverter}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-semibold border border-indigo-200/60 dark:border-indigo-800/60 hover:bg-indigo-100 transition-colors touch-target"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>INR ⇄ EUR</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
