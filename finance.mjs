export const CATEGORIES = ['Cibo', 'Carburante', 'Bar', 'Alloggio', 'Pedaggi', 'Altro'];

export function categoryLabel(expense) {
  const category = CATEGORIES.includes(expense.category) ? expense.category : 'Altro';
  const detail = expense.category_detail?.trim();
  return category === 'Altro' && detail ? `Altro · ${detail}` : category;
}

export function euro(cents) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export function totalsByCategory(expenses) {
  const totals = new Map();
  for (const expense of expenses) {
    if (!expense.deleted_at) {
      const category = categoryLabel(expense);
      totals.set(category, (totals.get(category) || 0) + expense.amount_cents);
    }
  }
  const overall = [...totals.values()].reduce((sum, cents) => sum + cents, 0);
  return { overall, rows: [...totals.entries()].filter(([, cents]) => cents > 0)
    .map(([category, cents]) => ({ category, cents, percentage: overall ? cents * 100 / overall : 0 }))
    .sort((a, b) => b.cents - a.cents) };
}

export function balancesFor(members, expenses) {
  const balances = Object.fromEntries(members.map(member => [member.user_id, 0]));
  for (const expense of expenses) {
    if (expense.deleted_at || !expense.split_between.length) continue;
    const people = expense.split_between;
    const base = Math.floor(expense.amount_cents / people.length);
    const remainder = expense.amount_cents % people.length;
    people.forEach((id, index) => { if (id in balances) balances[id] -= base + (index < remainder ? 1 : 0); });
    if (expense.paid_by in balances) balances[expense.paid_by] += expense.amount_cents;
  }
  return balances;
}

export function expensesInPeriod(expenses, from, to, payer) {
  return expenses.filter(expense => !expense.deleted_at &&
    (!from || expense.spent_on >= from) && (!to || expense.spent_on <= to) &&
    (!payer || expense.paid_by === payer));
}
