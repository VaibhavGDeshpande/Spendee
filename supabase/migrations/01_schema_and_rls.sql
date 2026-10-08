-- ==========================================
-- SPENDEE DATABASE SCHEMA MIGRATION
-- Multi-currency Personal Expense Manager
-- ==========================================

-- 1. EXTENSIONS & SETUP
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  blocked_allowance_eur NUMERIC(10, 2) NOT NULL DEFAULT 992.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  icon TEXT DEFAULT 'wallet',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL for default system categories
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'tag',
  color TEXT NOT NULL DEFAULT '#6366f1',
  type VARCHAR(10) NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'income', 'both')),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  amount_in_eur NUMERIC(12, 2) NOT NULL CHECK (amount_in_eur >= 0),
  exchange_rate_used NUMERIC(10, 6) DEFAULT 1.000000,
  merchant TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  image_url TEXT,
  transfer_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  transfer_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TRANSACTION LINE ITEMS TABLE (FOR OCR RECEIPT PARSING)
CREATE TABLE IF NOT EXISTS public.transaction_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  unit_price NUMERIC(10, 2),
  quantity INT DEFAULT 1,
  total_price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. EXCHANGE RATES CACHE TABLE
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  base_currency VARCHAR(3) NOT NULL,
  target_currency VARCHAR(3) NOT NULL,
  rate NUMERIC(12, 6) NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (base_currency, target_currency)
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their profile on signup" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Accounts Policies
CREATE POLICY "Users can view their own accounts" ON public.accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own accounts" ON public.accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts" ON public.accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete non-system accounts" ON public.accounts
  FOR DELETE USING (auth.uid() = user_id AND is_system = FALSE);

-- Categories Policies
CREATE POLICY "Users can view system and their own categories" ON public.categories
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can insert custom categories" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update custom categories" ON public.categories
  FOR UPDATE USING (auth.uid() = user_id AND is_default = FALSE);

CREATE POLICY "Users can delete custom categories" ON public.categories
  FOR DELETE USING (auth.uid() = user_id AND is_default = FALSE);

-- Transactions Policies
CREATE POLICY "Users can view their own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" ON public.transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions" ON public.transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Transaction Line Items Policies
CREATE POLICY "Users can view line items for their transactions" ON public.transaction_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.transactions
      WHERE transactions.id = transaction_items.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage line items for their transactions" ON public.transaction_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.transactions
      WHERE transactions.id = transaction_items.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

-- Exchange Rates Policies (Publicly readable by logged in users)
CREATE POLICY "Authenticated users can read exchange rates" ON public.exchange_rates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role or authenticated users can update rates" ON public.exchange_rates
  FOR ALL USING (auth.role() = 'authenticated');

-- ==========================================
-- AUTOMATED TRIGGERS & PROCEDURES
-- ==========================================

-- Trigger: Automatically populate profile and 3 core accounts on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Insert Profile
  INSERT INTO public.profiles (id, email, blocked_allowance_eur)
  VALUES (NEW.id, NEW.email, 992.00);

  -- 2. Insert Core Accounts
  INSERT INTO public.accounts (user_id, name, currency, balance, is_system, icon)
  VALUES
    (NEW.id, 'Forex Account', 'EUR', 0.00, TRUE, 'credit-card'),
    (NEW.id, 'Cash', 'EUR', 0.00, TRUE, 'banknote'),
    (NEW.id, 'Blocked Account', 'EUR', 0.00, TRUE, 'landmark');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger Function: Real-time Account Balance Recalculation
CREATE OR REPLACE FUNCTION public.recalculate_account_balance()
RETURNS TRIGGER AS $$
DECLARE
  target_account_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_account_id := OLD.account_id;
  ELSE
    target_account_id := NEW.account_id;
  END IF;

  -- Recalculate balance for target account
  UPDATE public.accounts
  SET balance = COALESCE((
    SELECT SUM(
      CASE 
        WHEN type = 'income' THEN amount_in_eur
        WHEN type = 'expense' THEN -amount_in_eur
        WHEN type = 'transfer' AND account_id = target_account_id THEN -amount_in_eur
        ELSE 0
      END
    )
    FROM public.transactions
    WHERE account_id = target_account_id
  ), 0.00),
  updated_at = NOW()
  WHERE id = target_account_id;

  -- If old account was changed in UPDATE, recalculate old account balance as well
  IF TG_OP = 'UPDATE' AND OLD.account_id <> NEW.account_id THEN
    UPDATE public.accounts
    SET balance = COALESCE((
      SELECT SUM(
        CASE 
          WHEN type = 'income' THEN amount_in_eur
          WHEN type = 'expense' THEN -amount_in_eur
          WHEN type = 'transfer' AND account_id = OLD.account_id THEN -amount_in_eur
          ELSE 0
        END
      )
      FROM public.transactions
      WHERE account_id = OLD.account_id
    ), 0.00),
    updated_at = NOW()
    WHERE id = OLD.account_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind balance recalculation trigger
DROP TRIGGER IF EXISTS trigger_recalculate_account_balance ON public.transactions;
CREATE TRIGGER trigger_recalculate_account_balance
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_account_balance();

-- Initial Seed Data: Default Categories
INSERT INTO public.categories (name, icon, color, type, is_default) VALUES
  ('Groceries', 'shopping-cart', '#10b981', 'expense', TRUE),
  ('Rent & Housing', 'home', '#6366f1', 'expense', TRUE),
  ('Transport', 'bus', '#3b82f6', 'expense', TRUE),
  ('Eating Out', 'utensils', '#f59e0b', 'expense', TRUE),
  ('University & Fees', 'graduation-cap', '#8b5cf6', 'expense', TRUE),
  ('Health & Insurance', 'heart-pulse', '#ef4444', 'expense', TRUE),
  ('Travel', 'plane', '#06b6d4', 'expense', TRUE),
  ('Subscriptions', 'tv', '#ec4899', 'expense', TRUE),
  ('Salary & Allowance', 'wallet', '#22c55e', 'income', TRUE),
  ('Account Transfer', 'arrow-left-right', '#64748b', 'both', TRUE)
ON CONFLICT DO NOTHING;
