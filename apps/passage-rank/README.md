# Passage Rank

Search a document collection with BM25 and inspect which query terms drove each result.

## Using the app

Edit the search query or import a UTF-8 JSONL file with one `id`, `title`, and `text` string per record. Run the search, expand a hit to inspect individual term scores, and download the full ranked report.

## Model and limits

Passage Rank tokenizes normalized Unicode words, indexes title and body together, and treats query terms as a set. Scores compare passages within the current corpus. Up to 5,000 records fit in one run. See the [Lucene BM25 reference](https://lucene.apache.org/core/9_11_0/core/org/apache/lucene/search/similarities/BM25Similarity.html).

## Forking it

Add workspace-specific corpora or a saved benchmark of labeled queries. The pure ranking function can run behind a search API.

The calculation lives in `model.js`. The UI and sample inputs live in `app.js`. See the [collection guide](../../README.md) for running the gallery or exporting this app.
