import test from 'node:test';
import assert from 'node:assert/strict';
import { schedule } from './model.js';
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
