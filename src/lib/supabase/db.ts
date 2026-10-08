import { createClient } from './client';
import { Account, Category, Profile, TransactionWithDetails, CreateTransactionParams } from '@/types';
import { getLocalDatabase, saveLocalDatabase } from '../storage/localStore';

export function isSupabaseConnected(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
  );
}

// ==========================================
// ACCOUNTS SUPABASE DB SERVICES
// ==========================================

export async function fetchSupabaseAccounts(): Promise<Account[] | null> {
  if (!isSupabaseConnected()) return null;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) return null;

    // Cache locally
    const local = getLocalDatabase();
    local.accounts = data as Account[];
    saveLocalDatabase(local);

    return data as Account[];
  } catch {
    return null;
  }
}

export async function insertSupabaseAccount(account: Account): Promise<boolean> {
  if (!isSupabaseConnected()) return false;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.from('accounts').insert({
      id: account.id,
      user_id: user.id,
      name: account.name,
      currency: account.currency,
      balance: account.balance,
      is_system: account.is_system,
      icon: account.icon,
    } as any);

    return !error;
  } catch {
    return false;
  }
}

export async function deleteSupabaseAccount(accountId: string): Promise<boolean> {
  if (!isSupabaseConnected()) return false;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', accountId)
      .eq('user_id', user.id);

    return !error;
  } catch {
    return false;
  }
}

// ==========================================
// TRANSACTIONS SUPABASE DB SERVICES
// ==========================================

export async function fetchSupabaseTransactions(): Promise<TransactionWithDetails[] | null> {
  if (!isSupabaseConnected()) return null;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        account:accounts!transactions_account_id_fkey(*),
        category:categories!transactions_category_id_fkey(*),
        transfer_account:accounts!transactions_transfer_account_id_fkey(*),
        items:transaction_items(*)
      `)
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false });

    if (error || !data) return null;

    return data as TransactionWithDetails[];
  } catch {
    return null;
  }
}

export async function insertSupabaseTransaction(params: CreateTransactionParams, txId: string): Promise<boolean> {
  if (!isSupabaseConnected()) return false;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.from('transactions').insert({
      id: txId,
      user_id: user.id,
      account_id: params.account_id,
      category_id: params.category_id || null,
      type: params.type,
      amount: params.amount,
      currency: params.currency,
      amount_in_eur: params.amount_in_eur,
      exchange_rate_used: params.exchange_rate_used || 1.0,
      merchant: params.merchant || null,
      transaction_date: params.transaction_date,
      notes: params.notes || null,
      image_url: params.image_url || null,
      transfer_account_id: params.transfer_account_id || null,
    } as any);

    if (error) return false;

    // Insert line items if present
    if (params.line_items && params.line_items.length > 0) {
      const itemsToInsert = params.line_items.map((item) => ({
        transaction_id: txId,
        item_name: item.item_name,
        unit_price: item.unit_price || null,
        quantity: item.quantity || 1,
        total_price: item.total_price,
      }));

      await supabase.from('transaction_items').insert(itemsToInsert as any);
    }

    return true;
  } catch {
    return false;
  }
}

export async function deleteSupabaseTransaction(id: string): Promise<boolean> {
  if (!isSupabaseConnected()) return false;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    return !error;
  } catch {
    return false;
  }
}
