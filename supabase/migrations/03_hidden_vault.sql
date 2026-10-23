-- ==========================================
-- HIDDEN VAULT MIGRATION
-- Stores private/hidden transactions that
-- are NOT reflected in main account balances
-- but shown on the separate /vault page.
-- ==========================================

CREATE TABLE IF NOT EXISTS public.hidden_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('expense', 'income')),
  amount_in_eur NUMERIC(12, 2) NOT NULL CHECK (amount_in_eur >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  exchange_rate_used NUMERIC(10, 6) DEFAULT 1.000000,
  merchant TEXT,
  category TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.hidden_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own hidden transactions" ON public.hidden_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own hidden transactions" ON public.hidden_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own hidden transactions" ON public.hidden_transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own hidden transactions" ON public.hidden_transactions
  FOR DELETE USING (auth.uid() = user_id);
