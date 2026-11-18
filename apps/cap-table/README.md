# Cap Table

Model founder common stock, employee option pools, preferred equity with liquidation preferences, and SAFE note conversions with exit waterfall payouts.

## Using the app

Add stakeholders across `Common`, `Option Pool`, `Preferred`, and `SAFE` classes. Enter shares, invested capital, SAFE valuation caps/discounts, and preferred liquidation multiples. The overview computes post-conversion ownership percentages and simulates payouts at a \$25M exit. Export CSV or JSON snapshots anytime.

## Data and calculations

SAFEs convert at the lower of the valuation-cap price (cap divided by pre-SAFE shares) or discounted round price. Preferred liquidation waterfalls compare each investor's preference claim against pro-rata common conversion and award the higher return.

## Build on it

Connect round pricing scenarios and 409A strike-price tracking to build an equity management portal.

See the [collection guide](../../README.md) for running the gallery or exporting this app.
