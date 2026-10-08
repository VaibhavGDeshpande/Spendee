import { Account, Profile } from '@/types';
import { getLocalDatabase, saveLocalDatabase, updateAccountDirectBalance } from './storage/localStore';
import { generateUUID } from './sync';

export async function getUserAccounts(): Promise<Account[]> {
  const db = getLocalDatabase();
  return db.accounts;
}

export interface CreateAccountParams {
  name: string;
  currency?: string;
  balance?: number;
  icon?: string;
}

export async function createAccount(params: CreateAccountParams): Promise<{ success: boolean; data?: Account; error?: string }> {
  const db = getLocalDatabase();
  const nameTrimmed = params.name.trim();

  if (!nameTrimmed) {
    return { success: false, error: 'Account/Source name is required' };
  }

  const existing = db.accounts.find((a) => a.name.toLowerCase() === nameTrimmed.toLowerCase());
  if (existing) {
    return { success: false, error: 'An account with this name already exists' };
  }

  const now = new Date().toISOString();
  const newAccount: Account = {
    id: generateUUID(),
    user_id: db.profile.id,
    name: nameTrimmed,
    currency: (params.currency || 'EUR').toUpperCase(),
    balance: parseFloat((params.balance || 0).toFixed(2)),
    is_system: false,
    icon: params.icon || 'wallet',
    created_at: now,
    updated_at: now,
  };

  db.accounts.push(newAccount);
  saveLocalDatabase(db);

  // Sync to Supabase in the background
  import('./supabase/db').then(({ insertSupabaseAccount }) => {
    insertSupabaseAccount(newAccount).catch(console.error);
  });

  return { success: true, data: newAccount };
}

export async function deleteAccount(accountId: string): Promise<{ success: boolean; error?: string }> {
  const db = getLocalDatabase();
  const accIndex = db.accounts.findIndex((a) => a.id === accountId);
  if (accIndex === -1) {
    return { success: false, error: 'Account not found' };
  }

  if (db.accounts[accIndex].is_system) {
    return { success: false, error: 'Core system accounts cannot be deleted' };
  }

  db.accounts.splice(accIndex, 1);
  saveLocalDatabase(db);

  // Sync deletion to Supabase
  import('./supabase/db').then(({ deleteSupabaseAccount }) => {
    deleteSupabaseAccount(accountId).catch(console.error);
  });

  return { success: true };
}

export async function updateAccountBalance(accountId: string, newBalance: number): Promise<boolean> {
  updateAccountDirectBalance(accountId, newBalance);
  return true;
}

export async function getUserProfile(): Promise<Profile | null> {
  const db = getLocalDatabase();
  return db.profile;
}

export async function updateProfileAllowance(allowanceEur: number): Promise<boolean> {
  const db = getLocalDatabase();
  db.profile.blocked_allowance_eur = allowanceEur;
  db.profile.updated_at = new Date().toISOString();
  saveLocalDatabase(db);
  return true;
}

export async function claimMonthlyAllowance(): Promise<{ success: boolean; message: string }> {
  const db = getLocalDatabase();
  const allowanceAmount = db.profile.blocked_allowance_eur || 992.00;

  const blockedAcc = db.accounts.find((a) => a.name === 'Blocked Account');
  if (!blockedAcc) {
    return { success: false, message: 'Blocked Account not found' };
  }

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Check if allowance already claimed this month
  const alreadyClaimed = db.transactions.some(
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

  const allowanceCat = db.categories.find((c) => c.name.includes('Allowance')) || db.categories[0];

  const txId = generateUUID();
  const newTx: any = {
    id: txId,
    user_id: db.profile.id,
    account_id: blockedAcc.id,
    account: blockedAcc,
    category_id: allowanceCat.id,
    category: allowanceCat,
    type: 'income',
    amount: allowanceAmount,
    currency: 'EUR',
    amount_in_eur: allowanceAmount,
    exchange_rate_used: 1.0,
    merchant: `Monthly Allowance - ${now.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
    transaction_date: now.toISOString().split('T')[0],
    notes: 'Automated monthly allowance payout from Blocked Account',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  // Add transaction and update blocked account balance
  db.transactions.unshift(newTx);
  blockedAcc.balance = parseFloat((blockedAcc.balance + allowanceAmount).toFixed(2));
  saveLocalDatabase(db);

  // Sync to Supabase in background
  import('./supabase/db').then(({ insertSupabaseTransaction }) => {
    insertSupabaseTransaction({
      account_id: blockedAcc.id,
      category_id: allowanceCat.id,
      type: 'income',
      amount: allowanceAmount,
      currency: 'EUR',
      amount_in_eur: allowanceAmount,
      exchange_rate_used: 1.0,
      merchant: newTx.merchant,
      transaction_date: newTx.transaction_date,
      notes: newTx.notes,
    }, txId).catch(console.error);
  });

  return {
    success: true,
    message: `Successfully claimed €${allowanceAmount.toFixed(2)} allowance!`,
  };
}
