# Map Kiln

Generate a compact dungeon layout and inspect how players can travel between rooms.

## Run

From the repository root, run `npm start` and open **Map Kiln** in the catalog. The editor saves your draft through the host’s workspace storage.

## Use the app

Set grid dimensions, room target, and seed, then toggle the BFS distance heatmap and inspect populated room encounters (keys, treasures, guardians, shrines). Click a floor cell to move the exit, test your dungeon directly via **Play dungeon**, or export playable HTML, encounter JSON, tile CSV, or preview PNG.

## Scope

The room target is an upper bound. Placement depends on free space and seed. The map is an orthogonal wall/floor grid. The CSV holds grid values only. Start and exit coordinates are available in the JSON.

## Build a product

Build a procedural campaign editor that layers encounters, biomes, and difficulty budgets onto the exported geometry.

Use `npm run fork -- map-kiln <destination>` from the catalog root to extract this app with its runtime and license.
