import test from 'node:test';
import assert from 'node:assert/strict';
import { impermanentLoss, maxSwapForSlippage, replay } from './model.js';
import { units } from '../../shared/lab.js';
test('constant-product replay retains fees, floors outputs and preserves reserves', () => {
  const r = replay('100', '100', 30, [
    { side: 'A', amount: '10' },
    { side: 'B', amount: '3' },
  ]);
  assert.equal(r.trades[0].output, '9.066108');
  let k = units('100', 6) ** 2n;
  for (const t of r.trades) {
    const next = units(t.reserveA, 6) * units(t.reserveB, 6);
    assert.ok(next >= k);
    k = next;
  }
});
test('no fee symmetric trade and minimum output validation', () => {
  const r = replay('10', '20', 0, [{ side: 'A', amount: '10' }]);
  assert.equal(r.trades[0].output, '10');
  assert.equal(r.trades[0].shortfallPct, '50');
  assert.throws(() => replay('100000', '1', 0, [{ side: 'A', amount: '0.000001' }]), /zero output/);
});

test('spot, fill, and percentage ratios retain twelve significant digits independently of token units', () => {
  const reserve = '1' + '0'.repeat(70);
  const [tiny] = replay(reserve, '1', 0, [{ side: 'A', amount: reserve }]).trades;
  assert.equal(tiny.pretradePrice, '0.' + '0'.repeat(69) + '1');
  assert.equal(tiny.averagePrice, '0.' + '0'.repeat(70) + '5');
  const [third] = replay('3', '1', 0, [{ side: 'A', amount: '3' }]).trades;
  assert.equal(third.pretradePrice, '0.333333333333');
  assert.equal(third.averagePrice, '0.166666666667');
  const [large] = replay('3', '99999999999999999999', 0, [{ side: 'A', amount: '3' }]).trades;
  assert.equal(large.pretradePrice, '33333333333300000000');
});

test('computes impermanent loss, LP vs HODL net return, and slippage depth caps', () => {
  const il = impermanentLoss('100', '100', '50', '200');
  assert.equal(il.priceRatio, 4);
  assert.ok(Math.abs(il.ilPct - -20) < 0.01);
  assert.equal(il.hodlValueInB, 500);
  assert.equal(il.poolValueInB, 400);

  const zeroFeeHalf = maxSwapForSlippage('1000', '1000', 0, 50);
  assert.equal(zeroFeeHalf.maxInput, '1000');
  assert.equal(zeroFeeHalf.expectedOutput, '500');

  const belowFee = maxSwapForSlippage('1000', '1000', 100, 0.5);
  assert.equal(belowFee.maxInput, '0');
});
