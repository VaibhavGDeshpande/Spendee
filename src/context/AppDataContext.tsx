'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Account, Category, Profile, TransactionWithDetails } from '@/types';
import { getUserAccounts } from '@/lib/accounts';
import { getTransactions, getCategories } from '@/lib/transactions';
import { fetchSupabaseProfile } from '@/lib/supabase/db';

interface AppData {
  accounts: Account[];
  transactions: TransactionWithDetails[];
  categories: Category[];
  profile: Profile | null;
  eurToInrRate: number;
  forexEurRate: { eur_usd: number; last_updated: string } | null;
  loading: boolean;
  /** Re-fetch all data from Supabase (call after mutations) */
  refresh: () => Promise<void>;
  /** Re-fetch only transactions (lighter refresh) */
  refreshTransactions: () => Promise<void>;
  /** Re-fetch only categories */
  refreshCategories: () => Promise<void>;
}

const AppDataContext = createContext<AppData | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [eurToInrRate, setEurToInrRate] = useState(91.5);
  const [forexEurRate, setForexEurRate] = useState<{ eur_usd: number; last_updated: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const fetchAllRequest = useRef<Promise<void> | null>(null);

  const fetchAll = useCallback(async () => {
    if (fetchAllRequest.current) return fetchAllRequest.current;

    setLoading(true);
    const request = (async () => {
      try {
        const [accs, txs, cats, prof] = await Promise.all([
          getUserAccounts(),
          getTransactions(),
          getCategories(),
          fetchSupabaseProfile(),
        ]);
        setAccounts(accs);
        setTransactions(txs);
        setCategories(cats);
        setProfile(prof);

        // Fetch rates (non-blocking)
        try {
          const res = await fetch('/api/rates');
          if (res.ok) {
            const data = await res.json();
            if (data.rate) setEurToInrRate(data.rate);
            if (data.eur_usd) {
              setForexEurRate({ eur_usd: data.eur_usd, last_updated: data.eur_usd_last_updated || data.last_updated });
            }
          }
        } catch {
          // rates are optional, ignore errors
        }
      } finally {
        setLoading(false);
        setInitialized(true);
        fetchAllRequest.current = null;
      }
    })();
    fetchAllRequest.current = request;
    return request;
  }, []);

  const refreshTransactions = useCallback(async () => {
    const txs = await getTransactions();
    setTransactions(txs);
  }, []);

  const refreshCategories = useCallback(async () => {
    const cats = await getCategories();
    setCategories(cats);
  }, []);

  // Fetch once on first mount
  useEffect(() => {
    if (!initialized) {
      fetchAll();
    }
  }, [initialized, fetchAll]);

  return (
    <AppDataContext.Provider
      value={{
        accounts,
        transactions,
        categories,
        profile,
        eurToInrRate,
        forexEurRate,
        loading,
        refresh: fetchAll,
        refreshTransactions,
        refreshCategories,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error('useAppData must be used within <AppDataProvider>');
  }
  return ctx;
}
