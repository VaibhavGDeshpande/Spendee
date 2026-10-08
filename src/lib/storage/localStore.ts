import { Account, Category, Profile, TransactionWithDetails, CreateTransactionParams } from '@/types';

const STORAGE_KEY = 'spendee_local_database_v1';

export interface LocalDatabase {
  profile: Profile;
  accounts: Account[];
  categories: Category[];
  transactions: TransactionWithDetails[];
}

const DEFAULT_PROFILE: Profile = {
  id: 'local-user-1',
  email: 'student@germany.de',
  blocked_allowance_eur: 992.00,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: 'acc-forex',
    user_id: 'local-user-1',
    name: 'Forex Account',
    currency: 'EUR',
    balance: 500.00,
    is_system: true,
    icon: 'credit-card',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'acc-cash',
    user_id: 'local-user-1',
    name: 'Cash',
    currency: 'EUR',
    balance: 150.00,
    is_system: true,
    icon: 'banknote',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'acc-blocked',
    user_id: 'local-user-1',
    name: 'Blocked Account',
    currency: 'EUR',
    balance: 992.00,
    is_system: true,
    icon: 'landmark',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', user_id: null, name: 'Groceries', icon: 'shopping-cart', color: '#10b981', type: 'expense', is_default: true, created_at: new Date().toISOString() },
  { id: 'cat-2', user_id: null, name: 'Rent & Housing', icon: 'home', color: '#6366f1', type: 'expense', is_default: true, created_at: new Date().toISOString() },
  { id: 'cat-3', user_id: null, name: 'Transport', icon: 'bus', color: '#3b82f6', type: 'expense', is_default: true, created_at: new Date().toISOString() },
  { id: 'cat-4', user_id: null, name: 'Eating Out', icon: 'utensils', color: '#f59e0b', type: 'expense', is_default: true, created_at: new Date().toISOString() },
  { id: 'cat-5', user_id: null, name: 'University & Fees', icon: 'graduation-cap', color: '#8b5cf6', type: 'expense', is_default: true, created_at: new Date().toISOString() },
  { id: 'cat-6', user_id: null, name: 'Health & Insurance', icon: 'heart-pulse', color: '#ef4444', type: 'expense', is_default: true, created_at: new Date().toISOString() },
  { id: 'cat-7', user_id: null, name: 'Travel', icon: 'plane', color: '#06b6d4', type: 'expense', is_default: true, created_at: new Date().toISOString() },
  { id: 'cat-8', user_id: null, name: 'Subscriptions', icon: 'tv', color: '#ec4899', type: 'expense', is_default: true, created_at: new Date().toISOString() },
  { id: 'cat-9', user_id: null, name: 'Salary & Allowance', icon: 'wallet', color: '#22c55e', type: 'income', is_default: true, created_at: new Date().toISOString() },
  { id: 'cat-10', user_id: null, name: 'Account Transfer', icon: 'arrow-left-right', color: '#64748b', type: 'both', is_default: true, created_at: new Date().toISOString() },
];

export function getLocalDatabase(): LocalDatabase {
  if (typeof window === 'undefined') {
    return {
      profile: DEFAULT_PROFILE,
      accounts: DEFAULT_ACCOUNTS,
      categories: DEFAULT_CATEGORIES,
      transactions: [],
    };
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial: LocalDatabase = {
      profile: DEFAULT_PROFILE,
      accounts: DEFAULT_ACCOUNTS,
      categories: DEFAULT_CATEGORIES,
      transactions: [],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return {
      profile: DEFAULT_PROFILE,
      accounts: DEFAULT_ACCOUNTS,
      categories: DEFAULT_CATEGORIES,
      transactions: [],
    };
  }
}

export function saveLocalDatabase(db: LocalDatabase): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function updateAccountDirectBalance(accountId: string, newBalance: number): Account[] {
  const db = getLocalDatabase();
  const accIndex = db.accounts.findIndex((a) => a.id === accountId);
  if (accIndex !== -1) {
    db.accounts[accIndex].balance = parseFloat(newBalance.toFixed(2));
    db.accounts[accIndex].updated_at = new Date().toISOString();
    saveLocalDatabase(db);
  }
  return db.accounts;
}
