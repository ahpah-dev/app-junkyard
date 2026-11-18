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

export function replay(openA, openB, fee, rows) {
  let a = units(openA, places, 'Opening A reserve');
  let b = units(openB, places, 'Opening B reserve');
  check(a > 0n && b > 0n, 'Both reserves must be positive.');
  const feeBps = BigInt(number(fee, 'Fee', 0, 9999, true));
  const trades = rows.map((row, index) => {
    check(row.side === 'A' || row.side === 'B', 'Trade ' + (index + 1) + ' needs side A or B.');
    const input = units(row.amount, places, 'Trade ' + (index + 1) + ' amount');
    check(input > 0n, 'Each input amount must be positive.');
    const [reserveIn, reserveOut] = row.side === 'A' ? [a, b] : [b, a];
    const adjusted = input * (10000n - feeBps);
    const output = (adjusted * reserveOut) / (reserveIn * 10000n + adjusted);
    check(output > 0n, 'Trade ' + (index + 1) + ' rounds to zero output. Increase its size.');
    const spotNumerator = input * reserveOut;
    const shortfall = ratio(100n * (spotNumerator - output * reserveIn), spotNumerator);
    if (row.side === 'A') {
      a += input;
      b -= output;
    } else {
      b += input;
      a -= output;
    }
    return {
      trade: index + 1,
      side: row.side,
      input: decimal(input, places),
      output: decimal(output, places),
      averagePrice: ratio(output, input),
      pretradePrice: ratio(reserveOut, reserveIn),
      shortfallPct: shortfall,
      reserveA: decimal(a, places),
      reserveB: decimal(b, places),
    };
  });
  return {
    openA,
    openB,
    feeBps: Number(feeBps),
    trades,
    closeA: decimal(a, places),
    closeB: decimal(b, places),
  };
}
