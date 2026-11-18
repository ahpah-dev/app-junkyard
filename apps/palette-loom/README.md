# Palette Loom

Produce a named sequence of design tokens from two color anchors.

## Run

From the repository root, run `npm start` and open **Palette Loom** in the catalog. The editor saves your draft through the host’s workspace storage.

## Use the app

Choose start and end colors, step count, and token prefix. Set the preview text color and optional color-vision deficiency simulator (protanopia, deuteranopia, tritanopia) to inspect WCAG AAA/AA/AA-Large grades and accessible ramp pairings. Export CSS custom properties, JSON maps, W3C Design Tokens, or an SVG swatch card.

## Scope

The contrast check covers solid sRGB foreground and background colors. Gradients, transparency, and typography-level checks require separate review.

## Build a product

Add shared brand workspaces, approved palettes, and pull requests that synchronize tokens into customer repositories.

Use `npm run fork -- palette-loom <destination>` from the catalog root to extract this app with its runtime and license.
