import { createClient } from './client';
import { Account, Category, Profile, TransactionWithDetails, CreateTransactionParams } from '@/types';
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

    if (error) {
      console.error('[fetchSupabaseAccounts]', error);
      return null;
    }
    if (!data) return null;
    if (data.length === 0) return [];

    return data as Account[];
  } catch {
    return null;
  }
}

export async function updateSupabaseAccountBalance(accountId: string, newBalance: number): Promise<boolean> {
  if (!isSupabaseConnected()) return false;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await (supabase.from('accounts') as any)
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', accountId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[updateSupabaseAccountBalance] error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[updateSupabaseAccountBalance] caught:', err);
    return false;
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

    if (error) {
      console.error('[insertSupabaseAccount] error:', error, '| account id:', account.id);
    }
    return !error;
  } catch (err) {
    console.error('[insertSupabaseAccount] caught:', err);
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

    if (error) {
      console.error('[deleteSupabaseAccount] error:', error);
    }
    return !error;
  } catch (err) {
    console.error('[deleteSupabaseAccount] caught:', err);
    return false;
  }
}

// ==========================================
// PROFILE SUPABASE DB SERVICES
// ==========================================

export async function fetchSupabaseProfile(): Promise<Profile | null> {
  if (!isSupabaseConnected()) return null;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[fetchSupabaseProfile]', error);
      return null;
    }
    
    if (data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = data as any;
        return {
          id: p.id,
          email: p.email,
          blocked_allowance_eur: p.blocked_allowance_eur ?? 992.0,
          created_at: p.created_at,
          updated_at: p.updated_at,
        } as Profile;
    }

    // Profile doesn't exist, create it (fallback if trigger failed)
    const { error: insertError } = await supabase.from('profiles').insert({
      id: user.id,
      email: user.email || '',
      blocked_allowance_eur: 992.00,
    } as any);

    if (insertError) {
      console.error('[fetchSupabaseProfile] error inserting fallback profile:', insertError);
      return null;
    }

    // Create default accounts
    await supabase.from('accounts').insert([
      { user_id: user.id, name: 'Forex Account', currency: 'EUR', balance: 0.00, is_system: true, icon: 'credit-card' },
      { user_id: user.id, name: 'Cash', currency: 'EUR', balance: 0.00, is_system: true, icon: 'banknote' },
      { user_id: user.id, name: 'Blocked Account', currency: 'EUR', balance: 0.00, is_system: true, icon: 'landmark' }
    ] as any);

    return {
      id: user.id,
      email: user.email || '',
      blocked_allowance_eur: 992.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function updateSupabaseProfileAllowance(allowanceEur: number): Promise<boolean> {
  if (!isSupabaseConnected()) return false;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await (supabase.from('profiles') as any)
      .update({ blocked_allowance_eur: allowanceEur, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      console.error('[updateSupabaseProfileAllowance] error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[updateSupabaseProfileAllowance] caught:', err);
    return false;
  }
}

// ==========================================
// CATEGORIES SUPABASE DB SERVICES
// ==========================================

export async function fetchSupabaseCategories(): Promise<Category[]> {
  if (!isSupabaseConnected()) return [];
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .or(`user_id.eq.${user.id},user_id.is.null`);

    if (error) {
      console.error('[fetchSupabaseCategories]', error);
      return [];
    }

    return (data || []) as Category[];
  } catch {
    return [];
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

    if (error) {
      console.error('[insertSupabaseTransaction] error:', error, '| tx id:', txId);
      return false;
    }

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
  } catch (err) {
    console.error('[insertSupabaseTransaction] caught:', err);
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

    if (error) {
      console.error('[deleteSupabaseTransaction] error:', error);
    }
    return !error;
  } catch (err) {
    console.error('[deleteSupabaseTransaction] caught:', err);
    return false;
  }
}
