# Merkle Desk

Build SHA-256 Merkle commitments from a list and verify individual inclusion proofs against a trusted root.

## Using the app

Enter a list of leaf values, one nonempty string per line, and select a one-based position. Build the tree, inspect the sibling path, browse the leaf hash directory, compare snapshots for append-only integrity, and download CSV or JSON proofs. To verify an external proof, paste its JSON into the verifier and enter a root obtained independently. To verify the claimed position too, enter the publisher's independently trusted leaf count.

## Model and limits

The scheme encodes well-formed Unicode text as UTF-8, hashes leaves with a leading 0x00 byte, and hashes ordered sibling pairs with a leading 0x01 byte. Lone UTF-16 surrogates and invalid UTF-8 files are rejected. Leading and trailing spaces are part of the leaf. An unpaired node passes to the next level unchanged. The tree supports 1–4,096 leaves. Browser hashing requires a secure context (HTTPS or localhost).

The verifier matches the receipt's root to the independently supplied root and reconstructs it from the leaf and sibling hashes. This proves membership. Because an unpaired node passes through without a hash, several tree sizes can share the same path shape. The receipt's own count therefore cannot establish tree size or position. Supplying an independent trusted count fixes the tree shape, allowing the verifier to check every sibling direction against the claimed zero-based index. For repeated leaves, each proof establishes one occurrence.

## Forking it

Use proofs as inclusion receipts for an off-chain snapshot. Publish the signed root and leaf count together with a timestamp and document the precise leaf encoding for interoperability.

The calculation lives in `model.js`. The UI and sample inputs live in `app.js`. See the [collection guide](../../README.md) for running the gallery or exporting this app.
