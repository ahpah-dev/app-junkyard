# Logic Grid

Paint 10×10 Nonogram picross puzzles, verify pure logical deductibility without guessing, and export standalone playable HTML games.

## Using the app

Click or drag cells on the 10×10 grid to toggle filled pixels and watch row and column run-length clues update live. The constraint propagation checker immediately tests whether the puzzle is uniquely solvable by logic alone. Add multiple puzzles to build a campaign, click **Play puzzle** to test inline, or export playable HTML and project JSON.

## Scope

Supports 10×10 grids with up to 24 puzzles per collection.

## Forking it

Extend `engine.js` to support larger grids (15×15) or daily puzzle packs backed by a score leaderboard.

Use `npm run fork -- logic-grid <destination>` from the catalog root to extract this app with its runtime and license.
