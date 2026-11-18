# Vector Cluster

Embed text corpora as L2-normalized TF-IDF vectors, group documents with seeded k-means++ clustering, and inspect cluster keywords and silhouette scores.

## Using the app

Supply JSONL records with `id` and `text`, select a cluster count `k` (2–10) and deterministic seed, and run **Cluster documents**. Inspect cluster size bars, top TF-IDF signature terms per centroid, document silhouette quality scores, and export CSV or JSON assignments.

## Model and limits

Documents are tokenized into normalized Unicode words, weighted by sublinear TF and inverse document frequency, and L2-normalized onto the unit sphere. Distance uses cosine distance (`1 - cosine similarity`).

## Forking it

Connect this module to customer support tickets, knowledge base audits, or feedback corpora to discover emerging themes offline.

The calculation lives in `model.js`. The UI and sample inputs live in `app.js`. See the [collection guide](../../README.md) for running the gallery or exporting this app.
