-- ==========================================
-- HOLDINGS MIGRATION
-- Manually entered broker positions (e.g. Scalable Capital depot).
-- Priced live via /api/quotes; does NOT affect the cash `balance`
-- computed by recalculate_account_balance.
-- ==========================================

CREATE TABLE IF NOT EXISTS public.holdings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL CHECK (length(symbol) BETWEEN 1 AND 20), -- ticker (e.g. VWCE.DE) or ISIN
  quantity NUMERIC(18, 6) NOT NULL CHECK (quantity > 0),
  avg_buy_price_eur NUMERIC(14, 4) NOT NULL CHECK (avg_buy_price_eur >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS holdings_account_id_idx ON public.holdings(account_id);
CREATE INDEX IF NOT EXISTS holdings_user_id_idx ON public.holdings(user_id);

-- RLS
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own holdings" ON public.holdings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own holdings" ON public.holdings
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = account_id AND a.user_id = auth.uid())
  );

CREATE POLICY "Users can update their own holdings" ON public.holdings
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = account_id AND a.user_id = auth.uid())
  );

CREATE POLICY "Users can delete their own holdings" ON public.holdings
  FOR DELETE USING (auth.uid() = user_id);
