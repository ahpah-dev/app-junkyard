# Token Budget

Estimate subword token counts, pack context sections by priority within a strict token ceiling, and forecast inference spend.

## Using the app

Enter prompt sections as JSONL (`id`, `role`, `priority` 1–5, and `text`), set your context window, reserved output tokens, and model token pricing, then run **Pack context & forecast**. Inspect which sections were kept, truncated, or dropped, review per-call and 30-day spend, and export CSV or JSON reports.

## Model and limits

Token estimation splits Unicode words, numbers, and punctuation and subdivides words longer than six characters into four-character stems plus a four-token section overhead. Exact provider tokenizer counts may vary slightly.

## Forking it

Connect this packing engine to your RAG retrieval pipeline to automatically enforce hard context limits before sending completions.

The calculation lives in `model.js`. The UI and sample inputs live in `app.js`. See the [collection guide](../../README.md) for running the gallery or exporting this app.
