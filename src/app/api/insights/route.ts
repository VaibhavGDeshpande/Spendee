import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface TransactionSummary {
  merchant: string | null;
  amount_in_eur: number;
  category: string;
  transaction_date: string;
  items: { item_name: string; total_price: number }[];
}

interface InsightsReport {
  executive_summary: string;
  total_analyzed: number;
  total_spent_eur: number;
  current_month_spent_eur: number;
  top_categories: {
    name: string;
    total_eur: number;
    transaction_count: number;
    percentage: number;
    avg_per_transaction: number;
  }[];
  top_merchants: { name: string; total_eur: number; visit_count: number; avg_per_visit: number }[];
  grocery_items: {
    item_name: string;
    total_spent_eur: number;
    purchase_count: number;
    avg_price_eur: number;
    last_seen: string;
  }[];
  monthly_trend: { month: string; total_eur: number; transaction_count: number }[];
  insights: { type: 'tip' | 'warning' | 'achievement'; title: string; description: string; potential_saving_eur: number }[];
  biggest_expense: { merchant: string; amount_eur: number; date: string; category: string } | null;
  most_frequent_purchase: { item_or_merchant: string; count: number; total_eur: number } | null;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function buildReport(transactions: TransactionSummary[]): InsightsReport {
  const totalSpent = transactions.reduce((sum, transaction) => sum + transaction.amount_in_eur, 0);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthSpent = transactions
    .filter((transaction) => transaction.transaction_date.slice(0, 7) === currentMonth)
    .reduce((sum, transaction) => sum + transaction.amount_in_eur, 0);

  const categories = new Map<string, { total: number; count: number }>();
  const currentMonthCategories = new Map<string, number>();
  const merchants = new Map<string, { total: number; count: number }>();
  const groceries = new Map<string, { total: number; count: number; lastSeen: string }>();
  const months = new Map<string, { total: number; count: number }>();

  for (const transaction of transactions) {
    const category = categories.get(transaction.category) ?? { total: 0, count: 0 };
    category.total += transaction.amount_in_eur;
    category.count += 1;
    categories.set(transaction.category, category);
    if (transaction.transaction_date.slice(0, 7) === currentMonth) {
      currentMonthCategories.set(
        transaction.category,
        (currentMonthCategories.get(transaction.category) ?? 0) + transaction.amount_in_eur,
      );
    }

    const merchantName = transaction.merchant?.trim() || 'Unknown merchant';
    const merchant = merchants.get(merchantName) ?? { total: 0, count: 0 };
    merchant.total += transaction.amount_in_eur;
    merchant.count += 1;
    merchants.set(merchantName, merchant);

    const monthKey = transaction.transaction_date.slice(0, 7);
    const month = months.get(monthKey) ?? { total: 0, count: 0 };
    month.total += transaction.amount_in_eur;
    month.count += 1;
    months.set(monthKey, month);

    for (const item of transaction.items) {
      const itemName = item.item_name.trim();
      if (!itemName) continue;
      const key = itemName.toLocaleLowerCase();
      const grocery = groceries.get(key) ?? { total: 0, count: 0, lastSeen: transaction.transaction_date };
      grocery.total += item.total_price;
      grocery.count += 1;
      if (transaction.transaction_date > grocery.lastSeen) grocery.lastSeen = transaction.transaction_date;
      groceries.set(key, grocery);
    }
  }

  const topCategories = [...categories.entries()]
    .map(([name, data]) => ({
      name,
      total_eur: roundCurrency(data.total),
      transaction_count: data.count,
      percentage: totalSpent > 0 ? roundCurrency((data.total / totalSpent) * 100) : 0,
      avg_per_transaction: roundCurrency(data.total / data.count),
    }))
    .sort((a, b) => b.total_eur - a.total_eur)
    .slice(0, 8);
  const topMerchants = [...merchants.entries()]
    .map(([name, data]) => ({
      name,
      total_eur: roundCurrency(data.total),
      visit_count: data.count,
      avg_per_visit: roundCurrency(data.total / data.count),
    }))
    .sort((a, b) => b.total_eur - a.total_eur)
    .slice(0, 10);
  const groceryItems = [...groceries.entries()]
    .map(([key, data]) => ({
      item_name: key,
      total_spent_eur: roundCurrency(data.total),
      purchase_count: data.count,
      avg_price_eur: roundCurrency(data.total / data.count),
      last_seen: data.lastSeen,
    }))
    .sort((a, b) => b.total_spent_eur - a.total_spent_eur)
    .slice(0, 20);
  const monthlyTrend = [...months.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, data]) => ({
      month,
      total_eur: roundCurrency(data.total),
      transaction_count: data.count,
    }));

  const biggestTransaction = transactions.reduce<TransactionSummary | null>(
    (biggest, transaction) => !biggest || transaction.amount_in_eur > biggest.amount_in_eur ? transaction : biggest,
    null,
  );
  const mostFrequentItem = [...groceries.entries()].sort((a, b) => b[1].count - a[1].count)[0];
  const mostFrequentMerchant = [...merchants.entries()].sort((a, b) => b[1].count - a[1].count)[0];
  const useItem = mostFrequentItem && (!mostFrequentMerchant || mostFrequentItem[1].count >= mostFrequentMerchant[1].count);
  const insights: InsightsReport['insights'] = [];

  if (topCategories[0]) {
    const category = topCategories[0];
    const spentThisMonth = currentMonthCategories.get(category.name) ?? 0;
    const targetSaving = roundCurrency(spentThisMonth * 0.1);
    insights.push({
      type: 'tip',
      title: `Set a limit for ${category.name}`,
      description: spentThisMonth > 0
        ? `This is your largest recorded category. You have spent €${spentThisMonth.toFixed(2)} on it this month; aiming for 10% less next month would free about €${targetSaving.toFixed(2)}.`
        : `${category.name} is your largest recorded category at €${category.total_eur.toFixed(2)}. Setting a monthly limit and reviewing repeat expenses can help reduce it.`,
      potential_saving_eur: targetSaving,
    });
  }

  if (monthlyTrend.length >= 2) {
    const latestMonth = monthlyTrend[monthlyTrend.length - 1];
    const previousMonth = monthlyTrend[monthlyTrend.length - 2];
    if (latestMonth.month === currentMonth && latestMonth.total_eur > previousMonth.total_eur) {
      const difference = roundCurrency(latestMonth.total_eur - previousMonth.total_eur);
      insights.push({
        type: 'tip',
        title: 'Keep this month within last month’s total',
        description: `You have already spent €${difference.toFixed(2)} more than last month’s total. The current month is still in progress, so check your remaining planned expenses.`,
        potential_saving_eur: 0,
      });
    }
  }

  if (mostFrequentItem && mostFrequentItem[1].count >= 2) {
    const [itemName, itemData] = mostFrequentItem;
    insights.push({
      type: 'tip',
      title: `Compare prices for ${itemName}`,
      description: `Receipt data shows ${itemName} purchased ${itemData.count} times, averaging €${(itemData.total / itemData.count).toFixed(2)} each. Compare unit prices or try a lower-cost equivalent.`,
      potential_saving_eur: 0,
    });
  }

  if (mostFrequentMerchant && mostFrequentMerchant[1].count >= 3) {
    const [merchantName, merchantData] = mostFrequentMerchant;
    if (insights.length < 4) {
      insights.push({
        type: 'tip',
        title: `Plan visits to ${merchantName}`,
        description: `You recorded ${merchantData.count} visits averaging €${(merchantData.total / merchantData.count).toFixed(2)} each. Planning a list before visiting may help avoid unplanned purchases.`,
        potential_saving_eur: 0,
      });
    }
  }

  return {
    executive_summary: `You have recorded ${transactions.length} expenses totaling €${roundCurrency(totalSpent).toFixed(2)}. This month so far: €${roundCurrency(currentMonthSpent).toFixed(2)}.`,
    total_analyzed: transactions.length,
    total_spent_eur: roundCurrency(totalSpent),
    current_month_spent_eur: roundCurrency(currentMonthSpent),
    top_categories: topCategories,
    top_merchants: topMerchants,
    grocery_items: groceryItems,
    monthly_trend: monthlyTrend,
    insights: insights.slice(0, 4),
    biggest_expense: biggestTransaction ? {
      merchant: biggestTransaction.merchant?.trim() || 'Unknown merchant',
      amount_eur: roundCurrency(biggestTransaction.amount_in_eur),
      date: biggestTransaction.transaction_date,
      category: biggestTransaction.category,
    } : null,
    most_frequent_purchase: useItem ? {
      item_or_merchant: mostFrequentItem[0],
      count: mostFrequentItem[1].count,
      total_eur: roundCurrency(mostFrequentItem[1].total),
    } : mostFrequentMerchant ? {
      item_or_merchant: mostFrequentMerchant[0],
      count: mostFrequentMerchant[1].count,
      total_eur: roundCurrency(mostFrequentMerchant[1].total),
    } : null,
  };
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transactions: any[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          amount_in_eur,
          transaction_date,
          merchant,
          category:categories!transactions_category_id_fkey(name),
          items:transaction_items(item_name, total_price)
        `)
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .order('transaction_date', { ascending: false })
        .range(offset, offset + 999);

      if (error) {
        console.error('Insights transaction query failed:', error);
        return NextResponse.json({ error: 'Could not load transactions for analysis' }, { status: 500 });
      }
      if (!data?.length) break;
      transactions.push(...data);
      if (data.length < 1000) break;
    }

    if (transactions.length === 0) {
      return NextResponse.json({
        report: null,
        message: 'No expense transactions found to analyze.',
      });
    }

    const summaries: TransactionSummary[] = transactions.map((t) => ({
      merchant: t.merchant,
      amount_in_eur: Number(t.amount_in_eur) || 0,
      category: t.category?.name || 'Other',
      transaction_date: t.transaction_date,
      items: t.items?.map((item: any) => ({
        item_name: item.item_name,
        total_price: Number(item.total_price) || 0,
      })) ?? [],
    }));

    const report = buildReport(summaries);
    return NextResponse.json({
      report,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Insights API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
