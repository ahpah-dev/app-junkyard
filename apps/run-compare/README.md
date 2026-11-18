# Run Compare

Compare two text-model runs against a shared rubric and drill into regressions by case.

## Using the app

Paste or import a JSONL evaluation set. Each case has an `id`, `expected`, `baseline`, and `candidate` string. Optionally add `group` and `rule` (`exact`, `contains`, or `f1`). Adjust the F1 passing threshold and inspect changed cases with the result filter.

## Model and limits

Both outputs are supplied by the user. Comparisons use Unicode normalization, lowercase, and collapsed whitespace. Token F1 counts repeated tokens as a multiset. The summary weights every case equally. The included rubric works best with short, testable answers.

## Forking it

Connect a saved prompt suite to a server-side generation job, then feed captured answers into the pairing and scoring function.

The calculation lives in `model.js`. The UI and sample inputs live in `app.js`. See the [collection guide](../../README.md) for running the gallery or exporting this app.
