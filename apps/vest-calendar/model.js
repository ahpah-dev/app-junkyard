import { check, decimal, number, requiredText, units, utcDay } from '../../shared/lab.js';

function vested(grant, day) {
  if (day < grant.cliff || day <= grant.start) return 0n;
  if (day >= grant.end) return grant.amount;
  return (grant.amount * BigInt(day - grant.start)) / BigInt(grant.end - grant.start);
}

export function schedule(rows, asOf, precision) {
  const places = number(precision, 'Token decimals', 0, 18, true);
  const day = utcDay(asOf, 'Report date');
  check(Number(asOf.slice(0, 4)) < 9998, 'Choose a report date before the year 9998.');
  const seen = new Set();
  const grants = rows.map((row, index) => {
    const id = requiredText(row, 'id', index);
    check(!seen.has(id), 'Duplicate grant ID: ' + id);
    seen.add(id);
    const beneficiary = requiredText(row, 'beneficiary', index);
    const start = utcDay(row.start, id + ' start');
    const cliff = utcDay(row.cliff, id + ' cliff');
    const end = utcDay(row.end, id + ' end');
    check(
      start < end && start <= cliff && cliff <= end,
      'Grant ' + id + ' requires start ≤ cliff ≤ end and start < end.',
    );
    const amount = units(row.amount, places, id + ' amount');
    check(amount > 0n, id + ' amount must be positive.');
    return { id, beneficiary, start, cliff, end, amount };
  });
  const total = grants.reduce((sum, g) => sum + g.amount, 0n);
  const balance = (at) => grants.reduce((sum, g) => sum + vested(g, at), 0n);
  const today = balance(day);
  const display = (n) => decimal(n, places);
  const details = grants.map((g) => {
    const unlocked = vested(g, day);
    return {
      id: g.id,
      beneficiary: g.beneficiary,
      granted: display(g.amount),
      vested: display(unlocked),
      locked: display(g.amount - unlocked),
    };
  });
  const source = new Date(day * 86400000);
  const forecast = [];
  let prior = today;
  for (let offset = 1; forecast.length < 12; offset++) {
    const date = new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + offset, 0));
    const monthEnd = date.getTime() / 86400000;
    if (monthEnd <= day) continue;
    const next = balance(monthEnd);
    forecast.push({
      date: date.toISOString().slice(0, 10),
      released: display(next - prior),
      cumulative: display(next),
    });
    prior = next;
  }
  return {
    asOf,
    decimals: places,
    total: display(total),
    vested: display(today),
    locked: display(total - today),
    grants: details,
    forecast,
  };
}
