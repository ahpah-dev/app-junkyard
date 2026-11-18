# Treasury Ledger

Reconstruct wallet balances from a transfer journal and reconcile them against an independent snapshot.

## Using the app

Use Add an entry or import a JSONL journal. Every entry has `id`, `date`, `asset` and `amount`. A deposit sets `to`, a withdrawal sets `from`, and a transfer sets both. Supply a snapshot with `wallet`, `asset` and `amount` to compare expected balances at the selected date.

## Model and limits

Amounts use decimal strings with up to 18 fractional places. Entries are applied in ascending date order and preserve source order within each day. Asset and wallet names are case-sensitive. The journal starts at zero and rejects outgoing movements beyond the recorded balance. Reconciliation checks the wallet/asset pairs supplied in the snapshot; chain balances are not fetched.

## Forking it

Add a read-only transaction importer and map chain-specific token identifiers to assets. Keep source transaction IDs for deduplication and retain journal order within a block.

The calculation lives in `model.js`. The UI and sample inputs live in `app.js`. See the [collection guide](../../README.md) for running the gallery or exporting this app.
