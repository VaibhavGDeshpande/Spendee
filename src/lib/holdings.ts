import { Holding } from '@/types';
import { createId } from './utils/id';
import {
  fetchSupabaseHoldings,
  insertSupabaseHolding,
  updateSupabaseHolding,
  deleteSupabaseHolding,
  HoldingParams,
} from './supabase/db';

export type { HoldingParams };

export async function getHoldings(): Promise<Holding[]> {
  return (await fetchSupabaseHoldings()) || [];
}

function validate(p: Omit<HoldingParams, 'account_id'>): string | null {
  if (!p.symbol.trim()) return 'Symbol or ISIN is required';
  if (!(p.quantity > 0)) return 'Quantity must be greater than 0';
  if (!(p.avg_buy_price_eur >= 0)) return 'Average buy price must be 0 or more';
  return null;
}

export async function createHolding(params: HoldingParams): Promise<{ success: boolean; error?: string }> {
  const clean = { ...params, symbol: params.symbol.trim().toUpperCase() };
  const error = validate(clean);
  if (error) return { success: false, error };
  const ok = await insertSupabaseHolding(clean, createId());
  return ok ? { success: true } : { success: false, error: 'Failed to save holding' };
}

export async function updateHolding(
  id: string,
  params: Omit<HoldingParams, 'account_id'>,
): Promise<{ success: boolean; error?: string }> {
  const clean = { ...params, symbol: params.symbol.trim().toUpperCase() };
  const error = validate(clean);
  if (error) return { success: false, error };
  const ok = await updateSupabaseHolding(id, clean);
  return ok ? { success: true } : { success: false, error: 'Failed to update holding' };
}

export async function deleteHolding(id: string): Promise<boolean> {
  return deleteSupabaseHolding(id);
}

export interface Quote {
  symbol: string;
  price_eur: number;
  name?: string;
}

/** Market value, cost basis and P/L (EUR). Holdings without a quote count toward cost only. */
export function valuePortfolio(holdings: Holding[], quotes: Record<string, Quote>) {
  let marketValue = 0;
  let costBasis = 0;
  let pricedCost = 0;
  for (const h of holdings) {
    const cost = h.quantity * h.avg_buy_price_eur;
    costBasis += cost;
    const q = quotes[h.symbol];
    if (q) {
      marketValue += h.quantity * q.price_eur;
      pricedCost += cost;
    }
  }
  const gain = marketValue - pricedCost;
  return { marketValue, costBasis, gain, gainPct: pricedCost > 0 ? (gain / pricedCost) * 100 : 0 };
}
