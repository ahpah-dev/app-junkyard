# Orderbook Sim

Simulate a central limit order book (CLOB) with strict price-time FIFO matching, market sweeps, cancellations, and depth ladders.

## Using the app

Enter ordered JSONL events (`limit`, `market`, or `cancel`) with decimal string prices and amounts (up to 6 decimal places) and set the taker fee in basis points. Run **Simulate order book** to inspect executed fills, execution price history, VWAP, bid/ask spread, resting depth ladders, and CSV/JSON exports.

## Model and limits

Quantities and prices use exact 6-decimal `BigInt` integer math. Crossing limit orders execute at the resting maker's price in price-time priority; unfilled limit remainders rest on the book while market orders execute as immediate-or-cancel.

## Forking it

Use the matching engine to backtest market-maker quoting strategies, fee tiers, or slippage across synthetic order flows.

The calculation lives in `model.js`. The UI and sample inputs live in `app.js`. See the [collection guide](../../README.md) for running the gallery or exporting this app.
