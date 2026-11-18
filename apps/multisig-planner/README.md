# Multisig Planner

Audit M-of-N weighted threshold multisig governance, timelock maturity windows, organization concentration risks, and SHA-256 payload hashes.

## Using the app

Provide a JSONL signer roster (`id`, `org`, `weight`), queued proposals (`id`, `title`, `target`, `value`, `data`, `createdAt`, `approvals`), quorum threshold, and timelock delay. Run **Audit governance** to inspect organization veto/collusion risk, execution readiness, SHA-256 payload digests, and export CSV or JSON reports.

## Model and limits

Payload commitments compute `SHA-256(id|target|value|data)` via Web Crypto. Quorum checks deduplicate signer approvals per proposal and compare weighted totals against the threshold.

## Forking it

Adapt the payload preimage encoding to match EIP-712 Safe transaction hashes or SPL multisig instruction digests.

The calculation lives in `model.js`. The UI and sample inputs live in `app.js`. See the [collection guide](../../README.md) for running the gallery or exporting this app.
