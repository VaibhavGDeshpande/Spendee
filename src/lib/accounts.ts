import { Account, Profile } from '@/types';
import {
  fetchSupabaseAccounts,
  insertSupabaseAccount,
  deleteSupabaseAccount,
  updateSupabaseAccountBalance,
  fetchSupabaseProfile,
  updateSupabaseProfileAllowance,
  insertSupabaseTransaction,
  fetchSupabaseTransactions,
  fetchSupabaseCategories,
} from './supabase/db';

export async function getUserAccounts(): Promise<Account[]> {
  const accounts = await fetchSupabaseAccounts();
  return accounts || [];
}

export interface CreateAccountParams {
  name: string;
  currency?: string;
  balance?: number;
  icon?: string;
}

export async function createAccount(params: CreateAccountParams): Promise<{ success: boolean; data?: Account; error?: string }> {
  const nameTrimmed = params.name.trim();

  if (!nameTrimmed) {
    return { success: false, error: 'Account/Source name is required' };
  }

  const accounts = await fetchSupabaseAccounts() || [];
  const existing = accounts.find((a) => a.name.toLowerCase() === nameTrimmed.toLowerCase());
  if (existing) {
    return { success: false, error: 'An account with this name already exists' };
  }

  const now = new Date().toISOString();
  
  // We need the user's ID
  const profile = await fetchSupabaseProfile();
  if (!profile) {
    return { success: false, error: 'User profile not found' };
  }

  // Generate UUID in browser natively
  let newId = '';
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    newId = crypto.randomUUID();
  } else {
    newId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  const newAccount: Account = {
    id: newId,
    user_id: profile.id,
    name: nameTrimmed,
    currency: (params.currency || 'EUR').toUpperCase(),
    balance: parseFloat((params.balance || 0).toFixed(2)),
    is_system: false,
    icon: params.icon || 'wallet',
    created_at: now,
    updated_at: now,
  };

  const success = await insertSupabaseAccount(newAccount);
  if (success) {
    return { success: true, data: newAccount };
  }
  return { success: false, error: 'Failed to create account in database' };
}

export async function deleteAccount(accountId: string): Promise<{ success: boolean; error?: string }> {
  const accounts = await fetchSupabaseAccounts() || [];
  const targetAccount = accounts.find((a) => a.id === accountId);
  if (!targetAccount) {
    return { success: false, error: 'Account not found' };
  }

  if (targetAccount.is_system) {
    return { success: false, error: 'Core system accounts cannot be deleted' };
  }

  const success = await deleteSupabaseAccount(accountId);
  if (success) {
    return { success: true };
  }
  return { success: false, error: 'Failed to delete account' };
}

export async function updateAccountBalance(accountId: string, newBalance: number): Promise<boolean> {
  return updateSupabaseAccountBalance(accountId, newBalance);
}

export async function getUserProfile(): Promise<Profile | null> {
  return fetchSupabaseProfile();
}

export async function updateProfileAllowance(allowanceEur: number): Promise<boolean> {
  return updateSupabaseProfileAllowance(allowanceEur);
}

export async function claimMonthlyAllowance(): Promise<{ success: boolean; message: string }> {
  const profile = await fetchSupabaseProfile();
  if (!profile) {
    return { success: false, message: 'Profile not found' };
  }
  const allowanceAmount = profile.blocked_allowance_eur || 992.00;

  const accounts = await fetchSupabaseAccounts() || [];
  const blockedAcc = accounts.find((a) => a.name === 'Blocked Account');
  if (!blockedAcc) {
    return { success: false, message: 'Blocked Account not found' };
  }

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const transactions = await fetchSupabaseTransactions() || [];
  // Check if allowance already claimed this month
  const alreadyClaimed = transactions.some(
    (t) =>
      t.account_id === blockedAcc.id &&
      t.type === 'income' &&
      t.transaction_date.startsWith(currentMonthStr) &&
      t.merchant?.includes('Allowance')
  );

  if (alreadyClaimed) {
    return {
      success: false,
      message: `Allowance for ${now.toLocaleString('default', { month: 'long' })} already claimed!`,
    };
  }

  const categories = await fetchSupabaseCategories();
  const allowanceCat = categories.find((c) => c.name.includes('Allowance')) || categories[0];

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

  const txDateStr = now.toISOString().split('T')[0];
  const merchantStr = `Monthly Allowance - ${now.toLocaleString('default', { month: 'long', year: 'numeric' })}`;

  // Insert to supabase
  const success = await insertSupabaseTransaction({
    account_id: blockedAcc.id,
    category_id: allowanceCat?.id || null,
    type: 'income',
    amount: allowanceAmount,
    currency: 'EUR',
    amount_in_eur: allowanceAmount,
    exchange_rate_used: 1.0,
    merchant: merchantStr,
    transaction_date: txDateStr,
    notes: 'Automated monthly allowance payout from Blocked Account',
  }, txId);

  if (success) {
    // Also update the balance on the blocked account explicitly, although trigger might handle it.
    // The DB has a trigger 'recalculate_account_balance' so it will handle updating balance automatically.
    return {
      success: true,
      message: `Successfully claimed €${allowanceAmount.toFixed(2)} allowance!`,
    };
  }

  return { success: false, message: 'Failed to claim allowance' };
}
