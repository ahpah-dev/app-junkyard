import { el } from '../../shared/ui.js';
import {
  bars,
  csvExport,
  gridTable,
  jsonExport,
  jsonLines,
  lab,
  matrixTable,
  metrics,
  rowsOf,
} from '../../shared/lab.js';
import { classify, evaluate, topFeatures, train } from './model.js';

const records = (pairs) => jsonLines(pairs.map(([label, text]) => ({ label, text })));
const training = records([
  ['billing', 'invoice charged twice for subscription'],
  ['billing', 'refund the duplicate charge on my invoice'],
  ['billing', 'monthly billing statement shows wrong amount'],
  ['access', 'unable to sign in with password'],
  ['access', 'reset password and restore access to account'],
  ['access', 'two factor login code rejected'],
  ['shipping', 'track my parcel shipment'],
  ['shipping', 'missing parcel after delivery tracking update'],
  ['shipping', 'carrier delayed courier delivery'],
]);
const evaluation = records([
  ['billing', 'duplicate invoice refund'],
  ['access', 'password reset login'],
  ['shipping', 'track delivery parcel'],
]);

export function mount(root, ctx) {
  lab(root, ctx, {
    input: 'Training desk',
    action: 'Train and classify',
    output: 'Classification report',
    fields: [
      { key: 'query', label: 'Text to classify', value: 'My invoice shows a duplicate charge' },
      {
        key: 'train',
        label: 'Training examples · JSONL',
        value: training,
        rows: 7,
        import: '.jsonl,.ndjson,.txt',
      },
      { key: 'holdout', label: 'Held-out examples · JSONL', value: evaluation, rows: 3, required: false },
      {
        key: 'ngrams',
        label: 'Token features',
        value: '2',
        options: [
          ['1', 'Unigrams only'],
          ['2', 'Unigrams + Bigrams'],
        ],
      },
      {
        key: 'alpha',
        label: 'Additive smoothing',
        value: '1',
        type: 'number',
        attrs: { min: 0.01, max: 10, step: 'any' },
      },
    ],
    calculate: (s) => {
      const model = train(rowsOf(s.train), s.alpha, s.ngrams);
      return {
        documents: model.documents,
        vocabulary: model.vocabulary.size,
        ngrams: model.ngrams,
        query: s.query,
        classification: classify(model, s.query),
        topFeatures: topFeatures(model, 4),
        evaluation: evaluate(model, s.holdout.trim() ? rowsOf(s.holdout, 1000) : []),
      };
    },
    render: (r, context) => [
      metrics([
        ['Predicted label', r.classification.label],
        ['Confidence', ((r.classification.scores[0]?.probability ?? 0) * 100).toFixed(1) + '%'],
        ['Entropy (bits)', r.classification.entropy.toFixed(3)],
        ['Recognized features', r.classification.known + ' / ' + r.classification.tokens],
        ...(r.evaluation.total
          ? [
              ['Held-out accuracy', (r.evaluation.accuracy * 100).toFixed(1) + '%'],
              ['Macro F1', r.evaluation.macroF1.toFixed(3)],
            ]
          : []),
      ]),
      bars(
        r.classification.scores.length > 8 ? 'Class probabilities · top eight' : 'Class probabilities',
        r.classification.scores.slice(0, 8).map((s) => ({
          label: s.label,
          value: (s.probability * 100).toFixed(2) + '%',
          fraction: s.probability,
        })),
      ),
      el(
        'p',
        { className: 'muted' },
        'Trained on ' +
          r.documents +
          ' documents and ' +
          r.vocabulary +
          ' distinct ' +
          (r.ngrams === 2 ? 'unigram/bigram' : 'unigram') +
          ' features.',
      ),
      ...(r.classification.contributions.length
        ? [
            el('h4', {}, 'Query feature log-odds (top vs runner-up)'),
            gridTable(
              ['Feature', 'Occurrences', 'Log-odds Δ'],
              r.classification.contributions.slice(0, 12).map((c) => [
                c.term,
                c.count,
                (c.logOdds >= 0 ? '+' : '') + c.logOdds.toFixed(3),
              ]),
            ),
          ]
        : []),
      el(
        'details',
        {},
        el('summary', {}, 'Top discriminative features per class'),
        gridTable(
          ['Class', 'Top weighted features'],
          r.topFeatures.map((row) => [
            row.label,
            row.features.map((f) => f.term + ' (+' + f.lift.toFixed(2) + ')').join(', ') || '—',
          ]),
        ),
      ),
      ...(r.evaluation.total
        ? [
            matrixTable('Held-out confusion matrix', r.evaluation.confusion.labels, r.evaluation.confusion.matrix),
            el('h4', {}, 'Per-class precision & recall'),
            gridTable(
              ['Class', 'Precision', 'Recall', 'F1', 'Support'],
              r.evaluation.perClass.map((c) => [
                c.label,
                (c.precision * 100).toFixed(1) + '%',
                (c.recall * 100).toFixed(1) + '%',
                c.f1.toFixed(3),
                c.support,
              ]),
            ),
            el('h4', {}, 'Held-out predictions · ' + r.evaluation.correct + ' / ' + r.evaluation.total),
            gridTable(
              ['Example', 'Expected', 'Predicted', 'Confidence'],
              r.evaluation.predictions
                .slice(0, 30)
                .map((p) => [p.text, p.expected, p.predicted, (p.confidence * 100).toFixed(1) + '%']),
            ),
          ]
        : []),
      el(
        'div',
        { className: 'actions' },
        ...(r.evaluation.total
          ? [
              csvExport(
                context,
                'label-foundry-eval.csv',
                ['Text', 'Expected', 'Predicted', 'Confidence'],
                r.evaluation.predictions.map((p) => [p.text, p.expected, p.predicted, p.confidence.toFixed(4)]),
                'Download evaluation CSV',
              ),
            ]
          : []),
        jsonExport(context, 'label-foundry.json', r),
      ),
    ],
  });
}
