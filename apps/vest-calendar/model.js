import { check, decimal, number, requiredText, units, utcDay } from '../../shared/lab.js';

function vested(grant, day) {
  if (day < grant.cliff || day <= grant.start) return 0n;
  if (day >= grant.end) return grant.amount;
  const elapsed = day - grant.start;
  const effectiveElapsed =
    grant.periodDays > 1 ? Math.floor(elapsed / grant.periodDays) * grant.periodDays : elapsed;
  return (grant.amount * BigInt(effectiveElapsed)) / BigInt(grant.end - grant.start);
}

export function capTableByBeneficiary(grants, precision = 6) {
  const places = number(precision, 'Token decimals', 0, 18, true);
  const groups = new Map();
  let totalGranted = 0n;
  for (const g of grants) {
    const beneficiary = String(g.beneficiary ?? '').trim();
    check(beneficiary.length > 0, 'Each grant needs a beneficiary.');
    const granted =
      typeof g.grantedUnits === 'bigint'
        ? g.grantedUnits
        : units(String(g.granted ?? g.amount ?? '0'), places, 'Granted amount');
    const unlocked =
      typeof g.vestedUnits === 'bigint'
        ? g.vestedUnits
        : units(String(g.vested ?? '0'), places, 'Vested amount');
    const locked = granted >= unlocked ? granted - unlocked : 0n;
    totalGranted += granted;
    const entry = groups.get(beneficiary) ?? {
      beneficiary,
      grantsCount: 0,
      granted: 0n,
      vested: 0n,
      locked: 0n,
    };
    entry.grantsCount++;
    entry.granted += granted;
    entry.vested += unlocked;
    entry.locked += locked;
    groups.set(beneficiary, entry);
  }
  return [...groups.values()]
    .sort((a, b) => (a.granted > b.granted ? -1 : a.granted < b.granted ? 1 : a.beneficiary.localeCompare(b.beneficiary)))
    .map((entry) => ({
      beneficiary: entry.beneficiary,
      grantsCount: entry.grantsCount,
      granted: decimal(entry.granted, places),
      vested: decimal(entry.vested, places),
      locked: decimal(entry.locked, places),
      sharePct: totalGranted > 0n ? Number((10000n * entry.granted) / totalGranted) / 100 : 0,
      vestedPct: entry.granted > 0n ? Number((10000n * entry.vested) / entry.granted) / 100 : 0,
    }));
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
    const periodDays =
      row.periodDays === undefined || row.periodDays === ''
        ? 1
        : number(row.periodDays, id + ' periodDays', 1, 3650, true);
    return { id, beneficiary, start, cliff, end, amount, periodDays };
  });
  const total = grants.reduce((sum, g) => sum + g.amount, 0n);
  const balance = (at) => grants.reduce((sum, g) => sum + vested(g, at), 0n);
  const today = balance(day);
  const display = (n) => decimal(n, places);
  const capInputs = [];
  const details = grants.map((g) => {
    const unlocked = vested(g, day);
    capInputs.push({ beneficiary: g.beneficiary, grantedUnits: g.amount, vestedUnits: unlocked });
    return {
      id: g.id,
      beneficiary: g.beneficiary,
      periodDays: g.periodDays,
      granted: display(g.amount),
      vested: display(unlocked),
      locked: display(g.amount - unlocked),
      progressPct: g.amount > 0n ? Number((10000n * unlocked) / g.amount) / 100 : 0,
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
    beneficiaries: capTableByBeneficiary(capInputs, places),
    forecast,
  };
}
