import {
  mountWorkbench,
  comparison,
  money,
  cents,
  whole,
  uid,
  demand,
  requiredText,
  textField,
  decimalField,
  selectField,
} from '../../shared/business.js';

const classes = ['Common', 'Option Pool', 'Preferred', 'SAFE'];

export function computeOwnership(rows, nextRoundPriceCents = 200) {
  demand(Number.isFinite(nextRoundPriceCents) && nextRoundPriceCents > 0, 'Share price must be positive.');
  const baseShares = rows
    .filter((r) => r.securityClass !== 'SAFE')
    .reduce((n, r) => n + r.shares, 0);

  const holders = rows.map((r) => {
    let effectiveShares = r.shares;
    let conversionPriceCents = nextRoundPriceCents;
    if (r.securityClass === 'SAFE') {
      const capPrice =
        r.valCapCents > 0 && baseShares > 0
          ? Math.max(1, Math.round(r.valCapCents / baseShares))
          : nextRoundPriceCents;
      const discountPrice = Math.max(1, Math.round((nextRoundPriceCents * (100 - r.discountPct)) / 100));
      conversionPriceCents = Math.min(capPrice, discountPrice);
      effectiveShares = Math.round(r.investedCents / conversionPriceCents);
    }
    return { ...r, effectiveShares, conversionPriceCents };
  });

  const totalShares = holders.reduce((n, h) => n + h.effectiveShares, 0);
  const pricedHolders = holders.map((h) => ({
    ...h,
    ownershipPct: totalShares > 0 ? Number(((h.effectiveShares * 100) / totalShares).toFixed(2)) : 0,
  }));

  return { baseShares, totalShares, nextRoundPriceCents, holders: pricedHolders };
}

export function exitWaterfall(rows, exitCents, nextRoundPriceCents = 200) {
  demand(whole(exitCents), 'Exit valuation must be nonnegative.');
  const cap = computeOwnership(rows, nextRoundPriceCents);
  const { totalShares, holders } = cap;
  if (!totalShares || !exitCents) {
    return holders.map((h) => ({
      id: h.id,
      holder: h.holder,
      securityClass: h.securityClass,
      ownershipPct: h.ownershipPct,
      payoutCents: 0,
      multiple: 0,
    }));
  }

  // Determine whether Preferred holders convert to Common or claim 1x/Nx liquidation preference.
  const prefHolders = holders.filter((h) => h.securityClass === 'Preferred' && h.investedCents > 0);
  const nonPrefShares = holders
    .filter((h) => h.securityClass !== 'Preferred' || h.investedCents <= 0)
    .reduce((n, h) => n + h.effectiveShares, 0);

  // Check each preferred holder: convert if pro-rata share > preference claim.
  const convertingIds = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    const claimingClaim = prefHolders
      .filter((h) => !convertingIds.has(h.id))
      .reduce((n, h) => n + Math.round(h.investedCents * (h.liqMultiple || 1)), 0);
    const poolShares =
      nonPrefShares +
      prefHolders.filter((h) => convertingIds.has(h.id)).reduce((n, h) => n + h.effectiveShares, 0);
    for (const h of prefHolders) {
      if (convertingIds.has(h.id)) continue;
      const prefAmt = Math.round(h.investedCents * (h.liqMultiple || 1));
      const newPoolShares = poolShares + h.effectiveShares;
      const newRemaining = Math.max(0, exitCents - (claimingClaim - prefAmt));
      const asCommon = newPoolShares > 0 ? Math.round((newRemaining * h.effectiveShares) / newPoolShares) : 0;
      if (asCommon > prefAmt) {
        convertingIds.add(h.id);
        changed = true;
      }
    }
  }

  const finalClaimSum = prefHolders
    .filter((h) => !convertingIds.has(h.id))
    .reduce((n, h) => n + Math.round(h.investedCents * (h.liqMultiple || 1)), 0);
  const claimRatio = finalClaimSum > exitCents ? exitCents / finalClaimSum : 1;
  const residualForCommon = Math.max(0, exitCents - finalClaimSum);
  const residualShares =
    nonPrefShares +
    prefHolders.filter((h) => convertingIds.has(h.id)).reduce((n, h) => n + h.effectiveShares, 0);

  return holders.map((h) => {
    let payoutCents = 0;
    if (h.securityClass === 'Preferred' && h.investedCents > 0 && !convertingIds.has(h.id)) {
      payoutCents = Math.round(h.investedCents * (h.liqMultiple || 1) * claimRatio);
    } else if (residualShares > 0) {
      payoutCents = Math.round((residualForCommon * h.effectiveShares) / residualShares);
    }
    const multiple = h.investedCents > 0 ? Number((payoutCents / h.investedCents).toFixed(2)) : 0;
    return {
      id: h.id,
      holder: h.holder,
      securityClass: h.securityClass,
      ownershipPct: h.ownershipPct,
      payoutCents,
      multiple,
    };
  });
}

const blank = () => ({
  holder: '',
  securityClass: 'Common',
  shares: 100000,
  investedUsd: 0,
  valCapUsd: 0,
  discountPct: 20,
  liqMultiple: 1,
});

const seed = () => [
  {
    id: 'c1',
    holder: 'Founders (Common)',
    securityClass: 'Common',
    shares: 6500000,
    investedCents: 0,
    valCapCents: 0,
    discountPct: 0,
    liqMultiple: 1,
  },
  {
    id: 'c2',
    holder: 'Employee Option Pool',
    securityClass: 'Option Pool',
    shares: 1500000,
    investedCents: 0,
    valCapCents: 0,
    discountPct: 0,
    liqMultiple: 1,
  },
  {
    id: 'c3',
    holder: 'Seed Preferred',
    securityClass: 'Preferred',
    shares: 2000000,
    investedCents: 250000000,
    valCapCents: 0,
    discountPct: 0,
    liqMultiple: 1,
  },
  {
    id: 'c4',
    holder: 'Bridge SAFE Note',
    securityClass: 'SAFE',
    shares: 0,
    investedCents: 50000000,
    valCapCents: 1500000000,
    discountPct: 20,
    liqMultiple: 1,
  },
];

const config = {
  overview(rows, open) {
    const cap = computeOwnership(rows);
    const waterfall = exitWaterfall(rows, 2500000000); // $25M benchmark exit
    const wfMap = new Map(waterfall.map((w) => [w.id, w]));
    const maxPct = Math.max(1, ...cap.holders.map((h) => h.ownershipPct));
    return [
      comparison(
        'Fully diluted ownership & $25M exit waterfall',
        cap.holders.map((h) => {
          const w = wfMap.get(h.id);
          return {
            label: h.holder,
            note:
              h.securityClass +
              ' · ' +
              h.effectiveShares.toLocaleString('en-US') +
              ' shares · $25M payout: ' +
              money(w?.payoutCents ?? 0),
            value: h.ownershipPct.toFixed(2) + '%',
            fraction: h.ownershipPct / maxPct,
            color: h.securityClass === 'Preferred' ? '#946039' : h.securityClass === 'SAFE' ? '#776796' : '#38765b',
            run: () => open(rows.find((r) => r.id === h.id)),
          };
        }),
        'Add stakeholders to model equity ownership.',
      ),
    ];
  },
  id: 'cap-table',
  singular: 'stakeholder',
  plural: 'stakeholders',
  heading: 'Capitalization table',
  blank,
  seed,
  groups: classes,
  group: (r) => r.securityClass,
  title: (r) => r.holder,
  fields: [
    textField('holder', 'Stakeholder or pool'),
    selectField('securityClass', 'Security class', classes),
    decimalField('shares', 'Issued shares (0 for SAFEs)', { step: 1, min: 0, max: 1000000000 }),
    decimalField('investedUsd', 'Invested capital (USD)', { min: 0 }),
    decimalField('valCapUsd', 'SAFE valuation cap (USD)', { min: 0 }),
    decimalField('discountPct', 'SAFE discount (%)', { min: 0, max: 90 }),
    decimalField('liqMultiple', 'Preferred liquidation multiple (×)', { min: 1, max: 5, step: 0.5 }),
  ],
  form: (r) => ({
    holder: r.holder,
    securityClass: r.securityClass,
    shares: r.shares,
    investedUsd: r.investedCents / 100,
    valCapUsd: r.valCapCents / 100,
    discountPct: r.discountPct,
    liqMultiple: r.liqMultiple,
  }),
  record(v, old) {
    requiredText(v.holder, 'a stakeholder name');
    demand(classes.includes(v.securityClass), 'Select a valid security class.');
    const shares = Math.round(v.shares);
    const investedCents = cents(v.investedUsd);
    const valCapCents = cents(v.valCapUsd);
    demand(whole(shares) && whole(investedCents) && whole(valCapCents), 'Check shares and USD amounts.');
    if (v.securityClass === 'SAFE') {
      demand(investedCents > 0, 'A SAFE note needs a positive invested amount.');
    } else {
      demand(shares > 0, 'Equity classes need positive share counts.');
    }
    return {
      id: old?.id ?? uid(),
      holder: v.holder,
      securityClass: v.securityClass,
      shares,
      investedCents,
      valCapCents,
      discountPct: Number(v.discountPct) || 0,
      liqMultiple: Number(v.liqMultiple) || 1,
    };
  },
  metrics: (rows) => {
    const cap = computeOwnership(rows);
    const totalInvested = rows.reduce((n, r) => n + r.investedCents, 0);
    const founderPct = cap.holders
      .filter((h) => h.securityClass === 'Common')
      .reduce((n, h) => n + h.ownershipPct, 0);
    return [
      ['Fully diluted shares', cap.totalShares.toLocaleString('en-US')],
      ['Total capital raised', money(totalInvested)],
      ['Common ownership', founderPct.toFixed(1) + '%'],
      ['Post-money at $2/sh', money(cap.totalShares * 200)],
    ];
  },
  columns: ['Stakeholder', 'Class', 'Effective shares', 'Invested', 'Ownership'],
  values: (r) => {
    // When rendered row-by-row, compute exact individual share using fallback single/global note:
    return [
      r.holder,
      r.securityClass,
      r.securityClass === 'SAFE' ? 'Converts ($' + (r.valCapCents / 100).toLocaleString('en-US') + ' cap)' : r.shares.toLocaleString('en-US'),
      money(r.investedCents),
      r.securityClass === 'SAFE' ? 'SAFE' : r.shares.toLocaleString('en-US'),
    ];
  },
  detail: (r) => [
    'Class · ' + r.securityClass + ' · Invested ' + money(r.investedCents),
    ...(r.securityClass === 'SAFE'
      ? ['Valuation cap ' + money(r.valCapCents) + ' · Discount ' + r.discountPct + '%']
      : ['Issued shares ' + r.shares.toLocaleString('en-US')]),
    ...(r.securityClass === 'Preferred' ? ['Liquidation preference · ' + r.liqMultiple + '×'] : []),
  ],
  export: (rows) => {
    const cap = computeOwnership(rows);
    const wf = new Map(exitWaterfall(rows, 2500000000).map((w) => [w.id, w]));
    return [
      ['Stakeholder', 'Class', 'EffectiveShares', 'OwnershipPct', 'InvestedUSD', 'Exit25M_PayoutUSD'],
      ...cap.holders.map((h) => [
        h.holder,
        h.securityClass,
        h.effectiveShares,
        h.ownershipPct,
        h.investedCents / 100,
        (wf.get(h.id)?.payoutCents ?? 0) / 100,
      ]),
    ];
  },
};
export const mount = (root, context) => mountWorkbench(root, context, config);
