import { HiddenTransaction } from '@/types';
import {
  fetchSupabaseHiddenTransactions,
  insertSupabaseHiddenTransaction,
  deleteSupabaseHiddenTransaction,
  updateSupabaseHiddenTransaction,
  CreateHiddenTransactionParams,
} from './supabase/db';

export type { CreateHiddenTransactionParams };

export async function getHiddenTransactions(): Promise<HiddenTransaction[]> {
  const list = await fetchSupabaseHiddenTransactions();
  return list || [];
}

export async function createHiddenTransaction(
  params: CreateHiddenTransactionParams,
): Promise<{ success: boolean; error?: string }> {
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

  const success = await insertSupabaseHiddenTransaction(params, txId);
  return success ? { success: true } : { success: false, error: 'Failed to save hidden transaction' };
}

export async function deleteHiddenTransaction(id: string): Promise<boolean> {
  return deleteSupabaseHiddenTransaction(id);
}

export async function updateHiddenTransaction(
  id: string,
  params: Partial<CreateHiddenTransactionParams>,
): Promise<{ success: boolean; error?: string }> {
  const success = await updateSupabaseHiddenTransaction(id, params);
  return success ? { success: true } : { success: false, error: 'Failed to update hidden transaction' };
}
