import { el } from '../../shared/ui.js';
import { bars, csvExport, gridTable, jsonExport, jsonLines, lab, metrics, rowsOf } from '../../shared/lab.js';
import { clusterDocuments } from './model.js';

const sampleCorpus = jsonLines([
  { id: 'd1', text: 'Invoice billing charge duplicate payment refund credit' },
  { id: 'd2', text: 'Subscription billing renewal invoice tax receipt' },
  { id: 'd3', text: 'Refund duplicate payment card charge statement' },
  { id: 'd4', text: 'Monthly invoice receipt payment method update' },
  { id: 'd5', text: 'Password reset login two factor authentication code' },
  { id: 'd6', text: 'Account sign in token expired SSO SAML access' },
  { id: 'd7', text: 'Two factor verification login password recovery' },
  { id: 'd8', text: 'API bearer token authentication scope permission' },
  { id: 'd9', text: 'Dark mode layout grid CSS responsive spacing' },
  { id: 'd10', text: 'Typography contrast ratio WCAG palette swatch' },
  { id: 'd11', text: 'Vector SVG export canvas sprite alignment' },
  { id: 'd12', text: 'Responsive grid layout button focus outline' },
]);

export function mount(root, ctx) {
  lab(root, ctx, {
    input: 'Corpus & clustering parameters',
    output: 'Cluster analysis',
    action: 'Cluster documents',
    fields: [
      {
        key: 'docs',
        label: 'Documents · JSONL',
        rows: 8,
        value: sampleCorpus,
        import: '.jsonl,.ndjson,.txt',
        hint: 'Provide id and text strings for each document.',
      },
      {
        key: 'k',
        label: 'Clusters (k)',
        type: 'number',
        value: '3',
        attrs: { min: 2, max: 10, step: 1 },
      },
      { key: 'seed', label: 'Initialization seed', value: 'cluster-v1' },
    ],
    calculate: (s) => clusterDocuments(rowsOf(s.docs), s.k, s.seed),
    render: (r, context) => [
      metrics([
        ['Documents', r.documentCount],
        ['Clusters', r.k],
        ['Mean silhouette', r.meanSilhouette.toFixed(3)],
      ]),
      bars(
        'Cluster sizes',
        r.clusters.map((c) => ({
          label: 'Cluster ' + c.cluster + ' (' + c.keywords.slice(0, 3).join(', ') + ')',
          value: c.size + ' docs · sim ' + c.cohesion.toFixed(2),
          fraction: c.size / r.documentCount,
        })),
      ),
      el('h4', {}, 'Cluster centroids & signature keywords'),
      gridTable(
        ['Cluster', 'Documents', 'Mean cohesion', 'Top TF-IDF keywords'],
        r.clusters.map((c) => ['Cluster ' + c.cluster, c.size, c.cohesion.toFixed(3), c.keywords.join(', ') || '—']),
      ),
      el('h4', {}, 'Document assignments'),
      gridTable(
        ['ID', 'Cluster', 'Centroid sim.', 'Silhouette', 'Text'],
        r.documents
          .slice(0, 50)
          .map((d) => [d.id, 'Cluster ' + d.cluster, d.centroidSimilarity.toFixed(3), d.silhouette.toFixed(3), d.text]),
      ),
      el(
        'div',
        { className: 'actions' },
        csvExport(
          context,
          'vector-clusters.csv',
          ['ID', 'Cluster', 'CentroidSimilarity', 'Silhouette', 'Text'],
          r.documents.map((d) => [d.id, d.cluster, d.centroidSimilarity, d.silhouette, d.text]),
          'Download clusters CSV',
        ),
        jsonExport(context, 'vector-cluster.json', r),
      ),
    ],
  });
}
