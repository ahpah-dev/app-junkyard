import test from 'node:test';
import assert from 'node:assert/strict';
import { capTableByBeneficiary, schedule } from './model.js';
const grant = {
  id: 'g',
  beneficiary: 'team',
  amount: '10',
  start: '2024-02-27',
  cliff: '2024-02-29',
  end: '2024-03-01',
};
test('leap-day cliff catches up, integer floor releases full remainder at end', () => {
  assert.equal(schedule([grant], '2024-02-28', 0).vested, '0');
  const r = schedule([grant], '2024-02-29', 0);
  assert.equal(r.vested, '6');
  assert.equal(r.forecast[0].date, '2024-03-31');
  assert.equal(r.forecast[0].released, '4');
  assert.equal(schedule([grant], '2024-03-01', 0).vested, '10');
});
test('keeps exact 18-decimal quantities and rejects impossible dates', () => {
  const amount = '999999999999999999.123456789012345678';
  assert.equal(schedule([{ ...grant, amount }], '2024-03-02', 18).vested, amount);
  assert.throws(() => schedule([grant], '2024-02-30', 6), /invalid calendar/);
});

test('supports periodic step vesting and aggregates beneficiary cap tables', () => {
  const stepGrant = {
    id: 'step-1',
    beneficiary: 'alice',
    amount: '100',
    start: '2026-01-01',
    cliff: '2026-01-01',
    end: '2026-04-11', // 100 days
    periodDays: 30,
  };
  // At 2026-02-15 (45 days elapsed), 30-day step floors to 30 days = 30 vested
  const r = schedule(
    [
      stepGrant,
      { ...stepGrant, id: 'step-2', amount: '100', periodDays: 1 },
      { ...stepGrant, id: 'bob-1', beneficiary: 'bob', amount: '200', periodDays: 1 },
    ],
    '2026-02-15',
    0,
  );
  assert.equal(r.grants[0].vested, '30');
  assert.equal(r.grants[1].vested, '45');
  assert.equal(r.beneficiaries.length, 2);
  const alice = r.beneficiaries.find((b) => b.beneficiary === 'alice');
  assert.equal(alice.grantsCount, 2);
  assert.equal(alice.granted, '200');
  assert.equal(alice.vested, '75');
  assert.equal(alice.sharePct, 50);

  const direct = capTableByBeneficiary(r.grants, 0);
  assert.equal(direct.length, 2);
});
