import { Category, TransactionWithDetails, CreateTransactionParams } from '@/types';
import { createId } from './utils/id';
import {
  fetchSupabaseCategories,
  fetchSupabaseTransactions,
  insertSupabaseTransaction,
  deleteSupabaseTransaction,
  updateSupabaseTransaction,
  fetchSupabaseAccounts,
  insertSupabaseCategory,
} from './supabase/db';

export async function getCategories(): Promise<Category[]> {
  const cats = await fetchSupabaseCategories();
  return cats || [];
}

export async function createCategory(
  name: string,
  type: 'expense' | 'income',
  color: string,
): Promise<{ success: boolean; category?: Category; error?: string }> {
  const category = await insertSupabaseCategory(name.trim(), type, color);
  return category
    ? { success: true, category }
    : { success: false, error: 'Could not create category. Please try again.' };
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

  const txId = createId();

  // Handle Transfer logic
  if (params.type === 'transfer') {
    if (!params.transfer_account_id) {
      return { success: false, error: 'Destination account required for transfers' };
    }

    const destAccount = accounts.find((a) => a.id === params.transfer_account_id);
    if (!destAccount) {
      return { success: false, error: 'Destination account not found' };
    }

    const destTxId = createId();

    // Source (inserted first)
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
      transfer_transaction_id: txId,
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
  
  // If the deleted transaction was the Dest, delete its Source
  if (target.transfer_transaction_id) {
    success2 = await deleteSupabaseTransaction(target.transfer_transaction_id);
  } else {
    // If the deleted transaction was the Source, find and delete its Dest
    const linkedDest = transactions.find((t) => t.transfer_transaction_id === id);
    if (linkedDest) {
      success2 = await deleteSupabaseTransaction(linkedDest.id);
    }
  }
  
  return success1 && success2;
}

export async function updateTransaction(
  id: string,
  params: Partial<CreateTransactionParams>
): Promise<{ success: boolean; error?: string }> {
  const before = ((await fetchSupabaseTransactions()) || []).find((t) => t.id === id);

  // Partial edits (e.g. notes only) and edits of a transfer's credit row don't touch the pairing
  if (!params.type || before?.transfer_transaction_id) {
    delete params.transfer_account_id;
    const ok = await updateSupabaseTransaction(id, params);
    return ok ? { success: true } : { success: false, error: 'Failed to update transaction' };
  }

  const isTransfer = params.type === 'transfer';
  if (isTransfer && (!params.transfer_account_id || params.transfer_account_id === params.account_id)) {
    return { success: false, error: 'Choose a different destination account for the transfer' };
  }

  const success = await updateSupabaseTransaction(id, {
    ...params,
    // undefined is dropped from the update, so clear it explicitly when no longer a transfer
    transfer_account_id: isTransfer ? params.transfer_account_id : (null as unknown as undefined),
  });
  if (!success) return { success: false, error: 'Failed to update transaction' };

  // The destination's credit row is linked via transfer_transaction_id; keep it in sync
  const transactions = (await fetchSupabaseTransactions()) || [];
  const linkedDest = transactions.find((t) => t.transfer_transaction_id === id);

  if (!isTransfer) {
    if (linkedDest && !(await deleteSupabaseTransaction(linkedDest.id))) {
      return { success: false, error: 'Failed to remove the linked transfer credit' };
    }
    return { success: true };
  }

  const source = transactions.find((t) => t.id === id);
  if (!source) return { success: false, error: 'Transaction not found after update' };

  const destParams: CreateTransactionParams = {
    account_id: params.transfer_account_id!,
    category_id: null,
    type: 'income',
    amount: source.amount_in_eur,
    currency: 'EUR',
    amount_in_eur: source.amount_in_eur,
    exchange_rate_used: 1.0,
    merchant: `Transfer from ${source.account?.name ?? 'account'}`,
    transaction_date: source.transaction_date,
    notes: source.notes || undefined,
    transfer_account_id: source.account_id,
    transfer_transaction_id: id,
  };

  const destOk = linkedDest
    ? await updateSupabaseTransaction(linkedDest.id, destParams)
    : await insertSupabaseTransaction(destParams, createId());
  if (!destOk) return { success: false, error: 'Failed to update the transfer destination' };
  return { success: true };
}
