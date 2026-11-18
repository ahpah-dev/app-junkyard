# Bezier Forge

Sculpt symmetric Bézier and polygon vector icons on a 24×24 snap grid, frame them in badges, and export clean SVG or 512px PNG assets.

## Using the app

Start from a preset or click cells on the 24×24 grid to append control points. Toggle horizontal mirror symmetry, path closure, corner smoothing, stroke weight, and badge frames (circle, squircle, octagon). Export clean vector SVG without editor overlays, 512px PNG, or JSON project files.

## Scope

Supports 2 to 32 control points on integer coordinates `[0..24]` rendered into a `240×240` SVG viewBox.

## Forking it

Use the pure path builder in `vector.js` to power an icon library builder, logo generator, or design-system asset pipeline.

Use `npm run fork -- bezier-forge <destination>` from the catalog root to extract this app with its runtime and license.
