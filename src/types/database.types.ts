export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          blocked_allowance_eur: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          blocked_allowance_eur?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          blocked_allowance_eur?: number
          created_at?: string
          updated_at?: string
        }
      }
      accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          currency: string
          balance: number
          is_system: boolean
          icon: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          currency?: string
          balance?: number
          is_system?: boolean
          icon?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          currency?: string
          balance?: number
          is_system?: boolean
          icon?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          user_id: string | null
          name: string
          icon: string
          color: string
          type: 'expense' | 'income' | 'both'
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          icon?: string
          color?: string
          type?: 'expense' | 'income' | 'both'
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          icon?: string
          color?: string
          type?: 'expense' | 'income' | 'both'
          is_default?: boolean
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          account_id: string
          category_id: string | null
          type: 'expense' | 'income' | 'transfer'
          amount: number
          currency: string
          amount_in_eur: number
          exchange_rate_used: number
          merchant: string | null
          transaction_date: string
          notes: string | null
          image_url: string | null
          transfer_account_id: string | null
          transfer_transaction_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          category_id?: string | null
          type: 'expense' | 'income' | 'transfer'
          amount: number
          currency?: string
          amount_in_eur: number
          exchange_rate_used?: number
          merchant?: string | null
          transaction_date?: string
          notes?: string | null
          image_url?: string | null
          transfer_account_id?: string | null
          transfer_transaction_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          category_id?: string | null
          type?: 'expense' | 'income' | 'transfer'
          amount?: number
          currency?: string
          amount_in_eur?: number
          exchange_rate_used?: number
          merchant?: string | null
          transaction_date?: string
          notes?: string | null
          image_url?: string | null
          transfer_account_id?: string | null
          transfer_transaction_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      transaction_items: {
        Row: {
          id: string
          transaction_id: string
          item_name: string
          unit_price: number | null
          quantity: number
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          transaction_id: string
          item_name: string
          unit_price?: number | null
          quantity?: number
          total_price: number
          created_at?: string
        }
        Update: {
          id?: string
          transaction_id?: string
          item_name?: string
          unit_price?: number | null
          quantity?: number
          total_price?: number
          created_at?: string
        }
      }
      exchange_rates: {
        Row: {
          base_currency: string
          target_currency: string
          rate: number
          fetched_at: string
        }
        Insert: {
          base_currency: string
          target_currency: string
          rate: number
          fetched_at?: string
        }
        Update: {
          base_currency?: string
          target_currency?: string
          rate?: number
          fetched_at?: string
        }
      }
    }
  }
}
