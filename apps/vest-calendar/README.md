# Vest Calendar

Audit token grants at a selected date and forecast twelve month-end balances across beneficiaries.

## Using the app

Each JSONL grant takes `id`, `beneficiary`, `amount`, `start`, `cliff` and `end`. Use quoted decimal amounts and ISO dates. Select the date to audit and token decimal precision, then review grant-level balances and month-end releases.

## Model and limits

All dates use midnight UTC. Nothing vests before the cliff. On the cliff, elapsed accrual since the start becomes available. Intermediate days round down to the smallest unit. End dates release the exact remainder. The first forecast interval starts at the selected date; if it is already month-end the forecast starts the following month.

## Forking it

Connect the forecast to compensation reporting or add an approval workflow for new grants. This starter models gross vesting and has no claim or transfer mechanism.

The calculation lives in `model.js`. The UI and sample inputs live in `app.js`. See the [collection guide](../../README.md) for running the gallery or exporting this app.
