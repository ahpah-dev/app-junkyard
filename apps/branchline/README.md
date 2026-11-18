# Branchline

Create a text adventure, interactive lesson, or decision story from linked scenes.

## Run

From the repository root, run `npm start` and open **Branchline** in the catalog. The editor saves your draft through the host’s workspace storage.

## Use the app

Edit passages and add choices with destination scenes. A choice may require a flag and grant another when selected. Leave a scene without choices to make it an ending. Play the sample by collecting the lens, returning to the pier, and signaling the boat. Export a single HTML file for players or project JSON for collaborators.

## Scope

Flags are case-sensitive strings. The link audit checks static reachability while ignoring flag conditions. Playtest conditional paths. Projects support 100 scenes with 12 choices per scene.

## Build a product

Add translation, editorial approval, and per-choice analytics for authored interactive training.

Use `npm run fork -- branchline <destination>` from the catalog root to extract this app with its runtime and license.
