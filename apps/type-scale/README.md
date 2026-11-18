# Type Scale

Generate fluid CSS `clamp()` typographic ramps from separate mobile and desktop modular ratios and preview hierarchy live across viewports.

## Using the app

Set your mobile and desktop base sizes, modular ratios, and viewport breakpoints. Drag the preview viewport slider to inspect how headings and body sizes interpolate smoothly, then export CSS custom properties or structured JSON design tokens.

## Scope

Computes eight typographic steps (`xs` through `3xl`) in `rem` + `vw` CSS `clamp()` formulas assuming a `16px` root font size.

## Forking it

Bundle the `scale.js` generator into a design-system studio or CSS token compiler.

Use `npm run fork -- type-scale <destination>` from the catalog root to extract this app with its runtime and license.
