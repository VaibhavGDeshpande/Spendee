'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from 'recharts';
import { TransactionWithDetails } from '@/types';

interface ChartsWidgetProps {
  transactions: TransactionWithDetails[];
}

const eur = (n: number) =>
  `€${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Read the date from the string so a timezone can never move a transaction to the next day.
const parseDay = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return { y, m, d };
};

function DayTip({ active, payload }: { active?: boolean; payload?: { payload: { label: string; amount: number } }[] }) {
  if (!active || !payload?.length) return null;
  const { label, amount } = payload[0].payload;
  return (
    <div className="hm-tip">
      <strong className="hm-num">{eur(amount)}</strong>
      {label}
    </div>
  );
}

export default function ChartsWidget({ transactions }: ChartsWidgetProps) {
  const r = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const today = now.getDate();
    const prev = new Date(y, m - 2, 1);
    const monthName = now.toLocaleDateString('en-GB', { month: 'long' });
    const prevName = prev.toLocaleDateString('en-GB', { month: 'long' });

    const daysInMonth = new Date(y, m, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      amount: 0,
      label: new Date(y, m - 1, i + 1).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
    }));

    const cats = new Map<string, { amount: number; color: string | null }>();
    const merchants = new Map<string, { name: string; amount: number; visits: number }>();
    let total = 0;
    let count = 0;
    let prevSameDays = 0;

    for (const t of transactions) {
      if (t.type !== 'expense') continue;
      const { y: ty, m: tm, d: td } = parseDay(t.transaction_date);
      if (ty === prev.getFullYear() && tm === prev.getMonth() + 1 && td <= today) prevSameDays += t.amount_in_eur;
      if (ty !== y || tm !== m) continue;

      total += t.amount_in_eur;
      count += 1;
      days[td - 1].amount += t.amount_in_eur;

      const cat = t.category?.name || 'Other';
      const c = cats.get(cat) ?? { amount: 0, color: t.category?.color ?? null };
      c.amount += t.amount_in_eur;
      cats.set(cat, c);

      const mName = t.merchant?.trim() || 'No merchant';
      const key = mName.toLowerCase();
      const mm = merchants.get(key) ?? { name: mName, amount: 0, visits: 0 };
      mm.amount += t.amount_in_eur;
      mm.visits += 1;
      merchants.set(key, mm);
    }

    const peak = days.reduce((best, d) => (d.amount > best.amount ? d : best), days[0]);
    return {
      monthName,
      prevName,
      today,
      daysInMonth,
      days,
      total,
      count,
      prevSameDays,
      average: total / today,
      peak: peak.amount > 0 ? peak : null,
      categories: [...cats.entries()]
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.amount - a.amount),
      merchants: [...merchants.values()].sort((a, b) => b.amount - a.amount).slice(0, 6),
    };
  }, [transactions]);

  const delta = r.total - r.prevSameDays;
  const note =
    r.total === 0
      ? `Nothing spent yet in ${r.monthName}.`
      : r.prevSameDays === 0
        ? `No spending recorded in ${r.prevName} to compare with.`
        : Math.abs(delta) < 0.005
          ? `The same as the first ${r.today} days of ${r.prevName}.`
          : `${eur(Math.abs(delta))} ${delta > 0 ? 'more' : 'less'} than the first ${r.today} days of ${r.prevName}.`;

  const chartLabel = r.peak
    ? `Daily spending in ${r.monthName}. The highest day was ${r.peak.label}, ${eur(r.peak.amount)}.`
    : `Daily spending in ${r.monthName}. Nothing spent yet.`;
  const ticks = [1, 5, 10, 15, 20, 25, r.daysInMonth].filter((d, i, a) => a.indexOf(d) === i && d <= r.daysInMonth);

  return (
    <>
      <section className="hm-summary" aria-label={`Spending in ${r.monthName}`}>
        <div>
          <p className="hm-figure-label">Spent in {r.monthName}</p>
          <p className="hm-figure">{eur(r.total)}</p>
          <p className="hm-figure-note">{note}</p>
        </div>
        <dl className="hm-stats">
          <div>
            <dt>Daily average</dt>
            <dd className="hm-num">{eur(r.average)}</dd>
          </div>
          <div>
            <dt>Highest day</dt>
            <dd className="hm-num">{r.peak ? `${eur(r.peak.amount)} on ${r.peak.day} ${r.monthName.slice(0, 3)}` : 'None yet'}</dd>
          </div>
          <div>
            <dt>Expenses recorded</dt>
            <dd className="hm-num">{r.count}</dd>
          </div>
        </dl>
      </section>

      <section className="hm-section">
        <h2>Spending by day</h2>
        <div className="hm-chart" role="img" aria-label={chartLabel}>
          <BarChart responsive style={{ width: '100%', height: '100%' }} data={r.days} margin={{ top: 8, right: 0, left: 0, bottom: 0 }} barCategoryGap={2}>
              <CartesianGrid vertical={false} stroke="var(--color-rule)" />
              <XAxis
                dataKey="day"
                ticks={ticks}
                interval={0}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--color-muted)', fontSize: 12 }}
              />
              <YAxis
                width={48}
                tickCount={4}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--color-muted)', fontSize: 12 }}
                tickFormatter={(v: number) => `€${v}`}
              />
              <Tooltip content={<DayTip />} cursor={{ fill: 'var(--color-paper-2)' }} />
              <Bar dataKey="amount" radius={[2, 2, 0, 0]} maxBarSize={16} isAnimationActive={false}>
                {r.days.map((d) => (
                  <Cell key={d.day} fill={r.peak?.day === d.day ? 'var(--color-accent-2)' : 'var(--color-muted)'} />
                ))}
              </Bar>
          </BarChart>
        </div>
        <p className="hm-caption">
          {r.peak ? `The highest day, ${r.peak.label}, is marked.` : 'Days fill in as you record expenses.'}
        </p>
      </section>

      {r.total > 0 && (
        <div className="hm-split">
          <section className="hm-section" aria-labelledby="hm-cats">
            <h2 id="hm-cats">Categories</h2>
            <table className="hm-table">
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col" className="hm-r">Spent</th>
                  <th scope="col" className="hm-r">Share</th>
                </tr>
              </thead>
              <tbody>
                {r.categories.map((c) => {
                  const pct = (c.amount / r.total) * 100;
                  return (
                    <tr key={c.name}>
                      <td>
                        <span className="hm-name">
                          <span className="hm-swatch" style={{ background: c.color ?? 'var(--color-muted)' }} aria-hidden="true" />
                          <span>{c.name}</span>
                        </span>
                      </td>
                      <td className="hm-r hm-num">{eur(c.amount)}</td>
                      <td className="hm-r">
                        <span className="hm-share">
                          <span className="hm-track" aria-hidden="true">
                            <span className="hm-fill" style={{ width: `${pct}%` }} />
                          </span>
                          <span className="hm-num">{pct.toFixed(0)}%</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section className="hm-section" aria-labelledby="hm-merchants">
            <h2 id="hm-merchants">Merchants</h2>
            <table className="hm-table">
              <thead>
                <tr>
                  <th scope="col">Merchant</th>
                  <th scope="col" className="hm-r">Visits</th>
                  <th scope="col" className="hm-r">Spent</th>
                </tr>
              </thead>
              <tbody>
                {r.merchants.map((mm) => (
                  <tr key={mm.name}>
                    <td><span className="hm-name"><span>{mm.name}</span></span></td>
                    <td className="hm-r hm-num">{mm.visits}</td>
                    <td className="hm-r hm-num">{eur(mm.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </>
  );
}
