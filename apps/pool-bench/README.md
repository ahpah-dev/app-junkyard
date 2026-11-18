# Pool Bench

Replay a sequence of two-asset swaps against a constant-product liquidity pool and inspect execution prices.

## Using the app

Enter the opening reserves and fee in basis points. Enter trades in execution order as JSONL, with `side` equal to `A` or `B` (the asset entering the pool) and `amount` as a quoted decimal string. Run the sequence to inspect reserve and spot price charts, LP impermanent loss vs. HODL net return, slippage depth caps, and CSV/JSON exports.

## Model and limits

This two-asset simulation uses six decimal places for each asset, rounds output down to whole base units, and retains the full input in reserves. Prices and shortfall percentages are rounded to twelve significant digits. Execution shortfall includes fees, curve movement and rounding. Simulations run locally.

## Forking it

Use the pure replay function to compare alternative reserve depths or add a timeline of historical swaps from a read-only indexer.

The calculation lives in `model.js`. The UI and sample inputs live in `app.js`. See the [collection guide](../../README.md) for running the gallery or exporting this app.
