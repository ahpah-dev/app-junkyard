import { check, decimal, number, units } from '../../shared/lab.js';

const places = 6;
function ratio(numerator, denominator) {
  if (numerator === 0n) return '0';
  let exponent = numerator.toString().length - denominator.toString().length;
  const belowPower =
    exponent >= 0
      ? numerator < denominator * 10n ** BigInt(exponent)
      : numerator * 10n ** BigInt(-exponent) < denominator;
  if (belowPower) exponent--;
  const digitsAfterPoint = 11 - exponent;
  const scaledNumerator = numerator * 10n ** BigInt(Math.max(0, digitsAfterPoint));
  const scaledDenominator = denominator * 10n ** BigInt(Math.max(0, -digitsAfterPoint));
  const rounded = (scaledNumerator + scaledDenominator / 2n) / scaledDenominator;
  return digitsAfterPoint >= 0
    ? decimal(rounded, digitsAfterPoint)
    : rounded.toString() + '0'.repeat(-digitsAfterPoint);
}

export function impermanentLoss(openA, openB, closeA, closeB) {
  const a0 = Number(openA),
    b0 = Number(openB),
    a1 = Number(closeA),
    b1 = Number(closeB);
  check([a0, b0, a1, b1].every((v) => Number.isFinite(v) && v > 0), 'Pool reserves must be positive numbers.');
  const openPrice = b0 / a0;
  const closePrice = b1 / a1;
  const priceRatio = closePrice / openPrice;
  const ilFactor = (2 * Math.sqrt(priceRatio)) / (1 + priceRatio) - 1;
  const hodlValueInB = a0 * closePrice + b0;
  const poolValueInB = a1 * closePrice + b1;
  const netVsHodlPct = ((poolValueInB - hodlValueInB) / hodlValueInB) * 100;
  return {
    priceRatio: Number(priceRatio.toFixed(6)),
    ilPct: Number((ilFactor * 100).toFixed(4)),
    hodlValueInB: Number(hodlValueInB.toFixed(4)),
    poolValueInB: Number(poolValueInB.toFixed(4)),
    netVsHodlPct: Number(netVsHodlPct.toFixed(4)),
  };
}

export function maxSwapForSlippage(reserveIn, reserveOut, feeBps, maxSlippagePct) {
  const rIn = units(String(reserveIn), places, 'Input reserve');
  const rOut = units(String(reserveOut), places, 'Output reserve');
  check(rIn > 0n && rOut > 0n, 'Reserves must be positive.');
  const fee = BigInt(number(feeBps, 'Fee', 0, 9999, true));
  const slip = number(maxSlippagePct, 'Max slippage %', 0.01, 99.99);
  const sNum = BigInt(Math.round(slip * 10000)); // out of 1,000,000
  const fNum = fee * 100n; // out of 1,000,000
  if (sNum <= fNum) {
    return { maxSlippagePct: slip, maxInput: '0', expectedOutput: '0' };
  }
  const dx = (rIn * (sNum - fNum) * 1000000n) / ((1000000n - sNum) * (1000000n - fNum));
  const adjusted = dx * (10000n - fee);
  const expectedOutput = dx > 0n ? (adjusted * rOut) / (rIn * 10000n + adjusted) : 0n;
  return {
    maxSlippagePct: slip,
    maxInput: decimal(dx, places),
    expectedOutput: decimal(expectedOutput, places),
  };
}

export function replay(openA, openB, fee, rows) {
  let a = units(openA, places, 'Opening A reserve');
  let b = units(openB, places, 'Opening B reserve');
  check(a > 0n && b > 0n, 'Both reserves must be positive.');
  const feeBps = BigInt(number(fee, 'Fee', 0, 9999, true));
  let totalFeesA = 0n;
  let totalFeesB = 0n;
  const trades = rows.map((row, index) => {
    check(row.side === 'A' || row.side === 'B', 'Trade ' + (index + 1) + ' needs side A or B.');
    const input = units(row.amount, places, 'Trade ' + (index + 1) + ' amount');
    check(input > 0n, 'Each input amount must be positive.');
    const [reserveIn, reserveOut] = row.side === 'A' ? [a, b] : [b, a];
    const feeAmount = (input * feeBps) / 10000n;
    const adjusted = input * (10000n - feeBps);
    const output = (adjusted * reserveOut) / (reserveIn * 10000n + adjusted);
    check(output > 0n, 'Trade ' + (index + 1) + ' rounds to zero output. Increase its size.');
    const spotNumerator = input * reserveOut;
    const shortfall = ratio(100n * (spotNumerator - output * reserveIn), spotNumerator);
    if (row.side === 'A') {
      a += input;
      b -= output;
      totalFeesA += feeAmount;
    } else {
      b += input;
      a -= output;
      totalFeesB += feeAmount;
    }
    return {
      trade: index + 1,
      side: row.side,
      input: decimal(input, places),
      output: decimal(output, places),
      feePaid: decimal(feeAmount, places),
      averagePrice: ratio(output, input),
      pretradePrice: ratio(reserveOut, reserveIn),
      shortfallPct: shortfall,
      reserveA: decimal(a, places),
      reserveB: decimal(b, places),
      spotBPerA: ratio(b, a),
    };
  });
  const closeA = decimal(a, places);
  const closeB = decimal(b, places);
  return {
    openA,
    openB,
    feeBps: Number(feeBps),
    trades,
    closeA,
    closeB,
    feesCollectedA: decimal(totalFeesA, places),
    feesCollectedB: decimal(totalFeesB, places),
    lpReport: impermanentLoss(openA, openB, closeA, closeB),
  };
}
