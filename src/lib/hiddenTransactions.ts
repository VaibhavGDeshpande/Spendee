import { HiddenTransaction } from '@/types';
import { createId } from './utils/id';
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
  const txId = createId();

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
