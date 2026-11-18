# Label Foundry

Train a local text classifier from labeled examples, score new text, and evaluate a held-out set.

## Using the app

Provide training records as JSONL with `label` and `text`, select unigram or bigram token features, and supply an optional independent evaluation set. Train and classify to inspect probability distributions, prediction entropy, per-token log-odds, top discriminative class features, held-out confusion matrices, per-class precision/recall/F1, and CSV/JSON reports.

## Model and limits

The classifier uses empirical label priors and additive smoothing over the training vocabulary. Unknown words are ignored. A query with no familiar words follows the class priors. Scores come from the fitted model and may be overconfident. See the [Stanford text classification chapter](https://nlp.stanford.edu/IR-book/html/htmledition/naive-bayes-text-classification-1.html).

## Forking it

Turn it into a ticket triage tool by adding human review, storing corrections as training examples, and evaluating each new trained version.

The calculation lives in `model.js`. The UI and sample inputs live in `app.js`. See the [collection guide](../../README.md) for running the gallery or exporting this app.
