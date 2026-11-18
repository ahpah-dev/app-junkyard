# Flipbook

Create small looping game animations and export exactly positioned frames for a runtime.

## Run

From the repository root, run `npm start` and open **Flipbook** in the catalog. The editor saves your draft through the host’s workspace storage.

## Use the app

Click a numbered frame to edit its pixels. Duplicate or insert frames, then move them earlier or later. The overlay shows the previous frame. Play the loop and tune its frame rate. Export the PNG sprite sheet and matching atlas JSON together. Save editable project JSON to continue on another device.

## Scope

Projects hold 1–32 frames at 16 × 16 pixels. All frames share one duration. Atlas rectangles use pixels from the sheet’s top-left corner.

## Build a product

Offer a collaborative sprite library with review annotations, palette enforcement, and exports for popular engines.

Use `npm run fork -- flipbook <destination>` from the catalog root to extract this app with its runtime and license.
