import test from 'node:test';
import assert from 'node:assert/strict';
import { balancesFor, expensesInPeriod, totalsByCategory } from '../finance.mjs';

test('category totals use euro cents and add to 100 percent', () => {
  const result = totalsByCategory([
    { category: 'Cibo', amount_cents: 12000 },
    { category: 'Carburante', amount_cents: 6000 },
    { category: 'Bar', amount_cents: 3000 },
    { category: 'Altro', amount_cents: 3000 },
    { category: 'Bar', amount_cents: 999, deleted_at: '2026-01-01' }
  ]);
  assert.equal(result.overall, 24000);
  assert.deepEqual(result.rows.map(row => row.percentage), [50, 25, 12.5, 12.5]);
});

test('splits odd cents exactly without losing a cent', () => {
  const members = ['a', 'b', 'c'].map(user_id => ({ user_id }));
  const balances = balancesFor(members, [{ amount_cents: 100, paid_by: 'a', split_between: ['a', 'b', 'c'] }]);
  assert.deepEqual(balances, { a: 66, b: -33, c: -33 });
  assert.equal(Object.values(balances).reduce((sum, value) => sum + value, 0), 0);
});

test('filters the selected period and payer, excluding deleted expenses', () => {
  const rows = [
    { spent_on: '2026-09-01', paid_by: 'a' },
    { spent_on: '2026-09-30', paid_by: 'b' },
    { spent_on: '2026-10-01', paid_by: 'a' },
    { spent_on: '2026-09-15', paid_by: 'a', deleted_at: '2026-09-16' }
  ];
  assert.equal(expensesInPeriod(rows, '2026-09-01', '2026-09-30', 'a').length, 1);
});
