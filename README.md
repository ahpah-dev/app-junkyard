# App Junkyard

**36 working applications you can fork individually and turn into commercial products.** Run a text classifier, cluster TF-IDF corpora, simulate an order book, audit a multisig quorum, sculpt a vector mark, ship a nonogram or chiptune sequencer, or manage cap tables and SLO error budgets. Each app includes editable sample data, an app guide, domain tests and its own source directory.

[Open the live collection](https://ahpah-dev.github.io/app-junkyard/) · [Browse the apps](#applications) · [Read the Unlicense](LICENSE)

![App Junkyard catalog showing the collection and application previews](docs/collection.webp)

## Run the collection

Install **Node.js 24.13 or newer**. The applications and server use browser and Node standard libraries. A fresh clone needs no package installation, API credentials, or external database.

```sh
git clone https://github.com/ahpah-dev/app-junkyard.git
cd app-junkyard
npm start
```

Open **http://127.0.0.1:4173**. Select an app to edit its example or bring your own data. Each workspace has an **App guide** with instructions and supported formats. The AI tools train, score and evaluate data locally. The crypto tools work with supplied records and simulations. The game engines export playable HTML.

## Take one app

Open any app in the live collection and choose **Download starter** to get its runnable source as a ZIP. The [v1.0.0 release](https://github.com/ahpah-dev/app-junkyard/releases/tag/v1.0.0) includes all 24 individual downloads.

From the collection root:

```sh
npm run fork -- crateworks ../my-puzzle-studio
cd ../my-puzzle-studio
npm test
npm start
```

This creates a new, independent project containing Crateworks, its tests, the shared runtime, hosting instructions and the Unlicense. Its home page opens the editor directly. Use any app ID below. The destination must be a new directory. Omit the destination to create `forks/<app-id>/`.

## Applications

| AI | What you can do |
| --- | --- |
| [Corpus Curator](apps/corpus-curator) | Find conflicting labels, fuzzy near-duplicates and class imbalance, then export reproducible training and test sets. |
| [Label Foundry](apps/label-foundry) | Train a unigram/bigram Naive Bayes text classifier, inspect feature lift and confusion matrices, and score held-out sets. |
| [Passage Rank](apps/passage-rank) | Rank documents using BM25, inspect per-term IDF contributions and refine queries with pseudo-relevance expansion. |
| [Run Compare](apps/run-compare) | Compare paired model outputs using exact, contains, F1, Jaccard and BLEU rules with paired sign-test significance. |
| [Token Budget](apps/token-budget) | Estimate subword token counts, pack context sections by priority within a budget and forecast LLM spend. |
| [Vector Cluster](apps/vector-cluster) | Build L2-normalized TF-IDF document vectors, cluster corpora via seeded k-means++ and score silhouettes. |

| Crypto | What you can do |
| --- | --- |
| [Merkle Desk](apps/merkle-desk) | Generate SHA-256 inclusion proofs, audit full leaf directories, diff snapshots and verify against trusted roots. |
| [Multisig Planner](apps/multisig-planner) | Audit M-of-N weighted threshold quorums, timelock maturity, SHA-256 payload digests and organization risk. |
| [Orderbook Sim](apps/orderbook-sim) | Match limit and market orders with FIFO price-time priority, inspect depth ladders and measure VWAP fills. |
| [Pool Bench](apps/pool-bench) | Replay constant-product swaps and inspect fees, spot price history, impermanent loss vs. HODL and slippage depth caps. |
| [Treasury Ledger](apps/treasury-ledger) | Reconstruct wallet balances, audit monthly supply flows and concentration, and reconcile against snapshots. |
| [Vest Calendar](apps/vest-calendar) | Audit daily or step vesting cliffs, aggregate beneficiary cap tables and forecast 12 month-end balances. |

| Design | What you can do |
| --- | --- |
| [Bezier Forge](apps/bezier-forge) | Sculpt symmetric vector icons on a 24×24 snap grid with badge frames and clean SVG/PNG export. |
| [Palette Loom](apps/palette-loom) | Generate perceptual Oklab color ramps, simulate color-vision deficiencies, check WCAG pairings and export W3C tokens. |
| [Pattern Press](apps/pattern-press) | Generate reproducible vector patterns across six motifs and symmetry modes, then export SVG, PNG or CSS. |
| [Pixel Foundry](apps/pixel-foundry) | Draw transparent sprites with shapes, 4-way symmetry, transforms and flood fill, then export PNG or crisp SVG. |
| [Type Poster](apps/type-poster) | Lay out editorial posters across six compositions and presets with live contrast checks and SVG/PNG export. |
| [Type Scale](apps/type-scale) | Generate modular typographic hierarchy scales with fluid CSS `clamp()` viewport formulas and live previews. |

| Games | What you can do |
| --- | --- |
| [Branchline](apps/branchline) | Build branching narrative games with an interactive SVG story map, flag audits and playable HTML export. |
| [Crateworks](apps/crateworks) | Paint puzzle levels, verify optimal solutions with a built-in BFS solver and export standalone crate games. |
| [Flipbook](apps/flipbook) | Animate pixel sprites with onion skinning and frame transforms, then export a PNG atlas or animated SVG. |
| [Logic Grid](apps/logic-grid) | Paint 10×10 nonogram picross puzzles, verify pure logical deductibility and export a playable HTML game. |
| [Map Kiln](apps/map-kiln) | Generate seeded dungeons with encounter rooms and BFS heatmaps, then playtest or export a standalone crawler. |
| [Synth Pad](apps/synth-pad) | Sequence 16-step chiptune loops across four synthesized voices and export 16-bit PCM WAV audio. |

| Business | What you can do |
| --- | --- |
| [Cap Table](apps/cap-table) | Model equity classes, option pools and SAFE note conversions, then simulate preferred exit waterfalls. |
| [Pipeline Ledger](apps/pipeline-ledger) | Forecast weighted revenue by stage and close month, calculate win rates and track customer follow-ups. |
| [Quote Foundry](apps/quote-foundry) | Price line items, apply discounts and tax, clone or accept quotes and download text or HTML proposals. |
| [Receivables Desk](apps/receivables-desk) | Track invoice aging, collection rates and late fees, record payments and export account statements. |
| [Retainer Book](apps/retainer-book) | Log client time against monthly allowances, project month-end burn pace and export itemized billing statements. |
| [Runway Planner](apps/runway-planner) | Forecast compounding revenue and operating burn to project 18-month cash runway and break-even timing. |

| Operations | What you can do |
| --- | --- |
| [Incident Journal](apps/incident-journal) | Track incident milestones, evaluate severity SLA compliance and export text or Markdown postmortem reviews. |
| [Oncall Rota](apps/oncall-rota) | Schedule primary and secondary responder rotations, prevent double-booking and export `.ics` calendar feeds. |
| [Room Roster](apps/room-roster) | Book rooms and equipment, view daily utilization, find open slots and download `.ics` calendar invites. |
| [SLA Monitor](apps/sla-monitor) | Track 30-day service uptime against SLO targets, monitor error-budget burn rates and enforce release freezes. |
| [Sprint Board](apps/sprint-board) | Plan delivery work, monitor owner workload balance, enforce WIP limits and advance unblocked tasks. |
| [Stockroom](apps/stockroom) | Track stock movements, inspect days of supply and EOQ benchmarks, and download consolidated purchase orders. |

Use the directory name in each link as the app ID. Running `npm run fork` without arguments also lists the available IDs.

## Develop and deploy

| Command | Outcome |
| --- | --- |
| `npm start` | Build a local catalog and serve it. Restart after editing source. |
| `npm test` | Run domain, catalog and account-isolation tests. |
| `npm run build` | Generate a deployable static site in `dist/`. |
| `npm run fork -- <id> [directory]` | Create a self-contained copy of one application. |

The live collection stores drafts in the browser. Self-hosted forks can enable the included SQLite account server for sign-in and private versioned backups. Customer billing, team collaboration and account recovery are product-specific extensions. [Hosting and account setup](HOSTING.md)

## Source layout

Each `apps/<id>/` contains its manifest, browser entry point, app guide and tests. Calculation-heavy apps keep reusable logic in separate modules. `shared/` holds common UI and editor helpers, `web/` supplies navigation and the workspace shell, and `server/` holds HTTP serving and optional account storage. Build and extraction scripts live in `scripts/`.

## License

App Junkyard is released under [the Unlicense](LICENSE). You may copy, modify, distribute and sell the software, including in a proprietary product.
