'use client';

import { createClient } from '@/lib/supabase/client';
import { getLocalDatabase, saveLocalDatabase, LocalDatabase } from './storage/localStore';
import { Account, Category, TransactionWithDetails } from '@/types';

/**
 * Called once on app load (after login).
 * Pulls the authenticated user's data from Supabase and merges it into
 * the local store, so the app works cross-device.
 *
 * Returns the supabase user id so callers can update the local profile.
 */
export async function syncFromSupabase(): Promise<string | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    // Fetch accounts, categories, and transactions in parallel
    const [accountsRes, categoriesRes, txRes] = await Promise.all([
      supabase.from('accounts').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('categories').select('*').or(`user_id.eq.${user.id},user_id.is.null`),
      supabase
        .from('transactions')
        .select(`
          *,
          account:accounts!transactions_account_id_fkey(*),
          category:categories!transactions_category_id_fkey(*),
          transfer_account:accounts!transactions_transfer_account_id_fkey(*),
          items:transaction_items(*)
        `)
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false })
        .limit(500),
    ]);

    // Fetch profile separately (select * to avoid TS inference issues with partial column names)
    const profileRes = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    const db = getLocalDatabase();

    // Update profile with real Supabase user id
    if (profileRes.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = profileRes.data as any;
      db.profile = {
        id: p.id,
        email: p.email,
        blocked_allowance_eur: p.blocked_allowance_eur ?? 992.0,
        created_at: p.created_at,
        updated_at: p.updated_at,
      };
    } else {
      db.profile.id = user.id;
      db.profile.email = user.email ?? db.profile.email;
    }

    if (accountsRes.data && accountsRes.data.length > 0) {
      db.accounts = accountsRes.data as Account[];
    }

    if (categoriesRes.data && categoriesRes.data.length > 0) {
      db.categories = categoriesRes.data as Category[];
    }

    if (txRes.data) {
      db.transactions = txRes.data as TransactionWithDetails[];
    }

    saveLocalDatabase(db);
    return user.id;
  } catch (err) {
    console.error('[syncFromSupabase] error:', err);
    return null;
  }
}

/**
 * Returns the currently authenticated Supabase user id, or null if not logged in.
 */
export async function getSupabaseUserId(): Promise<string | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Generates a UUID v4.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
