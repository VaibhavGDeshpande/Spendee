import { Database } from './database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Account = Database['public']['Tables']['accounts']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Transaction = Database['public']['Tables']['transactions']['Row'];
export type TransactionItem = Database['public']['Tables']['transaction_items']['Row'];
export type ExchangeRate = Database['public']['Tables']['exchange_rates']['Row'];

export type TransactionType = 'expense' | 'income' | 'transfer';
export type CurrencyCode = 'EUR' | 'INR' | string;

export interface TransactionWithDetails extends Transaction {
  account?: Account;
  category?: Category | null;
  transfer_account?: Account | null;
  items?: TransactionItem[];
}

export interface ScannedLineItem {
  item_name: string;
  unit_price?: number;
  quantity: number;
  total_price: number;
}

export interface CreateTransactionParams {
  account_id: string;
  category_id?: string | null;
  type: 'expense' | 'income' | 'transfer';
  amount: number;
  currency: string;
  amount_in_eur: number;
  exchange_rate_used?: number;
  merchant?: string;
  transaction_date: string;
  notes?: string;
  image_url?: string;
  transfer_account_id?: string;
  transfer_transaction_id?: string;
  line_items?: ScannedLineItem[];
}

export interface OCRResult {
  merchant: string | null;
  transaction_date: string | null;
  total_amount: number | null;
  currency: string;
  line_items: ScannedLineItem[];
  raw_text?: string;
  confidence?: number;
  image_data?: string;
}

export interface ExchangeRateResponse {
  rate: number;
  base: string;
  target: string;
  last_updated: string;
  from_cache: boolean;
}
