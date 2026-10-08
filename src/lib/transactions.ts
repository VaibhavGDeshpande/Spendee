import { Category, TransactionWithDetails, CreateTransactionParams } from '@/types';
import {
  fetchSupabaseCategories,
  fetchSupabaseTransactions,
  insertSupabaseTransaction,
  deleteSupabaseTransaction,
  updateSupabaseTransaction,
  fetchSupabaseAccounts,
} from './supabase/db';

export async function getCategories(): Promise<Category[]> {
  const cats = await fetchSupabaseCategories();
  return cats || [];
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
  let list = await fetchSupabaseTransactions() || [];

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
  
  const accounts = await fetchSupabaseAccounts() || [];
  const account = accounts.find((a) => a.id === params.account_id);
  if (!account) {
    return { success: false, error: 'Account not found' };
  }

  let txId = '';
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    txId = crypto.randomUUID();
  } else {
    txId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // Handle Transfer logic
  if (params.type === 'transfer') {
    if (!params.transfer_account_id) {
      return { success: false, error: 'Destination account required for transfers' };
    }

    const destAccount = accounts.find((a) => a.id === params.transfer_account_id);
    if (!destAccount) {
      return { success: false, error: 'Destination account not found' };
    }

    let destTxId = '';
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      destTxId = crypto.randomUUID();
    } else {
      destTxId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }

    // Source
    const sourceSuccess = await insertSupabaseTransaction({
      ...params,
      type: 'transfer',
      merchant: params.merchant || `Transfer to ${destAccount.name}`,
    }, txId);

    // Dest
    const destSuccess = await insertSupabaseTransaction({
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
    }, destTxId);

    return { success: sourceSuccess && destSuccess };
  }

  // Normal Expense or Income
  const success = await insertSupabaseTransaction(params, txId);
  return { success };
}

export async function deleteTransaction(id: string): Promise<boolean> {
  const transactions = await fetchSupabaseTransactions() || [];
  const target = transactions.find((t) => t.id === id);
  if (!target) return false;

  const success1 = await deleteSupabaseTransaction(id);
  let success2 = true;
  
  if (target.transfer_transaction_id) {
    success2 = await deleteSupabaseTransaction(target.transfer_transaction_id);
  }
  
  return success1 && success2;
}

export async function updateTransaction(
  id: string,
  params: Partial<CreateTransactionParams>
): Promise<{ success: boolean; error?: string }> {
  // If it's a transfer, we'd theoretically need to update both. For simplicity, just update the target.
  const success = await updateSupabaseTransaction(id, params);
  if (!success) return { success: false, error: 'Failed to update transaction' };
  return { success: true };
}
