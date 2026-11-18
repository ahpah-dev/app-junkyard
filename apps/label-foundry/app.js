import { el } from '../../shared/ui.js';
import { bars, gridTable, jsonExport, jsonLines, lab, metrics, rowsOf } from '../../shared/lab.js';
import { classify, evaluate, train } from './model.js';

const records = (pairs) => jsonLines(pairs.map(([label, text]) => ({ label, text })));
const training = records([
  ['billing', 'invoice charged twice for subscription'],
  ['billing', 'refund the duplicate charge on my invoice'],
  ['access', 'unable to sign in with password'],
  ['access', 'reset password and restore access to account'],
  ['shipping', 'track my parcel shipment'],
  ['shipping', 'missing parcel after delivery tracking update'],
]);
const evaluation = records([
  ['billing', 'duplicate invoice'],
  ['access', 'password reset'],
  ['shipping', 'track parcel'],
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
        rows: 6,
        import: '.jsonl,.ndjson,.txt',
      },
      { key: 'holdout', label: 'Held-out examples · JSONL', value: evaluation, rows: 3, required: false },
      {
        key: 'alpha',
        label: 'Additive smoothing',
        value: '1',
        type: 'number',
        attrs: { min: 0.01, max: 10, step: 'any' },
      },
    ],
    calculate: (s) => {
      const model = train(rowsOf(s.train), s.alpha);
      return {
        documents: model.documents,
        vocabulary: model.vocabulary.size,
        query: s.query,
        classification: classify(model, s.query),
        evaluation: evaluate(model, s.holdout.trim() ? rowsOf(s.holdout, 1000) : []),
      };
    },
    render: (r, context) => [
      metrics([
        ['Predicted label', r.classification.label],
        ['Recognized words', r.classification.known + ' / ' + r.classification.tokens],
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
        'Trained on ' + r.documents + ' documents and ' + r.vocabulary + ' distinct words.',
      ),
      ...(r.evaluation.total
        ? [
            el('h4', {}, 'Held-out accuracy · ' + r.evaluation.correct + ' / ' + r.evaluation.total),
            gridTable(
              ['Example', 'Expected', 'Predicted'],
              r.evaluation.predictions.slice(0, 30).map((p) => [p.text, p.expected, p.predicted]),
            ),
          ]
        : []),
      jsonExport(context, 'label-foundry.json', r),
    ],
  });
}
