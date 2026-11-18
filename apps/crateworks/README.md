# Crateworks

Create a Sokoban-style puzzle campaign. The same movement and rendering code powers the playtest and exported game.

## Run

From the repository root, run `npm start` and open **Crateworks** in the catalog. The editor saves your draft through the host’s workspace storage.

## Use the app

Select a tile brush and paint the board. Every level needs one player and the same positive number of crates and goals. Add levels to form a campaign. Play the game with arrow keys or on-screen buttons. Push all crates onto goals to advance. Save project JSON for editing or export HTML for players.

## Scope

Each level has 12 × 9 cells. Validation enforces starting piece counts. Designers must playtest level solvability. The engine supports 32 levels with up to 256 undo moves per level.

## Build a product

Build a hosted puzzle builder for classrooms, events, or puzzle newsletters. Add team review and validated challenge publishing.

Use `npm run fork -- crateworks <destination>` from the catalog root to extract this app with its runtime and license.
