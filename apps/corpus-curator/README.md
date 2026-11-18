# Corpus Curator

Prepare labeled text datasets with duplicate detection, conflict review and reproducible train/test splits.

## Using the app

Import one `text` and `label` string per JSONL record. Choose a holdout percentage and seed. Review the per-label counts, normalized Shannon class-balance entropy, fuzzy near-duplicate candidate pairs, and excluded records, then download the train, test, and CSV breakdown files.

## Model and limits

Texts with the same NFKC-normalized, lowercased, whitespace-collapsed content share an identity. Exact label conflicts exclude the whole group. Consistent duplicates retain one canonical record. Outputs contain text and label only.

The app rounds the target percentage of all retained records to the nearest whole record, with halves rounded up. Each label keeps at least one training record. The available capacity caps the global holdout size. Slots are allocated proportionally by label size, with remaining slots going to eligible labels furthest below their quotas. Equal deficits follow label order. The seed then determines which records fill each slot. The report shows the actual holdout count and percentage, including zero for very small targets.

## Forking it

Add a conflict resolution queue or a versioned dataset registry. Keep splitting after conflict resolution to avoid cross-split leakage.

The calculation lives in `model.js`. The UI and sample inputs live in `app.js`. See the [collection guide](../../README.md) for running the gallery or exporting this app.
