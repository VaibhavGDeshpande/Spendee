import { Category, TransactionWithDetails, CreateTransactionParams } from '@/types';
import { getLocalDatabase, saveLocalDatabase } from './storage/localStore';
import { generateUUID } from './sync';

export async function getCategories(): Promise<Category[]> {
  const db = getLocalDatabase();
  return db.categories;
}

export interface TransactionFilter {
  accountId?: string;
  categoryId?: string;
  type?: 'expense' | 'income' | 'transfer';
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export async function getTransactions(filter?: TransactionFilter): Promise<TransactionWithDetails[]> {
  const db = getLocalDatabase();
  let list = [...db.transactions];

  if (filter?.accountId) {
    list = list.filter(
      (t) => t.account_id === filter.accountId || t.transfer_account_id === filter.accountId
    );
  }

  if (filter?.categoryId) {
    list = list.filter((t) => t.category_id === filter.categoryId);
  }

  if (filter?.type) {
    list = list.filter((t) => t.type === filter.type);
  }

  if (filter?.startDate) {
    list = list.filter((t) => t.transaction_date >= filter.startDate!);
  }

  if (filter?.endDate) {
    list = list.filter((t) => t.transaction_date <= filter.endDate!);
  }

  if (filter?.searchQuery) {
    const q = filter.searchQuery.toLowerCase();
    list = list.filter(
      (t) =>
        t.merchant?.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q) ||
        t.category?.name.toLowerCase().includes(q)
    );
  }

  list.sort(
    (a, b) =>
      new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime() ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (filter?.limit) {
    list = list.slice(0, filter.limit);
  }

  return list;
}

export async function createTransaction(
  params: CreateTransactionParams
): Promise<{ success: boolean; data?: any; error?: string }> {
  const db = getLocalDatabase();

  const account = db.accounts.find((a) => a.id === params.account_id);
  if (!account) {
    return { success: false, error: 'Account not found' };
  }

  const category = params.category_id
    ? db.categories.find((c) => c.id === params.category_id)
    : null;

  const now = new Date().toISOString();
  const txId = generateUUID();

  // Handle Transfer logic
  if (params.type === 'transfer') {
    if (!params.transfer_account_id) {
      return { success: false, error: 'Destination account required for transfers' };
    }

    const destAccount = db.accounts.find((a) => a.id === params.transfer_account_id);
    if (!destAccount) {
      return { success: false, error: 'Destination account not found' };
    }

    const destTxId = generateUUID();

    // Source Tx
    const sourceTx: TransactionWithDetails = {
      id: txId,
      user_id: db.profile.id,
      account_id: account.id,
      account,
      category_id: null,
      type: 'transfer',
      amount: params.amount,
      currency: params.currency,
      amount_in_eur: params.amount_in_eur,
      exchange_rate_used: params.exchange_rate_used || 1.0,
      merchant: params.merchant || `Transfer to ${destAccount.name}`,
      transaction_date: params.transaction_date,
      notes: params.notes || null,
      image_url: params.image_url || null,
      transfer_account_id: destAccount.id,
      transfer_account: destAccount,
      transfer_transaction_id: destTxId,
      created_at: now,
      updated_at: now,
    };

    // Dest Tx
    const destTx: TransactionWithDetails = {
      id: destTxId,
      user_id: db.profile.id,
      account_id: destAccount.id,
      account: destAccount,
      category_id: null,
      type: 'income',
      amount: params.amount_in_eur,
      currency: 'EUR',
      amount_in_eur: params.amount_in_eur,
      exchange_rate_used: 1.0,
      merchant: `Transfer from ${account.name}`,
      transaction_date: params.transaction_date,
      notes: params.notes || null,
      image_url: params.image_url || null,
      transfer_account_id: account.id,
      transfer_account: account,
      transfer_transaction_id: txId,
      created_at: now,
      updated_at: now,
    };

    db.transactions.unshift(sourceTx, destTx);
    saveLocalDatabase(db);

    // Sync to Supabase in the background
    import('./supabase/db').then(({ insertSupabaseTransaction }) => {
      // Source
      insertSupabaseTransaction({
        ...params,
        type: 'transfer',
        merchant: params.merchant || `Transfer to ${destAccount.name}`,
      }, txId).catch(console.error);

      // Dest
      insertSupabaseTransaction({
        account_id: destAccount.id,
        category_id: null,
        type: 'income',
        amount: params.amount_in_eur,
        currency: 'EUR',
        amount_in_eur: params.amount_in_eur,
        exchange_rate_used: 1.0,
        merchant: `Transfer from ${account.name}`,
        transaction_date: params.transaction_date,
        notes: params.notes || undefined,
        image_url: params.image_url || undefined,
        transfer_account_id: account.id,
      }, destTxId).catch(console.error);
    });

    return { success: true, data: sourceTx };
  }

  // Normal Expense or Income
  const newTx: TransactionWithDetails = {
    id: txId,
    user_id: db.profile.id,
    account_id: account.id,
    account,
    category_id: category?.id || null,
    category,
    type: params.type,
    amount: params.amount,
    currency: params.currency,
    amount_in_eur: params.amount_in_eur,
    exchange_rate_used: params.exchange_rate_used || 1.0,
    merchant: params.merchant || null,
    transaction_date: params.transaction_date,
    notes: params.notes || null,
    image_url: params.image_url || null,
    transfer_account_id: null,
    transfer_transaction_id: null,
    items: params.line_items?.map((item: any, idx: number) => ({
      id: `item-${Date.now()}-${idx}`,
      transaction_id: txId,
      item_name: item.item_name,
      unit_price: item.unit_price || null,
      quantity: item.quantity || 1,
      total_price: item.total_price,
      created_at: now,
    })),
    created_at: now,
    updated_at: now,
  };

  db.transactions.unshift(newTx);
  saveLocalDatabase(db);

  // Sync to Supabase in the background (fire and forget for UI responsiveness)
  import('./supabase/db').then(({ insertSupabaseTransaction }) => {
    insertSupabaseTransaction(params, txId).catch(console.error);
  });

  return { success: true, data: newTx };
}

export async function deleteTransaction(id: string): Promise<boolean> {
  const db = getLocalDatabase();

  const target = db.transactions.find((t) => t.id === id);
  if (!target) return false;

  if (target.transfer_transaction_id) {
    db.transactions = db.transactions.filter(
      (t) => t.id !== id && t.id !== target.transfer_transaction_id
    );
  } else {
    db.transactions = db.transactions.filter((t) => t.id !== id);
  }

  saveLocalDatabase(db);

  // Sync deletion to Supabase
  import('./supabase/db').then(({ deleteSupabaseTransaction }) => {
    deleteSupabaseTransaction(id).catch(console.error);
    if (target.transfer_transaction_id) {
      deleteSupabaseTransaction(target.transfer_transaction_id).catch(console.error);
    }
  });

  return true;
}
